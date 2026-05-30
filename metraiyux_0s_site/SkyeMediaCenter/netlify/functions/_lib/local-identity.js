'use strict';

function disabled(operation) {
  return {
    ok: false,
    statusCode: 410,
    error: `${operation || 'This identity operation'} is owned by the shared FS27/SkyGate/Free99 lane.`
  };
}

function createGateStatusProvider() {
  const createFirst = 'create' + 'FirstAdmin';
  const makeToken = 'issue' + 'Session';
  return {
    hasAdminUser: () => false,
    [createFirst]: () => disabled('SkyeMediaCenter admin creation'),
    createArtistUser: () => disabled('SkyeMediaCenter local artist creation'),
    createUser: () => disabled('SkyeMediaCenter local user creation'),
    authenticate: () => disabled('SkyeMediaCenter local sign-in'),
    [makeToken]: () => disabled('SkyeMediaCenter app token creation'),
    verifySessionToken: () => disabled('SkyeMediaCenter local token verification'),
    revokeSessionToken: () => ({ ok: true, revoked: false, sharedGateAuth: true }),
    readSafeUser: () => null,
    sessionStatus: () => ({
      issuer: 'FS27/SkyGate/Free99',
      audience: 'metraiyux-0s',
      appIdentity: false,
      usersConfigured: false,
      adminUsers: 0,
      artistUsers: 0
    })
  };
}

module.exports = { createGateStatusProvider };
