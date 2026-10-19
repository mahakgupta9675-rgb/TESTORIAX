import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  console.log('[PublicOnlyRoute] Rendering. session:', !!session, 'loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffafb]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-lilac-600" size={32} />
          <p className="text-slate-400 text-xs font-bold tracking-wide animate-pulse">
            Resolving details...
          </p>
        </div>
      </div>
    );
  }

  if (session) {
    console.log('[PublicOnlyRoute] Session found. Redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PublicOnlyRoute;
