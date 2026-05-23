import {
  asArray,
  clamp,
  cleanText,
  compactObject,
  numberOrZero,
  routeFromParts,
  slugify,
  stableHash,
  titleCase,
  unique,
  uniqueBy
} from "./utils.mjs";

const RISKY_INDUSTRIES = /\b(legal|law|medical|health|dental|finance|insurance|tax|real estate|therapy)\b/i;

function keywordDemand(keyword) {
  const impressions = numberOrZero(keyword.impressions);
  const volume = numberOrZero(keyword.volume);
  const clicks = numberOrZero(keyword.clicks);
  return Math.log10(1 + impressions + volume + clicks * 20) * 18;
}

function gapScore(keyword) {
  const position = numberOrZero(keyword.position);
  if (!position) return 18;
  if (position > 20) return 26;
  if (position > 10) return 22;
  if (position > 4) return 14;
  return 4;
}

function intentScore(keyword) {
  const intent = keyword.intent || "mixed";
  if (intent === "commercial" || intent === "service" || intent === "local") return 22;
  if (intent === "comparison") return 16;
  if (intent === "informational") return 11;
  return 8;
}

function buildOpportunityContext(snapshot) {
  return {
    services: asArray(snapshot.business?.services).map((service) => ({
      raw: service,
      text: cleanText(service).toLowerCase()
    })),
    locations: asArray(snapshot.business?.locations).map((location) => ({
      raw: location,
      text: cleanText(location).toLowerCase()
    })),
    pages: asArray(snapshot.pages).map((page) => ({
      ...page,
      searchText: [page.url, page.route, page.title, page.h1, ...asArray(page.headings)].join(" ").toLowerCase()
    }))
  };
}

function hasLocation(keyword, snapshot, context = buildOpportunityContext(snapshot)) {
  const query = cleanText(keyword.query).toLowerCase();
  return Boolean(keyword.location || context.locations.some((location) => query.includes(location.text)));
}

function serviceFromKeyword(keyword, snapshot, context = buildOpportunityContext(snapshot)) {
  const query = cleanText(keyword.query).toLowerCase();
  const match = context.services.find((service) => query.includes(service.text));
  return match?.raw || context.services[0]?.raw || snapshot.business?.industry || "service";
}

function locationFromKeyword(keyword, snapshot, context = buildOpportunityContext(snapshot)) {
  if (keyword.location) return keyword.location;
  const query = cleanText(keyword.query).toLowerCase();
  const match = context.locations.find((location) => query.includes(location.text));
  return match?.raw || context.locations[0]?.raw || "";
}

function targetRouteForKeyword(keyword, snapshot, context = buildOpportunityContext(snapshot)) {
  const service = serviceFromKeyword(keyword, snapshot, context);
  const location = locationFromKeyword(keyword, snapshot, context);
  if (hasLocation(keyword, snapshot, context)) return routeFromParts(["locations", location, service]);
  if (keyword.intent === "informational") return routeFromParts(["faqs", keyword.query]);
  if (keyword.intent === "commercial") return routeFromParts(["pricing", service]);
  return routeFromParts(["services", service]);
}

function nearestPage(keyword, snapshot, context = buildOpportunityContext(snapshot)) {
  const query = cleanText(keyword.query).toLowerCase();
  const service = cleanText(serviceFromKeyword(keyword, snapshot, context)).toLowerCase();
  const queryWords = query.split(/\s+/).filter((word) => word.length > 4);
  const page = context.pages.find((candidate) => {
    return candidate.searchText.includes(service) || queryWords.some((word) => candidate.searchText.includes(word));
  });
  return page || null;
}

function riskForOpportunity(type, snapshot, keyword = {}) {
  const risks = [];
  if (RISKY_INDUSTRIES.test(snapshot.business?.industry || "")) {
    risks.push("regulated-or-high-trust-industry-review");
  }
  if (type === "proof_page_build") risks.push("proof-claims-need-evidence");
  if (keyword.source?.includes("fallback") || snapshot.mode.includes("no_gsc")) {
    risks.push("low-confidence-market-data");
  }
  return risks;
}

function approvalForRisks(risks) {
  if (!risks.length) return "auto_draft_allowed";
  if (risks.includes("regulated-or-high-trust-industry-review") || risks.includes("proof-claims-need-evidence")) {
    return "human_review_required_before_publish";
  }
  return "human_review_recommended";
}

