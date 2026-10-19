import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import GlassCard from '../../ui/GlassCard';
import { testsService, type TestData } from '../../../services/testsService';
import { useAuth } from '../../../context/AuthContext';
import { EligibilityCheck } from './EligibilityCheck';
import { SystemCheck } from './SystemCheck';
import { SecurityVerification } from './SecurityVerification';
import { ExamInstructions } from './ExamInstructions';
import { useSearchParams } from 'react-router-dom';

interface ExamEntryViewProps {
  onNavigate: (view: any, param?: string) => void;
  testId: string | null;
}

export const ExamEntryView: React.FC<ExamEntryViewProps> = ({ onNavigate, testId }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const competitionId = searchParams.get('competitionId');
  
  const [testDetail, setTestDetail] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [stepStates, setStepStates] = useState({
    eligibility: false,
    system: false,
    security: false,
    instructions: false
  });

  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (testId) {
      testsService.getTestById(testId).then(({ data, error }) => {
        if (data && !error) {
          setTestDetail(data);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [testId]);

  const handleStartExam = async () => {
    if (!testDetail || !user || !testId) return;
    setIsStarting(true);
    
    try {
      const { error } = await testsService.createExamAttempt(testId, user.id, competitionId);
      if (error) throw error;
      
      // Navigate to examination with attempt info or let examination fetch it
      const param = competitionId ? `${testId}?competitionId=${competitionId}` : testId;
      onNavigate('examination', param);
    } catch (error) {
      console.error('Error starting exam attempt:', error);
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffafb] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!testDetail) {
    return (
      <div className="min-h-screen bg-[#fffafb] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Test Not Found</h2>
        <p className="text-slate-500 mb-6">We couldn't locate the test you're trying to enter.</p>
        <button onClick={() => onNavigate('dashboard')} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold">Go to Dashboard</button>
      </div>
    );
  }

  const steps = [
    { id: 1, title: 'Eligibility' },
    { id: 2, title: 'System Check' },
    { id: 3, title: 'Security' },
    { id: 4, title: 'Instructions' }
  ];

  const canProceed = () => {
    if (currentStep === 1) return stepStates.eligibility;
    if (currentStep === 2) return stepStates.system;
    if (currentStep === 3) return stepStates.security;
    if (currentStep === 4) return stepStates.instructions;
    return false;
  };

  const nextStep = () => {
    if (canProceed() && currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffafb] pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        <button
          onClick={() => onNavigate('test-details', testId!)}
          className="self-start px-4 py-2 bg-white hover:bg-slate-50 border border-slate-150 rounded-2xl text-xs font-bold text-slate-600 flex items-center gap-2 shadow-sm transition-all"
        >
          <ArrowLeft size={14} /> Back to Test Details
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Test Summary */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <GlassCard className="p-6">
              <div className={`h-32 rounded-xl mb-6 bg-gradient-to-r ${testDetail.mock_thumbnail || 'from-purple-500 to-indigo-500'} p-5 flex flex-col justify-end text-white shadow-inner relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
                <span className="relative z-10 text-[10px] font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded w-max uppercase mb-2">
                  {competitionId ? 'Competition' : 'Practice'}
                </span>
                <h2 className="relative z-10 font-extrabold text-lg leading-tight line-clamp-2">{testDetail.title}</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Clock size={18} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                    <p className="font-extrabold text-slate-800">{testDetail.duration} Minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center"><BookOpen size={18} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Questions</p>
                    <p className="font-extrabold text-slate-800">{testDetail.questions?.length || 0} Questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Award size={18} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Marks</p>
                    <p className="font-extrabold text-slate-800">{testDetail.total_marks || 0} Marks</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Workflow Wizard */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Stepper Header */}
            <GlassCard className="p-4 overflow-x-auto">
              <div className="flex items-center justify-between min-w-[400px]">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-3 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors
                      ${currentStep > step.id ? 'bg-emerald-500 text-white' : 
                        currentStep === step.id ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {currentStep > step.id ? <CheckCircle2 size={16} /> : step.id}
                    </div>
                    <span className={`text-xs font-bold ${currentStep >= step.id ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.title}
                    </span>
                    {idx < steps.length - 1 && (
                      <div className={`w-8 md:w-16 h-0.5 ml-3 transition-colors ${currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Step Content */}
            <GlassCard className="p-6 md:p-8 min-h-[400px] flex flex-col justify-between">
              <div className="mb-8">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <EligibilityCheck 
                        testDetail={testDetail} 
                        competitionId={competitionId} 
                        onComplete={(p) => setStepStates(s => ({ ...s, eligibility: p }))} 
                      />
                    </motion.div>
                  )}
                  {currentStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <SystemCheck 
                        onComplete={(p) => setStepStates(s => ({ ...s, system: p }))} 
                      />
                    </motion.div>
                  )}
                  {currentStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <SecurityVerification 
                        settings={testDetail.security_settings || {}} 
                        onComplete={(p) => setStepStates(s => ({ ...s, security: p }))} 
                      />
                    </motion.div>
                  )}
                  {currentStep === 4 && (
                    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <ExamInstructions 
                        testDetail={testDetail} 
                        onAccept={(p) => setStepStates(s => ({ ...s, instructions: p }))} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Bar */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                {currentStep < 4 ? (
                  <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${
                      canProceed() 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 active:scale-95' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleStartExam}
                    disabled={!canProceed() || isStarting}
                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${
                      canProceed() && !isStarting
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isStarting ? 'Starting Exam...' : 'Start Exam Now'}
                  </button>
                )}
              </div>
            </GlassCard>

          </div>
        </div>
      </div>
    </div>
  );
};
