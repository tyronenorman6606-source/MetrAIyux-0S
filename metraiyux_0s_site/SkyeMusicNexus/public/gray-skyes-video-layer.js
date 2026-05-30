const GRAY_SKYES_VIDEO_SOURCE = "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gray-skyes/";
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

function grayAsset(path) {
  return new URL(path, GRAY_SKYES_VIDEO_SOURCE).toString();
}

const heroStageVideos = [
  {
    id: "chicago-underground-trap-metal-king-main",
    title: "Chicago's Underground Trap Metal King",
    lane: "feature room",
    file: grayAsset("media/video/chicago-underground-trap-metal-king-main.mp4"),
    sourceFile: "_l Chicago's Underground Trap Metal King (1).mp4",
    poster: grayAsset("media/images/gray-red-portrait.jpg")
  },
  {
    id: "chicago-underground-trap-metal-king-alt",
    title: "Underground Trap Metal King / Alt Cut",
    lane: "alternate cut",
    file: grayAsset("media/video/chicago-underground-trap-metal-king-alt.mp4"),
    sourceFile: "_l Chicago's Underground Trap Metal King.mp4",
    poster: grayAsset("media/images/gray-shadow-portrait.jpg")
  },
  {
    id: "blades-gray-skyes",
    title: "Blades",
    lane: "ragecore video",
    file: grayAsset("media/video/blades-gray-skyes.mp4"),
    sourceFile: "Blades by Gray Skyes l Chicago's Underground Trap Metal King l Trap Metal & Ragecore Artist 2020.mp4",
    poster: grayAsset("media/images/gray-ritual-portrait.jpg")
  },
  {
    id: "fxck-yo-society-music-video",
    title: "Fxck Yo Society",
    lane: "music video",
    file: grayAsset("media/video/fxck-yo-society-music-video.mp4"),
    sourceFile: "Fxck Yo Society  Music Video l Trap Metal Artist 2020 l Chicago's Underground Trap Metal King.mp4",
    poster: grayAsset("media/images/gray-wide-stage.jpg")
  },
  {
    id: "fxck-yo-society-official",
    title: "Fxck Yo Society / Official",
    lane: "official room",
    file: grayAsset("media/video/fxck-yo-society-official.mp4"),
    sourceFile: "Fxck Yo Society - Gray Skyes l Official Music Video l Chicago's Trap Metal King.mp4",
    poster: grayAsset("media/images/gray-room-02.jpg")
  },
  {
    id: "gray-skyes-concert-recap",
    title: "Concert Recap",
    lane: "live proof",
    file: grayAsset("media/video/gray-skyes-concert-recap.mp4"),
    sourceFile: "Gray Skyes Concert Recap l Trap Metal Live 2020 l Chicago's Underground Trap Metal King.mp4",
    poster: grayAsset("media/images/gray-room-03.jpg")
  },
  {
    id: "gray-field-motion",
    title: "Field Motion Archive",
    lane: "raw loop",
    file: grayAsset("media/video/gray-field-motion.mp4"),
    sourceFile: "MAH06350.MP4",
    poster: grayAsset("media/images/gray-room-01.jpg")
  },
  {
    id: "she-said-teaser",
    title: "She Said Teaser",
    lane: "teaser",
    file: grayAsset("media/video/she-said-teaser.mp4"),
    sourceFile: "She Said Teaser.mp4",
    poster: grayAsset("media/images/gray-room-04.jpg")
  },
  {
    id: "vv-phoenix-album-leak",
    title: "VV / Phoenix Album Leak",
    lane: "leak room",
    file: grayAsset("media/video/vv-phoenix-album-leak.mp4"),
    sourceFile: "VV - Gray London Skyes (Phoenix Album Leak!) l Chicago's Underground King.mp4",
    poster: grayAsset("media/images/gray-founder-portrait.jpg")
  }
];

let heroStageIndex = 0;
let videoOrbitRotation = 0;

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

function setupHeroVideoStage() {
  const world = qs("#floatingVideoWorld");
  const stage = qs(".gray-video-stage");
  if (!world || !stage) return;
  const sceneFrame = qs(".scene-frame");
  if (sceneFrame?.dataset.src && !sceneFrame.src) {
    sceneFrame.src = sceneFrame.dataset.src;
  }
  const palette = ["#ff244f", "#4deaff", "#ffd36a", "#a879ff", "#79f2a7", "#c896ff", "#ff7a4d", "#b8f2ff", "#fff2b9"];

  world.innerHTML = heroStageVideos.map((video, index) => {
    const angle = (360 / Math.max(1, heroStageVideos.length)) * index;
    return `
      <button class="video-float-card" type="button" data-video-index="${index}" style="--card-angle:${angle}deg; --manual-angle:0deg; --card-color:${palette[index % palette.length]}">
        <video data-src="${escapeHtml(video.file)}" poster="${escapeHtml(video.poster || "")}" muted loop playsinline preload="none"></video>
        <span>${String(index + 1).padStart(2, "0")} / ${escapeHtml(video.lane)}</span>
        <strong>${escapeHtml(video.title)}</strong>
        <small>${escapeHtml(video.sourceFile)}</small>
      </button>
    `;
  }).join("");

  qsa(".video-float-card", world).forEach((card) => {
    const preview = qs("video", card);
    const primePreview = () => {
      if (preview?.dataset.src && !preview.src) preview.src = preview.dataset.src;
    };
    card.addEventListener("mouseenter", () => {
      primePreview();
      preview?.play().catch(() => {});
    });
    card.addEventListener("mouseleave", () => preview?.pause());
    card.addEventListener("click", () => {
      primePreview();
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

if (document.querySelector("#floatingVideoWorld")) {
  setupHeroVideoStage();
} else if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", setupHeroVideoStage, { once: true });
} else {
  setupHeroVideoStage();
}
