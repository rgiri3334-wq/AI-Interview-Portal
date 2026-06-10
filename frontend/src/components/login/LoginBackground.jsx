import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function LoginBackground() {
  // Generate random data for floating particles to avoid massive inline arrays
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: Math.random() * 10 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
      isRed: Math.random() > 0.5,
    }));
  }, []);

  const orbs = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      size: Math.random() * 300 + 200,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 30 + 20,
      delay: Math.random() * 10,
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-white pointer-events-none">
      {/* Heavy blurred orbs for a deep, rich ambiance */}
      {orbs.map((orb) => (
        <motion.div
          key={`orb-${orb.id}`}
          className="absolute rounded-full mix-blend-multiply filter blur-[100px] opacity-40 bg-red-600"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
          }}
          animate={{
            x: [0, Math.random() * 400 - 200, 0],
            y: [0, Math.random() * 400 - 200, 0],
            scale: [1, Math.random() * 0.5 + 1, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "linear",
            delay: orb.delay,
          }}
        />
      ))}

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #EF4444 1px, transparent 1px), linear-gradient(to bottom, #EF4444 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem'
        }}
      />

      {/* Floating Geometric Particles */}
      {particles.map((p) => (
        <motion.div
          key={`particle-${p.id}`}
          className={`absolute rounded-sm ${p.isRed ? 'bg-red-500' : 'bg-red-200'}`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: 0.6,
          }}
          animate={{
            y: ['-20vh', '120vh'],
            rotate: [0, 360],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
            delay: p.delay,
          }}
        />
      ))}

      {/* Subtle sweeping gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 0%, #EF4444 150%)',
        }}
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, transparent 0%, #EF4444 150%)',
            'radial-gradient(circle at 60% 40%, transparent 0%, #EF4444 120%)',
            'radial-gradient(circle at 40% 60%, transparent 0%, #EF4444 150%)',
            'radial-gradient(circle at 50% 50%, transparent 0%, #EF4444 150%)',
          ]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Overlay noise to make it feel premium */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
    </div>
  );
}
