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
      <div className="relative z-10 p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
        
        <div className="mb-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
            <ShieldAlert size={12} /> Master Recruiter Portal
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Administrator <span className="text-red-600">Login</span>
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-1">Authenticate credentials for candidate evaluations.</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="flex flex-col text-left group">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Mail size={14} className="text-red-600" /> Corporate Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-500 transition-all text-sm shadow-sm"
                placeholder="admin@sterling.com"
              />
            </div>
          </div>

          <div className="flex flex-col text-left group">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock size={14} className="text-red-600" /> Security Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-red-600/10 focus:border-red-500 transition-all text-sm shadow-sm"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="text-xs text-red-700 bg-red-50 p-4 rounded-2xl border border-red-200 font-semibold flex items-center gap-3 shadow-sm"
            >
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl font-bold uppercase tracking-wider text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
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
