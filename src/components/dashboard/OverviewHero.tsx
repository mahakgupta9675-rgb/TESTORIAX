import React from 'react';
import { Calendar, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface OverviewHeroProps {
  userName?: string;
  userRole?: string;
  specialty?: string;
  totalAttempts?: number;
  avgAccuracy?: number;
}

export const OverviewHero: React.FC<OverviewHeroProps> = ({
  userName,
  specialty,
  totalAttempts = 0,
  avgAccuracy = 0,
}) => {
  // Compute time-based greeting dynamically
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedName = userName ? userName.split(' ')[0] : 'Challenger';

  return (
    <div className="w-full bg-gradient-to-r from-pink-100/90 via-pink-50/90 to-rose-100/90 text-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all border border-pink-200/80">
      {/* Background glowing soft baby pink radial Orbs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-pink-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/3 w-80 h-80 bg-rose-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-200/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">

        {/* LEFT SIDE: Hero Info & Greetings */}
        <div className="flex-1 flex flex-col gap-3 max-w-xl text-left">
          {/* Top Pill Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-pink-200 text-[11px] font-extrabold text-pink-600 uppercase tracking-widest shadow-2xs">
              <Sparkles size={13} className="text-pink-500" />
              <span>DASHBOARD OVERVIEW</span>
            </span>

            {specialty && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/80 border border-pink-200 text-[11px] font-bold text-slate-700 shadow-2xs">
                <ShieldCheck size={13} className="text-pink-500" />
                <span className="truncate max-w-[180px]">{specialty}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Platform Session</span>
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight mt-1">
            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600">{formattedName}</span> 👋
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Here's a snapshot of your assessments, learning progress, and real-time candidate activity.
          </p>

          {/* Real Metrics Quick Strip */}
          <div className="flex flex-wrap items-center gap-4 mt-2 pt-3 border-t border-pink-200/60 text-xs">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-500" />
              <span className="text-slate-700 font-semibold">{currentDateFormatted}</span>
            </div>

            {totalAttempts > 0 && (
              <div className="flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-lg border border-pink-200 shadow-2xs">
                <Zap size={13} className="text-amber-500" />
                <span className="text-slate-900 font-bold">{totalAttempts} Assessments</span>
                {avgAccuracy > 0 && (
                  <span className="text-pink-600 font-semibold">({avgAccuracy}% Acc)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: Assessment & Learning Vector Illustration in Baby Pink */}
        <div className="w-full lg:w-auto flex justify-center lg:justify-end shrink-0">
          <div className="relative w-64 h-56 sm:w-72 sm:h-60 flex items-center justify-center">
            {/* Ambient Backlight Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-300/40 to-rose-300/40 rounded-3xl blur-xl" />

            {/* Assessment Vector Illustration Canvas */}
            <svg
              viewBox="0 0 280 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full relative z-10 drop-shadow-xl select-none"
            >
              <defs>
                <linearGradient id="cardGradPink" x1="0" y1="0" x2="240" y2="200" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fce7f3" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="babyPinkGrad" x1="0" y1="0" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                <linearGradient id="roseClockGrad" x1="0" y1="0" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#d14b80ff" />
                </linearGradient>
              </defs>

              {/* Background Glass Plate */}
              <rect x="20" y="20" width="240" height="200" rx="20" fill="url(#cardGradPink)" stroke="#fbcfe8" strokeWidth="1.5" />

              {/* Exam Paper Sheet */}
              <rect x="55" y="45" width="130" height="150" rx="12" fill="#ffffff" filter="drop-shadow(0 4px 6px rgba(236,72,153,0.1))" />
              {/* Paper header bar */}
              <rect x="70" y="60" width="65" height="8" rx="4" fill="#ec4899" />
              <rect x="145" y="60" width="25" height="8" rx="4" fill="#fbcfe8" />

              {/* Question lines with checkbox ticks */}
              {/* Line 1 */}
              <circle cx="74" cy="88" r="6" fill="#10b981" />
              <path d="M71 88L73 90L77 86" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="88" y="85" width="80" height="6" rx="3" fill="#fce7f3" />

              {/* Line 2 */}
              <circle cx="74" cy="112" r="6" fill="#10b981" />
              <path d="M71 112L73 114L77 110" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="88" y="109" width="70" height="6" rx="3" fill="#fce7f3" />

              {/* Line 3 */}
              <circle cx="74" cy="136" r="6" fill="#ec4899" />
              <path d="M71 136L73 138L77 134" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="88" y="133" width="75" height="6" rx="3" fill="#fce7f3" />

              {/* Progress Bar inside Exam Sheet */}
              <rect x="70" y="162" width="100" height="8" rx="4" fill="#fdf2f8" />
              <rect x="70" y="162" width="82" height="8" rx="4" fill="url(#babyPinkGrad)" />

              {/* Floating Element 1: Score Badge Top Right */}
              <g transform="translate(170, 30)">
                <rect x="0" y="0" width="80" height="52" rx="14" fill="#ffffff" stroke="#fbcfe8" strokeWidth="1" filter="drop-shadow(0 8px 12px rgba(236,72,153,0.15))" />
                <text x="40" y="24" textAnchor="middle" fill="#831843" fontSize="11" fontWeight="800" fontFamily="sans-serif">ACCURACY</text>
                <text x="40" y="42" textAnchor="middle" fill="#db2777" fontSize="16" fontWeight="900" fontFamily="sans-serif">94.2%</text>
              </g>

              {/* Floating Element 2: Timer Clock Bottom Left */}
              <g transform="translate(15, 140)">
                <rect x="0" y="0" width="64" height="64" rx="16" fill="url(#roseClockGrad)" filter="drop-shadow(0 8px 12px rgba(225,29,72,0.25))" />
                <circle cx="32" cy="32" r="16" stroke="#ffffff" strokeWidth="2.5" fill="none" />
                <path d="M32 22V32L38 35" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Floating AI Sparkles Star Top Left */}
              <g transform="translate(25, 30)">
                <circle cx="16" cy="16" r="16" fill="#f472b6" fillOpacity="0.25" />
                <path d="M16 6L18.5 13.5L26 16L18.5 18.5L16 26L13.5 18.5L6 16L13.5 13.5L16 6Z" fill="#db2777" />
              </g>

              {/* Verified Check Badge Bottom Right */}
              <g transform="translate(195, 155)">
                <circle cx="22" cy="22" r="22" fill="#10b981" filter="drop-shadow(0 4px 10px rgba(16,185,129,0.3))" />
                <path d="M14 22L19 27L30 16" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OverviewHero;
