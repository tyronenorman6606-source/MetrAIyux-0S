#!/usr/bin/env node
import { execFile } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  appendEvent,
  factoryRoot,
  readRecord,
  repoRoot,
  saveRecord,
  slugify
} from "./factory-engine.mjs";
import {
  buildShareUrl,
  copyIfExists,
  digitsOnly,
  ensureDir,
  exists,
  formatPhoneDisplay,
  formatPhoneHref,
  inferValleyPath,
  latestGeneratedApp,
  markState,
  parseLocation,
  pickFirst,
  relativeWebPath,
  resolveCandidatePath,
  toPosix,
  walk,
  writeJson
} from "./factory-pipeline-shared.mjs";

const execFileAsync = promisify(execFile);
const textExtensions = new Set([".html", ".css", ".js", ".mjs", ".json", ".webmanifest", ".xml", ".txt"]);
const ignoreNames = new Set(["node_modules", ".git", ".DS_Store"]);
const ENHANCE_MARKER = "client-app-factory enhance lane";
const SIGNATURE_SCRIPT_MARKER = "__factorySignatureDeck";
const rasterImageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const drawTextFont = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

function buildRouteMap(files, appDir) {
  const map = new Map();
  const add = (aliases, target) => {
    for (const alias of aliases.filter(Boolean)) map.set(alias, target);
  };
  for (const file of files.filter((entry) => entry.ext === ".html")) {
    const rel = toPosix(file.relative);
    const withoutExt = rel.replace(/\.html$/i, "");
    const target = path.join(appDir, file.relative);
    if (rel === "index.html") {
      add(["", "/", "index", "index.html", "/index", "/index.html"], target);
      continue;
    }
    if (rel.endsWith("/index.html")) {
      const routeBase = withoutExt.replace(/\/index$/, "");
      const dirRoute = `/${routeBase}`;
      add([routeBase, `${routeBase}/`, `${routeBase}.html`, rel, dirRoute, `${dirRoute}/`, `${dirRoute}/index.html`], target);
      continue;
    }
    const route = `/${withoutExt}`;
    add([withoutExt, `${withoutExt}/`, `${withoutExt}.html`, rel, route, `${route}/`, `/${rel}`], target);
  }
  return map;
}

