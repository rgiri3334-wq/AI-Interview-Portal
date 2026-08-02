import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, ArrowDown } from 'lucide-react';

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

export default function HeroSection() {
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
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest mb-8 shadow-sm"
        >
          <Shield size={14} /> Sterling E-Mobility · AI Interview Engine
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-8 tracking-tight text-slate-900 drop-shadow-sm mix-blend-multiply">
          The Future of<br />
          <span className="text-red-600 bg-clip-text">{typed}</span>
          <span className="text-red-400 animate-pulse font-light">|</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
          The definitive AI hiring engine for EV Powertrains and Embedded Systems Engineering. Context-aware, privacy-safe, and infinitely scalable.
        </p>

        <div className="flex gap-4 items-center justify-center flex-wrap w-full">
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)' }} 
            whileTap={{ scale: 0.98 }}
            className="bg-red-600 text-white font-bold py-4 px-10 rounded-full text-base transition-all flex items-center justify-center uppercase tracking-wide min-w-[220px]"
            onClick={() => navigate('/admin')}
          >
            Control Panel
          </motion.button>
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }} 
            whileTap={{ scale: 0.98 }}
            className="bg-white text-slate-800 font-bold py-4 px-10 rounded-full text-base transition-all border border-slate-200 flex items-center justify-center uppercase tracking-wide hover:border-red-200 min-w-[220px]"
            onClick={() => navigate('/dashboard')}
          >
            HR Dashboard
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
