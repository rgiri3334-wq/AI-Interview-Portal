import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';

const AVATAR_STATES = {
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  THINKING: 'thinking',
  IDLE: 'idle'
};

// Preload both the model mesh and the avatar animations
useGLTF.preload('/model.glb');
useGLTF.preload('/avatar.glb');

export default function AvatarRig({ avatarState, mouthOpenRef }) {
  const groupRef = useRef();
  
  // 1. Load the visible human mesh from model.glb
  const { scene } = useGLTF('/model.glb');
  
  // 2. Load the animations from avatar.glb (the pink robot)
  const { animations } = useGLTF('/avatar.glb');

  // Fix the bone names: avatar.glb uses 'mixamorig:BoneName', but model.glb uses 'BoneName'
  const retargetedAnimations = React.useMemo(() => {
    return animations.map(clip => {
      const newClip = clip.clone();
      newClip.tracks.forEach(track => {
        track.name = track.name.replace('mixamorig:', '');
      });
      return newClip;
    });
  }, [animations]);
  
  // 3. Bind the extracted animations to the human mesh group
  const { actions } = useAnimations(retargetedAnimations, groupRef);

  const avatarStateRef = useRef(avatarState);
  useEffect(() => { avatarStateRef.current = avatarState; }, [avatarState]);

  // Handle Animation Transitions
  useEffect(() => {
    if (!actions) return;
    
    let cur = AVATAR_STATES.IDLE;
    if (avatarState) {
      if (avatarState.isSpeaking) cur = AVATAR_STATES.SPEAKING;
      else if (avatarState.isLoading) cur = AVATAR_STATES.THINKING;
      else if (avatarState.isListening) cur = AVATAR_STATES.LISTENING;
    }

    // Decide which animation to play based on state
    let targetAnim = 'idle';
    if (cur === AVATAR_STATES.SPEAKING) targetAnim = 'agree'; 
    else if (cur === AVATAR_STATES.THINKING) targetAnim = 'idle';
    else if (cur === AVATAR_STATES.LISTENING) targetAnim = 'idle';

    if (!actions[targetAnim]) targetAnim = 'idle'; // Fallback

    if (actions[targetAnim]) {
      // Fade out all other animations and fade in the target
      Object.values(actions).forEach(action => {
        if (action.name === targetAnim) {
          action.reset().fadeIn(0.5).play();
        } else {
          action.fadeOut(0.5);
        }
      });
    }
  }, [avatarState, actions]);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
        }
      });
    }
  }, [scene]);

  useFrame(() => {
    if (!scene) return;
    
    // Apply Lip Sync Morph Targets dynamically on top of the running animation
    const openAmount = (mouthOpenRef && mouthOpenRef.current) ? mouthOpenRef.current : 0;
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
  });

  return (
    <group ref={groupRef} dispose={null} position={[0, -1.45, 0]} scale={0.85}>
      <primitive object={scene} />
    </group>
  );
}
