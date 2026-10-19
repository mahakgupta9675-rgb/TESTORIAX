import React, { useState, useEffect } from 'react';
import { Plus, Eye, ArrowLeft, Sparkles, BookOpen, Save, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { testsService } from '../../services/testsService';
import GlassCard from '../ui/GlassCard';
import QuestionCard from './QuestionCard';
import TestPreviewModal from './TestPreviewModal';
import type { Question, QuestionType } from './QuestionTypes';

const TEMPLATE_QUESTIONS: Question[] = [
  {
    id: 'q-template-1',
    type: 'mcq',
    text: 'Which React hook is specifically designed to perform side effects in functional components?',
    points: 5,
    difficulty: 'easy',
    mcqData: {
      options: ['useState', 'useRef', 'useEffect', 'useMemo'],
      correctOptionIndex: 2,
    },
  },
  {
    id: 'q-template-2',
    type: 'true-false',
    text: 'Tailwind CSS v4 uses CSS variables natively for theme configurations.',
    points: 3,
    difficulty: 'medium',
    trueFalseData: {
      correctAnswer: true,
    },
  },
  {
    id: 'q-template-3',
    type: 'coding',
    text: 'Write a JavaScript function "reverseString(str)" that takes a string input and returns it reversed.',
    points: 15,
    difficulty: 'hard',
    codingData: {
      language: 'javascript',
      starterCode: 'function reverseString(str) {\n  // Write your code here\n  \n}',
      solutionCode: 'function reverseString(str) {\n  return str.split("").reverse().join("");\n}',
      testCases: [
        { input: '"hello"', expectedOutput: '"olleh"' },
        { input: '"testoriax"', expectedOutput: '"arotset"' },
      ],
    },
  },
];

const generateQuestionId = () => `q-${Date.now()}`;

interface TestBuilderViewProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard') => void;
  initialTitle?: string;
}

