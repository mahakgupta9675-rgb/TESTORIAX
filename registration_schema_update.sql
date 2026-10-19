-- Registration constraints to prevent duplicates

-- 1. For standalone tests without a competition context
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_registrations_unique_no_comp 
ON public.test_registrations (test_id, user_id) 
WHERE competition_id IS NULL;

-- 2. For tests within a competition
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_registrations_unique_comp 
ON public.test_registrations (test_id, user_id, competition_id) 
WHERE competition_id IS NOT NULL;
