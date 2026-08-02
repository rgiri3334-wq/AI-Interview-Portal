import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ParticleWaveform3D = ({ isSpeaking, isThinking, getAudioFrequency }) => {
  const meshRef = useRef();
  const count = 600; // Optimized for integration
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 2.5 + Math.random() * 1.5; // Orbit radius
      
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
  const colorRed = useMemo(() => new THREE.Color('#ef4444'), []); // Crimson
  const colorPurple = useMemo(() => new THREE.Color('#a855f7'), []); // Processing

  const geometry = useMemo(() => new THREE.SphereGeometry(0.04, 8, 8), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!meshRef.current) return;
    
    // Only visible when speaking or thinking
    const active = isSpeaking || isThinking;
    meshRef.current.visible = active;
    if (!active) return;

    const rawFreq = (typeof getAudioFrequency === 'function' && isSpeaking) ? getAudioFrequency() : 0;
    const audioIntensity = Math.min(rawFreq * 2.0, 2.0);
    
    particles.forEach((p, i) => {
      let displacement = 0;
      if (isSpeaking) {
        const baseDisplacement = Math.sin(time * 10 * p.speed + p.phase) * 0.5;
        displacement = Math.abs(baseDisplacement) + audioIntensity * 3.0; 
      } else if (isThinking) {
        displacement = Math.sin(time * 3 * p.speed + p.phase) * 0.2;
      }
      
      const targetX = p.baseX + (p.baseX * displacement * 0.2);
      const targetY = p.baseY + (p.baseY * displacement * 0.2);
      const targetZ = p.baseZ + (p.baseZ * displacement * 0.2);

      p.x += (targetX - p.x) * 0.1;
      p.y += (targetY - p.y) * 0.1;
      p.z += (targetZ - p.z) * 0.1;

      dummy.position.set(p.x, p.y, p.z);
      
      const scale = isSpeaking ? 1.0 + (Math.sin(time * 20 + p.phase) * 0.5 + 0.5) * 0.5 : 1.0;
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      if (isSpeaking) {
        color.copy(colorRed);
        color.multiplyScalar(1.0 + audioIntensity); // Make them glow brighter
      } else {
        color.copy(colorPurple);
        color.multiplyScalar(1.5);
      }
      meshRef.current.setColorAt(i, color);
    });

    // Rotate swarm
    meshRef.current.rotation.y = time * (isSpeaking ? 0.5 : 0.2);
    meshRef.current.rotation.z = time * 0.1;

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  const colorArray = useMemo(() => new Float32Array(count * 3).fill(1), []);

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} position={[0, -1, -1]}>
      <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
    </instancedMesh>
  );
};

export default ParticleWaveform3D;
