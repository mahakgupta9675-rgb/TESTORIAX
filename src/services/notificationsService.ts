import supabase from '../lib/supabase';
import testsService from './testsService';

export interface AppNotification {
  id?: string;
  user_id: string;
  type: 'creator_published_test' | 'test_registration' | 'result_released' | 'competition_event' | 'certificate_available' | string;
  title: string;
  message: string;
  reference_id?: string;
  is_read: boolean;
  created_at?: string;
}

export const notificationsService = {
  /**
   * Fetches all notifications for a specific user, ordered by created_at descending.
   */
  async getUserNotifications(userId: string) {
    return await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  },

  /**
   * Fetches the count of unread notifications for a user.
   */
  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
    return count || 0;
  },

  /**
   * Creates a notification for a specific user with duplicate prevention handling.
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    referenceId?: string
  ) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          reference_id: referenceId || null,
          is_read: false
        })
        .select()
        .single();

      if (error) {
        // Code 23505 indicates unique duplicate constraint hit (duplicate notification already sent)
        if (error.code === '23505') {
          console.log(`[Notification Engine] Duplicate notification suppressed for user ${userId}, type ${type}, ref ${referenceId}`);
          return { data: null, duplicate: true, error: null };
        }
        throw error;
      }

      return { data, duplicate: false, error: null };
    } catch (err: any) {
      console.error('Error creating notification:', err);
      return { data: null, duplicate: false, error: err };
    }
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(notificationId: string) {
    return await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  },

  /**
   * Marks all notifications for a specific user as read.
   */
  async markAllAsRead(userId: string) {
    return await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
  },

  /**
   * Deletes a single notification.
   */
  async deleteNotification(notificationId: string) {
    return await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  },

  /**
   * Sends notifications to all followers when a creator publishes a new test.
   */
  async notifyFollowersTestPublished(creatorId: string, testId: string, testTitle: string, creatorName: string) {
    try {
      // 1. Try RPC function first
      const { data, error } = await supabase.rpc('notify_followers_on_test_publish', {
        p_creator_id: creatorId,
        p_test_id: testId,
        p_test_title: testTitle,
        p_creator_name: creatorName
      });

      if (!error) {
        return { success: true, notifiedCount: data || 0 };
      }

      // Fallback: Query follows table client-side
      const { data: followers, error: followError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', creatorId);

      if (followError || !followers || followers.length === 0) {
        return { success: true, notifiedCount: 0 };
      }

      let count = 0;
      for (const f of followers) {
        const res = await this.createNotification(
          f.follower_id,
          'creator_published_test',
          'New Test Published',
          `${creatorName} published a new test: "${testTitle}"`,
          testId
        );
        if (res.data) count++;
      }

      return { success: true, notifiedCount: count };
    } catch (err: any) {
      console.error('Error notifying followers of published test:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Sends a registration confirmation notification to a user.
   */
  async notifyTestRegistration(userId: string, testId: string, testTitle: string) {
    return await this.createNotification(
      userId,
      'test_registration',
      'Registration Confirmed',
      `You have successfully registered for "${testTitle}". Check your schedule or start practicing now!`,
      testId
    );
  },

  /**
   * Sends result released notifications to all participants of a test.
   */
  async sendResultReleaseNotifications(testId: string, testTitle: string, totalMarks: number) {
    try {
      // 1. Fetch all attempts for the test
      const { data: attempts, error: attemptsError } = await testsService.getAttemptsByTestId(testId);
      if (attemptsError || !attempts) throw attemptsError || new Error('No attempts found');

      // 2. Filter for finished attempts (submitted or expired)
      const finishedAttempts = attempts.filter(a => a.status === 'submitted' || a.status === 'expired');

      // 3. Sort by score descending to determine ranks
      const sortedAttempts = [...finishedAttempts].sort((a, b) => (b.score || 0) - (a.score || 0));

      let count = 0;
      // 4. Send notification to each candidate
      for (let i = 0; i < sortedAttempts.length; i++) {
        const attempt = sortedAttempts[i];
        const rank = i + 1;
        const score = attempt.score || 0;
        const userId = attempt.user_id;

        const profile = attempt.profiles as any;
        const email = profile?.email || 'candidate@testoriax.io';
        const candidateName = profile?.full_name || 'Candidate';

        const notificationTitle = 'Results Released';
        const notificationMessage = `Results for "${testTitle}" are now available! Your Score: ${score}/${totalMarks} (Rank #${rank}).`;

        const res = await this.createNotification(userId, 'result_release', notificationTitle, notificationMessage, testId);
        if (res.data) count++;

        // Log structured email payload
        const resultUrl = `${window.location.origin}/dashboard/my-results`;
        console.log(`[EMAIL ENGINE] Notification queued for ${email} (${candidateName}): ${notificationTitle} - ${resultUrl}`);
      }

      return { success: true, notifiedCount: count };
    } catch (err: any) {
      console.error('Error sending result release notifications:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Sends competition event / announcement notification.
   */
  async notifyCompetitionEvent(userId: string, competitionId: string, title: string, message: string) {
    return await this.createNotification(
      userId,
      'competition_event',
      title,
      message,
      competitionId
    );
  },

  /**
   * Sends certificate available notification to candidate.
   */
  async notifyCertificateAvailable(userId: string, testId: string, testTitle: string) {
    return await this.createNotification(
      userId,
      'certificate_available',
      'Certificate Earning Unlocked!',
      `Congratulations! You achieved a passing score on "${testTitle}". Your official certificate is ready.`,
      testId
    );
  },

  /**
   * Subscribes to real-time notification changes for a user via Supabase Realtime channel.
   */
  subscribeToNotifications(userId: string, onNotification: (notification: AppNotification) => void) {
    const channel = supabase
      .channel(`public:notifications:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            onNotification(payload.new as AppNotification);
          }
        }
      )
      .subscribe();

    return channel;
  }
};

export default notificationsService;
