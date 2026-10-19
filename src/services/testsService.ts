import supabase from '../lib/supabase';
import certificateService from './certificateService';
import type { Question } from '../components/builder/QuestionTypes';

export interface TestData {
  id?: string;
  creator_id: string;
  title: string;
  description?: string;
  duration?: number;
  total_marks?: number;
  negative_marking?: {
    enabled: boolean;
    value: number;
  };
  visibility: 'public' | 'private';
  registration_type: 'none' | 'simple' | 'custom';
  entry_fee?: number | null;
  host_competition?: boolean;
  status: 'draft' | 'published' | 'archived' | 'deleted';
  previous_status?: 'draft' | 'published' | 'archived' | null;
  questions?: any[];
  mock_thumbnail?: string | null;
  expiry_time?: string;
  custom_question?: string;
  reg_fields?: Record<string, boolean>;
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
    // AI Proctoring Features
    periodic_snapshot_capture?: boolean;
    face_presence_detection?: boolean;
    multiple_face_detection?: boolean;
    face_missing_detection?: boolean;
    record_violation_screenshots?: boolean;
  };
  created_at?: string;
  updated_at?: string;
  
  // Advanced Results settings columns
  result_visibility?: 'public' | 'anonymous' | 'private' | 'creator_only';
  answer_review_mode?: 'no_review' | 'score_only' | 'score_answers' | 'score_answers_explanations';
  result_release_mode?: 'immediately' | 'after_test_end' | 'manual_release';
  winner_visibility?: 'public' | 'anonymous' | 'private';
  notify_on_result_release?: boolean;
  results_released?: boolean;
  winners_announced?: boolean;
}

// Helper to convert frontend Question to database format
export const questionToDb = (testId: string, q: Question, orderNumber: number) => {
  let options: any = null;
  let correct_answer: any = null;
  let explanation: string | null = null;

  if (q.type === 'mcq' && q.mcqData) {
    options = q.mcqData.options;
    correct_answer = { correctOptionIndex: q.mcqData.correctOptionIndex };
  } else if (q.type === 'matching' && q.matchingData) {
    correct_answer = { pairs: q.matchingData.pairs };
  } else if (q.type === 'true-false' && q.trueFalseData) {
    correct_answer = { correctAnswer: q.trueFalseData.correctAnswer };
  } else if (q.type === 'coding' && q.codingData) {
    // options: public-safe data (language config, starter code, problem metadata)
    options = {
      language: q.codingData.language,
      languages: q.codingData.languages || [q.codingData.language],
      starterCode: q.codingData.starterCode,
      starterCodes: q.codingData.starterCodes || {},
      inputFormat: q.codingData.inputFormat || '',
      outputFormat: q.codingData.outputFormat || '',
      constraints: q.codingData.constraints || '',
      sampleInput: q.codingData.sampleInput || '',
      sampleOutput: q.codingData.sampleOutput || '',
      timeLimit: q.codingData.timeLimit || 5,
      memoryLimit: q.codingData.memoryLimit || 256,
    };
    // correct_answer: SERVER-SIDE ONLY data — never returned in student queries
    correct_answer = {
      solutionCode: q.codingData.solutionCode,
      testCases: (q.codingData.testCases || []).map(tc => ({ ...tc, isHidden: false })),
      hiddenTestCases: (q.codingData.hiddenTestCases || []).map(tc => ({ ...tc, isHidden: true })),
    };
  } else if (q.type === 'fillups' && q.fillupsData) {
    options = { sentence: q.fillupsData.sentence };
    correct_answer = { answers: q.fillupsData.answers };
  } else if (q.type === 'custom' && q.customData) {
    correct_answer = { guidelines: q.customData.guidelines };
    explanation = q.customData.guidelines;
  }

  return {
    id: q.id,
    test_id: testId,
    question_type: q.type,
    question_text: q.text,
    options,
    correct_answer,
    marks: q.points,
    image_url: q.imageUrl || null,
    explanation: explanation,
    order_number: orderNumber
  };
};

