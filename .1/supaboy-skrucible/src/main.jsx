import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import * as THREE from "three";
import { create } from "zustand";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const useForge = create((set) => ({
  mode: "refined",
  tool: "glass",
  setTool: (tool) => set({ tool }),
  toggleMode: () => set((state) => ({ mode: state.mode === "refined" ? "raw" : "refined" }))
}));

const tools = {
  glass: {
    label: "Proof",
    kicker: "Houston receipt",
    text: "The 24 Hr In Houston proof visual stays front-facing: 344,044 streams, release date, and the image that makes the lane believable."
  },
  crystal: {
    label: "Release",
    kicker: "SLB center",
    text: "The SLB / Superboy music path gets the sharp treatment: cover, LinkMe, track energy, and a direct fan route."
  },
  plasma: {
    label: "Motion",
    kicker: "Raw type",
    text: "Kinetic type, orange heat, and high-contrast stage movement carry the Nigerian roots, Chicago pressure, and Houston proof."
  },
  chrome: {
    label: "Booking",
    kicker: "Chrome lane",
    text: "Music, Twitch, story, proof, and booking stay reachable without making SupaBoy's launch page feel like a plain bio."
  }
};

const proofAssets = [
  { label: "24 Hr proof", src: "media/houston-proof.webp" },
  { label: "SLB cover", src: "media/slb-cover.webp" },
  { label: "Houston night", src: "media/houston-mart.webp" }
];

