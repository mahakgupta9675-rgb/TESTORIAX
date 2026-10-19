-- SQL script to create the tests table in Supabase
-- Run this script in the Supabase SQL Editor (https://supabase.com)

CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER,
    total_marks INTEGER,
    negative_marking JSONB, -- stores { enabled: boolean, value: number }
    visibility TEXT CHECK (visibility IN ('public', 'private')),
    registration_type TEXT CHECK (registration_type IN ('none', 'simple', 'custom')),
    entry_fee INTEGER,
    status TEXT CHECK (status IN ('draft', 'published', 'deleted')) DEFAULT 'draft',
    
    -- Additional columns to support full wizard configurations persistence
    questions JSONB DEFAULT '[]'::jsonb,
    mock_thumbnail TEXT,
    expiry_time TEXT,
    custom_question TEXT,
    reg_fields JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Creators can view their own tests (all statuses)
CREATE POLICY "Allow select for creator" ON public.tests
    FOR SELECT TO authenticated
    USING (auth.uid() = creator_id);

-- 2. Policy: Anyone can view published tests (for candidates taking exams or discovery)
CREATE POLICY "Allow select for published tests" ON public.tests
    FOR SELECT USING (status = 'published');

-- 3. Policy: Authenticated users can create tests
CREATE POLICY "Allow insert for authenticated creators" ON public.tests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = creator_id);

-- 4. Policy: Creators can update their own tests
CREATE POLICY "Allow update for creators" ON public.tests
    FOR UPDATE TO authenticated
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- 5. Policy: Creators can delete their own tests
CREATE POLICY "Allow delete for creators" ON public.tests
    FOR DELETE TO authenticated
    USING (auth.uid() = creator_id);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tests_updated_at
    BEFORE UPDATE ON public.tests
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_tests_updated_at();

-- SQL script to create the questions table in Supabase
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB,
    correct_answer JSONB,
    marks INTEGER DEFAULT 5,
    image_url TEXT,
    explanation TEXT,
    order_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Anyone can view questions if the linked test is published OR if the logged-in user is the creator of the test
CREATE POLICY "Allow select for public published test questions or creator" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tests 
            WHERE public.tests.id = public.questions.test_id 
            AND (public.tests.status = 'published' OR public.tests.creator_id = auth.uid())
        )
    );

-- 2. Policy: Creators can insert questions if they own the test
CREATE POLICY "Allow insert for creators" ON public.questions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tests 
            WHERE public.tests.id = test_id 
            AND public.tests.creator_id = auth.uid()
        )
    );

-- 3. Policy: Creators can update questions if they own the test
CREATE POLICY "Allow update for creators" ON public.questions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tests 
            WHERE public.tests.id = test_id 
            AND public.tests.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tests 
            WHERE public.tests.id = test_id 
            AND public.tests.creator_id = auth.uid()
        )
    );

-- 4. Policy: Creators can delete questions if they own the test
CREATE POLICY "Allow delete for creators" ON public.questions
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tests 
            WHERE public.tests.id = test_id 
            AND public.tests.creator_id = auth.uid()
        )
    );


-- SQL script to create the registrations table in Supabase
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    registration_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (test_id, user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Policies:
-- 1. Anyone can view registrations (to count participants and check registration status)
CREATE POLICY "Allow public select for registrations" ON public.registrations
    FOR SELECT USING (true);

-- 2. Authenticated users can register for themselves
CREATE POLICY "Allow insert for authenticated users" ON public.registrations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Authenticated users can delete (cancel) their own registrations
CREATE POLICY "Allow delete for own registration" ON public.registrations
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);


-- Migration: Add Soft Delete & Trash Recovery system
ALTER TABLE public.tests DROP CONSTRAINT IF EXISTS tests_status_check;
ALTER TABLE public.tests ADD CONSTRAINT tests_status_check CHECK (status IN ('draft', 'published', 'archived', 'deleted'));
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS previous_status TEXT CHECK (previous_status IN ('draft', 'published', 'archived'));

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'deleted')) DEFAULT 'active';

