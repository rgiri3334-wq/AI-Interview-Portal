import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

const AVATAR_STATES = {
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  THINKING: 'thinking',
  IDLE: 'idle'
};

const lerpToward = (current, target, factor) => {
  return current + (target - current) * factor;
};

export default function AvatarRig({ avatarState, mouthOpenRef }) {
  useGLTF.preload('/model_opt.glb');
  const { nodes, scene } = useGLTF('/model_opt.glb');
  const groupRef = useRef();

  const anim = useRef({
    t: 0,
    headPitch: 0, headYaw: 0, headRoll: 0,
    breathPhase: 0,
    speakBobPhase: 0,
    swayPhase: 0,
    lookPhaseX: 0, lookPhaseY: 0,
  });

  const avatarStateRef = useRef(avatarState);
  useEffect(() => { avatarStateRef.current = avatarState; }, [avatarState]);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
        }
      });
    }
  }, [scene]);

  useFrame((state, delta) => {
    if (!nodes || !scene) return;
    
    // Clamp delta to prevent massive jumps on lag spikes
    const dt = Math.min(delta, 0.05);
    const a = anim.current;
    
    // Convert avatarState object props into a string enum if passed as object
    let cur = AVATAR_STATES.IDLE;
    if (avatarStateRef.current) {
      if (avatarStateRef.current.isSpeaking) cur = AVATAR_STATES.SPEAKING;
      else if (avatarStateRef.current.isLoading) cur = AVATAR_STATES.THINKING;
      else if (avatarStateRef.current.isListening) cur = AVATAR_STATES.LISTENING;
    }
    
    a.t += dt;

    // 1. Core Life Systems (Breathing & Micro-sway)
    a.breathPhase += dt * 1.8; // Relaxed breathing
    const breath = Math.sin(a.breathPhase) * 0.015;
    
    a.swayPhase += dt * 0.4;
    const swayX = Math.sin(a.swayPhase) * 0.03;
    const swayY = Math.cos(a.swayPhase * 0.8) * 0.02;

    // Default Targets (Idle Posture)
    let targetHeadPitch = breath;
    let targetHeadYaw = swayX;
    let targetHeadRoll = swayY;

    // 2. Behavioral State Machine
    if (cur === AVATAR_STATES.SPEAKING) {
      a.speakBobPhase += dt * 4.0;
      targetHeadPitch = Math.sin(a.speakBobPhase) * 0.02 + 0.05; // Nodding while speaking
    } else if (cur === AVATAR_STATES.LISTENING) {
      targetHeadPitch = 0.1 + Math.sin(a.t * 2) * 0.02; // Nodding slowly
      targetHeadYaw = 0.08; // Head tilt
    } else if (cur === AVATAR_STATES.THINKING) {
      a.lookPhaseX += dt * 1.5;
      a.lookPhaseY += dt * 2.0;
      targetHeadPitch = -0.15 + Math.sin(a.lookPhaseY) * 0.05; // Looking up
      targetHeadYaw = 0.2 + Math.cos(a.lookPhaseX) * 0.1; // Looking around
    }

    // 3. Smooth Interpolation
    a.headPitch = lerpToward(a.headPitch, targetHeadPitch, dt * 5);
    a.headYaw = lerpToward(a.headYaw, targetHeadYaw, dt * 5);
    a.headRoll = lerpToward(a.headRoll, targetHeadRoll, dt * 5);

    // 4. Apply Rotations to standard Mixamo / ReadyPlayerMe bone hierarchy
    const head = nodes.Head || nodes.mixamorigHead;
    const neck = nodes.Neck || nodes.mixamorigNeck;

    if (head) {
      head.rotation.x = a.headPitch;
      head.rotation.y = a.headYaw;
      head.rotation.z = a.headRoll;
    }
    if (neck) {
      neck.rotation.x = a.headPitch * 0.5;
    }

    // 5. Procedural Lip Sync
    if (mouthOpenRef && scene) {
      const openAmount = mouthOpenRef.current ?? 0;
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
          const dict = child.morphTargetDictionary;
          const influences = child.morphTargetInfluences;
          
          if (dict.viseme_O !== undefined) influences[dict.viseme_O] = openAmount * 0.8;
          if (dict.viseme_aa !== undefined) influences[dict.viseme_aa] = openAmount * 0.6;
          if (dict.mouthOpen !== undefined) influences[dict.mouthOpen] = openAmount * 0.5;
          if (dict.jawOpen !== undefined) influences[dict.jawOpen] = openAmount * 0.4;
        }
      });
    }
  });

  return (
    // Scaled down to 0.85 and moved down to frame the head and shoulders perfectly
    <group ref={groupRef} dispose={null} position={[0, -1.45, 0]} scale={0.85}>
      <primitive object={scene} />
    </group>
  );
}
