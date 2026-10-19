import React from 'react';
import { ArrowLeft, Sparkles, Save, Loader2, ShieldCheck } from 'lucide-react';

interface CreationStudioHeaderProps {
  onCancel: () => void;
  onSaveDraft: () => void;
  isDbLoading: boolean;
  canSaveDraft: boolean;
  testTitle?: string;
}

export const CreationStudioHeader: React.FC<CreationStudioHeaderProps> = ({
  onCancel,
  onSaveDraft,
  isDbLoading,
  canSaveDraft,
  testTitle,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between shadow-2xs">
      
      {/* Left: Brand & Cancel */}
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Exit Studio</span>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center font-black shadow-md shadow-pink-500/20">
            <Sparkles size={16} />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Test Creation Studio</span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 border border-pink-100 text-[10px] font-bold text-pink-600 uppercase">
                <ShieldCheck size={10} /> Pro
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] sm:max-w-[300px]">
              {testTitle || 'Configure & publish your assessment'}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Autosave status & Save Draft Action */}
      <div className="flex items-center gap-3">
        <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Autosave active</span>
        </span>

        <button
          onClick={onSaveDraft}
          disabled={!canSaveDraft || isDbLoading}
          className="px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          {isDbLoading ? <Loader2 className="animate-spin text-pink-300" size={14} /> : <Save size={14} />}
          <span>{isDbLoading ? 'Saving...' : 'Save Draft'}</span>
        </button>
      </div>

    </header>
  );
};

export default CreationStudioHeader;
