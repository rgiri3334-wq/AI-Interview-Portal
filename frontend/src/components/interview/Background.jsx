import React from 'react';
import { motion } from 'framer-motion';

export default function Background({ theme }) {
  const isDark = theme === 'dark';

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-colors duration-700 ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
      
      {/* Base glow layer */}
      <motion.div 
        className="absolute inset-0"
        initial={false}
        animate={{
          background: isDark 
            ? 'radial-gradient(circle at 50% 50%, rgba(20,0,0,1) 0%, rgba(0,0,0,1) 100%)'
            : 'radial-gradient(circle at 50% 50%, rgba(255,245,245,1) 0%, rgba(248,250,252,1) 100%)'
        }}
        transition={{ duration: 1 }}
      />

      {/* Floating Orbs - Dark Mode (Red/Black) */}
      {isDark && (
        <>
          <motion.div 
            className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-red-900/30 blur-[120px] rounded-full"
            animate={{ 
              x: [0, 50, 0], 
              y: [0, 30, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-red-800/20 blur-[140px] rounded-full"
            animate={{ 
              x: [0, -40, 0], 
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </>
      )}

      {/* Floating Orbs - Light Mode (Red/White) */}
      {!isDark && (
        <>
          <motion.div 
            className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-red-500/25 blur-[100px] rounded-full"
            animate={{ 
              x: [0, -30, 0], 
              y: [0, 40, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-red-400/20 blur-[120px] rounded-full"
            animate={{ 
              x: [0, 50, 0], 
              y: [0, -30, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </>
      )}

      {/* Grid overlay for a high-tech "engine" feel */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${isDark ? '#ffffff' : '#000000'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}
