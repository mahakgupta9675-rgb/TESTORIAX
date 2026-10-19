import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Award, Trophy, Target, Clock, Sparkles, 
  Share2, ShieldAlert, ShieldCheck, 
  TrendingUp, Loader2
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import performanceService from '../../services/performanceService';
import analyticsService from '../../services/analyticsService';

export const AnalyticsView: React.FC = () => {
  const { user, profile } = useAuth();
  const [showShareToast, setShowShareToast] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [summary, setSummary] = useState<any>(null);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [topicPerf, setTopicPerf] = useState<{ weakTopics: any[]; strongTopics: any[] }>({ weakTopics: [], strongTopics: [] });

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [sumRes, radarRes, topicRes] = await Promise.all([
          performanceService.getPerformanceSummary(user.id),
          analyticsService.getSubjectAccuracy(user.id),
          analyticsService.getTopicPerformance(user.id)
        ]);

        if (sumRes.data) setSummary(sumRes.data);
        if (radarRes.data) setRadarData(radarRes.data);
        if (topicRes.data) setTopicPerf(topicRes.data);
      } catch (err) {
        console.error('Failed to load user analytics view', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user]);

  const triggerShare = () => {
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-lilac-600" />
      </div>
    );
  }

  const userFullName = profile?.full_name || user?.email?.split('@')[0] || 'Candidate';

  const pieData = summary ? [
    { name: 'Correct', value: Math.round((summary.avgAccuracy / 100) * 100), color: '#ff70a6' },
    { name: 'Incorrect/Missed', value: Math.max(0, 100 - Math.round((summary.avgAccuracy / 100) * 100)), color: '#f43f5e' }
  ] : [];

  const formatSecToMins = (mins: number) => {
    if (!mins || mins <= 0) return 'N/A';
    return `${mins}m`;
  };

  return (
    <div className="w-full relative select-none">
      
      {/* Toast popup */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-55 px-4.5 py-2.5 bg-slate-900/95 backdrop-blur-md text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Analytics share link copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="border-b border-slate-100 pb-5.5 mb-6">
        <h2 className="font-display font-black text-xl text-slate-800 tracking-tight flex items-center gap-2">
          <TrendingUp className="text-lilac-600" size={24} />
          <span>TEST RESULTS & PERFORMANCE ANALYTICS</span>
        </h2>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Detailed cognitive breakdown, topic coverage insights, and verified performance credentials.
        </p>
      </div>

      {/* 1. RESULTS METRICS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-8">
        {[
          { label: 'Completed Tests', value: `${summary?.totalCompleted || 0}`, sub: `Out of ${summary?.totalAttempts || 0} attempts`, icon: <Trophy size={16} className="text-yellow-500" /> },
          { label: 'Average Score', value: `${summary?.avgScore || 0}%`, sub: 'Overall percentage', icon: <Award size={16} className="text-indigo-500" /> },
          { label: 'Accuracy', value: `${summary?.avgAccuracy || 0}%`, sub: 'Question accuracy', icon: <Target size={16} className="text-pink-500" /> },
          { label: 'Avg Pacing', value: formatSecToMins(summary?.avgCompletionTimeMins), sub: 'Time per test', icon: <Clock size={16} className="text-emerald-500" /> },
          { label: 'Certificates', value: `${summary?.certificates || 0}`, sub: 'Earned credentials', icon: <Sparkles size={16} className="text-purple-500" /> }
        ].map((stat, idx) => (
          <GlassCard key={idx} className="border-slate-100/50 p-4.5 flex flex-col justify-between hover:border-lilac-200/50" hoverEffect={true}>
            <div className="flex justify-between items-start gap-2">
              <span className="text-[9px] font-bold text-slate-440 uppercase tracking-wider line-clamp-1">{stat.label}</span>
              <div className="w-7 h-7 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-base font-black text-slate-850 block leading-tight">{stat.value}</span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">{stat.sub}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* 2. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
        
        {/* Correct vs Incorrect Donut (6/12 grid cols) */}
        <div className="lg:col-span-6 flex">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Target size={15} className="text-lilac-600" />
              <span>Overall Accuracy Breakdown</span>
            </h4>
            
            {summary && summary.totalCompleted > 0 ? (
              <div className="flex-grow flex items-center justify-center h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '10px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-800">{summary.avgAccuracy}%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Accuracy</span>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                Not enough data yet. Complete an assessment to see your chart.
              </div>
            )}
          </GlassCard>
        </div>

        {/* Topic Competency Radar (6/12 grid cols) */}
        <div className="lg:col-span-6 flex">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Award size={15} className="text-lilac-600" />
              <span>Topic Competency Profile</span>
            </h4>
            
            {radarData.length > 0 ? (
              <div className="flex-grow flex items-center justify-center h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 7 }} />
                    <Radar name="Candidate" dataKey="Skill" stroke="#ff70a6" fill="#ff70a6" fillOpacity={0.25} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '10px', color: '#fff' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                Not enough topic data yet.
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* 3. AI COGNITIVE INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-8">
        <div className="lg:col-span-12 flex">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5.5 flex items-center gap-1.5">
              <Sparkles size={15} className="text-lilac-600" />
              <span>Topic Strength & Growth Areas</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-grow">
              {/* Strong Topics */}
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Mastered Topics</span>
                </div>
                <div className="flex flex-col gap-2 text-[11px]">
                  {topicPerf.strongTopics.length > 0 ? (
                    topicPerf.strongTopics.map((t, i) => (
                      <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100">
                        <span className="font-bold text-slate-800">{t.topic}</span>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{t.confidence}%</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs italic">Take assessments to establish strong topics.</span>
                  )}
                </div>
              </div>

              {/* Weak Topics */}
              <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-rose-500/10 pb-2">
                  <ShieldAlert size={14} className="text-rose-500" />
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Focus Improvements</span>
                </div>
                <div className="flex flex-col gap-2 text-[11px]">
                  {topicPerf.weakTopics.length > 0 ? (
                    topicPerf.weakTopics.map((t, i) => (
                      <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-rose-100">
                        <span className="font-bold text-slate-800">{t.topic}</span>
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">{t.confidence}%</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs italic">No weak topics detected. Great job!</span>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 4. VERIFIED CERTIFICATE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-12 flex">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col justify-between w-full h-full relative" hoverEffect={false}>
            <div>
              <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Award size={15} className="text-lilac-600" />
                <span>Candidate Performance Credential</span>
              </h4>

              <div className="relative border-4 border-double border-amber-500/40 bg-white p-5 rounded-2xl text-center shadow-inner overflow-hidden select-none mb-4">
                <div className="absolute inset-2 border border-slate-100 rounded-lg pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center">
                  <span className="font-display font-black text-[9px] tracking-widest text-[#401567] uppercase block">
                    Testoriax Verified Performance Credential
                  </span>
                  
                  <h3 className="font-serif italic text-base text-slate-800 mt-3.5">
                    This is proudly presented to
                  </h3>
                  
                  <span className="font-display font-black text-base text-slate-900 border-b border-slate-200 px-6 py-0.5 block mt-2">
                    {userFullName}
                  </span>

                  <p className="text-[9px] text-slate-450 font-medium leading-relaxed max-w-sm mt-3.5 mx-auto">
                    for completing assessment evaluations on Testoriax with an overall average accuracy of <span className="font-extrabold text-slate-700">{summary?.avgAccuracy || 0}%</span>.
                  </p>

                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={triggerShare}
                className="py-2.5 px-4 border border-slate-150 hover:border-slate-250 bg-white text-slate-600 font-display font-black text-[10px] uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-97"
              >
                <Share2 size={12} />
                <span>Share Analytics</span>
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsView;
