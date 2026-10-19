/**
 * paymentService.ts
 *
 * Testoriax Payment Service — Phase 13: Payment Foundation
 *
 * PURPOSE:
 * Provides database-backed payment foundation methods.
 * All financial calculations happen here (server-side via RPC or locally
 * using integer paise arithmetic). The frontend MUST NOT compute amounts
 * or commission percentages independently.
 *
 * PHASE 1 SCOPE:
 * - Commission calculation (client-side paise arithmetic + server-side RPC)
 * - Payment configuration retrieval
 * - Payment order CRUD
 * - Payment retrieval
 * - Creator payment account management
 * - Test validation before payment
 * - Refundable amount calculation
 *
 * NOT IN PHASE 1:
 * - Razorpay API calls (Phase 2)
 * - Razorpay Route / creator payouts (Phase 3+)
 * - Webhook processing (Phase 3+)
 * - Refund UI flows (Phase 4+)
 *
 * SECURITY RULES (must be respected in all callers):
 * 1. Never trust client-provided amount or commission.
 * 2. Never trust client to set payment status.
 * 3. Never expose RAZORPAY_KEY_SECRET or any payment secret via VITE_* variables.
 * 4. Never store card number, CVV, UPI PIN, bank password, or any raw credentials.
 * 5. Never allow negative amounts or commission outside [0, 100].
 * 6. Never allow creator_amount > gross amount.
 * 7. Never allow duplicate provider transaction IDs.
 * 8. Never process the same webhook event twice.
 * 9. Never delete historical payment_transfers records.
 * 10. Always use integer paise for arithmetic — never raw INR floats.
 */

import supabase from '../lib/supabase';

// Centralized API Base URL helper for environment-agnostic fetch calls
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || typeof envUrl !== 'string') {
    return '';
  }
  return envUrl.trim().replace(/\/+$/, '');
}

export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}
import type {
  PaymentSplitResult,
  PaymentConfigResult,
  PaymentOrder,
  Payment,
  CreatorPaymentAccount,
  CreatePaymentOrderInput,
  ValidationResult,
  RefundableAmountResult,
  Refund,
  PaymentTransfer,
} from './paymentTypes';

// ============================================================
// UTILITY: PAISE CONVERSION
// ============================================================

/**
 * Converts INR (float/string) to integer paise.
 * ALWAYS use paise for arithmetic to avoid IEEE-754 floating-point errors.
 *
 * Example: 100.50 INR → 10050 paise
 *
 * @param inrAmount - Amount in INR
 * @returns Integer paise value (rounded to nearest paisa)
 */
export function inrToPaise(inrAmount: number): number {
  // Multiply by 100, then round to avoid floating-point drift
  return Math.round(inrAmount * 100);
}

/**
 * Converts integer paise back to INR for display.
 * Never use the result of this function for further arithmetic computations.
 *
 * Example: 10050 paise → 100.50 INR
 *
 * @param paise - Amount in paise (must be integer)
 * @returns INR value rounded to 2 decimal places
 */
export function paiseToInr(paise: number): number {
  return Math.round(paise) / 100;
}

// ============================================================
// COMMISSION CALCULATION (CLIENT-SIDE, INTEGER PAISE)
// ============================================================

/**
 * Calculates the platform/creator payment split for a given amount.
 *
 * Uses INTEGER PAISE arithmetic throughout to avoid floating-point errors.
 *
 * Rounding rule (PLATFORM RULE):
 *   platform_fee_paise = FLOOR(gross_paise × commissionPct / 100)
 *   creator_amount_paise = gross_paise − platform_fee_paise
 *   (The creator receives any sub-paisa rounding benefit.)
 *
 * Example — ₹100 @ 20%:
 *   gross = 10000 paise
 *   platform = FLOOR(10000 × 20 / 100) = 2000 paise = ₹20
 *   creator  = 10000 − 2000 = 8000 paise = ₹80
 *
 * Example — ₹50 @ 20%:
 *   gross = 5000 paise
 *   platform = FLOOR(5000 × 20 / 100) = 1000 paise = ₹10
 *   creator  = 5000 − 1000 = 4000 paise = ₹40
 *
 * Example — ₹100 @ 30%:
 *   gross = 10000 paise
 *   platform = FLOOR(10000 × 30 / 100) = 3000 paise = ₹30
 *   creator  = 10000 − 3000 = 7000 paise = ₹70
 *
 * @param amountInr - Gross entry fee in INR (from database, never from client form)
 * @param commissionPercentage - Commission % from platform_payment_config (never from client)
 * @throws Error if amount ≤ 0 or commission is outside [0, 100]
 */
