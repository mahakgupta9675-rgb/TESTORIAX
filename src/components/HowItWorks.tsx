import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Users2, BrainCircuit } from 'lucide-react';
import GlassCard from './ui/GlassCard';

interface StepItem {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  colorClass: string;
  iconColor: string;
  bgCircle: string;
}

export const HowItWorks: React.FC = () => {
  const steps: StepItem[] = [
    {
      number: '01',
      icon: <LayoutGrid size={28} />,
      title: 'Design & Configure',
      description: 'Use the AI-assisted architect or visual blocks to build tests. Customize timelines, access restrictions, question layouts, and scoring formulas.',
      colorClass: 'text-indigo-600',
      iconColor: 'text-indigo-600',
      bgCircle: 'bg-indigo-50'
    },
    {
      number: '02',
      icon: <Users2 size={28} />,
      title: 'Deploy & Engage',
      description: 'Launch synchronous lobbies or asynchronous assessment slots. Candidates log in, undergo browser validation, and complete the tests securely.',
      colorClass: 'text-pink-600',
      iconColor: 'text-pink-600',
      bgCircle: 'bg-pink-50'
    },
    {
      number: '03',
      icon: <BrainCircuit size={28} />,
      title: 'Inspect & Adapt',
      description: 'Get immediate reports. Candidates receive automatic analytics highlighting errors, while the AI schedules target practices to seal knowledge gaps.',
      colorClass: 'text-violet-600',
      iconColor: 'text-violet-600',
      bgCircle: 'bg-violet-50'
    }
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 relative bg-gradient-to-b from-lilac-50 via-white to-lilac-50/60 overflow-hidden scroll-mt-20">
      
      {/* Decorative background gradients */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-violet-100/30 rounded-full glowing-blob" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-lilac-100/30 rounded-full glowing-blob" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block text-xs font-bold text-lilac-600 bg-lilac-50 px-3 py-1 rounded-full mb-3"
          >
            WORKFLOW
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display font-extrabold text-4xl md:text-5xl text-slate-900 tracking-tight mb-5"
          >
            How Testoriax Drives Growth
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-600 text-base md:text-lg leading-relaxed"
          >
            A continuous loop of creation, competition, metrics tracking, and personalized optimization. Simple for hosts, empowering for test takers.
          </motion.p>
        </div>

        {/* Steps container */}
        <div className="relative">
          {/* Horizontal line connector for desktop */}
          <div className="hidden lg:block absolute top-[100px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-indigo-200 via-pink-200 to-violet-200" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: idx * 0.2, type: 'spring' as const }}
                className="flex flex-col items-center text-center relative"
              >
                {/* Number Backdrop */}
                <div className="absolute -top-12 text-[90px] font-display font-extrabold text-slate-100 select-none pointer-events-none z-0">
                  {step.number}
                </div>

                {/* Step Icon Container */}
                <div className="relative z-10 mb-8 flex items-center justify-center">
                  <div className={`w-20 h-20 rounded-3xl ${step.bgCircle} shadow-md border border-white flex items-center justify-center ${step.iconColor} hover:scale-105 transition-transform duration-300`}>
                    {step.icon}
                  </div>
                </div>

                {/* Content Card */}
                <GlassCard hoverEffect={true} className="w-full relative z-10 border-slate-100/60 p-8 flex-1 flex flex-col justify-start">
                  <h3 className="font-display font-bold text-xl text-slate-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
