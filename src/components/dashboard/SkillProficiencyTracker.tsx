import React from 'react';
import { Trophy, Sparkles, Award, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SkillItem {
  area: string;
  level: string;
  progress: number;
  barColor: string;
}

export const SkillProficiencyTracker: React.FC = () => {
  const skills: SkillItem[] = [
    { area: 'Algorithms & Coding Logic', level: '92%', progress: 92, barColor: 'bg-gradient-to-r from-pink-500 to-rose-500' },
    { area: 'Quantitative Reasoning', level: '85%', progress: 85, barColor: 'bg-gradient-to-r from-indigo-500 to-pink-500' },
    { area: 'Verbal Aptitude', level: '76%', progress: 76, barColor: 'bg-gradient-to-r from-violet-500 to-indigo-500' },
    { area: 'System Architecture Patterns', level: '64%', progress: 64, barColor: 'bg-gradient-to-r from-rose-500 to-violet-500' },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 flex flex-col justify-between w-full h-full shadow-sm">
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
              <Trophy size={16} className="text-amber-500" />
              <span>Performance Insights</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Skill breakdowns and accuracy highlights.
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-pink-50 text-[11px] font-bold text-pink-600 border border-pink-100 flex items-center gap-1">
            <TrendingUp size={12} />
            <span>84.2% Overall</span>
          </span>
        </div>

        {/* Featured Circular Progress Score Ring & Skill Highlights */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 mb-4 flex items-center gap-4">
          {/* SVG Score Ring */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-pink-500 stroke-current"
                strokeWidth="3.5"
                strokeDasharray="84.2, 100"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-slate-900">84.2%</span>
          </div>

          {/* Strongest vs Needs Attention Callouts */}
          <div className="flex flex-col gap-1.5 min-w-0 flex-1 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold truncate">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span className="text-slate-400 font-medium">Strongest:</span>
              <span className="truncate">Algorithms</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 font-bold truncate">
              <AlertCircle size={13} className="text-amber-500 shrink-0" />
              <span className="text-slate-400 font-medium">Needs Work:</span>
              <span className="truncate">System Architecture</span>
            </div>
          </div>
        </div>

        {/* Skill Progress Bars */}
        <div className="flex flex-col gap-3.5">
          {skills.map((skill, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>{skill.area}</span>
                <span className="text-slate-900 font-extrabold">{skill.level}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full ${skill.barColor} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${skill.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certification Opportunity Banner */}
      <div className="bg-gradient-to-r from-pink-50/80 via-rose-50/50 to-indigo-50/80 border border-pink-100 rounded-2xl p-3.5 flex items-center gap-3 mt-5 relative overflow-hidden">
        <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-pink-500/20">
          <Award size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
            <span>Ready for Certification</span>
            <Sparkles size={11} className="text-pink-500 animate-pulse" />
          </p>
          <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
            You qualify for the "Senior Algorithm Engineer" verification assessment!
          </p>
        </div>
      </div>
    </div>
  );
};

export default SkillProficiencyTracker;
