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

const createHtml = read("public/create.html");
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

for (const marker of [
  "Open Source Creation Studio",
  "Launch openDAW Bridge",
  "Save Studio Project",
  "Queue Export",
  "releaseForgeLine",
  "engineLedgerGrid",
  "skygate-auth.js",
  "open-source-studio.js",
  "SKYE_MUSIC_NEXUS_STATIC_PREVIEW",
]) {
  assert(createHtml.includes(marker), `public/create.html missing ${marker}`);
}

for (const page of [indexHtml, uploadHtml, playerHtml, releasesHtml, rightsHtml, exchangeHtml]) {
  assert(page.includes("./create.html"), "Create Studio nav link missing from an artist room");
}
assert(adminHtml.includes("./create.html"), "Create Studio link missing from operator stage");
assert(rootShellHtml.includes("./public/create.html"), "root launch matrix missing Create Studio");

for (const marker of [
  "createSkyGateAuth",
  "music-studio",
  "saveProject",
  "queueExport",
  "openDAW",
  "Release Forge",
]) {
  assert(createJs.includes(marker), `open-source-studio.js missing ${marker}`);
}
assert(studioFunctionSource.includes("registerEngine"), "music-studio.js is missing engine registration support");

assert(!createJs.includes("proof_"), "open-source-studio.js still mints fake local proof tokens");
assert(!createCss.includes("clamp("), "open-source-studio.css should not use viewport-scaled type");
assert(!createCss.includes("letter-spacing: -"), "open-source-studio.css should not use negative tracking");
assert(localServer.includes('"music-studio"'), "local-dev-server is missing music-studio routing");
assert(netlifyToml.includes("/api/music/studio"), "netlify.toml is missing the studio redirect");
assert(runtimeContract.launchTargets.some((target) => target.href === "./public/create.html"), "runtime contract is missing Create Studio launch target");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skye-musicnexus-studio-"));
process.env.MUSIC_NEXUS_DATA_DIR = tmpDir;
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.SKYGATE_PUBLIC_KEY_PEM = publicKey.export({ type: "spki", format: "pem" });
process.env.SKYGATE_LOCAL_SESSION_PRIVATE_KEY_PEM = privateKey.export({ type: "pkcs8", format: "pem" });
process.env.SKYGATE_ENABLE_LOCAL_SESSION_BOOTSTRAP = "1";
process.env.SKYGATE_LOCAL_OPERATOR_EMAIL = "operator@internal.invalid";
process.env.SKYGATE_LOCAL_OPERATOR_PASSWORD = "proof-password";
process.env.SKYGATE_LOCAL_OPERATOR_ROLE = "admin";

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
assert(sessionRes.statusCode === 200, `local studio proof session failed: ${sessionRes.statusCode}`);
const token = parse(sessionRes).token;
assert(token && token.startsWith("skls_"), "local studio proof session did not return a token");

const project = {
  id: "studio_proof_artist_release",
  artistId: "artist_proof",
  releaseId: "release_proof",
  title: "Proof Creation Session",
  tempoKey: "84 BPM / F minor",
  notes: "Smoke test project for the open-source creation lane.",
  stems: [{ id: "stem_001", name: "proof-stem.wav", type: "audio/wav", size: 1024 }],
  sourceEngines: ["openDAW", "Ardour", "LMMS", "Audacity"],
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
    name: "openDAW",
    license: "AGPLv3",
    repo: "https://github.com/andremichelle/openDAW.git",
    mode: "External iframe/micro-frontend bridge",
  },
});
assert(engineRes.statusCode === 200, `studio engine register failed: ${engineRes.statusCode}`);
assert(parse(engineRes).status === "ENGINE_REGISTERED", "studio engine register did not return the registered status");

const listRes = await call(studio, { method: "GET", authToken: token });
assert(listRes.statusCode === 200, `studio ledger read failed: ${listRes.statusCode}`);
const ledger = parse(listRes);
assert(ledger.projects.some((item) => item.id === project.id), "studio ledger did not retain the saved project");
assert(ledger.exports.length >= 1, "studio ledger did not retain the export manifest");
assert(ledger.engines.some((item) => item.name === "openDAW"), "studio ledger did not retain the engine record");

console.log(JSON.stringify({
  ok: true,
  app: "SkyeMusicNexus Open Source Creation Studio",
  verified: [
    "Create Studio route",
    "room nav integration",
    "local dev music-studio route",
    "SkyGate-protected studio function",
    "project ledger save",
    "export manifest queue",
    "Release Forge handoff",
    "open-source engine record",
  ],
}, null, 2));
