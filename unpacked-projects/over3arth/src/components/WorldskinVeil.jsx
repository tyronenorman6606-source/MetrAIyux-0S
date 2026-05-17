import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const POINT_COUNT = 96;
const LINE_COUNT = 18;

function seeded(index) {
  const value = Math.sin(index * 999.27) * 43758.5453;
  return value - Math.floor(value);
}

export default function WorldskinVeil({ charge = 50, brainTarget = 'vessel' }) {
  const hostRef = useRef(null);
  const signalRef = useRef({ charge, brainTarget });

  useEffect(() => {
    signalRef.current = { charge, brainTarget };
  }, [charge, brainTarget]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 7.2;

    const pointPositions = new Float32Array(POINT_COUNT * 3);
    const pointColors = new Float32Array(POINT_COUNT * 3);
    for (let i = 0; i < POINT_COUNT; i += 1) {
      const radius = 1.4 + seeded(i) * 3.4;
      const angle = seeded(i + 40) * Math.PI * 2;
      const height = (seeded(i + 80) - 0.5) * 5.2;
      pointPositions[i * 3] = Math.cos(angle) * radius;
      pointPositions[i * 3 + 1] = height;
      pointPositions[i * 3 + 2] = Math.sin(angle) * radius - 0.4;
      const gold = seeded(i + 120) > 0.66;
      pointColors[i * 3] = gold ? 0.95 : 0.18;
      pointColors[i * 3 + 1] = gold ? 0.78 : 0.9;
      pointColors[i * 3 + 2] = gold ? 0.32 : 1;
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.028,
      vertexColors: true,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(points);

    const linePositions = new Float32Array(LINE_COUNT * 6);
    for (let i = 0; i < LINE_COUNT; i += 1) {
      const x = (seeded(i + 180) - 0.5) * 5.4;
      const y = (seeded(i + 220) - 0.5) * 4.8;
      const z = (seeded(i + 260) - 0.5) * 2.2;
      linePositions[i * 6] = x;
      linePositions[i * 6 + 1] = y;
      linePositions[i * 6 + 2] = z;
      linePositions[i * 6 + 3] = x + (seeded(i + 300) - 0.5) * 1.2;
      linePositions[i * 6 + 4] = y + 0.45 + seeded(i + 340) * 0.9;
      linePositions[i * 6 + 5] = z + (seeded(i + 380) - 0.5) * 0.9;
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x61f6ff,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    let frame = 0;
    function resize() {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function animate(now) {
      const time = now / 1000;
      const signal = signalRef.current;
      const chargeScale = Math.max(0.22, Math.min(1.15, signal.charge / 86));
      pointsMaterial.opacity = signal.brainTarget === 'overearth' ? 0.42 : 0.26 + chargeScale * 0.08;
      lineMaterial.opacity = signal.brainTarget === 'overearth' ? 0.11 : 0.05 + chargeScale * 0.03;
      points.rotation.y = time * 0.035;
      points.rotation.z = Math.sin(time * 0.2) * 0.035;
      lines.rotation.y = -time * 0.022;
      lines.rotation.z = Math.cos(time * 0.18) * 0.025;
      renderer.render(scene, camera);
      if (!reduceMotion) frame = requestAnimationFrame(animate);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeChild(renderer.domElement);
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={hostRef} className="worldskin-veil" aria-hidden="true" />;
}
