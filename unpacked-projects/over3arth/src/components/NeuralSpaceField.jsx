import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Line, PerspectiveCamera, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

import { neuralSpaceLanes } from '../data/neuralSpacePro.js';

const CONNECTIONS = [
  ['chat', 'knowledge'],
  ['chat', 'runtime'],
  ['chat', 'research'],
  ['knowledge', 'map'],
  ['runtime', 'build'],
  ['build', 'handoff'],
  ['research', 'handoff'],
  ['handoff', 'map']
];

function NeuralLaneConstellation({ activeLaneId, charge, brainTarget, travelPulse }) {
  const groupRef = useRef(null);
  const activeLane = neuralSpaceLanes.find((lane) => lane.id === activeLaneId) || neuralSpaceLanes[0];
  const lanePositions = useMemo(() => {
    const entries = neuralSpaceLanes.map((lane) => [lane.id, new THREE.Vector3(...lane.position)]);
    return Object.fromEntries(entries);
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();
    const pulse = travelPulse * 0.012;
    groupRef.current.rotation.y = Math.sin(time * 0.18) * 0.09 + pointer.x * 0.07 + pulse;
    groupRef.current.rotation.x = Math.cos(time * 0.16) * 0.035 - pointer.y * 0.035;
    groupRef.current.position.x = pointer.x * 0.18;
    groupRef.current.position.y = pointer.y * 0.08;
  });

  return (
    <group ref={groupRef}>
      <Line
        points={[[-2.4, 0, -1.9], [0, 0.1, -2.7], [2.35, -0.08, -1.9]]}
        color={activeLane.color}
        transparent
        opacity={0.11}
        lineWidth={0.65}
      />
      {CONNECTIONS.map(([from, to]) => {
        const isActive = from === activeLane.id || to === activeLane.id;
        return (
          <Line
            key={`${from}-${to}`}
            points={[lanePositions[from], lanePositions[to]]}
            color={isActive ? activeLane.color : '#61f6ff'}
            transparent
            opacity={isActive ? 0.22 : 0.055}
            lineWidth={isActive ? 0.82 : 0.38}
          />
        );
      })}
      {neuralSpaceLanes.map((lane, index) => {
        const isActive = lane.id === activeLane.id;
        const scale = isActive ? 0.92 : 0.62;
        const opacity = isActive ? 0.62 : 0.22;
        return (
          <Float
            key={lane.id}
            speed={isActive ? 1.65 : 0.9}
            rotationIntensity={isActive ? 0.42 : 0.16}
            floatIntensity={isActive ? 0.55 : 0.24}
          >
            <mesh position={lane.position} scale={scale + (charge / 100) * 0.12}>
              <icosahedronGeometry args={[isActive ? 0.09 : 0.05, 1]} />
              <meshBasicMaterial color={lane.color} transparent opacity={opacity} toneMapped={false} />
            </mesh>
            <mesh position={[lane.position[0], lane.position[1], lane.position[2] + 0.015]} scale={scale * 1.8}>
              <octahedronGeometry args={[isActive ? 0.085 : 0.046, 0]} />
              <meshBasicMaterial
                color={brainTarget === 'overearth' ? '#f4c75b' : lane.color}
                wireframe
                transparent
                opacity={isActive ? 0.2 : 0.08 + index * 0.004}
                toneMapped={false}
              />
            </mesh>
          </Float>
        );
      })}
    </group>
  );
}

export default function NeuralSpaceField({ activeLaneId = 'chat', charge = 50, brainTarget = 'vessel', travelPulse = 0 }) {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="neuralspace-field" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        frameloop={reduceMotion ? 'demand' : 'always'}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.4]} fov={42} />
        <Stars radius={5.2} depth={2.4} count={reduceMotion ? 80 : 190} factor={1.2} saturation={0} fade speed={reduceMotion ? 0 : 0.18} />
        <NeuralLaneConstellation activeLaneId={activeLaneId} charge={charge} brainTarget={brainTarget} travelPulse={travelPulse} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.52} luminanceThreshold={0.18} luminanceSmoothing={0.34} mipmapBlur />
          <Vignette offset={0.34} darkness={0.44} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
