import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import TestoriaxLogo from '../ui/TestoriaxLogo';
import { useToast } from '../../context/ToastContext';
import supabase from '../../lib/supabaseClient';

interface ResetPasswordProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard') => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation & state
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Session validation
  const [loadingSession, setLoadingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
        } else {
          // Give it a tiny delay to ensure hash parsing is complete if they just landed
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          setHasSession(!!retrySession);
        }
      } catch (err) {
        console.error('Error verifying recovery session:', err);
        setHasSession(false);
      } finally {
        setLoadingSession(false);
      }
    };
    verifySession();
  }, []);

  // Password Strength Meter
  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', score: 0, color: 'bg-slate-200' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { label: 'Weak', score: 25, color: 'bg-red-500' };
      case 2:
        return { label: 'Fair', score: 50, color: 'bg-orange-500' };
      case 3:
        return { label: 'Good', score: 75, color: 'bg-indigo-500' };
      case 4:
        return { label: 'Strong', score: 100, color: 'bg-emerald-500' };
      default:
        return { label: 'Weak', score: 10, color: 'bg-red-400' };
    }
  };

  const strength = getPasswordStrength();

  const validateForm = () => {
    let isValid = true;

    if (!password) {
      setPasswordError('New password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.auth.updateUser({
          password: password,
        });

        if (error) {
          showToast(error.message, 'error');
          setIsSubmitting(false);
        } else {
          showToast('Password updated successfully!', 'success');
          setSuccess(true);
        }
      } catch (err: any) {
        showToast(err.message || 'An error occurred while updating password.', 'error');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-20 px-6 overflow-hidden bg-gradient-to-b from-white via-lilac-50/40 to-lilac-100/10">
      {/* Decorative background blobs */}
      <div className="absolute top-1/4 left-1/10 w-80 h-80 bg-lilac-200/50 rounded-full glowing-blob" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-indigo-200/40 rounded-full glowing-blob" />

      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <button
          onClick={() => onNavigate('login')}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-lilac-600 font-semibold text-sm mb-6 cursor-pointer group transition-colors duration-200"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Sign In</span>
        </button>

        <GlassCard hoverEffect={false} className="border-slate-100/60 p-8 shadow-2xl">
          {/* Logo Title */}
          <div className="flex flex-col items-center mb-8">
            <TestoriaxLogo showText={true} textColor="text-slate-900" lightMode={true} />
            <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight mt-6 text-center">
              Reset Password
            </h2>
            <p className="text-slate-500 text-xs mt-1 text-center max-w-[280px]">
              Type in your new secure password below to regain access.
            </p>
          </div>

          {loadingSession ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-8 border-4 border-lilac-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs font-bold tracking-wide animate-pulse">
                Verifying recovery token...
              </p>
            </div>
          ) : !hasSession ? (
            <div className="text-center py-6 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center shadow-inner">
                <AlertCircle size={36} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Recovery Link Invalid</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  Your password recovery session has expired or is invalid. Please request a new recovery link.
                </p>
              </div>
              <button
                onClick={() => onNavigate('forgot-password')}
                className="w-full mt-4 py-3.5 bg-lilac-600 hover:bg-lilac-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-lilac-500/10"
              >
                Request New Link
              </button>
            </div>
          ) : success ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-6 flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Password Updated!</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  Your credentials have been successfully updated. You can now access your dashboard.
                </p>
              </div>

              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-lilac-600 to-indigo-600 hover:from-lilac-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition-all duration-300 shadow-md shadow-lilac-500/10"
              >
                Go to Dashboard
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* New Password input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    placeholder="Min. 6 characters"
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
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && (
                  <span className="text-[10px] text-red-500 font-semibold mt-0.5">{passwordError}</span>
                )}

                {/* Password strength meter */}
                {password && (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                      <span>Password Strength:</span>
                      <span className="text-slate-600 font-bold">{strength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    disabled={isSubmitting}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError('');
                    }}
                    placeholder="Repeat new password"
                    className={`w-full py-3.5 pl-11 pr-11 rounded-xl text-sm bg-white border outline-none transition-all duration-200 ${
                      confirmPasswordError
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200/50'
                        : 'border-slate-200/80 focus:border-lilac-400 focus:ring-2 focus:ring-lilac-200/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <span className="text-[10px] text-red-500 font-semibold mt-0.5">{confirmPasswordError}</span>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-lilac-600 to-indigo-600 hover:from-lilac-500 hover:to-indigo-500 transition-all duration-300 shadow-md shadow-lilac-500/10 hover:shadow-lg hover:shadow-lilac-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'Updating password...' : 'Update Password'}
              </button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default ResetPassword;
