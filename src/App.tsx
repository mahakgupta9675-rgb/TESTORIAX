import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Testimonials from './components/Testimonials';
import Pricing from './components/Pricing';
import CTA from './components/CTA';
import Footer from './components/Footer';

// Authentication Pages
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicOnlyRoute from './components/auth/PublicOnlyRoute';

// Dashboard Page
import DashboardView from './components/dashboard/DashboardView';

// Test Builder Page
import TestBuilderView from './components/builder/TestBuilderView';
import TestCreatorWizard from './components/builder/TestCreatorWizard';
import AITestGenerator from './components/dashboard/AITestGenerator';
import TestDiscoveryView from './components/discovery/TestDiscoveryView';
import FollowingFeedView from './components/discovery/FollowingFeedView';
import PublicTestDetailView from './components/discovery/PublicTestDetailView';
import PublicCertificateVerificationView from './components/verification/PublicCertificateVerificationView';
import { ExamEntryView } from './components/examination/entry/ExamEntryView';
import ExaminationView from './components/examination/ExaminationView';
import CreatorProfileView from './components/creator/CreatorProfileView';
import supabase, { isPlaceholderConfig } from './lib/supabaseClient';
import { PracticeView } from './components/dashboard/PracticeView';
import { PracticeDetailView } from './components/dashboard/PracticeDetailView';

export type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'dashboard'
  | 'builder'
  | 'create-test'
  | 'ai-generator-page'
  | 'discovery'
  | 'feed'
  | 'test-details'
  | 'exam-entry'
  | 'examination'
  | 'creator-profile'
  | 'practice'
  | 'practice-details';

// Component wrapper for Landing Page
const LandingView: React.FC<{ onNavigate: (view: AppView, param?: string) => void }> = ({ onNavigate }) => (
  <main>
    <Hero onNavigate={onNavigate} />
    <Features />
    <HowItWorks />
    <Testimonials />
    <Pricing onNavigate={onNavigate} />
    <CTA onNavigate={onNavigate} />
    <Footer />
  </main>
);

// Router Parameter Wrappers
const BuilderWrapper: React.FC<{ onNavigate: (view: AppView, param?: string) => void }> = ({ onNavigate }) => {
  const { title } = useParams<{ title?: string }>();
  return <TestBuilderView onNavigate={onNavigate} initialTitle={title ? decodeURIComponent(title) : ''} />;
};

const TestDetailsWrapper: React.FC<{ onNavigate: (view: AppView, param?: string) => void }> = ({ onNavigate }) => {
  const { testId } = useParams<{ testId: string }>();
  return <PublicTestDetailView onNavigate={onNavigate} testId={testId || null} />;
};

const ExaminationWrapper: React.FC<{ onNavigate: (view: AppView, param?: string) => void }> = ({ onNavigate }) => {
  const { testId } = useParams<{ testId: string }>();
  return <ExaminationView onNavigate={onNavigate} testId={testId || null} />;
};

const ExamEntryWrapper: React.FC<{ onNavigate: (view: AppView, param?: string) => void }> = ({ onNavigate }) => {
  const { testId } = useParams<{ testId: string }>();
  return <ExamEntryView onNavigate={onNavigate} testId={testId || null} />;
};

const CreatorProfileWrapper: React.FC<{ onNavigate: (view: AppView, param?: string) => void }> = ({ onNavigate }) => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const location = useLocation();
  const state = location.state as { prevView?: AppView } | null;
  return (
    <CreatorProfileView
      onNavigate={onNavigate}
      creatorId={creatorId || null}
      prevView={state?.prevView || 'dashboard'}
    />
  );
};

const AITestGeneratorWrapper: React.FC<{ onNavigate: (view: AppView, param?: string) => void }> = ({ onNavigate }) => {
  return <AITestGenerator onNavigate={onNavigate} />;
};

