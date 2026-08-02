import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ShieldCheck, Zap } from 'lucide-react';
import logoUrl from '../../assets/sterling_logo.png';

const STATUS_MESSAGES = [
  'Initializing Neural Assessment Engine...',
  'Connecting Cyber-Industrial Telemetry...',
  'Synchronizing Biometric Proctoring HUD...',
  'Calibrating Audio-Visual Spectrum Matrix...',
  'Establishing Encrypted Session Workspace...',
];

export default function LoadingScreen({ message = 'Loading System Workspace...', progress = null }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [simulatedProgress, setSimulatedProgress] = useState(15);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);

    const progInterval = setInterval(() => {
      setSimulatedProgress((prev) => (prev < 92 ? prev + Math.floor(Math.random() * 8 + 3) : 95));
    }, 250);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
    };
  }, []);

  const displayProgress = progress !== null ? progress : simulatedProgress;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* Ambient Pulsating Background Nebulas */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Cyber Grid Background Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
        
        {/* Holographic Laser Spinner Badge around Black Logo */}
        <div className="relative mb-8 group">
          {/* Outer Rotating HUD Laser Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4 rounded-full border-2 border-dashed border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.4)] pointer-events-none"
          />

          {/* Secondary Counter-Rotating Ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-2 rounded-full border border-red-400/30 pointer-events-none"
          />

          {/* PURE BLACK LOGO BADGE */}
          <div className="relative w-28 h-28 bg-black rounded-3xl border border-slate-800 shadow-[0_0_40px_rgba(220,38,38,0.4)] flex items-center justify-center p-4 overflow-hidden">
            {/* Glossy top reflections */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
            
            <img 
              src={logoUrl} 
              alt="Sterling Logo" 
              className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
            />
          </div>

          {/* Pulse Dot */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-red-500 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
        </div>

        {/* Brand Title */}
        <h2 className="text-2xl font-black text-white tracking-tight mb-1">
          Spark-<span className="text-red-500 drop-shadow-[0_0_12px_rgba(220,38,38,0.6)]">Hire</span>
        </h2>
        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.3em] mb-8">
          Sterling E-Mobility Control
        </p>

        {/* Dynamic Status Text Switcher */}
        <div className="h-8 mb-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-xs font-mono font-bold text-red-400 flex items-center gap-2 bg-red-950/40 px-4 py-1.5 rounded-full border border-red-500/30 shadow-inner"
            >
              <Cpu size={14} className="animate-spin text-red-400 shrink-0" />
              {message || STATUS_MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* High-Tech Segmented Progress Bar */}
        <div className="w-full bg-slate-900/90 rounded-2xl p-1.5 border border-slate-800 shadow-2xl relative mb-3 overflow-hidden">
          <div className="w-full bg-slate-950 rounded-xl h-3 relative overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-400 rounded-xl relative shadow-[0_0_15px_rgba(220,38,38,0.8)]"
              style={{ width: `${displayProgress}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_#fff]" />
            </motion.div>
          </div>
        </div>

        {/* Percentage & Security Telemetry Footer */}
        <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 font-bold px-1">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck size={14} className="text-emerald-400" /> ENCRYPTED HUD
          </span>
          <span className="text-red-400 font-extrabold">{displayProgress}%</span>
        </div>

      </div>
    </div>
  );
}

 
console.log(typeof Zap !== "undefined" ? Zap : "");
