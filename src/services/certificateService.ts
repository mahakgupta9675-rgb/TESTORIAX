import supabase from '../lib/supabase';

export interface DBUserCertificate {
  id: string;
  certificate_code: string;
  user_id: string;
  test_id?: string;
  attempt_id?: string;
  student_name: string;
  title: string;
  category: string;
  score: number;
  max_score: number;
  percentage: number;
  instructor_name: string;
  verification_status: 'verified' | 'revoked';
  issued_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  badge_key: string;
  badge_name: string;
  badge_description: string;
  badge_category: string;
  badge_icon: string;
  earned_at: string;
}

export const certificateService = {
  /**
   * Fetches certificates earned by a user from real Supabase DB
   */
  async getCertificates(userId: string) {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      return { data: data as DBUserCertificate[], error: null };
    } catch (err: any) {
      console.error('Error fetching user certificates:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetches earned achievements/milestones for a user
   */
  async getAchievements(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      return { data: data as UserAchievement[], error: null };
    } catch (err: any) {
      console.error('Error fetching user achievements:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Secure Server-Side Certificate Issuance (triggers rule checks & achievement unlocking)
   */
  async issueCertificateForAttempt(attemptId: string) {
    try {
      const { data, error } = await supabase.rpc('issue_certificate_for_attempt', {
        p_attempt_id: attemptId
      });

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.error('Error issuing certificate:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Public Verification query — fetches certificate detail by certificate_code or UUID
   */
  async verifyCertificatePublic(codeOrId: string) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId);
      
      let query = supabase.from('certificates').select('*');
      if (isUuid) {
        query = query.or(`id.eq.${codeOrId},certificate_code.eq.${codeOrId}`);
      } else {
        query = query.eq('certificate_code', codeOrId);
      }

      const { data, error } = await query.single();
      if (error) throw error;

      return { data: data as DBUserCertificate, error: null };
    } catch (err: any) {
      console.error('Error verifying certificate:', err);
      return { data: null, error: err };
    }
  }
};

export default certificateService;
