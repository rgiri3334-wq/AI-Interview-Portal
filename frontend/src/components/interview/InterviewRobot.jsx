import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, Canvas } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, DepthOfField, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import ParticleWaveform3D from './ParticleWaveform3D';

// Helper to resolve bone by name
function resolveBone(nodes, scene, ...candidates) {
  for (const name of candidates) {
    if (nodes && nodes[name]) return nodes[name];
  }
  if (scene) {
    let hit = null;
    scene.traverse((o) => {
      if (hit) return;
      for (const name of candidates) {
        if (o.name === name || o.name === 'mixamorig:' + name || o.name === 'mixamorig' + name) {
          hit = o;
          return;
        }
      }
    });
    if (hit) return hit;
  }
  return null;
}

const dampVal = (current, target, factor, dt) => THREE.MathUtils.damp(current, target, factor, dt);

// Floating Holographic Data Rings
function DataRings({ isListening, getAudioFrequency }) {
  const ring1Ref = useRef();
  const ring2Ref = useRef();

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    let speed = 0.5;
    let scale = 1;
    let opacity = 0.3;

    if (isListening && getAudioFrequency) {
      const vol = getAudioFrequency();
      speed = 1.0 + vol * 5.0;
      scale = 1.0 + vol * 0.2;
      opacity = 0.4 + vol * 0.4;
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * speed;
      ring1Ref.current.scale.setScalar(dampVal(ring1Ref.current.scale.x, scale, 5, delta));
      ring1Ref.current.material.opacity = dampVal(ring1Ref.current.material.opacity, opacity, 5, delta);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * (speed * 0.8);
      ring2Ref.current.scale.setScalar(dampVal(ring2Ref.current.scale.x, scale * 1.2, 5, delta));
      ring2Ref.current.material.opacity = dampVal(ring2Ref.current.material.opacity, opacity * 0.7, 5, delta);
    }
  });

  return (
    <group position={[0, -1.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ring1Ref}>
        <ringGeometry args={[1.5, 1.55, 64]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <mesh ref={ring2Ref}>
        <ringGeometry args={[1.8, 1.82, 64]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RobotRig({ isSpeaking, isListening, isCodeOpen, getAudioFrequency }) {
  const { nodes, scene } = useGLTF('/robot.glb');
  const groupRef = useRef();
  const lightRef = useRef();
  const materialRef = useRef();
  
  // Synthesize a generic "isThinking" state (e.g. neither speaking nor listening, but not strictly idle either if loading)
  // For the sake of the swarm, let's say it's thinking if it's not speaking and not listening.
  const isThinking = !isSpeaking && !isListening;
  
  const anim = useRef({
    t: 0,
    headPitch: 0, headYaw: 0, headRoll: 0,
    spinePitch: 0, spineYaw: 0,
    rightArmRoll: 1.2, rightArmPitch: 0.1, rightArmYaw: 0,
    leftArmRoll: -1.2, leftArmPitch: 0.1, leftArmYaw: 0,
    targetColor: new THREE.Color('#3f1d1d'),
    currentColor: new THREE.Color('#3f1d1d'),
    isGesturing: false,
    gestureTimer: 0
  });

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
          if (child.material) {
            if (child.material.skinning !== undefined) delete child.material.skinning;
            if (child.material.morphTargets !== undefined) delete child.material.morphTargets;
            materialRef.current = child.material;
          }
        }
      });
    }
  }, [scene]);

  useFrame((state, delta) => {
    if (!nodes) return;
    const dt = Math.min(delta, 0.1); 
    const a = anim.current;
    a.t += dt;

    let amplitude = 0;
    if (getAudioFrequency && isSpeaking) {
      amplitude = getAudioFrequency(); 
    }

    // Contextual Lighting
    if (isSpeaking) {
      a.targetColor.set('#ef4444'); // Crimson
    } else if (isListening) {
      a.targetColor.set('#0ea5e9'); // Azure
    } else {
      a.targetColor.set('#a855f7'); // Processing Purple
    }
    a.currentColor.lerp(a.targetColor, dt * 2.0);
    
    if (lightRef.current) {
      lightRef.current.color.copy(a.currentColor);
      lightRef.current.intensity = isSpeaking ? 6 + (amplitude * 4) : 4;
    }

    // Skeletal Animation
    let tHP = 0, tHY = 0, tHR = 0;
    let tSP = Math.sin(a.t * 1.5) * 0.015; 
    let tSY = 0;
    let tRAR = 1.2, tRAP = 0.1, tRAY = 0;
    let tLAR = -1.2, tLAP = 0.1, tLAY = 0;

    if (isCodeOpen) {
      // Robot physically turns head to look at code (which opens on the right side usually)
      tHY = -0.5;
      tSP = 0.1;
    }

    if (isSpeaking) {
      tHP = amplitude * 0.3;
      if (!a.isGesturing && Math.random() < 0.01 && amplitude > 0.2) {
        a.isGesturing = true;
        a.gestureTimer = a.t + 1.5; 
      }
      if (a.isGesturing) {
        tRAR = 0.8; 
        tRAP = -0.3; 
        if (a.t > a.gestureTimer) a.isGesturing = false;
      }
    } else if (isListening) {
      tSP += 0.05;
      tHP += 0.05;
      if (!isCodeOpen) tHY = Math.sin(a.t * 0.5) * 0.05;
    } else {
      if (!isCodeOpen) tHY = Math.sin(a.t * 0.5) * 0.05;
    }

    const df = 5;
    a.headPitch = dampVal(a.headPitch, tHP, df, dt);
    a.headYaw = dampVal(a.headYaw, tHY, df, dt);
    a.headRoll = dampVal(a.headRoll, tHR, df, dt);
    a.spinePitch = dampVal(a.spinePitch, tSP, 2, dt);
    a.spineYaw = dampVal(a.spineYaw, tSY, 4, dt);
    a.rightArmRoll = dampVal(a.rightArmRoll, tRAR, df, dt);
    a.rightArmPitch = dampVal(a.rightArmPitch, tRAP, df, dt);
    a.rightArmYaw = dampVal(a.rightArmYaw, tRAY, df, dt);
    a.leftArmRoll = dampVal(a.leftArmRoll, tLAR, df, dt);
    a.leftArmPitch = dampVal(a.leftArmPitch, tLAP, df, dt);
    a.leftArmYaw = dampVal(a.leftArmYaw, tLAY, df, dt);

    const head = resolveBone(nodes, scene, 'Head');
    const spine = resolveBone(nodes, scene, 'Spine', 'Spine1');
    const rightArm = resolveBone(nodes, scene, 'RightArm');
    const leftArm = resolveBone(nodes, scene, 'LeftArm');

    if (head) {
      head.rotation.x = a.headPitch;
      head.rotation.y = a.headYaw;
      head.rotation.z = a.headRoll;
    }
    if (spine) {
      spine.rotation.x = a.spinePitch;
      spine.rotation.y = a.spineYaw;
    }
    if (rightArm) {
      rightArm.rotation.x = a.rightArmPitch;
      rightArm.rotation.y = a.rightArmYaw;
      rightArm.rotation.z = a.rightArmRoll;
    }
    if (leftArm) {
      leftArm.rotation.x = a.leftArmPitch;
      leftArm.rotation.y = a.leftArmYaw;
      leftArm.rotation.z = a.leftArmRoll;
    }
    
    // Cinematic Camera Dolly & FOV
    let targetZ = 3.8;
    let targetX = 0;
    let targetFov = 35;
    
    if (isThinking) {
      // Dolly in for dramatic focus
      targetZ = 2.8;
      targetFov = 30;
    }
    if (isCodeOpen) {
      // Pan left to make room for code
      targetX = -0.5;
    }

    state.camera.position.lerp(new THREE.Vector3(targetX, 0, targetZ), dt * 1.5);
    state.camera.fov = dampVal(state.camera.fov, targetFov, 2, dt);
    state.camera.updateProjectionMatrix();
    state.camera.lookAt(targetX, -0.4, 0); 
  });

  return (
    <group ref={groupRef} position={[0, -1.8, 0]}>
      <pointLight ref={lightRef} position={[0, 1.5, 2]} intensity={4} color="#3f1d1d" distance={10} castShadow={false} />
      
      {/* Phase 4: Neural Swarm */}
      <ParticleWaveform3D 
        isSpeaking={isSpeaking} 
        isThinking={isThinking} 
        getAudioFrequency={getAudioFrequency} 
      />

      {/* Phase 5: Holographic Data Rings */}
      <DataRings isListening={isListening} getAudioFrequency={getAudioFrequency} />

      <primitive object={scene} />
    </group>
  );
}

