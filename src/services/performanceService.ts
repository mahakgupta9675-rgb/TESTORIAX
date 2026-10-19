import supabase from '../lib/supabase';

export interface PerformanceSummary {
  totalAttempts: number;
  totalCompleted: number;
  totalPracticeTests: number;
  totalCompetitions: number;
  avgScore: number;
  highestScore: number;
  avgAccuracy: number;
  totalTimeHours: string;
  avgCompletionTimeMins: number;
  fastestCompletionMins: number;
  slowestCompletionMins: number;
  certificates: number;
  studyStreak: number;
}

export const performanceService = {
  /**
   * Aggregates the overall performance summary for a user using real database records
   */
  async getPerformanceSummary(userId: string): Promise<{ data: PerformanceSummary | null; error: any }> {
    try {
      // Try server-side RPC first
      await supabase.rpc('get_student_performance_analytics', {
        p_user_id: userId
      });

      // Fetch all attempts for detailed accuracy & practice/comp split calculation
      const { data: attempts, error: attemptsError } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', userId);

      if (attemptsError) throw attemptsError;

      const attemptIds = attempts?.map(a => a.id) || [];
      let answersData: any[] = [];
      if (attemptIds.length > 0) {
        const { data: answers } = await supabase
          .from('answers')
          .select('is_correct, marks_awarded')
          .in('attempt_id', attemptIds);

        answersData = answers || [];
      }

      const { count: certCount } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const totalAttempts = attempts?.length || 0;
      const completedAttempts = attempts?.filter(a => a.status === 'submitted' || a.status === 'expired') || [];
      const completedCount = completedAttempts.length;

      const totalPracticeTests = attempts?.filter(a => !a.competition_id).length || 0;
      const compIds = new Set(attempts?.filter(a => a.competition_id).map(a => a.competition_id));
      const totalCompetitions = compIds.size;

      let totalScoreSum = 0;
      let highestScorePct = 0;
      let totalTimeMs = 0;
      const timesSec: number[] = [];

      completedAttempts.forEach(a => {
        const s = a.score || 0;
        totalScoreSum += s;
        const pct = a.total_marks > 0 ? (s / a.total_marks) * 100 : 0;
        if (pct > highestScorePct) {
          highestScorePct = pct;
        }

        if (a.submitted_at && a.started_at) {
          const diffMs = new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime();
          if (diffMs > 0) {
            totalTimeMs += diffMs;
            timesSec.push(Math.round(diffMs / 1000));
          }
        }
      });

      const avgScore = completedCount > 0 ? Math.round((totalScoreSum / completedCount) * 10) / 10 : 0;
      const totalAnswers = answersData.length;
      const correctAnswers = answersData.filter(a => a.is_correct).length;
      const avgAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 10) / 10 : 0;

      let avgTimeMins = 0;
      let fastestMins = 0;
      let slowestMins = 0;
      if (timesSec.length > 0) {
        avgTimeMins = Math.round((timesSec.reduce((a, b) => a + b, 0) / timesSec.length / 60) * 10) / 10;
        fastestMins = Math.round((Math.min(...timesSec) / 60) * 10) / 10;
        slowestMins = Math.round((Math.max(...timesSec) / 60) * 10) / 10;
      }

      // Study Streak
      const dates = completedAttempts
        .map(a => new Date(a.started_at).setHours(0, 0, 0, 0))
        .sort((a, b) => b - a);
      
      const uniqueDates = [...new Set(dates)];
      let streak = 0;
      const today = new Date().setHours(0, 0, 0, 0);
      const oneDay = 24 * 60 * 60 * 1000;

      if (uniqueDates.length > 0) {
        let currentDate = uniqueDates[0];
        if (currentDate === today || currentDate === today - oneDay) {
          streak = 1;
          for (let i = 1; i < uniqueDates.length; i++) {
            if (uniqueDates[i - 1] - uniqueDates[i] === oneDay) {
              streak++;
            } else {
              break;
            }
          }
        }
      }

      return {
        data: {
          totalAttempts,
          totalCompleted: completedCount,
          totalPracticeTests,
          totalCompetitions,
          avgScore,
          highestScore: Math.round(highestScorePct),
          avgAccuracy,
          totalTimeHours: (totalTimeMs / (1000 * 60 * 60)).toFixed(1),
          avgCompletionTimeMins: avgTimeMins,
          fastestCompletionMins: fastestMins,
          slowestCompletionMins: slowestMins,
          certificates: certCount || 0,
          studyStreak: streak
        },
        error: null
      };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Generates rule-based AI Insights derived from real performance summary
   */
  async getAIInsights(userId: string) {
    try {
      const summary = await this.getPerformanceSummary(userId);
      if (summary.error || !summary.data) throw summary.error;

      const { avgAccuracy, totalTimeHours, totalCompleted, avgCompletionTimeMins } = summary.data;
      const insights = [];

      if (totalCompleted === 0) {
        insights.push({ type: 'Suggestion', text: 'Take your first assessment to unlock cognitive performance insights.', color: 'indigo' });
        return { data: insights, error: null };
      }

      if (avgAccuracy < 60) {
        insights.push({ type: 'Optimization', text: `Your overall accuracy is ${avgAccuracy}%. Focus on concept clarity before timed tests.`, color: 'rose' });
      } else if (avgAccuracy > 85) {
        insights.push({ type: 'Mastery', text: `Exceptional accuracy at ${avgAccuracy}%! You are performing in the top tier of candidates.`, color: 'emerald' });
      } else {
        insights.push({ type: 'Progress', text: `Consistent performance with ${avgAccuracy}% accuracy. Target 80%+ to reach mastery.`, color: 'indigo' });
      }

      if (avgCompletionTimeMins > 0) {
        insights.push({ type: 'Pacing', text: `Average completion time per test is ${avgCompletionTimeMins} minutes.`, color: 'amber' });
      }

      if (parseFloat(totalTimeHours) >= 5) {
        insights.push({ type: 'Diligence', text: `You have accumulated ${totalTimeHours} hours of test taking practice.`, color: 'emerald' });
      }

      return { data: insights, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
};

export default performanceService;
