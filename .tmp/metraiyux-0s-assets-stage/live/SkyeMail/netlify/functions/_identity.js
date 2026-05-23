const crypto = require("crypto");

function clean(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function normalizeHandle(value) {
  const base = clean(value)
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .replace(/[._-]{2,}/g, "-");
  return (base || "skyemail-user").slice(0, 32);
}

function validHandle(value) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizeHandle(value));
}

function shortHash(parts, bytes = 8) {
  return crypto
    .createHash("sha256")
    .update(parts.map((part) => clean(part)).join("|"))
    .digest("hex")
    .slice(0, bytes * 2);
}

function numericId(seed, length = 10) {
  const hex = shortHash([seed, "skye-id"], 12);
  const asInt = BigInt(`0x${hex}`);
  return asInt.toString().padStart(length, "0").slice(0, length);
}

function makeSkyeMailId({ email, handle, fs27Sub } = {}) {
  const source = fs27Sub || email || handle || crypto.randomUUID();
  return `skymail_${shortHash([source, "skymail"], 8)}`;
}

function makeWorkspaceId({ email, handle, fs27CustomerId, fs27Sub } = {}) {
  const source = fs27CustomerId || fs27Sub || email || handle || crypto.randomUUID();
  return `skymail_ws_${shortHash([source, "workspace"], 8)}`;
}

function makeGateCardId({ fs27CardId, fs27Sub, email, handle } = {}) {
  if (fs27CardId) return clean(fs27CardId);
  const source = fs27Sub || email || handle || crypto.randomUUID();
  return `gate_basic_${numericId(source, 10)}`;
}

function primaryDomain() {
  return normalizeEmail(process.env.SKYMAIL_PRIMARY_DOMAIN || process.env.INBOUND_DOMAIN || "skyemail.local");
}

function makePrimaryAddress(handle, domain = primaryDomain()) {
  return `${normalizeHandle(handle)}@${normalizeEmail(domain)}`;
}

function splitEmail(value) {
  const email = normalizeEmail(value);
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { email, local: parts[0], domain: parts[1] };
}

function validEmail(value) {
  const parsed = splitEmail(value);
  return Boolean(parsed && /^[a-z0-9][a-z0-9._+-]{0,63}$/.test(parsed.local) && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(parsed.domain));
}

module.exports = {
  clean,
  normalizeEmail,
  normalizeHandle,
  validHandle,
  makeSkyeMailId,
  makeWorkspaceId,
  makeGateCardId,
  primaryDomain,
  makePrimaryAddress,
  splitEmail,
  validEmail
};
