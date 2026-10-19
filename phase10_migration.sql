-- ====================================================
-- PHASE 10 MIGRATION: CERTIFICATES & ACHIEVEMENTS SYSTEM
-- ====================================================

-- 1. Create Certificates Table (or ensure columns exist on pre-existing table)
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id TEXT DEFAULT NULL,
  attempt_id UUID DEFAULT NULL,
  student_name TEXT NOT NULL DEFAULT 'Testora Candidate',
  title TEXT NOT NULL DEFAULT 'Assessment Credential',
  category TEXT DEFAULT 'General',
  score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 100,
  percentage NUMERIC NOT NULL DEFAULT 0,
  instructor_name TEXT DEFAULT 'Testora Verified Educator',
  verification_status TEXT NOT NULL DEFAULT 'verified',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required Phase 10 columns exist if table was created by older script
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS certificate_code TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS test_id TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS attempt_id UUID;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS student_name TEXT DEFAULT 'Testora Candidate';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Assessment Credential';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 0;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 100;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS percentage NUMERIC DEFAULT 0;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS instructor_name TEXT DEFAULT 'Testora Verified Educator';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT NOW();

-- Populate empty certificate_codes if legacy rows exist
UPDATE public.certificates 
SET certificate_code = 'TST-' || to_char(NOW(), 'YYYY') || '-' || UPPER(SUBSTRING(md5(random()::text || id::text) FROM 1 FOR 6))
WHERE certificate_code IS NULL;

-- 2. Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code) WHERE certificate_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_certificates_attempt ON public.certificates(attempt_id) WHERE attempt_id IS NOT NULL;

-- 3. Create User Achievements Table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  badge_category TEXT DEFAULT 'General',
  badge_icon TEXT DEFAULT 'trophy',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_achievements_user_badge UNIQUE(user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.user_achievements(user_id);

-- 4. Row Level Security (RLS) Setup
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Public can view verified certificates by ID or code" ON public.certificates;
DROP POLICY IF EXISTS "System can insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "System can insert achievements" ON public.user_achievements;

-- Certificates Policies:
CREATE POLICY "Users can view their own certificates"
  ON public.certificates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view verified certificates by ID or code"
  ON public.certificates
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert certificates"
  ON public.certificates
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL);

-- Achievements Policies:
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL);

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE ON public.certificates TO authenticated, anon;
GRANT SELECT, INSERT ON public.user_achievements TO authenticated, anon;

-- 5. Secure Helper Function: Issue Certificate & Check Achievements
CREATE OR REPLACE FUNCTION public.issue_certificate_for_attempt(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt RECORD;
  v_test RECORD;
  v_cert_id UUID;
  v_cert_code TEXT;
  v_percentage NUMERIC;
  v_student_name TEXT;
  v_test_title TEXT;
  v_total_marks NUMERIC;
  v_existing_cert RECORD;
  v_completed_count INTEGER;
BEGIN
  -- 1. Fetch Attempt
  SELECT * INTO v_attempt FROM public.attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Attempt not found.');
  END IF;

  -- Verify ownership or authorization
  IF v_attempt.user_id != auth.uid() AND auth.role() != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to generate certificate for this attempt.');
  END IF;

  -- Check if attempt status is completed/submitted
  IF v_attempt.status NOT IN ('submitted', 'completed', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Certificate can only be issued for submitted assessments.');
  END IF;

  -- 2. Fetch Test details
  SELECT * INTO v_test FROM public.tests WHERE id = v_attempt.test_id;
  v_test_title := COALESCE(v_test.title, 'Verified Technical Assessment');
  v_total_marks := COALESCE(v_test.total_marks, 100);
  IF v_total_marks <= 0 THEN v_total_marks := 100; END IF;

  -- Calculate percentage
  v_percentage := ROUND((COALESCE(v_attempt.score, 0) / v_total_marks) * 100, 1);

  -- Eligibility Check: Must achieve >= 50%
  IF v_percentage < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Score below passing threshold (50%). Certificate not eligible.');
  END IF;

  -- 3. Check if certificate already exists for this attempt or user+test combination
  SELECT * INTO v_existing_cert FROM public.certificates 
  WHERE attempt_id = p_attempt_id OR (user_id = v_attempt.user_id AND test_id = v_attempt.test_id);

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 
      'already_exists', true, 
      'certificate_id', v_existing_cert.id, 
      'certificate_code', v_existing_cert.certificate_code
    );
  END IF;

  -- 4. Fetch Student Name from Profiles
  SELECT full_name INTO v_student_name FROM public.profiles WHERE id = v_attempt.user_id;
  IF v_student_name IS NULL OR trim(v_student_name) = '' THEN
    v_student_name := 'Testora Candidate';
  END IF;

  -- 5. Generate Unique Certificate Code (e.g. TST-2026-A8F291)
  v_cert_code := 'TST-' || to_char(NOW(), 'YYYY') || '-' || UPPER(SUBSTRING(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));

  -- 6. Insert Certificate Record
  INSERT INTO public.certificates (
    certificate_code,
    user_id,
    test_id,
    attempt_id,
    student_name,
    title,
    category,
    score,
    max_score,
    percentage,
    instructor_name,
    verification_status
  ) VALUES (
    v_cert_code,
    v_attempt.user_id,
    v_attempt.test_id,
    p_attempt_id,
    v_student_name,
    v_test_title,
    'Assessment Credential',
    v_attempt.score,
    v_total_marks,
    v_percentage,
    'Testora Academic Board',
    'verified'
  ) RETURNING id INTO v_cert_id;

  -- 7. Grant Achievements / Milestones
  -- A. First Test Completed
  INSERT INTO public.user_achievements (user_id, badge_key, badge_name, badge_description, badge_category, badge_icon)
  VALUES (v_attempt.user_id, 'first_test_completed', 'First Milestone Cleared', 'Successfully completed your first verified assessment.', 'Milestone', 'award')
  ON CONFLICT DO NOTHING;

  -- B. High Score Badge (>= 90%)
  IF v_percentage >= 90 THEN
    INSERT INTO public.user_achievements (user_id, badge_key, badge_name, badge_description, badge_category, badge_icon)
    VALUES (v_attempt.user_id, 'high_score_master', 'High Achiever (90%+)', 'Achieved a stellar score of 90% or higher on an assessment.', 'Performance', 'trophy')
    ON CONFLICT DO NOTHING;
  END IF;

  -- C. Test Master (5+ tests completed)
  SELECT COUNT(*) INTO v_completed_count FROM public.attempts WHERE user_id = v_attempt.user_id AND status IN ('submitted', 'expired', 'completed');
  IF v_completed_count >= 5 THEN
    INSERT INTO public.user_achievements (user_id, badge_key, badge_name, badge_description, badge_category, badge_icon)
    VALUES (v_attempt.user_id, 'test_master_5', 'Assessment Veteran', 'Cleared 5 or more proctored assessments on Testora.', 'Milestone', 'shield-check')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_exists', false,
    'certificate_id', v_cert_id,
    'certificate_code', v_cert_code,
    'percentage', v_percentage
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_certificate_for_attempt TO authenticated, anon;
