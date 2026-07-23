import React from 'react';
import { motion } from 'framer-motion';
import { UserCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function CandidateOptions({ navigate }) {
  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    >
      <div className="relative z-10 p-8 sm:p-10 bg-slate-950/85 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Top Glow Ambient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />
        
        <div className="mb-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
            <UserCheck size={12} /> Candidate Portal
          </div>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">
            Candidate <span className="text-red-500">Entry</span>
          </h3>
          <p className="text-slate-400 text-xs font-medium mt-1">Enter your passwordless OTP candidate assessment portal.</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-slate-300 text-xs leading-relaxed">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-red-400" /> Passwordless OTP Authentication
            </div>
            Access your active interview queue, complete pre-flight equipment checks, or review your schedule.
          </div>

          <motion.button
            type="button"
            onClick={() => navigate('/candidate-login')}
            className="w-full py-4 px-6 rounded-2xl font-bold uppercase tracking-wider text-xs text-white bg-slate-900 hover:bg-slate-800 border border-white/10 transition-all flex items-center justify-center gap-2 shadow-lg hover:border-red-500/50 active:scale-[0.99]"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            Launch Candidate Login <ArrowRight size={16} className="text-red-500" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
