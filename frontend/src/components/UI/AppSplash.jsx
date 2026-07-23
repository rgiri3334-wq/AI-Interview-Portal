import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoUrl from '../../assets/sterling_logo.png';

export default function AppSplash({ onComplete }) {
  const [stage, setStage] = useState('logo-in'); 

  useEffect(() => {
    // Check if splash has already played this session
    const hasPlayed = sessionStorage.getItem('splashPlayed');
    if (hasPlayed) {
      setStage('done');
      onComplete?.();
      return;
    }

    // Timeline:
    // 0ms -> 1500ms: Logo gently fades and scales in on white background
    // 1500ms -> 2500ms: Logo rests in middle
    // 2500ms -> 3500ms: Zoom in massively, background turns black
    // 3500ms -> 4300ms: Splash container fades out smoothly to reveal login page

    const t1 = setTimeout(() => setStage('zoom-in'), 2500);
    const t2 = setTimeout(() => setStage('fade-out'), 3500);
    const t3 = setTimeout(() => {
      setStage('done');
      sessionStorage.setItem('splashPlayed', 'true');
      onComplete?.();
    }, 4300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  return (
    <AnimatePresence>
      {stage !== 'done' && (
        <motion.div
          key="splash-container"
          initial={{ opacity: 1, backgroundColor: '#ffffff' }}
          animate={{ 
            opacity: stage === 'fade-out' ? 0 : 1,
            // When zooming in, switch background from White to Black
            backgroundColor: stage === 'zoom-in' || stage === 'fade-out' ? '#000000' : '#ffffff' 
          }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] overflow-hidden pointer-events-none flex items-center justify-center"
        >
          {/* SEM Logo */}
          <motion.img
            src={logoUrl}
            alt="SEM Logo"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              // Scale massively to simulate camera flying THROUGH the logo
              scale: stage === 'zoom-in' ? 80 : 1, 
              // Fade out slightly during the massive zoom so the black background takes over
              opacity: stage === 'zoom-in' ? 0 : 1 
            }}
            transition={{ 
              scale: { 
                duration: stage === 'zoom-in' ? 1.0 : 1.5, 
                ease: stage === 'zoom-in' ? [0.6, 0.01, -0.05, 0.95] : "easeOut" // Custom easing for warp-speed zoom
              },
              opacity: { 
                duration: stage === 'zoom-in' ? 0.4 : 1.5, 
                delay: stage === 'zoom-in' ? 0.4 : 0 
              }
            }}
            className="w-80 h-auto object-contain origin-center"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
