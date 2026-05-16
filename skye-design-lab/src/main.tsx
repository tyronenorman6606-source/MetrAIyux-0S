import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  BadgeCheck,
  Boxes,
  Code2,
  Gauge,
  GitBranch,
  Layers3,
  Orbit,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  type LucideIcon
} from 'lucide-react';
import * as THREE from 'three';
import './styles.css';

gsap.registerPlugin(ScrollTrigger);

const stack = ['Three/R3F', 'Drei', 'Postprocessing', 'GSAP', 'Lenis', 'Framer Motion'];

function CursorTrail() {
  const x = useMotionValue(-120);
  const y = useMotionValue(-120);
  const springX = useSpring(x, { stiffness: 520, damping: 34, mass: 0.22 });
  const springY = useSpring(y, { stiffness: 520, damping: 34, mass: 0.22 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      x.set(event.clientX - 18);
      y.set(event.clientY - 18);
      setActive(true);
    };
    const leave = () => setActive(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerleave', leave);
    };
  }, [x, y]);

  return (
    <motion.div
      className="cursor-trail"
      aria-hidden="true"
      style={{ x: springX, y: springY }}
      animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.82 }}
    />
  );
}

function ParticleCrown() {
  const ref = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const count = typeof window !== 'undefined' && window.innerWidth < 700 ? 320 : 640;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = ['#f4c75b', '#27f2ff', '#8a63ff', '#e84c30'].map((color) => new THREE.Color(color));

    for (let i = 0; i < count; i += 1) {
      const ring = i / count;
      const radius = 1.4 + ring * 3.8 + Math.random() * 0.72;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2.2 + Math.sin(angle * 3) * 0.18;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      const color = palette[i % palette.length];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.06 + pointer.x * 0.12;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.18) * 0.08 + pointer.y * 0.08;
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

function CommandRelic() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.18 + pointer.x * 0.18;
    group.current.rotation.x = Math.sin(clock.elapsedTime * 0.36) * 0.12 + pointer.y * 0.1;
  });

  return (
    <Float speed={0.9} rotationIntensity={0.12} floatIntensity={0.26}>
      <group ref={group}>
        <mesh>
          <dodecahedronGeometry args={[1.05, 1]} />
          <meshStandardMaterial color="#191927" metalness={0.92} roughness={0.18} emissive="#151b32" emissiveIntensity={0.68} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.78, 0.014, 12, 96]} />
          <meshBasicMaterial color="#f4c75b" transparent opacity={0.95} />
        </mesh>
        <mesh rotation={[1.18, 0.34, 0.8]}>
          <torusGeometry args={[2.18, 0.01, 12, 96]} />
          <meshBasicMaterial color="#27f2ff" transparent opacity={0.58} />
        </mesh>
        <mesh rotation={[2.12, -0.42, 0.2]}>
          <torusGeometry args={[2.62, 0.007, 12, 96]} />
          <meshBasicMaterial color="#e84c30" transparent opacity={0.38} />
        </mesh>
      </group>
    </Float>
  );
}

