import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import GlassCard from './ui/GlassCard';

interface PlanItem {
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: string[];
  cta: string;
  popular: boolean;
  gradient: string;
  borderClass: string;
}

interface PricingProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'forgot-password') => void;
}

export const Pricing: React.FC<PricingProps> = ({ onNavigate }) => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans: PlanItem[] = [
    {
      name: 'Starter',
      description: 'Ideal for individuals, classroom quizzes, and small team tests.',
      monthlyPrice: '0',
      yearlyPrice: '0',
      features: [
        'Up to 3 active test configurations',
        'Max 50 candidates per test lobby',
        'Standard MCQ and text layouts',
        'Basic accuracy scoring reports',
        'Community forum support'
      ],
      cta: 'Get Started Free',
      popular: false,
      gradient: 'from-slate-500/5 to-slate-600/5',
      borderClass: 'border-slate-100/60'
    },
    {
      name: 'Pro',
      description: 'Perfect for professional educators, tech recruiters, and active teams.',
      monthlyPrice: '29',
      yearlyPrice: '22',
      features: [
        'Unlimited active test configurations',
        'Up to 1,000 candidates per test lobby',
        'AI-Powered Test Architect helper',
        'Advanced diagnostics & cohort analytics',
        'Smart proctoring (anti-cheat locks)',
        'Personalized revision dispatching',
        'Priority email response (<12h)'
      ],
      cta: 'Start 14-Day Free Trial',
      popular: true,
      gradient: 'from-lilac-500/10 to-indigo-500/10',
      borderClass: 'border-lilac-400/80 ring-2 ring-lilac-400/20 shadow-glow'
    },
    {
      name: 'Enterprise',
      description: 'Tailored for scaling SaaS companies, universities, and enterprise assessments.',
      monthlyPrice: 'Custom',
      yearlyPrice: 'Custom',
      features: [
        'Unlimited test lobbies and candidates',
        'Custom SSO integration (SAML/OIDC)',
        'White-label portal & custom domains',
        'Dedicated success manager access',
        'Webhook, REST API, & database syncs',
        '99.99% high-availability uptime SLA',
        '24/7 dedicated support channel'
      ],
      cta: 'Contact Sales',
      popular: false,
      gradient: 'from-violet-500/5 to-violet-600/5',
      borderClass: 'border-slate-100/60'
    }
  ];

  return (
    <section id="pricing" className="py-24 px-6 relative bg-gradient-to-b from-lilac-100/15 via-white to-lilac-50/50 scroll-mt-20">
      
      {/* Decorative Blob */}
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-lilac-200/30 rounded-full glowing-blob" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block text-xs font-bold text-lilac-600 bg-lilac-50 px-3 py-1 rounded-full mb-3"
          >
            TRANSPARENT PRICING
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display font-extrabold text-4xl md:text-5xl text-slate-900 tracking-tight mb-5"
          >
            Choose Your Growth Track
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-600 text-base md:text-lg leading-relaxed mb-10"
          >
            No hidden setup fees. Scale your assessment engine up or down anytime. Start free and explore premium analytics.
          </motion.p>

          {/* Toggle Switch */}
          <div className="inline-flex items-center gap-3 bg-white/80 border border-slate-200/80 p-1.5 rounded-2xl shadow-sm backdrop-blur-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                !isAnnual
                  ? 'bg-gradient-to-r from-lilac-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                isAnnual
                  ? 'bg-gradient-to-r from-lilac-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Annual billing</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold animate-pulse">
                Save 25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan, idx) => {
            const price = isAnnual ? plan.yearlyPrice : plan.monthlyPrice;
            const isNumeric = !isNaN(Number(price));

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="flex"
              >
                <GlassCard
                  className={`flex flex-col justify-between w-full p-8 relative overflow-hidden ${plan.borderClass}`}
                  hoverEffect={!plan.popular}
                >
                  {/* Decorative Inner Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-b ${plan.gradient} opacity-50 pointer-events-none z-0`} />

                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-gradient-to-r from-lilac-600 to-indigo-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className="relative z-10">
                    <h3 className="font-display font-extrabold text-2xl text-slate-900 mb-2">{plan.name}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed mb-6 min-h-[40px]">{plan.description}</p>
                    
                    {/* Price section */}
                    <div className="flex items-baseline gap-1.5 mb-8">
                      {isNumeric ? (
                        <>
                          <span className="font-display font-extrabold text-5xl text-slate-900">${price}</span>
                          <span className="text-slate-400 text-xs font-semibold">/ month</span>
                        </>
                      ) : (
                        <span className="font-display font-extrabold text-4xl text-slate-900">{price}</span>
                      )}
                    </div>

                    <div className="w-full h-px bg-slate-200/60 mb-6" />

                    {/* Features checklist */}
                    <ul className="flex flex-col gap-4 mb-8">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-3 text-xs text-slate-600">
                          <Check size={14} className="text-lilac-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA button */}
                  <div className="relative z-10 mt-auto">
                    <button
                      onClick={() => onNavigate('register')}
                      className={`w-full py-3.5 px-4 rounded-2xl font-bold text-center block text-sm transition-all duration-300 cursor-pointer ${
                        plan.popular
                          ? 'bg-gradient-to-r from-lilac-600 to-indigo-600 hover:from-lilac-500 hover:to-indigo-500 text-white shadow-lg shadow-lilac-500/20 hover:shadow-xl hover:shadow-lilac-500/35 hover:-translate-y-0.5'
                          : 'bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 hover:text-lilac-600 hover:-translate-y-0.5'
                      }`}
                    >
                      {plan.cta}
                    </button>
                    {plan.popular && (
                      <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                        No credit card required. Cancel anytime.
                      </p>
                    )}
                  </div>

                </GlassCard>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default Pricing;
