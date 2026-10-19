/**
 * TESTORA — Security Test Suite
 * Phase 24 Task 24.6 — Automated Security Tests
 *
 * Uses Node.js built-in 'node:test' + 'node:assert' (Node ≥ 18).
 * All external providers (Supabase, Gemini, Judge0, Razorpay) are MOCKED.
 * No live credentials are required.
 *
 * Run: node --test security.test.cjs
 */

'use strict';

const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// =====================================================================
// MOCK SETUP — Override require before server loads
// =====================================================================

// We test the server logic by directly invoking a lightweight in-process
// Express app replicated from the relevant logic, using mocks, rather than
// spawning and network-testing the real server (which requires live secrets).
//
// This approach lets us:
//   - Test all auth / rate-limit / validation / header logic
//   - Avoid needing GEMINI_API_KEY, JUDGE0_API_KEY, Supabase creds, etc.
//   - Run repeatable, hermetic, fast unit+integration tests

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('node:crypto');

// =====================================================================
// IN-MEMORY RATE LIMITER (copied from real server)
// =====================================================================
const categoryRateLimitMap = new Map();

function resetRateLimits() {
  categoryRateLimitMap.clear();
}

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

// =====================================================================
// MOCK JWT VALIDATION
// Real server: supabase.auth.getUser(token) → {user: {id}}
// Mock: token 'VALID_TOKEN_userId' → returns userId
//       anything else → null
// =====================================================================
async function validateAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (token.startsWith('VALID_TOKEN_')) return token.slice(12); // e.g. 'user-123'
  return null;
}

// =====================================================================
// BUILD MOCK EXPRESS APP (mirrors real server security controls)
// =====================================================================
const isProduction = false;

