import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, AlertTriangle, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertCircle, 
  ShieldAlert, ShieldCheck, 
  Camera, Wifi, Layers, Maximize, Check, Bookmark,
  Cpu, User, Laptop
} from 'lucide-react';
import { testsService } from '../../services/testsService';
import { codeExecutionService } from '../../services/codeExecutionService';
import { calculateClientScore } from '../../services/resultsService';
import { useAuth } from '../../context/AuthContext';
import { isPlaceholderConfig, supabase } from '../../lib/supabaseClient';
import { CodingWorkspace } from './CodingWorkspace';
import * as faceapi from '@vladmandic/face-api';

// Questions Interfaces
interface Question {
  id: string;
  type: 'mcq' | 'mcq-single' | 'mcq-multi' | 'coding' | 'true-false' | 'matching' | 'fillups' | 'custom' | 'image';
  question: string;
  codeSnippet?: string;
  imageSvg?: React.ReactNode;
  imageUrl?: string;
  options?: string[];
  points: number;
  starterCode?: Record<string, string>; // language -> code
  testCases?: { input: string; expected: string }[];
  correctAnswer?: any;
}

interface TestConfig {
  title: string;
  duration: number; // in minutes
  questions: Question[];
  result_release_mode?: string;
  result_visibility?: string;
  results_released?: boolean;
  expiry_time?: string;
  answer_review_mode?: boolean;
  security_settings?: {
    require_webcam?: boolean;
    require_mic?: boolean;
    require_fullscreen?: boolean;
    disable_copy_paste?: boolean;
    disable_right_click?: boolean;
    disable_shortcuts?: boolean;
    detect_devtools?: boolean;
    tab_switch_detection?: boolean;
    auto_submit_on_violations?: boolean;
    max_violations?: number;
    face_presence_detection?: boolean;
    multiple_face_detection?: boolean;
    face_missing_detection?: boolean;
    record_violation_screenshots?: boolean;
    periodic_snapshot_capture?: boolean;
  };
}

// ----------------------------------------------------
// Mock Question Database
// ----------------------------------------------------
const MOCK_TESTS_QUESTIONS: Record<string, TestConfig> = {
  'java-mock-test': {
    title: 'Java Programming Mock Test',
    duration: 60,
    questions: [
      {
        id: 'java-q1',
        type: 'mcq-single',
        question: 'Which of the following is true about abstract classes and interfaces in Java 8 and beyond?',
        options: [
          'Abstract classes can define instance state variables while Interfaces cannot.',
          'Interfaces support multiple inheritance properties whereas Abstract classes do not.',
          'Both can define default method execution nodes but only Abstract classes support constructors.',
          'All of the above statements are correct.'
        ],
        points: 5
      },
      {
        id: 'java-q2',
        type: 'mcq-multi',
        question: 'Which of the following classes implement the java.util.List interface? (Select all that apply)',
        options: [
          'ArrayList',
          'HashMap',
          'LinkedList',
          'Vector'
        ],
        points: 5
      },
      {
        id: 'java-q3',
        type: 'mcq-single',
        question: 'Identify what data structure operation is represented in the diagram below to balance a Node in an AVL Tree.',
        imageSvg: (
          <svg viewBox="0 0 400 160" className="w-full max-w-md h-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mx-auto my-3">
            {/* AVL Left-Right Rotation Diagram */}
            {/* Before state */}
            <g transform="translate(40, 0)">
              <text x="50" y="20" className="text-[10px] fill-slate-400 font-bold" textAnchor="middle">Initial AVL State</text>
              {/* Nodes */}
              <circle cx="50" cy="45" r="14" className="stroke-purple-500 fill-slate-950" strokeWidth="2" />
              <text x="50" y="49" className="text-xs fill-white font-bold" textAnchor="middle">30</text>
              
              <line x1="42" y1="57" x2="28" y2="78" className="stroke-slate-700" strokeWidth="2" />
              <circle cx="20" cy="90" r="14" className="stroke-purple-400 fill-slate-950" strokeWidth="2" />
              <text x="20" y="94" className="text-xs fill-white font-bold" textAnchor="middle">10</text>
              
              <line x1="26" y1="101" x2="34" y2="122" className="stroke-slate-700" strokeWidth="2" />
              <circle cx="40" cy="132" r="14" className="stroke-lilac-400 fill-slate-950" strokeWidth="2" />
              <text x="40" y="136" className="text-xs fill-white font-bold" textAnchor="middle">20</text>
              
              {/* Unbalanced Marker */}
              <path d="M 68 45 C 80 45, 80 90, 42 125" className="stroke-rose-500 fill-none stroke-dasharray-[3,3]" strokeWidth="1.5" markerEnd="url(#arrow)" />
              <text x="88" y="75" className="text-[8px] fill-rose-450 font-bold" textAnchor="middle">Imbalance</text>
            </g>
            
            {/* Arrow */}
            <g transform="translate(170, 75)">
              <path d="M 0 0 L 40 0" className="stroke-slate-500" strokeWidth="3" markerEnd="url(#triangle)" />
              <text x="20" y="-8" className="text-[8px] fill-slate-400 font-bold" textAnchor="middle">Rotate</text>
            </g>
            
            {/* After state */}
            <g transform="translate(240, 0)">
              <text x="50" y="20" className="text-[10px] fill-emerald-400 font-bold" textAnchor="middle">Balanced AVL State</text>
              <circle cx="50" cy="45" r="14" className="stroke-emerald-500 fill-slate-950" strokeWidth="2" />
              <text x="50" y="49" className="text-xs fill-white font-bold" textAnchor="middle">20</text>
              
              <line x1="42" y1="57" x2="28" y2="78" className="stroke-slate-700" strokeWidth="2" />
              <circle cx="20" cy="90" r="14" className="stroke-emerald-400 fill-slate-950" strokeWidth="2" />
              <text x="20" y="94" className="text-xs fill-white font-bold" textAnchor="middle">10</text>
              
              <line x1="58" y1="57" x2="72" y2="78" className="stroke-slate-700" strokeWidth="2" />
              <circle cx="80" cy="90" r="14" className="stroke-emerald-400 fill-slate-950" strokeWidth="2" />
              <text x="80" y="94" className="text-xs fill-white font-bold" textAnchor="middle">30</text>
            </g>
            
            <defs>
              <marker id="triangle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-slate-500" />
              </marker>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-rose-500" />
              </marker>
            </defs>
          </svg>
        ),
        options: [
          'Left-Left (LL) Single Rotation',
          'Left-Right (LR) Double Rotation',
          'Right-Right (RR) Single Rotation',
          'Right-Left (RL) Double Rotation'
        ],
        points: 5
      },
      {
        id: 'java-q4',
        type: 'coding',
        question: 'Write a Java method isPalindrome to check if a given string is a palindrome. The comparison should be case-insensitive, ignoring non-alphanumeric characters.',
        points: 15,
        starterCode: {
          java: `public class Solution {\n    public boolean isPalindrome(String s) {\n        // Write your solution here\n        if (s == null) return false;\n        String clean = s.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();\n        int left = 0, right = clean.length() - 1;\n        while (left < right) {\n            if (clean.charAt(left) != clean.charAt(right)) return false;\n            left++;\n            right--;\n        }\n        return true;\n    }\n}`,
          python: `class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        # Write your Python solution here\n        clean = "".join(c.lower() for c in s if c.isalnum())\n        return clean == clean[::-1]`,
          javascript: `function isPalindrome(s) {\n    // Write your JavaScript solution here\n    const clean = s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();\n    return clean === clean.split("").reverse().join("");\n}`,
          cpp: `#include <string>\n#include <algorithm>\n\nclass Solution {\npublic:\n    bool isPalindrome(std::string s) {\n        // Write your C++ solution here\n        std::string clean = "";\n        for (char c : s) {\n            if (std::isalnum(c)) {\n                clean += std::tolower(c);\n            }\n        }\n        std::string rev = clean;\n        std::reverse(rev.begin(), rev.end());\n        return clean == rev;\n    }\n};`
        },
        testCases: [
          { input: '"A man, a plan, a canal: Panama"', expected: 'true' },
          { input: '"race a car"', expected: 'false' },
          { input: '" "', expected: 'true' }
        ]
      },
      {
        id: 'java-q5',
        type: 'mcq-single',
        question: 'Which Garbage Collector is selected by default in Java 17 for server-class machines?',
        options: [
          'Serial Garbage Collector (Serial GC)',
          'Parallel Garbage Collector (Parallel GC)',
          'Garbage-First Garbage Collector (G1 GC)',
          'Z Garbage Collector (ZGC)'
        ],
        points: 5
      },
      {
        id: 'java-q6',
        type: 'mcq-single',
        question: 'What is the output of the following Java expression?\nSystem.out.println(10 + 20 + "Java" + 10 + 20);',
        codeSnippet: 'System.out.println(10 + 20 + "Java" + 10 + 20);',
        options: [
          '30Java30',
          '30Java1020',
          '1020Java1020',
          'Compiler Error'
        ],
        points: 5
      }
    ]
  },
  'test-1': {
    title: 'Python Advanced OOP Design Patterns',
    duration: 45,
    questions: [
      {
        id: 'py-q1',
        type: 'mcq-single',
        question: 'What is the primary purpose of the __slots__ attribute in Python classes?',
        options: [
          'To declare private variable scopes.',
          'To restrict the dynamic creation of attributes and optimize memory usage.',
          'To support multiple inheritance protocols.',
          'To define class-level methods.'
        ],
        points: 5
      },
      {
        id: 'py-q2',
        type: 'mcq-multi',
        question: 'Which of the following are Creational design patterns? (Select all that apply)',
        options: [
          'Singleton Pattern',
          'Adapter Pattern',
          'Factory Method Pattern',
          'Prototype Pattern'
        ],
        points: 5
      },
      {
        id: 'py-q3',
        type: 'coding',
        question: 'Implement the Singleton pattern in Python using a metaclass. Ensure thread safety or direct instance retrieval caching.',
        points: 15,
        starterCode: {
          python: `class Singleton(type):\n    _instances = {}\n    def __call__(cls, *args, **kwargs):\n        # Write metaclass call implementation here\n        if cls not in cls._instances:\n            cls._instances[cls] = super().__call__(*args, **kwargs)\n        return cls._instances[cls]\n\n# Usage:\n# class DatabaseConnection(metaclass=Singleton):\n#     pass`,
          javascript: `// Simulated Metaclass / Singleton in JavaScript\nclass Singleton {\n    static instance;\n    constructor() {\n        if (Singleton.instance) {\n            return Singleton.instance;\n        }\n        Singleton.instance = this;\n    }\n}`,
          java: `public class Singleton {\n    private static volatile Singleton instance;\n    private Singleton() {}\n    public static Singleton getInstance() {\n        if (instance == null) {\n            synchronized (Singleton.class) {\n                if (instance == null) instance = new Singleton();\n            }\n        }\n        return instance;\n    }\n}`,
          cpp: `class Singleton {\nprivate:\n    static Singleton* instance;\n    Singleton() {}\npublic:\n    static Singleton* getInstance() {\n        if (!instance) {\n            instance = new Singleton();\n        }\n        return instance;\n    }\n};`
        },
        testCases: [
          { input: 's1 = DatabaseConnection(); s2 = DatabaseConnection()', expected: 's1 is s2 => True' }
        ]
      },
      {
        id: 'py-q4',
        type: 'mcq-single',
        question: 'How does Python resolve method lookup in multiple inheritance scenarios?',
        options: [
          'Using Depth-First Search (DFS) order from left to right.',
          'Using Breadth-First Search (BFS) order from right to left.',
          'Using Method Resolution Order (MRO) calculated via the C3 Linearization algorithm.',
          'Using reverse post-order tree traversal.'
        ],
        points: 5
      }
    ]
  },
  'test-4': {
    title: 'Calculus IV: Double Integrals & Vectors',
    duration: 60,
    questions: [
      {
        id: 'math-q1',
        type: 'mcq-single',
        question: 'Which of the following theorems relates a line integral around a simple closed curve C to a double integral over the plane region R bounded by C?',
        options: [
          'Stokes\' Theorem',
          'Divergence Theorem',
          'Green\'s Theorem',
          'Fubini\'s Theorem'
        ],
        points: 10
      },
      {
        id: 'math-q2',
        type: 'mcq-single',
        question: 'Evaluate the double integral shown in the mathematical formula below over the region R bounded by y = x^2 and y = x.',
        imageSvg: (
          <svg viewBox="0 0 320 100" className="w-full max-w-xs h-auto bg-slate-900/60 border border-slate-800 rounded-xl p-3 mx-auto my-3">
            {/* SVG Math formula representation */}
            <g transform="translate(10, 0)" className="fill-white font-serif">
              {/* Integration symbol 1 */}
              <text x="30" y="60" className="text-4xl">∫</text>
              <text x="24" y="80" className="text-[9px] font-sans fill-slate-400">0</text>
              <text x="32" y="25" className="text-[9px] font-sans fill-slate-400">1</text>
              
              {/* Integration symbol 2 */}
              <text x="50" y="60" className="text-4xl">∫</text>
              <text x="42" y="80" className="text-[9px] font-sans fill-slate-400">x²</text>
              <text x="53" y="25" className="text-[9px] font-sans fill-slate-400">x</text>
              
              {/* Formula */}
              <text x="75" y="52" className="text-sm font-sans tracking-wide">(x² + y) dy dx</text>
              
              {/* Region description */}
              <text x="200" y="40" className="text-[10px] font-sans fill-purple-300">R: region bounded</text>
              <text x="200" y="55" className="text-[10px] font-sans fill-purple-300">by y = x² and y = x</text>
            </g>
          </svg>
        ),
        options: [
          '3 / 35',
          '1 / 12',
          '7 / 24',
          '11 / 60'
        ],
        points: 15
      },
      {
        id: 'math-q3',
        type: 'coding',
        question: 'Write a Python script using sympy to compute the gradient of the scalar field f(x, y, z) = x^2*y + y^2*z + z^2*x. The function should return a list of symbols representing partial derivatives.',
        points: 20,
        starterCode: {
          python: `import sympy as sp\n\ndef compute_gradient():\n    x, y, z = sp.symbols('x y z')\n    f = x**2*y + y**2*z + z**2*x\n    \n    # Calculate partial derivatives\n    grad_x = sp.diff(f, x)\n    grad_y = sp.diff(f, y)\n    grad_z = sp.diff(f, z)\n    \n    return [grad_x, grad_y, grad_z]`,
          javascript: `// JavaScript representation of Symbolic derivative\nfunction computeGradient() {\n    // Return gradient equations as strings\n    return ["2*x*y + z^2", "x^2 + 2*y*z", "y^2 + 2*z*x"];\n}`,
          java: `import java.util.List;\n\npublic class Solution {\n    public List<String> computeGradient() {\n        // Return gradient formulas\n        return List.of("2*x*y + z^2", "x^2 + 2*y*z", "y^2 + 2*z*x");\n    }\n}`,
          cpp: `#include <vector>\n#include <string>\n\nclass Solution {\npublic:\n    std::vector<std::string> computeGradient() {\n        return {"2*x*y + z^2", "x^2 + 2*y*z", "y^2 + 2*z*x"};\n    }\n};`
        },
        testCases: [
          { input: 'compute_gradient()', expected: '[2*x*y + z**2, x**2 + 2*y*z, y**2 + 2*z*x]' }
        ]
      }
    ]
  }
};



