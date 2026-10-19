import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Sliders, Layers, Eye, Rocket, BrainCircuit, Edit3 } from 'lucide-react';

interface StepProgressJourneyProps {
  currentStep: number;
  method: 'ai' | 'manual' | null;
  visibility: 'private' | 'public';
  onStepClick?: (stepNum: number) => void;
}

export const StepProgressJourney: React.FC<StepProgressJourneyProps> = ({
  currentStep,
  method,
  visibility,
  onStepClick,
}) => {
  const steps = [
    { num: 1, label: 'Method', icon: Sparkles },
    { num: 2, label: 'Details', icon: Sliders },
    { num: 3, label: method === 'ai' ? 'AI Generator' : 'Manual Builder', icon: method === 'ai' ? BrainCircuit : Edit3 },
    { num: 4, label: 'Visibility', icon: Eye },
    { num: 5, label: visibility === 'private' ? 'Finish' : 'Publish', icon: Rocket },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 my-4 relative z-20">
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
        
        {/* Step indicator header line */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Layers size={13} className="text-pink-500" />
            <span>Creation Journey</span>
          </span>
          <span className="text-xs font-bold text-slate-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">
            Step <strong className="text-pink-600 font-extrabold">{currentStep}</strong> of {steps.length}
          </span>
        </div>

        {/* Stepper horizontal line & nodes */}
        <div className="relative flex items-center justify-between">
          
          {/* Background Connector Bar */}
          <div className="absolute top-5 left-6 right-6 h-1 bg-slate-100 rounded-full z-0 pointer-events-none" />
          
          {/* Animated Active Progress Fill Bar */}
          <motion.div
            className="absolute top-5 left-6 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 rounded-full z-0 pointer-events-none"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />

          {/* Step Nodes */}
          {steps.map((step) => {
            const isCompleted = currentStep > step.num;
            const isActive = currentStep === step.num;
            const Icon = step.icon;

            return (
              <div key={step.num} className="flex flex-col items-center gap-2 relative z-10">
                <button
                  onClick={() => isCompleted && onStepClick && onStepClick(step.num)}
                  disabled={!isCompleted}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all relative ${
                    isCompleted
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20 cursor-pointer hover:scale-105'
                      : isActive
                      ? 'bg-slate-900 text-white shadow-lg scale-110 ring-4 ring-pink-200/60'
                      : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={16} className="stroke-[3]" />
                  ) : (
                    <Icon size={16} className={isActive ? 'text-pink-300' : 'text-slate-400'} />
                  )}

                  {/* Active Step Glow Ring */}
                  {isActive && (
                    <motion.div
                      layoutId="activeStepGlow"
                      className="absolute -inset-1 rounded-2xl bg-pink-500/20 blur-md pointer-events-none"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </button>

                {/* Step Labels */}
                <div className="flex flex-col items-center">
                  <span className={`text-[10px] font-bold tracking-wider uppercase ${
                    isActive ? 'text-pink-600 font-extrabold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    0{step.num}
                  </span>
                  <span className={`text-xs font-bold truncate max-w-[80px] text-center ${
                    isActive ? 'text-slate-900 font-extrabold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
};

export default StepProgressJourney;
