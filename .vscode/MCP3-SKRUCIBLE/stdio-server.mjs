#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Forge identity ─────────────────────────────────────────────────────────
const FORGE_VERSION = '1.0.3';
const FORGE_NAME    = 'skrucible-mcp';

// ── Read source files for live content ────────────────────────────────────
function readSrc(rel) {
  try { return fs.readFileSync(path.join(__dirname, rel), 'utf8'); }
  catch { return null; }
}

// ── Tool content ───────────────────────────────────────────────────────────
const PALETTE = {
  refined: { plasma:'#b47dff', forge:'#ff6b35', ice:'#7dd3fc', gold:'#f4c75b', mint:'#8ff0a4', chrome:'#c8c4ff', bg:'#04030a', ink:'#eef0ff' },
  raw:     { plasma:'#ff6b35', forge:'#b47dff', ice:'#f4c75b', gold:'#f4c75b', mint:'#8ff0a4', chrome:'#c8c4ff', bg:'#090206', ink:'#fff8ee' },
};

const TOOLS_MANIFEST = [
  { name:'forge_index',     desc:'List all available SKRUCIBLE Forge tools with descriptions.' },
  { name:'forge_stack',     desc:'Return the full MCP3 package.json + vite.config.js design stack — every dependency, version, and chunk config.' },
  { name:'forge_palette',   desc:'Return the Forge color system: CSS custom properties, hex values, both Raw and Refined modes.' },
  { name:'forge_shader',    desc:'Return the custom GLSL PlasmaMaterial shader recipe with extend() wiring and uniform definitions.' },
  { name:'forge_component', desc:'Return a named component recipe from the Forge. Available: glass, crystal, floor, pixi, anime, chrome.' },
  { name:'forge_animation', desc:'Return an animation recipe. Available: spring, gsap-scroll, lenis, kinetic-wordmark, glitch-text, gooey.' },
  { name:'forge_mode',      desc:'Return the Raw/Refined dual-mode design system spec: zustand state, CSS data attributes, palette shifts.' },
  { name:'forge_css',       desc:'Return the full MCP3 CSS custom property system and key class definitions.' },
];

