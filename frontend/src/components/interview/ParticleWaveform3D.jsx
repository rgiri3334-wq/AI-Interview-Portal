import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const ParticleWaveform3D = ({ isSpeaking, getAudioFrequency, theme = 'dark' }) => {
  const meshRef = useRef();
  const count = 3000;
  
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

  const color = new THREE.Color();

  const geometry = useMemo(() => new THREE.SphereGeometry(0.05, 8, 8), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!meshRef.current) return;
    
    // Get real audio frequency if available, fallback to 0
    const rawFreq = (typeof getAudioFrequency === 'function' && isSpeaking) ? getAudioFrequency() : 0;
    // Normalize frequency somewhat (0.0 to 1.0 roughly, depends on implementation)
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
      
      const scale = isSpeaking ? 1.0 + Math.random() * 0.5 : 1.0;
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Colors: Sterling Red (#DC2626) and White/Slate depending on theme
      const dist = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
      if (dist > 3.0 && isSpeaking) {
        color.set('#DC2626'); // Sterling Red
      } else {
        color.set(theme === 'dark' ? '#FFFFFF' : '#475569'); // White for dark theme, Slate-600 for light theme
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
