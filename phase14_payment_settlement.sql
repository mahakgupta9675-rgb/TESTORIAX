-- =====================================================
-- PHASE 14: PAYMENT SETTLEMENT, COMMISSION & CREATOR EARNINGS
-- Testoriax Payment Settlement Database Schema
-- =====================================================
-- Run this entire script in your Supabase SQL Editor
-- SAFE TO RE-RUN: uses CREATE TABLE IF NOT EXISTS and
-- DROP POLICY IF EXISTS guards throughout.
-- =====================================================

-- ====================================================
-- 1. CREATOR EARNINGS LEDGER TABLE
--    Financial ledger for every successful paid transaction.
--    Guarantees unique relationship with payment_id.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.creator_earnings (
  id                            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id                    UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payment_id                    UUID          NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
  payment_order_id              UUID          NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  test_id                       UUID          NULL REFERENCES public.tests(id) ON DELETE RESTRICT,
  competition_id                UUID          NULL,
  gross_amount_paise            BIGINT        NOT NULL,
  razorpay_fee_paise            BIGINT        NOT NULL DEFAULT 0,
  razorpay_tax_paise            BIGINT        NOT NULL DEFAULT 0,
  platform_commission_percent   NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
  platform_commission_paise     BIGINT        NOT NULL,
  creator_amount_paise          BIGINT        NOT NULL,
  currency                      TEXT          NOT NULL DEFAULT 'INR',
  status                        TEXT          NOT NULL DEFAULT 'PENDING',
  metadata                      JSONB         NOT NULL DEFAULT '{}',
  created_at                    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT creator_earnings_status_check CHECK (status IN (
    'PENDING', 'AVAILABLE', 'PAYOUT_REQUESTED', 'PAID', 'REVERSED'
  )),
  CONSTRAINT creator_earnings_gross_positive CHECK (gross_amount_paise > 0),
  CONSTRAINT creator_earnings_fee_nonnegative CHECK (razorpay_fee_paise >= 0),
  CONSTRAINT creator_earnings_tax_nonnegative CHECK (razorpay_tax_paise >= 0),
  CONSTRAINT creator_earnings_commission_nonnegative CHECK (platform_commission_paise >= 0),
  CONSTRAINT creator_earnings_creator_amount_nonnegative CHECK (creator_amount_paise >= 0),
  CONSTRAINT creator_earnings_commission_percent_range CHECK (
    platform_commission_percent >= 0 AND platform_commission_percent <= 100
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator_id ON public.creator_earnings(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_payment_id ON public.creator_earnings(payment_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_test_id ON public.creator_earnings(test_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_status ON public.creator_earnings(status);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_created_at ON public.creator_earnings(created_at DESC);

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS trg_creator_earnings_updated_at ON public.creator_earnings;
CREATE TRIGGER trg_creator_earnings_updated_at
  BEFORE UPDATE ON public.creator_earnings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own earnings" ON public.creator_earnings;
CREATE POLICY "Creators view own earnings"
  ON public.creator_earnings FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins view all creator earnings" ON public.creator_earnings;
CREATE POLICY "Admins view all creator earnings"
  ON public.creator_earnings FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- No client insert/update/delete on creator_earnings (Server-only write)


-- ====================================================
-- 2. PAYOUTS TABLE
--    Records withdrawal / settlement requests from creators.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id            UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_paise          BIGINT        NOT NULL,
  currency              TEXT          NOT NULL DEFAULT 'INR',
  status                TEXT          NOT NULL DEFAULT 'REQUESTED',
  payout_method         TEXT          NOT NULL DEFAULT 'bank_transfer',
  payout_details        JSONB         NOT NULL DEFAULT '{}',
  reference_id          TEXT          UNIQUE NULL,
  requested_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at          TIMESTAMPTZ   NULL,
  failure_reason        TEXT          NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT payouts_status_check CHECK (status IN (
    'REQUESTED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'
  )),
  CONSTRAINT payouts_amount_positive CHECK (amount_paise > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payouts_creator_id ON public.payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_requested_at ON public.payouts(requested_at DESC);

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS trg_payouts_updated_at ON public.payouts;
CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own payouts" ON public.payouts;
CREATE POLICY "Creators view own payouts"
  ON public.payouts FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins view all payouts" ON public.payouts;
CREATE POLICY "Admins view all payouts"
  ON public.payouts FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 3. CREATOR PAYOUT DETAILS TABLE
--    Masked payout account details (Bank account / UPI ID).
-- ====================================================
CREATE TABLE IF NOT EXISTS public.creator_payout_details (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id            UUID          NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_holder_name   TEXT          NOT NULL,
  bank_name             TEXT          NULL,
  account_number_masked TEXT          NULL, -- e.g., "XXXX XXXX 1234"
  ifsc_code             TEXT          NULL,
  upi_id_masked         TEXT          NULL, -- e.g., "usr***@upi"
  payout_type           TEXT          NOT NULL DEFAULT 'bank_transfer',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT cpd_type_check CHECK (payout_type IN ('bank_transfer', 'upi'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_payout_details_creator_id ON public.creator_payout_details(creator_id);

-- Trigger
DROP TRIGGER IF EXISTS trg_creator_payout_details_updated_at ON public.creator_payout_details;
CREATE TRIGGER trg_creator_payout_details_updated_at
  BEFORE UPDATE ON public.creator_payout_details
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.creator_payout_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own payout details" ON public.creator_payout_details;
CREATE POLICY "Creators view own payout details"
  ON public.creator_payout_details FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators update own payout details" ON public.creator_payout_details;
CREATE POLICY "Creators update own payout details"
  ON public.creator_payout_details FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins view all payout details" ON public.creator_payout_details;
CREATE POLICY "Admins view all payout details"
  ON public.creator_payout_details FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 4. SERVER-SIDE RPC: Get Creator Financial Summary
--    Calculates Total Earnings, Available Balance,
--    Pending Balance, Paid Out, and Paid Registrations.
-- ====================================================
CREATE OR REPLACE FUNCTION public.get_creator_financial_summary(p_creator_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total_earnings_paise      BIGINT := 0;
  v_available_earnings_paise  BIGINT := 0;
  v_pending_earnings_paise    BIGINT := 0;
  v_payout_requested_paise    BIGINT := 0;
  v_paid_out_paise            BIGINT := 0;
  v_net_available_paise       BIGINT := 0;
  v_paid_registrations_count  INT := 0;
BEGIN
  -- Verify user authorization
  IF auth.uid() != p_creator_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  -- 1. Total creator earnings across all valid transactions (excluding REVERSED)
  SELECT COALESCE(SUM(creator_amount_paise), 0), COUNT(id)
  INTO v_total_earnings_paise, v_paid_registrations_count
  FROM public.creator_earnings
  WHERE creator_id = p_creator_id
    AND status IN ('PENDING', 'AVAILABLE', 'PAYOUT_REQUESTED', 'PAID');

  -- 2. Available earnings (Razorpay settlement completed, not yet requested/paid out)
  SELECT COALESCE(SUM(creator_amount_paise), 0)
  INTO v_available_earnings_paise
  FROM public.creator_earnings
  WHERE creator_id = p_creator_id
    AND status = 'AVAILABLE';

  -- 3. Pending balance (payments captured, awaiting Razorpay settlement window)
  SELECT COALESCE(SUM(creator_amount_paise), 0)
  INTO v_pending_earnings_paise
  FROM public.creator_earnings
  WHERE creator_id = p_creator_id
    AND status = 'PENDING';

  -- 4. Requested / Processing Payouts sum
  SELECT COALESCE(SUM(amount_paise), 0)
  INTO v_payout_requested_paise
  FROM public.payouts
  WHERE creator_id = p_creator_id
    AND status IN ('REQUESTED', 'PROCESSING');

  -- 5. Paid Out Payouts sum
  SELECT COALESCE(SUM(amount_paise), 0)
  INTO v_paid_out_paise
  FROM public.payouts
  WHERE creator_id = p_creator_id
    AND status = 'PAID';

  -- Net Available Balance = (Available earnings + PAYOUT_REQUESTED earnings) - (Requested + Processing + Paid payouts)
  -- Or simpler: Available balance from creator_earnings minus active payouts
  v_net_available_paise := GREATEST(v_available_earnings_paise, 0);

  RETURN jsonb_build_object(
    'total_earnings_paise',     v_total_earnings_paise,
    'total_earnings_inr',       ROUND(v_total_earnings_paise::NUMERIC / 100, 2),
    'available_balance_paise',  v_net_available_paise,
    'available_balance_inr',    ROUND(v_net_available_paise::NUMERIC / 100, 2),
    'pending_balance_paise',    v_pending_earnings_paise,
    'pending_balance_inr',      ROUND(v_pending_earnings_paise::NUMERIC / 100, 2),
    'paid_out_paise',           v_paid_out_paise,
    'paid_out_inr',             ROUND(v_paid_out_paise::NUMERIC / 100, 2),
    'payout_requested_paise',   v_payout_requested_paise,
    'payout_requested_inr',     ROUND(v_payout_requested_paise::NUMERIC / 100, 2),
    'paid_registrations_count', v_paid_registrations_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_financial_summary TO authenticated;


-- ====================================================
-- 5. SERVER-SIDE RPC: Request Payout
--    Validates balance, payout details, minimum threshold,
--    and inserts payout request row.
-- ====================================================
CREATE OR REPLACE FUNCTION public.request_creator_payout(
  p_creator_id     UUID,
  p_amount_paise   BIGINT,
  p_payout_method  TEXT DEFAULT 'bank_transfer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary              JSONB;
  v_available_paise      BIGINT;
  v_min_payout_paise     BIGINT := 50000; -- ₹500 minimum payout threshold
  v_active_request_count INT;
  v_payout_details       RECORD;
  v_payout_id            UUID;
BEGIN
  -- 1. Authorization check
  IF auth.uid() != p_creator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You can only request payouts for your own account.');
  END IF;

  -- 2. Check requested amount positive
  IF p_amount_paise <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout amount must be greater than 0.');
  END IF;

  -- 3. Check minimum threshold (₹500)
  IF p_amount_paise < v_min_payout_paise THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum payout threshold is ₹500.');
  END IF;

  -- 4. Check payout account details exist
  SELECT * INTO v_payout_details
  FROM public.creator_payout_details
  WHERE creator_id = p_creator_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please configure your bank or UPI payout details in settings before requesting a payout.');
  END IF;

  -- 5. Check active payout request (no duplicate active requests)
  SELECT COUNT(id) INTO v_active_request_count
  FROM public.payouts
  WHERE creator_id = p_creator_id
    AND status IN ('REQUESTED', 'PROCESSING');

  IF v_active_request_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an active payout request in progress.');
  END IF;

  -- 6. Check available balance
  v_summary := public.get_creator_financial_summary(p_creator_id);
  v_available_paise := (v_summary->>'available_balance_paise')::BIGINT;

  IF p_amount_paise > v_available_paise THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', FORMAT('Requested amount (₹%s) exceeds available balance (₹%s).',
        ROUND(p_amount_paise::NUMERIC / 100, 2),
        ROUND(v_available_paise::NUMERIC / 100, 2)
      )
    );
  END IF;

  -- 7. Insert payout record
  INSERT INTO public.payouts (
    creator_id,
    amount_paise,
    currency,
    status,
    payout_method,
    payout_details,
    requested_at
  ) VALUES (
    p_creator_id,
    p_amount_paise,
    'INR',
    'REQUESTED',
    p_payout_method,
    jsonb_build_object(
      'account_holder_name',   v_payout_details.account_holder_name,
      'bank_name',             v_payout_details.bank_name,
      'account_number_masked', v_payout_details.account_number_masked,
      'ifsc_code',             v_payout_details.ifsc_code,
      'upi_id_masked',         v_payout_details.upi_id_masked,
      'payout_type',           v_payout_details.payout_type
    ),
    NOW()
  ) RETURNING id INTO v_payout_id;

  -- 8. Mark available creator earnings up to p_amount_paise as PAYOUT_REQUESTED
  WITH eligible_earnings AS (
    SELECT id, creator_amount_paise
    FROM public.creator_earnings
    WHERE creator_id = p_creator_id
      AND status = 'AVAILABLE'
    ORDER BY created_at ASC
  )
  UPDATE public.creator_earnings
  SET status = 'PAYOUT_REQUESTED', updated_at = NOW()
  WHERE id IN (SELECT id FROM eligible_earnings);

  RETURN jsonb_build_object(
    'success',      true,
    'message',      'Payout request submitted successfully.',
    'payout_id',    v_payout_id,
    'amount_inr',   ROUND(p_amount_paise::NUMERIC / 100, 2),
    'status',       'REQUESTED'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_creator_payout TO authenticated;


-- Grants
GRANT SELECT ON public.creator_earnings TO authenticated;
GRANT SELECT ON public.payouts TO authenticated;
GRANT SELECT ON public.creator_payout_details TO authenticated;

SELECT 'Phase 14: Payment Settlement migration completed successfully!' AS status;
