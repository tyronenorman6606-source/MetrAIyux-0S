#!/usr/bin/env node
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const SERVER_NAME = 'skye-world-mcp';
const SERVER_VERSION = '1.0.0';

const ROOMS = [
  {
    id: 'gate',
    code: '02',
    title: 'Gate Threshold',
    short: 'visual entry ritual',
    body: 'Entry is a place, not a button. This threshold keeps the shared 0S gate language visible without creating a second auth lane.',
    color: '#f4c75b',
    accent: '#6cf2ff',
    geometry: 'door',
    defaultPosition: [-4.8, 0.48, -2.8],
    route: 'FS27 / SkyGate / Free99',
    actions: ['keypad ritual', 'session handoff', 'owner-safe copy']
  },
  {
    id: 'forge',
    code: '07',
    title: 'Recipe Forge',
    short: 'MCP stack builder',
    body: 'Turns MCP recipes into runtime obligations: WebGL scene, scroll choreography, motion chrome, Theatre direction, and browser-checked behavior.',
    color: '#ff5d73',
    accent: '#f4c75b',
    geometry: 'forge',
    defaultPosition: [4.9, 0.48, -2.4],
    route: 'recipes / audits / pattern packs',
    actions: ['mine target', 'choose stack', 'apply patterns']
  },
  {
    id: 'cinema',
    code: '13',
    title: 'Motion Cinema',
    short: 'Remotion world reel',
    body: 'Carries a live Remotion Player so the motion lane becomes timed media instead of a decorative claim.',
    color: '#8ff0a4',
    accent: '#6cf2ff',
    geometry: 'cinema',
    defaultPosition: [4.5, 0.48, 3.25],
    route: 'timed world reel',
    actions: ['timeline', 'poster', 'autoplay loop']
  },
  {
    id: 'vault',
    code: '27',
    title: 'Receipt Vault',
    short: 'live QA evidence',
    body: 'Tracks canvas frames, drag events, runtime stack flags, console health, network health, and deployment evidence.',
    color: '#6cf2ff',
    accent: '#ff5d73',
    geometry: 'vault',
    defaultPosition: [-4.6, 0.48, 3.35],
    route: 'evidence vault / browser gate',
    actions: ['desktop check', 'mobile check', 'network scan']
  },
  {
    id: 'deck',
    code: '99',
    title: 'World Deck',
    short: 'operator route map',
    body: 'The map, search, inspector, and camera rail. It lets an operator move through the site like a place instead of reading stacked sections.',
    color: '#c99bff',
    accent: '#8ff0a4',
    geometry: 'deck',
    defaultPosition: [0.2, 0.48, 5.25],
    route: 'world object navigation',
    actions: ['minimap', 'search', 'camera focus']
  }
];

const STACK = {
  name: SERVER_NAME,
  version: SERVER_VERSION,
  surface: 'MCP2 Immersive Study World',
  dependencies: {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
    three: '^0.168.0',
    '@react-three/fiber': '^8.17.6',
    '@react-three/drei': '^9.111.3',
    '@react-three/postprocessing': '^2.16.2',
    '@theatre/core': '^0.7.2',
    '@remotion/player': '^4.0.220',
    remotion: '^4.0.220',
    gsap: '^3.12.5',
    lenis: '^1.1.14',
    motion: '^11.5.4',
    '@modelcontextprotocol/sdk': '^1.21.0',
    zod: '^4.1.12'
  },
  runtimeProof: [
    'R3F Canvas with CameraControls and draggable chamber meshes',
    'Theatre sheet controls visible scene values',
    'GSAP ScrollTrigger chapters drive active room state',
    'Lenis requestAnimationFrame loop smooths the page scroll',
    'Remotion Player renders a timed world reel',
    'Motion cursor/scan chrome reacts to pointer and scroll'
  ]
};

const ROOM_IDS = ROOMS.map((room) => room.id);

