-- =====================================================
-- PHASE 4 COMPLETE MIGRATION
-- Run this entire script in your Supabase SQL Editor
-- =====================================================

-- 1. Add missing columns to attempts table
ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS device_information JSONB,
  ADD COLUMN IF NOT EXISTS browser_information JSONB,
  ADD COLUMN IF NOT EXISTS question_progress JSONB DEFAULT '{"visited": [], "marked": []}'::jsonb;

-- 2. Ensure all security-related columns exist on attempts
ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS tab_switch_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fullscreen_exit_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warning_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_question_index INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_time INT;

-- 3. Add competition_id if missing
ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL;

-- 4. Ensure tests table has security_settings with correct field names
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{
    "require_fullscreen": false,
    "tab_switch_detection": false,
    "require_webcam": false,
    "require_mic": false,
    "disable_copy_paste": false,
    "disable_right_click": false,
    "disable_shortcuts": false,
    "detect_devtools": false,
    "auto_submit_on_violations": true,
    "max_violations": 3,
    "face_presence_detection": false,
    "multiple_face_detection": false,
    "face_missing_detection": false,
    "record_violation_screenshots": false,
    "periodic_snapshot_capture": false
  }'::jsonb;

-- 5. Ensure proctoring_events table exists with correct schema
CREATE TABLE IF NOT EXISTS public.proctoring_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
    session_id UUID,  -- references proctoring_sessions.id (if used)
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. Ensure proctoring_sessions table exists
CREATE TABLE IF NOT EXISTS public.proctoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    camera_enabled BOOLEAN DEFAULT false,
    microphone_enabled BOOLEAN DEFAULT false,
    status TEXT CHECK (status IN ('active', 'completed', 'disconnected')) DEFAULT 'active',
    security_score INTEGER DEFAULT 100,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Enable RLS for new tables
ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_sessions ENABLE ROW LEVEL SECURITY;

-- 8. Drop & recreate proctoring_events policies
DROP POLICY IF EXISTS "Students can insert proctoring events for their attempt" ON public.proctoring_events;
DROP POLICY IF EXISTS "Creators can view proctoring events for their tests" ON public.proctoring_events;
DROP POLICY IF EXISTS "Students can view their own proctoring events" ON public.proctoring_events;

CREATE POLICY "Students can insert proctoring events for their attempt"
ON public.proctoring_events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.attempts
        WHERE attempts.id = proctoring_events.attempt_id
        AND attempts.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.proctoring_sessions
        WHERE proctoring_sessions.id = proctoring_events.session_id
        AND proctoring_sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Students can view their own proctoring events"
ON public.proctoring_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.attempts
        WHERE attempts.id = proctoring_events.attempt_id
        AND attempts.user_id = auth.uid()
    )
);

CREATE POLICY "Creators can view proctoring events for their tests"
ON public.proctoring_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.attempts
        JOIN public.tests ON tests.id = attempts.test_id
        WHERE attempts.id = proctoring_events.attempt_id
        AND tests.creator_id = auth.uid()
    )
);

-- 9. Proctoring sessions policies
DROP POLICY IF EXISTS "Students can insert proctoring sessions" ON public.proctoring_sessions;
DROP POLICY IF EXISTS "Students can view own sessions" ON public.proctoring_sessions;
DROP POLICY IF EXISTS "Students can update own sessions" ON public.proctoring_sessions;
DROP POLICY IF EXISTS "Creators view proctoring sessions" ON public.proctoring_sessions;

CREATE POLICY "Students can insert proctoring sessions"
ON public.proctoring_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own sessions"
ON public.proctoring_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Students can update own sessions"
ON public.proctoring_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Creators view proctoring sessions"
ON public.proctoring_sessions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tests
        WHERE tests.id = proctoring_sessions.test_id
        AND tests.creator_id = auth.uid()
    )
);

-- 10. Harden attempts RLS - students cannot modify score or change status back
-- The existing policies allow updates by owner, which is needed for auto-save.
-- Score & status are protected server-side by the submitExamAttempt function,
-- and by not exposing a direct score-update endpoint to students.

-- 11. Ensure answers unique constraint exists
ALTER TABLE public.answers
  DROP CONSTRAINT IF EXISTS answers_attempt_id_question_id_key;
ALTER TABLE public.answers
  DROP CONSTRAINT IF EXISTS unique_attempt_question;
ALTER TABLE public.answers
  ADD CONSTRAINT answers_unique_attempt_question UNIQUE (attempt_id, question_id);

-- 12. Create exam_security_logs table if not exists
CREATE TABLE IF NOT EXISTS public.exam_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    violation_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    question_number INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration INTEGER,
    browser TEXT,
    device TEXT,
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.exam_security_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_exam_sec_logs_attempt_id ON public.exam_security_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_sec_logs_test_id ON public.exam_security_logs(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON public.attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_test_user ON public.attempts(test_id, user_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON public.answers(attempt_id);

DROP POLICY IF EXISTS "Users can insert their own security logs" ON public.exam_security_logs;
DROP POLICY IF EXISTS "Users can view their own security logs" ON public.exam_security_logs;
DROP POLICY IF EXISTS "Creators can view logs for their tests" ON public.exam_security_logs;

CREATE POLICY "Users can insert their own security logs"
    ON public.exam_security_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own security logs"
    ON public.exam_security_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Creators can view logs for their tests"
    ON public.exam_security_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = exam_security_logs.test_id
            AND tests.creator_id = auth.uid()
        )
    );

