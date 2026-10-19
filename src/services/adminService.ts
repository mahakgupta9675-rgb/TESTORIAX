import supabase from '../lib/supabase';

export interface PlatformStats {
  total_users: number;
  total_tests: number;
  published_tests: number;
  total_attempts: number;
  total_certificates: number;
  pending_reports: number;
}

export interface AdminUserRecord {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  created_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  test_id?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  created_at: string;
  reporter_name?: string;
  test_title?: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  created_at: string;
}

export const adminService = {
  /**
   * Server-authorized fetch of high-level platform statistics
   */
  async getPlatformStats(): Promise<{ data: PlatformStats | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('admin_get_platform_stats');
      if (error) throw error;
      return { data: data as PlatformStats, error: null };
    } catch (err: any) {
      console.error('Error fetching admin platform stats:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Server-authorized query to list platform users
   */
  async listUsers(search: string = ''): Promise<{ data: AdminUserRecord[] | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('admin_list_users', { p_search: search });
      if (error) throw error;
      return { data: data as AdminUserRecord[], error: null };
    } catch (err: any) {
      console.error('Error listing admin users:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Suspend or restore a user account
   */
  async updateUserStatus(userId: string, status: 'active' | 'suspended') {
    try {
      const { data, error } = await supabase.rpc('admin_update_user_status', {
        p_target_user_id: userId,
        p_status: status
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating user status:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Promote or demote user role
   */
  async updateUserRole(userId: string, role: 'admin' | 'user') {
    try {
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        p_target_user_id: userId,
        p_role: role
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating user role:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Unpublish / moderate inappropriate test
   */
  async unpublishTest(testId: string, reason: string) {
    try {
      const { data, error } = await supabase.rpc('admin_unpublish_test', {
        p_test_id: testId,
        p_reason: reason
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.error('Error unpublishing test:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Broadcast platform announcement to all active users
   */
  async broadcastNotification(title: string, message: string) {
    try {
      const { data, error } = await supabase.rpc('admin_broadcast_notification', {
        p_title: title,
        p_message: message
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.error('Error broadcasting notification:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetch incoming content reports
   */
  async getReports(): Promise<{ data: ContentReport[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .select(`
          id,
          reporter_id,
          test_id,
          reason,
          details,
          status,
          created_at,
          profiles:reporter_id (full_name),
          tests:test_id (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: ContentReport[] = (data || []).map((r: any) => ({
        id: r.id,
        reporter_id: r.reporter_id,
        test_id: r.test_id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        created_at: r.created_at,
        reporter_name: r.profiles?.full_name || 'Anonymous Challenger',
        test_title: r.tests?.title || 'Unknown Test'
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      console.error('Error fetching content reports:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Resolve / action a content report
   */
  async resolveReport(reportId: string, status: 'dismissed' | 'actioned') {
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .update({ status })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.error('Error resolving content report:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetch audit logs stream
   */
  async getAuditLogs(): Promise<{ data: AdminAuditLog[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return { data: data as AdminAuditLog[], error: null };
    } catch (err: any) {
      console.error('Error fetching admin audit logs:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetch all creator payout requests for platform admin review
   */
  async getPayoutRequests(): Promise<{ data: any[] | null; error: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required.');

      const res = await fetch('/api/admin/payouts', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch payout requests.');
      }

      const result = await res.json();
      return { data: result.data || [], error: null };
    } catch (err: any) {
      console.error('Error fetching admin payout requests:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Update payout request status (PROCESSING, PAID, CANCELLED, FAILED)
   */
  async updatePayoutStatus(
    payoutId: string,
    status: 'PROCESSING' | 'PAID' | 'CANCELLED' | 'FAILED',
    referenceId?: string,
    failureReason?: string
  ): Promise<{ success: boolean; message?: string; error?: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required.');

      const res = await fetch(`/api/admin/payouts/${encodeURIComponent(payoutId)}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          status,
          reference_id: referenceId,
          failure_reason: failureReason
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update payout status.');
      }

      return { success: true, message: result.message };
    } catch (err: any) {
      console.error('Error updating payout status:', err);
      return { success: false, error: err };
    }
  }
};

export default adminService;
