import { collectMarketSnapshot, readableSnapshotLabel, sourceSummary } from "./connectors.mjs";
import { buildOpportunities } from "./opportunity-engine.mjs";
import { buildGrowthPlan } from "./planner.mjs";
import { buildStaticSitePatch } from "./adapters/static-site.mjs";
import { pullConfiguredSources } from "./source-clients.mjs";
import { nowIso, receiptId, stableHash } from "./utils.mjs";

export function runGrowthCycle(payload = {}, options = {}) {
  const mergedPayload = mergePulledSources(payload);
  const snapshot = collectMarketSnapshot(mergedPayload);
  const opportunities = buildOpportunities(snapshot, {
    maxActions: options.maxActions || payload.options?.maxActions
  });
  const plan = buildGrowthPlan(snapshot, opportunities, {
    label: payload.label || readableSnapshotLabel(snapshot),
    maxExperiments: options.maxExperiments || payload.options?.maxExperiments
  });
  const adapter = payload.adapter?.type === "static-site" || options.includeStaticPatch
    ? buildStaticSitePatch(plan, payload.adapter || {})
    : null;

  return {
    ok: true,
    receipt: {
      id: receiptId("agl_cycle"),
      createdAt: nowIso(),
      inputHash: stableHash(mergedPayload).slice(0, 24),
      mode: snapshot.mode,
      noGscCapable: true,
      autoApplied: false
    },
    snapshot: {
      mode: snapshot.mode,
      noGscCapable: true,
      business: snapshot.business,
      sources: sourceSummary(snapshot),
      keywordCount: snapshot.keywords.length,
      pageCount: snapshot.pages.length,
      competitorCount: snapshot.competitors.length,
      fallbackNotes: snapshot.sources?.gsc?.connected ? [] : snapshot.fallbackNotes
    },
    plan,
    adapter,
    nextBestInputs: nextBestInputs(snapshot),
    sourcePullReceipt: mergedPayload.sourcePullReceipt || null
  };
}

function mergePulledSources(payload = {}) {
  const pulled = payload.pulledSources || payload.sourcesPulled || {};
  const sourcePullReceipt = payload.sourcePullReceipt || pulled.receipt || null;
  return {
    ...payload,
    gsc: payload.gsc || pulled.gsc,
    semrush: payload.semrush || pulled.semrush,
    serp: payload.serp || pulled.serp,
    sourcePullReceipt
  };
}

export async function runConnectedGrowthCycle(payload = {}, env = process.env, options = {}) {
  const sourcePull = await pullConfiguredSources(payload, env, options);
  return runGrowthCycle({
    ...payload,
    pulledSources: sourcePull.pulled,
    sourcePullReceipt: {
      pulledAt: sourcePull.pulledAt,
      receipts: sourcePull.receipts
    }
  });
}

function nextBestInputs(snapshot) {
  const inputs = [];
  if (!snapshot.sources?.gsc?.connected) {
    inputs.push("Connect Google Search Console when the owned domain exists; until then keep sending seed keywords, public preview URL, and competitor URLs.");
  }
  if (!snapshot.sources?.serp?.connected) {
    inputs.push("Add live SERP snapshots for the top service/location keywords to improve FAQ, proof, and page-type decisions.");
  }
  if (!snapshot.sources?.site?.connected) {
    inputs.push("Send a page inventory or crawl output so the developer agents can target existing routes instead of drafting from scratch.");
  }
  if (!snapshot.business?.services?.length) {
    inputs.push("Add the actual services/offers so the fallback keyword generator can stop relying on industry-level guesses.");
  }
  return inputs;
}

export function ingestOnly(payload = {}) {
  const snapshot = collectMarketSnapshot(mergePulledSources(payload));
  return {
    ok: true,
    mode: snapshot.mode,
    business: snapshot.business,
    sources: sourceSummary(snapshot),
    keywords: snapshot.keywords,
    pages: snapshot.pages,
    competitors: snapshot.competitors,
    questions: snapshot.questions
  };
}

export function buildFallbackBrief(payload = {}) {
  const cycle = runGrowthCycle({
    ...payload,
    gsc: {},
    sources: { ...(payload.sources || {}), gsc: {} }
  }, { maxActions: payload.options?.maxActions || 10 });
  return {
    ok: true,
    mode: cycle.snapshot.mode,
    brief: {
      business: cycle.snapshot.business,
      firstActions: cycle.plan.prioritizedActions.slice(0, 5),
      dataToAskClientFor: cycle.nextBestInputs,
      canStartBeforeDomain: true,
      suggestedOffer: "No-domain agentic SEO starter: seed market map, preview-site structure, service/location/FAQ drafts, and launch-ready GSC connection path."
    }
  };
}
