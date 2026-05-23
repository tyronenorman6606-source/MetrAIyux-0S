// MCP3 — The Forge
// New over MCP2: custom GLSL shaderMaterial, MeshTransmissionMaterial,
// MeshReflectorMaterial, @react-spring/three, drei Sparkles + Environment,
// @use-gesture/react, zustand, maath easing, anime.js, Pixi.js v7,
// ChromaticAberration postprocessing.

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import {
  Environment,
  MeshReflectorMaterial,
  MeshTransmissionMaterial,
  OrbitControls,
  PerspectiveCamera,
  Sparkles,
  Stars,
  Text,
  shaderMaterial,
} from '@react-three/drei';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useSpring, a } from '@react-spring/three';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring as useFramerSpring,
  useTransform,
} from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { easing } from 'maath';
import { create } from 'zustand';
import anime from 'animejs';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import {
  Activity,
  Atom,
  Droplets,
  Eye,
  Flame,
  Layers,
  Magnet,
  Orbit,
  Pause,
  Play,
  Sparkle,
  Waves,
  Zap,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// ── Zustand store ──────────────────────────────────────────────────────────
const useForge = create((set) => ({
  activeTool: 'glass',
  setActiveTool: (t) => set({ activeTool: t }),
  motionPaused: false,
  toggleMotion: () => set((s) => ({ motionPaused: !s.motionPaused })),
  shaderIntensity: 0.7,
  roamMode: false,
  toggleRoam: () => set((s) => ({ roamMode: !s.roamMode })),
  mode: 'refined',
  toggleMode: () => set((s) => ({ mode: s.mode === 'refined' ? 'raw' : 'refined' })),
}));

function useLowPowerRenderer() {
  const [lowPower, setLowPower] = useState(true);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setLowPower(true);
      return;
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const vendor = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '')
      : '';
    const signature = `${renderer} ${vendor}`.toLowerCase();

    const isSoftwareRenderer =
      signature.includes('swiftshader') ||
      signature.includes('llvmpipe') ||
      signature.includes('software') ||
      signature.includes('mesa offscreen');

    setLowPower(isSoftwareRenderer);
  }, []);

  return lowPower;
}

// ── GlitchText — character-level glitch, word-safe line wrapping ──────────
function GlitchText({ children, tag: Tag = 'span', className = '' }) {
  const str = String(children);
  const words = str.split(' ');
  const wordData = useMemo(
    () => words.map((word) =>
      word.split('').map(() => ({
        d: (Math.random() * 3.4).toFixed(2),
        o: (Math.random() * 7 - 3.5).toFixed(1),
      }))
    ),
    [str] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <Tag className={`glitch-text ${className}`} aria-label={str}>
      {words.map((word, wi) => (
        <React.Fragment key={wi}>
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {word.split('').map((c, ci) => (
              <span
                key={ci}
                className="glitch-char"
                style={{ '--gd': `${wordData[wi]?.[ci]?.d ?? 0}s`, '--go': `${wordData[wi]?.[ci]?.o ?? 0}px` }}
              >
                {c}
              </span>
            ))}
          </span>
          {wi < words.length - 1 && ' '}
        </React.Fragment>
      ))}
    </Tag>
  );
}


// ── GooeyFilter — SVG filter definitions for morphing blobs ───────────────
function GooeyFilter() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'fixed', pointerEvents: 'none', zIndex: -1 }}
      aria-hidden="true"
    >
      <defs>
        <filter id="forge-gooey" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
        <filter id="forge-gooey-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -6"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

// ── KineticWordmark — GSAP letter-by-letter 3D reveal ─────────────────────
function KineticWordmark() {
  const ref = useRef();

  useEffect(() => {
    const chars = ref.current?.querySelectorAll('.wm-char');
    if (!chars?.length) return;

    const tl = gsap.timeline({ delay: 0.25 });
    gsap.set(chars, { opacity: 1 });
    tl.fromTo(
      chars,
      { y: 48, rotateX: -55, filter: 'blur(10px)' },
      {
        y: 0,
        opacity: 1,
        rotateX: 0,
        filter: 'blur(0px)',
        stagger: 0.048,
        duration: 1.15,
        ease: 'expo.out',
        immediateRender: false,
      }
    ).add(() => {
      gsap.to(chars, {
        y: (i) => Math.sin(i * 0.95) * 5,
        repeat: -1,
        yoyo: true,
        duration: 2.4,
        ease: 'sine.inOut',
        stagger: { each: 0.09, repeat: -1, yoyo: true },
      });
    });

    return () => tl.kill();
  }, []);

  return (
    <h1 ref={ref} className="kinetic-wordmark" aria-label="SKRUCIBLE">
      {'SKRUCIBLE'.split('').map((c, i) => (
        <span key={i} className="wm-char" style={{ '--i': i }}>
          {c === ' ' ? ' ' : c}
        </span>
      ))}
    </h1>
  );
}

// ── Tool definitions ───────────────────────────────────────────────────────
const FORGE_TOOLS = [
  {
    id: 'glass',
    label: 'Glass',
    icon: Droplets,
    color: '#b47dff',
    desc: 'MeshTransmissionMaterial — real-time glass refraction, chromatic aberration, IOR, temporal distortion. Drag the orb to rotate.',
  },
  {
    id: 'plasma',
    label: 'Plasma',
    icon: Zap,
    color: '#ff6b35',
    desc: 'Custom GLSL shaderMaterial — plasma field driven by uTime and uMouse uniforms, wired via extend() and shaderMaterial() from Drei.',
  },
  {
    id: 'spring',
    label: 'Spring',
    icon: Orbit,
    color: '#7dd3fc',
    desc: '@react-spring/three — physics spring animation integrated directly into React Three Fiber. Hover crystals to fire springs.',
  },
  {
    id: 'pixel',
    label: 'Pixel',
    icon: Layers,
    color: '#8ff0a4',
    desc: 'Pixi.js v7 — 2D GPU canvas overlay. Move cursor over the viewport to generate particle trails.',
  },
  {
    id: 'motion',
    label: 'Motion',
    icon: Atom,
    color: '#f4c75b',
    desc: 'Anime.js — DOM/SVG timeline animation with staggered 3D letter reveals and sequenced looping morphing.',
  },
  {
    id: 'physics',
    label: 'Physics',
    icon: Magnet,
    color: '#c8c4ff',
    desc: 'Rapier WASM rigid-body physics inside R3F — real gravity, restitution, collision events. Click to spawn.',
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: Waves,
    color: '#8ff0a4',
    desc: 'Tone.js PolySynth + FFT analyser — audio-reactive bloom, waveform visualiser. Click pads to synthesize.',
  },
];

