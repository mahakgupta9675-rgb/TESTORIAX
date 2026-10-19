import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Cpu, Zap, BrainCircuit } from 'lucide-react';

interface AIOrbCoreProps {
  isGenerating?: boolean;
}

export const AIOrbCore: React.FC<AIOrbCoreProps> = ({ isGenerating = false }) => {
  return (
    <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center select-none pointer-events-none">
      
      {/* Outer Ambient Backlight Radial Glow */}
      <motion.div
        animate={{
          scale: isGenerating ? [1, 1.25, 1] : [1, 1.1, 1],
          opacity: isGenerating ? [0.4, 0.8, 0.4] : [0.3, 0.5, 0.3],
        }}
        transition={{ duration: isGenerating ? 1.5 : 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-tr from-pink-500/40 via-purple-500/30 to-indigo-600/40 rounded-full blur-3xl"
      />

      {/* Rotating Outer Circuit Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: isGenerating ? 8 : 25, repeat: Infinity, ease: "linear" }}
        className="absolute inset-2 border-2 border-dashed border-pink-400/40 rounded-full"
      />

      {/* Counter-Rotating Inner Circuit Ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: isGenerating ? 6 : 18, repeat: Infinity, ease: "linear" }}
        className="absolute inset-6 border border-indigo-400/30 rounded-full"
      />

      {/* Central Glowing Core Sphere */}
      <motion.div
        animate={{
          scale: isGenerating ? [0.95, 1.08, 0.95] : [0.98, 1.02, 0.98],
        }}
        transition={{ duration: isGenerating ? 1.2 : 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-600 rounded-full p-1 shadow-2xl flex items-center justify-center shadow-pink-500/30 border border-white/40"
      >
        <div className="w-full h-full rounded-full bg-slate-950/60 backdrop-blur-md flex items-center justify-center relative overflow-hidden">
          
          {/* Inner Light Beams */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.3)_0,transparent_70%)] animate-pulse" />

          {/* Central AI Icon */}
          {isGenerating ? (
            <Zap size={36} className="text-amber-300 animate-bounce relative z-10" />
          ) : (
            <BrainCircuit size={36} className="text-pink-300 relative z-10" />
          )}
        </div>
      </motion.div>

      {/* Orbiting Sparkles */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: isGenerating ? 4 : 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 flex items-center justify-between p-1"
      >
        <div className="w-6 h-6 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md shadow-pink-500/20 text-pink-600">
          <Sparkles size={12} />
        </div>
        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
          <Cpu size={12} />
        </div>
      </motion.div>

    </div>
  );
};

export default AIOrbCore;
