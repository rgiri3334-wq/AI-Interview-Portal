import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Preload, useTexture, Center } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

// Import Logo
import logoUrl from '../../assets/sterling_logo.png';

// ============================================================================
// PART 1: OPTIMIZED SHADERS
// ============================================================================

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uOpacity;

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    if(texColor.a < 0.1) discard;
    
    // Add built-in red ambient tint instead of heavy post-processing Bloom
    vec3 tintedColor = texColor.rgb + vec3(0.2, 0.0, 0.0);
    gl_FragColor = vec4(tintedColor, texColor.a * uOpacity);
  }
`;

function HolographicLogo({ texture, opacity }) {
  const materialRef = useRef();

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uOpacity.value = opacity;
    }
  });

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uOpacity: { value: opacity }
  }), [texture, opacity]);

  return (
    <Center>
      <mesh scale={[5, 5, 1]} rotation={[0, 0, 0]}>
        <planeGeometry args={[2, 2, 2, 2]} /> {/* Reduced geometry complexity */}
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </Center>
  );
}

// ============================================================================
// PART 2: OPTIMIZED PARTICLES (10x Fewer Particles)
// ============================================================================

function ParticleVortex({ count = 1500, stage }) { // Reduced from 15,000 to 1,500
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const radius = 5 + Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 15;
      const speed = 0.5 + Math.random() * 2;
      const isRed = Math.random() > 0.8;
      temp.push({ radius, angle, height, speed, isRed });
    }
    return temp;
  }, [count]);

  const colorArray = useMemo(() => {
    const array = new Float32Array(count * 3);
    const red = new THREE.Color('#ff0000');
    const white = new THREE.Color('#ffffff');
    particles.forEach((p, i) => {
      (p.isRed ? red : white).toArray(array, i * 3);
    });
    return array;
  }, [particles, count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const speedMultiplier = stage === 'zoomIn' ? 5.0 : 1.0; // Reduced max speed
    
    particles.forEach((particle, i) => {
      const currentAngle = particle.angle + time * particle.speed * 0.2 * speedMultiplier;
      
      let pullRadius = particle.radius;
      if (stage === 'zoomIn') {
         pullRadius = particle.radius + Math.pow(time, 2) * 1.5; 
      } else if (stage === 'logo-in') {
         pullRadius = Math.max(3, particle.radius - time * 5.0);
      }
      
      const x = Math.cos(currentAngle) * pullRadius;
      const z = Math.sin(currentAngle) * pullRadius;
      const y = particle.height;

      dummy.position.set(x, y, z);
      
      // Removed rotation per particle to save CPU
      const s = Math.max(0.01, 0.2 - Math.sqrt(x*x + z*z) * 0.005);
      dummy.scale.set(s, s, s);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.rotation.y = time * 0.1;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      {/* Box is cheaper to render than Dodecahedron */}
      <boxGeometry args={[0.2, 0.2, 0.2]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </boxGeometry>
      <meshBasicMaterial vertexColors toneMapped={false} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

// ============================================================================
// PART 3: OPTIMIZED CAMERA DIRECTOR
// ============================================================================

function CameraDirector({ stage }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 20, 50));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  
  useEffect(() => {
    camera.position.set(0, 20, 50);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    switch (stage) {
      case 'blank':
        targetPos.current.set(0, 0, 40);
        break;
      case 'logo-in':
        targetPos.current.set(Math.sin(time * 0.5) * 15, 5 - time * 1.5, 25);
        break;
      case 'logo-pause':
        targetPos.current.set(Math.sin(time * 0.2) * 20, Math.sin(time * 0.5) * 2, Math.cos(time * 0.2) * 20);
        break;
      case 'zoomIn':
        targetPos.current.set(0, 0, targetPos.current.z - 60 * delta); 
        targetLook.current.set(0, 0, -100); 
        break;
      case 'bg-out':
        targetPos.current.set(0, 0, targetPos.current.z - 100 * delta);
        break;
      default:
        break;
    }

    if (stage !== 'zoomIn' && stage !== 'bg-out') {
      camera.position.lerp(targetPos.current, delta * 2.0);
      targetLook.current.lerp(new THREE.Vector3(0, 0, 0), delta * 3.0);
      camera.lookAt(targetLook.current);
    } else {
      camera.position.lerp(targetPos.current, delta * 5.0);
      camera.lookAt(0, 0, -100);
    }
  });
  return null;
}

// ============================================================================
// PART 4: OPTIMIZED SCENE (NO POST-PROCESSING)
// ============================================================================

function CinematicScene({ stage }) {
  const logoTex = useTexture(logoUrl);
  const { scene } = useThree();

  useFrame((state, delta) => {
    if (stage === 'blank') {
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.1, delta * 2.0);
    } else if (stage === 'zoomIn') {
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.0, delta * 10.0);
    } else {
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.015, delta * 1.0);
    }
  });

  let logoOpacity = 0;
  if (stage === 'logo-in' || stage === 'logo-pause') logoOpacity = 1;
  if (stage === 'zoomIn' || stage === 'bg-out') logoOpacity = 0;

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fogExp2 attach="fog" args={['#050505', 0.05]} />
      <ambientLight intensity={0.5} />
      
      {/* Central Red Ambient Core (Cheaper than Bloom) */}
      <mesh position={[0, 0, -5]} scale={[15, 15, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <ParticleVortex count={1500} stage={stage} />

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <HolographicLogo texture={logoTex} opacity={logoOpacity} />
      </Float>

      <CameraDirector stage={stage} />
    </>
  );
}

// ============================================================================
// PART 5: THE CONTROLLER
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
          className="fixed inset-0 z-[99999] bg-black overflow-hidden pointer-events-none"
        >
          {/* Performance Optimized Canvas */}
          <Canvas 
            dpr={1} // Force resolution to 1x for performance
            performance={{ min: 0.5 }} // Allow framerate scaling
            gl={{ antialias: false, powerPreference: "high-performance" }}
          >
            <React.Suspense fallback={null}>
              <CinematicScene stage={stage} />
            </React.Suspense>
            <Preload all />
          </Canvas>

          <div className="absolute top-0 left-0 w-full h-16 bg-black z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-16 bg-black z-10 pointer-events-none" />

          <AnimatePresence>
            {(stage === 'logo-in' || stage === 'logo-pause') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                transition={{ duration: 0.8 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                  <span className="text-white text-[10px] font-mono tracking-[0.3em] uppercase">
                    Initializing Neural Core
                  </span>
                </div>
                <div className="w-48 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
