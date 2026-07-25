import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ShieldAlert, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Confetti Particle Component ─────────────────────────────────────────────
function ConfettiBurst({ active }) {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400 - 100,
      rotation: Math.random() * 720 - 360,
      scale: Math.random() * 1.2 + 0.4,
      color: ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'][Math.floor(Math.random() * 7)],
      delay: Math.random() * 0.3,
      size: Math.random() * 8 + 4,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }));
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-50 flex items-center justify-center">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: p.scale, rotate: p.rotation }}
          transition={{ duration: 1.2 + Math.random() * 0.6, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.shape === 'circle' ? p.size : p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

export default function AdminLoginForm({ email, setEmail, password, setPassword, error, loading, handleLogin }) {
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLoginInternal = async (e) => {
    e.preventDefault();
    try {
      await handleLogin(e);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/home');
      }, 2500);
    } catch (err) {
      // Error handled by parent
    }
  };

  return (
    <motion.div 
      className="w-full max-w-md mx-auto relative"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <ConfettiBurst active={isSuccess} />

      <div className="relative z-10 p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden min-h-[400px] flex flex-col justify-center">
        
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
        
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
                  <ShieldAlert size={12} /> Master Recruiter Portal
                </div>
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Administrator <span className="text-red-600">Login</span>
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-1">Authenticate credentials for candidate evaluations.</p>
              </div>

              <form className="space-y-6" onSubmit={handleLoginInternal}>
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
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ type: "spring", duration: 0.6, delay: 0.1 }}
                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)] relative"
              >
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                <CheckCircle className="text-green-600 w-12 h-12 relative z-10" />
              </motion.div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Access Granted</h3>
              <p className="text-sm font-medium text-slate-500">Welcome back, Administrator.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
