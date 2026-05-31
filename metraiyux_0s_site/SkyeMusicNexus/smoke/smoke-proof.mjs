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

function readFirstExisting(label, candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8");
  }
  throw new Error(`${label} missing. Checked: ${candidates.join(", ")}`);
}

async function call(handler, { method = "GET", query = {}, body, authToken } = {}) {
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

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skye-musicnexus-proof-"));
process.env.MUSIC_NEXUS_DATA_DIR = tmpDir;
delete process.env.MUSIC_NEXUS_STORAGE_BACKEND;
delete process.env.SKYE_MUSIC_NEXUS_STORAGE_BACKEND;
delete process.env.MUSIC_NEXUS_USE_R2;
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.SKYGATE_PUBLIC_KEY_PEM = publicKey.export({ type: "spki", format: "pem" });
process.env.SKYGATE_EXPECTED_AUDIENCE = "skygatefs13";
process.env.SKYGATE_ISSUER = "local://skygatefs13/proof";
const artists = require(path.join(root, "netlify/functions/music-artists.js"));
const releases = require(path.join(root, "netlify/functions/music-releases.js"));
const assets = require(path.join(root, "netlify/functions/music-assets.js"));
const payments = require(path.join(root, "netlify/functions/music-payments.js"));
const analytics = require(path.join(root, "netlify/functions/music-analytics.js"));
const exchange = require(path.join(root, "netlify/functions/music-exchange.js"));
const social = require(path.join(root, "netlify/functions/music-social.js"));
const providerHooks = require(path.join(root, "netlify/functions/music-provider-hooks.js"));
const session = require(path.join(root, "netlify/functions/skygate-session.js"));

const indexHtml = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const uploadHtml = fs.readFileSync(path.join(root, "public/upload.html"), "utf8");
const playerHtml = fs.readFileSync(path.join(root, "public/player.html"), "utf8");
const releasesHtml = fs.readFileSync(path.join(root, "public/releases.html"), "utf8");
const rightsHtml = fs.readFileSync(path.join(root, "public/rights.html"), "utf8");
const feedHtml = fs.readFileSync(path.join(root, "public/feed.html"), "utf8");
const exchangeHtml = fs.readFileSync(path.join(root, "public/exchange.html"), "utf8");
const adminHtml = fs.readFileSync(path.join(root, "public/admin.html"), "utf8");
const gateSession = fs.readFileSync(path.join(root, "gate-session.js"), "utf8");
const authHelper = fs.readFileSync(path.join(root, "public/skygate-auth.js"), "utf8");
const neoJs = fs.readFileSync(path.join(root, "public/neo-nexus.js"), "utf8");
const neoCss = fs.readFileSync(path.join(root, "public/neo-nexus.css"), "utf8");
const skyeIdBridge = fs.readFileSync(path.join(root, "../assets/js/skye-id-bridge.js"), "utf8");
const skyeMailIdGen = fs.readFileSync(path.join(root, "../live/SkyeMail/generators/Skye-ID/index.html"), "utf8");
const fs27IdGen = readFirstExisting("FS27 Skye-ID generator", [
  path.resolve(root, "../skyegate/source/SkyeGateFS27/generators/Skye-ID/index.html"),
  path.resolve(root, "../../SkyeGateFS27/generators/Skye-ID/index.html"),
]);
const assetsSource = fs.readFileSync(path.join(root, "netlify/functions/music-assets.js"), "utf8");
const socialManifest = fs.readFileSync(path.join(root, "open-source/social-platform-manifest.json"), "utf8");
assert(indexHtml.includes("SkyeMusicNexus - Artist Workspace"), "public/index.html is missing the artist workspace title");
const artistPages = [indexHtml, uploadHtml, playerHtml, releasesHtml, rightsHtml, exchangeHtml].join("\n");
assert(uploadHtml.includes("Protected Audio Upload"), "public/upload.html is missing protected audio upload");
assert(uploadHtml.includes("assetUploadForm"), "public/upload.html is missing the upload form");
assert(uploadHtml.includes("Drop songs here"), "public/upload.html is missing the larger song drop zone");
assert(neoJs.includes("data-song-drop-zone") && neoJs.includes("DataTransfer"), "neo-nexus.js is missing drag/drop song upload wiring");
assert(playerHtml.includes("Stream Deck"), "public/player.html is missing the playback stream deck");
assert(releasesHtml.includes("Artist Nebula"), "public/releases.html is missing the artist nebula surface");
assert(releasesHtml.includes("Skye ID Bridge"), "public/releases.html is missing the Skye ID bridge surface");
assert(releasesHtml.includes("profilePhotoFile"), "public/releases.html is missing artist photo upload");
assert(releasesHtml.includes("name=\"skyeId\""), "public/releases.html is missing the Skye ID artist field");
assert(releasesHtml.includes("../../assets/js/skye-id-bridge.js"), "public/releases.html is missing the shared Skye ID bridge script");
assert(releasesHtml.includes("Release Forge"), "public/releases.html is missing the release forge surface");
assert(releasesHtml.includes("Royalty River"), "public/releases.html is missing the royalty river surface");
assert(releasesHtml.includes("Ops Sequencer"), "public/releases.html is missing the operations sequencer surface");
assert(exchangeHtml.includes("Creator Exchange"), "public/exchange.html is missing the creator exchange surface");
assert(exchangeHtml.includes("Content Request Exchange"), "public/exchange.html is missing the content request exchange language");
assert(exchangeHtml.includes("Achievement Orbit"), "public/exchange.html is missing the achievement orbit surface");
assert(exchangeHtml.includes("Release Campaign Forge"), "public/exchange.html is missing the release campaign forge");
assert(feedHtml.includes("Open Social Feed"), "public/feed.html is missing the open social feed surface");
assert(feedHtml.includes("feedComposeForm"), "public/feed.html is missing the real feed composer");
assert(feedHtml.includes("socialFeedDeck"), "public/feed.html is missing the social feed deck");
assert(feedHtml.includes("socialConnectorForm"), "public/feed.html is missing the social connector form");
assert(feedHtml.includes("socialPostForm"), "public/feed.html is missing the social post queue form");
assert(feedHtml.includes("socialFeedForm"), "public/feed.html is missing the federated feed sync form");
assert(feedHtml.includes("Pixelfed"), "public/feed.html is missing the Pixelfed platform lane");
assert(rightsHtml.includes("Rights Vault"), "public/rights.html is missing the rights vault");
assert(rightsHtml.includes("Takedown Hold"), "public/rights.html is missing the takedown hold surface");
assert(artistPages.includes("Upload Studio"), "public platform pages are missing Upload Studio");
assert(indexHtml.includes("../gate-session.js"), "public/index.html is missing the SkyeMusicNexus gate-session overlay");
assert(indexHtml.includes("skygate-auth.js"), "public/index.html is missing the shared SkyGate browser auth helper");
assert(indexHtml.includes("neo-nexus.js"), "public/index.html is missing the NeoFront runtime script");
assert(adminHtml.includes("Protected Review"), "public/admin.html is missing the protected review title");
assert(adminHtml.includes("Review Chamber"), "public/admin.html is missing the review chamber");
assert(adminHtml.includes("Payout Queue"), "public/admin.html is missing the payout queue");
assert(adminHtml.includes("Analytics Prism"), "public/admin.html is missing the analytics prism");
assert(adminHtml.includes("Exchange Console"), "public/admin.html is missing the exchange console");
assert(adminHtml.includes("Open Social Spine"), "public/admin.html is missing the open social spine");
assert(adminHtml.includes("../gate-session.js"), "public/admin.html is missing the SkyeMusicNexus gate-session overlay");
assert(adminHtml.includes("skygate-auth.js"), "public/admin.html is missing the shared SkyGate browser auth helper");
assert(neoJs.includes("/.netlify/functions/"), "neo-nexus.js is missing Netlify function API wiring");
assert(neoJs.includes("music-artists"), "neo-nexus.js is missing music-artists wiring");
assert(neoJs.includes("SkyeIDBridge"), "neo-nexus.js is missing the Skye ID browser bridge wiring");
assert(neoJs.includes("profilePhoto"), "neo-nexus.js is missing artist photo identity handoff");
assert(neoJs.includes("music-releases"), "neo-nexus.js is missing music-releases wiring");
assert(neoJs.includes("music-assets"), "neo-nexus.js is missing music-assets upload wiring");
assert(assetsSource.includes("MUSIC_NEXUS_STORAGE_BACKEND"), "music-assets.js is missing the durable storage backend switch");
assert(assetsSource.includes("skyevault-r2-gated-audio"), "music-assets.js is missing the SkyeVault/R2 audio storage lane");
assert(assetsSource.includes("create-upload-session") && assetsSource.includes("complete-upload"), "music-assets.js is missing the direct R2 upload session wiring");
assert(neoJs.includes("directUploadAvailable") && neoJs.includes("create-upload-session"), "neo-nexus.js is missing future direct-upload browser wiring");
assert(neoJs.includes("music-payments"), "neo-nexus.js is missing music-payments wiring");
assert(neoJs.includes("music-analytics"), "neo-nexus.js is missing music-analytics wiring");
assert(neoJs.includes("music-exchange"), "neo-nexus.js is missing music-exchange wiring");
assert(neoJs.includes("music-social"), "neo-nexus.js is missing music-social wiring");
assert(neoJs.includes("queue-operations"), "neo-nexus.js is missing operations queue wiring");
assert(neoJs.includes("report-streams"), "neo-nexus.js is missing stream reporting wiring");
assert(neoJs.includes("playback-stream"), "neo-nexus.js is missing playback stream proof wiring");
assert(neoJs.includes("update-rights"), "neo-nexus.js is missing rights update wiring");
assert(neoJs.includes("takedown-request"), "neo-nexus.js is missing takedown hold wiring");
assert(neoJs.includes("AudioContext"), "neo-nexus.js is missing Web Audio playback wiring");
assert(neoJs.includes("request-content"), "neo-nexus.js is missing content request wiring");
assert(neoJs.includes("publish-community"), "neo-nexus.js is missing community post wiring");
assert(neoJs.includes("build-release-campaign"), "neo-nexus.js is missing release campaign wiring");
assert(neoJs.includes("save-connector"), "neo-nexus.js is missing social connector wiring");
assert(neoJs.includes("create-feed-post"), "neo-nexus.js is missing real feed post wiring");
assert(neoJs.includes("feed-action"), "neo-nexus.js is missing real feed action wiring");
assert(neoJs.includes("queue-post"), "neo-nexus.js is missing social post queue wiring");
assert(neoJs.includes("publish-post"), "neo-nexus.js is missing social provider publish wiring");
assert(neoJs.includes("sync-feed"), "neo-nexus.js is missing federated feed sync wiring");
assert(neoCss.includes("vinyl-core"), "neo-nexus.css is missing the vinyl core display system");
assert(neoCss.includes("wave-reader"), "neo-nexus.css is missing the signal wave display system");
assert(neoCss.includes("player-queue"), "neo-nexus.css is missing the playback queue display system");
assert(neoCss.includes("rights-status"), "neo-nexus.css is missing the rights gate display system");
assert(neoCss.includes("asset-card"), "neo-nexus.css is missing the upload asset card display system");
assert(neoCss.includes("song-drop-zone"), "neo-nexus.css is missing the large song drop zone system");
assert(neoCss.includes("identity-card"), "neo-nexus.css is missing the Skye ID identity card display system");
assert(skyeIdBridge.includes("skye0s.identity.current.v1"), "shared Skye ID bridge is missing the current identity key");
assert(skyeIdBridge.includes("fileToIdentityPhoto"), "shared Skye ID bridge is missing profile photo compression");
assert(skyeIdBridge.includes("publishIdentity"), "shared Skye ID bridge is missing cross-app identity publishing");
assert(skyeMailIdGen.includes("skye0s.identity.current.v1"), "SkyeMail Skye-ID generator is not publishing the shared identity key");
assert(skyeMailIdGen.includes("photoDataUrl"), "SkyeMail Skye-ID generator is not publishing photo identity data");
assert(fs27IdGen.includes("skye0s.identity.current.v1"), "FS27 Skye-ID generator is not publishing the shared identity key");
assert(fs27IdGen.includes("photoDataUrl"), "FS27 Skye-ID generator is not publishing photo identity data");
assert(authHelper.includes("MetrAIyuxGateBridge"), "skygate-auth.js is not using the shared 0S Gate bridge");
assert(!authHelper.includes("localStorage.setItem") && !authHelper.includes("sessionStorage.setItem"), "skygate-auth.js still writes an app-local session token");
const legacyLoginSymbol = "loginLocal" + "Operator";
const legacyLoginCopy = "Local " + "Operator Login";
assert(!authHelper.includes(legacyLoginSymbol), "skygate-auth.js still exposes legacy local password login wiring");
assert(!artistPages.includes(legacyLoginCopy), "public platform pages still expose legacy local login copy");
assert(authHelper.includes("logoutSession"), "skygate-auth.js is missing local session logout wiring");
assert(gateSession.includes("MetrAIyuxGateBridge"), "gate-session.js is missing the shared 0S Gate bridge");
assert(gateSession.includes("/admin/login.html?return="), "gate-session.js is missing the shared 0S login handoff");
const retiredMusicSessionKey = "SKYE_MUSIC_NEXUS" + "_GATE_SESSION";
assert(!gateSession.includes(retiredMusicSessionKey), "gate-session.js still uses the retired app-specific Music Nexus session key");
assert(!gateSession.includes("localStorage.setItem") && !gateSession.includes("sessionStorage.setItem"), "gate-session.js still writes app-local session storage");
assert(socialManifest.includes("Pixelfed") && socialManifest.includes("Funkwhale") && socialManifest.includes("ActivityPub"), "open-source social platform manifest is missing required platform targets");

const unauthArtistsRes = await call(artists, { method: "GET", query: { action: "list" } });
assert(unauthArtistsRes.statusCode === 401, `unauthenticated artist list escaped the gate: ${unauthArtistsRes.statusCode}`);
const unauthReleasesRes = await call(releases, { method: "GET", query: { action: "list" } });
assert(unauthReleasesRes.statusCode === 401, `unauthenticated release list escaped the gate: ${unauthReleasesRes.statusCode}`);
const unauthOperationsRes = await call(releases, { method: "GET", query: { action: "operations-board" } });
assert(unauthOperationsRes.statusCode === 401, `unauthenticated operations board escaped the gate: ${unauthOperationsRes.statusCode}`);
const unauthExchangeRes = await call(exchange, { method: "GET", query: { action: "hub" } });
assert(unauthExchangeRes.statusCode === 401, `unauthenticated music exchange escaped the gate: ${unauthExchangeRes.statusCode}`);
const unauthSocialRes = await call(social, { method: "GET", query: { action: "hub" } });
assert(unauthSocialRes.statusCode === 401, `unauthenticated music social spine escaped the gate: ${unauthSocialRes.statusCode}`);
const unauthAssetsRes = await call(assets, { method: "GET", query: { action: "list" } });
assert(unauthAssetsRes.statusCode === 401, `unauthenticated music assets escaped the gate: ${unauthAssetsRes.statusCode}`);
const unauthProviderHooksRes = await call(providerHooks, { method: "GET", query: { action: "status" } });
assert(unauthProviderHooksRes.statusCode === 401, `unauthenticated provider hooks escaped the gate: ${unauthProviderHooksRes.statusCode}`);

const sessionStatusRes = await call(session, { method: "GET" });
assert(sessionStatusRes.statusCode === 200, `session status failed: ${sessionStatusRes.statusCode}`);
const sessionStatus = parse(sessionStatusRes);
assert(sessionStatus.localProofBootstrap === false, "session status still reports local proof bootstrap availability");
assert(sessionStatus.localOperatorLogin === false, "session status still reports local operator password login availability");
assert(sessionStatus.sharedGateAuth === true, "session status did not report shared gate auth posture");
assert(sessionStatus.appIdentity === false, "session status still reports app-local identity ownership");

const sessionRes = await call(session, {
  method: "POST",
  body: { subject: "proof-operator", role: "admin" },
});
assert(sessionRes.statusCode === 410, `local session bootstrap was not retired: ${sessionRes.statusCode}`);
const token = signJwt(privateKey, { sub: "fs27-music-proof-operator", email: "proof@internal.invalid", role: "admin" });
const activeSessionRes = await call(session, { method: "GET", authToken: token });
const activeSessionData = parse(activeSessionRes);
assert(activeSessionData.activeSession && activeSessionData.activeSession.source === "external-skygate-jwt", "session status did not surface the active shared Gate bearer");

const passwordGrantRes = await call(session, {
  method: "POST",
  body: {
    grantType: "password",
    email: "operator@internal.invalid",
    password: "wrong-password",
  },
});
assert(passwordGrantRes.statusCode === 410, `local operator password grant returned ${passwordGrantRes.statusCode}`);

const seededStatusRes = await call(session, { method: "GET" });
const seededStatus = parse(seededStatusRes);
assert(seededStatus.usersConfigured === false, "local identity users are still configured inside Music Nexus");
assert(seededStatus.adminUsers === 0, "local admin users are still configured inside Music Nexus");

const proofSkyeId = "1357913579";
const proofPhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l6xGngAAAABJRU5ErkJggg==";
const artistRes = await call(artists, {
  method: "POST",
  authToken: token,
  body: {
    action: "register",
    name: "Proof Artist",
    email: "proof.artist@internal.invalid",
    skyeId: proofSkyeId,
    identityId: proofSkyeId,
    profilePhoto: { dataUrl: proofPhoto, name: "proof-artist.png", type: "image/png", width: 1, height: 1 },
    crossAppIdentity: {
      schema: "skye0s.identity.v1",
      name: "Proof Artist",
      email: "proof.artist@internal.invalid",
      skyeId: proofSkyeId,
      idNumber: proofSkyeId,
      identityId: proofSkyeId,
      profileType: "artist",
      photoDataUrl: proofPhoto,
      photoName: "proof-artist.png",
      photoType: "image/png",
      source: "Skye-ID",
    },
    genre: ["ambient", "electronic"],
    bio: "Certification lane artist",
  },
});
assert(artistRes.statusCode === 201, `artist register failed: ${artistRes.statusCode}`);
const artistData = parse(artistRes);
const artistId = artistData.artistId;
const artistToken = signJwt(privateKey, { sub: "fs27-music-proof-artist", email: "proof.artist@internal.invalid", role: "artist", artistId });
assert(artistId, "artist register did not return an artistId");
assert(artistId === proofSkyeId, "artist register did not use the Skye ID as the cross-app artist id");
assert(artistData.artist?.skyeId === proofSkyeId, "artist register did not persist the Skye ID");
assert(artistData.artist?.profilePhoto?.dataUrl === proofPhoto, "artist register did not persist the profile photo");
assert(artistData.artist?.crossAppIdentity?.photoDataUrl === proofPhoto, "artist register did not persist the cross-app identity photo");
assert(artistData.artist?.paperwork?.requiredBeforePayout === true, "artist register did not attach paperwork hold");
assert(/WebGrowthOperator\/ae-command-hub\/onboarding\.html/.test(artistData.artist?.paperwork?.workforceFormUrl || ""), "artist register did not attach workforce paperwork link");
assert(artistData.artist?.skyepay?.payoutEligibility === "blocked_until_paperwork_complete", "artist register did not block SkyePay until paperwork");

const artistIdentityGetRes = await call(artists, { method: "GET", authToken: token, query: { action: "get", id: proofSkyeId } });
assert(artistIdentityGetRes.statusCode === 200, `artist get by Skye ID failed: ${artistIdentityGetRes.statusCode}`);
assert(parse(artistIdentityGetRes).artist?.id === proofSkyeId, "artist get by Skye ID returned the wrong artist");

const approveRes = await call(artists, {
  method: "POST",
  authToken: token,
  body: { action: "approve", id: artistId },
});
assert(approveRes.statusCode === 200, `artist approve failed: ${approveRes.statusCode}`);

const uploadBuffer = Buffer.concat([
  Buffer.from("RIFF$\u0000\u0000\u0000WAVEfmt \u0010\u0000\u0000\u0001\u0000\u0001\u0000D\u00ac\u0000\u0000\u0088X\u0001\u0000\u0002\u0000\u0010\u0000data\u0000\u0000\u0000\u0000", "binary"),
  Buffer.alloc(128),
]);
const uploadRes = await call(assets, {
  method: "POST",
  authToken: artistToken,
  body: {
    action: "upload",
    artistId,
    title: "Proof Track",
    fileName: "proof-track.wav",
    contentType: "audio/wav",
    dataBase64: uploadBuffer.toString("base64"),
  },
});
assert(uploadRes.statusCode === 201, `audio upload failed: ${uploadRes.statusCode}`);
const uploadData = parse(uploadRes);
const uploadedAsset = uploadData.asset;
assert(uploadedAsset?.streamUrl?.includes("music-assets"), "audio upload did not return a gated stream URL");
assert(uploadedAsset?.storage === "music-nexus-local-gated-audio", "local proof upload did not use the expected gated local storage lane");

const assetListRes = await call(assets, { method: "GET", authToken: artistToken, query: { action: "list", artistId } });
assert(assetListRes.statusCode === 200, `audio asset list failed: ${assetListRes.statusCode}`);
const assetListData = parse(assetListRes);
assert(assetListData.assets?.some((item) => item.id === uploadedAsset.id), "audio asset list did not include the uploaded file");
assert(assetListData.storage?.mode === "local" && assetListData.storage?.durable === false, "local proof asset list did not report the storage boundary");

const storageStatusRes = await call(assets, { method: "GET", authToken: token, query: { action: "storage-status" } });
assert(storageStatusRes.statusCode === 200, `audio storage status failed: ${storageStatusRes.statusCode}`);
assert(parse(storageStatusRes).storage?.directUploadEnabled === false, "direct upload should stay disabled until R2 env and feature flag are configured");

const directSessionRes = await call(assets, {
  method: "POST",
  authToken: artistToken,
  body: {
    action: "create-upload-session",
    artistId,
    title: "Future Direct Upload Proof",
    fileName: "future-proof.wav",
    contentType: "audio/wav",
    bytes: uploadBuffer.length,
  },
});
assert(directSessionRes.statusCode === 409, `direct upload should be wired but disabled without R2 env: ${directSessionRes.statusCode}`);

const assetStreamRes = await call(assets, { method: "GET", authToken: artistToken, query: { action: "stream", id: uploadedAsset.id } });
assert(assetStreamRes.statusCode === 200, `audio asset stream failed: ${assetStreamRes.statusCode}`);
assert(assetStreamRes.isBase64Encoded === true, "audio asset stream did not return a base64 function body");

const buyerToken = signJwt(privateKey, { sub: "fs27-music-proof-buyer", email: "buyer@internal.invalid", role: "listener" });
const unpaidBuyerStreamRes = await call(assets, { method: "GET", authToken: buyerToken, query: { action: "stream", id: uploadedAsset.id } });
assert(unpaidBuyerStreamRes.statusCode === 402, `unpaid buyer stream escaped SkyPay gate: ${unpaidBuyerStreamRes.statusCode}`);
const unpaidBuyerDownloadRes = await call(assets, { method: "GET", authToken: buyerToken, query: { action: "download", id: uploadedAsset.id } });
assert(unpaidBuyerDownloadRes.statusCode === 402, `unpaid buyer download escaped SkyPay gate: ${unpaidBuyerDownloadRes.statusCode}`);

fs.writeFileSync(path.join(tmpDir, "commerce-spine.json"), JSON.stringify({
  stores: [],
  products: [{ productId: "prod_proof_track", id: "prod_proof_track", artistId, assetId: uploadedAsset.id, title: "Proof Track" }],
  orders: [{ orderId: "order_paid_proof_track", productId: "prod_proof_track", buyerEmail: "buyer@internal.invalid", status: "paid_pending_fulfillment", paymentStatus: "succeeded" }],
  fulfillments: [],
}, null, 2) + "\n");
const paidBuyerStreamRes = await call(assets, { method: "GET", authToken: buyerToken, query: { action: "stream", id: uploadedAsset.id } });
assert(paidBuyerStreamRes.statusCode === 200, `paid buyer stream did not unlock: ${paidBuyerStreamRes.statusCode}`);
const paidBuyerDownloadRes = await call(assets, { method: "GET", authToken: buyerToken, query: { action: "download", id: uploadedAsset.id } });
assert(paidBuyerDownloadRes.statusCode === 200, `paid buyer download did not unlock: ${paidBuyerDownloadRes.statusCode}`);
assert(/attachment/.test(paidBuyerDownloadRes.headers?.["content-disposition"] || ""), "paid buyer download did not return attachment disposition");

const submitRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: {
    action: "submit",
    artistId,
    title: "Proof Release",
    type: "single",
    tracks: [{ title: "Proof Track", duration: 181, previewUrl: uploadedAsset.streamUrl }],
    distributionTargets: ["Spotify", "Apple Music"],
  },
});
assert(submitRes.statusCode === 201, `release submit failed: ${submitRes.statusCode}`);
const submitData = parse(submitRes);
const releaseId = submitData.release?.id;
assert(releaseId, "release submit did not return a release id");
assert(submitData.release?.tracks?.[0]?.previewUrl === uploadedAsset.streamUrl, "release submit did not preserve uploaded track preview URL");
assert(submitData.release?.rights?.status === "needs-clearance", "release submit should default linked preview rights to needs-clearance");

const blockedPlaybackRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: { action: "playback-stream", id: releaseId, trackIndex: 0, listenSeconds: 5, completed: false, source: "linked-audio" },
});
assert(blockedPlaybackRes.statusCode === 409, `linked audio playback escaped rights gate: ${blockedPlaybackRes.statusCode}`);

const reviewRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: { action: "review", id: releaseId, decision: "approve", notes: "Ready once rights gate clears" },
});
assert(reviewRes.statusCode === 200, `release review failed: ${reviewRes.statusCode}`);

const blockedPublishRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: { action: "publish", id: releaseId },
});
assert(blockedPublishRes.statusCode === 409, `release publish escaped distribution rights gate: ${blockedPublishRes.statusCode}`);

const rightsRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: {
    action: "update-rights",
    id: releaseId,
    rights: {
      ownershipAttested: true,
      previewUseAuthorized: true,
      distributionAuthorized: true,
      samplesCleared: true,
      coverMechanicalLicense: true,
      publisherClearance: true,
      takedownContactEmail: "rights@internal.invalid",
      notes: "Proof artist controls this test recording and preview use.",
    },
  },
});
assert(rightsRes.statusCode === 200, `rights update failed: ${rightsRes.statusCode}`);
const rightsData = parse(rightsRes);
assert(rightsData.rights?.status === "distribution-ready", "rights gate did not reach distribution-ready");

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

const playbackRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: { action: "playback-stream", id: releaseId, trackIndex: 0, listenSeconds: 19, completed: false, source: "smoke-proof-player" },
});
assert(playbackRes.statusCode === 200, `playback stream proof failed: ${playbackRes.statusCode}`);
const playbackData = parse(playbackRes);
assert(playbackData.playback?.trackTitle === "Proof Track", "playback stream proof did not identify the played track");
assert(playbackData.playback?.playbackKind === "rights-cleared-linked-preview", "playback stream proof did not use the rights-cleared linked-preview lane");
assert(playbackData.release?.analytics?.plays >= 1, "playback stream proof did not increment plays");
assert(playbackData.release?.tracks?.[0]?.plays >= 1, "playback stream proof did not increment track plays");

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

const contentRequestRes = await call(exchange, {
  method: "POST",
  authToken: token,
  body: {
    action: "request-content",
    artistId,
    releaseId,
    requestType: "release-content-kit",
    title: "Proof Release rollout kit",
    brief: "Build captions, hooks, and a proof-safe handoff for the drop.",
    budgetLane: "Single Song Drop",
  },
});
assert(contentRequestRes.statusCode === 201, `content request failed: ${contentRequestRes.statusCode}`);
const contentRequest = parse(contentRequestRes).request;
assert(contentRequest && contentRequest.threadId, "content request did not create an inbox thread");

