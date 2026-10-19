-- =====================================================
-- PHASE 17: REFUNDS, CANCELLATIONS & DISPUTE MANAGEMENT
-- Testoriax Payment System — Phase 6 Migration Script
-- =====================================================
-- SAFE TO RE-RUN: uses CREATE TABLE IF NOT EXISTS and
-- DROP POLICY IF EXISTS guards throughout.
-- =====================================================

-- ====================================================
-- 1. REFUND REQUESTS TABLE
--    Student-initiated refund requests with admin review workflow.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id            UUID          NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  payment_order_id      UUID          NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  user_id               UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  test_id               UUID          NULL REFERENCES public.tests(id) ON DELETE RESTRICT,
  competition_id        UUID          NULL,
  amount_paise          BIGINT        NOT NULL,
  amount_inr            NUMERIC(12,2) NOT NULL,
  reason                TEXT          NOT NULL,
  explanation           TEXT          NULL,
  status                TEXT          NOT NULL DEFAULT 'requested',
  razorpay_refund_id    TEXT          UNIQUE NULL,
  refund_status         TEXT          NOT NULL DEFAULT 'refund_pending',
  reviewed_by           UUID          NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reviewed_at           TIMESTAMPTZ   NULL,
  rejection_reason      TEXT          NULL,
  cancellation_event_id TEXT          NULL,
  processed_at          TIMESTAMPTZ   NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT refund_requests_status_check CHECK (status IN (
    'requested', 'under_review', 'approved', 'rejected', 'cancelled'
  )),
  CONSTRAINT refund_requests_rzp_status_check CHECK (refund_status IN (
    'refund_pending', 'refund_processing', 'refunded', 'refund_failed'
  )),
  CONSTRAINT refund_requests_amount_positive CHECK (amount_paise > 0)
);

