import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "./styles.css";
import { supaboyMedia } from "./generated-media.js";

gsap.registerPlugin(ScrollTrigger);

const rooms = [
  {
    id: "sound",
    nav: "SLB",
    number: "01",
    title: "SLB / Superboy",
    line: "Six records in motion: My Side, On & On, So Crazy, Friendzone, Come My Way, and Lie.",
    action: "Open Music",
    color: "#f2b94b",
    accent: "#fff2b9",
    position: [-4.8, 0.1, -1.8],
    bars: [0.42, 0.72, 0.58, 0.9, 0.64, 0.78],
    mediaName: "slb-cover.webp",
    frame: [2.04, 2.04],
    target: "#sound"
  },
  {
    id: "stage",
    nav: "Houston",
    number: "02",
    title: "24 Hr In Houston",
    line: "The Houston record has real weight: 344,044 all-time streams on the proof visual.",
    action: "View proof",
    color: "#ff4e36",
    accent: "#ffb199",
    position: [4.6, 0.1, -1.9],
    bars: [0.88, 0.66, 0.76, 0.52, 0.94, 0.7],
    mediaName: "houston-proof.webp",
    frame: [1.82, 2.42],
    proofId: "houston"
  },
  {
    id: "video",
    nav: "Story",
    number: "03",
    title: "Nigerian roots. Chicago grind.",
    line: "Roots, pressure, motion, and the line that keeps coming back: The Grind Don't Stop.",
    action: "Read story",
    color: "#44d7ff",
    accent: "#b8f2ff",
    position: [-4.25, 0.1, 3.2],
    bars: [0.52, 0.48, 0.85, 0.72, 0.6, 0.92],
    mediaName: "chicago-walk.webp",
    frame: [1.82, 2.42]
  },
  {
    id: "drops",
    nav: "Live",
    number: "04",
    title: "iamsuperboy2x",
    line: "Twitch energy, shouts, clips, requests, TTP, and the room around SupaBoy.",
    action: "Watch Twitch",
    color: "#8ff0a4",
    accent: "#d7ffdf",
    position: [4.2, 0.1, 3.25],
    bars: [0.62, 0.86, 0.54, 0.72, 0.96, 0.5],
    mediaName: "night-motion.webp",
    frame: [1.82, 2.42],
    href: "https://m.twitch.tv/iamsuperboy2x/home"
  },
  {
    id: "book",
    nav: "Booking",
    number: "05",
    title: "Booking + press",
    line: "Performances, hosting, campus rooms, feature lanes, press looks, and live appearances.",
    action: "Send inquiry",
    color: "#c896ff",
    accent: "#f0ddff",
    position: [0, 0.1, 5.8],
    bars: [0.48, 0.64, 0.8, 0.56, 0.74, 0.68],
    mediaName: "green-wall-alt.webp",
    frame: [1.82, 2.42]
  }
];

const records = [
  {
    label: "SLB 01",
    title: "My Side",
    body: "The opener. SupaBoy steps into the project from his side of the story."
  },
  {
    label: "SLB 02",
    title: "On & On",
    body: "Featuring Moyoisme, built for the repeat hook and the late-night replay."
  },
  {
    label: "SLB 03",
    title: "So Crazy",
    body: "Track three keeps the project moving with pressure and bounce."
  },
  {
    label: "SLB 04",
    title: "Friendzone",
    body: "The emotional lane, clean enough for playlists and heavy enough for captions."
  },
  {
    label: "SLB 05",
    title: "Come My Way",
    body: "Afrobeat swing with the SupaBoy motion pushed forward."
  },
  {
    label: "SLB 06",
    title: "Lie",
    body: "Featuring Afroyaya, closing the six-pack with a feature spark."
  }
];

const videoFrameData = [
  {
    label: "Hero Night",
    name: "hero-night.webp",
    surface: "Live",
    href: "https://m.twitch.tv/iamsuperboy2x/home",
    room: "drops"
  },
  {
    label: "Houston Mart",
    name: "houston-mart.webp",
    surface: "Music",
    target: "#sound",
    room: "stage"
  },
  {
    label: "Chicago Block",
    name: "chicago-block.webp",
    surface: "Story",
    target: "#top",
    room: "video"
  },
  {
    label: "Green Wall",
    name: "green-wall.webp",
    surface: "Booking",
    target: "#booking",
    room: "book"
  },
  {
    label: "Roses",
    name: "roses-color.webp",
    surface: "Story",
    target: "#top",
    room: "video"
  },
  {
    label: "Studio Chair",
    name: "studio-chair.webp",
    surface: "Music",
    target: "#sound",
    room: "sound"
  }
];

function mediaByName(name) {
  return supaboyMedia.find((item) => item.name === name) || null;
}

function cssMediaUrl(media) {
  return media?.src ? `url("../${media.src}")` : undefined;
}

function pickMediaForRoom(room, index) {
  if (!supaboyMedia.length) return null;
  if (room.mediaName) return mediaByName(room.mediaName) || null;
  const haystack = `${room.id} ${room.nav} ${room.title}`.toLowerCase();
  const exact = supaboyMedia.find((item) => {
    const name = `${item.id} ${item.name}`.toLowerCase();
    return haystack.split(/\s+/).some((word) => word.length > 3 && name.includes(word));
  });
  return exact || supaboyMedia[index % supaboyMedia.length];
}