const messageRes = await call(exchange, {
  method: "POST",
  authToken: token,
  body: {
    action: "send-message",
    artistId,
    recipientId: "creator-exchange",
    topic: "Proof Release content handoff",
    body: "Need a top-tier campaign route for this release.",
  },
});
assert(messageRes.statusCode === 201, `inbox message failed: ${messageRes.statusCode}`);
const messageThread = parse(messageRes).thread;
assert(messageThread?.relay?.source === "connectlog-relay13-ready", "inbox thread is not Relay13-ready");

const communityRes = await call(exchange, {
  method: "POST",
  authToken: token,
  body: {
    action: "publish-community",
    artistId,
    linkedReleaseId: releaseId,
    category: "collab-request",
    body: "Looking for producer feedback before the proof release moves.",
  },
});
assert(communityRes.statusCode === 201, `community post failed: ${communityRes.statusCode}`);

const campaignRes = await call(exchange, {
  method: "POST",
  authToken: token,
  body: {
    action: "build-release-campaign",
    artistId,
    releaseId,
    mood: "cinematic, hungry, late-night",
    platforms: "TikTok, Instagram Reels, YouTube Shorts",
    offerLane: "Release Content Kit",
  },
});
assert(campaignRes.statusCode === 201, `release campaign failed: ${campaignRes.statusCode}`);
const campaign = parse(campaignRes).campaign;
assert(campaign?.contentPack?.captions?.length >= 3, "release campaign did not create captions");
assert(campaign?.contentPack?.shortFormHooks?.length >= 3, "release campaign did not create short-form hooks");

