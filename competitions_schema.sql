-- SQL script to create the competitions and test_registrations tables in Supabase
-- Run this script in the Supabase SQL Editor (https://supabase.com)

-- 1. Create competitions table
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    competition_title TEXT NOT NULL,
    competition_description TEXT,
    banner_theme TEXT,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER,
    prize_details TEXT,
    competition_rules TEXT,
    organizer_contact TEXT,
    leaderboard_visibility TEXT CHECK (leaderboard_visibility IN ('live', 'after_end', 'hide')) DEFAULT 'live',
    winner_visibility TEXT CHECK (winner_visibility IN ('public', 'anonymous', 'private')) DEFAULT 'public',
    status TEXT CHECK (status IN ('draft', 'upcoming', 'live', 'completed', 'cancelled')) DEFAULT 'draft',
    winners_announced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to automatically update updated_at timestamp on update
CREATE OR REPLACE FUNCTION public.handle_competitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_competitions_updated_at ON public.competitions;
CREATE TRIGGER update_competitions_updated_at
    BEFORE UPDATE ON public.competitions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_competitions_updated_at();

-- 2. Create test_registrations table
CREATE TABLE IF NOT EXISTS public.test_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (competition_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_registrations ENABLE ROW LEVEL SECURITY;

-- 4. Competitions RLS Policies
DROP POLICY IF EXISTS "Allow creator full access" ON public.competitions;
-- Creators can perform all operations on their own competitions
CREATE POLICY "Allow creator full access" ON public.competitions
    FOR ALL TO authenticated
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Allow select for public competitions" ON public.competitions;
-- Anyone can select public competitions (where linked test is public and status is not draft)
CREATE POLICY "Allow select for public competitions" ON public.competitions
    FOR SELECT USING (
        status != 'draft'
        AND EXISTS (
            SELECT 1 FROM public.tests
            WHERE public.tests.id = test_id
            AND public.tests.visibility = 'public'
        )
    );

-- 5. Test Registrations RLS Policies
DROP POLICY IF EXISTS "Allow select for owner or competition creator" ON public.test_registrations;
-- Users can view their own registrations, and competition creators can view registrations for their competitions
CREATE POLICY "Allow select for owner or competition creator" ON public.test_registrations
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.competitions c
            WHERE c.id = competition_id
            AND c.creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow registration insert for own user" ON public.test_registrations;
-- Authenticated users can register themselves
CREATE POLICY "Allow registration insert for own user" ON public.test_registrations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow registration delete for own user" ON public.test_registrations;
-- Authenticated users can cancel/delete their own registration
CREATE POLICY "Allow registration delete for own user" ON public.test_registrations
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
