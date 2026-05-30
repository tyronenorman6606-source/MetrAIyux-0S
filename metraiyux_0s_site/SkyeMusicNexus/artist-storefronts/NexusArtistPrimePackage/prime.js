const tracks = [
  { id: "cupid", title: "Cupid", lane: "melodic pressure", mode: "rnb", file: "./originals/gray-skyes/media/audio/cupid.mp3", art: "./originals/gray-skyes/media/images/gray-red-portrait.jpg", drop: "./originals/gray-skyes/products/" },
  { id: "cvs-at-12", title: "CVS @ 12", lane: "after-hours cut", mode: "rnb", file: "./originals/gray-skyes/media/audio/cvs-at-12.mp3", art: "./originals/gray-skyes/media/images/gray-shadow-portrait.jpg", drop: "./originals/gray-skyes/products/" },
  { id: "fatallity", title: "Fatallity", lane: "French mix", mode: "rage", file: "./originals/gray-skyes/media/audio/fatallity-french-mix.mp3", art: "./originals/gray-skyes/media/images/gray-ritual-portrait.jpg", drop: "./originals/gray-skyes/products/" },
  { id: "fuck-yo-society", title: "Fuck Yo Society", lane: "riot record", mode: "rage", file: "./originals/gray-skyes/media/audio/fuck-yo-society.mp3", art: "./originals/gray-skyes/media/images/gray-wide-stage.jpg", drop: "./originals/gray-skyes/products/" },
  { id: "gray-gang", title: "Gray Gang", lane: "crew anthem", mode: "rage", file: "./originals/gray-skyes/media/audio/gray-gang.mp3", art: "./originals/gray-skyes/media/images/gray-founder-portrait.jpg", drop: "./originals/gray-skyes/products/" },
  { id: "blades", title: "Blades", lane: "ragecore stress test", mode: "rage", file: "./originals/gray-skyes/media/audio/blades.mp3", art: "./originals/gray-skyes/media/images/gray-ritual-portrait.jpg", drop: "./originals/gray-skyes/drops/reflection/" },
  { id: "always-try-to-breathe", title: "Always Try To Breathe", lane: "mastered signal", mode: "rnb", file: "./originals/gray-skyes/media/audio/always-try-to-breathe.mp3", art: "./originals/gray-skyes/media/images/gray-red-portrait.jpg", drop: "./originals/gray-skyes-collective/releases/crooked-reflection/" },
  { id: "its-not-over", title: "It's Not Over", lane: "wetgropes master", mode: "rnb", file: "./originals/gray-skyes/media/audio/its-not-over.mp3", art: "./originals/gray-skyes/media/images/gray-shadow-portrait.jpg", drop: "./originals/gray-skyes/products/" },
  { id: "hands-up", title: "Hands Up", lane: "pit switch", mode: "rage", file: "./originals/gray-skyes/media/audio/hands-up.mp3", art: "./originals/gray-skyes/media/images/gray-wide-stage.jpg", drop: "./originals/gray-skyes/products/" },
  { id: "naruto", title: "Naruto", lane: "anime pressure", mode: "rage", file: "./originals/gray-skyes/media/audio/naruto.mp3", art: "./originals/gray-skyes/media/images/gray-founder-portrait.jpg", drop: "./originals/gray-skyes/products/" },
  { id: "redline-heart", title: "Redline Heart", lane: "Vox Gray Modes", mode: "rnb", file: "./originals/gray-skyes-collective/releases/vox-gray-modes/audio/redline-heart.mp3", art: "./originals/gray-skyes/media/images/gray-red-portrait.jpg", drop: "./originals/gray-skyes/drops/redline-heart/" },
  { id: "midnight-r-and-b-mode", title: "Midnight R&B Mode", lane: "Vox Gray Modes", mode: "rnb", file: "./originals/gray-skyes-collective/releases/vox-gray-modes/audio/midnight-r-and-b-mode.mp3", art: "./originals/gray-skyes/media/images/gray-shadow-portrait.jpg", drop: "./originals/gray-skyes/drops/midnight-r-and-b-mode/" },
  { id: "slow-rain-reply", title: "Slow Rain Reply", lane: "Vox Gray Modes", mode: "rnb", file: "./originals/gray-skyes-collective/releases/vox-gray-modes/audio/slow-rain-reply.mp3", art: "./originals/gray-skyes/media/images/gray-founder-portrait.jpg", drop: "./originals/gray-skyes/drops/slow-rain-reply/" },
  { id: "stay-through-static", title: "Stay Through Static", lane: "Vox Gray Modes", mode: "rnb", file: "./originals/gray-skyes-collective/releases/vox-gray-modes/audio/stay-through-static.mp3", art: "./originals/gray-skyes/media/images/gray-red-portrait.jpg", drop: "./originals/gray-skyes/drops/stay-through-static/" },
  { id: "everything-act-i", title: "Everything Movie Act I", lane: "Birth of Static", mode: "movie", file: "./originals/gray-skyes-collective/releases/everything-movie/audio/everything-movie-act-i-birth-of-static.mp3", art: "./originals/gray-skyes/media/images/gray-wide-stage.jpg", drop: "./originals/gray-skyes/drops/everything-movie-act-i-birth-of-static/" },
  { id: "everything-act-ii", title: "Everything Movie Act II", lane: "Gate Argument", mode: "movie", file: "./originals/gray-skyes-collective/releases/everything-movie/audio/everything-movie-act-ii-gate-argument.mp3", art: "./originals/gray-skyes/media/images/gray-wide-stage.jpg", drop: "./originals/gray-skyes/drops/everything-movie-act-ii-gate-argument/" },
  { id: "everything-act-iii", title: "Everything Movie Act III", lane: "Betrayal Parade", mode: "movie", file: "./originals/gray-skyes-collective/releases/everything-movie/audio/everything-movie-act-iii-betrayal-parade.mp3", art: "./originals/gray-skyes/media/images/gray-wide-stage.jpg", drop: "./originals/gray-skyes/drops/everything-movie-act-iii-betrayal-parade/" },
  { id: "everything-act-iv", title: "Everything Movie Act IV", lane: "Founder Walkout", mode: "movie", file: "./originals/gray-skyes-collective/releases/everything-movie/audio/everything-movie-act-iv-founder-walkout.mp3", art: "./originals/gray-skyes/media/images/gray-wide-stage.jpg", drop: "./originals/gray-skyes/drops/everything-movie-act-iv-founder-walkout/" },
  { id: "command-mirror", title: "Command Mirror", lane: "Brain drop", mode: "brain", file: "./originals/gray-skyes-brain/drops/command-mirror/audio/command-mirror.mp3", art: "./originals/gray-skyes-brain/assets/gray-brain-avatar-openai.png", drop: "./originals/gray-skyes-brain/drops/command-mirror/" },
  { id: "gate-memory", title: "Gate Memory", lane: "Brain drop", mode: "brain", file: "./originals/gray-skyes-brain/drops/gate-memory/audio/gate-memory.mp3", art: "./originals/gray-skyes-brain/assets/gray-brain-avatar-openai.png", drop: "./originals/gray-skyes-brain/drops/gate-memory/" }
];

