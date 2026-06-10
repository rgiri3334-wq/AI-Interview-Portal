import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Brain, Eye, Mic, BarChart3, ArrowRight, CheckCircle, Shield } from 'lucide-react';
import ParticleCanvas from '../components/UI/ParticleCanvas';
import logoUrl from '../assets/sterling_logo.png';

const features = [
  { icon: Brain, title: 'AI Question Engine', desc: 'AI-powered dynamic questions tailored to each role and skill level.' },
  { icon: Eye, title: 'Emotion Detection', desc: 'Real-time facial expression and eye-contact analysis via computer vision.' },
  { icon: Mic, title: 'Voice Analytics', desc: 'Detects filler words, speech pace, clarity, and confidence patterns.' },
  { icon: BarChart3, title: 'Live Scorecards', desc: 'Instant technical & EQ scores with detailed feedback per question.' },
  { icon: Shield, title: 'Anti-Cheat Monitoring', desc: 'Eye gaze tracking and tab-switch detection for integrity assurance.' },
  { icon: Zap, title: 'Sterling-Grade Reports', desc: 'Enterprise-quality PDF-ready interview reports with AI summaries.' },
];
const stack = ['Sterling AI', 'FastAPI', 'React', 'WebRTC', 'SQLite', 'WebSocket'];

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

// Framer motion variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 15 } },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

