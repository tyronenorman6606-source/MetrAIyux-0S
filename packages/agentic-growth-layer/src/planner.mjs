import { asArray, cleanText, compactObject, costUnit, nowIso, receiptId, slugify, titleCase } from "./utils.mjs";

export const AGENT_LANES = [
  {
    id: "market-intake-agent",
    label: "Market Intake Agent",
    owns: ["gsc", "semrush", "keywordSeed"],
    job: "Normalize raw market inputs, score data confidence, and identify missing access."
  },
  {
    id: "serp-intent-agent",
    label: "SERP Intent Agent",
    owns: ["serp", "questions", "competitors"],
    job: "Translate live SERP shape into FAQ, proof, comparison, and location intent."
  },
  {
    id: "site-audit-agent",
    label: "Site Audit Agent",
    owns: ["pages", "structure", "schema"],
    job: "Inspect page inventory, thin content, CTAs, internal links, schema, and crawlable structure."
  },
  {
    id: "growth-architect-agent",
    label: "Growth Architect Agent",
    owns: ["prioritization", "clusters", "nav-nodes"],
    job: "Turn demand and site gaps into a safe execution roadmap."
  },
  {
    id: "developer-agent",
    label: "Developer Agent",
    owns: ["patches", "components", "routes"],
    job: "Generate stack-specific patch manifests and acceptance checks."
  },
  {
    id: "proof-qa-agent",
    label: "Proof QA Agent",
    owns: ["claims", "browser-proof", "receipts"],
    job: "Block unsupported public claims and require browser/runtime proof before production claims are treated as ready."
  },
  {
    id: "publisher-agent",
    label: "Publisher Agent",
    owns: ["cms", "repo", "deployment"],
    job: "Apply approved changes through the client adapter only after entitlement, auth, and review gates pass."
  }
];

function agentForOpportunity(opportunity) {
  const map = {
    location_page_build: "developer-agent",
    service_page_build: "developer-agent",
    proof_page_build: "proof-qa-agent",
    faq_expand: "serp-intent-agent",
    cta_rewrite: "growth-architect-agent",
    schema_add: "developer-agent",
    internal_link_add: "growth-architect-agent",
    nav_node_refresh: "growth-architect-agent",
    content_refresh: "developer-agent"
  };
  return map[opportunity.type] || "growth-architect-agent";
}

function actionContract(opportunity) {
  const route = opportunity.targetRoute || asArray(opportunity.targetRoutes)[0] || "/";
  const base = {
    route,
    approval: opportunity.approval,
    riskFlags: asArray(opportunity.risks),
    source: opportunity.source,
    confidence: opportunity.confidence
  };

  if (opportunity.type === "internal_link_add") {
    return {
      ...base,
      operation: "add_internal_links",
      sourceRoutes: asArray(opportunity.sourceRoutes),
      anchorText: opportunity.service || opportunity.query || "learn more",
      acceptance: [
        "At least two contextual internal links point to the target route.",
        "No unrelated footer-only link stuffing.",
        "Links are visible on desktop and mobile."
      ]
    };
  }

  if (opportunity.type === "faq_expand") {
    return {
      ...base,
      operation: "upsert_faq_block",
      question: opportunity.query,
      answerBrief: `Answer directly, cite real business proof where available, and avoid unsupported guarantees.`,
      acceptance: [
        "FAQ is visible without layout overlap.",
        "FAQ schema is added only when the answer is visible on the page.",
        "High-trust claims are flagged for human review."
      ]
    };
  }

  if (opportunity.type === "nav_node_refresh") {
    return {
      ...base,
      operation: "refresh_navigation_nodes",
      targetRoutes: asArray(opportunity.targetRoutes),
      acceptance: [
        "Primary nav exposes service, location, proof, and FAQ paths without overcrowding.",
        "Mobile menu opens, closes, and routes correctly.",
        "No route becomes public if the client stack marks it private."
      ]
    };
  }

  if (opportunity.type === "proof_page_build") {
    return {
      ...base,
      operation: "create_or_refresh_proof_page",
      pageBrief: `Build proof for ${opportunity.service || "the offer"} using only verified receipts, images, reviews, case notes, or operator-approved claims.`,
      acceptance: [
        "Every proof claim has evidence or is removed.",
        "CTA does not imply guaranteed results.",
        "Browser proof receipt is required before production-ready status."
      ]
    };
  }

  return {
    ...base,
    operation: opportunity.type,
    pageBrief: `Target "${opportunity.query || opportunity.service || route}" with useful buyer copy, internal links, structured sections, and a clear CTA.`,
    acceptance: [
      "Page title, H1, meta description, and first CTA align with the target intent.",
      "Internal links connect the route to at least one service/proof/FAQ sibling where available.",
      "No unsupported claims are introduced.",
      "Desktop and mobile layout must be checked before publish."
    ]
  };
}

