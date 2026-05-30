import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN = "true";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const gateRootCandidates = [
  path.join(repoRoot, "metraiyux_0s_site", "skyegate", "source", "SkyeGateFS27"),
  path.join(repoRoot, "SkyeGateFS27")
];
const gateRoot = gateRootCandidates.find((candidate) => fs.existsSync(path.join(candidate, "scripts", "_local-env.mjs")));
assert.ok(gateRoot, `SkyeGateFS27 source not found. Checked: ${gateRootCandidates.join(", ")}`);

const { loadLocalEnv } = await import(pathToFileURL(path.join(gateRoot, "scripts", "_local-env.mjs")).href);
loadLocalEnv({ root: gateRoot, repoRoot });

const [{ default: checkoutHandler }, catalog, relay13] = await Promise.all([
  import(pathToFileURL(path.join(gateRoot, "netlify", "functions", "skyepay-checkout.js")).href),
  import(pathToFileURL(path.join(gateRoot, "netlify", "functions", "_lib", "skyepayCatalog.js")).href),
  import(pathToFileURL(path.join(gateRoot, "netlify", "functions", "_lib", "relay13Bridge.js")).href)
]);

const { getSkyePayClient, getSkyePayOffer } = catalog;
const { buildSkyePayRelay13Payload } = relay13;

function request(pathname, init = {}) {
  return new Request(`http://127.0.0.1:4987${pathname}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {})
    }
  });
}

async function jsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response, got: ${text.slice(0, 500)}`);
  }
}

const landingOffers = {
  "skyemusicnexus-single-drop-landing-page": { listed: 223900, due: 23900 },
  "skyemusicnexus-artist-page-epk": { listed: 244400, due: 44400 },
  "skyemusicnexus-animated-visualizer-page": { listed: 279600, due: 79600 },
  "skyemusicnexus-custom-artist-universe": { listed: 319700, due: 119700 }
};

const client = getSkyePayClient("metraiyux-0s");
assert.ok(client, "metraiyux-0s client exists");

async function dryRunLandingCheckout(offerId, index) {
  const offer = getSkyePayOffer(offerId);
  const expected = landingOffers[offerId];
  assert.ok(offer, `${offerId} internal offer exists`);
  const body = {
    client_slug: "metraiyux-0s",
    offer_id: offerId,
    customer_name: `Artist Landing Stress ${index}`,
    customer_email: `artist-landing-stress-${index}@example.com`,
    company_name: "SkyeMusicNexus Artist Proof",
    dry_run: true,
    idempotency_key: `${offerId}-stress-${index}`
  };

  const response = await checkoutHandler(request("/skyepay/checkout", {
    method: "POST",
    body: JSON.stringify(body)
  }), {});
  assert.equal(response.status, 200, `${offerId} stress response`);
  const checkout = await jsonResponse(response);
  assert.equal(checkout.ok, true, `${offerId} ok`);
  assert.equal(checkout.dry_run, true, `${offerId} dry run`);
  assert.equal(checkout.skyemerit.applied, true, `${offerId} merit applied`);
  assert.equal(checkout.skyemerit.code, "SKYEMUSICNEXUS-LAUNCH-2000", `${offerId} merit code`);
  assert.equal(checkout.skyemerit.pack_id, "SKYEMUSICNEXUS-LAUNCH-MERIT-PACK", `${offerId} merit pack`);
  assert.equal(checkout.skyemerit.original_due_cents, expected.listed, `${offerId} listed`);
  assert.equal(checkout.skyemerit.applied_discount_cents, 200000, `${offerId} discount`);
  assert.equal(checkout.skyemerit.adjusted_due_cents, expected.due, `${offerId} due`);
  assert.equal(Number(checkout.metadata.original_amount_due_today_cents), expected.listed, `${offerId} metadata listed`);
  assert.equal(Number(checkout.metadata.skyemerit_discount_cents), 200000, `${offerId} metadata discount`);
  assert.equal(Number(checkout.metadata.amount_due_today_cents), expected.due, `${offerId} metadata due`);
  assert.equal(checkout.metadata.skyemerit_pack_id, "SKYEMUSICNEXUS-LAUNCH-MERIT-PACK", `${offerId} metadata pack`);

  const relayPayload = buildSkyePayRelay13Payload({
    client,
    offer,
    body,
    orderId: checkout.order_id,
    metadata: checkout.metadata,
    skyeMeritCheckout: checkout.skyemerit,
    checkoutUrl: checkout.url,
    sessionId: checkout.id
  });
  assert.equal(relayPayload.channel, "skyemusicnexus-artist-landing", `${offerId} relay channel`);
  assert.equal(relayPayload.metadata.skyemerit_discount_cents, "200000", `${offerId} relay discount`);
  assert.equal(relayPayload.metadata.amount_due_today_cents, String(expected.due), `${offerId} relay due`);
  assert.equal(relayPayload.metadata.listed_value_cents, String(expected.listed), `${offerId} relay listed`);
  assert.match(relayPayload.body, /\$2,000/, `${offerId} relay body merit value`);
  assert.match(relayPayload.body, /Launch window ends: 2026-06-26/, `${offerId} relay launch window`);
  return checkout;
}

const jobs = [];
let index = 0;
for (let round = 0; round < 12; round += 1) {
  for (const offerId of Object.keys(landingOffers)) {
    index += 1;
    jobs.push(dryRunLandingCheckout(offerId, index));
  }
}

const results = await Promise.all(jobs);
assert.equal(results.length, 48, "stress checkout count");

console.log("skyemusicnexus-artist-landing-skyemerit-stress: ok");