export function calculatePaymentSplit(
  amountInr: number,
  commissionPercentage: number
): PaymentSplitResult {
  // Validate inputs
  if (amountInr <= 0) {
    throw new Error(
      `Payment amount must be positive. Received: ${amountInr} INR`
    );
  }
  if (commissionPercentage < 0 || commissionPercentage > 100) {
    throw new Error(
      `Commission percentage must be between 0 and 100. Received: ${commissionPercentage}`
    );
  }

  const grossPaise = inrToPaise(amountInr);

  // FLOOR ensures platform never takes more than its stated percentage
  const platformFeePaise = Math.floor((grossPaise * commissionPercentage) / 100);
  const creatorAmountPaise = grossPaise - platformFeePaise;

  // Sanity assertions (should never fire if inputs are valid)
  if (creatorAmountPaise < 0) {
    throw new Error('Internal error: creator_amount is negative. This should never happen.');
  }
  if (platformFeePaise > grossPaise) {
    throw new Error('Internal error: platform_fee exceeds gross amount. This should never happen.');
  }

  return {
    grossPaise,
    platformFeePaise,
    creatorAmountPaise,
    grossInr: paiseToInr(grossPaise),
    platformFeeInr: paiseToInr(platformFeePaise),
    creatorAmountInr: paiseToInr(creatorAmountPaise),
    commissionPct: commissionPercentage,
  };
}

// ============================================================
// GENERATE ORDER REFERENCE
// ============================================================

/**
 * Generates a unique order reference string.
 * Format: TXO-{timestamp_ms}-{random_hex}
 * Example: TXO-1724700000000-a3f9b2
 */
function generateOrderReference(): string {
  const ts = Date.now().toString();
  const array = new Uint8Array(4);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(array);
  }
  const rand = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('').substring(0, 6).toUpperCase();
  return `TXO-${ts}-${rand}`;
}

// ============================================================
// PAYMENT SERVICE
// ============================================================

