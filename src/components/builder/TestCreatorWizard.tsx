import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, BrainCircuit, Edit3, ArrowRight, ArrowLeft, Check, 
  UploadCloud, Link, DollarSign, UserCheck, Eye, 
  Award, Clock, Lock, Globe, AlertCircle, FileText, CheckCircle2,
  Plus, BookOpen, Loader2, Settings, ShieldCheck
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { QuestionCard } from './QuestionCard';
import type { Question, QuestionType } from './QuestionTypes';
import { useAuth } from '../../context/AuthContext';
import { testsService } from '../../services/testsService';
import competitionsService from '../../services/competitionsService';
import notificationsService from '../../services/notificationsService';

import { CreationStudioBackground } from '../test-creator/CreationStudioBackground';
import { StepProgressJourney } from '../test-creator/StepProgressJourney';
import { CreationStudioHeader } from '../test-creator/CreationStudioHeader';
import { AIOrbCore } from '../test-creator/AIOrbCore';

interface TestCreatorWizardProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard' | 'builder' | 'create-test' | 'ai-generator-page', testTitle?: string) => void;
}

type CreationMethod = 'ai' | 'manual';
type VisibilityType = 'private' | 'public';
type RegistrationType = 'none' | 'simple' | 'custom';

const BANNER_GRADIENTS = [
  { name: 'Sunset Glow', value: 'from-orange-500 to-red-650' },
  { name: 'Royal Indigo', value: 'from-purple-550 to-indigo-650' },
  { name: 'Forest Emerald', value: 'from-emerald-500 to-teal-650' },
  { name: 'Deep Cyberpunk', value: 'from-purple-600 to-pink-600' },
  { name: 'Crimson Rose', value: 'from-rose-500 to-pink-600' },
  { name: 'Ocean Mist', value: 'from-cyan-500 to-blue-600' }
];

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const parseQuestionsFromText = (text: string): Question[] => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const extracted: Question[] = [];
  
  let currentQuestionText = '';
  let currentOptions: string[] = [];
  let currentAnswerText = '';
  
  const saveCurrentQuestion = () => {
    if (!currentQuestionText && currentOptions.length === 0 && !currentAnswerText) return;
    
    const qText = currentQuestionText.trim() || 'Extracted Question from reference material';
    const id = generateUUID();
    
    const answerClean = currentAnswerText.toLowerCase().trim();
    const isTrue = answerClean.startsWith('true') || answerClean === 't' || answerClean === 'yes' || answerClean === 'y';
    const isFalse = answerClean.startsWith('false') || answerClean === 'f' || answerClean === 'no' || answerClean === 'n';
    
    const hasTrueFalseOptions = currentOptions.some(opt => {
      const o = opt.toLowerCase();
      return o === 'true' || o === 'false';
    });
    
    if (hasTrueFalseOptions || ((isTrue || isFalse) && currentOptions.length === 0)) {
      extracted.push({
        id,
        type: 'true-false',
        text: qText,
        points: 5,
        difficulty: 'medium',
        trueFalseData: {
          correctAnswer: isTrue
        }
      });
    } else if (currentOptions.length > 0) {
      let correctOptionIndex = 0;
      
      const letterMatch = answerClean.match(/^([a-d]|[1-4])\b/);
      if (letterMatch) {
        const optionChar = letterMatch[1];
        if (/[a-d]/.test(optionChar)) {
          correctOptionIndex = optionChar.charCodeAt(0) - 97;
        } else {
          correctOptionIndex = parseInt(optionChar) - 1;
        }
      } else {
        const foundIdx = currentOptions.findIndex(opt => {
          const optClean = opt.toLowerCase();
          return optClean === answerClean || optClean.includes(answerClean) || answerClean.includes(optClean);
        });
        if (foundIdx !== -1) {
          correctOptionIndex = foundIdx;
        }
      }
      
      if (correctOptionIndex < 0 || correctOptionIndex >= currentOptions.length) {
        correctOptionIndex = 0;
      }
      
      extracted.push({
        id,
        type: 'mcq',
        text: qText,
        points: 5,
        difficulty: 'medium',
        mcqData: {
          options: currentOptions,
          correctOptionIndex
        }
      });
    } else {
      extracted.push({
        id,
        type: 'custom',
        text: qText,
        points: 5,
        difficulty: 'medium',
        customData: {
          guidelines: currentAnswerText ? `Expected key points: ${currentAnswerText}` : 'Please provide grading guidelines.'
        }
      });
    }
    
    currentQuestionText = '';
    currentOptions = [];
    currentAnswerText = '';
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const answerMatch = line.match(/^(?:[^a-zA-Z0-9]*)(?:correct\s+answer|correct|answer|ans|key)\s*[\:\-\.\uFF1A]?\s*(.+)$/i);
    const optionMatch = currentQuestionText.trim() !== '' && line.match(/^([A-D]|[a-d]|[1-4])\s*[\)\.\:\-\uFF0E\uFF09\uFF1A]\s*(.+)$/);
    
    if (answerMatch) {
      currentAnswerText = answerMatch[1].trim();
    } else if (optionMatch) {
      currentOptions.push(optionMatch[2].trim());
    } else {
      const isNewQuestionStart = /^(?:(?:\d+|q\d*)|question\s*\d*)\s*[\.\)\:\-\uFF0E\uFF09\uFF1A]/i.test(line);
      if (isNewQuestionStart && (currentOptions.length > 0 || currentAnswerText)) {
        saveCurrentQuestion();
      }
      
      if (currentQuestionText) {
        if (currentOptions.length > 0 || currentAnswerText) {
          saveCurrentQuestion();
          currentQuestionText = line.replace(/^(?:(?:\d+|q\d*)|question\s*\d*)\s*[\.\)\:\-\uFF0E\uFF09\uFF1A]\s*/i, '');
        } else {
          currentQuestionText += '\n' + line;
        }
      } else {
        currentQuestionText = line.replace(/^(?:(?:\d+|q\d*)|question\s*\d*)\s*[\.\)\:\-\uFF0E\uFF09\uFF1A]\s*/i, '');
      }
    }
  }
  
  saveCurrentQuestion();
  return extracted;
};

