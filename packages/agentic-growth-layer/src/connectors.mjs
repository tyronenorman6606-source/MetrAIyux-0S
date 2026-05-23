import {
  asArray,
  cleanText,
  compactObject,
  domainFromUrl,
  inferLocation,
  lowerKey,
  numberOrZero,
  slugify,
  titleCase,
  unique,
  uniqueBy
} from "./utils.mjs";

const DATA_SOURCE_DEFAULTS = {
  gsc: { connected: false, confidence: 0, rows: 0 },
  semrush: { connected: false, confidence: 0, rows: 0 },
  serp: { connected: false, confidence: 0, rows: 0 },
  keywordSeed: { connected: false, confidence: 0, rows: 0 },
  site: { connected: false, confidence: 0, rows: 0 }
};

function parseCsv(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return [];
  const rows = [];
  let cell = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);

  const [headers = [], ...body] = rows.filter((item) => item.some((cellValue) => cleanText(cellValue)));
  const normalizedHeaders = headers.map(lowerKey);
  return body.map((cells) => Object.fromEntries(normalizedHeaders.map((header, index) => [header, cells[index] ?? ""])));
}

function structuredRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data)) return value.data;
  if (typeof value?.csv === "string") return parseCsv(value.csv);
  if (typeof value === "string") return parseCsv(value);
  return [];
}

