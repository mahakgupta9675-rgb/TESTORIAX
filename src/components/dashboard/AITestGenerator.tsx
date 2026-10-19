import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, Check, RotateCcw, Clock, ArrowRight, ArrowLeft, Loader2, Paperclip, X, Edit2, Trash2, Download, CheckSquare, Square, FileJson, FileText } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import type { Question } from '../builder/QuestionTypes';
import aiService from '../../services/aiService';
import testsService from '../../services/testsService';

interface AITestGeneratorProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard' | 'builder', testTitle?: string) => void;
  onTabChange?: (tab: string) => void;
}

interface GeneratedTestData {
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questions: Question[];
  estimatedTime: number;
  totalPoints: number;
}

// Fixed arrays for dropdowns and selectors
const QUESTION_TYPES = [
  "MCQ", "Fill in the Blanks", "True/False", "Coding", "Match the Following", "Image Based"
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Hindi", "Japanese", "Python Code Only"
];

const BLOOM_LEVELS = [
  "Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"
];

const GENERATION_STEPS = [
  "Preparing prompt...",
  "Reading uploaded material...",
  "Generating questions...",
  "Validating answers...",
  "Finalizing..."
];

export const AITestGenerator: React.FC<AITestGeneratorProps> = ({ onNavigate }) => {
  // Config States
  const [topic, setTopic] = useState(localStorage.getItem('testoriax_wizard_title') || '');
  const [description, setDescription] = useState(localStorage.getItem('testoriax_wizard_description') || '');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [numQuestions, setNumQuestions] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['MCQ']);
  const [language, setLanguage] = useState('English');
  const [bloomLevel, setBloomLevel] = useState('');
  const [extraInstructions, setExtraInstructions] = useState('');

  // App States
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [generatedTest, setGeneratedTest] = useState<GeneratedTestData | null>(null);
  const [, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);

  // Question UI States
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});

  // Attachment states
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; content?: string } | null>(null);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [pastedPatternText, setPastedPatternText] = useState('');

  // Action states
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [regeneratingQId, setRegeneratingQId] = useState<string | null>(null);

  // Handle generation steps animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'generating') {
      setGenerationStep(0);
      interval = setInterval(() => {
        setGenerationStep((prev) => {
          if (prev < GENERATION_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [status]);

  const toggleExpand = (qId: string) => {
    setExpandedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleQuestionSelection = (qId: string) => {
    setSelectedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleQuestionType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSelectAll = () => {
    if (!generatedTest) return;
    const allSelected = generatedTest.questions.every(q => selectedQuestions[q.id]);
    const nextState: Record<string, boolean> = {};
    if (!allSelected) {
      generatedTest.questions.forEach(q => nextState[q.id] = true);
    }
    setSelectedQuestions(nextState);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim() || !description.trim()) return;

    setStatus('generating');
    setError(null);
    setSelectedQuestions({});

    // Compile everything into a rich pattern/context string so the AI service handles it appropriately
    let extendedContext = `Detailed Description: ${description}\n`;
    extendedContext += `Target Question Types: ${selectedTypes.join(', ')}\n`;
    extendedContext += `Language: ${language}\n`;
    if (bloomLevel) extendedContext += `Bloom's Taxonomy Level: ${bloomLevel}\n`;
    if (extraInstructions) extendedContext += `Extra Instructions: ${extraInstructions}\n`;
    if (attachedFile?.content) extendedContext += `Reference Material: ${attachedFile.content}\n`;

    try {
      // Re-map 'mixed' to medium for the backend API if needed, or backend handles it.
      // We pass the extendedContext as the patternText argument to the existing service.
      const difficultyParam = difficulty === 'mixed' ? 'medium' : difficulty;
      const generatedData = await aiService.generateTest(topic.trim(), difficultyParam, numQuestions, extendedContext);
      
      // Patch difficulty to mixed if requested
      if (difficulty === 'mixed') generatedData.difficulty = 'mixed';

      setGeneratedTest(generatedData);
      setStatus('success');
      
      // Auto expand first few questions, auto select all by default
      const initialExpands: Record<string, boolean> = {};
      const initialSelects: Record<string, boolean> = {};
      generatedData.questions.forEach((q: Question, idx: number) => {
        if (idx < 2) initialExpands[q.id] = true;
        initialSelects[q.id] = true;
      });
      setExpandedQuestions(initialExpands);
      setSelectedQuestions(initialSelects);

    } catch (err: any) {
      console.error("AI Generation Error:", err);
      setError(err.message || 'Unable to generate questions right now. Please try again.');
      setStatus('error');
    }
  };

  const handleImportToBuilder = async () => {
    if (!generatedTest) return;
    
    // Filter questions based on selection
    const questionsToImport = generatedTest.questions.filter(q => selectedQuestions[q.id]);
    
    if (questionsToImport.length === 0) {
      alert("Please select at least one question to import.");
      return;
    }

    const testId = localStorage.getItem('testoriax_builder_test_id');
    
    if (testId) {
      try {
        // Fetch existing questions
        const { data: existingQuestions } = await testsService.getQuestionsByTestId(testId);
        const currentQuestions = existingQuestions || [];
        
        // Append selected questions
        const mergedQuestions = [...currentQuestions, ...questionsToImport];
        
        // Save back to Supabase
        await testsService.saveQuestions(testId, mergedQuestions);
      } catch (err) {
        console.error("Error importing questions to draft:", err);
      }
    }
    
    // Always set this so TestCreatorWizard can resume the flow
    localStorage.setItem('testoriax_builder_initial_questions', JSON.stringify(questionsToImport));

    // @ts-ignore
    onNavigate('create-test');
  };

  const exportPDF = () => {
    window.print();
  };

  const handleRegenerateAll = () => {
    if (confirm("Are you sure you want to regenerate all questions? This will replace your current list.")) {
      handleGenerate();
    }
  };

  const handleSaveEdit = () => {
    if (!generatedTest || !editingQId) return;
    const newQuestions = generatedTest.questions.map(q => 
      q.id === editingQId ? { ...q, ...editForm } as Question : q
    );
    setGeneratedTest({ ...generatedTest, questions: newQuestions });
    setEditingQId(null);
  };

  const handleRegenerateSingle = async (index: number) => {
    if (!generatedTest) return;
    const targetQ = generatedTest.questions[index];
    setRegeneratingQId(targetQ.id);
    
    try {
      const difficultyParam = difficulty === 'mixed' ? 'medium' : difficulty;
      const promptCtx = `I need exactly 1 new question to replace this one. Type: ${targetQ.type}. Topic: ${topic}. Difficulty: ${difficultyParam}. Previous question was: "${targetQ.text}". Generate a DIFFERENT but equivalent question.`;
      
      const newGen = await aiService.generateTest(topic.trim(), difficultyParam, 1, promptCtx);
      
      if (newGen && newGen.questions && newGen.questions.length > 0) {
        const newQ = newGen.questions[0];
        newQ.id = targetQ.id; // keep old ID so selection stays
        const newQuestions = [...generatedTest.questions];
        newQuestions[index] = newQ as Question;
        setGeneratedTest({ ...generatedTest, questions: newQuestions });
      }
    } catch (err: any) {
      console.error("Single regenerate error:", err);
      alert("Failed to regenerate this question.");
    } finally {
      setRegeneratingQId(null);
    }
  };

  const exportJSON = () => {
    if (!generatedTest) return;
    const questionsToExport = generatedTest.questions.filter(q => selectedQuestions[q.id]);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questionsToExport, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `testoriax_export_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const handleQuestionAction = (action: string, index: number) => {
    if (!generatedTest) return;
    const newQuestions = [...generatedTest.questions];
    const qId = newQuestions[index].id;
    
    if (action === 'delete') {
      newQuestions.splice(index, 1);
      const newSel = {...selectedQuestions};
      delete newSel[qId];
      setSelectedQuestions(newSel);
      setGeneratedTest({ ...generatedTest, questions: newQuestions });
    } else if (action === 'edit') {
      setEditingQId(qId);
      setEditForm(newQuestions[index]);
    } else if (action === 'regenerate') {
      handleRegenerateSingle(index);
    } else if (action === 'duplicate') {
      // eslint-disable-next-line react-hooks/purity
      const clonedQuestion = { ...newQuestions[index], id: `q-${Date.now()}` };
      newQuestions.splice(index + 1, 0, clonedQuestion);
      setSelectedQuestions(prev => ({...prev, [clonedQuestion.id]: true}));
      setGeneratedTest({ ...generatedTest, questions: newQuestions });
    } else if (action === 'up' && index > 0) {
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      setGeneratedTest({ ...generatedTest, questions: newQuestions });
    } else if (action === 'down' && index < newQuestions.length - 1) {
      [newQuestions[index + 1], newQuestions[index]] = [newQuestions[index], newQuestions[index + 1]];
      setGeneratedTest({ ...generatedTest, questions: newQuestions });
    }
  };



  const getSelectedCount = () => {
    if (!generatedTest) return 0;
    return generatedTest.questions.filter(q => selectedQuestions[q.id]).length;
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50 w-full overflow-hidden print:h-auto print:overflow-visible">
      
      {/* Configuration Panel - Left */}
      <aside className="w-full lg:w-[380px] bg-white/50 border-b lg:border-b-0 lg:border-r border-slate-100 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto z-10 custom-scrollbar print:hidden">
        <div className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => onNavigate('builder')}
            className="w-fit flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-all hover:shadow-sm uppercase tracking-wider"
          >
            <ArrowLeft size={14} /> Back to Builder
          </button>
          <div>
            <h3 className="font-display font-extrabold text-xs text-slate-800 tracking-tight flex items-center gap-1.5 uppercase mb-1">
              <BrainCircuit size={14} className="text-pink-500" />
              <span>AI Prompt Settings</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Configure the properties for TestoriaX Intelligence.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col gap-6 pb-8">
          
          {/* Topic & Description */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Test Title / Topic <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                disabled={status === 'generating'}
                placeholder="e.g. Data Structures, Cell Biology..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-pink-400 focus:ring-2 focus:ring-pink-200/50 transition-all font-semibold bg-white disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Test Description <span className="text-rose-500">*</span></label>
              <textarea
                required
                rows={3}
                disabled={status === 'generating'}
                placeholder="Describe specific areas to cover, context, or syllabus constraints..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-pink-400 focus:ring-2 focus:ring-pink-200/50 transition-all font-semibold bg-white disabled:bg-slate-50 disabled:text-slate-400 resize-none"
              />
            </div>
          </div>

          {/* Difficulty Segment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Difficulty level</label>
            <div className="flex flex-wrap gap-2">
              {(['easy', 'medium', 'hard', 'mixed'] as const).map((diff) => {
                const isSel = difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    disabled={status === 'generating'}
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 min-w-[70px] py-2 rounded-xl border font-bold text-[10px] uppercase tracking-wide transition-all cursor-pointer disabled:cursor-not-allowed text-center ${
                      isSel
                        ? diff === 'easy' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                          : diff === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                          : diff === 'hard' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                          : 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                        : 'bg-white/80 border-slate-150 text-slate-400 hover:border-slate-250 hover:text-slate-600'
                    }`}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Count Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Number of Questions</label>
              <span className="text-xs font-extrabold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-100">{numQuestions}</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              disabled={status === 'generating'}
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              className="w-full accent-pink-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer mt-1 disabled:opacity-50"
            />
            <div className="flex justify-between text-[9px] font-bold text-slate-400 px-1">
              <span>1 Qs</span>
              <span>25 Qs</span>
            </div>
          </div>

          {/* Question Types Multi-Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Question Types</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {QUESTION_TYPES.map(type => {
                const isSelected = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={status === 'generating'}
                    onClick={() => toggleQuestionType(type)}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-800 border-slate-800 text-white shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Language & Bloom's */}
          <div className="grid grid-cols-2 gap-3">
             <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Language</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={status === 'generating'}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs font-semibold bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:border-pink-400"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
             </div>
             <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Bloom's Level</label>
                <select 
                  value={bloomLevel}
                  onChange={(e) => setBloomLevel(e.target.value)}
                  disabled={status === 'generating'}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs font-semibold bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:border-pink-400"
                >
                  <option value="">(Optional)</option>
                  {BLOOM_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
             </div>
          </div>

          {/* Reference Material Upload UI */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Reference Material</label>
            <div className="w-full border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-pink-300 hover:bg-pink-50/30 transition-colors cursor-pointer" onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}>
               {attachedFile ? (
                 <div className="flex flex-col items-center">
                    <Paperclip size={20} className="text-pink-500 mb-1" />
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{attachedFile.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setAttachedFile(null); }} className="text-[10px] font-bold text-rose-500 mt-1 hover:underline">Remove file</button>
                 </div>
               ) : (
                 <>
                   <div className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center mb-1">
                     <Download size={14} className="text-slate-500" />
                   </div>
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Upload or Paste Context</span>
                   <span className="text-[9px] font-semibold text-slate-400">PDF, DOCX, PPT, TXT, Images</span>
                 </>
               )}
            </div>
            
            {/* Overlay modal/textarea for pasted text if simulating upload */}
            {isAttachmentOpen && !attachedFile && (
              <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col gap-2 mt-1 shadow-sm animate-in fade-in zoom-in-98 duration-150">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Paste Text Content</span>
                  <button type="button" onClick={() => setIsAttachmentOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Paste context here..."
                  value={pastedPatternText}
                  onChange={(e) => setPastedPatternText(e.target.value)}
                  className="w-full p-2 border border-slate-150 rounded-lg text-[10px] bg-slate-50 outline-none focus:bg-white focus:border-pink-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (pastedPatternText.trim()) {
                      setAttachedFile({ 
                        name: 'pasted_context.txt', 
                        type: 'Text',
                        content: pastedPatternText 
                      });
                    }
                    setIsAttachmentOpen(false);
                  }}
                  className="py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-md text-[10px] w-full cursor-pointer transition-colors"
                >
                  Attach Context
                </button>
              </div>
            )}
          </div>

          {/* Extra Instructions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Extra Instructions (Optional)</label>
            <textarea
              rows={2}
              disabled={status === 'generating'}
              placeholder="e.g. Make sure explanations mention historical context..."
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs focus:border-pink-400 focus:ring-2 focus:ring-pink-200/50 transition-all font-semibold bg-white disabled:bg-slate-50 disabled:text-slate-400 resize-none"
            />
          </div>

          {/* Action button */}
          <div className="pt-2 sticky bottom-0 bg-white/90 pb-2 backdrop-blur-sm z-20">
            <button
              type="submit"
              disabled={status === 'generating' || !topic.trim() || !description.trim() || selectedTypes.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-slate-200 disabled:to-slate-300 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-pink-500/20 hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {status === 'generating' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-white" />
                  <span>Generate AI Questions</span>
                </>
              )}
            </button>
          </div>
        </form>
      </aside>

      {/* Main Content Area - Right */}
      <main className="flex-1 flex flex-col bg-slate-50/40 relative min-w-0 h-full overflow-hidden print:h-auto print:overflow-visible">
        
        {/* EMPTY STATE */}
        {status === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
             <div className="w-24 h-24 mb-6 bg-pink-50/60 border border-pink-100 rounded-[2rem] flex items-center justify-center shadow-inner relative">
                <BrainCircuit size={40} className="text-pink-500" />
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white p-1.5 rounded-xl shadow-lg">
                  <Sparkles size={14} />
                </div>
             </div>
             <h2 className="font-display font-extrabold text-2xl text-slate-800 tracking-tight mb-3">
               Professional AI Test Builder
             </h2>
             <p className="max-w-md text-sm font-semibold text-slate-500 leading-relaxed">
               Describe your assessment requirements precisely in the configuration panel, and TestoriaX Intelligence will instantly generate a structured, editable test.
             </p>
          </div>
        )}

        {/* GENERATING STATE */}
        {status === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="relative mb-10">
              <div className="w-20 h-20 rounded-full border-[5px] border-slate-100 border-t-pink-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit size={24} className="text-pink-500 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-4 w-full max-w-xs">
              {GENERATION_STEPS.map((step, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center gap-3.5 transition-all duration-300 p-2.5 rounded-xl ${
                    idx === generationStep 
                      ? 'bg-white shadow-sm border border-slate-100 opacity-100 scale-105' 
                      : idx < generationStep 
                        ? 'opacity-50' 
                        : 'opacity-25'
                  }`}
                >
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                     idx === generationStep ? 'bg-pink-100 text-pink-600' : 
                     idx < generationStep ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                   }`}>
                     {idx < generationStep ? <Check size={12} strokeWidth={3} /> : 
                      idx === generationStep ? <Loader2 size={12} className="animate-spin" /> : 
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                   </div>
                   <span className={`text-xs font-bold ${idx === generationStep ? 'text-pink-600' : idx < generationStep ? 'text-emerald-700' : 'text-slate-500'}`}>
                     {step}
                   </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="flex-1 flex items-center justify-center p-8 animate-in zoom-in-95 duration-300">
             <GlassCard className="max-w-md w-full p-8 text-center border-rose-100 bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-5">
                   <X size={28} />
                </div>
                <h3 className="font-display text-xl font-extrabold text-slate-800 mb-2">Generation Unsuccessful</h3>
                <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">
                  Unable to generate questions right now. Please try again.
                </p>
                <div className="flex justify-center gap-3">
                   <button 
                     onClick={handleGenerate} 
                     className="px-6 py-3 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors flex items-center gap-2 shadow-md shadow-rose-500/20"
                   >
                     <RotateCcw size={16} /> Retry Generation
                   </button>
                </div>
             </GlassCard>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'success' && generatedTest && (
          <>
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col gap-6 relative pb-48 lg:pb-32 animate-in fade-in duration-500 custom-scrollbar print:pb-0 print:p-0 print:overflow-visible">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                   <Check size={20} strokeWidth={3} />
                 </div>
                 <div>
                   <h2 className="font-display font-extrabold text-xl text-slate-800">Generated Successfully</h2>
                   <p className="text-xs text-slate-500 font-semibold">Review, select, and import your questions.</p>
                 </div>
               </div>
            </div>

            {/* AI Summary Card */}
            <GlassCard className="p-5 flex flex-wrap items-center justify-between gap-6 border-slate-200/60 shadow-sm bg-white/80">
               <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topic</span>
                  <span className="text-sm font-extrabold text-slate-800 truncate max-w-[200px]">{generatedTest.topic}</span>
               </div>
               <div className="w-px h-8 bg-slate-100 hidden sm:block" />
               
               <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</span>
                  <span className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded flex items-center w-max ${
                    generatedTest.difficulty === 'easy' ? 'text-emerald-700 bg-emerald-50' :
                    generatedTest.difficulty === 'medium' ? 'text-amber-700 bg-amber-50' : 
                    generatedTest.difficulty === 'hard' ? 'text-rose-700 bg-rose-50' : 'text-indigo-700 bg-indigo-50'
                  }`}>
                    {generatedTest.difficulty}
                  </span>
               </div>
               <div className="w-px h-8 bg-slate-100 hidden sm:block" />
               
               <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected</span>
                  <span className="text-sm font-extrabold text-pink-600">{getSelectedCount()} <span className="text-slate-400 text-xs">/ {generatedTest.questions.length}</span></span>
               </div>
               <div className="w-px h-8 bg-slate-100 hidden md:block" />

               <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Duration</span>
                  <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" /> {generatedTest.estimatedTime} Mins
                  </span>
               </div>
            </GlassCard>

            {/* Question Cards List */}
            <div className="space-y-6">
              {generatedTest.questions.map((q, idx) => {
                const isExp = expandedQuestions[q.id] !== false; 
                const isSelected = !!selectedQuestions[q.id];
                
                return (
                  <GlassCard key={q.id} className={`p-0 overflow-hidden shadow-sm transition-all hover:shadow-md ${
                    isSelected ? 'border-pink-300 bg-white ring-1 ring-pink-100' : 'border-slate-200/60 bg-white/60'
                  }`}>
                    {/* Question Content */}
                    {editingQId === q.id ? (
                      <div className="p-5 flex flex-col gap-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Edit Question Text</label>
                        <textarea 
                          value={editForm.text || ''} 
                          onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                          className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                        />
                        <div className="flex gap-2 justify-end mt-2">
                          <button onClick={() => setEditingQId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                          <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors shadow-md shadow-pink-500/20">Save Changes</button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 flex items-start gap-4">
                      {/* Checkbox */}
                      <button 
                        type="button" 
                        onClick={() => toggleQuestionSelection(q.id)}
                        className={`mt-1 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'text-pink-500' : 'text-slate-300 hover:text-slate-400'
                        }`}
                      >
                        {isSelected ? <CheckSquare size={22} className="fill-pink-50" /> : <Square size={22} />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-bold uppercase tracking-wide text-pink-700 bg-pink-100/70 px-2 py-0.5 rounded border border-pink-200/50">
                              {q.type}
                            </span>
                            <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {q.points} Marks
                            </span>
                            <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                              <Clock size={10} /> 1.5m Est.
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                               (q.difficulty || 'medium') === 'easy' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                               (q.difficulty || 'medium') === 'medium' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'
                            }`}>
                              {(q.difficulty || 'medium').toUpperCase()}
                            </span>
                            {bloomLevel && (
                               <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                 {bloomLevel}
                               </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleExpand(q.id)}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                          >
                            {isExp ? "Hide Content" : "Show Content"}
                          </button>
                        </div>
                        
                        <p className="text-sm font-extrabold text-slate-800 leading-relaxed whitespace-pre-wrap">
                          <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                          {String(q.text || '')}
                        </p>
                        {q.imageUrl && (
                          <div className="mt-3">
                            <img src={q.imageUrl} alt="Question context" className="max-w-full h-auto max-h-[300px] rounded-xl border border-slate-200 shadow-sm object-contain bg-slate-50" />
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Expandable details (Options / Explanations) */}
                    {isExp && (
                      <div className="px-5 pb-5 ml-9 border-t border-slate-50 pt-4 text-xs text-slate-600 space-y-4">
                        {q.type === 'mcq' && q.mcqData && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {(q.mcqData.options || []).map((opt, oIdx) => {
                              const isCorrect = q.mcqData?.correctOptionIndex === oIdx;
                              return (
                                <div key={oIdx} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                                  isCorrect
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-bold shadow-sm'
                                    : 'bg-slate-50/50 border-slate-200 text-slate-700 font-semibold'
                                }`}>
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                    isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                                  }`}>
                                    {isCorrect && <Check size={10} strokeWidth={4} />}
                                  </div>
                                  <span className="leading-snug">{String(opt)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'true-false' && q.trueFalseData && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                              q.trueFalseData.correctAnswer
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-bold shadow-sm'
                                : 'bg-slate-50/50 border-slate-200 text-slate-700 font-semibold'
                            }`}>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                q.trueFalseData.correctAnswer ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                              }`}>
                                {q.trueFalseData.correctAnswer && <Check size={10} strokeWidth={4} />}
                              </div>
                              <span className="leading-snug">TRUE</span>
                            </div>
                            <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                              !q.trueFalseData.correctAnswer
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-bold shadow-sm'
                                : 'bg-slate-50/50 border-slate-200 text-slate-700 font-semibold'
                            }`}>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                !q.trueFalseData.correctAnswer ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                              }`}>
                                {!q.trueFalseData.correctAnswer && <Check size={10} strokeWidth={4} />}
                              </div>
                              <span className="leading-snug">FALSE</span>
                            </div>
                          </div>
                        )}

                        {q.type === 'fillups' && q.fillupsData && (
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                            {String(q.fillupsData.sentence || '').split(/(\[.*?\])/).map((p, pIdx) => {
                              if (p.startsWith('[') && p.endsWith(']')) {
                                return (
                                  <span key={pIdx} className="mx-1 px-2.5 py-0.5 rounded-lg bg-pink-100/80 text-pink-800 font-extrabold border border-pink-200/60 shadow-sm text-xs">
                                    {p.slice(1, -1)}
                                  </span>
                                );
                              }
                              return <span key={pIdx}>{p}</span>;
                            })}
                          </div>
                        )}

                        {q.type === 'coding' && q.codingData && (
                          <div className="space-y-2 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center bg-slate-900 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-500"></div> {String(q.codingData.language || 'Code')}</span>
                              <span>{Array.isArray(q.codingData.testCases) ? q.codingData.testCases.length : 0} Test Cases</span>
                            </div>
                            <pre className="p-4 bg-[#0d1117] font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto m-0">
                              {String(q.codingData.starterCode || '')}
                            </pre>
                          </div>
                        )}

                        {q.type === 'matching' && q.matchingData && (
                          <div className="grid grid-cols-1 gap-2">
                            {(q.matchingData.pairs || []).map((pair: any, pIdx: number) => (
                              <div key={pIdx} className="flex flex-col sm:flex-row gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                <div className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-sm font-semibold text-slate-700 text-center shadow-sm w-full">
                                  {String(pair.left || '')}
                                </div>
                                <div className="text-slate-300 shrink-0 rotate-90 sm:rotate-0">↔</div>
                                <div className="flex-1 bg-indigo-50 border border-indigo-100 p-2 rounded-lg text-sm font-semibold text-indigo-900 text-center shadow-sm w-full">
                                  {String(pair.right || '')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tags */}
                        <div className="flex items-center gap-2 pt-2">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tags:</span>
                           <div className="flex gap-1.5">
                             <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold border border-slate-200">{generatedTest.topic}</span>
                             <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold border border-slate-200">AI Generated</span>
                           </div>
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                           <div className="mt-2 bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl text-indigo-900/90 font-medium text-[11px] leading-relaxed relative overflow-hidden">
                             <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-300"></div>
                             <strong className="block text-[9px] uppercase tracking-wider text-indigo-500/80 mb-1.5">Explanation</strong>
                             {q.explanation}
                           </div>
                        )}
                      </div>
                    )}

                    {/* Question Actions Bar */}
                    <div className="bg-slate-50 border-t border-slate-100 p-2.5 flex items-center gap-1 sm:gap-2 px-5 print:hidden">
                       <button onClick={() => handleQuestionAction('edit', idx)} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                         <Edit2 size={12}/> <span className="hidden sm:inline">Edit</span>
                       </button>
                       <button onClick={() => handleQuestionAction('delete', idx)} className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-100/70 px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                         <Trash2 size={12}/> <span className="hidden sm:inline">Delete</span>
                       </button>
                       <div className="h-4 w-px bg-slate-200 mx-1"></div>
                       <button onClick={() => handleQuestionAction('regenerate', idx)} disabled={regeneratingQId === q.id} className="text-[10px] font-bold text-slate-500 hover:text-pink-600 hover:bg-pink-50 px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
                         {regeneratingQId === q.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12}/>}
                         <span className="hidden sm:inline">{regeneratingQId === q.id ? "Generating..." : "Regenerate"}</span>
                       </button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>

            </div>
            
            {/* Bulk Actions & Import (Bottom Action Bar) */}
            <div className="absolute bottom-6 left-6 right-6 lg:left-8 lg:right-8 bg-white/95 backdrop-blur-xl border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-[0_8px_30px_rgb(0,0,0,0.08)] gap-4 z-20 animate-in slide-in-from-bottom-8 duration-500 print:hidden">
               
               <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
                 <button 
                   onClick={handleSelectAll} 
                   className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
                 >
                   {getSelectedCount() === generatedTest.questions.length ? <Square size={14}/> : <CheckSquare size={14}/>}
                   {getSelectedCount() === generatedTest.questions.length ? "Deselect All" : "Select All"}
                 </button>
                 
                 <div className="h-6 w-px bg-slate-200 shrink-0"></div>
                 
                 <button onClick={handleRegenerateAll} className="text-xs font-bold text-slate-600 hover:text-pink-600 hover:bg-pink-50 px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5">
                   <RotateCcw size={14}/> Regenerate All
                 </button>
                 
                 <button onClick={exportJSON} className="text-xs font-bold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5">
                   <FileJson size={14}/> Export JSON
                 </button>
                 
                 <button onClick={exportPDF} className="text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5">
                   <FileText size={14}/> Export PDF
                 </button>
               </div>
               
               <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:block mr-2">
                    {getSelectedCount()} Selected
                  </span>
                  <button 
                    onClick={handleImportToBuilder} 
                    className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-sm font-extrabold hover:shadow-lg shadow-pink-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 w-full md:w-auto shadow-md"
                  >
                    Import Selected Questions <ArrowRight size={16} />
                  </button>
               </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AITestGenerator;
