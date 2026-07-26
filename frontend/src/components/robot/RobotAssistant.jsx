import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, Canvas } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { apiClient } from '../../api/apiClient';

// ─── Utilities ───────────────────────────────────────────────

function resolveBone(nodes, scene, ...candidates) {
  for (const name of candidates) {
    if (nodes && nodes[name]) return nodes[name];
  }
  if (scene) {
    let hit = null;
    scene.traverse((o) => {
      if (hit) return;
      for (const name of candidates) {
        if (o.name === name || o.name === 'mixamorig:' + name || o.name === 'mixamorig' + name) {
          hit = o;
          return;
        }
      }
    });
    if (hit) return hit;
  }
  return null;
}

const dampVal = (current, target, factor, dt) => THREE.MathUtils.damp(current, target, factor, dt);
const easeOutCubic = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

// ─── Spatial Caption: Holographic word-by-word typing ────────
// FIX 2: Dark vignette background for perfect readability without hard box edges

function SpatialCaption({ text }) {
  const [visibleWords, setVisibleWords] = useState(0);
  const words = text ? text.split(' ') : [];

  useEffect(() => {
    if (!text) return;
    setVisibleWords(0);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleWords(count);
      if (count >= words.length) clearInterval(interval);
    }, 150);
    return () => clearInterval(interval);
  }, [text]);

  if (!text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5 }}
      // Adjusted positioning, sizing, and added a soft radial gradient background
      className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl max-h-[35vh] overflow-hidden px-10 py-8 pointer-events-none z-20 flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 80%)'
      }}
    >
      {/* Scanline sweep */}
      <motion.div
        animate={{ left: ['-50%', '150%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        className="absolute top-0 w-1/3 h-full pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.06), transparent)' }}
      />

      <p
        className="text-white text-base md:text-xl font-light tracking-wide text-center leading-relaxed relative z-10"
        style={{ textShadow: '0 0 20px rgba(239,68,68,0.4), 0 0 60px rgba(239,68,68,0.1)' }}
      >
        {words.slice(0, visibleWords).join(' ')}
        {visibleWords < words.length && (
          <span className="text-red-500 animate-pulse ml-0.5 font-normal">|</span>
        )}
      </p>

      {/* Red underline glow */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="mt-5 mx-auto w-3/4 h-[1px] relative z-10"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)' }}
      />
    </motion.div>
  );
}

// ─── Robot Rig: Walking entrance + full gesture library ──────
// FIX 1: Face right while walking, then smoothly turn front

