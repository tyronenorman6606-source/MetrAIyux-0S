import crypto from "node:crypto";

export function nowIso(date = new Date()) {
  return date.toISOString();
}

export function receiptId(prefix = "agl") {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function asArray(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null);
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

export function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function lowerKey(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function slugify(value, fallback = "item") {
  const slug = cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function titleCase(value) {
  return cleanText(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function unique(values) {
  return [...new Set(asArray(values).map(cleanText).filter(Boolean))];
}

export function uniqueBy(values, keyFn) {
  const seen = new Set();
  const output = [];
  for (const value of asArray(values)) {
    const key = keyFn(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

export function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, item]) => {
      if (Array.isArray(item)) return item.length > 0;
      if (item && typeof item === "object") return Object.keys(item).length > 0;
      return item !== undefined && item !== null && item !== "";
    })
  );
}

export function domainFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function routeFromParts(parts = []) {
  const clean = asArray(parts).map((part) => slugify(part, "")).filter(Boolean);
  return `/${clean.join("/") || ""}`.replace(/\/+$/, "") || "/";
}

export function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export function costUnit(count, weight = 1) {
  return Math.max(0, Math.ceil(numberOrZero(count) * weight));
}

export function inferLocation(value) {
  const text = cleanText(value);
  const match = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}),?\s+(AZ|CA|TX|FL|NY|GA|NC|SC|NV|WA|OR|CO|IL|MD|VA)\b/);
  return match ? `${match[1]} ${match[2]}` : "";
}