function PlasmaPlane({ active }) {
  const mat = useRef();
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: active ? 0.8 : 0.34 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) }
  }), [active]);

  useFrame(({ clock, pointer }) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = clock.elapsedTime;
    mat.current.uniforms.uMouse.value.set(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5);
    mat.current.uniforms.uIntensity.value += ((active ? 0.82 : 0.36) - mat.current.uniforms.uIntensity.value) * 0.06;
  });

  return (
    <mesh position={[0, 0.2, -4]} scale={[16, 10, 1]}>
      <planeGeometry args={[1, 1, 48, 48]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
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
            vec3 color = c1 * s + c2 * cs * (1.0 - s) + c3 * (1.0 - s) * (1.0 - cs) * 0.8;
            color *= uIntensity * 0.62;
            gl_FragColor = vec4(color, 0.74 * uIntensity);
          }
        `}
      />
    </mesh>
  );
}

function GlassCore({ active }) {
  const mesh = useRef();
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = clock.elapsedTime * 0.35;
    mesh.current.rotation.x = Math.sin(clock.elapsedTime * 0.6) * 0.16;
    const scale = active ? 1.18 : 1;
    mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.06);
  });
  return (
    <mesh ref={mesh} position={[0, 0.28, 0]}>
      <icosahedronGeometry args={[1.28, 3]} />
      <meshPhysicalMaterial
        color="#c8c4ff"
        metalness={0.18}
        roughness={0.05}
        transmission={0.62}
        thickness={1.6}
        ior={1.5}
        transparent
        opacity={0.72}
        emissive="#5c3fff"
        emissiveIntensity={active ? 0.42 : 0.18}
      />
    </mesh>
  );
}

function Crystal({ position, color, active, delay }) {
  const mesh = useRef();
  useFrame(({ clock }, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * (0.8 + delay);
    mesh.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.2 + delay) * 0.12;
    const scale = active ? 1.08 : 0.78;
    mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.08);
    mesh.current.material.emissiveIntensity += ((active ? 1.8 : 0.44) - mesh.current.material.emissiveIntensity) * 0.08;
  });
  return (
    <mesh ref={mesh} position={position}>
      <octahedronGeometry args={[0.42, 0]} />
      <meshStandardMaterial color={color} metalness={0.82} roughness={0.09} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  );
}

function ForgeFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.42, 0]}>
      <planeGeometry args={[26, 26]} />
      <meshStandardMaterial color="#060418" metalness={0.66} roughness={0.28} emissive="#170c35" emissiveIntensity={0.32} />
    </mesh>
  );
}

function ForgeScene() {
  const tool = useForge((state) => state.tool);
  const mode = useForge((state) => state.mode);
  const raw = mode === "raw";
  return (
    <Canvas camera={{ position: [0, 1.2, 6], fov: 48 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={[raw ? "#090206" : "#04030a"]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[3, 4, 4]} color={raw ? "#ff6b35" : "#b47dff"} intensity={18} />
      <pointLight position={[-3, 2, 2]} color={raw ? "#f4c75b" : "#7dd3fc"} intensity={12} />
      <Suspense fallback={null}>
        <PlasmaPlane active={tool === "plasma" || raw} />
        <GlassCore active={tool === "glass"} />
        <Crystal position={[-2.2, 0.1, 0.35]} color={raw ? "#ff6b35" : "#b47dff"} active={tool === "crystal"} delay={0.2} />
        <Crystal position={[2.15, 0.45, -0.1]} color={raw ? "#f4c75b" : "#7dd3fc"} active={tool === "crystal"} delay={1.1} />
        <Crystal position={[0.25, 1.95, -0.55]} color="#8ff0a4" active={tool === "chrome"} delay={1.8} />
        <ForgeFloor />
      </Suspense>
    </Canvas>
  );
}

function KineticWordmark({ text }) {
  const ref = useRef();
  useEffect(() => {
    const chars = ref.current?.querySelectorAll(".wm-char");
    if (!chars?.length) return undefined;
    const tl = gsap.timeline({ delay: 0.2 });
    tl.fromTo(chars, { y: 76, opacity: 0, rotateX: -82, filter: "blur(12px)" }, {
      y: 0,
      opacity: 1,
      rotateX: 0,
      filter: "blur(0px)",
      stagger: 0.045,
      duration: 1.08,
      ease: "expo.out"
    }).add(() => {
      gsap.to(chars, {
        y: (i) => Math.sin(i * 0.95) * 4,
        repeat: -1,
        yoyo: true,
        duration: 2.4,
        ease: "sine.inOut",
        stagger: { each: 0.08, repeat: -1, yoyo: true }
      });
    });
    return () => tl.kill();
  }, [text]);

  return (
    <h1 ref={ref} className="wordmark-kinetic" aria-label={text}>
      {text.split("").map((char, index) => (
        <span className="wm-char" key={`${char}-${index}`}>{char === " " ? "\u00a0" : char}</span>
      ))}
    </h1>
  );
}

function GlitchText({ children }) {
  const words = String(children).split(" ");
  const data = useMemo(() => words.map((word) => word.split("").map(() => ({
    delay: (Math.random() * 3.4).toFixed(2),
    offset: `${(Math.random() * 7 - 3.5).toFixed(1)}px`
  }))), [children]);
  return (
    <span aria-label={children}>
      {words.map((word, wordIndex) => (
        <React.Fragment key={`${word}-${wordIndex}`}>
          <span className="glitch-word">
            {word.split("").map((char, charIndex) => (
              <span
                className="glitch-char"
                style={{ "--delay": `${data[wordIndex][charIndex].delay}s`, "--offset": data[wordIndex][charIndex].offset }}
                key={`${char}-${charIndex}`}
              >
                {char}
              </span>
            ))}
          </span>
          {wordIndex < words.length - 1 ? " " : ""}
        </React.Fragment>
      ))}
    </span>
  );
}

function ForgeChrome() {
  const x = useMotionValue(-120);
  const y = useMotionValue(-120);
  const sx = useSpring(x, { stiffness: 140, damping: 26, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 140, damping: 26, mass: 0.6 });
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 24 });
  const mode = useForge((state) => state.mode);
  const color = mode === "raw" ? "#ff6b35" : "#b47dff";
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
    const max = Math.max(1, source.scrollHeight - window.innerHeight);
    const size = Math.min(track, Math.max(78, (window.innerHeight / Math.max(source.scrollHeight, window.innerHeight)) * track));
    const ratio = Math.min(1, Math.max(0, source.scrollTop / max));

    thumb.style.height = `${Math.floor(size)}px`;
    rail.style.setProperty("--drag-y", `${Math.round(ratio * Math.max(0, track - size))}px`);
  }

  function scheduleRailUpdate() {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(updateRail);
  }

  useEffect(() => {
    const handle = (event) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };
    window.addEventListener("pointermove", handle, { passive: true });
    window.addEventListener("scroll", scheduleRailUpdate, { passive: true });
    window.addEventListener("resize", scheduleRailUpdate, { passive: true });
    scheduleRailUpdate();
    window.setTimeout(scheduleRailUpdate, 300);
    return () => {
      window.removeEventListener("pointermove", handle);
      window.removeEventListener("scroll", scheduleRailUpdate);
      window.removeEventListener("resize", scheduleRailUpdate);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [x, y]);

  function moveToPointer(event, keepOffset) {
    const rail = railRef.current;
    const thumb = thumbRef.current;
    if (!rail || !thumb) return;
    const source = document.scrollingElement || document.documentElement;
    const railRect = rail.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const offset = keepOffset ? dragRef.current?.offset ?? thumbRect.height / 2 : thumbRect.height / 2;
    const ratio = Math.min(1, Math.max(0, (event.clientY - railRect.top - offset) / Math.max(1, railRect.height - thumbRect.height)));
    source.scrollTop = ratio * Math.max(1, source.scrollHeight - window.innerHeight);
    scheduleRailUpdate();
  }

  function beginDrag(event) {
    const thumb = thumbRef.current;
    const thumbRect = thumb?.getBoundingClientRect();
    const hitThumb = !!thumb && (event.target === thumb || thumb.contains(event.target));
    dragRef.current = {
      offset: hitThumb && thumbRect ? event.clientY - thumbRect.top : (thumbRect?.height || 78) / 2
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.classList.add("is-dragging");
    document.documentElement.classList.add("drag-scroll-active");
    moveToPointer(event, hitThumb);
  }

  function moveDrag(event) {
    if (!dragRef.current) return;
    event.preventDefault();
    moveToPointer(event, true);
  }

  function endDrag(event) {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    event.currentTarget.classList.remove("is-dragging");
    document.documentElement.classList.remove("drag-scroll-active");
    scheduleRailUpdate();
  }

  return (
    <>
      <motion.div className="scroll-progress" style={{ scaleX: progress }} />
      <motion.div
        className="cursor-aura"
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle, ${color}55, transparent 64%)`,
          x: useTransform(sx, (value) => value - 90),
          y: useTransform(sy, (value) => value - 90)
        }}
      />
      <div
        ref={railRef}
        className="drag-scroll-rail"
        aria-hidden="true"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <i ref={thumbRef} />
      </div>
    </>
  );
}

