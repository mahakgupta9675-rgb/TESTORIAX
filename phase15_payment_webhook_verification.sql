-- =====================================================
-- PHASE 15: PAYMENT WEBHOOK, VERIFICATION & REGISTRATION CONFIRMATION
-- Testoriax Payment Lifecycle & Security Schema Update
-- =====================================================
-- Safe to re-run
-- =====================================================

-- 1. Update payment_orders status check constraint to support 'verified' state
ALTER TABLE public.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;
ALTER TABLE public.payment_orders ADD CONSTRAINT payment_orders_status_check CHECK (status IN (
  'created', 'pending', 'verified', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded'
));

-- 2. Ensure RLS on payment_orders allows student to view their own orders
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own payment orders" ON public.payment_orders;
CREATE POLICY "Students view own payment orders"
  ON public.payment_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Ensure RLS on payments allows student to view their own payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own payments" ON public.payments;
CREATE POLICY "Students view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creators view earnings payments" ON public.payments;
CREATE POLICY "Creators view earnings payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id);

SELECT 'Payment lifecycle & security updates applied successfully!' AS status;