const videos = [
  { id: "chicago-underground-trap-metal-king-main", title: "Trap Metal King", lane: "feature room", file: "./originals/gray-skyes/media/video/chicago-underground-trap-metal-king-main.mp4", poster: "./originals/gray-skyes/media/images/gray-red-portrait.jpg", track: "blades" },
  { id: "chicago-underground-trap-metal-king-alt", title: "Trap Metal Alt", lane: "alternate cut", file: "./originals/gray-skyes/media/video/chicago-underground-trap-metal-king-alt.mp4", poster: "./originals/gray-skyes/media/images/gray-shadow-portrait.jpg", track: "gray-gang" },
  { id: "blades-gray-skyes", title: "Blades Video", lane: "ragecore video", file: "./originals/gray-skyes/media/video/blades-gray-skyes.mp4", poster: "./originals/gray-skyes/media/images/gray-ritual-portrait.jpg", track: "blades" },
  { id: "fxck-yo-society-music-video", title: "Fxck Yo Society", lane: "music video", file: "./originals/gray-skyes/media/video/fxck-yo-society-music-video.mp4", poster: "./originals/gray-skyes/media/images/gray-wide-stage.jpg", track: "fuck-yo-society" },
  { id: "fxck-yo-society-official", title: "Society Official", lane: "official room", file: "./originals/gray-skyes/media/video/fxck-yo-society-official.mp4", poster: "./originals/gray-skyes/media/images/gray-wide-stage.jpg", track: "fuck-yo-society" },
  { id: "gray-skyes-concert-recap", title: "Concert Recap", lane: "live proof", file: "./originals/gray-skyes/media/video/gray-skyes-concert-recap.mp4", poster: "./originals/gray-skyes/media/images/gray-founder-portrait.jpg", track: "hands-up" },
  { id: "gray-field-motion", title: "Field Motion", lane: "raw loop", file: "./originals/gray-skyes/media/video/gray-field-motion.mp4", poster: "./originals/gray-skyes/media/images/gray-shadow-portrait.jpg", track: "always-try-to-breathe" },
  { id: "she-said-teaser", title: "She Said Teaser", lane: "teaser", file: "./originals/gray-skyes/media/video/she-said-teaser.mp4", poster: "./originals/gray-skyes/media/images/gray-red-portrait.jpg", track: "cupid" },
  { id: "vv-phoenix-album-leak", title: "VV / Phoenix", lane: "album leak", file: "./originals/gray-skyes/media/video/vv-phoenix-album-leak.mp4", poster: "./originals/gray-skyes/media/images/gray-founder-portrait.jpg", track: "its-not-over" }
];

