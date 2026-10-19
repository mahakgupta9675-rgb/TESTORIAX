import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

interface CTAProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password') => void;
}

export const CTA: React.FC<CTAProps> = ({ onNavigate }) => {
  return (
    <section className="py-20 px-6 relative bg-gradient-to-b from-lilac-50/50 to-lilac-100/25 overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-1/2 left-1/10 w-80 h-80 bg-lilac-200/50 rounded-full glowing-blob" />
      <div className="absolute bottom-0 right-1/10 w-96 h-96 bg-indigo-200/40 rounded-full glowing-blob" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="bg-gradient-to-r from-lilac-900 via-lilac-950 to-lilac-900 text-white border border-lilac-800/30 shadow-2xl p-8 md:p-16 rounded-[32px] overflow-hidden relative"
          >
            {/* Visual background rings */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(255,112,166,0.2),transparent_60%)] pointer-events-none" />

            <div className="max-w-2xl mx-auto text-center flex flex-col items-center relative z-10">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-lilac-200 mb-6 backdrop-blur-sm">
                <Sparkles size={12} className="text-lilac-300" />
                <span>Zero configuration required</span>
              </div>

              <h2 className="font-display font-extrabold text-3xl md:text-5xl tracking-tight leading-tight mb-6 text-white">
                Ready to Upgrade Your <br className="hidden sm:inline" /> Assessment Engine?
              </h2>
              
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-10 max-w-xl">
                Join thousands of teams using Testoriax to build secure tests, host live quizzes, evaluate skills with pinpoint accuracy, and unlock rapid scores improvement.
              </p>

              {/* Email Form */}
              <form
                onSubmit={(e) => e.preventDefault()}
                className="w-full max-w-md flex flex-col sm:flex-row gap-3.5 bg-white/5 border border-white/10 p-2 rounded-2xl md:rounded-3xl backdrop-blur-md shadow-inner"
              >
                <input
                  type="email"
                  placeholder="Enter your work email"
                  required
                  className="flex-grow bg-transparent text-white placeholder-slate-400 px-4 py-3 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-lilac-400"
                />
                <button
                  type="submit"
                  onClick={() => onNavigate('register')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-lilac-500 to-indigo-500 hover:from-lilac-400 hover:to-indigo-400 transition-all duration-300 shadow-md shadow-lilac-500/10 hover:shadow-lg hover:shadow-lilac-500/20 active:scale-[0.98] cursor-pointer"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              {/* Sub-features list */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-xs text-slate-400 font-semibold">
                <span>✓ 14-day free trial</span>
                <span>•</span>
                <span>✓ No credit card required</span>
                <span>•</span>
                <span>✓ Cancel anytime</span>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
