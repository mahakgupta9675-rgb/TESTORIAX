-- ====================================================
-- PHASE 11 MIGRATION: ADMIN PANEL & PLATFORM MANAGEMENT
-- ====================================================

-- 1. Ensure role and status columns exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Create index on role and status
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 2. Helper Function: Check if auth user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND role = 'admin' AND COALESCE(status, 'active') = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, anon;

-- 3. Create Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- 4. Create Content Reports Table
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'actioned'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_test ON public.content_reports(test_id);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-running
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can view content reports" ON public.content_reports;
DROP POLICY IF EXISTS "Users can insert content reports" ON public.content_reports;
DROP POLICY IF EXISTS "Admins can update content reports" ON public.content_reports;

-- RLS Policies
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view content reports"
  ON public.content_reports
  FOR SELECT
  USING (public.is_admin(auth.uid()) OR auth.uid() = reporter_id);

CREATE POLICY "Users can insert content reports"
  ON public.content_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update content reports"
  ON public.content_reports
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated, anon;

-- 5. SERVER-SIDE AUTHORIZED ADMIN RPC FUNCTIONS

-- A. Platform Stats RPC
CREATE OR REPLACE FUNCTION public.admin_get_platform_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users INT;
  v_total_tests INT;
  v_published_tests INT;
  v_total_attempts INT;
  v_total_certs INT;
  v_pending_reports INT;
BEGIN
  -- Strict Server-Side Authorization Check
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Administrator privileges required.' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_total_tests FROM public.tests WHERE status != 'deleted';
  SELECT COUNT(*) INTO v_published_tests FROM public.tests WHERE status = 'published';
  SELECT COUNT(*) INTO v_total_attempts FROM public.attempts;
  SELECT COUNT(*) INTO v_total_certs FROM public.certificates;
  SELECT COUNT(*) INTO v_pending_reports FROM public.content_reports WHERE status = 'pending';

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'total_tests', v_total_tests,
    'published_tests', v_published_tests,
    'total_attempts', v_total_attempts,
    'total_certificates', v_total_certs,
    'pending_reports', v_pending_reports
  );
END;
$$;

-- B. List All Users RPC
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search TEXT DEFAULT '')
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Administrator privileges required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    COALESCE(p.role, 'user') AS role,
    COALESCE(p.status, 'active') AS status,
    p.created_at
  FROM public.profiles p
  WHERE (p_search = '' OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
  ORDER BY p.created_at DESC
  LIMIT 100;
END;
$$;

-- C. Update User Status RPC (Suspend / Restore)
CREATE OR REPLACE FUNCTION public.admin_update_user_status(p_target_user_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Administrator privileges required.' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status. Must be active or suspended.';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = auth.uid();

  UPDATE public.profiles
  SET status = p_status
  WHERE id = p_target_user_id;

  -- Audit log entry
  INSERT INTO public.admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    v_admin_email,
    'update_user_status',
    'user',
    p_target_user_id::text,
    jsonb_build_object('new_status', p_status)
  );

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

-- D. Update User Role RPC
CREATE OR REPLACE FUNCTION public.admin_update_user_role(p_target_user_id UUID, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Administrator privileges required.' USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be user or admin.';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = auth.uid();

  UPDATE public.profiles
  SET role = p_role
  WHERE id = p_target_user_id;

  -- Audit log entry
  INSERT INTO public.admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    v_admin_email,
    'update_user_role',
    'user',
    p_target_user_id::text,
    jsonb_build_object('new_role', p_role)
  );

  RETURN jsonb_build_object('success', true, 'role', p_role);
END;
$$;

-- E. Unpublish / Moderate Test RPC
CREATE OR REPLACE FUNCTION public.admin_unpublish_test(p_test_id TEXT, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Administrator privileges required.' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = auth.uid();

  UPDATE public.tests
  SET status = 'draft', updated_at = NOW()
  WHERE id = p_test_id;

  INSERT INTO public.admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    v_admin_email,
    'unpublish_test',
    'test',
    p_test_id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'test_id', p_test_id);
END;
$$;

-- F. Broadcast System Notification RPC
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(p_title TEXT, p_message TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT;
  v_count INT := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Administrator privileges required.' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_admin_email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.notifications (user_id, type, title, message, reference_id)
  SELECT 
    id,
    'system_announcement',
    p_title,
    p_message,
    'system'
  FROM public.profiles
  WHERE COALESCE(status, 'active') = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    v_admin_email,
    'broadcast_notification',
    'system',
    'broadcast',
    jsonb_build_object('title', p_title, 'recipient_count', v_count)
  );

  RETURN jsonb_build_object('success', true, 'recipients', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_platform_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unpublish_test TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification TO authenticated;
