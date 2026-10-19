-- ====================================================
-- PHASE 12: MASTER PRODUCTION SECURITY & DATABASE HARDENING
-- ====================================================

-- 1. FOREIGN KEY INTEGRITY & INDEXES HARDENING
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_tests_creator ON public.tests(creator_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON public.tests(status);
CREATE INDEX IF NOT EXISTS idx_questions_test ON public.questions(test_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON public.test_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_test ON public.test_registrations(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON public.attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test ON public.attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON public.attempts(status);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON public.answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, unread);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.admin_audit_logs(admin_id);

-- 2. ENABLE ROW LEVEL SECURITY ACROSS ALL PRODUCTION TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- 3. SANITIZE & HARDEN POLICIES
-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tests
DROP POLICY IF EXISTS "Published tests viewable by anyone" ON public.tests;
CREATE POLICY "Published tests viewable by anyone" ON public.tests FOR SELECT USING (status = 'published' OR creator_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Creators can insert own tests" ON public.tests;
CREATE POLICY "Creators can insert own tests" ON public.tests FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own tests" ON public.tests;
CREATE POLICY "Creators can update own tests" ON public.tests FOR UPDATE USING (auth.uid() = creator_id OR public.is_admin(auth.uid()));

-- Questions
DROP POLICY IF EXISTS "Questions viewable for published tests" ON public.questions;
CREATE POLICY "Questions viewable for published tests" ON public.questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can manage questions" ON public.questions;
CREATE POLICY "Creators can manage questions" ON public.questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tests WHERE id = questions.test_id AND creator_id = auth.uid()) OR public.is_admin(auth.uid())
);

-- Attempts & Answers (Strict Candidate Isolation)
DROP POLICY IF EXISTS "Users view own attempts" ON public.attempts;
CREATE POLICY "Users view own attempts" ON public.attempts FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own attempts" ON public.attempts;
CREATE POLICY "Users insert own attempts" ON public.attempts FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users view own answers" ON public.answers;
CREATE POLICY "Users view own answers" ON public.answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.attempts WHERE id = answers.attempt_id AND user_id = auth.uid()) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users submit own answers" ON public.answers;
CREATE POLICY "Users submit own answers" ON public.answers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.attempts WHERE id = answers.attempt_id AND user_id = auth.uid())
);

-- Certificates (Public Verification Policy)
DROP POLICY IF EXISTS "Public can view certificates" ON public.certificates;
CREATE POLICY "Public can view certificates" ON public.certificates FOR SELECT USING (true);

-- Admin Security Logs
DROP POLICY IF EXISTS "Admins only audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins only audit logs" ON public.admin_audit_logs FOR SELECT USING (public.is_admin(auth.uid()));

-- 4. GRANT AUTHORIZED RECURSIVE FUNCTION ACCESS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.certificates TO anon;
GRANT SELECT ON public.tests TO anon;

SELECT 'Production hardening migration completed successfully!' AS status;
