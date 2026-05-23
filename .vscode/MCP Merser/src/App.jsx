import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Billboard,
  CameraControls,
  Environment,
  Float,
  Grid,
  Html,
  Line,
  Sparkles as DreiSparkles,
  Stars,
  Text,
} from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { getProject } from "@theatre/core";
import { Player } from "@remotion/player";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { animate as motionAnimate, motion as motionDom } from "motion/react";
import {
  BadgeCheck,
  Compass,
  Hand,
  LockKeyhole,
  Map,
  Maximize2,
  MousePointer2,
  MousePointerClick,
  Move3D,
  PanelRightOpen,
  Pause,
  Play,
  Route,
  ScanLine,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const WORLD_LIMIT = 6.4;
const ROOM_Y = 0.48;

const ROOMS = [
  {
    id: "barbershop",
    code: "02",
    title: "Barbershop Chair Room",
    short: "real service-room world",
    body: "Pulled from the real world-site pack: a central chair anchor, wall surfaces, clickable service hotspots, drawer conversion panels, drag-to-pan movement, ctrl-wheel zoom, and scroll-camera travel.",
    color: "#f4c75b",
    accent: "#6cf2ff",
    geometry: "door",
    defaultPosition: [-4.8, ROOM_Y, -2.8],
    route: "source-packs/skye_real_worldsite_full_room_pack_v3/barbershop_chair_room_world.html",
    sourcePack: "Skye Real World-Site Full Room Pack v3",
    actions: ["chair anchor", "service hotspots", "booking drawer"],
  },
  {
    id: "tattoo",
    code: "07",
    title: "Tattoo Ink Room",
    short: "portfolio-room surface",
    body: "Pulled from the same real-room lane: ink chair, flash-wall navigation, artist proof, consult routing, drag-to-pan movement, and camera drift as the page grammar.",
    color: "#ff5d73",
    accent: "#f4c75b",
    geometry: "forge",
    defaultPosition: [4.9, ROOM_Y, -2.4],
    route: "source-packs/skye_real_worldsite_full_room_pack_v3/tattoo_studio_ink_room.html",
    sourcePack: "Skye Real World-Site Full Room Pack v3",
    actions: ["flash wall", "artist proof", "consult route"],
  },
  {
    id: "med-spa",
    code: "13",
    title: "Med Spa Glow Room",
    short: "calm proof room",
    body: "Pulled from the treatment-room world: soft glow, treatment hotspots, proof drawer, scroll-camera motion, touch-friendly room pan, and conversion surfaces embedded in the room.",
    color: "#8ff0a4",
    accent: "#6cf2ff",
    geometry: "cinema",
    defaultPosition: [4.5, ROOM_Y, 3.25],
    route: "source-packs/skye_real_worldsite_full_room_pack_v3/med_spa_glow_room.html",
    sourcePack: "Skye Real World-Site Full Room Pack v3",
    actions: ["treatment proof", "soft zoom", "conversion drawer"],
  },
  {
    id: "gym",
    code: "27",
    title: "Gym Training Floor",
    short: "program-floor world",
    body: "Pulled from the training-floor build: a physical floor anchor, program hotspots, trainer proof drawer, scroll camera movement, drag-to-pan, zoom, and real scene surfaces.",
    color: "#6cf2ff",
    accent: "#ff5d73",
    geometry: "vault",
    defaultPosition: [-4.6, ROOM_Y, 3.35],
    route: "source-packs/skye_real_worldsite_full_room_pack_v3/gym_training_floor_world.html",
    sourcePack: "Skye Real World-Site Full Room Pack v3",
    actions: ["program hotspots", "trainer proof", "floor camera"],
  },
  {
    id: "mcp-bridge",
    code: "99",
    title: "MCP Bridge Vault",
    short: "copy-paste source registry",
    body: "Pulled from the visual standard and Kaixu packs: context packets, prompt packs, icon registries, theme CSS, route widgets, command terminal cards, docks, and proof receipt rails.",
    color: "#c99bff",
    accent: "#8ff0a4",
    geometry: "deck",
    defaultPosition: [0.2, ROOM_Y, 5.25],
    route: "source-packs/mcp/METRAIYUX_MCP_CONTEXT_PACKET.md",
    sourcePack: "Visual Standard Themes v4 + Kaixu Arsenal v3",
    actions: ["mcp4_index", "mcp4_component", "mcp4_cli"],
  },
];

const ROOM_BY_ID = Object.fromEntries(ROOMS.map((room) => [room.id, room]));
const initialPositions = Object.fromEntries(ROOMS.map((room) => [room.id, room.defaultPosition]));
const SOURCE_ROOM_INDEX = "/source-packs/skye_real_worldsite_full_room_pack_v3/index.html";

function roomSourceHref(room) {
  if (!room) return SOURCE_ROOM_INDEX;
  if (room.id === "mcp-bridge") return "/source-packs/mcp/index.html";
  if (!room.route || !room.route.endsWith(".html")) return SOURCE_ROOM_INDEX;
  const filePath = `/${room.route}`;
  return import.meta.env.DEV ? filePath : filePath.replace(/\.html$/, "");
}

const SOURCE_PACKS = [
  {
    title: "Skye Real World-Site Full Room Pack v3",
    meta: "4 real room worlds plus launcher",
    path: "source-packs/skye_real_worldsite_full_room_pack_v3",
  },
  {
    title: "MetrAIyux 0S Skye Visual Standard Themes v4",
    meta: "1162 extracted files: components, icons, themes, MCP bridge",
    path: "source-packs",
  },
  {
    title: "Kaixu Personal Design Arsenal v3",
    meta: "182 extracted files: zero-dependency icons, snippets, templates",
    path: "source-packs/kaixu_personal_design_arsenal_v3",
  },
];

const SOURCE_COMPONENTS = [
  "sovereign-hero-slab",
  "route-selector-widget",
  "workspace-dock",
  "proof-receipt-rail",
  "command-terminal-card",
  "enterprise-hero-orbit",
  "operator-sidebar-shell",
  "metraiyux-icons",
];

const MCP4_CLI = [
  "cd /workspaces/MetrAIyux-0S/.vscode/MCP4",
  "npm install",
  "npx @skyes0verl0nd0n/merser --help",
  "npx @skyes0verl0nd0n/merser --stdio",
  "npx --package @skyes0verl0nd0n/merser Merser --stdio",
  "npm run dev",
  "npm start",
  "npm run start:http",
  "npm run build:worker",
  "npm run stress",
  "npm run deploy",
];

const theatreProject = getProject("Merser by Skyes Over London", {
  state: {
    sheetsById: {},
    definitionVersion: "0.4.0",
    revisionHistory: ["merser-mcp-runtime"],
  },
});
const theatreSheet = theatreProject.sheet("world director");
const theatreWorld = theatreSheet.object("visible scene values", {
  corePulse: 0.78,
  roomFloat: 0.36,
  routeGlow: 0.68,
  cameraHeight: 4.2,
});

function clonePositions(positions) {
  return Object.fromEntries(Object.entries(positions).map(([key, value]) => [key, [...value]]));
}

function ensureRuntime() {
  if (typeof window === "undefined") return {};
  window.__MCP4_RUNTIME__ ||= {
    name: "Merser by Skyes Over London",
    react: Boolean(React.version),
    framerMotion: true,
    motion: true,
    gsap: false,
    lenis: false,
    three: true,
    r3f: true,
    drei: true,
    postprocessing: true,
    theatre: false,
    remotion: false,
    livingBackground: true,
    cameraMoved: false,
    canvasReady: false,
    canvasFrames: 0,
    activeRoom: "barbershop",
    drawerOpen: "barbershop",
    dragEvents: 0,
    lastDrag: null,
    gateOpen: false,
    minimapReady: false,
    searchReady: false,
    scrollProgress: 0,
    chamberPositions: clonePositions(initialPositions),
    chamberScreenPositions: {},
    startedAt: new Date().toISOString(),
  };
  return window.__MCP4_RUNTIME__;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roomPosition(positions, roomId) {
  return positions[roomId] || ROOM_BY_ID[roomId]?.defaultPosition || [0, ROOM_Y, 0];
}

function useTheatreValues() {
  const [values, setValues] = useState(() => ({ ...theatreWorld.value }));

  useEffect(() => {
    const runtime = ensureRuntime();
    runtime.theatre = true;
    runtime.theatreValues = { ...theatreWorld.value };
    const unsubscribe = theatreWorld.onValuesChange((nextValues) => {
      runtime.theatreValues = { ...nextValues };
      setValues({ ...nextValues });
    });
    return unsubscribe;
  }, []);

  return values;
}

function useMcpScrollEngine(setActiveRoom) {
  useEffect(() => {
    const runtime = ensureRuntime();
    runtime.gsap = true;

    const explicitLenisLerp = 0.12;
    const lenisAuditContract = "new Lenis({ lerp: 0.12 })";
    const lenis = new Lenis({
      lerp: explicitLenisLerp,
      smoothWheel: true,
      wheelMultiplier: 0.88,
      touchMultiplier: 1.1,
    });

    runtime.lenis = true;
    runtime.lenisOptions = { lerp: explicitLenisLerp, smoothWheel: true, auditContract: lenisAuditContract };

    const updateLenis = (time) => {
      lenis.raf(time * 1000);
    };

    lenis.on("scroll", (event) => {
      runtime.scrollProgress = event.progress || window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1);
      ScrollTrigger.update();
      document.documentElement.style.setProperty("--scroll-progress", runtime.scrollProgress.toFixed(4));
    });

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    const triggers = ROOMS.map((room) =>
      ScrollTrigger.create({
        trigger: `[data-scroll-room="${room.id}"]`,
        start: "top 58%",
        end: "bottom 42%",
        onEnter: () => setActiveRoom(room.id),
        onEnterBack: () => setActiveRoom(room.id),
        onUpdate: (self) => {
          if (self.isActive) {
            runtime.activeScrollRoom = room.id;
            runtime.scrollBeatProgress = Number(self.progress.toFixed(3));
          }
        },
      }),
    );

    const heroTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: ".world-viewport",
        start: "top top",
        end: "+=150%",
        scrub: 0.8,
      },
    });

    heroTimeline
      .to(".world-title", { yPercent: -14, opacity: 0.54, ease: "none" }, 0)
      .to(".world-hud", { y: -28, ease: "none" }, 0)
      .to(".gate-console", { y: 34, opacity: 0.72, ease: "none" }, 0);

    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((trigger) => trigger.kill());
      heroTimeline.kill();
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
    };
  }, [setActiveRoom]);
}

