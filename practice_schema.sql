-- SQL script to configure Practice Arena database requirements in Supabase
-- Run this script in the Supabase SQL Editor (https://supabase.com)

-- 1. Add host_competition column to tests table
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS host_competition BOOLEAN DEFAULT false;

-- 1b. Fix PostgREST relation cache by linking tests(creator_id) to public.profiles(id)
ALTER TABLE public.tests DROP CONSTRAINT IF EXISTS tests_creator_id_profiles_fkey;
ALTER TABLE public.tests 
ADD CONSTRAINT tests_creator_id_profiles_fkey 
FOREIGN KEY (creator_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 2. Make competition_id nullable on test_registrations table to allow standalone practice registrations
ALTER TABLE public.test_registrations ALTER COLUMN competition_id DROP NOT NULL;

-- 3. Add a unique constraint index for standalone practice registrations (only one registration per user per test)
CREATE UNIQUE INDEX IF NOT EXISTS test_registrations_user_test_no_comp_idx 
ON public.test_registrations (user_id, test_id) 
WHERE competition_id IS NULL;

-- 4. Re-configure RLS policy on test_registrations to allow linked test creators (educators) to view registrations
DROP POLICY IF EXISTS "Allow select for owner or competition creator" ON public.test_registrations;
CREATE POLICY "Allow select for owner or test creator" ON public.test_registrations
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.tests t
            WHERE t.id = test_id
            AND t.creator_id = auth.uid()
        )
    );

-- 5. Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, test_id)
);

-- Enable RLS on bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Bookmarks RLS policies
DROP POLICY IF EXISTS "Allow select for own bookmarks" ON public.bookmarks;
CREATE POLICY "Allow select for own bookmarks" ON public.bookmarks
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow insert for own bookmarks" ON public.bookmarks;
CREATE POLICY "Allow insert for own bookmarks" ON public.bookmarks
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow delete for own bookmarks" ON public.bookmarks;
CREATE POLICY "Allow delete for own bookmarks" ON public.bookmarks
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 6. Create reviews table (storing ratings and review comments)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, test_id)
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviews RLS policies
DROP POLICY IF EXISTS "Allow public select for reviews" ON public.reviews;
CREATE POLICY "Allow public select for reviews" ON public.reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for own reviews" ON public.reviews;
CREATE POLICY "Allow insert for own reviews" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow update for own reviews" ON public.reviews;
CREATE POLICY "Allow update for own reviews" ON public.reviews
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow delete for own reviews" ON public.reviews;
CREATE POLICY "Allow delete for own reviews" ON public.reviews
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