export const TestCreatorWizard: React.FC<TestCreatorWizardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const location = useLocation();
  const editTestId = (location.state as { testId?: string } | null)?.testId;
  const [testId, setTestId] = useState<string | null>(editTestId || null);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(false);

  useEffect(() => {
    if (editTestId) {
      const fetchTest = async () => {
        setIsDbLoading(true);
        try {
          const { data, error } = await testsService.getTestById(editTestId);
          if (error) throw error;
          if (data) {
            setTitle(data.title || '');
            setDescription(data.description || '');
            setDuration(data.duration || 60);
            setTotalMarks(data.total_marks || 100);
            if (data.negative_marking) {
              setNegativeMarking(data.negative_marking.enabled || false);
              setNegativeValue(data.negative_marking.value || 0.25);
            }
            setVisibility(data.visibility || 'public');
            setRegistrationType(data.registration_type || 'simple');
            setEntryFee(data.entry_fee ? data.entry_fee.toString() : '');
            // Fetch questions from Supabase questions table (creator view: preserves solution code & hidden test cases)
            const { data: qData, error: qError } = await testsService.getQuestionsByTestIdForCreator(editTestId);
            if (qError) throw qError;
            if (qData && qData.length > 0) {
              setQuestions(qData);
            } else if (data.questions && data.questions.length > 0) {
              setQuestions(data.questions);
            } else {
              setQuestions([]);
            }
            if (data.mock_thumbnail) setMockThumbnail(data.mock_thumbnail);
            if (data.expiry_time) setExpiryTime(data.expiry_time);
            if (data.custom_question) setCustomQuestion(data.custom_question);
            if (data.reg_fields) setRegFields(data.reg_fields);
            
            // Advanced settings loading
            if (data.result_visibility) setResultVisibility(data.result_visibility);
            if (data.answer_review_mode) setAnswerReviewMode(data.answer_review_mode);
            if (data.result_release_mode) setResultReleaseMode(data.result_release_mode);
            if (data.winner_visibility) setWinnerVisibility(data.winner_visibility);
            if (data.notify_on_result_release !== undefined) setNotifyOnResultRelease(data.notify_on_result_release);
            
            // Go directly to details/configuration if editing
            setStep(2);
          }
        } catch (err: any) {
          triggerToast('Error loading test: ' + err.message);
        } finally {
          setIsDbLoading(false);
        }
      };
      fetchTest();
    }
  }, [editTestId]);

  const [method, setMethod] = useState<CreationMethod | null>(() => {
    const savedMethod = localStorage.getItem('testoriax_wizard_method') as CreationMethod | null;
    if (savedMethod) return savedMethod;
    const savedQuestions = localStorage.getItem('testoriax_builder_initial_questions');
    return savedQuestions ? 'ai' : null;
  });

  const [step, setStep] = useState<number>(() => {
    const savedQuestions = localStorage.getItem('testoriax_builder_initial_questions');
    const savedMethod = localStorage.getItem('testoriax_wizard_method') || (savedQuestions ? 'ai' : null);
    if (savedQuestions) {
      if (savedMethod === 'ai') return 4;
      if (savedMethod === 'manual') return 3;
    }
    return 1;
  });
  const [direction, setDirection] = useState<number>(0);
  
  // Form State
  const [title, setTitle] = useState<string>(() => {
    return localStorage.getItem('testoriax_wizard_title') || 'Java Programming Mock Test';
  });
  const [description, setDescription] = useState<string>(() => {
    return localStorage.getItem('testoriax_wizard_description') || 'An assessment checking basic object-oriented and concurrency concepts in Java.';
  });
  const [duration, setDuration] = useState<number>(() => {
    const saved = localStorage.getItem('testoriax_wizard_duration');
    return saved ? parseInt(saved) : 60;
  });
  const [totalMarks, setTotalMarks] = useState<number>(() => {
    const saved = localStorage.getItem('testoriax_wizard_total_marks');
    return saved ? parseInt(saved) : 100;
  });
  const [negativeMarking, setNegativeMarking] = useState<boolean>(() => {
    return localStorage.getItem('testoriax_wizard_negative_marking') === 'true';
  });
  const [negativeValue, setNegativeValue] = useState<number>(() => {
    const saved = localStorage.getItem('testoriax_wizard_negative_value');
    return saved ? parseFloat(saved) : 0.25;
  });
  const [mockThumbnail, setMockThumbnail] = useState<string | null>(() => {
    return localStorage.getItem('testoriax_wizard_mock_thumbnail') || null;
  });
  
  // Visibility State
  const [visibility, setVisibility] = useState<VisibilityType>(() => {
    return (localStorage.getItem('testoriax_wizard_visibility') as VisibilityType) || 'public';
  });
  const [expiryTime, setExpiryTime] = useState<string>(() => {
    return localStorage.getItem('testoriax_wizard_expiry_time') || '24';
  });
  const [copied, setCopied] = useState<boolean>(false);

  // Advanced Results States
  const [resultVisibility, setResultVisibility] = useState<'public' | 'anonymous' | 'private' | 'creator_only'>(() => {
    return (localStorage.getItem('testoriax_wizard_result_visibility') as any) || 'private';
  });
  const [answerReviewMode, setAnswerReviewMode] = useState<'no_review' | 'score_only' | 'score_answers' | 'score_answers_explanations'>(() => {
    return (localStorage.getItem('testoriax_wizard_answer_review_mode') as any) || 'score_answers_explanations';
  });
  const [resultReleaseMode, setResultReleaseMode] = useState<'immediately' | 'after_test_end' | 'manual_release'>(() => {
    return (localStorage.getItem('testoriax_wizard_result_release_mode') as any) || 'immediately';
  });
  const [winnerVisibility, setWinnerVisibility] = useState<'public' | 'anonymous' | 'private'>(() => {
    return (localStorage.getItem('testoriax_wizard_winner_visibility') as any) || 'public';
  });
  const [notifyOnResultRelease, setNotifyOnResultRelease] = useState<boolean>(() => {
    return localStorage.getItem('testoriax_wizard_notify_on_result_release') !== 'false';
  });
  
  // Registration State
  const [registrationType, setRegistrationType] = useState<RegistrationType>(() => {
    return (localStorage.getItem('testoriax_wizard_registration_type') as RegistrationType) || 'simple';
  });
  const [entryFee, setEntryFee] = useState<string>(() => {
    return localStorage.getItem('testoriax_wizard_entry_fee') || '';
  });
  const [customQuestion, setCustomQuestion] = useState<string>(() => {
    return localStorage.getItem('testoriax_wizard_custom_question') || '';
  });
  
  // Toggles for Custom Registration Fields
  const [regFields, setRegFields] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('testoriax_wizard_reg_fields');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      fullName: true,
      email: true,
      mobileNumber: true,
      college: true,
      branch: false,
      graduationYear: false,
      city: false,
      state: false,
      linkedinProfile: false,
      githubProfile: false,
      resumeUpload: false,
      profilePhoto: false
    };
  });

  // Manual questions state
  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('testoriax_builder_initial_questions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Question[];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return parsed.map(q => {
          if (!uuidRegex.test(q.id)) {
            return { ...q, id: generateUUID() };
          }
          return q;
        });
      } catch (e) {
        console.error("Error parsing saved initial questions:", e);
      }
    }
    return [];
  });

  // Optional Competition Settings States
  const [isCompetition, setIsCompetition] = useState(false);
  const [compTitle, setCompTitle] = useState('');
  const [compDescription, setCompDescription] = useState('');
  const [compBanner, setCompBanner] = useState('from-orange-500 to-red-650');
  const [compStart, setCompStart] = useState('');
  const [compEnd, setCompEnd] = useState('');
  const [compDeadline, setCompDeadline] = useState('');
  const [compLimit, setCompLimit] = useState('100');
  const [compPrizes, setCompPrizes] = useState('');
  const [compRules, setCompRules] = useState('');
  const [compContact, setCompContact] = useState('');
  const [compLeaderboard, setCompLeaderboard] = useState<'live' | 'after_end' | 'hide'>('live');
  const [compWinnerPrivacy, setCompWinnerPrivacy] = useState<'public' | 'anonymous' | 'private'>('public');

  // Security & AI Proctoring Settings
  const [securitySettings, setSecuritySettings] = useState(() => {
    const saved = localStorage.getItem('testoriax_wizard_security');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      require_webcam: false,
      require_mic: false,
      require_fullscreen: true,
      disable_copy_paste: true,
      disable_right_click: true,
      disable_shortcuts: true,
      detect_devtools: true,
      tab_switch_detection: true,
      auto_submit_on_violations: true,
      max_violations: 3,
      periodic_snapshot_capture: false,
      face_presence_detection: false,
      multiple_face_detection: false,
      face_missing_detection: false,
      record_violation_screenshots: false
    };
  });

  const handleToggleCompetition = (checked: boolean) => {
    setIsCompetition(checked);
    if (checked) {
      if (!compTitle) setCompTitle(`${title} Championship`);
      if (!compDescription) setCompDescription(description);
      if (!compContact && user?.email) setCompContact(user.email);
    }
  };

  const saveWizardState = () => {
    localStorage.setItem('testoriax_wizard_method', method || '');
    localStorage.setItem('testoriax_wizard_title', title);
    localStorage.setItem('testoriax_wizard_description', description);
    localStorage.setItem('testoriax_wizard_duration', duration.toString());
    localStorage.setItem('testoriax_wizard_total_marks', totalMarks.toString());
    localStorage.setItem('testoriax_wizard_negative_marking', negativeMarking.toString());
    localStorage.setItem('testoriax_wizard_negative_value', negativeValue.toString());
    localStorage.setItem('testoriax_wizard_mock_thumbnail', mockThumbnail || '');
    localStorage.setItem('testoriax_wizard_visibility', visibility);
    localStorage.setItem('testoriax_wizard_expiry_time', expiryTime);
    localStorage.setItem('testoriax_wizard_registration_type', registrationType);
    localStorage.setItem('testoriax_wizard_entry_fee', entryFee);
    localStorage.setItem('testoriax_wizard_custom_question', customQuestion);
    localStorage.setItem('testoriax_wizard_reg_fields', JSON.stringify(regFields));
    localStorage.setItem('testoriax_wizard_result_visibility', resultVisibility);
    localStorage.setItem('testoriax_wizard_answer_review_mode', answerReviewMode);
    localStorage.setItem('testoriax_wizard_result_release_mode', resultReleaseMode);
    localStorage.setItem('testoriax_wizard_winner_visibility', winnerVisibility);
    localStorage.setItem('testoriax_wizard_notify_on_result_release', notifyOnResultRelease.toString());
    localStorage.setItem('testoriax_wizard_security', JSON.stringify(securitySettings));
  };

  const clearWizardState = () => {
    localStorage.removeItem('testoriax_wizard_method');
    localStorage.removeItem('testoriax_wizard_title');
    localStorage.removeItem('testoriax_wizard_description');
    localStorage.removeItem('testoriax_wizard_duration');
    localStorage.removeItem('testoriax_wizard_total_marks');
    localStorage.removeItem('testoriax_wizard_negative_marking');
    localStorage.removeItem('testoriax_wizard_negative_value');
    localStorage.removeItem('testoriax_wizard_mock_thumbnail');
    localStorage.removeItem('testoriax_wizard_visibility');
    localStorage.removeItem('testoriax_wizard_expiry_time');
    localStorage.removeItem('testoriax_wizard_registration_type');
    localStorage.removeItem('testoriax_wizard_entry_fee');
    localStorage.removeItem('testoriax_wizard_custom_question');
    localStorage.removeItem('testoriax_wizard_reg_fields');
    localStorage.removeItem('testoriax_builder_initial_questions');
    localStorage.removeItem('testoriax_wizard_result_visibility');
    localStorage.removeItem('testoriax_wizard_answer_review_mode');
    localStorage.removeItem('testoriax_wizard_result_release_mode');
    localStorage.removeItem('testoriax_wizard_winner_visibility');
    localStorage.removeItem('testoriax_wizard_notify_on_result_release');
    localStorage.removeItem('testoriax_wizard_security');
  };

  // Active Question Id for Manual Builder
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync current questions state to Supabase questions table (auto-save)
  const syncQuestionsToSupabase = async (currentQuestions: Question[]) => {
    if (!testId) return; // Cannot sync if test is not saved to DB yet
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
    const newId = generateUUID();
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
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    if (activeQuestionId === id) setActiveQuestionId(null);
    triggerToast('Question card deleted!');
    syncQuestionsToSupabase(updated);
  };

  // Duplicate Question
  const handleDuplicateQuestion = (q: Question) => {
    const newId = generateUUID();
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
    const updated = questions.map((q) => (q.id === updatedQ.id ? updatedQ : q));
    setQuestions(updated);
    syncQuestionsToSupabase(updated);
  };

  // Drag-and-drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
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
    setDraggedIndex(null);
    syncQuestionsToSupabase(questions);
  };

  // Modal / Success States
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Document Parser State and Custom File Refs/Handlers
  const docInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [parserMode, setParserMode] = useState<'upload' | 'paste'>('upload');
  const [uploadedDoc, setUploadedDoc] = useState<{ name: string; size: string } | null>(null);
  const [uploadedFileObject, setUploadedFileObject] = useState<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const [pastedDocText, setPastedDocText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [importedQIds, setImportedQIds] = useState<string[]>([]);
  
  const [isDocDragActive, setIsDocDragActive] = useState<boolean>(false);
  const [isThumbnailDragActive, setIsThumbnailDragActive] = useState<boolean>(false);
  const [docFileText, setDocFileText] = useState<string | null>(null);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const loadTesseract = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Tesseract) {
        resolve((window as any).Tesseract);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js';
      script.onload = () => resolve((window as any).Tesseract);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  const handleDocFile = (file: File) => {
    const sizeStr = formatBytes(file.size);
    setUploadedDoc({ name: file.name, size: sizeStr });
    setUploadedFileObject(file);
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDocFileText(text);
      };
      reader.readAsText(file);
    } else {
      setDocFileText(null);
    }
  };

  const handleThumbnailFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setMockThumbnail(result);
      triggerToast('Custom test cover image uploaded!');
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop handlers for Document Upload
  const handleDocDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDocDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDocDragActive(false);
    }
  };

  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDocDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleDocFile(e.dataTransfer.files[0]);
    }
  };

  // Drag & Drop handlers for Test Thumbnail
  const handleThumbnailDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsThumbnailDragActive(true);
    } else if (e.type === "dragleave") {
      setIsThumbnailDragActive(false);
    }
  };

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsThumbnailDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleThumbnailFile(file);
      } else {
        triggerToast('Please select/drop an image file for thumbnail!');
      }
    }
  };

  // Clipboard Paste handler
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (step !== 2) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleDocFile(file);
            setParserMode('upload');
            triggerToast('Photo pasted from clipboard!');
            break;
          }
        } else if (items[i].type === 'text/plain') {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            return;
          }
          items[i].getAsString((text) => {
            if (text.trim().length > 10) {
              setPastedDocText(text);
              setParserMode('paste');
              triggerToast('Text pasted from clipboard!');
            }
          });
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [step]);

  // Thumbnail rendering helpers
  const isGradient = mockThumbnail && !mockThumbnail.startsWith('data:') && !mockThumbnail.startsWith('http') && !mockThumbnail.startsWith('/');

  const getThumbnailStyle = () => {
    if (!mockThumbnail) return {};
    if (isGradient) return {};
    return {
      backgroundImage: `url(${mockThumbnail})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  };

  const getThumbnailClass = () => {
    if (!mockThumbnail) return 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/10';
    if (isGradient) return `bg-gradient-to-r ${mockThumbnail} border-transparent text-white shadow-md hover:scale-[1.01]`;
    return 'border-transparent text-white shadow-md hover:scale-[1.01]';
  };

  const handleDocMockUpload = () => {
    const files = [
      { name: 'java_oops_quiz_page1.png', size: '320 KB' },
      { name: 'exam_questions_draft.pdf', size: '1.2 MB' },
      { name: 'history_midterm_syllabus.txt', size: '15 KB' }
    ];
    const chosen = files[Math.floor(Math.random() * files.length)];
    setUploadedDoc(chosen);
    setUploadedFileObject(null); // No real file object for mock uploads
    setDocFileText(null); // Reset real document text if mock is clicked
    triggerToast(`Reference file "${chosen.name}" attached!`);
  };

  const handleExtractDocQuestions = async () => {
    setIsExtracting(true);
    
    const isImage = uploadedFileObject && uploadedFileObject.type.startsWith('image/');
    
    if (parserMode === 'upload' && isImage) {
      setOcrProgress('Loading OCR Engine...');
      try {
        const Tesseract = await loadTesseract();
        setOcrProgress('Loading Language Models (English + Japanese)...');
        
        const result = await Tesseract.recognize(
          uploadedFileObject,
          'eng+jpn',
          {
            logger: (m: any) => {
              if (m.status === 'recognizing text') {
                setOcrProgress(`Scanning image: ${Math.round(m.progress * 100)}%`);
              }
            }
          }
        );
        
        setOcrProgress('Extracting text content...');
        const extractedText = result?.data?.text || '';
        console.log("OCR Extracted Text:\n", extractedText);
        
        if (extractedText.trim().length > 0) {
          const parsedQuestions = parseQuestionsFromText(extractedText);
          setExtractedQuestions(parsedQuestions);
          setOcrProgress(null);
          setIsExtracting(false);
          
          if (parsedQuestions.length > 0) {
            triggerToast(`OCR successfully extracted ${parsedQuestions.length} questions!`);
          } else {
            triggerToast('Text extracted but no structured questions found. Showing editor fallback.');
            setPastedDocText(extractedText);
            setParserMode('paste');
          }
          return;
        } else {
          throw new Error("No text detected in this image.");
        }
      } catch (err: any) {
        console.error("OCR Error:", err);
        setOcrProgress("OCR Engine error. Using mock simulation fallback...");
        triggerToast("OCR scan failed. Simulating extraction fallback.");
      }
    }
    
    setOcrProgress('Analyzing source material...');
    setTimeout(() => {
      let parsedQuestions: Question[] = [];
      
      if (parserMode === 'paste') {
        parsedQuestions = parseQuestionsFromText(pastedDocText);
      } else {
        if (docFileText) {
          parsedQuestions = parseQuestionsFromText(docFileText);
        } else {
          let docContent = '';
          const docName = uploadedDoc?.name || '';
          const docNameLower = docName.toLowerCase();
          
          if (docNameLower.includes('java')) {
            docContent = `1. Which Java keyword is used to declare an interface inheritance implementation?
A) extends
B) implements
C) interface
D) inherits
Answer: B

