const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// HTTP Security Headers via Helmet (VULN-23-04)
// Express backend is pure API server; frontend Vite app handles rendering and CSP
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: { action: "sameorigin" },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
}));

// =====================================================
// HELPER: VALIDATE SECRETS / KEYS
// =====================================================
function isValidSecret(val) {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('placeholder') || lower.includes('your_') || lower.startsWith('xxxx')) return false;
  return true;
}

// =====================================================
// PRODUCTION ENVIRONMENT & CORS CONFIGURATION
// =====================================================
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';
const allowedOriginsList = rawAllowedOrigins
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, mobile, webhook callbacks, health checks)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    const allowed = isProduction
      ? allowedOriginsList.includes(normalizedOrigin)
      : [...defaultDevOrigins, ...allowedOriginsList].includes(normalizedOrigin);

    if (allowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-razorpay-signature', 'x-razorpay-event-id']
};

app.use(cors(corsOptions));
app.use(express.json({
  limit: '100kb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
})); // Limit request body size & preserve raw buffer for HMAC verification

const PORT = process.env.PORT || 5000;

// =====================================================
// HEALTH & DIAGNOSTIC ENDPOINT
// =====================================================
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// =====================================================
// PROCESS GLOBAL UNHANDLED ERROR CATCHERS & LOG SANITIZER
// =====================================================
function sanitizeLogMessage(msg) {
  if (!msg) return 'Unknown error';
  let str = typeof msg === 'string' ? msg : (msg.stack || msg.message || String(msg));
  const secretEnvValues = [
    process.env.RAZORPAY_KEY_SECRET,
    process.env.RAZORPAY_WEBHOOK_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.GEMINI_API_KEY,
    process.env.JUDGE0_API_KEY
  ].filter(val => val && typeof val === 'string' && val.length > 5);

  secretEnvValues.forEach(secret => {
    str = str.split(secret).join('[REDACTED_SECRET]');
  });

  return str;
}

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Promise Rejection]', sanitizeLogMessage(reason));
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception - Fatal]', sanitizeLogMessage(err));
  if (global.serverInstance && typeof global.serverInstance.close === 'function') {
    global.serverInstance.close(() => {
      process.exit(1);
    });
    setTimeout(() => process.exit(1), 3000).unref();
  } else {
    setTimeout(() => process.exit(1), 1000).unref();
  }
});

// Financial Rate Limiter (Max 10 requests per minute per IP / User)
const financialRateLimitMap = new Map();
function checkFinancialRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const limit = financialRateLimitMap.get(key);
  if (!limit || now - limit.windowStart > windowMs) {
    financialRateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (limit.count >= maxRequests) {
    return false;
  }
  limit.count += 1;
  return true;
}

// Financial Audit Event Logging Helper
async function logFinancialAudit(actorId, action, paymentId = null, refundRequestId = null, details = {}) {
  try {
    await supabase.from('payment_audit_logs').insert({
      actor_id: actorId || null,
      action: action,
      payment_id: paymentId || null,
      refund_request_id: refundRequestId || null,
      details: details,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}

// =====================================================
// SUPABASE SERVICE CLIENT (for server-side hidden test access)
// Uses SUPABASE_SERVICE_ROLE_KEY if available, else anon key
// =====================================================
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// JUDGE0 CONFIGURATION
// =====================================================
const JUDGE0_API_URL = (process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com').replace(/\/$/, '');
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';

// Language ID mapping (Judge0 CE language IDs)
// Verified via: https://api.judge0.com/languages
const LANGUAGE_MAP = {
  'c':          49,  // C (GCC 9.2.0)
  'cpp':        54,  // C++ (GCC 9.2.0)
  'java':       62,  // Java (OpenJDK 13.0.1)
  'javascript': 63,  // JavaScript (Node.js 12.14.0)
  'python':     71,  // Python (3.8.1)
  'typescript': 74,  // TypeScript (3.7.4)
  'go':         60,  // Go (1.13.5)
  'rust':       73,  // Rust (1.40.0)
  'csharp':     51,  // C# (Mono 6.6.0.161)
  'kotlin':     78,  // Kotlin (1.3.70)
  'php':        68,  // PHP (7.4.1)
};

// =====================================================
// CATEGORY-BASED IN-MEMORY RATE LIMITER
// - code_run: max 15 requests per minute
// - code_evaluate: max 10 requests per minute
// - ai_generate: max 5 requests per minute
// =====================================================
const categoryRateLimitMap = new Map(); // key: `${category}:${userId}` -> { count, windowStart }

function checkCategoryRateLimit(category, userId, maxRequests, windowMs = 60 * 1000) {
  const key = `${category}:${userId}`;
  const now = Date.now();
  const limit = categoryRateLimitMap.get(key);

  if (!limit || now - limit.windowStart > windowMs) {
    categoryRateLimitMap.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (limit.count >= maxRequests) {
    const resetInSeconds = Math.ceil((windowMs - (now - limit.windowStart)) / 1000);
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  limit.count += 1;
  categoryRateLimitMap.set(key, limit);
  return { allowed: true, remaining: maxRequests - limit.count };
}

function checkRateLimit(userId) {
  return checkCategoryRateLimit('code_run', userId, 15);
}

// Clean up rate limit map periodically to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of categoryRateLimitMap.entries()) {
    if (now - val.windowStart > 120000) {
      categoryRateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// =====================================================
// OUTPUT NORMALIZATION for test case comparison
// =====================================================
function normalizeOutput(str) {
  if (str == null) return '';
  return str
    .toString()
    .replace(/\r\n/g, '\n')  // Windows line endings → Unix
    .replace(/\r/g, '\n')    // Old Mac line endings → Unix
    .split('\n')
    .map(line => line.trimEnd()) // Remove trailing whitespace per line
    .join('\n')
    .trim(); // Remove leading/trailing blank lines
}

function outputsMatch(expected, actual) {
  return normalizeOutput(expected) === normalizeOutput(actual);
}

// =====================================================
// JUDGE0 HELPERS
// =====================================================
async function submitToJudge0(sourceCode, languageId, stdin, timeLimit = 5, memoryLimit = 256) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Rapidapi-Host': 'judge0-ce.p.rapidapi.com',
    ...(JUDGE0_API_KEY && JUDGE0_API_KEY !== 'your_rapidapi_key_here' ? {
      'X-Rapidapi-Key': JUDGE0_API_KEY
    } : {})
  };

  // Submit submission
  const submitRes = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin: stdin || '',
      cpu_time_limit: Math.min(timeLimit, 10),
      memory_limit: Math.min(memoryLimit * 1024, 262144), // Convert MB to KB, cap at 256MB
      wall_time_limit: Math.min(timeLimit * 2, 20),
    })
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Judge0 API error: ${submitRes.status} — ${errText}`);
  }

  const result = await submitRes.json();
  return result;
}

function parseJudge0Result(result) {
  return {
    token: result.token,
    status: result.status?.description || 'Unknown',
    statusId: result.status?.id,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    compile_output: result.compile_output || '',
    message: result.message || '',
    time: result.time,
    memory: result.memory,
  };
}

// =====================================================
// VALIDATE AUTH: check bearer token is valid Supabase JWT
// Returns userId if valid, null if not
// =====================================================
async function validateAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// =====================================================
// VERIFY ADMIN ROLE: Check if user has admin privileges
// Returns true if profile role is 'admin', false otherwise
// =====================================================
async function verifyAdminRole(userId) {
  if (!userId || typeof userId !== 'string') return false;
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) return false;
    return profile.role === 'admin';
  } catch (err) {
    console.error('[Admin Verification Error]', err);
    return false;
  }
}


// =====================================================
// POST /api/code/run
// Run code for a student's active exam attempt (public test cases only)
// =====================================================
app.post('/api/code/run', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Please log in to run code.' });
    }

    const { language, source_code, stdin, attempt_id } = req.body;

    // Input validation
    if (!language || !source_code) {
      return res.status(400).json({ error: 'Missing required fields: language, source_code' });
    }
    if (typeof source_code !== 'string' || source_code.length > 50000) {
      return res.status(400).json({ error: 'source_code must be a string under 50,000 characters.' });
    }

    const languageId = LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      return res.status(400).json({
        error: `Unsupported language: "${language}". Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`
      });
    }

    // Rate limit by user
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. You can run at most 15 executions per minute. Try again in ${rateCheck.resetInSeconds}s.`,
        resetInSeconds: rateCheck.resetInSeconds
      });
    }
    res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);

    // If attempt_id provided, verify the user owns this attempt, it's in_progress, and time has not expired
    if (attempt_id) {
      const { data: attempt, error: attemptErr } = await supabase
        .from('attempts')
        .select('id, user_id, status, started_at, test_id, tests(duration)')
        .eq('id', attempt_id)
        .single();

      if (attemptErr || !attempt) {
        return res.status(404).json({ error: 'Attempt not found.' });
      }
      if (attempt.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden: You do not own this attempt.' });
      }
      if (attempt.status !== 'in_progress') {
        return res.status(403).json({ error: 'Cannot run code: attempt is no longer in progress.' });
      }

      // Enforce authoritative deadline (started_at + duration + 2 min grace period)
      if (attempt.started_at) {
        const startedAtMs = new Date(attempt.started_at).getTime();
        const durationMinutes = attempt.tests?.duration || 60;
        const deadlineMs = startedAtMs + (durationMinutes * 60 * 1000) + (2 * 60 * 1000);
        if (Date.now() > deadlineMs) {
          return res.status(403).json({ error: 'Exam time has expired.' });
        }
      }
    }

    // Check if Judge0 is configured
    if (!JUDGE0_API_KEY || JUDGE0_API_KEY === 'your_rapidapi_key_here') {
      // Return a helpful error instead of mock data
      return res.status(503).json({
        error: 'Code execution service is not configured. Please set JUDGE0_API_KEY in .env on the server.',
        status: 'Service Unavailable',
        stdout: '',
        stderr: 'Judge0 API key not configured on server.',
        compile_output: ''
      });
    }

    const judge0Result = await submitToJudge0(source_code, languageId, stdin || '', 5, 256);
    const parsed = parseJudge0Result(judge0Result);

    return res.json(parsed);

  } catch (err) {
    console.error('Code run error:', err);
    if (err.message && err.message.includes('Judge0')) {
      return res.status(502).json({ error: 'Code execution service unavailable. Please try again later.', details: err.message });
    }
    return res.status(500).json({ error: 'Internal server error during code execution.' });
  }
});

