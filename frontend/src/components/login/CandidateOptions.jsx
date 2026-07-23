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
      <div className="relative z-10 p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
        
        <div className="mb-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
            <UserCheck size={12} /> Candidate Portal
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Candidate <span className="text-red-600">Entry</span>
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-1">Enter your passwordless OTP candidate assessment portal.</p>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed shadow-sm">
            <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 text-[13px]">
              <Sparkles size={16} className="text-red-600" /> Passwordless OTP Authentication
            </div>
            Access your active interview queue, complete pre-flight equipment checks, or review your schedule.
          </div>

          <motion.button
            type="button"
            onClick={() => navigate('/candidate-login')}
            className="w-full py-4 px-6 rounded-2xl font-bold uppercase tracking-wider text-xs text-slate-900 bg-white hover:bg-slate-50 border border-red-100 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.15)] hover:shadow-[0_0_25px_rgba(220,38,38,0.25)] hover:border-red-300 active:scale-[0.99] group relative"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            Launch Candidate Login <ArrowRight size={16} className="text-red-600 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
