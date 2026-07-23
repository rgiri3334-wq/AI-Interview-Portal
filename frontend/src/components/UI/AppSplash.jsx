import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  EffectComposer, 
  Bloom, 
  ChromaticAberration, 
  Noise, 
  Vignette,
  Glitch
} from '@react-three/postprocessing';
import { Stars, Float, Preload, useTexture, Center } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

// Import Logo
import logoUrl from '../../assets/sterling_logo.png';

// ============================================================================
// PART 1: SHADERS & MATERIALS
// ============================================================================

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float uTime;

  void main() {
    vUv = uv;
    vPosition = position;
    
    // Add subtle waving distortion
    vec3 pos = position;
    pos.z += sin(pos.y * 10.0 + uTime) * 0.1;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Discard transparent pixels immediately for alpha mapping
    if(texColor.a < 0.1) discard;

    // Scanline effect
    float scanline = sin(vUv.y * 200.0 - uTime * 10.0) * 0.04;
    
    // Holographic grid
    float gridX = sin(vUv.x * 100.0) > 0.98 ? 1.0 : 0.0;
    float gridY = sin(vUv.y * 100.0) > 0.98 ? 1.0 : 0.0;
    float grid = gridX + gridY;
    
    // Glow pulsing
    float pulse = (sin(uTime * 2.0) * 0.5 + 0.5) * 0.5 + 0.5;
    
    // Combine base color with holographic effects
    vec3 finalColor = texColor.rgb + (vec3(1.0, 0.0, 0.0) * grid * 0.5) + scanline;
    
    // Multiplied by overall opacity and pulse
    gl_FragColor = vec4(finalColor * pulse, texColor.a * uOpacity);
  }