function opportunityFromKeyword(keyword, snapshot, context) {
  const existingPage = nearestPage(keyword, snapshot, context);
  const needsLocationPage = hasLocation(keyword, snapshot, context) && !existingPage;
  const type = needsLocationPage
    ? "location_page_build"
    : existingPage
      ? "content_refresh"
      : keyword.intent === "informational"
        ? "faq_expand"
        : "service_page_build";
  const route = existingPage?.route || existingPage?.url || targetRouteForKeyword(keyword, snapshot, context);
  const risks = riskForOpportunity(type, snapshot, keyword);
  const score = clamp(keywordDemand(keyword) + gapScore(keyword) + intentScore(keyword) + numberOrZero(keyword.confidence) * 20 - risks.length * 6, 1, 100);

  return compactObject({
    id: `opp_${stableHash({ type, route, query: keyword.query }).slice(0, 12)}`,
    type,
    score: Number(score.toFixed(1)),
    confidence: Number(numberOrZero(keyword.confidence).toFixed(2)),
    source: keyword.source,
    query: keyword.query,
    intent: keyword.intent,
    targetRoute: route,
    targetPage: existingPage?.url || existingPage?.route || "",
    service: serviceFromKeyword(keyword, snapshot, context),
    location: locationFromKeyword(keyword, snapshot, context),
    why: existingPage
      ? `Refresh the existing page around "${keyword.query}" because the market data shows reachable demand.`
      : `Create a targeted page around "${keyword.query}" because no strong matching page was found.`,
    risks,
    approval: approvalForRisks(risks)
  });
}

function pageHealthOpportunities(snapshot) {
  const opportunities = [];
  for (const page of asArray(snapshot.pages)) {
    const route = page.route || page.url;
    if (!route) continue;
    if (!page.ctas?.length) {
      opportunities.push({
        id: `opp_${stableHash({ route, type: "cta_rewrite" }).slice(0, 12)}`,
        type: "cta_rewrite",
        score: 58,
        confidence: page.confidence || 0.7,
        source: "site_crawl",
        targetRoute: route,
        targetPage: page.url || route,
        why: "The page is visible in the site inventory but has no captured CTA.",
        risks: [],
        approval: "auto_draft_allowed"
      });
    }
    if (numberOrZero(page.wordCount) > 0 && numberOrZero(page.wordCount) < 450) {
      opportunities.push({
        id: `opp_${stableHash({ route, type: "thin_page_refresh" }).slice(0, 12)}`,
        type: "content_refresh",
        score: 52,
        confidence: page.confidence || 0.7,
        source: "site_crawl",
        targetRoute: route,
        targetPage: page.url || route,
        why: "The page appears thin for a commercial SEO surface.",
        risks: [],
        approval: "auto_draft_allowed"
      });
    }
    if (!page.hasSchema && /service|location|contact|about|pricing/i.test(route)) {
      opportunities.push({
        id: `opp_${stableHash({ route, type: "schema_add" }).slice(0, 12)}`,
        type: "schema_add",
        score: 47,
        confidence: page.confidence || 0.7,
        source: "site_crawl",
        targetRoute: route,
        targetPage: page.url || route,
        why: "The route looks eligible for structured data but no schema was captured.",
        risks: [],
        approval: "auto_draft_allowed"
      });
    }
  }
  return opportunities;
}

function internalLinkOpportunities(snapshot, keywordOpportunities) {
  const pages = asArray(snapshot.pages);
  const sourcePages = pages.filter((page) => page.url || page.route).slice(0, 8);
  const targetRoutes = unique(keywordOpportunities.map((item) => item.targetRoute)).slice(0, 8);
  const output = [];

  for (const targetRoute of targetRoutes) {
    const sources = sourcePages
      .filter((page) => (page.route || page.url) !== targetRoute)
      .slice(0, 3)
      .map((page) => page.route || page.url);
    if (!sources.length) continue;
    output.push({
      id: `opp_${stableHash({ type: "internal_link_add", targetRoute, sources }).slice(0, 12)}`,
      type: "internal_link_add",
      score: 49,
      confidence: snapshot.sources?.site?.confidence || 0.55,
      source: "site_crawl",
      targetRoute,
      sourceRoutes: sources,
      why: "Link equity should flow from existing relevant pages into the new or refreshed SEO target.",
      risks: [],
      approval: "auto_draft_allowed"
    });
  }
  return output;
}

