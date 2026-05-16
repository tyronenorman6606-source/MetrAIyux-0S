import { getHeader } from './security.js';

export function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function text(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    },
    body
  };
}

export async function readJson(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (error) {
    const err = new Error('Invalid JSON body.');
    err.statusCode = 400;
    throw err;
  }
}

export function method(event, allowed) {
  if (!allowed.includes(event.httpMethod)) {
    return json(405, { ok: false, error: `Method ${event.httpMethod} is not allowed.` }, { allow: allowed.join(', ') });
  }
  return null;
}

export function configuredOrigins() {
  return String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveCorsOrigin(event) {
  const origin = event ? getHeader(event, 'origin') : '';
  const allowed = configuredOrigins();

  if (!allowed.length) return origin || '*';
  if (!origin) return allowed[0];
  if (allowed.includes('*') || allowed.includes(origin)) return origin;
  return 'null';
}

export function noStoreCors(event) {
  return {
    'access-control-allow-origin': resolveCorsOrigin(event),
    'vary': 'Origin',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,x-admin-token,x-portal-key',
    'access-control-max-age': '86400'
  };
}

export function handleOptions(event) {
  return {
    statusCode: 204,
    headers: noStoreCors(event),
    body: ''
  };
}