// ── Component recipes ──────────────────────────────────────────────────────
const COMPONENT_RECIPES = {
  glass: `// GlassOrb — MeshTransmissionMaterial real glass refraction
// deps: @react-three/drei, @react-spring/three
import { MeshTransmissionMaterial } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';

function GlassOrb() {
  const [{ scale }, api] = useSpring(() => ({ scale: 1, config: { tension: 220, friction: 18 } }));
  return (
    <a.mesh scale={scale}
      onPointerEnter={() => api.start({ scale: 1.08 })}
      onPointerLeave={() => api.start({ scale: 1 })}
    >
      <sphereGeometry args={[1.15, 64, 64]} />
      <MeshTransmissionMaterial
        backside samples={6} resolution={512}
        transmission={1} roughness={0.04} thickness={1.8} ior={1.6}
        chromaticAberration={0.08} anisotropy={0.3}
        distortion={0.4} distortionScale={0.28} temporalDistortion={0.14}
        color="#c0a0ff" attenuationColor="#7dd3fc" attenuationDistance={0.8}
      />
    </a.mesh>
  );
}`,

  crystal: `// Crystal — @react-spring/three physics on hover with emissive lerp
// deps: @react-spring/three, three, maath
import { useSpring, a } from '@react-spring/three';
import { easing } from 'maath';

function Crystal({ pos, color, delay, active }) {
  const matRef = useRef();
  const [hovered, setHovered] = useState(false);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);
  const { scale } = useSpring({
    scale: active ? (hovered ? 1.65 : 1.1) : 0.3,
    delay, config: { tension: 160, friction: 14 },
  });
  useFrame((_, delta) => {
    if (!matRef.current) return;
    const target = hovered ? 3.5 : active ? 1.4 : 0.2;
    matRef.current.emissiveIntensity += (target - matRef.current.emissiveIntensity) * Math.min(delta * 6, 1);
  });
  return (
    <a.mesh position={pos} scale={scale}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <octahedronGeometry args={[0.38, 0]} />
      <meshStandardMaterial ref={matRef} color={colorObj} metalness={0.86} roughness={0.07}
        emissive={colorObj} emissiveIntensity={0.2} />
    </a.mesh>
  );
}`,

  floor: `// ForgeFloor — MeshReflectorMaterial mirror floor
// deps: @react-three/drei
import { MeshReflectorMaterial } from '@react-three/drei';

function ForgeFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]}>
      <planeGeometry args={[30, 30]} />
      <MeshReflectorMaterial
        blur={[400, 40]} resolution={1024} mixBlur={0.88} mixStrength={55}
        roughness={0.9} depthScale={1} minDepthThreshold={0.3} maxDepthThreshold={1.5}
        color="#060418" metalness={0.55}
      />
    </mesh>
  );
}`,

  pixi: `// PixiPanel — Pixi.js v7 2D GPU canvas overlay with particle trail
// deps: pixi.js (dynamic import)
function PixiPanel({ active }) {
  const containerRef = useRef();
  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    let app = null;
    const particles = [];
    const MAX = 90;
    const mouse = { x: 0, y: 0 };
    const COLORS = [0xb47dff, 0x7dd3fc, 0x8ff0a4, 0xff6b35, 0xf4c75b];
    let cleanup = () => {};
    import('pixi.js').then(({ Application, Graphics }) => {
      app = new Application({ width: el.offsetWidth, height: el.offsetHeight, backgroundAlpha: 0, antialias: true });
      el.appendChild(app.view);
      app.view.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      };
      el.addEventListener('mousemove', onMove, { passive: true });
      app.ticker.add(() => {
        if (particles.length < MAX) {
          const g = new Graphics();
          g.beginFill(COLORS[Math.floor(Math.random() * COLORS.length)], 0.85);
          g.drawCircle(0, 0, Math.random() * 7 + 2);
          g.endFill();
          Object.assign(g, { x: mouse.x, y: mouse.y,
            _vx: (Math.random() - 0.5) * 2.4, _vy: (Math.random() - 0.5) * 2.4 - 1.2,
            _life: 1, _decay: 0.011 + Math.random() * 0.012 });
          app.stage.addChild(g);
          particles.push(g);
        }
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p._life -= p._decay; p._vy += 0.045;
          p.x += p._vx; p.y += p._vy;
          p.alpha = p._life; p.scale.set(p._life * 0.9 + 0.1);
          if (p._life <= 0) { app.stage.removeChild(p); p.destroy(); particles.splice(i, 1); }
        }
      });
      cleanup = () => { el.removeEventListener('mousemove', onMove); app?.destroy(true, { children: true }); };
    });
    return () => cleanup();
  }, [active]);
  return <div ref={containerRef} style={{ position:'absolute', inset:0, opacity: active ? 1 : 0, transition:'opacity 0.4s' }} />;
}`,

  anime: `// AnimePanel — anime.js staggered letter morphing cycle
// deps: animejs
import anime from 'animejs';
const WORDS = ['DESIGN','BUILD','ANIMATE','DEPLOY','FORGE','WIELD','RENDER'];

function AnimePanel({ active }) {
  const elRef = useRef();
  const animeRef = useRef(null);
  const idx = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    if (!active || !elRef.current) return;
    function run() {
      if (!mounted.current || !elRef.current) return;
      const word = WORDS[idx.current++ % WORDS.length];
      elRef.current.innerHTML = word.split('').map(c =>
        \`<span style="display:inline-block;opacity:0">\${c}</span>\`).join('');
      animeRef.current = anime({
        targets: elRef.current.querySelectorAll('span'),
        opacity: [0,1], translateY: [-30,0], rotateX: [-90,0],
        delay: anime.stagger(55), duration: 640, easing: 'easeOutExpo',
        complete: () => {
          if (!mounted.current) return;
          setTimeout(() => {
            animeRef.current = anime({
              targets: elRef.current?.querySelectorAll('span'),
              opacity: 0, translateY: 28,
              delay: anime.stagger(38, { direction:'reverse' }),
              duration: 480, easing: 'easeInExpo',
              complete: () => { if (mounted.current) run(); }
            });
          }, 1100);
        }
      });
    }
    run();
    return () => { mounted.current = false; animeRef.current?.pause?.(); };
  }, [active]);
  return (
    <div aria-live="polite">
      <div ref={elRef} style={{ fontFamily:'"Archivo Black",sans-serif', fontSize:'clamp(2.8rem,7vw,7.2rem)',
        letterSpacing:'-0.04em', background:'linear-gradient(90deg,#b47dff,#7dd3fc,#f4c75b)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', perspective:'800px' }} />
    </div>
  );
}`,

  chrome: `// ForgeChrome — framer-motion scroll progress bar + cursor aura
// deps: framer-motion
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';

function ForgeChrome({ toolColor = '#b47dff' }) {
  const x = useMotionValue(-120);
  const y = useMotionValue(-120);
  const sx = useSpring(x, { stiffness: 140, damping: 26, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 140, damping: 26, mass: 0.6 });
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 24 });
  useEffect(() => {
    const h = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('pointermove', h, { passive: true });
    return () => window.removeEventListener('pointermove', h);
  }, []);
  return (
    <>
      <motion.div style={{ position:'fixed', top:0, left:0, right:0, height:'2px',
        background:'linear-gradient(90deg,#b47dff,#7dd3fc)', scaleX:progress, transformOrigin:'left', zIndex:1000 }} />
      <motion.div aria-hidden="true" style={{ position:'fixed', top:0, left:0, borderRadius:'50%',
        width:180, height:180, pointerEvents:'none', zIndex:999,
        background:\`radial-gradient(circle, \${toolColor}50, transparent 64%)\`,
        x: useTransform(sx, v => v - 90), y: useTransform(sy, v => v - 90) }} />
    </>
  );
}`,
};

