import { json, method, handleOptions, noStoreCors, readJson, configuredOrigins } from './_lib/http.js';
import { requireAdmin } from './_lib/security.js';
import { notificationConfigSummary } from './_lib/notifications.js';
import { abusePolicySummary } from './_lib/rate-limit.js';
import { loadConfig, getConfigFolderId, CONFIG_FILE, LEDGER_FILE } from './_lib/config.js';
import { getAccessToken, getFolderMetadata, findFileInFolder } from './_lib/google-drive.js';

function parseBootstrapConfig() {
  const raw = process.env.R2_CONFIG_JSON || process.env.GOOGLE_DRIVE_CONFIG_JSON;
  if (!raw) return { ok: true, configured: false, destinations: 0 };
  try {
    const parsed = JSON.parse(raw);
    return {
      ok: true,
      configured: true,
      destinations: Array.isArray(parsed.destinations) ? parsed.destinations.length : 0,
      brandName: parsed.brandName || null,
      routingMode: parsed.routingMode || null
    };
  } catch (error) {
    return { ok: false, configured: true, error: error.message };
  }
}

function check(name, ok, detail, required = true) {
  return { name, ok: Boolean(ok), detail, required };
}

async function liveChecks(checks) {
  await getAccessToken();
  checks.push(check('Cloudflare R2 credentials', true, 'The deployed Function can sign R2 S3-compatible requests.'));

  const configFolderId = getConfigFolderId();
  const folder = await getFolderMetadata(configFolderId);
  checks.push(
    check(
      'Config prefix read access',
      folder?.provider === 'cloudflare-r2' || folder?.mimeType === 'application/vnd.google-apps.folder',
      `Read prefix ${folder?.name || configFolderId}. canAddChildren=${folder?.capabilities?.canAddChildren ?? 'unknown'}`
    )
  );

  const configFile = await findFileInFolder(configFolderId, CONFIG_FILE).catch(() => null);
  const ledgerFile = await findFileInFolder(configFolderId, LEDGER_FILE).catch(() => null);
  checks.push(
    check(
      'R2 config object lookup',
      true,
      configFile ? `${CONFIG_FILE} exists in the config prefix.` : `${CONFIG_FILE} does not exist yet; the app will use R2_CONFIG_JSON until admin saves config.`,
      false
    )
  );
  checks.push(
    check(
      'R2 ledger object lookup',
      true,
      ledgerFile ? `${LEDGER_FILE} exists in the config prefix.` : `${LEDGER_FILE} does not exist yet; it will be created after uploads complete.`,
      false
    )
  );

  const { config, source, warning } = await loadConfig();
  checks.push(
    check(
      'Runtime routing config loads',
      Array.isArray(config.destinations),
      `Loaded from ${source}. Destinations: ${config.destinations.length}.${warning ? ` Warning: ${warning}` : ''}`
    )
  );
  checks.push(
    check(
      'At least one enabled destination has an R2 prefix',
      config.destinations.some((destination) => destination.enabled && destination.folderId),
      'The upload portal needs at least one enabled R2 destination prefix.'
    )
  );
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return handleOptions(event);
  const wrongMethod = method(event, ['POST']);
  if (wrongMethod) return wrongMethod;

  const checks = [];

  try {
    requireAdmin(event);
    const body = await readJson(event);
    const bootstrap = parseBootstrapConfig();
    const origins = configuredOrigins();
    const configFolderId = process.env.R2_CONFIG_PREFIX || process.env.R2_CONFIG_FOLDER_ID || process.env.GOOGLE_CONFIG_FOLDER_ID || '';
    const r2AccountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const r2AccessKey = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY || process.env.S3_ACCESS_KEY || '';
    const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_KEY || process.env.S3_SECRET_KEY || '';
    const r2Bucket = process.env.R2_BUCKET || process.env.S3_BUCKET || '';

    checks.push(check('ADMIN_TOKEN configured', Boolean(process.env.ADMIN_TOKEN), 'Admin API calls require x-admin-token.'));
    checks.push(
      check(
        'CLIENT_PORTAL_KEY configured',
        Boolean(process.env.CLIENT_PORTAL_KEY),
        process.env.CLIENT_PORTAL_KEY ? 'Clients must enter the upload access code.' : 'No client upload code is configured; uploads are open to anyone with the link unless origin controls block them.',
        false
      )
    );
    checks.push(
      check(
        'R2_ACCOUNT_ID configured',
        Boolean(r2AccountId),
        r2AccountId ? 'Cloudflare account ID is configured.' : 'Missing R2_ACCOUNT_ID.'
      )
    );
    checks.push(
      check(
        'R2 API credentials configured',
        Boolean(r2AccessKey && r2SecretKey),
        r2AccessKey && r2SecretKey ? 'R2 access key and secret are configured.' : 'Missing R2 access key or secret.'
      )
    );
    checks.push(
      check(
        'R2 bucket and config prefix configured',
        Boolean(r2Bucket && configFolderId),
        r2Bucket && configFolderId ? `Bucket and config prefix are configured.` : 'Missing R2_BUCKET or R2_CONFIG_PREFIX.'
      )
    );
    checks.push(
      check(
        'RECEIPT_SIGNING_SECRET configured',
        Boolean(process.env.RECEIPT_SIGNING_SECRET || process.env.ADMIN_TOKEN),
        process.env.RECEIPT_SIGNING_SECRET ? 'Dedicated receipt signing secret is configured.' : 'Using ADMIN_TOKEN as fallback signer. Set RECEIPT_SIGNING_SECRET for cleaner separation.',
        false
      )
    );
    const notificationConfig = notificationConfigSummary();
    checks.push(
      check(
        'Operator page session secret configured',
        Boolean(process.env.OPERATOR_SESSION_SECRET || process.env.ADMIN_TOKEN),
        process.env.OPERATOR_SESSION_SECRET ? 'Dedicated operator session signer is configured.' : 'Using ADMIN_TOKEN as fallback signer. Set OPERATOR_SESSION_SECRET for cleaner separation.',
        false
      )
    );
    checks.push(
      check(
        'Notification channel configured',
        notificationConfig.webhookConfigured || notificationConfig.resendConfigured,
        notificationConfig.webhookConfigured || notificationConfig.resendConfigured
          ? 'At least one upload-complete notification path is configured.'
          : 'No notification channel configured. Uploads will still be recorded, but you will not be alerted automatically.',
        false
      )
    );
    checks.push(
      check(
        'Client receipt email setting',
        notificationConfig.clientReceiptEmailsEnabled ? notificationConfig.clientReceiptFromConfigured && notificationConfig.resendConfigured : true,
        notificationConfig.clientReceiptEmailsEnabled
          ? 'Client receipt emails are enabled. Confirm Resend + from-address fields are configured.'
          : 'Client receipt emails are disabled. Set CLIENT_RECEIPT_EMAILS=true when ready.',
        false
      )
    );
    checks.push(
      check(
        'Turnstile setting',
        process.env.TURNSTILE_SECRET_KEY ? Boolean(process.env.TURNSTILE_SITE_KEY) : true,
        process.env.TURNSTILE_SECRET_KEY ? 'Turnstile secret is configured; public site key should also be configured.' : 'Turnstile is disabled. Portal code, origin allow-list, honeypot, and rate limits still apply.',
        false
      )
    );
    checks.push(
      check(
        'ALLOWED_ORIGINS configured',
        origins.length > 0,
        origins.length ? `Allowed origins: ${origins.join(', ')}` : 'No allowed origins set. The API will reflect requester origin. Add your Netlify/custom domains before sending this to clients.',
        false
      )
    );
    checks.push(
      check(
        'R2_CONFIG_JSON parseable',
        bootstrap.ok,
        bootstrap.configured ? `Bootstrap configured. Destinations: ${bootstrap.destinations}.` : 'No bootstrap JSON set. Admin-saved config can still work if the R2 config object exists.',
        false
      )
    );

    if (body.liveTest) {
      try {
        await liveChecks(checks);
      } catch (error) {
        checks.push(check('Live R2 diagnostics', false, error.message));
      }
    }

    const requiredFailed = checks.filter((item) => item.required && !item.ok);
    return json(
      200,
      {
        ok: requiredFailed.length === 0,
        checks,
        runtime: {
          node: process.version,
          hasAllowedOrigins: origins.length > 0,
          bootstrapConfig: bootstrap.ok ? bootstrap : { ok: false, error: bootstrap.error },
          liveTestRan: Boolean(body.liveTest),
          serviceAccount: r2Bucket ? `r2:${r2Bucket}` : null,
          notifications: notificationConfig,
          abuseControls: abusePolicySummary()
        }
      },
      noStoreCors(event)
    );
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message, checks }, noStoreCors(event));
  }
}
