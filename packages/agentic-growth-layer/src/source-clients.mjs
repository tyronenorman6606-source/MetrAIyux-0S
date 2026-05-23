import { cleanText, nowIso, numberOrZero } from "./utils.mjs";

function requireValue(value, label) {
  const text = cleanText(value);
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function basicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function jsonFetch(url, options = {}) {
  const startedAt = performance.now();
  const response = await fetch(url, options);
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  const elapsedMs = Math.round(performance.now() - startedAt);
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} failed with ${response.status}: ${body.error?.message || body.message || JSON.stringify(body).slice(0, 500)}`);
  }
  return { body, elapsedMs, status: response.status };
}

function refOf(config = {}) {
  if (!config || typeof config !== "object") return "";
  return config.credentialRef || config.credential_ref || config.secretRef || config.secret_ref || config.keyGateRef || config.key_gate_ref || "";
}

async function hydrateCredentialRefs(config, options = {}) {
  if (typeof options.secretResolver !== "function") return [];
  const receipts = [];
  async function resolve(vendorKey, ref, apply) {
    if (!ref) return;
    try {
      const resolved = await options.secretResolver({ vendorKey, secretRef: ref, credentialRef: ref });
      const credential = resolved?.credential ?? resolved;
      apply(credential);
      receipts.push({ source: vendorKey, ok: true, broker: options.secretBroker || "credential-resolver", credentialRef: typeof ref === "object" ? ref : { id: cleanText(ref, 180) } });
    } catch (error) {
      receipts.push({ source: vendorKey, ok: false, broker: options.secretBroker || "credential-resolver", credentialRef: typeof ref === "object" ? ref : { id: cleanText(ref, 180) }, error: cleanText(error.message || String(error), 300) });
    }
  }
  await resolve("google-search-console", config.gsc.credentialRef, (credential) => {
    config.gsc.accessToken = typeof credential === "object" ? cleanText(credential.accessToken || credential.token || "", 8000) : cleanText(credential, 8000);
  });
  await resolve("semrush", config.semrush.credentialRef, (credential) => {
    config.semrush.apiKey = typeof credential === "object" ? cleanText(credential.apiKey || credential.api_key || credential.token || "", 8000) : cleanText(credential, 8000);
  });
  await resolve("dataforseo", config.dataForSeo.credentialRef, (credential) => {
    if (credential && typeof credential === "object") {
      config.dataForSeo.login = cleanText(credential.login || credential.username || "", 8000);
      config.dataForSeo.password = cleanText(credential.password || credential.token || "", 8000);
      return;
    }
    const [login, ...rest] = cleanText(credential, 8000).split(":");
    config.dataForSeo.login = login || "";
    config.dataForSeo.password = rest.join(":");
  });
  return receipts;
}

export function resolveSourceConfig(payload = {}, env = process.env, options = {}) {
  const config = payload.sourceConfig || payload.connectors || {};
  const allowRawPayloadCredentials = options.allowRawPayloadCredentials === true || String(env.AGENTIC_GROWTH_ALLOW_RAW_SOURCE_CONFIG || "").trim() === "1";
  const allowEnvCredentials = options.allowEnvCredentials === true || String(env.AGENTIC_GROWTH_ALLOW_ENV_PROVIDER_SECRETS || "").trim() === "1";
  return {
    gsc: {
      siteUrl: config.gsc?.siteUrl || payload.business?.domain || payload.site?.liveUrl || "",
      credentialRef: refOf(config.gsc),
      accessToken: (allowRawPayloadCredentials ? (config.gsc?.accessToken || config.gsc?.token || "") : "") || (allowEnvCredentials ? (env.GSC_ACCESS_TOKEN || env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN || "") : ""),
      startDate: config.gsc?.startDate || payload.dates?.startDate || "",
      endDate: config.gsc?.endDate || payload.dates?.endDate || "",
      rowLimit: numberOrZero(config.gsc?.rowLimit || payload.limits?.gscRows || 25000)
    },
    semrush: {
      credentialRef: refOf(config.semrush),
      apiKey: (allowRawPayloadCredentials ? (config.semrush?.apiKey || config.semrush?.api_key || config.semrush?.key || "") : "") || (allowEnvCredentials ? env.SEMRUSH_API_KEY || "" : ""),
      domain: config.semrush?.domain || payload.business?.domain || "",
      database: config.semrush?.database || env.SEMRUSH_DATABASE || "us",
      limit: numberOrZero(config.semrush?.limit || payload.limits?.semrushRows || 1000)
    },
    dataForSeo: {
      credentialRef: refOf(config.dataForSeo),
      login: (allowRawPayloadCredentials ? config.dataForSeo?.login || "" : "") || (allowEnvCredentials ? env.DATAFORSEO_LOGIN || "" : ""),
      password: (allowRawPayloadCredentials ? config.dataForSeo?.password || "" : "") || (allowEnvCredentials ? env.DATAFORSEO_PASSWORD || "" : ""),
      keywords: config.dataForSeo?.keywords || payload.market?.seedKeywords || [],
      locationCode: numberOrZero(config.dataForSeo?.locationCode || env.DATAFORSEO_LOCATION_CODE || 2840),
      languageCode: config.dataForSeo?.languageCode || env.DATAFORSEO_LANGUAGE_CODE || "en",
      device: config.dataForSeo?.device || "desktop"
    }
  };
}

export async function fetchGscSearchAnalytics(config = {}) {
  const siteUrl = requireValue(config.siteUrl, "GSC siteUrl");
  const accessToken = requireValue(config.accessToken, "GSC access token");
  const endDate = config.endDate || new Date().toISOString().slice(0, 10);
  const startDate = config.startDate || new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const { body, elapsedMs, status } = await jsonFetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["query", "page"],
      rowLimit: config.rowLimit || 25000
    })
  });

  return {
    source: "gsc",
    fetchedAt: nowIso(),
    status,
    elapsedMs,
    dimensions: ["query", "page"],
    rows: Array.isArray(body.rows) ? body.rows : []
  };
}

export async function fetchSemrushDomainOrganic(config = {}) {
  const apiKey = requireValue(config.apiKey, "SEMrush API key");
  const domain = requireValue(config.domain, "SEMrush domain");
  const params = new URLSearchParams({
    type: "domain_organic",
    key: apiKey,
    display_limit: String(config.limit || 1000),
    export_columns: "Ph,Po,Nq,Cp,Ur,Tr",
    domain,
    database: config.database || "us"
  });
  const endpoint = `https://api.semrush.com/?${params}`;
  const startedAt = performance.now();
  const response = await fetch(endpoint);
  const text = await response.text();
  const elapsedMs = Math.round(performance.now() - startedAt);
  if (!response.ok || /^ERROR/i.test(text)) {
    throw new Error(`SEMrush domain organic request failed: ${text.slice(0, 500)}`);
  }
  return {
    source: "semrush",
    fetchedAt: nowIso(),
    status: response.status,
    elapsedMs,
    csv: text
  };
}

