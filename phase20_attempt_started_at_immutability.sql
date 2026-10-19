-- =====================================================
-- PHASE 20 MIGRATION: IMMUTABLE ATTEMPT STARTED_AT PROTECTION
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- 1. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.enforce_attempt_started_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Force started_at to PostgreSQL server time regardless of any client-supplied payload value
        NEW.started_at := timezone('utc'::text, now());
    ELSIF TG_OP = 'UPDATE' THEN
        -- Preserve original started_at timestamp; block any client attempts to modify started_at
        NEW.started_at := OLD.started_at;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Drop existing trigger if present and recreate on public.attempts table
DROP TRIGGER IF EXISTS trg_enforce_attempt_started_at ON public.attempts;

CREATE TRIGGER trg_enforce_attempt_started_at
BEFORE INSERT OR UPDATE ON public.attempts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_attempt_started_at();
