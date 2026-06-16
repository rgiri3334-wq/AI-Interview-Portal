import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

export default function AvatarRig({ avatarState, mouthOpenRef }) {
  // Simple loading without draco
  useGLTF.preload('/avatar.glb');
  const { nodes, scene } = useGLTF('/avatar.glb');
  const groupRef = useRef();

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
    if (!nodes || !scene) return;
    
    // Very minimal lip sync only
    if (mouthOpenRef) {
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
    <group ref={groupRef} dispose={null} position={[0, -1.5, 0]} scale={1}>
      <primitive object={scene} />
    </group>
  );
}