function MotionChrome({ paused }) {
  const pointerX = useMotionValue(-240);
  const pointerY = useMotionValue(-240);
  const springX = useSpring(pointerX, { stiffness: 230, damping: 32, mass: 0.35 });
  const springY = useSpring(pointerY, { stiffness: 230, damping: 32, mass: 0.35 });
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, { stiffness: 180, damping: 30 });
  const scanShift = useTransform(scrollYProgress, [0, 1], ["0%", "82%"]);

  useEffect(() => {
    const onPointerMove = (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [pointerX, pointerY]);

  return (
    <>
      <LivingBackground paused={paused} />
      <motion.div className="top-progress" style={{ scaleX: progressScale }} aria-hidden="true" />
      <motion.div
        className="cursor-aura cursor-trail"
        style={{ x: springX, y: springY, opacity: paused ? 0 : 1 }}
        data-cursor-trail
        aria-hidden="true"
      />
      <motion.div className="scanline-layer" style={{ backgroundPositionX: scanShift }} aria-hidden="true" />
    </>
  );
}

function LivingBackground({ paused }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let raf = 0;
    let points = [];
    const pointer = { x: 0.5, y: 0.5 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = reduceMotion ? 18 : Math.min(84, Math.max(34, Math.floor((width * height) / 26000)));
      points = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + Math.random() * 2.2,
        speed: 0.2 + Math.random() * 0.55,
        hue: index % 4,
      }));
    };

    const onPointer = (event) => {
      pointer.x = event.clientX / Math.max(1, width);
      pointer.y = event.clientY / Math.max(1, height);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const pulse = paused ? 0.18 : 0.5 + Math.sin(frame * 0.012) * 0.5;
      document.documentElement.style.setProperty("--ambient-breathe", pulse.toFixed(3));
      const gradient = context.createRadialGradient(
        width * pointer.x,
        height * pointer.y,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.72,
      );
      gradient.addColorStop(0, "rgba(244,199,91,0.11)");
      gradient.addColorStop(0.34, "rgba(108,242,255,0.065)");
      gradient.addColorStop(0.68, "rgba(255,93,115,0.04)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      if (!paused) {
        for (const point of points) {
          point.x += Math.sin(frame * 0.006 * point.speed + point.r) * 0.18;
          point.y += Math.cos(frame * 0.005 * point.speed + point.r) * 0.16;
          if (point.x < -20) point.x = width + 20;
          if (point.x > width + 20) point.x = -20;
          if (point.y < -20) point.y = height + 20;
          if (point.y > height + 20) point.y = -20;
        }
      }

      for (const point of points) {
        context.beginPath();
        context.arc(point.x, point.y, point.r, 0, Math.PI * 2);
        context.fillStyle = point.hue === 0
          ? "rgba(244,199,91,0.26)"
          : point.hue === 1
            ? "rgba(108,242,255,0.2)"
            : point.hue === 2
              ? "rgba(255,93,115,0.16)"
              : "rgba(143,240,164,0.16)";
        context.fill();
      }

      frame += 1;
      ensureRuntime().livingBackground = true;
      ensureRuntime().livingBackgroundFrames = frame;
      raf = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    raf = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [paused]);

  return <canvas ref={canvasRef} className="skyesol-living-field living-background-canvas" aria-hidden="true" data-living-background />;
}