const ANIMATION_RECIPES = {
  spring: `// @react-spring/three — physics spring in R3F
// deps: @react-spring/three, @react-three/fiber, three
// config: tension (stiffness), friction (damping), mass

import { useSpring, a } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import { useState, useRef } from 'react';

function SpringCrystal({ position, color = '#b47dff', active = true }) {
  const meshRef = useRef();
  const matRef = useRef();
  const [hovered, setHovered] = useState(false);

  // spring drives scale — tension/friction = stiffness/damping
  const { scale } = useSpring({
    scale: active ? (hovered ? 1.65 : 1.1) : 0.3,
    config: { tension: 160, friction: 14 },
    delay: 80,
  });

  // emissive lerp in useFrame — independent of spring
  useFrame((_, delta) => {
    if (!matRef.current) return;
    const target = hovered ? 3.5 : active ? 1.4 : 0.2;
    matRef.current.emissiveIntensity +=
      (target - matRef.current.emissiveIntensity) * Math.min(delta * 6, 1);
    if (meshRef.current && active && !hovered) {
      meshRef.current.rotation.y += delta * 0.55;
    }
  });

  return (
    <a.mesh
      ref={meshRef}
      position={position}
      scale={scale}
      onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
    >
      <octahedronGeometry args={[0.38, 0]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        metalness={0.86}
        roughness={0.07}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </a.mesh>
  );
}

// Key: use a.mesh (animated.mesh) — not plain mesh — to accept spring-interpolated values.
// tension = spring stiffness, friction = damping. Low friction = bouncy overshoot.`,

  'gsap-scroll': `// GSAP ScrollTrigger — scroll-driven chapter reveals
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

gsap.set('.chapter', { autoAlpha: 0.24, y: 34 });
gsap.to('.chapter', {
  autoAlpha: 1, y: 0, duration: 0.88, ease: 'power3.out', stagger: 0.12,
  scrollTrigger: { trigger: '.forge-scroll', start: 'top 74%', end: 'bottom bottom', scrub: 0.8 },
});

// Scroll-driven state change
ScrollTrigger.create({
  trigger: '.forge-scroll', start: 'top top', end: 'bottom bottom', scrub: true,
  onUpdate: (self) => {
    const idx = Math.floor(self.progress * BEATS.length);
    setActiveTool(BEATS[idx]?.tool || 'glass');
  },
});`,

  lenis: `// Lenis smooth scroll wired to GSAP ticker
// CRITICAL: set autoRaf:false — Lenis v1.1+ defaults autoRaf:true.
// Without it, Lenis runs its own RAF loop AND GSAP fires it again —
// double-firing breaks smooth scroll and desynchronises ScrollTrigger.
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const lenis = new Lenis({
  autoRaf: false,       // GSAP ticker is the RAF driver
  duration: 1.18,
  lerp: 0.12,
  smoothWheel: true,
  wheelMultiplier: 0.92,
  touchMultiplier: 1.8,
});

lenis.on('scroll', () => ScrollTrigger.update());
const tick = (time) => lenis.raf(time * 1000);
gsap.ticker.add(tick);
gsap.ticker.lagSmoothing(0);

// cleanup
gsap.ticker.remove(tick);
lenis.destroy();`,

  'kinetic-wordmark': `// KineticWordmark — GSAP 3D letter-by-letter reveal + perpetual float
// deps: gsap
function KineticWordmark({ text = 'THE FORGE' }) {
  const ref = useRef();
  useEffect(() => {
    const chars = ref.current?.querySelectorAll('.wm-char');
    if (!chars?.length) return;
    const tl = gsap.timeline({ delay: 0.25 });
    tl.fromTo(chars,
      { y: 80, opacity: 0, rotateX: -90, filter: 'blur(14px)' },
      { y: 0, opacity: 1, rotateX: 0, filter: 'blur(0px)',
        stagger: 0.048, duration: 1.15, ease: 'expo.out' }
    ).add(() => {
      gsap.to(chars, {
        y: (i) => Math.sin(i * 0.95) * 5, repeat: -1, yoyo: true,
        duration: 2.4, ease: 'sine.inOut', stagger: { each: 0.09, repeat: -1, yoyo: true },
      });
    });
    return () => tl.kill();
  }, []);
  return (
    <h1 ref={ref} style={{ display:'flex', fontFamily:'"Archivo Black",sans-serif',
      fontSize:'clamp(3.2rem,9vw,9rem)', letterSpacing:'-0.04em',
      background:'linear-gradient(105deg,#b47dff,#7dd3fc,#ff6b35)',
      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', perspective:'900px' }}>
      {text.split('').map((c, i) => (
        <span key={i} className="wm-char" style={{ display:'inline-block', opacity:0, transformStyle:'preserve-3d' }}>
          {c === ' ' ? '\\u00a0' : c}
        </span>
      ))}
    </h1>
  );
}`,

  'glitch-text': `// GlitchText — character-level CSS keyframe glitch, word-safe wrapping
// CRITICAL: wrap each word in whiteSpace:nowrap to prevent mid-word line breaks.
// Splitting chars into inline-block removes natural word boundaries — browser
// will break inside words without the word-level wrapper.
// No deps — pure CSS + React
function GlitchText({ children, tag: Tag = 'span' }) {
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
    <Tag aria-label={str}>
      {words.map((word, wi) => (
        <React.Fragment key={wi}>
          {/* whiteSpace:nowrap keeps each word intact — never breaks mid-word */}
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {word.split('').map((c, ci) => (
              <span key={ci} style={{
                display: 'inline-block',
                animation: \`char-glitch 5s \${wordData[wi]?.[ci]?.d ?? 0}s infinite\`,
                '--go': \`\${wordData[wi]?.[ci]?.o ?? 0}px\`,
              }}>
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
/* CSS keyframe — add to stylesheet:
@keyframes char-glitch {
  0%,80%,100% { font-weight:inherit; font-style:normal; transform:none; color:inherit; }
  81%  { font-weight:900; color:#b47dff; transform:translateY(var(--go,0px)) scaleX(1.04); }
  83%  { font-style:italic; font-weight:200; color:#7dd3fc; opacity:0.72; }
  85%  { font-weight:inherit; font-style:normal; transform:none; color:inherit; }
}
*/`,

  gooey: `// Gooey morph zones — SVG feTurbulence filter for merging blob transitions
// Pure SVG + CSS — no deps
function GooeyFilter() {
  return (
    <svg width="0" height="0" style={{ position:'fixed', pointerEvents:'none' }} aria-hidden="true">
      <defs>
        <filter id="forge-gooey" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          <feColorMatrix in="blur" mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}
// Apply to any container: style={{ filter:'url(#forge-gooey)' }}
// Child .blob elements with animation drift will merge/separate with gooey physics

// CSS for animated blobs:
// .blob { position:absolute; border-radius:50%; opacity:0.45; mix-blend-mode:screen;
//         animation: blob-drift 6s ease-in-out infinite alternate; }
// @keyframes blob-drift { 0%{transform:translate(-40px,0) scale(1)} 100%{transform:translate(40px,8px) scale(1.18)} }`,
};

