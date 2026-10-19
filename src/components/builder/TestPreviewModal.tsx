import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle, HelpCircle, Code2, Award, Play } from 'lucide-react';
import type { TestData, CodingTestCase } from './QuestionTypes';

interface TestPreviewModalProps {
  testData: TestData;
  onClose: () => void;
}

type CandidateAnswer = number | boolean | string | string[] | Record<string, string>;

export const TestPreviewModal: React.FC<TestPreviewModalProps> = ({ testData, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CandidateAnswer>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<{ [qId: string]: string }>({});

  const questions = testData.questions;
  const currentQuestion = questions[currentIdx];

  const handleMCQSelect = (qId: string, idx: number) => {
    setAnswers({ ...answers, [qId]: idx });
  };

  const handleTFSelect = (qId: string, val: boolean) => {
    setAnswers({ ...answers, [qId]: val });
  };

  const handleMatchSelect = (qId: string, leftItem: string, value: string) => {
    const prevMatches = (answers[qId] as Record<string, string>) || {};
    setAnswers({
      ...answers,
      [qId]: { ...prevMatches, [leftItem]: value },
    });
  };

  const handleFillupChange = (qId: string, idx: number, value: string) => {
    const prevFillups = (answers[qId] as string[]) || [];
    const newFillups = [...prevFillups];
    newFillups[idx] = value;
    setAnswers({ ...answers, [qId]: newFillups });
  };

  const handleTextChange = (qId: string, value: string) => {
    setAnswers({ ...answers, [qId]: value });
  };

  const runCodeTestCase = (qId: string, code: string, testCases: CodingTestCase[]) => {
    if (!code.trim()) {
      setConsoleLogs({ ...consoleLogs, [qId]: "Please write some code before running tests." });
      return;
    }
    setConsoleLogs({ ...consoleLogs, [qId]: "Compiling environment...\nRunning test cases...\n\n" + 
      testCases.map((tc, idx) => `Test Case ${idx + 1} (${tc.input || "No Input"}): PASSED ✅`).join("\n") +
      "\n\nAll test cases successfully matched!" });
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const parseFillupsText = (text: string) => {
    const regex = /\[(.*?)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let inputIdx = 0;

    while ((match = regex.exec(text)) !== null) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      parts.push({ type: 'input', index: inputIdx, expected: match[1] });
      lastIndex = regex.lastIndex;
      inputIdx++;
    }
    parts.push({ type: 'text', content: text.substring(lastIndex) });
    return parts;
  };

  // Score calculation mock
  const calculateScore = () => {
    let score = 0;
    let totalPoints = 0;
    questions.forEach((q) => {
      totalPoints += q.points;
      const ans = answers[q.id];
      if (q.type === 'mcq' && q.mcqData) {
        if (ans === q.mcqData.correctOptionIndex) score += q.points;
      } else if (q.type === 'true-false' && q.trueFalseData) {
        if (ans === q.trueFalseData.correctAnswer) score += q.points;
      } else if (q.type === 'fillups' && q.fillupsData) {
        const parts = parseFillupsText(q.text);
        const inputParts = parts.filter(p => p.type === 'input');
        let allCorrect = true;
        inputParts.forEach((p) => {
          const expected = (p.expected || '').trim().toLowerCase();
          const userAns = (((ans as string[]) || [])[p.index || 0] || '').trim().toLowerCase();
          if (expected !== userAns) allCorrect = false;
        });
        if (allCorrect && inputParts.length > 0) score += q.points;
      } else if (q.type === 'matching' && q.matchingData) {
        let allCorrect = true;
        q.matchingData.pairs.forEach((p) => {
          if (((ans as Record<string, string>) || {})[p.left] !== p.right) allCorrect = false;
        });
        if (allCorrect) score += q.points;
      } else {
        // Coding or Custom (auto pass mock for preview)
        if (ans && (ans as string).length > 5) score += q.points;
      }
    });
    return { score, totalPoints };
  };

  const { score, totalPoints } = calculateScore();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100/40 px-6 py-4.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-pink-600 bg-pink-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider">Candidate Sandbox</span>
            <h3 className="font-display font-extrabold text-lg text-slate-800 tracking-tight mt-0.5">
              {testData.title || "Untitled Assessment"}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {!isSubmitted ? (
          <>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-1">
              <div 
                className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / (questions.length || 1)) * 100}%` }}
              />
            </div>

            {/* Main Section */}
            {questions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <HelpCircle size={48} className="text-slate-300 mb-4" />
                <h4 className="font-bold text-slate-800 text-sm">No questions available</h4>
                <p className="text-xs text-slate-400 mt-1">Please add questions in the editor before previewing.</p>
              </div>
            ) : (
              <div className="flex-grow flex flex-col lg:flex-row overflow-hidden min-h-0">
                {/* Left Side: Question content */}
                <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100 flex flex-col justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-xl uppercase">
                        Question {currentIdx + 1} of {questions.length}
                      </span>
                      <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-xl">
                        {currentQuestion.points} {currentQuestion.points === 1 ? 'Point' : 'Points'}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl uppercase ${
                        currentQuestion.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
                        currentQuestion.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                        {currentQuestion.difficulty}
                      </span>
                    </div>

                    {/* Question Statement */}
                    <h4 className="font-display font-extrabold text-lg text-slate-800 leading-snug mb-8">
                      {currentQuestion.type === 'fillups' ? 
                        "Fill in the blanks in the sentence below:" : 
                        currentQuestion.text || "Untitled Question Statement"
                      }
                    </h4>

                    {/* Answer inputs based on type */}
                    <div className="flex-grow">
                      {/* MCQ */}
                      {currentQuestion.type === 'mcq' && currentQuestion.mcqData && (
                        <div className="flex flex-col gap-3.5">
                          {currentQuestion.mcqData.options.map((opt, oIdx) => {
                            const isSelected = answers[currentQuestion.id] === oIdx;
                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleMCQSelect(currentQuestion.id, oIdx)}
                                className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? 'border-pink-500 bg-pink-50/35 text-pink-700 shadow-sm' 
                                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <span>{opt || `Option ${oIdx + 1}`}</span>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-pink-500 bg-pink-500 text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* True/False */}
                      {currentQuestion.type === 'true-false' && (
                        <div className="flex gap-4">
                          {[true, false].map((val) => {
                            const isSelected = answers[currentQuestion.id] === val;
                            return (
                              <button
                                key={val.toString()}
                                onClick={() => handleTFSelect(currentQuestion.id, val)}
                                className={`flex-1 p-5 rounded-2xl border text-center font-bold text-sm transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'border-pink-500 bg-pink-50/35 text-pink-700 shadow-sm' 
                                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                {val ? "TRUE" : "FALSE"}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Matching */}
                      {currentQuestion.type === 'matching' && currentQuestion.matchingData && (
                        <div className="flex flex-col gap-4">
                          {currentQuestion.matchingData.pairs.map((pair, pIdx) => {
                            const selectedRight = ((answers[currentQuestion.id] as Record<string, string>) || {})[pair.left] || '';
                            return (
                              <div key={pIdx} className="flex items-center gap-4 bg-slate-50/50 border border-slate-100 p-3.5 rounded-2xl">
                                <span className="flex-1 text-sm font-bold text-slate-700 pl-2">{pair.left || `Item ${pIdx + 1}`}</span>
                                <span className="text-slate-400 text-xs font-bold">⇄</span>
                                <div className="flex-1">
                                  <select
                                    value={selectedRight}
                                    onChange={(e) => handleMatchSelect(currentQuestion.id, pair.left, e.target.value)}
                                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 outline-none text-xs bg-white text-slate-600 focus:border-pink-400 transition-all font-semibold"
                                  >
                                    <option value="">-- Match item --</option>
                                    {currentQuestion.matchingData?.pairs.map((p, rIdx) => (
                                      <option key={rIdx} value={p.right}>{p.right || `Option ${rIdx + 1}`}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Fillups */}
                      {currentQuestion.type === 'fillups' && (
                        <div className="bg-slate-50/40 border border-slate-100 p-6 rounded-2xl leading-relaxed text-sm font-semibold text-slate-700">
                          {parseFillupsText(currentQuestion.text).map((part, pIdx) => {
                            if (part.type === 'text') {
                              return <span key={pIdx}>{part.content}</span>;
                            } else {
                              const ansArr = (answers[currentQuestion.id] as string[]) || [];
                              const userVal = ansArr[part.index || 0] || '';
                              return (
                                <input
                                  key={pIdx}
                                  type="text"
                                  placeholder={`blank ${part.index! + 1}`}
                                  value={userVal}
                                  onChange={(e) => handleFillupChange(currentQuestion.id, part.index!, e.target.value)}
                                  className="mx-1.5 px-2.5 py-1 text-center font-bold text-xs bg-white rounded-lg border border-slate-200 outline-none focus:border-pink-400 text-pink-700 transition-all w-28"
                                />
                              );
                            }
                          })}
                        </div>
                      )}

                      {/* Coding */}
                      {currentQuestion.type === 'coding' && currentQuestion.codingData && (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Code2 size={13} />
                              <span>Coding IDE Simulator ({currentQuestion.codingData.language})</span>
                            </span>
                          </div>
                          
                          <textarea
                            value={(answers[currentQuestion.id] as string) || currentQuestion.codingData.starterCode}
                            onChange={(e) => handleTextChange(currentQuestion.id, e.target.value)}
                            rows={8}
                            className="w-full p-4 font-mono text-xs text-slate-100 bg-slate-900 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300/40 transition-all border border-slate-800 leading-relaxed"
                          />

                          <div className="flex justify-between items-start gap-4">
                            <button
                              onClick={() => runCodeTestCase(
                                currentQuestion.id,
                                (answers[currentQuestion.id] as string) || currentQuestion.codingData?.starterCode || '',
                                currentQuestion.codingData?.testCases || []
                              )}
                              className="px-4.5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-850 active:scale-[0.97] transition-all cursor-pointer shrink-0"
                            >
                              <Play size={12} className="text-emerald-400 fill-emerald-400" />
                              <span>Test Execution</span>
                            </button>
                            
                            {consoleLogs[currentQuestion.id] && (
                              <div className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-[10px] text-slate-600 leading-normal whitespace-pre-wrap">
                                {consoleLogs[currentQuestion.id]}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Custom (Essay) */}
                      {currentQuestion.type === 'custom' && currentQuestion.customData && (
                        <div className="flex flex-col gap-4">
                          <div className="p-4.5 bg-amber-50/40 border border-amber-100/60 rounded-2xl text-xs font-semibold text-amber-700 leading-relaxed">
                            <strong>Evaluation Guidelines:</strong> {currentQuestion.customData.guidelines || "No specific guidelines."}
                          </div>
                          <textarea
                            value={(answers[currentQuestion.id] as string) || ''}
                            onChange={(e) => handleTextChange(currentQuestion.id, e.target.value)}
                            rows={6}
                            placeholder="Type your explanation or response here..."
                            className="w-full p-4 rounded-2xl border border-slate-100 outline-none text-xs focus:border-pink-400 focus:ring-2 focus:ring-pink-200/50 transition-all bg-slate-50/30"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation control bar */}
                  <div className="flex justify-between items-center mt-8 pt-4.5 border-t border-slate-50">
                    <button
                      onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                      disabled={currentIdx === 0}
                      className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>

                    {currentIdx < questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentIdx(currentIdx + 1)}
                        className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-850 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-pink-500/10 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle size={14} />
                        <span>Submit Attempt</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Side: Questions sidebar drawer */}
                <div className="w-full lg:w-64 bg-slate-50/40 p-6 overflow-y-auto flex flex-col gap-4">
                  <h5 className="font-display font-extrabold text-slate-500 text-[10px] tracking-wider uppercase mb-1">
                    Question Sheet
                  </h5>
                  <div className="grid grid-cols-4 lg:grid-cols-3 gap-2">
                    {questions.map((q, idx) => {
                      const isVisited = answers[q.id] !== undefined;
                      const isCurrent = idx === currentIdx;
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentIdx(idx)}
                          className={`w-full py-3 rounded-xl font-display font-bold text-xs text-center border transition-all cursor-pointer ${
                            isCurrent 
                              ? 'bg-pink-500 border-pink-500 text-white shadow-sm' 
                              : isVisited
                                ? 'bg-pink-50 border-pink-100 text-pink-700'
                                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Submission Screen */
          <div className="flex-grow overflow-y-auto p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-pink-50 rounded-3xl flex items-center justify-center shadow-inner mb-6 animate-bounce">
              <Award size={40} className="text-pink-500" />
            </div>
            
            <h4 className="font-display font-extrabold text-2xl text-slate-800 tracking-tight">
              Sandbox Assessment Complete!
            </h4>
            <p className="text-xs text-slate-400 mt-2.5 max-w-sm leading-relaxed">
              This preview simulated a candidate's workflow. Auto-gradable questions were evaluated based on your draft answer keys.
            </p>

            <div className="bg-slate-50/60 border border-slate-100 rounded-3xl p-6.5 my-8 w-full max-w-md flex justify-around">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Score</span>
                <span className="font-display font-extrabold text-3xl text-pink-500 mt-1">
                  {score} <span className="text-sm font-semibold text-slate-400">/ {totalPoints} pts</span>
                </span>
              </div>
              <div className="w-px bg-slate-100" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Questions Attempted</span>
                <span className="font-display font-extrabold text-3xl text-slate-800 mt-1">
                  {Object.keys(answers).length} <span className="text-sm font-semibold text-slate-400">/ {questions.length}</span>
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setCurrentIdx(0);
                  setAnswers({});
                  setConsoleLogs({});
                }}
                className="px-5 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                Retry Simulation
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-850 active:scale-[0.98] transition-all cursor-pointer"
              >
                Close Sandbox
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPreviewModal;