export async function fetchDataForSeoLiveSerp(config = {}) {
  const login = requireValue(config.login, "DataForSEO login");
  const password = requireValue(config.password, "DataForSEO password");
  const keywords = Array.isArray(config.keywords) ? config.keywords.slice(0, 100) : [];
  if (!keywords.length) throw new Error("At least one SERP keyword is required.");
  const endpoint = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";
  const tasks = keywords.map((keyword, index) => ({
    keyword,
    location_code: config.locationCode || 2840,
    language_code: config.languageCode || "en",
    device: config.device || "desktop",
    tag: `agl-${index + 1}`
  }));
  const { body, elapsedMs, status } = await jsonFetch(endpoint, {
    method: "POST",
    headers: {
      authorization: basicAuth(login, password),
      "content-type": "application/json"
    },
    body: JSON.stringify(tasks)
  });

  return {
    source: "dataforseo",
    fetchedAt: nowIso(),
    status,
    elapsedMs,
    raw: body,
    queries: (body.tasks || []).map((task) => {
      const data = task.data || {};
      const result = task.result?.[0] || {};
      const items = Array.isArray(result.items) ? result.items : [];
      return {
        keyword: data.keyword || result.keyword || "",
        location: result.location_code || data.location_code || "",
        organic: items.filter((item) => item.type === "organic").map((item) => ({
          rank: item.rank_group || item.rank_absolute,
          title: item.title,
          url: item.url,
          snippet: item.description
        })),
        peopleAlsoAsk: items.filter((item) => item.type === "people_also_ask").flatMap((item) => item.items || []).map((item) => item.title || item.question).filter(Boolean),
        relatedSearches: items.filter((item) => item.type === "related_searches").flatMap((item) => item.items || []).map((item) => item.title || item.keyword).filter(Boolean)
      };
    })
  };
}

export async function pullConfiguredSources(payload = {}, env = process.env, options = {}) {
  const config = resolveSourceConfig(payload, env, options);
  const pulled = {};
  const receipts = await hydrateCredentialRefs(config, options);

  const attempts = [
    ["gsc", config.gsc.accessToken && config.gsc.siteUrl, () => fetchGscSearchAnalytics(config.gsc)],
    ["semrush", config.semrush.apiKey && config.semrush.domain, () => fetchSemrushDomainOrganic(config.semrush)],
    ["serp", config.dataForSeo.login && config.dataForSeo.password && config.dataForSeo.keywords?.length, () => fetchDataForSeoLiveSerp(config.dataForSeo)]
  ];

  for (const [name, enabled, run] of attempts) {
    if (!enabled) {
      receipts.push({ source: name, skipped: true, reason: "missing credentials or required source config" });
      continue;
    }
    try {
      const result = await run();
      pulled[name] = result;
      receipts.push({ source: name, ok: true, rows: result.rows?.length || result.queries?.length || 0, elapsedMs: result.elapsedMs });
    } catch (error) {
      receipts.push({ source: name, ok: false, error: error.message || String(error) });
    }
  }

  return { pulled, receipts, pulledAt: nowIso() };
}
