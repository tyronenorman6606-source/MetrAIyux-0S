import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import * as THREE from 'three';

export const universeArtifactEase = [0.16, 1, 0.3, 1];

export const universeArtifactMotion = {
  sideClosed: {
    initial: { opacity: 0, x: -72, y: 16, scale: 0.88, rotateX: 12, rotateY: -24, rotateZ: -1.5 },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, rotateX: 0, rotateY: -12, rotateZ: 0 },
    transition: { duration: 0.78, ease: universeArtifactEase, layout: { duration: 0.78, ease: universeArtifactEase } }
  },
  sideOpen: {
    initial: { opacity: 0.92, x: 0, y: 0, scale: 0.42, rotateX: 18, rotateY: -18, rotateZ: -1.5 },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, rotateZ: 0 },
    transition: { duration: 1.06, ease: universeArtifactEase, layout: { duration: 1.08, ease: universeArtifactEase } }
  }
};

function toColor(value, fallback = '#f4c75b') {
  try {
    return new THREE.Color(value || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

function PocketOrbit({ accent = '#f4c75b', compact = false }) {
  const groupRef = useRef(null);
  const particlesRef = useRef(null);
  const particleData = useMemo(() => {
    const count = compact ? 120 : 220;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [toColor(accent), toColor('#61f6ff'), toColor('#9b5cff')];

    for (let index = 0; index < count; index += 1) {
      const radius = 0.55 + Math.random() * (compact ? 1.05 : 1.75);
      const angle = Math.random() * Math.PI * 2;
      const lift = (Math.random() - 0.5) * (compact ? 0.7 : 1.1);
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = lift;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
      const color = palette[index % palette.length];
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, [accent, compact]);

  useFrame(({ clock, pointer }) => {
    const time = clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.28 + pointer.x * 0.18;
      groupRef.current.rotation.x = Math.sin(time * 0.42) * 0.16 + pointer.y * 0.1;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = -time * 0.12;
      particlesRef.current.rotation.z = Math.sin(time * 0.2) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particleData.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[particleData.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial vertexColors size={compact ? 0.028 : 0.022} transparent opacity={0.82} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[compact ? 0.72 : 1.08, 0.008, 12, 132]} />
        <meshBasicMaterial color={accent} transparent opacity={0.68} />
      </mesh>
      <mesh rotation={[Math.PI / 2.5, 0.32, 0.1]}>
        <torusGeometry args={[compact ? 0.5 : 0.82, 0.006, 12, 132]} />
        <meshBasicMaterial color="#61f6ff" transparent opacity={0.42} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[compact ? 0.16 : 0.24, 1]} />
        <meshStandardMaterial color="#f8f5ff" emissive={accent} emissiveIntensity={0.7} metalness={0.32} roughness={0.18} />
      </mesh>
    </group>
  );
}

export function PocketUniverseScene({
  accent = '#f4c75b',
  compact = false,
  className = '',
  label = 'Contained universe atmosphere'
}) {
  return (
    <div className={`pocket-universe ${className}`} style={{ '--artifact-accent': accent }} aria-label={label} aria-hidden="true">
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 0, compact ? 2.8 : 3.6], fov: compact ? 42 : 38 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.42} />
        <pointLight position={[1.8, 1.6, 2.4]} color={accent} intensity={compact ? 1.1 : 1.55} />
        <pointLight position={[-1.6, -0.9, 1.9]} color="#61f6ff" intensity={compact ? 0.75 : 1.05} />
        <PocketOrbit accent={accent} compact={compact} />
      </Canvas>
      <span className="pocket-universe__scan" />
    </div>
  );
}

export function UniverseArtifact({
  as: Component = motion.section,
  open,
  className = '',
  accent = '#f4c75b',
  motionSource = 'overearth-universe-artifact-v1',
  artifactKind = 'world-artifact',
  motionPreset = universeArtifactMotion.sideClosed,
  style,
  children,
  ...props
}) {
  return (
    <Component
      layout
      className={`world-artifact ${className}`.trim()}
      data-open={open ? 'true' : 'false'}
      data-motion-source={motionSource}
      data-artifact-kind={artifactKind}
      style={{ '--artifact-accent': accent, ...style }}
      initial={motionPreset.initial}
      animate={motionPreset.animate}
      transition={motionPreset.transition}
      {...props}
    >
      {children}
    </Component>
  );
}
