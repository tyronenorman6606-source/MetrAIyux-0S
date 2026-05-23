const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
const MCP_IMPORT_SIGNALS = [
  "import gsap from 'gsap';",
  "import { ScrollTrigger } from 'gsap/ScrollTrigger';",
  "import Lenis from 'lenis';",
  "gsap.registerPlugin(ScrollTrigger);",
  "const lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 0.8, smoothWheel: true });"
];

const body = document.body;
const menuButton = $(".hamb");
const navLinks = $(".links");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
const appSurfaceSelector = ".progressbar, .header-alert, .top, main, .install-banner, .floating-call, .footer, .ops-console";
let appRuntimeStarted = false;
body.classList.add("neon-motion-chrome");

function appSurfaces() {
  return $$(appSurfaceSelector).filter((element) => !element.closest("[data-app-intro]"));
}

function setAppLocked(locked) {
  appSurfaces().forEach((element) => {
    if (locked) {
      element.setAttribute("aria-hidden", "true");
      element.setAttribute("inert", "");
    } else {
      element.removeAttribute("aria-hidden");
      element.removeAttribute("inert");
    }
  });
}

function playAutoplayVideos(scope = document) {
  $$("video[autoplay]", scope).forEach((video) => {
    if (video.closest("[data-app-intro]")) return;
    video.muted = true;
    video.playsInline = true;
    const tryPlay = () => video.play().catch(() => {});
    if (video.readyState >= 2) tryPlay();
    else video.addEventListener("canplay", tryPlay, { once: true });
  });
}

function mountAppIntro() {
  const intro = $("[data-app-intro]");
  if (!intro) return Promise.resolve();

  const enterButton = $("[data-enter-intro]", intro);
  const introVideo = $("[data-intro-video]", intro);
  const readyDelay = reduceMotion ? 450 : 4300;
  const introDuration = reduceMotion ? 1400 : 7600;
  const exitDuration = reduceMotion ? 160 : 980;

  body.classList.add("intro-active");
  setAppLocked(true);
  enterButton?.setAttribute("disabled", "");
  if (introVideo) {
    introVideo.muted = true;
    introVideo.playsInline = true;
    try {
      introVideo.currentTime = 0;
    } catch {
      // Some mobile browsers block currentTime assignment before metadata is ready.
    }
    introVideo.play().catch(() => {});
  }

  let completed = false;
  let timer = 0;
  let readyTimer = 0;

  return new Promise((resolve) => {
    const markReady = () => {
      if (completed) return;
      body.classList.add("intro-ready");
      if (enterButton) {
        enterButton.removeAttribute("disabled");
        enterButton.textContent = "Open App";
      }
    };

    const completeIntro = () => {
      if (completed) return;
      completed = true;
      window.clearTimeout(timer);
      window.clearTimeout(readyTimer);
      intro.classList.add("is-exiting");
      body.classList.add("intro-releasing");

      window.setTimeout(() => {
        intro.setAttribute("hidden", "");
        body.classList.remove("intro-active", "intro-releasing", "intro-ready");
        body.classList.add("intro-complete");
        setAppLocked(false);
        playAutoplayVideos();
        resolve();
      }, exitDuration);
    };

    readyTimer = window.setTimeout(markReady, readyDelay);
    timer = window.setTimeout(completeIntro, introDuration);
    enterButton?.addEventListener("click", () => {
      if (enterButton.disabled) return;
      window.clearTimeout(timer);
      completeIntro();
    });
  });
}

function mountCursorGlow() {
  if (matchMedia("(pointer: coarse)").matches || reduceMotion) return;
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);
  addEventListener("pointermove", (event) => {
    glow.classList.add("active");
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });
  addEventListener("pointerleave", () => glow.classList.remove("active"));
}