// ── createMcp3ForgeServer ──────────────────────────────────────────────────
export function createMcp3ForgeServer() {
  const server = new McpServer({
    name:    FORGE_NAME,
    version: FORGE_VERSION,
  });

  // forge_index
  server.tool('forge_index', 'List all available SKRUCIBLE Forge tools.', {}, async () => ({
    content: [{
      type: 'text',
      text: JSON.stringify({ tools: TOOLS_MANIFEST }, null, 2),
    }],
  }));

  // forge_stack
  server.tool('forge_stack', 'Return the full MCP3 package.json + vite.config.js design stack.', {}, async () => {
    const STACK = {
      name: 'skrucible-mcp',
      version: '1.0.3',
      dependencies: {
        '@react-three/fiber': '^8.17.6',
        '@react-three/drei': '^9.111.3',
        '@react-three/postprocessing': '^2.16.2',
        '@react-three/rapier': '^1.5.0',
        '@react-spring/three': '^9.7.4',
        '@use-gesture/react': '^10.3.1',
        'three': '^0.168.0',
        'maath': '^0.10.8',
        'framer-motion': '^11.5.4',
        'gsap': '^3.12.5',
        'lenis': '^1.1.14',
        'animejs': '^3.2.2',
        'pixi.js': '^7.4.2',
        'tone': '^15.1.22',
        'zustand': '^4.5.5',
        'lucide-react': '^0.417.0',
        '@modelcontextprotocol/sdk': '^1.21.0',
        'zod': '^4.1.12',
      },
      viteConfig: {
        manualChunks: {
          three: ['three','@react-three/fiber','@react-three/drei','@react-three/postprocessing'],
          motion: ['framer-motion','gsap','lenis','animejs'],
          spring: ['@react-spring/three','@use-gesture/react'],
          pixi: ['pixi.js'],
          rapier: ['@react-three/rapier'],
        },
      },
    };
    // If running in-source, enrich with live package.json
    try {
      const livePkg = readSrc('package.json');
      if (livePkg) STACK.liveDeps = JSON.parse(livePkg).dependencies;
    } catch {}
    return { content: [{ type: 'text', text: JSON.stringify(STACK, null, 2) }] };
  });

  // forge_palette
  server.tool('forge_palette', 'Return the Forge color system for both Raw and Refined modes.', {}, async () => ({
    content: [{
      type: 'text',
      text: JSON.stringify({
        modes: PALETTE,
        css: Object.entries(PALETTE.refined).map(([k,v]) => `  --${k}: ${v};`).join('\n'),
        rawCss: Object.entries(PALETTE.raw).map(([k,v]) => `  --${k}: ${v};`).join('\n'),
        usage: 'Set data-forge-mode="raw" or "refined" on <html> to switch palette via CSS custom properties.',
      }, null, 2),
    }],
  }));

  // forge_shader
  server.tool('forge_shader', 'Return the custom GLSL PlasmaMaterial shader recipe.', {}, async () => {
    const PLASMA_SHADER = `// PlasmaMaterial — custom GLSL shaderMaterial for @react-three/fiber
// deps: three, @react-three/fiber, @react-three/drei
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef } from 'react';

const PlasmaMaterial = shaderMaterial(
  { uTime: 0, uIntensity: 0.7, uMouse: new THREE.Vector2(0.5, 0.5) },
  \`varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }\`,
  \`uniform float uTime;
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
   }\`
);
extend({ PlasmaMaterial });

// Usage — wire uTime in useFrame:
function PlasmaBackdrop({ active }) {
  const matRef = useRef();
  useFrame(({ clock, pointer }) => {
    if (!matRef.current) return;
    matRef.current.uTime = clock.elapsedTime;
    matRef.current.uMouse.set(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5);
    matRef.current.uIntensity = active ? 0.7 : 0.22;
  });
  return (
    <mesh position={[0, 0, -5.5]} scale={[22, 15, 1]}>
      <planeGeometry args={[1, 1]} />
      <plasmaMaterial ref={matRef} transparent depthWrite={false} />
    </mesh>
  );
}`;
    return { content: [{ type: 'text', text: PLASMA_SHADER }] };
  });

  // forge_component
  server.tool(
    'forge_component',
    'Return a named component recipe. name: glass | crystal | floor | pixi | anime | chrome',
    { name: z.enum(['glass','crystal','floor','pixi','anime','chrome']) },
    async ({ name }) => ({
      content: [{
        type: 'text',
        text: COMPONENT_RECIPES[name] ?? `// Unknown component: ${name}`,
      }],
    })
  );

  // forge_animation
  server.tool(
    'forge_animation',
    'Return an animation recipe. name: spring | gsap-scroll | lenis | kinetic-wordmark | glitch-text | gooey',
    { name: z.enum(['spring','gsap-scroll','lenis','kinetic-wordmark','glitch-text','gooey']) },
    async ({ name }) => ({
      content: [{
        type: 'text',
        text: ANIMATION_RECIPES[name] ?? `// Unknown animation: ${name}`,
      }],
    })
  );

  // forge_mode
  server.tool('forge_mode', 'Return the Raw/Refined dual-mode design system spec.', {}, async () => ({
    content: [{
      type: 'text',
      text: JSON.stringify({
        description: 'SKRUCIBLE Forge dual-mode identity system. Raw = hot orange primary, violet secondary. Refined = electric violet primary, hot orange accent.',
        zustandState: `mode: 'refined', toggleMode: () => set(s => ({ mode: s.mode === 'refined' ? 'raw' : 'refined' }))`,
        htmlIntegration: `useEffect(() => { document.documentElement.setAttribute('data-forge-mode', mode); }, [mode]);`,
        cssSelectors: {
          '[data-forge-mode="raw"]':     PALETTE.raw,
          '[data-forge-mode="refined"]': PALETTE.refined,
        },
        uiPattern: 'A .mode-toggle button with ::before indicator dot that shifts color on click. Font: Archivo Black, letter-spacing: 0.16em, uppercase label.',
      }, null, 2),
    }],
  }));

  // forge_css
  server.tool('forge_css', 'Return the full MCP3 CSS custom property system and key class definitions.', {}, async () => {
    const CSS_FULL = `:root {
  --bg: #04030a;
  --ink: #eef0ff;
  --muted: rgba(238, 240, 255, 0.68);
  --faint: rgba(238, 240, 255, 0.12);
  --plasma: #b47dff;
  --forge: #ff6b35;
  --ice: #7dd3fc;
  --gold: #f4c75b;
  --mint: #8ff0a4;
  --chrome: #c8c4ff;
  --panel: rgba(4, 3, 18, 0.72);
  --panel-strong: rgba(6, 4, 20, 0.88);
  --stroke: rgba(238, 240, 255, 0.12);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ambient-breathe: 1;
  --scroll-progress: 0;
}

[data-forge-mode="raw"] {
  --plasma: #ff6b35;
  --forge: #b47dff;
  --ice: #f4c75b;
  --bg: #090206;
  --ink: #fff8ee;
}

/* Key layout classes */
.forge-app { min-height: 100svh; background: var(--bg); color: var(--ink); font-family: Inter, sans-serif; }
.canvas-stage { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
.hero-shell { position: relative; z-index: 10; padding: clamp(1.5rem, 4vw, 3rem); min-height: 100svh; display: flex; flex-direction: column; gap: 1.5rem; }
.forge-canvas { width: 100% !important; height: 100% !important; display: block; }

/* Tool picker */
.tool-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: 1px solid var(--stroke); border-radius: 999px; background: var(--panel); color: var(--muted); font-size: 0.8rem; cursor: pointer; transition: color 0.2s, border-color 0.2s; }
.tool-btn.active { color: var(--plasma); border-color: var(--plasma); }
.tool-btn i { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* Kinetic wordmark */
.kinetic-wordmark { font-family: 'Archivo Black', sans-serif; font-size: clamp(3.5rem, 9vw, 8.5rem); letter-spacing: -0.04em; line-height: 0.95; color: var(--ink); }
.wm-char { display: inline-block; transform-origin: center bottom; opacity: 0; }

/* Glitch text */
.glitch-text { display: inline; }
.glitch-char { display: inline-block; animation: glitch-drift 4s ease-in-out infinite alternate; animation-delay: calc(var(--gd) * 1s); transform: translateY(calc(var(--go) * 0.3)); }
@keyframes glitch-drift { 0% { transform: translateY(0); } 100% { transform: translateY(var(--go)); } }

/* Scroll sections */
.forge-scroll { position: relative; z-index: 5; padding: 8rem 0; min-height: 500svh; }
.chapter { max-width: 680px; margin: 0 auto 14rem; padding: 0 clamp(1.5rem, 5vw, 4rem); }
.chapter h2 { font-family: 'Archivo Black', sans-serif; font-size: clamp(2rem, 5vw, 3.5rem); color: var(--ink); margin-bottom: 1rem; }
.chapter p { font-size: 1.05rem; line-height: 1.72; color: var(--muted); }

/* Panel */
.arsenal-panel { background: var(--panel); border: 1px solid var(--stroke); border-radius: 1rem; padding: 1rem 1.25rem; max-width: 320px; }
.arsenal-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.35rem 1rem; font-size: 0.72rem; }
.arsenal-grid b { color: var(--plasma); margin-right: 0.35rem; }

/* Motion paused state */
body.motion-paused .glitch-char { animation-play-state: paused; }
body.motion-paused .kinetic-wordmark { animation-play-state: paused; }`;
    return { content: [{ type: 'text', text: CSS_FULL }] };
  });

  return server;
}

// ── Stdio entrypoint ───────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const server    = createMcp3ForgeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
