const TRACK_KEY = "gray-skyes-track-names-v2";
const VIDEO_KEY = "gray-skyes-active-video-v2";

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function readTitleOverrides() {
  try {
    return JSON.parse(localStorage.getItem(TRACK_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeTitleOverrides(next) {
  localStorage.setItem(TRACK_KEY, JSON.stringify(next || {}));
}

function withDisplayTitles(tracks) {
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
    if (window.matchMedia("(pointer: coarse)").matches) return;
    glow.style.opacity = "1";
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });
}

function setupNav() {
  qsa("[data-scroll-target]").forEach((node) => {
    node.addEventListener("click", (event) => {
      const selector = node.getAttribute("data-scroll-target");
      const target = selector ? qs(selector) : null;
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  qsa("[data-open-dashboard]").forEach((node) => {
    node.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  });
}

let currentTrackId = "";

function paintTrackButtons() {
  qsa(".track-button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.trackId === currentTrackId));
  });
}

function setCurrentTrack(track, shouldPlay = false) {
  const audio = qs("#mainAudio");
  const title = qs("#currentTrackTitle");
  const lane = qs("#currentTrackLane");
  const source = qs("#currentTrackSource");
  if (!track || !audio) return;

  currentTrackId = track.id;
  audio.src = track.file;
  if (title) title.textContent = track.displayTitle;
  if (lane) lane.textContent = track.lane;
  if (source) source.textContent = track.sourceFile;
  paintTrackButtons();

  if (shouldPlay) {
    audio.play().catch(() => {});
  }
}

async function setupMusic() {
  const list = qs("#trackList");
  if (!list) return;
  const data = await loadJson("data/tracks.json");
  const tracks = withDisplayTitles(data.tracks || []);

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
      setCurrentTrack(track, true);
    });
  });

  setCurrentTrack(tracks[0], false);
}

function openModal({ title, lane, file, kind, poster }) {
  const modal = qs("#mediaModal");
  const mount = qs("#modalMount");
  const modalTitle = qs("#modalTitle");
  const modalLane = qs("#modalLane");
  const openLink = qs("#modalOpenLink");
  if (!modal || !mount) return;

  qsa("video", modal).forEach((video) => video.pause());
  mount.innerHTML = kind === "video"
    ? `<video class="modal-media" src="${escapeHtml(file)}" poster="${escapeHtml(poster || "")}" controls autoplay muted loop playsinline></video>`
    : `<img class="modal-media" src="${escapeHtml(file)}" alt="">`;
  if (modalTitle) modalTitle.textContent = title;
  if (modalLane) modalLane.textContent = lane || "selected room";
  if (openLink) openLink.href = file;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = qs("#mediaModal");
  if (!modal) return;
  qsa("video", modal).forEach((video) => video.pause());
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function setupModal() {
  qs("#modalClose")?.addEventListener("click", closeModal);
  qs("#mediaModal")?.addEventListener("click", (event) => {
    if (event.target.id === "mediaModal") closeModal();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function videoTile(video, index) {
  return `
    <article class="video-tile">
      <video src="${escapeHtml(video.file)}" poster="${escapeHtml(video.poster)}" muted loop playsinline preload="none"></video>
      <div class="video-tile-body">
        <p class="eyebrow">${escapeHtml(video.lane)}</p>
        <h3>${escapeHtml(video.title)}</h3>
        <p>${String(index + 1).padStart(2, "0")} / ${escapeHtml(video.sourceFile)}</p>
        <div class="button-row">
          <a class="button primary" href="video-rooms.html?video=${encodeURIComponent(video.id)}">Load room</a>
          <a class="button" href="${escapeHtml(video.file)}" target="_blank" rel="noreferrer">Open file</a>
        </div>
      </div>
    </article>
  `;
}

let videoCatalog = [];
let heroStageVideos = [];
let heroStageIndex = 0;
let videoOrbitRotation = 0;

async function setupVideoGrid() {
  const grid = qs("#videoGrid");
  if (!grid && !qs("#roomVideo")) return;
  const data = await loadJson("data/videos.json");
  videoCatalog = data.videos || [];

  if (grid) {
    grid.innerHTML = videoCatalog.map(videoTile).join("");
    qsa(".video-tile", grid).forEach((tile) => {
      const video = qs("video", tile);
      tile.addEventListener("mouseenter", () => video?.play().catch(() => {}));
      tile.addEventListener("mouseleave", () => {
        if (!video) return;
        video.pause();
        video.currentTime = 0;
      });
    });
  }

  qsa("[data-video-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const video = videoCatalog.find((item) => item.id === button.dataset.videoId);
      if (!video) return;
      localStorage.setItem(VIDEO_KEY, video.id);
      openModal({
        title: video.title,
        lane: video.lane,
        file: video.file,
        kind: "video",
        poster: video.poster
      });
    });
  });
}

function setVideoOrbitRotation(world, value) {
  videoOrbitRotation = value;
  world?.style.setProperty("--video-orbit-z", `${videoOrbitRotation}deg`);
  qsa(".video-float-card", world || document).forEach((card) => {
    card.style.setProperty("--manual-angle", `${videoOrbitRotation}deg`);
  });
}

function paintHeroStageActive() {
  qsa(".video-float-card").forEach((card) => {
    card.classList.toggle("is-active", Number(card.dataset.videoIndex) === heroStageIndex);
  });
}

function setHeroStageVideo(index, shouldPlay = true) {
  if (!heroStageVideos.length) return;
  heroStageIndex = (index + heroStageVideos.length) % heroStageVideos.length;
  const video = heroStageVideos[heroStageIndex];
  const stage = qs("#heroStageVideo");
  if (stage) {
    stage.src = video.file;
    stage.poster = video.poster || "";
    stage.muted = true;
    if (shouldPlay) stage.play().catch(() => {});
  }
  const lane = qs("#heroStageLane");
  const title = qs("#heroStageTitle");
  const source = qs("#heroStageSource");
  if (lane) lane.textContent = video.lane;
  if (title) title.textContent = video.title;
  if (source) source.textContent = video.sourceFile;
  localStorage.setItem(VIDEO_KEY, video.id);
  paintHeroStageActive();
}

async function setupHeroVideoStage() {
  const world = qs("#floatingVideoWorld");
  const stage = qs(".gray-video-stage");
  if (!world || !stage) return;
  const data = await loadJson("data/videos.json");
  heroStageVideos = data.videos || [];
  const palette = ["#ff244f", "#4deaff", "#ffd36a", "#a879ff", "#79f2a7", "#c896ff", "#ff7a4d", "#b8f2ff", "#fff2b9"];

  world.innerHTML = heroStageVideos.map((video, index) => {
    const angle = (360 / Math.max(1, heroStageVideos.length)) * index;
    return `
      <button class="video-float-card" type="button" data-video-index="${index}" style="--card-angle:${angle}deg; --manual-angle:0deg; --card-color:${palette[index % palette.length]}">
        <video src="${escapeHtml(video.file)}" poster="${escapeHtml(video.poster || "")}" muted loop playsinline preload="metadata"></video>
        <span>${String(index + 1).padStart(2, "0")} / ${escapeHtml(video.lane)}</span>
        <strong>${escapeHtml(video.title)}</strong>
        <small>${escapeHtml(video.sourceFile)}</small>
      </button>
    `;
  }).join("");

  qsa(".video-float-card", world).forEach((card) => {
    const preview = qs("video", card);
    card.addEventListener("mouseenter", () => preview?.play().catch(() => {}));
    card.addEventListener("mouseleave", () => preview?.pause());
    card.addEventListener("click", () => {
      world.classList.add("is-held");
      setHeroStageVideo(Number(card.dataset.videoIndex), true);
      qs("#hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  let drag = null;
  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.("button, a, video")) return;
    drag = { x: event.clientX, rotation: videoOrbitRotation };
    stage.setPointerCapture?.(event.pointerId);
    world.classList.add("is-held");
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag) return;
    setVideoOrbitRotation(world, drag.rotation + (event.clientX - drag.x) * 0.34);
  });
  const endDrag = () => { drag = null; };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  qs("#videoSpin")?.addEventListener("click", () => world.classList.remove("is-held"));
  qs("#videoHold")?.addEventListener("click", () => world.classList.add("is-held"));
  qs("#videoReset")?.addEventListener("click", () => {
    world.classList.add("is-held");
    setVideoOrbitRotation(world, 0);
    setHeroStageVideo(0, true);
  });
  qs("#videoPrev")?.addEventListener("click", () => {
    world.classList.add("is-held");
    setHeroStageVideo(heroStageIndex - 1, true);
  });
  qs("#videoNext")?.addEventListener("click", () => {
    world.classList.add("is-held");
    setHeroStageVideo(heroStageIndex + 1, true);
  });

  setVideoOrbitRotation(world, 0);
  setHeroStageVideo(0, true);
}

async function setupVideoRoomPage() {
  const roomVideo = qs("#roomVideo");
  if (!roomVideo) return;
  const data = await loadJson("data/videos.json");
  const videos = data.videos || [];
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("video") || localStorage.getItem(VIDEO_KEY) || data.featured;
  const initial = videos.find((video) => video.id === requested) || videos[0];

  function selectVideo(video) {
    if (!video) return;
    localStorage.setItem(VIDEO_KEY, video.id);
    roomVideo.src = video.file;
    roomVideo.poster = video.poster || "";
    roomVideo.play().catch(() => {});
    qs("#roomTitle").textContent = video.title;
    qs("#roomLane").textContent = video.lane;
    qs("#roomSource").textContent = video.sourceFile;
    qsa("[data-room-select]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.roomSelect === video.id));
    });
  }

  const list = qs("#roomList");
  if (list) {
    list.innerHTML = videos.map((video, index) => `
      <button class="track-button" type="button" data-room-select="${escapeHtml(video.id)}" aria-pressed="false">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(video.title)}</strong>
        <small>${escapeHtml(video.lane)}</small>
      </button>
    `).join("");
    qsa("[data-room-select]", list).forEach((button) => {
      button.addEventListener("click", () => {
        const video = videos.find((item) => item.id === button.dataset.roomSelect);
        selectVideo(video);
        qs("#video-room")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  qs("#unmuteRoom")?.addEventListener("click", () => {
    roomVideo.muted = false;
    roomVideo.volume = 0.82;
    roomVideo.play().catch(() => {});
  });
  qs("#muteRoom")?.addEventListener("click", () => {
    roomVideo.muted = true;
  });

  selectVideo(initial);
}

async function setupPosts() {
  const wrap = qs("#postGrid");
  if (!wrap) return;
  const data = await loadJson("data/posts.json");
  wrap.innerHTML = (data.posts || []).map((post) => `
    <a class="post-card" href="${escapeHtml(post.href)}">
      <img src="${escapeHtml(post.image)}" alt="">
      <div class="post-body">
        <p class="eyebrow">${escapeHtml(post.kicker)}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt)}</p>
      </div>
    </a>
  `).join("");
}

function setupGallery() {
  qsa("[data-gallery-src]").forEach((button) => {
    button.addEventListener("click", () => {
      openModal({
        title: button.dataset.galleryTitle || "Gallery",
        lane: "black room gallery",
        file: button.dataset.gallerySrc,
        kind: "image"
      });
    });
  });
}

let orbitTracks = [];
let orbitIndex = 0;
let orbitRotation = 0;

function setOrbitRotation(world, value) {
  orbitRotation = value;
  world?.style.setProperty("--orbit-z", `${orbitRotation}deg`);
  qsa(".song-orb", world || document).forEach((orb) => {
    orb.style.setProperty("--manual-angle", `${orbitRotation}deg`);
  });
}

function paintOrbitActive() {
  qsa(".song-orb").forEach((orb) => {
    orb.classList.toggle("is-active", Number(orb.dataset.orbitIndex) === orbitIndex);
  });
}

function playOrbitTrack(index, shouldPlay = true) {
  if (!orbitTracks.length) return;
  orbitIndex = (index + orbitTracks.length) % orbitTracks.length;
  const track = orbitTracks[orbitIndex];
  const audio = qs("#orbitAudio");
  const title = qs("#orbitTitle");
  const lane = qs("#orbitLane");
  const source = qs("#orbitSource");
  if (title) title.textContent = track.displayTitle;
  if (lane) lane.textContent = track.lane;
  if (source) source.textContent = track.sourceFile;
  if (audio) {
    audio.src = track.file;
    if (shouldPlay) audio.play().catch(() => {});
  }
  qs("#mainAudio")?.pause();
  paintOrbitActive();
}

async function setupSongOrbit() {
  const world = qs("#songOrbitWorld");
  const stage = qs("#songOrbitStage");
  if (!world || !stage) return;
  const data = await loadJson("data/tracks.json");
  orbitTracks = withDisplayTitles(data.tracks || []);
  const palette = ["#ff244f", "#4deaff", "#ffd36a", "#a879ff", "#79ffb5"];
  const orbitThumbs = [
    "media/images/gray-cutout-vitaminwater.png",
    "media/images/gray-new-edited-108.jpg",
    "media/images/gray-new-dsc09479.jpg",
    "media/images/gray-cutout-shoe.png",
    "media/images/gray-red-portrait.jpg",
    "media/images/gray-room-01.jpg",
    "media/images/gray-room-02.jpg",
    "media/images/gray-room-03.jpg",
    "media/images/gray-room-04.jpg",
    "media/images/gray-shadow-portrait.jpg",
    "media/images/gray-wide-stage.jpg",
    "media/images/gray-founder-portrait.jpg",
    "media/images/gray-ritual-portrait.jpg",
    "media/images/gray-new-dsc09460.jpg",
    "media/images/gray-new-edited-16.jpg",
    "media/images/gray-new-edited-92.jpg"
  ];
  world.classList.add("is-held");

  world.innerHTML = orbitTracks.map((track, index) => {
    const angle = (360 / Math.max(1, orbitTracks.length)) * index;
    const thumb = orbitThumbs[index % orbitThumbs.length];
    return `
      <button class="song-orb song-media-orb" type="button" data-orbit-index="${index}" data-track-id="${escapeHtml(track.id)}" aria-label="Play ${escapeHtml(track.displayTitle)}" style="--orb-angle: ${angle}deg; --manual-angle: 0deg; --orb-color: ${palette[index % palette.length]}">
        <img src="${escapeHtml(thumb)}" alt="">
        <span>${String(index + 1).padStart(2, "0")} / ${escapeHtml(track.lane)}</span>
        <strong>${escapeHtml(track.displayTitle)}</strong>
        <small>${escapeHtml(track.sourceFile)}</small>
      </button>
    `;
  }).join("");

  qsa(".song-orb", world).forEach((orb) => {
    orb.addEventListener("click", () => {
      playOrbitTrack(Number(orb.dataset.orbitIndex), true);
      qs("#song-orbit")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  let drag = null;
  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.(".song-orb")) return;
    drag = { x: event.clientX, rotation: orbitRotation };
    stage.setPointerCapture?.(event.pointerId);
    world.classList.add("is-held");
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag) return;
    setOrbitRotation(world, drag.rotation + (event.clientX - drag.x) * 0.42);
  });
  const endDrag = () => {
    drag = null;
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  qs("#orbitSpin")?.addEventListener("click", () => {
    world.classList.remove("is-held");
  });
  qs("#orbitHold")?.addEventListener("click", () => {
    world.classList.add("is-held");
  });
  qs("#orbitReset")?.addEventListener("click", () => {
    world.classList.add("is-held");
    setOrbitRotation(world, 0);
    playOrbitTrack(0, false);
  });
  qs("#orbitPrev")?.addEventListener("click", () => {
    world.classList.add("is-held");
    playOrbitTrack(orbitIndex - 1, true);
  });
  qs("#orbitNext")?.addEventListener("click", () => {
    world.classList.add("is-held");
    playOrbitTrack(orbitIndex + 1, true);
  });

  setOrbitRotation(world, 0);
  playOrbitTrack(0, false);
}

function setupHeroFeature() {
  const button = qs("#playHeroFeature");
  const video = qs("#heroStageVideo");
  if (!button || !video) return;

  button.addEventListener("click", () => {
    video.muted = false;
    video.volume = 0.82;
    video.play().catch(() => {});
    qs("#hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function setupDashboard() {
  const rows = qs("#trackEditorRows");
  if (!rows) return;
  const data = await loadJson("data/tracks.json");
  const tracks = withDisplayTitles(data.tracks || []);

  rows.innerHTML = tracks.map((track, index) => `
    <tr>
      <td>${String(index + 1).padStart(2, "0")}</td>
      <td><input type="text" data-track-id="${escapeHtml(track.id)}" value="${escapeHtml(track.displayTitle)}" aria-label="${escapeHtml(track.title)} display title"></td>
      <td>${escapeHtml(track.lane)}</td>
      <td>${escapeHtml(track.sourceFile)}</td>
    </tr>
  `).join("");

  const notice = qs("#dashboardNotice");
  qs("#saveTitles")?.addEventListener("click", () => {
    const next = {};
    qsa("[data-track-id]", rows).forEach((input) => {
      const value = input.value.trim();
      if (value) next[input.dataset.trackId] = value;
    });
    writeTitleOverrides(next);
    if (notice) {
      notice.hidden = false;
      notice.textContent = "Saved. The catalog reads these titles in this browser session.";
    }
  });

  qs("#resetTitles")?.addEventListener("click", () => {
    writeTitleOverrides({});
    if (notice) {
      notice.hidden = false;
      notice.textContent = "Reset. Original drop titles are active again.";
    }
    setupDashboard();
  });
}

function setupStorageRefresh() {
  window.addEventListener("storage", (event) => {
    if (event.key === TRACK_KEY) {
      setupMusic().catch(() => {});
      setupSongOrbit().catch(() => {});
    }
  });
}

function setupNeonChrome() {
  const root = document.documentElement;
  const existingRail = qs(".mcp-neon-scroll-rail");
  const rail = existingRail || document.createElement("div");
  const thumb = existingRail?.querySelector(".mcp-neon-scroll-thumb") || document.createElement("div");

  root.setAttribute("data-mcp-neon-scrollbar", "");
  rail.className = "mcp-neon-scroll-rail mcp-neon-scroll-rail-y";
  thumb.className = "mcp-neon-scroll-thumb";
  if (!thumb.parentElement) rail.appendChild(thumb);
  if (!existingRail) document.body.appendChild(rail);

  let frame = 0;
  let drag = null;

  function update() {
    frame = 0;
    const source = document.scrollingElement || document.documentElement;
    const track = Math.max(1, rail.clientHeight);
    const scrollHeight = Math.max(source.scrollHeight, window.innerHeight);
    const max = Math.max(1, source.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, source.scrollTop / max));
    const size = Math.min(track, Math.max(86, (window.innerHeight / scrollHeight) * track));
    thumb.style.height = `${Math.floor(size)}px`;
    rail.style.setProperty("--mcp-scroll-y", `${Math.round(ratio * Math.max(0, track - size))}px`);
  }

  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  }

  function scrollFromPointer(event) {
    const source = document.scrollingElement || document.documentElement;
    const box = rail.getBoundingClientRect();
    const thumbHeight = Math.max(86, thumb.getBoundingClientRect().height || 86);
    const y = event.clientY - box.top - (drag?.offset || thumbHeight / 2);
    const ratio = Math.min(1, Math.max(0, y / Math.max(1, box.height - thumbHeight)));
    source.scrollTop = ratio * Math.max(1, source.scrollHeight - window.innerHeight);
    schedule();
  }

  rail.addEventListener("pointerdown", (event) => {
    const thumbBox = thumb.getBoundingClientRect();
    drag = {
      offset: event.target === thumb ? event.clientY - thumbBox.top : thumbBox.height / 2
    };
    root.classList.add("mcp-neon-scroll-dragging");
    rail.setPointerCapture?.(event.pointerId);
    scrollFromPointer(event);
  });
  rail.addEventListener("pointermove", (event) => {
    if (!drag) return;
    scrollFromPointer(event);
  });
  const end = () => {
    drag = null;
    root.classList.remove("mcp-neon-scroll-dragging");
  };
  rail.addEventListener("pointerup", end);
  rail.addEventListener("pointercancel", end);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
  window.setTimeout(schedule, 400);
}

async function init() {
  setupCursor();
  setupNav();
  setupModal();
  setupGallery();
  setupStorageRefresh();
  setupNeonChrome();
  setupHeroFeature();
  await Promise.allSettled([
    setupMusic(),
    setupHeroVideoStage(),
    setupVideoGrid(),
    setupVideoRoomPage(),
    setupPosts(),
    setupSongOrbit(),
    setupDashboard()
  ]);
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