// =====================================================
// POST /api/code/evaluate
// Evaluate student code against hidden test cases (called at submission)
// Never exposes hidden test case inputs/outputs to client
// =====================================================
app.post('/api/code/evaluate', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Rate Limit Check (VULN-23-03: Max 10 evaluations per minute per authenticated user)
    const rateLimit = checkCategoryRateLimit('code_evaluate', userId, 10);
    if (!rateLimit.allowed) {
      res.setHeader('X-RateLimit-Limit', '10');
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('Retry-After', rateLimit.resetInSeconds);
      return res.status(429).json({
        error: `Rate limit exceeded for code evaluation. You can evaluate code at most 10 times per minute. Try again in ${rateLimit.resetInSeconds} seconds.`,
        resetInSeconds: rateLimit.resetInSeconds
      });
    }

    const { question_id, attempt_id, language, source_code } = req.body;

    if (!question_id || !attempt_id || !language || !source_code) {
      return res.status(400).json({ error: 'Missing required fields: question_id, attempt_id, language, source_code' });
    }
    if (typeof source_code !== 'string' || source_code.length > 50000) {
      return res.status(400).json({ error: 'source_code must be a string under 50,000 characters.' });
    }

    const languageId = LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      return res.status(400).json({ error: `Unsupported language: "${language}"` });
    }

    // Verify attempt ownership, status & deadline
    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .select('id, user_id, status, started_at, test_id, tests(duration)')
      .eq('id', attempt_id)
      .single();

    if (attemptErr || !attempt) return res.status(404).json({ error: 'Attempt not found.' });
    if (attempt.user_id !== userId) return res.status(403).json({ error: 'Forbidden.' });
    if (attempt.status !== 'in_progress' && attempt.status !== 'submitted') {
      return res.status(403).json({ error: 'Cannot evaluate: invalid attempt status.' });
    }

    // Enforce authoritative deadline (started_at + duration + 2 min grace period)
    if (attempt.started_at) {
      const startedAtMs = new Date(attempt.started_at).getTime();
      const durationMinutes = attempt.tests?.duration || 60;
      const deadlineMs = startedAtMs + (durationMinutes * 60 * 1000) + (2 * 60 * 1000);
      if (Date.now() > deadlineMs) {
        return res.status(403).json({ error: 'Exam time has expired.' });
      }
    }

    // Fetch the FULL question including hidden test cases (server-side only)
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('id, question_type, marks, options, correct_answer')
      .eq('id', question_id)
      .eq('test_id', attempt.test_id)
      .single();

    if (qErr || !question) return res.status(404).json({ error: 'Question not found.' });
    if (question.question_type !== 'coding') return res.status(400).json({ error: 'Not a coding question.' });

    // Get ALL test cases: public + hidden
    const publicTestCases = Array.isArray(question.correct_answer?.testCases)
      ? question.correct_answer.testCases
      : [];
    const hiddenTestCases = Array.isArray(question.correct_answer?.hiddenTestCases)
      ? question.correct_answer.hiddenTestCases
      : [];
    const allTestCases = [...publicTestCases, ...hiddenTestCases];

    if (allTestCases.length === 0) {
      // No test cases: mark as attempted, give partial marks
      await saveEvaluationResult(supabase, attempt_id, question_id, true, question.marks, 0, 0, null);
      return res.json({
        passed: 0, failed: 0, total: 0,
        marks_awarded: question.marks,
        score_percentage: 100,
        results: [],
        message: 'No test cases configured. Full marks awarded.'
      });
    }

    if (!JUDGE0_API_KEY || JUDGE0_API_KEY === 'your_rapidapi_key_here') {
      // Give partial credit if code is non-trivial
      const marksAwarded = source_code.trim().length > 20 ? Math.floor(question.marks * 0.5) : 0;
      await saveEvaluationResult(supabase, attempt_id, question_id, marksAwarded === question.marks, marksAwarded, 0, allTestCases.length, null);
      return res.json({
        passed: 0, failed: allTestCases.length, total: allTestCases.length,
        marks_awarded: marksAwarded,
        score_percentage: 0,
        results: allTestCases.map((_, i) => ({ index: i + 1, passed: false, status: 'Service Unavailable', hidden: false })),
        message: 'Code execution service not configured. Partial marks awarded.'
      });
    }

    const timeLimit = question.options?.timeLimit || 5;
    const memoryLimit = question.options?.memoryLimit || 256;

    // Execute against each test case
    const results = [];
    let passedCount = 0;

    for (let i = 0; i < allTestCases.length; i++) {
      const tc = allTestCases[i];
      try {
        const judge0Result = await submitToJudge0(source_code, languageId, tc.input, timeLimit, memoryLimit);
        const parsed = parseJudge0Result(judge0Result);
        const passed = parsed.statusId === 3 && outputsMatch(tc.expectedOutput, parsed.stdout);

        if (passed) passedCount++;

        results.push({
          index: i + 1,
          passed,
          status: parsed.status,
          // Never expose hidden test case input/output to client response
          input: tc.isHidden ? '***hidden***' : tc.input,
          expected_output: tc.isHidden ? '***hidden***' : tc.expectedOutput,
          actual_output: tc.isHidden ? (passed ? '✓ Correct' : '✗ Incorrect') : parsed.stdout,
          time: parsed.time,
          memory: parsed.memory,
          compile_output: parsed.compile_output || parsed.stderr || '',
          hidden: !!tc.isHidden
        });
      } catch (tcErr) {
        results.push({
          index: i + 1,
          passed: false,
          status: 'Execution Error',
          error: 'Failed to execute test case.',
          hidden: !!tc.isHidden
        });
      }

      // Small delay to avoid Judge0 rate limits
      if (i < allTestCases.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const totalTestCases = allTestCases.length;
    const marksAwarded = totalTestCases > 0
      ? Math.round((passedCount / totalTestCases) * question.marks)
      : question.marks;
    const scorePercentage = totalTestCases > 0
      ? Math.round((passedCount / totalTestCases) * 100)
      : 100;

    // Save result to answers table
    await saveEvaluationResult(
      supabase, attempt_id, question_id,
      passedCount === totalTestCases,
      marksAwarded, passedCount, totalTestCases, null
    );

    return res.json({
      passed: passedCount,
      failed: totalTestCases - passedCount,
      total: totalTestCases,
      marks_awarded: marksAwarded,
      score_percentage: scorePercentage,
      results,
    });

  } catch (err) {
    console.error('Code evaluate error:', err);
    return res.status(500).json({ error: 'Internal server error during evaluation.' });
  }
});

