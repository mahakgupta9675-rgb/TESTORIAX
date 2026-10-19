/**
 * ResultPage.tsx — Phase 6: Student Result View
 *
 * Renders after exam submission OR when navigating to /dashboard/my-results.
 * Respects all visibility settings:
 *   - result_release_mode: immediately / after_test_end / manual_release
 *   - result_visibility: public / anonymous / private / creator_only
 *   - answer_review_mode: no_review / score_only / score_answers / score_answers_explanations
 *
 * Security:
 * - Correct answers are NEVER shown before result release.
 * - Ranking is read from authoritative DB (not client-sorted).
 * - Solution code for coding questions is stripped by getQuestionsByTestId.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, MinusCircle, Trophy, Clock, AlertTriangle,
  Target, HelpCircle, Users, Eye, EyeOff, Lock, RefreshCw,
  ChevronDown, ChevronUp, Code2, TrendingUp
} from 'lucide-react';
import {
  resultsService,
  getResultStatus,
  canShowAnswers,
  canShowExplanations,
  type ResultStatus,
  type ReviewMode,
} from '../../services/resultsService';
import { testsService } from '../../services/testsService';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, total: number) =>
  `${n ?? 0} / ${total}`;

const pct = (score: number, total: number) =>
  total > 0 ? Math.round((score / total) * 100) : 0;

function formatDuration(started: string, submitted: string | null): string {
  if (!submitted) return 'N/A';
  const ms = new Date(submitted).getTime() - new Date(started).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function anonymousId(userId: string): string {
  return 'Participant #' + userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  attemptId: string;
  onBack?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const ResultPage: React.FC<Props> = ({ attemptId, onBack }) => {
  const { user } = useAuth();

  const [attempt, setAttempt]         = useState<any | null>(null);
  const [questions, setQuestions]     = useState<any[]>([]);
  const [answers, setAnswers]         = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [expandedQ, setExpandedQ]     = useState<string | null>(null);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !attemptId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Get attempt (with test metadata)
        const { data: attemptData, error: aErr } = await testsService.fetchExamAttempt(attemptId);
        if (aErr || !attemptData) throw new Error('Attempt not found or access denied.');
        setAttempt(attemptData);

        // 2. Get questions (correct_answer stripped for students automatically)
        const { data: qs, error: qErr } = await testsService.getQuestionsByTestId(attemptData.test_id);
        if (qErr) throw new Error('Failed to load questions.');
        setQuestions(qs || []);

        // 3. Get this attempt's answers
        const { answers: ans, error: ansErr } = await resultsService.getAttemptWithAnswers(attemptId);
        if (ansErr) throw new Error('Failed to load answers.');
        setAnswers(ans);

        // 4. Get leaderboard for rank
        const { data: lb } = await resultsService.getLeaderboardForTest(attemptData.test_id);
        setLeaderboard(lb || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load results.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [attemptId, user]);

  // ── Derived values ──────────────────────────────────────────────────────────
  if (loading) return <ResultSkeleton />;
  if (error)   return <ResultError message={error} onRetry={() => setLoading(true)} />;
  if (!attempt) return null;

  // We need test config from the joined data or need to fetch test separately
  // attempt doesn't have test config — we need to fetch it
  // For now, display what we have, with a follow-up fetch

  return <ResultContent
    attemptId={attemptId}
    attempt={attempt}
    questions={questions}
    answers={answers}
    leaderboard={leaderboard}
    userId={user?.id || ''}
    expandedQ={expandedQ}
    setExpandedQ={setExpandedQ}
    onBack={onBack}
  />;
};

// ─────────────────────────────────────────────────────────────────────────────
// ResultContent (inner, after data loaded)
// ─────────────────────────────────────────────────────────────────────────────

interface ContentProps {
  attemptId: string;
  attempt: any;
  questions: any[];
  answers: any[];
  leaderboard: any[];
  userId: string;
  expandedQ: string | null;
  setExpandedQ: (id: string | null) => void;
  onBack?: () => void;
}

const ResultContent: React.FC<ContentProps> = ({
  attempt, questions, answers, leaderboard, expandedQ, setExpandedQ, onBack
}) => {
  const [testConfig, setTestConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    testsService.getTestById(attempt.test_id).then(({ data }) => {
      setTestConfig(data);
      setLoadingConfig(false);
    });
  }, [attempt.test_id]);

  // Visibility / review mode
  const releaseMode:  any = testConfig?.result_release_mode  ?? 'immediately';
  const reviewMode:   ReviewMode = testConfig?.answer_review_mode ?? 'score_answers_explanations';
  const visibility:   string  = testConfig?.result_visibility ?? 'public';

  const resultStatus: ResultStatus = getResultStatus(
    releaseMode,
    testConfig?.results_released ?? false,
    testConfig?.expiry_time,
    attempt.started_at
  );

  const showAnswers      = canShowAnswers(reviewMode, resultStatus);
  const showExplanations = canShowExplanations(reviewMode, resultStatus);
  const showLeaderboard  = visibility !== 'private' && visibility !== 'creator_only' && resultStatus === 'released';

  // Score stats
  const score      = attempt.score ?? 0;
  const totalMarks = attempt.total_marks ?? 0;
  const percentage = pct(score, totalMarks);

  const correctCount   = answers.filter(a => a.is_correct).length;
  const answeredCount  = answers.length;
  const incorrectCount = answers.filter(a => !a.is_correct && a.answer_data && a.answer_data !== null).length;
  const unansweredCount = questions.length - answeredCount;

  // Rank
  const myRank = leaderboard.findIndex(a => a.id === attempt.id) + 1 || null;

  // Tie-break: same score, earlier submission = better rank (consistent with SQL RANK())
  const timeTaken = formatDuration(attempt.started_at, attempt.submitted_at);

  // Answer helpers
  const getAnswer = (qId: string) => answers.find(a => a.question_id === qId);

  const getCorrectText = (q: any): string => {
    if (!showAnswers) return '[Hidden]';
    if (q.type === 'mcq' || q.question_type === 'mcq') {
      const idx = q.correct_answer?.correctOptionIndex ?? q.mcqData?.correctOptionIndex ?? -1;
      const opts = Array.isArray(q.options) ? q.options
                 : Array.isArray(q.mcqData?.options) ? q.mcqData.options : [];
      return opts[idx] ?? 'N/A';
    }
    if (q.type === 'true-false' || q.question_type === 'true-false') {
      const val = q.correct_answer?.correctAnswer ?? q.trueFalseData?.correctAnswer;
      return val ? 'True' : 'False';
    }
    if (q.type === 'fillups' || q.question_type === 'fillups') {
      const ans = q.correct_answer?.answers ?? q.fillupsData?.answers ?? [];
      return Array.isArray(ans) ? ans.join(' / ') : String(ans);
    }
    if (q.type === 'coding' || q.question_type === 'coding') {
      return 'Evaluated by automated test cases';
    }
    return 'N/A';
  };

  const getStudentText = (ansObj: any): string => {
    if (!ansObj) return '[Not answered]';
    const data = ansObj.answer_data;
    if (data?.value) return String(data.value);
    if (data?.source_code) return '[Code submitted]';
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
  };

  // Grade badge
  const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B'
              : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';
  const gradeColor = percentage >= 70 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="w-full flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-md border border-slate-100 p-6 rounded-3xl shadow-sm">
        <div>
          {onBack && (
            <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-700 font-bold mb-2 flex items-center gap-1 cursor-pointer transition-colors">
              ← Back to Results
            </button>
          )}
          <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
            {loadingConfig ? '...' : (testConfig?.title ?? 'Result')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Submitted: {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'N/A'}
          </p>
        </div>
        {resultStatus === 'pending' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl">
            <Clock size={14} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700">Results Pending Release</span>
          </div>
        )}
      </div>

      {/* ── Result Not Yet Released ── */}
      {resultStatus === 'pending' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center flex flex-col items-center gap-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Lock size={28} />
          </div>
          <h3 className="font-display font-extrabold text-lg text-slate-900">Results Not Yet Released</h3>
          <p className="text-sm text-slate-500 max-w-md leading-relaxed font-medium">
            {releaseMode === 'manual_release'
              ? 'The test creator will manually release results. Check back later.'
              : 'Results will be available after the test concludes for all participants.'}
          </p>
          <div className="bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl text-xs font-mono text-slate-500">
            Attempt ID: {attempt.id}
          </div>
        </div>
      )}

      {/* ── Scores ── */}
      {resultStatus === 'released' && (
        <>
          {/* Score Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Score"
              value={fmt(score, totalMarks)}
              color="purple"
              icon={<Target size={16} />}
            />
            <MetricCard
              label="Percentage"
              value={`${percentage}%`}
              sub={`Grade: ${grade}`}
              color={percentage >= 70 ? 'emerald' : percentage >= 50 ? 'amber' : 'rose'}
              icon={<TrendingUp size={16} />}
            />
            <MetricCard
              label="Time Taken"
              value={timeTaken}
              color="indigo"
              icon={<Clock size={16} />}
            />
            {myRank && showLeaderboard ? (
              <MetricCard
                label="Rank"
                value={`#${myRank}`}
                sub={`of ${leaderboard.length}`}
                color="amber"
                icon={<Trophy size={16} />}
              />
            ) : (
              <MetricCard
                label="Warnings"
                value={String(attempt.warning_count ?? 0)}
                color={attempt.warning_count > 0 ? 'rose' : 'emerald'}
                icon={<AlertTriangle size={16} />}
              />
            )}
          </div>

          {/* Answer breakdown */}
          {reviewMode !== 'no_review' && (
            <div className="grid grid-cols-3 gap-4">
              <StatPill label="Correct" count={correctCount} total={questions.length}   color="emerald" icon={<CheckCircle2 size={14} />} />
              <StatPill label="Incorrect" count={incorrectCount} total={questions.length} color="rose"    icon={<XCircle size={14} />} />
              <StatPill label="Unanswered" count={unansweredCount} total={questions.length} color="slate"   icon={<MinusCircle size={14} />} />
            </div>
          )}

          {/* no_review mode: show only basic confirmation */}
          {reviewMode === 'no_review' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center flex flex-col items-center gap-3 shadow-sm">
              <CheckCircle2 size={36} className="text-emerald-500" />
              <h3 className="font-display font-extrabold text-lg text-slate-900">Test Submitted Successfully</h3>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed font-medium">
                Per exam settings, answer review and detailed explanations are hidden.
                Your score: <span className="font-black text-slate-800">{score} / {totalMarks}</span>
              </p>
            </div>
          )}

          {/* score_only: show score but not individual answers */}
          {reviewMode === 'score_only' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="font-display font-bold text-sm text-slate-700 mb-4 flex items-center gap-2">
                <EyeOff size={15} className="text-slate-400" />
                Answer review is restricted to score summary only.
              </h3>
              <div className="text-center py-6">
                <span className={`text-5xl font-black ${gradeColor}`}>{grade}</span>
                <p className="text-sm text-slate-500 mt-2 font-semibold">{percentage}% — {score} / {totalMarks} marks</p>
              </div>
            </div>
          )}

          {/* score_answers / score_answers_explanations: full review */}
          {(reviewMode === 'score_answers' || reviewMode === 'score_answers_explanations') && (
            <div className="flex flex-col gap-4">
              <h3 className="font-display font-bold text-sm text-slate-700 flex items-center gap-2 px-1">
                <Eye size={15} className="text-purple-600" />
                Question-Wise Review ({questions.length} Questions)
              </h3>

              {questions.map((q, idx) => {
                const ansObj   = getAnswer(q.id);
                const isCorrect = ansObj?.is_correct ?? false;
                const marksAw  = ansObj?.marks_awarded ?? 0;
                const answered  = !!ansObj;
                const studentText = getStudentText(ansObj);
                const correctText = getCorrectText(q);
                const isExpanded  = expandedQ === q.id;
                const qMarks = q.marks ?? q.points ?? 5;

                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`bg-white border rounded-3xl overflow-hidden shadow-sm transition-all ${
                      !answered ? 'border-slate-100' :
                      isCorrect ? 'border-emerald-100' : 'border-rose-100'
                    }`}
                  >
                    {/* Summary row (always visible) */}
                    <button
                      className="w-full p-5 flex items-start justify-between gap-4 text-left cursor-pointer hover:bg-slate-50/50 transition-colors"
                      onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Status icon */}
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          !answered ? 'bg-slate-100 text-slate-400' :
                          isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {!answered ? <MinusCircle size={14} /> :
                           isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Q{idx + 1} · {(q.question_type || q.type)?.replace('-', ' ').toUpperCase()}
                          </span>
                          <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-0.5 line-clamp-2">
                            {q.question_text || q.text}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                          !answered ? 'bg-slate-100 text-slate-500' :
                          isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {marksAw > 0 ? `+${marksAw}` : marksAw < 0 ? marksAw : '0'} / {qMarks}
                        </span>
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 border-t border-slate-50 pt-4 flex flex-col gap-4">
                            {/* Your answer vs correct answer */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Your Answer</span>
                                <span className={`font-bold ${
                                  !answered ? 'text-slate-400 italic' :
                                  isCorrect ? 'text-emerald-700' : 'text-rose-700'
                                }`}>
                                  {studentText}
                                </span>
                              </div>
                              {showAnswers && (
                                <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                                  <span className="text-[9px] font-bold text-emerald-600 uppercase block mb-1">Correct Answer</span>
                                  <span className="font-bold text-emerald-700">{correctText}</span>
                                </div>
                              )}
                            </div>

                            {/* Coding special display */}
                            {(q.type === 'coding' || q.question_type === 'coding') && ansObj && (
                              <div className="p-3 bg-slate-900 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                  <Code2 size={12} className="text-purple-400" />
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Submitted Code</span>
                                </div>
                                <pre className="text-[10px] text-purple-200 font-mono overflow-x-auto">
                                  {ansObj.answer_data?.source_code || ansObj.answer_data?.value || '[No code submitted]'}
                                </pre>
                                {ansObj.answer_data?.passed_test_cases !== undefined && (
                                  <div className="mt-2 text-[9px] text-slate-400 font-bold">
                                    Test Cases: {ansObj.answer_data.passed_test_cases} / {ansObj.answer_data.total_test_cases} passed
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Explanation */}
                            {showExplanations && q.explanation && (
                              <div className="p-3.5 bg-purple-50/30 border border-purple-100/40 rounded-2xl flex gap-3">
                                <HelpCircle size={14} className="text-purple-600 shrink-0 mt-0.5" />
                                <div className="text-[10px] text-slate-600 leading-relaxed">
                                  <span className="font-bold text-purple-700 block mb-0.5">Explanation:</span>
                                  {q.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Leaderboard */}
          {showLeaderboard && leaderboard.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
              <h3 className="font-display font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                <Users size={15} className="text-amber-500" />
                Test Leaderboard
              </h3>
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {leaderboard.map((lb: any, idx: number) => {
                  const isMe      = lb.id === attempt.id;
                  const rankNum   = idx + 1;
                  const name      = testConfig?.result_visibility === 'public'
                    ? (lb.profiles?.full_name || 'Challenger')
                    : anonymousId(lb.user_id);
                  const lbScore   = lb.score ?? 0;
                  const lbTotal   = lb.total_marks ?? totalMarks;
                  const lbPct     = pct(lbScore, lbTotal);

                  return (
                    <div
                      key={lb.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                        isMe ? 'border-purple-200 bg-purple-50/40 ring-1 ring-purple-500/20' : 'border-slate-100 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                          rankNum === 1 ? 'bg-amber-100 text-amber-600' :
                          rankNum === 2 ? 'bg-slate-150 text-slate-500' :
                          rankNum === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {rankNum}
                        </div>
                        <span className={`text-xs font-bold ${isMe ? 'text-purple-700' : 'text-slate-700'}`}>
                          {name} {isMe && <span className="text-[9px] text-purple-500 ml-1">(You)</span>}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-800">{lbScore}</span>
                        <span className="text-[10px] text-slate-400 ml-1">pts · {lbPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const MetricCard: React.FC<{
  label: string; value: string; sub?: string;
  color: string; icon: React.ReactNode;
}> = ({ label, value, sub, color, icon }) => {
  const colors: Record<string, string> = {
    purple:  'bg-purple-50 text-purple-600 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
    rose:    'bg-rose-50 text-rose-600 border-rose-100',
    indigo:  'bg-indigo-50 text-indigo-600 border-indigo-100',
    slate:   'bg-slate-50 text-slate-600 border-slate-100',
  };

  return (
    <div className={`p-4 rounded-2xl border bg-white flex flex-col gap-1 shadow-sm ${colors[color]?.split(' ')[2] || 'border-slate-100'}`}>
      <div className={`flex items-center gap-1.5 ${colors[color]?.split(' ')[1] || 'text-slate-600'}`}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-black text-slate-900">{value}</span>
      {sub && <span className="text-[10px] text-slate-400 font-semibold">{sub}</span>}
    </div>
  );
};

const StatPill: React.FC<{
  label: string; count: number; total: number; color: string; icon: React.ReactNode;
}> = ({ label, count, total, color, icon }) => {
  const p = total > 0 ? Math.round((count / total) * 100) : 0;
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    rose:    'bg-rose-50 border-rose-100 text-rose-700',
    slate:   'bg-slate-50 border-slate-100 text-slate-600',
    amber:   'bg-amber-50 border-amber-100 text-amber-700',
  };

  return (
    <div className={`p-4 rounded-2xl border flex flex-col gap-1.5 shadow-sm bg-white ${colors[color]?.split(' ')[2] || 'border-slate-100'}`}>
      <div className={`flex items-center gap-1.5 ${colors[color]?.split(' ')[2] || 'text-slate-600'}`}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xl font-black text-slate-900">{count}</span>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color === 'emerald' ? 'bg-emerald-500' : color === 'rose' ? 'bg-rose-500' : 'bg-slate-400'}`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
};

const ResultSkeleton: React.FC = () => (
  <div className="w-full flex flex-col gap-6 animate-pulse">
    <div className="h-24 bg-slate-100 rounded-3xl" />
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
    </div>
    <div className="h-64 bg-slate-100 rounded-3xl" />
  </div>
);

const ResultError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 text-center flex flex-col items-center gap-4">
    <AlertTriangle size={32} className="text-rose-500" />
    <h3 className="font-display font-bold text-slate-900">Failed to Load Results</h3>
    <p className="text-sm text-slate-500">{message}</p>
    <button
      onClick={onRetry}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
    >
      <RefreshCw size={12} /> Retry
    </button>
  </div>
);

export default ResultPage;
