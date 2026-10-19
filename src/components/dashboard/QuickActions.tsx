import React, { useState } from 'react';
import { PlusCircle, Users2, BrainCircuit, ArrowDownToLine, X, Sparkles, ArrowRight } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface QuickActionsProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard' | 'builder' | 'create-test', testTitle?: string) => void;
  onTabChange?: (tab: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate, onTabChange }) => {
  const [activeModal, setActiveModal] = useState<'create' | 'join' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [testTitle, setTestTitle] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle.trim()) return;
    setActiveModal(null);
    onNavigate('builder', testTitle);
    setTestTitle('');
  };

  const handleJoinLobby = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyCode.trim()) return;
    setActiveModal(null);
    triggerToast(`Connected to competitive lobby #${lobbyCode}! Entering matchmaking...`);
    setLobbyCode('');
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="font-display font-bold text-base text-slate-900 tracking-tight">
            Quick Actions
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Launch assessments, practice modules, or multiplayer lobbies.
          </p>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4.5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce">
          <Sparkles size={14} className="text-pink-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Asymmetric Quick Actions Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full items-stretch">
        
        {/* FEATURED PRIMARY ACTION (5/12 grid cols): Create Test */}
        <div
          onClick={() => onNavigate('create-test')}
          className="lg:col-span-5 bg-gradient-to-br from-pink-500 via-rose-500 to-indigo-600 text-white rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg shadow-pink-500/15 group relative overflow-hidden"
        >
          {/* Subtle background glow pattern */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <PlusCircle size={22} className="text-white" />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-widest text-white">
                <Sparkles size={11} />
                <span>AI-Powered</span>
              </span>
            </div>

            <h3 className="font-display font-black text-xl text-white mb-1.5">
              Create a New Test
            </h3>
            <p className="text-xs text-pink-100/90 font-medium leading-relaxed max-w-sm">
              Build an assessment in minutes using AI generation or manual block builders.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Launch Builder</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </span>
            <span className="w-7 h-7 rounded-full bg-white text-pink-600 flex items-center justify-center font-bold text-xs shadow-md">
              +
            </span>
          </div>
        </div>

        {/* SECONDARY COMPACT ACTIONS (7/12 grid cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-stretch">
          
          {/* Action 1: Join Lobby */}
          <div
            onClick={() => setActiveModal('join')}
            className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md group"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
                <Users2 size={20} />
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                Join Live Lobby
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Enter code for multiplayer quizzes.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-indigo-600">
              <span>Enter Code</span>
              <ArrowRight size={12} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Action 2: Practice Area */}
          <div
            onClick={() => {
              if (onTabChange) onTabChange('practice');
              else triggerToast('Opening practice workspace...');
            }}
            className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-md group"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
                <BrainCircuit size={20} />
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900 mb-1 group-hover:text-violet-600 transition-colors">
                Practice Area
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Target weak skills & practice modules.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-violet-600">
              <span>Start Practice</span>
              <ArrowRight size={12} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Action 3: Export Report */}
          <div
            onClick={() => triggerToast('Preparing export bundle. PDF report downloaded successfully!')}
            className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-rose-300 hover:shadow-md group"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
                <ArrowDownToLine size={20} />
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900 mb-1 group-hover:text-rose-600 transition-colors">
                Export Report
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Download performance in PDF or CSV.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-rose-600">
              <span>Download PDF</span>
              <ArrowRight size={12} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Create Test */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <GlassCard hoverEffect={false} className="w-full max-w-sm p-7 border-slate-100/80 shadow-2xl relative bg-white rounded-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <X size={16} />
            </button>
            <h4 className="font-display font-extrabold text-base text-slate-900 mb-4">Create New Test</h4>
            
            <form onSubmit={handleCreateTest} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Test Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemistry Core Mid-term"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 outline-none text-xs focus:border-pink-500 focus:ring-2 focus:ring-pink-200/50 transition-all"
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl text-xs shadow-md shadow-pink-500/10 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                Create Draft
              </button>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Modal: Join Lobby */}
      {activeModal === 'join' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <GlassCard hoverEffect={false} className="w-full max-w-sm p-7 border-slate-100/80 shadow-2xl relative bg-white rounded-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <X size={16} />
            </button>
            <h4 className="font-display font-extrabold text-base text-slate-900 mb-4">Join Live Lobby</h4>
            
            <form onSubmit={handleJoinLobby} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">6-Digit Access Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 948291"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 outline-none text-xs text-center font-mono tracking-widest focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/50 transition-all"
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                Connect to Lobby
              </button>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default QuickActions;