// Wrap in React.memo
const InterviewRobot = React.memo(({ isSpeaking, isListening, isCodeOpen, getAudioFrequency }) => {
  const [degraded, setDegraded] = useState(false);

  return (
    <div className="w-full h-full relative">
      <Canvas 
        shadows={!degraded} 
        camera={{ position: [0, 0, 3.8], fov: 35 }}
        dpr={degraded ? 1 : [1, 2]}
        gl={{ antialias: !degraded, powerPreference: "high-performance" }}
      >
        <PerformanceMonitor onDecline={() => setDegraded(true)} />
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight position={[2, 5, 5]} intensity={1.5} color="#ffffff" castShadow={!degraded} />
        <Environment preset="city" />
        
        <RobotRig 
          isSpeaking={isSpeaking} 
          isListening={isListening} 
          isCodeOpen={isCodeOpen}
          getAudioFrequency={getAudioFrequency} 
        />
        
        {!degraded && (
          <ContactShadows position={[0, -1.8, 0]} opacity={0.5} color="#000000" scale={5} blur={2} far={2.5} />
        )}

        {/* Phase 5: Cinematic Post-Processing */}
        {!degraded && (
          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
            <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.002, 0.002]} />
            <DepthOfField focusDistance={0.05} focalLength={0.1} bokehScale={2} height={480} />
            <Noise opacity={0.04} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
});

export default InterviewRobot;

 
console.log(typeof useMemo !== "undefined" ? useMemo : "");
