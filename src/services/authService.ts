import supabase from '../lib/supabase';

// =========================================================================
// CREDENTIALS LOGIC NOTE:
// The Supabase connection keys are loaded from the environment:
// VITE_SUPABASE_URL     -> Place your project URL here in '.env'
// VITE_SUPABASE_ANON_KEY -> Place your anon api key here in '.env'
// =========================================================================

/**
 * AuthService handles direct communication with the Supabase Auth API
 */
export const authService = {
  /**
   * Signs in a user using email and password
   */
  async signIn({ email, password }: { email?: string; password?: string }) {
    if (!email || !password) throw new Error('Email and password are required');
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  /**
   * Signs up a new user using email and password
   */
  async signUp({ email, password }: { email?: string; password?: string }, fullName: string) {
    if (!email || !password) throw new Error('Email and password are required');
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  },

  /**
   * Signs out the current user and clears the active session
   */
  async signOut() {
    return await supabase.auth.signOut();
  },

  /**
   * Dispatches a password reset recovery email to the user
   */
  async resetPassword(email: string) {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    });
  },

  /**
   * Retrieves the current authenticated user's session details
   */
  async getSession() {
    return await supabase.auth.getSession();
  },

  /**
   * Subscribes to changes in authentication state (login, logout, token refreshes)
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  }
};

export default authService;