`;

// ============================================================================
// PART 2: THE HOLOGRAPHIC LOGO MESH
// ============================================================================

function HolographicLogo({ texture, opacity }) {
  const materialRef = useRef();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uOpacity.value = opacity;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTexture: { value: texture },
    uOpacity: { value: opacity },
    uColor: { value: new THREE.Color(0xff0000) }
  }), [texture, opacity]);

  return (
    <Center>
      <mesh scale={[5, 5, 1]} rotation={[0, 0, 0]}>
        <planeGeometry args={[2, 2, 64, 64]} />
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
// PART 3: THE PARTICLE VORTEX
// ============================================================================

function ParticleVortex({ count = 20000, stage }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Particle Data: Position, Velocity, Phase, Color
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const radius = 5 + Math.random() * 20;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 15;
      const phase = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      const color = new THREE.Color(
        Math.random() > 0.8 ? '#ff0000' : '#ffffff' // 20% red sparks, 80% white dust
      );
      
      temp.push({ radius, angle, height, phase, speed, color });
    }
    return temp;
  }, [count]);

  const colorArray = useMemo(() => {
    const array = new Float32Array(count * 3);
    particles.forEach((p, i) => {
      p.color.toArray(array, i * 3);
    });
    return array;
  }, [particles, count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // If we are in "zoomIn" stage, accelerate the particles massively
    const speedMultiplier = stage === 'zoomIn' ? 10.0 : 1.0;
    
    particles.forEach((particle, i) => {
      // Swirling math
      const currentAngle = particle.angle + time * particle.speed * 0.2 * speedMultiplier;
      
      // If stage is zooming in, particles fly outwards towards camera
      let pullRadius = particle.radius;
      if (stage === 'zoomIn') {
         pullRadius = particle.radius + Math.pow(time, 3) * 2.0; 
      } else if (stage === 'logo-in') {
         // Contract tightly
         pullRadius = Math.max(3, particle.radius - time * 5.0);
      }
      
      const x = Math.cos(currentAngle) * pullRadius;
      const z = Math.sin(currentAngle) * pullRadius;
      
      // Waving height
      const y = particle.height + Math.sin(time * 2.0 + particle.phase) * 2.0;

      dummy.position.set(x, y, z);
      
      // Rotate particles to look dynamic
      dummy.rotation.x = time * particle.speed;
      dummy.rotation.y = time * particle.speed;
      
      // Scale based on distance to center
      const dist = Math.sqrt(x*x + z*z);
      const s = Math.max(0.01, 0.2 - dist * 0.005);
      dummy.scale.set(s, s, s);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Slowly rotate the entire vortex container
    meshRef.current.rotation.y = time * 0.1;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <dodecahedronGeometry args={[0.2, 0]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </dodecahedronGeometry>
      <meshBasicMaterial vertexColors toneMapped={false} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

// ============================================================================
// PART 4: THE CAMERA DIRECTOR (Cinematic Fly-Through)
// ============================================================================

function CameraDirector({ stage }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0, 30));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  
  // Starting position way out
  useEffect(() => {
    camera.position.set(0, 20, 50);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    switch (stage) {
      case 'blank':
        // Wait in the dark
        targetPos.current.set(0, 0, 40);
        break;
      case 'logo-in':
        // Smooth swoop down and forward
        targetPos.current.set(
          Math.sin(time * 0.5) * 15, // slight orbit
          5 - time * 1.5, // lower down
          25 // move closer
        );
        break;
      case 'logo-pause':
        // Slow cinematic orbit
        targetPos.current.set(
          Math.sin(time * 0.2) * 20,
          Math.sin(time * 0.5) * 2,
          Math.cos(time * 0.2) * 20
        );
        break;
      case 'zoomIn':
        // Warp Drive: Push incredibly fast through the logo
        // Z goes into the negative to fly past the logo
        targetPos.current.set(0, 0, targetPos.current.z - 80 * delta); 
        targetLook.current.set(0, 0, -1000); // Look far ahead
        break;
      case 'bg-out':
        // Continue flying out rapidly while app fades
        targetPos.current.set(0, 0, targetPos.current.z - 150 * delta);
        break;
      default:
        break;
    }

    // Smoothly interpolate camera position for cinematic feel
    if (stage !== 'zoomIn' && stage !== 'bg-out') {
      camera.position.lerp(targetPos.current, delta * 2.0);
      
      // Look at center
      targetLook.current.lerp(new THREE.Vector3(0, 0, 0), delta * 3.0);
      camera.lookAt(targetLook.current);
    } else {
      // Faster interpolation during Warp Drive
      camera.position.lerp(targetPos.current, delta * 5.0);
      camera.lookAt(0,0,-1000);
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

  // Manage Fog Density over time
  useFrame((state, delta) => {
    if (stage === 'blank') {
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.1, delta * 2.0);
    } else if (stage === 'zoomIn') {
      // Clear fog instantly on warp drive
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.0, delta * 10.0);
    } else {
      // Beautiful deep fog for the cinematic phase
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.015, delta * 1.0);
    }
  });

  // Calculate Logo Opacity
  let logoOpacity = 0;
  if (stage === 'logo-in' || stage === 'logo-pause') logoOpacity = 1;
  if (stage === 'zoomIn' || stage === 'bg-out') logoOpacity = 0; // Fade out during fly through

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fogExp2 attach="fog" args={['#050505', 0.05]} />

      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 20, 10]} intensity={2.0} color="#ffffff" />
      <pointLight position={[0, 0, 5]} intensity={5.0} color="#ff0000" distance={50} />

      {/* Floating Space Dust */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Central Red Ambient Core */}
      <mesh position={[0, 0, -2]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.1} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* The Particle Engine */}
      <ParticleVortex count={15000} stage={stage} />

      {/* The Holographic Logo */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <HolographicLogo texture={logoTex} opacity={logoOpacity} />
      </Float>

      <CameraDirector stage={stage} />

      {/* Post Processing Pipeline */}
      <EffectComposer multisampling={4} disableNormalPass>
        <Bloom 
          luminanceThreshold={0.2} 
          luminanceSmoothing={0.9} 
          intensity={2.5} 
          kernelSize={3}
          mipmapBlur 
        />
        <ChromaticAberration 
          offset={[
            stage === 'zoomIn' ? 0.05 : 0.002, 
            stage === 'zoomIn' ? 0.05 : 0.002
          ]} 
        />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        {stage === 'zoomIn' && (
          <Glitch 
            delay={[0, 0]} 
            duration={[0.1, 0.3]} 
            strength={[0.2, 0.4]} 
            active={true}
            ratio={0.85}
          />
        )}
      </EffectComposer>
    </>
  );
}

// ============================================================================
// PART 6: THE REACT STATE CONTROLLER
// ============================================================================

export default function AppSplash({ onComplete }) {
  const [stage, setStage] = useState('blank'); 
  // Timeline states:
  // 'blank' -> pure black screen, setting up scene
  // 'logo-in' -> particles assemble, logo appears, camera pans in
  // 'logo-pause' -> majestic orbit around the constructed logo
  // 'zoomIn' -> WARP DRIVE: camera flies aggressively straight through the logo
  // 'bg-out' -> The WebGL canvas fades out smoothly into the App

  useEffect(() => {
    const hasPlayed = sessionStorage.getItem('splashPlayed');
    if (hasPlayed) {
      setStage('done');
      onComplete?.();
      return;
    }

    // --- The Master Cinematic Timeline ---

    // 0.0s to 1.0s: Pure Black, atmospheric fog thickens (Stage 'blank')
    const t1 = setTimeout(() => setStage('logo-in'), 1000);
    
    // 1.0s to 4.0s: The Formation (Stage 'logo-in')
    // Camera dives in, particles swirl and construct the holographic logo.
    const t2 = setTimeout(() => setStage('logo-pause'), 4000);
    
    // 4.0s to 7.0s: The Majestic Orbit (Stage 'logo-pause')
    // Camera smoothly sweeps around the perfectly glowing 3D logo in space.
    const t3 = setTimeout(() => setStage('zoomIn'), 7000);
    
    // 7.0s to 8.5s: WARP DRIVE (Stage 'zoomIn')
    // Camera accelerates to mach 10 straight *into* the logo. 
    // Chromatic aberration splits, glitch effects trigger.
    const t4 = setTimeout(() => setStage('bg-out'), 8000);
    
    // 8.0s to 9.0s: The Fade Transition (Stage 'bg-out')
    // The violent WebGL sequence softly fades out via DOM opacity, revealing the clean Light Theme App.
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
          {/* React Three Fiber WebGL Canvas */}
          <Canvas dpr={[1, 2]} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}>
            <React.Suspense fallback={null}>
              <CinematicScene stage={stage} />
            </React.Suspense>
            <Preload all />
          </Canvas>

          {/* HTML Overlay: Cinematic Letterboxing (Optional but adds flair) */}
          <div className="absolute top-0 left-0 w-full h-16 bg-black z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-16 bg-black z-10 pointer-events-none" />

          {/* HTML Overlay: Boot Sequence Text Overlay */}
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

// EOF
