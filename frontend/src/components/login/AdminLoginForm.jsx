import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';

export default function AdminLoginForm({ email, setEmail, password, setPassword, error, loading, handleLogin }) {
  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative z-10 p-8 sm:p-10 bg-slate-950/85 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Top Glow Ambient Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-400" />
        
        <div className="mb-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
            <ShieldAlert size={12} /> Master Recruiter Portal
          </div>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">
            Administrator <span className="text-red-500">Login</span>
          </h3>
          <p className="text-slate-400 text-xs font-medium mt-1">Authenticate credentials for candidate evaluations.</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="flex flex-col text-left group">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail size={14} className="text-red-500" /> Corporate Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-900/90 border border-white/10 rounded-2xl text-white font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all text-sm shadow-inner"
                placeholder="admin@sterling.com"
              />
            </div>
          </div>

          <div className="flex flex-col text-left group">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock size={14} className="text-red-500" /> Security Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-900/90 border border-white/10 rounded-2xl text-white font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all text-sm shadow-inner"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="text-xs text-red-400 bg-red-950/40 p-4 rounded-2xl border border-red-500/30 font-semibold flex items-center gap-3 shadow-inner"
            >
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl font-bold uppercase tracking-wider text-xs text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={16} /> Authenticating Access...</>
            ) : (
              <>Authenticate Access <ArrowRight size={16} /></>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
