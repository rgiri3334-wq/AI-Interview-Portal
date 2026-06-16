import React, { useEffect, useState, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, useGLTF } from '@react-three/drei';
import AvatarRig from './AvatarRig';
import { useAvatarState } from '../hooks/useAvatarState';
import { useAvatarLipSync } from '../hooks/useAvatarLipSync';

// Preload the standard avatar file that the user will replace
useGLTF.preload('/models/avatar.glb');

// ── Audio visualizer bars ──────────────────────────────────────────────────
function AudioBars({ audioLevel, count = 5 }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: '24px' }}>
      {Array.from({ length: count }).map((_, i) => {
        const phase = (i / count) * Math.PI;
        const height = 4 + (audioLevel * 20) * (0.4 + 0.6 * Math.abs(Math.sin(phase + Date.now() / 200)));
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-green-400"
            animate={{ height: `${Math.max(4, Math.min(20, height))}px` }}
            transition={{ duration: 0.08, ease: 'linear' }}
          />
        );
      })}
    </div>
  );
}

// ── Thinking indicator ─────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-amber-400"
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Main Avatar Component ──────────────────────────────────────────────────
export default function Avatar3D({
  getAudioFrequency,
  isSpeaking   = false,
  isListening  = false,
  isLoading    = false,
  phase        = 'interviewing',
  qIndex       = 0,
  warnings     = 0,
}) {
  const avatarState = useAvatarState({ isSpeaking, isListening, isLoading, phase, qIndex, warnings });
  const { mouthOpenRef, updateLipSync } = useAvatarLipSync(getAudioFrequency);
  
  const [audioLevel, setAudioLevel] = useState(0);
  const animFrameRef = useRef(null);

  // ── Poll audio frequency for lip-sync & UI ────────────────────────
  useEffect(() => {
    if (!isSpeaking || !getAudioFrequency) {
      cancelAnimationFrame(animFrameRef.current);
      setAudioLevel(0);
      return;
    }
    const update = () => {
      updateLipSync(); // Drives the 3D mouth morph targets
      const raw = getAudioFrequency(); // 0–255
      const normalized = raw / 255;
      setAudioLevel(normalized);
      animFrameRef.current = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isSpeaking, getAudioFrequency, updateLipSync]);

  // ── State-driven UI config ─────────────────────────────────────
  const avatarConfig = (() => {
    if (isLoading) return {
      glowColor: 'rgba(245,158,11,0.12)',
      badgeText: '● Thinking',
      badgeClass: 'bg-amber-500/95 text-white',
      ringPulse: true,
      ringColor: 'border-amber-400',
    };
    if (isSpeaking) return {
      glowColor: 'rgba(34,197,94,0.1)',
      badgeText: '● Speaking',
      badgeClass: 'bg-green-500/95 text-white',
      ringPulse: false,
      ringColor: 'border-green-400',
    };
    if (isListening) return {
      glowColor: 'rgba(239,68,68,0.1)',
      badgeText: '● Listening',
      badgeClass: 'bg-red-500/95 text-white',
      ringPulse: true,
      ringColor: 'border-red-400',
    };
    return {
      glowColor: 'rgba(255,255,255,0.03)',
      badgeText: '● Ready',
      badgeClass: 'bg-white/90 text-slate-500',
      ringPulse: false,
      ringColor: 'border-slate-200',
    };
  })();

  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl flex items-center justify-center"
         style={{ background: 'linear-gradient(160deg, #f8f9fa 0%, #e8edf2 60%, #dce3eb 100%)' }}>

      {/* ── Background ambient glow ─────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10"
        animate={{ backgroundColor: avatarConfig.glowColor }}
        transition={{ duration: 0.4 }}
      />

      {/* ── Pulsing ring (listening/thinking) ──────────────────────── */}
      {avatarConfig.ringPulse && (
        <motion.div
          className={`absolute inset-2 rounded-2xl border-2 ${avatarConfig.ringColor} pointer-events-none z-20`}
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.98, 1.01, 0.98] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ── Speaking ring ─────────────────────────────────────── */}
      {isSpeaking && (
        <motion.div
          className="absolute inset-2 rounded-2xl border-2 border-green-400/60 pointer-events-none z-20"
          animate={{ opacity: [0.2 + audioLevel * 0.6, 0.6 + audioLevel * 0.4, 0.2 + audioLevel * 0.6] }}
          transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* ── 3D Canvas Container ─────────────────────────────────── */}
      <div className="absolute inset-0 z-10">
        <Canvas 
          camera={{ position: [0, -0.2, 1.2], fov: 35 }} 
          dpr={[1, 1.5]} 
          gl={{ powerPreference: "low-power", antialias: false }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[0, 2, 5]} intensity={1.2} />
          <Environment preset="city" />
          <Suspense fallback={null}>
            <AvatarRig avatarState={avatarState} mouthOpenRef={mouthOpenRef} />
          </Suspense>
          <ContactShadows opacity={0.4} scale={5} blur={2} far={4} resolution={256} color="#000000" position={[0, -1.5, 0]} />
        </Canvas>
      </div>

      {/* ── State indicator badge (top-right) ─────────────────────── */}
      <div className="absolute top-3 right-3 z-30 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={avatarConfig.badgeText}
            initial={{ opacity: 0, y: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm ${avatarConfig.badgeClass}`}
          >
            {avatarConfig.badgeText}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom status bar ─────────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="bg-white/92 backdrop-blur-md rounded-full border border-white/80 px-4 py-2 flex items-center gap-2.5 shadow-lg shadow-black/8">
          {isSpeaking && (
            <AudioBars audioLevel={audioLevel} count={5} />
          )}
          {isLoading && <ThinkingDots />}
          {!isSpeaking && !isLoading && (
            <div className={`w-2 h-2 rounded-full transition-all duration-300
              ${isListening ? 'bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]'
              : 'bg-emerald-500'}`}
            />
          )}
          <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase whitespace-nowrap">
            {isSpeaking ? 'Speaking' : isListening ? 'Listening' : isLoading ? 'Thinking...' : 'Active'}
          </span>
        </div>
      </div>

      {/* ── Name plate ─────────────────────────────────────────────── */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-md shadow-lg">
          Sterling AI Interviewer
        </div>
      </div>
    </div>
  );
}