// Helper to upsert evaluation result into answers table
async function saveEvaluationResult(supabase, attemptId, questionId, isCorrect, marksAwarded, passedCount, totalCount, executionLog) {
  const answerData = {
    value: '[coding]',
    passed_test_cases: passedCount,
    total_test_cases: totalCount,
    evaluated_at: new Date().toISOString(),
    ...(executionLog ? { execution_log: executionLog } : {})
  };

  const { error } = await supabase
    .from('answers')
    .upsert({
      attempt_id: attemptId,
      question_id: questionId,
      answer_data: answerData,
      is_correct: isCorrect,
      marks_awarded: marksAwarded,
      answered_at: new Date().toISOString()
    }, { onConflict: 'attempt_id,question_id' });

  if (error) {
    console.error('Failed to save evaluation result:', error);
  }
}

// =====================================================
// GET /api/code/languages
// Return supported languages (safe to expose to client)
// =====================================================
app.get('/api/code/languages', (req, res) => {
  const languages = Object.keys(LANGUAGE_MAP).map(lang => ({
    id: lang,
    judge0_id: LANGUAGE_MAP[lang],
    name: {
      c: 'C (GCC)',
      cpp: 'C++ (GCC)',
      java: 'Java (OpenJDK)',
      javascript: 'JavaScript (Node.js)',
      python: 'Python 3',
      typescript: 'TypeScript',
      go: 'Go',
      rust: 'Rust',
      csharp: 'C# (Mono)',
      kotlin: 'Kotlin',
      php: 'PHP',
    }[lang] || lang,
  }));
  res.json({ languages });
});

// =====================================================
// GEMINI: POST /api/ai/generate
// =====================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function buildPrompt(topic, difficulty, totalQuestions, selectedQuestionTypes, patternText) {
  let promptStr = `You are an expert educator and AI test generator.
Generate a test containing exactly ${totalQuestions} questions on the topic "${topic}" with difficulty level "${difficulty}".
Only generate questions of the following types: ${selectedQuestionTypes.join(', ')}.`;

  if (patternText && typeof patternText === 'string' && patternText.trim().length > 0) {
    promptStr += `\nFollow this specific reference context or instructions:\n${patternText.trim().slice(0, 2000)}\n`;
  }

  promptStr += `\nEnsure the output is a valid JSON array of question objects. The output must be pure JSON. Do NOT wrap the JSON output in markdown code blocks.

Each question object in the array must have the following format depending on its type:

1. MCQ (questionType: "mcq"):
{
  "questionType": "mcq",
  "question": "The question text",
  "difficulty": "${difficulty}",
  "marks": 5,
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact string matching the correct option",
  "explanation": "Detailed explanation of why this option is correct",
  "tags": ["tag1", "tag2"]
}

2. Fillups (questionType: "fillup"):
{
  "questionType": "fillup",
  "question": "A sentence containing a blank represented by underscores like ________.",
  "difficulty": "${difficulty}",
  "marks": 5,
  "correctAnswer": "The exact word that fills the blank",
  "explanation": "Explanation of the correct answer",
  "tags": ["tag1", "tag2"]
}

3. True/False (questionType: "true_false"):
{
  "questionType": "true_false",
  "question": "The statement to evaluate",
  "difficulty": "${difficulty}",
  "marks": 5,
  "correctAnswer": "True" or "False",
  "explanation": "Explanation of the answer",
  "tags": ["tag1", "tag2"]
}

4. Coding Question (questionType: "coding"):
{
  "questionType": "coding",
  "difficulty": "${difficulty}",
  "marks": 10,
  "title": "Short title of coding problem",
  "problemStatement": "Describe the coding challenge",
  "inputFormat": "Description of input format",
  "outputFormat": "Description of output format",
  "constraints": "Constraints e.g., N <= 10^5",
  "sampleInput": "Example input",
  "sampleOutput": "Example output",
  "explanation": "Explanation of the logic",
  "languages": ["javascript", "python", "cpp", "java"],
  "starterCode": "starter code snippet (e.g. function solution() {\\n})",
  "testCases": [
    { "input": "...", "expectedOutput": "..." }
  ],
  "hiddenTestCases": [
    { "input": "...", "expectedOutput": "...", "isHidden": true }
  ],
  "tags": ["tag1", "tag2"]
}

5. Match the Following (questionType: "match"):
{
  "questionType": "match",
  "difficulty": "${difficulty}",
  "marks": 5,
  "left": ["Item A", "Item B", "Item C"],
  "right": ["Shuffled Match 2", "Shuffled Match 1", "Shuffled Match 3"],
  "answer": [
    { "left": "Item A", "right": "Shuffled Match 1" },
    { "left": "Item B", "right": "Shuffled Match 2" },
    { "left": "Item C", "right": "Shuffled Match 3" }
  ],
  "explanation": "Explanation of matching pairs",
  "tags": ["tag1", "tag2"]
}

6. Image Based (questionType: "image"):
{
  "questionType": "image",
  "difficulty": "${difficulty}",
  "marks": 5,
  "question": "Description of the visual question prompt (e.g. Identify what is happening in the diagram where...)",
  "explanation": "Explanation of the visual question",
  "tags": ["tag1", "tag2"]
}

Ensure the output is exactly a JSON array containing these objects. Generate a good variety of questions.`;

  return promptStr;
}

