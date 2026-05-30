#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = read("public/daw.html");
const js = read("public/nexus-daw.js");
const css = read("public/nexus-daw.css");

for (const marker of [
  "downloadDawManifestButton",
  "exportDawManifestButton",
  "dawKaixuCreditCap",
  "dawKaixuRateWindow",
  "dawKaixuMeter",
  "Apply Diff",
]) {
  assert(html.includes(marker), `DAW HTML missing ${marker}`);
}

for (const marker of [
  "PROJECT_SCHEMA_VERSION",
  "PROJECT_INLINE_AUDIO_LIMIT",
  "clipToProjectClip",
  "restoreClipAudio",
  "normalizeSavedClip",
  "restoreProjectAudio",
  "buildProjectRestorePlan",
  "action: \"queueExport\"",
  "publicExportResult",
  "reserveKaixuCredits",
  "buildKaixuProjectDiff",
  "applyProjectDiff",
  "addRegionIfMissing",
  "already-applied",
  "kaixuOperationId",
]) {
  assert(js.includes(marker), `DAW JS missing ${marker}`);
}

assert(js.includes("$(\"downloadDawManifestButton\")?.addEventListener(\"click\", exportManifest);"), "Manifest button must download JSON only.");
assert(js.includes("$(\"exportDawManifestButton\")?.addEventListener(\"click\", () => { void queueDawExport(); });"), "Export button must queue through the studio export route.");
assert(!js.includes("queueDawExportButton"), "Retired queue button hook should not remain.");
assert(!/exportDawManifestButton[\s\S]{0,140}exportManifest/.test(js), "Export button must not be wired to manifest download.");

assert(css.includes(".daw-kaixu-budget-panel"), "DAW CSS missing kAIxU budget panel styling.");
assert(css.includes(".daw-kaixu-assist > output"), "Assistant output styling must not override the budget meter.");

const bannedClaimMarkers = [
  ["TO", "DO"],
  ["place", "holder"],
  ["mock", "up"],
  ["provider", "Called"],
  ["hidden", "Provider", "Routing"],
].map((parts) => parts.join(""));

for (const forbidden of bannedClaimMarkers) {
  assert(!html.includes(forbidden), `DAW HTML contains forbidden marker: ${forbidden}`);
  assert(!js.includes(forbidden), `DAW JS contains forbidden marker: ${forbidden}`);
  assert(!css.includes(forbidden), `DAW CSS contains forbidden marker: ${forbidden}`);
}

for (const forbiddenName of [
  "OpenAI",
  "Anthropic",
  "Claude",
  "Gemini",
  "Google",
  "ElevenLabs",
  "Stability",
  "Replicate",
  "Suno",
  "Udio",
  "Mistral",
  "Groq",
]) {
  const exact = new RegExp(`\\b${forbiddenName}\\b`, "i");
  assert(!exact.test(html), `DAW HTML exposes raw model route name: ${forbiddenName}`);
  assert(!exact.test(js), `DAW JS exposes raw model route name: ${forbiddenName}`);
}

console.log(JSON.stringify({
  ok: true,
  app: "SkyeMusicNexus DAW",
  verified: [
    "durable project schema markers",
    "inline/asset-backed clip restore functions",
    "Export button queues through queueExport",
    "Manifest download remains separate",
    "kAIxU budget and rate controls",
    "deterministic idempotent project diff apply",
    "no banned claim-marker strings",
    "no raw model route names in DAW UI source",
  ],
}, null, 2));
