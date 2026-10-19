import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Clock, Award, Trophy, ChevronLeft, Eye, 
  Loader2, RefreshCw, CheckCircle2, ShieldAlert,
  HelpCircle, Check, X, Info
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import testsService from '../../services/testsService';
import { getResultStatus } from '../../services/resultsService';

export const MyResultsView: React.FC<{ 
  onNavigate: (view: any, param?: string) => void;
  initialAttemptId?: string | null;
  onBack?: () => void;
}> = ({ onNavigate, initialAttemptId: initialAttemptIdProp, onBack }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  // Also accept attemptId passed via router location state (from exam result screen)
  const initialAttemptId = (location.state as any)?.attemptId || initialAttemptIdProp || null;
  
  const [attempts, setAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  
  // Detail states
  const [testConfig, setTestConfig] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [allAttempts, setAllAttempts] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const fetchUserAttempts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await testsService.getUserAttempts(user.id);
      if (error) throw error;
      setAttempts(data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load results.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAttempts();
  }, [user]);

  useEffect(() => {
    if (initialAttemptId && attempts.length > 0 && !selectedAttempt) {
      const attemptToView = attempts.find(a => a.id === initialAttemptId);
      if (attemptToView) {
        handleViewDetails(attemptToView);
      }
    }
  }, [initialAttemptId, attempts]);

  const getResultStatusForAttempt = (attempt: any): 'released' | 'pending' | 'restricted' => {
    const test = attempt.tests;
    if (!test) return 'released';
    return getResultStatus(
      test.result_release_mode || 'immediately',
      test.results_released ?? false,
      test.expiry_time,
      attempt.started_at
    );
  };

  const getAnonymousId = (userId: string) => {
    return 'User #' + userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  };

  const handleViewDetails = async (attempt: any) => {
    setSelectedAttempt(attempt);
    setLoadingDetail(true);
    try {
      // 1. Fetch test details
      const { data: testData, error: testErr } = await testsService.getTestById(attempt.test_id);
      if (testErr) throw testErr;
      setTestConfig(testData);

      // 2. Fetch questions
      const { data: questionsData, error: questionsErr } = await testsService.getQuestionsByTestId(attempt.test_id);
      if (questionsErr) throw questionsErr;
      setQuestions(questionsData || []);

      // 3. Fetch answers for this attempt
      const { data: answersData, error: answersErr } = await testsService.getAnswersForAttempt(attempt.id);
      if (answersErr) throw answersErr;
      setAnswers(answersData || []);

      // 4. Fetch all attempts for this test to calculate Rank, Leaderboard & Winners
      const { data: allAttemptsData, error: allErr } = await testsService.getAttemptsByTestId(attempt.test_id);
      if (allErr) throw allErr;
      
      const finishedAttempts = (allAttemptsData || []).filter(a => a.status === 'submitted' || a.status === 'expired');
      // Tie-breaking: sort by score DESC, then submitted_at ASC (earlier submission = better rank)
      const sorted = [...finishedAttempts].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime();
      });
      setAllAttempts(sorted);
    } catch (err: any) {
      showToast(err.message || 'Failed to load result review details.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Calculations for detail view
  const myRank = allAttempts.findIndex(a => a.id === selectedAttempt?.id) + 1 || 1;
  const correctAnswersCount = answers.filter(a => a.is_correct).length;
  const accuracy = questions.length > 0 ? Math.round((correctAnswersCount / questions.length) * 100) : 0;

  // Winner Details
  const highestScoreAttempt = allAttempts[0] || null;
  const isWinnerAnnounced = testConfig?.winners_announced;
  const winnerVisibility = testConfig?.winner_visibility || 'public';

  return (
    <div className="w-full flex flex-col gap-6 relative select-none">
      <AnimatePresence mode="wait">
        {!selectedAttempt ? (
          /* ====================================================
             LIST VIEW: ALL ATTEMPTS
             ==================================================== */
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div>
                <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
                  My Test Results
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Review your performance, detailed answers sheets, and global scoreboard ranks.
                </p>
              </div>

              <button
                onClick={fetchUserAttempts}
                disabled={isLoading}
                className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                title="Refresh Results"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* List Content */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 size={36} className="animate-spin text-purple-650" />
              </div>
            ) : attempts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {attempts.map((attempt) => {
                  const status = getResultStatusForAttempt(attempt);
                  const isReleased = status === 'released';
                  
                  // Rank calculation
                  const scoreLabel = isReleased ? `${attempt.score} / ${attempt.total_marks || 100}` : 'Pending';
                  
                  return (
                    <GlassCard 
                      key={attempt.id} 
                      className="p-5.5 border-slate-150/40 bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                      hoverEffect={true}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-3">
                          <h3 className="font-display font-extrabold text-base text-slate-800 line-clamp-1">
                            {attempt.tests?.title || 'Mock Test Session'}
                          </h3>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isReleased ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {status}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400 font-bold block mt-1">
                          Attempted: {new Date(attempt.started_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50/50 border border-slate-100 p-3 rounded-2xl mt-4 text-xs font-semibold text-slate-600">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Score</span>
                            <span className={`text-sm font-extrabold ${isReleased ? 'text-slate-800' : 'text-slate-400'}`}>
                              {scoreLabel}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Proctor Flags</span>
                            <span className={`text-sm font-extrabold ${attempt.warning_count > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {attempt.warning_count} Warning(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-50">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={11} />
                          <span>Status: {attempt.status}</span>
                        </span>

                        {isReleased ? (
                          <button
                            onClick={() => handleViewDetails(attempt)}
                            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-97 border border-purple-200/10"
                          >
                            <Eye size={12} />
                            <span>View Result</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl flex items-center gap-1">
                            <Info size={11} />
                            <span>Awaiting Release</span>
                          </span>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            ) : (
              <GlassCard className="border-slate-100/60 p-12 text-center max-w-md w-full mx-auto shadow-xl bg-white/50">
                <div className="w-14 h-14 rounded-2xl bg-lilac-50 text-lilac-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Award size={24} />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight">No results available</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-2.5 font-medium">
                  You haven't submitted any assessments yet, or your attempt logs have not been verified. Browse available assessments in Competitions!
                </p>
                <button
                  onClick={() => onNavigate('discovery')}
                  className="mt-6 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  Browse Competitions
                </button>
              </GlassCard>
            )}
          </motion.div>
        ) : (
          /* ====================================================
             DETAIL VIEW: PERFORMANCE REVIEW & LEADERBOARD
             ==================================================== */
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* Back Button & Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSelectedAttempt(null);
                    if (onBack) onBack();
                  }}
                  className="p-2 bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 rounded-xl text-slate-550 hover:text-slate-800 transition-all cursor-pointer shadow-sm"
                  title="Back to Results"
                >
                  <ChevronLeft size={16} />
                </button>
                <div>
                  <h2 className="font-display font-extrabold text-lg text-slate-900 tracking-tight">
                    {testConfig?.title || 'Performance Review'}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Attempted on {new Date(selectedAttempt.started_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-xl uppercase">
                  Review Mode: {testConfig?.answer_review_mode?.replace(/_/g, ' ') || 'full review'}
                </span>
              </div>
            </div>

            {loadingDetail ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 size={36} className="animate-spin text-purple-650" />
              </div>
            ) : (
              <>
                {/* 1. MOCK WINNER DISPLAY (IF ANNOUNCED & NOT PRIVATE) */}
                {isWinnerAnnounced && highestScoreAttempt && (
                  winnerVisibility === 'public' || winnerVisibility === 'anonymous' ? (
                    <motion.div
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-300/40 p-5 rounded-3xl flex items-center justify-between gap-5 relative overflow-hidden shadow-sm"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-500 text-2xl shadow-inner shrink-0">
                          🏆
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Lobby Winner Announced</span>
                          <h3 className="font-display font-extrabold text-base text-slate-800 mt-1">
                            {winnerVisibility === 'public'
                              ? (highestScoreAttempt.profiles?.full_name || 'Global Challenger')
                              : getAnonymousId(highestScoreAttempt.user_id)
                            }
                          </h3>
                        </div>
                      </div>

                      <div className="text-right relative z-10 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Winning Score</span>
                        <span className="text-lg font-black text-amber-600 block">
                          {highestScoreAttempt.score} pts
                        </span>
                      </div>
                      
                      {/* Floating seal background */}
                      <div className="absolute right-[-10px] bottom-[-20px] text-8xl opacity-10 pointer-events-none select-none">🏆</div>
                    </motion.div>
                  ) : null
                )}

                {/* 2. MAIN RESULTS REVIEW OR "NO REVIEW" RESTRICTION */}
                {testConfig?.answer_review_mode === 'no_review' ? (
                  /* ====================================================
                     CASE 1: NO REVIEW
                     ==================================================== */
                  <GlassCard className="border-slate-100 p-8 text-center max-w-lg w-full mx-auto shadow-xl bg-white">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="font-display font-extrabold text-lg text-slate-900 tracking-tight">Test Submitted Successfully</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-3 font-semibold">
                      Your answer logs have been recorded and saved securely. Per exam settings, details reviews, scores, and explanations are hidden.
                    </p>
                    <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl mt-6 text-xs text-slate-400 font-mono text-left flex flex-col gap-1">
                      <div>Submission Status: <span className="text-emerald-500 font-extrabold">released</span></div>
                      <div>Attempts Log ID: <span className="text-slate-600">{selectedAttempt.id}</span></div>
                    </div>
                  </GlassCard>
                ) : (
                  /* ====================================================
                     CASE 2, 3, 4: SCORE / ANSWERS / EXPLANATIONS DETAILED
                     ==================================================== */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Left: Metrics & Questions List (8/12 grid cols) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                      
                      {/* Score Metrics Strip */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                        <GlassCard className="border-slate-100/50 p-4 flex flex-col justify-between bg-white hover:border-purple-200/50" hoverEffect={true}>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">My Score</span>
                          <span className="text-lg font-black text-slate-800 block mt-2">
                            {selectedAttempt.score} <span className="text-xs font-semibold text-slate-400">/ {selectedAttempt.total_marks || 100}</span>
                          </span>
                        </GlassCard>

                        <GlassCard className="border-slate-100/50 p-4 flex flex-col justify-between bg-white hover:border-pink-200/50" hoverEffect={true}>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Accuracy</span>
                          <span className="text-lg font-black text-pink-600 block mt-2">{accuracy}%</span>
                        </GlassCard>

                        <GlassCard className="border-slate-100/50 p-4 flex flex-col justify-between bg-white hover:border-indigo-200/50" hoverEffect={true}>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Lobby Rank</span>
                          <span className="text-lg font-black text-indigo-600 block mt-2">#{myRank}</span>
                        </GlassCard>

                        <GlassCard className="border-slate-100/50 p-4 flex flex-col justify-between bg-white hover:border-emerald-200/50" hoverEffect={true}>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Correct Count</span>
                          <span className="text-lg font-black text-emerald-600 block mt-2">
                            {correctAnswersCount} <span className="text-xs font-semibold text-slate-400">/ {questions.length}</span>
                          </span>
                        </GlassCard>
                      </div>

                      {/* Question Answer Sheet Breakdown */}
                      {testConfig?.answer_review_mode !== 'score_only' && (
                        <div className="flex flex-col gap-5.5">
                          <div className="border-b border-slate-100 pb-2.5 mt-2">
                            <h3 className="font-display font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <FileText size={16} className="text-purple-650" />
                              <span>Answer Key & Explanation Sheet</span>
                            </h3>
                          </div>

                          <div className="flex flex-col gap-4">
                            {questions.map((q, idx) => {
                              const ansObj = answers.find(a => a.question_id === q.id);
                              const userAns = ansObj?.answer_data?.value;
                              const isCorrect = ansObj?.is_correct;
                              const marksAwarded = ansObj?.marks_awarded || 0;

                              const correctAnsText = q.type === 'mcq' || q.type === 'mcq-single'
                                ? q.options?.[q.correct_answer?.correctOptionIndex] || 'N/A'
                                : q.type === 'true-false'
                                ? (q.correct_answer?.correctAnswer ? 'True' : 'False')
                                : q.type === 'fillups'
                                ? q.correct_answer?.answers?.join(', ')
                                : q.type === 'coding'
                                ? 'Solution Code Provided'
                                : 'Guidelines';

                              const showExplanations = testConfig?.answer_review_mode === 'score_answers_explanations';

                              return (
                                <div 
                                  key={q.id}
                                  className={`p-5 rounded-3xl border flex flex-col gap-4 bg-white/70 backdrop-blur-sm transition-all hover:shadow-md ${
                                    isCorrect 
                                      ? 'border-emerald-100 bg-gradient-to-r from-emerald-50/10 to-transparent'
                                      : userAns ? 'border-rose-100 bg-gradient-to-r from-rose-50/10 to-transparent' : 'border-slate-100'
                                  }`}
                                >
                                  {/* Q Number & Score Badge */}
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">
                                      Question #{idx + 1}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {userAns ? (
                                        isCorrect ? (
                                          <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                                            <Check size={8} strokeWidth={4} />
                                            <span>Correct</span>
                                          </span>
                                        ) : (
                                          <span className="text-[8px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                                            <X size={8} strokeWidth={4} />
                                            <span>Incorrect</span>
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-[8px] font-bold uppercase text-slate-400 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-lg">
                                          Skipped
                                        </span>
                                      )}
                                      
                                      {showExplanations && (
                                        <span className="text-[9px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                                          Score: {marksAwarded} / {q.marks || 5}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Question Text */}
                                  <p className="text-xs font-semibold text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                                    {q.question_text || q.text}
                                  </p>

                                  {/* User & Correct Answers Comparison */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium border-t border-slate-50 pt-3">
                                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1">
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Your Answer</span>
                                      <span className={isCorrect ? 'text-emerald-700 font-extrabold' : userAns ? 'text-rose-700 font-extrabold' : 'text-slate-400 italic'}>
                                        {userAns || 'Not Answered'}
                                      </span>
                                    </div>
                                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1">
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Correct Answer</span>
                                      <span className="text-emerald-700 font-extrabold">
                                        {correctAnsText}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Coding script visual solution representation */}
                                  {q.type === 'coding' && showExplanations && q.correct_answer?.solutionCode && (
                                    <pre className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl font-mono text-[10px] text-purple-200 mt-2 overflow-x-auto">
                                      {q.correct_answer.solutionCode}
                                    </pre>
                                  )}

                                  {/* Explanations section */}
                                  {showExplanations && q.explanation && (
                                    <div className="mt-3.5 p-3.5 bg-purple-50/20 border border-purple-100/30 rounded-2xl flex gap-3">
                                      <HelpCircle size={15} className="text-purple-650 shrink-0 mt-0.5" />
                                      <div className="text-[10px] text-slate-550 leading-relaxed">
                                        <span className="font-bold text-purple-700 block mb-0.5">Explanation:</span>
                                        {q.explanation}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Leaderboard (4/12 grid cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                      
                      {/* Leaderboard panel */}
                      {testConfig?.result_visibility !== 'private' ? (
                        <GlassCard className="border-slate-150/40 p-5 flex flex-col w-full h-full bg-white" hoverEffect={false}>
                          <h4 className="font-display font-extrabold text-xs text-slate-800 tracking-wider uppercase mb-5 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                            <Trophy size={14} className="text-amber-500" />
                            <span>Assessment Leaderboard</span>
                          </h4>

                          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                            {allAttempts.map((att, idx) => {
                              const rank = idx + 1;
                              const isMe = att.id === selectedAttempt.id;
                              
                              const displayParticipantName = testConfig?.result_visibility === 'public'
                                ? (att.profiles?.full_name || 'Global Challenger')
                                : getAnonymousId(att.user_id);
                                
                              return (
                                <div 
                                  key={att.id}
                                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                    isMe 
                                      ? 'border-purple-200 bg-purple-50/30 ring-1 ring-purple-500/20' 
                                      : 'border-slate-100 hover:bg-slate-50/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {/* Rank badge */}
                                    <div className={`w-6.5 h-6.5 rounded-lg border text-[10px] font-black flex items-center justify-center shrink-0 ${
                                      rank === 1 ? 'bg-amber-100 border-amber-200 text-amber-600' :
                                      rank === 2 ? 'bg-slate-150 border-slate-200 text-slate-500' :
                                      rank === 3 ? 'bg-orange-100 border-orange-200 text-orange-600' :
                                      'bg-slate-50 border-slate-100 text-slate-400'
                                    }`}>
                                      {rank}
                                    </div>
                                    <div className="min-w-0 flex flex-col">
                                      <span className={`text-xs truncate font-bold ${isMe ? 'text-purple-750 font-black' : 'text-slate-700'}`}>
                                        {displayParticipantName}
                                      </span>
                                      {isMe && (
                                        <span className="text-[8px] text-purple-600 font-extrabold uppercase mt-0.5">
                                          Your Result
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <span className="text-xs font-black text-slate-800 shrink-0">
                                    {att.score} pts
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </GlassCard>
                      ) : (
                        <div className="border border-slate-100 border-dashed rounded-3xl p-6 text-center bg-slate-50/50 flex flex-col items-center justify-center h-full min-h-[220px]">
                          <ShieldAlert size={28} className="text-slate-300 mb-2" />
                          <h4 className="font-bold text-slate-850 text-xs">Private Leaderboard</h4>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] leading-relaxed font-semibold">
                            Leaderboard rankings and other participant scores are set to private for this test.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyResultsView;
