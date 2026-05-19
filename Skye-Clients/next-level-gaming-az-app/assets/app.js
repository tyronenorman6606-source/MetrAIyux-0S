import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import * as motion from "motion";
import { animate as framerAnimate, motion as framerMotionElement, useMotionValue, useSpring } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const requestKey = "nextLevelGaming.eventRequests";
const noteKey = "nextLevelGaming.workspaceNotes";
const previewCode = "NLG-7DAY";

const events = [
  {
    day: "Wednesday",
    time: "6:00 PM",
    title: "Digimon Tournament",
    fee: "$10",
    platform: "Bandai TCG+",
    note: "Pack-per-win and event-kit style prizing when available."
  },
  {
    day: "Wednesday",
    time: "7:00 PM",
    title: "One Piece Weekly",
    fee: "$10",
    platform: "Bandai TCG+",
    note: "Weekly One Piece tournament with store credit and kit prizing language."
  },
  {
    day: "Wednesday",
    time: "7:30 PM",
    title: "Dragon Ball Fusion World",
    fee: "$10",
    platform: "Bandai TCG+",
    note: "Beginner-friendly weekly event with participation pack language."
  },
  {
    day: "Thursday",
    time: "7:00 PM",
    title: "Union Arena Casual",
    fee: "$7-$10",
    platform: "Bandai TCG+",
    note: "Casual Union Arena night with older event-kit style prize support."
  },
  {
    day: "Friday",
    time: "6:30 PM",
    title: "Lorcana Tournament",
    fee: "$10",
    platform: "Shop check-in",
    note: "Store credit for top players and foil promo participation language."
  },
  {
    day: "Saturday",
    time: "1:00 PM",
    title: "Yu-Gi-Oh! Locals",
    fee: "Check shop",
    platform: "Shop check-in",
    note: "Local weekly format. Call the shop for current prizing and format."
  },
  {
    day: "Sunday",
    time: "1:00 PM",
    title: "Pokemon Tournament",
    fee: "Check shop",
    platform: "Shop check-in",
    note: "Weekly Pokemon play. Confirm current league or tournament details."
  },
  {
    day: "Sunday",
    time: "4:00 PM",
    title: "Union Arena Tournament",
    fee: "$10",
    platform: "Bandai TCG+",
    note: "Weekly Sunday Union Arena tournament."
  }
];

window.NextLevelGamingApp = {
  events,
  exportEventRequests: () => readList(requestKey),
  exportWorkspaceNotes: () => readList(noteKey),
  runtime: {
    framerMotion: false,
    gsap: true,
    lenis: false,
    livingBackground: false,
    motion: false,
    motionChrome: true,
    neonScrollbar: true
  }
};

function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeList(key, value) {
  localStorage.setItem(key, JSON.stringify(value.slice(0, 24)));
}

function minuteValue(time) {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3].toUpperCase();
  if (meridian === "PM" && hours < 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function dayIndex(day) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day);
}

function nextEvent() {
  const now = new Date();
  const today = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return events
    .map((event) => {
      const targetDay = dayIndex(event.day);
      let daysAway = (targetDay - today + 7) % 7;
      if (daysAway === 0 && minuteValue(event.time) < currentMinutes) daysAway = 7;
      return { ...event, daysAway };
    })
    .sort((a, b) => a.daysAway - b.daysAway || minuteValue(a.time) - minuteValue(b.time))[0];
}

function eventCard(event) {
  return `
    <article class="event-card" data-event-day="${event.day}">
      <span class="badge">${event.day} ${event.time}</span>
      <strong>${event.title}</strong>
      <p>${event.note}</p>
      <div class="event-meta">
        <span>${event.fee}</span>
        <span>${event.platform}</span>
      </div>
      <div class="action-row">
        <a class="btn green" href="/quote.html?game=${encodeURIComponent(event.title)}">Ask about this</a>
        <a class="btn dark" href="tel:6232487458">Call</a>
      </div>
    </article>
  `;
}

function renderSchedules(filter = "all") {
  $$("[data-schedule-board]").forEach((board) => {
    const limit = Number(board.dataset.limit || 0);
    const filtered = events.filter((event) => filter === "all" || event.day === filter);
    const list = limit ? filtered.slice(0, limit) : filtered;
    board.innerHTML = list.map(eventCard).join("");
  });
}

function mountFilters() {
  $$("[data-day-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.dayFilter || "all";
      $$("[data-day-filter]").forEach((node) => {
        node.classList.toggle("active", node.dataset.dayFilter === filter);
      });
      renderSchedules(filter);
    });
  });
}

function mountNextEvent() {
  const event = nextEvent();
  const title = $("[data-next-event-title]");
  const detail = $("[data-next-event-detail]");
  if (title) title.textContent = `${event.title} is next`;
  if (detail) detail.textContent = `${event.day} at ${event.time}. ${event.note}`;
}