-- Unique constraint: prevent duplicate active refund requests for the same payment
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_refund_request_per_payment
  ON public.refund_requests(payment_id)
  WHERE status IN ('requested', 'under_review', 'approved');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON public.refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment_id ON public.refund_requests(payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_test_id ON public.refund_requests(test_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON public.refund_requests(created_at DESC);

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS trg_refund_requests_updated_at ON public.refund_requests;
CREATE TRIGGER trg_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own refund requests" ON public.refund_requests;
CREATE POLICY "Students view own refund requests"
  ON public.refund_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creators view refund requests for their tests" ON public.refund_requests;
CREATE POLICY "Creators view refund requests for their tests"
  ON public.refund_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = refund_requests.test_id
        AND t.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view all refund requests" ON public.refund_requests;
CREATE POLICY "Admins view all refund requests"
  ON public.refund_requests FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 2. FINANCIAL ADJUSTMENTS TABLE (Creator Debt Ledger)
--    Tracks post-settlement refunds safely without destroying historical payouts.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.financial_adjustments (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id            UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payment_id            UUID          NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  refund_request_id     UUID          NULL REFERENCES public.refund_requests(id) ON DELETE RESTRICT,
  amount_paise          BIGINT        NOT NULL, -- positive value representing debt/adjustment amount
  reason                TEXT          NOT NULL,
  status                TEXT          NOT NULL DEFAULT 'UNRESOLVED',
  resolved_payout_id    UUID          NULL REFERENCES public.payouts(id) ON DELETE SET NULL,
  resolved_at           TIMESTAMPTZ   NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT financial_adj_status_check CHECK (status IN (
    'UNRESOLVED', 'DEDUCTED_FROM_PAYOUT', 'RESOLVED', 'WAIVED'
  )),
  CONSTRAINT financial_adj_amount_positive CHECK (amount_paise > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_creator_id ON public.financial_adjustments(creator_id);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_status ON public.financial_adjustments(status);

-- Trigger
DROP TRIGGER IF EXISTS trg_financial_adjustments_updated_at ON public.financial_adjustments;
CREATE TRIGGER trg_financial_adjustments_updated_at
  BEFORE UPDATE ON public.financial_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own adjustments" ON public.financial_adjustments;
CREATE POLICY "Creators view own adjustments"
  ON public.financial_adjustments FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins view all adjustments" ON public.financial_adjustments;
CREATE POLICY "Admins view all adjustments"
  ON public.financial_adjustments FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 3. PAYMENT AUDIT LOGS TABLE
--    Immutable record of every sensitive financial event.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id              UUID          NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action                TEXT          NOT NULL,
  payment_id            UUID          NULL REFERENCES public.payments(id) ON DELETE SET NULL,
  refund_request_id     UUID          NULL REFERENCES public.refund_requests(id) ON DELETE SET NULL,
  details               JSONB         NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_action ON public.payment_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at ON public.payment_audit_logs(created_at DESC);

-- RLS
ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view all payment audit logs" ON public.payment_audit_logs;
CREATE POLICY "Admins view all payment audit logs"
  ON public.payment_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 4. UPDATE get_creator_financial_summary RPC
--    Calculates adjustments to deduct post-settlement refund debts.
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
  v_unresolved_adjustments    BIGINT := 0;
  v_net_available_paise       BIGINT := 0;
  v_paid_registrations_count  INT := 0;
BEGIN
  -- Verify user authorization
  IF auth.uid() != p_creator_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  -- 1. Total creator earnings across valid transactions (excluding REVERSED)
  SELECT COALESCE(SUM(creator_amount_paise), 0), COUNT(id)
  INTO v_total_earnings_paise, v_paid_registrations_count
  FROM public.creator_earnings
  WHERE creator_id = p_creator_id
    AND status IN ('PENDING', 'AVAILABLE', 'PAYOUT_REQUESTED', 'PAID');

  -- 2. Available earnings (status = AVAILABLE)
  SELECT COALESCE(SUM(creator_amount_paise), 0)
  INTO v_available_earnings_paise
  FROM public.creator_earnings
  WHERE creator_id = p_creator_id
    AND status = 'AVAILABLE';

  -- 3. Pending balance (status = PENDING)
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

  -- 6. Unresolved Debt Adjustments sum (post-settlement refunds)
  SELECT COALESCE(SUM(amount_paise), 0)
  INTO v_unresolved_adjustments
  FROM public.financial_adjustments
  WHERE creator_id = p_creator_id
    AND status = 'UNRESOLVED';

  -- Net Available Balance = GREATEST(0, available_earnings - unresolved_adjustments)
  v_net_available_paise := GREATEST(0, v_available_earnings_paise - v_unresolved_adjustments);

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
    'unresolved_adjustments_paise', v_unresolved_adjustments,
    'unresolved_adjustments_inr',   ROUND(v_unresolved_adjustments::NUMERIC / 100, 2),
    'paid_registrations_count', v_paid_registrations_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_financial_summary TO authenticated;


-- ====================================================
-- 5. SERVER-SIDE RPC: Student Request Refund
--    Validates ownership, payment capture status, refund policy,
--    and checks for duplicate active requests.
-- ====================================================
CREATE OR REPLACE FUNCTION public.request_student_refund(
  p_payment_id    UUID,
  p_reason        TEXT,
  p_explanation   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment         RECORD;
  v_order           RECORD;
  v_test            RECORD;
  v_existing_req    RECORD;
  v_req_id          UUID;
  v_auto_approve    BOOLEAN := false;
  v_initial_status  TEXT := 'requested';
BEGIN
  -- 1. Fetch payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment transaction record not found.');
  END IF;

  -- 2. Verify payment owner
  IF v_payment.user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You can only request a refund for your own payment.');
  END IF;

  -- 3. Verify payment is captured/paid
  IF v_payment.status != 'captured' THEN
    RETURN jsonb_build_object('success', false, 'error', FORMAT('Payment cannot be refunded because its status is %s.', v_payment.status));
  END IF;

  -- 4. Check for active duplicate request
  SELECT * INTO v_existing_req
  FROM public.refund_requests
  WHERE payment_id = p_payment_id
    AND status IN ('requested', 'under_review', 'approved');

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', FORMAT('A refund request for this payment is already %s.', v_existing_req.status));
  END IF;

  -- 5. Fetch associated test info
  SELECT * INTO v_test
  FROM public.tests
  WHERE id = v_payment.test_id;

  -- 6. Check policy conditions (Auto-approve if test was cancelled by creator)
  IF FOUND AND v_test.status = 'cancelled' THEN
    v_auto_approve := true;
    v_initial_status := 'approved';
  END IF;

  -- 7. Insert refund request
  INSERT INTO public.refund_requests (
    payment_id,
    payment_order_id,
    user_id,
    test_id,
    amount_paise,
    amount_inr,
    reason,
    explanation,
    status,
    refund_status
  ) VALUES (
    p_payment_id,
    v_payment.payment_order_id,
    auth.uid(),
    v_payment.test_id,
    ROUND(v_payment.amount * 100)::BIGINT,
    v_payment.amount,
    p_reason,
    p_explanation,
    v_initial_status,
    'refund_pending'
  ) RETURNING id INTO v_req_id;

  -- 8. Audit log
  INSERT INTO public.payment_audit_logs (actor_id, action, payment_id, refund_request_id, details)
  VALUES (
    auth.uid(),
    'PAYMENT_REFUND_REQUESTED',
    p_payment_id,
    v_req_id,
    jsonb_build_object('reason', p_reason, 'amount', v_payment.amount, 'auto_approved', v_auto_approve)
  );

  RETURN jsonb_build_object(
    'success',          true,
    'message',          CASE WHEN v_auto_approve THEN 'Refund request auto-approved due to test cancellation.' ELSE 'Refund request submitted for review.' END,
    'refund_request_id', v_req_id,
    'status',           v_initial_status,
    'amount_inr',       v_payment.amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_student_refund TO authenticated;

-- Grants
GRANT SELECT ON public.refund_requests TO authenticated;
GRANT SELECT ON public.financial_adjustments TO authenticated;

SELECT 'Phase 17: Refunds & Cancellations migration completed successfully!' AS status;
