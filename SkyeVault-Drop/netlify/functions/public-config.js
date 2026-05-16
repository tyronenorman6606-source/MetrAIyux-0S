import { json, method, handleOptions, noStoreCors } from './_lib/http.js';
import { loadConfig, publicConfig } from './_lib/config.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['GET']);
  if (wrongMethod) return wrongMethod;

  try {
    const { config, source, warning } = await loadConfig();
    return json(200, { ok: true, source, warning, config: { ...publicConfig(config), turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '', humanVerificationRequired: Boolean(process.env.TURNSTILE_SECRET_KEY) } }, noStoreCors(event));
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message }, noStoreCors(event));
  }
}
