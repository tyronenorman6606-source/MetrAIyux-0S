'use strict';

const { localIdentity, verifySkyGateBearer } = require('./_lib/skygate-auth');

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  const raw = clean(event && event.body);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function bearer(event) {
  return clean(event && event.headers && (event.headers.authorization || event.headers.Authorization))
    .replace(/^Bearer\s+/i, '')
    .trim();
}

function enabled() {
  return ['1', 'true', 'yes', 'on'].includes(clean(process.env.SKYGATE_ENABLE_LOCAL_SESSION_BOOTSTRAP).toLowerCase());
}

function operatorConfig() {
  const email = clean(
    process.env.SKYGATE_LOCAL_OPERATOR_EMAIL ||
    process.env.SKYE_LOCAL_OPERATOR_EMAIL
  ).toLowerCase();
  const password = clean(
    process.env.SKYGATE_LOCAL_OPERATOR_PASSWORD ||
    process.env.SKYE_LOCAL_OPERATOR_PASSWORD
  );
  const role = clean(
    process.env.SKYGATE_LOCAL_OPERATOR_ROLE ||
    process.env.SKYE_LOCAL_OPERATOR_ROLE ||
    'platform-operator'
  );
  return {
    email,
    password,
    role,
    available: Boolean(email && password),
  };
}

function operatorSeed(operator) {
  if (!operator.available) {
    return { ok: false, statusCode: 503, error: 'Local operator login is not configured. Set SKYGATE_LOCAL_OPERATOR_EMAIL and SKYGATE_LOCAL_OPERATOR_PASSWORD.' };
  }
  const existing = localIdentity.findUserByEmail(operator.email);
  if (existing) return { ok: true, user: existing, created: false };
  const created = localIdentity.createFirstAdmin({
    email: operator.email,
    password: operator.password,
    role: operator.role || 'admin',
    name: 'Local Operator',
  });
  if (!created.ok) return created;
  return { ok: true, user: created.user, created: true };
}

module.exports.handler = async (event) => {
  const method = (event && event.httpMethod ? event.httpMethod : 'GET').toUpperCase();
  if (method === 'OPTIONS') return json(204, {});

  const on = enabled();
  const operator = operatorConfig();
  const status = localIdentity.sessionStatus();
  const seed = on ? operatorSeed(operator) : null;

  if (method === 'GET') {
    const active = verifySkyGateBearer(event, { roles: ['admin', 'artist'] });
    return json(200, {
      ok: true,
      localProofBootstrap: on && Boolean(seed && seed.ok),
      localOperatorLogin: operator.available,
      enabled: on,
      available: on,
      operatorEmail: operator.available ? operator.email : '',
      issuer: status.issuer,
      audience: status.audience,
      localIdentity: status.localIdentity,
      usersConfigured: status.usersConfigured,
      adminUsers: status.adminUsers,
      artistUsers: status.artistUsers,
      activeSession: active.ok ? {
        source: active.source || (active.claims && active.claims.source) || 'unknown',
        subject: clean(active.claims && active.claims.sub),
        email: clean(active.claims && active.claims.email),
        role: clean(active.claims && active.claims.role),
        artistId: clean(active.claims && active.claims.artistId),
      } : null,
    });
  }

  if (method === 'DELETE') {
    const token = bearer(event);
    const guard = localIdentity.verifySessionToken(token);
    if (!guard.ok) {
      return json(guard.statusCode || 401, { ok: false, error: guard.error || 'Unauthorized.' });
    }
    const revoked = localIdentity.revokeSessionToken(token);
    if (!revoked.ok) {
      return json(revoked.statusCode || 401, { ok: false, error: revoked.error || 'Unable to revoke local session.' });
    }
    return json(200, {
      ok: true,
      revoked: true,
      source: 'local-identity-session',
      subject: clean(guard.claims && guard.claims.sub),
      email: clean(guard.claims && guard.claims.email),
      role: clean(guard.claims && guard.claims.role),
    });
  }

  if (method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  if (!on) {
    return json(503, {
      ok: false,
      error: 'Local SkyGate bootstrap is disabled. Set SKYGATE_ENABLE_LOCAL_SESSION_BOOTSTRAP=1 to enable it.',
    });
  }

  if (!seed || !seed.ok) {
    return json(seed && typeof seed.statusCode === 'number' ? seed.statusCode : 503, {
      ok: false,
      error: seed && seed.error ? seed.error : 'Local operator session bootstrap is not ready.',
    });
  }

  const payload = parseBody(event);
  if (payload == null) {
    return json(400, { ok: false, error: 'Request body must be valid JSON.' });
  }

  const wantsPasswordGrant = clean(payload.grantType).toLowerCase() === 'password' || clean(payload.email || payload.username);
  if (wantsPasswordGrant) {
    const email = clean(payload.email || payload.username).toLowerCase();
    const password = clean(payload.password);
    if (email !== operator.email || password !== operator.password) {
      return json(401, { ok: false, error: 'Invalid local operator credentials.' });
    }
    const auth = localIdentity.authenticate({ email, password, role: 'admin' });
    if (!auth.ok) {
      return json(auth.statusCode || 401, { ok: false, error: auth.error || 'Local operator authentication failed.' });
    }
    const subject = clean(payload.subject || email);
    const issued = localIdentity.issueSession(auth.user, { subject });
    return json(200, {
      ok: true,
      source: 'local-operator-login',
      token: issued.token,
      subject: issued.subject,
      role: auth.user.role,
      operatorEmail: operator.email,
      issuer: issued.issuer,
      audience: issued.audience,
      expiresInSeconds: issued.expiresInSeconds,
    });
  }

  const subject = clean(payload.subject || payload.sub || 'browser-proof-operator');
  const issued = localIdentity.issueSession(seed.user, { subject });

  return json(200, {
    ok: true,
    source: 'local-proof-bootstrap',
    token: issued.token,
    subject: issued.subject,
    role: seed.user.role,
    issuer: issued.issuer,
    audience: issued.audience,
    expiresInSeconds: issued.expiresInSeconds,
  });
};
