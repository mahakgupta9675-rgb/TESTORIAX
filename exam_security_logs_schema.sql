-- SQL script to create the exam_security_logs table in Supabase
-- Run this script in the Supabase SQL Editor (https://supabase.com)

CREATE TABLE IF NOT EXISTS public.exam_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    
    violation_type TEXT NOT NULL, -- e.g., 'fullscreen_exit', 'tab_switch', 'copy_paste', 'devtools', 'auto_submit'
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    question_number INTEGER, -- optional: the question they were on when the violation occurred
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration INTEGER, -- duration in milliseconds (e.g. how long they were away from the tab)
    
    browser TEXT,
    device TEXT,
    ip_address TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb -- For additional context like "leave_time", "return_time" etc.
);

-- Indexes for efficient querying by creators
CREATE INDEX IF NOT EXISTS idx_exam_sec_logs_attempt_id ON public.exam_security_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_sec_logs_test_id ON public.exam_security_logs(test_id);

-- Enable RLS
ALTER TABLE public.exam_security_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can insert their own logs
CREATE POLICY "Users can insert their own security logs"
    ON public.exam_security_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own logs
CREATE POLICY "Users can view their own security logs"
    ON public.exam_security_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Creators can view logs for their own tests
CREATE POLICY "Creators can view logs for their tests"
    ON public.exam_security_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tests
            WHERE tests.id = exam_security_logs.test_id
            AND tests.creator_id = auth.uid()
        )
    );
