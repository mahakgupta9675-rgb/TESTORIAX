import { useAuth as useAuthContext } from '../context/AuthContext';

/**
 * Custom hook to access current user details, profile information,
 * session persistence states, and signOut triggers from the AuthContext.
 * 
 * Usage:
 * const { user, profile, loading, signOut } = useAuth();
 */
export const useAuth = () => {
  return useAuthContext();
};

export default useAuth;
