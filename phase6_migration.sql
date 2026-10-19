-- =====================================================
-- PHASE 6 MIGRATION: EVALUATION & RESULTS
-- Run this entire script in your Supabase SQL Editor
-- =====================================================

-- 1. Ensure answers table has marks_awarded as NUMERIC (not INTEGER) to support partial marks
ALTER TABLE public.answers
  ALTER COLUMN marks_awarded TYPE NUMERIC(10,2) USING marks_awarded::NUMERIC(10,2);

-- 2. Ensure attempts.score supports decimals (optional, keep as INTEGER for now since we floor)
-- ALTER TABLE public.attempts ALTER COLUMN score TYPE NUMERIC(10,2);

-- 3. Add rank support: index on test_id + score for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_attempts_test_score ON public.attempts(test_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted_at ON public.attempts(submitted_at);
CREATE INDEX IF NOT EXISTS idx_answers_is_correct ON public.answers(attempt_id, is_correct);

-- 4. Add creator_results policy: creators can already read attempts via existing policy
-- Verify: "Allow select for own attempts or test creators" already exists from phase 4

-- 5. Drop and recreate the improved calculate_and_submit_attempt function
-- This version: supports negative marking, coding scores from answers table (Judge0 results),
-- is idempotent (returns stored result for already-submitted attempts)
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

    -- ─── 3. Fetch test config (negative marking) ─────────────────────────────
    SELECT * INTO v_test FROM public.tests WHERE id = v_attempt.test_id;

    IF v_test.negative_marking IS NOT NULL THEN
        v_neg_enabled := COALESCE((v_test.negative_marking->>'enabled')::BOOLEAN, false);
        v_neg_value   := COALESCE((v_test.negative_marking->>'value')::NUMERIC, 0);
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

        v_is_correct  := false;
        v_marks_awarded := 0;

        -- ── CODING: trust marks already written by Judge0 server endpoint ──
        IF v_question.question_type = 'coding' THEN
            -- If Judge0 already evaluated, marks_awarded is already stored.
            -- Just read it; if missing or zero and code is non-trivial, award 0.
            v_marks_awarded := COALESCE(v_answer.pre_awarded, 0);
            v_is_correct    := v_marks_awarded >= v_question.marks;
            -- Don't overwrite answer record; Judge0 already did that.
            v_total_score := v_total_score + v_marks_awarded;
            CONTINUE;
        END IF;

        -- ── MCQ ─────────────────────────────────────────────────────────────
        IF v_question.question_type = 'mcq' THEN
            v_correct_idx    := (v_question.correct_answer->>'correctOptionIndex')::INTEGER;
            v_options        := v_question.options;
            -- Student answer may be stored as plain string or as {"value":"..."} 
            v_student_answer := COALESCE(
                v_answer.answer_data->>'value',
                v_answer.answer_data#>>'{}'
            );
            v_student_answer := trim(both '"' from COALESCE(v_student_answer, ''));

            IF v_options IS NOT NULL AND v_correct_idx IS NOT NULL THEN
                -- options is a JSON array of strings
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
            -- extract submitted text from various storage formats
            v_student_answer := COALESCE(
                v_answer.answer_data->>'value',
                v_answer.answer_data#>>'{}'
            );
            -- strip outer quotes, lower, trim
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

        -- Accumulate
        v_total_score := v_total_score + v_marks_awarded;

        -- Update answer record
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
    SET    status       = p_status,
           score        = v_total_score::INTEGER,
           total_marks  = v_total_marks::INTEGER,
           submitted_at = timezone('utc'::text, now()),
           updated_at   = timezone('utc'::text, now())
    WHERE  id = p_attempt_id;

    RETURN jsonb_build_object(
        'score',       v_total_score,
        'total_marks', v_total_marks,
        'status',      p_status,
        'idempotent',  false
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.calculate_and_submit_attempt(UUID, TEXT) TO authenticated;

-- 6. Helper function for creator: get all submitted attempts for a test with ranking
-- Creators can call this to see results
CREATE OR REPLACE FUNCTION public.get_test_results_for_creator(p_test_id UUID)
RETURNS TABLE (
    attempt_id      UUID,
    user_id         UUID,
    full_name       TEXT,
    email           TEXT,
    avatar_url      TEXT,
    score           INTEGER,
    total_marks     INTEGER,
    percentage      NUMERIC,
    status          TEXT,
    submitted_at    TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    warning_count   INTEGER,
    rank            BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify caller is the creator of this test
    IF NOT EXISTS (
        SELECT 1 FROM public.tests t
        WHERE t.id = p_test_id AND t.creator_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You are not the creator of this test';
    END IF;

    RETURN QUERY
    SELECT
        a.id                                          AS attempt_id,
        a.user_id,
        p.full_name,
        p.email,
        p.avatar_url,
        a.score,
        a.total_marks,
        CASE WHEN a.total_marks > 0
             THEN ROUND((a.score::NUMERIC / a.total_marks) * 100, 1)
             ELSE 0 END                               AS percentage,
        a.status,
        a.submitted_at,
        a.started_at,
        a.warning_count,
        RANK() OVER (ORDER BY a.score DESC, a.submitted_at ASC) AS rank
    FROM   public.attempts a
    LEFT   JOIN public.profiles p ON p.id = a.user_id
    WHERE  a.test_id = p_test_id
      AND  a.status IN ('submitted', 'expired')
    ORDER  BY rank;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_results_for_creator(UUID) TO authenticated;

-- 7. Ensure answers table also stores marks as numeric for partial coding scores
-- The migration above already altered marks_awarded to NUMERIC(10,2)

-- 8. Add result_visibility RLS enforcement: students cannot see each other's answers
-- unless declared public by creator (existing policies handle this via attempts ownership)
-- No additional policies needed beyond what exists.

-- =====================================================
-- DONE
-- =====================================================
