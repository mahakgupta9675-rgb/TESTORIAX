import React from 'react';
import { motion } from 'framer-motion';
import { FilePlus2, Trophy, BarChart3, TrendingUp, CheckCircle2 } from 'lucide-react';
import GlassCard from './ui/GlassCard';

interface FeatureItem {
  icon: React.ReactNode;
  tag: string;
  title: string;
  description: string;
  bullets: string[];
  gradient: string;
  iconBg: string;
  iconColor: string;
}

export const Features: React.FC = () => {
  const features: FeatureItem[] = [
    {
      icon: <FilePlus2 size={24} />,
      tag: 'CREATE',
      title: 'AI-Powered Test Architect',
      description: 'Generate comprehensive assessments from codebases, textbooks, or documentation in seconds using our intelligent fine-tuned LLMs.',
      bullets: [
        'Markdown, LaTeX, and code snippets',
        'Automatic difficulty levels adjustment',
        'Bulk import via CSV or raw text files',
        'AI prompt-to-assessment workflow'
      ],
      gradient: 'from-indigo-500/10 to-indigo-600/5',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600'
    },
    {
      icon: <Trophy size={24} />,
      tag: 'COMPETE',
      title: 'High-Fidelity Live Lobbies',
      description: 'Host concurrent tests with thousands of participants. Experience lag-free leaderboards, active multiplayer lobbies, and proctoring controls.',
      bullets: [
        'Real-time ranking & live scoreboard',
        'Smart AI proctoring (anti-cheat)',
        'Lobby chat & team matching options',
        'Webcam/microphone validation APIs'
      ],
      gradient: 'from-pink-500/10 to-pink-600/5',
      iconBg: 'bg-pink-50',
      iconColor: 'text-pink-600'
    },
    {
      icon: <BarChart3 size={24} />,
      tag: 'ANALYZE',
      title: 'Deep Performance Analytics',
      description: 'Go beyond scores. Drill down into time spent per question, error logs, and cognitive category metrics with our customized visual reports.',
      bullets: [
        'Time-allocation heatmaps',
        'Concept strengths & weaknesses tags',
        'Cohort-wide distribution metrics',
        'Export reports in PDF/CSV formats'
      ],
      gradient: 'from-violet-500/10 to-violet-600/5',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600'
    },
    {
      icon: <TrendingUp size={24} />,
      tag: 'IMPROVE',
      title: 'Adaptive Learning Pathways',
      description: 'Testoriax auto-curates micro-practices based on analytical results, guiding learners on precise sub-topics to optimize retention and growth.',
      bullets: [
        'Tailored practice questions',
        'Spaced repetition smart queue',
        'Weakness-focused test simulators',
        'Milestone badging and rewards'
      ],
      gradient: 'from-lilac-500/10 to-lilac-600/5',
      iconBg: 'bg-lilac-50',
      iconColor: 'text-lilac-600'
    }
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 60, damping: 15 }
    }
  };

  return (
    <section id="features" className="py-24 px-6 relative bg-gradient-to-b from-lilac-100/15 to-lilac-50 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block text-xs font-bold text-lilac-600 bg-lilac-50 px-3 py-1 rounded-full mb-3"
          >
            PLATFORM FEATURES
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display font-extrabold text-4xl md:text-5xl text-slate-900 tracking-tight mb-5"
          >
            Assess Smarter. Improve Faster.
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-600 text-base md:text-lg leading-relaxed"
          >
            Everything you need to orchestrate assessments, power group competitions, inspect cognitive metrics, and level up performance.
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {features.map((feature, idx) => (
            <motion.div key={idx} variants={cardVariants}>
              <GlassCard className="h-full border-slate-100 flex flex-col justify-between overflow-hidden relative group p-8">
                {/* Decorative Inner Glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                
                <div className="relative z-10">
                  {/* Tag and Icon row */}
                  <div className="flex justify-between items-start mb-6">
                    <span className={`text-[11px] font-extrabold tracking-wider ${feature.iconColor}`}>
                      {feature.tag}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl ${feature.iconBg} ${feature.iconColor} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-display font-bold text-2xl text-slate-900 mb-3 group-hover:text-lilac-800 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {feature.description}
                  </p>

                  {/* Bullets */}
                  <ul className="flex flex-col gap-3">
                    {feature.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-center gap-2.5 text-xs text-slate-600">
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default Features;
