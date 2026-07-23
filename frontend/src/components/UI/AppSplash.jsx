import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Preload, useTexture, Center } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

import logoUrl from '../../assets/sterling_logo.png';

// ============================================================================
// PART 1: PERFECT PIXEL LOGO
// ============================================================================

function CleanLogo({ texture, opacity }) {
  // Ensure the texture is crisp
  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    }
  }, [texture]);

  return (
    <Center>
      <mesh scale={[5, 5, 1]} position={[0, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial 
          map={texture} 
          transparent={true} 
          opacity={opacity} 
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Center>
  );
}

// ============================================================================
// PART 2: ORBITAL RINGS (Sci-Fi Halo)
// ============================================================================

function OrbitalRings({ stage }) {
  const groupRef = useRef();
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    // Rotate rings in opposite directions
    groupRef.current.children[0].rotation.x = time * 0.5;
    groupRef.current.children[0].rotation.y = time * 0.3;
    groupRef.current.children[1].rotation.x = -time * 0.4;
    groupRef.current.children[1].rotation.z = time * 0.6;
    groupRef.current.children[2].rotation.y = time * 0.8;
    groupRef.current.children[2].rotation.z = -time * 0.2;
    
    // Scale out aggressively on warp drive
    if (stage === 'zoomIn') {
      const scale = groupRef.current.scale.x + delta * 20;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  const opacity = (stage === 'logo-in' || stage === 'logo-pause') ? 0.3 : 0;

  return (
    <group ref={groupRef}>
      {/* Ring 1 - Crimson */}
      <mesh>
        <torusGeometry args={[4.5, 0.02, 8, 64]} />
        <meshBasicMaterial color="#ff0044" transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Ring 2 - Cyan */}
      <mesh>
        <torusGeometry args={[5.2, 0.015, 8, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={opacity * 0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Ring 3 - Gold */}
      <mesh>
        <torusGeometry args={[6.0, 0.01, 8, 64]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={opacity * 0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ============================================================================
// PART 3: SPIRAL TUNNEL PARTICLES (Low Count, High Impact)
// ============================================================================

function ParticleVortex({ count = 2000, stage }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    const colors = [
      new THREE.Color('#ff003c'), // Neon Red
      new THREE.Color('#00f0ff'), // Neon Cyan
      new THREE.Color('#9d00ff'), // Purple
      new THREE.Color('#ffffff')  // White core
    ];

    for (let i = 0; i < count; i++) {
      // Create a double helix / spiral structure
      const t = i / count; // 0 to 1
      const angle = t * Math.PI * 40; // Many rotations
      const radius = 2 + Math.random() * 8 + (t * 15); // Expands outward
      const height = (Math.random() - 0.5) * 40; // Very tall tunnel
      const speed = 0.2 + Math.random() * 0.5;
      
      // Assign color randomly from palette
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      temp.push({ radius, angle, height, speed, color, t });
    }
    return temp;
  }, [count]);

  const colorArray = useMemo(() => {
    const array = new Float32Array(count * 3);
    particles.forEach((p, i) => p.color.toArray(array, i * 3));
    return array;
  }, [particles, count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const warpSpeed = stage === 'zoomIn' ? 8.0 : 1.0; 
    
    particles.forEach((particle, i) => {
      // Spin the spiral
      const currentAngle = particle.angle + time * particle.speed * warpSpeed;
      
      let pullRadius = particle.radius;
      if (stage === 'zoomIn') {
         pullRadius = particle.radius + Math.pow(time, 2) * 2.0; 
      }
      
      const x = Math.cos(currentAngle) * pullRadius;
      const z = Math.sin(currentAngle) * pullRadius;
      
      // Move particles along the Y axis to create a flowing tunnel effect
      let y = particle.height + (time * 5.0 * warpSpeed);
      // Loop particles back to bottom of tunnel
      if (y > 20) y -= 40;

      dummy.position.set(x, y, z);
      
      const s = Math.max(0.02, 0.15 - Math.sqrt(x*x + z*z) * 0.003);
      dummy.scale.set(s, s, s);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.rotation.z = time * 0.05; // Global slow roll
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[0.2, 0.2, 0.2]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </boxGeometry>
      <meshBasicMaterial vertexColors transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

// ============================================================================
// PART 4: DRAMATIC CAMERA DIRECTOR
// ============================================================================

function CameraDirector({ stage }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 30, 80));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  
  useEffect(() => {
    camera.position.set(0, -40, 10); // Start way below the logo looking up
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    switch (stage) {
      case 'blank':
        targetPos.current.set(0, -30, 20); // Sit low in the dark
        break;
      case 'logo-in':
        // Dramatic sweep up from below
        targetPos.current.set(
          Math.sin(time * 0.5) * 15, 
          -5 + time * 2.0, 
          25
        );
        break;
      case 'logo-pause':
        // Majestic orbit with Z-roll (drone style)
        targetPos.current.set(
          Math.sin(time * 0.3) * 20, 
          Math.sin(time * 0.4) * 5, 
          Math.cos(time * 0.3) * 20
        );
        // Tilt the camera sideways dynamically
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, Math.sin(time * 0.5) * 0.1, delta * 2.0);
        break;
      case 'zoomIn':
        // Blast the camera completely through the logo (past Z=0 into negatives)
        targetPos.current.set(0, 0, targetPos.current.z - 150 * delta); 
        targetLook.current.set(0, 0, -100); 
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, delta * 5.0); // Level out
        break;
      case 'bg-out':
        targetPos.current.set(0, 0, targetPos.current.z - 200 * delta);
        break;
      default:
        break;
    }

    if (stage !== 'zoomIn' && stage !== 'bg-out') {
      camera.position.lerp(targetPos.current, delta * 1.5); // Slower, smoother lerp
      targetLook.current.lerp(new THREE.Vector3(0, 0, 0), delta * 2.0);
      camera.lookAt(targetLook.current);
    } else {
      camera.position.lerp(targetPos.current, delta * 5.0);
      camera.lookAt(0, 0, -100);
    }
  });
  return null;
}

// ============================================================================
// PART 5: THE ENVIRONMENT & SCENE MANAGER
// ============================================================================

function CinematicScene({ stage }) {
  const logoTex = useTexture(logoUrl);
  const { scene } = useThree();

  useFrame((state, delta) => {
    // Dynamic dense fog that gives the grid massive depth
    if (stage === 'blank') {
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.08, delta * 2.0);
    } else if (stage === 'zoomIn') {
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.0, delta * 10.0);
    } else {
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.02, delta * 1.0);
    }
  });

  // Keep logo opacity at 1 during zoomIn so the camera literally flies through it!
  let logoOpacity = 0;
  if (stage === 'logo-in' || stage === 'logo-pause' || stage === 'zoomIn') {
    logoOpacity = 1;
  }

  return (
    <>
      <color attach="background" args={['#000000']} /> {/* Pure Black */}
      <fogExp2 attach="fog" args={['#000000', 0.05]} />
      <ambientLight intensity={1.0} />
      
      {/* Dynamic Grid Floor (TRON style) - Extremely cheap to render but looks amazing */}
      <gridHelper args={[200, 100, '#ff003c', '#220011']} position={[0, -10, 0]} />
      <gridHelper args={[200, 100, '#00ffff', '#001122']} position={[0, 15, 0]} /> {/* Ceiling Grid */}

      {/* Central Ambient Core */}
      <mesh position={[0, 0, -5]} scale={[20, 20, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ff003c" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <ParticleVortex count={2000} stage={stage} />
      <OrbitalRings stage={stage} />

      <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.8}>
        <CleanLogo texture={logoTex} opacity={logoOpacity} />
      </Float>

      <CameraDirector stage={stage} />
    </>
  );
}

// ============================================================================
// PART 6: THE CONTROLLER
// ============================================================================

export default function AppSplash({ onComplete }) {
  const [stage, setStage] = useState('blank'); 

  useEffect(() => {
    const hasPlayed = sessionStorage.getItem('splashPlayed');
    if (hasPlayed) {
      setStage('done');
      onComplete?.();
      return;
    }

    const t1 = setTimeout(() => setStage('logo-in'), 1000);
    const t2 = setTimeout(() => setStage('logo-pause'), 4000);
    const t3 = setTimeout(() => setStage('zoomIn'), 7000);
    const t4 = setTimeout(() => setStage('bg-out'), 8000);
    const t5 = setTimeout(() => {
      setStage('done');
      sessionStorage.setItem('splashPlayed', 'true');
      onComplete?.();
    }, 9000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  return (
    <AnimatePresence>
      {stage !== 'done' && (
        <motion.div
          key="master-cinematic-container"
          initial={{ opacity: 1 }}
          animate={{ opacity: stage === 'bg-out' ? 0 : 1 }}
          transition={{ duration: 1.0, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] bg-[#000000] overflow-hidden pointer-events-none"
        >
          {/* Performance Optimized Canvas */}
          <Canvas 
            dpr={1} 
            performance={{ min: 0.5 }} 
            gl={{ antialias: false, powerPreference: "high-performance" }}
          >
            <React.Suspense fallback={null}>
              <CinematicScene stage={stage} />
            </React.Suspense>
            <Preload all />
          </Canvas>

          {/* Cinematic Letterboxing */}
          <div className="absolute top-0 left-0 w-full h-16 bg-black z-10 pointer-events-none border-b border-red-900/30" />
          <div className="absolute bottom-0 left-0 w-full h-16 bg-black z-10 pointer-events-none border-t border-cyan-900/30" />

          {/* Boot Sequence Text Overlay */}
          <AnimatePresence>
            {(stage === 'logo-in' || stage === 'logo-pause') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                transition={{ duration: 0.8 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="text-white text-[11px] font-mono tracking-[0.4em] uppercase shadow-lg">
                    System Boot Sequence
                  </span>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping delay-100" />
                </div>
                <div className="w-64 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
