import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, BrainCircuit, ArrowLeft, Check, RotateCcw, 
  Trash2, Plus, Edit2, Save, ArrowRight, 
  Clock, Image, Paperclip, X, Loader2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import GlassCard from '../ui/GlassCard';
import { supabase } from '../../lib/supabaseClient';

interface AITestGeneratorPageProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard' | 'builder' | 'create-test' | 'ai-generator-page', testTitle?: string) => void;
  prevView?: string | null;
}

export interface GeneratedQuestion {
  id: string;
  type: 'mcq' | 'fillups' | 'true-false' | 'coding' | 'matching' | 'image';
  text: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[]; // for MCQ
  correctOptionIndex?: number; // for MCQ
  answers?: string[]; // for fillups
  sentence?: string; // for fillups
  correctAnswer?: boolean; // for true-false
  language?: string; // for coding
  starterCode?: string; // for coding
  testCases?: { input: string; expectedOutput: string }[]; // for coding
  pairs?: { left: string; right: string }[]; // for matching
  imageUrl?: string; // for image-based
}

// Pre-compiled Mock Question Library (removed for live AI generation)

const SUGGESTED_TOPICS = [
  "React Hooks",
  "Python OOP",
  "Spanish Language",
  "World History",
  "Quantum Physics",
  "English Grammar",
  "Financial Accounting",
  "Organic Chemistry"
];

// Helper to identify topic category
export const getTopicCategory = (topic: string): 'programming' | 'languages' | 'science' | 'humanities' | 'general' => {
  const t = topic.toLowerCase();
  
  const programmingKeywords = ['react', 'python', 'java', 'sql', 'docker', 'coding', 'html', 'css', 'js', 'javascript', 'typescript', 'script', 'loop', 'function', 'class', 'container', 'database', 'query', 'git', 'algorithm', 'structures', 'logic', 'oop', 'c++', 'c#', 'rust', 'go ', 'golang', 'node', 'api', 'programming', 'software', 'develop', 'web', 'frontend', 'backend'];
  
  const languagesKeywords = ['english', 'spanish', 'french', 'german', 'hindi', 'japanese', 'chinese', 'language', 'grammar', 'verb', 'vocabulary', 'translate', 'tense', 'speak', 'pronunciation', 'sanskrit', 'linguistic', 'word', 'sentence', 'write', 'read', 'conversat', 'vocab', 'italian', 'russian', 'korean', 'arabic'];
  
  const scienceKeywords = ['quantum', 'physics', 'science', 'cell', 'chemical', 'organic', 'math', 'algebra', 'geometry', 'equation', 'atom', 'force', 'energy', 'molecule', 'gene', 'evolution', 'biology', 'chemistry', 'calculus', 'astronomy', 'calculat', 'space', 'gravity', 'thermodynamic', 'relativity'];
  
  const humanitiesKeywords = ['history', 'geography', 'world', 'country', 'war', 'king', 'empire', 'music', 'art', 'painting', 'literature', 'book', 'author', 'president', 'government', 'social', 'civic', 'politic', 'revolution', 'ancient', 'medieval', 'capital', 'culture', 'philosophy'];

  if (programmingKeywords.some(kw => t.includes(kw))) return 'programming';
  if (languagesKeywords.some(kw => t.includes(kw))) return 'languages';
  if (scienceKeywords.some(kw => t.includes(kw))) return 'science';
  if (humanitiesKeywords.some(kw => t.includes(kw))) return 'humanities';
  
  return 'general';
};

let globalIdCounter = 0;
const generateUniqueId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${globalIdCounter++}`;
};

const mapApiQuestionToFrontend = (q: any, index: number): GeneratedQuestion => {
  const id = `ai-gen-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;
  const difficulty = (q.difficulty || 'medium') as GeneratedQuestion['difficulty'];
  const points = q.marks || 5;

  let type: GeneratedQuestion['type'];
  const qType = String(q.questionType).toLowerCase();
  if (qType === 'mcq') type = 'mcq';
  else if (qType === 'fillup' || qType === 'fillups') type = 'fillups';
  else if (qType === 'true_false' || qType === 'true-false' || qType === 'true_false_question') type = 'true-false';
  else if (qType === 'coding') type = 'coding';
  else if (qType === 'match' || qType === 'matching') type = 'matching';
  else if (qType === 'image') type = 'image';
  else type = 'mcq'; // fallback

  const base: any = {
    id,
    type,
    text: q.question || q.problemStatement || q.text || '',
    points,
    difficulty,
  };

  if (type === 'mcq') {
    base.options = q.options || ['Option A', 'Option B', 'Option C', 'Option D'];
    const ansIndex = base.options.findIndex((opt: string) => opt.toLowerCase() === String(q.correctAnswer).toLowerCase());
    base.correctOptionIndex = ansIndex >= 0 ? ansIndex : 0;
  } else if (type === 'fillups') {
    base.answers = q.correctAnswer ? [String(q.correctAnswer)] : [''];
    base.sentence = q.question || '';
  } else if (type === 'true-false') {
    const ansStr = String(q.correctAnswer).toLowerCase();
    base.correctAnswer = ansStr === 'true' || ansStr === 'yes' || ansStr === 't' || q.correctAnswer === true;
  } else if (type === 'coding') {
    base.text = q.problemStatement || q.question || '';
    base.language = q.language || 'javascript';
    base.starterCode = q.starterCode || 'function execute() {\n  // Code\n}';
    base.testCases = q.testCases || [{ input: q.sampleInput || '', expectedOutput: q.sampleOutput || '' }];
  } else if (type === 'matching') {
    base.text = 'Match the items correctly.';
    if (q.answer && Array.isArray(q.answer)) {
      base.pairs = q.answer.map((pair: any) => ({
        left: pair.left || '',
        right: pair.right || ''
      }));
    } else {
      const lefts = q.left || [];
      const rights = q.right || [];
      base.pairs = lefts.map((l: string, i: number) => ({
        left: l,
        right: rights[i] || ''
      }));
    }
  } else if (type === 'image') {
    base.imageUrl = q.imageUrl || 'from-pink-500 to-indigo-500';
  }

  return base as GeneratedQuestion;
};

