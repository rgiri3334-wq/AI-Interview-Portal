import React, { useRef, useEffect, useState } from 'react';
import { useFrame, Canvas } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send } from 'lucide-react';
import { apiClient } from '../../api/apiClient';

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

const LightweightStars = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <style>{
      "@keyframes twinkle { 0%, 100% { opacity: 0.1; transform: scale(0.5); } 50% { opacity: 0.8; transform: scale(1.2); } } " +
      ".vr-star { position: absolute; background: #ffffff; border-radius: 50%; box-shadow: 0 0 8px rgba(255, 100, 100, 0.6); animation: twinkle infinite ease-in-out; }"
    }</style>
    {Array.from({ length: 50 }).map((_, i) => (
      <div
        key={i}
        className="vr-star"
        style={{
          left: Math.random() * 100 + "%",
          top: Math.random() * 100 + "%",
          width: Math.random() * 2 + 1 + "px",
          height: Math.random() * 2 + 1 + "px",
          animationDuration: Math.random() * 4 + 2 + "s",
          animationDelay: Math.random() * 2 + "s"
        }}
      />
    ))}
  </div>
);

const damp = (current, target, factor, dt) => THREE.MathUtils.damp(current, target, factor, dt);

function RobotRig({ phase, speak, hasSpoken, setCaption, portalData }) {
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
      
      const name = portalData?.candidate?.name?.split(' ')[0] || "Candidate";
      const stage = portalData?.application?.stage;
      
      let text = "";
      if (stage === 'REGISTERED' || stage === 'APPLIED') {
         text = `Hello! I am your A I assistant. Welcome to the Sterling Virtual Reality, ${name}. To begin your journey, please schedule your interview slot using the timeline on your left.`;
      } else if (stage === 'INTERVIEW_PENDING') {
         text = `Hello! I am your A I assistant. Welcome back, ${name}. Your application is currently pending an interview schedule. Please book a slot to continue.`;
      } else if (stage === 'INTERVIEW_SCHEDULED') {
         text = `Hello! I am your A I assistant. Welcome back, ${name}. Your interview is scheduled. When the timer hits zero, you may begin your assessment.`;
      } else if (stage === 'UNDER_REVIEW') {
         text = `Hello! I am your A I assistant. Welcome back, ${name}. Your interview is complete and is currently under review by our team.`;
      } else if (stage === 'DECISION_MADE') {
         text = `Hello! I am your A I assistant. Welcome back, ${name}. A decision has been made on your application. Please check your portal for details.`;
      } else {
         text = `Hello! I am your A I assistant. Welcome back, ${name}.`;
      }
      
      setCaption(text);
      
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

      let hasFinished = false;
      
      const finishGreeting = () => {
        if (hasFinished) return;
        hasFinished = true;
        setCaption("");
        // Tell parent to move to RESIZING phase
        setTimeout(() => speak('RESIZING'), 800); // Wait a bit before resizing
      };

      utterance.onend = finishGreeting;
      utterance.onerror = finishGreeting;

      // Fallback in case speechSynthesis is blocked by the browser's autoplay policy
      // and onend never fires. Calculate approximate time based on text length.
      const fallbackTime = (text.length / 15) * 1000 + 2000; 
      setTimeout(finishGreeting, fallbackTime);
    }
  }, [phase, speak, hasSpoken, setCaption, portalData]);

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
      if (a.hasWaved && a.waveT < 3.5) {
        a.waveT += dt;
         let waveAmt = Math.sin(a.waveT * Math.PI) * 0.5 + 0.5; // Smooth 0->1->0
        if (a.waveT > 3.0) waveAmt = 0; // End wave
        
        if (waveAmt > 0) {
          targetRightArmRoll = -0.9; // Less extension so hand stays in frame
          targetRightForeArmPitch = Math.sin(a.t * 12) * 0.35 - 0.6; // Gentler wave
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
    a.rightArmRoll = damp(a.rightArmRoll, targetRightArmRoll, 8, dt); // Faster damp for wave
    a.rightForeArmPitch = damp(a.rightForeArmPitch, targetRightForeArmPitch, 8, dt);

    const head = resolveBone(nodes, scene, 'Head');
    const spine = resolveBone(nodes, scene, 'Spine', 'Spine1');
    const rightArm = resolveBone(nodes, scene, 'RightArm');
    const rightForeArm = resolveBone(nodes, scene, 'RightForeArm');

    const leftArm = resolveBone(nodes, scene, 'LeftArm');
    const leftForeArm = resolveBone(nodes, scene, 'LeftForeArm');
    const rightShoulder = resolveBone(nodes, scene, 'RightShoulder');
    const leftShoulder = resolveBone(nodes, scene, 'LeftShoulder');

    if (head) {
      head.rotation.x = a.headPitch;
      head.rotation.y = a.headYaw;
      head.rotation.z = a.headRoll;
    }
    if (spine) spine.rotation.x = a.spinePitch;
    if (rightArm) rightArm.rotation.z = a.rightArmRoll;
    if (rightForeArm) rightForeArm.rotation.x = a.rightForeArmPitch;
    
    // Default resting pose for left arm
    if (leftArm) leftArm.rotation.z = -1.2; // Mirrored from right arm (assuming local axes)
    if (leftForeArm) leftForeArm.rotation.x = 0.1;
    
    // Slump shoulders slightly for a relaxed look
    if (rightShoulder) rightShoulder.rotation.z = 0.2;
    if (leftShoulder) leftShoulder.rotation.z = -0.2;

    // Camera control based on phase
    if (phase === 'WAKING') {
      state.camera.position.lerp(new THREE.Vector3(0, 0, 1.5), dt * 2); // Close up on face
    } else if (phase === 'GREETING') {
      state.camera.position.lerp(new THREE.Vector3(0, 0.2, 2.8), dt * 2); // Pull back enough to fit wave
    } else {
      state.camera.position.lerp(new THREE.Vector3(0, -0.2, 3.5), dt * 2); // Full body for corner
    }
    state.camera.lookAt(0, -0.3, 0);
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
      const res = await apiClient.askAssistant({ message: userMsg });
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

export default function RobotAssistant({ onIntroComplete, skipIntro, portalData }) {
  const [phase, setPhase] = useState(skipIntro ? 'IDLE' : 'WAKING'); // WAKING -> GREETING -> RESIZING -> IDLE
  const [chatOpen, setChatOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const hasSpoken = useRef(skipIntro);

  // Auto transition from WAKING to GREETING
  useEffect(() => {
    if (phase === 'WAKING') {
      const timer = setTimeout(() => setPhase('GREETING'), 1200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'RESIZING') {
      setTimeout(() => {
        setPhase('IDLE');
        if (onIntroComplete) onIntroComplete();
      }, 1500); // 1.5s for canvas to resize
    }
  }, [phase, onIntroComplete]);

  // Click handler for 3D model (Only opens chat now)
  const handleCanvasClick = () => {
    if (phase === 'IDLE') {
      setChatOpen(true);
    }
  };

  const isFullscreen = phase === 'WAKING' || phase === 'GREETING' || phase === 'RESIZING';

  return (
    <>
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
      >
        {/* Dynamic Background Effect */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-slate-950 via-red-950/20 to-slate-950"
            >
              <LightweightStars />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444415_1px,transparent_1px),linear-gradient(to_bottom,#ef444415_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-600/10 blur-[100px] rounded-full"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Canvas camera={{ position: [0, 0, 1.2], fov: 35 }}>
          <ambientLight intensity={0.8} color="#ffffff" />
          <pointLight position={[0, 2, -2]} intensity={8} color="#ff0000" distance={10} />
          <directionalLight position={[2, 5, 2]} intensity={1.5} color="#ffd5d5" castShadow />
          <Environment preset="city" />
          <RobotRig phase={phase} speak={setPhase} hasSpoken={hasSpoken} setCaption={setCaption} portalData={portalData} />
          <ContactShadows position={[0, -1.8, 0]} opacity={0.6} color="#ff0000" scale={5} blur={2} far={2.5} />
        </Canvas>

        {/* Caption Overlay */}
        <AnimatePresence>
          {caption && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 px-10 py-5 bg-black/30 backdrop-blur-2xl border border-red-500/30 rounded-3xl shadow-[0_0_40px_rgba(220,38,38,0.2)]"
            >
              <p className="text-white text-2xl font-light tracking-wide text-center drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                {caption}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {chatOpen && <ChatbotUI onClose={() => setChatOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