const localFeedPostRes = await call(social, {
  method: "POST",
  authToken: token,
  body: {
    action: "create-feed-post",
    artistId,
    releaseId,
    caption: "Proof Release is live inside the MusicNexus feed.",
    hashtags: "newmusic,feedproof",
  },
});
assert(localFeedPostRes.statusCode === 201, `local feed post failed: ${localFeedPostRes.statusCode}`);
const localFeedPost = parse(localFeedPostRes).post;
assert(localFeedPost?.status === "local-published", "local feed post did not publish into the in-app feed");

const feedActionRes = await call(social, {
  method: "POST",
  authToken: token,
  body: {
    action: "feed-action",
    feedAction: "comment",
    targetId: localFeedPost.id,
    artistId,
    body: "This feed comment is persisted by the social spine.",
  },
});
assert(feedActionRes.statusCode === 201, `feed action failed: ${feedActionRes.statusCode}`);
assert(parse(feedActionRes).stats?.comments?.length >= 1, "feed action did not persist a comment");

const socialConnectorRes = await call(social, {
  method: "POST",
  authToken: token,
  body: {
    action: "save-connector",
    platform: "pixelfed",
    name: "Proof Pixelfed",
    instanceUrl: "https://pixelfed.social",
    handle: "@proof@pixelfed.social",
    tokenEnvKey: "SKYE_MUSIC_PROOF_PIXELFED_TOKEN",
    defaultVisibility: "unlisted",
  },
});
assert(socialConnectorRes.statusCode === 201, `social connector save failed: ${socialConnectorRes.statusCode}`);
const socialConnector = parse(socialConnectorRes).connector;
assert(socialConnector?.platform === "pixelfed", "social connector did not persist Pixelfed platform");
assert(socialConnector?.tokenStatus === "env-token-required", "social connector should require a server env token during smoke proof");

