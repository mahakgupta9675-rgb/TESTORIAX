import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import TestoriaxLogo from '../ui/TestoriaxLogo';
import SocialButtons from './SocialButtons';
import { useToast } from '../../context/ToastContext';
import supabase from '../../lib/supabaseClient';

interface RegisterProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard') => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Dynamic Password Strength Meter
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

  // Full validation checks
  const validateForm = () => {
    let isValid = true;

    // Name check
    if (!name.trim()) {
      setNameError('Full name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    // Email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Password check
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      isValid = false;
    } else {
      setPasswordError('');
    }

    // Match check
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (error) {
          showToast(error.message, 'error');
          setIsSubmitting(false);
          return;
        }

        // Create profile automatically in the database
        if (data.user) {
          const newProfile = {
            id: data.user.id,
            full_name: name,
            email: email,
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
            specialty: 'Full-Stack Developer & Technical Writer',
            bio: 'Passionate developer and educator.',
            created_at: new Date().toISOString(),
          };

          const { error: profileError } = await supabase.from('profiles').insert(newProfile);
          if (profileError) {
            console.error('Error inserting profile row:', profileError.message);
          }
        }

        showToast('Account created successfully!', 'success');
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { state: location.state });
        }, 1500);
      } catch (err: any) {
        showToast(err.message || 'An error occurred during registration.', 'error');
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
              Create Account
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Start hosting assessments & live quiz lobbies today
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
                <h3 className="font-display font-bold text-lg text-slate-900">Account Created!</h3>
                <p className="text-slate-500 text-xs mt-1.5">Taking you to sign in view...</p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Form Input fields */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                {/* Full name input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled={isSubmitting || isGoogleLoading}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError) setNameError('');
                      }}
                      placeholder="Jane Doe"
                      className={`w-full py-3.5 pl-11 pr-4 rounded-xl text-sm bg-white border outline-none transition-all duration-200 ${
                        nameError
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200/50'
                          : 'border-slate-200/80 focus:border-lilac-400 focus:ring-2 focus:ring-lilac-200/50'
                      }`}
                    />
                  </div>
                  {nameError && (
                    <span className="text-[10px] text-red-500 font-semibold mt-0.5">{nameError}</span>
                  )}
                </div>

                {/* Email address input */}
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
                        if (emailError) setEmailError('');
                      }}
                      placeholder="jane@company.com"
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

                {/* Password input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      disabled={isSubmitting || isGoogleLoading}
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
                      disabled={isSubmitting || isGoogleLoading}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError('');
                      }}
                      placeholder="Repeat password"
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
                  disabled={isSubmitting || isGoogleLoading}
                  className="w-full mt-3 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-lilac-600 to-indigo-600 hover:from-lilac-500 hover:to-indigo-500 transition-all duration-300 shadow-md shadow-lilac-500/10 hover:shadow-lg hover:shadow-lilac-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              {/* Separator line */}
              <div className="relative my-7 flex items-center justify-center">
                <div className="w-full h-px bg-slate-200/60" />
                <span className="absolute bg-[#fffafb] px-3.5 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                  Or Sign Up With
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

              {/* Switch view link */}
              <p className="text-center text-xs text-slate-500 font-medium mt-8">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login', { state: location.state })}
                  className="font-bold text-lilac-600 hover:text-lilac-700 transition-colors"
                >
                  Sign in instead
                </button>
              </p>
            </>
          )}

        </GlassCard>
      </div>
    </div>
  );
};

export default Register;
