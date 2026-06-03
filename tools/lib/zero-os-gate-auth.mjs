import fs from 'node:fs/promises';
import path from 'node:path';

const DIRECT_GATE_BEARER_KEYS = [
  'SKYENET_AUTH',
  'ZERO_OS_GATE_SESSION',
  'ZERO_OS_OWNER_SESSION',
  'ZERO_OS_GATE_BEARER',
  'METRAIYUX_OWNER_GATE_SESSION',
  'MCP_GATE_SESSION',
  'FS27_ADMIN_BEARER',
  'SKYGATEFS27_GATE_SESSION',
  'SKYGATE_SESSION_TOKEN',
  'SKYE_GATE_SESSION',
  'SKYEVAULT_GATE_BEARER',
  'SKYEVAULT_GATE_SESSION',
  'SKYEVAULT_ONE_AUTH_BEARER',
  'FREE99_GATE_SESSION',
  'QUANTUMSKYES_MCP_TOKEN',
  'QUANTUMSKYES_MCP_TOKEN_OR_GATE_SESSION'
];

// Legacy root-env labels are exchange-only aliases. They never become a
// separate app/tool auth lane.
const OWNER_GATE_EXCHANGE_KEYS = [
  'ZERO_OS_GATE_CODE',
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'FREE99_GATE_CODE',
  'FREE99_GATE_PASSWORD',
  'FREE99_OWNER_CODE',
  'FREE99_OWNER_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'ZERO_OS_ADMIN_CODE',
  'ZERO_OS_OWNER_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'METRAIYUX_ADMIN_CODE',
  'SKYGATE_ADMIN_CODE',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATE_OWNER_CODE',
  'SKYGATE_OWNER_PASSWORD',
  'SKYGATEFS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'SKYGATEFS27_OWNER_CODE',
  'SKYGATEFS27_OWNER_PASSWORD',
  'SKYE_GATE_ADMIN_CODE',
  'SKYE_GATE_ADMIN_PASSWORD',
  'SKYE_GATE_OWNER_CODE',
  'SKYE_GATE_OWNER_PASSWORD',
  'FS27_ADMIN_CODE',
  'FS27_ADMIN_PASSWORD',
  'FS27_OWNER_CODE',
  'FS27_OWNER_PASSWORD'
];
const DEFAULT_GATE_AUTH_TIMEOUT_MS = 15000;

function clean(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text;
}

export function cleanBearer(value = '') {
  return clean(value).replace(/^Bearer(?:\s+|$)/i, '').trim();
}

async function readEnvFile(file) {
  if (!file) return {};
  try {
    const text = await fs.readFile(file, 'utf8');
    const values = {};
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match) values[match[1]] = clean(match[2]);
    }
    return values;
  } catch {
    return {};
  }
}

export async function loadZeroOsRootEnv(extraFiles = []) {
  const files = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt',
    ...extraFiles
  ].filter(Boolean);
  const merged = { ...process.env };
  for (const file of files) {
    Object.assign(merged, await readEnvFile(path.resolve(file)));
  }
  return merged;
}

function responseStatus(result) {
  return Number(result?.status || result?.response?.status || 0) || 0;
}

async function postOwnerAdminLogin(fetchImpl, zeroOsBase, credential) {
  const token = cleanBearer(credential.value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.ZERO_OS_GATE_AUTH_TIMEOUT_MS || DEFAULT_GATE_AUTH_TIMEOUT_MS));
  const result = await fetchImpl(`${zeroOsBase}/api/owner/admin-login`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: token ? `Bearer ${token}` : '',
      'x-admin-token': token,
      'x-free99-admin-code': token,
      'x-free99-gate-session': token,
      'x-skye-gate-session': token
    },
    body: JSON.stringify({
      code: credential.value,
      password: credential.value,
      gateToken: credential.value,
      free99Code: credential.value
    }),
    signal: controller.signal
  }).finally(() => clearTimeout(timer));

  if (typeof result?.text === 'function') {
    const text = await result.text().catch(() => '');
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch {}
    return {
      ok: Boolean(result.ok),
      status: Number(result.status || 0) || 0,
      text,
      body
    };
  }

  return {
    ok: Boolean(result?.ok),
    status: responseStatus(result),
    text: result?.text || '',
    body: result?.body || null
  };
}

function tokenFromBody(body = {}) {
  return cleanBearer(
    body?.gateBearerToken
    || body?.gateToken
    || body?.token
    || body?.session?.token
    || body?.sessionToken
    || ''
  );
}

export async function resolveZeroOsGateAuth(options = {}) {
  const zeroOsBase = String(
    options.zeroOsBase
    || process.env.ZERO_OS_LIVE_BASE
    || process.env.ZERO_OS_BASE_URL
    || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev'
  ).replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('resolveZeroOsGateAuth requires a fetch implementation.');
  }

  const env = options.env || await loadZeroOsRootEnv(options.envFiles || []);

  for (const key of DIRECT_GATE_BEARER_KEYS) {
    const token = cleanBearer(env[key]);
    if (token) {
      return {
        ok: true,
        token,
        credential: { key, source: 'shared-gate-bearer' },
        response: { ok: true, status: 200, via: 'direct-shared-gate-bearer' }
      };
    }
  }

  for (const key of OWNER_GATE_EXCHANGE_KEYS) {
    const value = clean(env[key]);
    if (!value) continue;
    const credential = { key, value, source: 'owner-gate-exchange' };
    try {
      const response = await postOwnerAdminLogin(fetchImpl, zeroOsBase, credential);
      const token = tokenFromBody(response.body);
      if (response.ok && token) {
        return { ok: true, token, credential, response };
      }
      if (options.stopAfterFirstCredential) {
        return { ok: false, token: '', credential, response };
      }
    } catch (error) {
      if (options.stopAfterFirstCredential) {
        return {
          ok: false,
          token: '',
          credential,
          response: { ok: false, status: 0, error: error?.message || String(error) }
        };
      }
    }
  }

  return {
    ok: false,
    token: '',
    credential: { key: '', source: 'missing' },
    response: { ok: false, status: 0, body: { error: 'No shared FS27/SkyGate bearer or owner gate exchange credential found.' } }
  };
}