export const AITestGeneratorPage: React.FC<AITestGeneratorPageProps> = ({ onNavigate, prevView }) => {
  const { showToast } = useToast();
  const [regeneratingQId, setRegeneratingQId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  
  // Question types selected (starts with all checked)
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
    mcq: true,
    fillups: true,
    'true-false': true,
    coding: true,
    matching: true,
    image: false
  });

  // State for generated test
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>(() => {
    const saved = localStorage.getItem('testoriax_builder_initial_questions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading saved initial questions in AI Generator Page:", e);
      }
    }
    return [];
  });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [hasGenerated, setHasGenerated] = useState<boolean>(() => {
    const saved = localStorage.getItem('testoriax_builder_initial_questions');
    return !!saved;
  });
  const [editingQId, setEditingQId] = useState<string | null>(null);

  // Inline edit state copy
  const [editForm, setEditForm] = useState<Partial<GeneratedQuestion>>({});

  // Attachment states
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string } | null>(null);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [pastedPatternText, setPastedPatternText] = useState('');

  const handleToggleType = (typeKey: string) => {
    setSelectedTypes(prev => ({ ...prev, [typeKey]: !prev[typeKey] }));
  };


  const handleGenerate = async () => {
    if (!topic.trim()) {
      showToast('Please enter a Topic/Subject first!', 'warning');
      return;
    }

    const activeTypes = Object.entries(selectedTypes)
      .filter((entry) => entry[1])
      .map((entry) => {
        const type = entry[0];
        if (type === 'fillups') return 'fillup';
        if (type === 'true-false') return 'true_false';
        if (type === 'matching') return 'match';
        return type;
      });

    if (activeTypes.length === 0) {
      showToast('Please select at least one Question Type!', 'warning');
      return;
    }

    setIsGenerating(true);
    setHasGenerated(false);
    setEditingQId(null);

    setLoadingStep('Accessing Testoriax LLM weights...');
    
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev.includes('weights')) return 'Analyzing parameters and prompt variables...';
        if (prev.includes('parameters')) return 'Contacting Gemini AI Engine...';
        if (prev.includes('Gemini')) return 'Generating high-quality questions...';
        return 'Structuring sections & calibrating correct keys...';
      });
    }, 1200);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          totalQuestions: numQuestions,
          selectedQuestionTypes: activeTypes
        })
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        let errMessage = 'Failed to generate questions.';
        try {
          const errData = await response.json();
          errMessage = errData.error || errMessage;
        } catch {}
        throw new Error(errMessage);
      }

      const rawQuestions = await response.json();
      if (!Array.isArray(rawQuestions)) {
        throw new Error('Invalid response format from Gemini.');
      }

      const mappedQuestions = rawQuestions.map((q: any, idx: number) => {
        return mapApiQuestionToFrontend(q, idx);
      });

      setGeneratedQuestions(mappedQuestions);
      setHasGenerated(true);
      showToast(`Successfully generated ${mappedQuestions.length} questions!`, 'success');
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      showToast(err.message || 'Network error or rate limit exceeded. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSingleQuestion = async (qId: string, qType: GeneratedQuestion['type'], qDiff: GeneratedQuestion['difficulty']) => {
    if (regeneratingQId) return;

    setRegeneratingQId(qId);
    showToast('Regenerating question with AI...', 'info');

    let apiType = 'mcq';
    if (qType === 'fillups') apiType = 'fillup';
    else if (qType === 'true-false') apiType = 'true_false';
    else if (qType === 'coding') apiType = 'coding';
    else if (qType === 'matching') apiType = 'match';
    else if (qType === 'image') apiType = 'image';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          topic: topic.trim() || 'General Knowledge',
          difficulty: qDiff,
          totalQuestions: 1,
          selectedQuestionTypes: [apiType]
        })
      });

      if (!response.ok) {
        let errMessage = 'Failed to regenerate question.';
        try {
          const errData = await response.json();
          errMessage = errData.error || errMessage;
        } catch {}
        throw new Error(errMessage);
      }

      const rawQuestions = await response.json();
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw new Error('Invalid response format: expected at least one question.');
      }

      const newQuestion = mapApiQuestionToFrontend(rawQuestions[0], 0);
      newQuestion.id = qId; // keep same ID to preserve position and state

      setGeneratedQuestions(prev => prev.map(q => q.id === qId ? newQuestion : q));
      showToast('Question regenerated successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to regenerate question.', 'error');
    } finally {
      setRegeneratingQId(null);
    }
  };

  // Edit / Delete logic
  const startEditing = (q: GeneratedQuestion) => {
    setEditingQId(q.id);
    setEditForm({ ...q });
  };

  const saveEdit = (qId: string) => {
    setGeneratedQuestions(prev => 
      prev.map(q => q.id === qId ? { ...q, ...editForm } as GeneratedQuestion : q)
    );
    setEditingQId(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    setEditingQId(null);
    setEditForm({});
  };

  const deleteQuestion = (qId: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== qId));
  };

  const addQuestionNode = (type: GeneratedQuestion['type']) => {
    const id = generateUniqueId('ai-manual');
    const newQ: GeneratedQuestion = {
      id,
      type,
      text: `New ${type.toUpperCase()} question statement.`,
      points: 5,
      difficulty: difficulty
    };

    if (type === 'mcq') {
      newQ.options = ['Option A', 'Option B', 'Option C', 'Option D'];
      newQ.correctOptionIndex = 0;
    } else if (type === 'true-false') {
      newQ.correctAnswer = true;
    } else if (type === 'fillups') {
      newQ.sentence = "This is a [blank] sentence.";
      newQ.answers = ["blank"];
    } else if (type === 'coding') {
      newQ.language = "javascript";
      newQ.starterCode = "function execute() {\n  // Code\n}";
      newQ.testCases = [{ input: "()", expectedOutput: "undefined" }];
    } else if (type === 'matching') {
      newQ.pairs = [{ left: "Item 1", right: "Match 1" }];
    } else if (type === 'image') {
      newQ.imageUrl = "from-pink-500 to-indigo-500";
    }

    setGeneratedQuestions(prev => [...prev, newQ]);
    startEditing(newQ); // Open inline editor immediately for convenience!
  };

  // Final Action Handlers
  const handleSaveTest = () => {
    localStorage.setItem('testoriax_builder_initial_questions', JSON.stringify(generatedQuestions));
    alert('Test successfully saved to local drafts!');
  };

  const handleContinuePublish = () => {
    localStorage.setItem('testoriax_builder_initial_questions', JSON.stringify(generatedQuestions));
    onNavigate('create-test');
    
    // Auto click/go to Step 3 after loading
    setTimeout(() => {
      const detailsBtn = document.querySelector('[data-step-nav="3"]') as HTMLButtonElement;
      if (detailsBtn) detailsBtn.click();
    }, 100);
  };

  const totalPoints = generatedQuestions.reduce((sum, q) => sum + q.points, 0);
  const totalMins = generatedQuestions.reduce((sum, q) => {
    if (q.type === 'coding') return sum + 10;
    if (q.type === 'image') return sum + 3;
    if (q.type === 'matching') return sum + 3;
    if (q.type === 'fillups') return sum + 2;
    return sum + 1.5;
  }, 0);

  // Helper: group generated questions by type
  const groupedQuestions = generatedQuestions.reduce((group, q) => {
    if (!group[q.type]) group[q.type] = [];
    group[q.type].push(q);
    return group;
  }, {} as Record<GeneratedQuestion['type'], GeneratedQuestion[]>);

  const questionTypesMeta = [
    { id: 'mcq', label: 'MCQ (Single Choice)' },
    { id: 'fillups', label: 'Fill in the Blanks' },
    { id: 'true-false', label: 'True / False' },
    { id: 'coding', label: 'Coding Question' },
    { id: 'matching', label: 'Match Following' },
    { id: 'image', label: 'Image Based' }
  ];

  return (
    <div className="min-h-screen bg-[#fffafb] flex flex-col font-sans select-none antialiased relative">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate(prevView === 'create-test' ? 'create-test' : 'dashboard')}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline text-xs font-bold">Back</span>
          </button>
          <div className="h-5 w-px bg-slate-100 hidden sm:block" />
          <h1 className="font-display font-extrabold text-base text-slate-850 tracking-tight flex items-center gap-2">
            <BrainCircuit size={16} className="text-purple-600 animate-pulse" />
            <span>AI Test Generator</span>
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative h-[calc(100vh-72px)]">
      
        {/* Decorative blobs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-purple-200/20 rounded-full glowing-blob pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/20 rounded-full glowing-blob pointer-events-none" />

        {/* LEFT PANEL: CHATGPT-STYLE AI CONFIGURATOR */}
        <aside className="w-full lg:w-80 bg-white/60 border-b lg:border-b-0 lg:border-r border-slate-100 p-6 flex flex-col gap-5 shrink-0 overflow-y-auto z-10 relative">
          <div className="flex flex-col gap-1">
            <h3 className="font-display font-extrabold text-xs text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
              <BrainCircuit size={14} className="text-purple-500" />
              <span>Prompt Configurator</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-0.5">
              Calibrate rules to prompt Testoriax's LLM engine.
            </p>
          </div>

        {/* Input form */}
        <div className="flex flex-col gap-4.5 mt-2">
          {/* Topic */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Topic / Subject</label>
            <input
              type="text"
              required
              placeholder="e.g. React Hooks, Java OOP..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white"
            />
            
            {/* Suggestions */}
            <div className="flex flex-wrap gap-1 mt-1">
              {SUGGESTED_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`text-[8px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                    topic.toLowerCase() === t.toLowerCase()
                      ? 'bg-purple-500 border-purple-500 text-white shadow-sm'
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-655'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Difficulty</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map((diff) => {
                const isSel = difficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-wide transition-all cursor-pointer text-center ${
                      isSel
                        ? diff === 'easy' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                          : diff === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                          : 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                        : 'bg-white border-slate-150 text-slate-400 hover:border-slate-250 hover:text-slate-600'
                    }`}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Number of Questions */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Number of Questions</label>
              <span className="text-xs font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">{numQuestions}</span>
            </div>
            <input
              type="range"
              min={3}
              max={50}
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer mt-1"
            />
            <div className="flex justify-between text-[8px] font-bold text-slate-350 px-1">
              <span>3 Qs</span>
              <span>50 Qs</span>
            </div>
          </div>

          {/* Question Types checkboxes */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Question Types</label>
            <div className="flex flex-col gap-1.5">
              {questionTypesMeta.map((typeMeta) => {
                const isEnabled = selectedTypes[typeMeta.id];
                return (
                  <button
                    key={typeMeta.id}
                    type="button"
                    onClick={() => handleToggleType(typeMeta.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isEnabled
                        ? 'border-purple-200 bg-purple-50/20 text-purple-700 font-extrabold shadow-sm'
                        : 'border-slate-100 bg-white/70 text-slate-450 hover:border-slate-200 hover:text-slate-600'
                    }`}
                  >
                    <span className="text-xs">{typeMeta.label}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isEnabled ? 'border-purple-500 bg-purple-500 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isEnabled && <Check size={10} strokeWidth={4} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Material & Pattern */}
          <div className="bg-white/50 border border-slate-100/50 p-4 rounded-3xl space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Reference Material</label>
              <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded uppercase">Pattern Match</span>
            </div>

            {attachedFile ? (
              <div className="flex items-center justify-between bg-purple-50/20 border border-purple-100/30 px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700 min-w-0">
                  <Paperclip size={12} className="text-purple-500 shrink-0" />
                  <span className="truncate">{attachedFile.name}</span>
                  <span className="text-[8px] opacity-75 font-semibold">({attachedFile.type})</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAttachedFile(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const choice = confirm("Attach source file for prompt context?\n\nPress OK to mock upload reference_syllabus.pdf.\nPress Cancel to paste a text pattern instead.");
                    if (choice) {
                      setAttachedFile({ name: 'reference_syllabus.pdf', type: 'PDF File' });
                    } else {
                      setIsAttachmentOpen(true);
                    }
                  }}
                  className="flex-1 py-1.5 rounded-xl border border-slate-100 bg-white hover:border-purple-200 text-[10px] font-bold text-slate-500 transition-all cursor-pointer text-center"
                >
                  Attach File
                </button>
                <button
                  type="button"
                  onClick={() => setIsAttachmentOpen(true)}
                  className="flex-1 py-1.5 rounded-xl border border-slate-100 bg-white hover:border-purple-200 text-[10px] font-bold text-slate-500 transition-all cursor-pointer text-center"
                >
                  Paste Pattern
                </button>
              </div>
            )}

            {isAttachmentOpen && (
              <div className="bg-white border border-slate-150 p-2.5 rounded-xl flex flex-col gap-2">
                <textarea
                  rows={2}
                  placeholder="Paste pattern instructions or question style..."
                  value={pastedPatternText}
                  onChange={(e) => setPastedPatternText(e.target.value)}
                  className="w-full p-2 border border-slate-150 rounded-lg text-[10px] bg-slate-50 outline-none focus:bg-white focus:border-purple-300 font-semibold"
                />
                <div className="flex justify-end gap-1.5">
                  <button 
                    type="button" 
                    onClick={() => setIsAttachmentOpen(false)} 
                    className="px-2 py-0.5 rounded text-[8px] font-bold text-slate-450 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pastedPatternText.trim()) {
                        setAttachedFile({ name: 'custom_pattern.txt', type: 'Pasted Text' });
                      }
                      setIsAttachmentOpen(false);
                    }}
                    className="px-2.5 py-0.5 bg-purple-600 text-white font-bold rounded text-[8px] cursor-pointer"
                  >
                    Attach
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 disabled:from-slate-200 disabled:to-slate-350 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-purple-500/10 hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed mt-2"
          >
            <Sparkles size={14} className="fill-white" />
            <span>Generate Test with AI</span>
          </button>
        </div>
      </aside>

      {/* RIGHT PANEL: GENERATED TEST PREVIEW */}
      <main className="flex-1 flex flex-col bg-slate-50/25 relative min-w-0 h-full overflow-hidden">
        
        {/* Loading overlay state */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#fffafb]/90 z-30 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner mb-6 relative animate-pulse">
                <BrainCircuit size={28} />
              </div>
              
              <h3 className="font-display font-extrabold text-base text-slate-800">Prompting AI Engine...</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1 animate-pulse max-w-xs">{loadingStep}</p>
              
              <div className="w-48 bg-slate-100 h-1 rounded-full overflow-hidden mt-6">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header summary statistics */}
        {hasGenerated && (
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-10 relative">
            <div>
              <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase">AI Calibrated</span>
              <h2 className="font-display font-extrabold text-sm text-slate-800 mt-1 line-clamp-1">
                Generated: {topic} Assessment
              </h2>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 mt-0.5">
                  <Clock size={12} className="text-slate-400" />
                  <span>{totalMins} mins</span>
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="text-right">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Calibrated Marks</span>
                <span className="text-xs font-extrabold text-purple-600 block mt-0.5">
                  {totalPoints} pts
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Viewport for generated categories preview */}
        <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-8 min-h-0">
          
          {/* Welcome/Empty state (ChatGPT style welcome dashboard) */}
          {!hasGenerated && (
            <div className="max-w-2xl w-full mx-auto my-auto flex flex-col items-center text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-650 flex items-center justify-center shadow-inner mb-6 relative animate-pulse">
                <BrainCircuit size={28} />
                <div className="absolute -bottom-1.5 -right-1.5 bg-purple-600 text-white p-1 rounded-xl shadow-md">
                  <Sparkles size={11} />
                </div>
              </div>
              
              <h2 className="font-display font-extrabold text-xl text-slate-800 tracking-tight">
                How would you like to build today?
              </h2>
              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed max-w-sm font-semibold animate-pulse">
                Set a topic on the left sidebar or write a custom prompt at the bottom to compile a fully calibrated test with questions, difficulty badges, and timing metrics instantly.
              </p>

              {/* Guide Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-10">
                <GlassCard
                  onClick={() => { setTopic('React Hooks'); setDifficulty('medium'); setNumQuestions(4); }}
                  className="p-4.5 border-slate-100/60 hover:border-purple-200 cursor-pointer flex flex-col items-start text-left bg-white"
                >
                  <span className="text-[9px] font-bold text-purple-600 uppercase bg-purple-50 px-2 py-0.5 rounded-full mb-2">Frontend</span>
                  <span className="text-xs font-bold text-slate-800">React Hooks Assessment</span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">Generate MCQs, true/false, fillups, and custom coding hooks challenges.</p>
                </GlassCard>

                <GlassCard
                  onClick={() => { setTopic('Python OOP'); setDifficulty('hard'); setNumQuestions(4); }}
                  className="p-4.5 border-slate-100/60 hover:border-indigo-200 cursor-pointer flex flex-col items-start text-left bg-white"
                >
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-2">Backend</span>
                  <span className="text-xs font-bold text-slate-800">Python OOP Fundamentals</span>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">Create class design questions with multiple testcases and constructors.</p>
                </GlassCard>
              </div>
            </div>
          )}

          {/* Grouped questions layout */}
          {hasGenerated && (
            <div className="max-w-3xl w-full mx-auto flex flex-col gap-6.5 pb-24">
              {questionTypesMeta.map((typeMeta) => {
                const qType = typeMeta.id as GeneratedQuestion['type'];
                const groupQuestions = groupedQuestions[qType] || [];
                
                // Don't render the section header if no questions of this type were generated
                if (groupQuestions.length === 0) return null;

                return (
                  <div key={qType} className="flex flex-col gap-4 border-l-2 border-purple-150/50 pl-5 relative">
                    {/* Section Header */}
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-xl border border-purple-100/10 flex items-center gap-1.5 uppercase">
                        {qType === 'image' && <Image size={10} />}
                        <span>{typeMeta.label}s ({groupQuestions.length})</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => addQuestionNode(qType)}
                        className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 hover:underline outline-none"
                      >
                        <Plus size={11} />
                        <span>Add Question</span>
                      </button>
                    </div>

                    {/* Question nodes list */}
                    <div className="flex flex-col gap-3">
                      {groupQuestions.map((q, qIdx) => {
                        const isEditing = editingQId === q.id;
                        return (
                          <motion.div
                            key={q.id}
                            layout
                            className={`p-5 rounded-2xl border bg-white relative transition-all duration-300 ${
                              isEditing 
                                ? 'border-purple-300 ring-2 ring-purple-100 shadow-md' 
                                : 'border-slate-100/80 hover:border-slate-200 hover:shadow-sm'
                            }`}
                          >
                            {/* Question Card Content */}
                            {!isEditing ? (
                              <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Q{qIdx + 1}</span>
                                    <span className="text-[9px] font-bold text-slate-400 capitalize">{q.difficulty} difficulty</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold text-slate-655 mr-2">{q.points} pts</span>
                                    <button
                                      onClick={() => startEditing(q)}
                                      className="p-1.5 rounded bg-slate-50 text-slate-500 hover:text-purple-600 transition-colors cursor-pointer"
                                      title="Edit Question"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button
                                      disabled={regeneratingQId === q.id}
                                      onClick={() => handleRegenerateSingleQuestion(q.id, q.type, q.difficulty)}
                                      className="p-1.5 rounded bg-slate-50 text-slate-500 hover:text-purple-650 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center"
                                      title="Regenerate Single Question with AI"
                                    >
                                      <RotateCcw size={11} className={regeneratingQId === q.id ? 'animate-spin text-purple-650' : ''} />
                                    </button>
                                    <button
                                      onClick={() => deleteQuestion(q.id)}
                                      className="p-1.5 rounded bg-slate-50 text-slate-450 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Delete Question"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>

                                <p className="text-xs font-bold text-slate-800 leading-snug">{q.text}</p>

                                {/* MCQ Option Lists */}
                                {q.type === 'mcq' && q.options && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                    {q.options.map((opt, oIdx) => {
                                      const isCorrect = q.correctOptionIndex === oIdx;
                                      return (
                                        <div 
                                          key={oIdx}
                                          className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-between ${
                                            isCorrect 
                                              ? 'border-emerald-250 bg-emerald-50/20 text-emerald-700 font-extrabold'
                                              : 'border-slate-100 bg-slate-50/20 text-slate-500'
                                          }`}
                                        >
                                          <span>{opt}</span>
                                          {isCorrect && <Check size={11} strokeWidth={4} className="text-emerald-600" />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* True/False */}
                                {q.type === 'true-false' && (
                                  <div className="flex gap-2.5 mt-1 text-[10px] font-bold">
                                    <span className={`px-2.5 py-1 rounded-lg border ${
                                      q.correctAnswer 
                                        ? 'border-emerald-200 bg-emerald-50/20 text-emerald-700' 
                                        : 'border-slate-100 bg-slate-50/20 text-slate-400'
                                    }`}>TRUE</span>
                                    <span className={`px-2.5 py-1 rounded-lg border ${
                                      !q.correctAnswer 
                                        ? 'border-emerald-200 bg-emerald-50/20 text-emerald-700' 
                                        : 'border-slate-100 bg-slate-50/20 text-slate-400'
                                    }`}>FALSE</span>
                                  </div>
                                )}

                                {/* Fill in the Blanks */}
                                {q.type === 'fillups' && (
                                  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[11px] font-semibold text-slate-700 leading-relaxed mt-1">
                                    {q.text.split(/(\[.*?\])/).map((p, idx) => {
                                      if (p.startsWith('[') && p.endsWith(']')) {
                                        return (
                                          <span key={idx} className="mx-1 px-1.5 py-0.5 rounded bg-purple-100/50 text-purple-700 font-extrabold border border-purple-200/20 text-[10px]">
                                            {p.slice(1, -1)}
                                          </span>
                                        );
                                      }
                                      return <span key={idx}>{p}</span>;
                                    })}
                                  </div>
                                )}

                                {/* Coding Question */}
                                {q.type === 'coding' && q.starterCode && (
                                  <div className="mt-1 space-y-1.5">
                                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
                                      <span>Language: {q.language}</span>
                                    </div>
                                    <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[10px] text-slate-300 leading-normal max-h-20 overflow-y-auto">
                                      {q.starterCode}
                                    </pre>
                                  </div>
                                )}

                                {/* Match the Following */}
                                {q.type === 'matching' && q.pairs && (
                                  <div className="space-y-1.5 mt-1">
                                    {q.pairs.map((p, pIdx) => (
                                      <div key={pIdx} className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500">
                                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-150 text-slate-700">{p.left}</span>
                                        <span>⇄</span>
                                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-150 text-slate-700">{p.right}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Image Based */}
                                {q.type === 'image' && q.imageUrl && (
                                  <div className={`mt-1 h-20 bg-gradient-to-r ${q.imageUrl} rounded-xl border border-transparent p-3 text-white font-extrabold flex items-center justify-between text-[10px]`}>
                                    <span>[ Mock Architecture Image Node ]</span>
                                    <Image size={18} />
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* INLINE QUESTION EDITOR PANEL */
                              <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded uppercase">Editing Card</span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => saveEdit(q.id)}
                                      className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check size={10} />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-lg text-[10px] font-bold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>

                                {/* Question Statement input */}
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-bold text-slate-400 uppercase">Question Text</label>
                                  <textarea
                                    rows={2}
                                    value={editForm.text || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, text: e.target.value }))}
                                    className="w-full p-2 rounded-xl border border-slate-200 outline-none text-xs focus:border-purple-400 bg-white font-semibold"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Points</label>
                                    <input
                                      type="number"
                                      value={editForm.points || 5}
                                      onChange={(e) => setEditForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                                      className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 outline-none text-xs bg-white font-semibold"
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Difficulty</label>
                                    <select
                                      value={editForm.difficulty || 'medium'}
                                      onChange={(e) => setEditForm(prev => ({ ...prev, difficulty: e.target.value as GeneratedQuestion['difficulty'] }))}
                                      className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 outline-none text-xs bg-white font-semibold"
                                    >
                                      <option value="easy">Easy</option>
                                      <option value="medium">Medium</option>
                                      <option value="hard">Hard</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Custom Editor Fields Based on Type */}
                                {q.type === 'mcq' && editForm.options && (
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Options (Highlight Correct Option)</label>
                                    <div className="flex flex-col gap-2">
                                      {editForm.options.map((opt, oIdx) => {
                                        const isCorrect = editForm.correctOptionIndex === oIdx;
                                        return (
                                          <div key={oIdx} className="flex items-center gap-2.5">
                                            <button
                                              type="button"
                                              onClick={() => setEditForm(prev => ({ ...prev, correctOptionIndex: oIdx }))}
                                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                                              }`}
                                            >
                                              {isCorrect && <Check size={8} strokeWidth={4} />}
                                            </button>
                                            <input
                                              type="text"
                                              value={opt}
                                              onChange={(e) => {
                                                const newOpts = [...(editForm.options || [])];
                                                newOpts[oIdx] = e.target.value;
                                                setEditForm(prev => ({ ...prev, options: newOpts }));
                                              }}
                                              className="flex-1 py-1 px-2.5 rounded-lg border border-slate-200 text-xs"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {q.type === 'true-false' && (
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Correct Answer</label>
                                    <div className="flex gap-3">
                                      {[true, false].map((val) => {
                                        const isSel = editForm.correctAnswer === val;
                                        return (
                                          <button
                                            key={val.toString()}
                                            type="button"
                                            onClick={() => setEditForm(prev => ({ ...prev, correctAnswer: val }))}
                                            className={`flex-1 py-1.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                                              isSel 
                                                ? 'border-emerald-500 bg-emerald-50/20 text-emerald-700'
                                                : 'border-slate-100 text-slate-400 bg-slate-50/50'
                                            }`}
                                          >
                                            {val ? "TRUE" : "FALSE"}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {q.type === 'fillups' && (
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Sentence configuration</label>
                                    <input
                                      type="text"
                                      placeholder="Use [blank] for slots, e.g. React is a [library]"
                                      value={editForm.text || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const regex = /\[(.*?)\]/g;
                                        const answers: string[] = [];
                                        let match;
                                        while ((match = regex.exec(val)) !== null) {
                                          answers.push(match[1]);
                                        }
                                        setEditForm(prev => ({
                                          ...prev,
                                          text: val,
                                          sentence: val,
                                          answers
                                        }));
                                      }}
                                      className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 outline-none text-xs"
                                    />
                                  </div>
                                )}

                                {q.type === 'coding' && (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase">Boilerplate code</label>
                                      <select
                                        value={editForm.language || 'javascript'}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, language: e.target.value }))}
                                        className="py-0.5 px-1.5 rounded border border-slate-200 text-[10px]"
                                      >
                                        <option value="javascript">JavaScript</option>
                                        <option value="python">Python</option>
                                      </select>
                                    </div>
                                    <textarea
                                      rows={4}
                                      value={editForm.starterCode || ''}
                                      onChange={(e) => setEditForm(prev => ({ ...prev, starterCode: e.target.value }))}
                                      className="w-full p-2.5 rounded-xl border border-slate-250 font-mono text-[11px] bg-slate-900 text-slate-350"
                                    />
                                  </div>
                                )}

                                {q.type === 'matching' && editForm.pairs && (
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Pairs matches</label>
                                    <div className="space-y-2">
                                      {editForm.pairs.map((p, pIdx) => (
                                        <div key={pIdx} className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={p.left}
                                            onChange={(e) => {
                                              const newPairs = [...(editForm.pairs || [])];
                                              newPairs[pIdx] = { ...newPairs[pIdx], left: e.target.value };
                                              setEditForm(prev => ({ ...prev, pairs: newPairs }));
                                            }}
                                            className="flex-1 py-1 px-2 rounded-lg border border-slate-200 text-xs"
                                          />
                                          <span className="text-slate-400">⇄</span>
                                          <input
                                            type="text"
                                            value={p.right}
                                            onChange={(e) => {
                                              const newPairs = [...(editForm.pairs || [])];
                                              newPairs[pIdx] = { ...newPairs[pIdx], right: e.target.value };
                                              setEditForm(prev => ({ ...prev, pairs: newPairs }));
                                            }}
                                            className="flex-1 py-1 px-2 rounded-lg border border-slate-200 text-xs"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Floating actions toolbar */}
        {hasGenerated && (
          <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-[#fffafb] via-[#fffafb]/95 to-transparent flex gap-3 justify-end items-center border-t border-slate-100/40 z-20">
            <button
              disabled={isGenerating}
              onClick={handleGenerate}
              className="px-4 py-3 border border-slate-200 hover:border-slate-300 text-slate-655 rounded-2xl text-xs font-bold bg-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} className={`text-slate-450 ${isGenerating ? 'animate-spin' : 'animate-spin-once'}`} />
              <span>Regenerate Questions</span>
            </button>

            <button
              disabled={isGenerating}
              onClick={handleSaveTest}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              <span>Save Test</span>
            </button>

            <button
              disabled={isGenerating}
              onClick={handleContinuePublish}
              className="px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/10 hover:shadow-lg transition-all active:scale-[0.98] disabled:from-slate-200 disabled:to-slate-350 disabled:cursor-not-allowed"
            >
              <span>Continue to Publish</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Chat input box at the bottom (shown only when not generated yet) */}
        {!hasGenerated && (
          <div className="p-5 border-t border-slate-100/60 bg-white/80 backdrop-blur-md flex flex-col gap-2 relative z-10 shrink-0">
            {/* Attachment Preview Bar */}
            {attachedFile && (
              <div className="max-w-3xl w-full mx-auto flex items-center justify-between bg-purple-50/40 border border-purple-100/30 px-3 py-1.5 rounded-xl animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                  <Paperclip size={12} className="text-purple-500 animate-pulse" />
                  <span>📎 {attachedFile.name} ({attachedFile.type})</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAttachedFile(null)}
                  className="p-1 text-slate-400 hover:text-slate-655"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Paste Reference overlay modal if open */}
            {isAttachmentOpen && (
              <div className="max-w-3xl w-full mx-auto bg-white border border-slate-200 p-3 rounded-2xl flex flex-col gap-2 animate-in fade-in zoom-in-98 duration-150 mb-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase font-display">Paste Reference Question Pattern</span>
                  <button type="button" onClick={() => setIsAttachmentOpen(false)} className="text-slate-400 hover:text-slate-650"><X size={12} /></button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Paste reference text or questions format here..."
                  value={pastedPatternText}
                  onChange={(e) => setPastedPatternText(e.target.value)}
                  className="w-full p-2 border border-slate-150 rounded-xl text-[10px] bg-slate-50 outline-none focus:bg-white focus:border-purple-300"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (pastedPatternText.trim()) {
                        setAttachedFile({ name: 'custom_pattern.txt', type: 'Pasted Text' });
                      }
                      setIsAttachmentOpen(false);
                    }}
                    className="px-2.5 py-0.5 bg-purple-650 text-white font-bold rounded text-[8px] cursor-pointer"
                  >
                    Attach
                  </button>
                </div>
              </div>
            )}

            <div className="max-w-3xl w-full mx-auto relative flex items-center bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-200/50 transition-all">
              
              {/* Attachment paperclip trigger button */}
              <button
                type="button"
                onClick={() => {
                  const choice = confirm("Attach source file for prompt context?\n\nPress OK to mock upload exam_sheet_photo.jpg.\nPress Cancel to paste a text pattern instead.");
                  if (choice) {
                    setAttachedFile({ name: 'exam_sheet_photo.jpg', type: 'Image File' });
                  } else {
                    setIsAttachmentOpen(true);
                  }
                }}
                disabled={isGenerating}
                className="mr-2 p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-50/50 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
                title="Attach File / Pattern"
              >
                <Paperclip size={15} />
              </button>

              <input
                type="text"
                placeholder={isGenerating ? "AI is typing..." : "Customize your prompt, e.g. 'Generate a hard test on Quantum Physics'..."}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGenerating && topic.trim()) {
                    handleGenerate();
                  }
                }}
                className="flex-1 bg-transparent text-xs font-semibold text-slate-800 outline-none pr-12 placeholder-slate-400 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !topic.trim()}
                className="absolute right-2.5 p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-white disabled:text-slate-350 transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                title="Generate Test"
              >
                {isGenerating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} className="fill-white" />
                )}
              </button>
            </div>
            <div className="max-w-3xl w-full mx-auto flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest px-1 mt-2">
              <span>Powered by Testoriax LLM Engine</span>
              <span>Calibrated Difficulty Scaling</span>
            </div>
          </div>
        )}

      </main>

      </div>
    </div>
  );
};

export default AITestGeneratorPage;
