-- SQL Script to completely create and configure the exam_attempts table
-- Run this script in your Supabase SQL Editor.

-- 1. Create the table if it does not exist
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_question INTEGER DEFAULT 0,
    time_remaining INTEGER,
    score INTEGER DEFAULT 0,
    total_marks INTEGER,
    violations INTEGER DEFAULT 0,
    tab_switch_count INTEGER DEFAULT 0,
    fullscreen_exit_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    question_progress JSONB DEFAULT '{}'::jsonb,
    last_saved TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "Users can view their own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can insert their own exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can update their own exam attempts" ON public.exam_attempts;

-- 4. Create Policies
CREATE POLICY "Users can view their own exam attempts" ON public.exam_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam attempts" ON public.exam_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam attempts" ON public.exam_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- 5. Create index on user_id and test_id to quickly find attempts
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_test 
ON public.exam_attempts(user_id, test_id);

-- 6. Add columns just in case the table already existed but was missing them
ALTER TABLE public.exam_attempts 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_marks INTEGER,
ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fullscreen_exit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS question_progress JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_saved TIMESTAMP WITH TIME ZONE DEFAULT NOW();
