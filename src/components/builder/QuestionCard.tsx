import React, { useRef } from 'react';
import { GripVertical, Trash2, CheckCircle2, Plus, X, Copy, Eye, EyeOff, Lock } from 'lucide-react';
import type { Question, CodingTestCase, CodingData } from './QuestionTypes';

interface QuestionCardProps {
  question: Question;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updatedQuestion: Question) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  isActive,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDragEnd,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const updateField = <K extends keyof Question>(field: K, value: Question[K]) => {
    onUpdate({ ...question, [field]: value });
  };

  const handleMCQOptionChange = (optIdx: number, val: string) => {
    if (!question.mcqData) return;
    const newOptions = [...question.mcqData.options];
    newOptions[optIdx] = val;
    onUpdate({
      ...question,
      mcqData: { ...question.mcqData, options: newOptions },
    });
  };

  const addMCQOption = () => {
    if (!question.mcqData) return;
    onUpdate({
      ...question,
      mcqData: {
        ...question.mcqData,
        options: [...question.mcqData.options, ''],
      },
    });
  };

  const removeMCQOption = (optIdx: number) => {
    if (!question.mcqData) return;
    if (question.mcqData.options.length <= 2) return;
    const newOptions = question.mcqData.options.filter((_, idx) => idx !== optIdx);
    let correctIdx = question.mcqData.correctOptionIndex;
    if (correctIdx >= newOptions.length) {
      correctIdx = 0;
    }
    onUpdate({
      ...question,
      mcqData: { options: newOptions, correctOptionIndex: correctIdx },
    });
  };

  const setMCQCorrectOption = (optIdx: number) => {
    if (!question.mcqData) return;
    onUpdate({
      ...question,
      mcqData: { ...question.mcqData, correctOptionIndex: optIdx },
    });
  };

  // Matching actions
  const handleMatchPairChange = (pIdx: number, key: 'left' | 'right', val: string) => {
    if (!question.matchingData) return;
    const newPairs = [...question.matchingData.pairs];
    newPairs[pIdx] = { ...newPairs[pIdx], [key]: val };
    onUpdate({
      ...question,
      matchingData: { pairs: newPairs },
    });
  };

  const addMatchPair = () => {
    if (!question.matchingData) return;
    onUpdate({
      ...question,
      matchingData: {
        pairs: [...question.matchingData.pairs, { left: '', right: '' }],
      },
    });
  };

  const removeMatchPair = (pIdx: number) => {
    if (!question.matchingData) return;
    if (question.matchingData.pairs.length <= 1) return;
    const newPairs = question.matchingData.pairs.filter((_, idx) => idx !== pIdx);
    onUpdate({
      ...question,
      matchingData: { pairs: newPairs },
    });
  };

  // Coding actions
  const updateCodingField = <K extends keyof CodingData>(key: K, val: CodingData[K]) => {
    if (!question.codingData) return;
    onUpdate({
      ...question,
      codingData: { ...question.codingData, [key]: val },
    });
  };

  const updateTestCase = (tcIdx: number, key: keyof CodingTestCase, val: string, isHidden = false) => {
    if (!question.codingData) return;
    if (isHidden) {
      const newTCs = [...(question.codingData.hiddenTestCases || [])];
      newTCs[tcIdx] = { ...newTCs[tcIdx], [key]: val, isHidden: true };
      updateCodingField('hiddenTestCases', newTCs);
    } else {
      const newTCs = [...question.codingData.testCases];
      newTCs[tcIdx] = { ...newTCs[tcIdx], [key]: val };
      updateCodingField('testCases', newTCs);
    }
  };

  const addTestCase = (isHidden = false) => {
    if (!question.codingData) return;
    if (isHidden) {
      updateCodingField('hiddenTestCases', [
        ...(question.codingData.hiddenTestCases || []),
        { input: '', expectedOutput: '', isHidden: true },
      ]);
    } else {
      updateCodingField('testCases', [
        ...question.codingData.testCases,
        { input: '', expectedOutput: '' },
      ]);
    }
  };

  const removeTestCase = (tcIdx: number, isHidden = false) => {
    if (!question.codingData) return;
    if (isHidden) {
      const list = question.codingData.hiddenTestCases || [];
      if (list.length <= 1) return;
      updateCodingField('hiddenTestCases', list.filter((_, idx) => idx !== tcIdx));
    } else {
      if (question.codingData.testCases.length <= 1) return;
      updateCodingField('testCases', question.codingData.testCases.filter((_, idx) => idx !== tcIdx));
    }
  };

  // Fillups actions
  const handleFillupTextChange = (val: string) => {
    const regex = /\[(.*?)\]/g;
    const answers: string[] = [];
    let match;
    while ((match = regex.exec(val)) !== null) {
      answers.push(match[1]);
    }
    onUpdate({
      ...question,
      text: val,
      fillupsData: { sentence: val, answers },
    });
  };

  // Custom actions
  const handleCustomGuidelinesChange = (val: string) => {
    onUpdate({
      ...question,
      customData: { guidelines: val },
    });
  };

  const handleTrueFalseChange = (val: boolean) => {
    onUpdate({
      ...question,
      trueFalseData: { correctAnswer: val },
    });
  };

  return (
    <div
      ref={cardRef}
      draggable={!isActive}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={`relative rounded-3xl border transition-all duration-300 ${
        isActive
          ? 'border-pink-300 bg-white shadow-xl shadow-pink-100/15 -translate-y-0.5'
          : 'border-slate-100 hover:border-slate-200 bg-white/70 hover:bg-white shadow-sm'
      }`}
    >
      {/* Top Card Controls (Drag bar / delete / edit toggle) */}
      <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-50">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div
            className={`cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-slate-350 hover:bg-slate-50 transition-colors ${
              isActive ? 'opacity-40 pointer-events-none' : ''
            }`}
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>
          
          <span className="font-display font-extrabold text-xs text-slate-700">
            Q{index + 1}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full">
            {question.type}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Points */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Pts:</span>
            {isActive ? (
              <input
                type="number"
                min={1}
                max={100}
                value={question.points}
                onChange={(e) => updateField('points', parseInt(e.target.value) || 1)}
                className="w-10 bg-transparent text-xs font-bold text-slate-800 focus:outline-none text-center"
              />
            ) : (
              <span className="text-xs font-bold text-slate-700">{question.points}</span>
            )}
          </div>

          {/* Difficulty badge */}
          {isActive ? (
            <select
              value={question.difficulty}
              onChange={(e) => updateField('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}
              className="py-0.5 px-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-600 font-bold outline-none uppercase"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          ) : (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${
              question.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
              question.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
              'bg-rose-50 text-rose-600'
            }`}>
              {question.difficulty}
            </span>
          )}

          <div className="w-px h-4 bg-slate-100 mx-1" />

          {/* Duplicate Action */}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors mr-1"
              title="Duplicate Question"
            >
              <Copy size={15} />
            </button>
          )}

          {/* Delete Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete Question"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Main card body */}
      <div className="p-6 cursor-pointer" onClick={!isActive ? onSelect : undefined}>
        {isActive ? (
          /* Active Edit Mode Screen */
          <div className="flex flex-col gap-5">
            {/* Question Text input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Question Statement
              </label>
              {question.type === 'fillups' ? (
                <div className="flex flex-col gap-1.5">
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter sentence with blanks in brackets, e.g. [Vite] is a [Fast] frontend dev tool."
                    value={question.text}
                    onChange={(e) => handleFillupTextChange(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-pink-400 transition-all font-semibold"
                  />
                  <span className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                    ℹ️ Use square brackets `[blank]` to declare dynamic text slots.
                  </span>
                </div>
              ) : (
                <textarea
                  required
                  rows={2}
                  placeholder="Type the question content here..."
                  value={question.text}
                  onChange={(e) => updateField('text', e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-pink-400 transition-all font-semibold"
                />
              )}
            </div>

            {/* MCQ Option Builder */}
            {question.type === 'mcq' && question.mcqData && (
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Multiple Choices & Correct Key
                </label>
                <div className="flex flex-col gap-2.5">
                  {question.mcqData.options.map((opt, oIdx) => {
                    const isCorrect = question.mcqData?.correctOptionIndex === oIdx;
                    return (
                      <div key={oIdx} className="flex items-center gap-3">
                        {/* Radio select correct key */}
                        <button
                          onClick={() => setMCQCorrectOption(oIdx)}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
                          }`}
                          title="Set as Correct Key"
                        >
                          {isCorrect && <div className="w-2 h-2 bg-white rounded-full" />}
                        </button>

                        <input
                          type="text"
                          required
                          value={opt}
                          placeholder={`Option ${oIdx + 1}`}
                          onChange={(e) => handleMCQOptionChange(oIdx, e.target.value)}
                          className="flex-1 py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs focus:border-pink-400 transition-all font-semibold"
                        />

                        {question.mcqData!.options.length > 2 && (
                          <button
                            onClick={() => removeMCQOption(oIdx)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={addMCQOption}
                  className="mt-2 text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1.5 outline-none hover:underline"
                >
                  <Plus size={14} />
                  <span>Add Option</span>
                </button>
              </div>
            )}

            {/* True/False Input */}
            {question.type === 'true-false' && question.trueFalseData && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Correct Answer
                </label>
                <div className="flex gap-4">
                  {[true, false].map((val) => {
                    const isSelected = question.trueFalseData?.correctAnswer === val;
                    return (
                      <button
                        key={val.toString()}
                        onClick={() => handleTrueFalseChange(val)}
                        className={`flex-1 py-2.5 px-4 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm' 
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        {val ? "TRUE" : "FALSE"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Matching Pair Builder */}
            {question.type === 'matching' && question.matchingData && (
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Match Pairs (Left-hand matches Right-hand)
                </label>
                <div className="flex flex-col gap-3">
                  {question.matchingData.pairs.map((pair, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-3">
                      <input
                        type="text"
                        required
                        value={pair.left}
                        placeholder={`Left Key ${pIdx + 1}`}
                        onChange={(e) => handleMatchPairChange(pIdx, 'left', e.target.value)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs focus:border-pink-400 transition-all font-semibold"
                      />
                      <span className="text-slate-400 text-xs font-bold">⇄</span>
                      <input
                        type="text"
                        required
                        value={pair.right}
                        placeholder={`Right Val ${pIdx + 1}`}
                        onChange={(e) => handleMatchPairChange(pIdx, 'right', e.target.value)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs focus:border-pink-400 transition-all font-semibold"
                      />

                      {question.matchingData!.pairs.length > 1 && (
                        <button
                          onClick={() => removeMatchPair(pIdx)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addMatchPair}
                  className="mt-2 text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1.5 outline-none hover:underline"
                >
                  <Plus size={14} />
                  <span>Add Pair</span>
                </button>
              </div>
            )}

            {/* Coding Details Editor */}
            {question.type === 'coding' && question.codingData && (() => {
              const [tcTab, setTcTab] = React.useState<'public' | 'hidden'>('public');
              const LANGS = ['javascript','python','cpp','java','typescript','go','rust','csharp'];
              const selectedLangs = question.codingData.languages || [question.codingData.language || 'javascript'];
              
              return (
                <div className="flex flex-col gap-4">
                  {/* Language multi-select */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Allowed Languages</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGS.map(lang => {
                        const isSelected = selectedLangs.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? selectedLangs.filter(l => l !== lang)
                                : [...selectedLangs, lang];
                              updateCodingField('languages', next.length > 0 ? next : [lang]);
                              if (!isSelected && !question.codingData?.language) {
                                updateCodingField('language', lang);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase transition-all cursor-pointer ${
                              isSelected
                                ? 'border-pink-400 bg-pink-50/50 text-pink-700'
                                : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Starter Code */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Starter Boilerplate</label>
                    <textarea
                      rows={4}
                      value={question.codingData.starterCode}
                      onChange={(e) => updateCodingField('starterCode', e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 outline-none text-xs font-mono bg-slate-50 text-slate-700 focus:bg-white focus:border-pink-400 transition-all leading-normal"
                    />
                  </div>

                  {/* Problem Metadata */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Input Format', 'inputFormat'],
                      ['Output Format', 'outputFormat'],
                      ['Constraints', 'constraints'],
                      ['Sample Input', 'sampleInput'],
                      ['Sample Output', 'sampleOutput'],
                    ].map(([label, field]) => (
                      <div key={field} className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</label>
                        <textarea
                          rows={2}
                          value={(question.codingData as any)[field] || ''}
                          onChange={(e) => updateCodingField(field as keyof CodingData, e.target.value as any)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 outline-none text-xs font-mono bg-slate-50 text-slate-700 focus:bg-white focus:border-pink-400 transition-all leading-normal"
                          placeholder={label}
                        />
                      </div>
                    ))}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Time Limit (sec)</label>
                      <input
                        type="number" min={1} max={10}
                        value={question.codingData.timeLimit || 5}
                        onChange={(e) => updateCodingField('timeLimit', Number(e.target.value) as any)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 outline-none text-xs bg-slate-50 focus:border-pink-400"
                      />
                    </div>
                  </div>

                  {/* Test Cases Tabs */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTcTab('public')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                          tcTab === 'public' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <Eye size={10} />
                        <span>Public ({question.codingData.testCases.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTcTab('hidden')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                          tcTab === 'hidden' ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <Lock size={10} />
                        <span>Hidden ({(question.codingData.hiddenTestCases || []).length})</span>
                      </button>
                    </div>

                    {tcTab === 'hidden' && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 border border-rose-100 rounded-xl text-[9px] text-rose-600 font-semibold">
                        <EyeOff size={10} />
                        Hidden test cases are NEVER sent to students — only evaluated server-side via Judge0.
                      </div>
                    )}

                    {/* Test Case List */}
                    <div className="flex flex-col gap-2.5">
                      {(tcTab === 'public' ? question.codingData.testCases : (question.codingData.hiddenTestCases || [])).map((tc, tcIdx) => (
                        <div key={tcIdx} className="flex items-start gap-2">
                          <div className="flex flex-col gap-1 flex-1">
                            <input
                              type="text"
                              value={tc.input}
                              placeholder={`Input ${tcIdx + 1}`}
                              onChange={(e) => updateTestCase(tcIdx, 'input', e.target.value, tcTab === 'hidden')}
                              className="w-full py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs focus:border-pink-400 font-mono"
                            />
                            <input
                              type="text"
                              value={tc.expectedOutput}
                              placeholder={`Expected Output ${tcIdx + 1}`}
                              onChange={(e) => updateTestCase(tcIdx, 'expectedOutput', e.target.value, tcTab === 'hidden')}
                              className="w-full py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs focus:border-pink-400 font-mono"
                            />
                          </div>
                          <button
                            onClick={() => removeTestCase(tcIdx, tcTab === 'hidden')}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors mt-1"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addTestCase(tcTab === 'hidden')}
                      className={`mt-1 text-xs font-bold flex items-center gap-1.5 outline-none hover:underline ${
                        tcTab === 'hidden' ? 'text-rose-600 hover:text-rose-700' : 'text-pink-600 hover:text-pink-700'
                      }`}
                    >
                      <Plus size={14} />
                      <span>Add {tcTab === 'hidden' ? 'Hidden' : 'Public'} Test Case</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Custom Guidelines Editor */}
            {question.type === 'custom' && question.customData && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Grading Guidelines / Expected Answer criteria
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain what markers should look for in candidates' answers..."
                  value={question.customData.guidelines}
                  onChange={(e) => handleCustomGuidelinesChange(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-pink-400 transition-all font-semibold"
                />
              </div>
            )}

            {/* Image Editor */}
            {question.type === 'image' && (
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Image Attachment Gradient Preview
                </label>
                <div className="flex gap-2">
                  <select
                    value={question.imageUrl || 'from-blue-500 to-indigo-500'}
                    onChange={(e) => updateField('imageUrl', e.target.value)}
                    className="flex-grow py-2.5 px-3 rounded-xl border border-slate-200 outline-none text-xs bg-white text-slate-650 font-semibold"
                  >
                    <option value="from-blue-500 to-indigo-500">Math Graph (Blue-Indigo)</option>
                    <option value="from-emerald-500 to-teal-500">Biology/Science Diagram (Emerald-Teal)</option>
                    <option value="from-pink-500 to-rose-500">Standard Pattern (Pink-Rose)</option>
                    <option value="from-indigo-500 to-pink-500">Tech Architecture Diagram (Indigo-Pink)</option>
                    <option value="from-amber-500 to-orange-500">Historical Map (Amber-Orange)</option>
                    <option value="from-purple-500 to-violet-500">Conceptual Diagram (Purple-Violet)</option>
                  </select>
                </div>
                <div className={`mt-1.5 h-20 bg-gradient-to-r ${question.imageUrl || 'from-blue-500 to-indigo-500'} rounded-xl border border-transparent p-3 text-white font-extrabold flex items-center justify-between text-[10px]`}>
                  <span>Live Preview Block</span>
                </div>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                // Clear selection by updating nothing (handled in parent or click-outside)
                onSelect(); // This toggles it off since it acts as select
              }}
              className="mt-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Done Editing
            </button>
          </div>
        ) : (
          /* Preview Mode Screen (Closed State) */
          <div className="flex flex-col gap-3">
            <h4 className="font-display font-bold text-sm text-slate-800 leading-snug">
              {question.type === 'fillups' ? (
                // Highlight blanks in preview mode
                <span>
                  {question.text.split(/(\[.*?\])/).map((p, idx) => {
                    if (p.startsWith('[') && p.endsWith(']')) {
                      return (
                        <span key={idx} className="mx-1 px-2 py-0.5 rounded bg-pink-100/60 text-pink-700 font-bold border border-pink-200/40 text-xs">
                          {p.slice(1, -1)}
                        </span>
                      );
                    }
                    return <span key={idx}>{p}</span>;
                  })}
                </span>
              ) : (
                question.text || <span className="text-slate-400 italic font-medium">Add a question statement...</span>
              )}
            </h4>

            {/* MCQ options preview list */}
            {question.type === 'mcq' && question.mcqData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {question.mcqData.options.map((opt, oIdx) => {
                  const isCorrect = question.mcqData?.correctOptionIndex === oIdx;
                  return (
                    <div
                      key={oIdx}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/45 text-emerald-750'
                          : 'border-slate-50 bg-slate-50/20 text-slate-500'
                      }`}
                    >
                      <span className="truncate">{opt || `Option ${oIdx + 1}`}</span>
                      {isCorrect && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* True/False preview */}
            {question.type === 'true-false' && question.trueFalseData && (
              <div className="flex gap-2 mt-1">
                <div className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  question.trueFalseData.correctAnswer 
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700' 
                    : 'border-slate-100 bg-slate-50/30 text-slate-400'
                }`}>
                  TRUE
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  !question.trueFalseData.correctAnswer 
                    ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700' 
                    : 'border-slate-100 bg-slate-50/30 text-slate-400'
                }`}>
                  FALSE
                </div>
              </div>
            )}

            {/* Matching Preview */}
            {question.type === 'matching' && question.matchingData && (
              <div className="flex flex-col gap-1.5 mt-1">
                {question.matchingData.pairs.map((pair, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100 text-slate-700">{pair.left || '___'}</span>
                    <span>matches</span>
                    <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100 text-slate-700">{pair.right || '___'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Coding Preview */}
            {question.type === 'coding' && question.codingData && (
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase">
                  <span>Language: {question.codingData.language}</span>
                  <span>{question.codingData.testCases.length} Test Cases</span>
                </div>
                <pre className="p-3.5 bg-slate-900 rounded-2xl font-mono text-[10px] text-slate-300 leading-normal max-h-24 overflow-hidden select-none">
                  {question.codingData.starterCode || `// Starter code...`}
                </pre>
              </div>
            )}

            {/* Custom Guidelines Preview */}
            {question.type === 'custom' && question.customData && (
              <div className="bg-amber-50/30 border border-amber-100/40 p-3 rounded-2xl text-[11px] text-amber-700 leading-relaxed font-semibold">
                <strong>Evaluation Guidelines:</strong> {question.customData.guidelines || "No instructions provided."}
              </div>
            )}

            {/* Image Preview */}
            {question.type === 'image' && question.imageUrl && (
              <div className={`mt-1 h-20 bg-gradient-to-r ${question.imageUrl} rounded-xl border border-transparent p-3 text-white font-extrabold flex items-center justify-between text-[10px]`}>
                <span>Image Attachment Diagram</span>
                <span className="opacity-75">(Gradient Preview)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
