import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const ParticleWaveform3D = ({ isSpeaking, getAudioFrequency, theme = 'dark' }) => {
  const meshRef = useRef();
  // Drastically reduced count from 3000 to 800 for 60fps performance during Live Interview
  const count = 800; 
  
  // Setup instanced mesh matrix and colors
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Initialize particles in a sphere shape
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 2.0 + Math.random() * 0.5; // Base radius
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      temp.push({
        x, y, z,
        baseX: x, baseY: y, baseZ: z,
        phase: Math.random() * 100,
        speed: 0.5 + Math.random() * 2
      });
    }
    return temp;
  }, [count]);

  const color = useMemo(() => new THREE.Color(), []);
  const colorRed = useMemo(() => new THREE.Color('#DC2626'), []);
  const colorTheme = useMemo(() => new THREE.Color(theme === 'dark' ? '#FFFFFF' : '#475569'), [theme]);

  const geometry = useMemo(() => new THREE.SphereGeometry(0.06, 8, 8), []); // Slightly larger to compensate for lower count
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!meshRef.current) return;
    
    // Get real audio frequency if available, fallback to 0
    const rawFreq = (typeof getAudioFrequency === 'function' && isSpeaking) ? getAudioFrequency() : 0;
    const audioIntensity = Math.min(rawFreq * 1.5, 1.5);
    
    // Animate each particle
    particles.forEach((p, i) => {
      let displacement = 0;
      if (isSpeaking) {
        // Base sine wave movement mixed with real audio intensity
        const baseDisplacement = Math.sin(time * 10 * p.speed + p.phase) * 0.5 + Math.cos(time * 15 * p.speed + p.phase * 2) * 0.5;
        displacement = Math.abs(baseDisplacement) + audioIntensity * 2.5; 
      } else {
        // Gentle breathing idle
        displacement = Math.sin(time * 2 + p.phase) * 0.1;
      }
      
      // Calculate new position
      const targetX = p.baseX + (p.baseX * displacement * 0.3);
      const targetY = p.baseY + (p.baseY * displacement * 0.3);
      const targetZ = p.baseZ + (p.baseZ * displacement * 0.3);

      // Smooth transition
      p.x += (targetX - p.x) * 0.1;
      p.y += (targetY - p.y) * 0.1;
      p.z += (targetZ - p.z) * 0.1;

      dummy.position.set(p.x, p.y, p.z);
      
      // Avoid Math.random() in the frame loop, use phase instead
      const scale = isSpeaking ? 1.0 + (Math.sin(time * 20 + p.phase) * 0.5 + 0.5) * 0.5 : 1.0;
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Colors: Fast distance squared check
      const distSq = p.x*p.x + p.y*p.y + p.z*p.z;
      if (distSq > 9.0 && isSpeaking) { // 3.0 squared = 9.0
        color.copy(colorRed);
      } else {
        color.copy(colorTheme);
      }
      meshRef.current.setColorAt(i, color);
    });

    // Rotate the entire cloud slowly
    meshRef.current.rotation.y = time * 0.2;
    meshRef.current.rotation.z = time * 0.1;

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  const colorArray = useMemo(() => new Float32Array(count * 3).fill(1), []);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <instancedMesh ref={meshRef} args={[geometry, material, count]}>
        <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
      </instancedMesh>

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={2.0} />
      </EffectComposer>
    </>
  );
};

export default ParticleWaveform3D;