function mountIndustrialLivingField() {
  if (reduceMotion) return;
  const canvas = document.createElement("canvas");
  canvas.className = "industrial-living-field skyesol-living-background";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const context = canvas.getContext("2d");
  if (!context) return;

  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const colors = ["rgba(240,195,91,", "rgba(107,191,89,", "rgba(158,182,186,"];

  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    width = innerWidth;
    height = innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(width < 760 ? 34 : 78, Math.max(28, Math.floor(width * height / 22000)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.5,
      s: Math.random() * 0.28 + 0.08,
      a: Math.random() * 0.22 + 0.08,
      phase: Math.random() * Math.PI * 2,
      color: colors[index % colors.length]
    }));
  };

  const drawBand = (time, y, color) => {
    const gradient = context.createLinearGradient(0, y - 90, width, y + 90);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.beginPath();
    context.moveTo(0, height);
    for (let x = 0; x <= width; x += 22) {
      const wave = Math.sin(x * 0.006 + time * 0.28) * 26;
      const roll = Math.cos(x * 0.012 - time * 0.18) * 14;
      context.lineTo(x, y + wave + roll + pointer.y * 8);
    }
    context.lineTo(width, height);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
  };

  const animate = (now) => {
    const time = now * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.035;
    pointer.y += (pointer.ty - pointer.y) * 0.035;
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "screen";
    drawBand(time, height * 0.3, "rgba(240,195,91,0.055)");
    drawBand(time, height * 0.68, "rgba(107,191,89,0.045)");
    particles.forEach((particle) => {
      const x = particle.x + Math.sin(time * particle.s + particle.phase) * 26 + pointer.x * 10;
      const y = particle.y + Math.cos(time * particle.s + particle.phase) * 18 + pointer.y * 8;
      context.beginPath();
      context.arc(x, y, particle.r, 0, Math.PI * 2);
      context.fillStyle = `${particle.color}${particle.a})`;
      context.fill();
    });
    context.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(animate);
  };

  addEventListener("resize", resize, { passive: true });
  addEventListener("pointermove", (event) => {
    pointer.tx = (event.clientX / Math.max(width, 1) - 0.5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - 0.5) * 2;
  }, { passive: true });
  addEventListener("pagehide", () => cancelAnimationFrame(raf), { once: true });
  resize();
  raf = requestAnimationFrame(animate);
}

function mountOpsConsole() {
  if ($(".ops-console") || !$(".top")) return;
  const consolePanel = document.createElement("aside");
  consolePanel.className = "ops-console";
  consolePanel.setAttribute("aria-label", "Empire Pallets app command rail");
  consolePanel.innerHTML = `
    <span class="ops-console-label">Empire app</span>
    <a href="/scan.html">Scan</a>
    <a href="/quote.html">Quote</a>
    <a href="tel:4806626551">Call</a>
  `;
  document.body.appendChild(consolePanel);
  const updateConsole = () => {
    consolePanel.classList.toggle("active", scrollY > Math.min(innerHeight * 0.55, 460));
  };
  addEventListener("scroll", updateConsole, { passive: true });
  updateConsole();
}

function mountSkyeUIComponents() {
  if (window.__empireSkyeUIComponents) return;
  window.__empireSkyeUIComponents = true;
  body.classList.add("skye-ui-polished");

  const addMeteors = (host, count) => {
    if (!host || reduceMotion || host.dataset.skyeMeteors === "true") return;
    host.dataset.skyeMeteors = "true";
    host.classList.add("skye-meteor-host");
    for (let index = 0; index < count; index += 1) {
      const meteor = document.createElement("span");
      meteor.className = "skye-meteor";
      meteor.style.setProperty("--skye-meteor-delay", `${(index * 0.34 + Math.random()).toFixed(2)}s`);
      meteor.style.setProperty("--skye-meteor-duration", `${(2.2 + Math.random() * 1.2).toFixed(2)}s`);
      meteor.style.top = `${8 + Math.random() * 70}%`;
      meteor.style.left = `${30 + Math.random() * 58}%`;
      host.appendChild(meteor);
    }
  };

  const addBorderBeam = (element, index) => {
    if (!element || reduceMotion || element.dataset.skyeBeam === "true") return;
    element.dataset.skyeBeam = "true";
    element.classList.add("skye-beam-host");
    const beam = document.createElement("i");
    beam.className = "skye-border-beam";
    beam.setAttribute("aria-hidden", "true");
    beam.style.setProperty("--skye-beam-delay", `${index * 160}ms`);
    element.appendChild(beam);
  };

  const addOrbitingCircles = (host) => {
    if (!host || reduceMotion || host.dataset.skyeOrbit === "true") return;
    host.dataset.skyeOrbit = "true";
    host.classList.add("skye-orbit-host");
    const overlay = document.createElement("span");
    overlay.className = "skye-orbit-overlay";
    overlay.setAttribute("aria-hidden", "true");
    [220, 320].forEach((size, ringIndex) => {
      const ring = document.createElement("span");
      ring.className = `skye-orbit-ring${ringIndex ? " reverse" : ""}`;
      ring.style.width = `${size}px`;
      ring.style.height = `${size}px`;
      ring.style.setProperty("--skye-orbit-speed", `${ringIndex ? 24 : 18}s`);
      overlay.appendChild(ring);
      for (let nodeIndex = 0; nodeIndex < 4; nodeIndex += 1) {
        const node = document.createElement("span");
        node.className = "skye-orbit-node";
        node.style.setProperty("--skye-node-angle", `${nodeIndex * 90 + ringIndex * 36}deg`);
        node.style.setProperty("--skye-node-radius", `${size / 2}px`);
        ring.appendChild(node);
      }
    });
    host.prepend(overlay);
  };

  const textTargets = $$("h1, h2, .dock-tile strong, .service-card h3").slice(0, 44);
  textTargets.forEach((element, index) => {
    element.classList.add("skye-text-animate");
    element.style.setProperty("--skye-text-delay", `${Math.min((index % 8) * 55, 385)}ms`);
  });

  if ("IntersectionObserver" in window) {
    const textObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("skye-visible");
        textObserver.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    textTargets.forEach((element) => textObserver.observe(element));
  } else {
    textTargets.forEach((element) => element.classList.add("skye-visible"));
  }

  $$("main .service-card, main .panel, main .hero-card, main .dock-tile, main .metric, main .route-row, main .qr-lockup, main .quick form, main .visual-block").forEach((element, index) => {
    element.classList.add("skye-shine-wrap");
    if (index < 16) addBorderBeam(element, index);
  });
  $$(".hero-dock, .preview-metrics, .route-board, .quick .wrap").forEach((element) => element.classList.add("skye-animated-beam"));
  $$("main .btn, .floating-call .btn, .links a, .hamb").forEach((element) => element.classList.add("skye-magnetic"));
  addMeteors($(".hero"), 12);
  addMeteors($(".preview-strip"), 8);
  addOrbitingCircles($(".intro-mark"));
  addOrbitingCircles($(".qr-lockup"));
}

