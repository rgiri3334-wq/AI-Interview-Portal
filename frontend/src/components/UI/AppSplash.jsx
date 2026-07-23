import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoUrl from '../../assets/sterling_logo.png';

export default function AppSplash({ onComplete }) {
  const [stage, setStage] = useState('init'); // 'init' | 'zoomIn' | 'done'

  useEffect(() => {
    const hasPlayed = sessionStorage.getItem('splashPlayed');
    if (hasPlayed) {
      setStage('done');
      onComplete?.();
      return;
    }

    // Timeline Sequence:
    // 0.0s -> 1.0s: Static Logo on White Screen (Stage 'init')
    const t1 = setTimeout(() => setStage('zoomIn'), 1000);
    // 1.0s -> 1.8s: Massive Zoom-In & Fade Out (Stage 'zoomIn')
    const t2 = setTimeout(() => {
      setStage('done');
      sessionStorage.setItem('splashPlayed', 'true');
      onComplete?.();
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  return (
    <AnimatePresence>
      {(stage === 'init' || stage === 'zoomIn') && (
        <motion.div
          key="splash-container"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-white overflow-hidden pointer-events-none"
        >
          {/* Logo Container */}
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              key="logo-zoom"
              initial={{ scale: 1, opacity: 1 }}
              animate={
                stage === 'zoomIn' 
                  ? { scale: 50, opacity: 0 } 
                  : { scale: 1, opacity: 1 }
              }
              transition={{ 
                duration: 0.8, 
                ease: [0.43, 0.13, 0.23, 0.96] // Smooth cinematic easing curve
              }}
              className="w-56 h-56 flex items-center justify-center"
            >
              <img 
                src={logoUrl} 
                alt="Sterling Logo" 
                className="w-full h-full object-contain"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
