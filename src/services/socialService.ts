import supabase from '../lib/supabase';

export interface UserProfileSummary {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  specialty?: string;
  bio?: string;
  followed_at?: string;
}

export const socialService = {
  /**
   * Follow a user/creator
   */
  async followUser(followerId: string, followingId: string) {
    if (!followerId || !followingId) {
      throw new Error("Missing follower or following ID");
    }
    if (followerId === followingId) {
      throw new Error("You cannot follow yourself");
    }
    
    const { data, error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return { data: null, error: new Error("You are already following this creator.") };
      }
      return { data: null, error };
    }
    return { data, error: null };
  },

  /**
   * Unfollow a user/creator
   */
  async unfollowUser(followerId: string, followingId: string) {
    if (!followerId || !followingId) {
      throw new Error("Missing follower or following ID");
    }
    
    const { data, error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    
    return { data, error };
  },

  /**
   * Check if followerId is following followingId
   */
  async getFollowStatus(followerId: string, followingId: string) {
    if (!followerId || !followingId) return { isFollowing: false, error: null };
    
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
      
    return { isFollowing: !!data, error };
  },

  /**
   * Get real creator follower, following, and published test counts
   */
  async getCreatorStats(creatorId: string) {
    const [followersRes, followingRes, testsRes] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', creatorId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', creatorId),
      supabase.from('tests').select('*', { count: 'exact', head: true }).eq('creator_id', creatorId).eq('status', 'published').eq('visibility', 'public')
    ]);

    return {
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
      publishedTestsCount: testsRes.count || 0
    };
  },

  /**
   * Get list of users following a creator
   */
  async getFollowersList(creatorId: string): Promise<{ data: UserProfileSummary[]; error: any }> {
    try {
      // 1. Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_followers_list', { p_user_id: creatorId });
      if (!rpcError && rpcData) {
        return { data: rpcData, error: null };
      }

      // 2. Client-side fallback if RPC is not created yet
      const { data: follows, error: followsErr } = await supabase
        .from('follows')
        .select(`
          created_at,
          follower:follower_id(
            id,
            full_name,
            email,
            avatar_url,
            specialty,
            bio
          )
        `)
        .eq('following_id', creatorId)
        .order('created_at', { ascending: false });

      if (followsErr) return { data: [], error: followsErr };

      const list: UserProfileSummary[] = (follows || []).map((f: any) => ({
        id: f.follower?.id,
        full_name: f.follower?.full_name || 'Anonymous User',
        email: f.follower?.email,
        avatar_url: f.follower?.avatar_url,
        specialty: f.follower?.specialty,
        bio: f.follower?.bio,
        followed_at: f.created_at
      })).filter(u => !!u.id);

      return { data: list, error: null };
    } catch (err: any) {
      console.error('Error loading followers list:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Get list of users a user is following
   */
  async getFollowingList(userId: string): Promise<{ data: UserProfileSummary[]; error: any }> {
    try {
      // 1. Try RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_following_list', { p_user_id: userId });
      if (!rpcError && rpcData) {
        return { data: rpcData, error: null };
      }

      // 2. Client-side fallback if RPC is not created yet
      const { data: follows, error: followsErr } = await supabase
        .from('follows')
        .select(`
          created_at,
          following:following_id(
            id,
            full_name,
            email,
            avatar_url,
            specialty,
            bio
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false });

      if (followsErr) return { data: [], error: followsErr };

      const list: UserProfileSummary[] = (follows || []).map((f: any) => ({
        id: f.following?.id,
        full_name: f.following?.full_name || 'Anonymous User',
        email: f.following?.email,
        avatar_url: f.following?.avatar_url,
        specialty: f.following?.specialty,
        bio: f.following?.bio,
        followed_at: f.created_at
      })).filter(u => !!u.id);

      return { data: list, error: null };
    } catch (err: any) {
      console.error('Error loading following list:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Get social feed: tests published by followed users
   */
  async getFollowingFeed(userId: string) {
    if (!userId) return { data: [], error: null };

    // 1. Get list of following_ids
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
      
    if (followsError) return { data: [], error: followsError };
    
    const followingIds = follows?.map(f => f.following_id) || [];
    
    if (followingIds.length === 0) return { data: [], error: null };
    
    // 2. Fetch tests published by these users
    const { data, error } = await supabase
      .from('tests')
      .select(`
        *,
        creator:creator_id(
          full_name,
          avatar_url,
          specialty
        )
      `)
      .in('creator_id', followingIds)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });
      
    return { data: data || [], error };
  },

  /**
   * Update user profile details in public.profiles table
   */
  async updateProfile(userId: string, updates: { full_name?: string; username?: string; specialty?: string; bio?: string; avatar_url?: string; banner_url?: string; email?: string }) {
    if (updates.banner_url) {
      try {
        localStorage.setItem(`testora_banner_${userId}`, updates.banner_url);
      } catch (e) {}
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates
      })
      .eq('id', userId)
      .select()
      .single();

    if (error && (error.message?.includes('banner_url') || error.code === 'PGRST204')) {
      const { banner_url, ...safeUpdates } = updates;
      const fallbackRes = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (!fallbackRes.error && fallbackRes.data) {
        return { data: { ...fallbackRes.data, banner_url: updates.banner_url }, error: null };
      }
      return fallbackRes;
    }

    return { data, error };
  }
};

export default socialService;
