const DB_NAME = "artistLandingNexusProof";
const DB_VERSION = 1;
const $ = (selector) => document.querySelector(selector);

const state = {
  db: null,
  currentArtistId: "artist_supaboy_slb",
  currentAudioUrl: "",
  phase: 0
};

const supaboyInternalUrl = () => new URL("./SUPABOY/", window.location.href).href;

function slugify(value) {
  return String(value || "artist")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "artist";
}

function trackId(artistId, releaseId, title) {
  return `${slugify(artistId)}__${slugify(releaseId)}__${slugify(title)}__${Date.now().toString(36)}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("artists")) db.createObjectStore("artists", { keyPath: "artistId" });
      if (!db.objectStoreNames.contains("tracks")) {
        const tracks = db.createObjectStore("tracks", { keyPath: "trackId" });
        tracks.createIndex("artistId", "artistId", { unique: false });
      }
      if (!db.objectStoreNames.contains("media")) {
        const media = db.createObjectStore("media", { keyPath: "mediaId" });
        media.createIndex("artistId", "artistId", { unique: false });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function put(storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function getByArtist(storeName, artistId) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, "readonly");
    const index = tx.objectStore(storeName).index("artistId");
    const request = index.getAll(artistId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function getArtist(artistId) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction("artists", "readonly");
    const request = tx.objectStore("artists").get(artistId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function proofToneBlob() {
  const sampleRate = 44100;
  const seconds = 2.4;
  const samples = Math.floor(sampleRate * seconds);
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / 3000, (samples - i) / 5000);
    const sample = Math.sin(2 * Math.PI * 176 * t) * 0.48 + Math.sin(2 * Math.PI * 352 * t) * 0.24;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample * envelope)) * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function fileFromProofTone() {
  return new File([proofToneBlob()], "supaboy-id-proof-tone.wav", { type: "audio/wav" });
}

async function saveArtistFromForm(form, audioFile, mediaFile) {
  const formData = new FormData(form);
  const artistId = String(formData.get("artistId") || "").trim();
  const releaseId = String(formData.get("releaseId") || "").trim();
  const artistName = String(formData.get("artistName") || "").trim();
  const slug = slugify(formData.get("slug"));
  const title = String(formData.get("trackTitle") || "").trim();
  if (!artistId || !releaseId || !artistName || !title) throw new Error("Artist ID, release ID, artist name, and track title are required.");
  if (!audioFile) throw new Error("Upload an audio file or generate the proof tone.");

  const artist = {
    artistId,
    artistName,
    slug,
    pageUrl: `artist/${slug}`,
    productionUrl: supaboyInternalUrl(),
    updatedAt: new Date().toISOString()
  };
  const id = trackId(artistId, releaseId, title);
  const track = {
    trackId: id,
    artistId,
    releaseId,
    title,
    fileName: audioFile.name || `${slug}-song.wav`,
    type: audioFile.type || "audio/wav",
    size: audioFile.size,
    blob: audioFile,
    createdAt: new Date().toISOString()
  };
  await put("artists", artist);
  await put("tracks", track);

  if (mediaFile) {
    await put("media", {
      mediaId: `${slugify(artistId)}__media__${Date.now().toString(36)}`,
      artistId,
      fileName: mediaFile.name,
      type: mediaFile.type,
      size: mediaFile.size,
      blob: mediaFile,
      createdAt: new Date().toISOString()
    });
  }

  state.currentArtistId = artistId;
  return { artist, track };
}

async function renderArtist(artistId = state.currentArtistId) {
  const artist = await getArtist(artistId);
  const tracks = await getByArtist("tracks", artistId);
  const media = await getByArtist("media", artistId);
  const fallbackName = artist?.artistName || "SupaBoy";
  $("#previewName").textContent = fallbackName;
  $("#previewIds").textContent = artist
    ? `${artist.artistId} / ${tracks[0]?.releaseId || "release pending"} / ${artist.pageUrl}`
    : "artist_supaboy_slb / slb-superboy";

  const trackList = $("#trackList");
  trackList.innerHTML = "";
  if (!tracks.length) {
    trackList.innerHTML = '<div class="track-row"><div><strong>No uploaded tracks yet</strong><span>Upload audio or generate the proof tone.</span></div></div>';
  }
  for (const track of tracks.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))) {
    const row = document.createElement("div");
    row.className = "track-row";
    row.innerHTML = `<div><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(track.trackId)}<br>${escapeHtml(track.fileName)} · ${Math.round(track.size / 1024)} KB</span></div>`;
    const play = document.createElement("button");
    play.type = "button";
    play.className = "primary";
    play.textContent = "Play";
    play.addEventListener("click", () => playTrack(track));
    row.appendChild(play);
    trackList.appendChild(row);
  }

  const mediaWall = $("#mediaWall");
  mediaWall.innerHTML = "";
  if (!media.length) {
    mediaWall.innerHTML = '<div class="media-tile"><strong>No uploaded media yet</strong><span>Add image or video to prove media playback/rendering.</span></div>';
  }
  for (const item of media.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))) {
    const tile = document.createElement("div");
    tile.className = "media-tile";
    const url = URL.createObjectURL(item.blob);
    const isVideo = String(item.type || "").startsWith("video/");
    tile.innerHTML = `<strong>${escapeHtml(item.fileName)}</strong><span>${escapeHtml(item.mediaId)} · ${Math.round(item.size / 1024)} KB</span>`;
    const el = document.createElement(isVideo ? "video" : "img");
    el.src = url;
    if (isVideo) {
      el.controls = true;
      el.preload = "metadata";
    } else {
      el.alt = item.fileName;
      $("#artistAvatar").src = url;
    }
    tile.appendChild(el);
    mediaWall.appendChild(tile);
  }

  $("#proofReceipt").textContent = JSON.stringify({
    artistId,
    tracks: tracks.length,
    media: media.length,
    lastUpdated: artist?.updatedAt || null
  }, null, 2);
}

function playTrack(track) {
  if (state.currentAudioUrl) URL.revokeObjectURL(state.currentAudioUrl);
  state.currentAudioUrl = URL.createObjectURL(track.blob);
  const player = $("#audioPlayer");
  player.src = state.currentAudioUrl;
  player.play().catch(() => {
    player.controls = true;
  });
  drawWave(track.title);
}

function drawWave(label = "") {
  const canvas = $("#waveCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#5ee7ff");
  gradient.addColorStop(0.5, "#ffd36a");
  gradient.addColorStop(1, "#ff517f");
  ctx.fillStyle = "rgba(255,255,255,.05)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const y = height / 2 + Math.sin((x + state.phase) * 0.028) * 32 + Math.sin((x + state.phase) * 0.071) * 14;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(247,251,255,.9)";
  ctx.font = "700 24px Inter, sans-serif";
  ctx.fillText(label || "Artist playback", 24, 42);
}

function animateWave() {
  state.phase += 1.8;
  const player = $("#audioPlayer");
  if (player && !player.paused && player.src) drawWave($("#trackList strong")?.textContent || "Artist playback");
  requestAnimationFrame(animateWave);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function exportManifest() {
  const artist = await getArtist(state.currentArtistId);
  const tracks = await getByArtist("tracks", state.currentArtistId);
  const media = await getByArtist("media", state.currentArtistId);
  const manifest = {
    schema: "artist-landing-nexus.local-proof.v1",
    generatedAt: new Date().toISOString(),
    artist,
    tracks: tracks.map(({ blob, ...track }) => track),
    media: media.map(({ blob, ...item }) => item),
    productionSurface: supaboyInternalUrl(),
    boundary: "Browser-local IndexedDB media proof; production storage and rights/provider lanes require separate deployment proof."
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.currentArtistId)}-artist-page-manifest.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function init() {
  state.db = await openDb();
  $("#dbStatus").textContent = "IndexedDB ready";
  $("#dbStatus").style.borderColor = "rgba(98,242,165,.52)";

  $("#artistForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const audioInput = form.elements.audioFile;
    const mediaInput = form.elements.mediaFile;
    const audioFile = audioInput.files[0] || form.__proofTone || null;
    const mediaFile = mediaInput.files[0] || null;
    try {
      const saved = await saveArtistFromForm(form, audioFile, mediaFile);
      form.__proofTone = null;
      $("#proofReceipt").textContent = `Published ${saved.track.trackId} to ${saved.artist.pageUrl}`;
      await renderArtist(saved.artist.artistId);
      playTrack(saved.track);
    } catch (error) {
      $("#proofReceipt").textContent = error.message;
    }
  });

  $("#proofToneBtn").addEventListener("click", async () => {
    const form = $("#artistForm");
    form.__proofTone = fileFromProofTone();
    $("#proofReceipt").textContent = "Proof tone generated. Click Publish To Artist Page.";
  });

  $("#exportBtn").addEventListener("click", exportManifest);

  $("#clearBtn").addEventListener("click", async () => {
    await clearStore("tracks");
    await clearStore("media");
    await clearStore("artists");
    $("#artistAvatar").src = "./SUPABOY/media/slb-cover.webp";
    $("#audioPlayer").removeAttribute("src");
    $("#audioPlayer").load();
    $("#proofReceipt").textContent = "Local proof cleared.";
    await renderArtist("artist_supaboy_slb");
  });

  drawWave("Artist playback proof");
  animateWave();
  await renderArtist(state.currentArtistId);
}

init().catch((error) => {
  $("#dbStatus").textContent = "IndexedDB blocked";
  $("#proofReceipt").textContent = error.message;
});
