import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, CheckCircle, XCircle, Settings, 
  Maximize2, Minimize2, Terminal, AlertTriangle, 
  FileCode, Code2, Copy, Check, Database, BookOpen,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { codeExecutionService, formatExecutionStatus } from '../../services/codeExecutionService';
import type { Question as BaseQuestion } from '../builder/QuestionTypes';

export interface ExamQuestion extends Partial<BaseQuestion> {
  id: string;
  type: any;
  text: string;
  question?: string;
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  starterCode?: Record<string, string>;
  testCases?: { input: string; expected: string; output?: string }[];
  examples?: { input: string; output: string; explanation?: string }[];
}

interface CodingWorkspaceProps {
  question: ExamQuestion;
  questionNumber: number;
  totalQuestions: number;
  attemptId: string | null;
  initialCode?: string;
  initialLanguage?: string;
  onSaveAnswer: (questionId: string, payload: { language: string; source_code: string }) => void;
  onNavigateQuestion?: (index: number) => void;
  onNextQuestion?: () => void;
  onPrevQuestion?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const CodingWorkspace: React.FC<CodingWorkspaceProps> = ({
  question,
  questionNumber,
  totalQuestions,
  attemptId,
  initialCode,
  initialLanguage,
  onSaveAnswer,
  onNavigateQuestion: _onNavigateQuestion,
  onNextQuestion,
  onPrevQuestion,
  hasPrev,
  hasNext
}) => {
  // Default list of all supported programming languages
  const DEFAULT_ALL_LANGUAGES = ['python', 'javascript', 'cpp', 'java', 'c', 'typescript', 'go', 'rust', 'csharp'];

  // Extract question data safely & ensure all major languages are available
  const codingData = question?.codingData;
  const allowedLanguages = (() => {
    const customLangs = codingData?.languages || (question?.starterCode ? Object.keys(question.starterCode) : null);
    if (customLangs && customLangs.length > 0) {
      // Merge question languages with default set so candidates always have full language support
      return Array.from(new Set([...customLangs, ...DEFAULT_ALL_LANGUAGES]));
    }
    return DEFAULT_ALL_LANGUAGES;
  })();
  
  // Selected Language State
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    if (initialLanguage && allowedLanguages.includes(initialLanguage)) return initialLanguage;
    if (codingData?.language && allowedLanguages.includes(codingData.language)) return codingData.language;
    return allowedLanguages[0] || 'python';
  });

  // Draft code storage per language: { langKey: codeString }
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>(() => {
    const initialDrafts: Record<string, string> = {};
    allowedLanguages.forEach(lang => {
      if (question?.starterCode && question.starterCode[lang]) {
        initialDrafts[lang] = question.starterCode[lang];
      } else if (codingData?.starterCodes && codingData.starterCodes[lang]) {
        initialDrafts[lang] = codingData.starterCodes[lang];
      } else if (codingData?.starterCode && lang === codingData.language) {
        initialDrafts[lang] = codingData.starterCode;
      } else {
        initialDrafts[lang] = generateDefaultStarterCode(lang, question?.text || question?.question);
      }
    });

    if (initialCode) {
      const currentLang = initialLanguage || codingData?.language || allowedLanguages[0] || 'python';
      initialDrafts[currentLang] = initialCode;
    }
    return initialDrafts;
  });

  // Active Code String
  const currentCode = codeDrafts[selectedLanguage] || '';

  // Language switch confirmation modal state
  const [langConfirmModal, setLangConfirmModal] = useState<{ open: boolean; targetLang: string } | null>(null);

  // Editor Display Settings
  const [editorTheme, setEditorTheme] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<number>(13);
  const [tabSize, setTabSize] = useState<number>(4);
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [isWorkspaceFullscreen, setIsWorkspaceFullscreen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('Saved');

  // Split Panel Resizing (Left: Problem, Right: Editor)
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(42);
  const isDraggingSplitter = useRef<boolean>(false);

  // Bottom Console Tabs
  const [bottomTab, setBottomTab] = useState<'samples' | 'custom' | 'result'>('samples');
  const [activeSampleCaseIdx, setActiveSampleCaseIdx] = useState<number>(0);
  const [customInput, setCustomInput] = useState<string>('');

  // Execution States
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState<boolean>(false);
  const [runResults, setRunResults] = useState<Array<{
    index: number;
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    time?: string | number;
    memory?: number;
    status: string;
    error?: string;
  }>>([]);
  
  const [submissionResult, setSubmissionResult] = useState<{
    status: 'Accepted' | 'Wrong Answer' | 'Compilation Error' | 'Runtime Error' | 'Time Limit Exceeded' | 'Error';
    passedCount: number;
    totalCount: number;
    score: number;
    maxScore: number;
    runtime?: string | number;
    memory?: number;
    details?: string;
  } | null>(null);

  const [copiedInputIdx, setCopiedInputIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derive sample test cases from examples or testCases
  const sampleCases = (() => {
    if (codingData?.testCases && codingData.testCases.length > 0) {
      return codingData.testCases.map(tc => ({
        input: tc.input || '',
        expected: tc.expectedOutput || ''
      }));
    }
    if (question.testCases && question.testCases.length > 0) {
      return question.testCases.map(tc => ({
        input: tc.input || '',
        expected: tc.expected || ''
      }));
    }
    if (codingData?.sampleInput) {
      return [{
        input: codingData.sampleInput,
        expected: codingData.sampleOutput || ''
      }];
    }
    return [{ input: 'hello', expected: 'olleh' }];
  })();

  // Detect mode: Function Mode vs Standard I/O Mode
  const isFunctionMode = currentCode.includes('function ') || currentCode.includes('def ') || currentCode.includes('class Solution');

  // Handle panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
      const containerWidth = window.innerWidth;
      const newPercent = Math.max(25, Math.min(75, (e.clientX / containerWidth) * 100));
      setLeftWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      isDraggingSplitter.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Update parent on code changes with auto-save
  const handleCodeChange = (val: string) => {
    setCodeDrafts(prev => ({
      ...prev,
      [selectedLanguage]: val
    }));
    setSaveStatus('Saving...');
    onSaveAnswer(question.id, {
      language: selectedLanguage,
      source_code: val
    });
    setTimeout(() => setSaveStatus('Saved ✓'), 600);
  };

  // Language Switch Logic with Draft Preservation & Confirmation
  const handleLanguageSelect = (newLang: string) => {
    if (newLang === selectedLanguage) return;

    const defaultStarter = generateDefaultStarterCode(selectedLanguage, question.text);
    const hasCustomCode = currentCode.trim() !== '' && currentCode.trim() !== defaultStarter.trim();
    const hasTargetDraft = !!codeDrafts[newLang] && codeDrafts[newLang].trim() !== '';

    if (hasCustomCode && !hasTargetDraft) {
      setLangConfirmModal({ open: true, targetLang: newLang });
    } else {
      switchLanguageDirectly(newLang);
    }
  };

  const switchLanguageDirectly = (lang: string) => {
    setSelectedLanguage(lang);
    setLangConfirmModal(null);
    const targetCode = codeDrafts[lang] || generateDefaultStarterCode(lang, question.text);
    onSaveAnswer(question.id, {
      language: lang,
      source_code: targetCode
    });
  };

  const handleResetCode = () => {
    let starter = '';
    if (question.starterCode && question.starterCode[selectedLanguage]) {
      starter = question.starterCode[selectedLanguage];
    } else if (codingData?.starterCodes && codingData.starterCodes[selectedLanguage]) {
      starter = codingData.starterCodes[selectedLanguage];
    } else if (codingData?.starterCode && selectedLanguage === codingData.language) {
      starter = codingData.starterCode;
    } else {
      starter = generateDefaultStarterCode(selectedLanguage, question.text);
    }

    handleCodeChange(starter);
  };

  // Handle Tab key in editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = ' '.repeat(tabSize);
      const val = textarea.value;
      const nextVal = val.substring(0, start) + spaces + val.substring(end);
      handleCodeChange(nextVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + tabSize;
      }, 0);
    }
  };

  // Line numbers calculation
  const getLineNumbers = () => {
    const lines = currentCode.split('\n').length;
    return Array.from({ length: Math.max(lines, 18) }, (_, i) => i + 1);
  };

  // Run Code against Sample Tests or Custom Test
  const handleRunCode = async () => {
    if (!currentCode.trim()) {
      setRunResults([]);
      setBottomTab('result');
      return;
    }

    setIsRunningCode(true);
    setBottomTab('result');

    const testCasesToRun = bottomTab === 'custom'
      ? [{ input: customInput, expected: '' }]
      : sampleCases;

    const results = [];
    for (let i = 0; i < testCasesToRun.length; i++) {
      const tc = testCasesToRun[i];
      try {
        const res = await codeExecutionService.runCode(selectedLanguage, currentCode, tc.input, attemptId || undefined);
        const actualOut = (res.stdout || '').trim();
        const expectedOut = (tc.expected || '').trim();
        const passed = res.statusId === 3 && (expectedOut ? outputsMatch(expectedOut, actualOut) : true);
        const { label: statusLabel } = formatExecutionStatus(res.statusId, res.status);

        results.push({
          index: i + 1,
          passed,
          input: tc.input,
          expected: tc.expected,
          actual: actualOut || res.stderr || res.compile_output || '(No Output)',
          time: res.time,
          memory: res.memory,
          status: statusLabel,
          error: res.error || (res.statusId !== 3 ? res.status : undefined)
        });
      } catch (err: any) {
        results.push({
          index: i + 1,
          passed: false,
          input: tc.input,
          expected: tc.expected,
          actual: 'Execution Error',
          status: 'Error',
          error: err.message || 'Server network error'
        });
      }
    }

    setRunResults(results);
    setIsRunningCode(false);
  };

  // Submit Coding Answer (Runs evaluation against Judge0 server-side)
  const handleSubmitCodingAnswer = async () => {
    if (!currentCode.trim()) return;

    setIsSubmittingAnswer(true);
    setBottomTab('result');

    onSaveAnswer(question.id, {
      language: selectedLanguage,
      source_code: currentCode
    });

    if (attemptId && !attemptId.startsWith('mock-att-')) {
      try {
        const evalRes = await codeExecutionService.evaluateCode(question.id, attemptId, selectedLanguage, currentCode);
        const passedCount = evalRes.passed || 0;
        const totalCount = evalRes.total || sampleCases.length;
        const isAllPassed = passedCount === totalCount && totalCount > 0;

        setSubmissionResult({
          status: isAllPassed ? 'Accepted' : passedCount > 0 ? 'Wrong Answer' : 'Wrong Answer',
          passedCount,
          totalCount,
          score: evalRes.marks_awarded || (isAllPassed ? (question.points || 10) : Math.round(((question.points || 10) * passedCount) / (totalCount || 1))),
          maxScore: question.points || 10,
          runtime: evalRes.results?.[0]?.time,
          memory: evalRes.results?.[0]?.memory,
          details: evalRes.message || evalRes.error
        });
      } catch (err: any) {
        setSubmissionResult({
          status: 'Error',
          passedCount: 0,
          totalCount: sampleCases.length,
          score: 0,
          maxScore: question.points || 10,
          details: err.message || 'Evaluation request failed.'
        });
      }
    } else {
      // Mock submit mode fallback
      const passedCount = sampleCases.length;
      setSubmissionResult({
        status: 'Accepted',
        passedCount,
        totalCount: sampleCases.length,
        score: question.points || 10,
        maxScore: question.points || 10,
        runtime: 0.04,
        memory: 12.4
      });
    }

    setIsSubmittingAnswer(false);
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedInputIdx(idx);
    setTimeout(() => setCopiedInputIdx(null), 2000);
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 bg-[#0b0813] text-slate-100 font-sans select-none overflow-hidden ${
      isWorkspaceFullscreen ? 'fixed inset-0 z-50 p-0 bg-[#0b0813]' : 'h-full'
    }`}>

      {/* ----------------------------------------------------
          TOP WORKSPACE TOOLBAR
      ------------------------------------------------------ */}
      <div className="h-12 border-b border-slate-800/80 bg-slate-900/90 px-4 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        
        {/* Left: Question Navigation Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-xs font-bold">
            <Code2 size={13} className="text-purple-400" />
            <span>Problem {questionNumber} / {totalQuestions}</span>
          </div>

          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
            question.difficulty === 'hard' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
            question.difficulty === 'easy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {question.difficulty || 'Medium'}
          </span>

          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
            {question.points || 10} Points
          </span>

          {/* Quick Problem Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevQuestion}
              disabled={!hasPrev}
              title="Previous Problem"
              className="p-1 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={onNextQuestion}
              disabled={!hasNext}
              title="Next Problem"
              className="p-1 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <span className={`hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
            isFunctionMode ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-slate-800 text-slate-400'
          }`}>
            {isFunctionMode ? 'Function Mode' : 'Standard I/O Mode'}
          </span>
        </div>

        {/* Right: Language Selector & Workspace Controls */}
        <div className="flex items-center gap-2">
          
          {/* Language Dropdown (Filtered to question-allowed languages) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 hidden md:inline">Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageSelect(e.target.value)}
              className="bg-slate-950 border border-slate-750 text-xs font-mono font-bold text-white rounded-lg px-3 py-1 focus:outline-none focus:border-purple-500 cursor-pointer hover:border-slate-600 transition-all"
            >
              {allowedLanguages.map((lang) => (
                <option key={lang} value={lang}>{formatLanguageLabel(lang)}</option>
              ))}
            </select>
          </div>

          {/* Auto-save Status */}
          <span className="text-[10px] font-mono font-bold text-slate-500 px-1 hidden sm:inline">
            {saveStatus}
          </span>

          {/* Reset Code */}
          <button
            onClick={handleResetCode}
            title="Reset Starter Code"
            className="p-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw size={13} />
          </button>

          {/* Editor Settings Modal Trigger */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Editor Settings"
            className="p-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <Settings size={13} />
          </button>

          {/* Fullscreen IDE Workspace */}
          <button
            onClick={() => setIsWorkspaceFullscreen(prev => !prev)}
            title="Toggle IDE Fullscreen"
            className="p-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {isWorkspaceFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------
          MAIN TWO-COLUMN WORKSPACE AREA
      ------------------------------------------------------ */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
        
        {/* LEFT COLUMN: PROBLEM DESCRIPTION PANEL */}
        <div 
          style={{ width: `${leftWidthPercent}%` }}
          className="w-full lg:w-auto flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950/70 min-h-0 overflow-y-auto select-text"
        >
          {/* Problem Header */}
          <div className="p-5 border-b border-slate-800/80 bg-slate-900/30">
            <h2 className="font-display font-black text-lg text-white leading-snug">
              {getProblemTitle(question?.text || question?.question || (question as any)?.title)}
            </h2>
          </div>

          {/* Problem Content Sections */}
          <div className="p-5 flex flex-col gap-6 text-xs text-slate-300 leading-relaxed">
            
            {/* Description */}
            <div className="space-y-3 font-sans leading-relaxed text-slate-200">
              {getProblemDescription(question?.text || question?.question || (question as any)?.title)}
            </div>

            {/* Input Format */}
            {codingData?.inputFormat && (
              <div className="space-y-1.5 pt-3 border-t border-slate-850">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal size={11} className="text-purple-400" />
                  <span>Input Format</span>
                </h4>
                <div className="bg-slate-900/80 border border-slate-850 p-3 rounded-xl font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {codingData.inputFormat}
                </div>
              </div>
            )}

            {/* Output Format */}
            {codingData?.outputFormat && (
              <div className="space-y-1.5 pt-3 border-t border-slate-850">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode size={11} className="text-emerald-400" />
                  <span>Output Format</span>
                </h4>
                <div className="bg-slate-900/80 border border-slate-850 p-3 rounded-xl font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {codingData.outputFormat}
                </div>
              </div>
            )}

            {/* Constraints */}
            <div className="space-y-1.5 pt-3 border-t border-slate-850">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database size={11} className="text-amber-400" />
                <span>Constraints</span>
              </h4>
              <div className="bg-slate-900/80 border border-slate-850 p-3 rounded-xl font-mono text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                {codingData?.constraints || `Time Limit: ${codingData?.timeLimit || 5.0}s\nMemory Limit: ${codingData?.memoryLimit || 256} MB\nStandard competitive programming constraints apply.`}
              </div>
            </div>

            {/* Examples (Input / Expected Output / Explanation) */}
            {sampleCases.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-slate-850">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={11} className="text-purple-400" />
                  <span>Sample Examples</span>
                </h4>

                {sampleCases.map((ex, idx) => (
                  <div key={idx} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 font-mono">
                    <div className="flex justify-between items-center text-[10px] font-bold text-purple-400 border-b border-slate-850 pb-2">
                      <span>Example {idx + 1}</span>
                      <button
                        onClick={() => copyToClipboard(ex.input, idx)}
                        className="text-[9px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedInputIdx === idx ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        <span>{copiedInputIdx === idx ? 'Copied' : 'Copy Input'}</span>
                      </button>
                    </div>

                    {/* Input */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Input:</span>
                      <pre className="text-slate-200 text-[11px] whitespace-pre-wrap">{ex.input || '(Empty)'}</pre>
                    </div>

                    {/* Output */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Output:</span>
                      <pre className="text-emerald-400 font-bold text-[11px] whitespace-pre-wrap">{ex.expected || '(Empty)'}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DRAGGABLE RESIZER HANDLE */}
        <div
          onMouseDown={() => {
            isDraggingSplitter.current = true;
            document.body.style.cursor = 'col-resize';
          }}
          className="hidden lg:block w-1.5 hover:w-2 bg-slate-900 hover:bg-purple-500/50 cursor-col-resize transition-all shrink-0 z-30"
          title="Drag to resize panels"
        />

        {/* RIGHT COLUMN: CODE EDITOR & TESTING CONSOLE */}
        <div 
          style={{ width: `${100 - leftWidthPercent}%` }}
          className="w-full lg:w-auto flex-1 flex flex-col bg-slate-950 overflow-hidden relative min-h-0"
        >
          {/* Main Editor Textarea Container */}
          <div className={`flex-1 flex font-mono overflow-hidden relative ${
            editorTheme === 'dark' ? 'bg-[#090610] text-slate-100' : 'bg-slate-50 text-slate-900'
          }`}>
            
            {/* Line Numbers Bar */}
            <div className={`w-11 select-none border-r text-[11px] font-mono font-bold text-right pr-3 pt-3.5 leading-relaxed shrink-0 ${
              editorTheme === 'dark' ? 'bg-[#06040b] border-slate-850 text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              {getLineNumbers().map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>

            {/* Active Textarea Code Editor */}
            <textarea
              ref={textareaRef}
              value={currentCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              style={{
                fontSize: `${fontSize}px`,
                whiteSpace: wordWrap ? 'pre-wrap' : 'pre'
              }}
              className={`flex-1 bg-transparent p-3.5 border-none outline-none resize-none leading-relaxed font-mono focus:ring-0 ${
                editorTheme === 'dark' ? 'text-purple-100 placeholder:text-slate-700' : 'text-slate-900 placeholder:text-slate-400'
              }`}
              placeholder="// Write your solution code here..."
            />
          </div>

          {/* BOTTOM TESTING & RESULTS PANEL */}
          <div className="h-56 border-t border-slate-800/80 flex flex-col bg-slate-950 shrink-0 font-mono">
            
            {/* Control Bar */}
            <div className="h-10 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-900/80">
              
              {/* Tab Options */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBottomTab('samples')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    bottomTab === 'samples' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sample Tests
                </button>
                <button
                  onClick={() => setBottomTab('custom')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    bottomTab === 'custom' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Test
                </button>
                <button
                  onClick={() => setBottomTab('result')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    bottomTab === 'result' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Results</span>
                  {runResults.length > 0 && (
                    <span className={`w-2 h-2 rounded-full ${runResults.every(r => r.passed) ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  )}
                  {submissionResult && (
                    <span className={`w-2 h-2 rounded-full ${submissionResult.status === 'Accepted' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  )}
                </button>
              </div>

              {/* Action Buttons: [Run Code] vs [Submit Answer] */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={isRunningCode || isSubmittingAnswer}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isRunningCode ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <>
                      <Play size={11} className="fill-white" />
                      <span>Run Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleSubmitCodingAnswer}
                  disabled={isRunningCode || isSubmittingAnswer}
                  className="px-4.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-[11px] rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-97"
                >
                  {isSubmittingAnswer ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={12} />
                      <span>Submit Answer</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 text-[11px]">
              
              {/* Sample Tests Tab */}
              {bottomTab === 'samples' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {sampleCases.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSampleCaseIdx(idx)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                          activeSampleCaseIdx === idx ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Test Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const currentCase = sampleCases[activeSampleCaseIdx] || sampleCases[0];
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                          <span className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Input:</span>
                          <pre className="text-slate-200 text-[10px] whitespace-pre-wrap">{currentCase.input || '(Empty)'}</pre>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                          <span className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Expected Output:</span>
                          <pre className="text-emerald-400 font-bold text-[10px] whitespace-pre-wrap">{currentCase.expected || '(Empty)'}</pre>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Custom Test Tab */}
              {bottomTab === 'custom' && (
                <div className="h-full flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Custom Stdin Input:</span>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter custom test input here..."
                    className="flex-1 w-full bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-[11px] outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              )}

              {/* Result Panel Tab */}
              {bottomTab === 'result' && (
                <div className="flex flex-col gap-3">
                  
                  {/* Submission Result Card */}
                  {submissionResult ? (
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${
                            submissionResult.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {submissionResult.status === 'Accepted' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          </div>
                          <div>
                            <h3 className={`font-display font-black text-sm ${
                              submissionResult.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {submissionResult.status}
                            </h3>
                            <p className="text-[10px] text-slate-400">
                              {submissionResult.passedCount} / {submissionResult.totalCount} Test Cases Passed
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-white">{submissionResult.score} / {submissionResult.maxScore} Marks</span>
                          {submissionResult.runtime && (
                            <p className="text-[9px] text-slate-400">Runtime: {submissionResult.runtime}s</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : runResults.length > 0 ? (
                    /* Sample Run Results Card */
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <span className={`text-xs font-black flex items-center gap-1.5 ${
                          runResults.every(r => r.passed) ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {runResults.every(r => r.passed) ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {runResults.every(r => r.passed) ? 'All Sample Test Cases Passed!' : 'Sample Test Case Execution Failed'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {runResults.filter(r => r.passed).length} / {runResults.length} Passed
                        </span>
                      </div>

                      <div className="space-y-2">
                        {runResults.map((r, rIdx) => (
                          <div key={rIdx} className={`p-3 rounded-xl border flex flex-col gap-2 ${
                            r.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                          }`}>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className={r.passed ? 'text-emerald-400' : 'text-rose-400'}>
                                Case {r.index}: {r.status} {r.passed ? '✓' : '❌'}
                              </span>
                              {r.time && <span className="text-slate-400">{r.time}s</span>}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="bg-slate-950 p-2 rounded border border-slate-850">
                                <span className="text-[8px] text-slate-500 font-bold block uppercase">Expected:</span>
                                <span className="text-emerald-400 whitespace-pre-wrap">{r.expected || '(Empty)'}</span>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-850">
                                <span className="text-[8px] text-slate-500 font-bold block uppercase">Your Output:</span>
                                <span className={r.passed ? 'text-emerald-300 whitespace-pre-wrap' : 'text-rose-300 whitespace-pre-wrap'}>
                                  {r.actual}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-slate-500 font-mono text-[11px] text-center">
                      Click "Run Code" or "Submit Answer" to execute your solution.
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* ----------------------------------------------------
          EDITOR SETTINGS MODAL
      ------------------------------------------------------ */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-display font-black text-sm text-white flex items-center gap-2">
                <Settings size={15} className="text-purple-400" />
                <span>Editor Preferences</span>
              </h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold text-slate-300">
              
              {/* Font Size */}
              <div className="flex justify-between items-center">
                <span>Font Size</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none"
                >
                  <option value={12}>12px</option>
                  <option value={14}>14px</option>
                  <option value={16}>16px</option>
                  <option value={18}>18px</option>
                </select>
              </div>

              {/* Theme */}
              <div className="flex justify-between items-center">
                <span>Theme</span>
                <select
                  value={editorTheme}
                  onChange={(e) => setEditorTheme(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none"
                >
                  <option value="dark">Dark Theme</option>
                  <option value="light">Light Theme</option>
                </select>
              </div>

              {/* Tab Size */}
              <div className="flex justify-between items-center">
                <span>Tab Size</span>
                <select
                  value={tabSize}
                  onChange={(e) => setTabSize(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none"
                >
                  <option value={2}>2 Spaces</option>
                  <option value={4}>4 Spaces</option>
                </select>
              </div>

              {/* Word Wrap */}
              <div className="flex justify-between items-center">
                <span>Word Wrap</span>
                <button
                  onClick={() => setWordWrap(prev => !prev)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                    wordWrap ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {wordWrap ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          LANGUAGE CONFIRMATION MODAL
      ------------------------------------------------------ */}
      {langConfirmModal?.open && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle size={22} />
              <h3 className="font-display font-black text-sm text-white">Change Language?</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Changing language to <span className="font-mono font-bold text-purple-400">{formatLanguageLabel(langConfirmModal.targetLang)}</span> may replace your current un-saved code. Do you want to continue?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setLangConfirmModal(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => switchLanguageDirectly(langConfirmModal.targetLang)}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Helper utilities
function formatLanguageLabel(lang: string): string {
  const map: Record<string, string> = {
    python: 'Python 3',
    javascript: 'JavaScript (Node.js)',
    cpp: 'C++ (GCC)',
    java: 'Java (OpenJDK)',
    typescript: 'TypeScript',
    c: 'C (GCC)',
    go: 'Go',
    rust: 'Rust',
    csharp: 'C#',
  };
  return map[lang.toLowerCase()] || lang.toUpperCase();
}

function generateDefaultStarterCode(lang: string, _questionText?: string): string {
  const l = lang.toLowerCase();
  if (l.includes('python')) {
    return `def solve():\n    # Write your solution here\n    pass\n`;
  }
  if (l.includes('javascript') || l === 'js') {
    return `function solve() {\n    // Write your solution here\n}\n`;
  }
  if (l.includes('typescript') || l === 'ts') {
    return `function solve(): void {\n    // Write your solution here\n}\n`;
  }
  if (l.includes('cpp') || l.includes('c++')) {
    return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`;
  }
  if (l === 'c') {
    return `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`;
  }
  if (l.includes('java')) {
    return `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n`;
  }
  if (l.includes('go') || l.includes('golang')) {
    return `package main\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n}\n`;
  }
  if (l.includes('rust')) {
    return `fn main() {\n    // Write your solution here\n}\n`;
  }
  if (l.includes('csharp') || l.includes('c#')) {
    return `using System;\n\nclass Solution {\n    static void Main(string[] args) {\n        // Write your solution here\n    }\n}\n`;
  }
  return `// Write your solution here\n`;
}

function getProblemTitle(text?: string): string {
  if (!text || typeof text !== 'string') return 'Coding Assessment Problem';
  const firstLine = text.split('\n')[0]?.trim();
  return firstLine && firstLine.length < 80 ? firstLine : 'Coding Assessment Problem';
}

function getProblemDescription(text?: string): string {
  if (!text || typeof text !== 'string') return 'Please read the problem description and write your solution.';
  if (text.includes('\n')) {
    return text.substring(text.indexOf('\n')).trim() || text;
  }
  return text;
}

function normalizeOutput(str: string): string {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

function outputsMatch(expected: string, actual: string): boolean {
  return normalizeOutput(expected) === normalizeOutput(actual);
}

export default CodingWorkspace;
