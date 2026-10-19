import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import GlassCard from './ui/GlassCard';

interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  company: string;
  metric: string;
  metricLabel: string;
  avatar: string;
  rating: number;
}

export const Testimonials: React.FC = () => {
  const testimonials: TestimonialItem[] = [
    {
      quote: "Testoriax transformed our internal tech assessments. We created a 100-person coding competition within 20 minutes, and the live leaderboard drove incredible team engagement.",
      author: "Marcus Vance",
      role: "VP of Engineering",
      company: "DevScale Corp",
      metric: "+34%",
      metricLabel: "Evaluation Efficiency",
      avatar: "MV",
      rating: 5
    },
    {
      quote: "The diagnostic analytics are incredibly detailed. Candidates receive instant breakdown reports on what topics to revise, helping our coding bootcamps boost test scores by 40%.",
      author: "Sarah Lin",
      role: "Lead Curriculum Director",
      company: "EduSphere Academies",
      metric: "4.8/5.0",
      metricLabel: "Candidate Satisfaction",
      avatar: "SL",
      rating: 5
    },
    {
      quote: "AI-assisted test generation is a lifesaver. I upload our API docs, and Testoriax designs multi-tiered, challenging exam patterns instantly. The browser proctoring works perfectly.",
      author: "Devon Reynolds",
      role: "Technical Lead",
      company: "Optima SaaS Labs",
      metric: "12 hrs",
      metricLabel: "Weekly Time Saved",
      avatar: "DR",
      rating: 5
    }
  ];

  return (
    <section id="testimonials" className="py-24 px-6 relative bg-gradient-to-b from-lilac-50/60 to-lilac-100/15 scroll-mt-20">
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
            TRUSTED BY TEAMS
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display font-extrabold text-4xl md:text-5xl text-slate-900 tracking-tight mb-5"
          >
            Success Stories
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-600 text-base md:text-lg leading-relaxed"
          >
            See how organizations, educators, and individual competitors achieve outstanding performance leaps with Testoriax.
          </motion.p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
            >
              <GlassCard className="h-full flex flex-col justify-between p-8 border-slate-100/60 relative">
                
                {/* Quote Icon */}
                <div className="absolute top-6 right-8 text-lilac-100 opacity-70">
                  <Quote size={40} className="fill-lilac-50" />
                </div>

                <div className="relative z-10">
                  {/* Rating Stars */}
                  <div className="flex gap-1 mb-5">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Quote text */}
                  <p className="text-slate-600 text-sm leading-relaxed italic mb-8">
                    "{t.quote}"
                  </p>
                </div>

                <div className="relative z-10 flex flex-col gap-6">
                  {/* Performance Metric Box */}
                  <div className="bg-gradient-to-r from-lilac-500/5 to-indigo-500/5 border border-lilac-100/30 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">RESULT</p>
                      <p className="text-xs text-slate-700 font-bold mt-0.5">{t.metricLabel}</p>
                    </div>
                    <span className="font-display font-extrabold text-2xl text-lilac-600">
                      {t.metric}
                    </span>
                  </div>

                  {/* Author Profile */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lilac-600 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-lilac-500/10">
                      {t.avatar}
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-slate-900 text-sm">{t.author}</h4>
                      <p className="text-[11px] text-slate-400 font-medium">{t.role}, {t.company}</p>
                    </div>
                  </div>
                </div>

              </GlassCard>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Testimonials;