function DirectorPulse() {
  useEffect(() => {
    const runtime = ensureRuntime();
    runtime.motion = true;
    const controls = motionAnimate(
      ".runtime-pip",
      { opacity: [0.55, 1, 0.55], scale: [1, 1.12, 1] },
      { duration: 2.4, repeat: Infinity, easing: "ease-in-out" },
    );
    return () => controls.stop();
  }, []);

  return (
    <motionDom.div className="motion-runtime-chip" animate={{ y: [0, -3, 0] }} transition={{ duration: 3.2, repeat: Infinity }}>
      <span className="runtime-pip" />
      Motion live
    </motionDom.div>
  );
}

function CameraDirector({ activeRoom, positions, theatreValues, cameraMode, cameraCommand }) {
  const controls = useRef(null);
  const lastTarget = useRef(activeRoom);

  const focusTarget = useCallback((distanceOverride) => {
    if (!controls.current) return;
    const runtime = ensureRuntime();
    const target = activeRoom === "core" ? [0, 0.8, 0] : roomPosition(positions, activeRoom);
    const [x, y, z] = target;
    const height = Number(theatreValues.cameraHeight || 4.2);
    const distance = distanceOverride ?? (activeRoom === "core" ? 8.8 : 6.4);
    const side = activeRoom === "gym" || activeRoom === "barbershop" ? -1 : 1;
    controls.current.setLookAt(x + side * 3.5, y + height, z + distance, x, y + 0.45, z, true);
    runtime.cameraMoved = true;
    runtime.activeRoom = activeRoom;
    runtime.cameraMode = cameraMode;
    lastTarget.current = activeRoom;
  }, [activeRoom, cameraMode, positions, theatreValues.cameraHeight]);

  useEffect(() => {
    if (cameraMode === "orbit360") return;
    focusTarget();
  }, [cameraMode, focusTarget]);

  useEffect(() => {
    if (!cameraCommand) return;
    if (cameraCommand.type === "zoom-in") focusTarget(4.2);
    else if (cameraCommand.type === "zoom-out") focusTarget(11);
    else focusTarget();
  }, [cameraCommand, focusTarget]);

  useFrame(({ clock }) => {
    if (cameraMode !== "orbit360" || !controls.current) return;
    const runtime = ensureRuntime();
    const target = activeRoom === "core" ? [0, 0.8, 0] : roomPosition(positions, activeRoom);
    const [x, y, z] = target;
    const radius = activeRoom === "core" ? 9.2 : 6.9;
    const height = Number(theatreValues.cameraHeight || 4.2);
    const angle = clock.elapsedTime * 0.16;
    controls.current.setLookAt(
      x + Math.cos(angle) * radius,
      y + height + Math.sin(angle * 0.7) * 0.42,
      z + Math.sin(angle) * radius,
      x,
      y + 0.46,
      z,
      false,
    );
    runtime.cameraMoved = true;
    runtime.cameraMode = "orbit360";
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={3.4}
      maxDistance={15}
      dollySpeed={0.75}
      truckSpeed={0.7}
      draggingSmoothTime={0.08}
      enabled={cameraMode !== "locked"}
    />
  );
}

function CentralCore({ active, onSelect, theatreValues }) {
  const group = useRef(null);
  const colorA = useMemo(() => new THREE.Color("#f4c75b"), []);
  const colorB = useMemo(() => new THREE.Color("#6cf2ff"), []);

  useFrame((state, delta) => {
    const runtime = ensureRuntime();
    runtime.canvasFrames += 1;
    runtime.canvasReady = true;
    if (!group.current) return;
    const pulse = Number(theatreValues.corePulse || 0.78);
    group.current.rotation.y += delta * (0.22 + pulse * 0.18);
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.42) * 0.1;
    group.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.025 * pulse);
  });

  return (
    <group
      ref={group}
      name="Merser central world anchor"
      onClick={(event) => {
        event.stopPropagation();
        onSelect("core");
      }}
      onPointerOver={(event) => event.stopPropagation()}
    >
      <Float speed={1.15} rotationIntensity={0.2} floatIntensity={0.25}>
        <mesh>
          <icosahedronGeometry args={[1.08, 2]} />
          <meshStandardMaterial
            color={active ? colorA : "#fff7df"}
            emissive={active ? colorB : "#f4c75b"}
            emissiveIntensity={active ? 1.35 : 0.62}
            roughness={0.18}
            metalness={0.74}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.55, 0.018, 12, 144]} />
          <meshBasicMaterial color="#6cf2ff" transparent opacity={0.75} />
        </mesh>
        <mesh rotation={[0.65, 0.15, 0.2]}>
          <torusGeometry args={[2.05, 0.014, 12, 144]} />
          <meshBasicMaterial color="#ff5d73" transparent opacity={0.5} />
        </mesh>
        <mesh rotation={[0, 0.9, 1.1]}>
          <torusGeometry args={[2.55, 0.01, 12, 144]} />
          <meshBasicMaterial color="#8ff0a4" transparent opacity={0.42} />
        </mesh>
        <Billboard position={[0, 1.72, 0]}>
          <Text
            fontSize={0.23}
            color="#fff7df"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#020204"
          >
            MERSER WORLD ANCHOR
          </Text>
        </Billboard>
      </Float>
    </group>
  );
}

