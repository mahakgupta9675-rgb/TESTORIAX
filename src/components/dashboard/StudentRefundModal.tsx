import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import supabase from '../../lib/supabaseClient';
import paymentService from '../../services/paymentService';

interface StudentRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentRefundModal: React.FC<StudentRefundModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paidPayments, setPaidPayments] = useState<any[]>([]);
  const [myRefundRequests, setMyRefundRequests] = useState<any[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [reason, setReason] = useState<string>('cancellation');
  const [explanation, setExplanation] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user's captured payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*, tests(title)')
        .eq('user_id', user.id)
        .eq('status', 'captured')
        .order('captured_at', { ascending: false });

      // 2. Fetch existing refund requests
      const reqRes = await paymentService.fetchStudentRefundRequests();

      setPaidPayments(payments || []);
      setMyRefundRequests(reqRes.data || []);
      if (payments && payments.length > 0) {
        setSelectedPaymentId(payments[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load student refund data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentId) return;

    try {
      setSubmitting(true);
      const res = await paymentService.requestRefund({
        payment_id: selectedPaymentId,
        reason,
        explanation
      });

      if (res.error) {
        setToast({ message: res.error.message || 'Failed to request refund', type: 'error' });
      } else {
        setToast({ message: res.data?.message || 'Refund request submitted!', type: 'success' });
        setExplanation('');
        loadData();
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error submitting refund', type: 'error' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white border border-slate-100 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-xl transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
            <RotateCcw size={22} />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-slate-900 tracking-tight">
              Request a Payment Refund
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Submit a refund claim for paid test registrations or view your request history.
            </p>
          </div>
        </div>

        {toast && (
          <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{toast.message}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="animate-spin text-purple-600" size={28} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Request Form */}
            {paidPayments.length > 0 ? (
              <form onSubmit={handleSubmitRefund} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-4">
                <h4 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                  Submit New Refund Claim
                </h4>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Select Paid Test</label>
                  <select
                    value={selectedPaymentId}
                    onChange={(e) => setSelectedPaymentId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                  >
                    {paidPayments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.tests?.title || 'Paid Test'} — ₹{p.amount} ({new Date(p.captured_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Reason for Refund</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                  >
                    <option value="cancellation">Test Cancelled by Host</option>
                    <option value="technical_issue">Technical Issue During Exam</option>
                    <option value="duplicate_payment">Accidental Duplicate Payment</option>
                    <option value="other">Other / General Dispute</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Explanation & Details (Optional)</label>
                  <textarea
                    rows={3}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Provide details for your refund claim..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedPaymentId}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  <span>Submit Refund Request</span>
                </button>
              </form>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-xs text-slate-500 font-medium">
                No eligible captured payments found for refund requests.
              </div>
            )}

            {/* Existing Requests History */}
            <div>
              <h4 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-3">
                Your Refund Claims History
              </h4>

              {myRefundRequests.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium italic">No past refund requests found.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {myRefundRequests.map((r) => (
                    <div key={r.id} className="p-3.5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs block">{r.tests?.title || 'Assessment'}</span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          Submitted: {new Date(r.created_at).toLocaleDateString()} • Reason: {r.reason}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">₹{r.amount_inr}</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mt-0.5 ${
                          r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                          r.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentRefundModal;
