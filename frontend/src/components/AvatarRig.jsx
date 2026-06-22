import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AVATAR_STATES } from '../hooks/useAvatarState';

// Utility for smooth interpolation with dampening
const damp = (current, target, factor, dt) => {
  return THREE.MathUtils.damp(current, target, factor, dt);
};

// ── Avatar model path ──────────────────────────────────────────────────────
// Custom Avaturn male model. Full-body humanoid (~1.9 units tall), RPM-style
// bone names (Head, Neck, Spine, RightArm, RightForeArm, RightHand, ...).
// NOTE: this model currently has NO facial blendshapes / jaw bone, so lip-sync
// cannot move the mouth. Re-export from Avaturn with visemes/ARKit blendshapes
// to light up the existing morph-based lip-sync automatically.
const AVATAR_MODEL_PATH = '/model.glb';

// ── Framing ────────────────────────────────────────────────────────────────
// How the model sits in the camera (camera is at z=3, fov=30). With this model
// (~1.9 units tall, feet at y≈0) these values frame roughly head→upper-torso.
// If the avatar sits too high/low or too big/small in the preview, adjust:
//   AVATAR_POSITION = [x, y, z]  (lower y = move avatar DOWN, shows more head)
//   AVATAR_SCALE     = number    (smaller = avatar appears further/smaller)
const AVATAR_POSITION = [0, -1.5, 0];
const AVATAR_SCALE = 1;