export const TestBuilderView: React.FC<TestBuilderViewProps> = ({ onNavigate, initialTitle }) => {
  const { user } = useAuth();
  const location = useLocation();
  const state = location.state as { testId?: string } | null;
  const [testId, setTestId] = useState<string | null>(
    state?.testId || localStorage.getItem('testoriax_builder_test_id') || null
  );

  const [testTitle, setTestTitle] = useState(initialTitle || 'My New Assessment');
  const [testDesc, setTestDesc] = useState('Draft description containing instructions for candidates.');
  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('testoriax_builder_initial_questions');
    if (saved) {
      try {
        localStorage.removeItem('testoriax_builder_initial_questions');
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved initial questions:", e);
      }
    }
    return TEMPLATE_QUESTIONS;
  });
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isCreator, setIsCreator] = useState<boolean>(true);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Fetch test details & questions from Supabase if testId exists
  useEffect(() => {
    if (testId && user) {
      const fetchTestData = async () => {
        setIsDbLoading(true);
        try {
          const { data: testData, error: testError } = await testsService.getTestById(testId);
          if (testError) throw testError;
          if (testData) {
            setTestTitle(testData.title || '');
            setTestDesc(testData.description || '');
            if (testData.creator_id !== user.id) {
              setIsCreator(false);
            }
          }

          const { data: qData, error: qError } = await testsService.getQuestionsByTestIdForCreator(testId);
          if (qError) throw qError;
          if (qData) {
            setQuestions(qData);
          }
        } catch (err: any) {
          console.error("Failed to load test or questions:", err);
          triggerToast("Failed to load test details: " + err.message);
        } finally {
          setIsDbLoading(false);
        }
      };
      fetchTestData();
    }
  }, [testId, user]);

  // Sync questions list to Supabase (Auto-Save)
  const syncQuestionsToSupabase = async (currentQuestions: Question[]) => {
    if (!testId || !isCreator) return;
    try {
      const { error } = await testsService.saveQuestions(testId, currentQuestions);
      if (error) throw error;
    } catch (err: any) {
      console.error("Auto-save questions failed:", err);
      triggerToast("Auto-save failed: " + err.message);
    }
  };

  // Add Question
  const handleAddQuestion = (type: QuestionType) => {
    if (!isCreator) return;
    const newId = generateQuestionId();
    const newQuestion: Question = {
      id: newId,
      type,
      text: '',
      points: 5,
      difficulty: 'medium',
    };

    // Default schemas based on type
    if (type === 'mcq') {
      newQuestion.text = 'What is the capital of the United Kingdom?';
      newQuestion.mcqData = {
        options: ['Manchester', 'London', 'Birmingham', 'Edinburgh'],
        correctOptionIndex: 1,
      };
    } else if (type === 'true-false') {
      newQuestion.text = 'React is a component-based model library.';
      newQuestion.trueFalseData = { correctAnswer: true };
    } else if (type === 'matching') {
      newQuestion.text = 'Match the coding languages to their paradigms:';
      newQuestion.matchingData = {
        pairs: [
          { left: 'Haskell', right: 'Pure Functional' },
          { left: 'Java', right: 'Class Object-Oriented' },
        ],
      };
    } else if (type === 'fillups') {
      newQuestion.text = 'The [virtual] DOM in React enables fast visual updates by diffing nodes.';
      newQuestion.fillupsData = {
        sentence: newQuestion.text,
        answers: ['virtual'],
      };
    } else if (type === 'coding') {
      newQuestion.text = 'Write an addition function "sum(a, b)" that returns their summation.';
      newQuestion.codingData = {
        language: 'javascript',
        starterCode: 'function sum(a, b) {\n  // Return sum\n  \n}',
        solutionCode: 'function sum(a, b) {\n  return a + b;\n}',
        testCases: [{ input: '2, 3', expectedOutput: '5' }],
      };
    } else if (type === 'image') {
      newQuestion.text = 'Review the system block diagram shown in the image. What does node B represent?';
      newQuestion.imageUrl = 'from-blue-500 to-indigo-500';
    } else if (type === 'custom') {
      newQuestion.text = 'Explain the differences between client-side rendering (CSR) and server-side rendering (SSR).';
      newQuestion.customData = {
        guidelines: 'Marks based on explanation of hydration, SEO, and initial paint performance.',
      };
    }

    const updated = [...questions, newQuestion];
    setQuestions(updated);
    setActiveQuestionId(newId);
    triggerToast(`Created a new ${type.toUpperCase()} question card!`);
    syncQuestionsToSupabase(updated);
  };

  // Delete Question
  const handleDeleteQuestion = (id: string) => {
    if (!isCreator) return;
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    if (activeQuestionId === id) setActiveQuestionId(null);
    triggerToast('Question card deleted!');
    syncQuestionsToSupabase(updated);
  };

  // Duplicate Question
  const handleDuplicateQuestion = (q: Question) => {
    if (!isCreator) return;
    const newId = generateQuestionId();
    const newQuestion: Question = {
      ...JSON.parse(JSON.stringify(q)), // Deep clone
      id: newId,
    };
    const updated = [...questions, newQuestion];
    setQuestions(updated);
    setActiveQuestionId(newId);
    triggerToast('Question duplicated successfully!');
    syncQuestionsToSupabase(updated);
  };

  // Update Question
  const handleUpdateQuestion = (updatedQ: Question) => {
    if (!isCreator) return;
    const updated = questions.map((q) => (q.id === updatedQ.id ? updatedQ : q));
    setQuestions(updated);
    syncQuestionsToSupabase(updated);
  };

  // Drag-and-drop swapping
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isCreator) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ''); // Required for Firefox drag support
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isCreator) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newQuestions = [...questions];
    const draggedItem = newQuestions[draggedIndex];
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setQuestions(newQuestions);
  };

  const handleDragEnd = () => {
    if (!isCreator) return;
    setDraggedIndex(null);
    syncQuestionsToSupabase(questions);
  };

  // Calculations
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const estimateDuration = questions.reduce((sum, q) => {
    if (q.type === 'coding') return sum + 10;
    if (q.type === 'matching') return sum + 3;
    if (q.type === 'fillups') return sum + 1.5;
    if (q.type === 'mcq') return sum + 1;
    if (q.type === 'true-false') return sum + 0.5;
    return sum + 4; // custom/image
  }, 0);

  const handleSaveDraft = async () => {
    if (!user) {
      triggerToast('You must be logged in to save drafts!');
      return;
    }
    if (!isCreator) {
      triggerToast('Only the test creator can save changes!');
      return;
    }
    setIsDbLoading(true);
    try {
      if (testId) {
        // Update existing test title & description
        const { error: testError } = await testsService.updateTest(testId, {
          title: testTitle.trim(),
          description: testDesc.trim(),
        });
        if (testError) throw testError;

        // Save questions
        const { error: qError } = await testsService.saveQuestions(testId, questions);
        if (qError) throw qError;

        triggerToast('Test draft updated successfully!');
      } else {
        // Create new test shell
        const { data, error } = await testsService.createTest({
          creator_id: user.id,
          title: testTitle.trim(),
          description: testDesc.trim(),
          status: 'draft',
          visibility: 'public',
          registration_type: 'simple',
        });
        if (error) throw error;
        if (data?.id) {
          setTestId(data.id);
          localStorage.setItem('testoriax_builder_test_id', data.id);
          const { error: qError } = await testsService.saveQuestions(data.id, questions);
          if (qError) throw qError;
        }
        triggerToast('Test draft created and questions saved successfully!');
      }
    } catch (err: any) {
      console.error("Save draft failed:", err);
      triggerToast("Error saving draft: " + err.message);
    } finally {
      setIsDbLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffafb] flex flex-col font-sans select-none antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline text-xs font-bold">Dashboard</span>
          </button>
          <div className="h-5 w-px bg-slate-100 hidden sm:block" />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="font-display font-extrabold text-base text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-pink-500 focus:outline-none transition-colors px-1 py-0.5"
            />
            <span className="text-[9px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full uppercase shrink-0">
              Draft Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2.5 bg-slate-50 hover:bg-lilac-50/50 text-slate-600 hover:text-pink-600 border border-slate-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye size={14} />
            <span>Preview Player</span>
          </button>
          
          {isCreator && (
            <button
              onClick={handleSaveDraft}
              disabled={isDbLoading}
              className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-pink-500/10 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isDbLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Draft</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        
        {/* Left canvas: questions editor */}
        <div className="flex-1 p-6 overflow-y-auto max-w-4xl w-full mx-auto flex flex-col gap-6 relative">
          
          {/* Detailed statistics dashboard bar */}
          <div className="grid grid-cols-3 gap-4 bg-white/70 border border-slate-100/50 p-4.5 rounded-3xl shadow-sm">
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Questions</span>
              <p className="font-display font-extrabold text-lg text-slate-800 mt-0.5">{questions.length}</p>
            </div>
            <div className="w-px bg-slate-100" />
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Points</span>
              <p className="font-display font-extrabold text-lg text-slate-800 mt-0.5">{totalPoints} pts</p>
            </div>
            <div className="w-px bg-slate-100" />
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Est. Duration</span>
              <p className="font-display font-extrabold text-lg text-slate-800 mt-0.5">{estimateDuration} mins</p>
            </div>
          </div>

          {/* Description input */}
          <div className="flex flex-col gap-1.5 px-1">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-1">Instructions for Candidates</span>
            <input
              type="text"
              value={testDesc}
              onChange={(e) => setTestDesc(e.target.value)}
              className="w-full text-xs text-slate-500 bg-transparent outline-none border-b border-transparent focus:border-slate-100 py-1 pl-1 font-semibold"
            />
          </div>

          {/* Questions Canvas list */}
          <div className="flex flex-col gap-5.5 min-h-[300px]">
            {questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                isActive={isCreator && activeQuestionId === q.id}
                onSelect={() => isCreator && setActiveQuestionId(activeQuestionId === q.id ? null : q.id)}
                onUpdate={isCreator ? handleUpdateQuestion : () => {}}
                onDelete={isCreator ? () => handleDeleteQuestion(q.id) : () => {}}
                onDuplicate={isCreator ? () => handleDuplicateQuestion(q) : undefined}
                onDragStart={isCreator ? handleDragStart : () => {}}
                onDragOver={isCreator ? handleDragOver : () => {}}
                onDragEnd={isCreator ? handleDragEnd : () => {}}
              />
            ))}

            {questions.length === 0 && (
              <GlassCard className="border-dashed border-2 border-slate-200/80 p-12 text-center">
                <BookOpen size={40} className="text-slate-300 mx-auto mb-4" />
                <h4 className="font-display font-bold text-base text-slate-800">Your Canvas is empty</h4>
                <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  Use the template panels on the right side to add MCQ, Coding, matching, or custom questions!
                </p>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Right side template panels toolbar */}
        <aside className="w-full lg:w-72 bg-white/50 border-t lg:border-t-0 lg:border-l border-slate-100 p-6 flex flex-col gap-5 shrink-0 overflow-y-auto">
          {isCreator ? (
            <>
              <div>
                <h4 className="font-display font-extrabold text-xs text-slate-800 tracking-tight flex items-center gap-1.5 uppercase mb-1">
                  <Plus size={14} className="text-pink-500" />
                  <span>Insert Question Type</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Click to insert dynamic testing schemas directly to your active draft canvas list.
                </p>
              </div>

              <div className="flex flex-col gap-3.5">
                {[
                  { type: 'mcq', name: 'MCQ (Single Select)', desc: 'Standard multiple choices list with correct key' },
                  { type: 'matching', name: 'Match the Following', desc: 'Pairs matching list' },
                  { type: 'true-false', name: 'True / False', desc: 'Binary boolean options selection' },
                  { type: 'coding', name: 'Coding Challenge', desc: 'Boilerplate editor + execution testcases' },
                  { type: 'fillups', name: 'Fill in the Blanks', desc: 'Autodetected slots in custom sentence' },
                  { type: 'image', name: 'Image Based', desc: 'Visual diagram matching question' },
                  { type: 'custom', name: 'Custom Subjective', desc: 'Essay answers + evaluation grader guide' },
                ].map((tmpl) => (
                  <GlassCard
                    key={tmpl.type}
                    onClick={() => handleAddQuestion(tmpl.type as QuestionType)}
                    className="p-4.5 border-slate-100/60 hover:border-pink-300 hover:shadow-md cursor-pointer transition-all flex flex-col items-start text-left group"
                  >
                    <span className="text-xs font-bold text-slate-800 group-hover:text-pink-600 transition-colors">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                      {tmpl.desc}
                    </span>
                  </GlassCard>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <span className="text-xs font-bold text-slate-450 uppercase block">View Mode Only</span>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5 leading-relaxed">
                Only the creator of this test can add, edit, or modify questions.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <TestPreviewModal
          testData={{ title: testTitle, description: testDesc, questions }}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Sparkles size={14} className="text-pink-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default TestBuilderView;
