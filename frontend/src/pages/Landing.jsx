import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Brain, Eye, Mic, BarChart3, ArrowRight, CheckCircle, Shield, ArrowDown } from 'lucide-react';
import logoUrl from '../assets/sterling_logo.png'; 

const features = [
  { icon: Brain, title: 'AI Question Engine', desc: 'AI-powered dynamic questions tailored to each role and skill level.' },
  { icon: Eye, title: 'Emotion Detection', desc: 'Real-time facial expression and eye-contact analysis via computer vision.' },
  { icon: Mic, title: 'Voice Analytics', desc: 'Detects filler words, speech pace, clarity, and confidence patterns.' },
  { icon: BarChart3, title: 'Live Scorecards', desc: 'Instant technical & EQ scores with detailed feedback per question.' },
  { icon: Shield, title: 'Anti-Cheat Monitoring', desc: 'Eye gaze tracking and tab-switch detection for integrity assurance.' },
  { icon: Zap, title: 'Sterling-Grade Reports', desc: 'Enterprise-quality PDF-ready interview reports with AI summaries.' },
];

function useTypewriter(words, speed = 100) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (subIndex === words[index].length + 1 && !deleting) {
      setTimeout(() => setDeleting(true), 1500);
      return;
    }
    if (subIndex === 0 && deleting) {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }
    const timeout = setTimeout(() => {
      setText(words[index].substring(0, subIndex));
      setSubIndex((s) => s + (deleting ? -1 : 1));
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [subIndex, index, deleting, words, speed]);

  return text;
}