const SCROLL_BEATS = [
  { id: 'wield',   label: 'Wield',   tool: 'glass' },
  { id: 'forge',   label: 'Forge',   tool: 'plasma' },
  { id: 'collide', label: 'Collide', tool: 'spring' },
  { id: 'render',  label: 'Render',  tool: 'pixel' },
  { id: 'morph',   label: 'Morph',   tool: 'motion' },
  { id: 'fall',    label: 'Fall',    tool: 'physics' },
  { id: 'pulse',   label: 'Pulse',   tool: 'audio' },
];

// ── Plasma GLSL shaderMaterial ─────────────────────────────────────────────
const PlasmaMaterial = shaderMaterial(
  {
    uTime: 0,
    uIntensity: 0.7,
    uMouse: new THREE.Vector2(0.5, 0.5),
  },
  `varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,
  `uniform float uTime;
   uniform float uIntensity;
   uniform vec2 uMouse;
   varying vec2 vUv;
   #define PI 3.14159265358979
   void main() {
     vec2 uv = vUv - 0.5;
     vec2 m = uMouse - 0.5;
     float t = uTime * 0.28;
     float v = sin(uv.x * 10.0 + t) * 0.5
             + sin(uv.y * 8.0 + t * 1.1) * 0.5
             + sin((uv.x + uv.y) * 7.0 + t * 0.92) * 0.5
             + sin(length(uv) * 14.0 - t * 1.5) * 0.5
             + sin(length(uv - m) * 18.0 - t * 2.1) * 0.3;
     vec3 c1 = vec3(0.706, 0.490, 1.0);
     vec3 c2 = vec3(0.490, 0.831, 1.0);
     vec3 c3 = vec3(1.0, 0.420, 0.208);
     float s = sin(v * PI) * 0.5 + 0.5;
     float cs = cos(v * PI * 0.7) * 0.5 + 0.5;
     vec3 color = c1 * s + c2 * cs * (1.0 - s) + c3 * (1.0 - s) * (1.0 - cs) * 0.7;
     color *= uIntensity * 0.55;
     gl_FragColor = vec4(color, 0.72 * uIntensity);
   }`
);
extend({ PlasmaMaterial });

// ── PlasmaBackdrop ─────────────────────────────────────────────────────────
function PlasmaBackdrop({ active }) {
  const matRef = useRef();
  const { shaderIntensity } = useForge();

  useFrame(({ clock, pointer }) => {
    if (!matRef.current) return;
    matRef.current.uTime = clock.elapsedTime;
    matRef.current.uMouse.set(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5);
    easing.damp(matRef.current, 'uIntensity', active ? shaderIntensity : 0.22, 0.35, 0.016);
  });

  return (
    <mesh position={[0, 0, -5.5]} scale={[22, 15, 1]}>
      <planeGeometry args={[1, 1]} />
      <plasmaMaterial
        key={PlasmaMaterial.key}
        ref={matRef}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ── GlassOrb (MeshTransmissionMaterial + @react-spring/three drag) ─────────
function GlassOrb({ tool }) {
  const orbRef = useRef();
  const dragStart = useRef(null);
  const visible = tool === 'glass';

  const [{ scale }, api] = useSpring(() => ({
    scale: 1,
    config: { tension: 220, friction: 18 },
  }));

  useEffect(() => {
    api.start({ scale: visible ? 1 : 0.28 });
  }, [visible, api]);

  useFrame(({ clock }) => {
    if (!orbRef.current || dragStart.current) return;
    orbRef.current.rotation.y = clock.elapsedTime * 0.07;
    orbRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.28) * 0.05;
  });

  return (
    <a.mesh
      ref={orbRef}
      scale={scale}
      onPointerDown={(e) => {
        e.stopPropagation();
        dragStart.current = {
          x: e.clientX,
          y: e.clientY,
          rx: orbRef.current.rotation.x,
          ry: orbRef.current.rotation.y,
        };
        document.body.style.cursor = 'grabbing';
        api.start({ scale: 0.9, config: { tension: 300 } });
      }}
      onPointerMove={(e) => {
        if (!dragStart.current || !orbRef.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        orbRef.current.rotation.y = dragStart.current.ry + dx * 0.013;
        orbRef.current.rotation.x = dragStart.current.rx + dy * 0.013;
      }}
      onPointerUp={() => {
        dragStart.current = null;
        document.body.style.cursor = '';
        api.start({ scale: 1, config: { tension: 220, friction: 18 } });
      }}
      onPointerLeave={() => {
        if (dragStart.current) {
          dragStart.current = null;
          document.body.style.cursor = '';
          api.start({ scale: 1 });
        }
      }}
    >
      <sphereGeometry args={[1.15, 64, 64]} />
      <MeshTransmissionMaterial
        samples={1}
        resolution={64}
        transmission={1}
        roughness={0.08}
        thickness={1.1}
        ior={1.35}
        chromaticAberration={0.02}
        anisotropy={0.12}
        distortion={0.08}
        distortionScale={0.08}
        temporalDistortion={0.04}
        color="#c0a0ff"
        attenuationColor="#7dd3fc"
        attenuationDistance={0.8}
      />
    </a.mesh>
  );
}

// ── Spring crystals (@react-spring/three) ─────────────────────────────────
const CRYSTAL_DATA = [
  { pos: [-3.0, 0.4, -0.5], color: '#b47dff', delay: 0 },
  { pos: [3.2, 0.6, -0.8], color: '#7dd3fc', delay: 80 },
  { pos: [-2.0, -0.6, 1.2], color: '#b47dff', delay: 160 },
  { pos: [2.4, -0.8, 1.0], color: '#8ff0a4', delay: 240 },
  { pos: [0, 2.2, -1.5], color: '#f4c75b', delay: 320 },
  { pos: [-3.8, 0.2, 0.8], color: '#7dd3fc', delay: 400 },
  { pos: [3.6, 0.1, 0.6], color: '#b47dff', delay: 480 },
  { pos: [-1.2, -1.5, -0.8], color: '#ff6b35', delay: 60 },
];

function Crystal({ pos, color, delay, active }) {
  const matRef = useRef();
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  const { scale } = useSpring({
    scale: active ? (hovered ? 1.65 : 1.1) : 0.3,
    delay,
    config: { tension: 160, friction: 14 },
  });

  const targetEmissive = hovered ? 3.5 : active ? 1.4 : 0.2;

  useFrame((_, delta) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity +=
      (targetEmissive - matRef.current.emissiveIntensity) * Math.min(delta * 6, 1);
    if (meshRef.current && active && !hovered) {
      meshRef.current.rotation.y += delta * 0.55;
    }
  });

  return (
    <a.mesh
      ref={meshRef}
      position={pos}
      scale={scale}
      onPointerEnter={() => {
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      <octahedronGeometry args={[0.38, 0]} />
      <meshStandardMaterial
        ref={matRef}
        color={colorObj}
        metalness={0.86}
        roughness={0.07}
        emissive={colorObj}
        emissiveIntensity={0.2}
      />
    </a.mesh>
  );
}

// ── MeshReflectorMaterial floor ────────────────────────────────────────────
function ForgeFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial
        color="#060418"
        metalness={0.42}
        roughness={0.82}
        emissive="#100722"
        emissiveIntensity={0.18}
      />
    </mesh>
  );
}

// ── Forge scene (Canvas) ───────────────────────────────────────────────────
function ForgeScene({ tool, motionPaused, roamMode }) {
  return (
    <Canvas
      className="forge-canvas"
      dpr={[0.75, 1]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={motionPaused ? 'never' : 'always'}
      onCreated={({ gl }) => gl.setClearColor('#04030a', 0)}
    >
      <PerspectiveCamera makeDefault position={[0, 1.2, 6.2]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enablePan={roamMode}
        enableZoom
        minDistance={3.5}
        maxDistance={11}
        maxPolarAngle={roamMode ? Math.PI : Math.PI * 0.76}
        rotateSpeed={roamMode ? 1.4 : 0.28}
      />

      <ambientLight intensity={0.28} />
      <pointLight position={[0, 4, 0]} intensity={3.2} color="#b47dff" />
      <spotLight
        position={[4, 6, 4]}
        angle={0.4}
        penumbra={0.72}
        intensity={2.2}
        color="#7dd3fc"
      />
      <spotLight
        position={[-4, 3, 2]}
        angle={0.5}
        penumbra={0.82}
        intensity={1.6}
        color="#ff6b35"
      />

      <Suspense fallback={null}>
        <Environment preset="city" />
        <PlasmaBackdrop active={tool === 'plasma'} />
        <Stars radius={40} depth={30} count={90} factor={2.1} fade speed={0.12} />
        <ForgeFloor />

        <GlassOrb tool={tool} />

        <Sparkles
          count={18}
          scale={[6, 4.5, 6]}
          size={[0.4, 1.9]}
          speed={0.32}
          noise={0.22}
          color="#b47dff"
        />

        {CRYSTAL_DATA.map((c, i) => (
          <Crystal
            key={i}
            pos={c.pos}
            color={c.color}
            delay={c.delay}
            active={tool === 'spring'}
          />
        ))}

        <Text
          position={[0, -1.38, 0]}
          color="#eef0ff"
          fontSize={0.15}
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.35}
          outlineWidth={0.003}
          outlineColor="#04030a"
        >
          {`${tool.toUpperCase()} FORGE`}
        </Text>
      </Suspense>

      <EffectComposer multisampling={0}>
        <Bloom intensity={1.3} luminanceThreshold={0.13} luminanceSmoothing={0.52} />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.0022, 0.0022]}
        />
        <Noise opacity={0.026} />
        <Vignette eskil={false} offset={0.14} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  );
}

// ── Pixi.js v7 2D GPU canvas overlay ──────────────────────────────────────
function PixiPanel({ active }) {
  const containerRef = useRef();

  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    let app = null;
    const particles = [];
    const MAX_PARTICLES = 90;
    const mouse = { x: 0, y: 0 };
    const COLORS_HEX = [0xb47dff, 0x7dd3fc, 0x8ff0a4, 0xff6b35, 0xf4c75b];
    let cleanup = () => {};

    import('pixi.js').then((Pixi) => {
      const { Application, Graphics } = Pixi;
      const w = el.offsetWidth || window.innerWidth;
      const h = el.offsetHeight || window.innerHeight;

      app = new Application({
        width: w,
        height: h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });

      el.appendChild(app.view);
      app.view.style.position = 'absolute';
      app.view.style.inset = '0';
      app.view.style.width = '100%';
      app.view.style.height = '100%';

      const onMouseMove = (e) => {
        const rect = el.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) * (w / rect.width);
        mouse.y = (e.clientY - rect.top) * (h / rect.height);
      };
      el.addEventListener('mousemove', onMouseMove, { passive: true });

      app.ticker.add(() => {
        if (particles.length < MAX_PARTICLES) {
          const g = new Graphics();
          const colorHex = COLORS_HEX[Math.floor(Math.random() * COLORS_HEX.length)];
          const size = Math.random() * 7 + 2;
          g.beginFill(colorHex, 0.85);
          g.drawCircle(0, 0, size);
          g.endFill();
          g.x = mouse.x;
          g.y = mouse.y;
          g._vx = (Math.random() - 0.5) * 2.4;
          g._vy = (Math.random() - 0.5) * 2.4 - 1.2;
          g._life = 1.0;
          g._decay = 0.011 + Math.random() * 0.012;
          app.stage.addChild(g);
          particles.push(g);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p._life -= p._decay;
          p._vy += 0.045;
          p.x += p._vx;
          p.y += p._vy;
          p.alpha = p._life;
          p.scale.set(p._life * 0.9 + 0.1);
          if (p._life <= 0) {
            app.stage.removeChild(p);
            p.destroy();
            particles.splice(i, 1);
          }
        }
      });

      cleanup = () => {
        el.removeEventListener('mousemove', onMouseMove);
        app?.destroy(true, { children: true });
        app = null;
      };
    });


    return () => cleanup();
  }, [active]);

  return (
    <div
      ref={containerRef}
      className={`pixi-layer${active ? ' active' : ''}`}
      style={{ opacity: active ? 1 : 0 }}
    />
  );
}

// ── PhysicsForge — Rapier WASM rigid-body physics ─────────────────────────
const PHYS_COLORS = ['#b47dff', '#7dd3fc', '#ff6b35', '#f4c75b', '#8ff0a4', '#c8c4ff'];

function FallingCrystal({ position, color, onHit }) {
  const matRef = useRef();
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  useFrame((_, delta) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity = Math.max(
      0.3,
      matRef.current.emissiveIntensity - delta * 1.8
    );
  });

  return (
    <RigidBody
      position={position}
      restitution={0.72}
      friction={0.38}
      linearDamping={0.04}
      angularDamping={0.06}
      onCollisionEnter={() => {
        if (matRef.current) matRef.current.emissiveIntensity = 4.2;
      }}
    >
      <mesh castShadow>
        <octahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial
          ref={matRef}
          color={colorObj}
          metalness={0.9}
          roughness={0.05}
          emissive={colorObj}
          emissiveIntensity={0.3}
        />
      </mesh>
    </RigidBody>
  );
}

function PhysicsWalls() {
  return (
    <>
      {/* floor */}
      <RigidBody type="fixed" restitution={0.8} friction={0.4}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]} receiveShadow>
          <planeGeometry args={[28, 28]} />
          <meshStandardMaterial
            color="#05041a"
            metalness={0.38}
            roughness={0.84}
            emissive="#12081f"
            emissiveIntensity={0.16}
          />
        </mesh>
        <CuboidCollider args={[14, 0.15, 14]} position={[0, -2.75, 0]} />
      </RigidBody>
      {/* invisible side walls to keep objects in frame */}
      <RigidBody type="fixed">
        <CuboidCollider args={[0.1, 14, 14]} position={[-7, 0, 0]} />
        <CuboidCollider args={[0.1, 14, 14]} position={[7, 0, 0]} />
        <CuboidCollider args={[14, 14, 0.1]} position={[0, 0, -7]} />
      </RigidBody>
    </>
  );
}

function PhysicsScene({ active, motionPaused }) {
  const [crystals, setCrystals] = useState([]);

  const spawnCrystal = useCallback(() => {
    if (!active) return;
    const color = PHYS_COLORS[Math.floor(Math.random() * PHYS_COLORS.length)];
    setCrystals((prev) => [
      ...prev.slice(-28),
      {
        id: Date.now() + Math.random(),
        pos: [
          (Math.random() - 0.5) * 9,
          5 + Math.random() * 5,
          (Math.random() - 0.5) * 5,
        ],
        color,
      },
    ]);
  }, [active]);

  useEffect(() => {
    if (!active) { setCrystals([]); return; }
    for (let i = 0; i < 10; i++) setTimeout(spawnCrystal, i * 90);
  }, [active, spawnCrystal]);

  return (
    <Canvas
      className="forge-canvas"
      dpr={[0.75, 1]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={motionPaused ? 'never' : 'always'}
      shadows
      onCreated={({ gl }) => gl.setClearColor('#04030a', 0)}
      onClick={spawnCrystal}
      style={{ cursor: 'crosshair' }}
    >
      <PerspectiveCamera makeDefault position={[0, 2.5, 11]} fov={50} />
      <ambientLight intensity={0.22} />
      <pointLight position={[0, 6, 0]} intensity={4.5} color="#b47dff" castShadow />
      <spotLight position={[6, 9, 5]} angle={0.35} penumbra={0.7} intensity={3} color="#7dd3fc" castShadow />
      <spotLight position={[-6, 4, 3]} angle={0.45} penumbra={0.8} intensity={2.2} color="#ff6b35" />

      <Suspense fallback={null}>
        <Environment preset="city" />
        <Stars radius={50} depth={40} count={90} factor={2.1} fade speed={0.1} />

        <Physics gravity={[0, -18, 0]}>
          <PhysicsWalls />
          {crystals.map((cr) => (
            <FallingCrystal key={cr.id} position={cr.pos} color={cr.color} />
          ))}
        </Physics>

        <Sparkles count={14} scale={[8, 5, 6]} size={[0.3, 1.3]} speed={0.12} noise={0.16} color="#c8c4ff" />
      </Suspense>

      <EffectComposer multisampling={0}>
        <Bloom intensity={1.8} luminanceThreshold={0.11} luminanceSmoothing={0.5} />
        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0028, 0.0028]} />
        <Noise opacity={0.024} />
        <Vignette eskil={false} offset={0.14} darkness={0.86} />
      </EffectComposer>
    </Canvas>
  );
}

// ── AudioForge — Tone.js PolySynth + FFT visualiser ───────────────────────
const SYNTH_PADS = [
  { note: 'C3',  label: 'C',  color: '#b47dff' },
  { note: 'Eb3', label: 'Eb', color: '#7dd3fc' },
  { note: 'G3',  label: 'G',  color: '#ff6b35' },
  { note: 'Bb3', label: 'Bb', color: '#f4c75b' },
  { note: 'C4',  label: 'C+', color: '#8ff0a4' },
  { note: 'G4',  label: 'G+', color: '#c8c4ff' },
];

function AudioViz({ analyserRef }) {
  const canvasRef = useRef();

  useEffect(() => {
    let raf;
    const draw = () => {
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      raf = requestAnimationFrame(draw);
      if (!canvas || !analyser) return;

      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const data = analyser.getValue();
      if (!data?.length) return;

      const bins = data.length;
      const barW = (W / bins) - 0.5;

      for (let i = 0; i < bins; i++) {
        const norm = Math.max(0, (data[i] + 140) / 140);
        const h = norm * H * 0.92;
        const hue = 260 - (i / bins) * 80;
        ctx.fillStyle = `hsla(${hue}, 88%, 68%, ${0.5 + norm * 0.5})`;
        ctx.fillRect(i * (barW + 0.5), H - h, barW, h);
      }

      // waveform glow line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(196,200,255,0.28)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < bins; i++) {
        const norm = Math.max(0, (data[i] + 140) / 140);
        const x = (i / bins) * W;
        const y = H - norm * H * 0.92;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyserRef]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={160}
      className="audio-viz-canvas"
      aria-hidden="true"
    />
  );
}

function AudioForge({ active }) {
  const synthRef  = useRef(null);
  const analyserRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [hitPad, setHitPad]   = useState(null);

  useEffect(() => {
    if (!active) { synthRef.current?.releaseAll?.(); return; }
    let synth = null;
    let analyser = null;

    import('tone').then((Tone) => {
      if (!active) return;
      analyser = new Tone.Analyser('fft', 64);
      const reverb  = new Tone.Reverb({ decay: 2.6, wet: 0.4 }).toDestination();
      const chorus  = new Tone.Chorus(3.5, 2.5, 0.42).connect(reverb);
      chorus.start();

      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.04, decay: 0.28, sustain: 0.38, release: 1.4 },
        volume: -10,
      });
      synth.connect(chorus);
      synth.connect(analyser);

      synthRef.current  = synth;
      analyserRef.current = analyser;
    });

    return () => {
      synthRef.current?.releaseAll?.();
      setTimeout(() => {
        synthRef.current?.dispose?.();
        analyserRef.current?.dispose?.();
        synthRef.current  = null;
        analyserRef.current = null;
      }, 600);
    };
  }, [active]);

  const playNote = async (note) => {
    if (!synthRef.current) return;
    const Tone = await import('tone');
    await Tone.start();
    setStarted(true);
    synthRef.current.triggerAttackRelease(note, '8n');
    setHitPad(note);
    setTimeout(() => setHitPad(null), 180);
  };

  return (
    <div className={`audio-forge${active ? ' active' : ''}`} aria-hidden={!active}>
      <AudioViz analyserRef={analyserRef} />
      <div className="synth-pads">
        {SYNTH_PADS.map(({ note, label, color }) => (
          <button
            key={note}
            type="button"
            className={`synth-pad${hitPad === note ? ' hit' : ''}`}
            style={{ '--pad-color': color }}
            onClick={() => playNote(note)}
            aria-label={`Play ${note}`}
          >
            <span className="pad-label">{label}</span>
            <span className="pad-note">{note}</span>
          </button>
        ))}
      </div>
      {!started && active && (
        <p className="audio-hint">click a pad to unlock audio</p>
      )}
    </div>
  );
}

function FallbackStage({ activeTool }) {
  const tool = FORGE_TOOLS.find((t) => t.id === activeTool) || FORGE_TOOLS[0];

  return (
    <div className="fallback-stage" data-tool={tool.id} aria-hidden="true">
      <div className="fallback-core">
        <span />
        <span />
        <span />
        <b>{tool.label}</b>
      </div>
      <div className="fallback-particles">
        {FORGE_TOOLS.map((item, index) => (
          <i
            key={item.id}
            style={{
              '--particle-color': item.color,
              '--particle-index': index,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Anime.js letter morphing panel ─────────────────────────────────────────
const FORGE_WORDS = ['DESIGN', 'BUILD', 'ANIMATE', 'DEPLOY', 'FORGE', 'WIELD', 'RENDER'];

function AnimePanel({ active }) {
  const elRef = useRef();
  const animeRef = useRef(null);
  const wordIndex = useRef(0);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    if (!active || !elRef.current) return;

    function runWord() {
      if (!isMounted.current || !elRef.current) return;
      const word = FORGE_WORDS[wordIndex.current % FORGE_WORDS.length];
      wordIndex.current += 1;

      elRef.current.innerHTML = word
        .split('')
        .map(
          (ch) =>
            `<span style="display:inline-block;opacity:0;will-change:transform,opacity">${ch}</span>`
        )
        .join('');

      animeRef.current = anime({
        targets: elRef.current.querySelectorAll('span'),
        opacity: [0, 1],
        translateY: [-30, 0],
        rotateX: [-90, 0],
        delay: anime.stagger(55),
        duration: 640,
        easing: 'easeOutExpo',
        complete: () => {
          if (!isMounted.current) return;
          setTimeout(() => {
            if (!isMounted.current) return;
            animeRef.current = anime({
              targets: elRef.current?.querySelectorAll('span'),
              opacity: 0,
              translateY: 28,
              delay: anime.stagger(38, { direction: 'reverse' }),
              duration: 480,
              easing: 'easeInExpo',
              complete: () => {
                if (isMounted.current) runWord();
              },
            });
          }, 1100);
        },
      });
    }

    runWord();

    return () => {
      isMounted.current = false;
      animeRef.current?.pause?.();
    };
  }, [active]);

  return (
    <div className="anime-text-panel" aria-live="polite">
      <div
        ref={elRef}
        style={{
          fontFamily: '"Archivo Black", sans-serif',
          fontSize: 'clamp(2.8rem, 7vw, 7.2rem)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: 'transparent',
          background: 'linear-gradient(90deg, #b47dff 0%, #7dd3fc 50%, #f4c75b 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          userSelect: 'none',
          perspective: '800px',
        }}
      />
    </div>
  );
}

// ── Framer Motion chrome (progress + cursor glow + scanlines) ──────────────
function ForgeChrome({ activeTool, motionPaused }) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(-120);
  const y = useMotionValue(-120);
  const springX = useFramerSpring(x, { stiffness: 140, damping: 26, mass: 0.6 });
  const springY = useFramerSpring(y, { stiffness: 140, damping: 26, mass: 0.6 });
  const { scrollYProgress } = useScroll();
  const progressScale = useFramerSpring(scrollYProgress, { stiffness: 110, damping: 24 });
  const glowSize = useTransform(scrollYProgress, [0, 1], [160, 220]);
  const tool = FORGE_TOOLS.find((t) => t.id === activeTool) || FORGE_TOOLS[0];

  useEffect(() => {
    if (reduceMotion) return;
    const onPointer = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => window.removeEventListener('pointermove', onPointer);
  }, [reduceMotion, x, y]);

  return (
    <>
      <motion.div className="top-progress" style={{ scaleX: progressScale }} />
      <motion.div
        className="cursor-aura"
        aria-hidden="true"
        style={{
          x: springX,
          y: springY,
          width: glowSize,
          height: glowSize,
          background: `radial-gradient(circle, ${tool.color}50, transparent 64%)`,
          opacity: reduceMotion || motionPaused ? 0 : 1,
        }}
      />
      <div className="scanline-layer" aria-hidden="true" />
    </>
  );
}

// ── Arsenal panel (live package manifest) ─────────────────────────────────
function ArsenalPanel() {
  const stack = [
    ['R3F', 'canvas engine'],
    ['Drei', 'scene helpers'],
    ['PostFX', 'bloom / CA'],
    ['Spring', 'physics rig'],
    ['Framer', 'HUD chrome'],
    ['GSAP', 'scroll drive'],
    ['Lenis', 'smooth scroll'],
    ['Zustand', 'forge state'],
    ['Maath', 'GPU easing'],
    ['Anime.js', 'letter morph'],
    ['Pixi v7', '2D GPU layer'],
    ['GLSL', 'raw shader'],
    ['Theatre', 'director'],
    ['Rapier', 'rigid body'],
    ['Tone.js', 'audio synth'],
    ['Rive', 'state fx'],
  ];

  return (
    <aside className="arsenal-panel">
      <div className="panel-heading">
        <Eye size={14} />
        <span>SKRUCIBLE Stack</span>
      </div>
      <div className="arsenal-grid">
        {stack.map(([name, role]) => (
          <span key={name}>
            <b>{name}</b>
            {role}
          </span>
        ))}
      </div>
    </aside>
  );
}

// ── Tool readout ───────────────────────────────────────────────────────────
function ToolReadout({ activeTool }) {
  const tool = FORGE_TOOLS.find((t) => t.id === activeTool) || FORGE_TOOLS[0];
  const Icon = tool.icon;

  return (
    <motion.aside
      className="tool-readout"
      key={activeTool}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="tool-readout-label" style={{ color: tool.color }}>
        <Icon size={13} />
        <span>{tool.label} mode</span>
      </div>
      <p>{tool.desc}</p>
    </motion.aside>
  );
}

// ── Hero overlay ───────────────────────────────────────────────────────────
function HeroOverlay({
  activeTool,
  setActiveTool,
  motionPaused,
  toggleMotion,
  roamMode,
  toggleRoam,
  mode,
  toggleMode,
}) {
  return (
    <section className="hero-shell" aria-label="SKRUCIBLE hero">
      <div className="brand-line">
        <img src="/deity-logo.png" alt="SkyesOverLondon" className="deity-logo" />
        <GlitchText>SKRUCIBLE MCP by SkyesOverLondon</GlitchText>
        <i />
        <span>R3F · GLSL · Rapier · Tone.js · GSAP · Pixi.js · Framer · Zustand</span>
      </div>

      <div className="hero-copy">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Design operating system
        </motion.p>

        <KineticWordmark />

        {activeTool === 'motion' ? (
          <AnimePanel active />
        ) : (
          <motion.p
            className="hero-lede"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
          >
            SKRUCIBLE is an MCP server and live design lab running at the rendering layer. Seven forge modes, each producing callable component recipes for Claude, Cursor, or any MCP client.
          </motion.p>
        )}
      </div>

      <div className="hero-actions">
        <button
          type="button"
          className="primary-action"
          onClick={() =>
            document.querySelector('#forge-scroll')?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          <Flame size={17} />
          Enter SKRUCIBLE
        </button>
        <button
          type="button"
          className={`mode-toggle${mode === 'raw' ? ' raw' : ''}`}
          onClick={toggleMode}
          aria-label={`Switch to ${mode === 'refined' ? 'raw' : 'refined'} mode`}
        >
          {mode === 'refined' ? 'REFINED' : 'RAW'}
        </button>
        <button
          type="button"
          className="icon-action"
          onClick={toggleMotion}
          aria-label={motionPaused ? 'Resume motion' : 'Pause motion'}
        >
          {motionPaused ? <Play size={17} /> : <Pause size={17} />}
        </button>
      </div>

      <nav className="tool-picker" aria-label="Forge tools">
        {FORGE_TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              type="button"
              key={t.id}
              className={`tool-btn${t.id === activeTool ? ' active' : ''}`}
              onClick={() => setActiveTool(t.id)}
            >
              <i style={{ background: t.color }} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <ToolReadout activeTool={activeTool} />
      <ArsenalPanel />

      <div className="control-row">
        <button
          type="button"
          className={`control-btn${roamMode ? ' active' : ''}`}
          onClick={toggleRoam}
        >
          <Orbit size={14} />
          free orbit
        </button>
        <button
          type="button"
          className="control-btn"
          onClick={() => setActiveTool('plasma')}
        >
          <Zap size={14} />
          plasma
        </button>
        <button
          type="button"
          className="control-btn"
          onClick={() => setActiveTool('pixel')}
        >
          <Layers size={14} />
          pixi
        </button>
      </div>
    </section>
  );
}

// ── GSAP + Lenis scroll setup ──────────────────────────────────────────────
function useForgeWorld(setActiveTool) {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: false,       // GSAP ticker drives the RAF — disable Lenis's own loop
      duration: 1.18,
      lerp: 0.12,
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.8,
    });

    lenis.on('scroll', () => ScrollTrigger.update());
    const ticker = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    gsap.set('.chapter', { autoAlpha: 0.24, y: 34 });
    gsap.to('.chapter', {
      autoAlpha: 1,
      y: 0,
      duration: 0.88,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: {
        trigger: '.forge-scroll',
        start: 'top 74%',
        end: 'bottom bottom',
        scrub: 0.8,
      },
    });

    ScrollTrigger.create({
      trigger: '.forge-scroll',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        document.documentElement.style.setProperty(
          '--scroll-progress',
          self.progress.toFixed(4)
        );
        const index = Math.min(
          SCROLL_BEATS.length - 1,
          Math.floor(self.progress * SCROLL_BEATS.length)
        );
        setActiveTool(SCROLL_BEATS[index]?.tool || 'glass');
      },
    });

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(ticker);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      lenis.destroy();
    };
  }, [setActiveTool]);
}

// ── Ambient breathe ────────────────────────────────────────────────────────
function useLivingBackground(motionPaused) {
  useEffect(() => {
    let raf = 0;
    const tick = (time) => {
      if (!motionPaused) {
        const breathe = 0.5 + Math.sin(time * 0.0007) * 0.5;
        document.documentElement.style.setProperty('--ambient-breathe', breathe.toFixed(4));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [motionPaused]);
}

// ── Gooey morph zone between chapters ─────────────────────────────────────
function GooeyZone({ color1 = '#b47dff', color2 = '#7dd3fc' }) {
  return (
    <div className="gooey-zone" aria-hidden="true" style={{ filter: 'url(#forge-gooey-soft)' }}>
      <div className="gooey-blob" style={{ background: color1 }} />
      <div className="gooey-blob gooey-blob--b" style={{ background: color2 }} />
    </div>
  );
}

// ── Scroll story ───────────────────────────────────────────────────────────
function ScrollStory({ activeTool }) {
  return (
    <section className="forge-scroll" id="forge-scroll" aria-label="SKRUCIBLE forge modes">
      <div className="scroll-rail">
        {SCROLL_BEATS.map((beat) => (
          <span key={beat.id} className={beat.tool === activeTool ? 'active' : ''}>
            {beat.label}
          </span>
        ))}
      </div>

      <div className="chapter">
        <Droplets size={22} />
        <h2><GlitchText>Glass is not a trick.</GlitchText></h2>
        <p>
          MeshTransmissionMaterial delivers real-time IOR, chromatic aberration, and
          temporal distortion — not a fake matcap, not a texture overlay. Drag the
          orb. The @react-spring/three physics catches when you release.
        </p>
      </div>

      <GooeyZone color1="#b47dff" color2="#7dd3fc" />

      <div className="chapter">
        <Zap size={22} />
        <h2><GlitchText>Shaders own the backdrop.</GlitchText></h2>
        <p>
          A custom GLSL fragment shader receives uTime and uMouse as live uniforms.
          The plasma field responds to your cursor — wired through shaderMaterial()
          and extend() from Drei, zero abstraction overhead.
        </p>
      </div>

      <GooeyZone color1="#ff6b35" color2="#b47dff" />

      <div className="chapter">
        <Orbit size={22} />
        <h2><GlitchText>Springs make motion honest.</GlitchText></h2>
        <p>
          @react-spring/three wires physics tension and friction directly into R3F
          mesh transforms. Hover a crystal — scale and emissive snap back with real
          spring dynamics, not a cubic-bezier someone guessed at.
        </p>
      </div>

      <GooeyZone color1="#7dd3fc" color2="#8ff0a4" />

      <div className="chapter">
        <Layers size={22} />
        <h2><GlitchText>Pixi lives above the canvas.</GlitchText></h2>
        <p>
          A Pixi.js v7 stage overlays the WebGL scene as a separate GPU context.
          2D sprites and particle trails without touching the Three.js render tree.
          Two engines, one viewport, zero conflict.
        </p>
      </div>

      <GooeyZone color1="#8ff0a4" color2="#f4c75b" />

      <div className="chapter">
        <Activity size={22} />
        <h2><GlitchText>DOM motion still matters.</GlitchText></h2>
        <p>
          Anime.js drives the morphing word panel while Framer Motion handles the
          chrome. The result is a separate animation lane for interface text,
          independent from the WebGL scene and still synchronized to the forge
          state.
        </p>
      </div>

      <GooeyZone color1="#f4c75b" color2="#c8c4ff" />

      <div className="chapter">
        <Magnet size={22} />
        <h2><GlitchText>Gravity has a lane now.</GlitchText></h2>
        <p>
          Rapier rigid bodies load into the same visual system instead of being
          promised as a future idea. Click the viewport in physics mode and the
          crystals fall, collide, flash, and settle inside the forge boundary.
        </p>
      </div>

      <GooeyZone color1="#c8c4ff" color2="#8ff0a4" />

      <div className="chapter">
        <Waves size={22} />
        <h2><GlitchText>Audio earns the bloom.</GlitchText></h2>
        <p>
          Tone.js runs the synth pads and FFT analyser. The pulse mode is no longer
          a blank scroll beat: it renders the audio controls, waveform canvas, and
          live note interaction in the same production surface.
        </p>
      </div>
    </section>
  );
}

// ── SEO + LLM-readable content section ────────────────────────────────────
function SkrucibleContent() {
  return (
    <article className="skrucible-content" aria-label="About SKRUCIBLE MCP">
      <div className="content-inner">

        <section className="content-block">
          <h2>What is SKRUCIBLE?</h2>
          <p>
            SKRUCIBLE is a Model Context Protocol (MCP) server and interactive design lab built by SkyesOverLondon.
            It runs on React Three Fiber, Three.js, custom GLSL shaders, Rapier WASM physics, Tone.js audio synthesis,
            GSAP, Lenis smooth scroll, Pixi.js, and Framer Motion — then serves those implementations as callable MCP
            tools that AI coding agents can access directly.
          </p>
          <p>
            Connect SKRUCIBLE to Claude Desktop, Cursor, or any MCP-compatible client and ask for component recipes,
            shader code, animation patterns, or the full dependency stack. Every tool returns working React Three Fiber
            code with the correct wiring — not pseudocode, not approximations.
          </p>
        </section>

        <section className="content-block">
          <h2>For developers building with WebGL and React</h2>
          <p>
            SKRUCIBLE is not a template repository or a design token system. It is a rendering primitive library with
            an AI-callable interface. Every forge mode — Glass, Plasma, Spring, Pixel, Motion, Physics, Audio — produces
            real component code using actual render techniques: MeshTransmissionMaterial for real-time IOR and chromatic
            aberration, custom GLSL fragment shaders with live uniforms, @react-spring/three physics tension and friction
            wired directly into R3F mesh transforms, Rapier rigid bodies with collision events, and Tone.js FFT analysis
            mapped to visual output.
          </p>
          <p>
            The MCP endpoint at <code>https://skrucible.pages.dev/mcp</code> responds to the full MCP JSON-RPC protocol.
            No authentication required for read access.
          </p>
        </section>

        <section className="content-block">
          <h2>Connect SKRUCIBLE to Claude or Cursor</h2>
          <pre className="code-block"><code>{`{
  "mcpServers": {
    "skrucible": {
      "url": "https://skrucible.pages.dev/mcp"
    }
  }
}`}</code></pre>
          <p>Add that to your MCP client configuration. No API key required. Then ask your agent for <code>forge_component</code>, <code>forge_shader</code>, <code>forge_animation</code>, or <code>forge_stack</code>.</p>
        </section>

        <section className="content-block">
          <h2>MCP tools available in SKRUCIBLE</h2>
          <ul className="tools-list">
            <li><code>forge_index</code> — all available tools and descriptions</li>
            <li><code>forge_stack</code> — full dependency manifest: every package, version, and Vite chunk config</li>
            <li><code>forge_palette</code> — Raw and Refined color tokens as CSS custom properties and hex values</li>
            <li><code>forge_shader</code> — PlasmaMaterial GLSL fragment shader with extend() wiring for React Three Fiber</li>
            <li><code>forge_component</code> — named recipes: glass, crystal, floor, pixi, anime, chrome</li>
            <li><code>forge_animation</code> — patterns: spring, gsap-scroll, lenis, kinetic-wordmark, glitch-text, gooey</li>
            <li><code>forge_mode</code> — Raw/Refined dual-mode spec with Zustand state and CSS selector patterns</li>
            <li><code>forge_css</code> — full CSS custom property system</li>
          </ul>
        </section>

        <section className="content-block">
          <h2>The dual-mode design system</h2>
          <p>
            SKRUCIBLE ships with a two-palette identity: Refined mode uses electric violet (#b47dff) as the primary
            with hot orange (#ff6b35) as the accent. Raw mode flips them. The switch is driven by a <code>data-forge-mode</code> attribute
            on the HTML element, toggled by Zustand state — compatible with any React state manager and zero runtime overhead.
            The palette covers background, ink, muted, panel, stroke, and accent as CSS custom properties.
          </p>
        </section>

        <section className="content-block content-block--founder">
          <h2>Built by SkyesOverLondon</h2>
          <p>
            SkyesOverLondon builds design systems and AI-augmented development tools at the rendering layer.
            SKRUCIBLE is the public MCP interface for a production stack used across client projects —
            the same techniques deployed in interactive product launches, design-heavy web applications,
            and AI-integrated creative tools. The forge is the proof. The MCP is the delivery mechanism.
          </p>
          <p>
            Source:{' '}
            <a href="https://skrucible.pages.dev" rel="canonical">skrucible.pages.dev</a>
            {' · '}
            MCP:{' '}
            <a href="https://skrucible.pages.dev/mcp">skrucible.pages.dev/mcp</a>
          </p>
        </section>

      </div>
    </article>
  );
}

// ── Root app ───────────────────────────────────────────────────────────────
export default function App() {
  const {
    activeTool,
    setActiveTool,
    motionPaused,
    toggleMotion,
    roamMode,
    toggleRoam,
    mode,
    toggleMode,
  } = useForge();
  const lowPowerRenderer = useLowPowerRenderer();

  useForgeWorld(setActiveTool);
  useLivingBackground(motionPaused);

  useEffect(() => {
    document.body.classList.toggle('motion-paused', motionPaused);
    return () => document.body.classList.remove('motion-paused');
  }, [motionPaused]);

  useEffect(() => {
    document.documentElement.setAttribute('data-forge-mode', mode);
  }, [mode]);

  return (
    <main className="forge-app">
      <GooeyFilter />
      <ForgeChrome activeTool={activeTool} motionPaused={motionPaused} />

      <div className="canvas-stage" aria-hidden="true">
        {lowPowerRenderer ? (
          <FallbackStage activeTool={activeTool} />
        ) : activeTool === 'physics' ? (
          <PhysicsScene active motionPaused={motionPaused} />
        ) : (
          <ForgeScene tool={activeTool} motionPaused={motionPaused} roamMode={roamMode} />
        )}
      </div>

      <PixiPanel active={!lowPowerRenderer && activeTool === 'pixel'} />
      <AudioForge active={activeTool === 'audio'} />

      <HeroOverlay
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        motionPaused={motionPaused}
        toggleMotion={toggleMotion}
        roamMode={roamMode}
        toggleRoam={toggleRoam}
        mode={mode}
        toggleMode={toggleMode}
      />

      <ScrollStory activeTool={activeTool} />

      <SkrucibleContent />

    </main>
  );
}