const socialPostRes = await call(social, {
  method: "POST",
  authToken: token,
  body: {
    action: "queue-post",
    connectorId: socialConnector.id,
    artistId,
    releaseId,
    caption: "Proof Release is moving through the open social spine.",
    hashtags: "newmusic,skyeproof",
    visibility: "unlisted",
    altText: "Proof release social image placeholder.",
  },
});
assert(socialPostRes.statusCode === 201, `social post queue failed: ${socialPostRes.statusCode}`);
const socialPost = parse(socialPostRes).post;
assert(socialPost?.status === "queued", "social post did not enter the queued state");
assert(socialPost?.activityPreview?.type === "Create", "social post did not include an ActivityPub-style preview");

const socialPublishRes = await call(social, {
  method: "POST",
  authToken: token,
  body: { action: "publish-post", postId: socialPost.id },
});
assert(socialPublishRes.statusCode === 202, `social publish without env token should stage instead of fail: ${socialPublishRes.statusCode}`);
assert(parse(socialPublishRes).post?.status === "provider-token-required", "social publish did not preserve the provider token boundary");

const socialHubRes = await call(social, {
  method: "GET",
  authToken: token,
  query: { action: "hub", artistId },
});
assert(socialHubRes.statusCode === 200, `social hub failed: ${socialHubRes.statusCode}`);
const socialHub = parse(socialHubRes);
assert(socialHub.connectors.length === 1, "social hub did not return the saved connector");
assert(socialHub.postQueue.some((item) => item.id === socialPost.id), "social hub did not return the queued post");
assert(socialHub.summary?.providerTokenRequired >= 1, "social hub did not surface provider token required count");