// Resolve a bone by trying several common naming conventions (plain, RPM,
// Mixamo with/without the "mixamorig:" colon prefix). Returns the first match.
function resolveBone(nodes, scene, ...candidates) {
  for (const name of candidates) {
    if (nodes && nodes[name]) return nodes[name];
  }
  // Fallback: scan the scene graph by exact name (handles colon-prefixed names
  // that aren't valid JS property keys on the nodes object).
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

export default function AvatarRig({ avatarState = AVATAR_STATES.IDLE, mouthOpenRef }) {
  const { nodes, materials, scene } = useGLTF(AVATAR_MODEL_PATH);

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

    // Greeting wave + goodbye (namaste) envelopes
    waveT: 0, wasGreeting: false,
    goodbyeT: 0, wasGoodbye: false,

    // Perlin noise offsets
    noiseX: Math.random() * 100,
    noiseY: Math.random() * 100,

    hasWaved: false
  });

  const avatarStateRef = useRef(avatarState);
  useEffect(() => { avatarStateRef.current = avatarState; }, [avatarState]);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
          // Fix THREE.js warnings for deprecated properties
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

    // ── Greeting wave envelope ────────────────────────────────────────────
    // Raises the right hand up near the head and oscillates side-to-side.
    // The wave triggers exactly ONCE when entering the GREETING state.
    const isGreeting = cur === AVATAR_STATES.GREETING;
    if (isGreeting && !a.wasGreeting && !a.hasWaved) {
      a.waveT = 0; // start wave
      a.hasWaved = true;
    }
    a.wasGreeting = isGreeting;
    let waveAmt = 0;
    if (a.hasWaved && a.waveT < 4.5) {
      a.waveT += dt;
      const WAVE_DURATION = 4.5;
      const tN = a.waveT / WAVE_DURATION;
      // ease-in over first 20%, hold, ease-out over last 15%
      if (tN < 0.2) waveAmt = tN / 0.2;
      else if (tN > 0.85) waveAmt = Math.max(0, 1 - (tN - 0.85) / 0.15);
      else waveAmt = 1;
    }

    // ── Goodbye (namaste) envelope ───────────────────────────────────────
    // While closing, both hands fold together at the chest. Eases in over ~1s
    // then HOLDS for the whole goodbye (no ease-out — released when state changes).
    const isGoodbye = cur === AVATAR_STATES.GOODBYE;
    if (isGoodbye && !a.wasGoodbye) a.goodbyeT = 0;
    a.wasGoodbye = isGoodbye;
    let goodbyeAmt = 0;
    if (isGoodbye) {
      a.goodbyeT += dt;
      goodbyeAmt = Math.min(a.goodbyeT / 1.0, 1);
    }

    // Behavior Matrix based on State (greeting talks like speaking, plus wave)
    if (cur === AVATAR_STATES.SPEAKING || cur === AVATAR_STATES.GREETING) {
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
      
    } else if (cur === AVATAR_STATES.GOODBYE) {
      // Warm closing — gentle bow + subtle talking head. Arms fold (namaste) below.
      targetHeadPitch = 0.12 + Math.sin(a.t * 2.5) * 0.02;
      targetHeadYaw = Math.sin(a.t * 1.2) * 0.03;
      targetSpinePitch = 0.05 + breath;
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

    // Apply to Bones — resolveBone handles plain / RPM / Mixamo(:) naming.
    const head = resolveBone(nodes, scene, 'Head');
    const neck = resolveBone(nodes, scene, 'Neck');
    const spine = resolveBone(nodes, scene, 'Spine', 'Spine1');

    const rightArm = resolveBone(nodes, scene, 'RightArm');
    const rightForeArm = resolveBone(nodes, scene, 'RightForeArm');
    const rightHand = resolveBone(nodes, scene, 'RightHand');
    const leftArm = resolveBone(nodes, scene, 'LeftArm');
    const leftForeArm = resolveBone(nodes, scene, 'LeftForeArm');

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

    // ── Greeting wave override (blended by waveAmt) ───────────────────────
    // Raises the right hand up near the head and oscillates side-to-side.
    // NOTE: bone-axis signs/magnitudes below are a sensible default for an
    // Avaturn/RPM rig but may need a small visual tweak — adjust WAVE_* if the
    // arm raises the wrong way when you preview with `npm run dev`.
    if (waveAmt > 0) {
      const WAVE_ARM_RAISE_Z = -0.1;  // upper-arm roll when raised
      const WAVE_ARM_RAISE_X = -0.3;  // upper-arm lift forward/up
      const WAVE_ELBOW_BEND  = -1.5;  // forearm bent up
      const osc = Math.sin(a.t * 9) * 0.5 * waveAmt; // side-to-side hand motion
      if (rightArm) {
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, WAVE_ARM_RAISE_Z, waveAmt);
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x || 0, WAVE_ARM_RAISE_X, waveAmt);
      }
      if (rightForeArm) {
        rightForeArm.rotation.x = THREE.MathUtils.lerp(rightForeArm.rotation.x, WAVE_ELBOW_BEND, waveAmt);
        rightForeArm.rotation.y = osc;
      }
      if (rightHand) rightHand.rotation.z = osc * 0.8;
    }

    // ── Goodbye namaste override (blended by goodbyeAmt) ──────────────────
    // Folds BOTH hands together at the chest (palms toward center). Like the
    // wave, the NAM_* angles are sensible defaults — tweak if the pose looks off.
    if (goodbyeAmt > 0) {
      const NAM_ARM_Z = 0.55;       // bring upper arms inward
      const NAM_FOREARM_X = -1.65;  // forearms bent up toward chest
      const NAM_FOREARM_Y = 0.5;    // rotate hands toward the center line
      if (rightArm) rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, NAM_ARM_Z, goodbyeAmt);
      if (leftArm)  leftArm.rotation.z  = THREE.MathUtils.lerp(leftArm.rotation.z, -NAM_ARM_Z, goodbyeAmt);
      if (rightForeArm) {
        rightForeArm.rotation.x = THREE.MathUtils.lerp(rightForeArm.rotation.x, NAM_FOREARM_X, goodbyeAmt);
        rightForeArm.rotation.y = THREE.MathUtils.lerp(rightForeArm.rotation.y || 0, NAM_FOREARM_Y, goodbyeAmt);
      }
      if (leftForeArm) {
        leftForeArm.rotation.x = THREE.MathUtils.lerp(leftForeArm.rotation.x, NAM_FOREARM_X, goodbyeAmt);
        leftForeArm.rotation.y = THREE.MathUtils.lerp(leftForeArm.rotation.y || 0, -NAM_FOREARM_Y, goodbyeAmt);
      }
    }

    // Apply to Eyes if available (this model has no eye bones — resolves to null, no-op)
    const rightEye = resolveBone(nodes, scene, 'RightEye');
    const leftEye = resolveBone(nodes, scene, 'LeftEye');
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
    <group ref={groupRef} dispose={null} position={AVATAR_POSITION} scale={AVATAR_SCALE}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(AVATAR_MODEL_PATH);
