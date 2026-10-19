-- =====================================================
-- PHASE 18: PAYMENT SECURITY, FRAUD PREVENTION & FINANCIAL AUDIT
-- Testoriax Payment System — Phase 7 Migration Script
-- =====================================================
-- SAFE TO RE-RUN: uses CREATE TABLE IF NOT EXISTS,
-- DROP POLICY IF EXISTS, and CREATE OR REPLACE FUNCTION guards.
-- =====================================================

-- ====================================================
-- 1. IMMUTABLE FINANCIAL AUDIT LOGS TABLE
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

-- Indexes for rapid audit querying
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_action ON public.payment_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at ON public.payment_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_actor ON public.payment_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_payment ON public.payment_audit_logs(payment_id);

-- Enable RLS
ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
DROP POLICY IF EXISTS "Admins view all payment audit logs" ON public.payment_audit_logs;
CREATE POLICY "Admins view all payment audit logs"
  ON public.payment_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- NO authenticated or public users can insert, update, or delete audit logs directly
-- Audit logs are written strictly via server service-role or SECURITY DEFINER functions.


-- ====================================================
-- 2. SERVER RPC: Log Financial Audit Event
-- ====================================================
CREATE OR REPLACE FUNCTION public.log_financial_audit_event(
  p_actor_id          UUID,
  p_action            TEXT,
  p_payment_id        UUID DEFAULT NULL,
  p_refund_request_id UUID DEFAULT NULL,
  p_details           JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.payment_audit_logs (
    actor_id,
    action,
    payment_id,
    refund_request_id,
    details
  ) VALUES (
    p_actor_id,
    p_action,
    p_payment_id,
    p_refund_request_id,
    p_details
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_financial_audit_event TO authenticated;


-- ====================================================
-- 3. WEBHOOK EVENTS TABLE SECURITY & IDEMPOTENCY
-- ====================================================
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              TEXT          NOT NULL DEFAULT 'razorpay',
  event_id              TEXT          NOT NULL,
  event_type            TEXT          NOT NULL,
  payload               JSONB         NOT NULL,
  signature_verified    BOOLEAN       NOT NULL DEFAULT false,
  processed             BOOLEAN       NOT NULL DEFAULT false,
  processed_at          TIMESTAMPTZ   NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT unq_provider_event_id UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event_id ON public.payment_webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.payment_webhook_events(processed);

-- RLS for webhook events
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view webhook events" ON public.payment_webhook_events;
CREATE POLICY "Admins view webhook events"
  ON public.payment_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 4. RLS SECURITY AUDIT & POLICY RE-ENFORCEMENT
-- ====================================================

-- A. PAYMENT ORDERS TABLE
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payment orders" ON public.payment_orders;
CREATE POLICY "Users view own payment orders"
  ON public.payment_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = creator_id OR public.is_admin(auth.uid()));

-- Restrict direct client updates to payment status columns
-- Orders are managed strictly by backend API and webhooks.


-- B. PAYMENTS TABLE
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = creator_id OR public.is_admin(auth.uid()));


-- C. CREATOR EARNINGS TABLE
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own earnings" ON public.creator_earnings;
CREATE POLICY "Creators view own earnings"
  ON public.creator_earnings FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR public.is_admin(auth.uid()));


-- D. PAYOUTS TABLE
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own payouts" ON public.payouts;
CREATE POLICY "Creators view own payouts"
  ON public.payouts FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR public.is_admin(auth.uid()));


-- E. PAYMENT TRANSFERS TABLE
ALTER TABLE public.payment_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own transfers" ON public.payment_transfers;
CREATE POLICY "Creators view own transfers"
  ON public.payment_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR public.is_admin(auth.uid()));


-- F. REFUND REQUESTS TABLE
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own refund requests" ON public.refund_requests;
CREATE POLICY "Students view own refund requests"
  ON public.refund_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Creators view test refund requests" ON public.refund_requests;
CREATE POLICY "Creators view test refund requests"
  ON public.refund_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = refund_requests.test_id
        AND t.creator_id = auth.uid()
    )
  );


-- G. FINANCIAL ADJUSTMENTS TABLE
ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own adjustments" ON public.financial_adjustments;
CREATE POLICY "Creators view own adjustments"
  ON public.financial_adjustments FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR public.is_admin(auth.uid()));


-- Grants
GRANT SELECT ON public.payment_audit_logs TO authenticated;
GRANT SELECT ON public.payment_webhook_events TO authenticated;

SELECT 'Phase 18: Payment Security, Fraud Prevention & Financial Audit migration completed successfully!' AS status;
