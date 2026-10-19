import React from 'react';
import { CheckCircle2, Trophy, FilePlus2, Award, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActivityItem {
  id: number;
  type: 'quiz' | 'lobby' | 'create' | 'cert';
  text: string;
  meta: string;
  time: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  isNewest?: boolean;
}

export const RecentActivity: React.FC = () => {
  const navigate = useNavigate();

  const activities: ActivityItem[] = [
    {
      id: 1,
      type: 'quiz',
      text: 'Passed assessment: TypeScript Core Concepts',
      meta: 'Score: 94.2% · Passed with honors',
      time: '15 min ago',
      icon: <CheckCircle2 size={16} />,
      iconBg: 'bg-emerald-50 border-emerald-200',
      iconColor: 'text-emerald-600',
      isNewest: true,
    },
    {
      id: 2,
      type: 'lobby',
      text: 'Participated in Live Quiz: Algorithmic Sprint v4',
      meta: 'Rank: 2nd Place out of 480 competitors',
      time: '2 hours ago',
      icon: <Trophy size={16} />,
      iconBg: 'bg-amber-50 border-amber-200',
      iconColor: 'text-amber-600'
    },
    {
      id: 3,
      type: 'create',
      text: 'Created new exam: Biology Mid-term Quiz 2',
      meta: 'AI assisted questions: 35 · Est. time: 60m',
      time: '1 day ago',
      icon: <FilePlus2 size={16} />,
      iconBg: 'bg-indigo-50 border-indigo-200',
      iconColor: 'text-indigo-600'
    },
    {
      id: 4,
      type: 'cert',
      text: 'Earned skill verification: Advanced React Architect',
      meta: 'Credential token verified online',
      time: '2 days ago',
      icon: <Award size={16} />,
      iconBg: 'bg-pink-50 border-pink-200',
      iconColor: 'text-pink-600'
    }
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 flex flex-col justify-between w-full h-full shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-base tracking-tight">
            Recent Activity Feed
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Real-time history of completed tests & achievements.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/my-results')}
          className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 transition-colors cursor-pointer group"
        >
          <span>View all</span>
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Activity Timeline */}
      <div className="flex-1 flex flex-col gap-4 relative py-1">
        {/* Vertical line connecting events */}
        <div className="absolute top-4 bottom-4 left-5 w-0.5 bg-slate-100 pointer-events-none" />

        {activities.map((act) => (
          <div
            key={act.id}
            className={`relative z-10 flex items-start gap-3.5 p-3 rounded-2xl transition-all ${
              act.isNewest
                ? 'bg-slate-50/80 border border-slate-100 shadow-2xs'
                : 'hover:bg-slate-50/50'
            }`}
          >
            {/* Icon Container */}
            <div className={`w-10 h-10 rounded-xl ${act.iconBg} ${act.iconColor} flex items-center justify-center shrink-0 border shadow-2xs`}>
              {act.icon}
            </div>
            
            {/* Content Details */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-xs sm:text-sm text-slate-900 font-bold leading-snug truncate">
                    {act.text}
                  </p>
                  {act.isNewest && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-extrabold text-emerald-600 uppercase">
                      New
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 shrink-0 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                  <Clock size={11} className="text-slate-400" />
                  <span>{act.time}</span>
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                {act.meta}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