function asJson(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function asText(text) {
  return { content: [{ type: 'text', text }] };
}

function roomById(roomId) {
  return ROOMS.find((room) => room.id === roomId) || null;
}

const SCENE_RECIPE = `// Skye World Scene — R3F spatial world shell
// deps: react, three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Environment, Float, Grid, Stars, Text } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Suspense, useMemo, useRef } from 'react';

const ROOMS = ${JSON.stringify(ROOMS, null, 2)};

function roomPosition(positions, roomId) {
  return positions[roomId] || ROOMS.find((room) => room.id === roomId)?.defaultPosition || [0, 0.48, 0];
}

function RoomShape({ room, active, onSelect }) {
  const group = useRef();
  const base = useMemo(() => new THREE.Color(room.color), [room.color]);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (active ? 0.38 : 0.14);
    group.current.position.y = room.defaultPosition[1] + Math.sin(performance.now() * 0.0014 + room.code) * 0.08;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.18} floatIntensity={0.24}>
      <group ref={group} position={room.defaultPosition} onClick={() => onSelect(room.id)}>
        <mesh castShadow>
          <boxGeometry args={room.geometry === 'door' ? [1.05, 1.7, 0.3] : [1.1, 1.1, 1.1]} />
          <meshStandardMaterial color={base} emissive={base} emissiveIntensity={active ? 1.8 : 0.55} metalness={0.65} roughness={0.18} />
        </mesh>
        <Text position={[0, 1.15, 0]} fontSize={0.18} anchorX="center" color="#fff7df">{room.title}</Text>
      </group>
    </Float>
  );
}

export function SkyeWorldScene({ activeRoom = 'gate', setActiveRoom }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 5, 9], fov: 46 }} shadows>
      <Suspense fallback={null}>
        <ambientLight intensity={0.34} />
        <pointLight position={[0, 4, 0]} color="#f4c75b" intensity={8} distance={18} />
        <Stars radius={60} depth={24} count={1200} factor={3} fade speed={0.28} />
        <Grid position={[0, 0, 0]} args={[14, 14]} cellColor="#6cf2ff" sectionColor="#f4c75b" fadeDistance={16} />
        {ROOMS.map((room) => <RoomShape key={room.id} room={room} active={room.id === activeRoom} onSelect={setActiveRoom} />)}
        <CameraControls makeDefault minDistance={4.5} maxDistance={14} />
        <Environment preset="city" />
        <EffectComposer><Bloom intensity={0.78} luminanceThreshold={0.22} /><Vignette eskil={false} offset={0.2} darkness={0.72} /></EffectComposer>
      </Suspense>
    </Canvas>
  );
}`;

const THEATRE_RECIPE = `// Theatre.js director sheet — keep cinematic values editable
// deps: @theatre/core
import { getProject } from '@theatre/core';

const theatreProject = getProject('MCP2 Immersive Study World', {
  state: {
    sheetsById: {
      'world director': {
        staticOverrides: {
          byObject: {
            'visible scene values': {
              cameraHeight: 4.2,
              corePulse: 0.78,
              roomFloat: 0.36,
              routeGlow: 0.68
            }
          }
        }
      }
    }
  }
});

const theatreSheet = theatreProject.sheet('world director');
export const theatreWorld = theatreSheet.object('visible scene values', {
  cameraHeight: 4.2,
  corePulse: 0.78,
  roomFloat: 0.36,
  routeGlow: 0.68
});

// Runtime pattern:
// theatreWorld.onValuesChange(setTheatreValues)
// CameraControls reads cameraHeight
// central core reads corePulse
// room meshes read roomFloat
// route lines read routeGlow`;

const REMOTION_RECIPE = `// Remotion Player panel — timed world reel inside the page
// deps: @remotion/player, remotion
import { Player } from '@remotion/player';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

const ROOMS = ${JSON.stringify(ROOMS.map(({ id, title, color, accent }) => ({ id, title, color, accent })), null, 2)};

function WorldReel({ activeRoom = 'gate' }) {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 28) % ROOMS.length;
  const room = ROOMS.find((item) => item.id === activeRoom) || ROOMS[step];
  const scale = interpolate(frame % 28, [0, 14, 27], [0.92, 1.06, 0.96]);
  return (
    <AbsoluteFill style={{ background: '#020204', color: '#fff7df', display: 'grid', placeItems: 'center' }}>
      <div style={{ transform: \`scale(\${scale})\`, textAlign: 'center' }}>
        <span style={{ color: room.accent, fontSize: 12, letterSpacing: 2 }}>SKYE WORLD</span>
        <strong style={{ display: 'block', color: room.color, fontSize: 38 }}>{room.title}</strong>
      </div>
    </AbsoluteFill>
  );
}

export function RemotionWorldPanel({ activeRoom }) {
  return (
    <Player
      component={WorldReel}
      inputProps={{ activeRoom }}
      durationInFrames={140}
      fps={28}
      compositionWidth={640}
      compositionHeight={360}
      autoPlay
      loop
      muted
      controls
      acknowledgeRemotionLicense
    />
  );
}`;

const SPATIAL_NAV_RECIPE = `// Spatial navigation — camera focus, drag plane, search, minimap
// deps: @react-three/drei, @react-three/fiber, three
import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCallback, useMemo, useRef } from 'react';

function CameraDirector({ activeRoom, positions, theatreValues }) {
  const controls = useRef(null);
  useEffect(() => {
    const target = positions[activeRoom] || [0, 0.8, 0];
    const height = Number(theatreValues.cameraHeight || 4.2);
    controls.current?.setLookAt(target[0] + 4.8, height, target[2] + 6.2, target[0], target[1], target[2], true);
  }, [activeRoom, positions, theatreValues.cameraHeight]);
  return <CameraControls ref={controls} makeDefault minDistance={4.5} maxDistance={14} />;
}

function useDragPlane() {
  const { camera, size } = useThree();
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.48));
  return useCallback((event) => {
    const pointer = new THREE.Vector2(
      (event.clientX / size.width) * 2 - 1,
      -(event.clientY / size.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    ray.ray.intersectPlane(plane.current, hit);
    return hit;
  }, [camera, size.width, size.height]);
}

// Pair this with a DOM search drawer:
// const filteredRooms = ROOMS.filter(room => [room.title, room.short, room.body, room.route, room.code].some(v => v.toLowerCase().includes(query)))
// MiniMap converts x/z coordinates to percentages and calls setActiveRoom(room.id).`;

const MOTION_CHROME_RECIPE = `// Motion chrome — Lenis + GSAP ScrollTrigger + Motion pointer trail
// deps: gsap, lenis, motion/react
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { animate as motionAnimate, motion as motionDom, useMotionValue, useSpring, useScroll, useTransform } from 'motion/react';

gsap.registerPlugin(ScrollTrigger);

export function installWorldScroll(setActiveRoom, rooms) {
  const lenis = new Lenis({ duration: 1.08, smoothWheel: true, lerp: 0.09 });
  const update = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(update);
  const triggers = rooms.map((room) => ScrollTrigger.create({
    trigger: \`[data-room="\${room.id}"]\`,
    start: 'top 62%',
    end: 'bottom 42%',
    onEnter: () => setActiveRoom(room.id),
    onEnterBack: () => setActiveRoom(room.id)
  }));
  return () => { triggers.forEach((trigger) => trigger.kill()); gsap.ticker.remove(update); lenis.destroy(); };
}

export function MotionChrome({ paused }) {
  const pointerX = useMotionValue(-240);
  const pointerY = useMotionValue(-240);
  const x = useSpring(pointerX, { stiffness: 230, damping: 32, mass: 0.35 });
  const y = useSpring(pointerY, { stiffness: 230, damping: 32, mass: 0.35 });
  const { scrollYProgress } = useScroll();
  const scanShift = useTransform(scrollYProgress, [0, 1], ['0%', '82%']);
  // add pointermove listener; render motionDom.div cursor + scanline with style={{ x, y, '--scan-shift': scanShift }}
}`;

const CSS_RECIPE = `:root {
  --bg: #020204;
  --ink: #fff7df;
  --muted: rgba(255, 247, 223, 0.72);
  --panel: rgba(5, 7, 12, 0.66);
  --stroke: rgba(255, 247, 223, 0.18);
  --brass: #f4c75b;
  --cyan: #6cf2ff;
  --rose: #ff5d73;
  --mint: #8ff0a4;
  --violet: #c99bff;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --scroll-progress: 0;
  --ambient-breathe: 0.5;
}

html::-webkit-scrollbar, body::-webkit-scrollbar { width: 16px; }
html::-webkit-scrollbar-track, body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.08);
  border-left: 1px solid rgba(108, 242, 255, 0.16);
}
html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
  min-height: 76px;
  border: 3px solid rgba(2, 2, 4, 0.94);
  border-radius: 8px;
  background: linear-gradient(180deg, var(--brass), var(--cyan), var(--rose));
  box-shadow: 0 0 24px rgba(108, 242, 255, 0.36), 0 0 18px rgba(244, 199, 91, 0.22);
}
.canvas-stage { position: fixed; inset: 0; z-index: 0; background-size: 46px 46px; }
.world-canvas { width: 100%; height: 100%; cursor: grab; }
.world-title { position: fixed; left: clamp(18px, 4vw, 54px); top: clamp(22px, 5vw, 56px); z-index: 5; max-width: 720px; }
.world-title h1 { font-family: 'Archivo Black', sans-serif; font-size: clamp(3.6rem, 9vw, 9rem); line-height: 0.86; letter-spacing: 0; }
.runtime-panel, .room-drawer, .mini-map { border: 1px solid var(--stroke); background: var(--panel); backdrop-filter: blur(18px); border-radius: 12px; }
.motion-paused .world-canvas, .motion-paused .scanline { animation-play-state: paused; }`;

function qualityGate({ source = '', packageJson = '' }) {
  const text = `${source}\n${packageJson}`;
  const checks = [
    ['r3fCanvas', /<Canvas\b|@react-three\/fiber/.test(text)],
    ['dreiControls', /CameraControls|@react-three\/drei/.test(text)],
    ['postprocessing', /EffectComposer|Bloom|@react-three\/postprocessing/.test(text)],
    ['theatre', /getProject|@theatre\/core|theatreSheet/.test(text)],
    ['remotion', /@remotion\/player|<Player\b|useCurrentFrame/.test(text)],
    ['gsapLenis', /ScrollTrigger|gsap\.registerPlugin|new\s+Lenis/.test(text)],
    ['spatialNavigation', /minimap|CameraDirector|setLookAt|Raycaster|drag/i.test(text)],
    ['nonCardWorld', /canvas-stage|world-canvas|fixed;?\s*inset:\s*0|position:\s*fixed/.test(text)]
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  return {
    ok: failed.length === 0,
    failed,
    passed: checks.filter(([, ok]) => ok).map(([name]) => name),
    rule: 'A Skye World surface must render as a full-viewport spatial scene with real R3F/Three runtime, Theatre-directed values, Remotion timed media, and browser-proofable navigation.'
  };
}

export function createSkyeWorldMcpServer() {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool('world_index', {
    title: 'Skye World Tool Index',
    description: 'List all Skye World MCP tools and when to use them.',
    inputSchema: {}
  }, async () => asJson({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    tools: [
      'world_index',
      'world_stack',
      'world_rooms',
      'world_scene',
      'world_theatre',
      'world_remotion',
      'world_spatial_nav',
      'world_motion_chrome',
      'world_css',
      'world_quality_gate'
    ]
  }));

  server.registerTool('world_stack', {
    title: 'Skye World Stack',
    description: 'Return the MCP2 world-site stack and runtime proof obligations.',
    inputSchema: {}
  }, async () => asJson(STACK));

  server.registerTool('world_rooms', {
    title: 'Skye World Rooms',
    description: 'Return the five spatial room definitions, or one room by id.',
    inputSchema: {
      roomId: z.enum([...ROOM_IDS]).optional()
    }
  }, async ({ roomId } = {}) => asJson(roomId ? roomById(roomId) : ROOMS));

  server.registerTool('world_scene', {
    title: 'R3F World Scene Recipe',
    description: 'Return a production R3F scene recipe for a spatial world-site surface.',
    inputSchema: {}
  }, async () => asText(SCENE_RECIPE));

  server.registerTool('world_theatre', {
    title: 'Theatre Director Recipe',
    description: 'Return Theatre.js object wiring for cinematic runtime values.',
    inputSchema: {}
  }, async () => asText(THEATRE_RECIPE));

  server.registerTool('world_remotion', {
    title: 'Remotion World Reel Recipe',
    description: 'Return a Remotion Player recipe for timed world-site media.',
    inputSchema: {}
  }, async () => asText(REMOTION_RECIPE));

  server.registerTool('world_spatial_nav', {
    title: 'Spatial Navigation Recipe',
    description: 'Return camera focus, drag-plane, search, and minimap navigation patterns.',
    inputSchema: {}
  }, async () => asText(SPATIAL_NAV_RECIPE));

  server.registerTool('world_motion_chrome', {
    title: 'World Motion Chrome Recipe',
    description: 'Return Lenis, GSAP ScrollTrigger, and Motion pointer/scan chrome wiring.',
    inputSchema: {}
  }, async () => asText(MOTION_CHROME_RECIPE));

  server.registerTool('world_css', {
    title: 'Skye World CSS System',
    description: 'Return the world-site CSS custom properties and key runtime classes.',
    inputSchema: {}
  }, async () => asText(CSS_RECIPE));

  server.registerTool('world_quality_gate', {
    title: 'Skye World Quality Gate',
    description: 'Audit whether generated source actually includes the expected spatial world runtime signals.',
    inputSchema: {
      source: z.string().optional().describe('Concatenated source files to audit'),
      packageJson: z.string().optional().describe('package.json text to audit')
    }
  }, async (args = {}) => asJson(qualityGate(args)));

  return server;
}

export async function runStdioServer() {
  const server = createSkyeWorldMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const here = fs.realpathSync(fileURLToPath(import.meta.url));
const entry = process.argv[1] ? fs.realpathSync(process.argv[1]) : '';
if (here === entry) {
  await runStdioServer();
}
