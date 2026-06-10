import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Zap, Brain, Eye, Mic, BarChart3, ArrowRight, CheckCircle, Shield, Layers, Activity, Users } from 'lucide-react';
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

const getBentoClass = (i) => {
  const base = "rounded-[2.5rem] p-10 flex flex-col justify-between transition-all duration-700 hover:-translate-y-2 hover:scale-[1.01] border ";
  switch(i) {
    case 0: return base + "md:col-span-2 md:row-span-2 bg-gradient-to-br from-red-600 to-red-800 text-white border-red-500/50 shadow-2xl shadow-red-600/30 overflow-hidden relative"; // Giant Red
    case 1: return base + "md:col-span-2 md:row-span-1 bg-white text-slate-900 border-slate-100 shadow-xl shadow-slate-200/50"; // Wide White
    case 2: return base + "md:col-span-1 md:row-span-1 bg-slate-900 text-white border-slate-800 shadow-xl shadow-slate-900/30"; // Square Dark
    case 3: return base + "md:col-span-1 md:row-span-1 bg-red-50 text-red-900 border-red-100 shadow-lg"; // Square Light Red
    case 4: return base + "md:col-span-2 md:row-span-1 bg-white text-slate-900 border-slate-100 shadow-lg"; // Wide White
    case 5: return base + "md:col-span-2 md:row-span-1 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 border-slate-200 shadow-lg"; // Wide Gray
    default: return base;
  }
}

