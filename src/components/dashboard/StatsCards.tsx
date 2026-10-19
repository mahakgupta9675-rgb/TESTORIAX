import React, { useEffect, useState } from 'react';
import { FilePlus2, FileText, Trophy, Award, ArrowUpRight, Flame, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import testsService from '../../services/testsService';
import performanceService from '../../services/performanceService';

export const StatsCards: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [createdCount, setCreatedCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [testsRes, summaryRes] = await Promise.all([
          testsService.getTests(user.id),
          performanceService.getPerformanceSummary(user.id)
        ]);

        if (isMounted) {
          if (testsRes.data) {
            setCreatedCount(testsRes.data.length);
            setDraftCount(testsRes.data.filter((t: any) => t.status === 'draft').length);
          }
          if (summaryRes.data) {
            setSummary(summaryRes.data);
          }
        }
      } catch (err) {
        console.error('Error fetching stats overview:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    return () => { isMounted = false; };
  }, [user]);

  if (loading) {
    return (
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 py-2">
        <div className="lg:col-span-7 bg-white/80 border border-slate-100 rounded-3xl p-6 h-48 animate-pulse" />
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/80 border border-slate-100 rounded-2xl p-5 h-48 animate-pulse" />
          <div className="bg-white/80 border border-slate-100 rounded-2xl p-5 h-48 animate-pulse" />
          <div className="bg-white/80 border border-slate-100 rounded-2xl p-5 h-48 animate-pulse" />
        </div>
      </div>
    );
  }

  const publishedCount = Math.max(0, createdCount - draftCount);
  const totalAttempts = summary?.totalAttempts || 0;
  const avgAccuracy = summary?.avgAccuracy || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
      
      {/* FEATURED SUMMARY CARD (7/12 grid cols) - "My Assessment Journey" */}
      <div className="lg:col-span-7 bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-xs">
                <Layers size={16} />
              </span>
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
                  My Assessment Journey
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Summary of your test creation & attempt history.
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-100">
              <ArrowUpRight size={13} />
              <span>Active</span>
            </span>
          </div>

          {/* Primary Metric Grid */}
          <div className="grid grid-cols-2 gap-4 my-3 pt-2">
            {/* Total Tests Created */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FilePlus2 size={13} className="text-pink-500" />
                <span>Tests Created</span>
              </span>
              <span className="font-display font-black text-3xl text-slate-900 tracking-tight">
                {createdCount}
              </span>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-slate-500">
                <span className="text-pink-600 font-bold">{publishedCount} published</span>
                <span>•</span>
                <span>{draftCount} drafts</span>
              </div>
            </div>

            {/* Total Tests Attempted */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText size={13} className="text-indigo-500" />
                <span>Tests Attempted</span>
              </span>
              <span className="font-display font-black text-3xl text-slate-900 tracking-tight">
                {totalAttempts}
              </span>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-slate-500">
                <span className="text-indigo-600 font-bold">{avgAccuracy}% avg accuracy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Pills */}
        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
          <span>Completed Attempts: <strong className="text-slate-800">{summary?.totalCompleted || 0}</strong></span>
          <span>Practice Tests: <strong className="text-slate-800">{summary?.totalPracticeTests || 0}</strong></span>
        </div>
      </div>

      {/* COMPACT METRIC BLOCKS (5/12 grid cols) */}
      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-stretch">
        
        {/* Block 1: Competitions Joined */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-5 flex flex-col justify-between hover:border-violet-200 hover:-translate-y-0.5 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Competitions
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center transition-transform group-hover:scale-105">
              <Trophy size={16} />
            </div>
          </div>

          <div>
            <h4 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              {summary?.totalCompetitions || 0}
            </h4>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              {summary?.avgScore > 0 ? `${summary?.avgScore}% avg score` : 'Competitions joined'}
            </p>
          </div>
        </div>

        {/* Block 2: Certificates Earned */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-5 flex flex-col justify-between hover:border-emerald-200 hover:-translate-y-0.5 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Certificates
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-105">
              <Award size={16} />
            </div>
          </div>

          <div>
            <h4 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              {summary?.certificates || 0}
            </h4>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              Verified credentials
            </p>
          </div>
        </div>

        {/* Block 3: Study Streak */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-5 flex flex-col justify-between hover:border-amber-200 hover:-translate-y-0.5 transition-all shadow-sm group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Streak
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:scale-105">
              <Flame size={16} />
            </div>
          </div>

          <div>
            <h4 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              {summary?.studyStreak || 0}d
            </h4>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              Activity streak
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default StatsCards;