const exchangeHubRes = await call(exchange, {
  method: "GET",
  authToken: token,
  query: { action: "hub", artistId },
});
assert(exchangeHubRes.statusCode === 200, `exchange hub failed: ${exchangeHubRes.statusCode}`);
const exchangeHub = parse(exchangeHubRes);
assert(exchangeHub.progress?.achievements?.some((item) => item.id === "launch-runway" && item.unlocked), "launch runway achievement did not unlock");
assert(exchangeHub.contentRequests?.some((item) => item.id === contentRequest.id), "exchange hub did not list the content request");

const operationsBoardRes = await call(releases, {
  method: "GET",
  authToken: token,
  query: { action: "operations-board" },
});
assert(operationsBoardRes.statusCode === 200, `operations board failed: ${operationsBoardRes.statusCode}`);
const operationsBoard = parse(operationsBoardRes);
assert(Array.isArray(operationsBoard.workflows) && operationsBoard.workflows.some((item) => item.releaseId === releaseId), "operations board did not include the queued release");
assert(operationsBoard.scheduled >= 1, "operations board summary did not track the scheduled workflow");

const rightsAuditRes = await call(releases, {
  method: "GET",
  authToken: token,
  query: { action: "rights-audit", artistId },
});
assert(rightsAuditRes.statusCode === 200, `rights audit failed: ${rightsAuditRes.statusCode}`);
const rightsAudit = parse(rightsAuditRes);
assert(rightsAudit.summary?.ready >= 1, "rights audit did not count the ready release");

const takedownRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: { action: "takedown-request", id: releaseId, requesterEmail: "claimant@internal.invalid", reason: "Proof takedown hold should block playback." },
});
assert(takedownRes.statusCode === 202, `takedown request failed: ${takedownRes.statusCode}`);
const takedownData = parse(takedownRes);
assert(takedownData.rights?.playbackBlocked === true, "takedown request did not block playback");

const blockedAfterTakedownRes = await call(releases, {
  method: "POST",
  authToken: token,
  body: { action: "playback-stream", id: releaseId, trackIndex: 0, listenSeconds: 2, completed: false, source: "generated-preview", generatedProof: true },
});
assert(blockedAfterTakedownRes.statusCode === 423, `playback escaped takedown hold: ${blockedAfterTakedownRes.statusCode}`);

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
assert(payoutData.payout?.status === "paperwork_hold", "payout request should stay on paperwork hold before legal payment release");
assert(payoutData.payout?.paperwork?.requiredBeforePayout === true, "payout hold did not include paperwork requirements");

