import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoUrl from '../../assets/sterling_logo.png';

export default function AppSplash({ onComplete }) {
  const [stage, setStage] = useState('blank'); 
  // 'blank' | 'logo-in' | 'logo-pause' | 'logo-out' | 'bg-out' | 'done'

  useEffect(() => {
    const hasPlayed = sessionStorage.getItem('splashPlayed');
    if (hasPlayed) {
      setStage('done');
      onComplete?.();
      return;
    }

    // Exact timeline requested:
    // 0.0s -> 1.0s: Blank White Screen
    const t1 = setTimeout(() => setStage('logo-in'), 1000);
    
    // 1.0s -> 2.0s: 3D Logo appears with Red Ambient Glow
    const t2 = setTimeout(() => setStage('logo-pause'), 2000);
    
    // 2.0s -> 3.0s: Logo pauses and holds on screen
    const t3 = setTimeout(() => setStage('logo-out'), 3000);
    
    // 3.0s -> 4.5s: Logo slowly zooms out (scale to 0 to prevent pixelation)
    const t4 = setTimeout(() => setStage('bg-out'), 4200); // Start bg fade slightly before logo fully disappears
    
    // 4.2s -> 5.0s: White Background fades out smoothly
    const t5 = setTimeout(() => {
      setStage('done');
      sessionStorage.setItem('splashPlayed', 'true');
      onComplete?.();
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  return (
    <AnimatePresence>
      {stage !== 'done' && (
        <motion.div
          key="splash-container"
          initial={{ opacity: 1 }}
          animate={{ opacity: stage === 'bg-out' ? 0 : 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-white overflow-hidden pointer-events-none"
        >
          {/* Logo Container with 3D Perspective */}
          <div style={{ perspective: 1000 }} className="w-full h-full flex items-center justify-center">
            <AnimatePresence>
              {(stage === 'logo-in' || stage === 'logo-pause' || stage === 'logo-out') && (
                <motion.div
                  key="logo-zoom"
                  initial={{ scale: 0.8, opacity: 0, rotateX: 30, rotateY: -20 }}
                  animate={
                    stage === 'logo-out' 
                      ? { scale: 0, opacity: 0, rotateX: 0, rotateY: 0 } // Zoom out to nothing
                      : { scale: 1, opacity: 1, rotateX: 0, rotateY: 0 } // Fly in to flat
                  }
                  transition={{ 
                    duration: stage === 'logo-out' ? 1.5 : 1.0, 
                    ease: stage === 'logo-out' ? "easeInOut" : "easeOut"
                  }}
                  className="w-56 h-56 flex items-center justify-center"
                >
                  <img 
                    src={logoUrl} 
                    alt="Sterling Logo" 
                    // image-rendering smooths the pixels, drop-shadow creates the intense red ambient glow
                    style={{ imageRendering: 'high-quality' }}
                    className="w-full h-full object-contain drop-shadow-[0_0_40px_rgba(220,38,38,0.7)]"
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