const artistRooms = rooms.map((room, index) => ({
  ...room,
  media: pickMediaForRoom(room, index)
}));

const videoFrames = videoFrameData.map((item, index) => ({
  ...item,
  media: mediaByName(item.name) || supaboyMedia[index % Math.max(1, supaboyMedia.length)] || null
}));

const musicSurfaceData = [
  {
    label: "Project",
    title: "SLB / Superboy",
    body: "Cover, tracklist, and six records held as the center of the artist world.",
    mediaName: "slb-cover.webp",
    target: "#sound",
    room: "sound",
    action: "Open Music"
  },
  {
    label: "Release proof",
    title: "24 Hr In Houston",
    body: "344,044 all-time streams. Released May 3, 2024.",
    mediaName: "houston-proof.webp",
    room: "stage",
    action: "View proof",
    proofId: "houston"
  },
  {
    label: "Rollout visual",
    title: "Houston Night",
    body: "Night-market color, streetlight proof, and the Houston record lane.",
    mediaName: "houston-mart.webp",
    target: "#sound",
    room: "stage",
    action: "Open Music"
  },
  {
    label: "Feature lane",
    title: "Feature Energy",
    body: "The collab lane for hooks, features, cameos, and cross-promo moments.",
    mediaName: "duo-proof.webp",
    target: "#booking",
    room: "book",
    action: "Book feature"
  },
  {
    label: "Next drop",
    title: "Next Drop",
    body: "A late-night slot for the next single, snippet, video, or announcement.",
    mediaName: "night-close.webp",
    target: "#sound",
    room: "sound",
    action: "Open Music"
  }
];

const musicSurfaces = musicSurfaceData.map((item, index) => ({
  ...item,
  media: mediaByName(item.mediaName) || supaboyMedia[(index + 3) % Math.max(1, supaboyMedia.length)] || null
}));

const releaseProofs = {
  houston: {
    eyebrow: "Release proof",
    title: "24 Hr In Houston",
    stat: "344,044",
    statLabel: "all-time streams shown on the proof visual",
    date: "Released May 3, 2024",
    body: "This is the visual receipt behind the Houston lane: the record, the stream count, the release date, and the image that belongs in the artist landing instead of a dead button.",
    mediaName: "houston-proof.webp",
    musicTarget: "#sound"
  }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scaledFrame(frame = [1.82, 2.42], scale = 1) {
  return [frame[0] * scale, frame[1] * scale];
}

function snapToSelector(selector) {
  let top = 0;

  if (selector === "#top") {
    top = 0;
  } else {
    const target = document.querySelector(selector);
    if (!target) return;
    top = target.getBoundingClientRect().top + window.scrollY;
  }

  window.scrollTo({ top, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
}

function forceSnapToSelector(selector) {
  snapToSelector(selector);
  window.requestAnimationFrame(() => snapToSelector(selector));
  window.setTimeout(() => snapToSelector(selector), 80);
}

function snapAfterPaint(selector) {
  window.requestAnimationFrame(() => forceSnapToSelector(selector));
}

function useImageTexture(src) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!src) {
      setTexture(null);
      return undefined;
    }

    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (loaded) => {
        if (cancelled) return;
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = 8;
        loaded.needsUpdate = true;
        setTexture(loaded);
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [src]);

  return texture;
}

function useScrollMotion() {
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: false,
      duration: 1.05,
      lerp: 0.12,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.35
    });

    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setDepth(clamp(window.scrollY / max, 0, 1));
      ScrollTrigger.update();
    };

    lenis.on("scroll", update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    update();

    const ctx = gsap.context(() => {
      gsap.fromTo("[data-rise]", { autoAlpha: 0, y: 34, scale: 0.98 }, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.72,
        ease: "power3.out",
        stagger: 0.055,
        scrollTrigger: { trigger: ".record-floor", start: "top 82%" }
      });

      gsap.to(".marquee-track", {
        xPercent: -50,
        ease: "none",
        scrollTrigger: { trigger: ".marquee-band", start: "top bottom", end: "bottom top", scrub: true }
      });

      gsap.to(".video-card", {
        y: (index) => (index % 2 ? 38 : -28),
        ease: "none",
        scrollTrigger: { trigger: ".video-wall", start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    return () => {
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return depth;
}

function useBeatEngine() {
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const stepRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [pulse, setPulse] = useState(0.42);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    audioRef.current?.ctx?.close?.();
  }, []);

  function hit(freq, length, gainValue, type = "sine") {
    const engine = audioRef.current;
    if (!engine) return;
    const now = engine.ctx.currentTime;
    const osc = engine.ctx.createOscillator();
    const gain = engine.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, freq * 0.42), now + length);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    osc.connect(gain);
    gain.connect(engine.master);
    osc.start(now);
    osc.stop(now + length + 0.03);
  }

  function tick() {
    const step = stepRef.current % 8;
    if (step === 0 || step === 4) hit(82, 0.18, 0.42, "sine");
    if (step === 2 || step === 6) hit(188, 0.08, 0.16, "triangle");
    if (step % 2 === 1) hit(620, 0.035, 0.045, "square");
    setPulse(step === 0 || step === 4 ? 1 : step % 2 ? 0.62 : 0.78);
    stepRef.current += 1;
  }

  async function toggle() {
    if (playing) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setPlaying(false);
      setPulse(0.42);
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioRef.current) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0.14;
      master.connect(ctx.destination);
      audioRef.current = { ctx, master };
    }
    await audioRef.current.ctx.resume();
    stepRef.current = 0;
    tick();
    timerRef.current = setInterval(tick, 220);
    setPlaying(true);
  }

  return { playing, pulse, toggle };
}

