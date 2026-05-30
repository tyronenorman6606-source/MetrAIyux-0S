import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { motion } from "framer-motion";

const rooms = [
  {
    id: "sound",
    nav: "Vault",
    number: "01",
    title: "Sixteen Drops",
    line: "Cupid, Blades, Gray Gang, Fuck Yo Society, Hands Up, Naruto, Tidal Waves, and the full kept catalog.",
    action: "Open catalog",
    href: "catalog.html",
    color: "#ffd36a",
    accent: "#fff2b9",
    position: [-4.8, 0.1, -1.8],
    bars: [0.54, 0.86, 0.62, 0.95, 0.58, 0.76],
    media: { src: "media/images/gray-shadow-portrait.jpg" },
    frame: [2.05, 2.5]
  },
  {
    id: "hero-room",
    nav: "Hero",
    number: "02",
    title: "Orbit Room",
    line: "The heavy orbiting video universe lives off the landing page with all nine clips and the main video stage.",
    action: "Open hero room",
    href: "hero-video-universe.html",
    color: "#ff244f",
    accent: "#ffb1c0",
    position: [4.6, 0.1, -1.9],
    bars: [0.92, 0.68, 0.8, 0.56, 0.96, 0.74],
    media: { src: "media/images/gray-cutout-vitaminwater.png" },
    frame: [2.05, 2.5]
  },
  {
    id: "videos",
    nav: "Videos",
    number: "03",
    title: "Trap Metal Footage",
    line: "Chicago underground footage, Blades, Fxck Yo Society, concert recap, teaser, and Phoenix archive rooms.",
    action: "Open videos",
    href: "video-rooms.html",
    color: "#4deaff",
    accent: "#b8f2ff",
    position: [-4.25, 0.1, 3.2],
    bars: [0.46, 0.58, 0.9, 0.74, 0.66, 0.88],
    media: { src: "media/images/gray-wide-stage.jpg" },
    frame: [2.2, 1.62]
  },
  {
    id: "release",
    nav: "Release",
    number: "04",
    title: "Phoenix Package",
    line: "Preview, package, unlock, and release control sit behind the artist dashboard and fan access lane.",
    action: "Open release",
    href: "release.html",
    color: "#79ffb5",
    accent: "#d7ffdf",
    position: [4.2, 0.1, 3.25],
    bars: [0.62, 0.84, 0.52, 0.7, 0.94, 0.58],
    media: { src: "media/images/gray-founder-portrait.jpg" },
    frame: [2.05, 2.5]
  },
  {
    id: "live",
    nav: "Live",
    number: "05",
    title: "Stage Proof",
    line: "Concert recap, booking, press angles, Media Over London handoff, and the route back into the Nexus.",
    action: "Open live lane",
    href: "live.html",
    color: "#a879ff",
    accent: "#f0ddff",
    position: [0, 0.1, 5.8],
    bars: [0.5, 0.68, 0.82, 0.56, 0.78, 0.64],
    media: { src: "media/images/gray-room-03.jpg" },
    frame: [2.05, 2.5]
  }
];

