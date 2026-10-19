-- ====================================================
-- PHASE 9 MIGRATION: NOTIFICATIONS & COMMUNICATION SYSTEM
-- ====================================================

-- 1. Create Notifications Table (or ensure columns exist on existing table)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id TEXT DEFAULT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure is_read column exists if table already existed without it
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Sync legacy 'unread' column if it exists in older schema
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'unread'
  ) THEN 
    UPDATE public.notifications SET is_read = NOT unread WHERE is_read IS FALSE;
  END IF;
END $$;

-- 2. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- Unique index for duplicate prevention (e.g. test registration or result release for same user & reference)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_ref 
  ON public.notifications(user_id, type, reference_id) 
  WHERE reference_id IS NOT NULL;

-- 3. Row Level Security (RLS) Setup
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users or creators can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- SELECT Policy: Users can ONLY view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE Policy: Users can ONLY update their own notifications (e.g. mark read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT Policy: Authenticated users can insert notifications (for self or system triggers)
CREATE POLICY "Users or creators can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL);

-- DELETE Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated, anon;

-- 5. Helper Function: Notify Followers when Creator Publishes Test
CREATE OR REPLACE FUNCTION public.notify_followers_on_test_publish(
  p_creator_id UUID,
  p_test_id TEXT,
  p_test_title TEXT,
  p_creator_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, reference_id)
  SELECT 
    f.follower_id,
    'creator_published_test',
    'New Test Published',
    p_creator_name || ' just published a new test: "' || p_test_title || '"',
    p_test_id
  FROM public.follows f
  WHERE f.following_id = p_creator_id
  ON CONFLICT (user_id, type, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_followers_on_test_publish TO authenticated, anon;