function isSkippableReference(value = "") {
  return /^(mailto:|tel:|sms:|data:|javascript:|https?:\/\/|#)/i.test(value);
}

function looksLikePathReference(value = "") {
  if (!value || /\s/.test(value)) return false;
  if (/^(mailto:|tel:|sms:|data:|javascript:|https?:\/\/|#|%23)/i.test(value)) return false;
  return /^(\/|\.\/|\.\.\/|assets\/|favicon\.png|manifest\.webmanifest|styles\.css|script\.js|service-worker\.js|workspace-preview(?:\/|\.html)?|blog(?:\/|\.html)?|inventory(?:\/|\.html)?|specials(?:\/|\.html)?|gallery(?:\/|\.html)?|faq(?:\/|\.html)?|contact(?:\/|\.html)?|local-seo(?:\/|\.html)?|delivery(?:\/|\.html)?|flyer(?:\/|\.html)?)/i.test(value)
    || /\.[a-z0-9]{2,5}($|[?#])/i.test(value)
    || value.includes("/");
}

function inferNiche(record = {}) {
  const haystack = [
    record.industry,
    ...(record.services || []),
    ...(record.sourceUrls || [])
  ].join(" ").toLowerCase();
  if (/(gaming|trading card|tcg|collectible|pokemon|magic|cards)/.test(haystack)) return "trading-card";
  if (/(pallet|industrial|logistics|yard|fleet|warehouse|manufactur)/.test(haystack)) return "industrial-ops";
  return "signature-showcase";
}

function absolutizeUrl(raw = "", base = "") {
  try {
    return new URL(raw, base).toString();
  } catch {
    return "";
  }
}

function dedupeUrls(urls = []) {
  return Array.from(new Set(urls.filter(Boolean)));
}

function scoreAssetUrl(url = "", type = "media") {
  const value = String(url).toLowerCase();
  let score = 0;
  if (/logo|brand|mark/.test(value)) score += 20;
  if (/hero|banner|cover/.test(value)) score += 12;
  if (/header|home|storefront|shop|yard|pallet|gaming|card/.test(value)) score += 8;
  if (/transparent|icon|favicon/.test(value)) score += type === "logo" ? 12 : -2;
  if (/\.svg($|[?#])/.test(value)) score += type === "logo" ? 6 : 0;
  if (/\.(mp4|webm|mov)($|[?#])/.test(value)) score += 10;
  if (/format=1500w|format=2500w|w=1200|w=1600/.test(value)) score += 3;
  return score;
}

function extractHtmlMatches(html = "", pattern) {
  return Array.from(html.matchAll(pattern)).map((match) => match[1] || match[2] || "").filter(Boolean);
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0 ClientAppFactory/1.0" }
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

async function downloadToCache(url, destination) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0 ClientAppFactory/1.0" }
  });
  if (!response.ok) return "";
  const arrayBuffer = await response.arrayBuffer();
  if (!arrayBuffer.byteLength) return "";
  await ensureDir(path.dirname(destination));
  await writeFile(destination, Buffer.from(arrayBuffer));
  return destination;
}

async function discoverLiveSurfaceAssets(record = {}) {
  const liveUrl = record.sourceUrls?.[0];
  if (!liveUrl) return {};

  let html = "";
  try {
    html = await fetchText(liveUrl);
  } catch {
    return {};
  }

  const ogImages = extractHtmlMatches(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)
    .concat(extractHtmlMatches(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi));
  const imageUrls = extractHtmlMatches(html, /<img[^>]+src=["']([^"']+)["']/gi)
    .concat(extractHtmlMatches(html, /<source[^>]+src=["']([^"']+\.(?:mp4|webm|mov)(?:\?[^"']*)?)["']/gi))
    .concat(extractHtmlMatches(html, /<video[^>]+poster=["']([^"']+)["']/gi))
    .concat(extractHtmlMatches(html, /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/gi))
    .concat(extractHtmlMatches(html, /"logoImageUrl":"([^"]+)"/gi));
  const videoUrls = extractHtmlMatches(html, /<video[^>]+src=["']([^"']+\.(?:mp4|webm|mov)(?:\?[^"']*)?)["']/gi)
    .concat(extractHtmlMatches(html, /<source[^>]+src=["']([^"']+\.(?:mp4|webm|mov)(?:\?[^"']*)?)["']/gi));

  const normalizedImages = dedupeUrls([...ogImages, ...imageUrls].map((item) => absolutizeUrl(item, liveUrl)))
    .filter((item) => /\.(png|jpe?g|webp|gif|svg)($|[?#])/i.test(item));
  const normalizedVideos = dedupeUrls(videoUrls.map((item) => absolutizeUrl(item, liveUrl)))
    .filter((item) => /\.(mp4|webm|mov)($|[?#])/i.test(item));

  const logoUrl = [...normalizedImages].sort((a, b) => scoreAssetUrl(b, "logo") - scoreAssetUrl(a, "logo"))[0] || "";
  const posterUrl = [...normalizedImages].sort((a, b) => scoreAssetUrl(b, "media") - scoreAssetUrl(a, "media"))[0] || "";
  const videoUrl = normalizedVideos[0] || "";

  const cacheDir = path.join(factoryRoot, "storage", "live-surface-cache", record.clientId || "client");
  const liveAssets = {};
  if (logoUrl) {
    const logoExt = path.extname(new URL(logoUrl).pathname) || ".png";
    liveAssets.logo = await downloadToCache(logoUrl, path.join(cacheDir, `logo${logoExt}`));
  }
  if (posterUrl) {
    const posterExt = path.extname(new URL(posterUrl).pathname) || ".jpg";
    liveAssets.poster = await downloadToCache(posterUrl, path.join(cacheDir, `hero-poster${posterExt}`));
  }
  if (videoUrl) {
    const videoExt = path.extname(new URL(videoUrl).pathname) || ".mp4";
    liveAssets.video = await downloadToCache(videoUrl, path.join(cacheDir, `hero${videoExt}`));
  }
  return liveAssets;
}

function isRasterImage(filePath = "") {
  return rasterImageExtensions.has(path.extname(String(filePath || "")).toLowerCase());
}

async function generateMotionLoopFromStill(sourceImage, outputVideo, options = {}) {
  if (!sourceImage || !isRasterImage(sourceImage)) return "";
  const width = Number(options.width || 1920);
  const height = Number(options.height || 1080);
  const duration = Number(options.duration || 6);
  const zoomStep = Number(options.zoomStep || 0.00045);
  const maxZoom = Number(options.maxZoom || 1.14);
  const fadeOutStart = Math.max(duration - 0.8, 0.5);
  const cropFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
  const zoomFilter = `zoompan=z='min(max(zoom,1.0)+${zoomStep},${maxZoom})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(duration * 30)}:s=${width}x${height}:fps=30`;
  const fadeFilter = `format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutStart.toFixed(2)}:d=0.8`;
  const filter = `${cropFilter},${zoomFilter},${fadeFilter}`;
  await ensureDir(path.dirname(outputVideo));
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-loop",
    "1",
    "-i",
    sourceImage,
    "-vf",
    filter,
    "-t",
    String(duration),
    "-an",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputVideo
  ], { cwd: factoryRoot, maxBuffer: 1024 * 1024 * 32 });
  return outputVideo;
}

async function generateBrandedPosterFromRecord(record, outputImage) {
  const cacheDir = path.dirname(outputImage);
  await ensureDir(cacheDir);
  const tagFile = path.join(cacheDir, "tag.txt");
  const titleFile = path.join(cacheDir, "title.txt");
  const subtitleFile = path.join(cacheDir, "subtitle.txt");
  const location = parseLocation(record);
  const tag = [location.city || "", location.state || ""].filter(Boolean).join(", ") || "Valley Verified";
  const subtitle = record.industry || (record.services || []).slice(0, 2).join(" · ") || "Client app preview build";
  await Promise.all([
    writeFile(tagFile, `${tag}\n`),
    writeFile(titleFile, `${record.displayName || "Client App"}\n`),
    writeFile(subtitleFile, `${subtitle}\n`)
  ]);
  const filter = [
    "drawbox=x=0:y=0:w=iw:h=ih:color=0x07090d:t=fill",
    "drawbox=x=72:y=72:w=1776:h=936:color=0x111722:t=fill",
    "drawbox=x=72:y=72:w=1776:h=10:color=0xe0b35a:t=fill",
    `drawtext=fontfile=${drawTextFont}:textfile=${tagFile}:fontcolor=0x80bdd5:fontsize=28:x=(w-text_w)/2:y=h*0.22`,
    `drawtext=fontfile=${drawTextFont}:textfile=${titleFile}:fontcolor=white:fontsize=94:x=(w-text_w)/2:y=h*0.34`,
    `drawtext=fontfile=${drawTextFont}:textfile=${subtitleFile}:fontcolor=0xf2d78c:fontsize=36:x=(w-text_w)/2:y=h*0.52`
  ].join(",");
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x07090d:s=1920x1080:d=1",
    "-vf",
    filter,
    "-frames:v",
    "1",
    outputImage
  ], { cwd: factoryRoot, maxBuffer: 1024 * 1024 * 16 });
  return outputImage;
}

function buildInitials(name = "") {
  const initials = String(name)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 3);
  return initials || "APP";
}

async function generateBrandLogoFromRecord(record, outputImage) {
  const cacheDir = path.dirname(outputImage);
  await ensureDir(cacheDir);
  const titleFile = path.join(cacheDir, "logo-title.txt");
  const subtitleFile = path.join(cacheDir, "logo-subtitle.txt");
  const location = parseLocation(record);
  await Promise.all([
    writeFile(titleFile, `${record.displayName || "Client App"}\n`),
    writeFile(subtitleFile, `${location.city || "Valley Verified"}\n`)
  ]);
  const filter = [
    "format=rgba",
    "drawbox=x=0:y=0:w=iw:h=ih:color=0x00000000:t=fill",
    "drawbox=x=24:y=24:w=1352:h=372:color=0x0c1118@0.94:t=fill",
    "drawbox=x=24:y=24:w=1352:h=10:color=0xe0b35a@0.98:t=fill",
    `drawtext=fontfile=${drawTextFont}:textfile=${titleFile}:fontcolor=white:fontsize=78:x=80:y=120`,
    `drawtext=fontfile=${drawTextFont}:textfile=${subtitleFile}:fontcolor=0x80bdd5:fontsize=28:x=84:y=230`
  ].join(",");
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=black@0.0:s=1400x420:d=1",
    "-vf",
    filter,
    "-frames:v",
    "1",
    outputImage
  ], { cwd: factoryRoot, maxBuffer: 1024 * 1024 * 16 });
  return outputImage;
}

async function generateBrandMarkFromRecord(record, outputSvg) {
  const initials = buildInitials(record.displayName);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${record.displayName}">
  <defs>
    <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#0c1118"/>
      <stop offset="100%" stop-color="#18222f"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#bg)"/>
  <rect x="40" y="40" width="432" height="20" rx="10" fill="#e0b35a" opacity="0.95"/>
  <text x="256" y="308" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="164" font-weight="700" fill="#f7f2e7">${initials}</text>
</svg>
`;
  await ensureDir(path.dirname(outputSvg));
  await writeFile(outputSvg, svg);
  return outputSvg;
}

function aiIdentityAvailable() {
  return Boolean(process.env.OPENAI_API_KEY)
    && String(process.env.VANTA_DISABLE_LIVE_AI ?? "0") !== "1"
    && (String(process.env.VANTA_ALLOW_LIVE_AI ?? "0") === "1" || Boolean(process.env.OPENAI_IMAGE_MODEL));
}

function aiIdentityPrompt(record = {}) {
  const services = Array.isArray(record.services) ? record.services.slice(0, 8).join(", ") : "";
  return [
    `Create one original, professional brand identity image for ${record.displayName || record.clientId || "a client business"}.`,
    record.industry ? `Industry: ${record.industry}.` : "",
    services ? `Services/context: ${services}.` : "",
    "Make a real usable logo/mark source image, not initials, not a plain text wordmark, not a placeholder badge.",
    "Transparent background. Square composition. No mock UI. No fake company initials."
  ].filter(Boolean).join(" ");
}

async function generateAiIdentityImageFromRecord(record, outputImage) {
  if (!aiIdentityAvailable()) return "";
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const baseUrl = String(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const prompt = aiIdentityPrompt(record);
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "low",
      background: "transparent",
      output_format: "png"
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `OpenAI image generation failed with ${response.status}`);
  const base64 = data.data?.[0]?.b64_json || "";
  if (!base64) throw new Error("AI identity image response missing b64_json.");
  await ensureDir(path.dirname(outputImage));
  await writeFile(outputImage, Buffer.from(base64, "base64"));
  await writeJson(`${outputImage}.receipt.json`, {
    provider: "openai-images-api",
    model,
    prompt,
    generatedAt: new Date().toISOString(),
    outputImage: toPosix(path.relative(repoRoot, outputImage)),
    usage: data.usage || null
  });
  return outputImage;
}

async function generateFallbackMediaBundle(record, stillSource) {
  if (!stillSource || !isRasterImage(stillSource)) {
    return { used: false, generated: {} };
  }
  const cacheDir = path.join(factoryRoot, "storage", "generated-motion", record.clientId || "client");
  await ensureDir(cacheDir);
  const generated = {
    heroVideo: path.join(cacheDir, `${record.clientId}-hero.mp4`),
    walkthroughVideo: path.join(cacheDir, `${record.clientId}-walkthrough.mp4`),
    inventoryVideo: path.join(cacheDir, `${record.clientId}-inventory.mp4`),
    verticalVideo: path.join(cacheDir, `${record.clientId}-vertical.mp4`)
  };
  await Promise.all([
    generateMotionLoopFromStill(stillSource, generated.heroVideo, { width: 1920, height: 1080, duration: 6, zoomStep: 0.00045, maxZoom: 1.14 }).catch(() => ""),
    generateMotionLoopFromStill(stillSource, generated.walkthroughVideo, { width: 1920, height: 1080, duration: 7, zoomStep: 0.0003, maxZoom: 1.1 }).catch(() => ""),
    generateMotionLoopFromStill(stillSource, generated.inventoryVideo, { width: 1920, height: 1080, duration: 5, zoomStep: 0.00055, maxZoom: 1.18 }).catch(() => ""),
    generateMotionLoopFromStill(stillSource, generated.verticalVideo, { width: 1080, height: 1920, duration: 6, zoomStep: 0.00035, maxZoom: 1.12 }).catch(() => "")
  ]);
  return {
    used: true,
    generated,
    stillSource
  };
}

function parseStateAndZip(stateValue = "", zipValue = "") {
  const cleanState = String(stateValue || "").trim().toUpperCase();
  const cleanZip = String(zipValue || "").trim();
  return `${cleanState}${cleanZip ? ` ${cleanZip}` : ""}`.trim();
}

async function stageClientAssets(record, appDir) {
  const defaultAssets = {
    logo: path.join(appDir, "assets/brand/client-brand-logo.png"),
    markSvg: path.join(appDir, "assets/brand/client-brand-mark.svg"),
    heroVideo: path.join(appDir, "assets/white-label/videos/hero-loop.mp4"),
    heroPoster: path.join(appDir, "assets/white-label/videos/hero-poster.jpg"),
    walkthroughVideo: path.join(appDir, "assets/white-label/videos/walkthrough.mp4"),
    walkthroughPoster: path.join(appDir, "assets/white-label/videos/walkthrough-poster.jpg"),
    inventoryVideo: path.join(appDir, "assets/white-label/videos/inventory-sizzle.mp4"),
    inventoryPoster: path.join(appDir, "assets/white-label/videos/inventory-sizzle-poster.jpg"),
    verticalVideo: path.join(appDir, "assets/white-label/videos/social-vertical.mp4"),
    verticalPoster: path.join(appDir, "assets/white-label/videos/social-vertical-poster.jpg"),
    qrPng: path.join(appDir, "assets/white-label/qr/client-preview-qr.png"),
    qrSvg: path.join(appDir, "assets/white-label/qr/client-preview-qr.svg"),
    favicon: path.join(appDir, "favicon.png")
  };

  const slug = record.clientId;
  const brandDir = path.join(appDir, "assets", "brand");
  const mediaDir = path.join(appDir, "assets", "client-media", "videos");
  const qrDir = path.join(appDir, "assets", "qr");
  await Promise.all([ensureDir(brandDir), ensureDir(mediaDir), ensureDir(qrDir)]);

  const mediaCandidates = (record.mediaAssets || []).map((item) => item).concat(
    (record.assetVault || []).filter((item) => item.type === "media").map((item) => item.publicPath || item.storagePath)
  );
  const logoCandidates = (record.logoAssets || []).concat(
    (record.assetVault || []).filter((item) => /logo|brand|mark/i.test(item.originalName || item.fileName || "")).map((item) => item.publicPath || item.storagePath)
  );

  const resolved = {
    logo: await resolveCandidatePath(record, logoCandidates[0]),
    markSvg: await resolveCandidatePath(record, logoCandidates.find((item) => String(item).endsWith(".svg")) || logoCandidates[0]),
    heroVideo: await resolveCandidatePath(record, mediaCandidates.find((item) => /\.(mp4|webm|mov)$/i.test(String(item)))),
    heroPoster: await resolveCandidatePath(record, mediaCandidates.find((item) => /\.(png|jpe?g|webp)$/i.test(String(item)))),
    walkthroughVideo: await resolveCandidatePath(record, mediaCandidates.find((item, index) => index > 0 && /\.(mp4|webm|mov)$/i.test(String(item)))) || "",
    walkthroughPoster: await resolveCandidatePath(record, mediaCandidates.find((item, index) => index > 0 && /\.(png|jpe?g|webp)$/i.test(String(item)))) || "",
    inventoryVideo: await resolveCandidatePath(record, mediaCandidates.find((item, index) => index > 1 && /\.(mp4|webm|mov)$/i.test(String(item)))) || "",
    inventoryPoster: await resolveCandidatePath(record, mediaCandidates.find((item, index) => index > 1 && /\.(png|jpe?g|webp)$/i.test(String(item)))) || "",
    verticalVideo: await resolveCandidatePath(record, mediaCandidates.find((item, index) => index > 2 && /\.(mp4|webm|mov)$/i.test(String(item)))) || "",
    verticalPoster: await resolveCandidatePath(record, mediaCandidates.find((item, index) => index > 2 && /\.(png|jpe?g|webp)$/i.test(String(item)))) || ""
  };
  const liveSurface = await discoverLiveSurfaceAssets(record);
  const aiGeneratedLogo = !resolved.logo && !liveSurface.logo
    ? await generateAiIdentityImageFromRecord(record, path.join(factoryRoot, "storage", "generated-brand", record.clientId || "client", `${record.clientId}-ai-identity.png`)).catch(() => "")
    : "";
  const harvestedStillSource = [
    resolved.heroPoster,
    liveSurface.poster,
    resolved.logo,
    liveSurface.logo,
    aiGeneratedLogo
  ].find((candidate) => candidate && isRasterImage(candidate)) || "";
  if (!resolved.logo && !liveSurface.logo && !aiGeneratedLogo) {
    throw new Error("Client identity asset missing. Upload a real logo/image, harvest a live logo, or enable AI identity image generation before building.");
  }
  const generatedBrandSlate = "";
  const motionStillSource = harvestedStillSource || generatedBrandSlate;
  const markSource = resolved.markSvg || resolved.logo || liveSurface.logo || aiGeneratedLogo || defaultAssets.markSvg || defaultAssets.logo;
  const markExt = path.extname(markSource || defaultAssets.markSvg || ".svg") || ".svg";

  const targets = {
    logo: path.join(brandDir, `${slug}-brand-logo.png`),
    mark: path.join(brandDir, `${slug}-brand-mark${markExt.toLowerCase()}`),
    heroVideo: path.join(mediaDir, `${slug}-hero.mp4`),
    heroPoster: path.join(mediaDir, `${slug}-hero-poster.jpg`),
    walkthroughVideo: path.join(mediaDir, `${slug}-walkthrough.mp4`),
    walkthroughPoster: path.join(mediaDir, `${slug}-walkthrough-poster.jpg`),
    inventoryVideo: path.join(mediaDir, `${slug}-inventory-reel.mp4`),
    inventoryPoster: path.join(mediaDir, `${slug}-inventory-reel-poster.jpg`),
    verticalVideo: path.join(mediaDir, `${slug}-social-vertical.mp4`),
    verticalPoster: path.join(mediaDir, `${slug}-social-vertical-poster.jpg`),
    qrPng: path.join(qrDir, `${slug}-app-qr.png`),
    qrSvg: path.join(qrDir, `${slug}-app-qr.svg`),
    favicon: path.join(appDir, "favicon.png")
  };
  const directGeneratedLogo = "";
  const directGeneratedMark = "";
  const fallbackMedia = !resolved.heroVideo && !liveSurface.video
    ? await generateFallbackMediaBundle(record, motionStillSource)
    : { used: false, generated: {}, stillSource: motionStillSource };

  const heroVideoSource = resolved.heroVideo || liveSurface.video || fallbackMedia.generated.heroVideo || defaultAssets.heroVideo;
  const heroPosterSource = resolved.heroPoster || liveSurface.poster || motionStillSource || defaultAssets.heroPoster;
  const walkthroughVideoSource = resolved.walkthroughVideo || resolved.heroVideo || liveSurface.video || fallbackMedia.generated.walkthroughVideo || fallbackMedia.generated.heroVideo || defaultAssets.walkthroughVideo;
  const walkthroughPosterSource = resolved.walkthroughPoster || resolved.heroPoster || liveSurface.poster || motionStillSource || defaultAssets.walkthroughPoster;
  const inventoryVideoSource = resolved.inventoryVideo || resolved.heroVideo || liveSurface.video || fallbackMedia.generated.inventoryVideo || fallbackMedia.generated.heroVideo || defaultAssets.inventoryVideo;
  const inventoryPosterSource = resolved.inventoryPoster || resolved.heroPoster || liveSurface.poster || motionStillSource || defaultAssets.inventoryPoster;
  const verticalVideoSource = resolved.verticalVideo || resolved.heroVideo || liveSurface.video || fallbackMedia.generated.verticalVideo || fallbackMedia.generated.heroVideo || defaultAssets.verticalVideo;
  const verticalPosterSource = resolved.verticalPoster || resolved.heroPoster || liveSurface.poster || motionStillSource || defaultAssets.verticalPoster;

  await copyIfExists(directGeneratedLogo || resolved.logo || liveSurface.logo || aiGeneratedLogo || defaultAssets.logo, targets.logo);
  await copyIfExists(directGeneratedMark || markSource, targets.mark);
  await copyIfExists(heroVideoSource, targets.heroVideo);
  await copyIfExists(heroPosterSource, targets.heroPoster);
  await copyIfExists(walkthroughVideoSource, targets.walkthroughVideo);
  await copyIfExists(walkthroughPosterSource, targets.walkthroughPoster);
  await copyIfExists(inventoryVideoSource, targets.inventoryVideo);
  await copyIfExists(inventoryPosterSource, targets.inventoryPoster);
  await copyIfExists(verticalVideoSource, targets.verticalVideo);
  await copyIfExists(verticalPosterSource, targets.verticalPoster);
  await copyIfExists(defaultAssets.qrPng, targets.qrPng);
  await copyIfExists(defaultAssets.qrSvg, targets.qrSvg);
  await copyIfExists(resolved.logo || liveSurface.logo || aiGeneratedLogo || defaultAssets.favicon, targets.favicon);

  return {
    logoPath: toPosix(path.relative(appDir, targets.logo)),
    markPath: toPosix(path.relative(appDir, targets.mark)),
    heroVideoPath: toPosix(path.relative(appDir, targets.heroVideo)),
    heroPosterPath: toPosix(path.relative(appDir, targets.heroPoster)),
    walkthroughVideoPath: toPosix(path.relative(appDir, targets.walkthroughVideo)),
    walkthroughPosterPath: toPosix(path.relative(appDir, targets.walkthroughPoster)),
    inventoryVideoPath: toPosix(path.relative(appDir, targets.inventoryVideo)),
    inventoryPosterPath: toPosix(path.relative(appDir, targets.inventoryPoster)),
    verticalVideoPath: toPosix(path.relative(appDir, targets.verticalVideo)),
    verticalPosterPath: toPosix(path.relative(appDir, targets.verticalPoster)),
    qrPngPath: toPosix(path.relative(appDir, targets.qrPng)),
    qrSvgPath: toPosix(path.relative(appDir, targets.qrSvg)),
    faviconPath: "favicon.png",
    liveSurface,
    mediaStrategy: {
      hero: resolved.heroVideo || liveSurface.video
        ? "live-video"
        : fallbackMedia.used
          ? (generatedBrandSlate ? "generated-brand-slate" : "generated-from-still")
          : "template-default",
      sourceStill: fallbackMedia.stillSource ? toPosix(path.relative(repoRoot, fallbackMedia.stillSource)) : "",
      generatedMotionDir: fallbackMedia.used ? toPosix(path.relative(repoRoot, path.dirname(fallbackMedia.generated.heroVideo || ""))) : ""
    }
  };
}

function buildClientProfile(record, stagedAssets) {
  const contact = record.contacts?.[0] || {};
  const address = parseLocation(record);
  const phoneDisplay = formatPhoneDisplay(contact.phone);
  const phoneHref = formatPhoneHref(contact.phone);
  const email = String(contact.email || "").trim() || `preview+${record.clientId}@metraiyux.local`;
  const shareUrl = buildShareUrl(record);
  const valleyUrl = inferValleyPath(record);
  const previewCode = record.previewConfig?.accessCode || `${record.clientId}-preview`;
  const previewWorkspaceId = record.previewConfig?.workspaceId || `${record.clientId}-preview-001`;
  const previewWorkspaceName = record.previewConfig?.workspaceName || `${record.displayName} Preview Workspace`;
  const niche = inferNiche(record);
  const availableRoutes = [
    ...(record.publicRoutes || []),
    ...(record.privateRoutes || [])
  ].map((route) => String(route).replace(/^\//, "").replace(/\/$/, "")).filter(Boolean);
  return {
    name: record.displayName,
    nameUpper: record.displayName.toUpperCase(),
    slug: record.clientId,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    street: address.street,
    fullAddress: address.fullAddress,
    stateZip: parseStateAndZip(address.state, address.postalCode),
    phoneDisplay,
    phoneHref,
    phoneDigits: digitsOnly(contact.phone),
    email,
    services: record.services || [],
    shareUrl,
    shareUrlEncoded: encodeURIComponent(shareUrl),
    valleyUrl,
    previewCode,
    previewWorkspaceId,
    previewWorkspaceName,
    workspaceSlug: record.previewConfig?.workspaceSlug || record.clientId,
    freeTesterDays: Number(record.workspacePlan?.freeTesterDays ?? 7),
    includedScans: Number(record.workspacePlan?.includedScans ?? 7),
    includedCommands: Number(record.workspacePlan?.includedCommands ?? 25),
    continuationDiscountMonths: Number(record.workspacePlan?.continuationDiscountMonths ?? 6),
    niche,
    availableRoutes,
    ...stagedAssets
  };
}

function pickAvailableRoute(profile, candidates = [], fallback = "index.html") {
  const available = new Set(profile.availableRoutes || []);
  for (const candidate of candidates) {
    const normalized = String(candidate || "").replace(/^\//, "").replace(/\/$/, "");
    if (available.has(normalized)) return normalized;
  }
  return fallback;
}

function buildSignatureActions(profile) {
  if (profile.niche === "industrial-ops") {
    return [
      {
        label: "Start quote",
        href: pickAvailableRoute(profile, ["quote.html", "contact.html", "scan.html"], "index.html"),
        classes: "btn"
      },
      {
        label: "Open scan route",
        href: pickAvailableRoute(profile, ["scan.html", "preview.html", "contact.html"], "index.html"),
        classes: "btn secondary"
      }
    ];
  }

  if (profile.niche === "trading-card") {
    return [
      {
        label: "Open inventory",
        href: pickAvailableRoute(profile, ["inventory.html", "specials.html", "gallery.html"], "index.html"),
        classes: "btn"
      },
      {
        label: "Open preview",
        href: pickAvailableRoute(profile, ["workspace-preview.html", "preview.html", "faq.html"], "index.html"),
        classes: "btn secondary"
      }
    ];
  }

  return [
    {
      label: "Open gallery",
      href: pickAvailableRoute(profile, ["gallery.html", "services.html", "faq.html"], "index.html"),
      classes: "btn"
    },
    {
      label: "Open preview",
      href: pickAvailableRoute(profile, ["workspace-preview.html", "preview.html", "contact.html"], "index.html"),
      classes: "btn secondary"
    }
  ];
}

function buildReplacementPairs(profile) {
  const previewRoute = pickAvailableRoute(profile, ["workspace-preview.html", "preview.html"], "index.html");
  const previewUrl = `${profile.shareUrl.replace(/\/$/, "")}/${previewRoute}`;
  return [
    ["Client Brand Private Preview", profile.previewWorkspaceName],
    ["Client Brand Workspace Preview", `${profile.name} Workspace Preview`],
    ["Client Brand preview workspace", `${profile.name} preview workspace`],
    ["Client Brand app preview", `${profile.name} app preview`],
    ["Client Brand private app preview", `${profile.name} live app preview`],
    ["Client Brand", profile.name],
    ["CLIENT BRAND", profile.nameUpper],
    ["Client City", profile.city],
    ["Client State", profile.state],
    ["ST 00000", profile.stateZip],
    ["123 Main Street", profile.street || profile.fullAddress],
    ["(000) 000-0000", profile.phoneDisplay],
    ["000-000-0000", profile.phoneDisplay.replace(/[() ]/g, "").replace("-", "-")],
    ["0000000000", profile.phoneDigits || "0000000000"],
    ["+1-000-000-0000", profile.phoneDigits ? `+1-${profile.phoneDigits.slice(0, 3)}-${profile.phoneDigits.slice(3, 6)}-${profile.phoneDigits.slice(6)}` : "+1-000-000-0000"],
    ["preview@client-brand-preview.com", profile.email],
    ["client-brand-preview-001", profile.previewWorkspaceId],
    ["client-brand.pages.dev", new URL(profile.shareUrl).hostname],
    ["https://client-brand.pages.dev/", profile.shareUrl],
    ["https://example.com/workspace-preview/", previewUrl],
    ["https://valley-verified.pages.dev/business/client-brand/", profile.valleyUrl],
    ["client-preview", profile.previewCode],
    ["workspaceId: \"client-brand-preview-001\"", `workspaceId: "${profile.previewWorkspaceId}"`],
    ["workspaceSlug: \"client-brand\"", `workspaceSlug: "${profile.workspaceSlug}"`],
    ["clientName: \"Client Brand\"", `clientName: "${profile.name}"`],
    ["appName: \"Client Brand Workspace Preview\"", `appName: "${profile.name} Workspace Preview"`],
    ["source_app: \"client-brand\"", `source_app: "${profile.slug}"`],
    ["storageKey: \"metraiyux.workspaceGate.client-brand-preview-001\"", `storageKey: "metraiyux.workspaceGate.${profile.previewWorkspaceId}"`],
    ["title: \"Client Brand preview workspace\"", `title: "${profile.name} preview workspace"`],
    ["Pictures carried into the template.", "Fresh media carried into the live client build."],
    ["The first-screen video, walkthrough, inventory reel, and vertical cut are neutral placeholders ready for client footage.", "Hero video, walkthrough, inventory reel, and social cut are wired for real client media instead of template loops."],
    ["Give client-specific niche offers, seasonal lines, or specialty services their own lane.", profile.niche === "trading-card"
      ? "Give booster drops, singles, sealed product, league promos, or event inventory their own lane."
      : profile.niche === "industrial-ops"
        ? "Give same-day supply lanes, custom runs, core yard stock, or specialty operations their own lane."
        : "Give signature packages, seasonal offers, or niche services their own lane."]
  ];
}

function applyLiteralReplacements(content, profile) {
  let next = content;
  const firstScreenVideoPath = profile.walkthroughVideoPath || profile.heroVideoPath;
  const firstScreenPosterPath = profile.walkthroughPosterPath || profile.heroPosterPath;
  for (const [from, to] of buildReplacementPairs(profile)) {
    next = next.split(from).join(to);
  }
  next = next
    .split("assets/brand/client-brand-logo.png").join(profile.logoPath)
    .split("assets/brand/client-brand-mark.svg").join(profile.markPath)
    .split("/assets/brand/client-brand-logo.png").join(`/${profile.logoPath}`)
    .split("/assets/brand/client-brand-mark.svg").join(`/${profile.markPath}`)
    .split("assets/white-label/videos/hero-loop.mp4").join(firstScreenVideoPath)
    .split("assets/white-label/videos/hero-poster.jpg").join(firstScreenPosterPath)
    .split("/assets/white-label/videos/hero-loop.mp4").join(`/${firstScreenVideoPath}`)
    .split("/assets/white-label/videos/hero-poster.jpg").join(`/${firstScreenPosterPath}`)
    .split("assets/white-label/videos/walkthrough.mp4").join(profile.walkthroughVideoPath)
    .split("assets/white-label/videos/walkthrough-poster.jpg").join(profile.walkthroughPosterPath)
    .split("/assets/white-label/videos/walkthrough.mp4").join(`/${profile.walkthroughVideoPath}`)
    .split("/assets/white-label/videos/walkthrough-poster.jpg").join(`/${profile.walkthroughPosterPath}`)
    .split("assets/white-label/videos/inventory-sizzle.mp4").join(profile.inventoryVideoPath)
    .split("assets/white-label/videos/inventory-sizzle-poster.jpg").join(profile.inventoryPosterPath)
    .split("/assets/white-label/videos/inventory-sizzle.mp4").join(`/${profile.inventoryVideoPath}`)
    .split("/assets/white-label/videos/inventory-sizzle-poster.jpg").join(`/${profile.inventoryPosterPath}`)
    .split("assets/white-label/videos/social-vertical.mp4").join(profile.verticalVideoPath)
    .split("assets/white-label/videos/social-vertical-poster.jpg").join(profile.verticalPosterPath)
    .split("/assets/white-label/videos/social-vertical.mp4").join(`/${profile.verticalVideoPath}`)
    .split("/assets/white-label/videos/social-vertical-poster.jpg").join(`/${profile.verticalPosterPath}`)
    .split("assets/white-label/qr/client-preview-qr.png").join(profile.qrPngPath)
    .split("assets/white-label/qr/client-preview-qr.svg").join(profile.qrSvgPath)
    .split("/assets/white-label/qr/client-preview-qr.png").join(`/${profile.qrPngPath}`)
    .split("/assets/white-label/qr/client-preview-qr.svg").join(`/${profile.qrSvgPath}`);
  next = next
    .replace(/\/assets\/white-label\/qr\/[^"'()\s]+\.svg/g, `/${profile.qrSvgPath}`)
    .replace(/\/assets\/white-label\/qr\/[^"'()\s]+\.png/g, `/${profile.qrPngPath}`)
    .replace(/assets\/white-label\/qr\/[^"'()\s]+\.svg/g, profile.qrSvgPath)
    .replace(/assets\/white-label\/qr\/[^"'()\s]+\.png/g, profile.qrPngPath)
    .replace(/client@client-brand-preview\.example/g, profile.email);
  next = next
    .replace(new RegExp(`assets/brand/${escapeRegExp(profile.slug)}-brand-mark\\.[a-z0-9]+`, "gi"), profile.markPath)
    .replace(new RegExp(`/assets/brand/${escapeRegExp(profile.slug)}-brand-mark\\.[a-z0-9]+`, "gi"), `/${profile.markPath}`)
    .replace(new RegExp(`assets/brand/${escapeRegExp(profile.slug)}-brand-logo\\.[a-z0-9]+`, "gi"), profile.logoPath)
    .replace(new RegExp(`/assets/brand/${escapeRegExp(profile.slug)}-brand-logo\\.[a-z0-9]+`, "gi"), `/${profile.logoPath}`);
  return next;
}

function rewriteLocalReference(rawValue, attr, fileDir, appDir, routeMap) {
  if (attr === "href" && rawValue === "") {
    return relativeWebPath(fileDir, path.join(appDir, "index.html"));
  }
  if (!looksLikePathReference(rawValue) || isSkippableReference(rawValue)) return rawValue;

  const clean = rawValue.split("?")[0].split("#")[0];
  const aliases = [
    rawValue,
    clean,
    clean.replace(/\/+$/, ""),
    clean.replace(/\.html$/i, ""),
    clean.endsWith(".html") ? clean.replace(/\.html$/i, "") : `${clean}.html`
  ];
  for (const alias of aliases) {
    if (routeMap.has(alias)) return relativeWebPath(fileDir, routeMap.get(alias));
  }
  if (rawValue.startsWith("/")) {
    return relativeWebPath(fileDir, path.join(appDir, clean.replace(/^\//, "")));
  }
  const localTarget = path.resolve(fileDir, clean);
  if (existsSync(localTarget)) return rawValue;
  const rootTarget = path.resolve(appDir, clean);
  if (existsSync(rootTarget)) return relativeWebPath(fileDir, rootTarget);
  return rawValue;
}

function rewriteContentPaths(content, filePath, appDir, routeMap) {
  const fileDir = path.dirname(filePath);
  let next = content.replace(/(href|src|poster|content)=("([^"]*)"|'([^']*)')/g, (full, attr, quoted, dbl, sgl) => {
    const value = dbl ?? sgl ?? "";
    if (attr === "content" && !looksLikePathReference(value)) return full;
    const rewritten = rewriteLocalReference(value, attr, fileDir, appDir, routeMap);
    const quote = quoted.startsWith("'") ? "'" : "\"";
    return `${attr}=${quote}${rewritten}${quote}`;
  });

  next = next.replace(/url\((['"]?)([^'")]+)\1\)/g, (full, quote, value) => {
    if (!looksLikePathReference(value)) return full;
    const rewritten = rewriteLocalReference(value, "url()", fileDir, appDir, routeMap);
    return `url(${quote}${rewritten}${quote})`;
  });
  return next;
}

function buildSignatureSection(profile) {
  const actions = buildSignatureActions(profile);
  const services = profile.services.slice(0, 6).map((service) => `<span>${service}</span>`).join("");
  const leadLine = profile.niche === "trading-card"
    ? "A motion-first collector section that makes the store feel like the card itself."
    : profile.niche === "industrial-ops"
      ? "A live operations module that frames the business like a command deck instead of a generic brochure."
      : "A signature product block that gives the app its own visual hook instead of template wallpaper.";
  const title = profile.niche === "trading-card" ? "Collector Mode" : profile.niche === "industrial-ops" ? "Operations Deck" : "Signature Build";
  const cardFront = profile.niche === "trading-card"
    ? "Live singles, sealed drops, league nights, and trade-ready inventory."
    : profile.niche === "industrial-ops"
      ? "Same-day turns, core stock, custom work, and operational proof."
      : "Client-specific offers, trust proof, and app-first conversion routes.";
  const cardBack = profile.niche === "trading-card"
    ? "Use this lane for rotating drops, event promos, featured decks, or membership rewards."
    : profile.niche === "industrial-ops"
      ? "Use this lane for yard snapshots, dispatch metrics, turnaround promises, or quote paths."
      : "Use this lane for custom bundles, featured service stacks, or founder proof.";
  return `
  <section class="section factory-signature-section" id="factory-signature-module">
    <div class="wrap factory-signature-grid">
      <div class="factory-signature-copy">
        <div class="kicker">Factory signature module</div>
        <h2>${title}</h2>
        <p>${leadLine}</p>
        <div class="factory-signature-pills">${services}</div>
        <div class="hero-actions">
          <a class="${actions[0].classes}" href="${actions[0].href}">${actions[0].label}</a>
          <a class="${actions[1].classes}" href="${actions[1].href}">${actions[1].label}</a>
          <a class="btn secondary" href="${profile.valleyUrl}" target="_blank" rel="noopener">Valley Verified</a>
        </div>
      </div>
      <div class="factory-signature-stage">
        <article class="factory-signature-card" tabindex="0" aria-label="${profile.name} signature card">
          <div class="factory-signature-face factory-signature-front">
            <div class="factory-card-brand">
              <img src="${profile.markPath}" alt="${profile.name} brand mark">
              <strong>${profile.name}</strong>
            </div>
            <span class="factory-card-tag">${profile.city}, ${profile.state}</span>
            <h3>${title}</h3>
            <p>${cardFront}</p>
          </div>
          <div class="factory-signature-face factory-signature-back">
            <span class="factory-card-tag">Built from the app</span>
            <h3>Not a generic hero</h3>
            <p>${cardBack}</p>
            <div class="factory-card-meta">
              <span>${profile.freeTesterDays} day workspace</span>
              <span>${profile.includedScans} scans</span>
              <span>${profile.includedCommands} commands</span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>`;
}

async function patchStyles(appDir) {
  const stylesPath = path.join(appDir, "styles.css");
  if (!(await exists(stylesPath))) return;
  const current = await readFile(stylesPath, "utf8");
  if (current.includes(ENHANCE_MARKER)) return;
  const block = `

/* ${ENHANCE_MARKER} */
.factory-signature-section{position:relative;overflow:hidden}
.factory-signature-section::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 18% 18%,rgba(255,153,0,.14),transparent 38%),radial-gradient(circle at 82% 12%,rgba(0,194,255,.12),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.02),rgba(255,255,255,0));pointer-events:none}
.factory-signature-grid{display:grid;grid-template-columns:minmax(0,.92fr) minmax(340px,.88fr);gap:26px;align-items:center}
.factory-signature-copy{display:grid;gap:16px}
.factory-signature-pills{display:flex;flex-wrap:wrap;gap:10px}
.factory-signature-pills span,.factory-card-meta span{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:8px 12px;background:rgba(255,255,255,.06);font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.factory-signature-stage{display:grid;place-items:center;perspective:1800px}
.factory-signature-card{position:relative;width:min(100%,420px);aspect-ratio:3 / 4;border-radius:24px;transform-style:preserve-3d;transition:transform .9s cubic-bezier(.2,.8,.2,1),box-shadow .5s ease;box-shadow:0 30px 80px rgba(0,0,0,.35);outline:none}
.factory-signature-card:hover,.factory-signature-card:focus-visible{transform:rotateY(180deg) rotateX(4deg) translateY(-6px);box-shadow:0 40px 95px rgba(0,0,0,.42)}
.factory-signature-face{position:absolute;inset:0;border-radius:24px;backface-visibility:hidden;display:grid;align-content:space-between;padding:24px;background:linear-gradient(160deg,rgba(3,8,16,.92),rgba(10,18,29,.98));border:1px solid rgba(255,255,255,.14);overflow:hidden}
.factory-signature-face::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.14),transparent 28%,transparent 62%,rgba(255,153,0,.18));pointer-events:none}
.factory-signature-back{transform:rotateY(180deg);background:linear-gradient(160deg,rgba(7,16,26,.96),rgba(15,26,36,.98))}
.factory-card-brand{display:flex;align-items:center;gap:12px;position:relative;z-index:1}
.factory-card-brand img{width:56px;height:56px;object-fit:contain;border-radius:14px;background:rgba(255,255,255,.08);padding:8px}
.factory-card-brand strong{font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.factory-card-tag{position:relative;z-index:1;display:inline-flex;width:max-content;border-radius:999px;padding:7px 11px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#f5c35c}
.factory-signature-face h3,.factory-signature-face p,.factory-card-meta{position:relative;z-index:1}
.factory-signature-face h3{margin:0;font-family:var(--display);font-size:clamp(2.2rem,5vw,3.6rem);line-height:.95}
.factory-signature-face p{margin:0;color:rgba(246,248,243,.84);line-height:1.6}
.factory-card-meta{display:flex;flex-wrap:wrap;gap:10px}
@media(max-width:960px){.factory-signature-grid{grid-template-columns:1fr}.factory-signature-stage{margin-top:4px}}
`;
  await writeFile(stylesPath, `${current.trimEnd()}\n${block}`);
}

async function patchScript(appDir) {
  const scriptPath = path.join(appDir, "script.js");
  if (!(await exists(scriptPath))) return;
  const current = await readFile(scriptPath, "utf8");
  if (current.includes(SIGNATURE_SCRIPT_MARKER)) return;
  const block = `

(function(){
  if(window.${SIGNATURE_SCRIPT_MARKER}) return;
  window.${SIGNATURE_SCRIPT_MARKER} = true;
  const cards = document.querySelectorAll('.factory-signature-card');
  if(!cards.length) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reducedMotion) return;
  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = \`rotateY(\${x * 10}deg) rotateX(\${-y * 12}deg) translateY(-6px)\`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
})();
`;
  await writeFile(scriptPath, `${current.trimEnd()}\n${block}`);
}

async function patchSiteData(appDir, profile) {
  const siteDataPath = path.join(appDir, "site-data.json");
  if (!(await exists(siteDataPath))) return;
  const data = JSON.parse(await readFile(siteDataPath, "utf8"));
  data.business = {
    ...(data.business || {}),
    name: profile.name,
    city: profile.city,
    state: profile.state,
    address: profile.fullAddress,
    phone_display: profile.phoneDisplay,
    phone_href: profile.phoneHref,
    email: profile.email,
    valley_verified_url: profile.valleyUrl
  };
  data.preview = {
    ...(data.preview || {}),
    workspace_email: profile.email,
    access_code: profile.previewCode,
    workspace_id: profile.previewWorkspaceId,
    workspace_name: profile.previewWorkspaceName,
    workspace_days: profile.freeTesterDays,
    scans: profile.includedScans,
    commands: profile.includedCommands
  };
  data.media = {
    ...(data.media || {}),
    hero_video: profile.heroVideoPath,
    hero_poster: profile.heroPosterPath,
    walkthrough_video: profile.walkthroughVideoPath,
    walkthrough_poster: profile.walkthroughPosterPath,
    inventory_video: profile.inventoryVideoPath,
    inventory_poster: profile.inventoryPosterPath,
    vertical_video: profile.verticalVideoPath,
    vertical_poster: profile.verticalPosterPath
  };
  await writeFile(siteDataPath, `${JSON.stringify(data, null, 2)}\n`);
}

async function updateTextFiles(appDir, profile) {
  const files = await walk(appDir, { skip: ignoreNames });
  const routeMap = buildRouteMap(files, appDir);

  await Promise.all(files.filter((file) => textExtensions.has(file.ext)).map(async (file) => {
    let content = await readFile(file.path, "utf8");
    const before = content;
    content = applyLiteralReplacements(content, profile);
    content = rewriteContentPaths(content, file.path, appDir, routeMap);

    if (file.relative === "index.html") {
      if (content.includes('id="factory-signature-module"')) {
        content = content.replace(
          /<section class="section factory-signature-section" id="factory-signature-module">[\s\S]*?<\/section>/,
          buildSignatureSection(profile)
        );
      } else if (!content.includes("factory-signature-section")) {
        content = content.replace("</main>", `${buildSignatureSection(profile)}\n</main>`);
      }
    }

    if (content !== before) {
      await writeFile(file.path, content);
    }
  }));
}

export async function runFactoryEnhance(payload = {}) {
  const clientId = slugify(payload.clientId || "skye-app-template");
  const record = await readRecord(clientId);
  const app = latestGeneratedApp(record);
  if (!app?.publishFolder) {
    throw new Error(`No generated app folder is available for ${clientId}. Run the core pass first.`);
  }

  const appDir = path.resolve(app.publishFolder);
  const stagedAssets = await stageClientAssets(record, appDir);
  const profile = buildClientProfile(record, stagedAssets);

  await updateTextFiles(appDir, profile);
  await patchStyles(appDir);
  await patchScript(appDir);
  await patchSiteData(appDir, profile);

  const identityMapPath = path.join(appDir, "CLIENT_IDENTITY_MAP.json");
  const valleyPayloadPath = path.join(appDir, "VALLEY_SYNC_PAYLOAD.json");
  const reportPath = path.join(appDir, "CLIENT_ENHANCEMENT_REPORT.json");

  const valleyPathname = new URL(profile.valleyUrl).pathname;
  const workspacePreviewRoute = pickAvailableRoute(profile, ["workspace-preview.html", "preview.html", "faq.html"], "index.html");
  await writeJson(identityMapPath, profile);
  await writeJson(valleyPayloadPath, {
    clientId: record.clientId,
    displayName: record.displayName,
    industry: record.industry,
    contact: {
      phone: profile.phoneDisplay,
      email: profile.email
    },
    address: {
      street: profile.street,
      city: profile.city,
      state: profile.state,
      postalCode: profile.postalCode
    },
    app: {
      liveUrl: profile.shareUrl,
      workspacePreviewUrl: `${profile.shareUrl.replace(/\/$/, "")}/${workspacePreviewRoute}`,
      valleyProfilePath: valleyPathname,
      qrSvg: profile.qrSvgPath,
      heroVideo: profile.heroVideoPath
    },
    design: {
      signatureModule: profile.niche
    }
  });
  await writeJson(reportPath, {
    clientId,
    enhancedAt: new Date().toISOString(),
    publishFolder: toPosix(path.relative(repoRoot, appDir)),
    profile,
    outputs: {
      identityMap: toPosix(path.relative(repoRoot, identityMapPath)),
      valleyPayload: toPosix(path.relative(repoRoot, valleyPayloadPath))
    },
    liveSurface: profile.liveSurface || {},
    mediaStrategy: profile.mediaStrategy || {}
  });

  const next = markState({
    ...record,
    brandProfile: {
      ...(record.brandProfile || {}),
      city: profile.city,
      state: profile.state,
      postalCode: profile.postalCode,
      publicUrl: profile.shareUrl
    },
    previewConfig: {
      ...(record.previewConfig || {}),
      accessCode: profile.previewCode,
      workspaceId: profile.previewWorkspaceId,
      workspaceName: profile.previewWorkspaceName,
      workspaceSlug: profile.workspaceSlug
    },
    valleySync: {
      ...(record.valleySync || {}),
      profileUrl: profile.valleyUrl,
      profilePath: valleyPathname
    },
    designProfile: {
      ...(record.designProfile || {}),
      signatureModule: profile.niche
    },
    enhancementReports: Array.from(new Set([...(record.enhancementReports || []), toPosix(path.relative(repoRoot, reportPath))]))
  }, "app-generated");

  const event = await appendEvent(clientId, "enhanced-client-build", `Enhanced generated app for ${record.displayName}`, {
    artifact: toPosix(path.relative(repoRoot, reportPath))
  });
  const saved = await saveRecord(next, event);

  return {
    ok: true,
    clientId,
    record: saved,
    profile,
    reportPath: toPosix(path.relative(repoRoot, reportPath))
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const result = await runFactoryEnhance({ clientId: process.argv[2] || "skye-app-template" });
  console.log(JSON.stringify(result, null, 2));
}