export default function Landing() {
  const navigate = useNavigate();
  const typed = useTypewriter([
    'Technical Interviews',
    'AI Evaluation',
    'Emotion Analysis',
    'Smart Hiring',
  ]);

  return (
    <div className="min-h-screen w-full bg-[#fcfcfc] text-slate-900 overflow-x-hidden font-sans relative selection:bg-red-200 selection:text-red-900">
      
      {/* ── FLOATING NAVBAR ── */}
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.2 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl px-6 py-3 flex items-center justify-between bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
      >
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center shrink-0 shadow-inner overflow-hidden border-2 border-transparent group-hover:border-red-100 transition-all">
            <img src={logoUrl} alt="Sterling Logo" className="w-6 h-6 object-contain mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <div className="hidden w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center font-bold text-xs">ST</div>
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">
            Spark-<span className="text-red-600">Hire</span>
            <span className="hidden sm:inline text-slate-400 text-[0.65rem] ml-3 tracking-[0.2em] font-mono uppercase">by Sterling E-Mobility</span>
          </span>
        </div>
        <div className="flex gap-2 sm:gap-4 items-center">
          <button className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors px-4 py-2 rounded-full hover:bg-slate-100" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-full text-sm transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/40 hover:-translate-y-0.5 active:translate-y-0" onClick={() => navigate('/admin')}>
            Control Panel
          </button>
        </div>
      </motion.div>

      {/* ── HERO ── */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center text-center p-8 overflow-hidden bg-white">
        {/* Ambient glowing background shapes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-50 rounded-full blur-[120px] opacity-60 pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-50 rounded-full blur-[100px] opacity-80 pointer-events-none" />

        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 max-w-5xl w-full mx-auto flex flex-col items-center mt-20"
        >
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-red-100/60 text-red-600 text-xs font-bold uppercase tracking-widest mb-10 shadow-[0_4px_20px_rgb(239,68,68,0.1)] backdrop-blur-sm cursor-default"
          >
            <Shield size={14} className="text-red-500" /> Spark-Hire · Powered by Sterling E-Mobility
          </motion.div>

          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black leading-[1.1] mb-8 tracking-tighter text-slate-900">
            The Future of<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">{typed}</span>
            <span className="text-red-200 ml-1 font-light animate-pulse">|</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-14 leading-relaxed font-medium">
            The definitive AI hiring engine for EV Powertrains and Embedded Systems Engineering. <span className="text-slate-800">Context-aware, privacy-safe, and infinitely scalable.</span>
          </p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center w-full"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-all shadow-xl shadow-red-600/25 flex items-center justify-center gap-3 uppercase tracking-wider group border border-red-400/50"
              onClick={() => navigate('/admin')}
            >
              Control Panel <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -2, backgroundColor: '#f8fafc' }} whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto bg-white text-slate-900 font-bold py-4 px-10 rounded-2xl text-lg transition-all border border-slate-200 shadow-md shadow-slate-200/50 flex items-center justify-center gap-3 uppercase tracking-wider"
              onClick={() => navigate('/dashboard')}
            >
              HR Dashboard
            </motion.button>
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 uppercase tracking-wider"
              onClick={() => navigate('/system-health')}
            >
              System Health
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400"
        >
          <span className="text-[10px] font-bold tracking-widest uppercase">Explore</span>
          <div className="w-px h-12 bg-gradient-to-b from-slate-300 to-transparent" />
        </motion.div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-32 px-6 max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-slate-900">
            Platform <span className="text-red-600">Capabilities</span>
          </h2>
          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Every layer of the interview process, perfectly architected and supercharged with AI.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group bg-white rounded-[2rem] p-8 sm:p-10 transition-all duration-500 hover:shadow-[0_20px_40px_rgb(239,68,68,0.08)] border border-slate-100 hover:border-red-100 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="w-16 h-16 rounded-2xl mb-8 bg-white border border-slate-100 shadow-sm flex items-center justify-center group-hover:border-red-200 group-hover:bg-red-50 transition-colors duration-500 relative z-10">
                <Icon size={28} className="text-slate-400 group-hover:text-red-600 transition-colors duration-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold mb-4 text-slate-900 tracking-tight relative z-10">{title}</h3>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium relative z-10">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-32 px-6 bg-slate-50 relative overflow-hidden border-y border-slate-100">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-50/50 rounded-full blur-[100px] opacity-60 pointer-events-none" />
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-24"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-slate-900">
              How It <span className="text-red-600">Works</span>
            </h2>
          </motion.div>

          <div className="relative">
            {/* Horizontal line for desktop connecting the steps */}
            <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-red-200 to-transparent" />
            
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 relative"
            >
              {[
                { step: '01', title: 'Register', desc: 'Fill candidate details and upload resume' },
                { step: '02', title: 'Interview', desc: 'AI conducts live video + audio interview' },
                { step: '03', title: 'Analyse', desc: 'Real-time EQ, voice & technical scoring' },
                { step: '04', title: 'Report', desc: 'Instant AI-generated assessment report' },
              ].map(({ step, title, desc }, i) => (
                <motion.div
                  key={step}
                  variants={itemVariants}
                  className="relative group flex flex-col items-center text-center"
                >
                  {/* Circle Number */}
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center text-3xl font-black text-slate-300 mb-8 relative z-10 group-hover:border-red-500 group-hover:bg-red-500 group-hover:text-white transition-all duration-500 shadow-lg group-hover:shadow-red-500/30">
                    {step}
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900 tracking-wide">{title}</h4>
                  <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium max-w-[200px]">{desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 px-6 bg-white relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", stiffness: 60 }}
            className="bg-gradient-to-br from-red-600 to-red-700 rounded-[3rem] p-12 md:p-20 flex flex-col items-center text-center shadow-2xl shadow-red-600/30 text-white relative overflow-hidden border border-red-500/50"
          >
            {/* Glass effect background artifacts */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
            
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 relative z-10 border border-white/20 shadow-inner">
              <Zap size={40} className="text-white drop-shadow-md" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight relative z-10 text-white leading-tight">
              Ready to Manage Operations?
            </h2>
            <p className="text-red-100/90 text-lg md:text-xl mb-12 max-w-2xl relative z-10 font-medium leading-relaxed">
              Access enterprise root controls, manage candidate pipelines, and review system telemetry in real-time.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-14 relative z-10">
              {['Pipeline Control', 'System Telemetry', 'Role Configurator'].map((f) => (
                <div key={f} className="flex items-center gap-3 text-sm sm:text-base text-red-50 font-bold tracking-widest uppercase">
                  <CheckCircle size={20} className="text-red-200" /> {f}
                </div>
              ))}
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-red-700 font-black py-4 sm:py-5 px-8 sm:px-12 rounded-2xl text-lg sm:text-xl transition-all shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_40px_rgba(255,255,255,0.2)] flex items-center gap-4 uppercase tracking-widest relative z-10 group" 
              onClick={() => navigate('/admin')}
            >
              Open Control Panel <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-10 text-slate-400 text-xs sm:text-sm tracking-[0.3em] font-mono bg-white uppercase">
        Spark-Hire &copy; 2025 &middot; Sterling E-Mobility
      </footer>
    </div>
  );
}
