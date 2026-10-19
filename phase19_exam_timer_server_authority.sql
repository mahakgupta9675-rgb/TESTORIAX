-- =====================================================
-- PHASE 19 MIGRATION: SERVER-AUTHORITATIVE EXAM TIMER & DEADLINE PROTECTION
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- 1. Ensure attempts.started_at column has DEFAULT set to database server time
ALTER TABLE public.attempts 
  ALTER COLUMN started_at SET DEFAULT timezone('utc'::text, now());

-- 2. Update calculate_and_submit_attempt RPC to enforce server-side deadline
-- Deadline rule: attempt.started_at + tests.duration + 2 minutes grace period
-- Server NOW() is compared against deadline; client p_status cannot override deadline.
DROP FUNCTION IF EXISTS public.calculate_and_submit_attempt(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.calculate_and_submit_attempt(
    p_attempt_id UUID,
    p_status TEXT DEFAULT 'submitted'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempt         RECORD;
    v_test            RECORD;
    v_total_score     NUMERIC := 0;
    v_total_marks     NUMERIC := 0;
    v_answer          RECORD;
    v_question        RECORD;
    v_is_correct      BOOLEAN;
    v_marks_awarded   NUMERIC;
    v_neg_enabled     BOOLEAN := false;
    v_neg_value       NUMERIC := 0;
    v_result          JSONB;
    v_correct_idx     INTEGER;
    v_correct_val     TEXT;
    v_options         JSONB;
    v_student_answer  TEXT;
    v_correct_answers JSONB;
    v_ca              TEXT;
    v_deadline        TIMESTAMPTZ;
    v_final_status    TEXT;
BEGIN
    -- ─── 1. Fetch attempt & verify caller owns it ────────────────────────────
    SELECT * INTO v_attempt FROM public.attempts WHERE id = p_attempt_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
    END IF;

    IF v_attempt.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: caller does not own this attempt';
    END IF;

    -- ─── 2. Idempotency guard ────────────────────────────────────────────────
    -- If already submitted/expired, return stored result without re-scoring.
    IF v_attempt.status != 'in_progress' THEN
        RETURN jsonb_build_object(
            'score',       v_attempt.score,
            'total_marks', v_attempt.total_marks,
            'status',      v_attempt.status,
            'idempotent',  true
        );
    END IF;

    -- ─── 3. Fetch test config & calculate authoritative deadline ─────────────
    SELECT * INTO v_test FROM public.tests WHERE id = v_attempt.test_id;

    IF v_test.negative_marking IS NOT NULL THEN
        v_neg_enabled := COALESCE((v_test.negative_marking->>'enabled')::BOOLEAN, false);
        v_neg_value   := COALESCE((v_test.negative_marking->>'value')::NUMERIC, 0);
    END IF;

    -- Calculate authoritative deadline (started_at + duration + 2 min grace period)
    v_deadline := v_attempt.started_at + (COALESCE(v_test.duration, 60) * interval '1 minute') + interval '2 minutes';

    -- Determine effective final status: Server NOW() > deadline forces 'expired'
    IF timezone('utc'::text, now()) > v_deadline THEN
        v_final_status := 'expired';
    ELSIF p_status = 'expired' THEN
        v_final_status := 'expired';
    ELSE
        v_final_status := 'submitted';
    END IF;

    -- ─── 4. Calculate total_marks from active questions ──────────────────────
    SELECT COALESCE(SUM(marks), 0)
    INTO   v_total_marks
    FROM   public.questions
    WHERE  test_id = v_attempt.test_id
      AND  status  = 'active';

    -- ─── 5. Score each answer ────────────────────────────────────────────────
    FOR v_answer IN
        SELECT a.question_id, a.answer_data, a.marks_awarded AS pre_awarded
        FROM   public.answers a
        WHERE  a.attempt_id = p_attempt_id
    LOOP
        SELECT * INTO v_question
        FROM   public.questions
        WHERE  id      = v_answer.question_id
          AND  test_id = v_attempt.test_id
          AND  status  = 'active';

        IF NOT FOUND THEN CONTINUE; END IF;

        v_is_correct    := false;
        v_marks_awarded := 0;

        -- ── CODING: trust marks already written by Judge0 server endpoint ──
        IF v_question.question_type = 'coding' THEN
            v_marks_awarded := COALESCE(v_answer.pre_awarded, 0);
            v_is_correct    := v_marks_awarded >= v_question.marks;
            v_total_score   := v_total_score + v_marks_awarded;
            CONTINUE;
        END IF;

        -- ── MCQ ─────────────────────────────────────────────────────────────
        IF v_question.question_type = 'mcq' OR v_question.question_type = 'mcq-single' THEN
            v_correct_idx    := (v_question.correct_answer->>'correctOptionIndex')::INTEGER;
            v_options        := v_question.options;
            v_student_answer := COALESCE(
                v_answer.answer_data->>'value',
                v_answer.answer_data#>>'{}'
            );
            v_student_answer := trim(both '"' from COALESCE(v_student_answer, ''));

            IF v_options IS NOT NULL AND v_correct_idx IS NOT NULL THEN
                IF v_student_answer = trim(both '"' from (v_options->>v_correct_idx)) THEN
                    v_is_correct    := true;
                    v_marks_awarded := v_question.marks;
                ELSIF v_neg_enabled AND v_student_answer != '' THEN
                    v_marks_awarded := -v_neg_value;
                END IF;
            END IF;

        -- ── TRUE-FALSE ───────────────────────────────────────────────────────
        ELSIF v_question.question_type = 'true-false' THEN
            v_correct_val    := lower(COALESCE(v_question.correct_answer->>'correctAnswer', ''));
            v_student_answer := lower(COALESCE(
                v_answer.answer_data->>'value',
                v_answer.answer_data#>>'{}'
            ));
            v_student_answer := trim(both '"' from COALESCE(v_student_answer, ''));

            IF v_student_answer = v_correct_val THEN
                v_is_correct    := true;
                v_marks_awarded := v_question.marks;
            ELSIF v_neg_enabled AND v_student_answer != '' THEN
                v_marks_awarded := -v_neg_value;
            END IF;

        -- ── FILL-UPS (normalized comparison) ─────────────────────────────────
        ELSIF v_question.question_type = 'fillups' THEN
            v_correct_answers := v_question.correct_answer->'answers';
            v_student_answer := COALESCE(
                v_answer.answer_data->>'value',
                v_answer.answer_data#>>'{}'
            );
            v_student_answer := lower(trim(both '"' from trim(COALESCE(v_student_answer, ''))));

            IF v_correct_answers IS NOT NULL AND jsonb_array_length(v_correct_answers) > 0 THEN
                FOR v_ca IN SELECT jsonb_array_elements_text(v_correct_answers) LOOP
                    IF lower(trim(v_ca)) = v_student_answer THEN
                        v_is_correct    := true;
                        v_marks_awarded := v_question.marks;
                        EXIT;
                    END IF;
                END LOOP;
            END IF;

            IF NOT v_is_correct AND v_neg_enabled AND v_student_answer != '' THEN
                v_marks_awarded := -v_neg_value;
            END IF;

        END IF;

        -- Accumulate score
        v_total_score := v_total_score + v_marks_awarded;

        -- Update answer record with calculated score
        UPDATE public.answers
        SET    is_correct    = v_is_correct,
               marks_awarded = v_marks_awarded
        WHERE  attempt_id  = p_attempt_id
          AND  question_id = v_answer.question_id;

    END LOOP;

    -- ─── 6. Clamp score to [0, total_marks] ──────────────────────────────────
    v_total_score := GREATEST(0, LEAST(v_total_score, v_total_marks));

    -- ─── 7. Finalize attempt record ──────────────────────────────────────────
    UPDATE public.attempts
    SET    status       = v_final_status,
           score        = v_total_score::INTEGER,
           total_marks  = v_total_marks::INTEGER,
           submitted_at = timezone('utc'::text, now()),
           updated_at   = timezone('utc'::text, now())
    WHERE  id = p_attempt_id;

    RETURN jsonb_build_object(
        'score',       v_total_score,
        'total_marks', v_total_marks,
        'status',      v_final_status,
        'idempotent',  false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_and_submit_attempt(UUID, TEXT) TO authenticated;

-- 3. Update Answers table RLS policy to enforce deadline check on answer upserts/inserts
DROP POLICY IF EXISTS "Students can insert answers for their attempt" ON public.answers;

CREATE POLICY "Students can insert answers for their attempt"
ON public.answers
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.attempts
        WHERE attempts.id = answers.attempt_id
        AND attempts.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.attempts
        JOIN public.tests ON tests.id = attempts.test_id
        WHERE attempts.id = answers.attempt_id
        AND attempts.user_id = auth.uid()
        AND attempts.status = 'in_progress'
        AND timezone('utc'::text, now()) <= (attempts.started_at + (COALESCE(tests.duration, 60) * interval '1 minute') + interval '2 minutes')
    )
);