const rooms = [
  { title: "Artist Landing", kind: "Main storefront", image: "./originals/gray-skyes/media/images/gray-red-portrait.jpg", copy: "Gray's public artist front door with catalog, store, and installable app path.", local: "./originals/gray-skyes/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes/" },
  { title: "Artist App", kind: "Installable app", image: "./originals/gray-skyes/media/images/gray-founder-portrait.jpg", copy: "Fan-facing app lane for drops, listening, and direct artist action.", local: "./originals/gray-skyes/app.html", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes/app.html" },
  { title: "Product Room", kind: "Storefront", image: "./originals/gray-skyes/media/images/gray-shadow-portrait.jpg", copy: "Digital products and drop routes priced from the Nexus catalog.", local: "./originals/gray-skyes/products/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes/products/" },
  { title: "Album PWA", kind: "Player", image: "./originals/gray-skyes/media/images/gray-ritual-portrait.jpg", copy: "Hosted installable player for the Gray Skyes catalog.", local: "./originals/gray-skyes/album-pwa/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes/album-pwa/" },
  { title: "Gray Brain", kind: "AI artist brain", image: "./originals/gray-skyes-brain/assets/gray-brain-avatar-openai.png", copy: "Founder command room, Brain products, and artist-attributed collective intelligence.", local: "./originals/gray-skyes-brain/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-brain/" },
  { title: "Brain Products", kind: "Brain store", image: "./originals/gray-skyes-brain/assets/founder-reference.png", copy: "Brain-owned products and drop rooms wired back into the collective.", local: "./originals/gray-skyes-brain/products/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-brain/products/" },
  { title: "Gray Gang", kind: "Collective hub", image: "./originals/gray-skyes/media/images/gray-wide-stage.jpg", copy: "The collective map for Gray, Brain, and the wider Nexus artist universe.", local: "./originals/gray-skyes-collective/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-collective/" },
  { title: "Everything Movie", kind: "Album room", image: "./originals/gray-skyes/media/images/gray-cutout.png", copy: "Four-act release room with copied audio and live Nexus path.", local: "./originals/gray-skyes-collective/releases/everything-movie/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-collective/releases/everything-movie/" }
];

const releases = [
  { title: "Crooked Reflection", type: "Release", copy: "Close The Mirror, Skyline Pact, Neon Drift Relay, Closed Door Voltage, and the reflection arc.", local: "./originals/gray-skyes-collective/releases/crooked-reflection/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-collective/releases/crooked-reflection/", trackId: "always-try-to-breathe" },
  { title: "Everything Movie", type: "Four acts", copy: "Birth of Static, Gate Argument, Betrayal Parade, and Founder Walkout as a cinematic album lane.", local: "./originals/gray-skyes-collective/releases/everything-movie/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-collective/releases/everything-movie/", trackId: "everything-act-i" },
  { title: "Vox Gray Modes", type: "R&B mode", copy: "Soft Ghost Protocol, Mirror Chat, Redline Heart, Midnight R&B Mode, Slow Rain Reply, and Stay Through Static.", local: "./originals/gray-skyes-collective/releases/vox-gray-modes/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-collective/releases/vox-gray-modes/", trackId: "redline-heart" },
  { title: "Gray x Gray Five", type: "Five-track room", copy: "Core Switch Riot, Proof Dog No Collar, Night Shift Seraph, Blackbox Halo, and Final Boss Calendar.", local: "./originals/gray-skyes-collective/releases/gray-x-gray-five/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-collective/releases/gray-x-gray-five/", trackId: "gray-gang" },
  { title: "Reflection", type: "Drop cluster", copy: "Proof Engine, Twin Signal, Reflection, Founder Static, and Red Room Reflection inside the main Gray storefront.", local: "./originals/gray-skyes/drops/reflection/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes/drops/reflection/", trackId: "blades" },
  { title: "Brain Drops", type: "Command room", copy: "Command Mirror and Gate Memory keep the artist brain visible as its own storefront surface.", local: "./originals/gray-skyes-brain/drops/command-mirror/", live: "https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-brain/drops/command-mirror/", trackId: "command-mirror" }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const audio = $("#primeAudio");
const heroVideo = $("#heroVideo");
const vaultVideo = $("#vaultVideo");
const currentTitle = $("#currentTitle");
const currentLane = $("#currentLane");
const playerArt = $("#playerArt");
const playerStatus = $("#playerStatus");
const toggleAudio = $("#toggleAudio");
const prevTrack = $("#prevTrack");
const nextTrack = $("#nextTrack");
const muteAudio = $("#muteAudio");
const seekBar = $("#seekBar");
const elapsedTime = $("#elapsedTime");
const durationTime = $("#durationTime");
const volumeControl = $("#volumeControl");
const copyResult = $("#copyResult");
const trackGrid = $("#trackGrid");
const videoGrid = $("#videoGrid");
const heroVideoDock = $("#heroVideoDock");
const roomGrid = $("#roomGrid");
const releaseGrid = $("#releaseGrid");
let currentTrack = 0;
let currentFilter = "all";
let deferredInstall = null;
let seeking = false;
let audioContext = null;
let analyser = null;
let source = null;
let level = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function filteredTracks() {
  if (currentFilter === "all") return tracks;
  return tracks.filter((track) => track.mode === currentFilter);
}

function setStatus(message) {
  playerStatus.textContent = message;
}

function setTrack(index, shouldPlay = false) {
  currentTrack = (index + tracks.length) % tracks.length;
  const track = tracks[currentTrack];
  audio.src = track.file;
  currentTitle.textContent = track.title;
  currentLane.textContent = track.lane;
  playerArt.src = track.art;
  playerArt.alt = `${track.title} artwork`;
  seekBar.value = 0;
  elapsedTime.textContent = "0:00";
  durationTime.textContent = "0:00";
  renderTracks();
  setStatus(`${track.title} loaded into the persistent player.`);
  if (shouldPlay) startAudio().catch(() => setStatus("Tap Play if the browser blocked autoplay."));
}

function setTrackById(id, shouldPlay = true) {
  const index = tracks.findIndex((track) => track.id === id);
  if (index >= 0) setTrack(index, shouldPlay);
}

async function startAudio() {
  initAudioContext();
  if (audioContext?.state === "suspended") await audioContext.resume();
  await audio.play();
  toggleAudio.textContent = "Pause";
  setStatus(`${tracks[currentTrack].title} is playing from the global player.`);
}

function pauseAudio() {
  audio.pause();
  toggleAudio.textContent = "Play";
  setStatus(`${tracks[currentTrack].title} paused.`);
}

function setHeroVideo(video, alsoVault = false) {
  heroVideo.src = video.file;
  heroVideo.poster = video.poster;
  heroVideo.load();
  heroVideo.play().catch(() => {});
  if (alsoVault) {
    vaultVideo.src = video.file;
    vaultVideo.poster = video.poster;
    vaultVideo.load();
  }
  setStatus(`${video.title} loaded in the video stage. Audio stays in the bottom player.`);
}

function renderTracks() {
  const list = filteredTracks();
  trackGrid.innerHTML = list.map((track) => `
    <article class="track-card ${tracks[currentTrack]?.id === track.id ? "is-active" : ""}" data-track="${escapeHtml(track.id)}">
      <div class="track-top">
        <h3>${escapeHtml(track.title)}</h3>
        <span class="tag">${escapeHtml(track.mode)}</span>
      </div>
      <p>${escapeHtml(track.lane)}</p>
      <div class="card-actions">
        <button type="button" data-track-play="${escapeHtml(track.id)}">Play</button>
        <a href="${escapeHtml(track.drop)}">Open Drop</a>
      </div>
    </article>
  `).join("");
}

function renderVideos() {
  heroVideoDock.innerHTML = videos.slice(0, 5).map((video) => `
    <button class="video-pill" type="button" data-video-play="${escapeHtml(video.id)}">
      <img src="${escapeHtml(video.poster)}" alt="">
      <span><strong>${escapeHtml(video.title)}</strong><span>${escapeHtml(video.lane)}</span></span>
    </button>
  `).join("");

  videoGrid.innerHTML = videos.map((video) => `
    <article class="video-card">
      <div class="video-top">
        <h3>${escapeHtml(video.title)}</h3>
        <span class="tag">${escapeHtml(video.lane)}</span>
      </div>
      <p>Video source: ${escapeHtml(video.file.split("/").pop())}</p>
      <div class="card-actions">
        <button type="button" data-video-play="${escapeHtml(video.id)}">Hero</button>
        <button type="button" data-vault-video="${escapeHtml(video.id)}">Watch</button>
        <button type="button" data-track-play="${escapeHtml(video.track)}">Soundtrack</button>
      </div>
    </article>
  `).join("");
}

function renderRooms() {
  roomGrid.innerHTML = rooms.map((room) => `
    <article class="room-card">
      <figure><img src="${escapeHtml(room.image)}" alt="${escapeHtml(room.title)}"></figure>
      <div class="room-top">
        <h3>${escapeHtml(room.title)}</h3>
        <span class="tag">${escapeHtml(room.kind)}</span>
      </div>
      <p>${escapeHtml(room.copy)}</p>
      <div class="card-actions">
        <a href="${escapeHtml(room.local)}">Open Copy</a>
        <a href="${escapeHtml(room.live)}">Live Nexus</a>
      </div>
    </article>
  `).join("");
}

function renderReleases() {
  releaseGrid.innerHTML = releases.map((release) => `
    <article class="release-card">
      <div class="release-top">
        <h3>${escapeHtml(release.title)}</h3>
        <span class="tag">${escapeHtml(release.type)}</span>
      </div>
      <p>${escapeHtml(release.copy)}</p>
      <div class="card-actions">
        <button type="button" data-track-play="${escapeHtml(release.trackId)}">Load Player</button>
        <a href="${escapeHtml(release.local)}">Open Copy</a>
        <a href="${escapeHtml(release.live)}">Live</a>
      </div>
    </article>
  `).join("");
}

function initAudioContext() {
  if (audioContext) return;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  audioContext = new Ctor();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    if (copyResult) copyResult.textContent = successMessage;
    setStatus(successMessage);
  } catch {
    window.prompt("Copy this", text);
  }
}

function bindEvents() {
  toggleAudio.addEventListener("click", () => audio.paused ? startAudio().catch(() => setStatus("Tap the browser audio control to start playback.")) : pauseAudio());
  prevTrack.addEventListener("click", () => setTrack(currentTrack - 1, true));
  nextTrack.addEventListener("click", () => setTrack(currentTrack + 1, true));
  audio.addEventListener("play", () => { toggleAudio.textContent = "Pause"; });
  audio.addEventListener("pause", () => { toggleAudio.textContent = "Play"; });
  audio.addEventListener("ended", () => setTrack(currentTrack + 1, true));
  audio.addEventListener("loadedmetadata", () => {
    durationTime.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    if (!seeking && Number.isFinite(audio.duration) && audio.duration > 0) {
      seekBar.value = Math.round((audio.currentTime / audio.duration) * 1000);
    }
    elapsedTime.textContent = formatTime(audio.currentTime);
    durationTime.textContent = formatTime(audio.duration);
  });
  seekBar.addEventListener("input", () => { seeking = true; });
  seekBar.addEventListener("change", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(seekBar.value) / 1000) * audio.duration;
    }
    seeking = false;
  });
  volumeControl.addEventListener("input", () => {
    audio.volume = Number(volumeControl.value);
    audio.muted = false;
    muteAudio.textContent = "Mute";
  });
  muteAudio.addEventListener("click", () => {
    audio.muted = !audio.muted;
    muteAudio.textContent = audio.muted ? "Unmute" : "Mute";
  });
  $("#copyPrimeLink").addEventListener("click", () => {
    copyText(new URL("./", location.href).href, "Prime package link copied.");
  });
  $("#copySkyeNetPlan").addEventListener("click", () => {
    copyText("Gate identity -> artist context -> rights metadata -> static package -> SkyeNet route -> Music Nexus latest URL", "SkyeNet release plan copied.");
  });
  document.addEventListener("click", (event) => {
    const trackId = event.target.closest("[data-track-play]")?.dataset.trackPlay;
    if (trackId) setTrackById(trackId, true);

    const videoId = event.target.closest("[data-video-play]")?.dataset.videoPlay;
    if (videoId) {
      const video = videos.find((item) => item.id === videoId);
      if (video) setHeroVideo(video, false);
    }

    const vaultId = event.target.closest("[data-vault-video]")?.dataset.vaultVideo;
    if (vaultId) {
      const video = videos.find((item) => item.id === vaultId);
      if (video) {
        setHeroVideo(video, true);
        vaultVideo.play().catch(() => {});
      }
    }
  });
  $$(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      $$(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip === button));
      renderTracks();
      setStatus(`${button.textContent.trim()} catalog loaded.`);
    });
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstall = event;
  });
  $("#installApp").addEventListener("click", async () => {
    if (!deferredInstall) {
      copyResult.textContent = "Use the browser install option from this page when available.";
      return;
    }
    deferredInstall.prompt();
    const choice = await deferredInstall.userChoice;
    copyResult.textContent = choice.outcome === "accepted" ? "Prime app install accepted." : "Install skipped for now.";
    deferredInstall = null;
  });
}

