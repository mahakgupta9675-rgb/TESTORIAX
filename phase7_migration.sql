-- =====================================================
-- PHASE 7 MIGRATION: REAL ANALYTICS & PERFORMANCE INTELLIGENCE
-- Run this entire script in your Supabase SQL Editor
-- =====================================================

-- 1. Function: Get Creator Test Analytics
-- Returns overall aggregate statistics for a test owned by the calling creator
DROP FUNCTION IF EXISTS public.get_creator_test_analytics(UUID);

CREATE OR REPLACE FUNCTION public.get_creator_test_analytics(p_test_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_creator_id           UUID;
    v_total_registrations  BIGINT := 0;
    v_total_attempts       BIGINT := 0;
    v_completed_attempts   BIGINT := 0;
    v_in_progress_attempts BIGINT := 0;
    v_avg_score            NUMERIC := 0;
    v_highest_score        NUMERIC := 0;
    v_lowest_score         NUMERIC := 0;
    v_test_total_marks     NUMERIC := 0;
    v_avg_percentage       NUMERIC := 0;
    v_completion_rate      NUMERIC := 0;
    v_avg_time_sec         NUMERIC := 0;
    v_fastest_time_sec     NUMERIC := 0;
    v_slowest_time_sec     NUMERIC := 0;
BEGIN
    -- Security check: Verify caller is creator of this test
    SELECT creator_id, COALESCE(total_marks, 0)
    INTO v_creator_id, v_test_total_marks
    FROM public.tests
    WHERE id = p_test_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Test not found: %', p_test_id;
    END IF;

    IF v_creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You are not the owner of this test';
    END IF;

    -- Count registrations
    SELECT COUNT(*) INTO v_total_registrations
    FROM public.test_registrations
    WHERE test_id = p_test_id;

    -- Count total & completed attempts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('submitted', 'expired')),
        COUNT(*) FILTER (WHERE status = 'in_progress')
    INTO v_total_attempts, v_completed_attempts, v_in_progress_attempts
    FROM public.attempts
    WHERE test_id = p_test_id;

    IF v_total_attempts > 0 THEN
        v_completion_rate := ROUND((v_completed_attempts::NUMERIC / v_total_attempts::NUMERIC) * 100, 1);
    END IF;

    -- Aggregate completed attempt scores and times
    IF v_completed_attempts > 0 THEN
        SELECT 
            ROUND(AVG(score), 1),
            MAX(score),
            MIN(score),
            ROUND(AVG(
                CASE WHEN total_marks > 0 
                     THEN (score::NUMERIC / total_marks::NUMERIC) * 100 
                     ELSE 0 END
            ), 1),
            ROUND(AVG(
                CASE WHEN submitted_at IS NOT NULL AND started_at IS NOT NULL 
                     THEN EXTRACT(EPOCH FROM (submitted_at - started_at))
                     ELSE NULL END
            ), 0),
            ROUND(MIN(
                CASE WHEN submitted_at IS NOT NULL AND started_at IS NOT NULL 
                     THEN EXTRACT(EPOCH FROM (submitted_at - started_at))
                     ELSE NULL END
            ), 0),
            ROUND(MAX(
                CASE WHEN submitted_at IS NOT NULL AND started_at IS NOT NULL 
                     THEN EXTRACT(EPOCH FROM (submitted_at - started_at))
                     ELSE NULL END
            ), 0)
        INTO 
            v_avg_score,
            v_highest_score,
            v_lowest_score,
            v_avg_percentage,
            v_avg_time_sec,
            v_fastest_time_sec,
            v_slowest_time_sec
        FROM public.attempts
        WHERE test_id = p_test_id
          AND status IN ('submitted', 'expired');
    END IF;

    RETURN jsonb_build_object(
        'test_id',               p_test_id,
        'total_registrations',  v_total_registrations,
        'total_attempts',       v_total_attempts,
        'completed_attempts',   v_completed_attempts,
        'in_progress_attempts', v_in_progress_attempts,
        'avg_score',            COALESCE(v_avg_score, 0),
        'highest_score',        COALESCE(v_highest_score, 0),
        'lowest_score',         COALESCE(v_lowest_score, 0),
        'total_marks',          v_test_total_marks,
        'avg_percentage',       COALESCE(v_avg_percentage, 0),
        'completion_rate',      COALESCE(v_completion_rate, 0),
        'avg_time_seconds',     COALESCE(v_avg_time_sec, 0),
        'fastest_time_seconds', COALESCE(v_fastest_time_sec, 0),
        'slowest_time_seconds', COALESCE(v_slowest_time_sec, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_test_analytics(UUID) TO authenticated;

-- 2. Function: Get Creator Question Analytics
-- Calculates per-question performance metrics for a test owned by creator
DROP FUNCTION IF EXISTS public.get_creator_question_analytics(UUID);

CREATE OR REPLACE FUNCTION public.get_creator_question_analytics(p_test_id UUID)
RETURNS TABLE (
    question_id      UUID,
    question_text    TEXT,
    question_type    TEXT,
    order_number     INTEGER,
    marks            INTEGER,
    total_attempts   BIGINT,
    answered_count   BIGINT,
    correct_count    BIGINT,
    incorrect_count  BIGINT,
    accuracy         NUMERIC,
    avg_marks        NUMERIC,
    skip_rate        NUMERIC,
    difficulty_label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_creator_id         UUID;
    v_completed_attempts BIGINT;
BEGIN
    -- Security check
    SELECT creator_id INTO v_creator_id FROM public.tests WHERE id = p_test_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Test not found: %', p_test_id;
    END IF;
    IF v_creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You are not the owner of this test';
    END IF;

    -- Total completed attempts for test
    SELECT COUNT(*) INTO v_completed_attempts
    FROM public.attempts
    WHERE test_id = p_test_id
      AND status IN ('submitted', 'expired');

    RETURN QUERY
    WITH question_answers AS (
        SELECT 
            q.id                                         AS q_id,
            q.question_text                              AS q_text,
            q.question_type                              AS q_type,
            q.order_number                               AS q_order,
            q.marks                                      AS q_marks,
            COUNT(ans.id)                                AS ans_cnt,
            COUNT(ans.id) FILTER (WHERE ans.is_correct)  AS cor_cnt,
            COUNT(ans.id) FILTER (WHERE NOT ans.is_correct AND ans.answer_data IS NOT NULL) AS incor_cnt,
            COALESCE(ROUND(AVG(ans.marks_awarded), 2), 0) AS avg_m
        FROM public.questions q
        LEFT JOIN public.answers ans ON ans.question_id = q.id 
            AND ans.attempt_id IN (
                SELECT a.id FROM public.attempts a 
                WHERE a.test_id = p_test_id AND a.status IN ('submitted', 'expired')
            )
        WHERE q.test_id = p_test_id AND q.status = 'active'
        GROUP BY q.id, q.question_text, q.question_type, q.order_number, q.marks
    )
    SELECT 
        qa.q_id                                          AS question_id,
        qa.q_text                                        AS question_text,
        qa.q_type                                        AS question_type,
        qa.q_order                                       AS order_number,
        qa.q_marks                                       AS marks,
        v_completed_attempts                             AS total_attempts,
        qa.ans_cnt                                       AS answered_count,
        qa.cor_cnt                                       AS correct_count,
        qa.incor_cnt                                     AS incorrect_count,
        CASE WHEN qa.ans_cnt > 0 
             THEN ROUND((qa.cor_cnt::NUMERIC / qa.ans_cnt::NUMERIC) * 100, 1)
             ELSE 0 END                                  AS accuracy,
        qa.avg_m                                         AS avg_marks,
        CASE WHEN v_completed_attempts > 0 
             THEN ROUND(((v_completed_attempts - qa.ans_cnt)::NUMERIC / v_completed_attempts::NUMERIC) * 100, 1)
             ELSE 0 END                                  AS skip_rate,
        CASE 
            WHEN qa.ans_cnt = 0 THEN 'No Data'
            WHEN (qa.cor_cnt::NUMERIC / qa.ans_cnt::NUMERIC) >= 0.75 THEN 'Easy'
            WHEN (qa.cor_cnt::NUMERIC / qa.ans_cnt::NUMERIC) >= 0.40 THEN 'Medium'
            ELSE 'Hard'
        END                                              AS difficulty_label
    FROM question_answers qa
    ORDER BY qa.q_order ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_question_analytics(UUID) TO authenticated;

-- 3. Function: Get Student Detailed Performance Analytics
-- Returns student's private stats securely
DROP FUNCTION IF EXISTS public.get_student_performance_analytics(UUID);

CREATE OR REPLACE FUNCTION public.get_student_performance_analytics(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_attempts     BIGINT := 0;
    v_completed_attempts BIGINT := 0;
    v_avg_score          NUMERIC := 0;
    v_best_percentage    NUMERIC := 0;
    v_avg_percentage     NUMERIC := 0;
    v_avg_time_sec       NUMERIC := 0;
    v_fastest_time_sec   NUMERIC := 0;
    v_slowest_time_sec   NUMERIC := 0;
BEGIN
    -- Security check: Can only query own student data unless superuser
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized access to student analytics';
    END IF;

    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('submitted', 'expired'))
    INTO v_total_attempts, v_completed_attempts
    FROM public.attempts
    WHERE user_id = p_user_id;

    IF v_completed_attempts > 0 THEN
        SELECT 
            ROUND(AVG(score), 1),
            ROUND(MAX(CASE WHEN total_marks > 0 THEN (score::NUMERIC / total_marks::NUMERIC) * 100 ELSE 0 END), 1),
            ROUND(AVG(CASE WHEN total_marks > 0 THEN (score::NUMERIC / total_marks::NUMERIC) * 100 ELSE 0 END), 1),
            ROUND(AVG(CASE WHEN submitted_at IS NOT NULL AND started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (submitted_at - started_at)) ELSE NULL END), 0),
            ROUND(MIN(CASE WHEN submitted_at IS NOT NULL AND started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (submitted_at - started_at)) ELSE NULL END), 0),
            ROUND(MAX(CASE WHEN submitted_at IS NOT NULL AND started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (submitted_at - started_at)) ELSE NULL END), 0)
        INTO 
            v_avg_score,
            v_best_percentage,
            v_avg_percentage,
            v_avg_time_sec,
            v_fastest_time_sec,
            v_slowest_time_sec
        FROM public.attempts
        WHERE user_id = p_user_id
          AND status IN ('submitted', 'expired');
    END IF;

    RETURN jsonb_build_object(
        'user_id',              p_user_id,
        'total_attempts',       v_total_attempts,
        'completed_attempts',   v_completed_attempts,
        'avg_score',            COALESCE(v_avg_score, 0),
        'best_percentage',      COALESCE(v_best_percentage, 0),
        'avg_percentage',       COALESCE(v_avg_percentage, 0),
        'avg_time_seconds',     COALESCE(v_avg_time_sec, 0),
        'fastest_time_seconds', COALESCE(v_fastest_time_sec, 0),
        'slowest_time_seconds', COALESCE(v_slowest_time_sec, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_performance_analytics(UUID) TO authenticated;