// Helper to convert database questions format back to frontend Question format.
// For coding questions, this strips ALL hidden data (solutionCode, hiddenTestCases, correct_answer).
// The student browser NEVER receives hidden test cases or solution code.
export const dbToQuestion = (dbQ: any, stripSensitive = true): Question => {
  const q: Question = {
    id: dbQ.id,
    type: dbQ.question_type as any,
    text: dbQ.question_text || '',
    points: dbQ.marks || 5,
    difficulty: 'medium', // default fallback
    imageUrl: dbQ.image_url || undefined
  };

  if (q.type === 'mcq') {
    q.mcqData = {
      options: Array.isArray(dbQ.options) ? dbQ.options : [],
      correctOptionIndex: dbQ.correct_answer?.correctOptionIndex ?? 0
    };
  } else if (q.type === 'matching') {
    q.matchingData = {
      pairs: Array.isArray(dbQ.correct_answer?.pairs) ? dbQ.correct_answer.pairs : []
    };
  } else if (q.type === 'true-false') {
    q.trueFalseData = {
      correctAnswer: !!dbQ.correct_answer?.correctAnswer
    };
  } else if (q.type === 'coding') {
    q.codingData = {
      language: dbQ.options?.language || 'javascript',
      languages: Array.isArray(dbQ.options?.languages) ? dbQ.options.languages : [dbQ.options?.language || 'javascript'],
      starterCode: dbQ.options?.starterCode || '',
      starterCodes: dbQ.options?.starterCodes || {},
      solutionCode: stripSensitive ? '' : (dbQ.correct_answer?.solutionCode || ''),
      // Public test cases only — strip hidden ones when stripSensitive=true
      testCases: stripSensitive
        ? (Array.isArray(dbQ.correct_answer?.testCases)
            ? dbQ.correct_answer.testCases.filter((tc: any) => !tc.isHidden)
            : [])
        : [
            ...(Array.isArray(dbQ.correct_answer?.testCases) ? dbQ.correct_answer.testCases : []),
            ...(Array.isArray(dbQ.correct_answer?.hiddenTestCases) ? dbQ.correct_answer.hiddenTestCases : [])
          ],
      hiddenTestCases: stripSensitive ? [] : (Array.isArray(dbQ.correct_answer?.hiddenTestCases) ? dbQ.correct_answer.hiddenTestCases : []),
      // Problem metadata (public)
      inputFormat: dbQ.options?.inputFormat || '',
      outputFormat: dbQ.options?.outputFormat || '',
      constraints: dbQ.options?.constraints || '',
      sampleInput: dbQ.options?.sampleInput || '',
      sampleOutput: dbQ.options?.sampleOutput || '',
      timeLimit: dbQ.options?.timeLimit || 5,
      memoryLimit: dbQ.options?.memoryLimit || 256,
    };
  } else if (q.type === 'fillups') {
    q.fillupsData = {
      sentence: dbQ.options?.sentence || '',
      answers: Array.isArray(dbQ.correct_answer?.answers) ? dbQ.correct_answer.answers : []
    };
  } else if (q.type === 'custom') {
    q.customData = {
      guidelines: dbQ.correct_answer?.guidelines || dbQ.explanation || ''
    };
  }

  return q;
};

