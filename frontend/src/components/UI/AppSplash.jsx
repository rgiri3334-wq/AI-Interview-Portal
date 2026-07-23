import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoUrl from '../../assets/sterling_logo.png';

export default function AppSplash({ onComplete }) {
  const [stage, setStage] = useState('init'); // 'init' | 'zoomOut' | 'morphOut' | 'done'

  useEffect(() => {
    const hasPlayed = sessionStorage.getItem('splashPlayed');
    if (hasPlayed) {
      setStage('done');
      onComplete?.();
      return;
    }

    // Timeline Sequence:
    // 0.0s -> 1.5s: 3D Entrance & Float (Stage 'init')
    const t1 = setTimeout(() => setStage('zoomOut'), 1500);
    // 1.5s -> 2.2s: Zoom out to Black (Stage 'zoomOut')
    const t2 = setTimeout(() => setStage('morphOut'), 2200);
    // 2.2s -> 2.8s: Fade out Black to reveal App (Stage 'morphOut')
    const t3 = setTimeout(() => {
      setStage('done');
      sessionStorage.setItem('splashPlayed', 'true');
      onComplete?.();
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  return (
    <AnimatePresence>
      {(stage === 'init' || stage === 'zoomOut' || stage === 'morphOut') && (
        <motion.div
          key="splash-container"
          initial={{ backgroundColor: '#ffffff', opacity: 1 }}
          animate={{ 
            backgroundColor: stage === 'init' ? '#ffffff' : '#000000',
            opacity: stage === 'morphOut' ? 0 : 1,
            backdropFilter: stage === 'morphOut' ? 'blur(10px)' : 'blur(0px)'
          }}
          transition={{ 
            backgroundColor: { duration: 0.1, delay: 0.2 }, // sharp snap to black slightly after zoom out starts
            opacity: { duration: 0.6, ease: "easeInOut" } 
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden pointer-events-none"
        >
          {/* Logo Container with 3D Perspective */}
          <div style={{ perspective: 1200 }} className="w-full h-full flex items-center justify-center">
            
            <AnimatePresence>
              {stage === 'init' && (
                <motion.div
                  key="logo-3d"
                  initial={{ scale: 0.8, opacity: 0, rotateX: 20, rotateY: -20 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    rotateX: [20, -10, 5, 0], 
                    rotateY: [-20, 10, -5, 0],
                    y: [0, -5, 5, 0] // Subtle float
                  }}
                  exit={{ 
                    scale: 0, 
                    opacity: [1, 1, 0], // Keeps opacity until very end of scale down
                    rotateX: 45, 
                  }}
                  transition={{ 
                    duration: 1.5, // Total time for entrance
                    rotateX: { duration: 1.5, ease: "easeOut" },
                    rotateY: { duration: 1.5, ease: "easeOut" },
                    y: { duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
                    exit: { duration: 0.6, ease: "backIn" } // Snaps aggressively into the distance
                  }}
                  className="w-56 h-56 flex items-center justify-center"
                >
                  <img 
                    src={logoUrl} 
                    alt="Sterling Logo" 
                    className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.2)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
