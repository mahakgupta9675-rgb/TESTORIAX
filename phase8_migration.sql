-- ====================================================
-- PHASE 8 MIGRATION: FOLLOW, PROFILE & SOCIAL SYSTEM
-- ====================================================

-- 0. Ensure profiles table has banner_url, avatar_url, bio, specialty & username columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- 1. Create Follows Table
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follows_follower_following_key UNIQUE(follower_id, following_id),
  CONSTRAINT follows_no_self_follow CHECK (follower_id <> following_id)
);

-- 2. Indexes for fast social graph traversals
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- 3. Row Level Security (RLS) Setup
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
DROP POLICY IF EXISTS "Users can insert their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

-- SELECT Policy: Everyone can view follow relationships
CREATE POLICY "Anyone can view follows"
  ON public.follows
  FOR SELECT
  USING (true);

-- INSERT Policy: Authenticated users can only follow on their own behalf and cannot follow themselves
CREATE POLICY "Users can insert their own follows"
  ON public.follows
  FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id 
    AND follower_id <> following_id
  );

-- DELETE Policy: Authenticated users can only unfollow on their own behalf
CREATE POLICY "Users can delete their own follows"
  ON public.follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- 4. RPC Function for Followers List with User Profiles
CREATE OR REPLACE FUNCTION public.get_followers_list(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  specialty TEXT,
  bio TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.specialty,
    p.bio,
    f.created_at AS followed_at
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.follower_id
  WHERE f.following_id = p_user_id
  ORDER BY f.created_at DESC;
END;
$$;

-- 5. RPC Function for Following List with User Profiles
CREATE OR REPLACE FUNCTION public.get_following_list(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  specialty TEXT,
  bio TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.specialty,
    p.bio,
    f.created_at AS followed_at
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.following_id
  WHERE f.follower_id = p_user_id
  ORDER BY f.created_at DESC;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_followers_list(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_following_list(UUID) TO authenticated, anon;
