import React from 'react';
import { motion } from 'framer-motion';

export default function CandidateOptions({ navigate }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.15,
        delayChildren: 0.4
      } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    }
  };

  return (
    <motion.div 
      className="w-full max-w-md mx-auto flex flex-col justify-center h-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="relative z-10 p-8 sm:p-12 bg-red-600/90 backdrop-blur-3xl rounded-3xl border border-red-400 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.5)] overflow-hidden group/card">
        {/* Abstract background shape for Candidate card */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500 rounded-full mix-blend-screen filter blur-xl opacity-50 group-hover/card:scale-150 transition-transform duration-700"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white rounded-full mix-blend-overlay filter blur-2xl opacity-20 group-hover/card:scale-150 transition-transform duration-700"></div>

        <div className="relative z-20">
          <motion.h3 
            className="text-4xl font-black text-white tracking-tighter mb-4"
            variants={itemVariants}
          >
            Candidate <br/><span className="text-red-200">Access</span>
          </motion.h3>
          <motion.p 
            className="text-red-100 font-medium mb-10 text-lg"
            variants={itemVariants}
          >
            Enter your AI interview portal directly or register for a new session.
          </motion.p>

          <div className="flex flex-col gap-5">
            <motion.button
              type="button"
              onClick={() => navigate('/candidate-login')}
              className="relative w-full group overflow-hidden py-4 px-6 rounded-xl font-bold text-lg text-red-600 bg-white shadow-xl hover:shadow-2xl transition-all duration-300"
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2 group-hover:tracking-wider transition-all duration-300">
                Candidate Login
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => navigate('/candidate-register')}
              className="relative w-full group overflow-hidden py-4 px-6 rounded-xl font-bold text-lg text-white border-2 border-white/50 hover:bg-white hover:text-red-600 transition-all duration-300"
              variants={itemVariants}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Register Here
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
