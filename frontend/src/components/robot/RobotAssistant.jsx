import React, { useRef, useEffect, useState } from 'react';
import { useFrame, Canvas } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send } from 'lucide-react';
import { apiClient } from '../../api/apiClient';

// Resolve a bone by trying several common naming conventions
function resolveBone(nodes, scene, ...candidates) {
  for (const name of candidates) {
    if (nodes && nodes[name]) return nodes[name];
  }
  if (scene) {
    let hit = null;
    scene.traverse((o) => {
      if (hit) return;
      for (const name of candidates) {
        if (o.name === name || o.name === `mixamorig:${name}` || o.name === `mixamorig${name}`) {
          hit = o; return;
        }
      }
    });
    if (hit) return hit;
  }
  return null;
}

const damp = (current, target, factor, dt) => THREE.MathUtils.damp(current, target, factor, dt);

function RobotRig({ phase, speak, hasSpoken }) {
  const { nodes, scene } = useGLTF('/robot.glb');
  const anim = useRef({
    t: 0,
    headPitch: 0, headYaw: 0, headRoll: 0,
    spinePitch: 0, rightArmRoll: 1.2, rightForeArmPitch: 0,
    leftArmRoll: 1.2, leftForeArmPitch: 0,
    waveT: 0, hasWaved: false
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

  // Handle SpeechSynthesis greeting when hitting GREETING phase
  useEffect(() => {
    if (phase === 'GREETING' && !hasSpoken.current) {
      hasSpoken.current = true;
      const isNew = !sessionStorage.getItem('isAuthenticated'); // Simplified check
      const text = isNew ? "Welcome to the virtual reality." : "Welcome back.";
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.2; // Slightly higher/robotic pitch
      utterance.rate = 0.9;
      
      // Attempt to find a suitable voice
      const setVoice = () => {
        const voices = speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Google UK English Female'));
        if (preferred) utterance.voice = preferred;
        speechSynthesis.speak(utterance);
      };

      if (speechSynthesis.getVoices().length > 0) setVoice();
      else speechSynthesis.onvoiceschanged = setVoice;

      utterance.onend = () => {
        // Tell parent to move to RESIZING phase
        setTimeout(() => speak('RESIZING'), 500);
      };
    }
  }, [phase, speak, hasSpoken]);

  useFrame((state, delta) => {
    if (!nodes) return;
    const dt = Math.min(delta, 0.05);
    const a = anim.current;
    a.t += dt;

    let targetHeadPitch = 0;
    let targetHeadYaw = 0;
    let targetHeadRoll = 0;
    let targetSpinePitch = Math.sin(a.t * 1.5) * 0.015; // Breath
    let targetRightArmRoll = 1.2;
    let targetRightForeArmPitch = 0.1;
    
    if (phase === 'WAKING') {
      targetHeadPitch = 0.5; // Looking down/sleeping
    } else if (phase === 'GREETING') {
      targetHeadPitch = 0;
      targetHeadYaw = Math.sin(a.t * 2) * 0.1; // Looking around slightly
      
      // Wave logic
      if (!a.hasWaved) {
        a.waveT = 0;
        a.hasWaved = true;
      }
      if (a.hasWaved && a.waveT < 3.0) {
        a.waveT += dt;
        let waveAmt = Math.sin(a.waveT * Math.PI) * 0.5 + 0.5; // Smooth 0->1->0
        if (a.waveT > 2.5) waveAmt = 0; // End wave
        
        if (waveAmt > 0) {
          targetRightArmRoll = -1.5; 
          targetRightForeArmPitch = Math.sin(a.t * 12) * 0.4 - 0.5; 
        }
      }
    } else if (phase === 'IDLE') {
      // Look left slightly as requested
      targetHeadYaw = 0.3 + Math.sin(a.t * 0.5) * 0.1;
    }

    a.headPitch = damp(a.headPitch, targetHeadPitch, 4, dt);
    a.headYaw = damp(a.headYaw, targetHeadYaw, 4, dt);
    a.headRoll = damp(a.headRoll, targetHeadRoll, 4, dt);
    a.spinePitch = damp(a.spinePitch, targetSpinePitch, 2, dt);
    a.rightArmRoll = damp(a.rightArmRoll, targetRightArmRoll, 5, dt);
    a.rightForeArmPitch = damp(a.rightForeArmPitch, targetRightForeArmPitch, 5, dt);

    const head = resolveBone(nodes, scene, 'Head');
    const spine = resolveBone(nodes, scene, 'Spine', 'Spine1');
    const rightArm = resolveBone(nodes, scene, 'RightArm');
    const rightForeArm = resolveBone(nodes, scene, 'RightForeArm');

    if (head) {
      head.rotation.x = a.headPitch;
      head.rotation.y = a.headYaw;
      head.rotation.z = a.headRoll;
    }
    if (spine) spine.rotation.x = a.spinePitch;
    if (rightArm) rightArm.rotation.z = a.rightArmRoll;
    if (rightForeArm) rightForeArm.rotation.x = a.rightForeArmPitch;

    // Camera control based on phase
    if (phase === 'WAKING') {
      state.camera.position.lerp(new THREE.Vector3(0, -0.2, 1.2), dt * 2); // Close up
    } else if (phase === 'GREETING') {
      state.camera.position.lerp(new THREE.Vector3(0, -0.2, 1.8), dt * 2); // Pull back slightly
    } else {
      state.camera.position.lerp(new THREE.Vector3(0, -0.2, 3.5), dt * 2); // Full body for corner
    }
    state.camera.lookAt(0, -0.5, 0);
  });

  return (
    <group position={[0, -1.8, 0]} scale={1}>
      <primitive object={scene} />
    </group>
  );
}

// Chatbot Interface
function ChatbotUI({ onClose }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hello! I am your AI assistant. Do you have any questions about the interview process?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => scrollToBottom(), [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    
    try {
      // Call our new Chatbot endpoint
      const res = await apiClient.request('/api/assistant/chat', 'POST', { message: userMsg });
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting to my neural net.' }]);
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-32 right-6 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 h-96"
    >
      <div className="bg-red-600 p-4 text-white flex justify-between items-center">
        <h3 className="font-bold text-sm flex items-center gap-2"><MessageSquare size={16}/> Virtual Assistant</h3>
        <button onClick={onClose} className="hover:bg-red-700 p-1 rounded-full"><X size={16}/></button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-red-600 text-white self-end rounded-br-sm' : 'bg-slate-100 text-slate-800 self-start rounded-bl-sm'}`}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="bg-slate-100 text-slate-500 self-start p-3 rounded-2xl rounded-bl-sm text-xs animate-pulse">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me anything..."
          className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-red-500"
        />
        <button 
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-red-600 text-white p-2.5 rounded-full hover:bg-red-700 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </motion.div>
  );
}

export default function RobotAssistant({ onIntroComplete, skipIntro }) {
  const [phase, setPhase] = useState(skipIntro ? 'IDLE' : 'PROMPT'); // PROMPT -> WAKING -> GREETING -> RESIZING -> IDLE
  const [chatOpen, setChatOpen] = useState(false);
  const hasSpoken = useRef(skipIntro);

  useEffect(() => {
    if (phase === 'RESIZING') {
      setTimeout(() => {
        setPhase('IDLE');
        if (onIntroComplete) onIntroComplete();
      }, 1500); // 1.5s for canvas to resize
    }
  }, [phase, onIntroComplete]);

  // Click handler for 3D model
  const handleCanvasClick = () => {
    if (phase === 'PROMPT') {
      setPhase('WAKING');
      setTimeout(() => setPhase('GREETING'), 2000);
    } else if (phase === 'IDLE') {
      setChatOpen(true);
    }
  };

  const isFullscreen = phase === 'PROMPT' || phase === 'WAKING' || phase === 'GREETING' || phase === 'RESIZING';

  return (
    <>
      <AnimatePresence>
        {phase === 'PROMPT' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[100] flex items-center justify-center cursor-pointer"
            onClick={handleCanvasClick}
          >
            <motion.p 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-white font-mono uppercase tracking-widest text-sm font-bold"
            >
              Click anywhere to initialize
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="fixed z-[90] cursor-pointer shadow-2xl overflow-hidden"
        initial={false}
        animate={{
          inset: isFullscreen ? '0px 0px 0px 0px' : 'auto 24px 24px auto',
          width: isFullscreen ? '100vw' : '250px',
          height: isFullscreen ? '100vh' : '350px',
          background: isFullscreen ? 'rgba(2,6,23,1)' : 'rgba(2,6,23,0)',
          borderRadius: isFullscreen ? '0px' : '24px',
        }}
        transition={{ duration: 1.5, ease: [0.77, 0, 0.175, 1] }}
        onClick={handleCanvasClick}
        style={{ pointerEvents: phase === 'PROMPT' ? 'none' : 'auto' }}
      >
        <Canvas camera={{ position: [0, 0, 1.2], fov: 35 }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[2, 5, 2]} intensity={2.5} castShadow />
          <Environment preset="city" />
          <RobotRig phase={phase} speak={setPhase} hasSpoken={hasSpoken} />
          <ContactShadows position={[0, -1.8, 0]} opacity={0.4} scale={5} blur={2} far={2.5} />
        </Canvas>
      </motion.div>

      <AnimatePresence>
        {chatOpen && <ChatbotUI onClose={() => setChatOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
