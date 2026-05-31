const gsap = window.gsap || { registerPlugin() {}, utils: { toArray: (selector) => [...document.querySelectorAll(selector)] }, from() {} };
const ScrollTrigger = window.ScrollTrigger || { update() {} };
const Lenis = window.Lenis || class { constructor() {} raf() {} };
gsap.registerPlugin?.(ScrollTrigger);
window.__DENTAL_APP_STACK__ = { gsap: !!window.gsap, lenis: !!window.Lenis, scrollTrigger: !!window.ScrollTrigger, localVendor: true };
const APP = {
  slug: "arizona-biltmore-dentistry",
  name: "Arizona Biltmore Dentistry",
  phone: "(602) 957-8200",
  appUrl: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/client-apps/arizona-biltmore-dentistry/",
  valleyUrl: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/arizona-biltmore-dentistry-phoenix-85016-d406e26/"
};
const LOCAL_STATUS = "browser-local pending/static artifact";
const LOCAL_SOURCE = "localStorage";
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
const STORE = "dental-app:" + APP.slug + ":routes";
const PROOF = "dental-app:" + APP.slug + ":proof";
const esc = (value) => String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value.slice(0, 100)));
}

function localRow(data) {
  return {
    ...data,
    createdAt: new Date().toLocaleString(),
    telemetryStatus: data.telemetryStatus || LOCAL_STATUS,
    telemetrySource: data.telemetrySource || LOCAL_SOURCE,
    telemetryReceipt: data.telemetryReceipt || "none"
  };
}

function row(key, data) {
  const rows = read(key);
  rows.unshift(localRow(data));
  write(key, rows);
  render();
}

function render() {
  const queue = $("[data-queue]");
  if (!queue) return;
  const key = document.querySelector("[data-proof-form]") ? PROOF : STORE;
  const rows = read(key);
  const count = $("[data-count]");
  if (count) count.textContent = rows.length + " rows - " + LOCAL_STATUS;
  queue.innerHTML = rows.length
    ? rows.map((item) => '<div class="queue-item"><strong>' + esc(item.name || item.kind || "Route row") + '</strong><small>' + esc(item.kind || "") + ' · ' + esc(item.urgency || "") + ' · ' + esc(item.payment || "") + ' · ' + esc(item.createdAt) + '</small><small>Telemetry: ' + esc(item.telemetryStatus || LOCAL_STATUS) + ' · Source: ' + esc(item.telemetrySource || LOCAL_SOURCE) + '</small><small>' + esc(item.note || "No note") + '</small></div>').join("")
    : '<div class="queue-item"><strong>No rows yet.</strong><small>Rows created here are browser-local pending/static artifacts until a Worker, Relay, or Command Bridge receipt exists.</small></div>';
}

function playVideos() {
  $$("video[data-hero-video]").forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    video.play?.().catch(() => {});
  });
}

function initIntro() {
  const intro = $("[data-app-intro]");
  const button = $("[data-enter-intro]");
  if (!intro) return;
  const readyMs = Number(intro.dataset.readyMs || 1200);
  const introMs = Number(intro.dataset.introMs || 3600);
  setTimeout(() => {
    button.disabled = false;
    button.textContent = "Open App";
  }, readyMs);
  const done = () => {
    document.body.classList.remove("intro-active");
    document.body.classList.add("intro-complete");
    setTimeout(playVideos, 50);
  };
  button.addEventListener("click", done);
  setTimeout(done, introMs);
}

function bg() {
  const canvas = $(".living-field");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  let width = 0;
  let height = 0;
  let points = [];
  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    width = innerWidth;
    height = innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = Array.from({ length: Math.min(70, Math.max(28, Math.floor(width * height / 26000))) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.5,
      s: Math.random() * 0.4 + 0.1
    }));
  };
  const draw = (time) => {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "screen";
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x + Math.sin(time * 0.001 * point.s + index) * 28, point.y + Math.cos(time * 0.001 * point.s + index) * 20, point.r, 0, Math.PI * 2);
      ctx.fillStyle = index % 2 ? "rgba(84,214,199,.18)" : "rgba(244,201,93,.16)";
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  addEventListener("resize", resize, { passive: true });
  resize();
  requestAnimationFrame(draw);
}

function init() {
  initIntro();
  bg();
  playVideos();
  addEventListener("visibilitychange", playVideos);
  const lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 0.8, smoothWheel: true });
  function raf(time) {
    lenis.raf(time);
    ScrollTrigger.update();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  $("[data-menu-toggle]")?.addEventListener("click", () => $(".links")?.classList.toggle("open"));
  addEventListener("scroll", () => {
    const progress = $(".progressbar");
    if (progress) progress.style.width = (scrollY / Math.max(1, document.body.scrollHeight - innerHeight) * 100) + "%";
  }, { passive: true });
  gsap.utils.toArray(".service-card,.panel").forEach((element) => gsap.from(element, { opacity: 0, y: 24, duration: 0.6, scrollTrigger: { trigger: element, start: "top 88%" } }));
  $("[data-share-site]")?.addEventListener("click", async () => {
    const data = { title: APP.name, text: APP.name + " app", url: location.href };
    if (navigator.share) await navigator.share(data).catch(() => {});
    else await navigator.clipboard?.writeText(location.href);
  });
  $("[data-route-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    row(STORE, Object.fromEntries(new FormData(event.currentTarget)));
    event.currentTarget.reset();
  });
  $("[data-proof-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    row(PROOF, Object.fromEntries(new FormData(event.currentTarget)));
    event.currentTarget.reset();
  });
  $("[data-build-route]")?.addEventListener("click", () => {
    const need = $("[data-build-need]").value;
    const time = $("[data-build-time]").value;
    const pay = $("[data-build-pay]").value;
    $("[data-route-output]").innerHTML = "<strong>" + esc(need) + " · " + esc(time) + "</strong><p>Office handoff: capture callback, confirm " + esc(pay).toLowerCase() + ", route to official booking/call, and save a browser-local pending intake row.</p>";
    row(STORE, { name: "Route builder", kind: need, urgency: time, payment: pay, note: "Built from route builder" });
  });
  $$("[data-triage]").forEach((button) => button.addEventListener("click", () => {
    const selection = button.dataset.triage;
    $("[data-triage-output]").innerHTML = "<strong>" + esc(selection) + "</strong><p>Call " + APP.phone + " or official booking. This app does not diagnose; it routes urgent context.</p>";
    row(STORE, { name: "Urgent route", kind: selection, urgency: "Urgent", payment: "Unknown", note: "Triage selected" });
  }));
  render();
}

document.addEventListener("DOMContentLoaded", init);