function SpectacleScene() {
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 700;
  const [enableEffects, setEnableEffects] = useState(false);

  useEffect(() => {
    if (isCompact) return undefined;
    const timer = window.setTimeout(() => setEnableEffects(true), 2800);
    return () => window.clearTimeout(timer);
  }, [isCompact]);

  return (
    <Canvas dpr={[1, isCompact ? 1 : 1.1]} camera={{ position: [0, 0, 6.2], fov: 38 }} performance={{ min: 0.65 }}>
      <PerspectiveCamera makeDefault position={[0, 0, 6.2]} fov={38} />
      <color attach="background" args={['#030306']} />
      <ambientLight intensity={0.46} />
      <pointLight position={[2.6, 3.2, 2.4]} intensity={4.4} color="#f4c75b" />
      <pointLight position={[-3.2, -1.8, 2.2]} intensity={2.7} color="#27f2ff" />
      <pointLight position={[0, -3, 3]} intensity={1.5} color="#e84c30" />
      <Suspense fallback={null}>
        <Stars radius={9} depth={8} count={isCompact ? 120 : 260} factor={2.1} saturation={0} fade speed={0.16} />
        <ParticleCrown />
        <CommandRelic />
      </Suspense>
      {enableEffects && (
        <EffectComposer>
          <Bloom intensity={0.56} luminanceThreshold={0.2} luminanceSmoothing={0.72} />
          <Vignette offset={0.14} darkness={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

function useScrollChoreography() {
  useLayoutEffect(() => {
    if (window.innerWidth < 700) {
      return undefined;
    }

    let lenis: Lenis | null = null;
    let frame = 0;
    const startLenis = window.setTimeout(() => {
      lenis = new Lenis({ lerp: 0.3, smoothWheel: true, wheelMultiplier: 1.18, touchMultiplier: 1.12 });
      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
      lenis.on('scroll', ScrollTrigger.update);
    }, 1800);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.proof-slide').forEach((slide, index) => {
        gsap.fromTo(
          slide,
          { opacity: 0.28, y: 74, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            scrollTrigger: {
              trigger: slide,
              start: 'top 80%',
              end: 'bottom 45%',
              scrub: true
            }
          }
        );
        gsap.to(`.rail-fill-${index}`, {
          scaleX: 1,
          transformOrigin: 'left',
          scrollTrigger: {
            trigger: slide,
            start: 'top 82%',
            end: 'bottom 46%',
            scrub: true
          }
        });
      });
      gsap.fromTo('.standard-orbit', { rotate: -8 }, {
        rotate: 8,
        scrollTrigger: {
          trigger: '.standard-section',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });

    return () => {
      ctx.revert();
      window.clearTimeout(startLenis);
      if (frame) cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);
}

function TopNav() {
  return (
    <header className="top-nav">
      <a href="#top" className="brand" aria-label="Skye MCP proof preview">
        <span><Orbit size={20} /></span>
        <strong>MCP Quality Preview</strong>
      </a>
      <nav aria-label="Preview sections">
        <a href="#stack">Stack</a>
        <a href="#proof">Proof</a>
        <a href="#gate">Gate</a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-scene" aria-hidden="true">
        <SpectacleScene />
      </div>
      <div className="hero-copy">
        <p>Generated from the fixed Skye Design MCP</p>
        <h1><span className="glow-text">Spectacle</span> or fail.</h1>
        <span>
          The server now requires real pattern packs, real advanced-stack usage, browser proof, and a hard rejection path for repeated dark template work.
        </span>
        <div className="actions">
          <a href="#stack">Inspect the stack</a>
          <a href="#proof">Run the funnel</a>
        </div>
      </div>
      <motion.aside className="hero-proof" initial={{ opacity: 0, x: 34 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
        <BadgeCheck />
        <strong>Preview mandate</strong>
        <span>Three/R3F scene visible in the first viewport. GSAP/Lenis controls the scroll path. Framer Motion animates the interface layer.</span>
      </motion.aside>
    </section>
  );
}

function StackSection() {
  return (
    <section className="stack-section" id="stack">
      <div className="section-heading">
        <p>Open-source stack is actually wired</p>
        <h2><span className="neon-text">No package theater.</span> Source imports or the MCP blocks it.</h2>
      </div>
      <div className="stack-grid">
        {stack.map((item, index) => (
          <motion.article className="stack-card" key={item} initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} viewport={{ once: true }}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item}</strong>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function SurfaceCaptureSection() {
  const shots = [
    ['/assets/proof/mcp-live-hero-desktop.png', 'Live hero WebGL state', 'Desktop hero while the Three/R3F scene is running'],
    ['/assets/proof/mcp-live-stack-desktop.png', 'Open-source stack state', 'Stack section showing the imported open-source libraries'],
    ['/assets/proof/mcp-live-proof-desktop.png', 'Scroll proof state', 'GSAP/Lenis proof tunnel while the scroll system is active'],
    ['/assets/proof/mcp-live-mobile-hero.png', 'Mobile hero state', 'Mobile viewport with the same live scene and controls']
  ];

  return (
    <section className="surface-section">
      <div className="section-heading">
        <p>Actual surface screenshot stage</p>
        <h2>When the product has a real surface, I make the MCP show it doing the thing.</h2>
      </div>
      <div className="surface-stage">
        {shots.map(([src, label, alt], index) => (
          <motion.figure className={`surface-frame surface-frame-${index + 1}`} key={src} whileHover={{ y: -10, rotateX: index % 2 ? -2 : 2, rotateY: index % 2 ? 3 : -3 }}>
            <img src={src} alt={alt} loading="lazy" decoding="async" />
            <figcaption>{label}</figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}

const proofSlides: Array<[string, string, LucideIcon]> = [
  ['Compose', 'MCP picks an art direction and required implementation packs before code is written.', Layers3],
  ['Import', 'Generated source must import the stack it claims: Three, R3F, Drei, postprocessing, GSAP, Lenis, Motion.', Code2],
  ['Validate', 'design_validate rejects repeated templates, internal smoke copy, bad typography, and fake advanced claims.', ShieldCheck],
  ['Audit', 'design_stack_audit fails package-only installs and missing runtime imports.', Gauge],
  ['Screenshot', 'Browser proof at desktop and mobile decides whether the output ships.', TerminalSquare]
];

function ProofTunnel() {
  return (
    <section className="proof-tunnel" id="proof">
      <div className="section-heading wide">
        <p>Interactive scrolling funnel</p>
        <h2>The preview moves because the MCP now demands real motion.</h2>
      </div>
      <div className="proof-slides">
        {proofSlides.map(([title, body, Icon], index) => {
          const ProofIcon = Icon;
          return (
            <article className="proof-slide" key={title}>
              <div className="proof-rail"><span className={`rail-fill rail-fill-${index}`} /></div>
              <ProofIcon size={30} />
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StandardGate() {
  return (
    <section className="standard-section" id="gate">
      <div className="standard-orbit" aria-hidden="true">
        <Sparkles />
        <Boxes />
        <GitBranch />
      </div>
      <div className="section-heading">
        <p>Quality gate</p>
        <h2>Generic is now a failing state.</h2>
      </div>
      <div className="gate-panel">
        {[
          'Distinct first viewport composition',
          'Main visual subject visible without scrolling',
          'Real advanced-stack imports when requested',
          'No repeated dark SaaS/card template',
          'Desktop and mobile browser screenshots before done'
        ].map((item) => (
          <motion.div key={item} whileHover={{ x: 8 }}>
            <BadgeCheck size={18} />
            <span>{item}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function App() {
  useScrollChoreography();

  return (
    <>
      <CursorTrail />
      <TopNav />
      <main>
        <Hero />
        <StackSection />
        <SurfaceCaptureSection />
        <ProofTunnel />
        <StandardGate />
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
