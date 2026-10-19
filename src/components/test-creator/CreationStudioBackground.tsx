import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, CheckCircle2, Code2, Trophy, Clock, GraduationCap, FileText, Layers, Percent } from 'lucide-react';

interface CreationStudioBackgroundProps {
  currentStep: number;
}

export const CreationStudioBackground: React.FC<CreationStudioBackgroundProps> = ({ currentStep }) => {
  const shouldReduceMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile || shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates around center (-1 to 1)
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile, shouldReduceMotion]);

  // Parallax offsets
  const bgOffset = { x: mousePos.x * 3, y: mousePos.y * 3 };
  const midOffset = { x: mousePos.x * 6, y: mousePos.y * 6 };
  const fgOffset = { x: mousePos.x * 10, y: mousePos.y * 10 };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
      
      {/* LAYER 1 — DEEP BACKGROUND & GRADIENT RADIAL ORBS */}
      <motion.div
        className="absolute inset-0 bg-[#fdfafb] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(236,72,153,0.12),rgba(255,255,255,0))]"
        style={{ x: bgOffset.x, y: bgOffset.y }}
      >
        {/* Soft Grid Overlay Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />

        {/* Ambient Gradient Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-tr from-pink-400/20 to-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] bg-gradient-to-br from-indigo-400/15 to-violet-400/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-[32rem] h-[32rem] bg-gradient-to-tr from-rose-300/20 to-pink-300/20 rounded-full blur-3xl" />
      </motion.div>

      {/* LAYER 2 — FLOATING 3D DECORATIVE OBJECTS (MIDDLE LAYER ~6px parallax) */}
      {!isMobile && (
        <motion.div
          className="absolute inset-0"
          style={{ x: midOffset.x, y: midOffset.y }}
        >
          {/* STEP 1 OBJECTS: AI Sparkle, 3D Question Card, Option A/B */}
          {currentStep === 1 && (
            <>
              {/* Floating 3D Question Card (Top Left) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 0.85,
                  y: shouldReduceMotion ? 0 : [0, -12, 0],
                  rotateZ: [0, 4, -4, 0],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-24 left-12 bg-white/80 backdrop-blur-md border border-pink-200/80 rounded-2xl p-4 shadow-xl flex items-center gap-3 w-48 shadow-pink-500/5"
              >
                <div className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-pink-500/20">
                  ?
                </div>
                <div>
                  <p className="text-[11px] font-extrabold text-slate-800">Question Card</p>
                  <p className="text-[10px] text-pink-600 font-bold">Multiple Choice</p>
                </div>
              </motion.div>

              {/* Floating Option B Badge (Top Right) */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{
                  opacity: 0.9,
                  y: shouldReduceMotion ? 0 : [0, 14, 0],
                  rotateZ: [0, -6, 6, 0],
                }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-28 right-16 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-2 border border-white/20"
              >
                <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs">B</span>
                <span className="text-xs font-bold">Option Selected</span>
              </motion.div>

              {/* Floating Code Brackets (Bottom Left) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.75,
                  y: shouldReduceMotion ? 0 : [0, -10, 0],
                  rotateZ: [0, 8, -4, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-28 left-16 bg-white/80 backdrop-blur-md border border-indigo-200 rounded-2xl p-3.5 shadow-lg flex items-center gap-2.5 text-indigo-600"
              >
                <Code2 size={20} />
                <span className="text-xs font-mono font-bold text-slate-700">&lt;CodingWorkspace /&gt;</span>
              </motion.div>
            </>
          )}

          {/* STEP 2 OBJECTS: Clock, Calendar, Score Ring */}
          {currentStep === 2 && (
            <>
              {/* Floating Clock Timer (Top Left) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.85,
                  y: shouldReduceMotion ? 0 : [0, -14, 0],
                  rotateZ: [0, 6, -6, 0],
                }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-24 left-16 bg-white/80 backdrop-blur-md border border-amber-200 rounded-2xl p-4 shadow-xl flex items-center gap-3 text-amber-600"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Assessment Duration</p>
                  <p className="text-[10px] text-amber-600 font-extrabold">60 Minutes Timer</p>
                </div>
              </motion.div>

              {/* Floating Score Ring (Top Right) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.9,
                  y: shouldReduceMotion ? 0 : [0, 12, 0],
                  rotateZ: [0, -5, 5, 0],
                }}
                transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-28 right-16 bg-white/80 backdrop-blur-md border border-rose-200 rounded-2xl p-4 shadow-xl flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-sm">
                  100
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Total Marks</p>
                  <p className="text-[10px] text-rose-600 font-extrabold">Pass Criteria: 60%</p>
                </div>
              </motion.div>

              {/* Floating Percentage Symbol (Bottom Right) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.7,
                  y: shouldReduceMotion ? 0 : [0, -12, 0],
                  rotateZ: [0, 10, -10, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-28 right-20 bg-gradient-to-r from-pink-500 to-purple-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center gap-2"
              >
                <Percent size={18} />
                <span className="text-xs font-bold">Negative Marking: 0.25</span>
              </motion.div>
            </>
          )}

          {/* STEP 3 OBJECTS: AI Neural Orb, Sparkles */}
          {currentStep === 3 && (
            <>
              {/* Floating AI Core Particle Badge (Top Left) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.9,
                  y: shouldReduceMotion ? 0 : [0, -16, 0],
                  rotateZ: [0, 5, -5, 0],
                }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-24 left-14 bg-gradient-to-r from-pink-500 to-indigo-600 text-white rounded-2xl p-4 shadow-xl flex items-center gap-3 border border-white/20"
              >
                <Sparkles size={20} className="text-pink-200 animate-pulse" />
                <div>
                  <p className="text-xs font-black">AI Studio Core</p>
                  <p className="text-[10px] text-pink-100 font-medium">NLP Question Generator</p>
                </div>
              </motion.div>

              {/* Floating Layers Document (Top Right) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.85,
                  y: shouldReduceMotion ? 0 : [0, 14, 0],
                  rotateZ: [0, -8, 8, 0],
                }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-28 right-16 bg-white/80 backdrop-blur-md border border-purple-200 rounded-2xl p-4 shadow-xl flex items-center gap-3 text-purple-600"
              >
                <Layers size={20} />
                <div>
                  <p className="text-xs font-bold text-slate-800">Auto Structured</p>
                  <p className="text-[10px] text-purple-600 font-extrabold">MCQ & Coding Prompts</p>
                </div>
              </motion.div>
            </>
          )}

          {/* STEP 4 OBJECTS: Lock, Trophy, Users */}
          {currentStep === 4 && (
            <>
              {/* Floating Public Globe Node (Top Left) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.85,
                  y: shouldReduceMotion ? 0 : [0, -14, 0],
                  rotateZ: [0, 6, -6, 0],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-24 left-16 bg-white/80 backdrop-blur-md border border-emerald-200 rounded-2xl p-4 shadow-xl flex items-center gap-3 text-emerald-600"
              >
                <CheckCircle2 size={20} />
                <div>
                  <p className="text-xs font-bold text-slate-800">Public Arena Access</p>
                  <p className="text-[10px] text-emerald-600 font-extrabold">Discoverable via Search</p>
                </div>
              </motion.div>

              {/* Floating Competition Trophy (Top Right) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.9,
                  y: shouldReduceMotion ? 0 : [0, 12, 0],
                  rotateZ: [0, -6, 6, 0],
                }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-28 right-16 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 shadow-xl flex items-center gap-3"
              >
                <Trophy size={20} />
                <div>
                  <p className="text-xs font-black">Live Competition</p>
                  <p className="text-[10px] text-amber-100 font-medium">Leaderboard & Prizes</p>
                </div>
              </motion.div>
            </>
          )}

          {/* STEP 5 OBJECTS: Launch Rocket, Graduation Cap, Trophy */}
          {currentStep === 5 && (
            <>
              {/* Floating Graduation Cap (Top Left) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.9,
                  y: shouldReduceMotion ? 0 : [0, -16, 0],
                  rotateZ: [0, 8, -8, 0],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-24 left-16 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl p-4 shadow-xl flex items-center gap-3"
              >
                <GraduationCap size={20} />
                <div>
                  <p className="text-xs font-black">Assessment Ready</p>
                  <p className="text-[10px] text-pink-100 font-medium">Verified Credentials</p>
                </div>
              </motion.div>

              {/* Floating Blueprint Document (Top Right) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.85,
                  y: shouldReduceMotion ? 0 : [0, 14, 0],
                  rotateZ: [0, -6, 6, 0],
                }}
                transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-28 right-16 bg-white/80 backdrop-blur-md border border-indigo-200 rounded-2xl p-4 shadow-xl flex items-center gap-3 text-indigo-600"
              >
                <FileText size={20} />
                <div>
                  <p className="text-xs font-bold text-slate-800">Blueprint Review</p>
                  <p className="text-[10px] text-indigo-600 font-extrabold">Instant Publishing</p>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      )}

      {/* LAYER 3 — FOREGROUND FLOATING SYMBOLS (~10px parallax) */}
      {!isMobile && (
        <motion.div
          className="absolute inset-0"
          style={{ x: fgOffset.x, y: fgOffset.y }}
        >
          {/* Subtle floating 3D question mark symbol bottom left */}
          <motion.div
            animate={{
              y: shouldReduceMotion ? 0 : [0, -20, 0],
              rotate: [0, 12, -12, 0],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-16 left-8 text-pink-300/40 text-7xl font-black font-display"
          >
            ?
          </motion.div>

          {/* Subtle floating 3D checkmark symbol bottom right */}
          <motion.div
            animate={{
              y: shouldReduceMotion ? 0 : [0, 18, 0],
              rotate: [0, -10, 10, 0],
            }}
            transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 right-10 text-indigo-300/40 text-6xl font-black font-display"
          >
            ✓
          </motion.div>
        </motion.div>
      )}

    </div>
  );
};

export default CreationStudioBackground;
