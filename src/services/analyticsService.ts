import supabase from '../lib/supabase';

export interface CreatorTestAnalytics {
  test_id: string;
  total_registrations: number;
  total_attempts: number;
  completed_attempts: number;
  in_progress_attempts: number;
  avg_score: number;
  highest_score: number;
  lowest_score: number;
  total_marks: number;
  avg_percentage: number;
  completion_rate: number;
  avg_time_seconds: number;
  fastest_time_seconds: number;
  slowest_time_seconds: number;
}

export interface CreatorQuestionAnalytics {
  question_id: string;
  question_text: string;
  question_type: string;
  order_number: number;
  marks: number;
  total_attempts: number;
  answered_count: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  avg_marks: number;
  skip_rate: number;
  difficulty_label: 'Easy' | 'Medium' | 'Hard' | 'No Data';
}

export const analyticsService = {
  /**
   * Creator Test Overall Analytics
   * Fetches registrations, attempts, scores, percentage, completion rates, and time stats.
   */
  async getCreatorTestAnalytics(testId: string): Promise<{ data: CreatorTestAnalytics | null; error: any }> {
    try {
      // First attempt using server-side RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_creator_test_analytics', {
        p_test_id: testId
      });

      if (!rpcErr && rpcData) {
        return { data: rpcData as CreatorTestAnalytics, error: null };
      }

      // Fallback: Client-side aggregation
      const { data: test, error: testErr } = await supabase
        .from('tests')
        .select('total_marks, creator_id')
        .eq('id', testId)
        .single();

      if (testErr) throw testErr;

      const { count: regCount } = await supabase
        .from('test_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testId);

      const { data: attempts, error: attErr } = await supabase
        .from('attempts')
        .select('*')
        .eq('test_id', testId);

      if (attErr) throw attErr;

      const totalAttempts = attempts?.length || 0;
      const completedAttempts = attempts?.filter(a => a.status === 'submitted' || a.status === 'expired') || [];
      const completedCount = completedAttempts.length;
      const inProgressCount = attempts?.filter(a => a.status === 'in_progress').length || 0;

      let avgScore = 0;
      let highestScore = 0;
      let lowestScore = 0;
      let avgPercentage = 0;
      let avgTimeSec = 0;
      let fastestTimeSec = 0;
      let slowestTimeSec = 0;

      if (completedCount > 0) {
        let totalScoreSum = 0;
        let totalPctSum = 0;
        const times: number[] = [];
        highestScore = -Infinity;
        lowestScore = Infinity;

        completedAttempts.forEach(a => {
          const s = a.score || 0;
          totalScoreSum += s;
          if (s > highestScore) highestScore = s;
          if (s < lowestScore) lowestScore = s;

          const tm = a.total_marks || test.total_marks || 0;
          const pct = tm > 0 ? (s / tm) * 100 : 0;
          totalPctSum += pct;

          if (a.submitted_at && a.started_at) {
            const diffSec = Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000);
            if (diffSec > 0) times.push(diffSec);
          }
        });

        avgScore = Math.round((totalScoreSum / completedCount) * 10) / 10;
        avgPercentage = Math.round((totalPctSum / completedCount) * 10) / 10;

        if (times.length > 0) {
          avgTimeSec = Math.round(times.reduce((acc, t) => acc + t, 0) / times.length);
          fastestTimeSec = Math.min(...times);
          slowestTimeSec = Math.max(...times);
        }
      } else {
        highestScore = 0;
        lowestScore = 0;
      }

      const completionRate = totalAttempts > 0 ? Math.round((completedCount / totalAttempts) * 1000) / 10 : 0;

      return {
        data: {
          test_id: testId,
          total_registrations: regCount || 0,
          total_attempts: totalAttempts,
          completed_attempts: completedCount,
          in_progress_attempts: inProgressCount,
          avg_score: avgScore,
          highest_score: highestScore,
          lowest_score: lowestScore,
          total_marks: test.total_marks || 0,
          avg_percentage: avgPercentage,
          completion_rate: completionRate,
          avg_time_seconds: avgTimeSec,
          fastest_time_seconds: fastestTimeSec,
          slowest_time_seconds: slowestTimeSec
        },
        error: null
      };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Creator Question Analytics
   * Fetches per-question metrics (attempts, answered, correct, incorrect, accuracy, avg marks, skip rate, difficulty label).
   */
  async getCreatorQuestionAnalytics(testId: string): Promise<{ data: CreatorQuestionAnalytics[] | null; error: any }> {
    try {
      // First attempt using server-side RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_creator_question_analytics', {
        p_test_id: testId
      });

      if (!rpcErr && rpcData) {
        return { data: rpcData as CreatorQuestionAnalytics[], error: null };
      }

      // Fallback: Client-side aggregation
      const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .eq('status', 'active')
        .order('order_number', { ascending: true });

      if (qErr) throw qErr;
      if (!questions || questions.length === 0) return { data: [], error: null };

      const { data: completedAttempts } = await supabase
        .from('attempts')
        .select('id')
        .eq('test_id', testId)
        .in('status', ['submitted', 'expired']);

      const totalCompletedAttempts = completedAttempts?.length || 0;
      const attemptIds = completedAttempts?.map(a => a.id) || [];

      let answers: any[] = [];
      if (attemptIds.length > 0) {
        const { data: ansData } = await supabase
          .from('answers')
          .select('question_id, is_correct, marks_awarded, answer_data')
          .in('attempt_id', attemptIds);

        answers = ansData || [];
      }

      const questionStats: CreatorQuestionAnalytics[] = questions.map(q => {
        const qAnswers = answers.filter(a => a.question_id === q.id && a.answer_data !== null);
        const answeredCount = qAnswers.length;
        const correctCount = qAnswers.filter(a => a.is_correct).length;
        const incorrectCount = qAnswers.filter(a => !a.is_correct).length;
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 1000) / 10 : 0;
        const sumMarks = qAnswers.reduce((acc, a) => acc + (a.marks_awarded || 0), 0);
        const avgMarks = answeredCount > 0 ? Math.round((sumMarks / answeredCount) * 100) / 100 : 0;
        const skipRate = totalCompletedAttempts > 0 
          ? Math.round(((totalCompletedAttempts - answeredCount) / totalCompletedAttempts) * 1000) / 10 
          : 0;

        let difficultyLabel: 'Easy' | 'Medium' | 'Hard' | 'No Data' = 'No Data';
        if (answeredCount > 0) {
          if (accuracy >= 75) difficultyLabel = 'Easy';
          else if (accuracy >= 40) difficultyLabel = 'Medium';
          else difficultyLabel = 'Hard';
        }

        return {
          question_id: q.id,
          question_text: q.question_text || '',
          question_type: q.question_type || 'mcq',
          order_number: q.order_number || 0,
          marks: q.marks || 0,
          total_attempts: totalCompletedAttempts,
          answered_count: answeredCount,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          accuracy,
          avg_marks: avgMarks,
          skip_rate: skipRate,
          difficulty_label: difficultyLabel
        };
      });

      return { data: questionStats, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Fetches monthly performance trends (attempts and average score)
   */
  async getMonthlyTrends(userId: string) {
    try {
      const { data: attempts, error } = await supabase
        .from('attempts')
        .select('started_at, score, total_marks')
        .eq('user_id', userId)
        .in('status', ['submitted', 'expired']);

      if (error) throw error;

      const monthlyStats: Record<string, { attempts: number; totalScore: number; countForScore: number }> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const d = new Date();
      for (let i = 5; i >= 0; i--) {
        const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
        monthlyStats[months[past.getMonth()]] = { attempts: 0, totalScore: 0, countForScore: 0 };
      }

      attempts?.forEach(a => {
        const date = new Date(a.started_at);
        const month = months[date.getMonth()];
        if (monthlyStats[month]) {
          monthlyStats[month].attempts += 1;
          const percent = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
          monthlyStats[month].totalScore += percent;
          monthlyStats[month].countForScore += 1;
        }
      });

      const trends = Object.keys(monthlyStats).map(month => ({
        month,
        Attempts: monthlyStats[month].attempts,
        AvgScore: monthlyStats[month].countForScore > 0 
          ? Math.round(monthlyStats[month].totalScore / monthlyStats[month].countForScore) 
          : 0
      }));

      return { data: trends, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Fetches accuracy grouped by Test Title (used as Subject/Category)
   */
  async getSubjectAccuracy(userId: string) {
    try {
      const { data: attempts, error: attError } = await supabase
        .from('attempts')
        .select(`
          id,
          tests:test_id (title)
        `)
        .eq('user_id', userId)
        .in('status', ['submitted', 'expired']);

      if (attError) throw attError;
      if (!attempts || attempts.length === 0) return { data: [], error: null };

      const attemptIds = attempts.map(a => a.id);
      const { data: answers, error: ansError } = await supabase
        .from('answers')
        .select('attempt_id, is_correct')
        .in('attempt_id', attemptIds);

      if (ansError) throw ansError;

      const attemptAnswers: Record<string, { correct: number; total: number }> = {};
      answers?.forEach(ans => {
        if (!attemptAnswers[ans.attempt_id]) {
          attemptAnswers[ans.attempt_id] = { correct: 0, total: 0 };
        }
        attemptAnswers[ans.attempt_id].total += 1;
        if (ans.is_correct) attemptAnswers[ans.attempt_id].correct += 1;
      });

      const subjectStats: Record<string, { correct: number; total: number }> = {};
      attempts.forEach(a => {
        const title = (a.tests as any)?.title || 'General';
        const subject = title.split(' ')[0].substring(0, 15);
        
        if (!subjectStats[subject]) {
          subjectStats[subject] = { correct: 0, total: 0 };
        }
        const stats = attemptAnswers[a.id];
        if (stats) {
          subjectStats[subject].correct += stats.correct;
          subjectStats[subject].total += stats.total;
        }
      });

      const radarData = Object.keys(subjectStats).map(subject => {
        const stats = subjectStats[subject];
        const skill = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        return {
          subject,
          Skill: skill
        };
      });

      return { data: radarData, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Generates 6-month study heatmap activity from real attempt dates
   */
  async getWeeklyStudyHours(userId: string) {
    try {
      const { data: attempts, error } = await supabase
        .from('attempts')
        .select('started_at')
        .eq('user_id', userId);

      if (error) throw error;

      const dayCounts: Record<string, number> = {};
      attempts?.forEach(a => {
        const dateStr = new Date(a.started_at).toISOString().split('T')[0];
        dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1;
      });

      const weeks = [];
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - (24 * 7));

      let currentDate = startDate;
      for (let w = 0; w < 24; w++) {
        const days = [];
        for (let d = 0; d < 7; d++) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const count = dayCounts[dateStr] || 0;
          
          let intensity = 0;
          if (count === 1) intensity = 1;
          else if (count === 2) intensity = 2;
          else if (count === 3) intensity = 3;
          else if (count >= 4) intensity = 4;

          days.push(intensity);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        weeks.push(days);
      }

      return { data: weeks, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Topic Performance calculation (weak & strong topics from real data)
   */
  async getTopicPerformance(userId: string) {
    try {
      const radar = await this.getSubjectAccuracy(userId);
      if (radar.error || !radar.data) throw radar.error;

      const data = radar.data;
      const sorted = [...data].sort((a, b) => a.Skill - b.Skill);

      const weakTopics = sorted.filter(t => t.Skill < 70).map(t => ({
        topic: t.subject,
        confidence: t.Skill
      }));

      const strongTopics = sorted.filter(t => t.Skill >= 70).reverse().map(t => ({
        topic: t.subject,
        confidence: t.Skill
      }));

      return { data: { weakTopics, strongTopics }, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
};

export default analyticsService;