function RobotRig({ phase, chatOpen }) {
  const { nodes, scene } = useGLTF('/robot.glb');
  const groupRef = useRef();
  const anim = useRef({
    t: 0,
    walkProgress: 0,
    headPitch: 0, headYaw: 0, headRoll: 0,
    spinePitch: 0, spineYaw: 0,
    rightArmRoll: 1.2, rightArmPitch: 0.1, rightArmYaw: 0,
    rightForeArmPitch: 0.1, rightHandYaw: 0,
    leftArmRoll: -1.2, leftArmPitch: 0.1, leftArmYaw: 0,
    leftForeArmPitch: 0.1,
    waveT: 0, hasWaved: false,
  });

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
          if (child.material) {
            if (child.material.skinning !== undefined) delete child.material.skinning;
            if (child.material.morphTargets !== undefined) delete child.material.morphTargets;
          }
        }
      });
    }
  }, [scene]);

  useFrame((state, delta) => {
    if (!nodes) return;
    const dt = Math.min(delta, 0.05);
    const a = anim.current;
    a.t += dt;

    // ── Walking entrance animation with rotation ──
    if (groupRef.current) {
      if (phase === 'WALKING') {
        a.walkProgress = Math.min(a.walkProgress + dt / 3, 1); // 3s walk
        const eased = easeOutCubic(a.walkProgress);
        const walkBob = eased < 0.95 ? Math.sin(a.t * 8) * 0.018 * (1 - eased) : 0;
        
        groupRef.current.position.x = THREE.MathUtils.lerp(-4, 0, eased);
        groupRef.current.position.y = -1.8 + walkBob;
        
        // FIX 1: Face right while walking (Math.PI / 2)
        groupRef.current.rotation.y = Math.PI / 2;
      } else {
        // Smoothly settle and turn front
        groupRef.current.position.x = dampVal(groupRef.current.position.x, 0, 5, dt);
        groupRef.current.position.y = dampVal(groupRef.current.position.y, -1.8, 5, dt);
        
        // FIX 1: Turn back to face the camera (candidate)
        groupRef.current.rotation.y = dampVal(groupRef.current.rotation.y, 0, 4, dt);
      }
    }

    // ── Gesture targets per phase ──
    let tHP = 0, tHY = 0, tHR = 0;
    let tSP = Math.sin(a.t * 1.5) * 0.015; // Breathing
    let tSY = 0;
    let tRAR = 1.2, tRAP = 0.1, tRAY = 0;
    let tRFP = 0.1, tRHY = 0;
    let tLAR = -1.2, tLAP = 0.1, tLAY = 0;
    let tLFP = 0.1;

    if (phase === 'WALKING') {
      tHP = Math.sin(a.t * 4) * 0.025;
      tSY = Math.sin(a.t * 4) * 0.02;
      tRAR = 1.2 + Math.sin(a.t * 4) * 0.15;
      tLAR = -1.2 - Math.sin(a.t * 4) * 0.15;
      tRFP = 0.1 + Math.sin(a.t * 4 + Math.PI) * 0.08;
      tLFP = 0.1 + Math.sin(a.t * 4) * 0.08;
    } else if (phase === 'WAKING') {
      tHP = 0.5; // Look down initially
    } else if (phase === 'GREETING') {
      tHY = Math.sin(a.t * 1.5) * 0.06;

      if (!a.hasWaved) { a.waveT = 0; a.hasWaved = true; }
      a.waveT += dt;

      if (a.waveT < 1.2) {
        const raise = easeOutCubic(a.waveT / 1.2);
        tRAR = THREE.MathUtils.lerp(1.2, -1.0, raise);
        tRAP = THREE.MathUtils.lerp(0.1, -0.25, raise);
        tRAY = THREE.MathUtils.lerp(0, 0.2, raise);
        tRFP = THREE.MathUtils.lerp(0.1, -0.5, raise);
        tSY = raise * 0.03;
      } else if (a.waveT < 3.8) {
        const waveTime = a.waveT - 1.2;
        const decay = Math.max(0, 1 - waveTime / 2.6);
        tRAR = -1.0;
        tRAP = -0.25;
        tRAY = 0.2;
        tRFP = -0.5 + Math.sin(waveTime * 3.5) * 0.3 * decay;
        tRHY = Math.sin(waveTime * 3.5) * 0.2 * decay;
        tSY = 0.03;
      } else if (a.waveT < 5.2) {
        const lower = easeOutCubic((a.waveT - 3.8) / 1.4);
        tRAR = THREE.MathUtils.lerp(-1.0, 1.2, lower);
        tRAP = THREE.MathUtils.lerp(-0.25, 0.1, lower);
        tRAY = THREE.MathUtils.lerp(0.2, 0, lower);
        tRFP = THREE.MathUtils.lerp(-0.5, 0.1, lower);
        tRHY = THREE.MathUtils.lerp(0, 0, lower);
        tSY = THREE.MathUtils.lerp(0.03, 0, lower);
      }
    } else if (phase === 'INTRO_PORTAL') {
      tHY = 0.35;
      tHP = -0.05;
      tRAR = -0.7;
      tRAP = -0.15;
      tRAY = 0.4;
      tRFP = -0.3;
    } else if (phase === 'INTRO_FEATURES') {
      tHP = Math.sin(a.t * 2.5) * 0.08;
      tHY = Math.sin(a.t * 0.8) * 0.15;
      tRAR = 0.8;
      tRFP = Math.sin(a.t * 1.5) * 0.1 + 0.2;
      tLAR = -0.8;
      tLFP = Math.sin(a.t * 1.5 + 1) * 0.1 + 0.2;
    } else if (phase === 'INTRO_ENCOURAGE') {
      tHP = -0.05;
      tHY = Math.sin(a.t * 0.5) * 0.05;
      tRAR = -0.6;
      tRAP = -0.2;
      tRFP = -0.2;
      tLAR = 0.6;
      tLAP = -0.2;
      tLFP = -0.2;
    } else if (phase === 'INTRO_READY') {
      tHP = -0.1;
      tRAR = 0.2;
      tRAP = -0.6;
      tRFP = -0.4;
    } else if (phase === 'IDLE' || phase === 'RESIZING') {
      if (chatOpen) {
        tHY = -0.35;
        tHP = Math.sin(a.t * 2) * 0.03;
      } else {
        tHY = 0.3 + Math.sin(a.t * 0.5) * 0.1;
      }
    }

    const df = 5;
    a.headPitch = dampVal(a.headPitch, tHP, df, dt);
    a.headYaw = dampVal(a.headYaw, tHY, df, dt);
    a.headRoll = dampVal(a.headRoll, tHR, df, dt);
    a.spinePitch = dampVal(a.spinePitch, tSP, 2, dt);
    a.spineYaw = dampVal(a.spineYaw, tSY, 4, dt);
    a.rightArmRoll = dampVal(a.rightArmRoll, tRAR, 5, dt);
    a.rightArmPitch = dampVal(a.rightArmPitch, tRAP, 5, dt);
    a.rightArmYaw = dampVal(a.rightArmYaw, tRAY, 5, dt);
    a.rightForeArmPitch = dampVal(a.rightForeArmPitch, tRFP, 5, dt);
    a.rightHandYaw = dampVal(a.rightHandYaw, tRHY, 5, dt);
    a.leftArmRoll = dampVal(a.leftArmRoll, tLAR, 5, dt);
    a.leftArmPitch = dampVal(a.leftArmPitch, tLAP, 5, dt);
    a.leftArmYaw = dampVal(a.leftArmYaw, tLAY, 5, dt);
    a.leftForeArmPitch = dampVal(a.leftForeArmPitch, tLFP, 5, dt);

    const head = resolveBone(nodes, scene, 'Head');
    const spine = resolveBone(nodes, scene, 'Spine', 'Spine1');
    const rightArm = resolveBone(nodes, scene, 'RightArm');
    const rightForeArm = resolveBone(nodes, scene, 'RightForeArm');
    const rightHand = resolveBone(nodes, scene, 'RightHand');
    const leftArm = resolveBone(nodes, scene, 'LeftArm');
    const leftForeArm = resolveBone(nodes, scene, 'LeftForeArm');
    const rightShoulder = resolveBone(nodes, scene, 'RightShoulder');
    const leftShoulder = resolveBone(nodes, scene, 'LeftShoulder');

    if (head) {
      head.rotation.x = a.headPitch;
      head.rotation.y = a.headYaw;
      head.rotation.z = a.headRoll;
    }
    if (spine) {
      spine.rotation.x = a.spinePitch;
      spine.rotation.y = a.spineYaw;
    }
    if (rightArm) {
      rightArm.rotation.x = a.rightArmPitch;
      rightArm.rotation.y = a.rightArmYaw;
      rightArm.rotation.z = a.rightArmRoll;
    }
    if (rightForeArm) rightForeArm.rotation.x = a.rightForeArmPitch;
    if (rightHand) rightHand.rotation.y = a.rightHandYaw;
    if (leftArm) {
      leftArm.rotation.x = a.leftArmPitch;
      leftArm.rotation.y = a.leftArmYaw;
      leftArm.rotation.z = a.leftArmRoll;
    }
    if (leftForeArm) leftForeArm.rotation.x = a.leftForeArmPitch;
    if (rightShoulder) rightShoulder.rotation.z = 0.2;
    if (leftShoulder) leftShoulder.rotation.z = -0.2;

    // ── Camera Framing (Shifted up to leave more room for captions below) ──
    if (phase === 'WALKING') {
      state.camera.position.lerp(new THREE.Vector3(0, 0, 3.5), dt * 2);
    } else if (phase === 'WAKING') {
      state.camera.position.lerp(new THREE.Vector3(0, 0.4, 1.5), dt * 2);
    } else if (phase === 'GREETING') {
      state.camera.position.lerp(new THREE.Vector3(0, 0.4, 2.8), dt * 1.5);
    } else if (phase === 'INTRO_PORTAL') {
      state.camera.position.lerp(new THREE.Vector3(0.3, 0.2, 2.5), dt * 1.5);
    } else if (phase === 'INTRO_FEATURES') {
      state.camera.position.lerp(new THREE.Vector3(0, 0.3, 3.0), dt * 1.5);
    } else if (phase === 'INTRO_ENCOURAGE') {
      state.camera.position.lerp(new THREE.Vector3(0, 0.2, 2.6), dt * 1.5);
    } else if (phase === 'INTRO_READY') {
      state.camera.position.lerp(new THREE.Vector3(0, 0.2, 2.2), dt * 1.5);
    } else if (phase === 'RESIZING') {
      state.camera.position.lerp(new THREE.Vector3(0, 0, 3.5), dt * 2);
    } else {
      if (chatOpen) {
        state.camera.position.lerp(new THREE.Vector3(0, 0.1, 2.8), dt * 2);
      } else {
        state.camera.position.lerp(new THREE.Vector3(0, 0, 3.5), dt * 2);
      }
    }
    // Look higher to push robot up in the frame
    state.camera.lookAt(0, -0.1, 0); 
  });

  return (
    <group ref={groupRef} position={[-4, -1.8, 0]}>
      <primitive object={scene} />
    </group>
  );
}