-- Migration: Add attempts and answers tables for exam connection
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('in_progress', 'submitted', 'expired')) DEFAULT 'in_progress',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    score INTEGER DEFAULT 0,
    total_marks INTEGER DEFAULT 0,
    tab_switch_count INTEGER DEFAULT 0 NOT NULL,
    fullscreen_exit_count INTEGER DEFAULT 0 NOT NULL,
    warning_count INTEGER DEFAULT 0 NOT NULL,
    remaining_time INTEGER,
    current_question_index INTEGER DEFAULT 0 NOT NULL
);

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for own attempts" ON public.attempts
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
    
CREATE POLICY "Allow insert for own attempts" ON public.attempts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Allow update for own attempts" ON public.attempts
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    marks_awarded INTEGER DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (attempt_id, question_id)
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for own answers" ON public.answers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.attempts a
            WHERE a.id = answers.attempt_id
            AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow insert for own answers" ON public.answers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.attempts a
            WHERE a.id = attempt_id
            AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow update for own answers" ON public.answers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.attempts a
            WHERE a.id = answers.attempt_id
            AND a.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.attempts a
            WHERE a.id = attempt_id
            AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow delete for own answers" ON public.answers
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.attempts a
            WHERE a.id = answers.attempt_id
            AND a.user_id = auth.uid()
        )
    );

-- MIGRATION: RESULTS VISIBILITY, RELEASE MODES, WINNERS, AND NOTIFICATIONS
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS result_visibility TEXT CHECK (result_visibility IN ('public', 'anonymous', 'private', 'creator_only')) DEFAULT 'private';
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS answer_review_mode TEXT CHECK (answer_review_mode IN ('no_review', 'score_only', 'score_answers', 'score_answers_explanations')) DEFAULT 'score_answers_explanations';
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS result_release_mode TEXT CHECK (result_release_mode IN ('immediately', 'after_test_end', 'manual_release')) DEFAULT 'immediately';
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS winner_visibility TEXT CHECK (winner_visibility IN ('public', 'anonymous', 'private')) DEFAULT 'public';
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS notify_on_result_release BOOLEAN DEFAULT true;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS results_released BOOLEAN DEFAULT false;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS winners_announced BOOLEAN DEFAULT false;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    unread BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Allow select for own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Allow update for own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow insert for system/creator notifications" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Update attempts RLS policies to allow creators to select candidate attempts
DROP POLICY IF EXISTS "Allow select for own attempts" ON public.attempts;
CREATE POLICY "Allow select for own attempts or test creators" ON public.attempts
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.tests t
            WHERE t.id = public.attempts.test_id
            AND t.creator_id = auth.uid()
        )
    );

-- Update answers RLS policies to allow creators to select candidate answers
DROP POLICY IF EXISTS "Allow select for own answers" ON public.answers;
CREATE POLICY "Allow select for own answers or test creators" ON public.answers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.attempts a
            WHERE a.id = answers.attempt_id
            AND (
                a.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.tests t
                    WHERE t.id = a.test_id
                    AND t.creator_id = auth.uid()
                )
            )
        )
    );

-- Add foreign key constraint to public.attempts linking user_id to public.profiles for API joins
ALTER TABLE public.attempts 
  ADD CONSTRAINT attempts_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


-- ====================================================
-- COMPETITIONS MODULE TABLES & RELATIONSHIPS
-- ====================================================

-- 1. Create competitions table
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    banner_image TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER,
    visibility TEXT CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
    status TEXT CHECK (status IN ('draft', 'upcoming', 'live', 'completed', 'cancelled')) DEFAULT 'draft',
    prize_details TEXT,
    rules TEXT,
    organizer_contact TEXT,
    leaderboard_type TEXT CHECK (leaderboard_type IN ('live', 'after_end')) DEFAULT 'live',
    winner_visibility TEXT CHECK (winner_visibility IN ('public', 'anonymous', 'private')) DEFAULT 'public',
    winners_announced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on competitions
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

-- Competitions policies
CREATE POLICY "Allow public select for competitions" ON public.competitions
    FOR SELECT USING (visibility = 'public' OR auth.uid() = creator_id);

CREATE POLICY "Allow insert for authenticated creators" ON public.competitions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Allow update for competition creators" ON public.competitions
    FOR UPDATE TO authenticated
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Allow delete for competition creators" ON public.competitions
    FOR DELETE TO authenticated
    USING (auth.uid() = creator_id);

-- 2. Modify registrations table to add competition_id relation
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE;

-- 3. Modify attempts table to add competition_id relation
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE;




