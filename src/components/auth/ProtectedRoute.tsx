import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute] Rendering. session:', !!session, 'loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffafb]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-lilac-600" size={32} />
          <p className="text-slate-400 text-xs font-bold tracking-wide animate-pulse">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    console.log('[ProtectedRoute] No session found. Redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
