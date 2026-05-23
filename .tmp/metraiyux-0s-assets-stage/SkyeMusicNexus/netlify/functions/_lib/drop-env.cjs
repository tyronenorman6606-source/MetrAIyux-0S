'use strict';

const fs = require('node:fs');
const path = require('node:path');

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function parseEnvText(text) {
  const out = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value.replace(/\\n/g, '\n');
  }
  return out;
}

function envFileCandidates(options = {}) {
  const cwd = process.cwd();
  const repoRoot = clean(options.repoRoot)
    || clean(process.env.METRAIYUX_ROOT)
    || path.resolve(__dirname, '../../../../../');
  return [...new Set([
    path.join(repoRoot, '.env'),
    path.join(repoRoot, '.env.local'),
    path.join(repoRoot, 'SkyeVault-Drop/.env'),
    path.join(cwd, '.env'),
    path.resolve(cwd, '../../.env'),
  ])];
}

function loadEnvSources(options = {}) {
  const sources = [{ source: 'process.env', values: { ...process.env }, process: true }];
  for (const filePath of envFileCandidates(options)) {
    try {
      if (!fs.existsSync(filePath)) continue;
      sources.push({ source: filePath, values: parseEnvText(fs.readFileSync(filePath, 'utf8')) });
    } catch {
      sources.push({ source: filePath, values: {}, readError: true });
    }
  }
  return sources;
}

function expandAlias(values, alias) {
  if (!alias.endsWith('*')) return [alias];
  const prefix = alias.slice(0, -1);
  return Object.keys(values).filter((key) => key.startsWith(prefix)).sort();
}

function findResolved(aliasList, sources, { includeValue = false } = {}) {
  for (const source of sources) {
    for (const alias of aliasList) {
      for (const key of expandAlias(source.values || {}, alias)) {
        const value = clean(source.values[key]);
        if (!value) continue;
        return {
          present: true,
          key,
          source: source.process ? 'process.env' : source.source,
          ...(includeValue ? { value } : {}),
        };
      }
    }
  }
  return { present: false, key: '', source: '' };
}

const ALIASES = {
  netlifyAuthToken: [
    'MUSIC_NEXUS_DROPS_NETLIFY_AUTH_TOKEN',
    'NETLIFY_AUTH_TOKEN',
    'SKYGATEFS13_NETLIFY_AUTH_TOKEN',
    'SKYGATEFS13_TARGET_NETLIFY_AUTH_TOKEN',
    'QUANTUMSKYES_NETLIFY_AUTH_TOKEN',
    'QUANTUMSKYES_*_NETLIFY_AUTH_TOKEN',
  ],
  netlifySiteId: [
    'MUSIC_NEXUS_DROPS_NETLIFY_SITE_ID',
    'NETLIFY_SITE_ID',
    'SKYGATEFS13_TARGET_NETLIFY_SITE_ID',
    'SKYEVAULT_DROP_NETLIFY_SITE_ID',
    'QUANTUMSKYES_NETLIFY_SITE_ID',
    'QUANTUMSKYES_*_NETLIFY_SITE_ID',
  ],
  dropsBaseUrl: [
    'MUSIC_NEXUS_DROPS_BASE_URL',
    'SKYEVAULT_DROP_URL',
    'URL',
    'DEPLOY_PRIME_URL',
  ],
  approvalEmail: [
    'MUSIC_NEXUS_DROPS_APPROVAL_EMAIL',
    'ADMIN_EMAILS',
    'PLATFORM_SCREENSHOT_EMAIL',
    'NOTIFY_EMAIL_TO',
    'CLIENT_RECEIPT_EMAILS',
  ],
  resendApiKey: ['RESEND_API_KEY'],
  resendFromEmail: ['RESEND_FROM_EMAIL'],
  smtpHost: ['SMTP_HOST'],
  smtpPort: ['SMTP_PORT'],
  smtpUser: ['SMTP_USER'],
  smtpPass: ['SMTP_PASS'],
  skygatePublicKey: ['SKYGATE_PUBLIC_KEY_PEM', 'SKYGATEFS13_PUBLIC_KEY_PEM', 'METRAIYUX_0S_SKYGATE_PUBLIC_KEY_PEM'],
  skygateIssuer: ['SKYGATE_ISSUER', 'SKYGATEFS13_ISSUER', 'METRAIYUX_0S_SKYGATE_ISSUER'],
  skygateIntrospect: ['SKYGATE_INTROSPECT_URL', 'SKYGATEFS13_INTROSPECT_URL', 'METRAIYUX_0S_SKYGATE_INTROSPECT_URL'],
  r2AccountId: ['MUSIC_NEXUS_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCOUNT_ID', 'R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID'],
  r2AccessKey: ['MUSIC_NEXUS_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY', 'R2_ACCESS_KEY_ID'],
  r2SecretKey: ['MUSIC_NEXUS_R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_KEY', 'R2_SECRET_ACCESS_KEY'],
  r2Bucket: ['MUSIC_NEXUS_R2_BUCKET', 'R2_BUCKET', 'SKYEVAULT_BUCKET'],
  skyeVaultFolder: ['SKYEVAULT_DROP_FOLDER', 'SKYEVAULT_DROP_URL', 'SKYEVAULT_*'],
  skyeWebCreatorUrl: ['SKYEWEB_CREATOR_DASHBOARD_URL', 'SKYEWEB_CREATOR_PLATFORM_URL', 'VANTACORE_SKYEWEB_CREATOR_DASHBOARD_URL'],
};