function faqOpportunities(snapshot) {
  return asArray(snapshot.questions).slice(0, 12).map((question) => {
    const service = serviceFromKeyword({ query: question.parentKeyword || question.query }, snapshot);
    const route = routeFromParts(["faqs", service]);
    const risks = riskForOpportunity("faq_expand", snapshot, question);
    return {
      id: `opp_${stableHash({ type: "faq_expand", query: question.query, route }).slice(0, 12)}`,
      type: "faq_expand",
      score: 55,
      confidence: question.confidence || 0.72,
      source: question.source || "serp",
      query: question.query,
      targetRoute: route,
      service,
      why: `SERP question data suggests users need a direct answer for "${question.query}".`,
      risks,
      approval: approvalForRisks(risks)
    };
  });
}

function proofOpportunities(snapshot) {
  const competitors = asArray(snapshot.competitors);
  if (!competitors.length) return [];
  const service = asArray(snapshot.business?.services)[0] || snapshot.business?.industry || "service";
  const route = routeFromParts(["proof", service]);
  const risks = riskForOpportunity("proof_page_build", snapshot);
  return [{
    id: `opp_${stableHash({ type: "proof_page_build", route, competitors: competitors.slice(0, 5) }).slice(0, 12)}`,
    type: "proof_page_build",
    score: snapshot.mode.includes("no_gsc") ? 44 : 62,
    confidence: snapshot.mode.includes("no_gsc") ? 0.34 : 0.64,
    source: competitors[0]?.source || "market",
    targetRoute: route,
    service,
    competitorCount: competitors.length,
    why: "Competitive SERP data shows the site needs a proof surface that backs claims before CTAs ask for conversion.",
    risks,
    approval: approvalForRisks(risks)
  }];
}

function navNodeOpportunity(snapshot, keywordOpportunities) {
  const routeGroups = unique(keywordOpportunities.map((item) => item.targetRoute).filter(Boolean)).slice(0, 6);
  if (!routeGroups.length) return [];
  return [{
    id: `opp_${stableHash({ type: "nav_node_refresh", routeGroups }).slice(0, 12)}`,
    type: "nav_node_refresh",
    score: 46,
    confidence: 0.58,
    source: "planner",
    targetRoutes: routeGroups,
    why: "The site needs navigation nodes that expose the highest-value service, location, FAQ, and proof routes.",
    risks: [],
    approval: "human_review_recommended"
  }];
}

function selectKeywordCandidates(keywords, maxCandidates) {
  const merged = new Map();
  for (const keyword of asArray(keywords)) {
    const key = `${cleanText(keyword.query).toLowerCase()}:${cleanText(keyword.page).toLowerCase()}`;
    const candidateScore = keywordDemand(keyword) + gapScore(keyword) + intentScore(keyword) + numberOrZero(keyword.confidence) * 20;
    const existing = merged.get(key);
    if (!existing || candidateScore > existing.candidateScore) {
      merged.set(key, { keyword, candidateScore });
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.candidateScore - a.candidateScore)
    .slice(0, maxCandidates)
    .map((item) => item.keyword);
}

export function buildOpportunities(snapshot, options = {}) {
  const maxActions = Number(options.maxActions || 24);
  const maxKeywordCandidates = Number(options.maxKeywordCandidates || Math.max(240, maxActions * 16));
  const context = buildOpportunityContext(snapshot);
  const keywordOpportunities = selectKeywordCandidates(snapshot.keywords, maxKeywordCandidates)
    .map((keyword) => opportunityFromKeyword(keyword, snapshot, context))
    .filter(Boolean);
  const opportunities = uniqueBy([
    ...keywordOpportunities,
    ...faqOpportunities(snapshot),
    ...pageHealthOpportunities(snapshot),
    ...internalLinkOpportunities(snapshot, keywordOpportunities),
    ...proofOpportunities(snapshot),
    ...navNodeOpportunity(snapshot, keywordOpportunities)
  ], (item) => `${item.type}:${item.targetRoute}:${item.query || ""}`);

  return opportunities
    .sort((a, b) => b.score - a.score)
    .slice(0, maxActions)
    .map((item, index) => ({
      ...item,
      priority: index + 1,
      label: titleCase(item.type.replace(/_/g, " "))
    }));
}
