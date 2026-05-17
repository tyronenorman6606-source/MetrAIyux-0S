import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { animate, scroll, stagger } from "motion";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
const isCompact = window.innerWidth < 760;

gsap.registerPlugin(ScrollTrigger);

function setupScrollChrome() {
  const progress = document.querySelector("[data-scroll-progress]");
  if (!progress) return;

  const updateProgress = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, window.scrollY / max))})`;
  };
  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  scroll(updateProgress);

  if (reducedMotion || coarsePointer) return;

  const lenis = new Lenis({
    lerp: 0.16,
    smoothWheel: true,
    wheelMultiplier: 0.9,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function setupCursorTrail() {
  const trail = document.querySelector("[data-cursor-trail]");
  if (!trail || reducedMotion || coarsePointer) return;

  let x = -160;
  let y = -160;
  let tx = x;
  let ty = y;
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    tx = event.clientX;
    ty = event.clientY;
    document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
  }, { passive: true });

  const tick = () => {
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    trail.style.transform = `translate3d(${x - 120}px, ${y - 120}px, 0)`;
    requestAnimationFrame(tick);
  };
  tick();
}

function setupMotionUi() {
  const sections = Array.from(document.querySelectorAll("[data-motion-section]"));
  if (!reducedMotion) {
    gsap.fromTo(sections, { opacity: 0.48, y: 56 }, {
      opacity: 1,
      y: 0,
      duration: 0.95,
      ease: "power3.out",
      stagger: 0.08,
      immediateRender: false,
      scrollTrigger: {
        trigger: sections[0] || document.body,
        start: "top 78%",
        end: "bottom 38%",
        scrub: 0.55,
      },
    });

    sections.forEach((section) => {
      gsap.fromTo(section.querySelectorAll(".proof-item, .step, .platform-panel, .surface-card, .mini-card"), {
        y: 28,
        opacity: 0.3,
      }, {
        y: 0,
        opacity: 1,
        duration: 0.72,
        ease: "power2.out",
        stagger: 0.05,
        immediateRender: false,
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          end: "bottom 62%",
          scrub: true,
        },
      });
    });

    gsap.to(".skymail-webgl", {
      yPercent: 9,
      scale: 1.04,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });

    gsap.to(".command-surface, .mail-command-preview", {
      y: -28,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "35% top",
        scrub: true,
      },
    });
  }

  animate(".brand img", { rotate: [0, -2, 2, 0], scale: [1, 1.04, 1] }, {
    duration: reducedMotion ? 0.01 : 5.2,
    repeat: reducedMotion ? 0 : Infinity,
    easing: "ease-in-out",
  });

  animate(".glow-text, .neon-text", { opacity: [0.82, 1], filter: ["brightness(1)", "brightness(1.28)", "brightness(1)"] }, {
    duration: reducedMotion ? 0.01 : 4.8,
    repeat: reducedMotion ? 0 : Infinity,
    delay: stagger(0.12),
  });

  document.querySelectorAll(".magnetic, .button, .platform-button").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      if (!reducedMotion) animate(el, { y: -2, scale: 1.025 }, { duration: 0.18 });
    });
    el.addEventListener("pointerleave", () => {
      if (!reducedMotion) animate(el, { y: 0, scale: 1 }, { duration: 0.22 });
    });
  });
}

function setupThreeScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  const dpr = Math.min(window.devicePixelRatio || 1, isCompact ? 1.05 : 1.45);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.35, 7.2);

  const group = new THREE.Group();
  group.position.set(isCompact ? 0.55 : 1.42, isCompact ? -0.16 : -0.08, 0);
  group.scale.setScalar(isCompact ? 0.72 : 0.82);
  scene.add(group);

  const key = new THREE.DirectionalLight(0xffd76a, 2.3);
  key.position.set(2.4, 3.2, 4.6);
  scene.add(key);
  const fill = new THREE.PointLight(0x61f6ff, 6.5, 14);
  fill.position.set(-3.4, -1.2, 3.2);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xfff0ca, 0.42));

  const cyan = new THREE.MeshStandardMaterial({ color: 0x61f6ff, emissive: 0x0b6f84, emissiveIntensity: 0.7, roughness: 0.32, metalness: 0.72 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0x7b5200, emissiveIntensity: 0.58, roughness: 0.28, metalness: 0.86 });
  const magenta = new THREE.MeshStandardMaterial({ color: 0xff4fd8, emissive: 0x8c146a, emissiveIntensity: 0.5, roughness: 0.38, metalness: 0.52 });

  const envelope = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.34, 0.12), cyan);
  const topLine = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.035, 0.08), gold);
  topLine.position.set(0, 0.42, 0.11);
  const leftFold = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.035, 0.08), gold);
  leftFold.position.set(-0.44, 0.02, 0.12);
  leftFold.rotation.z = -0.45;
  const rightFold = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.035, 0.08), gold);
  rightFold.position.set(0.44, 0.02, 0.12);
  rightFold.rotation.z = 0.45;
  const bottomFold = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.035, 0.08), gold);
  bottomFold.position.set(0, -0.34, 0.12);
  bottomFold.rotation.z = 0.28;
  envelope.add(body, topLine, leftFold, rightFold, bottomFold);
  group.add(envelope);

  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.018, 12, 150), magenta);
  torus.rotation.x = Math.PI / 2.7;
  group.add(torus);

  const lock = new THREE.Group();
  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.12), gold);
  const lockShackle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 10, 44, Math.PI), magenta);
  lockShackle.rotation.z = Math.PI;
  lockShackle.position.set(0, 0.18, 0.04);
  lock.add(lockBody, lockShackle);
  lock.position.set(0.88, -0.24, 0.28);
  group.add(lock);

  const keyCard = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.72, 0.055), magenta);
  keyCard.position.set(-1.08, -0.82, -0.06);
  keyCard.rotation.z = -0.12;
  group.add(keyCard);

  const rails = [];
  const railMaterial = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.86 });
  for (let i = 0; i < 9; i += 1) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 2.4 + i * 0.16), railMaterial);
    rail.position.set((i - 4) * 0.36, -1.18 - (i % 2) * 0.16, -0.8);
    rail.rotation.y = 0.82;
    rails.push(rail);
    group.add(rail);
  }

  const particleCount = isCompact ? 80 : 150;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const angle = i * 2.3999632297;
    const radius = 0.9 + (i % 23) * 0.14;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle * 0.73) * 2.05;
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.7;
  }
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(pointsGeometry, new THREE.PointsMaterial({ color: 0x61f6ff, size: isCompact ? 0.022 : 0.032, transparent: true, opacity: 0.62 }));
  group.add(points);

  let pointerX = 0;
  let pointerY = 0;
  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  let running = !document.hidden;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; });
  window.addEventListener("resize", resize, { passive: true });
  resize();

  const clock = new THREE.Clock();
  function frame() {
    if (running) {
      const t = clock.getElapsedTime();
      group.rotation.y += ((pointerX * 0.28) - group.rotation.y) * 0.035;
      group.rotation.x += ((-pointerY * 0.18) - group.rotation.x) * 0.035;
      envelope.position.y = Math.sin(t * 1.4) * 0.12;
      keyCard.rotation.z = -0.12 + Math.sin(t * 0.9) * 0.025;
      lock.position.y = -0.24 + Math.sin(t * 1.15) * 0.035;
      torus.rotation.z = t * 0.34;
      torus.rotation.x = Math.PI / 2.7 + Math.sin(t * 0.7) * 0.12;
      points.rotation.y = t * 0.055;
      rails.forEach((rail, index) => {
        rail.position.z = -0.8 + Math.sin(t * 1.8 + index) * 0.22;
      });
      renderer.render(scene, camera);
    }
    if (!reducedMotion) requestAnimationFrame(frame);
  }
  frame();
  if (reducedMotion) renderer.render(scene, camera);
}

function setupWebgl() {
  document.querySelectorAll("[data-skymail-webgl]").forEach((canvas) => setupThreeScene(canvas));
}

setupScrollChrome();
setupCursorTrail();
setupMotionUi();
setupWebgl();
