import { useEffect, useMemo, useRef } from 'react';

export const AUREN_ENERGY_SOURCE = 'MCP/skye-design-lab/Compoents/energy-being-tlking';

const MODE_SETTINGS = {
  idle: { hue: 222, intensity: 2.45, speed: 0.78, expansion: 0.72, noise: 2 },
  listening: { hue: 168, intensity: 6.2, speed: 1.4, expansion: 1.08, noise: 5 },
  thinking: { hue: 282, intensity: 8.4, speed: 3.4, expansion: 0.7, noise: 2 },
  speaking: { hue: 42, intensity: 7.8, speed: 1.8, expansion: 1.28, noise: 10 },
  checkin: { hue: 312, intensity: 7, speed: 1.9, expansion: 1.18, noise: 7 }
};

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function createParticle(width, height) {
  const isCore = Math.random() > 0.68;
  return {
    x: width / 2 + (Math.random() - 0.5) * width * 0.18,
    y: height / 2 + (Math.random() - 0.5) * height * 0.18,
    angle: Math.random() * Math.PI * 2,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.045 + 0.012,
    targetDist: isCore ? Math.random() * 28 + 6 : Math.random() * 82 + 22,
    radius: isCore ? Math.random() * 2.4 + 1.1 : Math.random() * 1.4 + 0.45,
    baseSpeed: isCore ? Math.random() * 1.7 + 0.6 : Math.random() * 2.8 + 0.9,
    lightness: isCore ? 74 + Math.random() * 22 : 42 + Math.random() * 28,
    life: Math.random(),
    decay: Math.random() * 0.008 + 0.004,
    isCore
  };
}