function EqualizerTower({ room, active }) {
  const group = useRef();
  const color = useMemo(() => new THREE.Color(room.color), [room.color]);
  const texture = useImageTexture(room.media?.src);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y += active ? 0.01 : 0.003;
    group.current.position.y = room.position[1] + Math.sin(clock.elapsedTime * 1.2 + room.position[0]) * 0.08;
    const scale = active ? 1.32 : 1.18;
    group.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.08);
  });

  return (
    <group ref={group} position={room.position}>
      <mesh position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.05, 64]} />
        <meshStandardMaterial color="#080707" roughness={0.5} metalness={0.38} />
      </mesh>
      <mesh position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.18, 2.27, 96]} />
        <meshBasicMaterial color={room.color} transparent opacity={active ? 0.96 : 0.58} />
      </mesh>
      <mesh position={[0, 0.25, -0.6]}>
        <boxGeometry args={[3.42, 3.92, 0.26]} />
        <meshStandardMaterial color="#15110d" roughness={0.26} metalness={0.74} emissive={room.color} emissiveIntensity={active ? 0.32 : 0.13} />
      </mesh>
      <mesh position={[0, 0.48, -0.47]}>
        <planeGeometry args={scaledFrame(room.frame || [1.82, 2.42], 1.16)} />
        <meshBasicMaterial color={room.color} transparent opacity={active ? 0.32 : 0.18} />
      </mesh>
      <mesh position={[0, 0.48, -0.44]}>
        <planeGeometry args={room.frame || [1.82, 2.42]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#111111" roughness={0.32} metalness={0.38} emissive={room.color} emissiveIntensity={active ? 0.28 : 0.1} />
        )}
      </mesh>
      <mesh position={[-1.1, 0.32, -0.43]}>
        <cylinderGeometry args={[0.36, 0.36, 0.16, 48]} />
        <meshStandardMaterial color="#050505" roughness={0.28} metalness={0.72} emissive={room.color} emissiveIntensity={active ? 0.4 : 0.12} />
      </mesh>
      <mesh position={[1.1, 0.32, -0.43]}>
        <cylinderGeometry args={[0.36, 0.36, 0.16, 48]} />
        <meshStandardMaterial color="#050505" roughness={0.28} metalness={0.72} emissive={room.color} emissiveIntensity={active ? 0.4 : 0.12} />
      </mesh>
      <mesh position={[0, 1.98, -0.42]}>
        <boxGeometry args={[1.94, 0.16, 0.14]} />
        <meshBasicMaterial color={room.color} transparent opacity={active ? 1 : 0.72} />
      </mesh>
      {room.bars.map((height, index) => {
        const x = -1.04 + index * 0.42;
        return (
          <mesh key={index} position={[x, -1.12 + height * 0.44, -0.42]}>
            <boxGeometry args={[0.2, height * (active ? 1.28 : 0.84), 0.14]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.45 : 0.66} roughness={0.18} metalness={0.46} />
          </mesh>
        );
      })}
    </group>
  );
}

function CenterStage({ activeRoom, pulse, mediaOverride }) {
  const group = useRef();
  const active = artistRooms.find((room) => room.id === activeRoom) || artistRooms[0];
  const activeColor = useMemo(() => new THREE.Color(active.color), [active.color]);
  const stageMedia = mediaOverride || active.media;
  const texture = useImageTexture(stageMedia?.src);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.18;
    group.current.scale.lerp(new THREE.Vector3(1 + pulse * 0.045, 1 + pulse * 0.045, 1 + pulse * 0.045), 0.08);
  });

  return (
    <group ref={group}>
      <mesh position={[0, -0.88, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.55, 2.8, 0.38, 96]} />
        <meshStandardMaterial color="#0a0807" roughness={0.33} metalness={0.72} emissive={active.color} emissiveIntensity={0.08 + pulse * 0.04} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.18, 0.24, 2.2, 48]} />
        <meshStandardMaterial color="#fff3d4" metalness={0.8} roughness={0.18} emissive={active.color} emissiveIntensity={0.22 + pulse * 0.08} />
      </mesh>
      <mesh position={[0, 0.58, -1.16]}>
        <planeGeometry args={scaledFrame(active.frame, 1.18)} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#15100d" roughness={0.28} metalness={0.55} emissive={active.color} emissiveIntensity={0.18 + pulse * 0.08} />
        )}
      </mesh>
      <mesh position={[0, 1.34, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.24, 1.05, 12, 24]} />
        <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.72} emissive={active.color} emissiveIntensity={0.36 + pulse * 0.2} />
      </mesh>
      <mesh position={[0, 1.34, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.72, 0.018, 12, 96]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.7} />
      </mesh>
      {[1.7, 2.65, 3.7].map((radius, index) => (
        <mesh key={radius} position={[0, -0.62 + index * 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius, radius + 0.018, 128]} />
          <meshBasicMaterial color={index === 1 ? "#44d7ff" : active.color} transparent opacity={0.28 + pulse * 0.12} />
        </mesh>
      ))}
    </group>
  );
}

