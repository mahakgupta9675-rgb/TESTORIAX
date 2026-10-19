-- =====================================================
-- PHASE 13: PAYMENT FOUNDATION
-- Testoriax Payment Database Schema
-- =====================================================
-- Run this entire script in your Supabase SQL Editor
-- SAFE TO RE-RUN: uses CREATE TABLE IF NOT EXISTS and
-- DROP POLICY IF EXISTS guards throughout.
-- =====================================================

-- ====================================================
-- 0. HELPER: Generic updated_at trigger function
--    (reuse if already exists from earlier phases)
-- ====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ====================================================
-- 1. PLATFORM PAYMENT CONFIGURATION TABLE
--    Commission percentage is stored here, NOT in code.
--    Only admins should be able to modify this.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.platform_payment_config (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_percentage     NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
  currency                  TEXT          NOT NULL DEFAULT 'INR',
  minimum_entry_fee         NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  maximum_entry_fee         NUMERIC(12,2) NULL,
  enabled                   BOOLEAN       NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT ppc_commission_range CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  CONSTRAINT ppc_min_fee_positive CHECK (minimum_entry_fee >= 0),
  CONSTRAINT ppc_max_gte_min CHECK (maximum_entry_fee IS NULL OR maximum_entry_fee >= minimum_entry_fee)
);

-- Seed the default configuration row (only insert if table is empty)
INSERT INTO public.platform_payment_config (commission_percentage, currency, minimum_entry_fee)
SELECT 20.00, 'INR', 1.00
WHERE NOT EXISTS (SELECT 1 FROM public.platform_payment_config);

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS trg_platform_payment_config_updated_at ON public.platform_payment_config;
CREATE TRIGGER trg_platform_payment_config_updated_at
  BEFORE UPDATE ON public.platform_payment_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.platform_payment_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read payment config" ON public.platform_payment_config;
CREATE POLICY "Anyone authenticated can read payment config"
  ON public.platform_payment_config FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can modify payment config" ON public.platform_payment_config;
CREATE POLICY "Only admins can modify payment config"
  ON public.platform_payment_config FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- ====================================================
-- 2. PAYMENT ORDER STATUS ENUM (as text constraint)
--    Valid statuses for payment_orders
-- ====================================================
-- Note: Using TEXT with CHECK constraints for flexibility.
-- Statuses: created → pending → paid
--           → failed / cancelled / expired / refunded / partially_refunded


