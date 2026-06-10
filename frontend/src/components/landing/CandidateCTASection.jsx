import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Zap } from 'lucide-react';

/**
 * CandidateCTASection
 * Same premium dark CTA layout as the admin Landing page,
 * but with candidate-specific copy, feature pills, and routing to /candidate.
 */
export default function CandidateCTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-6 flex justify-center relative z-10 bg-white">
      <motion.div
        className="relative w-full max-w-5xl bg-slate-900 rounded-[2.5rem] p-10 md:p-16 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col items-center text-center border border-slate-800"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/20 via-transparent to-transparent opacity-100 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-red-600 opacity-20 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-sm relative z-10 backdrop-blur-md">
          <Zap size={28} className="text-red-500" />
        </div>

        <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-white relative z-10">
          Ready to Begin Your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
            Interview
          </span>
          ?
        </h2>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto font-medium relative z-10 leading-relaxed">
          Start your first AI interview in under 60 seconds. No external setup required — just you and the platform.
        </p>

        {/* Candidate-relevant feature pills */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12 relative z-10">
          {['Technical Scoring', 'Emotion Analysis', 'Voice Analytics'].map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-3 text-sm text-slate-300 font-semibold tracking-wide bg-white/5 px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-sm"
            >
              <CheckCircle size={16} className="text-red-500" /> {f}
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.5)' }}
          whileTap={{ scale: 0.98 }}
          className="bg-red-600 text-white font-bold py-4 px-10 rounded-full text-base transition-all flex items-center justify-center uppercase tracking-wide shadow-lg relative z-10 min-w-[220px]"
          onClick={() => navigate('/candidate')}
        >
          Begin Interview
        </motion.button>
      </motion.div>
    </section>
  );
}
