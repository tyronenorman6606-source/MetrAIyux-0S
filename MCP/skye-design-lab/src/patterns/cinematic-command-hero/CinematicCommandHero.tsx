import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { motion } from 'motion/react';
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles } from 'lucide-react';
import * as THREE from 'three';
import './cinematic-command-hero.css';

type HeroProps = {
  label?: string;
  title: string;
  body: string;
  primaryAction?: string;
  secondaryAction?: string;
  proof?: string[];
};

function CommandParticles() {
  const ref = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const count = typeof window !== 'undefined' && window.innerWidth < 760 ? 360 : 720;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = ['#f4c75b', '#7ee7ff', '#8b5cf6'].map((color) => new THREE.Color(color));

    for (let index = 0; index < count; index += 1) {
      const radius = 1.2 + Math.random() * 3.3;
      const angle = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 2.6;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
      const color = palette[index % palette.length];
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.075 + pointer.x * 0.1;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.22) * 0.09 + pointer.y * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[particles.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.018} transparent opacity={0.82} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function CommandCore() {
  return (
    <Canvas dpr={[1, 1.25]} performance={{ min: 0.65 }}>
      <PerspectiveCamera makeDefault position={[0, 0, 5.4]} fov={42} />
      <color attach="background" args={['#050507']} />
      <ambientLight intensity={0.52} />
      <pointLight position={[2.5, 2.8, 2.2]} intensity={2.9} color="#f4c75b" />
      <pointLight position={[-2.8, -1.2, 2]} intensity={1.8} color="#7ee7ff" />
      <Suspense fallback={null}>
        <Stars radius={8} depth={8} count={700} factor={2.5} saturation={0} fade speed={0.32} />
        <CommandParticles />
        <Float speed={1.25} rotationIntensity={0.28} floatIntensity={0.42}>
          <mesh>
            <icosahedronGeometry args={[1.05, 2]} />
            <meshStandardMaterial color="#151522" metalness={0.72} roughness={0.2} emissive="#10182a" emissiveIntensity={0.55} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.58, 0.012, 16, 180]} />
            <meshBasicMaterial color="#f4c75b" transparent opacity={0.88} />
          </mesh>
          <mesh rotation={[Math.PI / 2.32, 0.42, 0.18]}>
            <torusGeometry args={[1.95, 0.008, 16, 180]} />
            <meshBasicMaterial color="#7ee7ff" transparent opacity={0.48} />
          </mesh>
        </Float>
      </Suspense>
      <EffectComposer>
        <Bloom intensity={0.72} luminanceThreshold={0.22} luminanceSmoothing={0.7} />
        <Vignette offset={0.18} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  );
}

export function CinematicCommandHero({
  label = 'SKYE-OPS // COMMAND SURFACE',
  title,
  body,
  primaryAction = 'Request access',
  secondaryAction = 'View proof',
  proof = ['Design MCP loaded', 'No-frankenstein policy active', 'Browser QA required']
}: HeroProps) {
  return (
    <section className="skye-hero">
      <div className="skye-hero__header">
        <p>{label}</p>
        <h1>{title}</h1>
        <div className="skye-hero__row">
          <span>{body}</span>
          <div className="skye-hero__actions">
            <a href="#access">{primaryAction}<ArrowRight size={17} /></a>
            <a href="#proof">{secondaryAction}<ShieldCheck size={17} /></a>
          </div>
        </div>
      </div>

      <motion.div className="skye-hero__stage" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <CommandCore />
        <div className="skye-hero__glass">
          <Sparkles size={18} />
          <strong>Living command field</strong>
          <span>WebGL is the subject, not decoration.</span>
        </div>
        <div className="skye-hero__proof">
          {proof.map((item) => (
            <span key={item}><BadgeCheck size={16} />{item}</span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
