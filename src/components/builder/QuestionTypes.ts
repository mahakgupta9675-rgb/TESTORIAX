export type QuestionType = 'mcq' | 'matching' | 'true-false' | 'coding' | 'fillups' | 'custom' | 'image';

export interface MCQData {
  options: string[];
  correctOptionIndex: number;
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingData {
  pairs: MatchingPair[];
}

export interface TrueFalseData {
  correctAnswer: boolean;
}

export interface CodingTestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean; // if true, never sent to student browser
}

export interface CodingData {
  language: string;           // primary / default language
  languages?: string[];       // allowed languages list
  starterCode: string;        // starter code for default language
  starterCodes?: Record<string, string>; // per-language starter code
  solutionCode: string;       // reference solution (never sent to student)
  testCases: CodingTestCase[];         // public sample test cases
  hiddenTestCases?: CodingTestCase[];  // hidden test cases (server-side only)
  // Problem metadata
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  timeLimit?: number;   // seconds, default 5
  memoryLimit?: number; // MB, default 256
}

export interface FillupsData {
  // Sentence containing items in square brackets, e.g. "React is a [JavaScript] library developed by [Meta]."
  sentence: string;
  answers: string[]; // Autocompiled from brackets
}

export interface CustomData {
  guidelines: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  mcqData?: MCQData;
  matchingData?: MatchingData;
  trueFalseData?: TrueFalseData;
  codingData?: CodingData;
  fillupsData?: FillupsData;
  customData?: CustomData;
  imageUrl?: string;
  explanation?: string;
}

export interface TestData {
  title: string;
  description: string;
  questions: Question[];
}
