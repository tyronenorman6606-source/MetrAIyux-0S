const TRACK_KEY = "gray-skyes-track-names-v1";

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  }[char]));
}

function readTitleOverrides() {
  try {
    return JSON.parse(localStorage.getItem(TRACK_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeTitleOverrides(value) {
  localStorage.setItem(TRACK_KEY, JSON.stringify(value || {}));
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function applyTrackTitles(tracks) {
  const overrides = readTitleOverrides();
  return tracks.map((track) => ({
    ...track,
    displayTitle: overrides[track.id] || track.title
  }));
}

function setupCursor() {
  const glow = qs(".cursor-glow");
  if (!glow) return;
  window.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(max-width: 720px)").matches) return;
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });
}

function setupNav() {
  qsa("[data-scroll-target]").forEach((node) => {
    node.addEventListener("click", (event) => {
      const target = qs(node.getAttribute("data-scroll-target"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function playTrack(track) {
  const audio = qs("#mainAudio");
  const title = qs("#currentTrackTitle");
  const lane = qs("#currentTrackLane");
  const source = qs("#currentTrackSource");
  if (!audio || !track) return;
  audio.src = track.file;
  audio.load();
  const playPromise = audio.play();
  if (playPromise?.catch) playPromise.catch(() => {});
  if (title) title.textContent = track.displayTitle;
  if (lane) lane.textContent = track.lane;
  if (source) source.textContent = track.sourceFile;
  qsa(".track-button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.trackId === track.id));
  });
}

async function setupMusic() {
  const list = qs("#trackList");
  if (!list) return;
  const data = await loadJson("data/tracks.json");
  const tracks = applyTrackTitles(data.tracks || []);
  list.innerHTML = tracks.map((track, index) => `
    <button class="track-button" type="button" data-track-id="${escapeHtml(track.id)}" aria-pressed="false">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(track.displayTitle)}</strong>
      <small>${escapeHtml(track.lane)}</small>
    </button>
  `).join("");
  qsa(".track-button", list).forEach((button) => {
    button.addEventListener("click", () => {
      const track = tracks.find((item) => item.id === button.dataset.trackId);
      playTrack(track);
    });
  });
  playTrack(tracks[0]);
  window.addEventListener("storage", (event) => {
    if (event.key === TRACK_KEY) setupMusic();
  });
}

async function setupPosts() {
  const wrap = qs("#postGrid");
  if (!wrap) return;
  const data = await loadJson("data/posts.json");
  wrap.innerHTML = (data.posts || []).map((post) => `
    <a class="post-card" href="${escapeHtml(post.href)}">
      <img src="${escapeHtml(post.image)}" alt="">
      <p class="eyebrow">${escapeHtml(post.kicker)}</p>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.excerpt)}</p>
    </a>
  `).join("");
}

async function setupDashboard() {
  const table = qs("#trackEditorRows");
  if (!table) return;
  const data = await loadJson("data/tracks.json");
  const overrides = readTitleOverrides();
  table.innerHTML = (data.tracks || []).map((track, index) => `
    <tr>
      <td>${String(index + 1).padStart(2, "0")}</td>
      <td><input value="${escapeHtml(overrides[track.id] || track.title)}" data-track-id="${escapeHtml(track.id)}" aria-label="Edit ${escapeHtml(track.title)}"></td>
      <td>${escapeHtml(track.sourceFile)}</td>
      <td>${escapeHtml(track.lane)}</td>
    </tr>
  `).join("");

  const notice = qs("#dashboardNotice");
  qs("#saveTitles")?.addEventListener("click", () => {
    const next = {};
    qsa("input[data-track-id]", table).forEach((input) => {
      next[input.dataset.trackId] = input.value.trim();
    });
    writeTitleOverrides(next);
    if (notice) {
      notice.hidden = false;
      notice.textContent = "Saved. Open the hub in this browser and the public song wall will use these titles.";
    }
  });

  qs("#resetTitles")?.addEventListener("click", () => {
    writeTitleOverrides({});
    if (notice) {
      notice.hidden = false;
      notice.textContent = "Reset. The hub is back to the original dropped file titles.";
    }
    setupDashboard();
  });
}

function setupVideoPage() {
  const video = qs("#featureVideo");
  if (!video) return;
  qs("#unmuteVideo")?.addEventListener("click", () => {
    video.muted = false;
    video.volume = 0.8;
    video.play().catch(() => {});
  });
  qs("#muteVideo")?.addEventListener("click", () => {
    video.muted = true;
  });
}

async function init() {
  setupCursor();
  setupNav();
  setupVideoPage();
  await Promise.allSettled([setupMusic(), setupPosts(), setupDashboard()]);
}

init();

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