function developerTask(opportunity) {
  const agentId = agentForOpportunity(opportunity);
  const route = opportunity.targetRoute || asArray(opportunity.targetRoutes)[0] || "/";
  return compactObject({
    id: `task_${slugify(opportunity.type)}_${opportunity.priority}`,
    agentId,
    title: `${titleCase(opportunity.type.replace(/_/g, " "))}: ${route}`,
    priority: opportunity.priority,
    score: opportunity.score,
    targetRoute: route,
    contract: actionContract(opportunity),
    sourceOpportunityId: opportunity.id
  });
}

function experimentForOpportunity(opportunity) {
  const metric = opportunity.type.includes("cta") ? "lead_click_rate" : opportunity.type.includes("internal_link") ? "crawl_depth_and_target_clicks" : "qualified_organic_sessions";
  return {
    id: `exp_${slugify(opportunity.type)}_${opportunity.priority}`,
    targetRoute: opportunity.targetRoute || asArray(opportunity.targetRoutes)[0] || "/",
    metric,
    hypothesis: opportunity.why,
    minimumRunDays: opportunity.source?.includes("fallback") ? 14 : 7,
    rollbackTrigger: "Organic clicks, lead clicks, or crawl health materially regress after publish."
  };
}

function publishPolicy(snapshot, opportunities) {
  const requiresReview = opportunities.filter((item) => item.approval !== "auto_draft_allowed");
  return {
    autoApplyDefault: false,
    mode: snapshot.mode,
    canDraftWithoutGsc: true,
    canPublishWithoutGsc: requiresReview.length === 0 && !snapshot.mode.includes("no_gsc"),
    reviewRequiredCount: requiresReview.length,
    rules: [
      "Market agents may create drafts and patch manifests without Search Console access.",
      "Publishing requires the client stack adapter plus either human approval or an explicit autopublish policy.",
      "Proof pages, regulated industries, and low-confidence fallback ideas must stay in review until evidence is attached.",
      "Production-facing website changes require live browser proof before they are presented as ready."
    ]
  };
}

function monetization(snapshot, opportunities) {
  const sourceRows = Object.values(snapshot.sources || {}).reduce((sum, status) => sum + Number(status.rows || 0), 0);
  const premiumSources = ["gsc", "semrush", "serp"].filter((source) => snapshot.sources?.[source]?.connected);
  return {
    billableEvent: "growth_cycle.created",
    suggestedUnits: costUnit(sourceRows, 0.2) + costUnit(opportunities.length, 2) + premiumSources.length * 5,
    unitBreakdown: {
      marketRows: sourceRows,
      opportunities: opportunities.length,
      premiumSources: premiumSources.length,
      noGscFallbackIncluded: !snapshot.sources?.gsc?.connected
    },
    pricingModel: [
      "Starter: fallback/no-domain cycles with seed keywords and public crawl data.",
      "Growth: GSC, SEMrush, SERP ingestion plus proposal API.",
      "Operator: approved auto-apply adapters, browser proof receipts, and monthly strategy ledger."
    ]
  };
}

export function buildGrowthPlan(snapshot, opportunities, options = {}) {
  const selected = asArray(opportunities);
  const tasks = selected.map(developerTask);
  const experiments = selected.slice(0, Number(options.maxExperiments || 12)).map(experimentForOpportunity);
  const receipt = {
    id: receiptId("agl_plan"),
    createdAt: nowIso(),
    label: cleanText(options.label || `${snapshot.business?.name || "Client"} growth cycle`),
    mode: snapshot.mode,
    sources: snapshot.sources,
    opportunityCount: selected.length,
    reviewRequiredCount: selected.filter((item) => item.approval !== "auto_draft_allowed").length
  };

  return {
    receipt,
    agentLanes: AGENT_LANES,
    prioritizedActions: selected,
    developerTasks: tasks,
    experiments,
    publishPolicy: publishPolicy(snapshot, selected),
    monetization: monetization(snapshot, selected)
  };
}

