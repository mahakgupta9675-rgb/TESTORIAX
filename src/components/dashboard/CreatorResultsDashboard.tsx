import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, Trophy, Award, Loader2, RefreshCw, 
  Eye, EyeOff, Sparkles, ExternalLink, ShieldAlert, Clock, ShieldCheck, Camera,
  BarChart3, HelpCircle
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useToast } from '../../context/ToastContext';
import testsService from '../../services/testsService';
import notificationsService from '../../services/notificationsService';
import analyticsService, { type CreatorTestAnalytics, type CreatorQuestionAnalytics } from '../../services/analyticsService';

interface CreatorResultsDashboardProps {
  testId: string;
  onBack: () => void;
}

export const CreatorResultsDashboard: React.FC<CreatorResultsDashboardProps> = ({ testId, onBack }) => {
  const { showToast } = useToast();
  
  const [test, setTest] = useState<any | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'questions' | 'registrations' | 'participants' | 'rankings'>('analytics');
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [aiSessions, setAiSessions] = useState<any[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const [creatorAnalytics, setCreatorAnalytics] = useState<CreatorTestAnalytics | null>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<CreatorQuestionAnalytics[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [testRes, attemptsRes, regsRes, logsRes, aiRes, testAnalyticsRes, qAnalyticsRes] = await Promise.all([
        testsService.getTestById(testId),
        testsService.getAttemptsByTestId(testId),
        testsService.getRegistrationsForTests([testId]),
        testsService.getSecurityLogsForTest(testId),
        testsService.getAiProctoringSessionsForTest(testId),
        analyticsService.getCreatorTestAnalytics(testId),
        analyticsService.getCreatorQuestionAnalytics(testId)
      ]);

      if (testRes.error) throw testRes.error;
      if (attemptsRes.error) throw attemptsRes.error;
      if (regsRes.error) throw regsRes.error;

      setTest(testRes.data);
      setAttempts(attemptsRes.data || []);
      setRegistrations(regsRes.data || []);
      setSecurityLogs(logsRes.data || []);
      setAiSessions(aiRes.data || []);
      setCreatorAnalytics(testAnalyticsRes.data);
      setQuestionAnalytics(qAnalyticsRes.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load creator results details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [testId]);

  const handleToggleRelease = async () => {
    if (!test) return;
    setIsUpdating(true);
    const nextReleasedState = !test.results_released;
    try {
      const { data, error } = await testsService.updateTestReleaseSettings(testId, {
        results_released: nextReleasedState
      });
      if (error) throw error;
      
      setTest(data);
      showToast(
        nextReleasedState ? 'Results released to candidates successfully!' : 'Results hidden successfully!', 
        'success'
      );

      if (nextReleasedState && test.notify_on_result_release !== false) {
        showToast('Sending participant release alerts...', 'success');
        const notifyRes = await notificationsService.sendResultReleaseNotifications(
          testId, 
          test.title, 
          test.total_marks || 100
        );
        if (notifyRes.success) {
          showToast('Notifications sent successfully!', 'success');
        } else {
          console.error(notifyRes.error);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update release settings.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleWinners = async () => {
    if (!test) return;
    setIsUpdating(true);
    const nextWinnersState = !test.winners_announced;
    try {
      const { data, error } = await testsService.updateTestReleaseSettings(testId, {
        winners_announced: nextWinnersState
      });
      if (error) throw error;

      setTest(data);
      showToast(
        nextWinnersState ? 'Lobby winners announced to candidates!' : 'Winners announcement hidden.', 
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update winner settings.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const finishedAttempts = attempts.filter(a => a.status === 'submitted' || a.status === 'expired');
  const sortedRankings = [...finishedAttempts].sort((a, b) => b.score - a.score);

  // Easiest, hardest and warning questions
  const answeredQuestions = questionAnalytics.filter(q => q.answered_count > 0);
  const easiestQuestion = answeredQuestions.length > 0 
    ? [...answeredQuestions].sort((a, b) => b.accuracy - a.accuracy)[0] 
    : null;
  const hardestQuestion = answeredQuestions.length > 0 
    ? [...answeredQuestions].sort((a, b) => a.accuracy - b.accuracy)[0] 
    : null;
  const highFailureQuestions = answeredQuestions.filter(q => q.accuracy < 30);

  const formatSeconds = (sec: number) => {
    if (!sec || sec <= 0) return 'N/A';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="w-full flex flex-col gap-6 select-none relative">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md border border-slate-100 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 rounded-xl text-slate-550 hover:text-slate-800 transition-all cursor-pointer shadow-sm"
            title="Back to Tests"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
              {test?.title || 'Manage Test Results'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Real-time creator test performance, question accuracy breakdown, and release management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm flex items-center justify-center"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Release / Hide Results Button */}
          <button
            onClick={handleToggleRelease}
            disabled={isLoading || isUpdating}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-[0.98] ${
              test?.results_released 
                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
            }`}
          >
            {isUpdating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : test?.results_released ? (
              <>
                <EyeOff size={14} />
                <span>Hide Results</span>
              </>
            ) : (
              <>
                <Eye size={14} />
                <span>Release Results</span>
              </>
            )}
          </button>

          {/* Announce Winners Button */}
          <button
            onClick={handleToggleWinners}
            disabled={isLoading || isUpdating || sortedRankings.length === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all active:scale-[0.98] ${
              test?.winners_announced 
                ? 'bg-amber-500 text-white hover:bg-amber-600' 
                : 'bg-white border border-slate-200 hover:border-slate-350 text-slate-700'
            }`}
          >
            {isUpdating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Trophy size={14} className={test?.winners_announced ? 'text-white' : 'text-amber-500'} />
                <span>{test?.winners_announced ? 'Cancel Winners' : 'Announce Winners'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-slate-100 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'analytics'
              ? 'bg-purple-100 text-purple-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 size={14} />
          <span>Overview Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'questions'
              ? 'bg-purple-100 text-purple-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle size={14} />
          <span>Question Intelligence ({questionAnalytics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'registrations'
              ? 'bg-purple-100 text-purple-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={14} />
          <span>Registrations ({registrations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'participants'
              ? 'bg-purple-100 text-purple-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={14} />
          <span>Participants ({attempts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rankings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'rankings'
              ? 'bg-purple-100 text-purple-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy size={14} />
          <span>Rankings ({finishedAttempts.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={36} className="animate-spin text-purple-650" />
        </div>
      ) : (
        <div className="w-full">

          {/* ====================================================
             TAB: OVERVIEW ANALYTICS (STEP 2 & STEP 5)
             ==================================================== */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <GlassCard className="p-4 border-slate-100 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registrations</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">{creatorAnalytics?.total_registrations || 0}</span>
                </GlassCard>
                <GlassCard className="p-4 border-slate-100 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Attempts</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">{creatorAnalytics?.total_attempts || 0}</span>
                  <span className="text-[9px] text-purple-600 font-semibold">{creatorAnalytics?.completed_attempts || 0} Finished</span>
                </GlassCard>
                <GlassCard className="p-4 border-slate-100 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completion Rate</span>
                  <span className="text-xl font-extrabold text-emerald-600 mt-1 block">{creatorAnalytics?.completion_rate || 0}%</span>
                </GlassCard>
                <GlassCard className="p-4 border-slate-100 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Score</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                    {creatorAnalytics?.avg_score || 0} <span className="text-xs text-slate-400">/ {creatorAnalytics?.total_marks || 0}</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-semibold">{creatorAnalytics?.avg_percentage || 0}% Avg</span>
                </GlassCard>
                <GlassCard className="p-4 border-slate-100 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Highest Score</span>
                  <span className="text-xl font-extrabold text-indigo-600 mt-1 block">{creatorAnalytics?.highest_score || 0}</span>
                </GlassCard>
                <GlassCard className="p-4 border-slate-100 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lowest Score</span>
                  <span className="text-xl font-extrabold text-rose-500 mt-1 block">{creatorAnalytics?.lowest_score || 0}</span>
                </GlassCard>
              </div>

              {/* Time Analytics Card (STEP 5) */}
              <GlassCard className="p-6 border-slate-100 bg-white flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Clock size={16} className="text-purple-600" />
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Candidate Time Intelligence</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-purple-600 uppercase block">Average Completion Time</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">{formatSeconds(creatorAnalytics?.avg_time_seconds || 0)}</span>
                  </div>
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Fastest Submission</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">{formatSeconds(creatorAnalytics?.fastest_time_seconds || 0)}</span>
                  </div>
                  <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-amber-600 uppercase block">Slowest Submission</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">{formatSeconds(creatorAnalytics?.slowest_time_seconds || 0)}</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ====================================================
             TAB: QUESTION INTELLIGENCE (STEP 3)
             ==================================================== */}
          {activeTab === 'questions' && (
            <div className="flex flex-col gap-6">
              {/* Question Highlights: Easiest vs Hardest vs Unusual Failure */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {easiestQuestion ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Easiest Question</span>
                      <p className="text-xs font-bold text-slate-800 line-clamp-2">Q{easiestQuestion.order_number}: {easiestQuestion.question_text}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-emerald-700">{easiestQuestion.accuracy}% Accuracy</span>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">{easiestQuestion.correct_count} Correct</span>
                    </div>
                  </div>
                ) : null}

                {hardestQuestion ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block mb-1">Hardest Question</span>
                      <p className="text-xs font-bold text-slate-800 line-clamp-2">Q{hardestQuestion.order_number}: {hardestQuestion.question_text}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-rose-700">{hardestQuestion.accuracy}% Accuracy</span>
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md">{hardestQuestion.incorrect_count} Incorrect</span>
                    </div>
                  </div>
                ) : null}

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1">High Failure Rate Warning</span>
                    <p className="text-xs font-bold text-slate-800">
                      {highFailureQuestions.length > 0 
                        ? `${highFailureQuestions.length} questions have <30% accuracy rate.` 
                        : 'No critical failure rate anomalies detected.'}
                    </p>
                  </div>
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-amber-700">Review question clarity if failure rates are high.</span>
                  </div>
                </div>
              </div>

              {/* Per-Question Analytics Table */}
              <GlassCard className="p-0 overflow-hidden border-slate-150/40 bg-white">
                {questionAnalytics.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                          <th className="p-3.5 pl-5">#</th>
                          <th className="p-3.5">Question Text</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5">Marks</th>
                          <th className="p-3.5 text-center">Answered</th>
                          <th className="p-3.5 text-center">Correct</th>
                          <th className="p-3.5 text-center">Incorrect</th>
                          <th className="p-3.5 text-center">Accuracy</th>
                          <th className="p-3.5 text-center">Skip Rate</th>
                          <th className="p-3.5 pr-5 text-center">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {questionAnalytics.map((q) => (
                          <tr key={q.question_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3.5 pl-5 font-bold text-slate-700">Q{q.order_number}</td>
                            <td className="p-3.5 max-w-xs font-bold text-slate-800 truncate" title={q.question_text}>
                              {q.question_text}
                            </td>
                            <td className="p-3.5 uppercase text-[9px] font-bold text-slate-500">{q.question_type}</td>
                            <td className="p-3.5 font-bold text-slate-700">{q.marks}</td>
                            <td className="p-3.5 text-center font-semibold text-slate-700">{q.answered_count}</td>
                            <td className="p-3.5 text-center font-bold text-emerald-600">{q.correct_count}</td>
                            <td className="p-3.5 text-center font-bold text-rose-500">{q.incorrect_count}</td>
                            <td className="p-3.5 text-center">
                              <span className={`font-black text-xs ${q.accuracy >= 75 ? 'text-emerald-600' : q.accuracy >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {q.accuracy}%
                              </span>
                            </td>
                            <td className="p-3.5 text-center text-slate-500">{q.skip_rate}%</td>
                            <td className="p-3.5 pr-5 text-center">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                q.difficulty_label === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                                q.difficulty_label === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                q.difficulty_label === 'Hard' ? 'bg-rose-100 text-rose-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {q.difficulty_label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400 font-semibold">
                    Not enough data yet. Candidate submissions will populate question analytics.
                  </div>
                )}
              </GlassCard>
            </div>
          )}
          {activeTab === 'registrations' && (
            <GlassCard className="p-0 overflow-hidden border-slate-150/40 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Candidate</th>
                      <th className="py-3.5 px-6">Mobile Number</th>
                      <th className="py-3.5 px-6">College/School</th>
                      <th className="py-3.5 px-6">Course Name</th>
                      <th className="py-3.5 px-6">Year/Semester</th>
                      <th className="py-3.5 px-6">Date Registered</th>
                      <th className="py-3.5 px-6">Additional Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                    {registrations.length > 0 ? (
                      registrations.map((reg) => {
                        const data = reg.registration_data || {};
                        
                        // Helper to find a value by name in a case-insensitive, symbol-insensitive way
                        const getValue = (keysToSearch: string[]): any => {
                          const normalizedKeys = keysToSearch.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
                          const entry = Object.entries(data).find(([k]) => {
                            const normalizedK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return normalizedKeys.includes(normalizedK);
                          });
                          return entry ? entry[1] : null;
                        };

                        const fullName = getValue(['full_name', 'fullName', 'name', 'candidate_name']) || 'Anonymous Candidate';
                        const email = getValue(['email', 'email_address', 'emailAddress']) || 'N/A';
                        const phone = getValue(['phone', 'mobile', 'mobile_number', 'mobileNumber', 'contact', 'contact_number', 'contactNumber']) || 'N/A';
                        const college = getValue(['college', 'university', 'school', 'college_name', 'collegeName', 'institution', 'college_university']) || 'N/A';
                        const courseName = getValue(['course_name', 'courseName', 'branch', 'stream', 'course', 'degree', 'specialization']) || 'N/A';
                        const yearSemester = getValue(['year_semester', 'yearSemester', 'year', 'semester', 'graduation_year', 'graduationYear']) || 'N/A';
                        
                        // Extract any extra custom fields that are not part of the standard fields
                        const standardKeys = [
                          'full_name', 'fullName', 'name', 'candidate_name',
                          'email', 'email_address', 'emailAddress',
                          'phone', 'mobile', 'mobile_number', 'mobileNumber', 'contact', 'contact_number', 'contactNumber',
                          'college', 'university', 'school', 'college_name', 'collegeName', 'institution', 'college_university',
                          'course_name', 'courseName', 'branch', 'stream', 'course', 'degree', 'specialization',
                          'year_semester', 'yearSemester', 'year', 'semester', 'graduation_year', 'graduationYear'
                        ].map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

                        const extraFields = Object.entries(data).filter(([key]) => {
                          const normalizedK = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                          return !standardKeys.includes(normalizedK);
                        });

                        const renderCustomValue = (key: string, val: any) => {
                          const cleanKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          if (val === undefined || val === null || val === '') return null;
                          
                          const strVal = String(val);
                          
                          // Check if value is a base64 image or image URL
                          const isImage = strVal.startsWith('data:image/') || 
                                          (strVal.startsWith('http') && (strVal.match(/\.(jpeg|jpg|gif|png|webp)/i) || key.includes('photo') || key.includes('avatar') || key.includes('image')));
                          
                          if (isImage) {
                            return (
                              <div key={key} className="flex items-center gap-1.5 bg-purple-50/40 border border-purple-100/30 px-2 py-1 rounded-lg text-purple-750 leading-tight w-fit">
                                <span className="font-extrabold text-[9px]">{cleanKey}:</span>
                                <div className="relative group/photo flex items-center">
                                  <img 
                                    src={strVal} 
                                    alt="Preview" 
                                    className="w-7 h-7 rounded-md object-cover border border-purple-200 cursor-pointer shadow-sm hover:scale-[1.25] transition-all duration-200" 
                                    onClick={() => window.open(strVal, '_blank')}
                                  />
                                </div>
                              </div>
                            );
                          }
                          
                          // Check if value is a URL link
                          const isUrl = strVal.startsWith('http://') || strVal.startsWith('https://');
                          if (isUrl) {
                            return (
                              <div key={key} className="bg-purple-50/40 border border-purple-100/30 px-2 py-1 rounded-lg text-purple-750 leading-tight flex items-center gap-1.5 w-fit">
                                <span className="font-extrabold text-[9px]">{cleanKey}:</span>
                                <a 
                                  href={strVal} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-purple-650 hover:text-purple-800 underline inline-flex items-center gap-0.5 font-bold"
                                >
                                  <span>View Link</span>
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            );
                          }
                          
                          // Fallback to text badge
                          return (
                            <div key={key} className="bg-purple-50/40 border border-purple-100/30 px-2 py-1 rounded-lg text-purple-750 leading-tight w-fit">
                              <span className="font-extrabold text-[9px]">{cleanKey}:</span> {strVal}
                            </div>
                          );
                        };
                        
                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                                  {fullName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-slate-800 font-extrabold">{fullName}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">{email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-700">{phone}</td>
                            <td className="py-4 px-6 text-slate-750">{college}</td>
                            <td className="py-4 px-6 text-slate-750">{courseName}</td>
                            <td className="py-4 px-6 text-slate-750">{yearSemester}</td>
                            <td className="py-4 px-6">
                              {new Date(reg.registered_at).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-6">
                              {extraFields.length > 0 ? (
                                <div className="flex flex-col gap-1.5 text-[10px]">
                                  {extraFields.map(([key, value]) => renderCustomValue(key, value))}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-medium">None</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                          No candidates have registered for this test yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {activeTab === 'participants' && (
            <GlassCard className="p-0 overflow-hidden border-slate-150/40 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Participant</th>
                      <th className="py-3.5 px-6">Date Attempted</th>
                      <th className="py-3.5 px-6">Attempt Status</th>
                      <th className="py-3.5 px-6 text-center">Score</th>
                      <th className="py-3.5 px-6 text-center">Warnings</th>
                      <th className="py-3.5 px-6 text-center">Tab Switches</th>
                      <th className="py-3.5 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                    {attempts.length > 0 ? (
                      attempts.map((att) => {
                        const profile = att.profiles as any;
                        const fullName = profile?.full_name || 'Global Challenger';
                        const email = profile?.email || 'N/A';
                        
                        return (
                          <tr key={att.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-lilac-500 to-indigo-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                                  {fullName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-slate-800 font-extrabold">{fullName}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">{email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {new Date(att.started_at).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                att.status === 'submitted' ? 'bg-emerald-50 text-emerald-600' :
                                att.status === 'expired' ? 'bg-amber-50 text-amber-600' :
                                'bg-blue-50 text-blue-600'
                              }`}>
                                {att.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center text-slate-800 font-black">
                              {att.status !== 'in_progress' ? `${att.score} / ${att.total_marks}` : '-'}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={att.warning_count > 0 ? 'text-rose-500 font-extrabold' : 'text-slate-400'}>
                                {att.warning_count}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={att.tab_switch_count > 0 ? 'text-amber-600 font-extrabold' : 'text-slate-400'}>
                                {att.tab_switch_count}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => setSelectedAttemptId(att.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 mx-auto"
                              >
                                <ShieldAlert size={12} />
                                View Logs
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                          No candidates have registered or attempted this test yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {activeTab === 'rankings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Leaderboard Rankings List (8/12 grid cols) */}
              <div className="lg:col-span-8">
                <GlassCard className="p-0 overflow-hidden border-slate-150/40 bg-white">
                  <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy size={14} className="text-amber-500" />
                      <span>Scoreboard Standings</span>
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-50 flex flex-col">
                    {sortedRankings.length > 0 ? (
                      sortedRankings.map((att, idx) => {
                        const rank = idx + 1;
                        const profile = att.profiles as any;
                        const fullName = profile?.full_name || 'Global Challenger';
                        
                        return (
                          <div key={att.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/20 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Rank medal/badge */}
                              <div className={`w-7 h-7 rounded-lg border text-[11px] font-black flex items-center justify-center shrink-0 ${
                                rank === 1 ? 'bg-amber-100 border-amber-200 text-amber-600' :
                                rank === 2 ? 'bg-slate-150 border-slate-200 text-slate-500' :
                                rank === 3 ? 'bg-orange-100 border-orange-200 text-orange-600' :
                                'bg-slate-50 border-slate-100 text-slate-400'
                              }`}>
                                {rank}
                              </div>

                              <div className="min-w-0">
                                <span className="text-xs font-extrabold text-slate-850 block truncate">
                                  {fullName}
                                </span>
                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                  Attempt ID: {att.id.substring(0, 8).toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-slate-850 block">{att.score} Points</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5 uppercase">
                                {att.status}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-slate-450 italic text-xs">
                        No submissions have been made for this test yet.
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>

              {/* Statistics & Settings Overview (4/12 grid cols) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <GlassCard className="border-slate-150/40 p-5 flex flex-col justify-between bg-white" hoverEffect={false}>
                  <div>
                    <h4 className="font-display font-extrabold text-xs text-slate-800 tracking-wider uppercase mb-5 flex items-center gap-1.5 border-b border-slate-55 pb-2">
                      <Award size={14} className="text-purple-650" />
                      <span>Test Statistics</span>
                    </h4>

                    <div className="flex flex-col gap-4 font-semibold text-xs text-slate-600">
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                        <span>Average Score:</span>
                        <span className="text-slate-850 font-extrabold">
                          {sortedRankings.length > 0
                            ? Math.round(sortedRankings.reduce((sum, a) => sum + a.score, 0) / sortedRankings.length)
                            : 0} pts
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                        <span>Highest Score:</span>
                        <span className="text-amber-600 font-black">
                          {sortedRankings[0] ? sortedRankings[0].score : 0} pts
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                        <span>Total Participants:</span>
                        <span className="text-slate-850 font-extrabold">{attempts.length}</span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                        <span>Submitted Count:</span>
                        <span className="text-emerald-600 font-extrabold">
                          {attempts.filter(a => a.status === 'submitted').length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-gradient-to-r from-purple-50/30 to-indigo-50/30 border border-purple-100/30 rounded-2xl flex gap-2.5 items-start mt-6">
                    <Sparkles size={14} className="text-purple-650 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-purple-900 leading-normal">
                      Winner updates and rank logs automatically rebuild dynamically as candidates submit evaluation slots.
                    </div>
                  </div>
                </GlassCard>
              </div>

            </div>
          )}
        </div>
      )}
      {/* Security Logs Modal */}
      {selectedAttemptId && (() => {
        const attempt = attempts.find(a => a.id === selectedAttemptId);
        const logs = securityLogs.filter(l => l.attempt_id === selectedAttemptId);
        const aiSession = aiSessions.find(s => s.attempt_id === selectedAttemptId);
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800">Security Audit Logs</h3>
                    <p className="text-[10px] font-semibold text-slate-500">
                      Participant: {attempt?.profiles?.full_name || 'N/A'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAttemptId(null)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full transition-colors"
                >
                  &times;
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-6">

                {/* AI Proctoring Section */}
                {aiSession && (
                  <div className="border border-indigo-100 rounded-2xl overflow-hidden bg-indigo-50/30 shrink-0">
                    <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera size={14} className="text-indigo-600" />
                        <h4 className="font-bold text-xs text-indigo-900">AI Proctoring Insights</h4>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Trust Score</span>
                          <span className={`font-black text-sm ${aiSession.security_score > 80 ? 'text-emerald-500' : aiSession.security_score > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                            {aiSession.security_score}%
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-500 uppercase bg-indigo-100 px-2 py-1 rounded-md">
                          {aiSession.events?.length || 0} Flags Logged
                        </span>
                      </div>
                    </div>
                    
                    {aiSession.events && aiSession.events.length > 0 ? (
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                        {aiSession.events.map((evt: any, i: number) => (
                          <div key={i} className="flex flex-col gap-2 bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
                            {evt.metadata?.snapshot_path ? (
                              <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                <img 
                                  src={`https://rxhsrxymoytbsmrtnckd.supabase.co/storage/v1/object/public/exam_snapshots/${evt.metadata.snapshot_path}`}
                                  alt="Proctoring snapshot"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="aspect-video bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-slate-400">
                                <Camera size={16} className="mb-1 opacity-50" />
                                <span className="text-[8px] font-semibold">No Image</span>
                              </div>
                            )}
                            <div className="flex flex-col px-1">
                              <span className="text-[9px] font-bold text-slate-700 capitalize">{evt.event_type.replace('_', ' ')}</span>
                              <span className="text-[8px] text-slate-500">{new Date(evt.created_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-indigo-400/70 text-xs font-semibold">
                        No suspicious AI events logged. Candidate maintained high integrity.
                      </div>
                    )}
                  </div>
                )}

                {/* Browser Security Logs */}
                <div className="flex flex-col gap-4">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Browser Security Events</h4>
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <ShieldCheck size={40} className="text-emerald-400 mb-3 opacity-50" />
                    <p className="font-bold">No security violations recorded.</p>
                    <p className="text-xs">This participant had a clean session.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              log.severity === 'critical' ? 'bg-rose-100 text-rose-600' :
                              log.severity === 'high' ? 'bg-amber-100 text-amber-600' :
                              log.severity === 'medium' ? 'bg-orange-100 text-orange-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {log.severity}
                            </span>
                            <span className="text-sm font-bold text-slate-700 capitalize">
                              {log.violation_type.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="text-xs font-medium text-slate-500">
                          {log.duration ? `Duration: ${Math.round(log.duration / 1000)}s` : null}
                          {log.question_number ? ` • Question ${log.question_number}` : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CreatorResultsDashboard;
