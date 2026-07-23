import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowDown } from 'lucide-react';
import logoUrl from '../assets/sterling_logo.png';

// ── Re-use the same shared premium components as Landing.jsx ─────────────────
import InteractiveBrain3D from '../components/landing/InteractiveBrain3D';
import ScrollFeatures from '../components/landing/ScrollFeatures';
import DeepDiveTabs from '../components/landing/DeepDiveTabs';
import InteractiveFAQ from '../components/landing/InteractiveFAQ';
import DynamicFooter from '../components/landing/DynamicFooter';

// ── Candidate-only CTA Section ───────────────────────────────────────────────
import CandidateCTASection from '../components/landing/CandidateCTASection';

// ── Typewriter hook (same words as admin landing for brand consistency) ───────
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

// ── Main Component ────────────────────────────────────────────────────────────
import PageWrapper from '../components/Layout/PageWrapper';
import { Camera, Volume2, Cpu } from 'lucide-react';

// ── Biometric Laser Scan & Audio Visualizer Badge ──────────────────────
function BiometricHeroCard() {
  const [bars, setBars] = useState([40, 65, 30, 85, 50, 90, 45, 70, 35, 80]);

  useEffect(() => {
    const iv = setInterval(() => {
      setBars(prev => prev.map(() => Math.floor(20 + Math.random() * 75)));
    }, 150);
    return () => clearInterval(iv);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative w-full max-w-md my-8 bg-slate-900/90 backdrop-blur-xl border border-red-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(220,38,38,0.25)] overflow-hidden text-left"
    >
      {/* Animated Laser Scanning Line */}
      <motion.div
        animate={{ y: [0, 160, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444] z-20 pointer-events-none"
      />

      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500">
            <Camera size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-100">Proctoring Hud Active</h4>
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Face Lock &amp; Voice Authenticator</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-full text-[10px] font-black text-red-400 uppercase tracking-widest animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Scanning
        </div>
      </div>

      {/* Grid view simulation */}
      <div className="relative h-24 bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center mb-4">
        {/* Face Mesh Simulation Corner Brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-red-500" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-red-500" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-red-500" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-red-500" />
        
        <div className="text-center">
          <Cpu className="mx-auto text-red-500/80 mb-1 animate-pulse" size={24} />
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">3D Facial Landmark Tracking: OK</span>
        </div>
      </div>

      {/* Audio Waveform Equalizer */}
      <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Volume2 size={16} className="text-red-500" /> Audio Stream
        </div>
        <div className="flex items-end gap-1 h-6">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.15 }}
              className="w-1 bg-red-500 rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Candidate Hero Section ───────────────────────────────────────────────────
function CandidateHeroSection() {
  const navigate = useNavigate();
  const typed = useTypewriter([
    'Technical Interviews',
    'AI Evaluation',
    'Emotion Analysis',
    'Smart Hiring',
  ]);

  return (
    <section className="relative min-h-[95vh] flex flex-col items-center justify-center text-center p-8 z-10 pt-24 border-b border-slate-200/50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        className="max-w-5xl w-full mx-auto flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm"
        >
          <Shield size={14} /> Candidate Portal · Powered by Sterling
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight text-slate-900 drop-shadow-sm mix-blend-multiply">
          The Future of<br />
          <span className="text-red-600 bg-clip-text">{typed}</span>
          <span className="text-red-400 animate-pulse font-light">|</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6 leading-relaxed font-medium">
          The definitive AI hiring engine for EV Powertrains and Embedded Systems Engineering. Context-aware, privacy-safe, and infinitely scalable.
        </p>

        {/* Biometric Laser Scan & Audio Waveform Hero Component */}
        <BiometricHeroCard />

        <div className="flex gap-4 items-center justify-center flex-wrap w-full">
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            className="bg-red-600 text-white font-bold py-4 px-10 rounded-full text-base transition-all flex items-center justify-center uppercase tracking-wide min-w-[220px]"
            onClick={() => navigate('/candidate-home')}
          >
            Begin Interview
          </motion.button>
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}
            whileTap={{ scale: 0.98 }}
            className="bg-white text-slate-800 font-bold py-4 px-10 rounded-full text-base transition-all border border-slate-200 flex items-center justify-center uppercase tracking-wide hover:border-red-200 min-w-[220px]"
            onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            How It Works
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 animate-bounce text-slate-300 pointer-events-none"
      >
        <ArrowDown size={28} />
      </motion.div>
    </section>
  );
}

// ── "How It Works" steps for candidates ─────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { step: '01', title: 'Register', desc: 'Fill in your candidate details and securely upload your resume for AI-powered context generation.' },
    { step: '02', title: 'Interview', desc: 'The AI avatar conducts a live video and audio interview, dynamically adapting to your responses.' },
    { step: '03', title: 'Analyse', desc: 'Real-time EQ, technical depth, and voice confidence scoring happens as you speak.' },
    { step: '04', title: 'Report', desc: 'An instant enterprise-grade PDF assessment report is generated for your hiring outcome.' },
  ];

  return (
    <section id="features-section" className="py-24 px-8 text-center bg-slate-50 flex flex-col items-center border-y border-slate-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-16"
      >
        <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-slate-900">
          How It <span className="text-red-600">Works</span>
        </h2>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
          A seamless, automated pipeline from registration to final interview report.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto w-full">
        {steps.map(({ step, title, desc }, i) => (
          <motion.div
            key={step}
            className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm hover:border-red-200 hover:shadow-md transition-all group"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            whileHover={{ y: -4 }}
          >
            <div className="text-6xl font-black mb-5 text-slate-100 group-hover:text-red-50 transition-colors">
              {step}
            </div>
            <h4 className="text-lg font-bold mb-2 text-slate-900">{title}</h4>
            <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CandidateLanding() {
  const navigate = useNavigate();

  return (
    <PageWrapper className="min-h-screen w-full bg-slate-50 text-slate-900 overflow-x-hidden font-sans relative selection:bg-red-200 selection:text-red-900">

      {/* Dynamic 3D Background */}
      <InteractiveBrain3D />

      {/* ── TOP NAV ── */}
      <nav className="fixed top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0 shadow-md">
            <img
              src={logoUrl}
              alt="Sterling Logo"
              className="w-7 h-7 object-contain mix-blend-screen"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <div className="hidden w-7 h-7 bg-red-600 text-white flex items-center justify-center font-bold text-xs rounded">St</div>
          </div>
          <span className="font-extrabold text-base tracking-wide text-slate-900">
            Spark-<span className="text-red-600">Hire</span>
            <span className="hidden sm:inline text-slate-400 text-[10px] ml-2 tracking-[0.2em] font-mono uppercase">by Sterling E-Mobility</span>
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-full text-sm transition-all shadow-[0_4px_14px_0_rgba(220,38,38,0.39)] hover:-translate-y-[1px]"
            onClick={() => navigate('/candidate-home')}
          >
            Begin Interview
          </button>
        </div>
      </nav>

      {/* ── SECTIONS ── */}
      {/* Hero — candidate-specific copy & routing */}
      <CandidateHeroSection />

      {/* How It Works — candidate journey steps */}
      <HowItWorksSection />

      {/* Capabilities — shared, all features visible to candidate */}
      <ScrollFeatures />

      {/* Deep Dive Tabs — Voice, Vision, Reasoning — candidate-facing explanation */}
      <DeepDiveTabs />

      {/* FAQ — candidate-relevant questions (privacy, how it works, etc.) */}
      <InteractiveFAQ />

      {/* CTA — candidate-only: Begin Interview, not admin panel */}
      <CandidateCTASection />

      {/* Footer */}
      <DynamicFooter />
    </PageWrapper>
  );
}
