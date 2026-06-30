import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const GOODBYES = [
  "It was a genuine pleasure getting to know you today.",
  "You brought a lot of energy and thought to this session.",
  "Thank you for your time and authenticity today.",
  "This was a great conversation — thank you for being open.",
  "Your answers showed real depth. Thank you for sharing.",
];

export default function InterviewGoodbye() {
  const navigate = useNavigate();
  const location = useLocation();
  const terminationReason = location.state?.terminationReason;

  const candidateName = sessionStorage.getItem('candidateName') || 'there';
  const firstName = candidateName.split(' ')[0];
  const [goodbye] = useState(() => GOODBYES[Math.floor(Math.random() * GOODBYES.length)]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // If terminated, do not auto-redirect
    if (terminationReason) return;

    // Animate progress bar over 5 seconds then redirect
    const start = Date.now();
    const duration = 5000;
    const iv = setInterval(() => {
      const pct = Math.min((Date.now() - start) / duration, 1);
      setProgress(pct);
      if (pct >= 1) {
        clearInterval(iv);
        navigate('/candidate-home');
      }
    }, 50);
    return () => clearInterval(iv);
  }, [navigate, terminationReason]);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
    size: 4 + Math.random() * 8,
    color: ['#dc2626', '#f59e0b', '#10b981', '#6366f1', '#f43f5e'][Math.floor(Math.random() * 5)],
  }));

  if (terminationReason) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-lg w-full bg-red-950/40 border border-red-500/50 rounded-2xl p-8 backdrop-blur-md shadow-[0_0_80px_rgba(220,38,38,0.2)] text-center"
        >
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Interview Terminated</h1>
          <p className="text-red-200 text-lg mb-8 leading-relaxed">
            {terminationReason}
          </p>
          <div className="bg-black/50 p-4 rounded-lg border border-red-500/20 text-sm text-red-300/80 mb-8">
            This incident has been logged and reported to the administrative team for review. 
            Any recorded footage prior to termination has been saved.
          </div>
          <button
            onClick={() => navigate('/candidate-home')}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 flex items-center justify-center overflow-hidden relative font-sans">
      {/* Confetti particles */}
      {particles.map(p => (
        <motion.div key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0, rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
          transition={{ delay: p.delay, duration: p.duration, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 rounded-sm pointer-events-none"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
        />
      ))}

      {/* Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
        className="relative z-10 text-center px-8 max-w-xl"
      >
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
          className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(220,38,38,0.5)]"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-5xl"
          >
            ✓
          </motion.span>
        </motion.div>

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-4">
            Thank you,<br />
            <span className="text-red-400">{firstName}</span>.
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-slate-300 text-xl font-medium leading-relaxed mb-10"
        >
          {goodbye}
        </motion.p>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          <p className="text-slate-500 text-sm font-medium mb-4">
            Redirecting you to your portal in a moment…
          </p>
          {/* Progress bar */}
          <div className="w-64 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
            <motion.div
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <button
            onClick={() => navigate('/candidate-home')}
            className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-colors text-sm"
          >
            Go to My Portal →
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
