import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Brain, Eye, Mic, BarChart3, ArrowRight, CheckCircle, Shield } from 'lucide-react';
import ParticleCanvas from '../components/UI/ParticleCanvas';
import logoUrl from '../assets/sparkhire_ai_logo.jpeg'; // BUG-06 fix: Use bundled asset, not absolute machine path

const features = [
  { icon: Brain, title: 'AI Question Engine', desc: 'AI-powered dynamic questions tailored to each role and skill level.' },
  { icon: Eye, title: 'Emotion Detection', desc: 'Real-time facial expression and eye-contact analysis via computer vision.' },
  { icon: Mic, title: 'Voice Analytics', desc: 'Detects filler words, speech pace, clarity, and confidence patterns.' },
  { icon: BarChart3, title: 'Live Scorecards', desc: 'Instant technical & EQ scores with detailed feedback per question.' },
  { icon: Shield, title: 'Anti-Cheat Monitoring', desc: 'Eye gaze tracking and tab-switch detection for integrity assurance.' },
  { icon: Zap, title: 'Spark-Hire-Grade Reports', desc: 'Enterprise-quality PDF-ready interview reports with AI summaries.' },
];
const stack = ['Spark-Hire AI', 'FastAPI', 'React', 'WebRTC', 'SQLite', 'WebSocket'];

// Animated typewriter hook
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
    <div className="min-h-screen w-full bg-white text-slate-900 overflow-x-hidden font-sans relative">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center p-8 overflow-hidden bg-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-white opacity-70" />

        {/* Top nav bar */}
        <div className="absolute top-0 left-0 right-0 px-10 py-5 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md z-50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0 shadow-md border border-slate-800">
              <img src={logoUrl} alt="Spark-Hire Logo" className="w-9 h-9 object-contain mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
              <div className="hidden w-9 h-9 bg-[#EF4444] text-white flex items-center justify-center font-bold text-sm">Spark-Hire</div>
            </div>
            <span className="font-extrabold text-lg tracking-wide text-slate-900">
              Spark-Hire <span className="text-[#EF4444]">AI</span>
              <span className="text-slate-500 text-xs ml-3 tracking-[0.2em] font-mono">FOR STERLING E-MOBILITY</span>
            </span>
          </div>
          <div className="flex gap-4">
            <button className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors" onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded text-sm transition-all shadow-md shadow-red-600/20" onClick={() => navigate('/candidate')}>
              Start Now
            </button>
          </div>
        </div>

        {/* Hero content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-4xl w-full mx-auto flex flex-col items-center mt-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest mb-8 shadow-sm">
            <Shield size={14} /> Spark-Hire Enterprise Grade Assessment
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight text-slate-900">
            The Future of<br />
            <span className="text-red-600">{typed}</span>
            <span className="text-slate-300 animate-pulse">|</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            The definitive AI hiring engine for EV Powertrains and Embedded Systems Engineering. Context-aware, privacy-safe, and infinitely scalable.
          </p>

          <div className="flex gap-6 items-center justify-center flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition-all shadow-xl shadow-red-600/30 flex items-center gap-3 uppercase tracking-wider"
              onClick={() => navigate('/candidate')}
            >
              Begin Interview <ArrowRight size={20} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="bg-white hover:bg-slate-50 text-slate-900 font-bold py-4 px-10 rounded-lg text-lg transition-all border border-slate-200 shadow-sm flex items-center gap-3 uppercase tracking-wider"
              onClick={() => navigate('/dashboard')}
            >
              View Dashboard
            </motion.button>
          </div>


        </motion.div>

        {/* Animated bottom border */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-red-200 to-transparent" />
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-24 px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight text-slate-900">
            Platform <span className="text-red-600">Capabilities</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Every layer of the interview process, supercharged with AI.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="bg-white border border-slate-200 rounded-2xl p-8 transition-all duration-300 hover:border-red-200 hover:shadow-lg shadow-sm cursor-default"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="w-12 h-12 rounded-xl mb-6 bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
                <Icon size={24} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 tracking-wide">{title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-8 text-center bg-slate-50 flex flex-col items-center border-y border-slate-200">
        <h2 className="text-4xl font-extrabold mb-16 tracking-tight text-slate-900">
          How It <span className="text-red-600">Works</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto w-full">
          {[
            { step: '01', title: 'Register', desc: 'Fill candidate details and upload resume' },
            { step: '02', title: 'Interview', desc: 'AI conducts live video + audio interview' },
            { step: '03', title: 'Analyse', desc: 'Real-time EQ, voice & technical scoring' },
            { step: '04', title: 'Report', desc: 'Instant AI-generated assessment report' },
          ].map(({ step, title, desc }, i) => (
            <motion.div
              key={step}
              className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="text-5xl font-black mb-4 text-slate-200">
                {step}
              </div>
              <h4 className="text-lg font-bold mb-2 text-slate-900">{title}</h4>
              <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-8 text-center flex justify-center">
        <motion.div
          className="bg-red-600 rounded-3xl p-12 max-w-3xl w-full flex flex-col items-center shadow-2xl shadow-red-600/30 text-white relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black opacity-10 rounded-full blur-3xl" />
          
          <Zap size={48} className="text-white mb-6 relative z-10" />
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight relative z-10 text-white">
            Ready to Transform Hiring?
          </h2>
          <p className="text-red-100 text-lg mb-8 max-w-lg relative z-10">
            Start your first AI interview in under 60 seconds. No setup required.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-10 relative z-10">
            {['Technical Scoring', 'Emotion Analysis', 'Voice Analytics'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-red-50 font-bold tracking-wide">
                <CheckCircle size={16} className="text-white" /> {f}
              </div>
            ))}
          </div>
          <button className="bg-white hover:bg-slate-50 text-red-700 font-black py-4 px-10 rounded-lg text-lg transition-all shadow-lg flex items-center gap-3 uppercase tracking-wider relative z-10" onClick={() => navigate('/candidate')}>
            Launch Interview <ArrowRight size={20} />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-slate-200 text-slate-500 text-xs tracking-widest uppercase font-mono bg-white">
        Spark-Hire AI
      </footer>
    </div>
  );
}