function mountOpenStatus() {
  const status = $("[data-open-status]");
  if (!status) return;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const sunday = now.getDay() === 0;
  const open = sunday ? 12 * 60 : 12 * 60;
  const close = sunday ? 18 * 60 : 22 * 60;
  const isOpen = minutes >= open && minutes < close;
  status.textContent = isOpen ? "Shop hours active" : "Check before visiting";
}

function mountNavigation() {
  const toggle = $(".nav-toggle");
  const nav = $("#primary-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
  });
}

function mountSmoothRuntime() {
  if (reduceMotion) return;
  const lenis = new Lenis({
    lerp: 0.12,
    smoothWheel: true,
    wheelMultiplier: 0.85
  });
  window.NextLevelGamingApp.runtime.lenis = true;
  window.__nextLevelLenis = lenis;
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function mountMotionChrome() {
  gsap.to(".scroll-progress", {
    width: "100%",
    ease: "none",
    scrollTrigger: {
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.2
    }
  });

  $$("[data-reveal]").forEach((element) => {
    ScrollTrigger.create({
      trigger: element,
      start: "top 86%",
      onEnter: () => element.classList.add("is-visible")
    });
  });
}

function mountLibraryMotion() {
  if (reduceMotion) return;
  const consolePanel = $(".event-console") || $(".page-title");
  const primaryButton = $(".btn.primary");
  const motionNext = {
    animateSurface: motion.animate
  };
  try {
    if (consolePanel) {
      motionNext.animateSurface(consolePanel, {
        opacity: [0.92, 1],
        transform: ["translateY(10px)", "translateY(0px)"]
      }, {
        duration: 0.62,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)"
      });
      window.NextLevelGamingApp.runtime.motion = true;
    }
  } catch {
    window.NextLevelGamingApp.runtime.motion = false;
  }
  try {
    if (primaryButton) {
      framerAnimate(primaryButton, {
        scale: [1, 1.018, 1],
        boxShadow: [
          "0 0 0 rgba(57,255,136,0)",
          "0 0 28px rgba(57,255,136,0.28)",
          "0 0 0 rgba(57,255,136,0)"
        ]
      }, {
        duration: 0.9,
        ease: "easeOut"
      });
      window.NextLevelGamingApp.runtime.framerMotion = true;
    }
  } catch {
    window.NextLevelGamingApp.runtime.framerMotion = false;
  }
}

function FramerRuntimePulse() {
  const opacity = useMotionValue(0.58);
  const springOpacity = useSpring(opacity, { stiffness: 210, damping: 24 });
  useEffect(() => {
    opacity.set(1);
    const timer = window.setInterval(() => {
      opacity.set(opacity.get() > 0.8 ? 0.58 : 1);
    }, 1100);
    return () => window.clearInterval(timer);
  }, [opacity]);
  return React.createElement(framerMotionElement.div, {
    className: "framer-runtime-pulse",
    style: { opacity: springOpacity },
    "aria-hidden": "true"
  });
}

function mountFramerRuntimePulse() {
  if (reduceMotion) return;
  const mount = document.createElement("div");
  mount.className = "framer-runtime-mount";
  mount.setAttribute("aria-hidden", "true");
  document.body.appendChild(mount);
  try {
    createRoot(mount).render(React.createElement(FramerRuntimePulse));
    window.NextLevelGamingApp.runtime.framerMotion = true;
  } catch {
    mount.remove();
    window.NextLevelGamingApp.runtime.framerMotion = false;
  }
}