// ----------------------------------------------------
// Props
// ----------------------------------------------------
interface ExaminationViewProps {
  onNavigate: (view: any, param?: string) => void;
  testId: string | null;
}

export const ExaminationView: React.FC<ExaminationViewProps> = ({ onNavigate, testId }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Load configuration
  const configKey = testId && MOCK_TESTS_QUESTIONS[testId] ? testId : 'java-mock-test';
  const [testConfig, setTestConfig] = useState<TestConfig>(() => MOCK_TESTS_QUESTIONS[configKey]);
  const questions = testConfig.questions;

  // ----------------------------------------------------
  // States
  // ----------------------------------------------------
  const [loadingProgress, setLoadingProgress] = useState<boolean>(true);
   const [attemptId, setAttemptId] = useState<string | null>(null);
  const [competitionId, setCompetitionId] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const compId = searchParams.get('competitionId');
    if (compId) {
      setCompetitionId(compId);
    }
  }, []);
  
  const [calibrationStep, setCalibrationStep] = useState<number>(0); // 0: Cam, 1: Secure Check, 2: Start/Fullscreen, 3: Active
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState<number>(0);
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [isExamTerminated, setIsExamTerminated] = useState<boolean>(false);
  // Idempotent submission guard: prevents double-submit on rapid clicks or race conditions
  const isSubmittingRef = useRef<boolean>(false);

  // AI Proctoring States
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [aiModelsLoaded, setAiModelsLoaded] = useState(false);
  const [aiSecurityScore, setAiSecurityScore] = useState(100);
  const [liveFaceStatus, setLiveFaceStatus] = useState<'calibrating' | 'tracking' | 'missing' | 'multiple'>('calibrating');
  const aiSessionIdRef = useRef<string | null>(null);
  const proctoringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFaceMissingTime = useRef<number | null>(null);
  const lastMultipleFaceTime = useRef<number | null>(null);

  // Load AI Models
  useEffect(() => {
    if (testConfig.security_settings?.face_presence_detection || testConfig.security_settings?.multiple_face_detection) {
      const loadModels = async () => {
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
          setAiModelsLoaded(true);
          console.log('[PROCTORING] AI models loaded');
        } catch (e) {
          console.error('[PROCTORING] Failed to load models:', e);
        }
      };
      loadModels();
    } else {
      setAiModelsLoaded(true); // Treat as loaded if not required
    }
  }, [testConfig.security_settings]);

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>('');
  
  const tabLeaveTime = useRef<number | null>(null);
  const fullscreenExitTimeout = useRef<any>(null);
  
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  // Track visited questions to differentiate not-answered vs unvisited
  const [visitedSet, setVisitedSet] = useState<Set<string>>(() => new Set(questions && questions.length > 0 ? [questions[0].id] : []));
  const [markedSet, setMarkedSet] = useState<Set<string>>(new Set());
  
  // Time States
  const [timeLeft, setTimeLeft] = useState<number>(testConfig.duration * 60);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [timeWarning, setTimeWarning] = useState<string | null>(null);

  // Redirect guest users to discovery
  useEffect(() => {
    if (!user) {
      onNavigate('discovery');
    }
  }, [user]);

  // Load test questions and progress from Supabase / Resume Check
  useEffect(() => {
    if (!user || !testId) return;

    const initializeExam = async () => {
      setLoadingProgress(true);
      try {
        let dbTestTitle = 'Test Session';
        let dbDuration = 60;
        let dbQuestions: Question[] = [];
        let testData: any = null;

        // Check if it's a mock test
        if (MOCK_TESTS_QUESTIONS[testId]) {
          const mockConf = MOCK_TESTS_QUESTIONS[testId];
          dbTestTitle = mockConf.title;
          dbDuration = mockConf.duration;
          dbQuestions = mockConf.questions;
        } else {
          // Fetch from Supabase
          const { data: fetchedTestData, error: testErr } = await testsService.getTestById(testId);
          if (testErr) throw testErr;
          testData = fetchedTestData;
          
          if (testData) {
            dbTestTitle = testData.title;
            dbDuration = testData.duration || 60;
            
            // Fetch questions from questions table
            const { data: qData, error: qErr } = await testsService.getQuestionsByTestId(testId);
            if (qErr) throw qErr;

            if (qData && qData.length > 0) {
              dbQuestions = qData.map((q: any) => {
                const eq: Question = {
                  id: q.id,
                  type: q.type as any,
                  question: q.text || 'Question',
                  points: q.points || 5,
                  imageUrl: q.imageUrl,
                  options: []
                };

                if ((q.type === 'mcq' || q.type === 'mcq-single') && q.mcqData) {
                  eq.options = q.mcqData.options || [];
                  eq.correctAnswer = q.mcqData;
                } else if (q.type === 'true-false') {
                  eq.options = ['True', 'False'];
                  eq.correctAnswer = q.trueFalseData;
                } else if (q.type === 'coding' && q.codingData) {
                  const lang = q.codingData.language || 'python';
                  eq.starterCode = {
                    [lang]: q.codingData.starterCode || ''
                  };
                  eq.testCases = (q.codingData.testCases || []).map((tc: any) => ({
                    input: tc.input || '',
                    expected: tc.expectedOutput || tc.expected || ''
                  }));
                  eq.correctAnswer = q.codingData;
                } else if (q.type === 'matching' && q.matchingData) {
                  eq.question = `${q.text}\n\nPairs to match:\n` + q.matchingData.pairs.map((p: any) => `- ${p.left} -> ?`).join('\n');
                  eq.options = q.matchingData.pairs.map((p: any) => p.right);
                  eq.correctAnswer = q.matchingData;
                } else if (q.type === 'fillups' && q.fillupsData) {
                  eq.options = [];
                  eq.correctAnswer = q.fillupsData;
                } else {
                  eq.options = ['Option A', 'Option B', 'Option C', 'Option D'];
                }

                return eq;
              });
            } else if (testData.questions && Array.isArray(testData.questions)) {
              // Fallback to test.questions if questions table doesn't have it
              dbQuestions = testData.questions.map((q: any) => {
                const eq: Question = {
                  id: q.id || Math.random().toString(),
                  type: (q.type === 'coding' ? 'coding' : 'mcq-single') as any,
                  question: q.text || 'Question',
                  points: q.points || 5,
                  options: []
                };
                if (q.type === 'mcq' && q.mcqData) {
                  eq.options = q.mcqData.options || [];
                  eq.correctAnswer = q.mcqData;
                } else if (q.type === 'true-false') {
                  eq.options = ['True', 'False'];
                } else {
                  eq.options = ['Option A', 'Option B', 'Option C', 'Option D'];
                }
                return eq;
              });
            }
          }
        }

        if (dbQuestions.length === 0) {
          dbQuestions = [
            {
              id: 'empty-q',
              type: 'mcq-single',
              question: 'No questions are available in this test lobby.',
              options: ['OK'],
              points: 0
            }
          ];
        }

        const initialConfig = {
          title: dbTestTitle,
          duration: dbDuration,
          questions: dbQuestions,
          result_release_mode: testData?.result_release_mode || 'immediately',
          result_visibility: testData?.result_visibility || 'private',
          results_released: testData?.results_released || false,
          expiry_time: testData?.expiry_time || 'never',
          answer_review_mode: testData?.answer_review_mode ?? true,
          security_settings: testData?.security_settings || {}
        };

        setTestConfig(initialConfig);

        // Check if there is an unsubmitted active attempt in Supabase or localStorage
        let attempt: any = null;
        if (MOCK_TESTS_QUESTIONS[testId] || isPlaceholderConfig) {
          const stored = localStorage.getItem('testoriax_comp_attempts');
          if (stored) {
            const attemptsList = JSON.parse(stored);
            attempt = attemptsList.find((a: any) => a.test_id === testId && a.user_id === user.id && a.status === 'in_progress');
          }
        } else {
          const { data, error: attemptErr } = await testsService.getAttemptProgress(testId, user.id);
          if (attemptErr && attemptErr.code !== 'PGRST116') throw attemptErr;
          attempt = data;
        }

        if (attempt) {
          if (attempt.status === 'submitted' || attempt.status === 'expired') {
            setIsSubmitted(true);
            setLoadingProgress(false);
            return;
          }

          // Resume Attempt
          setAttemptId(attempt.id);
          setTabSwitchCount(attempt.tab_switch_count || 0);
          setFullscreenExitCount(attempt.fullscreen_exit_count || 0);
          setWarningsCount(attempt.warning_count || 0);
          
          if (attempt.started_at) {
            const elapsedSeconds = Math.floor((new Date().getTime() - new Date(attempt.started_at).getTime()) / 1000);
            const calculatedRemaining = Math.max(0, (dbDuration * 60) - elapsedSeconds);
            setTimeLeft(calculatedRemaining);
            if (calculatedRemaining <= 0) {
              // Authoritative timer expired while student was away/offline
              setTimeout(() => {
                executeSubmission("expired");
              }, 100);
            }
          } else if (attempt.remaining_time !== null && attempt.remaining_time !== undefined) {
            setTimeLeft(attempt.remaining_time);
          } else {
            setTimeLeft(dbDuration * 60);
          }

          if (attempt.current_question_index !== null && attempt.current_question_index !== undefined) {
            setCurrentIdx(attempt.current_question_index);
          }

          // Fetch answers for this attempt (Mock fallback)
          if (attempt.id.startsWith('mock-att-')) {
            const storedAns = localStorage.getItem('testoriax_comp_answers');
            const answersList = storedAns ? JSON.parse(storedAns) : [];
            const answersData = answersList.filter((a: any) => a.attempt_id === attempt.id);
            if (answersData) {
              const restoredAnswers: Record<string, string | string[]> = {};
              answersData.forEach((ans: any) => {
                if (ans.answer_data?.value) restoredAnswers[ans.question_id] = ans.answer_data.value;
              });
              setAnswers(restoredAnswers);
            }
          } else {
            // Restore from JSONB
            const restoredAnswers = attempt.answers || {};
            setAnswers(restoredAnswers);
            if (attempt.question_progress) {
               setVisitedSet(new Set(attempt.question_progress.visited || Object.keys(restoredAnswers)));
               setMarkedSet(new Set(attempt.question_progress.marked || []));
            } else {
               const restoredVisited = new Set<string>(Object.keys(restoredAnswers));
               if (dbQuestions.length > 0) {
                 restoredVisited.add(dbQuestions[attempt.current_question_index || 0].id);
               }
               setVisitedSet(restoredVisited);
            }
          }

          // Set calibration step straight to active test
          setCalibrationStep(3);
          logSecurityEvent(`Resumed active exam session. Attempt ID: ${attempt.id}`);
        } else {
          // New Attempt
          setTimeLeft(dbDuration * 60);
          setCurrentIdx(0);
          if (dbQuestions.length > 0) {
            setVisitedSet(new Set([dbQuestions[0].id]));
          }
          setAnswers({});
          setTabSwitchCount(0);
          setFullscreenExitCount(0);
          setWarningsCount(0);
        }

      } catch (err) {
        console.error('Error loading examination details:', err);
      } finally {
        setLoadingProgress(false);
      }
    };

    initializeExam();
  }, [testId, user]);

  // Create new attempt when calibration is complete and active exam begins
  useEffect(() => {
    if (calibrationStep === 3 && !attemptId && user && testConfig && testId) {
      const initAttempt = async () => {
        try {
          const totalMarks = testConfig.questions.reduce((sum, q) => sum + (q.points || 0), 0);
          
          if (MOCK_TESTS_QUESTIONS[testId] || isPlaceholderConfig) {
            const mockAttId = 'mock-att-' + Math.random().toString(36).substring(2, 11);
            setAttemptId(mockAttId);
            
            // Save mock attempt to localStorage
            const mockAttempt = {
              id: mockAttId,
              test_id: testId,
              user_id: user.id,
              competition_id: competitionId,
              status: 'in_progress',
              total_marks: totalMarks,
              started_at: new Date().toISOString(),
              score: 0,
              tab_switch_count: 0,
              fullscreen_exit_count: 0,
              warning_count: 0
            };
            const stored = localStorage.getItem('testoriax_comp_attempts');
            const attemptsList = stored ? JSON.parse(stored) : [];
            attemptsList.push(mockAttempt);
            localStorage.setItem('testoriax_comp_attempts', JSON.stringify(attemptsList));
            
            logSecurityEvent(`Mock attempt initialized. Attempt ID: ${mockAttId}`);
          } else {
            const { data, error } = await testsService.createExamAttempt(testId, user.id, competitionId);
            if (error) throw error;
            if (data) {
              setAttemptId(data.id);
              logSecurityEvent(`New exam attempt created in Supabase. Attempt ID: ${data.id}`);
            }
          }
        } catch (err) {
          console.error('Error creating exam attempt:', err);
        }
      };
      initAttempt();
    }
  }, [calibrationStep, attemptId, user, testConfig, testId, competitionId]);

  // Periodically save progress to database (every 15 seconds)
  useEffect(() => {
    if (calibrationStep === 3 && attemptId && !isSubmitted && !isExamTerminated) {
      const interval = setInterval(async () => {
        try {
          const progressObj = {
            visited: Array.from(visitedSet),
            marked: Array.from(markedSet)
          };
          if (attemptId.startsWith('mock-att-')) {
            // Sync mock progress to localStorage
            const stored = localStorage.getItem('testoriax_comp_attempts');
            if (stored) {
              const attemptsList = JSON.parse(stored);
              const idx = attemptsList.findIndex((a: any) => a.id === attemptId);
              if (idx !== -1) {
                attemptsList[idx].remaining_time = timeLeft;
                attemptsList[idx].current_question_index = currentIdx;
                attemptsList[idx].answers = answers;
                attemptsList[idx].question_progress = progressObj;
                localStorage.setItem('testoriax_comp_attempts', JSON.stringify(attemptsList));
              }
            }
          } else {
            if (navigator.onLine) {
              await testsService.updateExamAttemptProgress(attemptId, timeLeft, currentIdx, warningsCount, answers, progressObj);
            }
          }
        } catch (err) {
          console.error('Failed to sync progress:', err);
        }
      }, 15000); // 15 seconds
      
      const handleOnline = async () => {
        if (attemptId && !attemptId.startsWith('mock-att-')) {
          try {
            const progressObj = {
              visited: Array.from(visitedSet),
              marked: Array.from(markedSet)
            };
            await testsService.updateExamAttemptProgress(attemptId, timeLeft, currentIdx, warningsCount, answers, progressObj);
            console.log('Synced offline progress.');
          } catch (err) {}
        }
      };
      
      window.addEventListener('online', handleOnline);
      return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
      };
    }
  }, [calibrationStep, attemptId, timeLeft, currentIdx, isSubmitted, isExamTerminated, warningsCount]);

  // Proctor Mocking Canvas animation state
  const [facePoints, setFacePoints] = useState<{ x: number; y: number }[]>([]);
  const [meshAnim, setMeshAnim] = useState<number>(0);
  
  // Ref for fullscreen container
  const terminalRef = useRef<HTMLDivElement>(null);

  const activeQuestion = questions[currentIdx];

  // Set up proctor coordinates animation
  useEffect(() => {
    if (calibrationStep === 3) {
      const timer = setInterval(() => {
        const points = [];
        const baseOffset = Math.sin(Date.now() / 1000) * 10;
        
        // Generate simulated facial boundary points
        points.push({ x: 40 + baseOffset * 0.2, y: 30 + Math.cos(Date.now() / 400) * 3 }); // Top head
        points.push({ x: 25, y: 55 + baseOffset * 0.4 }); // Left eye
        points.push({ x: 75, y: 55 + baseOffset * 0.4 }); // Right eye
        points.push({ x: 50 + baseOffset * 0.1, y: 65 }); // Nose
        points.push({ x: 50 + baseOffset * 0.3, y: 82 + Math.sin(Date.now() / 200) * 2 }); // Mouth
        points.push({ x: 50, y: 95 }); // Chin
        
        setFacePoints(points);
        setMeshAnim(prev => (prev + 1) % 100);
      }, 150);
      return () => clearInterval(timer);
    }
  }, [calibrationStep]);

  // Calibration Bootup Loader Timer
  useEffect(() => {
    if (calibrationStep === 0) {
      const t = setTimeout(() => setCalibrationStep(1), 1800);
      return () => clearTimeout(t);
    }
    if (calibrationStep === 1) {
      const t = setTimeout(() => setCalibrationStep(2), 1800);
      return () => clearTimeout(t);
    }
  }, [calibrationStep]);

  // Main Countdown Timer
  useEffect(() => {
    if (calibrationStep === 3 && timeLeft > 0 && !isSubmitted && !isExamTerminated) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            executeSubmission("completed"); // Timer reaches zero: Automatically submit attempt. status: completed
            return 0;
          }
          if (prev === 301) { // 5 minutes (300) next tick
             setTimeWarning("Only 5 minutes remaining!");
             setTimeout(() => setTimeWarning(null), 10000);
          } else if (prev === 61) { // 1 minute (60) next tick
             setTimeWarning("Final 60 seconds! Your answers will be automatically submitted.");
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [calibrationStep, timeLeft, isSubmitted, isExamTerminated]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!testConfig.security_settings?.require_fullscreen) return;
      
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (calibrationStep === 3 && !isFull && !isSubmitted && !isExamTerminated) {
        // Start 5-second grace period
        fullscreenExitTimeout.current = setTimeout(() => {
          logSecurityEvent("Fullscreen mode deactivated (Grace period expired)");
          triggerSecurityWarning("fullscreen_exit", "Fullscreen mode exited. You must remain in fullscreen.");
        }, 5000);
      } else if (isFull && fullscreenExitTimeout.current) {
        clearTimeout(fullscreenExitTimeout.current);
        fullscreenExitTimeout.current = null;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (fullscreenExitTimeout.current) clearTimeout(fullscreenExitTimeout.current);
    };
  }, [calibrationStep, isSubmitted, isExamTerminated, tabSwitchCount, fullscreenExitCount, warningsCount, attemptId, testConfig.security_settings]);

  // Tab switch listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!testConfig.security_settings?.tab_switch_detection) return;
      
      if (document.visibilityState === 'hidden' && calibrationStep === 3 && !isSubmitted && !isExamTerminated) {
        tabLeaveTime.current = Date.now();
      } else if (document.visibilityState === 'visible' && calibrationStep === 3 && tabLeaveTime.current) {
        const duration = Date.now() - tabLeaveTime.current;
        tabLeaveTime.current = null;
        logSecurityEvent(`Browser tab switched / minimized (Away for ${duration}ms)`);
        triggerSecurityWarning("tab_switch", "You switched tabs or minimized the browser.", duration);
      }
    };

    const handleWindowBlur = () => {
      if (!testConfig.security_settings?.tab_switch_detection) return;
      if (calibrationStep === 3 && !isSubmitted && !isExamTerminated && !tabLeaveTime.current) {
        tabLeaveTime.current = Date.now();
      }
    };
    
    const handleWindowFocus = () => {
      if (!testConfig.security_settings?.tab_switch_detection) return;
      if (calibrationStep === 3 && !isSubmitted && !isExamTerminated && tabLeaveTime.current) {
        const duration = Date.now() - tabLeaveTime.current;
        tabLeaveTime.current = null;
        logSecurityEvent(`Terminal focus lost (Away for ${duration}ms)`);
        triggerSecurityWarning("tab_switch", "You left the exam window.", duration);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [calibrationStep, isSubmitted, isExamTerminated, tabSwitchCount, fullscreenExitCount, warningsCount, attemptId, testConfig.security_settings]);

  // Prevent right-click context menu and copy/selection keys inside active test
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (calibrationStep === 3 && testConfig.security_settings?.disable_right_click) {
        e.preventDefault();
        logSecurityEvent("Attempted mouse right-click");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (calibrationStep === 3) {
        if (testConfig.security_settings?.disable_shortcuts) {
          if ((e.ctrlKey && ['c', 'v', 'x', 'u', 'a', 'p', 's'].includes(e.key.toLowerCase()))) {
            e.preventDefault();
            logSecurityEvent(`Blocked key command: Ctrl+${e.key.toUpperCase()}`);
            triggerSecurityWarning("copy_paste", "Copy/Paste and other shortcuts are disabled.");
          }
        }
        if (testConfig.security_settings?.detect_devtools) {
          if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'c'].includes(e.key.toLowerCase()))) {
            e.preventDefault();
            logSecurityEvent(`Attempted Developer Tools Access`);
            triggerSecurityWarning("devtools", "Developer Tools are not allowed.");
          }
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [calibrationStep, testConfig.security_settings]);

  // ----------------------------------------------------
  // Helper Functions
  // ----------------------------------------------------

  const captureAndUploadSnapshot = async (eventType: string) => {
    if (!videoRef.current || !canvasRef.current || !aiSessionIdRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const fileName = `${attemptId}_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage.from('exam_snapshots').upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });
      
      if (!error && data) {
        // Record event in DB
        await supabase.from('proctoring_events').insert({
          session_id: aiSessionIdRef.current,
          event_type: eventType,
          severity: eventType === 'periodic' ? 'low' : 'high',
          metadata: { snapshot_path: data.path }
        });
      }
    }, 'image/jpeg', 0.5);
  };

  const triggerAiViolation = async (type: string, message: string) => {
    setAiSecurityScore(prev => Math.max(0, prev - 15));
    logSecurityEvent(`AI Violation: ${type} - ${message}`);
    triggerSecurityWarning(type, message);
    
    if (testConfig.security_settings?.record_violation_screenshots) {
      captureAndUploadSnapshot(type);
    } else if (aiSessionIdRef.current) {
      await supabase.from('proctoring_events').insert({
        session_id: aiSessionIdRef.current,
        event_type: type,
        severity: 'high'
      });
    }
  };

  const startAiProctoring = async () => {
    if (!testConfig.security_settings?.require_webcam) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: testConfig.security_settings?.require_mic });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Create session in DB
      if (attemptId && user && testId && !attemptId.startsWith('mock-att-')) {
        const { data } = await supabase.from('proctoring_sessions').insert({
          attempt_id: attemptId,
          user_id: user.id,
          test_id: testId,
          camera_enabled: true,
          microphone_enabled: !!testConfig.security_settings?.require_mic,
          status: 'active'
        }).select().single();
        if (data) aiSessionIdRef.current = data.id;
      }

      setLiveFaceStatus('tracking');

      // Start detection loop
      if (testConfig.security_settings?.face_presence_detection || testConfig.security_settings?.multiple_face_detection) {
        proctoringIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
          if (!aiModelsLoaded) return;
          try {
            const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
            
            if (detections.length === 0) {
              setLiveFaceStatus('missing');
              if (!lastFaceMissingTime.current) lastFaceMissingTime.current = Date.now();
              else if (Date.now() - lastFaceMissingTime.current > 3000 && testConfig.security_settings?.face_missing_detection) {
                 triggerAiViolation('face_missing', 'No face detected in the camera frame.');
                 lastFaceMissingTime.current = Date.now(); 
              }
            } else if (detections.length > 1) {
              setLiveFaceStatus('multiple');
              lastFaceMissingTime.current = null;
              if (!lastMultipleFaceTime.current) lastMultipleFaceTime.current = Date.now();
              else if (Date.now() - lastMultipleFaceTime.current > 2000 && testConfig.security_settings?.multiple_face_detection) {
                 triggerAiViolation('multiple_faces', 'Multiple faces detected in the camera frame.');
                 lastMultipleFaceTime.current = Date.now();
              }
            } else {
              setLiveFaceStatus('tracking');
              lastFaceMissingTime.current = null;
              lastMultipleFaceTime.current = null;
            }
          } catch (err) {
            console.error('Face detection error:', err);
          }
        }, 1000);
      }

      // Snapshot capture
      if (testConfig.security_settings?.periodic_snapshot_capture) {
        snapshotIntervalRef.current = setInterval(() => {
          captureAndUploadSnapshot('periodic');
        }, 60000); // Every 60s
      }

    } catch (e) {
      console.error('Failed to start webcam for AI Proctoring', e);
      triggerSecurityWarning('camera_disconnected', 'Webcam connection lost or denied.');
    }
  };

  const stopAiProctoring = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (proctoringIntervalRef.current) clearInterval(proctoringIntervalRef.current);
    if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
    
    // Update session status
    if (aiSessionIdRef.current) {
      await supabase.from('proctoring_sessions').update({ 
        status: 'completed', 
        ended_at: new Date().toISOString(),
        security_score: aiSecurityScore
      }).eq('id', aiSessionIdRef.current);
    }
  };

  // Trigger AI proctoring on start
  useEffect(() => {
    if (calibrationStep === 3 && !isSubmitted && !isExamTerminated) {
      startAiProctoring();
    } else if (isSubmitted || isExamTerminated) {
      stopAiProctoring();
    }
    return () => {
      // Cleanup on unmount or state change
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (proctoringIntervalRef.current) clearInterval(proctoringIntervalRef.current);
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
    };
  }, [calibrationStep, isSubmitted, isExamTerminated, aiModelsLoaded]);

  const logSecurityEvent = (msg: string, eventType?: string, meta?: any) => {
    const time = new Date().toLocaleTimeString();
    console.warn(`[SECURE SHELL] [${time}] ${msg}`);
    if (eventType && attemptId && !attemptId.startsWith('mock-att-')) {
      testsService.logProctoringEvent(attemptId, eventType, meta).catch(err => {
        console.error('Failed to save proctoring event:', err);
      });
    }
  };

  const triggerSecurityWarning = async (type: string, message: string, durationMs?: number) => {
    let nextTabCount = tabSwitchCount;
    let nextFsCount = fullscreenExitCount;
    const nextWarnCount = warningsCount + 1;

    setWarningMessage(message);

    if (type === 'tab_switch') {
      nextTabCount += 1;
      setTabSwitchCount(nextTabCount);
    } else if (type === 'fullscreen_exit') {
      nextFsCount += 1;
      setFullscreenExitCount(nextFsCount);
    }

    setWarningsCount(nextWarnCount);

    if (attemptId && user && testId) {
      try {
        await testsService.updateAttemptSecurity(attemptId, {
          tab_switch_count: nextTabCount,
          fullscreen_exit_count: nextFsCount,
          warning_count: nextWarnCount
        });

        // Log specific violation
        if (!attemptId.startsWith('mock-att-')) {
          await testsService.logSecurityViolation({
            attempt_id: attemptId,
            user_id: user.id,
            test_id: testId,
            violation_type: type,
            severity: type === 'devtools' ? 'critical' : 'high',
            question_number: currentIdx + 1,
            duration: durationMs,
            browser: navigator.userAgent
          });
        }
      } catch (err) {
        console.error('Error logging security violation:', err);
      }
    }

    // Unified warning engine — single place that decides auto-submit
    const maxAllowed = testConfig.security_settings?.max_violations ?? 3;
    const shouldAutoSubmit = testConfig.security_settings?.auto_submit_on_violations !== false;

    if (nextWarnCount >= maxAllowed && shouldAutoSubmit) {
      setWarningMessage("Maximum security warnings exceeded. Your exam will now be terminated and submitted automatically.");
      setIsExamTerminated(true);
      setShowWarningModal(true);
      setTimeout(() => {
        handleForceSubmit("Maximum security warnings exceeded");
      }, 3000);
    } else {
      setShowWarningModal(true);
    }
  };

  const requestFullscreen = async () => {
    try {
      if (terminalRef.current) {
        await terminalRef.current.requestFullscreen();
        setIsFullscreen(true);
        setCalibrationStep(3);
        logSecurityEvent("Secure terminal locked & full-screen authorized");
      }
    } catch (err) {
      console.error("Failed to enter fullscreen", err);
      // Fallback: Proceed even if fullscreen fails in development
      setCalibrationStep(3);
      logSecurityEvent("Secure terminal initialized (Fullscreen failed)");
    }
  };

  const handleForceSubmit = (reason: string) => {
    setIsExamTerminated(true);
    setIsSubmitted(true);
    setShowWarningModal(false);
    setShowSubmitModal(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }
    logSecurityEvent(`Test ended. Terminated due to: ${reason}`);
    executeSubmission("expired"); // Forced submit status = expired
  };

  const getAttemptResults = async () => {
    try {
      // Use the unified evaluation engine from resultsService
      // Negative marking config comes from testConfig which was loaded from DB
      const negativeMarkingConfig = (testConfig as any)?.negative_marking as { enabled: boolean; value: number } | undefined;
      return calculateClientScore(
        questions.map(q => ({
          id: q.id,
          type: q.type,
          points: q.points,
          correctAnswer: q.correctAnswer,
          options: q.options,
        })),
        answers,
        negativeMarkingConfig
      );
    } catch (err) {
      console.error('Error calculating final score:', err);
      return 0;
    }
  };

  const executeSubmission = async (finalStatus: 'completed' | 'expired' | 'terminated') => {
    // Idempotent guard: prevent double submission
    if (isSubmittingRef.current || isSubmitted) return;
    isSubmittingRef.current = true;

    if (!attemptId) {
      // No attempt ID initialized — just mark UI as submitted
      setIsSubmitted(true);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }
      isSubmittingRef.current = false;
      return;
    }

    // Force one last sync of progress before submitting
    const progressObj = {
      visited: Array.from(visitedSet),
      marked: Array.from(markedSet)
    };

    try {
      if (attemptId.startsWith('mock-att-')) {
        // Client-side score calculation for mock/demo tests
        const finalScore = await getAttemptResults();
        const stored = localStorage.getItem('testoriax_comp_attempts');
        if (stored) {
          const attemptsList = JSON.parse(stored);
          const idx = attemptsList.findIndex((a: any) => a.id === attemptId);
          if (idx !== -1) {
            attemptsList[idx].status = finalStatus === 'terminated' ? 'submitted' : finalStatus;
            attemptsList[idx].score = finalScore;
            attemptsList[idx].answers = answers;
            attemptsList[idx].question_progress = progressObj;
            attemptsList[idx].submitted_at = new Date().toISOString();
            localStorage.setItem('testoriax_comp_attempts', JSON.stringify(attemptsList));
          }
        }
        setIsSubmitted(true);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.log(err));
        }
        logSecurityEvent(`Mock exam submitted. Status: ${finalStatus}`);
      } else {
        // Sync current progress first
        await testsService.updateExamAttemptProgress(attemptId, timeLeft, currentIdx, warningsCount, answers, progressObj);
        
        // Evaluate coding questions via Judge0 (server-side, hidden test cases)
        // This must complete before the scoring RPC, as it writes marks_awarded to answers table
        await evaluateCodingQuestions(attemptId);

        // Use server-side authoritative scoring via PostgreSQL RPC function
        const dbStatus = finalStatus === 'terminated' ? 'submitted' : finalStatus === 'completed' ? 'submitted' : finalStatus as 'submitted' | 'expired' | 'terminated';
        const { data: serverResult, error: serverErr } = await testsService.serverSideSubmitAttempt(attemptId, dbStatus);
        
        if (serverErr) {
          // Fallback to client-side scoring if RPC fails (e.g., function not yet deployed)
          console.warn('Server-side scoring failed, using client fallback:', serverErr);
          const finalScore = await getAttemptResults();
          await testsService.submitExamAttempt(attemptId, finalStatus, finalScore);
          logSecurityEvent(`Exam submitted (client fallback). Status: ${finalStatus}, Score: ${finalScore}`);
        } else {
          logSecurityEvent(`Exam submitted (server-side scored). Status: ${finalStatus}, Result: ${JSON.stringify(serverResult)}`);
        }
        
        setIsSubmitted(true);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.log(err));
        }
      }
    } catch (err) {
      console.error('Error submitting attempt:', err);
      isSubmittingRef.current = false;
    }
  };

  /**
   * Evaluate all coding questions server-side via Judge0.
   * Called before final submission to ensure coding marks are calculated.
   */
  const evaluateCodingQuestions = async (attemptId: string) => {
    const codingQs = questions.filter(q => q.type === 'coding');
    if (codingQs.length === 0) return;

    logSecurityEvent(`Evaluating ${codingQs.length} coding question(s) against hidden test cases...`);

    for (const q of codingQs) {
      const savedAnswer = answers[q.id];
      let language = 'python';
      let sourceCode = '';

      // Extract language + code from saved answer
      if (savedAnswer && typeof savedAnswer === 'object' && (savedAnswer as any).source_code) {
        language = (savedAnswer as any).language || 'python';
        sourceCode = (savedAnswer as any).source_code || '';
      } else if (typeof savedAnswer === 'string') {
        sourceCode = savedAnswer;
      }

      if (!sourceCode.trim()) {
        logSecurityEvent(`Coding Q ${q.id}: No code submitted, skipping evaluation.`);
        continue;
      }

      try {
        await codeExecutionService.evaluateCode(q.id, attemptId, language, sourceCode);
        logSecurityEvent(`Coding Q ${q.id}: Evaluation complete.`);
      } catch (err) {
        console.warn(`Coding evaluation failed for ${q.id}:`, err);
      }
    }
  };

  const [pendingAnswers, setPendingAnswers] = useState<Record<string, any>>({});
  
  const saveResponse = async (qId: string, value: any) => {
    if (attemptId && attemptId.startsWith('mock-att-')) return;
    
    // Optimistically queue it
    setPendingAnswers(prev => ({ ...prev, [qId]: value }));

    if (navigator.onLine && attemptId) {
      try {
        await testsService.submitAttemptAnswer(attemptId, qId, value);
        // Clear from pending if successful
        setPendingAnswers(prev => {
          const next = { ...prev };
          delete next[qId];
          return next;
        });
      } catch (err) {
        console.error('Failed to save answer to server, will retry:', err);
      }
    }
  };

  // Setup periodic retry for failed network requests
  useEffect(() => {
    if (!attemptId || attemptId.startsWith('mock-att-')) return;
    const retryTimer = setInterval(async () => {
      if (navigator.onLine && Object.keys(pendingAnswers).length > 0) {
        const pendingEntries = Object.entries(pendingAnswers);
        for (const [qId, value] of pendingEntries) {
          try {
            await testsService.submitAttemptAnswer(attemptId, qId, value);
            setPendingAnswers(prev => {
              const next = { ...prev };
              delete next[qId];
              return next;
            });
          } catch (err) {
            console.error('Retry failed for question', qId, err);
          }
        }
      }
    }, 5000);
    return () => clearInterval(retryTimer);
  }, [attemptId, pendingAnswers]);

  const handleSelectOption = (opt: string) => {
    if (!activeQuestion) return;
    const qId = activeQuestion.id;
    if (activeQuestion.type === 'mcq' || activeQuestion.type === 'mcq-single' || activeQuestion.type === 'true-false' || activeQuestion.type === 'matching') {
      setAnswers(prev => ({ ...prev, [qId]: opt }));
      saveResponse(qId, opt);
    } else if (activeQuestion.type === 'mcq-multi') {
      const currentSelections = (answers[qId] as string[]) || [];
      const isSelected = currentSelections.includes(opt);
      const nextSelections = isSelected 
        ? currentSelections.filter(x => x !== opt)
        : [...currentSelections, opt];
      setAnswers(prev => ({ ...prev, [qId]: nextSelections }));
      saveResponse(qId, nextSelections);
    }
  };

  const handleClearResponse = async () => {
    if (!activeQuestion) return;
    const qId = activeQuestion.id;
    setAnswers(prev => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });

    // Clear response in Supabase
    if (attemptId) {
      try {
        await testsService.saveAnswer(attemptId, qId, null, false, 0);
      } catch (err) {
        console.error('Error clearing response in Supabase:', err);
      }
    }
  };

  const handleMarkForReview = () => {
    if (!activeQuestion) return;
    const qId = activeQuestion.id;
    setMarkedSet(prev => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const handleNavigateQuestion = (idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      // Check answer_review_mode
      if (testConfig?.answer_review_mode === false && idx < currentIdx) {
        // Cannot go back
        return;
      }
      
      // Save current question answer before navigating away
      const currentQId = activeQuestion?.id;
      if (currentQId) {
        const currentAns = answers[currentQId];
        if (currentAns !== undefined) {
          saveResponse(currentQId, currentAns);
        }
      }
      
      // Update progress state in Supabase
      if (attemptId) {
        testsService.updateAttemptProgressState(attemptId, timeLeft, idx);
      }

      setCurrentIdx(idx);
      setVisitedSet(prev => {
        const text = new Set(prev);
        text.add(questions[idx].id);
        return text;
      });
    }
  };

  const handleSubmitExam = () => {
    executeSubmission("completed");
  };

  // ----------------------------------------------------
  // Statistics Calculations
  // ----------------------------------------------------
  const answeredCount = Object.keys(answers).length;
  const markedCount = markedSet.size;
  const unvisitedCount = questions.length - visitedSet.size;
  const notAnsweredCount = questions.length - answeredCount - unvisitedCount;

  // Format seconds to mm:ss
  const formatTimeRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Get question palette circle styling
  const getPaletteColorClass = (qId: string) => {
    const isAns = answers[qId] !== undefined && (Array.isArray(answers[qId]) ? (answers[qId] as string[]).length > 0 : answers[qId] !== '');
    const isMark = markedSet.has(qId);
    const isVis = visitedSet.has(qId);
    const isActive = questions[currentIdx]?.id === qId;

    let base = '';
    if (isActive) {
      base += ' ring-3 ring-lilac-500 ring-offset-2 scale-105';
    }

    if (isMark) {
      return base + ' bg-purple-500 border-purple-600 text-white';
    }
    if (isAns) {
      return base + ' bg-emerald-500 border-emerald-600 text-white';
    }
    if (isVis) {
      return base + ' bg-amber-500 border-amber-600 text-white';
    }
    return base + ' bg-slate-100 border-slate-200 text-slate-500';
  };

  // ----------------------------------------------------
  // RENDER: LOADING AND CALIBRATION SCREENS
  // ----------------------------------------------------
  if (loadingProgress) {
    return (
      <div className="fixed inset-0 bg-[#0f0b12] text-slate-200 z-50 flex items-center justify-center p-6 select-none font-sans">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/20 via-[#0f0b12] to-pink-950/10 pointer-events-none" />
        <div className="max-w-md w-full flex flex-col items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-glow animate-spin">
            <Cpu size={30} />
          </div>
          <h3 className="font-display font-black text-base text-white">Loading Assessment Session</h3>
          <p className="text-[11px] text-slate-400 text-center font-medium leading-relaxed">
            Synchronizing question banks, checking authentication, and restoring previous progress state...
          </p>
        </div>
      </div>
    );
  }

  if (calibrationStep < 3) {
    return (
      <div className="fixed inset-0 bg-[#0f0b12] text-slate-200 z-50 flex items-center justify-center p-6 select-none font-sans">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/20 via-[#0f0b12] to-pink-950/10 pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-md w-full flex flex-col items-center gap-8 relative z-10">
          {/* Logo Title */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-lilac-500 to-indigo-500 flex items-center justify-center text-white font-display font-black text-sm shadow-glow">
              T
            </div>
            <span className="font-display font-black text-xl tracking-tight text-white">TESTORIAX <span className="text-lilac-400 font-medium text-xs border border-lilac-500/30 px-1.5 py-0.5 rounded-md ml-1 bg-lilac-500/10">SECURE SHELL</span></span>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 0: Booting up security services */}
            {calibrationStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center gap-4.5 bg-slate-900/40 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-md w-full"
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center animate-pulse shadow-glow">
                  <Cpu size={30} className="animate-spin duration-3000" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-white">Loading Security Shell</h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-2.5">
                    Initializing encryption handlers, setting sandbox boundaries, and loading verification modules...
                  </p>
                </div>
                {/* Visual loading bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: "100%" }} 
                    transition={{ duration: 1.6 }} 
                    className="h-full bg-gradient-to-r from-lilac-500 to-indigo-500" 
                  />
                </div>
              </motion.div>
            )}

            {/* Step 1: Simulated Webcam Verification */}
            {calibrationStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center gap-4.5 bg-slate-900/40 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-md w-full"
              >
                {/* Simulated Webcam Circle */}
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-lilac-400 bg-slate-950/80 flex items-center justify-center relative overflow-hidden group shadow-glow">
                  <Camera size={26} className="text-lilac-400 animate-pulse" />
                  
                  {/* Cyber Scan line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-lilac-400/70 shadow-[0_0_10px_#ff70a6] animate-[bounce_2s_infinite]" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-white">Calibrating Camera Node</h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-2.5">
                    Setting up face detection parameters, ambient light index, and securing proctor camera feeds...
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-lg mt-1">
                  <Check size={10} strokeWidth={3} />
                  <span>WEBCAM HOOK RESOLVED</span>
                </div>
              </motion.div>
            )}

            {/* Step 2: Fullscreen compliance request */}
            {calibrationStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center gap-5.5 bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-md w-full"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-glow">
                  <Laptop size={28} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-white">Enter Exam Secure Mode</h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-2.5">
                    This test is highly proctored. Entering secure mode will lock your cursor boundaries, disable secondary inputs, and require fullscreen containment.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 w-full mt-1.5">
                  <button
                    onClick={requestFullscreen}
                    className="w-full py-3 bg-gradient-to-r from-lilac-500 to-indigo-500 text-white font-display font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 hover:from-lilac-600 hover:to-indigo-600 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Maximize size={13} />
                    <span>Authorize Secure Fullscreen</span>
                  </button>
                  
                  <button
                    onClick={() => onNavigate('test-details', configKey)}
                    className="py-2.5 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel Assessment
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: ACTIVE EXAMINATION VIEW
  // ----------------------------------------------------
  return (
    <div 
      ref={terminalRef} 
      className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden z-50"
    >
      {/* ----------------------------------------------------
          TOP HEADER BAR
      ------------------------------------------------------ */}
      <header className="h-16 shrink-0 bg-slate-900/80 border-b border-slate-800/80 px-6 flex items-center justify-between z-20 backdrop-blur-sm">
        {/* Left: Test Details */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-lilac-500 to-indigo-500 flex items-center justify-center font-display font-black text-xs text-white">
            T
          </div>
          <div>
            <h1 className="text-xs font-black text-white tracking-wide uppercase">{testConfig.title}</h1>
            <div className="flex items-center gap-2">
              <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">Section 1: General Core</p>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <div className="flex items-center gap-1">
                {warningsCount === 0 ? (
                  <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[9px] text-emerald-500 font-bold uppercase">Secure</span></>
                ) : warningsCount === 1 ? (
                  <><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /><span className="text-[9px] text-amber-500 font-bold uppercase">Warning</span></>
                ) : (
                  <><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /><span className="text-[9px] text-rose-500 font-bold uppercase">Critical</span></>
                )}
                
                {testConfig.security_settings?.require_webcam && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-slate-700 mx-1" />
                    <div className="flex items-center gap-1">
                      <Camera size={10} className={aiSecurityScore > 80 ? 'text-emerald-500' : aiSecurityScore > 50 ? 'text-amber-500' : 'text-rose-500'} />
                      <span className={`text-[9px] font-bold uppercase ${aiSecurityScore > 80 ? 'text-emerald-500' : aiSecurityScore > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                        AI Trust: {aiSecurityScore}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Progress Tracker */}
        <div className="hidden md:flex flex-col items-center gap-1.5 w-64">
          <div className="flex justify-between w-full text-[9px] font-bold text-slate-400 uppercase">
            <span>Progress: {answeredCount} / {questions.length} Answered</span>
            <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500" 
              animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Right: Timer & Settings */}
        <div className="flex items-center gap-4.5">
          <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl transition-all ${
            timeLeft < 300 
              ? 'border-rose-500/50 bg-rose-500/10 text-rose-500 animate-pulse font-extrabold'
              : 'border-slate-800 bg-slate-900 text-slate-200'
          }`}>
            <Clock size={13} className={timeLeft < 300 ? 'text-rose-500' : 'text-lilac-400'} />
            <span className="text-xs font-mono font-bold tracking-wider">{formatTimeRemaining(timeLeft)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4.5 py-1.5 bg-gradient-to-r from-lilac-500 to-indigo-500 text-white font-display font-black text-xs rounded-xl shadow-md hover:from-lilac-600 hover:to-indigo-600 transition-all cursor-pointer"
          >
            Submit Test
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------
          MAIN SCREEN CONTAINER (Split: Sidebar + Canvas)
      ------------------------------------------------------ */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Background blobs for premium glass feel */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-lilac-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

        {/* ----------------------------------------------------
            LEFT SIDEBAR
        ------------------------------------------------------ */}
        <aside className="w-72 shrink-0 bg-slate-900/30 border-r border-slate-900/90 p-5 flex flex-col gap-5 overflow-y-auto z-10 select-none">
          
          {/* Proctor webcam simulation */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5 relative">
            <div className="flex justify-between items-center text-[8px] font-black tracking-widest text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-500">LIVE SURVEILLANCE</span>
              </span>
              <span>CAM-01</span>
            </div>

            {/* Webcam canvas simulator */}
            <div className="w-full h-32 bg-slate-950 border border-slate-850 rounded-xl relative overflow-hidden flex items-center justify-center">
              {/* Scan grid effect */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#15101a_1px,transparent_1px),linear-gradient(to_bottom,#15101a_1px,transparent_1px)] bg-[size:10px_10px] opacity-40" />
              
              {/* Green tracking dot or mesh */}
              <svg className="absolute inset-0 w-full h-full">
                {/* Face outline skeleton overlay */}
                {facePoints.length > 0 && (
                  <>
                    <path
                      d={`M ${facePoints[0].x * 2.2} ${facePoints[0].y * 1.3} 
                          C ${facePoints[1].x * 2.2} ${facePoints[1].y * 1.3}, 
                            ${facePoints[5].x * 2.2} ${facePoints[5].y * 1.3}, 
                            ${facePoints[5].x * 2.2} ${facePoints[5].y * 1.3}
                          C ${facePoints[5].x * 2.2} ${facePoints[5].y * 1.3}, 
                            ${facePoints[2].x * 2.2} ${facePoints[2].y * 1.3}, 
                            ${facePoints[0].x * 2.2} ${facePoints[0].y * 1.3} Z`}
                      className="fill-none stroke-lilac-500/20"
                      strokeWidth="1.5"
                    />
                    
                    {/* Link eyes and nose */}
                    <line x1={facePoints[1].x * 2.2} y1={facePoints[1].y * 1.3} x2={facePoints[3].x * 2.2} y2={facePoints[3].y * 1.3} className="stroke-indigo-500/25" strokeWidth="1" />
                    <line x1={facePoints[2].x * 2.2} y1={facePoints[2].y * 1.3} x2={facePoints[3].x * 2.2} y2={facePoints[3].y * 1.3} className="stroke-indigo-500/25" strokeWidth="1" />
                    <line x1={facePoints[3].x * 2.2} y1={facePoints[3].y * 1.3} x2={facePoints[4].x * 2.2} y2={facePoints[4].y * 1.3} className="stroke-indigo-500/25" strokeWidth="1" />

                    {/* Plot coordinates dots */}
                    {facePoints.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x * 2.2}
                        cy={pt.y * 1.3}
                        r={idx === 3 ? "2" : "1.5"}
                        className={idx === 3 ? "fill-rose-500" : "fill-lilac-400"}
                      />
                    ))}
                  </>
                )}
                {/* Horizontal scan line */}
                <line x1="0" y1={meshAnim * 1.3} x2="300" y2={meshAnim * 1.3} className="stroke-lilac-500/35" strokeWidth="1.5" />
              </svg>

              {/* Status info overlay */}
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-[7px] font-bold text-slate-300">
                PROCTOR KEY: ACTIVE_SECURE_LOCKED
              </div>

              {/* Verified Badge */}
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-[7px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                <Check size={8} strokeWidth={3} />
                <span>VERIFIED</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold border-t border-slate-850 pt-2.5">
              <span className="flex items-center gap-1">
                <User size={10} className="text-slate-500" />
                <span>{profile?.full_name || user?.email || 'Jane Challenger'}</span>
              </span>
              <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>ONLINE</span>
              </span>
            </div>
          </div>

          {/* Legend Counters */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/30 border border-slate-900 p-3.5 rounded-2xl text-[9px] font-bold text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-600 block shrink-0" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 border border-amber-600 block shrink-0" />
              <span>Visited ({visitedSet.size - answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-purple-500 border border-purple-600 block shrink-0" />
              <span>Review ({markedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200 block shrink-0 text-slate-900 text-center text-[7px] leading-tight" />
              <span>Unvisited ({unvisitedCount})</span>
            </div>
          </div>

          {/* Question Grid palette */}
          <div className="flex flex-col gap-2.5 flex-grow">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider pl-1">Question Palette</span>
            
            <div className="grid grid-cols-5 gap-2.5 p-3.5 bg-slate-900/40 border border-slate-900 rounded-2xl max-h-48 overflow-y-auto">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => handleNavigateQuestion(idx)}
                  disabled={testConfig?.answer_review_mode === false && idx < currentIdx}
                  className={`aspect-square rounded-xl border font-mono text-xs font-black flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none ${getPaletteColorClass(q.id)}`}
                >
                  {(idx + 1).toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostics Panel */}
          <div className="bg-slate-900/40 border border-slate-900/70 p-3 rounded-xl flex flex-col gap-1.5 text-[8px] font-bold text-slate-500">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Wifi size={10} className="text-emerald-500" />
                <span>Network Latency</span>
              </span>
              <span className="text-emerald-400">14 ms (Stable)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Cpu size={10} className="text-slate-500" />
                <span>Diagnostics Hook</span>
              </span>
              <span className="text-slate-400">SSL v4.2.1-Prod</span>
            </div>
          </div>

        </aside>

        {/* ----------------------------------------------------
            MAIN QUESTION CANVAS
        ------------------------------------------------------ */}
        <main className="flex-1 flex flex-col min-h-0 bg-slate-950/20 z-10 relative">
          
          {timeWarning && (
            <div className="bg-amber-500/90 backdrop-blur-sm text-white px-5 py-2.5 text-[10px] font-bold flex justify-center items-center z-15 shadow-md animate-pulse">
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                <span>TIME ALERT: {timeWarning}</span>
              </span>
            </div>
          )}

          {/* Top banner warning if they exited fullscreen */}
          {!isFullscreen && (
            <div className="bg-rose-500/90 backdrop-blur-sm text-white px-5 py-2.5 text-[10px] font-bold flex justify-between items-center z-15 shadow-md">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={12} className="animate-bounce" />
                <span>SECURE MODE ALERT: Fullscreen is disabled. Please authorize fullscreen mode to continue evaluation.</span>
              </span>
              <button 
                onClick={requestFullscreen}
                className="px-3 py-1 bg-white text-rose-600 rounded font-black text-[9px] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                Restore Fullscreen
              </button>
            </div>
          )}

          {/* ----------------------------------------------------
              MAIN QUESTION CANVAS & CODING WORKSPACE
          ------------------------------------------------------ */}
          {/* ----------------------------------------------------
              MAIN QUESTION CANVAS & CODING WORKSPACE
          ------------------------------------------------------ */}
          {!activeQuestion ? (
            <div className="flex-1 flex items-center justify-center p-6 text-slate-400 font-medium">
              No active question available.
            </div>
          ) : activeQuestion.type === 'coding' ? (
            <CodingWorkspace
              question={activeQuestion as any}
              questionNumber={currentIdx + 1}
              totalQuestions={questions.length}
              attemptId={attemptId}
              initialCode={
                (answers[activeQuestion.id] as any)?.source_code || 
                (typeof answers[activeQuestion.id] === 'string' ? answers[activeQuestion.id] : '')
              }
              initialLanguage={(answers[activeQuestion.id] as any)?.language || 'python'}
              onSaveAnswer={(qId, payload) => {
                saveResponse(qId, payload);
                setAnswers(prev => ({ ...prev, [qId]: payload }));
              }}
              onNavigateQuestion={handleNavigateQuestion}
              onNextQuestion={() => handleNavigateQuestion(currentIdx + 1)}
              onPrevQuestion={() => handleNavigateQuestion(currentIdx - 1)}
              hasPrev={currentIdx > 0}
              hasNext={currentIdx < questions.length - 1}
            />
          ) : (
            /* Scrollable question and options area for non-coding questions */
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 select-none">
              
              {/* Question Card */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6.5">
                
                {/* Question Header tags */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-lilac-500/10 border border-lilac-500/20 text-[9px] font-black text-lilac-400 uppercase tracking-wide">
                      Question {(currentIdx + 1).toString().padStart(2, '0')}
                    </span>
                    
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      {activeQuestion.type === 'mcq-multi' ? 'Multiple Answers (MCQ)' : 'Single Answer (MCQ)'}
                    </span>
                  </div>

                  <div className="text-[10px] font-bold text-slate-400">
                    Weight: <span className="text-white font-black">{activeQuestion.points} Points</span>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="text-sm font-semibold text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                  {activeQuestion.question}
                </div>

                {/* Code Snippet Box (If present in MCQ) */}
                {activeQuestion.codeSnippet && (
                  <pre className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl font-mono text-[11px] text-purple-250 mt-4 overflow-x-auto">
                    {activeQuestion.codeSnippet}
                  </pre>
                )}

                {/* Dynamic Image / SVG Render */}
                {activeQuestion.imageSvg && (
                  <div className="w-full flex justify-center mt-2">
                    {activeQuestion.imageSvg}
                  </div>
                )}
                {activeQuestion.imageUrl && (
                  <div className="w-full flex justify-center mt-4">
                    <img 
                      src={activeQuestion.imageUrl} 
                      alt="Question visual helper" 
                      className="max-w-md max-h-64 object-contain rounded-2xl border border-slate-800 shadow-md bg-slate-950/40 p-2"
                    />
                  </div>
                )}
              </div>

              {/* Answer Layouts (MCQ options vs Fillups / Essay) */}
              <div className="flex-1 min-h-[300px]">
                
                {/* MCQ OPTION CARDS */}
                {activeQuestion.type !== 'fillups' && activeQuestion.type !== 'custom' && activeQuestion.options && activeQuestion.options.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeQuestion.options.map((opt, oIdx) => {
                      const optionChar = String.fromCharCode(65 + oIdx);
                      
                      // Check selection
                      const qId = activeQuestion.id;
                      const isSelected = activeQuestion.type === 'mcq' || activeQuestion.type === 'mcq-single' || activeQuestion.type === 'true-false' || activeQuestion.type === 'matching'
                        ? answers[qId] === opt
                        : ((answers[qId] as string[]) || []).includes(opt);

                      return (
                        <div
                          key={oIdx}
                          onClick={() => handleSelectOption(opt)}
                          className={`group p-4.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-sm relative overflow-hidden ${
                            isSelected
                              ? 'border-lilac-500/50 bg-lilac-500/10 text-white font-bold ring-2 ring-lilac-500/30'
                              : 'border-slate-900 bg-slate-900/30 hover:border-slate-800 hover:bg-slate-900/50 text-slate-350'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 z-10">
                            {/* Option character badge */}
                            <div className={`w-6.5 h-6.5 rounded-lg border font-mono text-xs font-black flex items-center justify-center transition-all shrink-0 ${
                              isSelected
                                ? 'bg-lilac-500 border-lilac-600 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 group-hover:text-slate-200'
                            }`}>
                              {optionChar}
                            </div>
                            
                            <span className="text-xs font-semibold leading-relaxed">{opt}</span>
                          </div>

                          {/* Selection status check circle */}
                          <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-all z-10 ${
                            isSelected 
                              ? 'bg-emerald-500 border-emerald-600 text-white'
                              : 'border-slate-800 bg-slate-950'
                          }`}>
                            {isSelected && <Check size={10} strokeWidth={4} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TEXT ENTRY AREA (FOR FILLUPS OR CUSTOM QUESTIONS) */}
                {(activeQuestion.type === 'fillups' || activeQuestion.type === 'custom') && (
                  <div className="w-full max-w-2xl mx-auto bg-slate-900/40 border border-slate-900 rounded-3xl p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                      <span>Candidate Response Input</span>
                      <span className="text-lilac-400">Auto-saves on navigation</span>
                    </div>
                    
                    {activeQuestion.type === 'fillups' ? (
                      <input
                        type="text"
                        value={(answers[activeQuestion.id] as string) || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAnswers(prev => ({ ...prev, [activeQuestion.id]: val }));
                        }}
                        onBlur={() => {
                          const val = answers[activeQuestion.id] || '';
                          saveResponse(activeQuestion.id, val);
                        }}
                        className="w-full px-5 py-4 bg-slate-950 border border-slate-850 rounded-2xl text-slate-250 focus:outline-none focus:border-lilac-500 focus:ring-1 focus:ring-lilac-500 font-mono text-sm shadow-inner"
                        placeholder="Type your blank replacement answer here..."
                      />
                    ) : (
                      <textarea
                        value={(answers[activeQuestion.id] as string) || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAnswers(prev => ({ ...prev, [activeQuestion.id]: val }));
                        }}
                        onBlur={() => {
                          const val = answers[activeQuestion.id] || '';
                          saveResponse(activeQuestion.id, val);
                        }}
                        rows={6}
                        className="w-full px-5 py-4 bg-slate-950 border border-slate-850 rounded-2xl text-slate-250 focus:outline-none focus:border-lilac-500 focus:ring-1 focus:ring-lilac-500 font-sans text-sm shadow-inner resize-none"
                        placeholder="Type your response/essay guidelines here..."
                      />
                    )}
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const val = answers[activeQuestion.id] || '';
                          saveResponse(activeQuestion.id, val);
                        }}
                        className="px-4.5 py-2 bg-gradient-to-r from-lilac-500 to-indigo-500 text-white text-xs font-black rounded-xl hover:shadow-purple-500/20 active:scale-97 cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Save Response
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ----------------------------------------------------
              BOTTOM ACTION CONTROLS FOOTER
          ------------------------------------------------------ */}
          <footer className="h-16 shrink-0 bg-slate-900/80 border-t border-slate-800/80 px-6 flex items-center justify-between z-20 backdrop-blur-sm">
            {/* Left buttons: Prev, Mark */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavigateQuestion(currentIdx - 1)}
                disabled={currentIdx === 0 || testConfig?.answer_review_mode === false}
                className="px-4.5 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-2xl flex items-center gap-1 cursor-pointer transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft size={13} />
                <span>Prev Question</span>
              </button>

              <button
                onClick={handleMarkForReview}
                className={`px-4.5 py-2 border text-xs font-bold rounded-2xl flex items-center gap-1.5 cursor-pointer transition-all ${
                  markedSet.has(activeQuestion.id)
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400 font-extrabold shadow-sm'
                    : 'border-slate-850 bg-slate-900/30 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bookmark size={11} className={markedSet.has(activeQuestion.id) ? 'fill-purple-400 text-purple-400' : ''} />
                <span>Mark For Review</span>
              </button>
            </div>

            {/* Right buttons: Clear, Next/Finish */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleClearResponse}
                className="px-4 py-2 border border-transparent hover:bg-rose-500/10 text-slate-450 hover:text-rose-400 text-xs font-bold rounded-2xl transition-all cursor-pointer"
              >
                Clear Response
              </button>

              {currentIdx === questions.length - 1 ? (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-6 py-2 bg-gradient-to-r from-lilac-500 to-indigo-500 text-white font-display font-black text-xs rounded-2xl shadow-lg hover:shadow-purple-500/20 active:scale-97 cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 size={13} />
                  <span>Submit Evaluation</span>
                </button>
              ) : (
                <button
                  onClick={() => handleNavigateQuestion(currentIdx + 1)}
                  className="px-6 py-2 bg-slate-100 hover:bg-white text-slate-950 hover:text-black font-display font-black text-xs rounded-2xl shadow transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Next Question</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          </footer>

        </main>
      </div>

      {/* ----------------------------------------------------
          SECURITY WARNING MODAL (TAB SWITCH DETECTED)
      ------------------------------------------------------ */}
      <AnimatePresence>
        {showWarningModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-5">
                <AlertTriangle size={32} className="text-rose-600" />
              </div>
              <h3 className="font-display font-black text-xl text-slate-800 mb-2">Security Warning</h3>
              <p className="text-sm text-slate-500 font-semibold mb-6">
                {warningMessage}
              </p>
              
              <div className="w-full bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-6">
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase">Warnings Accumulated</span>
                    <span className="text-rose-500 font-black">{warningsCount} / {testConfig.security_settings?.max_violations || 3} Warnings</span>
                  </div>
                  <div className="text-left mt-2 text-[10px] font-bold text-rose-400">
                    *IMPORTANT: Triggering {testConfig.security_settings?.max_violations || 3} security warnings will result in immediate termination and automatic submission of this exam.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                I Understand, Return to Exam
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Proctoring PiP */}
      {calibrationStep === 3 && testConfig.security_settings?.require_webcam && !isSubmitted && !isExamTerminated && (
        <div className="fixed top-24 right-6 z-40 bg-black rounded-2xl overflow-hidden border-2 border-slate-700/50 shadow-2xl w-48 h-36 flex items-center justify-center pointer-events-none">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-90" />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute inset-0 border-2 rounded-2xl pointer-events-none transition-colors duration-300"
               style={{ 
                 borderColor: liveFaceStatus === 'tracking' ? 'rgba(16, 185, 129, 0.4)' : // emerald
                              liveFaceStatus === 'missing' ? 'rgba(244, 63, 94, 0.7)' : // rose
                              liveFaceStatus === 'multiple' ? 'rgba(244, 63, 94, 0.7)' : // rose
                              'rgba(148, 163, 184, 0.2)' 
               }}
          ></div>
          
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1.5 border border-white/10">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              liveFaceStatus === 'tracking' ? 'bg-emerald-500' : 
              liveFaceStatus === 'calibrating' ? 'bg-amber-400' : 'bg-rose-500'
            }`}></div>
            <span className="text-[8px] text-white font-bold tracking-wider uppercase">
              {liveFaceStatus === 'tracking' ? 'PROCTORING' : 
               liveFaceStatus === 'calibrating' ? 'CALIBRATING...' : 
               liveFaceStatus === 'missing' ? 'FACE MISSING!' : 'MULTIPLE FACES!'}
            </span>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SUBMIT TEST REVIEW MODAL
      ------------------------------------------------------ */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-70 flex items-center justify-center p-6 text-slate-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6.5 flex flex-col gap-5.5 shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-xl bg-lilac-500/10 border border-lilac-500/20 text-lilac-400 flex items-center justify-center shrink-0">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm text-white">Review Before Submission</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Review your answers palette distribution carefully.</p>
                </div>
              </div>

              {/* Statistics Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Total Questions</span>
                  <span className="text-base font-black text-white">{questions.length} Qs</span>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Answered</span>
                  <span className="text-base font-black text-emerald-400">{answeredCount} / {questions.length}</span>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Marked for Review</span>
                  <span className="text-base font-black text-purple-400">{markedCount} Qs</span>
                </div>
                <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Not Visited</span>
                  <span className="text-base font-black text-amber-500">{unvisitedCount} Qs</span>
                </div>
              </div>

              {/* Warnings Alert */}
              {unvisitedCount + notAnsweredCount > 0 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-2.5">
                  <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-[10px] font-semibold text-amber-400/90 leading-normal">
                    Warning: You still have <span className="font-extrabold text-white">{unvisitedCount + notAnsweredCount} unanswered</span> questions. Once submitted, you cannot change your responses!
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-1.5">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  Back to Test
                </button>
                <button
                  onClick={handleSubmitExam}
                  className="flex-1 py-3 bg-gradient-to-r from-lilac-500 to-indigo-500 text-white font-display font-black text-xs rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 transition-all text-center cursor-pointer"
                >
                  Submit Final Answers
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          TEST COMPLETED / RESULTS SCREEN
      ------------------------------------------------------ */}
      <AnimatePresence>
        {isSubmitted && (() => {
          const releaseMode = testConfig?.result_release_mode || 'immediately';
          let isReleased = true;
          if (releaseMode === 'after_test_end') {
            isReleased = false;
          } else if (releaseMode === 'manual_release') {
            isReleased = !!testConfig?.results_released;
          }

          return (
            <div className="fixed inset-0 bg-[#0f0b12] text-slate-250 z-80 flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/20 via-[#0f0b12] to-pink-950/10 pointer-events-none" />
              <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center flex flex-col items-center gap-6.5 shadow-2xl relative z-10"
              >
                {isExamTerminated ? (
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-glow">
                    <ShieldAlert size={30} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-glow">
                    <ShieldCheck size={30} className="animate-pulse" />
                  </div>
                )}

                <div>
                  <h2 className="font-display font-black text-xl text-white">
                    {isExamTerminated ? 'Assessment Session Terminated' : 'Assessment Submitted Successfully'}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-2.5 leading-relaxed">
                    {isReleased 
                      ? (isExamTerminated 
                        ? 'This session was terminated due to security violations. Your responses up to the termination point have been uploaded.'
                        : 'Your test has been successfully completed, secured, and submitted. The answers have been logged for validation.')
                      : 'Test submitted successfully. Results will be available later.'
                    }
                  </p>
                </div>

                {/* Review metrics */}
                {isReleased && (
                  <div className="w-full bg-slate-950 border border-slate-850 p-4 rounded-2xl text-[10px] font-bold text-slate-400 text-left flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span>Candidate:</span>
                      <span className="text-white font-extrabold">{profile?.full_name || user?.email || 'Jane Challenger'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assessment:</span>
                      <span className="text-white font-extrabold">{testConfig.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Questions Attempted:</span>
                      <span className="text-emerald-400 font-extrabold">{answeredCount} / {questions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Security Warnings:</span>
                      <span className={warningsCount > 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>{warningsCount} Warning(s)</span>
                    </div>
                    {attemptId && (
                      <div className="flex justify-between">
                        <span>Attempt ID:</span>
                        <span className="text-slate-500 font-mono font-normal text-[9px]">{attemptId}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="w-full flex flex-col gap-2">
                  {isReleased ? (
                    <button
                      onClick={() => {
                        // Navigate to result detail for this specific attempt
                        if (attemptId && !attemptId.startsWith('mock-att-')) {
                          navigate('/dashboard/my-results', { state: { attemptId } });
                        } else {
                          navigate('/dashboard/my-results');
                        }
                      }}
                      className="w-full py-3 bg-gradient-to-r from-lilac-500 to-indigo-500 text-white font-display font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-97 cursor-pointer"
                    >
                      View Detailed Results
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate('discovery')}
                      className="w-full py-3 bg-gradient-to-r from-lilac-500 to-indigo-500 text-white font-display font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-97 cursor-pointer"
                    >
                      Return to Public Lobby
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
};

export default ExaminationView;
