#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(file) {
  const target = path.join(root, file);
  assert(fs.existsSync(target), `${file} missing`);
  return fs.readFileSync(target, "utf8");
}

function parse(response) {
  return JSON.parse(response.body || "{}");
}

async function call(handler, { method = "GET", body, authToken, query = {} } = {}) {
  return handler.handler({
    httpMethod: method,
    queryStringParameters: query,
    headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    body: body === undefined ? "" : JSON.stringify(body),
  });
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signJwt(privateKey, payload) {
  const header = base64urlJson({ alg: "RS256", typ: "JWT", kid: "fs27-proof-key" });
  const body = base64urlJson({
    iss: "local://skygatefs13/proof",
    aud: "skygatefs13",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  });
  const signature = crypto.sign("RSA-SHA256", Buffer.from(`${header}.${body}`), privateKey).toString("base64url");
  return `${header}.${body}.${signature}`;
}

const dawHtml = read("public/daw.html");
const dawJs = read("public/nexus-daw.js");
const dawCss = read("public/nexus-daw.css");
const stemsHtml = read("public/stems.html");
const exportsHtml = read("public/exports.html");
const discoverHtml = read("public/discover.html");
const feedHtml = read("public/feed.html");
const createJs = read("public/open-source-studio.js");
const createCss = read("public/open-source-studio.css");
const rootShellHtml = read("index.html");
const studioFunctionSource = read("netlify/functions/music-studio.js");
const indexHtml = read("public/index.html");
const uploadHtml = read("public/upload.html");
const playerHtml = read("public/player.html");
const releasesHtml = read("public/releases.html");
const rightsHtml = read("public/rights.html");
const exchangeHtml = read("public/exchange.html");
const adminHtml = read("public/admin.html");
const localServer = read("scripts/local-dev-server.mjs");
const netlifyToml = read("netlify.toml");
const runtimeContract = JSON.parse(read("src/runtime-contract.json"));
const nativeManifest = JSON.parse(read("open-source/open-source-manifest.json"));

for (const marker of [
  "SkyeMusicNexus // Native DAW",
  "dawTrackGrid",
  "dawMixerChannels",
  "dawPads",
  "dawKeys",
  "audioEngineButton",
  "dawAudioStatus",
  "dawWorkbenchBody",
  "dawStatusProject",
  "saveDawProjectButton",
  "exportDawManifestButton",
  "undoDawButton",
  "splitRegionButton",
  "dawSoundLibrary",
  "mixdownDawButton",
  "micRecordButton",
  "midiDawButton",
  "nexus-daw.js",
]) {
  assert(dawHtml.includes(marker), `public/daw.html missing ${marker}`);
}
assert(!dawHtml.includes("<iframe"), "public/daw.html must not embed a DAW iframe");
assert(!dawHtml.toLowerCase().includes("open" + "daw"), "public/daw.html still references an external DAW brand");
assert(dawJs.includes("AudioContext"), "nexus-daw.js missing WebAudio sketching");
assert(dawJs.includes("__SKYE_NEXUS_DAW"), "nexus-daw.js missing browser audio runtime proof");
assert(dawJs.includes("decodeAudioData"), "nexus-daw.js missing imported clip decoding");
assert(dawJs.includes("keyboardNoteCodes"), "nexus-daw.js missing physical keyboard note mapping");
assert(dawJs.includes("clipPreviewEvents"), "nexus-daw.js missing imported clip preview proof");
assert(dawJs.includes("buildWorkbenchFiles"), "nexus-daw.js missing donor-derived session workbench file model");
assert(dawJs.includes("splitSelectedRegion"), "nexus-daw.js missing region split editing");
assert(dawJs.includes("renderMixdownWav"), "nexus-daw.js missing browser WAV mixdown rendering");
assert(dawJs.includes("MediaRecorder"), "nexus-daw.js missing microphone recorder integration");
assert(dawJs.includes("requestMIDIAccess"), "nexus-daw.js missing Web MIDI integration");
assert(dawJs.includes("soundPackEvents"), "nexus-daw.js missing loop-pack insertion proof");
assert(dawJs.includes("metronomeEnabled"), "nexus-daw.js missing metronome state");
assert(dawJs.includes("SkyeMusicNexus Native DAW"), "nexus-daw.js missing native DAW project marker");
assert(dawJs.includes("releaseForgeLine"), "nexus-daw.js missing Release Forge manifest export");
assert(dawCss.includes(".native-daw-shell"), "nexus-daw.css missing fullscreen DAW shell styling");
assert(dawCss.includes(".daw-activity-rail"), "nexus-daw.css missing donor-derived DAW activity rail styling");
assert(dawCss.includes(".daw-edit-tools"), "nexus-daw.css missing DAW edit tool styling");
assert(dawCss.includes(".daw-region.is-selected"), "nexus-daw.css missing selected-region styling");

for (const [file, html, marker] of [
  ["public/stems.html", stemsHtml, "Stem Vault"],
  ["public/exports.html", exportsHtml, "Export Forge"],
  ["public/discover.html", discoverHtml, "Spotify-style"],
  ["public/feed.html", feedHtml, "Instagram-style"],
]) {
  assert(html.includes(marker), `${file} missing ${marker}`);
}

for (const page of [indexHtml, uploadHtml, playerHtml, releasesHtml, rightsHtml, exchangeHtml, stemsHtml, exportsHtml, discoverHtml, feedHtml]) {
  assert(!page.includes("./create.html"), "deleted standalone song app link is still present in an artist room");
}
assert(!adminHtml.includes("./create.html"), "deleted standalone song app link is still present in protected review stage");
assert(!rootShellHtml.includes("./public/create.html"), "root launch matrix still links the deleted standalone song app");
assert(rootShellHtml.includes("./public/daw.html"), "root launch matrix missing DAW Room");
assert(!fs.existsSync(path.join(root, "open-source/vendor")), "third-party DAW vendor folder should not exist");
assert(!fs.existsSync(path.join(root, "open-source/scripts/run-" + "open" + "daw" + "-studio.sh")), "third-party DAW runner should not exist");
assert(nativeManifest.nativeModules.some((item) => item.path === "public/daw.html"), "native manifest is missing DAW module");

for (const marker of [
  "createSkyGateAuth",
  "music-studio",
  "saveProject",
  "queueExport",
  "SkyeMusicNexus Native DAW",
  "Release Forge",
]) {
  assert(createJs.includes(marker), `open-source-studio.js missing ${marker}`);
}
assert(studioFunctionSource.includes("registerEngine"), "music-studio.js is missing module registration support");
assert(!createJs.includes("proof_"), "open-source-studio.js still mints fake local proof tokens");
assert(createJs.includes("MetrAIyuxGateBridge"), "open-source-studio.js is missing the shared Gate bridge");
const retiredMusicSessionKey = "SKYE_MUSIC_NEXUS" + "_GATE_SESSION";
assert(!createJs.includes(retiredMusicSessionKey), "open-source-studio.js still reads the retired Music Nexus session key");
assert(!createCss.includes("clamp("), "open-source-studio.css should not use viewport-scaled type");
assert(!createCss.includes("letter-spacing: -"), "open-source-studio.css should not use negative tracking");
assert(!createCss.includes("iframe"), "open-source-studio.css still has iframe DAW styling");
assert(localServer.includes('"music-studio"'), "local-dev-server is missing music-studio routing");
assert(localServer.includes("permissions-policy"), "local-dev-server is missing cross-origin-isolated permissions policy");
assert(netlifyToml.includes("/api/music/studio"), "netlify.toml is missing the studio redirect");
assert(netlifyToml.includes("Permissions-Policy"), "netlify.toml is missing cross-origin-isolated permissions policy");
assert(!runtimeContract.launchTargets.some((target) => target.href === "./public/create.html"), "runtime contract still exposes the deleted standalone song app");
assert(runtimeContract.launchTargets.some((target) => target.href === "./public/daw.html"), "runtime contract is missing DAW launch target");
assert(runtimeContract.launchTargets.some((target) => target.href === "./public/feed.html"), "runtime contract is missing Feed launch target");
assert(runtimeContract.frontEndSystem.forbidden.includes("third-party DAW iframe"), "runtime contract must forbid third-party DAW iframe");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skye-musicnexus-studio-"));
process.env.MUSIC_NEXUS_DATA_DIR = tmpDir;
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.SKYGATE_PUBLIC_KEY_PEM = publicKey.export({ type: "spki", format: "pem" });
process.env.SKYGATE_EXPECTED_AUDIENCE = "skygatefs13";
process.env.SKYGATE_ISSUER = "local://skygatefs13/proof";

const session = require(path.join(root, "netlify/functions/skygate-session.js"));
const studio = require(path.join(root, "netlify/functions/music-studio.js"));

const unauthRead = await call(studio, { method: "GET" });
assert(unauthRead.statusCode === 401, `unauthenticated studio read escaped the gate: ${unauthRead.statusCode}`);
const unauthWrite = await call(studio, {
  method: "POST",
  body: { action: "saveProject", project: { id: "blocked" } },
});
assert(unauthWrite.statusCode === 401, `unauthenticated studio write escaped the gate: ${unauthWrite.statusCode}`);

const sessionRes = await call(session, {
  method: "POST",
  body: { subject: "studio-proof-operator", role: "admin" },
});
assert(sessionRes.statusCode === 410, `local studio proof session was not retired: ${sessionRes.statusCode}`);
const token = signJwt(privateKey, { sub: "fs27-studio-proof-operator", email: "studio-proof@internal.invalid", role: "admin" });

const project = {
  id: "studio_proof_artist_release",
  artistId: "artist_proof",
  releaseId: "release_proof",
  title: "Proof Creation Session",
  tempoKey: "84 BPM / F minor",
  notes: "Smoke test project for the native creation lane.",
  stems: [{ id: "stem_001", name: "proof-stem.wav", type: "audio/wav", size: 1024 }],
  sourceEngines: ["SkyeMusicNexus Native DAW"],
};

const saveRes = await call(studio, {
  method: "POST",
  authToken: token,
  body: { action: "saveProject", project },
});
assert(saveRes.statusCode === 200, `studio project save failed: ${saveRes.statusCode}`);
const saveData = parse(saveRes);
assert(saveData.status === "STUDIO_PROJECT_SAVED", "studio save did not return the saved status");
assert(saveData.project.id === project.id, "studio save returned the wrong project id");

const releaseForgeLine = {
  artistId: project.artistId,
  releaseId: project.releaseId,
  title: project.title,
  tracks: [{ title: "proof-stem", source: "proof-stem.wav" }],
  rightsRequiredBeforePlayback: true,
  sendTo: "SkyeMusicNexus Release Forge",
};

const exportRes = await call(studio, {
  method: "POST",
  authToken: token,
  body: {
    action: "queueExport",
    project,
    exportTargets: ["mp3-preview", "wav-master", "release-forge-line"],
    releaseForgeLine,
  },
});
assert(exportRes.statusCode === 200, `studio export queue failed: ${exportRes.statusCode}`);
const exportData = parse(exportRes);
assert(exportData.status === "EXPORT_MANIFEST_QUEUED", "studio export did not return the queued status");
assert(exportData.exportJob.releaseForgeLine.sendTo === "SkyeMusicNexus Release Forge", "export job lost the Release Forge handoff");

const engineRes = await call(studio, {
  method: "POST",
  authToken: token,
  body: {
    action: "registerEngine",
    name: "SkyeMusicNexus Native DAW",
    license: "First-party Nexus code",
    repo: "public/nexus-daw.js",
    mode: "Native fullscreen DAW room",
  },
});
assert(engineRes.statusCode === 200, `studio module register failed: ${engineRes.statusCode}`);
assert(parse(engineRes).status === "ENGINE_REGISTERED", "studio module register did not return the registered status");

const listRes = await call(studio, { method: "GET", authToken: token });
assert(listRes.statusCode === 200, `studio ledger read failed: ${listRes.statusCode}`);
const ledger = parse(listRes);
assert(ledger.projects.some((item) => item.id === project.id), "studio ledger did not retain the saved project");
assert(ledger.exports.length >= 1, "studio ledger did not retain the export manifest");
assert(ledger.engines.some((item) => item.name === "SkyeMusicNexus Native DAW"), "studio ledger did not retain the native DAW module record");

console.log(JSON.stringify({
  ok: true,
  app: "SkyeMusicNexus Native DAW Studio",
  verified: [
    "DAW Room route",
    "native fullscreen DAW route",
    "no third-party DAW iframe",
    "no vendored third-party DAW source",
    "SkyGate-protected studio function",
    "project ledger save",
    "export manifest queue",
    "Release Forge handoff",
    "native DAW module record",
  ],
}, null, 2));
