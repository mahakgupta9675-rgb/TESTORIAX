import React from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, Trophy, TrendingUp, Users, ArrowRight } from 'lucide-react';
import GlassCard from './ui/GlassCard';

interface HeroProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password') => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 80, damping: 15 },
    },
  };

  const taglineWords = ['Create.', 'Compete.', 'Analyze.', 'Improve.'];

  return (
    <section className="relative min-h-screen pt-32 pb-20 px-6 flex flex-col items-center overflow-hidden bg-gradient-to-b from-white via-lilac-50/45 to-lilac-100/15">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-lilac-200/50 rounded-full glowing-blob" />
      <div className="absolute top-1/3 right-1/10 w-80 h-80 bg-violet-200/40 rounded-full glowing-blob" />
      <div className="absolute -bottom-10 left-1/3 w-[500px] h-[350px] bg-lilac-100/30 rounded-full glowing-blob" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Headline and CTAs */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-6 flex flex-col text-center lg:text-left items-center lg:items-start"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-lilac-100/60 border border-lilac-200 text-xs font-semibold text-lilac-700 mb-6 backdrop-blur-sm shadow-sm"
          >
            <Sparkles size={13} className="animate-pulse" />
            <span>Introducing Testoriax v2.0 AI Engine</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemVariants}
            className="font-display font-extrabold text-5xl md:text-6xl lg:text-[64px] tracking-tight leading-[1.08] text-slate-900 mb-6"
          >
            Assessments that <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-lilac-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Elevate Performance
            </span>
          </motion.h1>

          {/* Tagline Words Animated */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-2 mb-6 font-display text-2xl md:text-3xl font-bold text-slate-800"
          >
            {taglineWords.map((word, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.2, type: 'spring' as const }}
                className={`${
                  idx === 0 ? 'text-indigo-600' :
                  idx === 1 ? 'text-pink-600' :
                  idx === 2 ? 'text-violet-600' : 'text-lilac-600'
                }`}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="text-base md:text-lg text-slate-600 leading-relaxed max-w-xl mb-8"
          >
            The ultimate SaaS platform to build online tests, host live competitive events, leverage state-of-the-art diagnostic analytics, and unlock personalized paths to improvement.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button
              onClick={() => onNavigate('register')}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-lilac-600 to-indigo-600 hover:from-lilac-500 hover:to-indigo-500 shadow-lg shadow-lilac-500/25 hover:shadow-xl hover:shadow-lilac-500/35 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <span>Start Free Trial</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-slate-700 bg-white/70 backdrop-blur-md border border-slate-200/80 hover:bg-white hover:border-lilac-300 hover:text-lilac-700 hover:-translate-y-1 shadow-sm transition-all duration-300"
            >
              <Play size={16} className="fill-slate-600 group-hover:fill-lilac-700" />
              <span>Watch Product Demo</span>
            </a>
          </motion.div>

          {/* Quick Metrics */}
          <motion.div
            variants={itemVariants}
            className="mt-10 grid grid-cols-3 gap-6 md:gap-10 border-t border-lilac-100/80 pt-8 w-full max-w-lg"
          >
            <div>
              <p className="font-display font-extrabold text-2xl md:text-3xl text-slate-900">10M+</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Tests Hosted</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl md:text-3xl text-slate-900">99.4%</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Test Integrity</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-2xl md:text-3xl text-slate-900">40%</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Avg Score Boost</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column: Immersive Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 50, damping: 15, delay: 0.4 }}
          className="lg:col-span-6 relative w-full flex justify-center"
        >
          {/* Main Dashboard Panel */}
          <GlassCard darker hoverEffect={false} className="w-full max-w-[540px] p-0 overflow-hidden shadow-2xl relative border-white/60">
            {/* Window bar */}
            <div className="bg-white/80 border-b border-lilac-100/50 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-xs text-slate-400 font-medium mx-auto">app.testoriax.io/dashboard</span>
            </div>

            {/* Dashboard Workspace */}
            <div className="bg-slate-50/50 p-4 md:p-6 grid grid-cols-12 gap-4">
              
              {/* Top Banner widget */}
              <div className="col-span-12 bg-white/95 rounded-2xl p-4 border border-lilac-100/40 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-slate-800 text-sm">Hi, Developer Team! 👋</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Your system accuracy went up 8% today.</p>
                </div>
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold">
                  <TrendingUp size={12} />
                  <span>+8.4%</span>
                </div>
              </div>

              {/* Statistics Strip */}
              <div className="col-span-12 grid grid-cols-3 gap-3">
                <div className="bg-white/95 rounded-xl p-3 border border-lilac-100/40 shadow-sm text-center">
                  <span className="text-[10px] text-slate-400 font-medium block">Participants</span>
                  <span className="font-display font-bold text-slate-800 text-sm">4,810</span>
                </div>
                <div className="bg-white/95 rounded-xl p-3 border border-lilac-100/40 shadow-sm text-center">
                  <span className="text-[10px] text-slate-400 font-medium block">Avg. Score</span>
                  <span className="font-display font-bold text-indigo-600 text-sm">82.5%</span>
                </div>
                <div className="bg-white/95 rounded-xl p-3 border border-lilac-100/40 shadow-sm text-center flex flex-col justify-center items-center">
                  <span className="text-[10px] text-slate-400 font-medium block">Security Level</span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold mt-0.5">
                    Proctor+
                  </span>
                </div>
              </div>

              {/* Main Chart widget */}
              <div className="col-span-12 md:col-span-7 bg-white/95 rounded-2xl p-4 border border-lilac-100/40 shadow-sm flex flex-col h-48">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-700">Performance Index</span>
                  <span className="text-[10px] text-slate-400">Weekly Trajectory</span>
                </div>
                {/* Visual Chart Mock (flex cols of varying heights representing bar graph) */}
                <div className="flex-1 flex items-end justify-between gap-2 px-1 pt-2">
                  {[45, 52, 60, 48, 70, 85, 92].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="w-full bg-slate-100 rounded-t-md relative h-28 flex items-end overflow-hidden">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: 0.8 + i * 0.1, duration: 0.6 }}
                          className={`w-full rounded-t-md bg-gradient-to-t ${
                            i === 6
                              ? 'from-lilac-600 to-indigo-500'
                              : 'from-lilac-200 to-indigo-100 group-hover:from-lilac-400 group-hover:to-indigo-300'
                          } transition-all duration-300`}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard widget */}
              <div className="col-span-12 md:col-span-5 bg-white/95 rounded-2xl p-4 border border-lilac-100/40 shadow-sm flex flex-col justify-between h-48">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Trophy size={12} className="text-amber-500" />
                    <span>Live Leaderboard</span>
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { rank: 1, name: 'Ava Mitchell', score: '982 XP', initial: 'AM', color: 'bg-amber-100 text-amber-700' },
                    { rank: 2, name: 'You (DevTeam)', score: '945 XP', initial: 'YT', color: 'bg-lilac-100 text-lilac-700 font-bold border border-lilac-300' },
                    { rank: 3, name: 'Ryan Cooper', score: '918 XP', initial: 'RC', color: 'bg-slate-100 text-slate-700' },
                  ].map((user) => (
                    <div key={user.rank} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${user.color}`}>
                          {user.rank}
                        </span>
                        <span className={`font-medium ${user.rank === 2 ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
                          {user.name}
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">{user.score}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </GlassCard>

          {/* Floating Badges */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="absolute top-10 -left-6 md:-left-12 z-20"
          >
            <GlassCard hoverEffect={false} className="py-2.5 px-4 flex items-center gap-2 border-white/80 shadow-lg rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users size={16} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Active Lobby</p>
                <p className="text-xs font-extrabold text-slate-800">1,200 Competitors</p>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 0.5 }}
            className="absolute -bottom-4 -right-2 md:-right-8 z-20"
          >
            <GlassCard hoverEffect={false} className="py-2.5 px-4 flex items-center gap-2.5 border-white/80 shadow-lg rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                <Trophy size={16} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Accuracy Boost</p>
                <p className="text-xs font-extrabold text-slate-800">+24% Average</p>
              </div>
            </GlassCard>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
