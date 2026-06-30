import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

const CSSWaveform = ({ isSpeaking, getAudioFrequency, theme = 'dark' }) => {
  const [intensity, setIntensity] = useState(0);
  const reqRef = useRef();

  useEffect(() => {
    const update = () => {
      // Get real audio frequency if available, fallback to 0
      const rawFreq = (typeof getAudioFrequency === 'function' && isSpeaking) ? getAudioFrequency() : 0;
      // Map 0-255 to a 0.0 - 1.0 scale
      const normalized = Math.min(rawFreq / 150, 1.0);
      setIntensity(normalized);
      reqRef.current = requestAnimationFrame(update);
    };

    reqRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(reqRef.current);
  }, [getAudioFrequency, isSpeaking]);

  // Determine base colors
  const isDark = theme === 'dark';
  const baseColor = isSpeaking 
    ? 'rgba(220, 38, 38, 1)' // Sterling Red when speaking
    : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(71, 85, 105, 0.8)'); // White/Slate idle

  const glowColor = isSpeaking
    ? 'rgba(220, 38, 38, 0.5)'
    : (isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(71, 85, 105, 0.3)');

  // Idle pulse is gentle, speaking pulse uses the mic intensity
  const scaleOuter = isSpeaking ? 1.2 + intensity * 0.8 : 1.0;
  const scaleMiddle = isSpeaking ? 1.1 + intensity * 0.5 : 1.0;
  const scaleInner = isSpeaking ? 1.0 + intensity * 0.2 : 1.0;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Outer Glow */}
      <motion.div
        className="absolute rounded-full blur-3xl opacity-60"
        style={{ width: '200px', height: '200px', backgroundColor: glowColor }}
        animate={{
          scale: [scaleOuter, scaleOuter * 1.05, scaleOuter],
          opacity: isSpeaking ? [0.6, 0.8, 0.6] : [0.4, 0.5, 0.4]
        }}
        transition={{
          duration: isSpeaking ? 0.2 : 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* Middle Core */}
      <motion.div
        className="absolute rounded-full blur-xl"
        style={{ width: '120px', height: '120px', backgroundColor: baseColor }}
        animate={{
          scale: [scaleMiddle, scaleMiddle * 1.1, scaleMiddle]
        }}
        transition={{
          duration: isSpeaking ? 0.15 : 2.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* Inner Solid Core */}
      <motion.div
        className="absolute rounded-full shadow-lg"
        style={{ width: '60px', height: '60px', backgroundColor: baseColor }}
        animate={{
          scale: [scaleInner, scaleInner * 1.15, scaleInner]
        }}
        transition={{
          duration: isSpeaking ? 0.1 : 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    </div>
  );
};

export default CSSWaveform;
