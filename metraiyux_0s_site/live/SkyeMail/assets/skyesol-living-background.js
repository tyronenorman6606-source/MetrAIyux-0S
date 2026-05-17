export function mountSkyeSolLivingBackground({
  canvasSelector = ".skyesol-living-field",
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58,
} = {}) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext("2d");
  const palette = [
    "rgba(201,168,76,",
    "rgba(138,99,255,",
    "rgba(39,242,255,",
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length],
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function drawCurrentLines(time) {
    ctx.save();
    ctx.globalAlpha = .7;
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i += 1) {
      const travel = (time * 82 + i * 260) % (width + 520);
      const x = travel - 260;
      const gradient = ctx.createLinearGradient(x, 0, x + height * .42, height);
      gradient.addColorStop(0, "rgba(39,242,255,0)");
      gradient.addColorStop(.42, i % 2 ? "rgba(201,168,76,.18)" : "rgba(39,242,255,.16)");
      gradient.addColorStop(1, "rgba(138,99,255,0)");
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height * .42, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function animate(now) {
    if (document.body.classList.contains("motion-paused")) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "screen";
    drawWave(t, height * .28 + pointer.y * 12, "rgba(138,99,255,0)", "rgba(138,99,255,.10)", 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, "rgba(39,242,255,0)", "rgba(39,242,255,.08)", 42, .24);
    drawWave(t, height * .82, "rgba(201,168,76,0)", "rgba(201,168,76,.07)", 28, .28);
    drawCurrentLines(t);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", onPointerMove);
  };
}

function ensureLivingBackgroundNodes() {
  document.body.classList.add("skyesol-living-page");
  if (!document.querySelector(".skyesol-living-field")) {
    const canvas = document.createElement("canvas");
    canvas.className = "skyesol-living-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
  }
  if (!document.querySelector(".skyesol-grain")) {
    const grain = document.createElement("div");
    grain.className = "skyesol-grain";
    grain.setAttribute("aria-hidden", "true");
    document.body.appendChild(grain);
  }
  if (!document.querySelector(".skyesol-scanline")) {
    const scanline = document.createElement("div");
    scanline.className = "skyesol-scanline";
    scanline.setAttribute("aria-hidden", "true");
    document.body.appendChild(scanline);
  }
}

function ensureStylesheet() {
  if (document.querySelector('link[href$="skyesol-living-background.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/assets/skyesol-living-background.css";
  document.head.appendChild(link);
}

function boot() {
  ensureStylesheet();
  ensureLivingBackgroundNodes();
  mountSkyeSolLivingBackground();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
