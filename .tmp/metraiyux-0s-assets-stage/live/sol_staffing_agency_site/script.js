window.SOLRuntime = window.SOLRuntime || (() => {
  const cfg = window.SOL_RUNTIME_CONFIG || {};
  const configured = Array.isArray(cfg.apiBases) ? cfg.apiBases : [];
  const bases = [
    ...configured,
    cfg.apiBase,
    "/.netlify/functions",
    "/api"
  ].filter(Boolean).map(base => String(base).replace(/\/+$/, ""));
  const uniqueBases = [...new Set(bases)];

  function functionName(path) {
    const raw = String(path || "");
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw
      .replace(/^\/+\.netlify\/functions\/?/, "")
      .replace(/^\/+api\/?/, "")
      .replace(/^\/+/, "");
  }

  function apiUrl(path, base = uniqueBases[0]) {
    const name = functionName(path);
    if (/^https?:\/\//i.test(name)) return name;
    const normalizedBase = String(base || "/.netlify/functions").replace(/\/+$/, "");
    return `${normalizedBase}/${name}`;
  }

  async function fetchJson(path, options = {}) {
    let lastError = null;
    for (const base of uniqueBases) {
      const url = apiUrl(path, base);
      try {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => ({}));
        if (res.ok) return { res, data, url };
        lastError = new Error(data.error || `HTTP ${res.status}`);
        lastError.status = res.status;
        lastError.data = data;
        if (![404, 502, 503, 504].includes(res.status)) throw lastError;
      } catch (error) {
        lastError = error;
        if (error.status && ![404, 502, 503, 504].includes(error.status)) throw error;
      }
    }
    throw lastError || new Error("No live staffing backend adapter responded.");
  }

  return { apiUrl, fetchJson, apiBases: uniqueBases };
})();

const glow = document.querySelector(".cursor-glow");
window.addEventListener("pointermove", event => {
  if (!glow) return;
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.className = "skyesol-living-field";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
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
  if (!canvas.getContext || reduceMotion) return;

  const ctx = canvas.getContext("2d");
  const palette = ["rgba(201,168,76,", "rgba(138,99,255,", "rgba(39,242,255,"];
  let width = 0;
  let height = 0;
  let particles = [];
  let frame = 0;
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
    const max = width < 760 ? 72 : 128;
    const count = Math.min(max, Math.max(58, Math.floor(width * height / 15500)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.4,
      a: Math.random() * 0.32 + 0.12,
      s: Math.random() * 0.34 + 0.08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(0.5, colorB);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * 0.006) + time * speed) * amp;
      const n2 = Math.cos((x * 0.011) - time * speed * 0.7) * amp * 0.46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    const t = now * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.035;
    pointer.y += (pointer.ty - pointer.y) * 0.035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "screen";
    drawWave(t, height * 0.28 + pointer.y * 12, "rgba(138,99,255,0)", "rgba(138,99,255,.10)", 36, 0.34);
    drawWave(t, height * 0.54 - pointer.y * 10, "rgba(39,242,255,0)", "rgba(39,242,255,.08)", 42, 0.24);
    drawWave(t, height * 0.82, "rgba(201,168,76,0)", "rgba(201,168,76,.07)", 28, 0.28);
    particles.forEach(p => {
      const x = p.x + Math.sin(t * p.s + p.phase) * 28 + pointer.x * 10;
      const y = p.y + Math.cos(t * p.s * 0.8 + p.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${p.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
    frame = requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", event => {
    pointer.tx = (event.clientX / Math.max(width, 1) - 0.5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - 0.5) * 2;
  }, { passive: true });
  window.addEventListener("pagehide", () => {
    if (frame) cancelAnimationFrame(frame);
  });
  resize();
  frame = requestAnimationFrame(animate);
})();

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => nav.classList.toggle("active"));
}

const reveals = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.12 });

reveals.forEach(el => observer.observe(el));

const backendFormSkip = new Set(["loginForm", "uploadForm", "brainLiveForm", "manualRecordForm"]);

document.querySelectorAll("form").forEach(form => {
  if (backendFormSkip.has(form.id)) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (location.protocol === "file:") {
      alert("Live backend wiring is ready. Deploy on Cloudflare Pages or Netlify to send this form into the staffing OS database.");
      return;
    }

    const button = form.querySelector("button[type='submit'], .btn.primary");
    const originalText = button ? button.textContent : "";
    if (button) {
      button.disabled = true;
      button.textContent = "Sending...";
    }

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      data.page_url = location.href;
      if (!data["form-name"] && form.name) data["form-name"] = form.name;

      const { res, data: payload } = await window.SOLRuntime.fetchJson("/.netlify/functions/staffing-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);

      form.reset();
      alert("Received. The staffing OS database has the record.");
    } catch (error) {
      alert(error.message || "The form could not be submitted. Please try again.");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });
});
