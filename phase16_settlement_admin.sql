-- =====================================================
-- PHASE 16: ADMIN PAYOUT SETTLEMENT MANAGEMENT & REVERSAL PROCEDURES
-- Testoriax Admin Settlement & Earnings RPC Procedures
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- SAFE TO RE-RUN
-- =====================================================

-- 1. RPC: List All Payout Requests for Admin Review
CREATE OR REPLACE FUNCTION public.admin_list_payout_requests(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id                    UUID,
  creator_id            UUID,
  creator_name          TEXT,
  creator_email         TEXT,
  amount_paise          BIGINT,
  amount_inr            NUMERIC,
  currency              TEXT,
  status                TEXT,
  payout_method         TEXT,
  payout_details        JSONB,
  reference_id          TEXT,
  requested_at          TIMESTAMPTZ,
  processed_at          TIMESTAMPTZ,
  failure_reason        TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Superuser administration rights required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.creator_id,
    COALESCE(prof.full_name, 'Unknown Creator') AS creator_name,
    COALESCE(prof.email, '') AS creator_email,
    p.amount_paise,
    ROUND(p.amount_paise::NUMERIC / 100, 2) AS amount_inr,
    p.currency,
    p.status,
    p.payout_method,
    p.payout_details,
    p.reference_id,
    p.requested_at,
    p.processed_at,
    p.failure_reason
  FROM public.payouts p
  LEFT JOIN public.profiles prof ON prof.id = p.creator_id
  WHERE (p_status IS NULL OR p.status = p_status)
  ORDER BY p.requested_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_payout_requests TO authenticated;


-- 2. RPC: Admin Update Payout Request Status (Approve, Complete, Reject)
CREATE OR REPLACE FUNCTION public.admin_update_payout_status(
  p_payout_id      UUID,
  p_new_status     TEXT,
  p_reference_id   TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout   RECORD;
  v_admin_id UUID := auth.uid();
BEGIN
  -- 1. Authorization check
  IF NOT public.is_admin(v_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access Denied: Superuser rights required.');
  END IF;

  -- 2. Fetch payout record
  SELECT * INTO v_payout
  FROM public.payouts
  WHERE id = p_payout_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout request not found.');
  END IF;

  -- 3. Validate status transition
  IF p_new_status NOT IN ('PROCESSING', 'PAID', 'CANCELLED', 'FAILED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payout target status.');
  END IF;

  -- 4. Process Status Updates
  IF p_new_status = 'PAID' THEN
    -- Mark payout as PAID
    UPDATE public.payouts
    SET 
      status = 'PAID',
      reference_id = COALESCE(p_reference_id, reference_id, FORMAT('TXN_%s', REPLACE(gen_random_uuid()::TEXT, '-', ''))),
      processed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_payout_id;

    -- Update linked creator earnings to PAID
    UPDATE public.creator_earnings
    SET status = 'PAID', updated_at = NOW()
    WHERE creator_id = v_payout.creator_id
      AND status = 'PAYOUT_REQUESTED';

  ELSIF p_new_status IN ('CANCELLED', 'FAILED') THEN
    -- Mark payout as FAILED/CANCELLED
    UPDATE public.payouts
    SET 
      status = p_new_status,
      failure_reason = p_failure_reason,
      processed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_payout_id;

    -- Revert locked creator earnings back to AVAILABLE
    UPDATE public.creator_earnings
    SET status = 'AVAILABLE', updated_at = NOW()
    WHERE creator_id = v_payout.creator_id
      AND status = 'PAYOUT_REQUESTED';

  ELSIF p_new_status = 'PROCESSING' THEN
    UPDATE public.payouts
    SET status = 'PROCESSING', updated_at = NOW()
    WHERE id = p_payout_id;
  END IF;

  -- Audit log entry
  INSERT INTO public.admin_audit_logs (
    admin_id,
    admin_email,
    action,
    target_type,
    target_id,
    details
  )
  SELECT 
    v_admin_id,
    COALESCE(prof.email, 'admin'),
    'payout_status_update',
    'payout',
    p_payout_id::TEXT,
    jsonb_build_object(
      'previous_status', v_payout.status,
      'new_status', p_new_status,
      'amount_paise', v_payout.amount_paise,
      'reference_id', p_reference_id,
      'failure_reason', p_failure_reason
    )
  FROM public.profiles prof WHERE prof.id = v_admin_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', FORMAT('Payout status updated to %s.', p_new_status),
    'payout_id', p_payout_id,
    'status', p_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_payout_status TO authenticated;

SELECT 'Phase 16 Admin Payout Settlement Procedures Installed Successfully!' AS status;
