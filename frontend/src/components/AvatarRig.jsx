import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';

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
  const { nodes, scene, animations } = useGLTF('/avatar.glb');
  const groupRef = useRef();
  const { actions, names } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (names && names.length > 0) {
      // Play the first animation (usually idle)
      actions[names[0]]?.reset().fadeIn(0.5).play();
    }
  }, [actions, names]);

  const anim = useRef({
    t: 0,
    headPitch: 0, headYaw: 0, headRoll: 0,
    spinePitch: 0, spineYaw: 0, spineRoll: 0,
    rightArmRoll: 0, rightArmPitch: 0, rightForeArmPitch: 0,
    leftArmRoll: 0, leftArmPitch: 0, leftForeArmPitch: 0,
    breathPhase: 0,
    speakBobPhase: 0,
    swayPhase: 0,
    gesturePhase: 0,
    lookPhaseX: 0, lookPhaseY: 0,
    blinkTimer: Math.random() * 3 + 1,
    blinkPhase: 0, // 0 = open, 1 = fully closed
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
    const breath = Math.sin(a.breathPhase) * 0.02; // Deeper breath
    
    a.swayPhase += dt * 0.4;
    const swayX = Math.sin(a.swayPhase) * 0.03;
    const swayY = Math.cos(a.swayPhase * 0.8) * 0.02;

    // Default Targets (Idle Posture)
    let targetHeadPitch = breath;
    let targetHeadYaw = swayX;
    let targetHeadRoll = swayY;
    let targetSpinePitch = breath * 0.5;
    let targetSpineYaw = swayX * 0.5;
    let targetSpineRoll = swayY * 0.5;

    // Idle hands resting near waist/hips
    let targetRightArmRoll = 1.2;
    let targetRightArmPitch = 0.1;
    let targetRightForeArmPitch = 0.2;
    let targetLeftArmRoll = -1.2; // Note the sign difference for left arm
    let targetLeftArmPitch = 0.1;
    let targetLeftForeArmPitch = 0.2;

    // 2. Behavioral State Machine
    if (cur === AVATAR_STATES.SPEAKING) {
      a.speakBobPhase += dt * 4.0;
      targetHeadPitch = Math.sin(a.speakBobPhase) * 0.02 + 0.05; // Nodding while speaking
      
      // Expressive Hand Gestures!
      a.gesturePhase += dt * 3.5;
      
      // Lean forward slightly when talking
      targetSpinePitch += 0.05;
      
      // Right hand gestures (large sweeps)
      targetRightArmRoll = 1.0 + Math.sin(a.gesturePhase) * 0.4;
      targetRightArmPitch = -0.3 + Math.cos(a.gesturePhase * 0.5) * 0.2;
      targetRightForeArmPitch = -0.6 + Math.cos(a.gesturePhase) * 0.4;
      
      // Left hand gestures (offset phase for natural asymmetry)
      targetLeftArmRoll = -(1.0 + Math.cos(a.gesturePhase * 0.8) * 0.4);
      targetLeftArmPitch = -0.3 + Math.sin(a.gesturePhase * 0.6) * 0.2;
      targetLeftForeArmPitch = -0.5 + Math.sin(a.gesturePhase * 0.8) * 0.4;
      
    } else if (cur === AVATAR_STATES.LISTENING) {
      targetHeadPitch = 0.1 + Math.sin(a.t * 2) * 0.02; // Nodding slowly
      targetHeadYaw = 0.08; // Head tilt
      
      // Lean in slightly
      targetSpinePitch = 0.1;
      
      // Cross arms loosely or rest them on lap
      targetRightArmRoll = 0.8;
      targetRightArmPitch = -0.2;
      targetRightForeArmPitch = -1.0;
      
      targetLeftArmRoll = -0.8;
      targetLeftArmPitch = -0.2;
      targetLeftForeArmPitch = -1.0;
      
    } else if (cur === AVATAR_STATES.THINKING) {
      a.lookPhaseX += dt * 1.5;
      a.lookPhaseY += dt * 2.0;
      targetHeadPitch = -0.15 + Math.sin(a.lookPhaseY) * 0.05; // Looking up
      targetHeadYaw = 0.2 + Math.cos(a.lookPhaseX) * 0.1; // Looking around
      
      // Posture pulls back slightly
      targetSpinePitch = -0.05;
      targetSpineYaw = 0.1; // Slight twist
      
      // One hand up towards chin (Right hand)
      targetRightArmRoll = 0.5;
      targetRightArmPitch = -0.8;
      targetRightForeArmPitch = -1.5;
      
      // Other hand relaxed
      targetLeftArmRoll = -1.2;
      targetLeftArmPitch = 0.1;
      targetLeftForeArmPitch = 0.2;
    }

    // 3. Smooth Interpolation
    a.headPitch = lerpToward(a.headPitch, targetHeadPitch, dt * 5);
    a.headYaw = lerpToward(a.headYaw, targetHeadYaw, dt * 5);
    a.headRoll = lerpToward(a.headRoll, targetHeadRoll, dt * 5);
    
    a.spinePitch = lerpToward(a.spinePitch, targetSpinePitch, dt * 4);
    a.spineYaw = lerpToward(a.spineYaw, targetSpineYaw, dt * 4);
    a.spineRoll = lerpToward(a.spineRoll, targetSpineRoll, dt * 4);

    a.rightArmRoll = lerpToward(a.rightArmRoll, targetRightArmRoll, dt * 6);
    a.rightArmPitch = lerpToward(a.rightArmPitch, targetRightArmPitch, dt * 6);
    a.rightForeArmPitch = lerpToward(a.rightForeArmPitch, targetRightForeArmPitch, dt * 6);
    
    a.leftArmRoll = lerpToward(a.leftArmRoll, targetLeftArmRoll, dt * 6);
    a.leftArmPitch = lerpToward(a.leftArmPitch, targetLeftArmPitch, dt * 6);
    a.leftForeArmPitch = lerpToward(a.leftForeArmPitch, targetLeftForeArmPitch, dt * 6);

    // 4. Apply Rotations to standard Mixamo / ReadyPlayerMe bone hierarchy
    const head = nodes.Head || nodes.mixamorigHead;
    const neck = nodes.Neck || nodes.mixamorigNeck;
    const spine = nodes.Spine || nodes.Spine1 || nodes.mixamorigSpine;
    
    const leftArm = nodes.LeftArm || nodes.mixamorigLeftArm;
    const rightArm = nodes.RightArm || nodes.mixamorigRightArm;
    const leftForeArm = nodes.LeftForeArm || nodes.mixamorigLeftForeArm;
    const rightForeArm = nodes.RightForeArm || nodes.mixamorigRightForeArm;

    if (head) {
      head.rotation.x = a.headPitch;
      head.rotation.y = a.headYaw;
      head.rotation.z = a.headRoll;
    }
    if (neck) {
      neck.rotation.x = a.headPitch * 0.5;
    }
    if (spine) {
      spine.rotation.x = a.spinePitch;
      spine.rotation.y = a.spineYaw;
      spine.rotation.z = a.spineRoll;
    }

    if (leftArm) { 
      leftArm.rotation.z = a.leftArmRoll; 
      leftArm.rotation.x = a.leftArmPitch; 
    }
    if (rightArm) { 
      rightArm.rotation.z = a.rightArmRoll; 
      rightArm.rotation.x = a.rightArmPitch; 
    }
    if (leftForeArm) leftForeArm.rotation.x = a.leftForeArmPitch;
    if (rightForeArm) rightForeArm.rotation.x = a.rightForeArmPitch;

    // 5. Procedural Eye Blinks
    a.blinkTimer -= dt;
    if (a.blinkTimer <= 0) {
      // Start a blink (fast close, slightly slower open)
      a.blinkPhase += dt * 10.0;
      if (a.blinkPhase >= Math.PI) {
        a.blinkPhase = 0;
        a.blinkTimer = 2.0 + Math.random() * 4.0; // Next blink in 2-6 seconds
      }
    }
    const blinkAmount = a.blinkPhase > 0 ? Math.max(0, Math.sin(a.blinkPhase)) : 0;

    // 6. Apply Morph Targets (Lip Sync & Blinking)
    if (scene) {
      const openAmount = (mouthOpenRef && mouthOpenRef.current) ? mouthOpenRef.current : 0;
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
          const dict = child.morphTargetDictionary;
          const influences = child.morphTargetInfluences;
          
          // Lip Sync
          if (dict.viseme_O !== undefined) influences[dict.viseme_O] = openAmount * 0.8;
          if (dict.viseme_aa !== undefined) influences[dict.viseme_aa] = openAmount * 0.6;
          if (dict.mouthOpen !== undefined) influences[dict.mouthOpen] = openAmount * 0.5;
          if (dict.jawOpen !== undefined) influences[dict.jawOpen] = openAmount * 0.4;

          // Eye Blinks (Support standard Mixamo/RPM morph names)
          if (dict.eyeBlinkLeft !== undefined) influences[dict.eyeBlinkLeft] = blinkAmount;
          if (dict.eyeBlinkRight !== undefined) influences[dict.eyeBlinkRight] = blinkAmount;
          if (dict.eyeBlink_L !== undefined) influences[dict.eyeBlink_L] = blinkAmount;
          if (dict.eyeBlink_R !== undefined) influences[dict.eyeBlink_R] = blinkAmount;
          if (dict.eyesClosed !== undefined) influences[dict.eyesClosed] = blinkAmount;
          if (dict.blink !== undefined) influences[dict.blink] = blinkAmount;
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
