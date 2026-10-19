import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import TestoriaxLogo from '../ui/TestoriaxLogo';
import { useToast } from '../../context/ToastContext';
import supabase from '../../lib/supabaseClient';

interface ForgotPasswordProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard') => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateEmail(email)) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });

        if (error) {
          showToast(error.message, 'error');
          setIsSubmitting(false);
        } else {
          showToast('Reset email sent successfully!', 'success');
          setSuccess(true);
        }
      } catch (err: any) {
        showToast(err.message || 'An error occurred.', 'error');
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
              Enter your email and we'll dispatch instructions to reset your credentials.
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-6 flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Reset Email Dispatched!</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  We've sent a password recovery link to <strong className="text-slate-700 font-semibold">{email}</strong>. Please check your inbox and spam folder.
                </p>
              </div>
              
              <button
                onClick={() => onNavigate('login')}
                className="w-full mt-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                Return to Login
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* Email Input Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
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

              {/* Submit Dispatch Link button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-lilac-600 to-indigo-600 hover:from-lilac-500 hover:to-indigo-500 transition-all duration-300 shadow-md shadow-lilac-500/10 hover:shadow-lg hover:shadow-lilac-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'Dispatching link...' : 'Send Recovery Instructions'}
              </button>
            </form>
          )}

        </GlassCard>
      </div>
    </div>
  );
};

export default ForgotPassword;