function startCanvas() {
  const canvas = $("#frequencyField");
  const ctx = canvas.getContext("2d");
  const data = new Uint8Array(64);
  const pointer = { x: 0.5, y: 0.5 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX / Math.max(1, innerWidth);
    pointer.y = event.clientY / Math.max(1, innerHeight);
  }, { passive: true });
  resize();

  function draw(time) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (analyser) {
      analyser.getByteFrequencyData(data);
      level = data.reduce((sum, item) => sum + item, 0) / (data.length * 255);
    } else {
      level = 0.24 + Math.sin(time / 900) * 0.08;
    }
    const centerX = innerWidth * (0.45 + pointer.x * 0.12);
    const centerY = innerHeight * (0.42 + pointer.y * 0.08);
    for (let i = 0; i < 52; i += 1) {
      const angle = (i / 52) * Math.PI * 2 + time / 3800;
      const radius = 90 + i * 7 + level * 130;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle * 0.8) * radius * 0.42;
      const size = 1.6 + (i % 7) + level * 10;
      const hue = i % 3 === 0 ? "255, 61, 69" : i % 3 === 1 ? "84, 220, 255" : "255, 207, 101";
      ctx.beginPath();
      ctx.fillStyle = `rgba(${hue}, ${0.12 + level * 0.36})`;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

renderTracks();
renderVideos();
renderRooms();
renderReleases();
bindEvents();
startCanvas();
setTrack(0, false);
audio.volume = Number(volumeControl.value);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
