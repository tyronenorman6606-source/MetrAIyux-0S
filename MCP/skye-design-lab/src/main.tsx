import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  BadgeCheck,
  Boxes,
  Code2,
  FileSearch,
  Gauge,
  GitBranch,
  MonitorPlay,
  Layers3,
  Palette,
  Route,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  TriangleAlert,
  Wrench,
  type LucideIcon
} from 'lucide-react';
import * as THREE from 'three';
import './styles.css';

gsap.registerPlugin(ScrollTrigger);

const stack = ['Three/R3F', 'Drei', 'Postprocessing', 'GSAP', 'Lenis', 'Framer Motion'];
const requiredRecipes = [
  'skyesol-living-background',
  'neon-motion-chrome',
  'gsap-lenis-scroll-stage',
  'three-r3f-shader-scene',
  'editorial-proof-atlas',
  'spatial-product-lab',
  'kinetic-process-funnel',
  'actual-surface-screenshot-stage',
  'actual-surface-video-reel'
];
const designEngines = [
  {
    id: 'editorial-proof-atlas',
    title: 'Editorial Proof Atlas',
    palette: 'Ivory / ink / red',
    motion: 'Sparse reveal',
    proof: 'Screenshots + receipts',
    pattern: 'editorial-proof-atlas'
  },
  {
    id: 'spatial-product-lab',
    title: 'Spatial Product Lab',
    palette: 'Deep green / gold',
    motion: 'Pointer-reactive WebGL',
    proof: 'Spec chips + live surface',
    pattern: 'spatial-product-lab'
  },
  {
    id: 'kinetic-process-funnel',
    title: 'Kinetic Process Funnel',
    palette: 'Black / metal / cyan',
    motion: 'GSAP + Lenis stages',
    proof: 'Workflow receipts',
    pattern: 'kinetic-process-funnel'
  },
  {
    id: 'app-operating-surface',
    title: 'App Operating Surface',
    palette: 'OS neutral + accent',
    motion: 'Interface state changes',
    proof: 'Actual app shell',
    pattern: 'app-first-command-center'
  }
];
const diagnosis = [
  ['Real', 'The lab imports and runs R3F, Drei, postprocessing, GSAP, Lenis, Framer Motion, Three, and Lucide.', BadgeCheck],
  ['Upgraded', 'The MCP now has a variety planner, design DNA fields, and multiple pattern-pack families instead of one command-scene lane.', Wrench],
  ['Gate', 'Every build should record archetype, palette, visual subject, motion language, proof format, and browser QA paths.', TriangleAlert],
  ['Proof', 'Screenshots exist in public assets, and workflow claims still need Playwright/ffmpeg video proof when the page says the product does something.', MonitorPlay]
] as const;

function LivingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canvas || reduceMotion) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const palette = ['rgba(244,199,91,', 'rgba(39,242,255,', 'rgba(138,99,255,', 'rgba(232,76,48,'];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let width = 0;
    let height = 0;
    let raf = 0;
    let particles: Array<{ x: number; y: number; r: number; a: number; s: number; phase: number; color: string }> = [];

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(window.innerWidth < 760 ? 72 : 132, Math.max(54, Math.floor((width * height) / 15000)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.7 + 0.35,
        a: Math.random() * 0.3 + 0.1,
        s: Math.random() * 0.32 + 0.08,
        phase: Math.random() * Math.PI * 2,
        color: palette[index % palette.length]
      }));
    };

    const drawWave = (time: number, yOffset: number, colorA: string, colorB: string, amp: number, speed: number) => {
      const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
      gradient.addColorStop(0, colorA);
      gradient.addColorStop(0.52, colorB);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let xPos = 0; xPos <= width; xPos += 18) {
        const n = Math.sin(xPos * 0.006 + time * speed) * amp;
        const n2 = Math.cos(xPos * 0.011 - time * speed * 0.7) * amp * 0.46;
        ctx.lineTo(xPos, yOffset + n + n2);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    const animate = (now: number) => {
      const t = now * 0.001;
      pointer.x += (pointer.tx - pointer.x) * 0.035;
      pointer.y += (pointer.ty - pointer.y) * 0.035;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';
      drawWave(t, height * 0.26 + pointer.y * 16, 'rgba(138,99,255,0)', 'rgba(138,99,255,.12)', 38, 0.34);
      drawWave(t, height * 0.56 - pointer.y * 14, 'rgba(39,242,255,0)', 'rgba(39,242,255,.09)', 46, 0.24);
      drawWave(t, height * 0.84, 'rgba(244,199,91,0)', 'rgba(244,199,91,.08)', 30, 0.28);
      particles.forEach((particle) => {
        const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 12;
        const py = particle.y + Math.cos(t * particle.s * 0.8 + particle.phase) * 18 + pointer.y * 9;
        ctx.beginPath();
        ctx.arc(px, py, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = `${particle.color}${particle.a})`;
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.tx = (event.clientX / Math.max(width, 1) - 0.5) * 2;
      pointer.ty = (event.clientY / Math.max(height, 1) - 0.5) * 2;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="living-field" aria-hidden="true" />;
}

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

function MotionChrome() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 180, damping: 32 });
  const scanShift = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <>
      <motion.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <motion.div className="scanline-field" style={{ backgroundPositionX: scanShift }} aria-hidden="true" />
    </>
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
      <a href="#top" className="brand" aria-label="Skye Design Lab">
        <img src="/assets/skyes-over-london-deity-logo.png" alt="" />
        <strong>Skye Design Lab</strong>
      </a>
      <nav aria-label="Preview sections">
        <a href="#diagnosis">Diagnosis</a>
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
        <p>QuantumSkyes MCP design control room</p>
        <h1><span className="glow-text">Useful lab</span>, not package theater.</h1>
        <span>
          This surface now shows what the MCP actually requires: living background, real stack imports, pattern receipts, proof assets, and browser QA before anything ships.
        </span>
        <div className="actions">
          <a href="#diagnosis">Open the diagnosis</a>
          <a href="#patterns">Inspect recipes</a>
        </div>
      </div>
      <motion.aside className="hero-proof" initial={{ opacity: 0, x: 34 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
        <BadgeCheck />
        <strong>MCP receipt read</strong>
        <span>Current mine found 12 resources, 21 tools, 27 calls, and two failing audit calls. The lab is real, but its packaging needed a sharper control surface.</span>
      </motion.aside>
    </section>
  );
}

function DiagnosisSection() {
  return (
    <section className="diagnosis-section" id="diagnosis">
      <div className="section-heading">
        <p>Is the lab bullshit?</p>
        <h2><span className="neon-text">Not empty.</span> But it needed to stop hiding the verdict.</h2>
      </div>
      <div className="diagnosis-grid">
        {diagnosis.map(([title, body, Icon], index) => {
          const DiagnosisIcon = Icon;
          return (
            <motion.article className="diagnosis-card neon-magnetic" key={title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1], delay: index * 0.08 }} viewport={{ once: true }}>
              <DiagnosisIcon size={22} />
              <span>{title}</span>
              <p>{body}</p>
            </motion.article>
          );
        })}
      </div>
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
          <motion.article className="stack-card" key={item} initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1], delay: index * 0.08 }} viewport={{ once: true }}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item}</strong>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function PatternSection() {
  const [selected, setSelected] = useState(designEngines[0]);

  return (
    <section className="pattern-section" id="patterns">
      <div className="section-heading">
        <p>MCP design-generation infrastructure</p>
        <h2>The lab now exposes different design engines, not one house style.</h2>
      </div>
      <div className="engine-console">
        <div className="engine-list" role="tablist" aria-label="Design engines">
          {designEngines.map((engine) => (
            <button
              className={selected.id === engine.id ? 'active' : ''}
              key={engine.id}
              type="button"
              onClick={() => setSelected(engine)}
            >
              <span>{engine.title}</span>
              <small>{engine.pattern}</small>
            </button>
          ))}
        </div>
        <motion.div className="engine-dna" key={selected.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}>
          <div>
            <Palette size={18} />
            <span>Palette</span>
            <strong>{selected.palette}</strong>
          </div>
          <div>
            <Route size={18} />
            <span>Motion</span>
            <strong>{selected.motion}</strong>
          </div>
          <div>
            <MonitorPlay size={18} />
            <span>Proof</span>
            <strong>{selected.proof}</strong>
          </div>
          <div>
            <FileSearch size={18} />
            <span>Pattern pack</span>
            <strong>{selected.pattern}</strong>
          </div>
        </motion.div>
      </div>
      <div className="recipe-board">
        {requiredRecipes.map((recipe, index) => (
          <motion.article className="recipe-row" key={recipe} whileHover={{ x: 8 }}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{recipe}</strong>
            <FileSearch size={18} />
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
      <LivingBackground />
      <MotionChrome />
      <CursorTrail />
      <TopNav />
      <main>
        <Hero />
        <DiagnosisSection />
        <StackSection />
        <PatternSection />
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
