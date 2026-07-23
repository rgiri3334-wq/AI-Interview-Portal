import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoUrl from '../../assets/sterling_logo.png';

export default function AppSplash({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Determine if splash has already played this session
    const hasPlayed = sessionStorage.getItem('splashPlayed');
    if (hasPlayed) {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    // Sequence:
    // 0s: Component mounts, logo fades in and pulses.
    // 1.8s: Start exit animation (zoom out quickly and fade bg).
    // 2.4s: Unmount and signal completion.
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('splashPlayed', 'true');
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence onExitComplete={() => onComplete?.()}>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-white overflow-hidden pointer-events-none"
        >
          {/* Logo with 3D Zoom Out effect */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ 
              scale: [1, 1.2, 0], // Slight pull back before zooming out entirely
              opacity: [1, 1, 0],
              rotateX: [0, 10, -45], // 3D flip effect on exit
            }}
            transition={{ 
              duration: 1.2, // total time for enter + pulse
              exit: { duration: 0.6, ease: "circIn" } // fast 3D zoom out
            }}
            style={{ perspective: 1000 }}
            className="w-48 h-48 flex items-center justify-center"
          >
            <img 
              src={logoUrl} 
              alt="Sterling Logo" 
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