const PracticeDetailsWrapper: React.FC<{ onNavigate: (view: AppView, param?: string) => void }> = ({ onNavigate }) => {
  const { testId } = useParams<{ testId: string }>();
  return <PracticeDetailView onNavigate={onNavigate} testId={testId || ''} />;
};

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Global listener for password recovery events
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[App] PASSWORD_RECOVERY event triggered. Redirecting to /reset-password');
        navigate('/reset-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Helper to resolve AppView from current path
  const getAppViewFromPath = (path: string): AppView => {
    if (path === '/') return 'landing';
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/forgot-password') return 'forgot-password';
    if (path === '/reset-password') return 'reset-password';
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/builder')) return 'builder';
    if (path === '/create-test') return 'create-test';
    if (path === '/ai-generator') return 'ai-generator-page';
    if (path === '/discovery') return 'discovery';
    if (path === '/feed') return 'feed';
    if (path.startsWith('/test-details') || path.startsWith('/lobby/join')) return 'test-details';
    if (path.startsWith('/exam-entry')) return 'exam-entry';
    if (path.startsWith('/examination')) return 'examination';
    if (path.startsWith('/creator-profile')) return 'creator-profile';
    if (path === '/practice') return 'practice';
    if (path.startsWith('/practice/')) return 'practice-details';
    return 'landing';
  };

  const currentView = getAppViewFromPath(location.pathname);

  // Backward compatible onNavigate handler mapped to useNavigate
  const handleNavigate = (nextView: AppView, param?: string) => {
    const prevView = getAppViewFromPath(location.pathname);

    switch (nextView) {
      case 'landing':
        navigate('/');
        break;
      case 'login':
        navigate('/login');
        break;
      case 'register':
        navigate('/register');
        break;
      case 'forgot-password':
        navigate('/forgot-password');
        break;
      case 'reset-password':
        navigate('/reset-password');
        break;
      case 'dashboard':
        navigate(param ? `/dashboard/${param}` : '/dashboard');
        break;
      case 'builder':
        navigate(param ? `/builder/${encodeURIComponent(param)}` : '/builder');
        break;
      case 'create-test':
        navigate('/create-test');
        break;
      case 'ai-generator-page':
        navigate('/ai-generator', { state: { prevView } });
        break;
      case 'discovery':
        navigate('/discovery');
        break;
      case 'feed':
        navigate('/feed');
        break;
      case 'test-details':
        navigate(`/test-details/${param}`);
        break;
      case 'exam-entry':
        navigate(`/exam-entry/${param}`);
        break;
      case 'examination':
        navigate(`/examination/${param}`);
        break;
      case 'creator-profile':
        navigate(`/creator-profile/${param || 'me'}`, { state: { prevView } });
        break;
      case 'practice':
        navigate('/practice');
        break;
      case 'practice-details':
        navigate(`/practice/${param}`);
        break;
      default:
        navigate('/');
    }
  };

  // Smooth scroll back to top when location changes
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const showNavbar =
    currentView !== 'dashboard' &&
    currentView !== 'builder' &&
    currentView !== 'create-test' &&
    currentView !== 'ai-generator-page' &&
    currentView !== 'exam-entry' &&
    currentView !== 'examination' &&
    currentView !== 'creator-profile' &&
    !location.pathname.startsWith('/certificate/') &&
    !location.pathname.startsWith('/verify/') &&
    !(currentView === 'practice' && isLoggedIn) &&
    !(currentView === 'practice-details' && isLoggedIn);

  return (
    <div className="min-h-screen bg-[#fffafb] antialiased select-none selection:bg-lilac-200 selection:text-lilac-900">
      {isPlaceholderConfig && (
        <div className="bg-amber-500 text-white font-semibold text-center text-xs py-3 px-4 z-[9999] relative flex items-center justify-center gap-2 shadow-md">
          <span>⚠️ Supabase is running with placeholder settings. If you created a `.env` file, please restart your development server (stop `npm run dev` and run it again) to load your credentials!</span>
        </div>
      )}

      {/* Sticky top Navigation Bar */}
      {showNavbar && <Navbar onNavigate={handleNavigate} currentView={currentView} />}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingView onNavigate={handleNavigate} />} />

        {/* Guest-only Auth Routes wrapped in PublicOnlyRoute */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login onNavigate={handleNavigate} />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register onNavigate={handleNavigate} />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPassword onNavigate={handleNavigate} />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <ResetPassword onNavigate={handleNavigate} />
          }
        />

        {/* Protected App Routes wrapped in ProtectedRoute */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardView onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/builder/:title?"
          element={
            <ProtectedRoute>
              <BuilderWrapper onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-test"
          element={
            <ProtectedRoute>
              <TestCreatorWizard onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-generator"
          element={
            <ProtectedRoute>
              <AITestGeneratorWrapper onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        {/* Public Routes */}
        <Route
          path="/discovery"
          element={<TestDiscoveryView onNavigate={handleNavigate} />}
        />
        <Route
          path="/feed"
          element={<FollowingFeedView onNavigate={handleNavigate} />}
        />
        <Route
          path="/certificate/:certificateId"
          element={<PublicCertificateVerificationView />}
        />
        <Route
          path="/verify/:certificateId"
          element={<PublicCertificateVerificationView />}
        />
        <Route
          path="/test-details/:testId"
          element={<TestDetailsWrapper onNavigate={handleNavigate} />}
        />
        <Route
          path="/lobby/join/:testId"
          element={<TestDetailsWrapper onNavigate={handleNavigate} />}
        />
        <Route
          path="/exam-entry/:testId"
          element={
            <ProtectedRoute>
              <ExamEntryWrapper onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/examination/:testId"
          element={
            <ProtectedRoute>
              <ExaminationWrapper onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creator-profile/:creatorId"
          element={
            <ProtectedRoute>
              <CreatorProfileWrapper onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice"
          element={<PracticeView onNavigate={handleNavigate} />}
        />
        <Route
          path="/practice/:testId"
          element={<PracticeDetailsWrapper onNavigate={handleNavigate} />}
        />

        {/* Fallback to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;