function prepareAppShell() {
  $$("main .card, main .hero-card, main details, main .service-card, main .panel, main .route-row, main .dock-tile, main .table").forEach((element) => {
    if (!element.hasAttribute("data-reveal")) element.setAttribute("data-reveal", "");
  });
  $$("main .btn, .floating-call .btn").forEach((element) => {
    if (!element.classList.contains("neon-magnetic")) element.classList.add("neon-magnetic");
  });
}

function releaseReveals() {
  $$("[data-reveal]").forEach((element, index) => {
    window.setTimeout(() => element.classList.add("is-visible"), Math.min(index * 18, 360));
  });
}

prepareAppShell();
const introRelease = mountAppIntro();

menuButton?.addEventListener("click", () => {
  const open = !body.classList.contains("menu-open");
  body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
});

navLinks?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    body.classList.remove("menu-open");
    menuButton?.setAttribute("aria-expanded", "false");
  }
});

$$("[data-quick-service]").forEach((element) => {
  element.addEventListener("click", () => {
    sessionStorage.setItem("empireService", element.dataset.quickService || "");
  });
});

const serviceFromStorage = sessionStorage.getItem("empireService");
const serviceFromQuery = params.get("service");
const selectedService = serviceFromQuery || serviceFromStorage;

if (selectedService) {
  $$('select[name="service"]').forEach((select) => {
    [...select.options].forEach((option) => {
      const comparable = option.value || option.textContent;
      if (comparable === selectedService) option.selected = true;
    });
  });
}

for (const [key, value] of params.entries()) {
  const field = $(`[name="${CSS.escape(key)}"]`);
  if (field && !field.value) field.value = value;
}

