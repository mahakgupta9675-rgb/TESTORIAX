import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { TestData } from '../../../services/testsService';
import paymentService from '../../../services/paymentService';

interface EligibilityCheckProps {
  testDetail: TestData;
  competitionId?: string | null;
  onComplete: (passed: boolean) => void;
}

export const EligibilityCheck: React.FC<EligibilityCheckProps> = ({ testDetail, competitionId, onComplete }) => {

  const [status, setStatus] = useState<'checking' | 'passed' | 'failed'>('checking');
  const [failReason, setFailReason] = useState<string>('');

  useEffect(() => {
    async function verifyEligibility() {
      // 1. Basic published status check
      if (testDetail.status !== 'published') {
        setStatus('failed');
        setFailReason('This exam is not currently active or published.');
        onComplete(false);
        return;
      }

      // 2. Authoritative server payment access check
      if (testDetail.id && testDetail.entry_fee && testDetail.entry_fee > 0) {
        try {
          const accessResult = await paymentService.checkTestAccess(testDetail.id);

          if (!accessResult.access) {
            setStatus('failed');
            setFailReason(accessResult.reason || 'Payment required to take this test. Please complete registration payment.');
            onComplete(false);
            return;
          }
        } catch (err) {
          console.error('Error verifying test payment access:', err);
          setStatus('failed');
          setFailReason('Failed to verify payment status with server.');
          onComplete(false);
          return;
        }
      }

      // 3. Logic for competition timing
      if (competitionId && testDetail.created_at) {
        const dummyStartTime = new Date(Date.now() - 1000).getTime(); 
        const now = Date.now();

        if (now < dummyStartTime) {
          setStatus('failed');
          setFailReason('The competition has not started yet.');
          onComplete(false);
          return;
        }
      }

      // Passed all checks
      setStatus('passed');
      onComplete(true);
    }

    verifyEligibility();
  }, [testDetail, competitionId, onComplete]);


  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <CheckCircle2 className="text-purple-600" />
        Eligibility Check
      </h3>
      
      {status === 'checking' && (
        <div className="flex items-center gap-2 text-slate-500">
          <div className="w-4 h-4 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin" />
          <span>Verifying eligibility...</span>
        </div>
      )}

      {status === 'passed' && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-800">You are eligible to take this exam</p>
            <p className="text-xs text-emerald-600 mt-1">All registration and timing criteria met.</p>
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3">
          <XCircle className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-800">Eligibility Failed</p>
            <p className="text-xs text-rose-600 mt-1">{failReason}</p>
          </div>
        </div>
      )}
    </div>
  );
};
