const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

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
  const introDuration = reduceMotion ? 1800 : 7600;
  const exitDuration = reduceMotion ? 120 : 900;

  body.classList.add("intro-active");
  setAppLocked(true);
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

  return new Promise((resolve) => {
    const completeIntro = () => {
      if (completed) return;
      completed = true;
      intro.classList.add("is-exiting");
      body.classList.add("intro-releasing");

      window.setTimeout(() => {
        intro.setAttribute("hidden", "");
        body.classList.remove("intro-active", "intro-releasing");
        body.classList.add("intro-complete");
        setAppLocked(false);
        playAutoplayVideos();
        resolve();
      }, exitDuration);
    };

    timer = window.setTimeout(completeIntro, introDuration);
    enterButton?.addEventListener("click", () => {
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
  canvas.className = "industrial-living-field";
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
    <a href="scan.html">Scan</a>
    <a href="quote.html">Quote</a>
    <a href="tel:4806626551">Call</a>
  `;
  document.body.appendChild(consolePanel);
}

function prepareAppShell() {
  $$("main .card, main .hero-card, main details, main .service-card, main .panel, main .route-row, main .dock-tile, main .table").forEach((element) => {
    if (!element.hasAttribute("data-reveal")) element.setAttribute("data-reveal", "");
  });
  $$("main .btn, .floating-call .btn").forEach((element) => {
    if (!element.classList.contains("neon-magnetic")) element.classList.add("neon-magnetic");
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

    gsap.utils.toArray("[data-reveal]").forEach((element, index) => {
      gsap.fromTo(element, {
        y: 28,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        delay: Math.min(index * 0.035, 0.18),
        ease: "power3.out",
        scrollTrigger: {
          trigger: element,
          start: "top 84%"
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
    const payload = encodeFormData(form);
    const submitButton = form.querySelector("button[type='submit']");
    submitButton?.setAttribute("disabled", "true");
    if (result) result.textContent = "Sending the request into the Empire Pallets app lane...";

    try {
      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload
      });
      if (!response.ok) throw new Error(`Form returned ${response.status}`);
      if (result) result.textContent = "Request received. Empire Pallets can review the details and respond with the right next step.";
      form.reset();
    } catch {
      const previewRecords = JSON.parse(localStorage.getItem("empirePreviewRequests") || "[]");
      previewRecords.push(Object.fromEntries(new URLSearchParams(payload).entries()));
      localStorage.setItem("empirePreviewRequests", JSON.stringify(previewRecords.slice(-10)));
      if (result) result.textContent = "Preview saved this request locally. The deployed app lane sends it directly to Empire Pallets.";
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

if ("serviceWorker" in navigator) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
