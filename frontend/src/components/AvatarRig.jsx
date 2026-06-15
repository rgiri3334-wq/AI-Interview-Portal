import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AVATAR_STATES } from '../hooks/useAvatarState';

// Utility for smooth interpolation with dampening
const damp = (current, target, factor, dt) => {
  return THREE.MathUtils.damp(current, target, factor, dt);
};

export default function AvatarRig({ avatarState = AVATAR_STATES.IDLE, mouthOpenRef }) {
  // Load the GLB model from the local public folder
  useGLTF.preload('/interviewer.glb');
  const { nodes, materials, scene } = useGLTF('/interviewer.glb', true, true, (error) => {
    console.error("Failed to load /interviewer.glb.", error);
  });

  const groupRef = useRef();

  // Advanced Animation State
  const anim = useRef({
    t: 0,
    headPitch: 0, headYaw: 0, headRoll: 0,
    spinePitch: 0, spineYaw: 0,
    rightArmRoll: 1.2, rightForeArmPitch: 0, rightArmYaw: 0,
    leftArmRoll: 1.2, leftForeArmPitch: 0, leftArmYaw: 0,
    
    // Timers & Phases
    blinkTimer: 0, isBlinking: false,
    saccadeTimer: 0, eyeTargetX: 0, eyeTargetY: 0,
    gestureTimer: 0, activeGesture: 0,
    
    // Perlin noise offsets
    noiseX: Math.random() * 100,
    noiseY: Math.random() * 100
  });

  const avatarStateRef = useRef(avatarState);
  useEffect(() => { avatarStateRef.current = avatarState; }, [avatarState]);

  useFrame((state, delta) => {
    if (!nodes) return;
    
    // Cap delta to prevent large jumps on lag
    const dt = Math.min(delta, 0.05);
    const a = anim.current;
    const cur = avatarStateRef.current;
    a.t += dt;

    // 1. Life-like Breathing (Slightly asymmetric)
    const breath = Math.sin(a.t * 1.5) * 0.015 + Math.sin(a.t * 0.8) * 0.005;
    
    // 2. Micro-Saccades (Eyes darting)
    a.saccadeTimer -= dt;
    if (a.saccadeTimer <= 0) {
      a.saccadeTimer = 0.5 + Math.random() * 2.0; // Dart every 0.5 - 2.5s
      a.eyeTargetX = (Math.random() - 0.5) * 0.15;
      a.eyeTargetY = (Math.random() - 0.5) * 0.1;
    }

    // 3. Blinking (Average 15-20 blinks per minute)
    a.blinkTimer -= dt;
    if (a.blinkTimer <= 0) {
      a.isBlinking = true;
      a.blinkTimer = 2.0 + Math.random() * 4.0; // Next blink in 2-6 seconds
      setTimeout(() => { a.isBlinking = false; }, 150); // Blink duration
    }

    // Default Targets
    let targetHeadPitch = 0;
    let targetHeadYaw = a.eyeTargetX * 0.5; // Head slightly follows eyes
    let targetHeadRoll = 0;
    let targetSpinePitch = breath;
    let targetSpineYaw = 0;
    
    // Idle hand targets
    let targetRightArmRoll = 1.2 + Math.sin(a.t * 0.5) * 0.02; 
    let targetRightForeArmPitch = 0.1;
    let targetLeftArmRoll = 1.2 + Math.cos(a.t * 0.6) * 0.02;
    let targetLeftForeArmPitch = 0.1;

    // Behavior Matrix based on State
    if (cur === AVATAR_STATES.SPEAKING) {
      // Dynamic Speaking Head Movement
      targetHeadPitch = Math.sin(a.t * 3.0) * 0.04 + 0.02;
      targetHeadYaw += Math.sin(a.t * 1.5) * 0.05;
      targetSpinePitch += 0.03; // Leaning in slightly while talking
      
      // Dynamic Hand Gestures
      a.gestureTimer -= dt;
      if (a.gestureTimer <= 0) {
        a.gestureTimer = 1.0 + Math.random() * 2.0;
        a.activeGesture = Math.floor(Math.random() * 3); // Pick a random gesture
      }

      if (a.activeGesture === 0) {
        // Explaining gesture (both hands)
        targetRightArmRoll = 0.8; targetRightForeArmPitch = -0.6 + Math.sin(a.t * 4) * 0.1;
        targetLeftArmRoll = 0.8; targetLeftForeArmPitch = -0.6 + Math.cos(a.t * 4) * 0.1;
      } else if (a.activeGesture === 1) {
        // One hand emphasized
        targetRightArmRoll = 0.6; targetRightForeArmPitch = -0.8 + Math.sin(a.t * 5) * 0.15;
        targetLeftArmRoll = 1.1; targetLeftForeArmPitch = -0.1;
      } else {
        // Relaxed speaking
        targetRightArmRoll = 1.0; targetRightForeArmPitch = -0.2;
        targetLeftArmRoll = 1.0; targetLeftForeArmPitch = -0.2;
      }
      
    } else if (cur === AVATAR_STATES.LISTENING) {
      // Active Listening
      targetHeadPitch = 0.08 + Math.sin(a.t * 2) * 0.02; // Nodding occasionally
      targetHeadRoll = 0.05; // Empathetic head tilt
      targetSpinePitch = 0.06 + breath; // Leaning forward with interest
      
    } else if (cur === AVATAR_STATES.THINKING) {
      // Processing / Thinking
      targetHeadPitch = -0.15; // Looking up
      targetHeadYaw = 0.2; // Looking away
      targetHeadRoll = -0.05;
      a.eyeTargetX = 0.3; // Eyes dart hard to the side
      a.eyeTargetY = 0.2;
      
      // Chin stroke gesture
      targetRightArmRoll = 0.4; 
      targetRightForeArmPitch = -1.5;
    }

    // Apply Smoothing (Dampening)
    a.headPitch = damp(a.headPitch, targetHeadPitch, 4, dt);
    a.headYaw = damp(a.headYaw, targetHeadYaw, 3, dt);
    a.headRoll = damp(a.headRoll, targetHeadRoll, 3, dt);
    
    a.spinePitch = damp(a.spinePitch, targetSpinePitch, 2, dt);
    a.spineYaw = damp(a.spineYaw, targetSpineYaw, 2, dt);
    
    a.rightArmRoll = damp(a.rightArmRoll, targetRightArmRoll, 5, dt);
    a.rightForeArmPitch = damp(a.rightForeArmPitch, targetRightForeArmPitch, 5, dt);
    a.leftArmRoll = damp(a.leftArmRoll, targetLeftArmRoll, 5, dt);
    a.leftForeArmPitch = damp(a.leftForeArmPitch, targetLeftForeArmPitch, 5, dt);

    // Apply to Bones (Fallback to Mixamo standard if RPM bones missing)
    const head = nodes.Head || nodes.mixamorigHead;
    const neck = nodes.Neck || nodes.mixamorigNeck;
    const spine = nodes.Spine || nodes.Spine1 || nodes.mixamorigSpine;
    
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
      neck.rotation.x = a.headPitch * 0.5;
      neck.rotation.y = a.headYaw * 0.5;
    }

    if (spine) {
      spine.rotation.x = a.spinePitch;
      spine.rotation.y = a.spineYaw;
    }
    
    if (rightArm) rightArm.rotation.z = a.rightArmRoll;
    if (rightForeArm) rightForeArm.rotation.x = a.rightForeArmPitch;
    if (leftArm) leftArm.rotation.z = -a.leftArmRoll;
    if (leftForeArm) leftForeArm.rotation.x = a.leftForeArmPitch;

    // Apply to Eyes if available
    const rightEye = nodes.RightEye || nodes.mixamorigRightEye;
    const leftEye = nodes.LeftEye || nodes.mixamorigLeftEye;
    if (rightEye) {
      rightEye.rotation.x = damp(rightEye.rotation.x, a.eyeTargetY, 10, dt);
      rightEye.rotation.y = damp(rightEye.rotation.y, a.eyeTargetX, 10, dt);
    }
    if (leftEye) {
      leftEye.rotation.x = damp(leftEye.rotation.x, a.eyeTargetY, 10, dt);
      leftEye.rotation.y = damp(leftEye.rotation.y, a.eyeTargetX, 10, dt);
    }

    // 4. Lip Sync & Facial Expressions (Blendshapes)
    if (scene) {
      const openAmount = mouthOpenRef?.current ?? 0;
      
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
          const dict = child.morphTargetDictionary;
          const inf = child.morphTargetInfluences;
          
          // Lip sync mappings (RPM / ARKit / Oculus standard visemes)
          if (dict.viseme_O !== undefined) inf[dict.viseme_O] = openAmount * 0.8;
          if (dict.viseme_aa !== undefined) inf[dict.viseme_aa] = openAmount * 0.6;
          if (dict.mouthOpen !== undefined) inf[dict.mouthOpen] = openAmount * 0.6;
          if (dict.jawOpen !== undefined) inf[dict.jawOpen] = openAmount * 0.5;

          // Blinking
          const blinkVal = a.isBlinking ? 1.0 : 0.0;
          if (dict.eyeBlinkLeft !== undefined) inf[dict.eyeBlinkLeft] = damp(inf[dict.eyeBlinkLeft] || 0, blinkVal, 25, dt);
          if (dict.eyeBlinkRight !== undefined) inf[dict.eyeBlinkRight] = damp(inf[dict.eyeBlinkRight] || 0, blinkVal, 25, dt);
          if (dict.blink !== undefined) inf[dict.blink] = damp(inf[dict.blink] || 0, blinkVal, 25, dt);

          // Expressions based on state
          const smileTarget = cur === AVATAR_STATES.IDLE ? 0.3 : (cur === AVATAR_STATES.LISTENING ? 0.2 : 0);
          if (dict.mouthSmile !== undefined) inf[dict.mouthSmile] = damp(inf[dict.mouthSmile] || 0, smileTarget, 5, dt);
          if (dict.mouthSmileLeft !== undefined) inf[dict.mouthSmileLeft] = damp(inf[dict.mouthSmileLeft] || 0, smileTarget, 5, dt);
          if (dict.mouthSmileRight !== undefined) inf[dict.mouthSmileRight] = damp(inf[dict.mouthSmileRight] || 0, smileTarget, 5, dt);
          
          const browInnerUpTarget = cur === AVATAR_STATES.LISTENING ? 0.4 : (cur === AVATAR_STATES.THINKING ? 0.6 : 0);
          if (dict.browInnerUp !== undefined) inf[dict.browInnerUp] = damp(inf[dict.browInnerUp] || 0, browInnerUpTarget, 5, dt);
        }
      });
    }
  });

  return (
    <group ref={groupRef} dispose={null} position={[0, -1.6, 0]} scale={1.2}>
      <primitive object={scene} />
    </group>
  );
}
