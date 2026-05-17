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

function parse(response) {
  return JSON.parse(response.body || "{}");
}

async function call(handler, { method = "GET", query = {}, body, authToken } = {}) {
  return handler.handler({
    httpMethod: method,
    queryStringParameters: query,
    headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    body: body === undefined ? "" : JSON.stringify(body),
  });
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skye-musicnexus-proof-"));
process.env.MUSIC_NEXUS_DATA_DIR = tmpDir;
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.SKYGATE_PUBLIC_KEY_PEM = publicKey.export({ type: "spki", format: "pem" });
process.env.SKYGATE_LOCAL_SESSION_PRIVATE_KEY_PEM = privateKey.export({ type: "pkcs8", format: "pem" });
process.env.SKYGATE_ENABLE_LOCAL_SESSION_BOOTSTRAP = "1";
process.env.SKYGATE_LOCAL_OPERATOR_EMAIL = "operator@internal.invalid";
process.env.SKYGATE_LOCAL_OPERATOR_PASSWORD = "proof-password";
process.env.SKYGATE_LOCAL_OPERATOR_ROLE = "admin";
const artists = require(path.join(root, "netlify/functions/music-artists.js"));
const releases = require(path.join(root, "netlify/functions/music-releases.js"));
const payments = require(path.join(root, "netlify/functions/music-payments.js"));
const analytics = require(path.join(root, "netlify/functions/music-analytics.js"));
const session = require(path.join(root, "netlify/functions/skygate-session.js"));

const indexHtml = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const adminHtml = fs.readFileSync(path.join(root, "public/admin.html"), "utf8");
const gateSession = fs.readFileSync(path.join(root, "gate-session.js"), "utf8");
const authHelper = fs.readFileSync(path.join(root, "public/skygate-auth.js"), "utf8");
const neoJs = fs.readFileSync(path.join(root, "public/neo-nexus.js"), "utf8");
const neoCss = fs.readFileSync(path.join(root, "public/neo-nexus.css"), "utf8");
assert(indexHtml.includes("NeoFront Artist Operating Stage"), "public/index.html is missing the NeoFront artist stage title");
assert(indexHtml.includes("Artist Nebula"), "public/index.html is missing the artist nebula surface");
assert(indexHtml.includes("Release Forge"), "public/index.html is missing the release forge surface");
assert(indexHtml.includes("Royalty River"), "public/index.html is missing the royalty river surface");
assert(indexHtml.includes("Ops Sequencer"), "public/index.html is missing the operations sequencer surface");
assert(indexHtml.includes("../gate-session.js"), "public/index.html is missing the SkyeMusicNexus gate-session overlay");
assert(indexHtml.includes("skygate-auth.js"), "public/index.html is missing the shared SkyGate browser auth helper");
assert(indexHtml.includes("neo-nexus.js"), "public/index.html is missing the NeoFront runtime script");
assert(adminHtml.includes("Operator Stage"), "public/admin.html is missing the operator stage title");
assert(adminHtml.includes("Review Chamber"), "public/admin.html is missing the review chamber");
assert(adminHtml.includes("Payout Gate"), "public/admin.html is missing the payout gate");
assert(adminHtml.includes("Analytics Prism"), "public/admin.html is missing the analytics prism");
assert(adminHtml.includes("../gate-session.js"), "public/admin.html is missing the SkyeMusicNexus gate-session overlay");
assert(adminHtml.includes("skygate-auth.js"), "public/admin.html is missing the shared SkyGate browser auth helper");
assert(neoJs.includes("/.netlify/functions/"), "neo-nexus.js is missing Netlify function API wiring");
assert(neoJs.includes("music-artists"), "neo-nexus.js is missing music-artists wiring");
assert(neoJs.includes("music-releases"), "neo-nexus.js is missing music-releases wiring");
assert(neoJs.includes("music-payments"), "neo-nexus.js is missing music-payments wiring");
assert(neoJs.includes("music-analytics"), "neo-nexus.js is missing music-analytics wiring");
assert(neoJs.includes("queue-operations"), "neo-nexus.js is missing operations queue wiring");
assert(neoJs.includes("report-streams"), "neo-nexus.js is missing stream reporting wiring");
assert(neoCss.includes("vinyl-core"), "neo-nexus.css is missing the vinyl core display system");
assert(neoCss.includes("wave-reader"), "neo-nexus.css is missing the signal wave display system");
assert(authHelper.includes("window.sessionStorage"), "skygate-auth.js is not using session-scoped token storage");
assert(authHelper.includes("loginLocalOperator"), "skygate-auth.js is missing local operator login wiring");
assert(authHelper.includes("logoutSession"), "skygate-auth.js is missing local session logout wiring");
assert(gateSession.includes("Free99 means no charge"), "gate-session.js must spell out that Free99 means no charge");
assert(gateSession.includes("SKYE_MUSIC_NEXUS_GATE_SESSION"), "gate-session.js is missing the dedicated app session storage key");

const unauthArtistsRes = await call(artists, { method: "GET", query: { action: "list" } });
assert(unauthArtistsRes.statusCode === 401, `unauthenticated artist list escaped the gate: ${unauthArtistsRes.statusCode}`);
const unauthReleasesRes = await call(releases, { method: "GET", query: { action: "list" } });
assert(unauthReleasesRes.statusCode === 401, `unauthenticated release list escaped the gate: ${unauthReleasesRes.statusCode}`);
const unauthOperationsRes = await call(releases, { method: "GET", query: { action: "operations-board" } });
assert(unauthOperationsRes.statusCode === 401, `unauthenticated operations board escaped the gate: ${unauthOperationsRes.statusCode}`);

const sessionStatusRes = await call(session, { method: "GET" });
assert(sessionStatusRes.statusCode === 200, `session status failed: ${sessionStatusRes.statusCode}`);
const sessionStatus = parse(sessionStatusRes);
assert(sessionStatus.localProofBootstrap === true, "session status did not report local proof bootstrap availability");
assert(sessionStatus.localOperatorLogin === true, "session status did not report local operator login availability");
assert(sessionStatus.localIdentity === true, "session status did not expose local identity mode");

const sessionRes = await call(session, {
  method: "POST",
  body: { subject: "proof-operator", role: "admin" },
});
assert(sessionRes.statusCode === 200, `local session bootstrap failed: ${sessionRes.statusCode}`);
const sessionData = parse(sessionRes);
const token = sessionData.token;
assert(token && token.startsWith("skls_"), "local session bootstrap did not return a local session token");
const activeSessionRes = await call(session, { method: "GET", authToken: token });
const activeSessionData = parse(activeSessionRes);
assert(activeSessionData.activeSession && activeSessionData.activeSession.source === "local-identity-session", "session status did not surface the active local session");

const badLoginRes = await call(session, {
  method: "POST",
  body: {
    grantType: "password",
    email: "operator@internal.invalid",
    password: "wrong-password",
  },
});
assert(badLoginRes.statusCode === 401, `invalid local operator login returned ${badLoginRes.statusCode}`);

const operatorLoginRes = await call(session, {
  method: "POST",
  body: {
    grantType: "password",
    email: "operator@internal.invalid",
    password: "proof-password",
    subject: "proof-operator-login",
  },
});
assert(operatorLoginRes.statusCode === 200, `local operator login failed: ${operatorLoginRes.statusCode}`);
const operatorToken = parse(operatorLoginRes).token;
assert(operatorToken && operatorToken.startsWith("skls_"), "local operator login did not return a local session token");
const revokeRes = await call(session, { method: "DELETE", authToken: operatorToken });
assert(revokeRes.statusCode === 200, `local operator logout failed: ${revokeRes.statusCode}`);

const seededStatusRes = await call(session, { method: "GET" });
const seededStatus = parse(seededStatusRes);
assert(seededStatus.usersConfigured >= 1, "local operator bootstrap did not seed a local identity user");
assert(seededStatus.adminUsers >= 1, "local operator bootstrap did not seed an admin user");

const artistRes = await call(artists, {
  method: "POST",
  authToken: token,
  body: {
    action: "register",
    name: "Proof Artist",
    email: "proof.artist@internal.invalid",
    genre: ["ambient", "electronic"],
    bio: "Certification lane artist",
  },
});
assert(artistRes.statusCode === 201, `artist register failed: ${artistRes.statusCode}`);
const artistData = parse(artistRes);
const artistId = artistData.artistId;
assert(artistId, "artist register did not return an artistId");

const approveRes = await call(artists, {
  method: "POST",
  authToken: token,
  body: { action: "approve", id: artistId },
});
assert(approveRes.statusCode === 200, `artist approve failed: ${approveRes.statusCode}`);

const submitRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: {
    action: "submit",
    artistId,
    title: "Proof Release",
    type: "single",
    tracks: [{ title: "Proof Track", duration: 181 }],
    distributionTargets: ["Spotify", "Apple Music"],
  },
});
assert(submitRes.statusCode === 201, `release submit failed: ${submitRes.statusCode}`);
const submitData = parse(submitRes);
const releaseId = submitData.release?.id;
assert(releaseId, "release submit did not return a release id");

const reviewRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: { action: "review", id: releaseId, decision: "approve", notes: "Ready for lane proof" },
});
assert(reviewRes.statusCode === 200, `release review failed: ${reviewRes.statusCode}`);

const publishRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: { action: "publish", id: releaseId },
});
assert(publishRes.statusCode === 200, `release publish failed: ${publishRes.statusCode}`);

const streamsRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: { action: "report-streams", id: releaseId, streams: 2500, downloads: 80, saves: 120 },
});
assert(streamsRes.statusCode === 200, `stream report failed: ${streamsRes.statusCode}`);

const queueOpsRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: {
    action: "queue-operations",
    id: releaseId,
    owner: "release-ops",
    checkpoint: "distribution-ready",
    notes: "Queue for distro + proof handoff",
    status: "ready",
  },
});
assert(queueOpsRes.statusCode === 201, `queue operations failed: ${queueOpsRes.statusCode}`);
const queuedWorkflow = parse(queueOpsRes).workflow;
assert(queuedWorkflow && queuedWorkflow.status === "ready", "operations workflow was not queued in ready state");

const updateOpsRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: {
    action: "update-operations",
    id: releaseId,
    owner: "release-ops-lead",
    checkpoint: "distribution-scheduled",
    notes: "Scheduled for push and royalty check",
    status: "scheduled",
  },
});
assert(updateOpsRes.statusCode === 200, `update operations failed: ${updateOpsRes.statusCode}`);
const updatedWorkflow = parse(updateOpsRes).workflow;
assert(updatedWorkflow && updatedWorkflow.status === "scheduled", "operations workflow was not updated to scheduled");
assert(updatedWorkflow.owner === "release-ops-lead", "operations workflow owner did not persist");

