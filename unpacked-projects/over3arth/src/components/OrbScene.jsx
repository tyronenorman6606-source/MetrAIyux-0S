import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function shouldReduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const realmNodes = [
  { color: 0x61f6ff, radius: 2.35, y: 0.88, phase: 0 },
  { color: 0xf4c75b, radius: 2.72, y: 0.34, phase: 1.05 },
  { color: 0x9b5cff, radius: 2.52, y: -0.18, phase: 2.1 },
  { color: 0x8ee3ff, radius: 2.92, y: -0.72, phase: 3.14 },
  { color: 0xff5ea8, radius: 2.45, y: 0.12, phase: 4.18 },
  { color: 0x67ff9f, radius: 2.8, y: 0.62, phase: 5.23 }
];

function makeStarField(count, spread) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(0xf4c75b), new THREE.Color(0x61f6ff), new THREE.Color(0xf6f0da), new THREE.Color(0xff5ea8)];

  for (let index = 0; index < count; index += 1) {
    const radius = 3.2 + Math.random() * spread;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const color = palette[index % palette.length];
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[index * 3 + 2] = radius * Math.cos(phi);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export default function OrbScene({ intensity = 1 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || shouldReduceMotion()) return undefined;

    const width = Math.max(mount.clientWidth, 1);
    const height = Math.max(mount.clientHeight, 1);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050507, 0.045);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0.35, 6.4);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const universe = new THREE.Group();
    scene.add(universe);

    const grid = new THREE.GridHelper(16, 32, 0x61f6ff, 0x332c4f);
    grid.position.y = -2.36;
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    universe.add(grid);

    const coreGeo = new THREE.SphereGeometry(1.06, 96, 96);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x071015,
      emissive: 0x102b32,
      emissiveIntensity: 0.72,
      roughness: 0.22,
      metalness: 0.65
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    universe.add(core);

    const atmosphereGeo = new THREE.SphereGeometry(1.18, 96, 96);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x61f6ff,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    universe.add(atmosphere);

    const wireGeo = new THREE.IcosahedronGeometry(1.31, 3);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xf4c75b, wireframe: true, transparent: true, opacity: 0.32 });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    universe.add(wire);

    const ringMaterials = [0xf4c75b, 0x61f6ff, 0xff5ea8, 0x67ff9f].map((color) => (
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    ));
    const rings = ringMaterials.map((material, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.76 + index * 0.28, 0.006, 10, 180), material);
      ring.rotation.x = 0.55 + index * 0.22;
      ring.rotation.y = 0.18 + index * 0.52;
      universe.add(ring);
      return ring;
    });

    const sectorGroup = new THREE.Group();
    universe.add(sectorGroup);
    const sectorMeshes = realmNodes.map((node) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 24, 24),
        new THREE.MeshBasicMaterial({ color: node.color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      sectorGroup.add(sphere);
      return sphere;
    });

    const connectionMaterial = new THREE.LineBasicMaterial({ color: 0x61f6ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending });
    const connections = realmNodes.map(() => {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geometry, connectionMaterial);
      sectorGroup.add(line);
      return line;
    });

    const starCount = window.innerWidth < 760 ? 520 : 1100;
    const starsGeo = makeStarField(starCount, 9);
    const starsMat = new THREE.PointsMaterial({
      size: window.innerWidth < 760 ? 0.016 : 0.012,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    const dustGeo = makeStarField(window.innerWidth < 760 ? 180 : 360, 4);
    const dustMat = new THREE.PointsMaterial({
      size: 0.028,
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    universe.add(dust);

    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const goldLight = new THREE.PointLight(0xf4c75b, 2.8, 14);
    goldLight.position.set(3, 2.6, 4);
    scene.add(goldLight);
    const cyanLight = new THREE.PointLight(0x61f6ff, 2.3, 14);
    cyanLight.position.set(-3.2, -1.4, 3);
    scene.add(cyanLight);
    const roseLight = new THREE.PointLight(0xff5ea8, 1.2, 10);
    roseLight.position.set(1.4, -2.2, 2.4);
    scene.add(roseLight);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const clock = new THREE.Clock();
    let frame = 0;

    function animate() {
      const time = clock.getElapsedTime();
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      core.rotation.y = time * 0.11;
      core.rotation.x = Math.sin(time * 0.18) * 0.08;
      atmosphere.scale.setScalar(1 + Math.sin(time * 1.1) * 0.035 * intensity);
      wire.rotation.y = -time * 0.24;
      wire.rotation.z = time * 0.08;
      universe.rotation.y = time * 0.018 + pointer.x * 0.18;
      universe.rotation.x = pointer.y * 0.08;
      stars.rotation.y = time * 0.006;
      stars.rotation.x = time * 0.002;
      dust.rotation.y = -time * 0.032;
      dust.rotation.z = time * 0.014;

      rings.forEach((ring, index) => {
        ring.rotation.z = time * (0.09 + index * 0.018);
        ring.material.opacity = 0.26 + Math.sin(time * 1.2 + index) * 0.12;
      });

      sectorMeshes.forEach((mesh, index) => {
        const node = realmNodes[index];
        const angle = node.phase + time * (0.08 + index * 0.004);
        const y = node.y + Math.sin(time * 0.8 + node.phase) * 0.08;
        mesh.position.set(Math.cos(angle) * node.radius, y, Math.sin(angle) * node.radius);
        mesh.scale.setScalar(1 + Math.sin(time * 2.4 + index) * 0.18);
        const linePosition = connections[index].geometry.attributes.position;
        linePosition.setXYZ(0, 0, 0, 0);
        linePosition.setXYZ(1, mesh.position.x, mesh.position.y, mesh.position.z);
        linePosition.needsUpdate = true;
      });

      camera.position.x += (pointer.x * 0.34 - camera.position.x) * 0.035;
      camera.position.y += (0.35 + pointer.y * 0.18 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }

    function resize() {
      const nextWidth = Math.max(mount.clientWidth, 1);
      const nextHeight = Math.max(mount.clientHeight, 1);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    }

    function onPointerMove(event) {
      pointer.tx = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      pointer.ty = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      coreGeo.dispose();
      coreMat.dispose();
      atmosphereGeo.dispose();
      atmosphereMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      rings.forEach((ring) => {
        ring.geometry.dispose();
        ring.material.dispose();
      });
      sectorMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      connections.forEach((line) => line.geometry.dispose());
      connectionMaterial.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      grid.geometry.dispose();
      grid.material.dispose();
      renderer.dispose();
      mount.replaceChildren();
    };
  }, [intensity]);

  return <div className="orb-scene living-background skyesol-living-field" ref={mountRef} aria-hidden="true" />;
}
