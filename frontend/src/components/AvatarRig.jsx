import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AVATAR_STATES } from '../hooks/useAvatarState';

// Utility for smooth interpolation
const lerpToward = (current, target, alpha) => current + (target - current) * alpha;

// Load the GLB model from the local public folder to bypass the network blocks
useGLTF.preload('/avatar.glb');

export default function AvatarRig({ avatarState = AVATAR_STATES.IDLE, mouthOpenRef }) {
  const { nodes, materials, scene } = useGLTF('/avatar.glb', true, true, (error) => {
    console.error("Failed to load /avatar.glb. Ensure the file is in the public folder.", error);
  });

  const groupRef = useRef();

  // Animation state
  const anim = useRef({
    t: 0,
    headPitch: 0, headYaw: 0, headRoll: 0,
    spinePitch: 0,
    rightArmRoll: 0, rightForeArmPitch: 0,
    leftArmRoll: 0, leftForeArmPitch: 0,
    breathPhase: 0,
    speakBobPhase: 0,
    swayPhase: 0,
    gesturePhase: 0,
  });

  const avatarStateRef = useRef(avatarState);
  useEffect(() => { avatarStateRef.current = avatarState; }, [avatarState]);

  useFrame((state, delta) => {
    if (!nodes) return;
    
    const dt = Math.min(delta, 0.05);
    const a = anim.current;
    const cur = avatarStateRef.current;
    a.t += dt;

    // 1. Breathing
    a.breathPhase += dt * 2.0;
    const breath = Math.sin(a.breathPhase) * 0.02;

    // 2. Idle Sway
    a.swayPhase += dt * 0.5;
    const sway = Math.sin(a.swayPhase) * 0.05;

    // 3. Speaking / Gesturing logic
    let targetHeadPitch = 0;
    let targetHeadYaw = sway;
    let targetSpinePitch = breath;
    
    // Hand gestures targets
    let targetRightArmRoll = 1.1; // idle arm down
    let targetRightForeArmPitch = 0.1;
    let targetLeftArmRoll = 1.1; // idle arm down
    let targetLeftForeArmPitch = 0.1;

    if (cur === AVATAR_STATES.SPEAKING) {
      a.speakBobPhase += dt * 5.0;
      targetHeadPitch = Math.sin(a.speakBobPhase) * 0.03;
      
      a.gesturePhase += dt * 3.0;
      // Animate hands moving up and down while speaking
      targetRightArmRoll = 1.3 + Math.sin(a.gesturePhase) * 0.2;
      targetRightForeArmPitch = -0.5 + Math.cos(a.gesturePhase) * 0.3;
      
      targetLeftArmRoll = 1.3 + Math.cos(a.gesturePhase * 0.8) * 0.2;
      targetLeftForeArmPitch = -0.4 + Math.sin(a.gesturePhase * 0.8) * 0.3;
      
      targetSpinePitch += 0.05; // Lean in slightly
    } else if (cur === AVATAR_STATES.LISTENING) {
      targetHeadPitch = 0.05; // Nod slightly
      targetHeadYaw = 0.05; // Tilt head
      targetSpinePitch = 0.08; // Lean in to listen
    } else if (cur === AVATAR_STATES.THINKING) {
      targetHeadPitch = -0.1; // Look up
      targetHeadYaw = 0.15;
    }

    // Smoothly apply bone rotations
    a.headPitch = lerpToward(a.headPitch, targetHeadPitch, dt * 3);
    a.headYaw = lerpToward(a.headYaw, targetHeadYaw, dt * 3);
    a.spinePitch = lerpToward(a.spinePitch, targetSpinePitch, dt * 3);
    
    a.rightArmRoll = lerpToward(a.rightArmRoll, targetRightArmRoll, dt * 4);
    a.rightForeArmPitch = lerpToward(a.rightForeArmPitch, targetRightForeArmPitch, dt * 4);
    a.leftArmRoll = lerpToward(a.leftArmRoll, targetLeftArmRoll, dt * 4);
    a.leftForeArmPitch = lerpToward(a.leftForeArmPitch, targetLeftForeArmPitch, dt * 4);

    const head = nodes.Head || nodes.mixamorigHead;
    const spine = nodes.Spine || nodes.mixamorigSpine;
    const rightArm = nodes.RightArm || nodes.mixamorigRightArm;
    const rightForeArm = nodes.RightForeArm || nodes.mixamorigRightForeArm;
    const leftArm = nodes.LeftArm || nodes.mixamorigLeftArm;
    const leftForeArm = nodes.LeftForeArm || nodes.mixamorigLeftForeArm;

    if (head) {
      head.rotation.x = a.headPitch;
      head.rotation.y = a.headYaw;
    }
    if (spine) spine.rotation.x = a.spinePitch;
    
    // Standard Mixamo/ReadyPlayerMe arm bones
    if (rightArm) rightArm.rotation.z = a.rightArmRoll;
    if (rightForeArm) rightForeArm.rotation.x = a.rightForeArmPitch;
    if (leftArm) leftArm.rotation.z = -a.leftArmRoll;
    if (leftForeArm) leftForeArm.rotation.x = a.leftForeArmPitch;

    // 4. Lip Sync (Morph Targets)
    if (mouthOpenRef && scene) {
      const openAmount = mouthOpenRef.current ?? 0;
      
      // Traverse to find the face mesh with morph targets
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
          const dict = child.morphTargetDictionary;
          const influences = child.morphTargetInfluences;
          
          // Map audio volume to visemes (O, aa, mouthOpen)
          if (dict.viseme_O !== undefined) influences[dict.viseme_O] = openAmount * 0.8;
          if (dict.viseme_aa !== undefined) influences[dict.viseme_aa] = openAmount * 0.6;
          if (dict.mouthOpen !== undefined) influences[dict.mouthOpen] = openAmount * 0.5;
        }
      });
    }
  });

  return (
    <group ref={groupRef} dispose={null} position={[0, -1.5, 0]} scale={1}>
      <primitive object={scene} />
    </group>
  );
}