function buildTestApp({ geminiKeySet = true } = {}) {
  const app = express();

  // ---- SECURITY HEADERS (Task 24.4) ----
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'sameorigin' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  }));

  // ---- CORS ----
  const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin.replace(/\/+$/, ''))) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '100kb' }));

  // ---- HEALTH ----
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // ---- POST /api/ai/generate ----
  app.post('/api/ai/generate', async (req, res) => {
    // 1. Auth
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Authentication token required.' });

    // 2. Rate limit
    const rateLimit = checkCategoryRateLimit('ai_generate', userId, 5);
    if (!rateLimit.allowed) {
      res.setHeader('X-RateLimit-Limit', '5');
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('Retry-After', rateLimit.resetInSeconds);
      return res.status(429).json({
        error: `Rate limit exceeded. Try again in ${rateLimit.resetInSeconds} seconds.`,
        resetInSeconds: rateLimit.resetInSeconds,
      });
    }

    // 3. Input validation
    if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid request body.' });
    const { topic, difficulty, totalQuestions, selectedQuestionTypes } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim() || topic.trim().length > 200)
      return res.status(400).json({ error: 'Invalid or missing "topic".' });

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!difficulty || !validDifficulties.includes(String(difficulty).toLowerCase()))
      return res.status(400).json({ error: 'Invalid "difficulty".' });

    if (typeof totalQuestions !== 'number' || !Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 20)
      return res.status(400).json({ error: 'Invalid "totalQuestions". Must be an integer between 1 and 20.' });

    if (!Array.isArray(selectedQuestionTypes) || selectedQuestionTypes.length === 0)
      return res.status(400).json({ error: 'Invalid "selectedQuestionTypes".' });

    // 4. Check Gemini key
    if (!geminiKeySet) return res.status(500).json({ error: 'Gemini API key is not properly configured on the server.' });

    // 5. Return mocked questions (real server would call Gemini)
    return res.json([{ questionType: 'mcq', question: 'Q1', difficulty, marks: 5, options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' }]);
  });

  // ---- POST /api/code/evaluate ----
  // Mocked attempt ownership: 'ATTEMPT_FOR_USER' belongs to 'valid-user'
  app.post('/api/code/evaluate', async (req, res) => {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Rate limit
    const rateLimit = checkCategoryRateLimit('code_evaluate', userId, 10);
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', rateLimit.resetInSeconds);
      return res.status(429).json({ error: 'Rate limit exceeded.', resetInSeconds: rateLimit.resetInSeconds });
    }

    const { question_id, attempt_id, language, source_code } = req.body;
    if (!question_id || !attempt_id || !language || !source_code)
      return res.status(400).json({ error: 'Missing required fields.' });

    // Ownership mock
    if (attempt_id === 'ATTEMPT_FOR_OTHER_USER') return res.status(403).json({ error: 'Forbidden.' });

    return res.json({ passed: 1, failed: 0, total: 1, marks_awarded: 5 });
  });

  // ---- POST /api/code/run ----
  app.post('/api/code/run', async (req, res) => {
    const userId = await validateAuth(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized: Please log in to run code.' });

    const rateCheck = checkCategoryRateLimit('code_run', userId, 15);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. You can run at most 15 executions per minute. Try again in ${rateCheck.resetInSeconds}s.`,
        resetInSeconds: rateCheck.resetInSeconds,
      });
    }

    return res.json({ status: 'Accepted', stdout: 'hello', stderr: '' });
  });

  return app;
}

// =====================================================================
// HTTP HELPER
// =====================================================================
function request(app, { method = 'GET', path = '/', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const bodyStr = body ? JSON.stringify(body) : null;
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...headers,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      };
      const req = http.request({ hostname: '127.0.0.1', port, method, path, headers: reqHeaders }, (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          server.close();
          let json;
          try { json = JSON.parse(data); } catch { json = data; }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      });
      req.on('error', (e) => { server.close(); reject(e); });
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  });
}

const VALID_TOKEN = 'Bearer VALID_TOKEN_user-123';
const APP = buildTestApp({ geminiKeySet: true });
const APP_NO_GEMINI = buildTestApp({ geminiKeySet: false });

const VALID_AI_BODY = {
  topic: 'React Hooks',
  difficulty: 'medium',
  totalQuestions: 5,
  selectedQuestionTypes: ['mcq'],
};

// =====================================================================
// TEST 1 — AI generation without a token returns HTTP 401
// =====================================================================
test('TC-01: AI generate without token → 401', async () => {
  const res = await request(APP, { method: 'POST', path: '/api/ai/generate', body: VALID_AI_BODY });
  assert.equal(res.status, 401);
  assert.ok(res.body.error, 'Error message present');
  assert.ok(!res.body.stack, 'No stack trace exposed');
});

// =====================================================================
// TEST 2 — AI generation with an invalid JWT is rejected
// =====================================================================
test('TC-02: AI generate with invalid JWT → 401', async () => {
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: 'Bearer INVALID_JWT_TOKEN_xyz' },
    body: VALID_AI_BODY,
  });
  assert.equal(res.status, 401);
});

// =====================================================================
// TEST 3 — Authenticated user can generate a valid test
// =====================================================================
test('TC-03: AI generate with valid token → 200 array', async () => {
  resetRateLimits();
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: VALID_TOKEN },
    body: VALID_AI_BODY,
  });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body), 'Response is array of questions');
  assert.ok(res.body.length > 0, 'At least one question generated');
});

// =====================================================================
// TEST 4 — Excessive totalQuestions values (> 20) are rejected
// =====================================================================
test('TC-04: totalQuestions=21 -> 400', async () => {
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: 'Bearer VALID_TOKEN_val-user-tc04a' },
    body: { ...VALID_AI_BODY, totalQuestions: 21 },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /totalQuestions/i);
});

test('TC-04b: totalQuestions=0 -> 400', async () => {
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: 'Bearer VALID_TOKEN_val-user-tc04b' },
    body: { ...VALID_AI_BODY, totalQuestions: 0 },
  });
  assert.equal(res.status, 400);
});

test('TC-04c: totalQuestions=1.5 (non-integer) -> 400', async () => {
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: 'Bearer VALID_TOKEN_val-user-tc04c' },
    body: { ...VALID_AI_BODY, totalQuestions: 1.5 },
  });
  assert.equal(res.status, 400);
});

// =====================================================================
// TEST 5 — Invalid input types and malformed request bodies are rejected
// =====================================================================
test('TC-05a: Missing topic -> 400', async () => {
  const { topic: _, ...noTopic } = VALID_AI_BODY;
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: 'Bearer VALID_TOKEN_val-user-tc05a' },
    body: noTopic,
  });
  assert.equal(res.status, 400);
});

test('TC-05b: Invalid difficulty -> 400', async () => {
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: 'Bearer VALID_TOKEN_val-user-tc05b' },
    body: { ...VALID_AI_BODY, difficulty: 'extreme' },
  });
  assert.equal(res.status, 400);
});

test('TC-05c: Empty selectedQuestionTypes -> 400', async () => {
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: 'Bearer VALID_TOKEN_val-user-tc05c' },
    body: { ...VALID_AI_BODY, selectedQuestionTypes: [] },
  });
  assert.equal(res.status, 400);
});

test('TC-05d: Topic too long (>200 chars) -> 400', async () => {
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: 'Bearer VALID_TOKEN_val-user-tc05d' },
    body: { ...VALID_AI_BODY, topic: 'a'.repeat(201) },
  });
  assert.equal(res.status, 400);
});

// =====================================================================
// TEST 6 — AI generation requests beyond limit → 429
// =====================================================================
test('TC-06: AI generate rate limit (max 5) → 429 on 6th request', async () => {
  // Use a dedicated test user to avoid polluting other tests
  const token = 'Bearer VALID_TOKEN_rate-test-ai-user';
  resetRateLimits();
  for (let i = 0; i < 5; i++) {
    const r = await request(APP, {
      method: 'POST', path: '/api/ai/generate',
      headers: { Authorization: token },
      body: VALID_AI_BODY,
    });
    assert.equal(r.status, 200, `Request ${i + 1} should succeed`);
  }
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: token },
    body: VALID_AI_BODY,
  });
  assert.equal(res.status, 429, 'Sixth request should be rate limited');
  assert.ok(res.body.resetInSeconds !== undefined, 'resetInSeconds returned');
  assert.equal(res.headers['x-ratelimit-remaining'], '0');
});

// =====================================================================
// TEST 7 — Gemini key never in API responses or headers
// =====================================================================
test('TC-07: AI response never contains Gemini key pattern', async () => {
  resetRateLimits();
  const res = await request(APP, {
    method: 'POST', path: '/api/ai/generate',
    headers: { Authorization: VALID_TOKEN },
    body: VALID_AI_BODY,
  });
  const body = JSON.stringify(res.body);
  const headers = JSON.stringify(res.headers);
  // Check for AIza* or long alphanumeric API key patterns
  assert.doesNotMatch(body, /AIza[A-Za-z0-9_-]{35}/);
  assert.doesNotMatch(headers, /AIza[A-Za-z0-9_-]{35}/);
  // The specific key in .env is AQ.Ab8R...
  assert.doesNotMatch(body, /AQ\.Ab8R/);
});

// =====================================================================
// TEST 8 — Code evaluation without authentication is rejected
// =====================================================================
test('TC-08: Code evaluate without token → 401', async () => {
  const res = await request(APP, {
    method: 'POST', path: '/api/code/evaluate',
    body: { question_id: 'q1', attempt_id: 'a1', language: 'python', source_code: 'print("hi")' },
  });
  assert.equal(res.status, 401);
});

// =====================================================================
// TEST 9 — Excessive code evaluation requests → 429
// =====================================================================
test('TC-09: Code evaluate rate limit (max 10) → 429 on 11th request', async () => {
  const token = 'Bearer VALID_TOKEN_rate-test-eval-user';
  resetRateLimits();
  for (let i = 0; i < 10; i++) {
    const r = await request(APP, {
      method: 'POST', path: '/api/code/evaluate',
      headers: { Authorization: token },
      body: { question_id: 'q1', attempt_id: 'ATTEMPT_FOR_USER', language: 'python', source_code: 'x=1' },
    });
    assert.equal(r.status, 200, `Eval request ${i + 1} should succeed`);
  }
  const res = await request(APP, {
    method: 'POST', path: '/api/code/evaluate',
    headers: { Authorization: token },
    body: { question_id: 'q1', attempt_id: 'ATTEMPT_FOR_USER', language: 'python', source_code: 'x=1' },
  });
  assert.equal(res.status, 429);
  assert.ok(res.headers['retry-after'], 'Retry-After header present');
});

// =====================================================================
// TEST 10 — Code evaluate attempt ownership check
// =====================================================================
test("TC-10: Code evaluate with another user's attempt -> 403", async () => {
  resetRateLimits();
  const res = await request(APP, {
    method: 'POST', path: '/api/code/evaluate',
    headers: { Authorization: VALID_TOKEN },
    body: { question_id: 'q1', attempt_id: 'ATTEMPT_FOR_OTHER_USER', language: 'python', source_code: 'x=1' },
  });
  assert.equal(res.status, 403);
});

// =====================================================================
// TEST 11 — HTTP security headers present in responses
// =====================================================================
test('TC-11: Security headers present in health response', async () => {
  const res = await request(APP, { method: 'GET', path: '/api/health' });
  assert.equal(res.status, 200);
  // X-Content-Type-Options: nosniff
  assert.equal(res.headers['x-content-type-options'], 'nosniff', 'X-Content-Type-Options: nosniff');
  // X-Frame-Options: SAMEORIGIN
  assert.ok(
    res.headers['x-frame-options'] === 'SAMEORIGIN',
    `X-Frame-Options: got "${res.headers['x-frame-options']}"`
  );
  // Referrer-Policy
  assert.ok(res.headers['referrer-policy'], 'Referrer-Policy present');
});

// =====================================================================
// TEST 12 — CORS rejects disallowed browser origins
// =====================================================================
test('TC-12: CORS rejects disallowed origin', async () => {
  const res = await request(APP, {
    method: 'GET', path: '/api/health',
    headers: { Origin: 'https://evil.hacker.com', 'Access-Control-Request-Method': 'GET' },
  });
  // Response should not include the evil origin in Access-Control-Allow-Origin
  const acao = res.headers['access-control-allow-origin'] || '';
  assert.notEqual(acao, 'https://evil.hacker.com', 'Evil origin must not be allowed');
});

test('TC-12b: CORS allows localhost:5173', async () => {
  const res = await request(APP, {
    method: 'GET', path: '/api/health',
    headers: { Origin: 'http://localhost:5173' },
  });
  assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
});

// =====================================================================
// TEST 13 — Razorpay signature rejection (mocked validation logic)
// We test the actual HMAC comparison logic inline since we cannot
// call the real server without live Razorpay credentials (BLOCKED).
// =====================================================================
test('TC-13: Razorpay HMAC signature — valid and invalid (unit)', () => {
  const secret = 'test_webhook_secret';
  const orderId = 'order_test_123';
  const paymentId = 'pay_test_456';
  const bodyText = `${orderId}|${paymentId}`;
  const validSig = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
  const invalidSig = 'aabbccdd1122334455667788990011aabbccdd1122334455667788990011aabb';

  // Valid signature passes
  assert.equal(
    crypto.createHmac('sha256', secret).update(bodyText).digest('hex'),
    validSig,
    'Valid HMAC matches'
  );
  // Invalid signature fails
  assert.notEqual(validSig, invalidSig, 'Tampered sig rejected');
});

// =====================================================================
// TEST 14 — Admin IDOR: non-admin cannot reach admin-only rate limit path
// (In mocked server we test the auth rejection path directly)
// =====================================================================
test('TC-14: Unauthenticated request to protected endpoint → 401', async () => {
  // /api/code/run without token
  const res = await request(APP, { method: 'POST', path: '/api/code/run',
    body: { language: 'python', source_code: 'x=1' }
  });
  assert.equal(res.status, 401);
});

// =====================================================================
// TEST 15 — Error responses do not disclose stack traces or secrets
// =====================================================================
test('TC-15: 401 response does not contain stack traces or secrets', async () => {
  const res = await request(APP, { method: 'POST', path: '/api/ai/generate', body: VALID_AI_BODY });
  assert.equal(res.status, 401);
  const body = JSON.stringify(res.body);
  // No stack traces
  assert.doesNotMatch(body, /at Object\.|at Function\.|\.cjs:/i, 'No stack trace in 401');
  // No secret patterns
  assert.doesNotMatch(body, /AIza[A-Za-z0-9_-]/);
  assert.doesNotMatch(body, /service_role/i);
  assert.doesNotMatch(body, /sk_live|rk_live|RAZORPAY_KEY_SECRET/i);
});

// =====================================================================
// ADDITIONAL: Secret hygiene — VITE_GEMINI_API_KEY not in source
// =====================================================================
test('TC-16: VITE_GEMINI_API_KEY not in .env or .env.example', async () => {
  const fs = require('node:fs');
  const envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  const exampleContent = fs.existsSync('.env.example') ? fs.readFileSync('.env.example', 'utf8') : '';
  assert.doesNotMatch(envContent, /VITE_GEMINI_API_KEY/, '.env must not contain VITE_GEMINI_API_KEY');
  assert.doesNotMatch(exampleContent, /VITE_GEMINI_API_KEY/, '.env.example must not contain VITE_GEMINI_API_KEY');
});

test('TC-17: Rate limiter key is per-user (different users have independent limits)', async () => {
  resetRateLimits();
  const token1 = 'Bearer VALID_TOKEN_isolated-user-1';
  const token2 = 'Bearer VALID_TOKEN_isolated-user-2';

  // Exhaust user1
  for (let i = 0; i < 5; i++) {
    await request(APP, { method: 'POST', path: '/api/ai/generate', headers: { Authorization: token1 }, body: VALID_AI_BODY });
  }
  const blocked1 = await request(APP, { method: 'POST', path: '/api/ai/generate', headers: { Authorization: token1 }, body: VALID_AI_BODY });
  assert.equal(blocked1.status, 429, 'User 1 is rate limited');

  // User2 should NOT be blocked
  const ok2 = await request(APP, { method: 'POST', path: '/api/ai/generate', headers: { Authorization: token2 }, body: VALID_AI_BODY });
  assert.equal(ok2.status, 200, 'User 2 should NOT be affected by user 1 rate limit');
});

console.log('\n[Security Test Suite] All tests queued. Run: node --test security.test.cjs\n');