function WaveRoad({ activeRoom }) {
  const group = useRef();
  const active = rooms.find((room) => room.id === activeRoom) || rooms[0];

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.children.forEach((child, index) => {
      child.position.y = -0.98 + Math.sin(clock.elapsedTime * 2.2 + index * 0.62) * 0.07;
      child.rotation.z = Math.sin(clock.elapsedTime * 0.7 + index) * 0.05;
    });
  });

  return (
    <group ref={group}>
      {Array.from({ length: 18 }).map((_, index) => {
        const z = -7.2 + index * 0.85;
        const width = 0.52 + Math.sin(index * 0.7) * 0.18;
        return (
          <mesh key={index} position={[Math.sin(index * 0.9) * 0.42, -0.98, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[width, 0.045, 0.16]} />
            <meshBasicMaterial color={index % 3 === 0 ? active.color : "#fff4d6"} transparent opacity={index % 3 === 0 ? 0.8 : 0.28} />
          </mesh>
        );
      })}
    </group>
  );
}

function StageScene({ activeRoom, setActiveRoom, pan, zoom, depth, pulse, orbit, autoSpin, stageMediaOverride }) {
  const root = useRef();
  const active = artistRooms.find((room) => room.id === activeRoom) || artistRooms[0];

  useFrame(({ camera, clock, pointer }) => {
    const [x, , z] = active.position;
    const target = new THREE.Vector3(x * 0.2 + pan.x, 3.95 - depth * 0.9 + pan.y, 14.5 - depth * 4.6 + zoom + z * 0.14);
    camera.position.lerp(target, 0.055);
    camera.lookAt(x * 0.1 + pan.x * 0.35, 0.12 + depth * 0.38, z * 0.08);
    if (root.current) {
      root.current.rotation.y = orbit + (autoSpin ? clock.elapsedTime * 0.26 : 0) + pointer.x * 0.035 + Math.sin(clock.elapsedTime * 0.16) * 0.025;
      root.current.rotation.x = -0.05 + pointer.y * 0.03;
    }
  });

  return (
    <group ref={root}>
      <fog attach="fog" args={["#030303", 11, 30]} />
      <ambientLight intensity={0.62} />
      <pointLight position={[0, 7.2, 6.4]} color={active.color} intensity={52 + pulse * 14} />
      <pointLight position={[-7, 2.8, -3.8]} color="#44d7ff" intensity={22} />
      <pointLight position={[7, 2.8, 3.4]} color="#ff4e36" intensity={22} />
      <mesh position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20, 30, 30]} />
        <meshStandardMaterial color="#080706" metalness={0.25} roughness={0.58} wireframe />
      </mesh>
      <WaveRoad activeRoom={activeRoom} />
      <CenterStage activeRoom={activeRoom} pulse={pulse} mediaOverride={stageMediaOverride} />
      {artistRooms.map((room) => (
        <group key={room.id} onClick={(event) => { event.stopPropagation(); setActiveRoom(room.id); }}>
          <EqualizerTower room={room} active={room.id === activeRoom} />
        </group>
      ))}
    </group>
  );
}