export default function AurenEnergyBeing({
  className = '',
  mode = 'idle',
  presence = 'inside',
  target = 'vessel',
  energy = 50,
  label = 'Auren energy being'
}) {
  const canvasRef = useRef(null);
  const runtimeRef = useRef({
    baseHue: MODE_SETTINGS.idle.hue,
    intensity: MODE_SETTINGS.idle.intensity,
    mouseX: 0,
    mouseY: 0,
    particles: []
  });
  const settings = useMemo(() => {
    const normalizedMode = MODE_SETTINGS[mode] ? mode : 'idle';
    const base = MODE_SETTINGS[normalizedMode];
    const targetShift = target === 'overearth' ? 26 : 0;
    return {
      ...base,
      mode: normalizedMode,
      presence,
      hue: (base.hue + targetShift) % 360,
      energy: Math.max(0, Math.min(100, Number(energy) || 0))
    };
  }, [energy, mode, presence, target]);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const runtime = runtimeRef.current;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let animationFrame = 0;

    function resize() {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect();
      width = Math.max(160, parent?.clientWidth || parent?.offsetWidth || rect?.width || canvas.clientWidth || 260);
      height = Math.max(160, parent?.clientHeight || parent?.offsetHeight || rect?.height || canvas.clientHeight || 260);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const desiredCount = Math.min(290, Math.max(150, Math.round((width * height) / 720)));
      while (runtime.particles.length < desiredCount) runtime.particles.push(createParticle(width, height));
      if (runtime.particles.length > desiredCount) runtime.particles.length = desiredCount;
      if (!runtime.mouseX || !runtime.mouseY) {
        runtime.mouseX = width / 2;
        runtime.mouseY = height / 2;
      }
    }

    function drawConnections() {
      const limit = Math.min(runtime.particles.length, 112);
      ctx.lineWidth = 0.55;
      for (let i = 0; i < limit; i += 1) {
        const p1 = runtime.particles[i];
        for (let j = i + 1; j < limit; j += 1) {
          const p2 = runtime.particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distanceSq = dx * dx + dy * dy;
          const maxDistanceSq = 3600;
          if (distanceSq >= maxDistanceSq) continue;
          const alpha = 1 - distanceSq / maxDistanceSq;
          ctx.strokeStyle = `hsla(${runtime.baseHue}, 92%, 66%, ${alpha * 0.28})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    function drawCore(now) {
      const time = now / 1000;
      const speakingPulse = settingsRef.current.mode === 'speaking' ? Math.sin(time * 18) * 7 : 0;
      const coreRadius = 13 + Math.sin(time * 4.4) * 4 + speakingPulse;
      const outerRadius = coreRadius * (2.8 + runtime.intensity * 0.36);
      const gradient = ctx.createRadialGradient(runtime.mouseX, runtime.mouseY, 0, runtime.mouseX, runtime.mouseY, outerRadius);
      gradient.addColorStop(0, `hsla(${runtime.baseHue}, 100%, 96%, 0.94)`);
      gradient.addColorStop(0.24, `hsla(${runtime.baseHue}, 100%, 68%, 0.58)`);
      gradient.addColorStop(1, `hsla(${runtime.baseHue}, 100%, 52%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(runtime.mouseX, runtime.mouseY, outerRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `hsla(${(runtime.baseHue + 54) % 360}, 100%, 72%, 0.32)`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(runtime.mouseX, runtime.mouseY, outerRadius * 0.82, outerRadius * 0.28, Math.sin(time * 0.7) * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    function draw(now) {
      const current = settingsRef.current;
      const time = now / 1000;
      const centerX = width / 2;
      const centerY = height / 2;
      const emergenceLift = current.presence === 'emerged' ? -height * 0.36 : current.presence === 'awake' ? -height * 0.08 : 0;
      const energyBoost = current.energy / 100;
      const activePresence = current.presence === 'emerged' || current.mode === 'thinking' || current.mode === 'speaking' || current.mode === 'checkin';

      runtime.baseHue += (current.hue - runtime.baseHue) * (activePresence ? 0.09 : 0.035);
      runtime.intensity += (current.intensity + energyBoost * 1.8 - runtime.intensity) * (activePresence ? 0.14 : 0.045);

      let targetX = centerX;
      let targetY = centerY + emergenceLift;
      if (current.mode === 'idle' && current.presence !== 'inside') {
        targetX += Math.sin(time * 0.32) * width * 0.1;
        targetY += Math.cos(time * 0.42) * height * 0.07;
      } else if (current.mode === 'thinking') {
        targetX += Math.sin(time * 2.7) * width * 0.1;
        targetY += Math.cos(time * 3.1) * height * 0.1;
      } else if (current.mode === 'speaking') {
        targetY += Math.sin(time * 2.4) * height * 0.055;
        runtime.intensity = current.intensity + Math.sin(time * 15) * 1.4 + energyBoost * 1.4;
      } else if (current.mode === 'checkin') {
        targetX += Math.sin(time * 1.4) * width * 0.14;
        targetY += Math.cos(time * 1.1) * height * 0.06;
      }

      runtime.mouseX += (targetX - runtime.mouseX) * (reduceMotion ? 0.06 : activePresence ? 0.07 : 0.025);
      runtime.mouseY += (targetY - runtime.mouseY) * (reduceMotion ? 0.06 : activePresence ? 0.07 : 0.025);

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      drawConnections();

      runtime.particles.forEach((particle) => {
        particle.angle += particle.baseSpeed * 0.01 * (reduceMotion ? 0.38 : current.speed);
        particle.wobble += particle.wobbleSpeed;
        particle.life += particle.decay * (reduceMotion ? 0.45 : 1);
        if (particle.life > 1) {
          particle.life = 0;
          if (Math.random() < 0.13) Object.assign(particle, createParticle(width, height));
        }

        const wobbleDistance = Math.sin(particle.wobble) * 18;
        const targetDistance = (particle.targetDist + wobbleDistance) * current.expansion;
        const noise = current.noise * (reduceMotion ? 0.2 : 1);
        const nextX = runtime.mouseX + Math.cos(particle.angle) * targetDistance + (Math.random() - 0.5) * noise;
        const nextY = runtime.mouseY + Math.sin(particle.angle) * targetDistance + (Math.random() - 0.5) * noise;
        particle.x += (nextX - particle.x) * 0.105;
        particle.y += (nextY - particle.y) * 0.105;

        const alphaBoost = activePresence ? 1.34 : 1;
        const alpha = Math.min(1, Math.abs(Math.sin(particle.life * Math.PI)) * (particle.isCore ? 0.86 : 0.46) * alphaBoost);
        const radiusBoost = current.mode === 'speaking' ? 1.24 : 1;
        const hue = runtime.baseHue + (particle.isCore ? 0 : Math.sin(particle.angle) * 28);
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 3.1 * radiusBoost);
        gradient.addColorStop(0, `hsla(${hue}, 100%, ${particle.lightness}%, ${alpha})`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, ${Math.max(24, particle.lightness - 24)}%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * radiusBoost, 0, Math.PI * 2);
        ctx.fill();
      });

      drawCore(now);
      ctx.globalCompositeOperation = 'source-over';
      animationFrame = requestAnimationFrame(draw);
    }

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={classNames('auren-energy-being', className)}
      data-mcp-component={AUREN_ENERGY_SOURCE}
      data-state={settings.mode}
      data-presence={presence}
      data-target={target}
      role="img"
      aria-label={label}
    >
      <canvas ref={canvasRef} />
      <span className="auren-energy-being__field" aria-hidden="true" />
      <span className="auren-energy-being__signal" aria-hidden="true" />
      <span className="auren-energy-being__tether" aria-hidden="true" />
      <span className="auren-energy-being__vessel" aria-hidden="true" />
      <span className="auren-energy-being__avatar-core" aria-hidden="true" />
    </div>
  );
}