// ─── Chat Panel: Spatial dark theme ──────────────────────────
// FIX 4: Strong contrast close button

function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I am here to help. Ask me anything about the interview process, your application, or the portal.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await apiClient.askAssistant({ message: userMsg });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I am having trouble connecting to my neural net right now. Please try again.' },
      ]);
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full w-full"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-widest">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          AI Assistant
        </div>
        {/* FIX 4: highly visible close button */}
        <button
          onClick={onClose}
          className="text-white hover:text-red-400 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors shadow-sm"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 px-3 py-3 overflow-y-auto flex flex-col gap-2.5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === 'user'
                ? 'max-w-[85%] p-2.5 rounded-2xl rounded-br-sm text-sm self-end'
                : 'max-w-[85%] p-2.5 rounded-2xl rounded-bl-sm text-sm self-start'
            }
            style={
              msg.role === 'user'
                ? { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff' }
                : {
                    background: 'rgba(255,255,255,0.05)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }
            }
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div
            className="self-start p-3 rounded-2xl rounded-bl-sm"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <span className="inline-flex gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-red-500/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-red-500/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-3 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me anything..."
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-2 rounded-full transition-all disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
        >
          <Send size={14} className="text-white" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function RobotAssistant({ onIntroComplete, skipIntro, portalData }) {
  const [phase, setPhase] = useState(skipIntro ? 'IDLE' : 'WALKING');
  const [chatOpen, setChatOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [ttsStarted, setTtsStarted] = useState(false);
  const hasSpoken = useRef(skipIntro);

  const name = (portalData?.candidate?.name?.split(' ')[0]) || 'Candidate';
  const stage = portalData?.application?.stage;

  const phaseCaptions = useMemo(() => {
    let greeting = 'Hello ' + name + '! I am your AI assistant, and I am thrilled to welcome you to Sterling.';
    if (stage === 'INTERVIEW_PENDING') {
      greeting = 'Hello ' + name + '! Welcome back. I am your AI assistant. Your application is pending an interview schedule.';
    } else if (stage === 'INTERVIEW_SCHEDULED') {
      greeting = 'Hello ' + name + '! Welcome back. I am your AI assistant. Your interview is all set and ready to go.';
    } else if (stage === 'UNDER_REVIEW') {
      greeting = 'Hello ' + name + '! Welcome back. I am your AI assistant. Your interview is complete and currently under review.';
    } else if (stage === 'DECISION_MADE') {
      greeting = 'Hello ' + name + '! Welcome back. I am your AI assistant. A decision has been made on your application.';
    }

    return {
      WALKING: '',
      WAKING: 'Initializing Sterling AI 2.0 Flash...',
      GREETING: greeting,
      INTRO_PORTAL: 'This is the Sterling Virtual Reality Portal, a next generation AI powered platform built exclusively for engineering talent like you.',
      INTRO_FEATURES: 'From here, you can schedule interviews, take practice assessments, track your application in real time, and interact with our intelligent evaluation engine whenever you need.',
      INTRO_ENCOURAGE: 'Do not worry if this is your first time here. I will be with you every step of the way. Think of me as your personal AI companion throughout this entire process.',
      INTRO_READY: 'Whenever you are ready, just click on me for help. I am always here. Let us begin your journey!',
    };
  }, [name, stage]);

  useEffect(() => {
    const transitions = {
      WALKING: { duration: 3000, next: 'WAKING' },
      WAKING: { duration: 2000, next: 'GREETING' },
      GREETING: { duration: 7000, next: 'INTRO_PORTAL' },
      INTRO_PORTAL: { duration: 10000, next: 'INTRO_FEATURES' },
      INTRO_FEATURES: { duration: 12000, next: 'INTRO_ENCOURAGE' },
      INTRO_ENCOURAGE: { duration: 10000, next: 'INTRO_READY' },
      INTRO_READY: { duration: 5000, next: 'RESIZING' },
      RESIZING: { duration: 2000, next: 'IDLE' },
    };

    const config = transitions[phase];
    if (config) {
      const timer = setTimeout(() => {
        setPhase(config.next);
        if (config.next === 'IDLE' && onIntroComplete) onIntroComplete();
      }, config.duration);
      return () => clearTimeout(timer);
    }
  }, [phase, onIntroComplete]);

  // FIX 3: Caption sync — only set text when ttsStarted is true for speech phases
  useEffect(() => {
    const text = phaseCaptions[phase] || '';
    if (phase === 'WALKING') {
      setCaption('');
    } else if (phase === 'WAKING') {
      setCaption(text);
    } else if (ttsStarted) {
      setCaption(text);
    } else {
      setCaption('');
    }
  }, [phase, phaseCaptions, ttsStarted]);

  useEffect(() => {
    if (phase === 'GREETING' && !hasSpoken.current) {
      hasSpoken.current = true;
      const fullText = [
        phaseCaptions.GREETING,
        phaseCaptions.INTRO_PORTAL,
        phaseCaptions.INTRO_FEATURES,
        phaseCaptions.INTRO_ENCOURAGE,
        phaseCaptions.INTRO_READY,
      ].join(' ');

      const playTTS = async () => {
        try {
          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const audioUrl = backendUrl + '/api/tts?text=' + encodeURIComponent(fullText);
          const audio = new Audio(audioUrl);

          // FIX 3: Wait until the browser actually starts playing sound
          audio.onplaying = () => setTtsStarted(true);
          
          audio.onerror = () => { throw new Error('Neural TTS failed'); };
          await audio.play();
        } catch (err) {
          console.warn('Falling back to local TTS:', err);
          const utterance = new SpeechSynthesisUtterance(fullText);
          utterance.pitch = 1.1;
          utterance.rate = 0.9;

          utterance.onstart = () => setTtsStarted(true);

          const pickVoice = () => {
            const voices = speechSynthesis.getVoices();
            const preferred = voices.find(
              (v) =>
                v.name.includes('Female') ||
                v.name.includes('Zira') ||
                v.name.includes('Google UK English Female')
            );
            if (preferred) utterance.voice = preferred;
            speechSynthesis.speak(utterance);
          };
          if (speechSynthesis.getVoices().length > 0) pickVoice();
          else speechSynthesis.onvoiceschanged = pickVoice;

          setTimeout(() => setTtsStarted(true), 1500); // Safety fallback
        }
      };
      playTTS();
    }
  }, [phase, phaseCaptions]);

  const isFullscreen = [
    'WALKING', 'WAKING', 'GREETING', 'INTRO_PORTAL',
    'INTRO_FEATURES', 'INTRO_ENCOURAGE', 'INTRO_READY', 'RESIZING',
  ].includes(phase);

  const handleCanvasClick = () => {
    if (phase === 'IDLE' && !chatOpen) setChatOpen(true);
  };

  return (
    <motion.div
      className="fixed z-[90] cursor-pointer shadow-2xl overflow-hidden"
      initial={false}
      animate={{
        inset: isFullscreen ? '0px 0px 0px 0px' : 'auto 24px 24px auto',
        width: isFullscreen ? '100vw' : chatOpen ? '620px' : '250px',
        height: isFullscreen ? '100vh' : chatOpen ? '500px' : '350px',
        background: isFullscreen ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)',
        borderRadius: isFullscreen ? '0px' : '24px',
      }}
      transition={{ duration: 1.5, ease: [0.77, 0, 0.175, 1] }}
      onClick={handleCanvasClick}
    >
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#020617] via-slate-950 to-black"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 20% 30%, rgba(239,68,68,0.03), transparent 50%), radial-gradient(circle at 80% 70%, rgba(239,68,68,0.02), transparent 50%)',
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(220,38,38,0.15), transparent 70%)',
                filter: 'blur(80px)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-full w-full">
        <div
          className="h-full relative"
          style={{
            width: !isFullscreen && chatOpen ? 250 : '100%',
            flexShrink: 0,
            transition: 'width 0.5s cubic-bezier(0.77, 0, 0.175, 1)',
          }}
        >
          <Canvas camera={{ position: [0, 0, 1.2], fov: 35 }}>
            <ambientLight intensity={0.5} color="#ffffff" />
            <pointLight position={[0, 2, -2]} intensity={6} color="#ef4444" distance={15} />
            <directionalLight position={[2, 5, 2]} intensity={1.2} color="#f8fafc" castShadow />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Environment preset="city" />
            <RobotRig phase={phase} chatOpen={chatOpen} />
            <ContactShadows position={[0, -1.8, 0]} opacity={0.6} color="#ff0000" scale={5} blur={2} far={2.5} />
          </Canvas>

          <AnimatePresence mode="wait">
            {caption && isFullscreen && <SpatialCaption key={phase} text={caption} />}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {chatOpen && !isFullscreen && (
            <motion.div
              key="chat-container"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 370, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.77, 0, 0.175, 1] }}
              className="h-full overflow-hidden flex flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)' }}
            >
              <div
                className="w-[1px] h-full flex-shrink-0"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(239,68,68,0.3), transparent)' }}
              />
              <div className="flex-1 h-full min-w-0">
                <ChatPanel onClose={() => setChatOpen(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
