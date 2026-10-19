import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { 
  Trophy, BookOpen, Sparkles, 
  Target, ChevronRight, Compass,
  Flame, TrendingUp, FileText, BrainCircuit,
  Zap, Medal, Database, Braces, Play, Search, Calendar, CheckCircle2, AlertTriangle, Eye, Loader2, Clock
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import MyResultsView from '../dashboard/MyResultsView';
import { useAuth } from '../../context/AuthContext';

import performanceService from '../../services/performanceService';
import analyticsService from '../../services/analyticsService';
import resultsService from '../../services/resultsService';
import certificateService from '../../services/certificateService';
import recommendationService from '../../services/recommendationService';

interface PerformanceViewProps {
  onNavigate: (view: any, param?: string) => void;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [viewingAttemptId, setViewingAttemptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for all dashboard sections
  const [summaryData, setSummaryData] = useState<any>(null);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [topics, setTopics] = useState({ weakTopics: [], strongTopics: [] });
  const [insights, setInsights] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [, setCertificates] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const [
          summaryRes,
          recentRes,
          trendRes,
          radarRes,
          heatmapRes,
          topicsRes,
          insightsRes,
          leaderboardRes,
          compRes,
          certRes,
          recRes
        ] = await Promise.all([
          performanceService.getPerformanceSummary(user.id),
          resultsService.getRecentResults(user.id),
          analyticsService.getMonthlyTrends(user.id),
          analyticsService.getSubjectAccuracy(user.id),
          analyticsService.getWeeklyStudyHours(user.id),
          analyticsService.getTopicPerformance(user.id),
          performanceService.getAIInsights(user.id),
          resultsService.getLeaderboardSnapshot(user.id),
          resultsService.getUpcomingCompetitions(user.id),
          certificateService.getCertificates(user.id),
          recommendationService.getRecommendedPractice(user.id)
        ]);

        if (summaryRes.data) setSummaryData(summaryRes.data);
        if (recentRes.data) setRecentAttempts(recentRes.data);
        if (trendRes.data) setTrendData(trendRes.data);
        if (radarRes.data) setRadarData(radarRes.data);
        if (heatmapRes.data) setHeatmapData(heatmapRes.data);
        if (topicsRes.data) setTopics(topicsRes.data as any);
        if (insightsRes.data) setInsights(insightsRes.data);
        if (leaderboardRes.data) setLeaderboard(leaderboardRes.data);
        if (compRes.data) setCompetitions(compRes.data);
        if (certRes.data) setCertificates(certRes.data);
        if (recRes.data) setRecommendations(recRes.data);

      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [user, viewingAttemptId]); // Refetch if coming back from detail view

  const getResultStatus = (attempt: any) => {
    const test = attempt.tests;
    if (!test) return 'released';
    if (test.result_release_mode === 'immediately') return 'released';
    if (test.result_release_mode === 'after_test_end') {
      if (test.expiry_time && test.expiry_time !== 'never') {
        const hours = parseInt(test.expiry_time);
        const expiryDate = new Date(new Date(attempt.started_at).getTime() + hours * 60 * 60 * 1000);
        if (new Date() > expiryDate) return 'released';
      }
      return 'pending';
    }
    if (test.result_release_mode === 'manual_release') return test.results_released ? 'released' : 'pending';
    return 'pending';
  };

  const getColorClass = (intensity: number) => {
    switch(intensity) {
      case 1: return 'bg-lilac-200 border-lilac-300';
      case 2: return 'bg-lilac-400 border-lilac-500';
      case 3: return 'bg-lilac-600 border-lilac-700';
      case 4: return 'bg-lilac-800 border-lilac-900';
      default: return 'bg-slate-100 border-slate-200/50';
    }
  };

  if (viewingAttemptId) {
    return (
      <div className="-mt-2 w-full">
        <MyResultsView 
          onNavigate={onNavigate} 
          initialAttemptId={viewingAttemptId} 
          onBack={() => setViewingAttemptId(null)} 
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-lilac-600" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 relative select-none pb-12">
      
      {/* 1. Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Tests Attempted', value: summaryData?.totalAttempts || '0', sub: `${summaryData?.totalCompleted || 0} Completed`, icon: <BookOpen size={16} className="text-lilac-600" /> },
          { label: 'Avg Score', value: `${summaryData?.avgScore || 0}%`, sub: 'Overall average', icon: <Trophy size={16} className="text-amber-500" /> },
          { label: 'Highest Score', value: `${summaryData?.highestScore || 0}%`, sub: 'Personal best', icon: <Flame size={16} className="text-rose-500" /> },
          { label: 'Avg Pacing', value: summaryData?.avgCompletionTimeMins > 0 ? `${summaryData.avgCompletionTimeMins}m` : 'N/A', sub: 'Per test time', icon: <Clock size={16} className="text-indigo-500" /> },
          { label: 'Accuracy', value: `${summaryData?.avgAccuracy || 0}%`, sub: 'Overall accuracy', icon: <Target size={16} className="text-pink-500" /> },
          { label: 'Study Streak', value: `${summaryData?.studyStreak || 0} Days`, sub: 'Keep it up!', icon: <Zap size={16} className="text-orange-500" /> },
          { label: 'Certificates', value: `${summaryData?.certificates || 0} Earned`, sub: 'Verified', icon: <Medal size={16} className="text-purple-500" /> }
        ].map((stat, idx) => (
          <GlassCard key={idx} className="border-slate-100/50 p-4 flex flex-col justify-between bg-white hover:border-lilac-200/50 transition-colors" hoverEffect={true}>
            <div className="flex justify-between items-start gap-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{stat.label}</span>
              <div className="w-6.5 h-6.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg font-black text-slate-800 block leading-tight">{stat.value}</span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block truncate">{stat.sub}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* 2. Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => onNavigate('discovery')} className="p-4 bg-gradient-to-r from-lilac-600 to-indigo-600 text-white rounded-2xl flex items-center justify-between group hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <Play size={18} />
            <span className="font-bold text-sm">Continue Practice</span>
          </div>
          <ChevronRight size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
        <button className="p-4 bg-white border border-rose-100 hover:border-rose-200 text-rose-600 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <Target size={18} />
            <span className="font-bold text-sm">Practice Weak Topics</span>
          </div>
          <ChevronRight size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
        <button onClick={() => onNavigate('discovery')} className="p-4 bg-white border border-amber-100 hover:border-amber-200 text-amber-600 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <Trophy size={18} />
            <span className="font-bold text-sm">Join Competition</span>
          </div>
          <ChevronRight size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
        <button onClick={() => navigate('/dashboard/certificates')} className="p-4 bg-white border border-emerald-100 hover:border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <Medal size={18} />
            <span className="font-bold text-sm">View Certificates</span>
          </div>
          <ChevronRight size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 3. Performance Analytics (8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-72" hoverEffect={false}>
            <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
              <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={15} className="text-lilac-600" />
                <span>Monthly Assessment Performance Trends</span>
              </h4>
              <span className="text-[9px] font-bold text-slate-400 uppercase">Last 6 Months</span>
            </div>
            <div className="flex-grow flex items-center justify-center">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                    <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 8 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 8 }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '10px', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', fill: '#64748b' }} />
                    <Line yAxisId="left" type="monotone" dataKey="Attempts" stroke="#ff70a6" strokeWidth={3} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="AvgScore" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs font-bold">No trend data available.</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* 4. Study Activity Heatmap (4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-72" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Calendar size={15} className="text-emerald-500" />
              <span>Study Activity Heatmap</span>
            </h4>
            <div className="flex-grow flex flex-col justify-center gap-2">
              <div className="flex gap-1.5 items-end overflow-x-auto no-scrollbar pb-2">
                {heatmapData.length > 0 ? heatmapData.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1.5 shrink-0">
                    {week.map((dayIntensity, dIdx) => (
                      <div 
                        key={dIdx} 
                        className={`w-3.5 h-3.5 rounded-sm border ${getColorClass(dayIntensity)}`}
                        title={`Activity level: ${dayIntensity}`}
                      />
                    ))}
                  </div>
                )) : (
                  <div className="text-slate-400 text-xs font-bold text-center w-full">No activity recorded.</div>
                )}
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                <span>Last 6 Months</span>
                <div className="flex items-center gap-1.5">
                  <span>Less</span>
                  <div className="w-2.5 h-2.5 rounded-sm border bg-slate-100 border-slate-200/50"></div>
                  <div className="w-2.5 h-2.5 rounded-sm border bg-lilac-200 border-lilac-300"></div>
                  <div className="w-2.5 h-2.5 rounded-sm border bg-lilac-400 border-lilac-500"></div>
                  <div className="w-2.5 h-2.5 rounded-sm border bg-lilac-600 border-lilac-700"></div>
                  <div className="w-2.5 h-2.5 rounded-sm border bg-lilac-800 border-lilac-900"></div>
                  <span>More</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 5. Recent Results (7/12) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full bg-white" hoverEffect={false}>
            <div className="flex justify-between items-center mb-5">
              <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-slate-700" />
                <span>Recent Results</span>
              </h4>
            </div>

            {recentAttempts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {recentAttempts.map((attempt) => {
                  const status = getResultStatus(attempt);
                  const isReleased = status === 'released';
                  const scoreLabel = isReleased ? `${attempt.score} / ${attempt.total_marks || 100}` : 'Pending';
                  
                  return (
                    <div key={attempt.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-slate-100/70 transition-all">
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-800 block truncate pr-4">{attempt.tests?.title || 'Mock Test Session'}</span>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${isReleased ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {new Date(attempt.started_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Score</span>
                          <span className={`text-sm font-black ${isReleased ? 'text-slate-800' : 'text-slate-400'}`}>{scoreLabel}</span>
                        </div>
                        {isReleased && (
                          <button
                            onClick={() => setViewingAttemptId(attempt.id)}
                            className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-lilac-600 hover:border-lilac-300 hover:bg-lilac-50 transition-all cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                <FileText size={24} className="text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-500">No recent results found.</span>
              </div>
            )}
          </GlassCard>
        </div>

        {/* 6. Leaderboard Snapshot (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full bg-white" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Trophy size={15} className="text-amber-500" />
              <span>Leaderboard Snapshot</span>
            </h4>
            <div className="flex flex-col gap-3">
              {leaderboard.length > 0 ? leaderboard.map((board, idx) => (
                <div key={idx} className="p-4 bg-gradient-to-r from-slate-50 to-white border border-slate-100 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{board.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{board.top}</span>
                    <span className="text-base font-black text-slate-800">{board.rank}</span>
                  </div>
                </div>
              )) : (
                <div className="text-slate-400 text-xs font-bold py-4 text-center">Take more tests to establish rank.</div>
              )}
            </div>
            
            <div className="mt-4 flex-grow flex items-center justify-center min-h-[180px]">
              {radarData.length > 0 ? (
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData} width={250} height={180}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 7 }} />
                  <Radar name="My Skills" dataKey="Skill" stroke="#ff70a6" fill="#ff70a6" fillOpacity={0.25} />
                </RadarChart>
              ) : (
                <div className="text-slate-400 text-xs font-bold">No subject data available.</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 7. Weak Topics (6/12) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <GlassCard className="border-rose-100/60 bg-rose-50/10 p-5.5 flex flex-col w-full h-full" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-rose-500" />
              <span>Weak Topics</span>
            </h4>
            <div className="flex flex-col gap-3">
              {topics.weakTopics.length > 0 ? topics.weakTopics.map((item: any, idx: number) => (
                <div key={idx} className="p-3.5 bg-white border border-rose-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                      <Database size={14} className="text-rose-500" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 block truncate max-w-[120px]">{item.topic}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${item.confidence}%` }}></div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{item.confidence}% Confidence</span>
                      </div>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg transition-colors cursor-pointer shrink-0">
                    Practice
                  </button>
                </div>
              )) : (
                <div className="text-slate-400 text-xs font-bold py-4 text-center">No weak topics detected yet.</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* 8. Strong Topics (6/12) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <GlassCard className="border-emerald-100/60 bg-emerald-50/10 p-5.5 flex flex-col w-full h-full" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <span>Strong Topics</span>
            </h4>
            <div className="flex flex-col gap-3">
              {topics.strongTopics.length > 0 ? topics.strongTopics.map((item: any, idx: number) => (
                <div key={idx} className="p-3.5 bg-white border border-emerald-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Braces size={14} className="text-emerald-500" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 block truncate max-w-[120px]">{item.topic}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.confidence}%` }}></div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{item.confidence}% Confidence</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg uppercase shrink-0">
                    Mastered
                  </span>
                </div>
              )) : (
                <div className="text-slate-400 text-xs font-bold py-4 text-center">No strong topics established yet.</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 9. AI Insights (6/12) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full bg-white" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <BrainCircuit size={15} className="text-purple-600 animate-pulse" />
              <span>AI Performance Insights</span>
            </h4>
            <div className="flex flex-col gap-3">
              {insights.length > 0 ? insights.map((insight, idx) => (
                <div key={idx} className={`p-4 bg-${insight.color}-50/50 border border-${insight.color}-100 rounded-2xl`}>
                  <span className={`text-[9px] font-black text-${insight.color}-600 uppercase tracking-widest block mb-1.5`}>
                    {insight.type}
                  </span>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {insight.text}
                  </p>
                </div>
              )) : (
                <div className="text-slate-400 text-xs font-bold py-4 text-center">Take a test to generate AI insights.</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* 10. Achievements (6/12) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full bg-white" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Medal size={15} className="text-indigo-500" />
              <span>Recent Achievements</span>
            </h4>
            <div className="flex flex-wrap gap-3">
              {/* Hardcoded visual representation for achievements as no backend structure was specified for achievements */}
              <div className="w-[100px] p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center text-center hover:bg-indigo-50 hover:border-indigo-100 transition-colors cursor-default">
                <div className="text-2xl mb-2">🎯</div>
                <span className="text-[10px] font-black text-slate-800 leading-tight block">First Test</span>
              </div>
              <div className="w-[100px] p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center text-center hover:bg-indigo-50 hover:border-indigo-100 transition-colors cursor-default">
                <div className="text-2xl mb-2">🔥</div>
                <span className="text-[10px] font-black text-slate-800 leading-tight block">{summaryData?.studyStreak || 0} Day Streak</span>
              </div>
              
              <div className="w-[100px] p-3 bg-slate-50/50 border border-slate-100 border-dashed rounded-2xl flex flex-col items-center justify-center text-center text-slate-300">
                <Search size={20} className="mb-2" />
                <span className="text-[9px] font-bold">More</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 11. Upcoming Competitions (6/12) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full bg-white" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Compass size={15} className="text-amber-500" />
              <span>Registered Competitions</span>
            </h4>
            <div className="flex flex-col gap-3">
              {competitions.length > 0 ? competitions.map((comp, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 block truncate max-w-[180px]">{comp.name}</span>
                    <span className="text-[9px] font-bold text-slate-400 block mt-1">{comp.participants} Participants</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase block mb-1">
                      Upcoming
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">{comp.date}</span>
                  </div>
                </div>
              )) : (
                <div className="text-slate-400 text-xs font-bold py-4 text-center">No registered competitions.</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* 12. Recommended Tests (6/12) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full bg-white" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-850 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Sparkles size={15} className="text-purple-500" />
              <span>Recommended Practice</span>
            </h4>
            <div className="flex flex-col gap-3">
              {recommendations.length > 0 ? recommendations.map((test, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-100/70 transition-all">
                  <div>
                    <span className="text-xs font-black text-slate-800 block group-hover:text-purple-600 transition-colors truncate max-w-[180px]">{test.name}</span>
                    <span className="text-[9px] font-bold text-slate-400 block mt-1">{test.time} • {test.type}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              )) : (
                <div className="text-slate-400 text-xs font-bold py-4 text-center">No recommendations available.</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

    </div>
  );
};

export default PerformanceView;