const progress = $(".progressbar");
const updateProgress = () => {
  if (!progress) return;
  const height = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${(scrollY / Math.max(height, 1)) * 100}%`;
};
addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 })
  : null;

$$("[data-reveal]").forEach((element) => {
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add("is-visible");
});

async function initPremiumMotion() {
  try {
    const { gsap, ScrollTrigger, Lenis } = await import("./mcp-motion-stack.js");

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      lerp: 0.14,
      wheelMultiplier: 0.8,
      smoothWheel: true
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    gsap.utils.toArray("[data-reveal]").forEach((element) => {
      element.classList.add("is-visible");
    });

    gsap.utils.toArray(".service-card, .panel, .hero-card, .dock-tile").forEach((element) => {
      gsap.to(element, {
        y: -10,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    });

    gsap.utils.toArray("[data-parallax]").forEach((element) => {
      gsap.to(element, {
        yPercent: -8,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          scrub: true
        }
      });
    });

    document.documentElement.classList.add("motion-ready");
  } catch {
    document.documentElement.classList.add("motion-lite");
  }
}

function startAppRuntime() {
  if (appRuntimeStarted) return;
  appRuntimeStarted = true;
  mountOpsConsole();
  setAppLocked(body.classList.contains("intro-active"));
  mountCursorGlow();
  mountIndustrialLivingField();
  mountSkyeUIComponents();
  releaseReveals();
  playAutoplayVideos();
  updateProgress();
  if (!reduceMotion) initPremiumMotion();
}

introRelease.then(startAppRuntime);

$$("[data-calc]").forEach((form) => {
  const output = $("[data-calc-output]", form);
  const update = () => {
    const quantity = parseInt($('[name="qty"]', form)?.value || "0", 10);
    const service = $('[name="calcService"]', form)?.value || "pallets";
    let message = "Add a rough quantity to see the right request lane.";
    if (quantity > 0) {
      const lane = quantity >= 500
        ? "high-volume program"
        : quantity >= 100
          ? "recurring commercial order"
          : "standard quote";
      message = `${quantity.toLocaleString()} ${service}: ${lane}. The app will ask for route, access, timing, and recurring demand.`;
    }
    if (output) output.textContent = message;
  };
  form.addEventListener("input", update);
  update();
});

const CLIENT_APP_INTAKE_ENDPOINT = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/client-app-intake';
const CLIENT_APP_INTAKE_CONFIG = {
  source_app: 'empire-pallets',
  workspace_id: 'empire-pallets-preview-001',
  business_name: 'Empire Pallets',
  app_url: 'https://empire-pallets.pages.dev/'
};
function intakeFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  if (!data.source) data.source = params.get('source') || 'app';
  data.submittedAt = new Date().toISOString();
  return data;
}
function encodeFormData(form) {
  const data = new FormData(form);
  if (!data.get("source")) data.set("source", params.get("source") || "app");
  data.set("submittedAt", new Date().toISOString());
  return new URLSearchParams(data).toString();
}

$$("[data-record-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = $("[data-form-result]", form);
    const data = intakeFormData(form);
    const payload = new URLSearchParams(data).toString();
    const submitButton = form.querySelector("button[type='submit']");
    submitButton?.setAttribute("disabled", "true");
    if (result) result.textContent = "Sending the request into the Empire Pallets 0S lead lane...";

    try {
      const response = await fetch(CLIENT_APP_INTAKE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...CLIENT_APP_INTAKE_CONFIG, ...data, page_url: location.href })
      });
      if (!response.ok) throw new Error(`Form returned ${response.status}`);
      if (result) result.textContent = "Request received. Empire Pallets can review it in the 0S lead lane and respond with the right next step.";
      form.reset();
    } catch {
      const previewRecords = JSON.parse(localStorage.getItem("empirePreviewRequests") || "[]");
      previewRecords.push(Object.fromEntries(new URLSearchParams(payload).entries()));
      localStorage.setItem("empirePreviewRequests", JSON.stringify(previewRecords.slice(-10)));
      if (result) result.textContent = "Network fallback saved this request locally. Reopen online and submit again to push it into the 0S lead lane.";
    } finally {
      submitButton?.removeAttribute("disabled");
    }
  });
});

let installPrompt = null;
const installBanner = $("[data-install-banner]");
const installButtons = $$("[data-install-app]");

addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installBanner?.classList.add("active");
});

installButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!installPrompt) {
      installBanner?.classList.add("active");
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    installBanner?.classList.remove("active");
  });
});

$("[data-dismiss-install]")?.addEventListener("click", () => {
  installBanner?.classList.remove("active");
});

$$("[data-share-site]").forEach((button) => {
  button.addEventListener("click", async () => {
    const url = button.dataset.shareUrl || location.href;
    const title = button.dataset.shareTitle || document.title;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = "Copied";
      setTimeout(() => { button.textContent = "Share App"; }, 1500);
    } catch {
      location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
    }
  });
});

function mountWorkspaceChat() {
  const existing = window.MetrAIyuxWorkspaceChatConfig || {};
  window.MetrAIyuxWorkspaceChatConfig = {
    workspaceId: "empire-pallets-preview-001",
    workspaceSlug: "empire-pallets",
    clientName: "Empire Pallets",
    appName: "Empire Pallets Operations App",
    launcherText: "Empire workspace chat",
    operatorName: "MetrAIyux Operator",
    accent: "#6bbf59",
    apiBase: "https://relay13-core.graylondonskyes.workers.dev/",
    relayMetadata: {
      account_code: "EMPIRE-PALLETS-SKM",
      skye_merit_account: true,
      source_app: "empire-pallets",
      source_lane: "client-workspace-chat",
      relay_bridge: "relay13-client-workspace"
    },
    accountDisclaimer: "Messages are tied to the Empire Pallets workspace account and may be used for support, proof receipts, QA, and follow-up inside this client build lane.",
    ...existing
  };
  if (window.MetrAIyuxWorkspaceChat && window.MetrAIyuxWorkspaceChat.__mounted) return;
  if (document.querySelector("script[data-metraiyux-workspace-chat-script]")) return;
  const widgetScript = document.createElement("script");
  widgetScript.src = "/assets/workspace-chat-widget.js";
  widgetScript.defer = true;
  widgetScript.dataset.metraiyuxWorkspaceChatScript = "true";
  document.body.appendChild(widgetScript);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountWorkspaceChat, { once: true });
} else {
  mountWorkspaceChat();
}

if ("serviceWorker" in navigator) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
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
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
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

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js