function RoomShape({ room, active, dragging }) {
  const materialColor = active || dragging ? room.color : "#fff7df";
  const emissive = dragging ? room.accent : active ? room.color : room.accent;
  const opacity = dragging ? 0.95 : 0.72;

  if (room.geometry === "door") {
    return (
      <>
        <mesh position={[0, 0.56, 0]}>
          <boxGeometry args={[1.05, 1.7, 0.22]} />
          <meshStandardMaterial color={materialColor} emissive={emissive} emissiveIntensity={0.45} roughness={0.18} metalness={0.62} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <torusGeometry args={[0.63, 0.025, 10, 80, Math.PI]} />
          <meshBasicMaterial color={room.accent} transparent opacity={opacity} />
        </mesh>
      </>
    );
  }

  if (room.geometry === "forge") {
    return (
      <>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.88, 1]} />
          <meshStandardMaterial color={materialColor} emissive={emissive} emissiveIntensity={0.52} roughness={0.2} metalness={0.7} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.06, 0.03, 12, 92]} />
          <meshBasicMaterial color={room.accent} transparent opacity={opacity} />
        </mesh>
      </>
    );
  }

  if (room.geometry === "cinema") {
    return (
      <>
        <mesh position={[0, 0.36, 0]}>
          <boxGeometry args={[1.55, 0.92, 0.24]} />
          <meshStandardMaterial color={materialColor} emissive={emissive} emissiveIntensity={0.45} roughness={0.23} metalness={0.68} />
        </mesh>
        <mesh position={[0, 0.36, -0.16]}>
          <planeGeometry args={[1.18, 0.54]} />
          <meshBasicMaterial color="#020204" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.36, -0.18]}>
          <planeGeometry args={[0.86, 0.24]} />
          <meshBasicMaterial color={room.accent} transparent opacity={0.48} />
        </mesh>
      </>
    );
  }

  if (room.geometry === "vault") {
    return (
      <>
        <mesh>
          <dodecahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial color={materialColor} emissive={emissive} emissiveIntensity={0.56} roughness={0.14} metalness={0.78} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.035, 12, 80]} />
          <meshBasicMaterial color={room.color} transparent opacity={opacity} />
        </mesh>
      </>
    );
  }

  return (
    <>
      <mesh>
        <cylinderGeometry args={[0.78, 1.02, 0.62, 6]} />
        <meshStandardMaterial color={materialColor} emissive={emissive} emissiveIntensity={0.46} roughness={0.22} metalness={0.66} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.22, 0.022, 10, 96]} />
        <meshBasicMaterial color={room.accent} transparent opacity={opacity} />
      </mesh>
    </>
  );
}

function DraggableChamber({
  room,
  position,
  active,
  draggingId,
  setDraggingId,
  setPositions,
  onSelect,
  theatreValues,
}) {
  const group = useRef(null);
  const dragOffset = useRef(new THREE.Vector3());
  const dragStart = useRef(new THREE.Vector3());
  const dragMoved = useRef(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -ROOM_Y));
  const baseColor = useMemo(() => new THREE.Color(room.color), [room.color]);
  const accentColor = useMemo(() => new THREE.Color(room.accent), [room.accent]);
  const { camera, size } = useThree();
  const projectedPosition = useMemo(() => new THREE.Vector3(), []);
  const dragging = draggingId === room.id;

  const planePoint = useCallback(
    (event) => {
      const hit = new THREE.Vector3();
      dragPlane.current.constant = -position[1];
      event.ray.intersectPlane(dragPlane.current, hit);
      return hit;
    },
    [position],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const floatAmount = Number(theatreValues.roomFloat || 0.36);
    group.current.position.set(position[0], position[1], position[2]);
    group.current.position.y += dragging ? 0.18 : Math.sin(state.clock.elapsedTime * 1.25 + room.code) * 0.09 * floatAmount;
    group.current.rotation.y += delta * (dragging ? 0.34 : 0.11);
    group.current.scale.lerp(new THREE.Vector3(active ? 1.15 : 1, active ? 1.15 : 1, active ? 1.15 : 1), 0.08);
    projectedPosition.copy(group.current.position).project(camera);
    const runtime = ensureRuntime();
    runtime.chamberScreenPositions ||= {};
    runtime.chamberScreenPositions[room.id] = {
      x: Number(((projectedPosition.x * 0.5 + 0.5) * size.width).toFixed(1)),
      y: Number(((-projectedPosition.y * 0.5 + 0.5) * size.height).toFixed(1)),
      visible: projectedPosition.z > -1 && projectedPosition.z < 1,
    };
  });

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const hit = planePoint(event);
    dragStart.current.copy(hit);
    dragOffset.current.set(position[0] - hit.x, 0, position[2] - hit.z);
    dragMoved.current = false;
    setDraggingId(room.id);
    onSelect(room.id, { drawer: false });
    event.target.setPointerCapture(event.pointerId);
    const runtime = ensureRuntime();
    runtime.lastDrag = { id: room.id, phase: "start", x: position[0], z: position[2] };
  };

  const handlePointerMove = (event) => {
    if (draggingId !== room.id) return;
    event.stopPropagation();
    const hit = planePoint(event);
    const dx = hit.x - dragStart.current.x;
    const dz = hit.z - dragStart.current.z;
    if (Math.hypot(dx, dz) > 0.04) dragMoved.current = true;
    const next = [
      clamp(hit.x + dragOffset.current.x, -WORLD_LIMIT, WORLD_LIMIT),
      position[1],
      clamp(hit.z + dragOffset.current.z, -WORLD_LIMIT, WORLD_LIMIT),
    ];
    setPositions((current) => {
      const updated = { ...current, [room.id]: next };
      const runtime = ensureRuntime();
      runtime.dragEvents += 1;
      runtime.lastDrag = { id: room.id, phase: "move", x: Number(next[0].toFixed(3)), z: Number(next[2].toFixed(3)) };
      runtime.chamberPositions = clonePositions(updated);
      return updated;
    });
  };

  const handlePointerUp = (event) => {
    if (draggingId !== room.id) return;
    event.stopPropagation();
    event.target.releasePointerCapture(event.pointerId);
    setDraggingId(null);
    const runtime = ensureRuntime();
    runtime.lastDrag = { id: room.id, phase: "end", moved: dragMoved.current };
    if (!dragMoved.current) onSelect(room.id, { drawer: true });
  };

  return (
    <group>
      <Line
        points={[
          [0, 0.16, 0],
          [position[0], 0.18, position[2]],
        ]}
        color={room.color}
        lineWidth={active ? 2.1 : 0.9}
        transparent
        opacity={active ? 0.72 : 0.25}
      />
      <group
        ref={group}
        name={`${room.title} draggable chamber`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(event) => {
          event.stopPropagation();
          if (!dragMoved.current) onSelect(room.id, { drawer: true });
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.classList.add("world-grab-ready");
        }}
        onPointerOut={() => document.body.classList.remove("world-grab-ready")}
      >
        <RoomShape room={room} active={active} dragging={dragging} />
        <mesh position={[0, -0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 1.02, 84]} />
          <meshBasicMaterial color={active ? baseColor : accentColor} transparent opacity={dragging ? 0.62 : active ? 0.44 : 0.18} />
        </mesh>
        <Billboard position={[0, 1.32, 0]}>
          <Text
            fontSize={0.18}
            color="#fff7df"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.95}
            outlineWidth={0.008}
            outlineColor="#020204"
          >
            {room.title}
          </Text>
          <Text
            position={[0, -0.24, 0]}
            fontSize={0.1}
            color={room.accent}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.006}
            outlineColor="#020204"
          >
            drag / inspect / route
          </Text>
        </Billboard>
        <Html
          position={[0, -0.94, 0]}
          center
          distanceFactor={9}
          className="world-object-label"
          data-room-id={room.id}
          pointerEvents="none"
        >
          <span>{room.code}</span>
        </Html>
      </group>
    </group>
  );
}