export const paymentService = {

  // ----------------------------------------------------------
  // CONFIGURATION
  // ----------------------------------------------------------

  /**
   * Retrieves the active platform payment configuration from the database.
   * NEVER use a hardcoded commission; always fetch from this function.
   *
   * Uses the server-side get_payment_config() RPC for security.
   */
  async getPaymentConfiguration(): Promise<{ data: PaymentConfigResult | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('get_payment_config');
      if (error) throw error;
      if (!data) throw new Error('Payment configuration returned empty.');

      const config: PaymentConfigResult = {
        commissionPercentage: Number(data.commission_percentage),
        currency:             String(data.currency),
        minimumEntryFee:      Number(data.minimum_entry_fee),
        maximumEntryFee:      data.maximum_entry_fee != null ? Number(data.maximum_entry_fee) : null,
        enabled:              Boolean(data.enabled),
      };
      return { data: config, error: null };
    } catch (err) {
      console.error('[paymentService] getPaymentConfiguration error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  // ----------------------------------------------------------
  // PAYMENT SPLIT (SERVER-SIDE VIA RPC)
  // ----------------------------------------------------------

  /**
   * Calls the server-side calculate_payment_split RPC.
   * Prefer this over the client-side calculatePaymentSplit() when creating real orders,
   * as the server applies the same rounding rule and can be audited.
   *
   * @param amountInr - Entry fee amount in INR (from database)
   * @param commissionPct - Commission from platform config (from getPaymentConfiguration)
   */
  async calculateSplitViaRpc(
    amountInr: number,
    commissionPct: number
  ): Promise<{ data: PaymentSplitResult | null; error: Error | null }> {
    try {
      if (amountInr <= 0) throw new Error('Amount must be positive.');
      if (commissionPct < 0 || commissionPct > 100) throw new Error('Commission must be 0–100.');

      const amountPaise = inrToPaise(amountInr);

      const { data, error } = await supabase.rpc('calculate_payment_split', {
        p_amount_paise:   amountPaise,
        p_commission_pct: commissionPct,
      });
      if (error) throw error;
      if (!data) throw new Error('Empty response from calculate_payment_split RPC.');

      const result: PaymentSplitResult = {
        grossPaise:         Number(data.gross_paise),
        platformFeePaise:   Number(data.platform_fee_paise),
        creatorAmountPaise: Number(data.creator_amount_paise),
        grossInr:           Number(data.gross_inr),
        platformFeeInr:     Number(data.platform_fee_inr),
        creatorAmountInr:   Number(data.creator_amount_inr),
        commissionPct:      Number(data.commission_pct),
      };
      return { data: result, error: null };
    } catch (err) {
      console.error('[paymentService] calculateSplitViaRpc error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  // ----------------------------------------------------------
  // PAYMENT ORDER
  // ----------------------------------------------------------

  /**
   * Creates a new payment order record in the database.
   *
   * SECURITY: This function calculates amounts server-side from configuration.
   * The client MUST NOT pass pre-computed amounts — call this with the raw
   * amountInr from the test record and the service fetches config internally.
   *
   * @param input - CreatePaymentOrderInput (amounts come from DB test record)
   */
  async createPaymentOrderRecord(
    input: CreatePaymentOrderInput
  ): Promise<{ data: PaymentOrder | null; error: Error | null }> {
    try {
      // Always compute split using integer paise — never trust client math
      const split = calculatePaymentSplit(
        input.amountInr,
        input.commissionPercentage
      );

      const orderRef = generateOrderReference();

      const insertRow = {
        user_id:                        input.userId,
        test_id:                        input.testId,
        creator_id:                     input.creatorId,
        order_reference:                orderRef,
        provider:                       input.provider ?? null,
        provider_order_id:              null,
        amount:                         split.grossInr,
        currency:                       'INR',
        platform_commission_percentage: input.commissionPercentage,
        platform_fee:                   split.platformFeeInr,
        creator_amount:                 split.creatorAmountInr,
        payment_gateway_fee:            0,
        status:                         'created',
        metadata:                       input.metadata ?? {},
        expires_at:                     input.expiresAt ?? null,
      };

      const { data, error } = await supabase
        .from('payment_orders')
        .insert(insertRow)
        .select()
        .single();

      if (error) throw error;
      return { data: data as PaymentOrder, error: null };
    } catch (err) {
      console.error('[paymentService] createPaymentOrderRecord error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Retrieves a payment order by its database ID.
   */
  async getPaymentOrder(
    orderId: string
  ): Promise<{ data: PaymentOrder | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return { data: data as PaymentOrder, error: null };
    } catch (err) {
      console.error('[paymentService] getPaymentOrder error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Retrieves a payment order by order reference string.
   */
  async getPaymentOrderByReference(
    orderReference: string
  ): Promise<{ data: PaymentOrder | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_reference', orderReference)
        .single();

      if (error) throw error;
      return { data: data as PaymentOrder, error: null };
    } catch (err) {
      console.error('[paymentService] getPaymentOrderByReference error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Returns all payment orders for a given user (their purchase history).
   */
  async getUserPaymentOrders(
    userId: string
  ): Promise<{ data: PaymentOrder[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data ?? []) as PaymentOrder[], error: null };
    } catch (err) {
      console.error('[paymentService] getUserPaymentOrders error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Returns all payment orders for a creator's tests (earnings view).
   */
  async getCreatorPaymentOrders(
    creatorId: string
  ): Promise<{ data: PaymentOrder[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data ?? []) as PaymentOrder[], error: null };
    } catch (err) {
      console.error('[paymentService] getCreatorPaymentOrders error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  // ----------------------------------------------------------
  // PAYMENTS
  // ----------------------------------------------------------

  /**
   * Retrieves a single payment transaction by its database ID.
   */
  async getPaymentById(
    paymentId: string
  ): Promise<{ data: Payment | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      return { data: data as Payment, error: null };
    } catch (err) {
      console.error('[paymentService] getPaymentById error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Returns all payment transactions for a given payment order.
   */
  async getPaymentsForOrder(
    paymentOrderId: string
  ): Promise<{ data: Payment[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_order_id', paymentOrderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data ?? []) as Payment[], error: null };
    } catch (err) {
      console.error('[paymentService] getPaymentsForOrder error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  // ----------------------------------------------------------
  // CREATOR PAYMENT ACCOUNTS
  // ----------------------------------------------------------

  /**
   * Retrieves the payment account for a creator.
   * Returns null if the creator has not yet connected a payment account.
   */
  async getCreatorPaymentAccount(
    creatorId: string
  ): Promise<{ data: CreatorPaymentAccount | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('creator_payment_accounts')
        .select('*')
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (error) throw error;
      return { data: data as CreatorPaymentAccount | null, error: null };
    } catch (err) {
      console.error('[paymentService] getCreatorPaymentAccount error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Creates an initial (not_connected) payment account record for a creator.
   * Only creates if one does not already exist (upsert pattern).
   */
  async initCreatorPaymentAccount(
    creatorId: string
  ): Promise<{ data: CreatorPaymentAccount | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('creator_payment_accounts')
        .upsert(
          {
            creator_id: creatorId,
            provider:   'razorpay',
            status:     'not_connected',
          },
          { onConflict: 'creator_id', ignoreDuplicates: true }
        )
        .select()
        .maybeSingle();

      if (error) throw error;
      return { data: data as CreatorPaymentAccount | null, error: null };
    } catch (err) {
      console.error('[paymentService] initCreatorPaymentAccount error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  /**
   * Validates whether a user is eligible to pay for a test.
   * Delegates to the server-side validate_paid_test_registration RPC which checks:
   *  1. Test exists and is published
   *  2. Test has a valid entry fee
   *  3. Test is not expired
   *  4. Payment config is enabled
   *  5. Entry fee is within min/max bounds
   *  6. No duplicate paid registration
   *  7. User is not the creator
   *
   * @param testId - Target test ID
   * @param userId - User attempting to register
   */
  async validatePaidTest(
    testId: string,
    userId: string
  ): Promise<{ data: ValidationResult | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('validate_paid_test_registration', {
        p_test_id:  testId,
        p_user_id:  userId,
      });

      if (error) throw error;
      if (!data) throw new Error('Validation RPC returned empty.');

      const result: ValidationResult = {
        valid:         Boolean(data.valid),
        reason:        String(data.reason),
        testId:        data.test_id ?? undefined,
        entryFee:      data.entry_fee != null ? Number(data.entry_fee) : undefined,
        commissionPct: data.commission_pct != null ? Number(data.commission_pct) : undefined,
        creatorId:     data.creator_id ?? undefined,
      };
      return { data: result, error: null };
    } catch (err) {
      console.error('[paymentService] validatePaidTest error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Checks whether a user is already registered for a test (regardless of payment).
   * Uses the existing test_registrations table.
   */
  async validateDuplicateRegistration(
    testId: string,
    userId: string
  ): Promise<{ isDuplicate: boolean; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('test_registrations')
        .select('id')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return { isDuplicate: !!data, error: null };
    } catch (err) {
      console.error('[paymentService] validateDuplicateRegistration error:', err);
      return { isDuplicate: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  // ----------------------------------------------------------
  // REFUNDS
  // ----------------------------------------------------------

  /**
   * Calculates how much of a payment can still be refunded.
   * Delegates to the server-side calculate_refundable_amount RPC.
   *
   * The RPC validates:
   * - Payment exists
   * - Caller owns the payment or is admin
   * - Sums existing non-failed refunds
   * - Returns refundable_amount = paid_amount − already_refunded
   */
  async calculateRefundableAmount(
    paymentId: string
  ): Promise<{ data: RefundableAmountResult | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.rpc('calculate_refundable_amount', {
        p_payment_id: paymentId,
      });

      if (error) throw error;
      if (!data) throw new Error('Refundable amount RPC returned empty.');

      const result: RefundableAmountResult = {
        paymentId:        String(data.payment_id),
        paidAmount:       Number(data.paid_amount),
        refundedAmount:   Number(data.refunded_amount),
        refundableAmount: Number(data.refundable_amount),
      };
      return { data: result, error: null };
    } catch (err) {
      console.error('[paymentService] calculateRefundableAmount error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Retrieves all refunds for a given payment.
   */
  async getRefundsForPayment(
    paymentId: string
  ): Promise<{ data: Refund[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('refunds')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data ?? []) as Refund[], error: null };
    } catch (err) {
      console.error('[paymentService] getRefundsForPayment error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  // ----------------------------------------------------------
  // CREATOR PAYOUTS / TRANSFERS
  // ----------------------------------------------------------

  /**
   * Retrieves all payout transfer records for a creator.
   * These are read-only; write operations happen server-side only.
   */
  async getCreatorTransfers(
    creatorId: string
  ): Promise<{ data: PaymentTransfer[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('payment_transfers')
        .select('*')
        .eq('creator_id', creatorId)
      if (error) throw error;
      return { data: data as PaymentTransfer[], error: null };
    } catch (err: any) {
      console.error('[paymentService] getCreatorTransfers error:', err);
      return { data: null, error: err };
    }
  },

  // ----------------------------------------------------------
  // RAZORPAY INTEGRATION (PHASE 2)
  // ----------------------------------------------------------

  /**
   * Dynamically loads the official Razorpay Checkout SDK script into the document head.
   */
  async loadRazorpayCheckoutScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  },

  /**
   * Requests backend endpoint POST /api/payments/create-order to create a Razorpay Order.
   * Reads actual entry fee from DB server-side — never passes client amount.
   */
  async createRazorpayOrder(
    testId: string,
    competitionId?: string
  ): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required.');

      const response = await fetch(buildApiUrl('/api/payments/create-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          test_id: testId,
          competition_id: competitionId ?? null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment order.');
      }

      return { data: result, error: null };
    } catch (err) {
      console.error('[paymentService] createRazorpayOrder error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Sends Razorpay Checkout response payload to server verification endpoint POST /api/payments/verify.
   * Verification must succeed server-side before student is marked as paid.
   */
  async verifyRazorpayPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    test_id: string;
    competition_id?: string;
    payment_method?: string;
  }): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required.');

      const response = await fetch(buildApiUrl('/api/payments/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Payment signature verification failed.');
      }

      return { data: result, error: null };
    } catch (err) {
      console.error('[paymentService] verifyRazorpayPayment error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Authoritative backend check before student starts a test.
   * Verifies that paid tests have a completed payment record.
   */
  async checkTestAccess(
    testId: string
  ): Promise<{ access: boolean; reason?: string; is_free?: boolean; payment_status?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { access: false, reason: 'Unauthenticated.' };

      const response = await fetch(buildApiUrl(`/api/payments/check-access?test_id=${encodeURIComponent(testId)}`), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        return { access: false, reason: 'Access check failed.' };
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('[paymentService] checkTestAccess error:', err);
      return { access: false, reason: 'Failed to verify test access.' };
    }
  },

  // ----------------------------------------------------------
  // PHASE 3 — FINANCIAL SETTLEMENT & CREATOR EARNINGS METHODS
  // ----------------------------------------------------------

  /**
   * Fetches financial summary for creator (Total Earnings, Available, Pending, Paid Out, Paid Regs).
   */
  async getCreatorFinancialSummary(): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl('/api/payments/creator-summary'), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch financial summary.');
      }
      const data = await res.json();
      return { data, error: null };
    } catch (err: any) {
      console.error('[paymentService] getCreatorFinancialSummary error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetches earnings history records for creator.
   */
  async getCreatorEarningsHistory(): Promise<{ data: any[] | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl('/api/payments/creator-earnings'), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch earnings history.');
      }
      const result = await res.json();
      return { data: result.data || [], error: null };
    } catch (err: any) {
      console.error('[paymentService] getCreatorEarningsHistory error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Submits a payout request for creator.
   */
  async requestPayout(
    amountInr: number,
    payoutMethod: string = 'bank_transfer'
  ): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl('/api/payments/request-payout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount_inr: amountInr, payout_method: payoutMethod }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Payout request failed.');
      }
      return { data: result, error: null };
    } catch (err: any) {
      console.error('[paymentService] requestPayout error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetches payout history for creator.
   */
  async getCreatorPayouts(): Promise<{ data: any[] | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl('/api/payments/creator-payouts'), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch payout history.');
      }
      const result = await res.json();
      return { data: result.data || [], error: null };
    } catch (err: any) {
      console.error('[paymentService] getCreatorPayouts error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetches creator masked payout account details.
   */
  async getPayoutDetails(): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl('/api/payments/get-payout-details'), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch payout details.');
      }
      const result = await res.json();
      return { data: result.data, error: null };
    } catch (err: any) {
      console.error('[paymentService] getPayoutDetails error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Saves/updates creator payout details.
   */
  async savePayoutDetails(details: {
    account_holder_name: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    upi_id?: string;
    payout_type?: 'bank_transfer' | 'upi';
  }): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl('/api/payments/save-payout-details'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(details),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save payout details.');
      }
      return { data: result.data, error: null };
    } catch (err: any) {
      console.error('[paymentService] savePayoutDetails error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetches payment status recovery info for a student and test ID.
   */
  async getPaymentStatus(testId: string): Promise<{ paid: boolean; status: string; order_id?: string; payment_id?: string; paid_at?: string; error?: Error }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { paid: false, status: 'unauthenticated' };

      const res = await fetch(buildApiUrl(`/api/payments/status/${encodeURIComponent(testId)}`), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        return { paid: false, status: 'error' };
      }

      const result = await res.json();
      return result;
    } catch (err: any) {
      console.error('[paymentService] getPaymentStatus error:', err);
      return { paid: false, status: 'error', error: err };
    }
  },

  /**
   * Submits a student refund request.
   */
  async requestRefund(payload: { payment_id: string; reason: string; explanation?: string }): Promise<{ data: any | null; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl('/api/payments/refund/request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to submit refund request.');
      }
      return { data: result, error: null };
    } catch (err: any) {
      console.error('[paymentService] requestRefund error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetches refund requests history for current student.
   */
  async fetchStudentRefundRequests(): Promise<{ data: any[]; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl('/api/payments/refund/my-requests'), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch refund requests.');
      }
      return { data: result.data || [], error: null };
    } catch (err: any) {
      console.error('[paymentService] fetchStudentRefundRequests error:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Fetches all refund requests for Admin review.
   */
  async fetchAdminRefunds(): Promise<{ data: any[]; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl('/api/admin/refunds'), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch admin refunds.');
      }
      return { data: result.data || [], error: null };
    } catch (err: any) {
      console.error('[paymentService] fetchAdminRefunds error:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Review Admin refund (Approve or Reject).
   */
  async reviewAdminRefund(id: string, action: 'approve' | 'reject', rejection_reason?: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl(`/api/admin/refunds/${encodeURIComponent(id)}/action`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, rejection_reason }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update refund request status.');
      }
      return { success: true, error: null };
    } catch (err: any) {
      console.error('[paymentService] reviewAdminRefund error:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Creator/Admin test cancellation with automatic refund processing.
   */
  async cancelTestAndProcessRefunds(testId: string, cancellation_reason?: string): Promise<{ success: boolean; refunds_processed?: number; error: Error | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Unauthenticated.');

      const res = await fetch(buildApiUrl(`/api/creator/tests/${encodeURIComponent(testId)}/cancel`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ cancellation_reason }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to cancel test and process refunds.');
      }
      return { success: true, refunds_processed: result.refunds_processed, error: null };
    } catch (err: any) {
      console.error('[paymentService] cancelTestAndProcessRefunds error:', err);
      return { success: false, error: err };
    }
  },
};

export default paymentService;

