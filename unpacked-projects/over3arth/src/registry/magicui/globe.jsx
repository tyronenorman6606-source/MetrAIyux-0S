import { useEffect, useRef } from 'react';

const POINT_COUNT = 920;
const GOLD = '246, 215, 109';
const CYAN = '35, 231, 255';
const VIOLET = '140, 92, 255';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function landSignal(lat, lon) {
  const a = Math.sin(lon * 2.1 + lat * 1.35);
  const b = Math.cos(lon * 3.25 - lat * 2.4);
  const c = Math.sin((lon + lat) * 5.15) * 0.5;
  const polarMask = Math.abs(lat) > 1.05 ? 0.22 : 0;
  return a + b + c - polarMask;
}

function buildGlobePoints() {
  const points = [];
  const offset = 2 / POINT_COUNT;
  const increment = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < POINT_COUNT; i += 1) {
    const y = i * offset - 1 + offset / 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = i * increment;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const lat = Math.asin(y);
    const lon = Math.atan2(z, x);
    const land = landSignal(lat, lon) > 0.22 || Math.abs(Math.sin(lon * 1.7)) + Math.cos(lat * 3.1) > 1.24;
    points.push({ x, y, z, land, pulse: (i % 13) / 13 });
  }

  return points;
}

export function Globe({ className = '', intensity = 1, label = 'Over3arth active world', tilt = -0.38, radiusScale = 0.35 }) {
  const canvasRef = useRef(null);
  const pointsRef = useRef(buildGlobePoints());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let startTime = performance.now();

    function resize() {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect();
      width = Math.max(260, parent?.clientWidth || parent?.offsetWidth || rect?.width || canvas.clientWidth || 420);
      height = Math.max(260, parent?.clientHeight || parent?.offsetHeight || rect?.height || canvas.clientHeight || 420);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function draw(now) {
      const elapsed = (now - startTime) / 1000;
      const rotation = reduceMotion ? 0.78 : elapsed * 0.22;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * radiusScale;

      ctx.clearRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(centerX, centerY, radius * 0.12, centerX, centerY, radius * 1.28);
      glow.addColorStop(0, `rgba(${CYAN}, ${0.25 * intensity})`);
      glow.addColorStop(0.46, `rgba(${VIOLET}, ${0.13 * intensity})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${CYAN}, 0.18)`;
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radius * (1 - Math.abs(i) * 0.06), radius * 0.22, tilt + i * 0.18, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = `rgba(${GOLD}, 0.2)`;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.07, radius * 0.42, tilt - 0.2, 0, Math.PI * 2);
      ctx.stroke();

      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      pointsRef.current.forEach((point) => {
        const rotatedX = point.x * cosR - point.z * sinR;
        const rotatedZ = point.x * sinR + point.z * cosR;
        const tiltedY = point.y * cosT - rotatedZ * sinT;
        const tiltedZ = point.y * sinT + rotatedZ * cosT;

        if (tiltedZ < -0.22) return;

        const perspective = 1 / (1 + tiltedZ * 0.24);
        const screenX = centerX + rotatedX * radius * perspective;
        const screenY = centerY + tiltedY * radius * perspective;
        const depthAlpha = Math.max(0.12, Math.min(1, (tiltedZ + 1.05) / 2.05));
        const pulse = reduceMotion ? 0.6 : 0.58 + Math.sin(elapsed * 2.8 + point.pulse * Math.PI * 2) * 0.18;
        const dotSize = point.land ? 1.55 + depthAlpha * 1.15 : 0.72 + depthAlpha * 0.68;
        const color = point.land ? GOLD : CYAN;
        const alpha = point.land ? 0.42 + depthAlpha * 0.46 * pulse : 0.18 + depthAlpha * 0.32;

        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, dotSize, 0, Math.PI * 2);
        ctx.fill();
      });

      const rim = ctx.createRadialGradient(centerX, centerY, radius * 0.58, centerX, centerY, radius * 1.04);
      rim.addColorStop(0, 'rgba(255, 255, 255, 0)');
      rim.addColorStop(0.74, `rgba(${CYAN}, 0.08)`);
      rim.addColorStop(1, `rgba(${GOLD}, 0.28)`);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.02, 0, Math.PI * 2);
      ctx.stroke();

      if (!reduceMotion) animationFrame = requestAnimationFrame(draw);
    }

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      startTime = 0;
    };
  }, [intensity, radiusScale, tilt]);

  return (
    <div className={classNames('magic-globe', className)} role="img" aria-label={label}>
      <canvas ref={canvasRef} />
      <div className="magic-globe__core" />
      <div className="magic-globe__scanline" />
    </div>
  );
}

export default Globe;