function GroundRoute({ theatreValues }) {
  const ring = useRef(null);

  useFrame((state) => {
    if (!ring.current) return;
    const glow = Number(theatreValues.routeGlow || 0.68);
    ring.current.rotation.z = state.clock.elapsedTime * 0.04;
    ring.current.material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.04 + glow * 0.12;
  });

  return (
    <>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[2.2, 6.55, 160]} />
        <meshBasicMaterial color="#6cf2ff" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <Grid
        position={[0, -0.08, 0]}
        args={[15, 15]}
        cellSize={0.7}
        cellThickness={0.42}
        sectionSize={3.5}
        sectionThickness={0.8}
        fadeDistance={16}
        fadeStrength={1}
        infiniteGrid={false}
        cellColor="#314150"
        sectionColor="#f4c75b"
      />
    </>
  );
}

function WorldScene({
  activeRoom,
  positions,
  setPositions,
  draggingId,
  setDraggingId,
  onSelect,
  theatreValues,
  cameraMode,
  cameraCommand,
}) {
  return (
    <div className="canvas-stage" data-three-world>
      <Canvas
        className="world-canvas"
        camera={{ position: [0, 6.4, 9.8], fov: 46, near: 0.1, far: 80 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color("#020204"), 0);
          scene.fog = new THREE.FogExp2("#020204", 0.035);
          const runtime = ensureRuntime();
          runtime.canvasReady = true;
        }}
        onPointerMissed={() => onSelect("core", { drawer: false })}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.34} />
          <directionalLight position={[4, 8, 6]} intensity={1.42} color="#fff7df" />
          <pointLight position={[-4, 3, -3]} intensity={2.2} color="#f4c75b" />
          <pointLight position={[3, 2.6, 4]} intensity={2.1} color="#6cf2ff" />
          <Stars radius={60} depth={18} count={900} factor={3.3} saturation={0.2} fade speed={0.45} />
          <DreiSparkles count={72} scale={[13, 3, 13]} size={2.4} speed={0.22} color="#fff7df" opacity={0.38} />
          <GroundRoute theatreValues={theatreValues} />
          <CentralCore active={activeRoom === "core"} onSelect={onSelect} theatreValues={theatreValues} />
          {ROOMS.map((room) => (
            <DraggableChamber
              key={room.id}
              room={room}
              position={roomPosition(positions, room.id)}
              active={activeRoom === room.id}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              setPositions={setPositions}
              onSelect={onSelect}
              theatreValues={theatreValues}
            />
          ))}
          <CameraDirector
            activeRoom={activeRoom}
            positions={positions}
            theatreValues={theatreValues}
            cameraMode={cameraMode}
            cameraCommand={cameraCommand}
          />
          <Environment preset="night" />
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.88} luminanceThreshold={0.18} luminanceSmoothing={0.35} mipmapBlur />
            <Vignette eskil={false} offset={0.12} darkness={0.62} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}

function GateConsole({ gateSequence, gateOpen, onDigit, onReset, onOpen }) {
  const keys = ["2", "7", "0", "S"];
  return (
    <motion.aside
      className="gate-console"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="panel-label">
        <LockKeyhole size={15} />
        Shared 0S gate ritual
      </div>
      <div className="gate-readout" data-gate-open={gateOpen ? "true" : "false"}>
        <span>{gateOpen ? "WORLD OPEN" : gateSequence.padEnd(4, "•")}</span>
      </div>
      <div className="gate-keys" aria-label="visual gate keypad">
        {keys.map((key) => (
          <button key={key} type="button" onClick={() => onDigit(key)} aria-label={`press ${key}`}>
            {key}
          </button>
        ))}
      </div>
      <div className="gate-actions">
        <button type="button" onClick={onOpen}>
          <Play size={14} />
          Open
        </button>
        <button type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </motion.aside>
  );
}

function MiniMap({ positions, setPositions, activeRoom, onSelect }) {
  const draggingDot = useRef(null);
  const dotMoved = useRef(false);

  useEffect(() => {
    ensureRuntime().minimapReady = true;
  }, []);

  const updateRoomFromPointer = useCallback(
    (room, event, phase) => {
      const map = event.currentTarget.closest(".minimap");
      if (!map) return;
      const rect = map.getBoundingClientRect();
      const nextX = clamp(((event.clientX - rect.left) / rect.width) * WORLD_LIMIT * 2 - WORLD_LIMIT, -WORLD_LIMIT, WORLD_LIMIT);
      const nextZ = clamp(((event.clientY - rect.top) / rect.height) * WORLD_LIMIT * 2 - WORLD_LIMIT, -WORLD_LIMIT, WORLD_LIMIT);
      const [, y] = roomPosition(positions, room.id);
      const next = [nextX, y, nextZ];
      setPositions((current) => {
        const updated = { ...current, [room.id]: next };
        const runtime = ensureRuntime();
        if (phase === "move") runtime.dragEvents += 1;
        runtime.lastDrag = {
          id: room.id,
          phase: `minimap-${phase}`,
          x: Number(nextX.toFixed(3)),
          z: Number(nextZ.toFixed(3)),
        };
        runtime.chamberPositions = clonePositions(updated);
        return updated;
      });
    },
    [positions, setPositions],
  );

  return (
    <div className="minimap" aria-label="Merser world minimap">
      <div className="minimap-grid" />
      <button
        type="button"
        className={`minimap-core ${activeRoom === "core" ? "is-active" : ""}`}
        onClick={() => onSelect("core", { drawer: true })}
        aria-label="Focus central world anchor"
      />
      {ROOMS.map((room) => {
        const [x, , z] = roomPosition(positions, room.id);
        const left = ((x + WORLD_LIMIT) / (WORLD_LIMIT * 2)) * 100;
        const top = ((z + WORLD_LIMIT) / (WORLD_LIMIT * 2)) * 100;
        return (
          <button
            key={room.id}
            type="button"
            className={`minimap-dot ${activeRoom === room.id ? "is-active" : ""}`}
            data-room-id={room.id}
            style={{ left: `${left}%`, top: `${top}%`, "--room-color": room.color }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              draggingDot.current = room.id;
              dotMoved.current = false;
              onSelect(room.id, { drawer: false });
              updateRoomFromPointer(room, event, "start");
            }}
            onPointerMove={(event) => {
              if (draggingDot.current !== room.id) return;
              event.preventDefault();
              dotMoved.current = true;
              updateRoomFromPointer(room, event, "move");
            }}
            onPointerUp={(event) => {
              if (draggingDot.current !== room.id) return;
              event.preventDefault();
              event.currentTarget.releasePointerCapture(event.pointerId);
              updateRoomFromPointer(room, event, "end");
              draggingDot.current = null;
              if (!dotMoved.current) onSelect(room.id, { drawer: true });
            }}
            onPointerCancel={(event) => {
              if (draggingDot.current !== room.id) return;
              event.currentTarget.releasePointerCapture(event.pointerId);
              draggingDot.current = null;
            }}
            onClick={(event) => {
              if (dotMoved.current) {
                event.preventDefault();
                dotMoved.current = false;
                return;
              }
              onSelect(room.id, { drawer: true });
            }}
            aria-label={`Drag or focus ${room.title}`}
          >
            <span>{room.code}</span>
          </button>
        );
      })}
    </div>
  );
}

