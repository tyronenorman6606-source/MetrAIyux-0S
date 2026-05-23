import * as THREE from "../assets/vendor/three.module.min.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const compact = window.matchMedia("(max-width: 720px)").matches;
const palette = [0xf4c75b, 0x7ee7ff, 0xa88cff, 0x6ff2c7].map((color) => new THREE.Color(color));

document.querySelectorAll(".resume-hero").forEach((hero) => {
  const canvas = document.createElement("canvas");
  canvas.className = "resume-three-field";
  canvas.setAttribute("aria-hidden", "true");
  hero.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
  renderer.setClearColor(0x000000, 0);
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
  camera.position.set(0, 0, 8.4);

  const ambient = new THREE.AmbientLight(0xffffff, 0.32);
  const goldLight = new THREE.PointLight(0xf4c75b, 3.1, 30);
  goldLight.position.set(4, 4, 5);
  const cyanLight = new THREE.PointLight(0x7ee7ff, 2.2, 26);
  cyanLight.position.set(-4, -2, 4);
  scene.add(ambient, goldLight, cyanLight);

  const field = new THREE.Group();
  field.position.set(compact ? 0.35 : 1.7, compact ? -0.25 : -0.1, 0);
  scene.add(field);

  const count = compact ? 220 : 520;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const radius = 1.15 + Math.random() * (compact ? 2.2 : 3.6);
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * (compact ? 2.2 : 3.2);
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = height;
    positions[index * 3 + 2] = Math.sin(angle) * radius - Math.random() * 1.8;
    seeds[index] = Math.random() * Math.PI * 2;

    const color = palette[index % palette.length];
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: compact ? 0.035 : 0.042,
    vertexColors: true,
    transparent: true,
    opacity: 0.84,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  field.add(particles);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(compact ? 0.54 : 0.72, 2),
    new THREE.MeshStandardMaterial({
      color: 0x121827,
      emissive: 0x071b2f,
      emissiveIntensity: 0.9,
      metalness: 0.74,
      roughness: 0.22,
      transparent: true,
      opacity: 0.86
    })
  );
  field.add(core);

  const rings = [
    [1.08, 0xf4c75b, Math.PI / 2, 0, 0],
    [1.38, 0x7ee7ff, Math.PI / 2.5, 0.45, 0.15],
    [1.68, 0xa88cff, Math.PI / 1.75, -0.4, 0.25]
  ];

  rings.forEach(([radius, color, x, y, z]) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.009, 12, 180),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    ring.rotation.set(x, y, z);
    field.add(ring);
  });

  const lineGeometry = new THREE.BufferGeometry();
  const lineCount = compact ? 68 : 128;
  const linePositions = new Float32Array(lineCount * 6);
  for (let index = 0; index < lineCount; index += 1) {
    const a = (index * 11) % count;
    const b = (index * 29 + 17) % count;
    linePositions.set(positions.slice(a * 3, a * 3 + 3), index * 6);
    linePositions.set(positions.slice(b * 3, b * 3 + 3), index * 6 + 3);
  }
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: 0x7ee7ff,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  field.add(lines);

  let width = 0;
  let height = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.ty = -((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hero);
  resize();

  const clock = new THREE.Clock();

  function renderFrame() {
    const elapsed = clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.035;
    pointer.y += (pointer.ty - pointer.y) * 0.035;

    const pos = particleGeometry.attributes.position.array;
    for (let index = 0; index < count; index += 1) {
      const i3 = index * 3;
      pos[i3 + 1] += Math.sin(elapsed * 0.72 + seeds[index]) * 0.0007;
    }
    particleGeometry.attributes.position.needsUpdate = true;

    field.rotation.y = elapsed * 0.09 + pointer.x * 0.12;
    field.rotation.x = Math.sin(elapsed * 0.28) * 0.08 + pointer.y * 0.08;
    core.rotation.x = elapsed * 0.17;
    core.rotation.y = elapsed * 0.25;
    rings.forEach((_, index) => {
      const ring = field.children[index + 2];
      ring.rotation.z += 0.0018 + index * 0.0007;
    });

    camera.position.x = pointer.x * 0.35;
    camera.position.y = pointer.y * 0.22;
    camera.lookAt(field.position.x * 0.25, 0, 0);
    renderer.render(scene, camera);
  }

  if (reduceMotion) {
    renderFrame();
    return;
  }

  function animate() {
    renderFrame();
    window.requestAnimationFrame(animate);
  }

  animate();
});