const quickRooms = [
  { label: "Orbit", href: "orbit.html" },
  { label: "Gallery", href: "gallery.html" },
  { label: "0S", href: "zero-os.html" },
  { label: "Field Notes", href: "field-notes.html" },
  { label: "Dashboard", href: "dashboard.html" }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scaledFrame(frame = [1.82, 2.42], scale = 1) {
  return [frame[0] * scale, frame[1] * scale];
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
        <planeGeometry args={scaledFrame(room.frame, 1.16)} />
        <meshBasicMaterial color={room.color} transparent opacity={active ? 0.34 : 0.18} />
      </mesh>
      <mesh position={[0, 0.48, -0.44]}>
        <planeGeometry args={room.frame} />
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

function CenterStage({ activeRoom, pulse }) {
  const group = useRef();
  const active = rooms.find((room) => room.id === activeRoom) || rooms[0];
  const activeColor = useMemo(() => new THREE.Color(active.color), [active.color]);
  const texture = useImageTexture(active.media?.src);

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
          <meshBasicMaterial color={index === 1 ? "#4deaff" : active.color} transparent opacity={0.28 + pulse * 0.12} />
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

function StageScene({ activeRoom, setActiveRoom, pan, zoom, pulse, orbit, autoSpin }) {
  const root = useRef();
  const active = rooms.find((room) => room.id === activeRoom) || rooms[0];

  useFrame(({ camera, clock, pointer }) => {
    const [x, , z] = active.position;
    const target = new THREE.Vector3(x * 0.2 + pan.x, 3.95 + pan.y, 14.5 + zoom + z * 0.14);
    camera.position.lerp(target, 0.055);
    camera.lookAt(x * 0.1 + pan.x * 0.35, 0.12, z * 0.08);
    if (root.current) {
      root.current.rotation.y = orbit + (autoSpin ? clock.elapsedTime * 0.26 : 0) + pointer.x * 0.035 + Math.sin(clock.elapsedTime * 0.16) * 0.025;
      root.current.rotation.x = -0.05 + pointer.y * 0.03;
    }
  });

  return (
    <group ref={root}>
      <ambientLight intensity={0.62} />
      <pointLight position={[0, 7.2, 6.4]} color={active.color} intensity={52 + pulse * 14} />
      <pointLight position={[-7, 2.8, -3.8]} color="#4deaff" intensity={22} />
      <pointLight position={[7, 2.8, 3.4]} color="#ff244f" intensity={22} />
      <mesh position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20, 30, 30]} />
        <meshStandardMaterial color="#080706" metalness={0.25} roughness={0.58} wireframe />
      </mesh>
      <WaveRoad activeRoom={activeRoom} />
      <CenterStage activeRoom={activeRoom} pulse={pulse} />
      {rooms.map((room) => (
        <group key={room.id} onClick={(event) => { event.stopPropagation(); setActiveRoom(room.id); }}>
          <EqualizerTower room={room} active={room.id === activeRoom} />
        </group>
      ))}
    </group>
  );
}

function GrayOrbitHero() {
  const [activeRoom, setActiveRoom] = useState("sound");
  const [zoom, setZoom] = useState(0);
  const [orbit, setOrbit] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pulse, setPulse] = useState(0.42);
  const dragRef = useRef(null);
  const heroRef = useRef(null);
  const pulseRef = useRef(0);
  const active = rooms.find((room) => room.id === activeRoom) || rooms[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      pulseRef.current = (pulseRef.current + 1) % 8;
      const step = pulseRef.current;
      setPulse(step === 0 || step === 4 ? 1 : step % 2 ? 0.62 : 0.78);
    }, 220);
    window.GRAY_SKYES_SUPABOY_PARITY_HERO = {
      ready: true,
      stageCanvas: true,
      orbitPictureCards: rooms.length,
      rooms: rooms.map((room) => room.id)
    };
    return () => window.clearInterval(timer);
  }, []);

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
  }

  function resetHeroBackground() {
    heroRef.current?.style.setProperty("--hero-x", "0");
    heroRef.current?.style.setProperty("--hero-y", "0");
  }

  function selectRoom(roomId) {
    setActiveRoom(roomId);
    setAutoSpin(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function activateRoomAction(room) {
    if (room.href) window.location.href = room.href;
  }

  return (
    <section
      id="hero"
      className="gray-supaboy-hero"
      ref={heroRef}
      style={{ "--active": active.color, "--active-accent": active.accent }}
      onPointerMove={moveHeroBackground}
      onPointerLeave={resetHeroBackground}
    >
      <div className="hero-portrait-bg" aria-hidden="true">
        <img className="hero-night-bg" src="media/images/gray-new-dsc09479.jpg" alt="" />
      </div>

      <div
        className="stage-canvas"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={(event) => setZoom((value) => clamp(value + event.deltaY / 320, -3.4, 3.6))}
        aria-label="Interactive Gray Skyes stage"
      >
        <Canvas camera={{ position: [0, 4, 14.5], fov: 44 }} dpr={[1, 1.45]} gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={["#030303"]} />
          <Suspense fallback={null}>
            <StageScene activeRoom={activeRoom} setActiveRoom={setActiveRoom} pan={pan} zoom={zoom} pulse={pulse} orbit={orbit} autoSpin={autoSpin} />
          </Suspense>
        </Canvas>

        <div className={`orbit-picture-belt ${autoSpin ? "is-spinning" : "is-held"}`} aria-label="Gray Skyes orbit rooms">
          {rooms.map((room, index) => (
            <button
              type="button"
              key={room.id}
              className={`orbit-picture-card ${room.id === activeRoom ? "is-active" : ""}`}
              style={{ "--card-index": index, "--card-angle": `${index * (360 / rooms.length)}deg`, "--card-color": room.color }}
              onClick={(event) => {
                event.stopPropagation();
                selectRoom(room.id);
              }}
            >
              <img src={room.media.src} alt="" />
              <span>{room.number} / {room.nav}</span>
            </button>
          ))}
        </div>

        <div className="center-orb-overlay" aria-hidden="true">
          <img src="media/images/gray-cutout.png" alt="" />
          <i />
          <i />
          <i />
        </div>
      </div>

      <motion.div className="hero-copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.72 }}>
        <p className="eyebrow">Chicago underground trap metal / 0S architect</p>
        <h1>Gray Skyes</h1>
        <p className="lede">Black-room records, raw footage, release control, artist ID, and founder signal held in one living Nexus lane.</p>
        <div className="hero-actions">
          <button type="button" className="primary" onClick={() => activateRoomAction(active)}>{active.action}</button>
          <a href="hero-video-universe.html">Hero room</a>
          <a href="orbit.html">Song orbit</a>
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
        <button type="button" onClick={() => activateRoomAction(active)}>{active.action}</button>
      </aside>

      <nav className="artist-room-dock" aria-label="Gray Skyes stage rooms">
        {rooms.map((room) => (
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

      <div className="stage-controls" aria-label="Stage controls">
        <button type="button" onClick={() => selectRoom("sound")}>Vault</button>
        <button type="button" onClick={() => setAutoSpin((value) => !value)}>{autoSpin ? "Hold" : "Spin"}</button>
        <button type="button" onClick={() => setZoom((value) => clamp(value - 1.2, -3.4, 3.6))}>Closer</button>
        <button type="button" onClick={() => setZoom((value) => clamp(value + 1.2, -3.4, 3.6))}>Wider</button>
        <button type="button" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(0); setOrbit(0); setAutoSpin(false); }}>Reset</button>
      </div>

      <div className="landing-room-links" aria-label="Gray Skyes page routes">
        {quickRooms.map((room) => (
          <a key={room.href} href={room.href}>{room.label}</a>
        ))}
      </div>
    </section>
  );
}

const mount = document.getElementById("grayOrbitHeroRoot");
if (mount) {
  createRoot(mount).render(<GrayOrbitHero />);
}