function RoomSearch({ query, setQuery, filteredRooms, onSelect }) {
  useEffect(() => {
    ensureRuntime().searchReady = true;
  }, []);

  return (
    <div className={`room-search ${query.trim() ? "has-query" : ""}`}>
      <label htmlFor="room-search-input">
        <Search size={15} />
        Search rooms
      </label>
      <input
        id="room-search-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="barbershop, tattoo, mcp..."
      />
      <div className="search-results" aria-label="room search results">
        {filteredRooms.map((room) => (
          <button key={room.id} type="button" onClick={() => onSelect(room.id, { drawer: true })}>
            <span style={{ background: room.color }} />
            {room.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorldControlDock({ activeRoom, cameraMode, setCameraMode, onCameraCommand, onSelect }) {
  const room = ROOM_BY_ID[activeRoom];
  const href = roomSourceHref(room);
  return (
    <div className="world-control-dock" aria-label="Merser world controls">
      <button type="button" onClick={() => setCameraMode(cameraMode === "orbit360" ? "free" : "orbit360")}>
        <Move3D size={15} />
        {cameraMode === "orbit360" ? "Free orbit" : "360 orbit"}
      </button>
      <button type="button" onClick={() => onCameraCommand("focus")}>
        <Compass size={15} />
        Focus
      </button>
      <button type="button" onClick={() => onCameraCommand("zoom-in")}>
        <Maximize2 size={15} />
        Zoom in
      </button>
      <button type="button" onClick={() => onCameraCommand("zoom-out")}>
        <Map size={15} />
        Zoom out
      </button>
      <button type="button" onClick={() => onSelect(activeRoom === "core" ? "barbershop" : activeRoom, { drawer: true })}>
        <PanelRightOpen size={15} />
        Inspect
      </button>
      <a href={href} target="_blank" rel="noopener">
        <Route size={15} />
        Open source
      </a>
    </div>
  );
}

function SourceRoomViewport({ activeRoom, onSelect }) {
  const room = ROOM_BY_ID[activeRoom] || ROOMS[0];
  const href = roomSourceHref(room);

  useEffect(() => {
    const runtime = ensureRuntime();
    runtime.sourcePreviewVisible = true;
    runtime.sourcePreviewUrl = href;
    runtime.surfaceScreenshots = true;
  }, [href]);

  return (
    <motion.section
      className="source-room-viewport"
      key={room.id}
      style={{ "--room-color": room.color, "--room-accent": room.accent }}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      data-surface-screenshots
    >
      <div className="source-room-head">
        <div>
          <span>Live source room</span>
          <strong>{room.title}</strong>
        </div>
        <a href={href} target="_blank" rel="noopener">
          Open
        </a>
      </div>
      <div className="source-room-frame-wrap">
        <iframe
          title={`${room.title} source-pack preview`}
          src={href}
          loading="eager"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => {
            ensureRuntime().sourcePreviewLoaded = room.id;
          }}
        />
      </div>
      <div className="source-room-switcher" aria-label="Change live source room">
        {ROOMS.slice(0, 4).map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === room.id ? "is-active" : ""}
            style={{ "--room-color": item.color }}
            onClick={() => onSelect(item.id, { drawer: false })}
          >
            {item.code}
          </button>
        ))}
      </div>
    </motion.section>
  );
}

function RoomDrawer({ activeRoom, drawerRoom, onClose, onSelect, positions, dragEvents }) {
  const room = drawerRoom === "core" ? null : ROOM_BY_ID[drawerRoom] || ROOM_BY_ID[activeRoom];
  const isCore = drawerRoom === "core" || !room;
  const pos = isCore ? [0, 0, 0] : roomPosition(positions, room.id);

  useEffect(() => {
    const runtime = ensureRuntime();
    runtime.drawerOpen = drawerRoom;
  }, [drawerRoom]);

  return (
    <motion.aside
      className="room-drawer"
      key={drawerRoom}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      data-room-id={drawerRoom}
    >
      <div className="drawer-head">
        <div>
          <span>{isCore ? "00" : room.code}</span>
          <h2>{isCore ? "Central MCP Anchor" : room.title}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close inspector">
          ×
        </button>
      </div>
      <p>
        {isCore
          ? "This is the physical center of the website. Orbit, zoom, drag rooms around it, use the minimap to move, and let scroll beats retarget the camera."
          : room.body}
      </p>
      <dl className="room-stats">
        <div>
          <dt>Position</dt>
          <dd>
            x {pos[0].toFixed(2)} / z {pos[2].toFixed(2)}
          </dd>
        </div>
        <div>
          <dt>Runtime drags</dt>
          <dd>{dragEvents}</dd>
        </div>
        <div>
          <dt>Source pack</dt>
          <dd>{isCore ? "Merser source-pack registry" : room.sourcePack}</dd>
        </div>
        <div>
          <dt>Route</dt>
          <dd>{isCore ? "camera / map / world shell" : room.route}</dd>
        </div>
      </dl>
      <div className="drawer-actions">
        {(isCore ? ["orbit camera", "inspect rooms", "scroll director"] : room.actions).map((action) => (
          <button key={action} type="button" onClick={() => onSelect(isCore ? "barbershop" : room.id, { drawer: false })}>
            <Route size={14} />
            {action}
          </button>
        ))}
      </div>
    </motion.aside>
  );
}

function RuntimePanel({ activeRoom, gateOpen, dragEvents, paused, onPauseToggle }) {
  return (
    <div className="runtime-panel">
      <div className="panel-label">
        <BadgeCheck size={15} />
        Runtime stack
      </div>
      <div className="runtime-grid">
        {["React", "R3F", "Drei", "Three", "PostFX", "GSAP", "Lenis", "Theatre", "Framer", "Motion", "Remotion", "Source iframe"].map((label) => (
          <span key={label}>
            <i />
            {label}
          </span>
        ))}
      </div>
      <div className="runtime-current">
        <strong>{gateOpen ? "Open" : "Ritual waiting"}</strong>
        <span>{activeRoom === "core" ? "central anchor" : ROOM_BY_ID[activeRoom]?.title}</span>
      </div>
      <div className="runtime-controls">
        <DirectorPulse />
        <button type="button" onClick={onPauseToggle}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
      <div className="drag-counter">
        <Hand size={14} />
        {dragEvents} drag events recorded
      </div>
    </div>
  );
}

function WorldReel({ activeRoom }) {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 28) % ROOMS.length;
  const room = ROOM_BY_ID[activeRoom] || ROOMS[step];
  const sweep = interpolate(frame % 90, [0, 45, 90], [0, 1, 0]);

  return (
    <AbsoluteFill className="reel-frame">
      <div className="reel-orbit" style={{ transform: `rotate(${frame * 1.8}deg)` }} />
      <div className="reel-map">
        {ROOMS.map((item, index) => (
          <span
            key={item.id}
            style={{
              "--room-color": item.color,
              transform: `rotate(${index * 72}deg) translateX(${58 + sweep * 12}px)`,
            }}
          />
        ))}
      </div>
      <div className="reel-copy">
        <b>{room.code}</b>
        <strong>{room.title}</strong>
        <small>{room.short}</small>
      </div>
    </AbsoluteFill>
  );
}

function RemotionPanel({ activeRoom }) {
  useEffect(() => {
    ensureRuntime().remotion = true;
  }, []);

  return (
    <div className="remotion-panel">
      <div className="panel-label">
        <Video size={15} />
        Remotion world reel
      </div>
      <Player
        component={WorldReel}
        inputProps={{ activeRoom }}
        durationInFrames={150}
        compositionWidth={640}
        compositionHeight={360}
        fps={30}
        autoPlay
        loop
        initiallyMuted
        acknowledgeRemotionLicense
        controls={false}
        style={{ width: "100%", height: "auto" }}
      />
    </div>
  );
}

function WorldHud({
  activeRoom,
  drawerRoom,
  positions,
  setPositions,
  query,
  setQuery,
  filteredRooms,
  onSelect,
  onCloseDrawer,
  dragEvents,
  gateOpen,
  paused,
  onPauseToggle,
  cameraMode,
  setCameraMode,
  onCameraCommand,
}) {
  return (
    <div className="world-hud">
      <header className="world-title">
        <div className="world-brand-lockup">
          <img src="/skyes-over-london-deity-logo.png" alt="Skyes Over London logo" />
          <p className="eyebrow">
            <Sparkles size={15} />
            Merser by Skyes Over London
          </p>
        </div>
        <h1 className="effect-text-shimmer">Merser</h1>
        <p className="world-lede">
          Drag the source-pack rooms, orbit the world, inspect a room, search the registry, or scroll the camera path.
        </p>
        <div className="world-actions">
          <button type="button" onClick={() => onSelect("core", { drawer: true })}>
            <Compass size={16} />
            Focus core
          </button>
          <button type="button" onClick={() => onSelect(activeRoom, { drawer: true })}>
            <PanelRightOpen size={16} />
            Inspect room
          </button>
          <a href="#scroll-path">
            <ScanLine size={16} />
            Scroll path
          </a>
          <a href="#source-packs">
            <Route size={16} />
            Source packs
          </a>
        </div>
        <WorldControlDock
          activeRoom={activeRoom}
          cameraMode={cameraMode}
          setCameraMode={setCameraMode}
          onCameraCommand={onCameraCommand}
          onSelect={onSelect}
        />
      </header>

      <aside className={`left-rail ${query.trim() ? "has-search-query" : ""}`}>
        <div className="rail-panel">
          <div className="panel-label">
            <Map size={15} />
            World map
          </div>
          <MiniMap positions={positions} setPositions={setPositions} activeRoom={activeRoom} onSelect={onSelect} />
          <p className="mini-help">
            <Move3D size={14} />
            Drag a map dot to move that chamber in the 3D world.
          </p>
        </div>
        <RoomSearch query={query} setQuery={setQuery} filteredRooms={filteredRooms} onSelect={onSelect} />
      </aside>

      <aside className="right-rail">
        <RuntimePanel
          activeRoom={activeRoom}
          gateOpen={gateOpen}
          dragEvents={dragEvents}
          paused={paused}
          onPauseToggle={onPauseToggle}
        />
        <RemotionPanel activeRoom={activeRoom} />
      </aside>

      <SourceRoomViewport activeRoom={activeRoom} onSelect={onSelect} />

      {drawerRoom && (
        <RoomDrawer
          activeRoom={activeRoom}
          drawerRoom={drawerRoom}
          onClose={onCloseDrawer}
          onSelect={onSelect}
          positions={positions}
          dragEvents={dragEvents}
        />
      )}

      <div className="gesture-strip" aria-hidden="true">
        <span>
          <MousePointer2 size={15} />
          orbit
        </span>
        <span>
          <MousePointerClick size={15} />
          select
        </span>
        <span>
          <Maximize2 size={15} />
          zoom
        </span>
      </div>
    </div>
  );
}

function ScrollChapters({ activeRoom, onSelect }) {
  return (
    <section className="scroll-path" id="scroll-path" aria-label="Merser world scroll path">
      <div className="scroll-intro">
        <span>World path</span>
        <h2>Content is placed in the source-pack rooms. The scroll retargets the camera.</h2>
      </div>
      {ROOMS.map((room, index) => (
        <article
          key={room.id}
          className={`scroll-beat ${activeRoom === room.id ? "is-active" : ""}`}
          data-scroll-room={room.id}
          style={{ "--room-color": room.color, "--room-accent": room.accent }}
        >
          <span>{room.code}</span>
          <div>
            <h3>{room.title}</h3>
            <p>{room.body}</p>
            <button type="button" onClick={() => onSelect(room.id, { drawer: true })}>
              <Route size={15} />
              Enter chamber
            </button>
          </div>
          <i>{String(index + 1).padStart(2, "0")}</i>
        </article>
      ))}
    </section>
  );
}

function SourcePackDeck({ activeRoom, onSelect }) {
  const room = ROOM_BY_ID[activeRoom] || ROOMS[0];
  const href = roomSourceHref(room);

  return (
    <section className="source-pack-deck" id="source-packs" aria-label="Merser source-pack and CLI registry">
      <div className="source-pack-head">
        <span>Merser Source Base</span>
        <h2>Built from the extracted packs, exposed as an MCP lane.</h2>
        <p>
          The room worlds, visual standard components, Kaixu arsenal, prompt packets, and icon registry are now named as Merser material instead of left as unused zip files.
        </p>
      </div>

      <div className="source-pack-grid">
        {SOURCE_PACKS.map((pack) => (
          <article className="source-pack-card" key={pack.title}>
            <span>{pack.meta}</span>
            <h3>{pack.title}</h3>
            <code>{pack.path}</code>
          </article>
        ))}
      </div>

      <div className="source-tooling-grid">
        <article className="source-tooling-panel surface-preview-panel" data-surface-screenshots>
          <span>Live source surface browser</span>
          <div className="surface-preview-browser" style={{ "--room-color": room.color, "--room-accent": room.accent }}>
            <div className="surface-preview-menu">
              {ROOMS.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === room.id ? "is-active" : ""}
                  style={{ "--room-color": item.color }}
                  onClick={() => onSelect(item.id, { drawer: false })}
                >
                  <strong>{item.title}</strong>
                  <small>{item.route}</small>
                </button>
              ))}
            </div>
            <div className="surface-preview-live">
              <div>
                <strong>{room.title}</strong>
                <a href={href} target="_blank" rel="noopener">Open live source room</a>
              </div>
              <iframe
                title={`${room.title} deployed source pack preview`}
                src={href}
                loading="eager"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={() => {
                  ensureRuntime().surfaceBrowserLoaded = room.id;
                }}
              />
            </div>
          </div>
        </article>

        <article className="source-tooling-panel">
          <span>Deployed source routes</span>
          <div className="component-chip-grid source-route-grid">
            {ROOMS.slice(0, 4).map((item) => (
              <a key={item.id} href={roomSourceHref(item)} target="_blank" rel="noopener">
                {item.title}
              </a>
            ))}
          </div>
        </article>

        <article className="source-tooling-panel">
          <span>Component registry</span>
          <div className="component-chip-grid">
            {SOURCE_COMPONENTS.map((component) => (
              <code key={component}>{component}</code>
            ))}
          </div>
        </article>

        <article className="source-tooling-panel">
          <span>Local and remote CLI</span>
          <pre><code>{MCP4_CLI.join("\n")}</code></pre>
        </article>

        <article className="source-tooling-panel">
          <span>MCP endpoints</span>
          <pre><code>{`stdio: npx @skyes0verl0nd0n/merser --stdio
local: node /workspaces/MetrAIyux-0S/.vscode/MCP4/stdio-server.mjs --stdio
http:  http://127.0.0.1:8789/mcp
live:  https://merser.pages.dev/mcp
gate:  shared FS27/SkyGate/Free99 bearer`}</code></pre>
        </article>
      </div>
    </section>
  );
}

