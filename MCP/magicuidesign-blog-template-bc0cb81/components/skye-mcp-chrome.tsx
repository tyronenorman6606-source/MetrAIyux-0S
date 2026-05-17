"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  phase: number;
  color: string;
};

export function SkyeMcpChrome({
  label = "24 live surfaces / 36 checks",
}: {
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!canvas || !context) return;

    const updateScrollProgress = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      document.documentElement.style.setProperty(
        "--skye-scroll-progress",
        String(Math.min(1, Math.max(0, progress))),
      );
    };

    if (reduceMotion.matches) {
      updateScrollProgress();
      window.addEventListener("scroll", updateScrollProgress, {
        passive: true,
      });
      return () => window.removeEventListener("scroll", updateScrollProgress);
    }

    const palette = [
      "rgba(201,168,76,",
      "rgba(39,242,255,",
      "rgba(138,99,255,",
    ];
    let width = 0;
    let height = 0;
    let frame = 0;
    let particles: Particle[] = [];
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.min(
        96,
        Math.max(42, Math.floor((width * height) / 18000)),
      );
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.45,
        alpha: Math.random() * 0.28 + 0.1,
        speed: Math.random() * 0.32 + 0.08,
        phase: Math.random() * Math.PI * 2,
        color: palette[index % palette.length],
      }));
    };

    const drawWave = (
      time: number,
      yOffset: number,
      color: string,
      amplitude: number,
      speed: number,
    ) => {
      const gradient = context.createLinearGradient(
        0,
        yOffset - amplitude * 2,
        width,
        yOffset + amplitude * 2,
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      context.beginPath();
      context.moveTo(0, height);
      for (let x = 0; x <= width; x += 18) {
        const wave =
          Math.sin(x * 0.006 + time * speed) * amplitude +
          Math.cos(x * 0.011 - time * speed * 0.7) * amplitude * 0.44;
        context.lineTo(x, yOffset + wave);
      }
      context.lineTo(width, height);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();
    };

    const animate = (now: number) => {
      const time = now * 0.001;
      pointer.x += (pointer.targetX - pointer.x) * 0.035;
      pointer.y += (pointer.targetY - pointer.y) * 0.035;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";
      drawWave(time, height * 0.28 + pointer.y * 12, "rgba(138,99,255,.1)", 36, 0.34);
      drawWave(time, height * 0.56 - pointer.y * 10, "rgba(39,242,255,.08)", 42, 0.24);
      drawWave(time, height * 0.82, "rgba(201,168,76,.07)", 28, 0.28);

      particles.forEach((particle) => {
        const x =
          particle.x + Math.sin(time * particle.speed + particle.phase) * 26;
        const y =
          particle.y + Math.cos(time * particle.speed * 0.8 + particle.phase) * 18;
        context.beginPath();
        context.arc(x + pointer.x * 10, y + pointer.y * 8, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `${particle.color}${particle.alpha})`;
        context.fill();
      });

      context.globalCompositeOperation = "source-over";
      updateScrollProgress();
      frame = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.targetX = (event.clientX / Math.max(width, 1) - 0.5) * 2;
      pointer.targetY = (event.clientY / Math.max(height, 1) - 0.5) * 2;
    };

    resize();
    updateScrollProgress();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <>
      <div
        className="skye-motion-chrome neon-motion-chrome"
        data-motion-chrome
        aria-hidden="true"
      >
        <div className="skye-motion-chrome__progress" />
        <canvas ref={canvasRef} className="skyesol-living-field" />
        <div className="skyesol-grain" />
        <div className="skyesol-scanline" />
      </div>
      <div className="skye-motion-chrome__label">{label}</div>
    </>
  );
}