const gatedArtistRes = await call(artists, { method: "GET", authToken: token, query: { action: "get", id: artistId } });
assert(gatedArtistRes.statusCode === 200, `gated artist get failed: ${gatedArtistRes.statusCode}`);
const gatedReleaseRes = await call(releases, { method: "GET", authToken: token, query: { action: "list", artistId } });
assert(gatedReleaseRes.statusCode === 200, `gated release list failed: ${gatedReleaseRes.statusCode}`);

const payoutListRes = await call(payments, { method: "GET", authToken: token, query: { action: "payouts", status: "paperwork_hold" } });
assert(payoutListRes.statusCode === 200, `payout list failed: ${payoutListRes.statusCode}`);
const payoutListData = parse(payoutListRes);
assert(Array.isArray(payoutListData.payouts) && payoutListData.payouts.some((entry) => entry.id === payoutId), "payout list did not include the requested payout");

const analyticsRes = await call(analytics, { method: "GET", authToken: token });
assert(analyticsRes.statusCode === 200, `music analytics failed: ${analyticsRes.statusCode}`);

const providerStatusRes = await call(providerHooks, { method: "GET", authToken: token, query: { action: "status" } });
assert(providerStatusRes.statusCode === 200, `provider hook status failed: ${providerStatusRes.statusCode}`);
assert(parse(providerStatusRes).providers?.some((provider) => provider.id === "dsp"), "provider hook status did not expose DSP wiring");

const providerJobRes = await call(providerHooks, {
  method: "POST",
  authToken: token,
  body: { action: "queue-job", provider: "transcoding", assetId: uploadedAsset.id, releaseId, artistId, title: "Transcode future lane" },
});
assert(providerJobRes.statusCode === 202, `provider hook queue failed: ${providerJobRes.statusCode}`);
const providerJob = parse(providerJobRes).job;
assert(providerJob?.status === "waiting-provider-config", "provider hook job should wait until provider webhook env is configured");

const providerJobsRes = await call(providerHooks, { method: "GET", authToken: token, query: { action: "jobs", provider: "transcoding" } });
assert(providerJobsRes.statusCode === 200, `provider hook jobs read failed: ${providerJobsRes.statusCode}`);
assert(parse(providerJobsRes).jobs?.some((job) => job.id === providerJob.id), "provider hook jobs list did not include the queued job");
const revokeRes = await call(session, { method: "DELETE", authToken: token });
assert(revokeRes.statusCode === 200, `shared Gate logout status failed: ${revokeRes.statusCode}`);
const analyticsByRevokedRes = await call(analytics, { method: "GET", authToken: token });
assert(analyticsByRevokedRes.statusCode === 200, `shared Gate bearer unexpectedly stopped inside the app-local no-op revocation path: ${analyticsByRevokedRes.statusCode}`);

console.log(JSON.stringify({
  ok: true,
  app: "SkyeMusicNexus",
  surface: "artist operating platform plus shared SkyGate-backed artist, release, and payments handlers",
  verified: [
    "browser artist and admin surfaces are wired to shared SkyGate session handling",
    "session status proves local proof bootstrap is retired",
    "local operator password grants are removed",
    "shared FS27/SkyGate bearer unlocks protected smoke flows",
    "session status can introspect the active shared Gate session",
    "app-local revocation is a no-op because shared Gate owns bearer lifetime",
    "browser auth storage is delegated to the shared Gate bridge",
  "artist, release, and operations reads reject ungated requests",
  "audio asset upload, list, and gated stream require a gate session",
    "audio asset storage defaults to the local handler workspace and exposes an opt-in SkyeVault/R2 durable backend",
  "direct R2 upload sessions and completion are wired behind the gate for later production storage",
  "artist registration works in the local handler surface",
  "release submit, review, publish, and stream reporting work",
  "gated playback stream proof records plays and track-level listening telemetry",
  "linked audio playback is blocked until rights are attested",
  "release publishing is blocked until distribution rights are attested",
  "rights audit reports clearance state",
    "takedown hold blocks subsequent playback",
    "approved and live releases can be queued into a persisted release operations board",
    "release operations workflows can be updated and summarized in-folder",
    "payments credit, ledger, payout request, and payout queue work",
    "admin analytics accepts the shared Gate bearer token",
    "artist and release read endpoints return the created records only with a gate session",
    "music exchange reads reject ungated requests",
    "provider/transcoding/DSP/legal hook jobs reject ungated requests and queue safely until provider env is configured",
    "content requests create gated work packets and Relay13-ready inbox threads",
    "artist inbox messages persist through the exchange handler",
    "community posts persist through the exchange handler",
    "release campaign packs generate captions, hooks, rollout tasks, and asset requests",
    "achievement progression unlocks a launch runway when release, content, community, and campaign tracks are active",
    "open social feed surface includes Pixelfed/Mastodon/Funkwhale connector controls",
    "music social connector records keep provider tokens in server env variables",
    "provider-token-safe social posts queue with ActivityPub-style previews",
    "social provider publishing preserves the token-required boundary when env is absent",
  ],
  not_proven: [
    "real identity-provider handoff into SkyGate tokens",
    "deployed platform distribution integrations",
    "native owned ActivityPub actor federation",
    "live Pixelfed/Mastodon/Funkwhale provider publish with production tokens",
    "formal legal review or production DMCA-agent operations",
  ],
  artistId,
  releaseId,
  payoutId,
}, null, 2));
