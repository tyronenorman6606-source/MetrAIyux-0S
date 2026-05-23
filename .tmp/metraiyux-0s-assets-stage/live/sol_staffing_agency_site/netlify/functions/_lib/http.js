const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function json(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: { ...DEFAULT_HEADERS, ...headers },
    body: JSON.stringify(payload)
  };
}

function getHeader(event, name) {
  const headers = event.headers || {};
  const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : "";
}

function getBearer(event) {
  const auth = getHeader(event, "authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) return "";
  return auth.replace(/^Bearer\s+/i, "").trim();
}

function getCookie(event, name) {
  const cookie = getHeader(event, "cookie");
  const parts = cookie.split(";").map(part => part.trim()).filter(Boolean);
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (key === name) return decodeURIComponent(part.slice(index + 1));
  }
  return "";
}

function parseJson(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
}

function safeIp(event) {
  return getHeader(event, "x-nf-client-connection-ip") ||
    getHeader(event, "x-forwarded-for").split(",")[0].trim() ||
    "unknown";
}

module.exports = { json, getBearer, getCookie, getHeader, parseJson, safeIp };