app.post('/api/ai/generate', async (req, res) => {
  try {
    // 1. Authentication check (VULN-23-01)
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication token required.' });
    }

    // 2. Rate Limiting (VULN-23-01: Max 5 requests per minute per user)
    const rateLimit = checkCategoryRateLimit('ai_generate', userId, 5);
    if (!rateLimit.allowed) {
      res.setHeader('X-RateLimit-Limit', '5');
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('Retry-After', rateLimit.resetInSeconds);
      return res.status(429).json({
        error: `Rate limit exceeded for AI test generation. You can generate tests at most 5 times per minute. Try again in ${rateLimit.resetInSeconds} seconds.`,
        resetInSeconds: rateLimit.resetInSeconds
      });
    }

    // 3. Strict Input Validation (VULN-23-01)
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body.' });
    }

    const { topic, difficulty, totalQuestions, selectedQuestionTypes, patternText } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim() || topic.trim().length > 200) {
      return res.status(400).json({ error: 'Invalid or missing "topic". Must be a non-empty string under 200 characters.' });
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!difficulty || typeof difficulty !== 'string' || !validDifficulties.includes(difficulty.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid "difficulty". Must be one of: easy, medium, hard.' });
    }

    if (typeof totalQuestions !== 'number' || !Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 20) {
      return res.status(400).json({ error: 'Invalid "totalQuestions". Must be an integer between 1 and 20.' });
    }

    if (!selectedQuestionTypes || !Array.isArray(selectedQuestionTypes) || selectedQuestionTypes.length === 0 || selectedQuestionTypes.length > 10) {
      return res.status(400).json({ error: 'Invalid "selectedQuestionTypes". Must be a non-empty array of question types.' });
    }

    const sanitizedTypes = selectedQuestionTypes.map(t => String(t).trim().toLowerCase()).filter(Boolean);
    if (sanitizedTypes.length === 0) {
      return res.status(400).json({ error: 'Invalid "selectedQuestionTypes". Must contain valid question types.' });
    }

    if (!process.env.GEMINI_API_KEY || !isValidSecret(process.env.GEMINI_API_KEY)) {
      return res.status(500).json({ error: 'Gemini API key is not properly configured on the server.' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = buildPrompt(topic.trim(), difficulty.toLowerCase(), totalQuestions, sanitizedTypes, patternText);

    const result = await model.generateContent({
      contents: prompt,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.response.text();
    const questions = JSON.parse(responseText);

    return res.json(questions);
  } catch (error) {
    console.error('Gemini API Error:', sanitizeLogMessage(error));
    return res.status(500).json({ error: 'Failed to generate questions. Please try again later.' });
  }
});

// =====================================================
// RAZORPAY PAYMENT ENDPOINTS (PHASE 2)
// =====================================================

// Helper to initialize Razorpay SDK instance
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!isValidSecret(keyId) || !isValidSecret(keySecret)) {
    return null; // Signals test mode without live API key
  }

  return new Razorpay({
    key_id: keyId.trim(),
    key_secret: keySecret.trim(),
  });
}

/**
 * POST /api/payments/create-order
 * Authenticates user, reads DB entry fee, creates Razorpay Order, inserts payment_orders row.
 * NEVER trusts client-provided amounts or commission percentages.
 */
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Please log in to register.' });
    }

    // Rate Limiting Check
    if (!checkFinancialRateLimit(`order_${userId}`, 10, 60000)) {
      await logFinancialAudit(userId, 'SUSPICIOUS_FINANCIAL_ACTIVITY', null, null, { type: 'RATE_LIMIT_EXCEEDED', endpoint: '/create-order' });
      return res.status(429).json({ error: 'Too many payment order requests. Please wait a moment.' });
    }

    const { test_id, competition_id } = req.body;
    if (!test_id) {
      return res.status(400).json({ error: 'Missing required field: test_id' });
    }

    // 1. Fetch actual test from Supabase
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('id, title, entry_fee, creator_id, status')
      .eq('id', test_id)
      .single();

    if (testErr || !test) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    // 2. Verify test is published
    if (test.status !== 'published') {
      return res.status(400).json({ error: 'Test is not published for registration.' });
    }

    // 3. Read DB entry fee (never trust client)
    const entryFeeInr = Number(test.entry_fee || 0);

    // 4. Free test check
    if (entryFeeInr <= 0) {
      return res.status(400).json({
        error: 'This test is free. Razorpay payment order creation is not required.',
        is_free: true
      });
    }

    // 5. Creator check
    if (test.creator_id === userId) {
      return res.status(400).json({ error: 'Creator cannot purchase registration for their own test.' });
    }

    // 6. Idempotency Check — Check if user already has paid order / captured payment
    const { data: existingOrder } = await supabase
      .from('payment_orders')
      .select('id, status, provider_order_id, amount')
      .eq('user_id', userId)
      .eq('test_id', test_id)
      .eq('status', 'paid')
      .maybeSingle();

    if (existingOrder) {
      return res.status(400).json({
        error: 'You have already paid for this test.',
        already_paid: true,
        order_id: existingOrder.provider_order_id
      });
    }

    // 7. Get Commission % from DB config or RPC (fallback to 20%)
    let commissionPct = 20.0;
    try {
      const { data: configData } = await supabase.rpc('get_payment_config');
      if (configData && configData.commission_percentage != null) {
        commissionPct = Number(configData.commission_percentage);
      }
    } catch {
      commissionPct = 20.0;
    }

    // 8. Integer Paise Arithmetic (1 INR = 100 paise)
    const grossPaise = Math.round(entryFeeInr * 100);
    const platformFeePaise = Math.floor((grossPaise * commissionPct) / 100);
    const creatorAmountPaise = grossPaise - platformFeePaise;

    const grossInr = grossPaise / 100;
    const platformFeeInr = platformFeePaise / 100;
    const creatorAmountInr = creatorAmountPaise / 100;

    const orderRef = `TXO-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const razorpay = getRazorpayInstance();

    let providerOrderId = `order_test_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;

    if (razorpay) {
      // Create real Razorpay order
      const rzpOrder = await razorpay.orders.create({
        amount: grossPaise,
        currency: 'INR',
        receipt: orderRef,
        notes: {
          test_id: test_id,
          user_id: userId,
          creator_id: test.creator_id,
          competition_id: competition_id || ''
        }
      });
      providerOrderId = rzpOrder.id;
    }

    // 9. Store payment order in Supabase
    const { data: orderRow, error: orderInsertErr } = await supabase
      .from('payment_orders')
      .insert({
        user_id: userId,
        test_id: test_id,
        creator_id: test.creator_id,
        order_reference: orderRef,
        provider: 'razorpay',
        provider_order_id: providerOrderId,
        amount: grossInr,
        currency: 'INR',
        platform_commission_percentage: commissionPct,
        platform_fee: platformFeeInr,
        creator_amount: creatorAmountInr,
        payment_gateway_fee: 0,
        status: 'created',
        metadata: { competition_id: competition_id || null }
      })
      .select()
      .single();

    if (orderInsertErr) {
      console.error('Payment order DB insert error:', orderInsertErr);
      return res.status(500).json({ error: 'Failed to record payment order.' });
    }

    const publicKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id';

    await logFinancialAudit(userId, 'PAYMENT_ORDER_CREATED', null, null, {
      order_id: orderRow.id,
      provider_order_id: providerOrderId,
      test_id,
      amount_inr: grossInr,
      platform_fee_inr: platformFeeInr,
      creator_amount_inr: creatorAmountInr
    });

    return res.json({
      order_id: providerOrderId,
      amount: grossPaise,
      amount_inr: grossInr,
      currency: 'INR',
      key_id: publicKeyId,
      order_reference: orderRef,
      test_title: test.title,
      db_order_id: orderRow.id
    });

  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Internal server error while creating payment order.' });
  }
});

/**
 * POST /api/payments/verify
 * Verifies Razorpay HMAC SHA256 signature, updates order to paid,
 * records payment transaction, registers student, and logs payout transfer ledger.
 */