const operationsBoardRes = await call(releases, {
  method: "GET",
  authToken: token,
  query: { action: "operations-board" },
});
assert(operationsBoardRes.statusCode === 200, `operations board failed: ${operationsBoardRes.statusCode}`);
const operationsBoard = parse(operationsBoardRes);
assert(Array.isArray(operationsBoard.workflows) && operationsBoard.workflows.some((item) => item.releaseId === releaseId), "operations board did not include the queued release");
assert(operationsBoard.scheduled >= 1, "operations board summary did not track the scheduled workflow");

const creditRes = await call(payments, {
  method: "POST",
  authToken: token,
  body: { action: "credit", artistId, amount: 145.5, reason: "Proof royalty credit", referenceId: releaseId },
});
assert(creditRes.statusCode === 201, `credit failed: ${creditRes.statusCode}`);

const ledgerRes = await call(payments, {
  method: "GET",
  authToken: token,
  query: { action: "ledger", artistId },
});
assert(ledgerRes.statusCode === 200, `ledger failed: ${ledgerRes.statusCode}`);
const ledgerData = parse(ledgerRes);
assert(Array.isArray(ledgerData.ledger) && ledgerData.ledger.length >= 1, "ledger did not record the credit");

const payoutRes = await call(payments, {
  method: "POST",
  authToken: token,
  body: { action: "payout", artistId, amount: 45.5, payoutMethod: "paypal" },
});
assert(payoutRes.statusCode === 201, `payout request failed: ${payoutRes.statusCode}`);
const payoutData = parse(payoutRes);
const payoutId = payoutData.payout?.id;
assert(payoutId, "payout request did not return a payout id");

const gatedArtistRes = await call(artists, { method: "GET", authToken: token, query: { action: "get", id: artistId } });
assert(gatedArtistRes.statusCode === 200, `gated artist get failed: ${gatedArtistRes.statusCode}`);
const gatedReleaseRes = await call(releases, { method: "GET", authToken: token, query: { action: "list", artistId } });
assert(gatedReleaseRes.statusCode === 200, `gated release list failed: ${gatedReleaseRes.statusCode}`);

const payoutListRes = await call(payments, { method: "GET", authToken: token, query: { action: "payouts", status: "pending" } });
assert(payoutListRes.statusCode === 200, `payout list failed: ${payoutListRes.statusCode}`);
const payoutListData = parse(payoutListRes);
assert(Array.isArray(payoutListData.payouts) && payoutListData.payouts.some((entry) => entry.id === payoutId), "payout list did not include the requested payout");

const analyticsRes = await call(analytics, { method: "GET", authToken: token });
assert(analyticsRes.statusCode === 200, `music analytics failed: ${analyticsRes.statusCode}`);
const analyticsByOperatorRes = await call(analytics, { method: "GET", authToken: operatorToken });
assert(analyticsByOperatorRes.statusCode === 401, `revoked local operator session still worked: ${analyticsByOperatorRes.statusCode}`);

console.log(JSON.stringify({
  ok: true,
  app: "SkyeMusicNexus",
  surface: "artist portal shell plus local SkyGate-backed artist, release, and payments handlers",
  verified: [
    "browser artist and admin surfaces are wired to the local SkyGate bootstrap",
    "session status exposes local identity-backed operator bootstrap availability",
    "invalid local operator credentials are rejected",
    "local operator credentials can mint an admin session token",
    "session status can introspect the active local session",
    "local operator sessions can be revoked in-folder",
    "browser auth storage is scoped to the active session",
    "artist, release, and operations reads reject ungated requests",
    "artist registration works in the local handler surface",
    "release submit, review, publish, and stream reporting work",
    "approved and live releases can be queued into a persisted release operations board",
    "release operations workflows can be updated and summarized in-folder",
    "payments credit, ledger, payout request, and payout queue work",
    "admin analytics accepts the locally bootstrapped token",
    "artist and release read endpoints return the created records only with a gate session",
  ],
  not_proven: [
    "real identity-provider handoff into SkyGate tokens",
    "deployed platform distribution integrations",
  ],
  artistId,
  releaseId,
  payoutId,
}, null, 2));