2. In Java, static methods can be overridden to support polymorphic execution.
Answer: False`;
          } else if (docNameLower.includes('exam')) {
            docContent = `1. What is the complexity of binary search on a sorted array of size N?
A) O(1)
B) O(N)
C) O(log N)
D) O(N log N)
Answer: C

2. A constructor can return a value in Java or C++.
Answer: False`;
          } else if (docNameLower.includes('history')) {
            docContent = `1. Who was the first President of the United States?
A) Thomas Jefferson
B) George Washington
C) Abraham Lincoln
D) John Adams
Answer: B

2. The Magna Carta was signed in the year 1215.
Answer: True`;
          } else {
            const cleanName = docName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
            docContent = `1. Which primary definition correctly represents the scope of "${cleanName || 'General Topics'}"?
A) The core standard and optimization constraints.
B) The subjective observations and theoretical notes.
C) An outdated, deprecated framework paradigm.
D) None of the above.
Answer: A

2. A systematic layout configuration for "${cleanName || 'General Topics'}" is required to avoid memory leaks.
Answer: True`;
          }
          parsedQuestions = parseQuestionsFromText(docContent);
        }
      }
      
      setExtractedQuestions(parsedQuestions);
      setOcrProgress(null);
      setIsExtracting(false);
      
      if (parsedQuestions.length > 0) {
        triggerToast(`OCR parsed ${parsedQuestions.length} reference questions successfully!`);
      } else {
        triggerToast('No structured questions could be extracted. Please check formatting.');
      }
    }, 1500);
  };

  const handleToggleImportQuestion = (qId: string) => {
    const isAlreadyImported = importedQIds.includes(qId);
    let updatedIds: string[];
    
    if (isAlreadyImported) {
      updatedIds = importedQIds.filter(id => id !== qId);
      setQuestions(prev => prev.filter(q => q.id !== qId));
      triggerToast('Removed question from imports.');
    } else {
      updatedIds = [...importedQIds, qId];
      const questionToImport = extractedQuestions.find(q => q.id === qId);
      if (questionToImport) {
        setQuestions(prev => {
          if (prev.some(q => q.id === qId)) return prev;
          return [...prev, questionToImport];
        });
      }
      triggerToast('Question imported successfully!');
    }
    setImportedQIds(updatedIds);

    // Save to localStorage questions list
    const questionsToSave = extractedQuestions.filter(q => updatedIds.includes(q.id));
    localStorage.setItem('testoriax_builder_initial_questions', JSON.stringify(questionsToSave));
  };

  useEffect(() => {
    const saved = localStorage.getItem('testoriax_builder_initial_questions');
    if (saved) {
      setTimeout(() => {
        triggerToast('AI generated questions loaded successfully! Continue configuring visibility settings.');
      }, 0);
    }
  }, []);

  const handleNext = () => {
    if (step === 1) {
      if (!method) {
        triggerToast('Please choose a creation method to proceed!');
        return;
      }
      localStorage.setItem('testoriax_wizard_method', method);
      setDirection(1);
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!title.trim()) {
        triggerToast('Test Title is required!');
        return;
      }
      saveWizardState();
      if (method === 'ai') {
        onNavigate('ai-generator-page');
        return;
      }
      setDirection(1);
      setStep(3); // Manual Builder
      return;
    }
    if (step === 3) {
      // Save questions state to localStorage so Visibility can use it
      localStorage.setItem('testoriax_builder_initial_questions', JSON.stringify(questions));
      saveWizardState();
      setDirection(1);
      setStep(4); // Visibility
      return;
    }
    if (step === 4) {
      saveWizardState();
      if (visibility === 'private') {
        handlePublish();
      } else {
        setDirection(1);
        setStep(5); // Publish Preview
      }
      return;
    }
  };

  const handleBack = () => {
    if (step === 4 && method === 'ai') {
      saveWizardState();
      onNavigate('ai-generator-page');
      return;
    }
    setDirection(-1);
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleMethodSelect = (selectedMethod: CreationMethod) => {
    setMethod(selectedMethod);
    localStorage.setItem('testoriax_wizard_method', selectedMethod);
    setDirection(1);
    setStep(2);
  };

  const handleToggleRegField = (fieldKey: string) => {
    setRegFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const handleMockUpload = () => {
    // Generate a beautiful mock thumbnail gradient
    const gradients = [
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-pink-500',
      'from-violet-500 to-indigo-500',
      'from-rose-500 to-violet-500'
    ];
    const chosen = gradients[Math.floor(Math.random() * gradients.length)];
    setMockThumbnail(chosen);
    triggerToast('Mock Test Thumbnail generated!');
  };

  const handleCopyLink = () => {
    const text = `${window.location.origin}/lobby/join/${testId || 'prv-39c8a9f2'}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    triggerToast('Secure access link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const validateQuestions = (): string | null => {
    if (!questions || questions.length === 0) {
      return 'At least 1 question is required to publish!';
    }
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;
      
      if (!q.text.trim()) {
        return `Question #${qNum}: Question text cannot be empty!`;
      }
      
      if (q.type === 'mcq') {
        if (!q.mcqData || !q.mcqData.options || q.mcqData.options.length < 2) {
          return `Question #${qNum}: MCQ questions must have at least 2 options!`;
        }
        if (q.mcqData.correctOptionIndex === undefined || q.mcqData.correctOptionIndex < 0 || q.mcqData.correctOptionIndex >= q.mcqData.options.length) {
          return `Question #${qNum}: MCQ question must have a valid correct option selected!`;
        }
      } else if (q.type === 'true-false') {
        if (!q.trueFalseData || q.trueFalseData.correctAnswer === undefined) {
          return `Question #${qNum}: True/False question must specify a correct answer!`;
        }
      } else if (q.type === 'fillups') {
        if (!q.fillupsData || !q.fillupsData.answers || q.fillupsData.answers.length === 0) {
          return `Question #${qNum}: Fill in the Blanks question must have at least one slot/answer compiled!`;
        }
      } else if (q.type === 'matching') {
        if (!q.matchingData || !q.matchingData.pairs || q.matchingData.pairs.length === 0) {
          return `Question #${qNum}: Matching question must have at least one pair!`;
        }
        for (const pair of q.matchingData.pairs) {
          if (!pair.left.trim() || !pair.right.trim()) {
            return `Question #${qNum}: Matching pairs cannot contain empty fields!`;
          }
        }
      } else if (q.type === 'coding') {
        if (!q.codingData || !q.codingData.starterCode.trim() || !q.codingData.solutionCode.trim()) {
          return `Question #${qNum}: Coding question must have starter code and solution code!`;
        }
        if (!q.codingData.testCases || q.codingData.testCases.length === 0) {
          return `Question #${qNum}: Coding question must have at least one testcase!`;
        }
        for (const tc of q.codingData.testCases) {
          if (!tc.input.trim() || !tc.expectedOutput.trim()) {
            return `Question #${qNum}: Coding testcases cannot contain empty input/output fields!`;
          }
        }
      }
    }
    
    return null;
  };

  const handleSaveDraft = async () => {
    if (!user) {
      triggerToast('You must be logged in to save drafts!');
      return;
    }
    if (!title.trim()) {
      triggerToast('Test Title is required!');
      return;
    }

    setIsDbLoading(true);
    try {
      const testData = {
        creator_id: user.id,
        title: title.trim(),
        description: description.trim(),
        duration: duration || 60,
        total_marks: totalMarks || 100,
        negative_marking: {
          enabled: negativeMarking,
          value: negativeValue
        },
        visibility,
        registration_type: registrationType,
        entry_fee: entryFee ? parseInt(entryFee) : null,
        host_competition: isCompetition,
        status: 'draft' as const,
        questions: questions || [],
        mock_thumbnail: mockThumbnail,
        expiry_time: expiryTime,
        custom_question: customQuestion,
        reg_fields: regFields,
        result_visibility: resultVisibility,
        answer_review_mode: answerReviewMode,
        result_release_mode: resultReleaseMode,
        winner_visibility: winnerVisibility,
        notify_on_result_release: notifyOnResultRelease,
        security_settings: securitySettings
      };

      if (testId) {
        const { error } = await testsService.updateTest(testId, testData);
        if (error) throw error;
        const { error: qError } = await testsService.saveQuestions(testId, questions);
        if (qError) throw qError;
        triggerToast('Test draft updated successfully!');
      } else {
        const { data, error } = await testsService.createTest(testData);
        if (error) throw error;
        if (data?.id) {
          setTestId(data.id);
          const { error: qError } = await testsService.saveQuestions(data.id, questions);
          if (qError) throw qError;
        }
        triggerToast('Test draft saved successfully!');
      }
    } catch (err: any) {
      triggerToast('Error saving draft: ' + err.message);
    } finally {
      setIsDbLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!user) {
      triggerToast('You must be logged in to publish tests!');
      return;
    }
    if (!title.trim()) {
      triggerToast('Test Title is required!');
      return;
    }
    if (!duration || duration <= 0) {
      triggerToast('Duration must be greater than 0!');
      return;
    }

    const validationError = validateQuestions();
    if (validationError) {
      triggerToast(validationError);
      return;
    }

    // Validation for competition if enabled
    if (isCompetition) {
      if (!compTitle.trim()) {
        triggerToast('Competition Title is required!');
        return;
      }
      if (!compDescription.trim()) {
        triggerToast('Competition Description is required!');
        return;
      }
      if (!compStart) {
        triggerToast('Competition Start Date & Time is required!');
        return;
      }
      if (!compEnd) {
        triggerToast('Competition End Date & Time is required!');
        return;
      }
      if (!compDeadline) {
        triggerToast('Registration Deadline is required!');
        return;
      }
      if (!compLimit || parseInt(compLimit) <= 0) {
        triggerToast('Maximum Participants must be greater than 0!');
        return;
      }

      const start = new Date(compStart).getTime();
      const end = new Date(compEnd).getTime();
      const deadline = new Date(compDeadline).getTime();

      if (start >= end) {
        triggerToast('Competition End Date/Time must be after Start Date/Time.');
        return;
      }

      if (deadline > start) {
        triggerToast('Registration Deadline cannot be after Competition Start Date/Time.');
        return;
      }
    }

    setIsDbLoading(true);
    try {
      const testData = {
        creator_id: user.id,
        title: title.trim(),
        description: description.trim(),
        duration,
        total_marks: totalMarks,
        negative_marking: {
          enabled: negativeMarking,
          value: negativeValue
        },
        visibility,
        registration_type: registrationType,
        entry_fee: entryFee ? parseInt(entryFee) : null,
        host_competition: isCompetition,
        status: 'published' as const,
        questions,
        mock_thumbnail: mockThumbnail,
        expiry_time: expiryTime,
        custom_question: customQuestion,
        reg_fields: regFields,
        result_visibility: resultVisibility,
        answer_review_mode: answerReviewMode,
        result_release_mode: resultReleaseMode,
        winner_visibility: winnerVisibility,
        notify_on_result_release: notifyOnResultRelease,
        security_settings: securitySettings
      };

      let activeTestId = testId;

      if (testId) {
        const { error } = await testsService.updateTest(testId, testData);
        if (error) throw error;
      } else {
        const { data, error } = await testsService.createTest(testData);
        if (error) throw error;
        if (data?.id) {
          setTestId(data.id);
          activeTestId = data.id;
        }
      }

      if (activeTestId) {
        const { error: qError } = await testsService.saveQuestions(activeTestId, questions);
        if (qError) throw qError;
      }

      if (activeTestId && isCompetition) {
        const now = Date.now();
        const start = new Date(compStart).getTime();
        const end = new Date(compEnd).getTime();
        const competitionData = {
          creator_id: user.id,
          test_id: activeTestId,
          title: compTitle.trim(),
          description: compDescription.trim(),
          banner_image: compBanner,
          start_time: new Date(compStart).toISOString(),
          end_time: new Date(compEnd).toISOString(),
          registration_deadline: new Date(compDeadline).toISOString(),
          max_participants: parseInt(compLimit) || 100,
          visibility: 'public' as const,
          status: (start > now ? 'upcoming' : end > now ? 'live' : 'completed') as any,
          prize_details: compPrizes,
          rules: compRules,
          organizer_contact: compContact || user.email,
          leaderboard_type: compLeaderboard as any,
          winner_visibility: compWinnerPrivacy as any,
          winners_announced: false
        };

        const { error: compError } = await competitionsService.createCompetition(competitionData);
        if (compError) throw compError;
        triggerToast('Competition Arena created successfully!');
      }

      triggerToast('Test published successfully!');

      // Notify creator's followers in real-time
      if (activeTestId) {
        notificationsService.notifyFollowersTestPublished(
          user.id,
          activeTestId,
          title.trim(),
          user.user_metadata?.full_name || 'A creator you follow'
        );
      }

      localStorage.setItem('testoriax_wizard_completed_test', JSON.stringify({
        title,
        description,
        duration,
        totalMarks,
        negativeMarking,
        negativeValue,
        mockThumbnail,
        visibility,
        expiryTime,
        questions
      }));
      
      if (visibility === 'public') {
        setShowSuccess(true);
      } else {
        setDirection(1);
        setStep(5); // Go to Step 5 (Success Page)
      }
    } catch (err: any) {
      triggerToast('Failed to publish test: ' + err.message);
    } finally {
      setIsDbLoading(false);
    }
  };



  // Framer Motion transition animation parameters
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 120 : -120,
      opacity: 0
    })
  };

  return (
    <div className="min-h-screen bg-[#fdfafb] flex flex-col font-sans select-none antialiased relative overflow-x-hidden">
      
      {/* LAYER 1 & 2: 3D Creation Studio Deep Background & Floating Objects */}
      <CreationStudioBackground currentStep={step} />

      {/* Studio Header Bar */}
      <CreationStudioHeader
        onCancel={() => onNavigate('dashboard')}
        onSaveDraft={handleSaveDraft}
        isDbLoading={isDbLoading}
        canSaveDraft={step > 1}
        testTitle={title}
      />

      {/* Main Studio Stage */}
      <main className="flex-1 flex flex-col items-center p-4 sm:p-6 min-h-0 relative z-10 max-w-5xl w-full mx-auto pb-12">
        
        {/* Animated Progress Journey Stepper */}
        <StepProgressJourney
          currentStep={step}
          method={method}
          visibility={visibility}
          onStepClick={(targetStep) => {
            if (targetStep < step) {
              setDirection(-1);
              setStep(targetStep);
            }
          }}
        />

        {/* Wizard step stage container with glass panel */}
        <div className="w-full relative min-h-[480px] bg-white/75 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-xl p-6 sm:p-8 flex flex-col justify-between transition-all">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-full flex-1 flex flex-col"
            >
              {/* STEP 1: CHOOSE CREATION METHOD */}
              {step === 1 && (
                <div className="flex flex-col gap-6 w-full items-center text-center">
                  <div className="mb-4">
                    <h2 className="font-display font-extrabold text-2xl text-slate-800 tracking-tight">Choose Creation Method</h2>
                    <p className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed">
                      Select how you want to build this test. AI generator outlines the questions instantly, or build it manually.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mt-4">
                    {/* Card 1: AI Generation */}
                    <GlassCard
                      onClick={() => handleMethodSelect('ai')}
                      className={`p-7 border-slate-100/60 hover:border-purple-300 hover:shadow-lg cursor-pointer flex flex-col items-center text-center transition-all duration-300 group bg-white ${
                        method === 'ai' ? 'ring-2 ring-purple-500 border-purple-500 shadow-md' : ''
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner mb-5 group-hover:scale-105 transition-transform">
                        <BrainCircuit size={28} />
                      </div>
                      <span className="text-base font-extrabold text-slate-800 group-hover:text-purple-600 transition-colors flex items-center gap-1.5 justify-center">
                        <span>AI Test Generation</span>
                        <Sparkles size={14} className="text-purple-500 fill-purple-200" />
                      </span>
                      <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                        Input a topic, select difficulty levels, and set custom question counts to let Testoriax AI compile the test schema automatically.
                      </p>
                    </GlassCard>

                    {/* Card 2: Manual Builder */}
                    <GlassCard
                      onClick={() => handleMethodSelect('manual')}
                      className={`p-7 border-slate-100/60 hover:border-indigo-300 hover:shadow-lg cursor-pointer flex flex-col items-center text-center transition-all duration-300 group bg-white ${
                        method === 'manual' ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-md' : ''
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner mb-5 group-hover:scale-105 transition-transform">
                        <Edit3 size={28} />
                      </div>
                      <span className="text-base font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        Manual Test Builder
                      </span>
                      <p className="text-xs text-slate-400 mt-2 font-semibold leading-relaxed">
                        Design specific sections, manually insert multiple choices, coding IDE testcases, matching, fillups, and customize details block by block.
                      </p>
                    </GlassCard>
                  </div>
                </div>
              )}

              {/* STEP 2: BASIC TEST DETAILS */}
              {step === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                  
                  {/* Left Column: Form Details (7/12) */}
                  <div className="lg:col-span-7 flex flex-col gap-5">
                    <div>
                      <h2 className="font-display font-extrabold text-xl text-slate-800 tracking-tight">Basic Test Details</h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-semibold">Provide initial settings, duration, scoring, and thumbnails.</p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Test Title */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Test Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Java Programming Mock Test"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white"
                        />
                      </div>

                      {/* Description */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Description</label>
                        <textarea
                          rows={3}
                          placeholder="Explain instructions, syllabus, or guidelines for candidates..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full p-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white resize-none leading-relaxed"
                        />
                      </div>

                      {/* Duration & Marks grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            <span>Duration (Mins)</span>
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                            className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1">
                            <Award size={11} className="text-slate-400" />
                            <span>Total Marks</span>
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={totalMarks}
                            onChange={(e) => setTotalMarks(parseInt(e.target.value) || 0)}
                            className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white"
                          />
                        </div>
                      </div>

                      {/* Negative Marking Toggle */}
                      <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">Negative Marking</span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block leading-normal">
                            Candidates lose marks for incorrect selections.
                          </span>
                        </div>
                        <div className="flex items-center gap-3.5">
                          {negativeMarking && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-slate-400">Deduct:</span>
                              <input
                                type="number"
                                step="0.05"
                                min="0.05"
                                max="2"
                                value={negativeValue}
                                onChange={(e) => setNegativeValue(parseFloat(e.target.value) || 0)}
                                className="w-14 py-1.5 px-2 rounded-xl border border-slate-200 text-center font-extrabold text-xs bg-white focus:outline-none"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setNegativeMarking(!negativeMarking)}
                            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                              negativeMarking ? 'bg-purple-600' : 'bg-slate-200'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                              negativeMarking ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Upload UI & Badges (5/12) */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Thumbnail Upload Area */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Test Thumbnail</label>
                      <input
                        type="file"
                        ref={thumbnailInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleThumbnailFile(e.target.files[0]);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <div 
                        onClick={() => thumbnailInputRef.current?.click()}
                        onDragEnter={handleThumbnailDrag}
                        onDragOver={handleThumbnailDrag}
                        onDragLeave={handleThumbnailDrag}
                        onDrop={handleThumbnailDrop}
                        style={getThumbnailStyle()}
                        className={`border-2 border-dashed rounded-3xl p-6.5 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[140px] relative overflow-hidden group ${
                          isThumbnailDragActive
                            ? 'border-purple-500 bg-purple-50/20'
                            : getThumbnailClass()
                        }`}
                      >
                        {mockThumbnail ? (
                          <>
                            {/* Overlay on hover for uploaded images */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 z-20">
                              <UploadCloud size={20} className="text-white" />
                              <span className="text-[10px] font-bold text-white">Change Cover Image</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 z-10 relative">
                              <CheckCircle2 size={24} className="text-white fill-purple-650/10" />
                              <span className="text-xs font-extrabold text-white drop-shadow">Thumbnail Uploaded!</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMockUpload();
                                }}
                                className="text-[9px] bg-white/20 hover:bg-white/30 text-white font-semibold px-2 py-0.5 rounded-lg transition-colors mt-1 pointer-events-auto"
                              >
                                Or generate mock gradient
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <UploadCloud size={30} className="text-slate-400 mb-2" />
                            <span className="text-xs font-bold text-slate-800">Upload Test Cover Image</span>
                            <span className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1 max-w-[180px] mx-auto">
                              Drag & drop image, or click to choose file.
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMockUpload();
                              }}
                              className="text-[9px] text-purple-600 hover:text-purple-700 font-bold mt-2 hover:underline pointer-events-auto"
                            >
                              Or generate a mock gradient
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Supported Question Types Chips */}
                    <div className="bg-white/50 border border-slate-100/50 p-4 rounded-3xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1 block mb-2">Supported Question Types</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'MCQ', 'Fill in the Blanks', 'True/False', 
                          'Coding Questions', 'Match the Following', 'Image Based'
                        ].map((badge) => (
                          <span 
                            key={badge} 
                            className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100/20"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Source Document Upload & AI OCR Parser */}
                    <div className="bg-white/50 border border-slate-100/50 p-4.5 rounded-3xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider pl-1 block">AI Question Parser (Optional)</span>
                        <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded uppercase">OCR & Text</span>
                      </div>
                      
                      {/* Drag & Drop File Selector / Paste Toggle */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setParserMode('upload')}
                          className={`flex-1 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                            parserMode === 'upload' ? 'border-purple-500 bg-purple-50/20 text-purple-700' : 'border-slate-100 bg-white text-slate-400'
                          }`}
                        >
                          Upload PDF/Image
                        </button>
                        <button
                          type="button"
                          onClick={() => setParserMode('paste')}
                          className={`flex-1 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                            parserMode === 'paste' ? 'border-purple-500 bg-purple-50/20 text-purple-700' : 'border-slate-100 bg-white text-slate-400'
                          }`}
                        >
                          Copy-Paste Text
                        </button>
                      </div>

                      {parserMode === 'upload' ? (
                        <>
                          <input
                            type="file"
                            ref={docInputRef}
                            accept="image/*,application/pdf,text/plain"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleDocFile(e.target.files[0]);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                          <div 
                            onClick={() => docInputRef.current?.click()}
                            onDragEnter={handleDocDrag}
                            onDragOver={handleDocDrag}
                            onDragLeave={handleDocDrag}
                            onDrop={handleDocDrop}
                            className={`border border-dashed rounded-2xl p-4.5 text-center cursor-pointer transition-all relative ${
                              isDocDragActive
                                ? 'border-purple-500 bg-purple-50/20 text-purple-800'
                                : uploadedDoc ? 'border-purple-300 bg-purple-50/10 text-purple-800' : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/5'
                            }`}
                          >
                            {uploadedDoc ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-bold truncate max-w-[180px]">📎 {uploadedDoc.name}</span>
                                <span className="text-[9px] text-slate-400 font-semibold">({uploadedDoc.size} - Ready to extract)</span>
                                <span className="text-[8px] text-purple-500 hover:underline mt-1 block">Click or drop to replace</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDocMockUpload();
                                  }}
                                  className="text-[8px] bg-slate-100 hover:bg-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded-lg transition-colors mt-2"
                                >
                                  Or use mock document
                                </button>
                              </div>
                            ) : (
                              <>
                                <UploadCloud size={20} className="text-slate-450 mx-auto mb-1.5" />
                                <span className="text-[10px] font-bold text-slate-700 block">Select Photo / PDF</span>
                                <span className="text-[8px] text-slate-400 block mt-0.5">Drag & drop or paste image here</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDocMockUpload();
                                  }}
                                  className="text-[8px] text-purple-650 hover:underline mt-2 font-semibold"
                                >
                                  Or use mock document
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <textarea
                          rows={2}
                          placeholder="Paste reference questions or text here to parse..."
                          value={pastedDocText}
                          onChange={(e) => setPastedDocText(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-[10px] font-semibold bg-white outline-none focus:border-purple-400 resize-none leading-relaxed"
                        />
                      )}

                      <button
                        type="button"
                        onClick={handleExtractDocQuestions}
                        disabled={isExtracting || (!uploadedDoc && !pastedDocText.trim())}
                        className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 disabled:from-slate-100 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-[10px] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isExtracting ? (
                          <>
                            <Loader2 className="animate-spin animate-duration-1000" size={12} />
                            <span>{ocrProgress || 'Parsing Source Material...'}</span>
                          </>
                        ) : (
                          'Extract & Import Questions'
                        )}
                      </button>

                      {/* Simulated Extracted Questions list */}
                      {extractedQuestions.length > 0 && (
                        <div className="border-t border-slate-150/60 pt-3 space-y-2 max-h-[140px] overflow-y-auto">
                          <span className="text-[9px] font-bold text-slate-450 uppercase pl-1 block">Extracted Questions ({extractedQuestions.length})</span>
                          <div className="space-y-2">
                            {extractedQuestions.map((q) => (
                              <div key={q.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] flex items-start justify-between gap-2.5">
                                <div className="flex-grow min-w-0">
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-1 rounded">{q.type}</span>
                                  <p className="font-bold text-slate-700 mt-1 truncate">{q.text}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleImportQuestion(q.id)}
                                  className={`px-2 py-0.5 rounded font-extrabold text-[8px] uppercase tracking-wide cursor-pointer transition-all ${
                                    importedQIds.includes(q.id) ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-200 text-slate-655'
                                  }`}
                                >
                                  {importedQIds.includes(q.id) ? 'Imported' : 'Import'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}
              {/* STEP 3: MANUAL BUILDER OR AI GENERATOR REDIRECT */}
              {step === 3 && (
                method === 'manual' ? (
                  <div className="flex-1 flex flex-col overflow-hidden min-h-[500px] animate-in fade-in duration-300">
                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 gap-4 bg-white/70 border border-slate-100/50 p-4.5 rounded-3xl shadow-sm mb-6">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Questions</span>
                        <p className="font-display font-extrabold text-lg text-slate-800 mt-0.5">{questions.length}</p>
                      </div>
                      <div className="w-px bg-slate-100 self-center h-8" />
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Points</span>
                        <p className="font-display font-extrabold text-lg text-slate-800 mt-0.5">
                          {questions.reduce((sum, q) => sum + q.points, 0)} pts
                        </p>
                      </div>
                      <div className="w-px bg-slate-100 self-center h-8" />
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Est. Duration</span>
                        <p className="font-display font-extrabold text-lg text-slate-800 mt-0.5">
                          {questions.reduce((sum, q) => {
                            if (q.type === 'coding') return sum + 10;
                            if (q.type === 'matching') return sum + 3;
                            if (q.type === 'fillups') return sum + 1.5;
                            if (q.type === 'mcq') return sum + 1;
                            if (q.type === 'true-false') return sum + 0.5;
                            return sum + 4; // custom/image
                          }, 0)} mins
                        </p>
                      </div>
                    </div>

                    {/* Builder Workspace */}
                    <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                      {/* Left Canvas: Question Cards List */}
                      <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-5 max-h-[460px]">
                        {questions.map((q, idx) => (
                          <QuestionCard
                            key={q.id}
                            question={q}
                            index={idx}
                            isActive={activeQuestionId === q.id}
                            onSelect={() => setActiveQuestionId(activeQuestionId === q.id ? null : q.id)}
                            onUpdate={handleUpdateQuestion}
                            onDelete={() => handleDeleteQuestion(q.id)}
                            onDuplicate={() => handleDuplicateQuestion(q)}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                          />
                        ))}

                        {questions.length === 0 && (
                          <GlassCard className="border-dashed border-2 border-slate-200/80 p-12 text-center bg-white/50">
                            <BookOpen size={40} className="text-slate-350 mx-auto mb-4" />
                            <h4 className="font-display font-bold text-base text-slate-800">Your Canvas is empty</h4>
                            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                              Use the inserter panels on the right side to add MCQ, Coding, matching, true/false, fillups, or image-based questions.
                            </p>
                          </GlassCard>
                        )}
                      </div>

                      {/* Right Toolbar: Inserter Panel */}
                      <aside className="w-full lg:w-64 bg-white/60 border border-slate-100 p-5 rounded-3xl flex flex-col gap-4 shrink-0 max-h-[460px] overflow-y-auto">
                        <div>
                          <h4 className="font-display font-extrabold text-xs text-slate-800 tracking-tight flex items-center gap-1.5 uppercase mb-1">
                            <Plus size={14} className="text-pink-500" />
                            <span>Insert Question Type</span>
                          </h4>
                          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                            Click to insert dynamic testing schemas directly to your canvas list.
                          </p>
                        </div>

                        <div className="flex flex-col gap-3">
                          {[
                            { type: 'mcq', name: 'MCQ (Single Select)', desc: 'Standard multiple choices' },
                            { type: 'fillups', name: 'Fill in the Blanks', desc: 'Autodetected slots in sentence' },
                            { type: 'true-false', name: 'True / False', desc: 'Binary boolean options selection' },
                            { type: 'coding', name: 'Coding Challenge', desc: 'Boilerplate editor + execution cases' },
                            { type: 'matching', name: 'Match the Following', desc: 'Pairs matching list' },
                            { type: 'image', name: 'Image Based', desc: 'Visual diagram matching question' },
                          ].map((tmpl) => (
                            <GlassCard
                              key={tmpl.type}
                              onClick={() => handleAddQuestion(tmpl.type as QuestionType)}
                              className="p-4 border-slate-100/60 hover:border-pink-300 hover:shadow-md cursor-pointer transition-all flex flex-col items-start text-left bg-white group"
                            >
                              <span className="text-xs font-bold text-slate-850 group-hover:text-pink-600 transition-colors">
                                {tmpl.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                                {tmpl.desc}
                              </span>
                            </GlassCard>
                          ))}
                        </div>
                      </aside>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-300">
                    <AIOrbCore isGenerating={true} />
                    <h4 className="font-display font-extrabold text-lg text-slate-800 tracking-tight mt-6">Initializing AI Question Generator...</h4>
                    <p className="text-xs text-slate-500 max-w-md mt-2 font-semibold leading-relaxed">
                      Launching the Testoriax AI Studio canvas to auto-generate questions, options, explanations, and code test cases.
                    </p>
                  </div>
                )
              )}

              {/* STEP 4: VISIBILITY & REGISTRATION */}
              {step === 4 && (
                <div className="flex flex-col gap-8 w-full animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
                  
                  {/* Left Column: Visibility Configuration (5/12) */}
                  <div className="lg:col-span-5 flex flex-col gap-5">
                    <div>
                      <h2 className="font-display font-extrabold text-xl text-slate-800 tracking-tight">Visibility Settings</h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-semibold">Determine who can access and attempt this test.</p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Public Option */}
                      <label className={`p-4 rounded-2xl border-2 flex items-start gap-3.5 cursor-pointer transition-all ${
                        visibility === 'public'
                          ? 'border-purple-500 bg-purple-50/20 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 bg-white/70'
                      }`}>
                        <input
                          type="radio"
                          name="visibility"
                          checked={visibility === 'public'}
                          onChange={() => setVisibility('public')}
                          className="mt-1 accent-purple-600 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                            <Globe size={13} className="text-purple-600" />
                            <span>Public Test</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block leading-relaxed">
                            Listed in the Testoriax lobby directory. Anyone can search and register.
                          </span>
                        </div>
                      </label>

                      {/* Private Option */}
                      <label className={`p-4 rounded-2xl border-2 flex items-start gap-3.5 cursor-pointer transition-all ${
                        visibility === 'private'
                          ? 'border-purple-500 bg-purple-50/20 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 bg-white/70'
                      }`}>
                        <input
                          type="radio"
                          name="visibility"
                          checked={visibility === 'private'}
                          onChange={() => setVisibility('private')}
                          className="mt-1 accent-purple-600 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                            <Lock size={13} className="text-indigo-600" />
                            <span>Private Test</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block leading-relaxed">
                            Accessible only through a secure generated URL link.
                          </span>
                        </div>
                      </label>

                      {/* Private sub-panel */}
                      {visibility === 'private' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-r from-purple-50/40 to-indigo-50/40 border border-purple-100/50 p-4.5 rounded-2xl flex flex-col gap-3.5 shadow-sm"
                        >
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide flex items-center gap-1">
                            <Link size={12} />
                            <span>Secure Access Link Generation</span>
                          </span>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}/lobby/join/${testId || 'prv-39c8a9f2'}`}
                              className="flex-1 py-2 px-3 border border-slate-200 rounded-xl outline-none font-mono text-[10px] bg-white text-slate-500 min-w-0"
                            />
                            <button
                              type="button"
                              onClick={handleCopyLink}
                              className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer select-none ${
                                copied 
                                  ? 'bg-emerald-500 text-white shadow-md' 
                                  : 'bg-slate-900 hover:bg-slate-850 text-white'
                              }`}
                            >
                              {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Expiry Time (Hours)</label>
                            <select
                              value={expiryTime}
                              onChange={(e) => setExpiryTime(e.target.value)}
                              className="w-full py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs bg-white font-semibold text-slate-600"
                            >
                              <option value="2">2 Hours</option>
                              <option value="12">12 Hours</option>
                              <option value="24">24 Hours</option>
                              <option value="72">72 Hours</option>
                              <option value="never">Never Expire</option>
                            </select>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Public Registration Settings (7/12) */}
                  <div className="lg:col-span-7 flex flex-col gap-5">
                    {visibility === 'public' ? (
                      <>
                        <div>
                          <h2 className="font-display font-extrabold text-xl text-slate-800 tracking-tight">Registration Settings</h2>
                          <p className="text-xs text-slate-400 mt-0.5 font-semibold">Select and construct the participant registration form.</p>
                        </div>

                        <div className="flex flex-col gap-4">
                          {/* Selector */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'none', label: 'No Sign-up' },
                              { id: 'simple', label: 'Simple' },
                              { id: 'custom', label: 'Custom Builder' }
                            ].map((regOpt) => {
                              const isSel = registrationType === regOpt.id;
                              return (
                                <button
                                  key={regOpt.id}
                                  type="button"
                                  onClick={() => setRegistrationType(regOpt.id as RegistrationType)}
                                  className={`py-2.5 px-3 rounded-xl border font-bold text-[10px] uppercase tracking-wide text-center transition-all cursor-pointer ${
                                    isSel
                                      ? 'border-purple-500 bg-purple-50/20 text-purple-700 shadow-sm'
                                      : 'border-slate-150 bg-white/70 hover:border-slate-250 text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  {regOpt.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Optional Entry Fee (if Simple or Custom Selected) */}
                          {registrationType !== 'none' && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between gap-4"
                            >
                              <div>
                                <span className="text-xs font-bold text-slate-700 block">Required Entry Fee</span>
                                <span className="text-[10px] text-slate-450 font-semibold mt-0.5 block">
                                  Optional fee for paid certificate exams.
                                </span>
                              </div>
                              <div className="relative max-w-[120px] w-full">
                                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="number"
                                  placeholder="Free"
                                  value={entryFee}
                                  onChange={(e) => setEntryFee(e.target.value)}
                                  className="w-full py-2.5 pl-8 pr-3.5 rounded-xl border border-slate-200 outline-none text-xs font-bold bg-white text-slate-700 focus:border-purple-400"
                                />
                              </div>
                            </motion.div>
                          )}

                          {/* Default fields notice */}
                          {registrationType === 'simple' && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="bg-white/50 border border-slate-100 p-4.5 rounded-2xl space-y-3"
                            >
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Default Registration Fields</span>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  'Full Name', 'Email Address', 'Mobile Number', 
                                  'College/School', 'Course Name', 'Year/Semester'
                                ].map((df) => (
                                  <div key={df} className="flex items-center gap-2 text-xs font-bold text-slate-650 pl-1">
                                    <UserCheck size={13} className="text-purple-500" />
                                    <span>{df}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* Custom Registration Builder */}
                          {registrationType === 'custom' && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white/50 border border-slate-100/50 p-4.5 rounded-3xl space-y-4 max-h-[220px] overflow-y-auto"
                            >
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Custom Registration Builder</span>
                              
                              <div className="grid grid-cols-2 gap-3">
                                {Object.entries(regFields).map(([fieldKey, isEnabled]) => {
                                  // Capitalize field name
                                  const name = fieldKey
                                    .replace(/([A-Z])/g, ' $1')
                                    .replace(/^./, (str) => str.toUpperCase());
                                  return (
                                    <button
                                      key={fieldKey}
                                      type="button"
                                      onClick={() => handleToggleRegField(fieldKey)}
                                      className={`flex items-center justify-between p-2 rounded-xl border text-left cursor-pointer transition-all ${
                                        isEnabled
                                          ? 'border-purple-200 bg-purple-50/30 text-purple-700 font-extrabold'
                                          : 'border-slate-100 bg-white text-slate-400 font-semibold'
                                      }`}
                                    >
                                      <span className="text-xs truncate">{name}</span>
                                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                        isEnabled ? 'border-purple-500 bg-purple-500 text-white' : 'border-slate-300'
                                      }`}>
                                        {isEnabled && <Check size={10} strokeWidth={4} />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50">
                                <label className="text-[9px] font-bold text-slate-450 uppercase">Custom Question Field (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Why do you want to join this program?"
                                  value={customQuestion}
                                  onChange={(e) => setCustomQuestion(e.target.value)}
                                  className="w-full py-2 px-3 rounded-xl border border-slate-200 outline-none text-xs bg-white text-slate-700"
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 border border-slate-100 border-dashed rounded-3xl h-full">
                        <AlertCircle size={36} className="text-slate-300 mb-2" />
                        <h4 className="font-bold text-slate-800 text-sm">Private Tests Access Only</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed font-semibold">
                          Since you selected "Private Test", candidate sign-up registers are disabled. Only invited access link candidates are allowed.
                        </p>
                      </div>
                    )}
                  </div>

                  </div>

                  {/* ADVANCED RESULT & RELEASE SETTINGS */}
                  <GlassCard className="border-slate-150/40 p-6 flex flex-col gap-6 bg-white/70 backdrop-blur-md">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-2">
                          <Settings size={16} className="text-purple-600" />
                          <span>Advanced Result, Review & Winner Settings</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Configure candidate result visibility, feedback reviews, and automatic release controls.
                        </p>
                      </div>

                      {/* Preset Selection Buttons */}
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setResultVisibility('private');
                            setAnswerReviewMode('score_answers_explanations');
                            setResultReleaseMode('immediately');
                            setWinnerVisibility('public');
                            setNotifyOnResultRelease(true);
                            triggerToast('Applied Learning Mode presets!');
                          }}
                          className="px-3.5 py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100/50 hover:bg-purple-100 transition-all cursor-pointer border border-purple-200/20"
                        >
                          Learning Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResultVisibility('creator_only');
                            setAnswerReviewMode('no_review');
                            setResultReleaseMode('after_test_end');
                            setWinnerVisibility('private');
                            setNotifyOnResultRelease(false);
                            triggerToast('Applied Exam Mode presets!');
                          }}
                          className="px-3.5 py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100/50 hover:bg-indigo-100 transition-all cursor-pointer border border-indigo-200/20"
                        >
                          Exam Mode
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Result Visibility Select */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                          Result Visibility
                        </label>
                        <select
                          value={resultVisibility}
                          onChange={(e: any) => setResultVisibility(e.target.value)}
                          className="w-full py-2.5 px-3 rounded-xl border border-slate-250 outline-none text-xs bg-white font-semibold text-slate-650 focus:border-purple-400 transition-all shadow-sm"
                        >
                          <option value="public">Public (Show leaderboard & names)</option>
                          <option value="anonymous">Anonymous (Scoreboard, hide names)</option>
                          <option value="private">Private (See own score only)</option>
                          <option value="creator_only">Creator Only (Hide from candidates)</option>
                        </select>
                        <span className="text-[9px] text-slate-400 leading-normal pl-1">
                          Defines who has access to view the candidate leaderboard scores.
                        </span>
                      </div>

                      {/* Answer Review Mode Select */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                          Answer Review Mode
                        </label>
                        <select
                          value={answerReviewMode}
                          onChange={(e: any) => setAnswerReviewMode(e.target.value)}
                          className="w-full py-2.5 px-3 rounded-xl border border-slate-250 outline-none text-xs bg-white font-semibold text-slate-650 focus:border-purple-400 transition-all shadow-sm"
                        >
                          <option value="no_review">No Review (Submission status only)</option>
                          <option value="score_only">Score Only (Score & stats metrics)</option>
                          <option value="score_answers">Score + Answers (Score & correct answers)</option>
                          <option value="score_answers_explanations">Full Review (Scores + explanations)</option>
                        </select>
                        <span className="text-[9px] text-slate-400 leading-normal pl-1">
                          Controls the level of details shown to candidates during exam review.
                        </span>
                      </div>

                      {/* Result Release Mode Select */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                          Result Release Control
                        </label>
                        <select
                          value={resultReleaseMode}
                          onChange={(e: any) => setResultReleaseMode(e.target.value)}
                          className="w-full py-2.5 px-3 rounded-xl border border-slate-250 outline-none text-xs bg-white font-semibold text-slate-650 focus:border-purple-400 transition-all shadow-sm"
                        >
                          <option value="immediately">Immediately on submission</option>
                          <option value="after_test_end">After test expiry time</option>
                          <option value="manual_release">Manual release by creator</option>
                        </select>
                        <span className="text-[9px] text-slate-400 leading-normal pl-1">
                          Decides when the scores are published and visible to participants.
                        </span>
                      </div>

                      {/* Winner Visibility Select */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                          Winner Visibility
                        </label>
                        <select
                          value={winnerVisibility}
                          onChange={(e: any) => setWinnerVisibility(e.target.value)}
                          className="w-full py-2.5 px-3 rounded-xl border border-slate-250 outline-none text-xs bg-white font-semibold text-slate-650 focus:border-purple-400 transition-all shadow-sm"
                        >
                          <option value="public">Public (Name + Score displayed)</option>
                          <option value="anonymous">Anonymous (ID + Score displayed)</option>
                          <option value="private">Private (Creator only views winner)</option>
                        </select>
                        <span className="text-[9px] text-slate-400 leading-normal pl-1">
                          Configures the anonymity level for the top-scoring participant.
                        </span>
                      </div>
                    </div>

                    {/* Notify Toggle */}
                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">Release Alerts Notification</span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Sends in-app notifications and prepares automated emails to candidates upon result release.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={notifyOnResultRelease}
                          onChange={(e) => setNotifyOnResultRelease(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </GlassCard>

                  {/* AI PROCTORING & SECURITY SETTINGS */}
                  <GlassCard className="border-slate-150/40 p-6 flex flex-col gap-6 bg-white/70 backdrop-blur-md mt-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-2">
                          <ShieldCheck size={16} className="text-emerald-500" />
                          <span>AI Proctoring & Security Settings</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Enforce secure browser environments, require webcams, and track AI-based cheating incidents.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Browser Security Settings */}
                      <div className="flex flex-col gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-150">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Browser Locking</span>
                        {[
                          { key: 'require_fullscreen', label: 'Require Fullscreen' },
                          { key: 'tab_switch_detection', label: 'Tab Switch Detection' },
                          { key: 'disable_copy_paste', label: 'Disable Copy/Paste' },
                          { key: 'disable_right_click', label: 'Disable Right Click' },
                          { key: 'disable_shortcuts', label: 'Disable Shortcuts' },
                          { key: 'detect_devtools', label: 'Detect Dev Tools' }
                        ].map((setting) => (
                          <label key={setting.key} className="flex items-center justify-between cursor-pointer group">
                            <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">{setting.label}</span>
                            <div className="relative inline-flex items-center cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={(securitySettings as any)[setting.key]} 
                                onChange={(e) => setSecuritySettings((prev: any) => ({ ...prev, [setting.key]: e.target.checked }))}
                                className="sr-only peer" 
                              />
                              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* AI Monitoring Settings */}
                      <div className="flex flex-col gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-150">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">AI Video Monitoring</span>
                        {[
                          { key: 'require_webcam', label: 'Webcam Required' },
                          { key: 'face_presence_detection', label: 'Face Tracking' },
                          { key: 'multiple_face_detection', label: 'Detect Multiple Faces' },
                          { key: 'face_missing_detection', label: 'Detect Missing Face' },
                          { key: 'periodic_snapshot_capture', label: 'Periodic Snapshots' },
                          { key: 'record_violation_screenshots', label: 'Record Violations' }
                        ].map((setting) => (
                          <label key={setting.key} className="flex items-center justify-between cursor-pointer group">
                            <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">{setting.label}</span>
                            <div className="relative inline-flex items-center cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={(securitySettings as any)[setting.key]} 
                                onChange={(e) => setSecuritySettings((prev: any) => ({ ...prev, [setting.key]: e.target.checked }))}
                                className="sr-only peer" 
                              />
                              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Action Settings */}
                      <div className="flex flex-col gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-150">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Violation Actions</span>
                        
                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">Auto Submit on Critical</span>
                          <div className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={securitySettings.auto_submit_on_violations} 
                              onChange={(e) => setSecuritySettings((prev: any) => ({ ...prev, auto_submit_on_violations: e.target.checked }))}
                              className="sr-only peer" 
                            />
                            <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500"></div>
                          </div>
                        </label>

                        <div className="flex flex-col gap-1.5 mt-2">
                          <label className="text-[10px] font-bold text-slate-500">Max Violations Before Terminate</label>
                          <input 
                            type="number" 
                            value={securitySettings.max_violations}
                            onChange={(e) => setSecuritySettings((prev: any) => ({ ...prev, max_violations: parseInt(e.target.value) || 3 }))}
                            className="w-full py-1.5 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
                            min="1" max="10"
                          />
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* COMPETITION SETTINGS (OPTIONAL) */}
                  <GlassCard className="border-slate-150/40 p-6 flex flex-col gap-6 bg-white/70 backdrop-blur-md mt-6 animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-display font-extrabold text-sm text-slate-800 flex items-center gap-2">
                          <Award size={16} className="text-pink-500" />
                          <span>🏆 Competition Settings (Optional)</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Turn this published practice test into a scheduled competition. If disabled, this test behaves like a normal public practice test.
                        </p>
                      </div>

                      {/* Toggle Button */}
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={isCompetition}
                          onChange={(e) => handleToggleCompetition(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-700 ml-2">Host this Test as Competition</span>
                      </label>
                    </div>

                    {isCompetition && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-5"
                      >
                        {/* Competition Title */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Competition Title</label>
                          <input
                            type="text"
                            required
                            placeholder="Enter competition title"
                            value={compTitle}
                            onChange={(e) => setCompTitle(e.target.value)}
                            className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white text-slate-800"
                          />
                        </div>

                        {/* Competition Banner Theme */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Competition Banner Theme</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                            {BANNER_GRADIENTS.map((gradient) => {
                              const isSelected = compBanner === gradient.value;
                              return (
                                <button
                                  key={gradient.name}
                                  type="button"
                                  onClick={() => setCompBanner(gradient.value)}
                                  className={`h-10 rounded-xl bg-gradient-to-r ${gradient.value} text-white font-bold text-[10px] flex items-center justify-center border-2 transition-all relative ${
                                    isSelected ? 'border-pink-500 shadow-md ring-2 ring-pink-100 scale-[1.01]' : 'border-transparent opacity-85 hover:opacity-100'
                                  }`}
                                >
                                  <span>{gradient.name}</span>
                                  {isSelected && (
                                    <span className="absolute top-1 right-1 bg-white text-pink-500 rounded-full p-0.5 shadow-sm">
                                      <Check size={8} strokeWidth={4} />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Competition Description */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Competition Description</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Provide rules, format, or general info..."
                            value={compDescription}
                            onChange={(e) => setCompDescription(e.target.value)}
                            className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white text-slate-800 resize-none"
                          />
                        </div>

                        {/* Start and End Date/Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Competition Start Date & Time</label>
                            <input
                              type="datetime-local"
                              required
                              value={compStart}
                              onChange={(e) => setCompStart(e.target.value)}
                              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white text-slate-800"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Competition End Date & Time</label>
                            <input
                              type="datetime-local"
                              required
                              value={compEnd}
                              onChange={(e) => setCompEnd(e.target.value)}
                              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Registration Deadline & Max Participants */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Registration Deadline</label>
                            <input
                              type="datetime-local"
                              required
                              value={compDeadline}
                              onChange={(e) => setCompDeadline(e.target.value)}
                              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white text-slate-800"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Maximum Participants</label>
                            <input
                              type="number"
                              required
                              min={1}
                              placeholder="e.g. 100"
                              value={compLimit}
                              onChange={(e) => setCompLimit(e.target.value)}
                              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Optional Rules, Prizes, Contact */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Prize Details (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. Certificate + Cash Prize"
                              value={compPrizes}
                              onChange={(e) => setCompPrizes(e.target.value)}
                              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white text-slate-800"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Competition Rules (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. No tab switching allowed"
                              value={compRules}
                              onChange={(e) => setCompRules(e.target.value)}
                              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white text-slate-800"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Organizer Contact (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. contact@email.com"
                              value={compContact}
                              onChange={(e) => setCompContact(e.target.value)}
                              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all font-semibold bg-white text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Dropdown Settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider pl-1">Leaderboard Settings</label>
                            <select
                              value={compLeaderboard}
                              onChange={(e: any) => setCompLeaderboard(e.target.value)}
                              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs font-semibold bg-white text-slate-800 focus:border-purple-400"
                            >
                              <option value="live">Live Leaderboard</option>
                              <option value="after_end">Show Leaderboard After Competition Ends</option>
                              <option value="hide">Hide Leaderboard</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider pl-1">Winner Announcement</label>
                            <select
                              value={compWinnerPrivacy}
                              onChange={(e: any) => setCompWinnerPrivacy(e.target.value)}
                              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 outline-none text-xs font-semibold bg-white text-slate-800 focus:border-purple-400"
                            >
                              <option value="public">Public Winner Names</option>
                              <option value="anonymous">Anonymous Winners</option>
                              <option value="private">Creator Only</option>
                            </select>
                          </div>
                        </div>

                        {/* Competition Status Preview Summary Card */}
                        <div className="border border-slate-100 rounded-2xl p-4.5 bg-slate-50/50 flex flex-col gap-3">
                          <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wide block mb-1">Competition Status Preview</span>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-semibold text-slate-600">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Duration</span>
                              <span className="font-extrabold text-slate-800 mt-0.5">
                                {(() => {
                                  if (!compStart || !compEnd) return 'Not set';
                                  const diffMs = new Date(compEnd).getTime() - new Date(compStart).getTime();
                                  if (diffMs <= 0) return 'Invalid duration';
                                  const mins = Math.floor(diffMs / 60000);
                                  const hrs = Math.floor(mins / 60);
                                  const days = Math.floor(hrs / 24);
                                  if (days > 0) return `${days} day(s) ${hrs % 24} hr(s)`;
                                  if (hrs > 0) return `${hrs} hr(s) ${mins % 60} min(s)`;
                                  return `${mins} min(s)`;
                                })()}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Registration Ends</span>
                              <span className="font-extrabold text-slate-800 mt-0.5 text-ellipsis overflow-hidden whitespace-nowrap" title={compDeadline ? new Date(compDeadline).toLocaleString() : ''}>
                                {compDeadline ? new Date(compDeadline).toLocaleDateString() : 'Not set'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Participant Limit</span>
                              <span className="font-extrabold text-slate-800 mt-0.5">{compLimit || '100'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Leaderboard Mode</span>
                              <span className="font-extrabold text-slate-800 mt-0.5 capitalize">
                                {compLeaderboard === 'live' ? 'Live' : compLeaderboard === 'after_end' ? 'Post-End' : 'Hidden'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Winner Visibility</span>
                              <span className="font-extrabold text-slate-800 mt-0.5 capitalize">
                                {compWinnerPrivacy === 'public' ? 'Public' : compWinnerPrivacy === 'anonymous' ? 'Anonymous' : 'Creator'}
                              </span>
                            </div>
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </GlassCard>
                </div>
              )}

              {/* STEP 5: REVIEW & PUBLISH (PUBLIC) OR SUCCESS SCREEN (PRIVATE) */}
              {step === 5 && (
                visibility === 'public' ? (
                  <div className="flex flex-col gap-6 w-full items-center text-center max-w-2xl mx-auto animate-in fade-in duration-300">
                    <div>
                      <h2 className="font-display font-extrabold text-xl text-slate-800 tracking-tight">Review & Publish</h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-semibold">Take a final look at how candidates see your certificate mock page.</p>
                    </div>

                    {/* Glassmorphism Live Preview Card */}
                    <div className="w-full max-w-sm rounded-3xl border border-slate-150/40 bg-white/70 backdrop-blur-md overflow-hidden shadow-xl mt-2 relative hover:scale-[1.01] transition-transform duration-300">
                      {/* Top cover banner */}
                      <div 
                        style={mockThumbnail && !isGradient ? { backgroundImage: `url(${mockThumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                        className={`h-24 ${mockThumbnail && isGradient ? `bg-gradient-to-r ${mockThumbnail}` : !mockThumbnail ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : ''} flex items-center justify-between p-5 text-white`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">Testoriax Certified</span>
                        <FileText size={20} />
                      </div>

                      <div className="p-6 text-left flex flex-col gap-4">
                        <div>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full w-max">
                            <UserCheck size={9} />
                            <span>Public Registration</span>
                          </div>
                          
                          <h3 className="font-display font-extrabold text-base text-slate-850 mt-2 tracking-tight line-clamp-1">
                            {title || "Java Programming Mock Test"}
                          </h3>
                          
                          <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                            By Mahak Gupta
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 bg-slate-50/60 p-3 rounded-2xl text-slate-650 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <UserCheck size={14} className="text-slate-400" />
                            <span>234 Enrolled</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Clock size={14} className="text-slate-400" />
                            <span>{duration} Minutes</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 bg-purple-600/10 text-purple-700 font-extrabold rounded-xl text-xs"
                        >
                          Register Now
                        </button>
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex items-center gap-3 w-full mt-4 justify-center">
                      <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="px-5 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-605 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white transition-all active:scale-[0.98]"
                      >
                        <Eye size={14} className="text-slate-450" />
                        <span>Preview Test Info</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePublish}
                        disabled={isDbLoading}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/10 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isDbLoading ? <Loader2 className="animate-spin text-white" size={14} /> : <Check size={14} className="text-white" />}
                        <span>{isDbLoading ? 'Publishing...' : 'Publish Test'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* PRIVATE SUCCESS PAGE */
                  <div className="flex flex-col gap-6 w-full items-center text-center max-w-2xl mx-auto animate-in fade-in duration-300">
                    
                    {/* Pulsing check circle */}
                    <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/10 mb-2 relative animate-bounce">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.3 }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0 bg-purple-400 rounded-full"
                      />
                      <CheckCircle2 size={40} className="text-white relative z-10" />
                    </div>

                    <div>
                      <h2 className="font-display font-extrabold text-2xl text-slate-800 tracking-tight">Test Created Successfully</h2>
                      <p className="text-xs text-slate-400 mt-1.5 font-semibold max-w-md mx-auto leading-relaxed">
                        Your private assessment **"{title}"** is ready! Distribute the secure access link below to invited candidates.
                      </p>
                    </div>

                    {/* Secure Access Link Box */}
                    <div className="bg-white/70 backdrop-blur-md border border-slate-150/50 p-6 rounded-3xl shadow-xl w-full max-w-md flex flex-col gap-4 text-left">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                        <Link size={12} className="text-purple-650" />
                        <span>Generated Secure Access Link</span>
                      </span>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/lobby/join/${testId || 'prv-39c8a9f2'}`}
                          className="flex-1 py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none font-mono text-xs bg-slate-50 text-slate-550 min-w-0"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className={`px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
                            copied 
                              ? 'bg-emerald-500 text-white shadow-md' 
                              : 'bg-slate-900 hover:bg-slate-850 text-white'
                          }`}
                        >
                          {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const text = `${window.location.origin}/lobby/join/${testId || 'prv-39c8a9f2'}`;
                            if (navigator.share) {
                              navigator.share({
                                title: title,
                                text: `Join my private test: ${title}`,
                                url: text
                              }).catch(() => {});
                            } else {
                              navigator.clipboard.writeText(text).catch(() => {});
                              triggerToast('Link copied to clipboard!');
                            }
                          }}
                          className="px-3 py-2.5 bg-purple-600 hover:bg-purple-755 text-white rounded-xl text-[10px] font-bold cursor-pointer whitespace-nowrap"
                        >
                          Share Link
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5 mt-1 border-t border-slate-50 pt-4">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide pl-1">Expiry Time Settings</label>
                        <select
                          value={expiryTime}
                          onChange={(e) => setExpiryTime(e.target.value)}
                          className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 outline-none text-xs bg-white font-semibold text-slate-600 focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50"
                        >
                          <option value="2">2 Hours</option>
                          <option value="12">12 Hours</option>
                          <option value="24">24 Hours</option>
                          <option value="72">72 Hours</option>
                          <option value="never">Never Expire</option>
                        </select>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3 w-full max-w-sm mt-2">
                      <div className="flex items-center gap-3 w-full justify-center">
                        <button
                          onClick={() => {
                            localStorage.setItem('testoriax_builder_initial_questions', JSON.stringify(questions));
                            localStorage.setItem('testoriax_builder_test_id', testId || '');
                            onNavigate('builder', title);
                          }}
                          className="w-full sm:flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-purple-500/10 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Edit3 size={14} />
                          <span>Question Canvas</span>
                        </button>

                        <button
                          onClick={() => {
                            clearWizardState();
                            onNavigate('dashboard');
                          }}
                          className="w-full sm:flex-1 py-3 border border-slate-200 hover:border-slate-300 text-slate-655 rounded-2xl text-xs font-bold bg-white transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Return to Dashboard
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
              </motion.div>
            </AnimatePresence>
          </div>

        {/* Bottom controls: Back / Next */}
        <div className="w-full border-t border-slate-100/60 pt-6 mt-8 flex justify-between items-center relative z-10">
          <button
            onClick={handleBack}
            disabled={step === 1 || (visibility === 'private' && step === 5)}
            className="px-4 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-white"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          {step < 5 && !(visibility === 'private' && step === 5) ? (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
            >
              <span>{ (step === 4 && visibility === 'private') ? 'Finish' : 'Continue' }</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <div className="w-24 h-5" /> // spacing element
          )}
        </div>

      </main>

      {/* MODAL: PREVIEW CONFIGURATION SUMMARY */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-7 flex flex-col shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-display font-extrabold text-lg text-slate-850 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Eye size={18} className="text-purple-600" />
              <span>Full Test Configuration</span>
            </h3>

            <div className="flex-1 py-4 text-xs font-semibold text-slate-600 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Test Title</span>
                  <p className="text-slate-800 font-extrabold mt-0.5">{title}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Creation Method</span>
                  <p className="text-slate-800 font-extrabold mt-0.5 capitalize">{method} builder</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Description</span>
                <p className="text-slate-700 mt-1 leading-relaxed">{description}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-2xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Duration</span>
                  <span className="text-slate-800 font-extrabold mt-0.5 block">{duration} mins</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Marks</span>
                  <span className="text-slate-800 font-extrabold mt-0.5 block">{totalMarks} pts</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Negative Mark</span>
                  <span className="text-slate-800 font-extrabold mt-0.5 block">
                    {negativeMarking ? `-${negativeValue}` : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Visibility</span>
                  <p className="text-slate-800 font-extrabold mt-0.5 capitalize">{visibility}</p>
                </div>
                {visibility === 'private' ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Expiry hours</span>
                    <p className="text-slate-800 font-extrabold mt-0.5 capitalize">{expiryTime} hours</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sign-up Fee</span>
                    <p className="text-slate-800 font-extrabold mt-0.5">
                      {entryFee ? `$${entryFee}` : 'Free'}
                    </p>
                  </div>
                )}
              </div>

              {visibility === 'public' && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Registration Fields</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {registrationType === 'none' && (
                      <span className="text-[10px] text-slate-400 italic">No registration required</span>
                    )}
                    {registrationType === 'simple' && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">Default Simple Fields</span>
                    )}
                    {registrationType === 'custom' && (
                      Object.entries(regFields)
                        .filter((entry) => entry[1])
                        .map(([fieldKey]) => {
                          const name = fieldKey
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (str) => str.toUpperCase());
                          return (
                            <span 
                              key={fieldKey}
                              className="text-[10px] font-bold text-indigo-750 bg-indigo-50/50 border border-indigo-100/30 px-2.5 py-0.5 rounded-lg"
                            >
                              {name}
                            </span>
                          );
                        })
                    )}
                  </div>
                  {customQuestion && (
                    <div className="mt-3 bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Custom Question:</span>
                      <p className="text-slate-800 font-semibold">{customQuestion}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPreview(false)}
              className="mt-4 w-full py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer text-center"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* MODAL: SUCCESS ANIMATION SCREEN */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 bg-[#fffafb] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="absolute top-10 left-10 w-96 h-96 bg-purple-200/40 rounded-full glowing-blob pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/40 rounded-full glowing-blob pointer-events-none" />

          <div className="max-w-md w-full relative z-10 flex flex-col items-center">
            
            {/* Lottie-like CSS pulsing check circle */}
            <div className="w-24 h-24 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/10 mb-8 relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0.3 }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 bg-purple-400 rounded-full"
              />
              <CheckCircle2 size={46} className="text-white relative z-10" />
            </div>

            <h2 className="font-display font-extrabold text-2xl text-slate-850 tracking-tight">
              Test Setup Completed!
            </h2>
            <p className="text-xs text-slate-400 mt-2.5 max-w-sm leading-relaxed font-semibold">
              The test shell **"{title}"** has been configured and published successfully on the Testoriax lobby!
            </p>

            <div className="bg-slate-50/60 border border-slate-100 rounded-3xl p-5 mt-8 mb-6 w-full max-w-xs flex justify-around text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Duration</span>
                <span className="font-display font-extrabold text-base text-slate-700 mt-1">{duration} mins</span>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Marks</span>
                <span className="font-display font-extrabold text-base text-slate-700 mt-1">{totalMarks} pts</span>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Negative</span>
                <span className="font-display font-extrabold text-base text-slate-700 mt-1">
                  {negativeMarking ? `-${negativeValue}` : 'No'}
                </span>
              </div>
            </div>

            {/* Share Test Lobby Box */}
            <div className="bg-white/70 backdrop-blur-md border border-slate-150/50 p-4.5 rounded-3xl shadow-md w-full max-w-xs flex flex-col gap-3 text-left mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="text-[9px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                <Globe size={11} className="text-purple-650" />
                <span>Public Test Lobby Link</span>
              </span>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/lobby/join/${testId || 'pub-39c8a9f2'}`}
                  className="flex-1 py-2 px-3 border border-slate-200 rounded-xl outline-none font-mono text-[10px] bg-slate-50 text-slate-550 min-w-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    const text = `${window.location.origin}/lobby/join/${testId || 'pub-39c8a9f2'}`;
                    navigator.clipboard.writeText(text).catch(() => {});
                    setCopied(true);
                    triggerToast('Public test link copied!');
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`px-3 py-2 rounded-xl text-[9px] font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
                    copied 
                      ? 'bg-emerald-500 text-white shadow-md' 
                      : 'bg-slate-900 hover:bg-slate-850 text-white'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `${window.location.origin}/lobby/join/${testId || 'pub-39c8a9f2'}`;
                    if (navigator.share) {
                      navigator.share({
                        title: title,
                        text: `Join my test lobby: ${title}`,
                        url: text
                      }).catch(() => {});
                    } else {
                      triggerToast('Link copied to clipboard!');
                      navigator.clipboard.writeText(text).catch(() => {});
                    }
                  }}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-755 text-white rounded-xl text-[9px] font-bold cursor-pointer whitespace-nowrap"
                >
                  Share
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => {
                  localStorage.setItem('testoriax_builder_test_id', testId || '');
                  onNavigate('builder', title);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-purple-500/10 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit3 size={14} />
                <span>Go to Manual Question Canvas</span>
              </button>

              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full py-3.5 border border-slate-200 hover:border-slate-300 text-slate-655 rounded-2xl text-xs font-bold bg-white transition-all active:scale-[0.98] cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION CONTAINER */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4.5 py-3.5 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Sparkles size={14} className="text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

export default TestCreatorWizard;
