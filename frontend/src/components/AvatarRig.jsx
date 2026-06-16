import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AVATAR_STATES } from '../hooks/useAvatarState';

// Utility for smooth interpolation
const lerpToward = (current, target, alpha) => current + (target - current) * alpha;

export default function AvatarRig({ avatarState = AVATAR_STATES.IDLE, mouthOpenRef }) {
  // Preload and load the avatar from the public folder.
  useGLTF.preload('/avatar.glb');
  const { nodes, scene } = useGLTF('/avatar.glb', true, true, (error) => {
    console.warn("Could not load /avatar.glb. Ensure the file is placed in the frontend/public/ folder.");
  });

  const groupRef = useRef();

  // Complex Animation state variables
  const anim = useRef({
    t: 0,
    headPitch: 0, headYaw: 0, headRoll: 0,
    spinePitch: 0, spineRoll: 0, spineYaw: 0,
    rightArmRoll: 0, rightForeArmPitch: 0, rightArmYaw: 0,
    leftArmRoll: 0, leftForeArmPitch: 0, leftArmYaw: 0,
    breathPhase: 0,
    speakBobPhase: 0,
    swayPhase: 0,
    gesturePhase: 0,
    lookPhaseX: 0, lookPhaseY: 0,
    pacingOffset: 0, pacingPhase: 0,
    currentGesture: 0, // 0 = rest, 1 = sweep, 2 = chop, 3 = think
    gestureTimer: 0,
  });

  const avatarStateRef = useRef(avatarState);
  useEffect(() => { avatarStateRef.current = avatarState; }, [avatarState]);

  useFrame((state, delta) => {
    if (!nodes) return;
    
    // Clamp delta to prevent massive jumps on lag spikes (crucial for low-end GPUs)
    const dt = Math.min(delta, 0.05);
    const a = anim.current;
    const cur = avatarStateRef.current;
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
    
    let targetSpinePitch = breath * 1.5;
    let targetSpineYaw = swayX * 0.5;
    
    // Default arms (relaxed down at sides)
    let targetRightArmRoll = 1.15; 
    let targetRightArmYaw = 0.1;
    let targetRightForeArmPitch = 0.1;
    
    let targetLeftArmRoll = 1.15;
    let targetLeftArmYaw = -0.1;
    let targetLeftForeArmPitch = 0.1;
    
    let targetPacingOffset = 0;

    // 2. Behavioral State Machine
    if (cur === AVATAR_STATES.SPEAKING) {
      a.speakBobPhase += dt * 4.0;
      targetHeadPitch = Math.sin(a.speakBobPhase) * 0.02 + 0.05; // Nodding while speaking
      targetSpinePitch += 0.05; // Lean in to engage

      // Gesture Controller
      a.gestureTimer -= dt;
      if (a.gestureTimer <= 0) {
        // Pick a random gesture every 2-4 seconds
        a.currentGesture = Math.floor(Math.random() * 4);
        a.gestureTimer = 2.0 + Math.random() * 2.0;
        a.gesturePhase = 0; // Reset phase for new gesture
      }
      
      a.gesturePhase += dt * 3.5;
      
      // Procedural Gesture Logic
      if (a.currentGesture === 1) {
        // Italian sweep gesture
        targetRightArmRoll = 1.2 + Math.sin(a.gesturePhase) * 0.4;
        targetRightArmYaw = 0.3 + Math.cos(a.gesturePhase) * 0.3;
        targetRightForeArmPitch = -0.6 + Math.sin(a.gesturePhase) * 0.2;
      } else if (a.currentGesture === 2) {
        // Emphatic double chop
        targetRightArmRoll = 1.0 + Math.abs(Math.sin(a.gesturePhase)) * 0.3;
        targetRightForeArmPitch = -0.8;
        targetLeftArmRoll = 1.0 + Math.abs(Math.sin(a.gesturePhase)) * 0.3;
        targetLeftForeArmPitch = -0.8;
      } else if (a.currentGesture === 3) {
        // Explaining hands
        targetRightArmRoll = 1.3;
        targetRightForeArmPitch = -0.5 + Math.sin(a.gesturePhase) * 0.2;
        targetLeftArmRoll = 1.3;
        targetLeftForeArmPitch = -0.5 + Math.cos(a.gesturePhase) * 0.2;
      }

    } else if (cur === AVATAR_STATES.LISTENING) {
      // Active Listening Posture
      targetHeadPitch = 0.1 + Math.sin(a.t * 2) * 0.02; // Nodding slowly
      targetHeadYaw = 0.08; // Head tilt
      targetSpinePitch = 0.12; // Leaning in very close
      
      // Hands crossed or resting
      targetRightArmRoll = 0.8;
      targetRightForeArmPitch = -1.2;
      targetLeftArmRoll = 0.8;
      targetLeftForeArmPitch = -1.2;

    } else if (cur === AVATAR_STATES.THINKING) {
      // Pacing and looking away
      a.lookPhaseX += dt * 1.5;
      a.lookPhaseY += dt * 2.0;
      targetHeadPitch = -0.15 + Math.sin(a.lookPhaseY) * 0.05; // Looking up
      targetHeadYaw = 0.2 + Math.cos(a.lookPhaseX) * 0.1; // Looking around
      targetSpinePitch = -0.05; // Leaning back
      
      // Hand on chin pose (procedural approximation)
      targetRightArmRoll = 0.2;
      targetRightArmYaw = -0.5;
      targetRightForeArmPitch = -2.0;
      
      // Pacing translation
      a.pacingPhase += dt * 1.0;
      targetPacingOffset = Math.sin(a.pacingPhase) * 0.15; // Pace left and right slightly
    }

    // 3. Smooth Interpolation (Math-based physics)
    // The multiplier dictates how "snappy" the bones move. 
    a.headPitch = lerpToward(a.headPitch, targetHeadPitch, dt * 5);
    a.headYaw = lerpToward(a.headYaw, targetHeadYaw, dt * 5);
    a.headRoll = lerpToward(a.headRoll, targetHeadRoll, dt * 5);
    
    a.spinePitch = lerpToward(a.spinePitch, targetSpinePitch, dt * 3);
    a.spineYaw = lerpToward(a.spineYaw, targetSpineYaw, dt * 3);
    
    a.rightArmRoll = lerpToward(a.rightArmRoll, targetRightArmRoll, dt * 6);
    a.rightArmYaw = lerpToward(a.rightArmYaw, targetRightArmYaw, dt * 6);
    a.rightForeArmPitch = lerpToward(a.rightForeArmPitch, targetRightForeArmPitch, dt * 6);
    
    a.leftArmRoll = lerpToward(a.leftArmRoll, targetLeftArmRoll, dt * 6);
    a.leftArmYaw = lerpToward(a.leftArmYaw, targetLeftArmYaw, dt * 6);
    a.leftForeArmPitch = lerpToward(a.leftForeArmPitch, targetLeftForeArmPitch, dt * 6);
    
    a.pacingOffset = lerpToward(a.pacingOffset, targetPacingOffset, dt * 2);

    // 4. Apply Rotations to ReadyPlayerMe / Mixamo bone hierarchy
    const head = nodes.Head || nodes.mixamorigHead;
    const neck = nodes.Neck || nodes.mixamorigNeck;
    const spine = nodes.Spine || nodes.Spine2 || nodes.mixamorigSpine || nodes.mixamorigSpine2;
    
    const rightArm = nodes.RightArm || nodes.mixamorigRightArm;
    const rightForeArm = nodes.RightForeArm || nodes.mixamorigRightForeArm;
    const leftArm = nodes.LeftArm || nodes.mixamorigLeftArm;
    const leftForeArm = nodes.LeftForeArm || nodes.mixamorigLeftForeArm;

    if (head) {
      head.rotation.x = a.headPitch;
      head.rotation.y = a.headYaw;
      head.rotation.z = a.headRoll;
    }
    if (neck) {
      neck.rotation.x = a.headPitch * 0.5; // Distribute bend
    }
    if (spine) {
      spine.rotation.x = a.spinePitch;
      spine.rotation.y = a.spineYaw;
    }
    
    // Arms
    if (rightArm) {
      rightArm.rotation.z = a.rightArmRoll;
      rightArm.rotation.y = a.rightArmYaw;
    }
    if (rightForeArm) {
      rightForeArm.rotation.x = a.rightForeArmPitch;
    }
    
    if (leftArm) {
      leftArm.rotation.z = -a.leftArmRoll;
      leftArm.rotation.y = a.leftArmYaw;
    }
    if (leftForeArm) {
      leftForeArm.rotation.x = a.leftForeArmPitch;
    }

    // Apply Pacing translation to the group
    if (groupRef.current) {
      groupRef.current.position.x = a.pacingOffset;
    }

    // 5. Procedural Lip Sync (Morph Targets)
    if (mouthOpenRef && scene) {
      const openAmount = mouthOpenRef.current ?? 0;
      
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
          const dict = child.morphTargetDictionary;
          const influences = child.morphTargetInfluences;
          
          // Fast math for visemes
          if (dict.viseme_O !== undefined) influences[dict.viseme_O] = openAmount * 0.8;
          if (dict.viseme_aa !== undefined) influences[dict.viseme_aa] = openAmount * 0.6;
          if (dict.mouthOpen !== undefined) influences[dict.mouthOpen] = openAmount * 0.5;
          if (dict.jawOpen !== undefined) influences[dict.jawOpen] = openAmount * 0.4;
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