function IntroGate() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;

    const previousOverflow = document.body.style.overflow;
    const fadeTimer = window.setTimeout(() => setLeaving(true), 6800);
    const doneTimer = window.setTimeout(() => setVisible(false), 7400);

    function handleKey(event) {
      if (event.key === "Escape") {
        setVisible(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`intro-gate ${leaving ? "is-leaving" : ""}`} role="dialog" aria-modal="true" aria-label="SupaBoy">
      <iframe
        src="media/supaboy-intro-visualizer.html?intro=1&clean=1"
        title="SupaBoy"
        loading="eager"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

function NeonChrome() {
  const cursorRef = useRef(null);
  const railRef = useRef(null);
  const thumbRef = useRef(null);
  const dragRef = useRef(null);
  const rafRef = useRef(0);

  function updateRail() {
    rafRef.current = 0;
    const rail = railRef.current;
    const thumb = thumbRef.current;
    if (!rail || !thumb) return;

    const source = document.scrollingElement || document.documentElement;
    const track = Math.max(1, rail.clientHeight);
    const scrollHeight = Math.max(source.scrollHeight, window.innerHeight);
    const max = Math.max(1, source.scrollHeight - window.innerHeight);
    const ratio = clamp(source.scrollTop / max, 0, 1);
    const size = clamp((window.innerHeight / scrollHeight) * track, 86, track);

    thumb.style.height = `${Math.floor(size)}px`;
    rail.style.setProperty("--mcp-scroll-y", `${Math.round(ratio * Math.max(0, track - size))}px`);
  }

  function scheduleRailUpdate() {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(updateRail);
  }

  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    root.setAttribute("data-mcp-neon-scrollbar", "");

    function moveCursor(event) {
      if (!finePointer || reduceMotion || !cursorRef.current) return;
      cursorRef.current.classList.add("is-visible");
      cursorRef.current.style.transform = `translate3d(${event.clientX - 150}px, ${event.clientY - 150}px, 0)`;
    }

    function hideCursor() {
      cursorRef.current?.classList.remove("is-visible");
    }

    window.addEventListener("pointermove", moveCursor, { passive: true });
    window.addEventListener("pointerleave", hideCursor, { passive: true });
    window.addEventListener("scroll", scheduleRailUpdate, { passive: true });
    window.addEventListener("resize", scheduleRailUpdate, { passive: true });

    scheduleRailUpdate();
    window.setTimeout(scheduleRailUpdate, 360);
    window.setTimeout(scheduleRailUpdate, 1200);

    return () => {
      window.removeEventListener("pointermove", moveCursor);
      window.removeEventListener("pointerleave", hideCursor);
      window.removeEventListener("scroll", scheduleRailUpdate);
      window.removeEventListener("resize", scheduleRailUpdate);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function ratioFromPointer(event, keepOffset) {
    const rail = railRef.current;
    const thumb = thumbRef.current;
    if (!rail || !thumb) return 0;

    const railRect = rail.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const source = document.scrollingElement || document.documentElement;
    const track = Math.max(1, railRect.height);
    const size = Math.max(1, thumbRect.height);
    const offset = keepOffset ? dragRef.current?.offset ?? size / 2 : size / 2;
    const ratio = clamp((event.clientY - railRect.top - offset) / Math.max(1, track - size), 0, 1);
    source.scrollTop = ratio * Math.max(1, source.scrollHeight - window.innerHeight);
    scheduleRailUpdate();
    return ratio;
  }

  function beginNeonScroll(event) {
    const thumb = thumbRef.current;
    const thumbRect = thumb?.getBoundingClientRect();
    const hitThumb = !!thumb && (event.target === thumb || thumb.contains(event.target));
    dragRef.current = {
      pointerId: event.pointerId,
      offset: hitThumb && thumbRect ? event.clientY - thumbRect.top : (thumbRect?.height || 86) / 2
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.classList.add("is-dragging");
    document.documentElement.classList.add("mcp-neon-scroll-dragging");
    ratioFromPointer(event, hitThumb);
  }

  function moveNeonScroll(event) {
    if (!dragRef.current) return;
    event.preventDefault();
    ratioFromPointer(event, true);
  }

  function endNeonScroll(event) {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    event.currentTarget.classList.remove("is-dragging");
    document.documentElement.classList.remove("mcp-neon-scroll-dragging");
    scheduleRailUpdate();
  }

  return (
    <>
      <div ref={cursorRef} className="neon-cursor-trail" aria-hidden="true" />
      <div
        ref={railRef}
        className="mcp-neon-scroll-rail mcp-neon-scroll-rail-y"
        aria-hidden="true"
        onPointerDown={beginNeonScroll}
        onPointerMove={moveNeonScroll}
        onPointerUp={endNeonScroll}
        onPointerCancel={endNeonScroll}
      >
        <i ref={thumbRef} className="mcp-neon-scroll-thumb" />
      </div>
    </>
  );
}

function App() {
  const [activeRoom, setActiveRoom] = useState("sound");
  const [zoom, setZoom] = useState(0);
  const [orbit, setOrbit] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeFrameIndex, setActiveFrameIndex] = useState(null);
  const [stageMediaOverride, setStageMediaOverride] = useState(null);
  const [surfaceReturn, setSurfaceReturn] = useState(null);
  const [activeProofId, setActiveProofId] = useState(null);
  const [bookingStatus, setBookingStatus] = useState("");
  const dragRef = useRef(null);
  const heroRef = useRef(null);
  const projectRef = useRef(null);
  const depth = useScrollMotion();
  const beat = useBeatEngine();
  const active = artistRooms.find((room) => room.id === activeRoom) || artistRooms[0];
  const activeFrame = activeFrameIndex === null ? null : videoFrames[activeFrameIndex];
  const activeProof = activeProofId ? releaseProofs[activeProofId] || null : null;
  const activeProofMedia = activeProof ? mediaByName(activeProof.mediaName) : null;

  useEffect(() => {
    if (activeFrameIndex === null && !activeProof) return undefined;
    const previousOverflow = document.body.style.overflow;

    function handleKey(event) {
      if (event.key === "Escape") setActiveFrameIndex(null);
      if (event.key === "Escape") setActiveProofId(null);
      if (activeFrameIndex !== null && event.key === "ArrowLeft") stepFrame(-1);
      if (activeFrameIndex !== null && event.key === "ArrowRight") stepFrame(1);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [activeFrameIndex, activeProof]);

  function beginDrag(event) {
    dragRef.current = { x: event.clientX, y: event.clientY, orbit, zoom };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    if (!dragRef.current) return;
    const dx = (event.clientX - dragRef.current.x) / 118;
    const dy = (event.clientY - dragRef.current.y) / 175;
    setAutoSpin(false);
    setOrbit(dragRef.current.orbit + dx);
    setZoom(clamp(dragRef.current.zoom + dy, -3.4, 3.6));
  }

  function moveStagePointer(event) {
    moveHeroBackground(event);
    moveDrag(event);
  }

  function endDrag() {
    dragRef.current = null;
  }

  function moveHeroBackground(event) {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
    const y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
    heroRef.current.style.setProperty("--hero-x", x.toFixed(3));
    heroRef.current.style.setProperty("--hero-y", y.toFixed(3));
    heroRef.current.style.setProperty("--hero-bg-x", `${(-x * 14).toFixed(1)}px`);
    heroRef.current.style.setProperty("--hero-bg-y", `${(-y * 9).toFixed(1)}px`);
  }

  function resetHeroBackground() {
    if (!heroRef.current) return;
    const resetVars = {
      "--hero-x": "0",
      "--hero-y": "0",
      "--hero-bg-x": "0px",
      "--hero-bg-y": "0px"
    };
    Object.entries(resetVars).forEach(([name, value]) => heroRef.current.style.setProperty(name, value));
  }

  function moveProjectBackground(event) {
    if (!projectRef.current) return;
    const rect = projectRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
    const y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
    projectRef.current.style.setProperty("--record-figure-x", `${(x * 42).toFixed(1)}px`);
    projectRef.current.style.setProperty("--record-figure-y", `${(y * 22).toFixed(1)}px`);
    projectRef.current.style.setProperty("--record-rotate-x", `${(-y * 4).toFixed(2)}deg`);
    projectRef.current.style.setProperty("--record-rotate-y", `${(x * 8).toFixed(2)}deg`);
    projectRef.current.style.setProperty("--record-light-x", `${(52 + x * 10).toFixed(1)}%`);
    projectRef.current.style.setProperty("--record-light-y", `${(42 + y * 8).toFixed(1)}%`);
  }

  function resetProjectBackground() {
    if (!projectRef.current) return;
    const resetVars = {
      "--record-figure-x": "0px",
      "--record-figure-y": "0px",
      "--record-rotate-x": "0deg",
      "--record-rotate-y": "0deg",
      "--record-light-x": "52%",
      "--record-light-y": "42%"
    };
    Object.entries(resetVars).forEach(([name, value]) => projectRef.current.style.setProperty(name, value));
  }

  function selectRoom(roomId) {
    setActiveFrameIndex(null);
    setActiveProofId(null);
    setStageMediaOverride(null);
    setSurfaceReturn(null);
    setActiveRoom(roomId);
    forceSnapToSelector("#top");
  }

  function openFrame(index) {
    const frame = videoFrames[index];
    setActiveProofId(null);
    setActiveFrameIndex(index);
    setStageMediaOverride(frame?.media || null);
    setActiveRoom("video");
  }

  function openProof(proofId = "houston") {
    const proof = releaseProofs[proofId];
    if (!proof) return;
    const media = mediaByName(proof.mediaName);
    setActiveFrameIndex(null);
    setActiveProofId(proofId);
    setStageMediaOverride(media || null);
    setActiveRoom("stage");
  }

  function stageProof(proofId = activeProofId || "houston") {
    const proof = releaseProofs[proofId];
    if (!proof) return;
    const media = mediaByName(proof.mediaName);
    setStageMediaOverride(media || null);
    setActiveRoom("stage");
    setSurfaceReturn({ label: proof.eyebrow, title: proof.title, surface: "Proof" });
    setActiveProofId(null);
    snapAfterPaint("#top");
  }

  function activateRoomAction(room) {
    if (room.proofId) {
      openProof(room.proofId);
      return;
    }
    if (room.href) {
      window.open(room.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (room.target) {
      snapAfterPaint(room.target);
      return;
    }
    if (room.id === "book") {
      snapAfterPaint("#booking");
      return;
    }
    if (room.id === "video") {
      snapAfterPaint("#video");
      return;
    }
    setActiveRoom(room.id);
    snapAfterPaint("#top");
  }

  function stepFrame(direction) {
    setActiveFrameIndex((current) => {
      const next = ((current ?? 0) + direction + videoFrames.length) % videoFrames.length;
      setStageMediaOverride(videoFrames[next]?.media || null);
      return next;
    });
  }

  function sendFrameToStage() {
    if (activeFrame?.media) setStageMediaOverride(activeFrame.media);
    setActiveRoom("video");
    setActiveFrameIndex(null);
    setActiveProofId(null);
    setSurfaceReturn(activeFrame || null);
    snapAfterPaint("#top");
  }

  function playFrameSurface(frame = activeFrame) {
    if (!frame) return;
    if (frame.media) setStageMediaOverride(frame.media);
    if (frame.room) setActiveRoom(frame.room);
    setActiveFrameIndex(null);
    setActiveProofId(null);
    setSurfaceReturn({ label: frame.label, title: frame.label, surface: frame.surface });

    if (frame.href) {
      window.open(frame.href, "_blank", "noopener,noreferrer");
      return;
    }

    if (frame.target === "#top") {
      snapAfterPaint("#top");
      return;
    }

    snapAfterPaint(frame.target || "#video");
  }

  function playMusicSurface(surface) {
    if (!surface) return;
    if (surface.proofId) {
      openProof(surface.proofId);
      return;
    }
    if (surface.media) setStageMediaOverride(surface.media);
    if (surface.room) setActiveRoom(surface.room);
    setActiveProofId(null);
    setSurfaceReturn({ label: surface.label, title: surface.title, surface: "Music" });

    if (surface.href) {
      window.open(surface.href, "_blank", "noopener,noreferrer");
      return;
    }

    if (surface.target) {
      snapToSelector(surface.target);
      return;
    }

    snapToSelector("#top");
  }

  function returnToCampaignSurfaces() {
    setActiveFrameIndex(null);
    setActiveProofId(null);
    setSurfaceReturn(null);
    setStageMediaOverride(null);
    setActiveRoom("video");
    snapAfterPaint("#video");
  }

  function handleBookingSubmit(event) {
    event.preventDefault();
    setBookingStatus("Inquiry staged on this page. Use the music hub or Twitch lane for the fastest live handoff.");
  }

  return (
    <main>
      <IntroGate />
      <NeonChrome />

      <header className="topbar">
        <a href="#top" className="brand">SUPABOY</a>
        <nav aria-label="SupaBoy sections">
          {artistRooms.map((room) => (
            <button
              type="button"
              key={room.id}
              className={activeRoom === room.id ? "is-active" : ""}
              onClick={() => selectRoom(room.id)}
            >
              {room.nav}
            </button>
          ))}
        </nav>
      </header>

      {surfaceReturn && (
        <button type="button" className="surface-return" onClick={returnToCampaignSurfaces}>
          Back to surfaces
        </button>
      )}

      <section
        id="top"
        className="hero"
        ref={heroRef}
        style={{ "--active": active.color }}
        onPointerMove={moveHeroBackground}
        onPointerLeave={resetHeroBackground}
      >
        <div className="hero-portrait-bg" aria-hidden="true">
          <img className="hero-night-bg" src="media/hero-night.webp" alt="" />
        </div>
        <div
          className="stage-canvas"
          onPointerDown={beginDrag}
          onPointerMove={moveStagePointer}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={(event) => setZoom((value) => clamp(value + event.deltaY / 320, -3.4, 3.6))}
          aria-label="Interactive SupaBoy stage"
        >
          <Canvas camera={{ position: [0, 4, 14.5], fov: 44 }} dpr={[1, 1.45]} gl={{ antialias: true, alpha: false }}>
            <color attach="background" args={["#030303"]} />
            <Suspense fallback={null}>
              <StageScene activeRoom={activeRoom} setActiveRoom={setActiveRoom} pan={pan} zoom={zoom} depth={depth} pulse={beat.pulse} orbit={orbit} autoSpin={autoSpin} stageMediaOverride={stageMediaOverride} />
            </Suspense>
          </Canvas>
        </div>

        <motion.div className="hero-copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.72 }}>
          <p className="eyebrow text-spark">artist / sound / stage</p>
          <h1 className="text-skrucible" data-shadow="SUPABOY">SUPABOY</h1>
          <p className="lede text-line">Nigerian roots. Chicago pressure. Houston proof. Live motion. The Grind Don't Stop.</p>
          <div className="hero-actions">
            <button type="button" className="primary" onClick={beat.toggle}>
              {beat.playing ? "Pause beat" : "Press play"}
            </button>
            <button type="button" onClick={() => snapToSelector("#sound")}>Enter the Music</button>
            <a href="https://m.twitch.tv/iamsuperboy2x/home" target="_blank" rel="noopener">Twitch</a>
          </div>
        </motion.div>

        <aside className="now-panel" style={{ "--room": active.color }}>
          <span>{active.number} / {active.nav}</span>
          <strong>{active.title}</strong>
          <p>{active.line}</p>
          <div className="mini-eq" aria-hidden="true">
            {active.bars.map((height, index) => (
              <i key={index} style={{ "--height": `${Math.round(height * 100)}%`, "--delay": `${index * 0.08}s` }} />
            ))}
          </div>
          <button type="button" onClick={() => activateRoomAction(active)}>
            {active.action}
          </button>
        </aside>

        <div className="stage-controls" aria-label="Stage controls">
          <button type="button" onClick={() => setActiveRoom("sound")}>SLB</button>
          <button type="button" onClick={() => setAutoSpin((value) => !value)}>{autoSpin ? "Hold" : "Spin"}</button>
          <button type="button" onClick={() => setZoom((value) => clamp(value - 1.2, -3.4, 3.6))}>Closer</button>
          <button type="button" onClick={() => setZoom((value) => clamp(value + 1.2, -3.4, 3.6))}>Wider</button>
          <button type="button" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(0); setOrbit(0); setAutoSpin(false); }}>Reset</button>
        </div>

      </section>

      <section className="visualizer-loop" id="visualizer" aria-label="SupaBoy visualizer">
        <iframe
          src="media/supaboy-intro-visualizer.html?loop=1&clean=1"
          title="SupaBoy visualizer"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
        />
      </section>

      <section
        className="record-floor"
        id="sound"
        ref={projectRef}
        onPointerMove={moveProjectBackground}
        onPointerLeave={resetProjectBackground}
      >
        <div className="record-figure-bg" aria-hidden="true">
          <img className="record-live-figure" src="media/glow-figure.png" alt="" />
        </div>
        <div className="section-head" data-rise>
          <p className="eyebrow text-spark">featured project</p>
          <h2 className="section-title-text">SLB / Superboy</h2>
        </div>
        <div className="record-world">
          <div className="record-grid">
            {records.map((item, index) => (
              <article className="record-card" data-rise key={item.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <small>{item.label}</small>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <div className="music-surfaces" aria-label="SupaBoy music surfaces">
            {musicSurfaces.map((surface) => (
              <article
                className={`music-surface ${surface.media ? "has-media" : ""}`}
                style={surface.media ? { "--surface-media": cssMediaUrl(surface.media) } : undefined}
                data-rise
                key={surface.title}
              >
                <span>{surface.label}</span>
                <h3>{surface.title}</h3>
                <p>{surface.body}</p>
                <button type="button" onClick={() => playMusicSurface(surface)}>
                  {surface.action}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marquee-band" aria-label="SupaBoy marquee">
        <div className="marquee-track">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index}>THE GRIND DON'T STOP / NIGERIAN ROOTS / CHICAGO GRIND / TTP / SUPABOY / </span>
          ))}
        </div>
      </section>

      <section className="video-wall" id="video">
        <div className="section-head narrow" data-rise>
          <p className="eyebrow text-spark">campaign surfaces</p>
          <h2 className="section-title-text">Houston proof. Chicago pressure. Rose-room emotion.</h2>
          <p>Houston nights, Chicago blocks, green-wall press looks, roses, studio frames, and the 24 Hr In Houston proof.</p>
        </div>
        <div className="video-grid">
          {videoFrames.map((frame, index) => (
            <button
              type="button"
              className={`video-card ${frame.media ? "has-media" : ""}`}
              style={frame.media ? { "--media": cssMediaUrl(frame.media) } : undefined}
              onClick={() => openFrame(index)}
              data-rise
              key={frame.label}
              aria-label={`Open ${frame.label} ${frame.surface}`}
            >
              <span>{frame.label}</span>
              <em>{frame.surface}</em>
              <i />
            </button>
          ))}
        </div>
      </section>

      {activeFrame && (
        <div className="media-viewer" role="dialog" aria-modal="true" aria-label={activeFrame.label}>
          <button type="button" className="media-back" onClick={returnToCampaignSurfaces}>Back to surfaces</button>
          <button type="button" className="media-close" onClick={() => setActiveFrameIndex(null)} aria-label="Close visual">X</button>
          <button type="button" className="media-step media-prev" onClick={() => stepFrame(-1)} aria-label="Previous visual">&lt;</button>
          <figure className="media-stage">
            {activeFrame.media && <img src={activeFrame.media.src} alt={activeFrame.label} />}
            <figcaption>
              <strong>{activeFrame.label}</strong>
              <div>
                <button type="button" onClick={() => playFrameSurface(activeFrame)}>Play</button>
                <button type="button" onClick={sendFrameToStage}>Stage</button>
                {activeFrame.media && <a href={activeFrame.media.src} target="_blank" rel="noopener">Open</a>}
              </div>
            </figcaption>
          </figure>
          <button type="button" className="media-step media-next" onClick={() => stepFrame(1)} aria-label="Next visual">&gt;</button>
        </div>
      )}

      {activeProof && (
        <div className="proof-viewer" role="dialog" aria-modal="true" aria-label={`${activeProof.title} proof`}>
          <button type="button" className="proof-close" onClick={() => setActiveProofId(null)} aria-label="Close proof">X</button>
          <article className="proof-card">
            <div className="proof-copy">
              <p className="eyebrow text-spark">{activeProof.eyebrow}</p>
              <h2>{activeProof.title}</h2>
              <p>{activeProof.body}</p>
              <div className="proof-stats" aria-label="Houston proof stats">
                <strong>{activeProof.stat}</strong>
                <span>{activeProof.statLabel}</span>
                <em>{activeProof.date}</em>
              </div>
              <div className="proof-actions">
                <button type="button" onClick={() => stageProof(activeProofId)}>Show in stage</button>
                {activeProofMedia && <a href={activeProofMedia.src} target="_blank" rel="noopener">Open visual</a>}
                <button type="button" onClick={() => snapToSelector(activeProof.musicTarget || "#sound")}>Open music hub</button>
              </div>
            </div>
            <figure className="proof-visual">
              {activeProofMedia && <img src={activeProofMedia.src} alt={`${activeProof.title} stream proof visual`} />}
              <figcaption>{activeProof.title} proof visual</figcaption>
            </figure>
          </article>
        </div>
      )}

      <section className="drop-lane" id="drops">
        <div className="drop-copy" data-rise>
          <p className="eyebrow text-spark">live + fans</p>
          <h2 className="section-title-text">Twitch, shouts, and real-time motion.</h2>
          <p>iamsuperboy2x, snippets, fan requests, performance recaps, and TTP in one lane.</p>
        </div>
        <div className="drop-stack" data-rise>
          <div><span>01</span><strong>Shouts</strong><small>Fan messages, birthday drops, promo tags, and public love.</small></div>
          <div><span>02</span><strong>Media</strong><small>Short clips, vertical videos, snippets, and release previews.</small></div>
          <div><span>03</span><strong>TTP</strong><small>The community tag stays visible without flattening the meaning.</small></div>
        </div>
      </section>

      <section className="booking" id="booking">
        <div data-rise>
          <p className="eyebrow text-spark">booking + press</p>
          <h2 className="section-title-text">Book SupaBoy for the room.</h2>
          <p>Performances, hosting, appearances, campus moments, listening parties, branded live experiences, features, and press.</p>
        </div>
        <form onSubmit={handleBookingSubmit} data-rise>
          <input aria-label="Name or company" placeholder="Name / company" />
          <input aria-label="Email or phone" placeholder="Email or phone" />
          <input aria-label="Event city and date" placeholder="Event city + date" />
          <textarea aria-label="Booking details" placeholder="Performance, hosting, appearance, feature, press, or collaboration details" />
          <button type="submit">Stage inquiry</button>
          {bookingStatus && <p className="booking-status" role="status">{bookingStatus}</p>}
        </form>
      </section>

      <nav className="dock" aria-label="Stage jump controls">
        {artistRooms.map((room) => (
          <button
            type="button"
            key={room.id}
            className={activeRoom === room.id ? "is-active" : ""}
            style={{ "--room": room.color }}
            data-stage-jump="true"
            onClick={() => selectRoom(room.id)}
          >
            {room.nav}
          </button>
        ))}
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