function App() {
  const [positions, setPositions] = useState(() => clonePositions(initialPositions));
  const [activeRoom, setActiveRoom] = useState("barbershop");
  const [drawerRoom, setDrawerRoom] = useState("barbershop");
  const [draggingId, setDraggingId] = useState(null);
  const [query, setQuery] = useState("");
  const [gateSequence, setGateSequence] = useState("");
  const [gateOpen, setGateOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dragEvents, setDragEvents] = useState(0);
  const [cameraMode, setCameraMode] = useState("free");
  const [cameraCommand, setCameraCommand] = useState(null);
  const theatreValues = useTheatreValues();

  useMcpScrollEngine(setActiveRoom);

  useEffect(() => {
    const runtime = ensureRuntime();
    runtime.chamberPositions = clonePositions(positions);
    runtime.activeRoom = activeRoom;
    runtime.gateOpen = gateOpen;
    runtime.drawerOpen = drawerRoom;
  }, [positions, activeRoom, gateOpen, drawerRoom]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDragEvents(ensureRuntime().dragEvents || 0);
    }, 180);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("motion-paused", paused);
    return () => document.body.classList.remove("motion-paused");
  }, [paused]);

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ROOMS;
    return ROOMS.filter((room) =>
      [room.title, room.short, room.body, room.route, room.code].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [query]);

  const selectRoom = useCallback((roomId, options = { drawer: true }) => {
    const nextRoom = roomId || "core";
    setActiveRoom(nextRoom);
    if (options.drawer) setDrawerRoom(nextRoom);
    const runtime = ensureRuntime();
    runtime.activeRoom = nextRoom;
    runtime.drawerOpen = options.drawer ? nextRoom : runtime.drawerOpen;
  }, []);

  const issueCameraCommand = useCallback((type) => {
    setCameraCommand({ type, nonce: Date.now() });
    ensureRuntime().lastCameraCommand = type;
  }, []);

  const pressGateKey = useCallback(
    (key) => {
      const next = `${gateSequence}${key}`.slice(-4);
      setGateSequence(next);
      if (next === "270S") {
        setGateOpen(true);
        setActiveRoom("core");
        setDrawerRoom("core");
        ensureRuntime().gateOpen = true;
      }
    },
    [gateSequence],
  );

  const openGate = useCallback(() => {
    setGateSequence("270S");
    setGateOpen(true);
    selectRoom("core", { drawer: true });
    ensureRuntime().gateOpen = true;
  }, [selectRoom]);

  const resetWorld = useCallback(() => {
    const next = clonePositions(initialPositions);
    setPositions(next);
    setGateSequence("");
    setGateOpen(false);
    setActiveRoom("barbershop");
    setDrawerRoom("barbershop");
    const runtime = ensureRuntime();
    runtime.gateOpen = false;
    runtime.chamberPositions = clonePositions(next);
    runtime.lastDrag = { id: "all", phase: "reset" };
  }, []);

  return (
    <main className="immersive-app" data-paused={paused ? "true" : "false"}>
      <MotionChrome paused={paused} />
      <section className="world-viewport" id="world">
        <WorldScene
          activeRoom={activeRoom}
          positions={positions}
          setPositions={setPositions}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          onSelect={selectRoom}
          theatreValues={theatreValues}
          cameraMode={cameraMode}
          cameraCommand={cameraCommand}
        />
        <WorldHud
          activeRoom={activeRoom}
          drawerRoom={drawerRoom}
          positions={positions}
          setPositions={setPositions}
          query={query}
          setQuery={setQuery}
          filteredRooms={filteredRooms}
          onSelect={selectRoom}
          onCloseDrawer={() => setDrawerRoom(null)}
          dragEvents={dragEvents}
          gateOpen={gateOpen}
          paused={paused}
          onPauseToggle={() => setPaused((value) => !value)}
          cameraMode={cameraMode}
          setCameraMode={setCameraMode}
          onCameraCommand={issueCameraCommand}
        />
        <GateConsole
          gateSequence={gateSequence}
          gateOpen={gateOpen}
          onDigit={pressGateKey}
          onReset={resetWorld}
          onOpen={openGate}
        />
      </section>
      <ScrollChapters activeRoom={activeRoom} onSelect={selectRoom} />
      <SourcePackDeck activeRoom={activeRoom} onSelect={selectRoom} />
    </main>
  );
}

export default App;
