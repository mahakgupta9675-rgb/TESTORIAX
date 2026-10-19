-- SQL script for Phase 4: Secure Exam Conduct, Anti-Cheat & Server-Side Security

-- 1. Ensure `tests` has `security_settings`
ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{
  "fullscreen_required": false,
  "tab_switch_detection": false,
  "webcam_required": false,
  "copy_paste_restriction": false,
  "right_click_restriction": false,
  "warning_limit": 3,
  "auto_submit_on_warning_limit": true
}'::jsonb;

-- 2. Ensure `attempts` has tracking columns
ALTER TABLE public.attempts
ADD COLUMN IF NOT EXISTS tab_switch_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS fullscreen_exit_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS warning_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_question_index INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_time INT,
ADD COLUMN IF NOT EXISTS device_information JSONB,
ADD COLUMN IF NOT EXISTS browser_information JSONB,
ADD COLUMN IF NOT EXISTS question_progress JSONB DEFAULT '{"visited": [], "marked": []}'::jsonb;

-- 3. Create `proctoring_events` table
CREATE TABLE IF NOT EXISTS public.proctoring_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'TAB_SWITCH', 'FULLSCREEN_EXIT', 'FACE_NOT_DETECTED', 'MULTIPLE_FACES', etc.
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB
);

-- Enable RLS for proctoring_events
ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;

-- Proctoring Events Policies
-- 1. Students can insert events for their own active attempt
CREATE POLICY "Students can insert proctoring events for their attempt"
ON public.proctoring_events
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.attempts
        WHERE attempts.id = proctoring_events.attempt_id
        AND attempts.user_id = auth.uid()
        AND attempts.status = 'in_progress'
    )
);

-- 2. Creators can view proctoring events for attempts on their tests
CREATE POLICY "Creators can view proctoring events for their tests"
ON public.proctoring_events
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.attempts
        JOIN public.tests ON tests.id = attempts.test_id
        WHERE attempts.id = proctoring_events.attempt_id
        AND tests.creator_id = auth.uid()
    )
);

-- 4. Update Answers table constraint
-- Ensure unique constraint exists for (attempt_id, question_id)
ALTER TABLE public.answers
DROP CONSTRAINT IF EXISTS unique_attempt_question;

ALTER TABLE public.answers
ADD CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id);

-- RLS Updates for Answers
-- Students can insert/update their own answers if the attempt is in_progress
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
        WHERE attempts.id = answers.attempt_id
        AND attempts.user_id = auth.uid()
        AND attempts.status = 'in_progress'
    )
);