function App() {
  const mode = useForge((state) => state.mode);
  const tool = useForge((state) => state.tool);
  const setTool = useForge((state) => state.setTool);
  const toggleMode = useForge((state) => state.toggleMode);
  const [requestStatus, setRequestStatus] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-forge-mode", mode);
  }, [mode]);

  useEffect(() => {
    const lenis = new Lenis({ autoRaf: false, duration: 1.18, lerp: 0.12, smoothWheel: true, wheelMultiplier: 0.92, touchMultiplier: 1.8 });
    lenis.on("scroll", () => ScrollTrigger.update());
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    gsap.fromTo("[data-reveal]", { autoAlpha: 0.28, y: 34 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.88,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: { trigger: ".forge-scroll", start: "top 74%", end: "bottom bottom", scrub: 0.8 }
    });
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <main>
      <ForgeChrome />
      <header className="topbar">
        <a className="brand" href="#top">SUPABOY</a>
        <div className="tool-nav" aria-label="Forge tools">
          {Object.keys(tools).map((key) => (
            <button type="button" className={tool === key ? "is-active" : ""} onClick={() => setTool(key)} key={key}>{key}</button>
          ))}
        </div>
        <button type="button" className="mode-toggle" onClick={toggleMode}>{mode}</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">SKrucible artist cut</p>
          <KineticWordmark text="SUPABOY" />
          <p className="lede"><GlitchText>Houston proof. Chicago pressure. SLB motion.</GlitchText> A sharper launch page for SupaBoy's music, visuals, Twitch room, and booking lane.</p>
          <div className="hero-actions">
            <a href="#forge" className="primary">Open forge</a>
            <a href="https://link.me/superboy1x" target="_blank" rel="noopener" className="secondary">Music hub</a>
            <a href="#booking" className="secondary">Booking</a>
          </div>
          <div className="artist-proof-strip" aria-label="SupaBoy proof visuals">
            {proofAssets.map((asset) => (
              <figure key={asset.label}>
                <img src={asset.src} alt={asset.label} />
                <figcaption>{asset.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="forge-viewport" aria-label="Interactive SKrucible forge scene">
          <ForgeScene />
        </div>
      </section>

      <section className="forge-scroll" id="forge">
        <div className="forge-grid">
          {Object.entries(tools).map(([key, item]) => (
            <button type="button" className={`forge-tile ${tool === key ? "is-active" : ""}`} onClick={() => setTool(key)} data-reveal key={key}>
              <span>{item.kicker}</span>
              <strong>{item.label}</strong>
              <p>{item.text}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="proof-band" data-reveal>
        <div>
          <p className="eyebrow">Launch proof</p>
          <h2>SupaBoy's artist page now has proof, motion, and a real path out.</h2>
        </div>
        <ul>
          <li>24 Hr In Houston proof visual and stream number</li>
          <li>SLB / Superboy music hub</li>
          <li>Twitch lane for iamsuperboy2x</li>
          <li>Draggable scroll rail, kinetic wordmark, and raw/refined mode</li>
        </ul>
      </section>

      <section className="booking" id="booking" data-reveal>
        <div>
          <p className="eyebrow">Booking lane</p>
          <h2>Stage the opportunity without losing the artist world.</h2>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); setRequestStatus("Request staged on this page. Use the music hub or Twitch lane for the fastest live handoff."); }}>
          <input aria-label="Name or company" placeholder="Name / company" />
          <input aria-label="Email or phone" placeholder="Email or phone" />
          <textarea aria-label="Opportunity details" placeholder="City, date, and opportunity" />
          <button type="submit">Stage request</button>
          {requestStatus && <p className="request-status" role="status">{requestStatus}</p>}
        </form>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