export default function Landing() {
  const navigate = useNavigate();
  const typed = useTypewriter(['Technical Interviews.', 'AI Evaluation.', 'Emotion Analysis.', 'Smart Hiring.']);
  
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 overflow-x-hidden font-sans relative selection:bg-red-200 selection:text-red-900">
      
      {/* ── FLOATING NAVBAR ── */}
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.1 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[90rem] px-6 py-4 flex items-center justify-between bg-white/70 backdrop-blur-2xl border border-white/50 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] z-50 transition-all duration-300"
      >
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center shrink-0 shadow-inner overflow-hidden border border-slate-800 transition-all duration-500 group-hover:bg-red-600">
            <img src={logoUrl} alt="Sterling Logo" className="w-7 h-7 object-contain mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <div className="hidden w-12 h-12 text-white flex items-center justify-center font-black text-sm">ST</div>
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900 flex flex-col leading-none">
            <div>Spark-<span className="text-red-600">Hire</span></div>
            <span className="text-slate-400 text-[0.6rem] tracking-[0.2em] font-mono uppercase mt-1 hidden sm:block">by Sterling E-Mobility</span>
          </span>
        </div>
      </motion.div>

      {/* ── SPLIT HERO ── */}
      <section className="min-h-[100svh] pt-40 pb-20 px-6 max-w-[90rem] mx-auto flex flex-col lg:flex-row items-center gap-16 relative">
        {/* Ambient background blur */}
        <div className="absolute top-20 right-20 w-[600px] h-[600px] bg-red-50 rounded-full blur-[120px] opacity-70 pointer-events-none" />
        
        {/* Left Side: Massive Typography */}
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }} 
          className="flex-1 z-10 w-full"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-widest mb-10 shadow-sm backdrop-blur-sm">
            <Shield size={16} className="text-red-600" /> Enterprise Engine Active
          </div>
          
          <h1 className="text-[5rem] sm:text-[6rem] lg:text-[8rem] xl:text-[9rem] font-black tracking-tighter leading-[0.85] mb-10 text-slate-900">
            The Future<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">Of Hiring.</span>
          </h1>
          
          <div className="h-16 mb-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-400 tracking-tight">
              {typed}<span className="text-red-300 animate-pulse">|</span>
            </h2>
          </div>

          <p className="text-xl sm:text-2xl text-slate-500 max-w-2xl leading-relaxed font-medium">
            The definitive AI engine for EV Powertrains and Embedded Systems Engineering. <span className="text-slate-900 font-bold">Context-aware. Privacy-safe. Infinitely scalable.</span>
          </p>
        </motion.div>

        {/* Right Side: Floating Dashboard Widgets (The Buttons) */}
        <div className="flex-1 w-full hidden md:flex flex-col gap-4 lg:gap-6 z-20 justify-center">
          {/* Widget 1: Control Panel (Red) */}
          <motion.div 
            initial={{ opacity: 0, x: 50, y: -20 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ type: "spring", delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            className="self-end w-72 lg:w-80 bg-gradient-to-br from-red-600 to-red-700 text-white p-6 lg:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(239,68,68,0.3)] cursor-pointer border border-red-500/50 backdrop-blur-xl group"
            onClick={() => navigate('/admin')}
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Layers size={24} className="text-white" />
            </div>
            <h3 className="font-black text-xl lg:text-2xl mb-2 tracking-tight">Control Panel</h3>
            <p className="text-red-100 text-xs lg:text-sm font-medium leading-relaxed">Access enterprise root controls and global configuration.</p>
            <div className="mt-6 flex justify-end text-white"><ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" /></div>
          </motion.div>

          {/* Widget 2: HR Dashboard (White) */}
          <motion.div 
            initial={{ opacity: 0, x: 50, y: 20 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ type: "spring", delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            className="self-center lg:self-start lg:ml-10 w-72 lg:w-80 bg-white text-slate-900 p-6 lg:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] cursor-pointer border border-slate-100 group"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <Users size={24} className="text-slate-800" />
            </div>
            <h3 className="font-black text-xl lg:text-2xl mb-2 tracking-tight">HR Dashboard</h3>
            <p className="text-slate-500 text-xs lg:text-sm font-medium leading-relaxed">Manage candidate pipelines and review AI-generated reports.</p>
            <div className="mt-6 flex justify-end text-slate-300 group-hover:text-red-600 transition-colors"><ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" /></div>
          </motion.div>

          {/* Widget 3: System Health (Dark) */}
          <motion.div 
            initial={{ opacity: 0, x: 50, y: 40 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ type: "spring", delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            className="self-end lg:mr-16 w-72 lg:w-80 bg-slate-900 text-white p-6 lg:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(15,23,42,0.4)] cursor-pointer border border-slate-700 group"
            onClick={() => navigate('/system-health')}
          >
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
              <Activity size={24} className="text-red-500" />
            </div>
            <h3 className="font-black text-xl lg:text-2xl mb-2 tracking-tight">System Health</h3>
            <p className="text-slate-400 text-xs lg:text-sm font-medium leading-relaxed">Monitor real-time latency, active sockets, and telemetry.</p>
            <div className="mt-6 flex justify-end text-slate-500 group-hover:text-white transition-colors"><ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" /></div>
          </motion.div>
        </div>

        {/* Mobile Button Fallback (only visible on small screens) */}
        <div className="md:hidden flex flex-col gap-4 w-full mt-10">
           <button className="bg-red-600 text-white font-bold py-5 rounded-2xl text-lg flex justify-center items-center gap-2 shadow-lg" onClick={() => navigate('/admin')}>Control Panel <ArrowRight size={20}/></button>
           <button className="bg-white border border-slate-200 text-slate-900 font-bold py-5 rounded-2xl text-lg flex justify-center items-center gap-2 shadow-sm" onClick={() => navigate('/dashboard')}>HR Dashboard <ArrowRight size={20}/></button>
           <button className="bg-slate-900 text-white font-bold py-5 rounded-2xl text-lg flex justify-center items-center gap-2 shadow-lg" onClick={() => navigate('/system-health')}>System Health <ArrowRight size={20}/></button>
        </div>
      </section>

      {/* ── BENTO BOX FEATURES ── */}
      <section className="py-32 px-6">
        <div className="max-w-[90rem] mx-auto bg-slate-50 rounded-[4rem] p-10 md:p-20 relative overflow-hidden border border-slate-100">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white rounded-full blur-[150px] pointer-events-none" />
          
          <div className="mb-20 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-red-600 font-bold uppercase tracking-widest mb-6 shadow-sm">
              Architecture
            </div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[1.1] max-w-3xl">
              Platform <span className="text-red-600">Capabilities.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[minmax(280px,auto)] gap-6 relative z-10">
            {features.map((feat, i) => {
              const isDark = i === 0 || i === 2;
              const isRedText = i === 3;
              return (
                <motion.div 
                  key={feat.title} 
                  className={getBentoClass(i)}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                >
                  {i === 0 && <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-red-500 rounded-full blur-3xl opacity-50" />}
                  
                  <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-8 relative z-10 ${isDark ? 'bg-white/10 backdrop-blur-md' : isRedText ? 'bg-red-100' : 'bg-slate-100'}`}>
                    <feat.icon size={36} className={isDark ? 'text-white' : isRedText ? 'text-red-600' : 'text-slate-700'} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">{feat.title}</h3>
                    <p className={`text-lg md:text-xl leading-relaxed font-medium ${isDark ? 'text-white/80' : isRedText ? 'text-red-800/80' : 'text-slate-500'}`}>
                      {feat.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STICKY HOW IT WORKS ── */}
      <section className="py-40 px-6 max-w-[90rem] mx-auto flex flex-col lg:flex-row gap-20 relative">
        {/* Sticky Left */}
        <div className="lg:w-1/3 relative">
          <div className="sticky top-40">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 font-bold uppercase tracking-widest mb-6">
              Workflow
            </div>
            <h2 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter text-slate-900 leading-[0.9]">
              How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">Works.</span>
            </h2>
            <p className="text-2xl text-slate-500 font-medium leading-relaxed max-w-sm">
              A seamless, automated pipeline from registration to final hiring decision. Watch the system perform in real-time.
            </p>
          </div>
        </div>

        {/* Scroll Right */}
        <div className="lg:w-2/3 flex flex-col gap-10">
          {[
            { step: '01', title: 'Register', desc: 'Fill candidate details and securely upload the resume for ATS parsing and context generation.' },
            { step: '02', title: 'Interview', desc: 'The AI avatar conducts a live video and audio interview dynamically adapting to responses.' },
            { step: '03', title: 'Analyse', desc: 'Continuous evaluation of EQ, technical depth, and voice confidence using real-time streams.' },
            { step: '04', title: 'Report', desc: 'Instant generation of an enterprise-grade PDF assessment report for the hiring manager.' },
          ].map(({ step, title, desc }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
              className="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex flex-col md:flex-row gap-10 items-start md:items-center hover:shadow-[0_20px_60px_rgba(239,68,68,0.1)] hover:border-red-100 transition-all duration-700 group"
            >
              <div className="text-[6rem] md:text-[8rem] font-black text-slate-100 drop-shadow-sm shrink-0 leading-none group-hover:text-red-50 transition-colors duration-700">
                {step}
              </div>
              <div>
                <h4 className="text-4xl font-black mb-4 text-slate-900 tracking-tight">{title}</h4>
                <p className="text-xl md:text-2xl text-slate-500 leading-relaxed font-medium">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── EDGE TO EDGE CTA ── */}
      <section className="py-16 px-6">
        <div className="max-w-[90rem] mx-auto bg-slate-900 rounded-[3rem] p-8 md:p-16 flex flex-col items-center text-center relative overflow-hidden">
          {/* Edge to Edge Red geometric shapes */}
          <div className="absolute -top-[50%] -right-[10%] w-[80%] h-[150%] bg-red-600 rounded-full blur-[100px] opacity-40 rotate-12" />
          <div className="absolute -bottom-[50%] -left-[10%] w-[60%] h-[100%] bg-red-800 rounded-full blur-[120px] opacity-60" />
          
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 relative z-10 border border-white/20 shadow-2xl">
            <Zap size={32} className="text-white drop-shadow-md" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter relative z-10 text-white leading-[1.1]">
            Ready to Manage Operations?
          </h2>
          <p className="text-slate-300 text-lg md:text-xl mb-8 max-w-2xl relative z-10 font-medium leading-relaxed">
            Access enterprise root controls, manage candidate pipelines, and review system telemetry in real-time.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-10 relative z-10">
            {['Pipeline Control', 'System Telemetry', 'Role Configurator'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-white font-bold tracking-widest uppercase bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                <CheckCircle size={16} className="text-red-400" /> {f}
              </div>
            ))}
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-slate-900 font-black py-4 px-10 rounded-2xl text-lg md:text-xl transition-all shadow-[0_20px_50px_rgba(255,255,255,0.15)] hover:shadow-[0_20px_60px_rgba(255,255,255,0.3)] flex items-center gap-3 uppercase tracking-widest relative z-10 group" 
            onClick={() => navigate('/admin')}
          >
            Open Control Panel <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-12 text-slate-400 text-xs sm:text-sm tracking-[0.4em] font-mono bg-white uppercase">
        Spark-Hire &copy; 2025 &middot; Sterling E-Mobility
      </footer>
    </div>
  );
}