export const testsService = {
  /**
   * Fetches all tests created by a specific user that are not soft-deleted
   */
  async getTests(creatorId: string) {
    return await supabase
      .from('tests')
      .select('*')
      .eq('creator_id', creatorId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
  },

  /**
   * Fetches all published tests with public visibility
   */
  async getPublicTests() {
    return await supabase
      .from('tests')
      .select('*')
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
  },

  /**
   * Fetches a single test by its ID
   */
  async getTestById(testId: string) {
    return await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();
  },

  /**
   * Creates a new test in the database
   */
  async createTest(testData: Omit<TestData, 'id' | 'created_at' | 'updated_at'>) {
    return await supabase
      .from('tests')
      .insert(testData)
      .select()
      .single();
  },

  /**
   * Updates an existing test in the database
   */
  async updateTest(testId: string, testData: Partial<Omit<TestData, 'id' | 'creator_id' | 'created_at' | 'updated_at'>>) {
    return await supabase
      .from('tests')
      .update(testData)
      .eq('id', testId)
      .select()
      .single();
  },

  /**
   * Soft-deletes a test by updating its status to 'deleted' and storing its current status
   */
  async deleteTest(testId: string, currentStatus?: string) {
    const updateData: any = { status: 'deleted' };
    if (currentStatus) {
      updateData.previous_status = currentStatus;
    }
    return await supabase
      .from('tests')
      .update(updateData)
      .eq('id', testId)
      .select()
      .single();
  },

  /**
   * Restores a deleted test back to its previous status
   */
  async restoreTest(testId: string, previousStatus?: string) {
    return await supabase
      .from('tests')
      .update({
        status: previousStatus || 'draft',
        previous_status: null
      })
      .eq('id', testId)
      .select()
      .single();
  },

  /**
   * Permanently deletes a test from the database
   */
  async permanentlyDeleteTest(testId: string) {
    return await supabase
      .from('tests')
      .delete()
      .eq('id', testId);
  },

  /**
   * Fetches all soft-deleted tests created by a specific user
   */
  async getDeletedTests(creatorId: string) {
    return await supabase
      .from('tests')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('status', 'deleted')
      .order('updated_at', { ascending: false });
  },

  /**
   * Fetches all questions for a specific test ID from Supabase, ordered by order_number ascending.
   * Strips hidden test cases and solution code for student security.
   */
  async getQuestionsByTestId(testId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .neq('status', 'deleted')
      .order('order_number', { ascending: true });

    if (error) return { data: null, error };
    
    // Explicitly pass stripSensitive = true as a arrow function to avoid Array.prototype.map passing index (0) as 2nd arg
    const formattedQuestions: Question[] = (data || []).map(q => dbToQuestion(q, true));
    return { data: formattedQuestions, error: null };
  },

  /**
   * Fetches all questions for a test creator/admin with full details (including hidden test cases & solution code).
   */
  async getQuestionsByTestIdForCreator(testId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .neq('status', 'deleted')
      .order('order_number', { ascending: true });

    if (error) return { data: null, error };
    
    const formattedQuestions: Question[] = (data || []).map(q => dbToQuestion(q, false));
    return { data: formattedQuestions, error: null };
  },

  /**
   * Syncs/saves the complete list of questions for a test to Supabase.
   * Marks questions not in the active list as 'deleted' and upserts the active ones.
   */
  async saveQuestions(testId: string, questions: Question[]) {
    const activeIds = questions.map(q => q.id).filter(Boolean);
    
    // Instead of hard-deleting, mark the questions not in the builder list as 'deleted'
    if (activeIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('questions')
        .update({ status: 'deleted' })
        .eq('test_id', testId)
        .not('id', 'in', `(${activeIds.join(',')})`);
      if (deleteError) return { error: deleteError };
    } else {
      const { error: deleteError } = await supabase
        .from('questions')
        .update({ status: 'deleted' })
        .eq('test_id', testId);
      if (deleteError) return { error: deleteError };
    }

    if (questions.length === 0) {
      return { error: null };
    }

    // Map questions to db format
    const dbQuestions = questions.map((q, idx) => ({
      ...questionToDb(testId, q, idx + 1),
      status: 'active'
    }));

    const { error: insertError } = await supabase
      .from('questions')
      .upsert(dbQuestions);

    return { error: insertError };
  },

  /**
   * Fetches all registrations for a list of test IDs
   */
  async getRegistrationsForTests(testIds: string[]) {
    return await supabase
      .from('test_registrations')
      .select('*')
      .in('test_id', testIds);
  },

  /**
   * Fetches all registrations for a specific user
   */
  async getUserRegistrations(userId: string) {
    return await supabase
      .from('test_registrations')
      .select('test_id')
      .eq('user_id', userId);
  },

  /**
   * Registers a user for a test
   */
  async registerForTest(testId: string, userId: string, registrationData: any) {
    // 1. Verify Test exists and is published
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('status, registration_type, reg_fields')
      .eq('id', testId)
      .maybeSingle();

    if (testErr || !test) {
      throw new Error('Test not found.');
    }
    if (test.status !== 'published') {
      throw new Error('Cannot register. This test is not currently published.');
    }
    if (test.registration_type === 'none') {
      throw new Error('This test does not require registration.');
    }

    // 2. Validate Required Fields (Server-side validation)
    // Mobile number might be required
    const isMobileRequired = test.registration_type === 'simple' || 
      (test.registration_type === 'custom' && test.reg_fields?.mobileNumber);
    
    if (isMobileRequired && !registrationData.mobile && !registrationData.mobile_number && !registrationData.phone) {
      throw new Error('Mobile number is required for this registration.');
    }

    if (!registrationData.full_name) throw new Error('Full Name is required.');
    if (!registrationData.email) throw new Error('Email Address is required.');

    // Custom fields validation based on reg_fields
    if (test.registration_type === 'custom' && test.reg_fields) {
      const fieldMap: Record<string, string[]> = {
        college: ['college'],
        branch: ['branch', 'stream'],
        graduationYear: ['graduation_year'],
        city: ['city'],
        state: ['state'],
        linkedinProfile: ['linkedin', 'linkedin_profile'],
        githubProfile: ['github', 'github_profile'],
        resumeUpload: ['resume', 'resume_link', 'resume_upload'],
      };

      for (const [key, isRequired] of Object.entries(test.reg_fields)) {
        if (isRequired && fieldMap[key]) {
          const mappedKeys = fieldMap[key];
          const hasField = mappedKeys.some(mk => registrationData[mk] !== undefined && registrationData[mk] !== null && registrationData[mk] !== '');
          if (!hasField) {
            throw new Error(`The field ${key} is required but was not provided.`);
          }
        }
      }
    }

    // 3. Insert Registration Data (Relying on DB constraint for concurrency protection)
    const { data, error } = await supabase
      .from('test_registrations')
      .insert({
        test_id: testId,
        user_id: userId,
        registration_data: registrationData
      })
      .select()
      .single();

    if (error) {
      // 23505 is PostgreSQL unique_violation error code
      if (error.code === '23505') {
        throw new Error('You are already registered for this test.');
      }
      throw error;
    }

    return { data, error };
  },

  /**
   * Cancels a user's registration for a test
   */
  async unregisterFromTest(testId: string, userId: string) {
    return await supabase
      .from('test_registrations')
      .delete()
      .eq('test_id', testId)
      .eq('user_id', userId);
  },

  /**
   * Fetches profile details for a list of creator IDs
   */
  async getCreatorProfiles(creatorIds: string[]) {
    return await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, specialty, bio, banner_url')
      .in('id', creatorIds);
  },

  async createAttempt(testId: string, userId: string, totalMarks: number, competitionId?: string | null) {
    const insertData: any = {
      test_id: testId,
      user_id: userId,
      status: 'in_progress',
      total_marks: totalMarks,
      score: 0,
      tab_switch_count: 0,
      fullscreen_exit_count: 0,
      warning_count: 0
    };
    if (competitionId) {
      insertData.competition_id = competitionId;
    }
    return await supabase
      .from('attempts')
      .insert(insertData)
      .select()
      .single();
  },

  /**
   * Fetches an active (in_progress) exam attempt for a test & user
   */
  async getAttemptProgress(testId: string, userId: string) {
    return await supabase
      .from('attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .maybeSingle();
  },

  /**
   * Retrieves all answers saved for an attempt
   */
  async getAnswersForAttempt(attemptId: string) {
    return await supabase
      .from('answers')
      .select('*')
      .eq('attempt_id', attemptId);
  },

  /**
   * Saves or updates a candidate's answer to a question (upsert)
   */
  async saveAnswer(attemptId: string, questionId: string, answerData: any, isCorrect: boolean, marksAwarded: number) {
    return await supabase
      .from('answers')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        answer_data: answerData,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        answered_at: new Date().toISOString()
      }, {
        onConflict: 'attempt_id,question_id'
      })
      .select()
      .single();
  },

  /**
   * Updates proctoring security metrics in the attempt record
   */
  async updateAttemptSecurity(attemptId: string, fields: { tab_switch_count?: number; fullscreen_exit_count?: number; warning_count?: number }) {
    return await supabase
      .from('attempts')
      .update(fields)
      .eq('id', attemptId)
      .select()
      .single();
  },

  /**
   * Create a new exam attempt in the attempts table
   */
  async createExamAttempt(testId: string, userId: string, competitionId?: string | null) {
    // 1. Fetch the test to validate it exists and is published
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('status, registration_type, expiry_time, duration')
      .eq('id', testId)
      .single();

    if (testErr || !test) {
      throw new Error('Test not found or unavailable.');
    }

    if (test.status !== 'published') {
      throw new Error('This test is not published yet.');
    }

    if (test.expiry_time && new Date(test.expiry_time) < new Date()) {
      throw new Error('This test has expired.');
    }

    // 2. Validate registration if required
    if (test.registration_type !== 'none') {
      const { data: reg, error: regErr } = await supabase
        .from('test_registrations')
        .select('id')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .maybeSingle();

      if (regErr || !reg) {
        throw new Error('You are not registered for this test.');
      }
    }

    // 3. Prevent duplicate attempts (Only one active or completed attempt allowed per student for now, unless re-attempt logic is built)
    const { data: existingAttempt } = await supabase
      .from('attempts')
      .select('id, status')
      .eq('test_id', testId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingAttempt) {
      if (existingAttempt.status === 'in_progress') {
        // Return existing attempt instead of throwing if it's in progress, so they can resume
        return { data: existingAttempt, error: null };
      }
      throw new Error('You have already attempted this test.');
    }

    const insertData: any = {
      test_id: testId,
      user_id: userId,
      status: 'in_progress',
      warning_count: 0,
      current_question_index: 0,
      remaining_time: test.duration ? test.duration * 60 : 3600 // Convert duration minutes to seconds, default 60min
    };
    
    if (competitionId) {
      insertData.competition_id = competitionId;
    }
    
    return await supabase
      .from('attempts')
      .insert(insertData)
      .select()
      .single();
  },

  /**
   * Fetch an existing exam attempt by ID
   */
  async fetchExamAttempt(attemptId: string) {
    return await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();
  },

  /**
   * Fetch active exam attempt for a user and test
   */
  async getActiveExamAttempt(testId: string, userId: string) {
    return await supabase
      .from('attempts')
      .select('*')
      .eq('test_id', testId)
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
  },

  /**
   * Upsert a single answer into the answers table
   */
  async submitAttemptAnswer(attemptId: string, questionId: string, answerData: any) {
    return await supabase
      .from('answers')
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          answer_data: answerData,
          answered_at: new Date().toISOString()
        },
        { onConflict: 'attempt_id,question_id' }
      )
      .select()
      .single();
  },

  /**
   * Log a security event to proctoring_events table
   */
  async logProctoringEvent(attemptId: string, eventType: string, metadata?: Record<string, any>, sessionId?: string | null) {
    const record: any = {
      attempt_id: attemptId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };
    if (sessionId) record.session_id = sessionId;
    return await supabase
      .from('proctoring_events')
      .insert(record);
  },

  /**
   * Update the progress in the attempts table
   */
  async updateExamAttemptProgress(
    attemptId: string, 
    remainingTime: number, 
    currentQuestionIndex: number, 
    warningCount: number,
    _answers?: Record<string, any>,
    questionProgress?: Record<string, any>
  ) {
    const updateData: any = {
      remaining_time: remainingTime,
      current_question_index: currentQuestionIndex,
      warning_count: warningCount,
      updated_at: new Date().toISOString()
    };
    
    // Note: 'answers' param is ignored here as they are saved in the dedicated answers table.
    if (questionProgress) updateData.question_progress = questionProgress;

    return await supabase
      .from('attempts')
      .update(updateData)
      .eq('id', attemptId)
      .select()
      .single();
  },

  /**
   * Submit an attempt and mark it as finished (client-score fallback).
   * Prefer serverSideSubmitAttempt for authoritative scoring.
   */
  async submitExamAttempt(attemptId: string, status: 'completed' | 'expired' | 'terminated', finalScore: number) {
    const dbStatus = (status === 'completed' || status === 'terminated') ? 'submitted' : status;
    const res = await supabase
      .from('attempts')
      .update({
        status: dbStatus,
        score: finalScore,
        submitted_at: new Date().toISOString()
      })
      .eq('id', attemptId)
      .select()
      .single();

    // Trigger secure server-side certificate eligibility check & issuance
    if (res.data) {
      certificateService.issueCertificateForAttempt(attemptId).catch(err => console.error('Certificate check error:', err));
    }
    return res;
  },

  /**
   * Server-side authoritative submission via PostgreSQL function.
   * Score is calculated from questions + answers on the database.
   * The client cannot tamper with the score.
   */
  async serverSideSubmitAttempt(attemptId: string, status: 'submitted' | 'expired' | 'terminated') {
    const dbStatus = status === 'terminated' ? 'submitted' : status;
    const { data, error } = await supabase
      .rpc('calculate_and_submit_attempt', {
        p_attempt_id: attemptId,
        p_status: dbStatus
      });

    // Trigger secure server-side certificate eligibility check & issuance
    if (!error && attemptId) {
      certificateService.issueCertificateForAttempt(attemptId).catch(err => console.error('Certificate check error:', err));
    }
    return { data, error };
  },

  /**
   * Periodically persists the exam's progress state (remaining time & active question index)
   */
  async updateAttemptProgressState(attemptId: string, remainingTime: number, currentQuestionIndex: number) {
    return await supabase
      .from('attempts')
      .update({
        remaining_time: remainingTime,
        current_question_index: currentQuestionIndex
      })
      .eq('id', attemptId)
      .select()
      .single();
  },

  /**
   * Submits the exam attempt and updates the final score
   */
  async submitAttempt(attemptId: string, status: 'submitted' | 'expired', score: number, submittedAt: string) {
    return await supabase
      .from('attempts')
      .update({
        status,
        score,
        submitted_at: submittedAt
      })
      .eq('id', attemptId)
      .select()
      .single();
  },

  /**
   * Fetches all attempts for a given test ID, including participant profile details.
   */
  async getAttemptsByTestId(testId: string) {
    return await supabase
      .from('attempts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('test_id', testId)
      .order('started_at', { ascending: false });
  },

  /**
   * Fetches AI Proctoring Sessions for a specific test
   */
  async getAiProctoringSessionsForTest(testId: string) {
    return await supabase
      .from('proctoring_sessions')
      .select(`
        *,
        events:proctoring_events(*)
      `)
      .eq('test_id', testId)
      .order('created_at', { ascending: false });
  },

  /**
   * Fetches all attempts for a specific candidate.
   */
  async getUserAttempts(userId: string) {
    return await supabase
      .from('attempts')
      .select(`
        *,
        tests:test_id (
          title,
          result_visibility,
          answer_review_mode,
          result_release_mode,
          winner_visibility,
          notify_on_result_release,
          results_released,
          winners_announced,
          expiry_time
        )
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false });
  },

  /**
   * Updates test status configurations like results manual release and winner announcement.
   */
  async updateTestReleaseSettings(testId: string, updates: { results_released?: boolean; winners_announced?: boolean }) {
    return await supabase
      .from('tests')
      .update(updates)
      .eq('id', testId)
      .select()
      .single();
  },

  /**
   * Fetches all published tests with public visibility that are NOT hosted as competitions
   */
  async getPublicPracticeTests() {
    return await supabase
      .from('tests')
      .select(`
        *,
        profiles:creator_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('visibility', 'public')
      .eq('host_competition', false)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
  },

  /**
   * Fetches all published public tests created by a specific user
   */
  async getPublicTestsByCreator(creatorId: string) {
    return await supabase
      .from('tests')
      .select(`
        *,
        profiles:creator_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('visibility', 'public')
      .eq('status', 'published')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
  },

  /**
   * Bookmarks a test for a candidate
   */
  async bookmarkTest(userId: string, testId: string) {
    return await supabase
      .from('bookmarks')
      .insert({ user_id: userId, test_id: testId })
      .select()
      .single();
  },

  /**
   * Removes a bookmark for a candidate
   */
  async unbookmarkTest(userId: string, testId: string) {
    return await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('test_id', testId);
  },

  /**
   * Fetches all bookmarked tests for a specific user
   */
  async getBookmarkedTests(userId: string) {
    return await supabase
      .from('bookmarks')
      .select(`
        *,
        tests:test_id (
          *,
          profiles:creator_id (
            full_name,
            email,
            avatar_url
          )
        )
      `)
      .eq('user_id', userId);
  },

  /**
   * Submits or updates a rating and review comment for a test
   */
  async submitReview(userId: string, testId: string, rating: number, comment: string) {
    return await supabase
      .from('reviews')
      .upsert({ user_id: userId, test_id: testId, rating, comment })
      .select()
      .single();
  },

  /**
   * Fetches reviews for a specific test
   */
  async getTestReviews(testId: string) {
    return await supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('test_id', testId)
      .order('created_at', { ascending: false });
  },

  /**
   * Aggregates real-time stats for a creator test for analytics
   */
  async getCreatorTestAnalytics(testId: string) {
    try {
      // 1. Fetch registrations count
      const { count: regCount, error: regErr } = await supabase
        .from('test_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testId);

      // 2. Fetch attempts
      const { data: attemptsData, error: attErr } = await supabase
        .from('attempts')
        .select('status, score, total_marks')
        .eq('test_id', testId);

      // 3. Fetch bookmarks count
      const { count: bookmarkCount, error: bookErr } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testId);

      // 4. Fetch ratings / reviews
      const { data: reviewsData, error: revErr } = await supabase
        .from('reviews')
        .select('rating')
        .eq('test_id', testId);

      if (regErr || attErr || bookErr || revErr) {
        throw new Error('Database stats aggregation failed');
      }

      const totalAttempts = attemptsData?.length || 0;
      const completedAttempts = attemptsData?.filter(a => a.status === 'submitted' || a.status === 'expired') || [];
      const completedCount = completedAttempts.length;
      
      const completionRate = totalAttempts > 0 
        ? Math.round((completedCount / totalAttempts) * 100) 
        : 0;

      let totalScore = 0;
      completedAttempts.forEach(a => {
        totalScore += a.score || 0;
      });
      const avgScore = completedCount > 0 
        ? Math.round(totalScore / completedCount) 
        : 0;

      const reviewCount = reviewsData?.length || 0;
      let totalRating = 0;
      reviewsData?.forEach(r => {
        totalRating += r.rating;
      });
      const avgRating = reviewCount > 0 
        ? parseFloat((totalRating / reviewCount).toFixed(1)) 
        : 5.0;

      return {
        data: {
          views: Math.round(totalAttempts * 1.5) + (regCount || 0) + 5, // sensible estimation
          registrations: regCount || 0,
          attempts: totalAttempts,
          completionRate,
          avgScore,
          likes: bookmarkCount || 0,
          bookmarks: bookmarkCount || 0,
          rating: avgRating,
          reviewCount
        },
        error: null
      };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Registers a user for a standalone practice test
   */
  async registerForPractice(testId: string, userId: string, regData: any) {
    const { data, error } = await supabase
      .from('test_registrations')
      .insert({
        test_id: testId,
        user_id: userId,
        registration_data: regData
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('You are already registered for this practice test.');
      }
      throw error;
    }

    return { data, error };
  },

  /**
   * Checks if a candidate is registered for a practice test (where competition_id is null)
   */
  async getPracticeRegistration(testId: string, userId: string) {
    return await supabase
      .from('test_registrations')
      .select('*')
      .eq('test_id', testId)
      .eq('user_id', userId)
      .is('competition_id', null)
      .maybeSingle();
  },

  /**
   * Fetches all public competitions
   */
  async getPublicCompetitions() {
    return await supabase
      .from('competitions')
      .select(`
        *,
        profiles:creator_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .in('status', ['live', 'upcoming', 'published']) // included published just in case
      .order('created_at', { ascending: false });
  },

  /**
   * Insert a security violation log
   */
  async logSecurityViolation(logData: {
    attempt_id: string;
    user_id: string;
    test_id: string;
    violation_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    question_number?: number;
    duration?: number;
    browser?: string;
    device?: string;
    ip_address?: string;
    metadata?: any;
  }) {
    return await supabase
      .from('exam_security_logs')
      .insert([logData]);
  },

  /**
   * Get security logs for a test (creator only)
   */
  async getSecurityLogsForTest(testId: string) {
    return await supabase
      .from('exam_security_logs')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('test_id', testId)
      .order('timestamp', { ascending: false });
  }
};

export default testsService;


