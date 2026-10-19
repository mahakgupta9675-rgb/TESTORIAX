/**
 * paymentTypes.ts
 *
 * Centralised TypeScript type definitions for the Testoriax payment system.
 * Phase 13 — Payment Foundation
 *
 * SECURITY RULES (enforced across the entire payment system):
 * - Never trust client-provided amounts or commission percentages.
 * - Never expose provider secret keys via VITE_* env vars.
 * - Never store card numbers, CVV, UPI PIN, bank passwords, or any raw credentials.
 * - Never allow frontend to directly set payment status.
 * - All financial calculations use integer paise (1 INR = 100 paise) to avoid
 *   floating-point precision errors.
 */

// ============================================================
// STATUS ENUMS
// ============================================================

/**
 * Lifecycle states of a payment order.
 * created → pending → paid
 *                  → failed / cancelled / expired
 * paid   → refunded / partially_refunded
 */
export type PaymentOrderStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded';

/**
 * Status of an individual payment transaction.
 */
export type PaymentStatus =
  | 'pending'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

/**
 * Status of a creator payout transfer.
 */
export type PaymentTransferStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'reversed'
  | 'partially_reversed';

/**
 * Status of a refund request.
 */
export type RefundStatus =
  | 'requested'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Status of a creator's linked payment account.
 */
export type CreatorPaymentAccountStatus =
  | 'not_connected'
  | 'pending'
  | 'connected'
  | 'restricted'
  | 'disabled';

// ============================================================
// PAYMENT SPLIT CALCULATION TYPES
// ============================================================

/**
 * Result of a payment split calculation.
 * All monetary values available in both paise (integer, safe) and INR (display).
 *
 * Rounding rule:
 *   platform_fee_paise = FLOOR(gross_paise × commission_pct / 100)
 *   creator_amount_paise = gross_paise − platform_fee_paise
 *   (Creator receives any sub-paisa rounding benefit)
 */
export interface PaymentSplitResult {
  /** Original gross amount in paise (integer, floating-point safe) */
  grossPaise: number;
  /** Platform commission in paise */
  platformFeePaise: number;
  /** Creator net amount in paise */
  creatorAmountPaise: number;
  /** Gross amount in INR (for display only — do NOT use for calculations) */
  grossInr: number;
  /** Platform fee in INR (for display only) */
  platformFeeInr: number;
  /** Creator amount in INR (for display only) */
  creatorAmountInr: number;
  /** Commission percentage that was applied */
  commissionPct: number;
}

// ============================================================
// DATABASE ROW TYPES
// ============================================================

/**
 * Row in public.platform_payment_config
 */
export interface PlatformPaymentConfig {
  id: string;
  commission_percentage: number;
  currency: string;
  minimum_entry_fee: number;
  maximum_entry_fee: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Row in public.payment_orders
 */
export interface PaymentOrder {
  id: string;
  user_id: string;
  test_id: string;
  creator_id: string;
  order_reference: string;
  provider: string | null;
  provider_order_id: string | null;
  /** Gross entry fee in INR (NUMERIC stored in DB) */
  amount: number;
  currency: string;
  platform_commission_percentage: number;
  platform_fee: number;
  creator_amount: number;
  payment_gateway_fee: number;
  status: PaymentOrderStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  expires_at: string | null;
}

/**
 * Row in public.payments
 *
 * SENSITIVE DATA POLICY:
 * This type intentionally does NOT include fields for:
 * - card_number, cvv, upi_pin, bank_password, raw_card_data
 * Only provider IDs, safe metadata, and transaction state are stored.
 */
export interface Payment {
  id: string;
  payment_order_id: string;
  user_id: string;
  test_id: string;
  creator_id: string;
  provider: string | null;
  /** Provider-assigned payment ID (e.g. Razorpay pay_xxx) — NOT a secret */
  provider_payment_id: string | null;
  provider_order_id: string | null;
  amount: number;
  currency: string;
  /** e.g. 'upi', 'card', 'netbanking' — never raw card details */
  payment_method: string | null;
  status: PaymentStatus;
  captured_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  /** Non-sensitive metadata from provider (e.g. bank name, wallet name) */
  raw_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Row in public.creator_payment_accounts
 *
 * SENSITIVE DATA POLICY:
 * This type does NOT include bank account numbers, IFSC codes, card details,
 * CVV, UPI PIN, or KYC documents. Those live in the payment provider's vault.
 */
export interface CreatorPaymentAccount {
  id: string;
  creator_id: string;
  provider: string;
  /** Provider-assigned linked account ID (e.g. Razorpay Route acc_xxx) */
  provider_account_id: string | null;
  status: CreatorPaymentAccountStatus;
  onboarding_status: string | null;
  kyc_status: string | null;
  settlement_status: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Row in public.payment_transfers (creator payout ledger)
 *
 * LEDGER RULE: Records are NEVER deleted or silently overwritten.
 * Reversals create NEW records with status 'reversed' or 'partially_reversed'.
 */
export interface PaymentTransfer {
  id: string;
  payment_id: string;
  creator_id: string;
  provider: string | null;
  provider_transfer_id: string | null;
  gross_amount: number;
  platform_fee: number;
  creator_amount: number;
  status: PaymentTransferStatus;
  reversal_amount: number;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
  updated_at: string;
}

/**
 * Row in public.refunds
 */
export interface Refund {
  id: string;
  payment_id: string;
  payment_order_id: string;
  user_id: string;
  test_id: string;
  creator_id: string;
  provider: string | null;
  provider_refund_id: string | null;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
  updated_at: string;
}

/**
 * Row in public.payment_webhook_events
 *
 * IDEMPOTENCY: (provider, event_id) is UNIQUE in the database.
 * The same webhook event must never be processed twice.
 */
export interface PaymentWebhookEvent {
  id: string;
  provider: string;
  /** Provider-assigned event ID for idempotency */
  event_id: string;
  event_type: string;
  /** Full webhook payload (non-sensitive; secrets are verified server-side) */
  payload: Record<string, unknown>;
  signature_verified: boolean;
  processed: boolean;
  processing_error: string | null;
  received_at: string;
  processed_at: string | null;
}

// ============================================================
// SERVICE INPUT/OUTPUT TYPES
// ============================================================

/**
 * Input for creating a payment order record.
 * Amounts are always calculated server-side; never pass client-computed amounts.
 */
export interface CreatePaymentOrderInput {
  userId: string;
  testId: string;
  creatorId: string;
  /** Amount in INR — must come from the database (tests.entry_fee), not from the client form */
  amountInr: number;
  commissionPercentage: number;
  provider?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of payment configuration retrieval.
 */
export interface PaymentConfigResult {
  commissionPercentage: number;
  currency: string;
  minimumEntryFee: number;
  maximumEntryFee: number | null;
  enabled: boolean;
}

/**
 * Result of validate_paid_test_registration RPC.
 */
export interface ValidationResult {
  valid: boolean;
  reason: string;
  testId?: string;
  entryFee?: number;
  commissionPct?: number;
  creatorId?: string;
}

/**
 * Result of calculate_refundable_amount RPC.
 */
export interface RefundableAmountResult {
  paymentId: string;
  paidAmount: number;
  refundedAmount: number;
  refundableAmount: number;
}
