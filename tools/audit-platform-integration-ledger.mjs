#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKYPAY_OFFERS } from "../SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

async function read(rel) {
  return readFile(path.join(root, rel), "utf8");
}

async function readJson(rel) {
  return JSON.parse(await read(rel));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertTokens(label, source, tokens) {
  for (const token of tokens) {
    assert(source.includes(token), `${label} missing token: ${token}`);
  }
}

const ledger = await readJson("metraiyux_0s_site/data/platform-integration-ledger.json");
const liveSurfaceRegistry = await readJson("metraiyux_0s_site/brain/live-surface-registry.json");
const salesRegistry = await read("metraiyux_0s_site/brain/sales-offer-registry.json");
const router = await read("metraiyux_0s_site/sales/live-proof-router.html");
const operatorIndex = await read("metraiyux_0s_site/operator/index.html");
const proofIndex = await read("metraiyux_0s_site/proof/index.html");
const home = await read("metraiyux_0s_site/index.html");
const readme = await read("metraiyux_0s_site/README.md");
const llms = await read("metraiyux_0s_site/llms.txt");
const packageJson = await readJson("package.json");
const changelogSources = await Promise.all(
  ledger.source_changelogs.map(async (rel) => [rel, await read(rel)])
);

const requiredPlatformIds = [
  "skyepay-store",
  "skyemerit",
  "skyeroutex-workforce-command",
  "skyevault",
  "skyecard-usage",
  "skyemail",
  "free99-platform-expansions",
  "skyesplitengine-free99",
  "marketing-made-easy-growth-suite",
  "skyeopsconsole-free99",
  "free99-paid-platform-intake"
];
const platformIds = new Set(ledger.platforms.map((platform) => platform.id));
for (const id of requiredPlatformIds) {
  assert(platformIds.has(id), `platform ledger missing platform id: ${id}`);
}

for (const platform of ledger.platforms) {
  assert(platform.system_surfaces?.length, `${platform.id} missing system surfaces`);
  assert(platform.integration_points?.length, `${platform.id} missing integration points`);
  assert(platform.advertising?.headline, `${platform.id} missing advertising headline`);
  assert(platform.advertising?.cta, `${platform.id} missing advertising CTA`);
  assert(platform.proof?.commands?.length, `${platform.id} missing proof commands`);
}

for (const campaign of ledger.campaign_matrix || []) {
  assert(campaign.ad_angle && campaign.proof_route, `${campaign.campaign} missing ad angle or proof route`);
}

const liveSurfaceIds = new Set(liveSurfaceRegistry.surfaces.map((surface) => surface.id));
for (const id of [
  "skygate-skyepay-store",
  "skyevault-drop-workspace",
  "skye-card-usage-offers",
  "skyemail-platform",
  "metraiyux-marketing-made-easy-hub",
  "metraiyux-marketing-made-easy-suite-index",
  "metraiyux-marketing-made-easy-deep-scan-receipt"
]) {
  assert(liveSurfaceIds.has(id), `live surface registry missing surface id: ${id}`);
}
assert(
  liveSurfaceRegistry.surface_count === liveSurfaceRegistry.surfaces.length,
  `live surface_count ${liveSurfaceRegistry.surface_count} does not match surfaces length ${liveSurfaceRegistry.surfaces.length}`
);

assertTokens("sales offer registry", salesRegistry, [
  "skygate_skyepay_store",
  "skygate_skyepay_offers_api",
  "skyevault-access-plans",
  "skyecard-usage-offers",
  "skyemail_platform",
  "metraiyux_platform_integration_ledger",
  "metraiyux_skyesplitengine_expansion",
  "do_not_create_skyesplitengine_free99",
  "metraiyux_marketing_made_easy_expansion",
  "metraiyux_marketing_made_easy_suite",
  "do_not_create_marketing_made_easy_skyewebcreatormax",
  "marketing-made-easy-growth-suite-quote-only",
  "do_not_create_skyeopsconsole_free99",
  "free99-paid-platform-intake"
]);

assertTokens("live proof router", router, [
  "SkyePay Store",
  "SkyeVault",
  "SkyeMail",
  "Platform Integration Ledger",
  "They ask what they can buy now.",
  "They need protected file handoff.",
  "They need owned email or mailbox proof.",
  "They need payout splits without another bill.",
  "Skye Split Engine Free99",
  "They need marketing made operational.",
  "Marketing Made Easy"
]);

for (const [label, source] of [
  ["operator index", operatorIndex],
  ["proof index", proofIndex],
  ["home page", home],
  ["README", readme],
  ["llms.txt", llms]
]) {
  assertTokens(label, source, ["platform-integration-ledger.html", "SkyePay", "Skye Split Engine", "Marketing Made Easy"]);
}

const offerIds = new Set(SKYPAY_OFFERS.map((offer) => offer.id));
for (const id of [
  "skyevault-starter-access",
  "skyevault-pro-access",
  "skyevault-command-access",
  "skyecard-ai-boost-25",
  "skyecard-push-pack-49",
  "skyecard-launch-credit-99",
  "skyecard-audit-pack-299"
]) {
  assert(offerIds.has(id), `SkyePay catalog missing offer id: ${id}`);
}

for (const script of [
  "proof:skyepay",
  "gateway:skyepay:scan",
  "gateway:skyepay:owner-approval",
  "0s:platform-accounting",
  "0s:marketing-made-easy:scan",
  "0s:marketing-made-easy:smoke",
  "0s:marketing-made-easy:proof"
]) {
  assert(packageJson.scripts?.[script], `package.json missing script: ${script}`);
}

const changelogCorpus = changelogSources.map(([, text]) => text).join("\n");
assertTokens("source changelogs", changelogCorpus, [
  "SkyeMerit",
  "RouteX",
  "SkyePay",
  "SkyeVault",
  "SkyeCard",
  "SkyeMail",
  "Skye Split Engine",
  "Marketing Made Easy",
  "Free99"
]);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  platforms: ledger.platforms.length,
  campaigns: ledger.campaign_matrix.length,
  live_surfaces: liveSurfaceRegistry.surfaces.length,
  skypay_catalog_offers: SKYPAY_OFFERS.length
}, null, 2));
