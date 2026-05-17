import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { motion } from 'framer-motion';
import { Cpu, Gauge, SlidersHorizontal } from 'lucide-react';
import { useRef } from 'react';
import * as THREE from 'three';
import './spatial-product-lab.css';

function ProductCore() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.22 + pointer.x * 0.28;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.4) * 0.08 + pointer.y * 0.18;
  });

  return (
    <Float speed={0.8} floatIntensity={0.22} rotationIntensity={0.1}>
      <group ref={ref}>
        <mesh>
          <icosahedronGeometry args={[1.25, 1]} />
          <meshStandardMaterial color="#e8e0ce" metalness={0.86} roughness={0.2} emissive="#223332" emissiveIntensity={0.25} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.1, 0.015, 12, 112]} />
          <meshBasicMaterial color="#72f7c8" transparent opacity={0.72} />
        </mesh>
        <mesh rotation={[1.2, 0.4, 0.8]}>
          <torusGeometry args={[2.65, 0.01, 12, 112]} />
          <meshBasicMaterial color="#d2a84d" transparent opacity={0.54} />
        </mesh>
      </group>
    </Float>
  );
}

export function SpatialProductLab() {
  return (
    <section className="spatial-lab">
      <div className="spatial-lab__scene">
        <Canvas dpr={[1, 1.25]} camera={{ position: [0, 0, 6], fov: 38 }}>
          <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={38} />
          <color attach="background" args={['#06100e']} />
          <ambientLight intensity={0.45} />
          <pointLight position={[2.8, 3, 3]} intensity={3.6} color="#72f7c8" />
          <pointLight position={[-2.6, -1.8, 2.4]} intensity={2.2} color="#d2a84d" />
          <ProductCore />
          <EffectComposer>
            <Bloom intensity={0.32} luminanceThreshold={0.28} />
            <Vignette offset={0.18} darkness={0.72} />
          </EffectComposer>
        </Canvas>
      </div>
      <motion.div className="spatial-lab__copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}>
        <p>Spatial product lab</p>
        <h1>Let the buyer inspect the system, not just read claims.</h1>
        <div className="spatial-lab__controls">
          <span><SlidersHorizontal /> Modes</span>
          <span><Gauge /> Live metrics</span>
          <span><Cpu /> System core</span>
        </div>
      </motion.div>
    </section>
  );
}
