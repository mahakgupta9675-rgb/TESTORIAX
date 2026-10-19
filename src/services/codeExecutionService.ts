/**
 * codeExecutionService.ts
 * 
 * Client-side service that calls the Express server's Judge0 endpoints.
 * The Judge0 API key is NEVER stored here — it lives only in server.cjs/.env.
 * 
 * Security guarantees:
 * - Source code is sent to OUR Express server, not directly to Judge0
 * - Hidden test cases are never returned to the browser
 * - Server validates Supabase auth before executing any code
 */

const SERVER_URL = import.meta.env.DEV
  ? 'http://localhost:5000'
  : (import.meta.env.VITE_API_URL || '');

export interface CodeRunResult {
  status: string;
  statusId?: number;
  stdout: string;
  stderr: string;
  compile_output: string;
  time?: string | number;
  memory?: number;
  error?: string;
}

export interface TestCaseResult {
  index: number;
  passed: boolean;
  status: string;
  input?: string;
  expected_output?: string;
  actual_output?: string;
  time?: string | number;
  memory?: number;
  compile_output?: string;
  hidden?: boolean;
  error?: string;
}

export interface CodeEvaluateResult {
  passed: number;
  failed: number;
  total: number;
  marks_awarded: number;
  score_percentage: number;
  results: TestCaseResult[];
  message?: string;
  error?: string;
}

export interface SupportedLanguage {
  id: string;
  judge0_id: number;
  name: string;
}

const getAuthHeader = (): Record<string, string> => {
  // Get Supabase session token from localStorage
  try {
    const sessionKey = Object.keys(localStorage).find(k => k.includes('auth-token') || k.includes('supabase.auth'));
    if (sessionKey) {
      const session = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      const token = session?.access_token || session?.session?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    }
    // Fallback: search for any supabase session
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = JSON.parse(localStorage.getItem(key) || '{}');
        const token = val?.access_token;
        if (token) return { Authorization: `Bearer ${token}` };
      }
    }
  } catch {
    // Ignore parse errors
  }
  return {};
};

export const codeExecutionService = {
  /**
   * Run code against a custom stdin (for "Run Code" button).
   * Does NOT execute against hidden test cases.
   * Rate limited server-side (15 runs/min/user).
   */
  async runCode(
    language: string,
    sourceCode: string,
    stdin: string = '',
    attemptId?: string
  ): Promise<CodeRunResult> {
    try {
      const res = await fetch(`${SERVER_URL}/api/code/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          language,
          source_code: sourceCode,
          stdin,
          attempt_id: attemptId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          status: 'Error',
          stdout: '',
          stderr: data.error || 'Request failed',
          compile_output: '',
          error: data.error,
        };
      }

      return data;
    } catch (err: any) {
      return {
        status: 'Network Error',
        stdout: '',
        stderr: 'Could not reach the code execution server. Is the backend running?',
        compile_output: '',
        error: err.message,
      };
    }
  },

  /**
   * Evaluate student code against all test cases (public + hidden) server-side.
   * Called at exam submission for coding questions.
   * Hidden test case inputs/outputs are NEVER returned to the browser.
   */
  async evaluateCode(
    questionId: string,
    attemptId: string,
    language: string,
    sourceCode: string
  ): Promise<CodeEvaluateResult> {
    try {
      const res = await fetch(`${SERVER_URL}/api/code/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          question_id: questionId,
          attempt_id: attemptId,
          language,
          source_code: sourceCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          passed: 0, failed: 0, total: 0,
          marks_awarded: 0,
          score_percentage: 0,
          results: [],
          error: data.error || 'Evaluation failed',
        };
      }

      return data;
    } catch (err: any) {
      return {
        passed: 0, failed: 0, total: 0,
        marks_awarded: 0,
        score_percentage: 0,
        results: [],
        error: 'Could not reach the code execution server. Is the backend running?',
      };
    }
  },

  /**
   * Fetch supported languages from the server.
   */
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    try {
      const res = await fetch(`${SERVER_URL}/api/code/languages`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.languages || [];
    } catch {
      return [];
    }
  },
};

/**
 * Supported languages list (for UI dropdowns, no server call needed)
 */
export const SUPPORTED_LANGUAGES: Array<{ id: string; name: string; monacoId: string }> = [
  { id: 'c',          name: 'C (GCC)',             monacoId: 'c' },
  { id: 'cpp',        name: 'C++ (GCC)',            monacoId: 'cpp' },
  { id: 'java',       name: 'Java (OpenJDK)',       monacoId: 'java' },
  { id: 'javascript', name: 'JavaScript (Node.js)', monacoId: 'javascript' },
  { id: 'python',     name: 'Python 3',             monacoId: 'python' },
  { id: 'typescript', name: 'TypeScript',           monacoId: 'typescript' },
  { id: 'go',         name: 'Go',                   monacoId: 'go' },
  { id: 'rust',       name: 'Rust',                 monacoId: 'rust' },
  { id: 'csharp',     name: 'C# (Mono)',            monacoId: 'csharp' },
  { id: 'kotlin',     name: 'Kotlin',               monacoId: 'kotlin' },
  { id: 'php',        name: 'PHP',                  monacoId: 'php' },
];

/**
 * Map Judge0 status ID to a human-readable emoji + label
 */
export function formatExecutionStatus(statusId?: number, status?: string): { label: string; color: string; icon: string } {
  switch (statusId) {
    case 1: return { label: 'In Queue',            color: 'text-slate-400',  icon: '⏳' };
    case 2: return { label: 'Processing',          color: 'text-amber-400',  icon: '⚙️' };
    case 3: return { label: 'Accepted',            color: 'text-emerald-400', icon: '✅' };
    case 4: return { label: 'Wrong Answer',        color: 'text-rose-400',   icon: '❌' };
    case 5: return { label: 'Time Limit Exceeded', color: 'text-amber-500',  icon: '⏰' };
    case 6: return { label: 'Compilation Error',   color: 'text-rose-500',   icon: '🔴' };
    case 7: case 8: case 9: case 10: case 11: case 12:
      return { label: 'Runtime Error',             color: 'text-rose-500',   icon: '💥' };
    case 13: return { label: 'Internal Error',     color: 'text-slate-500',  icon: '⚠️' };
    case 14: return { label: 'Exec Format Error',  color: 'text-slate-500',  icon: '⚠️' };
    default:
      if (status?.toLowerCase().includes('compile')) return { label: 'Compilation Error', color: 'text-rose-500', icon: '🔴' };
      if (status?.toLowerCase().includes('time'))    return { label: 'Time Limit Exceeded', color: 'text-amber-500', icon: '⏰' };
      if (status?.toLowerCase().includes('memory'))  return { label: 'Memory Limit Exceeded', color: 'text-amber-500', icon: '💾' };
      return { label: status || 'Unknown', color: 'text-slate-400', icon: '❓' };
  }
}
