import React from 'react';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import type { AppView } from '../../App';

interface MotivationInsightCardProps {
  onNavigate: (view: AppView, param?: string) => void;
}

export const MotivationInsightCard: React.FC<MotivationInsightCardProps> = ({ onNavigate }) => {
  return (
    <div className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/3 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center gap-4 text-left">
        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
          <Zap size={24} className="text-amber-300 animate-pulse" />
        </div>
        <div>
          <h4 className="font-display font-black text-lg text-white flex items-center gap-1.5">
            <span>Ready for your next challenge?</span>
            <Sparkles size={16} className="text-pink-200" />
          </h4>
          <p className="text-xs text-pink-100 font-medium mt-0.5">
            Build AI-powered assessments or jump straight into practice modules.
          </p>
        </div>
      </div>

      <div className="relative z-10 shrink-0 w-full sm:w-auto">
        <button
          onClick={() => onNavigate('create-test')}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-xs shadow-md hover:bg-pink-50 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <span>Create Assessment</span>
          <ArrowRight size={14} className="text-pink-600" />
        </button>
      </div>
    </div>
  );
};

export default MotivationInsightCard;