function resolveDropEnv(options = {}) {
  const includeValue = options.includeValues === true;
  const sources = loadEnvSources(options);
  const pick = (group) => findResolved(ALIASES[group] || [], sources, { includeValue });
  const netlifyAuthToken = pick('netlifyAuthToken');
  const netlifySiteId = pick('netlifySiteId');
  const approvalEmail = pick('approvalEmail');
  const resendApiKey = pick('resendApiKey');
  const resendFromEmail = pick('resendFromEmail');
  const smtpHost = pick('smtpHost');
  const smtpUser = pick('smtpUser');
  const smtpPass = pick('smtpPass');
  const skygateKeys = ['skygatePublicKey', 'skygateIssuer', 'skygateIntrospect'].map(pick);
  const privateStorageKeys = ['r2AccountId', 'r2AccessKey', 'r2SecretKey', 'r2Bucket', 'skyeVaultFolder'].map(pick);
  const liveDeploy = clean(process.env.MUSIC_NEXUS_DROPS_ENABLE_LIVE_DEPLOY) === '1'
    || findResolved(['MUSIC_NEXUS_DROPS_ENABLE_LIVE_DEPLOY'], sources, { includeValue: true }).value === '1';

  return {
    ok: true,
    redacted: true,
    checkedAt: new Date().toISOString(),
    envSources: sources.map((source) => ({
      source: source.process ? 'process.env' : source.source,
      present: source.process || Object.keys(source.values || {}).length > 0,
      readError: source.readError === true,
    })),
    netlify: {
      authToken: netlifyAuthToken,
      siteId: netlifySiteId,
      baseUrl: pick('dropsBaseUrl'),
      configured: netlifyAuthToken.present && netlifySiteId.present,
      liveDeployEnabled: liveDeploy,
    },
    email: {
      provider: resendApiKey.present ? 'resend' : smtpHost.present ? 'smtp' : 'local-receipt',
      apiKey: resendApiKey,
      from: resendFromEmail,
      adminRecipients: approvalEmail,
      smtpHost,
      smtpUser,
      smtpPass,
      configured: (resendApiKey.present && resendFromEmail.present && approvalEmail.present)
        || (smtpHost.present && smtpUser.present && smtpPass.present && approvalEmail.present),
    },
    skygate: {
      configured: skygateKeys.some((item) => item.present),
      keys: skygateKeys.filter((item) => item.present).map((item) => item.key),
    },
    privateStorage: {
      mode: privateStorageKeys.some((item) => item.present) ? 'r2-or-skyevault' : 'music-nexus-local-proof',
      configured: privateStorageKeys.some((item) => item.present),
      keys: privateStorageKeys.filter((item) => item.present).map((item) => item.key),
    },
    builders: {
      skyeWebCreator: pick('skyeWebCreatorUrl'),
      webGrowthOperator: {
        present: true,
        key: 'repo-path',
        source: 'metraiyux_0s_site/Marketing-Made-Easy/WebGrowthOperator',
      },
    },
  };
}

function secretValue(group, options = {}) {
  const sources = loadEnvSources(options);
  return findResolved(ALIASES[group] || [], sources, { includeValue: true }).value || '';
}

module.exports = {
  ALIASES,
  clean,
  loadEnvSources,
  resolveDropEnv,
  secretValue,
};