function normalizeKeyword(value = {}) {
  const query = cleanText(value.query || value.keyword || value.keys?.[0] || value.phrase);
  if (!query) return null;
  const pageFromKeys = Array.isArray(value.keys) ? value.keys.find((key) => /^https?:\/\//i.test(key)) : "";
  const page = cleanText(value.page || value.url || value.landing_page || value.landingPage || pageFromKeys);
  const location = cleanText(value.location || value.city || value.geo || inferLocation(query));
  const source = cleanText(value.source || "unknown");
  return compactObject({
    query,
    keyword: query,
    intent: classifyIntent(query),
    location,
    page,
    clicks: numberOrZero(value.clicks),
    impressions: numberOrZero(value.impressions),
    ctr: numberOrZero(value.ctr),
    position: numberOrZero(value.position || value.pos || value.rank),
    volume: numberOrZero(value.volume || value.search_volume || value.searchVolume || value.nq),
    keywordDifficulty: numberOrZero(value.kd || value.keyword_difficulty || value.keywordDifficulty),
    cpc: numberOrZero(value.cpc),
    traffic: numberOrZero(value.traffic),
    source,
    confidence: numberOrZero(value.confidence) || sourceConfidence(source)
  });
}

export function classifyIntent(query) {
  const text = cleanText(query).toLowerCase();
  if (!text) return "unknown";
  if (/\b(near me|nearby|in [a-z ]+|phoenix|scottsdale|glendale|tempe|mesa|tolleson|goodyear)\b/.test(text)) return "local";
  if (/\b(price|pricing|cost|quote|estimate|rates)\b/.test(text)) return "commercial";
  if (/\b(best|top|compare|vs|alternative)\b/.test(text)) return "comparison";
  if (/\b(how|what|why|when|faq|guide|tips)\b/.test(text)) return "informational";
  if (/\b(service|services|company|provider|agency|contractor|supplier)\b/.test(text)) return "service";
  return "mixed";
}

export function sourceConfidence(source) {
  const normalized = cleanText(source).toLowerCase();
  if (normalized.includes("gsc")) return 0.95;
  if (normalized.includes("search_console")) return 0.95;
  if (normalized.includes("semrush")) return 0.78;
  if (normalized.includes("serp")) return 0.72;
  if (normalized.includes("crawl")) return 0.7;
  if (normalized.includes("fallback")) return 0.36;
  if (normalized.includes("seed")) return 0.32;
  return 0.45;
}

export function normalizeGscRows(gsc = {}) {
  const dimensions = asArray(gsc.dimensions).map(lowerKey);
  const rows = structuredRows(gsc);
  const keywords = [];
  const pages = [];

  for (const row of rows) {
    const keys = asArray(row.keys);
    const keyMap = {};
    keys.forEach((key, index) => {
      keyMap[dimensions[index] || `key_${index}`] = key;
    });
    const query = row.query || keyMap.query || keys.find((key) => !/^https?:\/\//i.test(String(key)));
    const page = row.page || keyMap.page || keys.find((key) => /^https?:\/\//i.test(String(key)));
    const keyword = normalizeKeyword({ ...row, query, page, source: "gsc" });
    if (keyword) keywords.push(keyword);
    if (page) {
      pages.push(compactObject({
        url: page,
        clicks: numberOrZero(row.clicks),
        impressions: numberOrZero(row.impressions),
        ctr: numberOrZero(row.ctr),
        position: numberOrZero(row.position),
        source: "gsc",
        confidence: sourceConfidence("gsc")
      }));
    }
  }

  return {
    source: "gsc",
    status: {
      connected: rows.length > 0,
      confidence: rows.length ? sourceConfidence("gsc") : 0,
      rows: rows.length
    },
    keywords,
    pages: uniqueBy(pages, (page) => page.url)
  };
}

export function normalizeSemrushRows(semrush = {}) {
  const rows = structuredRows(semrush);
  const keywords = [];
  const competitors = [];

  for (const rawRow of rows) {
    const row = Object.fromEntries(Object.entries(rawRow || {}).map(([key, value]) => [lowerKey(key), value]));
    const keyword = normalizeKeyword({
      query: row.keyword || row.phrase || row.query || row.keyword_keyword,
      page: row.url || row.landing_page || row.page,
      volume: row.volume || row.search_volume || row.nq,
      keywordDifficulty: row.kd || row.keyword_difficulty,
      position: row.position || row.pos,
      cpc: row.cpc,
      traffic: row.traffic,
      source: "semrush"
    });
    if (keyword) keywords.push(keyword);
    const competitorDomain = cleanText(row.competitor || row.domain || row.competitor_domain);
    const competitorUrl = cleanText(row.competitor_url || row.url);
    if (competitorDomain || competitorUrl) {
      competitors.push(compactObject({
        domain: competitorDomain || domainFromUrl(competitorUrl),
        url: competitorUrl,
        keyword: keyword?.query || "",
        source: "semrush",
        confidence: sourceConfidence("semrush")
      }));
    }
  }

  return {
    source: "semrush",
    status: {
      connected: rows.length > 0,
      confidence: rows.length ? sourceConfidence("semrush") : 0,
      rows: rows.length
    },
    keywords,
    competitors: uniqueBy(competitors, (item) => `${item.domain}:${item.keyword}:${item.url}`)
  };
}

export function normalizeSerpData(serp = {}) {
  const queryGroups = Array.isArray(serp) ? serp : asArray(serp.queries || serp.results || serp.rows);
  const records = [];
  const competitors = [];
  const questions = [];
  const relatedSearches = [];

  for (const group of queryGroups) {
    const keyword = cleanText(group.keyword || group.query || group.search || group.keys?.[0]);
    const location = cleanText(group.location || group.geo || inferLocation(keyword));
    const items = asArray(group.items || group.organic || group.results);
    items.forEach((item, index) => {
      const rank = numberOrZero(item.rank || item.position || index + 1);
      const url = cleanText(item.url || item.link);
      const record = compactObject({
        keyword,
        location,
        rank,
        url,
        domain: domainFromUrl(url),
        title: cleanText(item.title),
        snippet: cleanText(item.snippet || item.description),
        source: "serp",
        confidence: sourceConfidence("serp")
      });
      if (record.keyword && record.url) {
        records.push(record);
        competitors.push({
          domain: record.domain,
          url: record.url,
          keyword,
          rank,
          source: "serp",
          confidence: sourceConfidence("serp")
        });
      }
    });
    asArray(group.peopleAlsoAsk || group.people_also_ask || group.questions).forEach((question) => {
      questions.push({
        query: cleanText(typeof question === "string" ? question : question.question || question.title),
        parentKeyword: keyword,
        location,
        source: "serp",
        confidence: sourceConfidence("serp")
      });
    });
    asArray(group.relatedSearches || group.related_searches).forEach((search) => {
      relatedSearches.push({
        query: cleanText(typeof search === "string" ? search : search.query || search.title),
        parentKeyword: keyword,
        location,
        source: "serp",
        confidence: sourceConfidence("serp")
      });
    });
  }

  const relatedKeywords = [...questions, ...relatedSearches]
    .map((item) => normalizeKeyword({ ...item, source: "serp_related" }))
    .filter(Boolean);

  return {
    source: "serp",
    status: {
      connected: records.length > 0 || relatedKeywords.length > 0,
      confidence: records.length || relatedKeywords.length ? sourceConfidence("serp") : 0,
      rows: records.length + relatedKeywords.length
    },
    serpRecords: records,
    keywords: relatedKeywords,
    competitors: uniqueBy(competitors, (item) => `${item.domain}:${item.keyword}:${item.rank}`),
    questions: uniqueBy(questions.filter((item) => item.query), (item) => item.query.toLowerCase())
  };
}

export function normalizeSitePages(site = {}) {
  const pages = asArray(site.pages || site.knownPages || site.crawl?.pages).map((page) => {
    const url = cleanText(page.url || page.path || page.route);
    const title = cleanText(page.title);
    const h1 = cleanText(page.h1 || page.heading);
    const text = cleanText(page.text || page.body || page.copy);
    const headings = unique(asArray(page.headings));
    const ctas = unique(asArray(page.ctas || page.callsToAction));
    const internalLinks = unique(asArray(page.internalLinks || page.links));
    return compactObject({
      url,
      route: url.startsWith("http") ? new URL(url).pathname : url,
      title,
      h1,
      headings,
      ctas,
      internalLinks,
      wordCount: numberOrZero(page.wordCount) || (text ? text.split(/\s+/).length : 0),
      hasSchema: Boolean(page.hasSchema || page.schema),
      source: page.source || "site_crawl",
      confidence: sourceConfidence(page.source || "site_crawl")
    });
  });

  return {
    source: "site",
    status: {
      connected: pages.length > 0,
      confidence: pages.length ? sourceConfidence("site_crawl") : 0,
      rows: pages.length
    },
    pages: uniqueBy(pages, (page) => page.url || page.route)
  };
}

function fallbackKeywordPhrases({ services, locations, industry, seedKeywords }) {
  const baseServices = unique([...asArray(services), industry].filter(Boolean));
  const baseLocations = unique(asArray(locations));
  const phrases = [...asArray(seedKeywords)];
  for (const service of baseServices) {
    phrases.push(service);
    phrases.push(`${service} company`);
    phrases.push(`${service} pricing`);
    phrases.push(`best ${service}`);
    for (const location of baseLocations) {
      phrases.push(`${service} ${location}`);
      phrases.push(`${service} near me`);
      phrases.push(`best ${service} in ${location}`);
      phrases.push(`${service} quote ${location}`);
    }
  }
  return unique(phrases).slice(0, 80);
}

export function buildFallbackMarket(payload = {}) {
  const business = payload.business || payload.client || {};
  const market = payload.market || {};
  const site = payload.site || {};
  const services = unique([...asArray(business.services), ...asArray(market.services)]);
  const locations = unique([...asArray(business.locations), ...asArray(market.locations)]);
  const seedKeywords = unique([...asArray(market.seedKeywords), ...asArray(payload.seedKeywords)]);
  const phrases = fallbackKeywordPhrases({
    services,
    locations,
    industry: business.industry || market.industry,
    seedKeywords
  });

  const keywords = phrases.map((query) => normalizeKeyword({
    query,
    location: inferLocation(query),
    source: "fallback_seed",
    confidence: sourceConfidence("fallback_seed")
  })).filter(Boolean);

  const competitors = unique([...asArray(market.competitors), ...asArray(market.competitorUrls)]).map((value) => ({
    domain: domainFromUrl(value) || slugify(value),
    url: /^https?:\/\//i.test(value) ? value : "",
    source: "fallback_competitor_seed",
    confidence: 0.28
  }));

  return {
    source: "fallback",
    status: {
      connected: keywords.length > 0 || competitors.length > 0 || Boolean(site.previewUrl || site.netlifyUrl),
      confidence: keywords.length ? sourceConfidence("fallback_seed") : 0.2,
      rows: keywords.length + competitors.length
    },
    keywords,
    competitors,
    notes: [
      "No owned Search Console data is required for this mode.",
      "Use seed keywords, competitor URLs, a Netlify/free-hosting preview URL, and public SERP snapshots until the owned domain is connected."
    ]
  };
}

export function collectMarketSnapshot(payload = {}) {
  const gsc = normalizeGscRows(payload.gsc || payload.sources?.gsc);
  const semrush = normalizeSemrushRows(payload.semrush || payload.sources?.semrush);
  const serp = normalizeSerpData(payload.serp || payload.sources?.serp);
  const site = normalizeSitePages(payload.site || payload.sources?.site);
  const fallback = buildFallbackMarket(payload);

  const sources = {
    ...DATA_SOURCE_DEFAULTS,
    gsc: gsc.status,
    semrush: semrush.status,
    serp: serp.status,
    keywordSeed: fallback.status,
    site: site.status
  };

  const hasOwnedDomain = Boolean(payload.site?.ownedDomain || payload.business?.domain || payload.client?.domain);
  const hasGsc = gsc.status.connected;
  const hasPaidMarketData = semrush.status.connected || serp.status.connected;
  const hasPreview = Boolean(payload.site?.previewUrl || payload.site?.netlifyUrl || payload.site?.liveUrl);
  const mode = hasGsc
    ? "connected_search_console"
    : hasPaidMarketData
      ? "market_data_without_gsc"
      : hasPreview || !hasOwnedDomain
        ? "no_gsc_preview_or_no_domain"
        : "seed_only";

  const keywords = uniqueBy([
    ...gsc.keywords,
    ...semrush.keywords,
    ...serp.keywords,
    ...fallback.keywords
  ], (keyword) => `${keyword.query.toLowerCase()}:${keyword.page || ""}:${keyword.source}`);

  return {
    mode,
    hasOwnedDomain,
    sources,
    business: {
      name: cleanText(payload.business?.name || payload.client?.name || payload.displayName),
      industry: cleanText(payload.business?.industry || payload.client?.industry || payload.market?.industry),
      services: unique([...asArray(payload.business?.services), ...asArray(payload.market?.services)]),
      locations: unique([...asArray(payload.business?.locations), ...asArray(payload.market?.locations)]),
      domain: cleanText(payload.business?.domain || payload.client?.domain || domainFromUrl(payload.site?.liveUrl)),
      previewUrl: cleanText(payload.site?.previewUrl || payload.site?.netlifyUrl || payload.site?.liveUrl)
    },
    keywords,
    pages: site.pages,
    serpRecords: serp.serpRecords,
    questions: serp.questions,
    competitors: uniqueBy([
      ...semrush.competitors,
      ...serp.competitors,
      ...fallback.competitors
    ], (item) => `${item.domain}:${item.url}:${item.keyword || ""}`),
    fallbackNotes: fallback.notes
  };
}

export function sourceSummary(snapshot) {
  return Object.fromEntries(
    Object.entries(snapshot.sources || {}).map(([source, status]) => [
      source,
      {
        connected: Boolean(status.connected),
        rows: numberOrZero(status.rows),
        confidence: Number(numberOrZero(status.confidence).toFixed(2))
      }
    ])
  );
}

export function readableSnapshotLabel(snapshot) {
  const name = snapshot.business?.name || "Client site";
  const mode = snapshot.mode.replace(/_/g, " ");
  return `${titleCase(name)} - ${mode}`;
}
