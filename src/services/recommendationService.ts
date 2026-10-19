import supabase from '../lib/supabase';
import analyticsService from './analyticsService';

export const recommendationService = {
  /**
   * Recommends public tests from topics where user accuracy is below 70%
   */
  async getRecommendedPractice(userId: string) {
    try {
      // 1. Fetch user accuracy per topic
      const radar = await analyticsService.getSubjectAccuracy(userId);
      const weakTopics = (radar.data || []).filter(t => t.Skill < 70).map(t => t.subject);

      // 2. Fetch IDs of tests the user has already attempted
      const { data: attempts, error: attError } = await supabase
        .from('attempts')
        .select('test_id')
        .eq('user_id', userId);
      
      if (attError) throw attError;
      const attemptedTestIds = attempts.map(a => a.test_id);

      // 3. Fetch public practice tests not attempted by user
      let query = supabase
        .from('tests')
        .select('id, title, duration')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .eq('host_competition', false);
      
      if (attemptedTestIds.length > 0) {
        // Exclude already attempted tests (hack: not id.in doesn't exist, we can use filter after fetching or use not.in logic)
        // Since Supabase doesn't have a native 'not.in' easily without PostgREST syntax string:
        query = query.not('id', 'in', `(${attemptedTestIds.join(',')})`);
      }

      const { data: tests, error: testError } = await query;
      if (testError) throw testError;

      // 4. Filter tests by weak topics (since we don't have a real category column, we check if title includes topic)
      let recommended = tests || [];
      if (weakTopics.length > 0) {
        recommended = recommended.filter(test => {
          return weakTopics.some(topic => test.title.toLowerCase().includes(topic.toLowerCase()));
        });
      }

      // If no recommendations found via weak topics, just return some unattempted practice tests
      if (recommended.length === 0 && tests) {
        recommended = tests.slice(0, 3);
      } else {
        recommended = recommended.slice(0, 3);
      }

      const formatted = recommended.map(test => ({
        id: test.id,
        name: test.title,
        time: test.duration ? `${test.duration} mins` : 'Untimed',
        type: 'Practice'
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
};

export default recommendationService;
