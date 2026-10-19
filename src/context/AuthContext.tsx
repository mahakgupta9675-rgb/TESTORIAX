import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import supabase from '../lib/supabaseClient';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  specialty?: string;
  bio?: string;
  banner_url?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended';
  created_at: string;
}

interface AuthContextProps {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile details from public.profiles table
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
      }
      return data as UserProfile;
    } catch (err) {
      console.error('Profile fetch failed:', err);
      return null;
    }
  }, []);

  // Safe Profile Creator (Upserts or inserts missing profiles)
  const ensureProfileExists = useCallback(async (currentUser: User, fullName?: string): Promise<UserProfile | null> => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (existingProfile) {
        return existingProfile as UserProfile;
      }

      // Profile doesn't exist, create it automatically
      const name = fullName || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Challenger User';
      const newProfile = {
        id: currentUser.id,
        full_name: name,
        email: currentUser.email || '',
        avatar_url: currentUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        specialty: 'Full-Stack Developer & Technical Writer',
        bio: 'Passionate developer and educator.',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').insert(newProfile);
      if (error) {
        console.error('Failed to auto-create profile:', error.message);
        // Fallback to local state if RLS fails or DB is unconfigured
      }
      return newProfile;
    } catch (err) {
      console.error('Error ensuring profile exists:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      if (p) {
        setProfile(p);
      }
    }
  }, [user, fetchProfile]);

  // Handle Auth changes (Login, Logout, Token Refreshes)
  useEffect(() => {
    const isCallback =
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('id_token=') ||
      window.location.hash.includes('error=') ||
      window.location.search.includes('code=') ||
      window.location.search.includes('error=');

    console.log('[AuthContext] Mounting useEffect. isCallback:', isCallback, 'Location Hash:', window.location.hash, 'Location Search:', window.location.search);

    let safetyTimeout: ReturnType<typeof setTimeout> | null = null;

    // If it is an auth callback, set a safety timeout to disable loading state 
    // after 6 seconds just in case Supabase fails to parse the session.
    if (isCallback) {
      console.log('[AuthContext] Callback detected. Setting safety timeout.');
      safetyTimeout = setTimeout(() => {
        console.warn('[AuthContext] Supabase Auth callback safety timeout reached. Disabling loading state.');
        setLoading(false);
      }, 6000);
    }

    // 1. Check initial active session
    supabase.auth.getSession().then(async ({ data: { session: initSession } }) => {
      console.log('[AuthContext] getSession returned. Session exists:', !!initSession, 'User Email:', initSession?.user?.email || 'None');
      setSession(initSession);
      const currentUser = initSession?.user || null;
      setUser(currentUser);

      if (currentUser) {
        let p = await fetchProfile(currentUser.id);
        if (!p) {
          console.log('[AuthContext] Profile not found. Ensuring profile exists...');
          p = await ensureProfileExists(currentUser);
        }
        setProfile(p);
        console.log('[AuthContext] Profile synchronized:', p?.full_name);
      }

      // Only set loading to false if we are NOT currently processing an auth callback
      // or if we already have a logged-in user session.
      if (!isCallback || currentUser) {
        if (safetyTimeout) {
          console.log('[AuthContext] Clearing safety timeout (getSession).');
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
        console.log('[AuthContext] Setting loading to false (getSession).');
        setLoading(false);
      }
    });

    // 2. Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[AuthContext] onAuthStateChange event triggered:', event, 'Session exists:', !!newSession, 'User Email:', newSession?.user?.email || 'None');
      setSession(newSession);
      const currentUser = newSession?.user || null;
      setUser(currentUser);

      if (currentUser) {
        let p = await fetchProfile(currentUser.id);
        if (!p) {
          console.log('[AuthContext] Profile not found (onAuthStateChange). Ensuring profile exists...');
          p = await ensureProfileExists(currentUser);
        }
        setProfile(p);
        console.log('[AuthContext] Profile synchronized (onAuthStateChange):', p?.full_name);
      } else {
        setProfile(null);
      }

      // Any auth event (SIGNED_IN, SIGNED_OUT, etc.) means processing is finished,
      // so we can safely set loading to false.
      if (safetyTimeout) {
        console.log('[AuthContext] Clearing safety timeout (onAuthStateChange).');
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
      console.log('[AuthContext] Setting loading to false (onAuthStateChange).');
      setLoading(false);
    });

    return () => {
      console.log('[AuthContext] Unmounting useEffect.');
      subscription.unsubscribe();
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
  }, [fetchProfile, ensureProfileExists]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, setProfile, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
