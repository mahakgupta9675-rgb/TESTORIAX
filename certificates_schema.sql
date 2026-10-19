-- SQL script to create the certificates table in Supabase
-- Run this script in the Supabase SQL Editor (https://supabase.com)

CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    certificate_name TEXT NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    download_url TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own certificates
DROP POLICY IF EXISTS "Allow select for own certificates" ON public.certificates;
CREATE POLICY "Allow select for own certificates" ON public.certificates
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Policy: System can insert certificates
DROP POLICY IF EXISTS "Allow insert for own certificates" ON public.certificates;
CREATE POLICY "Allow insert for own certificates" ON public.certificates
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
