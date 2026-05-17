import { resolveSkyGateOperator, skyGateConfig } from './skygateBridge.mjs';

export async function requireAdmin(req, res, next) {
  if (req.adminAuthChecked) return next();

  const expected = process.env.GATEWAY_ADMIN_TOKEN;
  if (!expected) {
    return res.status(500).json({ ok: false, error: 'GATEWAY_ADMIN_TOKEN is not configured' });
  }

  const requireOperatorHeader = String(process.env.REQUIRE_OPERATOR_HEADER || 'false') === 'true';
  const trustedHeader = (process.env.TRUSTED_OPERATOR_HEADER || 'x-skyes-operator').toLowerCase();

  if (requireOperatorHeader && !req.headers[trustedHeader]) {
    return res.status(401).json({ ok: false, error: `Missing required operator header: ${trustedHeader}` });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const config = skyGateConfig();

  if (config.acceptLegacyAdmin && token === expected) {
    req.operator = {
      id: req.headers[trustedHeader] || 'token-operator',
      tenant: req.headers['x-skyes-tenant'] || null,
      role: req.headers['x-skyes-role'] || null,
      source: 'gateway-admin-token'
    };
    req.adminAuthChecked = true;
    return next();
  }

  const skyGate = await resolveSkyGateOperator(req);
  if (skyGate.authorized) {
    req.operator = skyGate.operator;
    req.skygateAuth = skyGate.result;
    req.adminAuthChecked = true;
    return next();
  }

  if (config.authRequired) {
    return res.status(401).json({
      ok: false,
      error: skyGate.reason === 'insufficient_scope' ? 'Skyegate token does not grant CitadelDB admin authority' : 'Skyegate authentication required'
    });
  }

  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}