-- ====================================================
-- 3. PAYMENT ORDERS TABLE
--    One record per student attempting to pay for a test.
--    Financial amounts are ALWAYS calculated server-side.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id                              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  test_id                         UUID          NOT NULL REFERENCES public.tests(id) ON DELETE RESTRICT,
  creator_id                      UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_reference                 TEXT          NOT NULL,
  provider                        TEXT          NULL,                          -- e.g. 'razorpay'
  provider_order_id               TEXT          UNIQUE NULL,                   -- Razorpay order ID (future)
  amount                          NUMERIC(12,2) NOT NULL,                      -- gross entry fee in INR
  currency                        TEXT          NOT NULL DEFAULT 'INR',
  platform_commission_percentage  NUMERIC(5,2)  NOT NULL,                      -- snapshot of commission at time of order
  platform_fee                    NUMERIC(12,2) NOT NULL,                      -- Testoriax share in INR
  creator_amount                  NUMERIC(12,2) NOT NULL,                      -- creator net in INR
  payment_gateway_fee             NUMERIC(12,2) NOT NULL DEFAULT 0.00,         -- gateway fee (updated after payment)
  status                          TEXT          NOT NULL DEFAULT 'created',
  metadata                        JSONB         NOT NULL DEFAULT '{}',
  created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  paid_at                         TIMESTAMPTZ   NULL,
  expires_at                      TIMESTAMPTZ   NULL,

  -- Constraints
  CONSTRAINT payment_orders_order_ref_unique UNIQUE (order_reference),
  CONSTRAINT payment_orders_status_check CHECK (status IN (
    'created', 'pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded'
  )),
  CONSTRAINT payment_orders_amount_positive CHECK (amount > 0),
  CONSTRAINT payment_orders_platform_fee_positive CHECK (platform_fee >= 0),
  CONSTRAINT payment_orders_creator_amount_positive CHECK (creator_amount >= 0),
  CONSTRAINT payment_orders_fee_not_exceed_amount CHECK (platform_fee <= amount),
  CONSTRAINT payment_orders_creator_not_exceed_amount CHECK (creator_amount <= amount),
  CONSTRAINT payment_orders_split_integrity CHECK (
    ROUND(platform_fee + creator_amount, 2) = ROUND(amount, 2)
  ),
  CONSTRAINT payment_orders_commission_range CHECK (
    platform_commission_percentage >= 0 AND platform_commission_percentage <= 100
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_test_id ON public.payment_orders(test_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_creator_id ON public.payment_orders(creator_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_order_id ON public.payment_orders(provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON public.payment_orders(created_at DESC);

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS trg_payment_orders_updated_at ON public.payment_orders;
CREATE TRIGGER trg_payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Students can only see their own orders
DROP POLICY IF EXISTS "Students view own payment orders" ON public.payment_orders;
CREATE POLICY "Students view own payment orders"
  ON public.payment_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Creators can see orders for their tests (to view earnings)
DROP POLICY IF EXISTS "Creators view payment orders for their tests" ON public.payment_orders;
CREATE POLICY "Creators view payment orders for their tests"
  ON public.payment_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = payment_orders.test_id
        AND t.creator_id = auth.uid()
    )
  );

-- Admins can view all
DROP POLICY IF EXISTS "Admins view all payment orders" ON public.payment_orders;
CREATE POLICY "Admins view all payment orders"
  ON public.payment_orders FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- No user can insert/update payment orders directly from client
-- (All writes go through server-side RPC functions)
-- NOTE: INSERT/UPDATE/DELETE is intentionally restricted. Backend uses SECURITY DEFINER functions.


-- ====================================================
-- 4. PAYMENTS TABLE
--    Records each actual payment attempt / transaction.
--    NEVER store card numbers, CVV, UPI PIN, or bank credentials.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id      UUID          NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  user_id               UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  test_id               UUID          NOT NULL REFERENCES public.tests(id) ON DELETE RESTRICT,
  creator_id            UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider              TEXT          NULL,                          -- e.g. 'razorpay'
  provider_payment_id   TEXT          UNIQUE NULL,                   -- e.g. Razorpay pay_xxx ID
  provider_order_id     TEXT          NULL,
  amount                NUMERIC(12,2) NOT NULL,
  currency              TEXT          NOT NULL DEFAULT 'INR',
  payment_method        TEXT          NULL,                          -- e.g. 'upi', 'card', 'netbanking'
  status                TEXT          NOT NULL DEFAULT 'pending',
  captured_at           TIMESTAMPTZ   NULL,
  failed_at             TIMESTAMPTZ   NULL,
  failure_reason        TEXT          NULL,
  raw_metadata          JSONB         NOT NULL DEFAULT '{}',         -- safe non-sensitive metadata from provider
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT payments_status_check CHECK (status IN (
    'pending', 'captured', 'failed', 'refunded', 'partially_refunded'
  )),
  CONSTRAINT payments_amount_positive CHECK (amount > 0)
  -- NOTE: Never add columns for: card_number, cvv, upi_pin, bank_password, raw_card_data
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_test_id ON public.payments(test_id);
CREATE INDEX IF NOT EXISTS idx_payments_creator_id ON public.payments(creator_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON public.payments(provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_order_id ON public.payments(payment_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Trigger
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own payments" ON public.payments;
CREATE POLICY "Students view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creators view payments for their tests" ON public.payments;
CREATE POLICY "Creators view payments for their tests"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = payments.test_id
        AND t.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
CREATE POLICY "Admins view all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 5. CREATOR PAYMENT ACCOUNTS TABLE
--    Foundation for future Razorpay Route / linked accounts.
--    NEVER store bank account numbers, card details, CVV, UPI PIN.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.creator_payment_accounts (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id            UUID          NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider              TEXT          NOT NULL DEFAULT 'razorpay',
  provider_account_id   TEXT          NULL,                          -- Future: Razorpay linked account ID
  status                TEXT          NOT NULL DEFAULT 'not_connected',
  onboarding_status     TEXT          NULL,
  kyc_status            TEXT          NULL,
  settlement_status     TEXT          NULL,
  metadata              JSONB         NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT cpa_status_check CHECK (status IN (
    'not_connected', 'pending', 'connected', 'restricted', 'disabled'
  ))
  -- NOTE: Never add columns for bank_account_number, ifsc_code (store only in provider vaults),
  --       card_details, upi_pin, or any raw payment credentials.
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_payment_accounts_creator_id ON public.creator_payment_accounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payment_accounts_status ON public.creator_payment_accounts(status);

-- Trigger
DROP TRIGGER IF EXISTS trg_creator_payment_accounts_updated_at ON public.creator_payment_accounts;
CREATE TRIGGER trg_creator_payment_accounts_updated_at
  BEFORE UPDATE ON public.creator_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.creator_payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own payment account" ON public.creator_payment_accounts;
CREATE POLICY "Creators view own payment account"
  ON public.creator_payment_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins view all creator payment accounts" ON public.creator_payment_accounts;
CREATE POLICY "Admins view all creator payment accounts"
  ON public.creator_payment_accounts FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Creators can insert their own account record (foundation)
DROP POLICY IF EXISTS "Creators can create own payment account" ON public.creator_payment_accounts;
CREATE POLICY "Creators can create own payment account"
  ON public.creator_payment_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);


-- ====================================================
-- 6. PAYMENT TRANSFERS TABLE (Creator Payout Ledger)
--    Financial ledger — records are NEVER overwritten.
--    Revisions create new reversal records instead.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.payment_transfers (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id            UUID          NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  creator_id            UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider              TEXT          NULL,
  provider_transfer_id  TEXT          UNIQUE NULL,                   -- Provider transfer reference
  gross_amount          NUMERIC(12,2) NOT NULL,
  platform_fee          NUMERIC(12,2) NOT NULL,
  creator_amount        NUMERIC(12,2) NOT NULL,
  status                TEXT          NOT NULL DEFAULT 'pending',
  reversal_amount       NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  metadata              JSONB         NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at          TIMESTAMPTZ   NULL,
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT payment_transfers_status_check CHECK (status IN (
    'pending', 'processing', 'processed', 'failed', 'reversed', 'partially_reversed'
  )),
  CONSTRAINT payment_transfers_gross_positive CHECK (gross_amount > 0),
  CONSTRAINT payment_transfers_platform_fee_positive CHECK (platform_fee >= 0),
  CONSTRAINT payment_transfers_creator_amount_positive CHECK (creator_amount >= 0),
  CONSTRAINT payment_transfers_reversal_nonnegative CHECK (reversal_amount >= 0),
  CONSTRAINT payment_transfers_reversal_not_exceed CHECK (reversal_amount <= creator_amount),
  CONSTRAINT payment_transfers_split_integrity CHECK (
    ROUND(platform_fee + creator_amount, 2) = ROUND(gross_amount, 2)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transfers_creator_id ON public.payment_transfers(creator_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_payment_id ON public.payment_transfers(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_status ON public.payment_transfers(status);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_created_at ON public.payment_transfers(created_at DESC);

-- Trigger
DROP TRIGGER IF EXISTS trg_payment_transfers_updated_at ON public.payment_transfers;
CREATE TRIGGER trg_payment_transfers_updated_at
  BEFORE UPDATE ON public.payment_transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.payment_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own transfers" ON public.payment_transfers;
CREATE POLICY "Creators view own transfers"
  ON public.payment_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins view all transfers" ON public.payment_transfers;
CREATE POLICY "Admins view all transfers"
  ON public.payment_transfers FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 7. REFUNDS TABLE
--    Multiple refunds against one payment allowed ONLY if
--    total refunded amount never exceeds original payment amount.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.refunds (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id            UUID          NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  payment_order_id      UUID          NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
  user_id               UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  test_id               UUID          NOT NULL REFERENCES public.tests(id) ON DELETE RESTRICT,
  creator_id            UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider              TEXT          NULL,
  provider_refund_id    TEXT          UNIQUE NULL,
  amount                NUMERIC(12,2) NOT NULL,
  reason                TEXT          NULL,
  status                TEXT          NOT NULL DEFAULT 'requested',
  metadata              JSONB         NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at          TIMESTAMPTZ   NULL,
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT refunds_status_check CHECK (status IN (
    'requested', 'processing', 'completed', 'failed', 'cancelled'
  )),
  CONSTRAINT refunds_amount_positive CHECK (amount > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_test_id ON public.refunds(test_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at DESC);

-- Trigger
DROP TRIGGER IF EXISTS trg_refunds_updated_at ON public.refunds;
CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own refunds" ON public.refunds;
CREATE POLICY "Students view own refunds"
  ON public.refunds FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creators view refunds for their tests" ON public.refunds;
CREATE POLICY "Creators view refunds for their tests"
  ON public.refunds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = refunds.test_id
        AND t.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view all refunds" ON public.refunds;
CREATE POLICY "Admins view all refunds"
  ON public.refunds FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));


-- ====================================================
-- 8. PAYMENT WEBHOOK EVENTS TABLE
--    Idempotency: UNIQUE on (provider, event_id).
--    Same webhook must NEVER be processed twice.
--    Records are immutable (no DELETE, no UPDATE to payload).
-- ====================================================
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              TEXT          NOT NULL,
  event_id              TEXT          NOT NULL,
  event_type            TEXT          NOT NULL,
  payload               JSONB         NOT NULL,
  signature_verified    BOOLEAN       NOT NULL DEFAULT false,
  processed             BOOLEAN       NOT NULL DEFAULT false,
  processing_error      TEXT          NULL,
  received_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at          TIMESTAMPTZ   NULL,

  -- Idempotency constraint: one event_id per provider
  CONSTRAINT payment_webhook_events_idempotency UNIQUE (provider, event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.payment_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON public.payment_webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.payment_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON public.payment_webhook_events(received_at DESC);

-- RLS
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read webhook events (server-side processing uses service_role)
DROP POLICY IF EXISTS "Admins view webhook events" ON public.payment_webhook_events;
CREATE POLICY "Admins view webhook events"
  ON public.payment_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- No client can insert/update/delete webhook events
-- (Only the server webhook endpoint uses service_role to write here)


-- ====================================================
-- 9. SERVER-SIDE RPC: Get Active Payment Configuration
--    Returns the active platform commission config.
--    Called by payment service — never trust client-provided commission.
-- ====================================================
CREATE OR REPLACE FUNCTION public.get_payment_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
BEGIN
  SELECT * INTO v_config
  FROM public.platform_payment_config
  WHERE enabled = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment configuration not found. Please contact platform support.';
  END IF;

  RETURN jsonb_build_object(
    'commission_percentage', v_config.commission_percentage,
    'currency',              v_config.currency,
    'minimum_entry_fee',     v_config.minimum_entry_fee,
    'maximum_entry_fee',     v_config.maximum_entry_fee,
    'enabled',               v_config.enabled
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_config TO authenticated;


-- ====================================================
-- 10. SERVER-SIDE RPC: Calculate Payment Split
--     Input:  p_amount_paise (integer paise, never float)
--             p_commission_pct (from config, never from client)
--     Output: JSON with gross_paise, platform_fee_paise, creator_amount_paise
--
--     Uses INTEGER PAISE arithmetic to avoid floating-point errors.
--     Rule: platform_fee = FLOOR(amount * commission / 100)
--           creator_amount = amount - platform_fee  (gets any rounding benefit)
-- ====================================================
CREATE OR REPLACE FUNCTION public.calculate_payment_split(
  p_amount_paise        BIGINT,
  p_commission_pct      NUMERIC(5,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_platform_fee_paise  BIGINT;
  v_creator_paise       BIGINT;
BEGIN
  -- Validation
  IF p_amount_paise <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive (got % paise)', p_amount_paise;
  END IF;

  IF p_commission_pct < 0 OR p_commission_pct > 100 THEN
    RAISE EXCEPTION 'Commission percentage must be between 0 and 100 (got %)', p_commission_pct;
  END IF;

  -- Integer arithmetic in paise (avoids floating-point rounding issues)
  -- FLOOR: platform always gets no more than its percentage (any rounding goes to creator)
  v_platform_fee_paise := FLOOR(p_amount_paise::NUMERIC * p_commission_pct / 100)::BIGINT;
  v_creator_paise      := p_amount_paise - v_platform_fee_paise;

  RETURN jsonb_build_object(
    'gross_paise',           p_amount_paise,
    'platform_fee_paise',    v_platform_fee_paise,
    'creator_amount_paise',  v_creator_paise,
    'gross_inr',             ROUND(p_amount_paise::NUMERIC / 100, 2),
    'platform_fee_inr',      ROUND(v_platform_fee_paise::NUMERIC / 100, 2),
    'creator_amount_inr',    ROUND(v_creator_paise::NUMERIC / 100, 2),
    'commission_pct',        p_commission_pct
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_payment_split TO authenticated;


-- ====================================================
-- 11. SERVER-SIDE RPC: Validate Paid Test Before Order
--     Checks all prerequisites before a payment order can be created.
--     Returns a JSON result with a boolean `valid` and `reason`.
-- ====================================================
CREATE OR REPLACE FUNCTION public.validate_paid_test_registration(
  p_test_id   UUID,
  p_user_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_test        RECORD;
  v_config      RECORD;
  v_existing    RECORD;
BEGIN
  -- 1. Verify test exists
  SELECT * INTO v_test
  FROM public.tests
  WHERE id = p_test_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Test not found.');
  END IF;

  -- 2. Test must be published
  IF v_test.status != 'published' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Test is not currently published.');
  END IF;

  -- 3. Test must require registration (not 'none')
  IF v_test.registration_type = 'none' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'This test does not require registration.');
  END IF;

  -- 4. Test must have a valid paid entry fee
  IF v_test.entry_fee IS NULL OR v_test.entry_fee <= 0 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'This test does not have a paid entry fee.');
  END IF;

  -- 5. Test must not be expired
  IF v_test.expiry_time IS NOT NULL AND v_test.expiry_time::TIMESTAMPTZ < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'This test registration deadline has passed.');
  END IF;

  -- 6. Check payment config exists and is enabled
  SELECT * INTO v_config
  FROM public.platform_payment_config
  WHERE enabled = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Payment system is not currently enabled. Contact support.');
  END IF;

  -- 7. Entry fee must meet minimum
  IF v_test.entry_fee < v_config.minimum_entry_fee THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Entry fee is below platform minimum.');
  END IF;

  -- 8. Entry fee must not exceed maximum (if set)
  IF v_config.maximum_entry_fee IS NOT NULL AND v_test.entry_fee > v_config.maximum_entry_fee THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Entry fee exceeds platform maximum.');
  END IF;

  -- 9. Check for duplicate paid registration (no double payment)
  SELECT id INTO v_existing
  FROM public.payment_orders
  WHERE test_id = p_test_id
    AND user_id = p_user_id
    AND status IN ('paid', 'pending', 'created');

  IF FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'You already have an active or completed payment for this test.');
  END IF;

  -- 10. Verify creator owns the test
  IF v_test.creator_id = p_user_id THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'You cannot pay to access your own test.');
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'valid',               true,
    'reason',              'OK',
    'test_id',             p_test_id,
    'entry_fee',           v_test.entry_fee,
    'commission_pct',      v_config.commission_percentage,
    'creator_id',          v_test.creator_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_paid_test_registration TO authenticated;


-- ====================================================
-- 12. SERVER-SIDE RPC: Calculate Refundable Amount
--     Given a payment_id, calculates how much is still refundable.
-- ====================================================
CREATE OR REPLACE FUNCTION public.calculate_refundable_amount(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_payment       RECORD;
  v_refunded_sum  NUMERIC(12,2);
  v_refundable    NUMERIC(12,2);
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  -- Authorization: caller must own this payment or be admin
  IF v_payment.user_id != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  -- Sum all non-failed, non-cancelled refunds for this payment
  SELECT COALESCE(SUM(amount), 0) INTO v_refunded_sum
  FROM public.refunds
  WHERE payment_id = p_payment_id
    AND status NOT IN ('failed', 'cancelled');

  v_refundable := GREATEST(v_payment.amount - v_refunded_sum, 0);

  RETURN jsonb_build_object(
    'payment_id',        p_payment_id,
    'paid_amount',       v_payment.amount,
    'refunded_amount',   v_refunded_sum,
    'refundable_amount', v_refundable
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_refundable_amount TO authenticated;


-- ====================================================
-- 13. GRANTS — Controlled server-side access
-- ====================================================
GRANT SELECT ON public.platform_payment_config TO authenticated;
GRANT SELECT ON public.payment_orders TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.creator_payment_accounts TO authenticated;
GRANT SELECT ON public.payment_transfers TO authenticated;
GRANT SELECT ON public.refunds TO authenticated;
-- webhook events: server-side writes via service_role only; admins read via RLS above



SELECT 'Phase 13: Payment Foundation migration completed successfully!' AS status;