app.post('/api/payments/verify', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Please log in to verify payment.' });
    }

    // Rate Limiting Check
    if (!checkFinancialRateLimit(`verify_${userId}`, 10, 60000)) {
      await logFinancialAudit(userId, 'SUSPICIOUS_FINANCIAL_ACTIVITY', null, null, { type: 'RATE_LIMIT_EXCEEDED', endpoint: '/verify' });
      return res.status(429).json({ error: 'Too many verification attempts. Please wait.' });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      test_id,
      competition_id,
      payment_method
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required Razorpay verification payload.' });
    }

    await logFinancialAudit(userId, 'PAYMENT_VERIFICATION_REQUESTED', null, null, {
      razorpay_order_id,
      razorpay_payment_id
    });

    // 1. Signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const bodyText = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isSecretConfigured = isValidSecret(secret);

    if (!isSecretConfigured) {
      console.error(`[CRITICAL SECURITY BLOCK] RAZORPAY_KEY_SECRET missing, invalid, or placeholder! (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
      await logFinancialAudit(userId, 'PAYMENT_VERIFICATION_REJECTED', null, null, {
        razorpay_order_id,
        razorpay_payment_id,
        reason: 'MISSING_KEY_SECRET'
      });
      return res.status(400).json({ error: 'Payment verification rejected: RAZORPAY_KEY_SECRET is missing or invalid on server.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret.trim())
      .update(bodyText)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await logFinancialAudit(userId, 'PAYMENT_VERIFICATION_FAILED', null, null, {
        razorpay_order_id,
        razorpay_payment_id,
        reason: 'INVALID_SIGNATURE'
      });
      return res.status(400).json({ error: 'Payment signature verification failed. Invalid signature.' });
    }

    // 2. Fetch order from DB
    const { data: order, error: orderFetchErr } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('provider_order_id', razorpay_order_id)
      .single();

    if (orderFetchErr || !order) {
      return res.status(404).json({ error: 'Associated payment order not found.' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ error: 'Payment order user mismatch.' });
    }

    // 3. Idempotency Check — check if payment is already captured
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('provider_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existingPayment && existingPayment.status === 'captured') {
      return res.json({
        success: true,
        message: 'Payment already verified.',
        payment_id: existingPayment.id,
        order_id: order.id
      });
    }

    // 4. Update order status to verified
    await supabase
      .from('payment_orders')
      .update({
        status: 'verified',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    // 5. Insert row in payments table
    const { data: paymentRow, error: pInsertErr } = await supabase
      .from('payments')
      .insert({
        payment_order_id: order.id,
        user_id: userId,
        test_id: order.test_id,
        creator_id: order.creator_id,
        provider: 'razorpay',
        provider_payment_id: razorpay_payment_id,
        provider_order_id: razorpay_order_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        payment_method: payment_method || 'razorpay_checkout',
        status: 'captured',
        captured_at: new Date().toISOString(),
        raw_metadata: {
          signature_verified: true,
          competition_id: competition_id || order.metadata?.competition_id || null
        }
      })
      .select()
      .single();

    if (pInsertErr) {
      console.error('Payment transaction insert error:', pInsertErr);
    }

    // 6. Guarantee registration in test_registrations
    const { data: regCheck } = await supabase
      .from('test_registrations')
      .select('id')
      .eq('test_id', order.test_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!regCheck) {
      await supabase.from('test_registrations').insert({
        test_id: order.test_id,
        user_id: userId,
        registration_data: {
          paid: true,
          payment_id: paymentRow?.id || null,
          razorpay_order_id: razorpay_order_id,
          razorpay_payment_id: razorpay_payment_id,
          amount: order.amount,
          paid_at: new Date().toISOString()
        }
      });
    }

    // 7. Insert Creator Payout Ledger in payment_transfers and creator_earnings
    if (paymentRow) {
      await supabase.from('payment_transfers').insert({
        payment_id: paymentRow.id,
        creator_id: order.creator_id,
        provider: 'razorpay',
        gross_amount: order.amount,
        platform_fee: order.platform_fee,
        creator_amount: order.creator_amount,
        status: 'pending',
        metadata: { test_id: order.test_id, order_id: order.id }
      });

      // Phase 3: Create creator_earnings record using integer paise
      const grossPaise = Math.round(Number(order.amount) * 100);
      const platformCommissionPct = Number(order.platform_commission_percentage || 20);
      const platformCommissionPaise = Math.floor((grossPaise * platformCommissionPct) / 100);
      const creatorAmountPaise = grossPaise - platformCommissionPaise;

      await supabase.from('creator_earnings').upsert({
        creator_id: order.creator_id,
        payment_id: paymentRow.id,
        payment_order_id: order.id,
        test_id: order.test_id,
        competition_id: order.metadata?.competition_id || null,
        gross_amount_paise: grossPaise,
        razorpay_fee_paise: 0,
        razorpay_tax_paise: 0,
        platform_commission_percent: platformCommissionPct,
        platform_commission_paise: platformCommissionPaise,
        creator_amount_paise: creatorAmountPaise,
        currency: order.currency || 'INR',
        status: 'AVAILABLE', // Immediately AVAILABLE upon verified signature in test mode
        metadata: {
          order_reference: order.order_reference,
          razorpay_order_id: razorpay_order_id,
          razorpay_payment_id: razorpay_payment_id
        }
      }, { onConflict: 'payment_id' });

      await logFinancialAudit(userId, 'PAYMENT_VERIFIED', paymentRow.id, null, {
        razorpay_order_id,
        razorpay_payment_id,
        amount: order.amount
      });
      await logFinancialAudit(userId, 'REGISTRATION_ACTIVATED', paymentRow.id, null, {
        test_id: order.test_id
      });
      await logFinancialAudit(order.creator_id, 'CREATOR_EARNING_CREDITED', paymentRow.id, null, {
        creator_amount_inr: order.creator_amount,
        platform_fee_inr: order.platform_fee
      });
    }

    return res.json({
      success: true,
      message: 'Payment signature verified successfully. Registration activated.',
      order_id: order.id,
      payment_id: paymentRow?.id || null
    });

  } catch (err) {
    console.error('Payment verify error:', err);
    return res.status(500).json({ error: 'Internal server error verifying payment.' });
  }
});

/**
 * POST /api/payments/webhook
 * Idempotent processing of Razorpay webhook notifications.
 * Uses payment_webhook_events to guarantee exact-once execution.
 */
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const rzpSignature = req.headers['x-razorpay-signature'];
    const payload = req.body;
    const rawPayload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(payload);

    await logFinancialAudit(null, 'WEBHOOK_RECEIVED', null, null, {
      event_type: payload?.event || 'unknown',
      event_id: payload?.event_id || req.headers['x-razorpay-event-id'] || null
    });

    const isWebhookSecretConfigured = isValidSecret(webhookSecret);

    if (!isWebhookSecretConfigured || !rzpSignature) {
      console.error(`[CRITICAL SECURITY BLOCK] Webhook rejected: RAZORPAY_WEBHOOK_SECRET missing/invalid or signature header missing! (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
      await logFinancialAudit(null, 'WEBHOOK_REJECTED', null, null, {
        reason: !isWebhookSecretConfigured ? 'MISSING_WEBHOOK_SECRET' : 'MISSING_SIGNATURE_HEADER',
        event_type: payload?.event
      });
      return res.status(400).json({ error: 'Webhook rejected: RAZORPAY_WEBHOOK_SECRET is missing or signature header is missing.' });
    }

    const expectedSig = crypto
      .createHmac('sha256', webhookSecret.trim())
      .update(rawPayload)
      .digest('hex');

    if (expectedSig !== rzpSignature) {
      await logFinancialAudit(null, 'WEBHOOK_REJECTED', null, null, {
        reason: 'INVALID_WEBHOOK_SIGNATURE',
        event_type: payload?.event
      });
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const isSignatureVerified = true;

    await logFinancialAudit(null, 'WEBHOOK_VERIFIED', null, null, {
      event_type: payload?.event,
      event_id: payload?.event_id
    });

    const eventType = payload.event || 'unknown';
    const eventId = payload.event_id || req.headers['x-razorpay-event-id'] || `evt_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;

    // Idempotency check in DB
    const { data: existingEvt } = await supabase
      .from('payment_webhook_events')
      .select('id, processed')
      .eq('provider', 'razorpay')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvt && existingEvt.processed) {
      await logFinancialAudit(null, 'DUPLICATE_WEBHOOK_BLOCKED', null, null, { event_id: eventId, event_type: eventType });
      return res.json({ status: 'already_processed', event_id: eventId });
    }

    // Store webhook event in log
    await supabase.from('payment_webhook_events').upsert({
      provider: 'razorpay',
      event_id: eventId,
      event_type: eventType,
      payload: payload,
      signature_verified: isSignatureVerified,
      processed: false
    }, { onConflict: 'provider,event_id' });

    // Handle event types
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const rzpOrderId = paymentEntity.order_id;
      const rzpPaymentId = paymentEntity.id;

      if (rzpOrderId) {
        // Fetch order
        const { data: order } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('provider_order_id', rzpOrderId)
          .maybeSingle();

        if (order) {
          // Update order status
          await supabase
            .from('payment_orders')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', order.id);

          // Update/Insert payment transaction
          if (rzpPaymentId) {
            await supabase.from('payments').upsert({
              payment_order_id: order.id,
              user_id: order.user_id,
              test_id: order.test_id,
              creator_id: order.creator_id,
              provider: 'razorpay',
              provider_payment_id: rzpPaymentId,
              provider_order_id: rzpOrderId,
              amount: order.amount,
              currency: order.currency || 'INR',
              payment_method: paymentEntity.method || 'webhook',
              status: 'captured',
              captured_at: new Date().toISOString(),
              raw_metadata: paymentEntity
            }, { onConflict: 'provider_payment_id' });

            // Ensure registration exists
            const { data: regExists } = await supabase
              .from('test_registrations')
              .select('id')
              .eq('test_id', order.test_id)
              .eq('user_id', order.user_id)
              .maybeSingle();

            if (!regExists) {
              await supabase.from('test_registrations').insert({
                test_id: order.test_id,
                user_id: order.user_id,
                registration_data: { paid: true, webhook_event_id: eventId }
              });
            }
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const rzpOrderId = paymentEntity.order_id;
      if (rzpOrderId) {
        await supabase
          .from('payment_orders')
          .update({ status: 'failed' })
          .eq('provider_order_id', rzpOrderId);
      }
    } else if (eventType === 'refund.processed' || eventType === 'payment.refunded') {
      const refundEntity = payload.payload?.refund?.entity || payload.payload?.payment?.entity || {};
      const rzpRefundId = refundEntity.id || refundEntity.refund_id;
      const rzpPaymentId = refundEntity.payment_id;

      if (rzpRefundId || rzpPaymentId) {
        // Update refund request row
        if (rzpRefundId) {
          await supabase
            .from('refund_requests')
            .update({
              status: 'approved',
              refund_status: 'refunded',
              processed_at: new Date().toISOString()
            })
            .eq('razorpay_refund_id', rzpRefundId);
        }

        // Update payment transaction and order status
        if (rzpPaymentId) {
          const { data: pTrans } = await supabase
            .from('payments')
            .update({ status: 'refunded' })
            .eq('provider_payment_id', rzpPaymentId)
            .select()
            .maybeSingle();

          if (pTrans) {
            await supabase
              .from('payment_orders')
              .update({ status: 'refunded' })
              .eq('id', pTrans.payment_order_id);

            // Transition creator earnings to REVERSED
            await supabase
              .from('creator_earnings')
              .update({ status: 'REVERSED', updated_at: new Date().toISOString() })
              .eq('payment_id', pTrans.id);

            // Audit log
            await supabase.from('payment_audit_logs').insert({
              action: 'REFUND_COMPLETED',
              payment_id: pTrans.id,
              details: { webhook_event_id: eventId, rzp_refund_id: rzpRefundId }
            });
          }
        }
      }
    } else if (eventType === 'refund.failed') {
      const refundEntity = payload.payload?.refund?.entity || {};
      const rzpRefundId = refundEntity.id;
      if (rzpRefundId) {
        await supabase
          .from('refund_requests')
          .update({
            refund_status: 'refund_failed',
            updated_at: new Date().toISOString()
          })
          .eq('razorpay_refund_id', rzpRefundId);
      }
    }

    // Mark event processed
    await supabase
      .from('payment_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('provider', 'razorpay')
      .eq('event_id', eventId);

    return res.json({ status: 'ok', event_id: eventId, event_type: eventType });

  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: 'Internal server error processing webhook.' });
  }
});

/**
 * GET /api/payments/check-access
 * Authoritative backend check before student starts a test.
 * Verifies that paid tests have a completed payment record.
 */
app.get('/api/payments/check-access', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ access: false, reason: 'Unauthorized.' });
    }

    const { test_id } = req.query;
    if (!test_id) {
      return res.status(400).json({ access: false, reason: 'Missing test_id query parameter.' });
    }

    // Fetch test info
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('id, entry_fee, creator_id, status')
      .eq('id', test_id)
      .single();

    if (testErr || !test) {
      return res.status(404).json({ access: false, reason: 'Test not found.' });
    }

    // Creator has full access
    if (test.creator_id === userId) {
      return res.json({ access: true, is_creator: true });
    }

    const entryFeeInr = Number(test.entry_fee || 0);

    // Free test check — check registration
    if (entryFeeInr <= 0) {
      const { data: reg } = await supabase
        .from('test_registrations')
        .select('id')
        .eq('test_id', test_id)
        .eq('user_id', userId)
        .maybeSingle();

      return res.json({ access: !!reg, is_free: true, registered: !!reg });
    }

    // Paid test check — check payment_orders and payments
    const { data: paidOrder } = await supabase
      .from('payment_orders')
      .select('id, status')
      .eq('user_id', userId)
      .eq('test_id', test_id)
      .in('status', ['paid', 'verified'])
      .maybeSingle();

    const { data: capturedPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('test_id', test_id)
      .eq('status', 'captured')
      .maybeSingle();

    const isPaid = !!(paidOrder || capturedPayment);

    return res.json({
      access: isPaid,
      payment_status: isPaid ? (paidOrder?.status || 'paid') : 'unpaid',
      entry_fee: entryFeeInr
    });

  } catch (err) {
    console.error('Check access error:', err);
    return res.status(500).json({ access: false, reason: 'Internal server error checking test access.' });
  }
});

/**
 * GET /api/payments/status/:testId
 * Returns payment status for the authenticated user for a specific test.
 * Enables status recovery if user's browser closes during payment.
 */
app.get('/api/payments/status/:testId', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { testId } = req.params;
    if (!testId) {
      return res.status(400).json({ error: 'Missing testId parameter.' });
    }

    const { data: order } = await supabase
      .from('payment_orders')
      .select('id, status, provider_order_id, amount, paid_at, updated_at')
      .eq('user_id', userId)
      .eq('test_id', testId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: payment } = await supabase
      .from('payments')
      .select('id, status, provider_payment_id, captured_at')
      .eq('user_id', userId)
      .eq('test_id', testId)
      .eq('status', 'captured')
      .limit(1)
      .maybeSingle();

    const isPaid = (order?.status === 'paid' || order?.status === 'verified' || !!payment);
    const currentStatus = isPaid ? (order?.status || 'paid') : (order?.status || 'unpaid');

    return res.json({
      paid: isPaid,
      status: currentStatus,
      order_id: order?.provider_order_id || null,
      payment_id: payment?.provider_payment_id || null,
      paid_at: order?.paid_at || payment?.captured_at || null
    });
  } catch (err) {
    console.error('Get payment status error:', err);
    return res.status(500).json({ error: 'Internal server error getting payment status.' });
  }
});

// =====================================================
// PHASE 3 — FINANCIAL SETTLEMENT & CREATOR EARNINGS ENDPOINTS
// =====================================================

/**
 * GET /api/payments/creator-summary
 * Returns creator's financial summary: Total Earnings, Available Balance,
 * Pending Balance, Paid Out, and Paid Registrations count.
 */
app.get('/api/payments/creator-summary', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Call RPC or calculate directly from DB
    const { data: summary, error: rpcErr } = await supabase.rpc('get_creator_financial_summary', {
      p_creator_id: userId
    });

    if (rpcErr) {
      // Fallback calculation directly if RPC is not yet executed in DB
      const { data: earnings } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('creator_id', userId);

      const { data: payouts } = await supabase
        .from('payouts')
        .select('*')
        .eq('creator_id', userId);

      const totalEarningsPaise = (earnings || [])
        .filter(e => e.status !== 'REVERSED')
        .reduce((sum, e) => sum + Number(e.creator_amount_paise || 0), 0);

      const availablePaise = (earnings || [])
        .filter(e => e.status === 'AVAILABLE')
        .reduce((sum, e) => sum + Number(e.creator_amount_paise || 0), 0);

      const pendingPaise = (earnings || [])
        .filter(e => e.status === 'PENDING')
        .reduce((sum, e) => sum + Number(e.creator_amount_paise || 0), 0);

      const paidOutPaise = (payouts || [])
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount_paise || 0), 0);

      const requestedPaise = (payouts || [])
        .filter(p => p.status === 'REQUESTED' || p.status === 'PROCESSING')
        .reduce((sum, p) => sum + Number(p.amount_paise || 0), 0);

      const paidCount = (earnings || []).filter(e => e.status !== 'REVERSED').length;

      return res.json({
        total_earnings_paise: totalEarningsPaise,
        total_earnings_inr: totalEarningsPaise / 100,
        available_balance_paise: Math.max(0, availablePaise - requestedPaise - paidOutPaise),
        available_balance_inr: Math.max(0, (availablePaise - requestedPaise - paidOutPaise) / 100),
        pending_balance_paise: pendingPaise,
        pending_balance_inr: pendingPaise / 100,
        paid_out_paise: paidOutPaise,
        paid_out_inr: paidOutPaise / 100,
        payout_requested_paise: requestedPaise,
        payout_requested_inr: requestedPaise / 100,
        paid_registrations_count: paidCount
      });
    }

    return res.json(summary);
  } catch (err) {
    console.error('Creator financial summary error:', err);
    return res.status(500).json({ error: 'Failed to fetch financial summary.' });
  }
});

/**
 * GET /api/payments/creator-earnings
 * Returns complete earnings history for the creator.
 */
app.get('/api/payments/creator-earnings', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { data: earnings, error } = await supabase
      .from('creator_earnings')
      .select('*, tests(title)')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ data: earnings || [] });
  } catch (err) {
    console.error('Creator earnings history error:', err);
    return res.status(500).json({ error: 'Failed to fetch earnings history.' });
  }
});

/**
 * POST /api/payments/request-payout
 * Submits a new payout request for the creator.
 * Validates available balance server-side.
 */
app.post('/api/payments/request-payout', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { amount_inr, payout_method } = req.body;
    const amountInr = Number(amount_inr || 0);

    if (amountInr <= 0) {
      return res.status(400).json({ error: 'Payout amount must be greater than 0.' });
    }

    const amountPaise = Math.round(amountInr * 100);

    // Call RPC or fallback
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('request_creator_payout', {
      p_creator_id: userId,
      p_amount_paise: amountPaise,
      p_payout_method: payout_method || 'bank_transfer'
    });

    if (!rpcErr && rpcRes) {
      if (!rpcRes.success) {
        return res.status(400).json({ error: rpcRes.error || 'Failed to submit payout request.' });
      }
      return res.json(rpcRes);
    }

    // Direct fallback if RPC is not yet loaded into DB
    if (amountInr < 500) {
      return res.status(400).json({ error: 'Minimum payout threshold is ₹500.' });
    }

    // Insert payout row
    const { data: payoutRow, error: insertErr } = await supabase
      .from('payouts')
      .insert({
        creator_id: userId,
        amount_paise: amountPaise,
        currency: 'INR',
        status: 'REQUESTED',
        payout_method: payout_method || 'bank_transfer',
        requested_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertErr) {
      return res.status(400).json({ error: insertErr.message || 'Failed to record payout request.' });
    }

    return res.json({
      success: true,
      message: 'Payout request submitted successfully.',
      payout_id: payoutRow.id,
      amount_inr: amountInr,
      status: 'REQUESTED'
    });

  } catch (err) {
    console.error('Request payout error:', err);
    return res.status(500).json({ error: 'Internal server error processing payout request.' });
  }
});

/**
 * GET /api/payments/creator-payouts
 * Returns payout history for creator.
 */
app.get('/api/payments/creator-payouts', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { data: payouts, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('creator_id', userId)
      .order('requested_at', { ascending: false });

    if (error) throw error;

    return res.json({ data: payouts || [] });
  } catch (err) {
    console.error('Creator payouts fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch payout history.' });
  }
});

/**
 * GET /api/payments/get-payout-details
 * Returns masked payout details for creator.
 */
app.get('/api/payments/get-payout-details', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { data: details } = await supabase
      .from('creator_payout_details')
      .select('*')
      .eq('creator_id', userId)
      .maybeSingle();

    return res.json({ data: details || null });
  } catch (err) {
    console.error('Get payout details error:', err);
    return res.status(500).json({ error: 'Failed to fetch payout details.' });
  }
});

/**
 * POST /api/payments/save-payout-details
 * Saves/updates creator masked payout information.
 */
app.post('/api/payments/save-payout-details', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { account_holder_name, bank_name, account_number, ifsc_code, upi_id, payout_type } = req.body;

    if (!account_holder_name) {
      return res.status(400).json({ error: 'Account holder name is required.' });
    }

    // Mask sensitive account info before storing
    let maskedAccount = null;
    if (account_number) {
      const cleanAcc = String(account_number).trim();
      const last4 = cleanAcc.slice(-4);
      maskedAccount = `XXXX XXXX ${last4}`;
    }

    let maskedUpi = null;
    if (upi_id) {
      const cleanUpi = String(upi_id).trim();
      const parts = cleanUpi.split('@');
      if (parts.length === 2) {
        maskedUpi = `${parts[0].slice(0, 3)}***@${parts[1]}`;
      } else {
        maskedUpi = cleanUpi;
      }
    }

    const { data: detailsRow, error } = await supabase
      .from('creator_payout_details')
      .upsert({
        creator_id: userId,
        account_holder_name: account_holder_name,
        bank_name: bank_name || null,
        account_number_masked: maskedAccount,
        ifsc_code: ifsc_code ? String(ifsc_code).toUpperCase() : null,
        upi_id_masked: maskedUpi,
        payout_type: payout_type || 'bank_transfer',
        updated_at: new Date().toISOString()
      }, { onConflict: 'creator_id' })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data: detailsRow });
  } catch (err) {
    console.error('Save payout details error:', err);
    return res.status(500).json({ error: 'Failed to save payout details.' });
  }
});

// =====================================================
// PHASE 5 — ADMIN SETTLEMENT MANAGEMENT ENDPOINTS
// =====================================================

/**
 * GET /api/admin/payouts
 * Returns all creator payout requests for platform admin review.
 */
app.get('/api/admin/payouts', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const isAdmin = await verifyAdminRole(userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin authorization required.' });
    }

    // Call RPC or query payouts table with profiles join
    const { data: payouts, error } = await supabase.rpc('admin_list_payout_requests');

    if (error) {
      // Fallback query if RPC not yet run
      const { data: directPayouts, error: dirErr } = await supabase
        .from('payouts')
        .select('*, profiles:creator_id (full_name, email)')
        .order('requested_at', { ascending: false });

      if (dirErr) throw dirErr;

      const formatted = (directPayouts || []).map(p => ({
        id: p.id,
        creator_id: p.creator_id,
        creator_name: p.profiles?.full_name || 'Unknown Creator',
        creator_email: p.profiles?.email || '',
        amount_paise: p.amount_paise,
        amount_inr: (p.amount_paise / 100),
        currency: p.currency,
        status: p.status,
        payout_method: p.payout_method,
        payout_details: p.payout_details,
        reference_id: p.reference_id,
        requested_at: p.requested_at,
        processed_at: p.processed_at,
        failure_reason: p.failure_reason
      }));

      return res.json({ data: formatted });
    }

    return res.json({ data: payouts || [] });
  } catch (err) {
    console.error('Admin list payouts error:', err);
    return res.status(500).json({ error: 'Failed to fetch settlement requests.' });
  }
});

/**
 * POST /api/admin/payouts/:id/status
 * Allows platform admin to approve, process, complete, or reject a payout request.
 */
app.post('/api/admin/payouts/:id/status', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const isAdmin = await verifyAdminRole(userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin authorization required.' });
    }

    const { id } = req.params;
    const { status, reference_id, failure_reason } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    // Call RPC or direct update
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_update_payout_status', {
      p_payout_id: id,
      p_new_status: status,
      p_reference_id: reference_id || null,
      p_failure_reason: failure_reason || null
    });

    if (!rpcErr && rpcRes) {
      if (!rpcRes.success) {
        return res.status(400).json({ error: rpcRes.error });
      }
      return res.json(rpcRes);
    }

    // Direct fallback
    const { data: payoutRow } = await supabase
      .from('payouts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!payoutRow) {
      return res.status(404).json({ error: 'Payout request not found.' });
    }

    if (status === 'PAID') {
      await supabase
        .from('payouts')
        .update({
          status: 'PAID',
          reference_id: reference_id || `TXN_${Date.now()}`,
          processed_at: new Date().toISOString()
        })
        .eq('id', id);

      await supabase
        .from('creator_earnings')
        .update({ status: 'PAID' })
        .eq('creator_id', payoutRow.creator_id)
        .eq('status', 'PAYOUT_REQUESTED');

    } else if (status === 'CANCELLED' || status === 'FAILED') {
      await supabase
        .from('payouts')
        .update({
          status: status,
          failure_reason: failure_reason || 'Rejected by administrator.',
          processed_at: new Date().toISOString()
        })
        .eq('id', id);

      await supabase
        .from('creator_earnings')
        .update({ status: 'AVAILABLE' })
        .eq('creator_id', payoutRow.creator_id)
        .eq('status', 'PAYOUT_REQUESTED');

    } else if (status === 'PROCESSING') {
      await supabase
        .from('payouts')
        .update({ status: 'PROCESSING' })
        .eq('id', id);
    }

    return res.json({ success: true, message: `Payout status updated to ${status}.` });

  } catch (err) {
    console.error('Admin update payout status error:', err);
    return res.status(500).json({ error: 'Internal server error updating payout status.' });
  }
});

// =====================================================
// PHASE 6 — REFUNDS, CANCELLATIONS & DISPUTE MANAGEMENT ENDPOINTS
// =====================================================

/**
 * POST /api/payments/refund/request
 * Student endpoint to request a refund for a captured payment.
 */
app.post('/api/payments/refund/request', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Please log in to request a refund.' });
    }

    if (!checkFinancialRateLimit(`refund_${userId}`, 5, 60000)) {
      await logFinancialAudit(userId, 'SUSPICIOUS_FINANCIAL_ACTIVITY', null, null, { type: 'RATE_LIMIT_EXCEEDED', endpoint: '/refund/request' });
      return res.status(429).json({ error: 'Too many refund requests. Please wait a minute.' });
    }

    const { payment_id, reason, explanation } = req.body;
    if (!payment_id || !reason) {
      return res.status(400).json({ error: 'Missing required parameters: payment_id and reason.' });
    }

    // Try RPC first
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('request_student_refund', {
      p_payment_id: payment_id,
      p_reason: reason,
      p_explanation: explanation || null
    });

    if (!rpcErr && rpcRes) {
      if (!rpcRes.success) {
        return res.status(400).json({ error: rpcRes.error || 'Failed to submit refund request.' });
      }
      return res.json(rpcRes);
    }

    // Fallback direct SQL execution if RPC not loaded
    const { data: payment, error: pErr } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (pErr || !payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    if (payment.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized: You can only request refunds for your own payments.' });
    }

    if (payment.status !== 'captured') {
      return res.status(400).json({ error: `Payment cannot be refunded because its status is ${payment.status}.` });
    }

    const { data: existingReq } = await supabase
      .from('refund_requests')
      .select('id, status')
      .eq('payment_id', payment_id)
      .in('status', ['requested', 'under_review', 'approved'])
      .maybeSingle();

    if (existingReq) {
      return res.status(400).json({ error: `A refund request for this payment is already ${existingReq.status}.` });
    }

    const { data: reqRow, error: reqInsertErr } = await supabase
      .from('refund_requests')
      .insert({
        payment_id: payment.id,
        payment_order_id: payment.payment_order_id,
        user_id: userId,
        test_id: payment.test_id,
        amount_paise: Math.round(Number(payment.amount) * 100),
        amount_inr: payment.amount,
        reason: reason,
        explanation: explanation || null,
        status: 'requested',
        refund_status: 'refund_pending'
      })
      .select()
      .single();

    if (reqInsertErr) {
      return res.status(500).json({ error: reqInsertErr.message || 'Failed to record refund request.' });
    }

    await supabase.from('payment_audit_logs').insert({
      actor_id: userId,
      action: 'PAYMENT_REFUND_REQUESTED',
      payment_id: payment.id,
      refund_request_id: reqRow.id,
      details: { reason, amount: payment.amount }
    });

    return res.json({
      success: true,
      message: 'Refund request submitted for review.',
      refund_request_id: reqRow.id,
      status: 'requested',
      amount_inr: payment.amount
    });

  } catch (err) {
    console.error('Request student refund error:', err);
    return res.status(500).json({ error: 'Internal server error processing refund request.' });
  }
});

/**
 * GET /api/payments/refund/my-requests
 * Student endpoint to fetch their refund requests history.
 */
app.get('/api/payments/refund/my-requests', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { data: requests, error } = await supabase
      .from('refund_requests')
      .select('*, tests(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ data: requests || [] });
  } catch (err) {
    console.error('Fetch student refund requests error:', err);
    return res.status(500).json({ error: 'Failed to fetch refund requests.' });
  }
});

/**
 * GET /api/admin/refunds
 * Admin endpoint to list all refund requests.
 */
app.get('/api/admin/refunds', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const isAdmin = await verifyAdminRole(userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin authorization required.' });
    }

    const { data: requests, error } = await supabase
      .from('refund_requests')
      .select('*, tests(title, creator_id), profiles!user_id(full_name, email), payments(provider_payment_id, payment_method, status)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ data: requests || [] });
  } catch (err) {
    console.error('Admin fetch refunds error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin refund requests.' });
  }
});

/**
 * POST /api/admin/refunds/:id/action
 * Admin endpoint to approve or reject a refund request.
 */
app.post('/api/admin/refunds/:id/action', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const isAdmin = await verifyAdminRole(userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin authorization required.' });
    }

    const { id } = req.params;
    const { action, rejection_reason } = req.body;

    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid parameters: action must be approve or reject.' });
    }

    const { data: refundReq, error: fetchErr } = await supabase
      .from('refund_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !refundReq) {
      return res.status(404).json({ error: 'Refund request record not found.' });
    }

    if (action === 'reject') {
      await supabase
        .from('refund_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason || 'Rejected by administrator.',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      await supabase.from('payment_audit_logs').insert({
        actor_id: userId,
        action: 'REFUND_REJECTED',
        payment_id: refundReq.payment_id,
        refund_request_id: id,
        details: { rejection_reason: rejection_reason || 'Rejected by administrator.' }
      });

      return res.json({ success: true, message: 'Refund request rejected.' });
    }

    // Action === 'approve'
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', refundReq.payment_id)
      .single();

    let rzpRefundId = `rfnd_test_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const rzp = getRazorpayInstance();

    if (rzp && payment?.provider_payment_id) {
      try {
        const rzpRefund = await rzp.payments.refund(payment.provider_payment_id, {
          amount: refundReq.amount_paise,
          notes: { refund_request_id: id, reason: refundReq.reason }
        });
        if (rzpRefund && rzpRefund.id) {
          rzpRefundId = rzpRefund.id;
        }
      } catch (rzpErr) {
        console.error('Razorpay API refund error:', rzpErr);
        // Record failure state if API error occurred
        await supabase
          .from('refund_requests')
          .update({
            status: 'approved',
            refund_status: 'refund_failed',
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        await supabase.from('payment_audit_logs').insert({
          actor_id: userId,
          action: 'REFUND_FAILED',
          payment_id: refundReq.payment_id,
          refund_request_id: id,
          details: { error: rzpErr.message || 'Razorpay refund API call failed.' }
        });

        return res.status(500).json({ error: `Razorpay refund failed: ${rzpErr.message}` });
      }
    }

    // Update refund request row
    await supabase
      .from('refund_requests')
      .update({
        status: 'approved',
        refund_status: 'refunded',
        razorpay_refund_id: rzpRefundId,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Update payment & order status
    await supabase
      .from('payments')
      .update({ status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', refundReq.payment_id);

    await supabase
      .from('payment_orders')
      .update({ status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', refundReq.payment_order_id);

    // Adjust creator earnings safely
    const { data: earningRow } = await supabase
      .from('creator_earnings')
      .select('*')
      .eq('payment_id', refundReq.payment_id)
      .maybeSingle();

    if (earningRow) {
      if (earningRow.status === 'PAID') {
        // Creator was ALREADY paid in a past settlement.
        // Record debt in financial_adjustments so future payouts deduct this liability safely!
        await supabase.from('financial_adjustments').insert({
          creator_id: earningRow.creator_id,
          payment_id: refundReq.payment_id,
          refund_request_id: id,
          amount_paise: earningRow.creator_amount_paise,
          reason: `Refund for payment ${refundReq.payment_id} after payout completion`,
          status: 'UNRESOLVED'
        });

        await supabase.from('payment_audit_logs').insert({
          actor_id: userId,
          action: 'SETTLEMENT_ADJUSTED',
          payment_id: refundReq.payment_id,
          refund_request_id: id,
          details: { creator_id: earningRow.creator_id, debt_amount_paise: earningRow.creator_amount_paise }
        });
      } else {
        // Earning was PENDING, AVAILABLE, or PAYOUT_REQUESTED — transition status to REVERSED
        await supabase
          .from('creator_earnings')
          .update({ status: 'REVERSED', updated_at: new Date().toISOString() })
          .eq('id', earningRow.id);

        await supabase.from('payment_audit_logs').insert({
          actor_id: userId,
          action: 'CREATOR_EARNING_REVERSED',
          payment_id: refundReq.payment_id,
          refund_request_id: id,
          details: { creator_id: earningRow.creator_id, amount_paise: earningRow.creator_amount_paise }
        });
      }
    }

    // Audit Log
    await supabase.from('payment_audit_logs').insert({
      actor_id: userId,
      action: 'REFUND_APPROVED',
      payment_id: refundReq.payment_id,
      refund_request_id: id,
      details: { rzp_refund_id: rzpRefundId, amount_inr: refundReq.amount_inr }
    });

    return res.json({
      success: true,
      message: 'Refund approved and executed successfully.',
      razorpay_refund_id: rzpRefundId,
      status: 'refunded'
    });

  } catch (err) {
    console.error('Admin refund action error:', err);
    return res.status(500).json({ error: 'Internal server error processing refund action.' });
  }
});

/**
 * POST /api/creator/tests/:testId/cancel
 * Endpoint for creators/admins to cancel a test/competition and initiate safe refunds.
 */
app.post('/api/creator/tests/:testId/cancel', async (req, res) => {
  try {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { testId } = req.params;
    const { cancellation_reason } = req.body;

    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('id, title, creator_id, status')
      .eq('id', testId)
      .single();

    if (testErr || !test) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    const isAdmin = await verifyAdminRole(userId);
    if (test.creator_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized: You can only cancel your own tests.' });
    }

    // Update test status to cancelled
    await supabase
      .from('tests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', testId);

    // Find all captured payments for this test
    const { data: capturedPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('test_id', testId)
      .eq('status', 'captured');

    let processedCount = 0;
    const eventId = `cancel_${testId}_${Date.now()}`;

    if (capturedPayments && capturedPayments.length > 0) {
      for (const p of capturedPayments) {
        // Idempotently create refund request
        const { data: reqRow } = await supabase
          .from('refund_requests')
          .upsert({
            payment_id: p.id,
            payment_order_id: p.payment_order_id,
            user_id: p.user_id,
            test_id: testId,
            amount_paise: Math.round(Number(p.amount) * 100),
            amount_inr: p.amount,
            reason: cancellation_reason || 'Test cancelled by creator',
            status: 'approved',
            refund_status: 'refunded',
            cancellation_event_id: eventId,
            processed_at: new Date().toISOString()
          }, { onConflict: 'payment_id' })
          .select()
          .single();

        // Mark payment & order refunded
        await supabase.from('payments').update({ status: 'refunded' }).eq('id', p.id);
        await supabase.from('payment_orders').update({ status: 'refunded' }).eq('id', p.payment_order_id);
        await supabase.from('creator_earnings').update({ status: 'REVERSED' }).eq('payment_id', p.id);

        processedCount++;
      }
    }

    await supabase.from('payment_audit_logs').insert({
      actor_id: userId,
      action: 'EVENT_CANCELLED',
      details: { test_id: testId, reason: cancellation_reason, total_refunds_processed: processedCount }
    });

    return res.json({
      success: true,
      message: `Test cancelled successfully. ${processedCount} paid registrations processed for refund.`,
      refunds_processed: processedCount
    });

  } catch (err) {
    console.error('Cancel test error:', err);
    return res.status(500).json({ error: 'Internal server error cancelling test.' });
  }
});

// Express Global Error Handling Middleware
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS policy error')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('[Express Global Error Handler]', err?.stack || err?.message || err);
  return res.status(500).json({
    error: 'Internal server error.',
    ...(process.env.NODE_ENV !== 'production' ? { details: err?.message } : {})
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Judge0 URL: ${JUDGE0_API_URL}`);
  console.log(`Judge0 configured: ${!!(JUDGE0_API_KEY && JUDGE0_API_KEY !== 'your_rapidapi_key_here')}`);
});
global.serverInstance = server;

function gracefulShutdown(signal) {
  console.log(`[Process Signal] ${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    console.log('[Process Shutdown] HTTP server closed cleanly.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[Process Shutdown] Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));



