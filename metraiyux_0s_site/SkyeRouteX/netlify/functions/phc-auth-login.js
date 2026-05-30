const { jsonResponse } = require('./_lib/housecircle-auth');

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  return jsonResponse(410, {
    ok: false,
    sharedGateAuth: true,
    error: 'Legacy RouteX Netlify sign-in is disabled. Use the shared FS27/SkyGate/Free99 session through the 0S Worker mount.'
  });
};
