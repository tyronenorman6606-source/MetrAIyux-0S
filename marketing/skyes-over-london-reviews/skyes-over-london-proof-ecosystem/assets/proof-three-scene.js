import * as THREE from 'three';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const compact = window.matchMedia('(max-width: 700px)').matches;
const heroes = Array.from(document.querySelectorAll('.hero'));
const rigs = [];

const pointer = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
};

function sizeRenderer(host, renderer, camera) {
  const bounds = host.getBoundingClientRect();
  const width = Math.max(1, Math.floor(bounds.width));
  const height = Math.max(1, Math.floor(bounds.height));

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function makeParticleField(count, spread, color, size) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const i = index * 3;
    positions[i] = (Math.random() - 0.5) * spread;
    positions[i + 1] = (Math.random() - 0.5) * spread * 0.72;
    positions[i + 2] = (Math.random() - 0.5) * spread;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

function createRig(hero, index) {
  const host = document.createElement('div');
  host.className = 'three-proof-scene';
  host.dataset.threeProofScene = 'true';
  hero.prepend(host);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, compact ? 7.6 : 6.25);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.15 : 1.4));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const keyLight = new THREE.PointLight(0x4fc3ff, 2.2, 20);
  keyLight.position.set(-3.2, 1.8, 4.8);
  scene.add(keyLight);

  const warmLight = new THREE.PointLight(0xf6c758, 1.8, 18);
  warmLight.position.set(3.8, -1.2, 3.4);
  scene.add(warmLight);

  scene.add(new THREE.AmbientLight(0xffffff, 0.38));

  const core = new THREE.Group();
  core.position.set(compact ? 1.65 : 2.55, compact ? 0.2 : 0.08, -0.4);
  scene.add(core);

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x88dcff,
    emissive: 0x124d72,
    emissiveIntensity: 0.74,
    metalness: 0.58,
    roughness: 0.24,
    transparent: true,
    opacity: 0.68,
    wireframe: true,
  });

  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(compact ? 1.15 : 1.45, 2), shellMaterial);
  core.add(shell);

  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xf6c758,
    emissive: 0x8c5d05,
    emissiveIntensity: 0.82,
    metalness: 0.44,
    roughness: 0.18,
    transparent: true,
    opacity: 0.72,
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(compact ? 1.48 : 1.86, 0.018, 12, 140), ringMaterial);
  ring.rotation.set(Math.PI / 2.7, Math.PI / 5, 0);
  core.add(ring);

  const halo = makeParticleField(compact ? 120 : 260, compact ? 6 : 9, 0x4fc3ff, compact ? 0.018 : 0.024);
  scene.add(halo);

  const goldDust = makeParticleField(compact ? 42 : 96, compact ? 4.8 : 7, 0xf6c758, compact ? 0.015 : 0.02);
  scene.add(goldDust);

  sizeRenderer(host, renderer, camera);

  return {
    camera,
    core,
    goldDust,
    halo,
    host,
    index,
    renderer,
    ring,
    scene,
    shell,
  };
}

function animate(time = 0) {
  const seconds = time * 0.001;
  pointer.x += (pointer.targetX - pointer.x) * 0.055;
  pointer.y += (pointer.targetY - pointer.y) * 0.055;

  rigs.forEach((rig) => {
    rig.core.rotation.x = seconds * 0.18 + pointer.y * 0.22;
    rig.core.rotation.y = seconds * 0.25 + pointer.x * 0.28;
    rig.ring.rotation.z = seconds * 0.34;
    rig.shell.scale.setScalar(1 + Math.sin(seconds * 1.7 + rig.index) * 0.035);
    rig.halo.rotation.y = seconds * 0.045;
    rig.halo.rotation.x = pointer.y * 0.08;
    rig.goldDust.rotation.y = -seconds * 0.07;
    rig.camera.position.x = pointer.x * 0.22;
    rig.camera.position.y = pointer.y * 0.14;
    rig.camera.lookAt(0, 0, 0);
    rig.renderer.render(rig.scene, rig.camera);
  });

  window.__skyeProofThree.lastFrame = Math.round(time);
  requestAnimationFrame(animate);
}

if (!reduceMotion && heroes.length > 0) {
  heroes.forEach((hero, index) => rigs.push(createRig(hero, index)));

  window.addEventListener('pointermove', (event) => {
    pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.targetY = -(event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  window.addEventListener('resize', () => {
    rigs.forEach((rig) => sizeRenderer(rig.host, rig.renderer, rig.camera));
  });

  window.__skyeProofThree = {
    active: rigs.length,
    library: 'three',
    revision: THREE.REVISION,
    lastFrame: 0,
  };

  requestAnimationFrame(animate);
} else {
  window.__skyeProofThree = {
    active: 0,
    library: 'three',
    reducedMotion: reduceMotion,
    revision: THREE.REVISION,
  };
}
