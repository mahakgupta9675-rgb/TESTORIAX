import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import TestoriaxLogo from '../ui/TestoriaxLogo';
import SocialButtons from './SocialButtons';
import { useToast } from '../../context/ToastContext';
import supabase from '../../lib/supabaseClient';

interface LoginProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard') => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Regex validation
  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setEmailError('Email address is required');
      return false;
    }
    if (!emailRegex.test(val)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError('Password is required');
      return false;
    }
    if (val.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (isEmailValid && isPasswordValid) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          showToast(error.message, 'error');
          setIsSubmitting(false);
        } else {
          showToast('Signed in successfully!', 'success');
          setSuccess(true);
          setTimeout(() => {
            const from = location.state?.from?.pathname;
            if (from) {
              navigate(from);
            } else {
              onNavigate('dashboard');
            }
          }, 1500);
        }
      } catch (err: any) {
        showToast(err.message || 'An error occurred during sign in.', 'error');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-20 px-6 overflow-hidden bg-gradient-to-b from-white via-lilac-50/40 to-lilac-100/10">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/10 w-80 h-80 bg-lilac-200/50 rounded-full glowing-blob" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-indigo-200/40 rounded-full glowing-blob" />

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Back Link */}
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-lilac-600 font-semibold text-sm mb-6 cursor-pointer group transition-colors duration-200"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>

        <GlassCard hoverEffect={false} className="border-slate-100/60 p-8 shadow-2xl">
          
          {/* Logo Title */}
          <div className="flex flex-col items-center mb-8">
            <TestoriaxLogo showText={true} textColor="text-slate-900" lightMode={true} />
            <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight mt-6">
              Welcome Back
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Sign in to manage your assessments and lobbies
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-10 flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Signed In Successfully!</h3>
                <p className="text-slate-500 text-xs mt-1.5">Redirecting you to dashboard...</p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Form Input fields */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                {/* Email address field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      disabled={isSubmitting || isGoogleLoading}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) validateEmail(e.target.value);
                      }}
                      onBlur={() => validateEmail(email)}
                      placeholder="name@company.com"
                      className={`w-full py-3.5 pl-11 pr-4 rounded-xl text-sm bg-white border outline-none transition-all duration-200 ${
                        emailError
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200/50'
                          : 'border-slate-200/80 focus:border-lilac-400 focus:ring-2 focus:ring-lilac-200/50'
                      }`}
                    />
                  </div>
                  {emailError && (
                    <span className="text-[10px] text-red-500 font-semibold mt-0.5">{emailError}</span>
                  )}
                </div>

                {/* Password field */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => onNavigate('forgot-password')}
                      className="text-xs font-semibold text-lilac-600 hover:text-lilac-700 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      disabled={isSubmitting || isGoogleLoading}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) validatePassword(e.target.value);
                      }}
                      onBlur={() => validatePassword(password)}
                      placeholder="••••••••"
                      className={`w-full py-3.5 pl-11 pr-11 rounded-xl text-sm bg-white border outline-none transition-all duration-200 ${
                        passwordError
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200/50'
                          : 'border-slate-200/80 focus:border-lilac-400 focus:ring-2 focus:ring-lilac-200/50'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordError && (
                    <span className="text-[10px] text-red-500 font-semibold mt-0.5">{passwordError}</span>
                  )}
                </div>

                {/* Remember Me Option */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4.5 h-4.5 rounded border-slate-300 text-lilac-600 focus:ring-lilac-400 accent-lilac-600 cursor-pointer"
                  />
                  <label htmlFor="remember" className="text-xs font-semibold text-slate-500 cursor-pointer select-none">
                    Remember me on this device
                  </label>
                </div>

                {/* Submit button */}
                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleLoading}
                  className="w-full mt-2 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-lilac-600 to-indigo-600 hover:from-lilac-500 hover:to-indigo-500 transition-all duration-300 shadow-md shadow-lilac-500/10 hover:shadow-lg hover:shadow-lilac-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {/* Separator line */}
              <div className="relative my-7 flex items-center justify-center">
                <div className="w-full h-px bg-slate-200/60" />
                <span className="absolute bg-[#fffafb] px-3.5 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                  Or Sign In With
                </span>
              </div>

              {/* OAuth buttons */}
              <SocialButtons
                isGoogleLoading={isGoogleLoading}
                disabled={isSubmitting || isGoogleLoading}
                onGoogleSuccess={async () => {
                  setIsGoogleLoading(true);
                  try {
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo: window.location.origin + '/dashboard' }
                    });
                    if (error) throw error;
                  } catch (err: any) {
                    showToast(err.message || 'Google OAuth failed', 'error');
                    setIsGoogleLoading(false);
                  }
                }}
              />

              {/* Switch View link */}
              <p className="text-center text-xs text-slate-500 font-medium mt-8">
                Don't have an account?{' '}
                <button
                  onClick={() => onNavigate('register')}
                  className="font-bold text-lilac-600 hover:text-lilac-700 transition-colors"
                >
                  Sign up free
                </button>
              </p>
            </>
          )}

        </GlassCard>
      </div>
    </div>
  );
};

export default Login;