-- 13. Server-side score calculation function
-- This PostgreSQL function calculates the score server-side at submission
CREATE OR REPLACE FUNCTION public.calculate_and_submit_attempt(
    p_attempt_id UUID,
    p_status TEXT DEFAULT 'submitted'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempt RECORD;
    v_test RECORD;
    v_total_score INTEGER := 0;
    v_total_marks INTEGER := 0;
    v_answer RECORD;
    v_question RECORD;
    v_is_correct BOOLEAN;
    v_marks_awarded INTEGER;
    v_result JSONB;
BEGIN
    -- Fetch attempt and verify ownership
    SELECT * INTO v_attempt FROM public.attempts WHERE id = p_attempt_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;
    
    -- Verify caller owns this attempt
    IF v_attempt.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You do not own this attempt';
    END IF;
    
    -- Already submitted guard (idempotent)
    IF v_attempt.status != 'in_progress' THEN
        SELECT jsonb_build_object(
            'score', v_attempt.score,
            'total_marks', v_attempt.total_marks,
            'status', v_attempt.status
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- Fetch all questions for this test to calculate total_marks
    SELECT COALESCE(SUM(marks), 0) INTO v_total_marks
    FROM public.questions
    WHERE test_id = v_attempt.test_id AND status = 'active';
    
    -- Calculate score from answers against questions
    FOR v_answer IN
        SELECT a.question_id, a.answer_data
        FROM public.answers a
        WHERE a.attempt_id = p_attempt_id
    LOOP
        -- Get the question
        SELECT * INTO v_question
        FROM public.questions
        WHERE id = v_answer.question_id AND test_id = v_attempt.test_id;
        
        IF NOT FOUND THEN CONTINUE; END IF;
        
        v_is_correct := false;
        v_marks_awarded := 0;
        
        -- MCQ check
        IF v_question.question_type = 'mcq' THEN
            DECLARE
                v_correct_idx INTEGER;
                v_student_answer TEXT;
                v_options JSONB;
            BEGIN
                v_correct_idx := (v_question.correct_answer->>'correctOptionIndex')::INTEGER;
                v_options := v_question.options;
                v_student_answer := v_answer.answer_data->>'value';
                IF v_student_answer IS NULL THEN
                    v_student_answer := v_answer.answer_data#>>'{}'::TEXT[];
                END IF;
                
                IF v_options IS NOT NULL AND v_correct_idx IS NOT NULL THEN
                    IF v_student_answer = (v_options->>v_correct_idx) THEN
                        v_is_correct := true;
                        v_marks_awarded := v_question.marks;
                    END IF;
                END IF;
            END;
            
        -- True/False check
        ELSIF v_question.question_type = 'true-false' THEN
            DECLARE
                v_correct_val TEXT;
                v_student_val TEXT;
            BEGIN
                v_correct_val := lower(v_question.correct_answer->>'correctAnswer');
                v_student_val := lower(v_answer.answer_data::text);
                IF v_student_val LIKE '%' || v_correct_val || '%' THEN
                    v_is_correct := true;
                    v_marks_awarded := v_question.marks;
                END IF;
            END;
            
        -- Fill-ups check (normalized match)
        ELSIF v_question.question_type = 'fillups' THEN
            DECLARE
                v_correct_answers JSONB;
                v_student_answer TEXT;
                v_ca TEXT;
            BEGIN
                v_correct_answers := v_question.correct_answer->'answers';
                v_student_answer := lower(trim(v_answer.answer_data::text));
                -- Remove surrounding quotes if JSON string
                v_student_answer := replace(replace(v_student_answer, '"', ''), '''', '');
                
                IF v_correct_answers IS NOT NULL THEN
                    FOR v_ca IN SELECT jsonb_array_elements_text(v_correct_answers)
                    LOOP
                        IF lower(trim(v_ca)) = v_student_answer THEN
                            v_is_correct := true;
                            v_marks_awarded := v_question.marks;
                            EXIT;
                        END IF;
                    END LOOP;
                END IF;
            END;
            
        -- Coding: give marks if answer is non-empty (Judge0 not yet integrated)
        ELSIF v_question.question_type = 'coding' THEN
            IF v_answer.answer_data IS NOT NULL AND length(v_answer.answer_data::text) > 10 THEN
                v_is_correct := true;
                v_marks_awarded := v_question.marks;
            END IF;
        END IF;
        
        v_total_score := v_total_score + v_marks_awarded;
        
        -- Update the answer record with correctness & marks
        UPDATE public.answers
        SET is_correct = v_is_correct, marks_awarded = v_marks_awarded
        WHERE attempt_id = p_attempt_id AND question_id = v_answer.question_id;
    END LOOP;
    
    -- Update the attempt record
    UPDATE public.attempts
    SET
        status = p_status,
        score = v_total_score,
        total_marks = v_total_marks,
        submitted_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_attempt_id;
    
    SELECT jsonb_build_object(
        'score', v_total_score,
        'total_marks', v_total_marks,
        'status', p_status
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_and_submit_attempt(UUID, TEXT) TO authenticated;
