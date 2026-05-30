'use strict';

const { gateStatusProvider, verifySkyGateBearer } = require('./_lib/skygate-auth');

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

module.exports.handler = async (event) => {
  const method = (event && event.httpMethod ? event.httpMethod : 'GET').toUpperCase();
  if (method === 'OPTIONS') return json(204, {});

  const status = gateStatusProvider.sessionStatus();

  if (method === 'GET') {
    const active = verifySkyGateBearer(event, { roles: ['admin', 'artist'] });
    return json(200, {
      ok: true,
      localProofBootstrap: false,
      localOperatorLogin: false,
      sharedGateAuth: true,
      enabled: false,
      available: false,
      proofEmail: '',
      issuer: status.issuer,
      audience: status.audience,
      appIdentity: status.appIdentity,
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
    return json(200, { ok: true, revoked: false, sharedGateAuth: true });
  }

  if (method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  return json(410, {
    ok: false,
    error: 'App-local session minting has been removed. Use the shared 0S/SkyGate/Free99 bearer session.',
    gate_required: true,
  });
};
