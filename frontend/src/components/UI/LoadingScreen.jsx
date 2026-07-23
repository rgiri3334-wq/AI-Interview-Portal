import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoUrl from '../../assets/sterling_logo.png';

const STATUS_MESSAGES = [
  'Waking up the neural engine...',
  'Preparing your secure workspace...',
  'Loading high-fidelity audio drivers...',
  'Connecting to Sterling telemetry...',
  'Finalizing biometric protocols...',
];

export default function LoadingScreen({ message = null, progress = null }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [simulatedProgress, setSimulatedProgress] = useState(12);

  useEffect(() => {
    // Rotate messages smoothly
    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2800);

    // Simulate smooth progress loading
    const progInterval = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev >= 98) return 98; // Stall at 98% until actually loaded
        const increment = Math.random() * 5 + 1;
        return Math.min(prev + increment, 98);
      });
    }, 400);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
    };
  }, []);

  const displayProgress = progress !== null ? progress : simulatedProgress;
  const currentMessage = message || STATUS_MESSAGES[msgIndex];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0c] text-white font-sans overflow-hidden select-none">
      
      {/* ── Ultra-Premium Animated Mesh Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-red-600/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] bg-rose-600/10 rounded-full blur-[100px]"
        />
      </div>

      {/* ── Central Glassmorphism Card ── */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center w-full max-w-[420px] px-8 py-12 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-3xl"
      >
        
        {/* Logo Container */}
        <div className="relative mb-8 group">
          {/* Subtle Breathing Glow */}
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-red-500 rounded-3xl blur-2xl"
          />
          
          {/* Pitch Black Logo Badge */}
          <div className="relative w-24 h-24 bg-[#050505] rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center p-4 overflow-hidden z-10">
            {/* Elegant glass reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.08] to-transparent pointer-events-none" />
            <img 
              src={logoUrl} 
              alt="Sterling Logo" 
              className="w-full h-full object-contain relative z-10 drop-shadow-md" 
            />
          </div>
        </div>

        {/* Brand Typography */}
        <h2 className="text-2xl font-bold tracking-tight text-white/90 mb-1">
          Spark-Hire <span className="text-red-500 font-light ml-1">AI</span>
        </h2>
        <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.25em] mb-10">
          By Sterling E-Mobility
        </p>

        {/* Loading Progress Bar */}
        <div className="w-full space-y-4">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative shadow-inner">
            <motion.div
              className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-red-600 to-rose-400 rounded-full shadow-[0_0_10px_rgba(225,29,72,0.6)]"
              style={{ width: `${displayProgress}%` }}
              transition={{ ease: "easeOut", duration: 0.4 }}
            >
              {/* Shimmer sweep effect */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
              />
            </motion.div>
          </div>

          {/* Dynamic Status Text */}
          <div className="flex items-center justify-between px-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={msgIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.4 }}
                className="text-xs font-medium text-white/50 tracking-wide"
              >
                {currentMessage}
              </motion.span>
            </AnimatePresence>
            <motion.span 
              className="text-xs font-bold text-white/80 tabular-nums"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {Math.round(displayProgress)}%
            </motion.span>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