function mountCursorGlow() {
  if (reduceMotion || matchMedia("(pointer: coarse)").matches) return;
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

function mountLivingBackground() {
  const canvas = $("[data-living-background]");
  if (!canvas || reduceMotion) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const colors = ["rgba(57,255,136,", "rgba(88,216,255,", "rgba(210,73,255,", "rgba(246,211,95,"];

  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    width = innerWidth;
    height = innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(width < 760 ? 34 : 78, Math.max(30, Math.floor((width * height) / 23000)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.55,
      s: Math.random() * 0.28 + 0.08,
      a: Math.random() * 0.28 + 0.10,
      phase: Math.random() * Math.PI * 2,
      color: colors[index % colors.length]
    }));
  }

  function drawBand(time, y, color) {
    const gradient = context.createLinearGradient(0, y - 90, width, y + 90);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.45, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.beginPath();
    context.moveTo(0, height);
    for (let x = 0; x <= width; x += 22) {
      const wave = Math.sin(x * 0.006 + time * 0.34) * 30;
      const roll = Math.cos(x * 0.011 - time * 0.22) * 16;
      context.lineTo(x, y + wave + roll + pointer.y * 10);
    }
    context.lineTo(width, height);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
  }

  function animate(now) {
    const time = now * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.035;
    pointer.y += (pointer.ty - pointer.y) * 0.035;
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "screen";
    drawBand(time, height * 0.34, "rgba(57,255,136,0.05)");
    drawBand(time, height * 0.7, "rgba(210,73,255,0.045)");
    for (const particle of particles) {
      const x = particle.x + Math.sin(time * particle.s + particle.phase) * 30 + pointer.x * 12;
      const y = particle.y + Math.cos(time * particle.s + particle.phase) * 20 + pointer.y * 10;
      context.beginPath();
      context.arc(x, y, particle.r, 0, Math.PI * 2);
      context.fillStyle = `${particle.color}${particle.a})`;
      context.fill();
    }
    context.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(animate);
  }

  addEventListener("resize", resize, { passive: true });
  addEventListener("pointermove", (event) => {
    pointer.tx = (event.clientX / Math.max(width, 1) - 0.5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - 0.5) * 2;
  }, { passive: true });
  addEventListener("pagehide", () => cancelAnimationFrame(raf), { once: true });
  resize();
  window.NextLevelGamingApp.runtime.livingBackground = true;
  raf = requestAnimationFrame(animate);
}

function mountInstall() {
  const banner = $("[data-install-banner]");
  let deferredPrompt = null;
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    banner?.classList.add("visible");
  });
  $$("[data-install-app]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice.catch(() => null);
        deferredPrompt = null;
      } else {
        alert("Use your browser menu to install or save this app route.");
      }
    });
  });
  $("[data-dismiss-install]")?.addEventListener("click", () => banner?.classList.remove("visible"));
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}

function mountRequestForm() {
  const form = $("[data-event-request-form]");
  const result = $("[data-form-result]");
  const mail = $("[data-mailto-result]");
  if (!form) return;
  const params = new URLSearchParams(location.search);
  const game = params.get("game");
  if (game && form.elements.game) form.elements.game.value = game;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const item = { ...data, createdAt: new Date().toISOString(), source: location.href };
    const list = [item, ...readList(requestKey)];
    writeList(requestKey, list);
    const body = [
      `Organizer: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone || "Not provided"}`,
      `Game: ${data.game}`,
      `Type: ${data.requestType}`,
      `Date/window: ${data.dateWindow || "Open"}`,
      `Expected players: ${data.players || "Not provided"}`,
      `Prize/support: ${data.support || "Not provided"}`,
      "",
      data.details
    ].join("\n");
    if (mail) {
      mail.href = `mailto:nlgaming2023@gmail.com?subject=${encodeURIComponent(`Event request: ${data.game}`)}&body=${encodeURIComponent(body)}`;
      mail.classList.remove("is-hidden");
    }
    if (result) result.textContent = "Request saved locally. Open the email button to send it to the shop.";
    renderLedger();
    form.reset();
  });
}

function renderLedger() {
  const list = $("[data-ledger-list]");
  if (!list) return;
  const requests = readList(requestKey);
  if (!requests.length) {
    list.innerHTML = "<p>No local requests yet.</p>";
    return;
  }
  list.innerHTML = requests.slice(0, 5).map((item) => `
    <div class="table-row">
      <span>${new Date(item.createdAt).toLocaleDateString()}</span>
      <strong>${item.game} - ${item.requestType}</strong>
    </div>
  `).join("");
}

function mountPreviewGate() {
  const form = $("[data-gate-form]");
  const room = $("[data-preview-room]");
  const gate = $("[data-preview-gate]");
  const result = $("[data-gate-result]");
  if (!form || !room || !gate) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = String(new FormData(form).get("code") || "").trim().toUpperCase();
    if (code !== previewCode) {
      if (result) result.textContent = "Preview code did not match.";
      return;
    }
    gate.classList.add("is-hidden");
    room.classList.remove("is-hidden");
    room.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("is-visible"));
  });
}

function mountWorkspaceNotes() {
  const form = $("[data-workspace-note-form]");
  const result = $("[data-workspace-note-result]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = String(new FormData(form).get("note") || "").trim();
    if (!note) return;
    writeList(noteKey, [{ note, createdAt: new Date().toISOString() }, ...readList(noteKey)]);
    if (result) result.textContent = "Workspace note saved locally.";
    form.reset();
  });
}

renderSchedules();
mountFilters();
mountNextEvent();
mountOpenStatus();
mountNavigation();
mountSmoothRuntime();
mountMotionChrome();
mountLibraryMotion();
mountFramerRuntimePulse();
mountCursorGlow();
mountLivingBackground();
mountInstall();
mountRequestForm();
renderLedger();
mountPreviewGate();
mountWorkspaceNotes();

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