export default function Landing() {
  const navigate = useNavigate();
  const typed = useTypewriter([
    'Technical Interviews',
    'AI Evaluation',
    'Emotion Analysis',
    'Smart Hiring',
  ]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 overflow-x-hidden font-sans relative selection:bg-red-200 selection:text-red-900">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-100 opacity-30 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-red-50 opacity-40 blur-[100px]" />
      </div>

      {/* ── TOP NAV ── */}
      <nav className="fixed top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0 shadow-md">
            <img src={logoUrl} alt="Sterling Logo" className="w-7 h-7 object-contain mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <div className="hidden w-7 h-7 bg-red-600 text-white flex items-center justify-center font-bold text-xs rounded">St</div>
          </div>
          <span className="font-extrabold text-base tracking-wide text-slate-900">
            Spark-<span className="text-red-600">Hire</span>
            <span className="hidden sm:inline text-slate-400 text-[10px] ml-2 tracking-[0.2em] font-mono uppercase">by Sterling E-Mobility</span>
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <button className="text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-full text-sm transition-all shadow-[0_4px_14px_0_rgba(220,38,38,0.39)]" 
            onClick={() => navigate('/admin')}
          >
            Control Panel
          </motion.button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center p-8 z-10 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
          className="max-w-4xl w-full mx-auto flex flex-col items-center"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm"
          >
            <Shield size={14} /> Spark-Hire · Powered by Sterling
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6 tracking-tight text-slate-900">
            The Future of<br />
            <span className="text-red-600 bg-clip-text">{typed}</span>
            <span className="text-red-400 animate-pulse font-light">|</span>
          </h1>

          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            The definitive AI hiring engine for EV Powertrains and Embedded Systems Engineering. Context-aware, privacy-safe, and infinitely scalable.
          </p>

          <div className="flex gap-4 items-center justify-center flex-wrap w-full">
            <motion.button
              whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)' }} 
              whileTap={{ scale: 0.98 }}
              className="bg-red-600 text-white font-bold py-3.5 px-8 rounded-full text-sm transition-all flex items-center gap-2 uppercase tracking-wide"
              onClick={() => navigate('/admin')}
            >
              Control Panel <ArrowRight size={16} />
            </motion.button>
            <motion.button
              whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }} 
              whileTap={{ scale: 0.98 }}
              className="bg-white text-slate-800 font-bold py-3.5 px-8 rounded-full text-sm transition-all border border-slate-200 flex items-center gap-2 uppercase tracking-wide"
              onClick={() => navigate('/dashboard')}
            >
              HR Dashboard
            </motion.button>
            <motion.button
              whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)' }} 
              whileTap={{ scale: 0.98 }}
              className="bg-slate-900 text-white font-bold py-3.5 px-8 rounded-full text-sm transition-all border border-slate-900 flex items-center gap-2 uppercase tracking-wide"
              onClick={() => navigate('/system-health')}
            >
              System Health
            </motion.button>
          </div>
        </motion.div>
        
        <motion.div 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}
           className="absolute bottom-10 animate-bounce text-slate-400"
        >
          <ArrowDown size={24} />
        </motion.div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-20 px-6 max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight text-slate-900">
            Platform <span className="text-red-600">Capabilities</span>
          </h2>
          <p className="text-slate-500 text-base max-w-2xl mx-auto font-medium">
            Every layer of the interview process, supercharged with AI.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="group bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 transition-all duration-300 hover:border-red-200 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-default flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="w-14 h-14 rounded-2xl mb-5 bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner group-hover:bg-red-50 group-hover:border-red-100 transition-colors duration-300">
                <Icon size={24} className="text-slate-700 group-hover:text-red-600 transition-colors duration-300" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900 tracking-wide">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight text-slate-900">
              How It <span className="text-red-600">Works</span>
            </h2>
          </motion.div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-[2px] bg-slate-200 -translate-y-1/2 z-0" />
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
              {[
                { step: '01', title: 'Register', desc: 'Candidate details & resume upload' },
                { step: '02', title: 'Interview', desc: 'AI conducts live video & audio session' },
                { step: '03', title: 'Analyse', desc: 'Real-time EQ, voice & tech scoring' },
                { step: '04', title: 'Report', desc: 'Instant AI assessment generation' },
              ].map(({ step, title, desc }, i) => (
                <motion.div
                  key={step}
                  className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm relative overflow-hidden group hover:border-red-200 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                >
                  <div className="absolute -top-4 -right-4 text-7xl font-black text-slate-50 opacity-50 group-hover:text-red-50 transition-colors z-0 pointer-events-none">
                    {step}
                  </div>
                  <div className="relative z-10">
                    <div className="w-10 h-10 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm mb-4 group-hover:bg-red-600 transition-colors shadow-md">
                      {parseInt(step)}
                    </div>
                    <h4 className="text-base font-bold mb-2 text-slate-900">{title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA OVERHAUL ── */}
      <section className="py-24 px-6 flex justify-center relative z-10">
        <motion.div
          className="relative w-full max-w-4xl bg-white rounded-3xl p-10 md:p-14 border border-slate-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col items-center text-center"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          {/* Subtle Decorative Background inside CTA */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-50 via-white to-white opacity-80 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-100 opacity-50 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-6 shadow-sm relative z-10">
            <Zap size={28} className="text-red-600" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight text-slate-900 relative z-10">
            Ready to Manage Operations?
          </h2>
          <p className="text-slate-500 text-base mb-10 max-w-lg mx-auto font-medium relative z-10">
            Access enterprise root controls, manage candidate pipelines, and review system telemetry in real-time.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-10 relative z-10">
            {['Pipeline Control', 'System Telemetry', 'Role Configurator'].map((f, i) => (
              <motion.div 
                key={f} 
                initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + (i * 0.1) }}
                className="flex items-center gap-2 text-sm text-slate-700 font-semibold tracking-wide bg-slate-50 px-4 py-2 rounded-full border border-slate-100"
              >
                <CheckCircle size={16} className="text-red-600" /> {f}
              </motion.div>
            ))}
          </div>
          
          <motion.button 
            whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)' }} 
            whileTap={{ scale: 0.98 }}
            className="bg-red-600 text-white font-bold py-4 px-10 rounded-full text-sm transition-all flex items-center gap-3 uppercase tracking-wide shadow-lg relative z-10" 
            onClick={() => navigate('/admin')}
          >
            Open Control Panel <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-400 text-xs tracking-widest uppercase font-mono relative z-10 bg-slate-50">
        Spark-Hire &copy; 2025 &middot; Sterling E-Mobility
      </footer>
    </div>
  );
}
