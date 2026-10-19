import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IndianRupee, Wallet, ArrowDownRight, Clock, CheckCircle2, 
  Building2, CreditCard, Send, ShieldCheck, RefreshCw
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import paymentService from '../../services/paymentService';
import { useToast } from '../../context/ToastContext';

interface FinancialSummary {
  total_earnings_inr: number;
  available_balance_inr: number;
  pending_balance_inr: number;
  paid_out_inr: number;
  payout_requested_inr: number;
  paid_registrations_count: number;
}

interface EarningRecord {
  id: string;
  created_at: string;
  gross_amount_paise: number;
  razorpay_fee_paise: number;
  platform_commission_percent: number;
  platform_commission_paise: number;
  creator_amount_paise: number;
  status: 'PENDING' | 'AVAILABLE' | 'PAYOUT_REQUESTED' | 'PAID' | 'REVERSED';
  tests?: { title: string };
  metadata?: any;
}

interface PayoutRecord {
  id: string;
  requested_at: string;
  amount_paise: number;
  payout_method: string;
  status: 'REQUESTED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  payout_details?: any;
}

export const CreatorEarningsView: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary>({
    total_earnings_inr: 0,
    available_balance_inr: 0,
    pending_balance_inr: 0,
    paid_out_inr: 0,
    payout_requested_inr: 0,
    paid_registrations_count: 0
  });

  const [earningsHistory, setEarningsHistory] = useState<EarningRecord[]>([]);
  const [payoutsHistory, setPayoutsHistory] = useState<PayoutRecord[]>([]);
  const [payoutDetails, setPayoutDetails] = useState<any>(null);

  // Modals & Payout Form State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [payoutAmountInput, setPayoutAmountInput] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Payout Account Form State
  const [accHolderName, setAccHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [payoutType, setPayoutType] = useState<'bank_transfer' | 'upi'>('bank_transfer');
  const [savingAccount, setSavingAccount] = useState(false);

  const fetchAllFinancialData = async () => {
    setLoading(true);
    try {
      const [sumRes, earnRes, payRes, detRes] = await Promise.all([
        paymentService.getCreatorFinancialSummary(),
        paymentService.getCreatorEarningsHistory(),
        paymentService.getCreatorPayouts(),
        paymentService.getPayoutDetails()
      ]);

      if (sumRes.data) setSummary(sumRes.data);
      if (earnRes.data) setEarningsHistory(earnRes.data);
      if (payRes.data) setPayoutsHistory(payRes.data);
      if (detRes.data) {
        setPayoutDetails(detRes.data);
        setAccHolderName(detRes.data.account_holder_name || '');
        setBankName(detRes.data.bank_name || '');
        setIfscCode(detRes.data.ifsc_code || '');
        setPayoutType(detRes.data.payout_type || 'bank_transfer');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load financial data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFinancialData();
  }, []);

  const handleSavePayoutAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accHolderName.trim()) {
      showToast('Account holder name is required.', 'error');
      return;
    }

    setSavingAccount(true);
    try {
      const res = await paymentService.savePayoutDetails({
        account_holder_name: accHolderName,
        bank_name: bankName,
        account_number: accNumber,
        ifsc_code: ifscCode,
        upi_id: upiId,
        payout_type: payoutType
      });

      if (res.error) throw res.error;

      showToast('Payout details saved securely!', 'success');
      setPayoutDetails(res.data);
      setIsAccountModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save payout details.', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleRequestPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountInr = Number(payoutAmountInput);

    if (!amountInr || amountInr <= 0) {
      showToast('Please enter a valid payout amount.', 'error');
      return;
    }

    if (amountInr < 500) {
      showToast('Minimum payout threshold is ₹500.', 'error');
      return;
    }

    if (amountInr > summary.available_balance_inr) {
      showToast(`Requested amount (₹${amountInr}) exceeds available balance (₹${summary.available_balance_inr}).`, 'error');
      return;
    }

    if (!payoutDetails) {
      showToast('Please configure your payout bank or UPI details first.', 'error');
      setIsAccountModalOpen(true);
      return;
    }

    setSubmittingPayout(true);
    try {
      const res = await paymentService.requestPayout(amountInr, payoutType);
      if (res.error) throw res.error;

      showToast('Payout request submitted successfully!', 'success');
      setIsPayoutModalOpen(false);
      setPayoutAmountInput('');
      fetchAllFinancialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to request payout.', 'error');
    } finally {
      setSubmittingPayout(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wallet className="text-lilac-600" size={28} />
            <span>Earnings & Payout Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Authoritative breakdown of student entry fees, platform commission (20%), and withdrawal management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <Building2 size={16} className="text-slate-500" />
            <span>{payoutDetails ? 'Payout Account Settings' : 'Configure Bank / UPI'}</span>
          </button>

          <button
            onClick={() => {
              if (summary.available_balance_inr < 500) {
                showToast('Minimum payout threshold is ₹500.', 'error');
              } else {
                setPayoutAmountInput(String(summary.available_balance_inr));
                setIsPayoutModalOpen(true);
              }
            }}
            disabled={summary.available_balance_inr < 500}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer ${
              summary.available_balance_inr >= 500
                ? 'bg-gradient-to-r from-lilac-600 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5'
                : 'bg-slate-300 opacity-60 cursor-not-allowed'
            }`}
          >
            <Send size={15} />
            <span>Request Payout</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earnings */}
        <GlassCard className="p-5 flex flex-col justify-between border-slate-100/60 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Earnings</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{summary.total_earnings_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              From {summary.paid_registrations_count} paid test registration{summary.paid_registrations_count === 1 ? '' : 's'}
            </p>
          </div>
        </GlassCard>

        {/* Available Balance */}
        <GlassCard className="p-5 flex flex-col justify-between border-slate-100/60 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-100">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Available Balance</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-900 tracking-tight">
              ₹{summary.available_balance_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-emerald-600 mt-1 font-bold flex items-center gap-1">
              <span>Ready for payout</span>
              <span>(Min ₹500)</span>
            </p>
          </div>
        </GlassCard>

        {/* Pending Balance */}
        <GlassCard className="p-5 flex flex-col justify-between border-slate-100/60 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Pending Settlement</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{summary.pending_balance_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Awaiting Razorpay settlement cycle</p>
          </div>
        </GlassCard>

        {/* Paid Out */}
        <GlassCard className="p-5 flex flex-col justify-between border-slate-100/60 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Paid Out</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{summary.paid_out_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Total transferred to bank/UPI</p>
          </div>
        </GlassCard>
      </div>

      {/* Payout Account Summary Banner */}
      <GlassCard className="p-5 border-slate-100/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-lilac-100 text-lilac-700 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">
              {payoutDetails ? 'Payout Account Configured' : 'No Payout Account Configured'}
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {payoutDetails ? (
                <>
                  Method: <span className="font-bold text-slate-700 uppercase">{payoutDetails.payout_type}</span> • Account Holder: <span className="font-bold text-slate-700">{payoutDetails.account_holder_name}</span> {payoutDetails.account_number_masked && `• Acc: ${payoutDetails.account_number_masked}`} {payoutDetails.upi_id_masked && `• UPI: ${payoutDetails.upi_id_masked}`}
                </>
              ) : (
                'Add your bank account or UPI ID to enable seamless automated withdrawals.'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAccountModalOpen(true)}
          className="px-4 py-2 text-xs font-bold text-lilac-700 bg-white border border-lilac-200 rounded-xl hover:bg-lilac-50 transition-all cursor-pointer shrink-0"
        >
          {payoutDetails ? 'Edit Payout Account' : 'Setup Account'}
        </button>
      </GlassCard>

      {/* Earnings History Table */}
      <GlassCard className="p-6 border-slate-100/60 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">Earnings History</h3>
            <p className="text-xs text-slate-400 font-medium">Detailed financial breakdown for each paid student registration.</p>
          </div>
          <button
            onClick={fetchAllFinancialData}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Assessment / Competition</th>
                <th className="py-3 px-3 text-right">Student Payment</th>
                <th className="py-3 px-3 text-right">Razorpay Fee</th>
                <th className="py-3 px-3 text-right">Testora Fee (20%)</th>
                <th className="py-3 px-3 text-right">Creator Earning</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {earningsHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                    No paid transactions recorded yet.
                  </td>
                </tr>
              ) : (
                earningsHistory.map((item) => {
                  const grossInr = item.gross_amount_paise / 100;
                  const razorpayFeeInr = item.razorpay_fee_paise / 100;
                  const testoraFeeInr = item.platform_commission_paise / 100;
                  const creatorEarningInr = item.creator_amount_paise / 100;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-800">
                        {item.tests?.title || 'Paid Test Assessment'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-slate-900">
                        ₹{grossInr.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-400">
                        ₹{razorpayFeeInr.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-600 font-semibold">
                        ₹{testoraFeeInr.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-emerald-700">
                        ₹{creatorEarningInr.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                          item.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700'
                            : item.status === 'PAYOUT_REQUESTED'
                            ? 'bg-blue-100 text-blue-700'
                            : item.status === 'PAID'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Payout Request History */}
      <GlassCard className="p-6 border-slate-100/60 flex flex-col gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">Payout Requests History</h3>
          <p className="text-xs text-slate-400 font-medium">History of creator withdrawal requests and settlement processing.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Requested Date</th>
                <th className="py-3 px-3">Payout Method</th>
                <th className="py-3 px-3 text-right">Requested Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {payoutsHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold">
                    No payout requests submitted yet.
                  </td>
                </tr>
              ) : (
                payoutsHistory.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(pay.requested_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-800 uppercase">
                      {pay.payout_method}
                    </td>
                    <td className="py-3.5 px-3 text-right font-extrabold text-slate-900">
                      ₹{(pay.amount_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                        pay.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : pay.status === 'REQUESTED' || pay.status === 'PROCESSING'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Payout Request Modal */}
      <AnimatePresence>
        {isPayoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Send className="text-lilac-600" size={22} />
                <span>Submit Payout Request</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Available balance for withdrawal: <strong className="text-emerald-700 font-extrabold">₹{summary.available_balance_inr}</strong>
              </p>

              <form onSubmit={handleRequestPayoutSubmit} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Payout Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="1"
                      min="500"
                      max={summary.available_balance_inr}
                      value={payoutAmountInput}
                      onChange={(e) => setPayoutAmountInput(e.target.value)}
                      placeholder="500"
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-extrabold text-base focus:ring-2 focus:ring-lilac-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1.5 block">Minimum payout threshold: ₹500</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 font-medium leading-relaxed">
                  Payouts will be transferred to your registered <strong className="text-slate-800 font-bold uppercase">{payoutDetails?.payout_type || 'bank account'}</strong> within 24-48 business hours upon admin settlement review.
                </div>

                <div className="flex items-center justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsPayoutModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayout}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-lilac-600 to-indigo-600 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    {submittingPayout ? 'Submitting...' : 'Confirm Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payout Account Configuration Modal */}
      <AnimatePresence>
        {isAccountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="text-lilac-600" size={22} />
                <span>Configure Payout Account</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Enter your bank details or UPI ID for creator earnings settlements.
              </p>

              <form onSubmit={handleSavePayoutAccount} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Payout Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayoutType('bank_transfer')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        payoutType === 'bank_transfer'
                          ? 'border-lilac-600 bg-lilac-50 text-lilac-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Building2 size={16} />
                      <span>Bank Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutType('upi')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        payoutType === 'upi'
                          ? 'border-lilac-600 bg-lilac-50 text-lilac-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard size={16} />
                      <span>UPI ID</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Account Holder Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={accHolderName}
                    onChange={(e) => setAccHolderName(e.target.value)}
                    placeholder="As printed on bank passbook"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none"
                  />
                </div>

                {payoutType === 'bank_transfer' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank / ICICI Bank"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Account Number
                      </label>
                      <input
                        type="password"
                        value={accNumber}
                        onChange={(e) => setAccNumber(e.target.value)}
                        placeholder="•••• •••• •••• 1234"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Account number will be masked in the system.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="HDFC0001234"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none tracking-widest"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@okaxis"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAccount}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-lilac-600 to-indigo-600 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    {savingAccount ? 'Saving...' : 'Save Account Details'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreatorEarningsView;
