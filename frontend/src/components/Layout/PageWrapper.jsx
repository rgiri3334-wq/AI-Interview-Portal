/**
 * components/Layout/PageWrapper.jsx
 * ═══════════════════════════════════════════════════════════════════════════
 * Global Framer Motion page wrapper providing consistent smooth fade-in-up 
 * transitions across all route transitions.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';

export default function PageWrapper({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`min-h-screen w-full bg-[#050508] text-slate-100 relative overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}
