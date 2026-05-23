'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

const DATA_DIR = process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');
const JOB_FILE = path.join(DATA_DIR, 'music-provider-jobs.json');

const PROVIDERS = {
  transcoding: {
    label: 'Transcoding',
    urlEnv: 'MUSIC_NEXUS_TRANSCODER_WEBHOOK_URL',
    enabledEnv: 'MUSIC_NEXUS_ENABLE_TRANSCODING',
  },
  waveform: {
    label: 'Waveform',
    urlEnv: 'MUSIC_NEXUS_WAVEFORM_WEBHOOK_URL',
    enabledEnv: 'MUSIC_NEXUS_ENABLE_WAVEFORMS',
  },
  cdn: {
    label: 'CDN Publish',
    urlEnv: 'MUSIC_NEXUS_CDN_WEBHOOK_URL',
    enabledEnv: 'MUSIC_NEXUS_ENABLE_CDN',
  },
  dsp: {
    label: 'DSP Distribution',
    urlEnv: 'MUSIC_NEXUS_DSP_WEBHOOK_URL',
    enabledEnv: 'MUSIC_NEXUS_ENABLE_DSP',
  },
  legal: {
    label: 'Legal Review',
    urlEnv: 'MUSIC_NEXUS_LEGAL_REVIEW_WEBHOOK_URL',
    enabledEnv: 'MUSIC_NEXUS_ENABLE_LEGAL_REVIEW',
  },
  royalty: {
    label: 'Royalty Settlement',
    urlEnv: 'MUSIC_NEXUS_ROYALTY_WEBHOOK_URL',
    enabledEnv: 'MUSIC_NEXUS_ENABLE_ROYALTY_SETTLEMENT',
  },
};

function clean(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function enabled(name) {
  return ['1', 'true', 'yes', 'on'].includes(clean(process.env[name]).toLowerCase());
}

function respond(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
    body: JSON.stringify(body),
  };
}

function ensureJobs() {
  fs.mkdirSync(path.dirname(JOB_FILE), { recursive: true });
  if (!fs.existsSync(JOB_FILE)) fs.writeFileSync(JOB_FILE, '[]\n', 'utf8');
}

function loadJobs() {
  ensureJobs();
  try {
    const parsed = JSON.parse(fs.readFileSync(JOB_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs) {
  ensureJobs();
  fs.writeFileSync(JOB_FILE, JSON.stringify(jobs, null, 2) + '\n', 'utf8');
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

function providerStatus() {
  const globalWebhookOn = enabled('MUSIC_NEXUS_ENABLE_PROVIDER_WEBHOOKS');
  return Object.entries(PROVIDERS).map(([id, provider]) => {
    const url = clean(process.env[provider.urlEnv], 1000);
    const featureOn = enabled(provider.enabledEnv);
    return {
      id,
      label: provider.label,
      configured: Boolean(url),
      enabled: globalWebhookOn && featureOn && Boolean(url),
      env: {
        webhookUrl: provider.urlEnv,
        featureFlag: provider.enabledEnv,
      },
    };
  });
}

function signPayload(body) {
  const secret = clean(process.env.MUSIC_NEXUS_PROVIDER_WEBHOOK_SECRET, 1000);
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function sendProviderWebhook(providerId, job) {
  const provider = PROVIDERS[providerId];
  const url = clean(process.env[provider.urlEnv], 1000);
  if (!enabled('MUSIC_NEXUS_ENABLE_PROVIDER_WEBHOOKS') || !enabled(provider.enabledEnv) || !url) {
    return { sent: false, status: 'waiting-provider-config' };
  }
  const body = JSON.stringify({
    app: 'SkyeMusicNexus',
    event: 'music-provider-job',
    job,
  });
  const signature = signPayload(body);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(signature ? { 'x-skye-music-signature': signature } : {}),
    },
    body,
  });
  const text = await response.text().catch(() => '');
  return {
    sent: true,
    status: response.ok ? 'sent' : 'provider-error',
    providerStatusCode: response.status,
    providerResponse: text.slice(0, 500),
  };
}

function jobFromPayload(payload) {
  const providerId = clean(payload.provider || payload.jobType || '', 40).toLowerCase();
  if (!PROVIDERS[providerId]) {
    return { ok: false, response: respond(400, { ok: false, error: 'provider/jobType must be one of: transcoding, waveform, cdn, dsp, legal, royalty.' }) };
  }
  return {
    ok: true,
    providerId,
    job: {
      id: `job_${crypto.randomBytes(10).toString('hex')}`,
      provider: providerId,
      label: PROVIDERS[providerId].label,
      assetId: clean(payload.assetId, 120),
      releaseId: clean(payload.releaseId, 120),
      artistId: clean(payload.artistId, 120),
      title: clean(payload.title, 180),
      notes: clean(payload.notes, 1200),
      payload: payload.payload && typeof payload.payload === 'object' ? payload.payload : {},
      createdAt: new Date().toISOString(),
      status: 'queued',
    },
  };
}

module.exports.handler = async (event) => {
  try {
    const denied = requireSkyGate(event);
    if (denied) return denied;

    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};
    const action = clean(params.action || '', 40) || (method === 'GET' ? 'status' : 'queue-job');

    if (method === 'GET') {
      if (action === 'status') return respond(200, { ok: true, providers: providerStatus(), webhookGate: enabled('MUSIC_NEXUS_ENABLE_PROVIDER_WEBHOOKS') });
      if (action === 'jobs') {
        const provider = clean(params.provider || '', 40);
        let jobs = loadJobs();
        if (provider) jobs = jobs.filter((job) => job.provider === provider);
        return respond(200, { ok: true, jobs: jobs.slice(-100).reverse(), total: jobs.length });
      }
      return respond(400, { ok: false, error: `Unknown GET action: ${action}` });
    }

    if (method !== 'POST') return respond(405, { ok: false, error: 'Method not allowed' });
    const payload = parseBody(event);
    if (payload === null) return respond(400, { ok: false, error: 'Invalid JSON body' });
    const postAction = clean(payload.action || action, 40);
    if (postAction !== 'queue-job') return respond(400, { ok: false, error: `Unknown POST action: ${postAction}` });

    const built = jobFromPayload(payload);
    if (!built.ok) return built.response;
    const delivery = await sendProviderWebhook(built.providerId, built.job);
    const job = { ...built.job, ...delivery, updatedAt: new Date().toISOString() };
    const jobs = loadJobs();
    jobs.push(job);
    saveJobs(jobs);
    return respond(202, { ok: true, job, providers: providerStatus() });
  } catch (err) {
    return respond(err.statusCode || 500, { ok: false, error: err.message || 'Provider hook failed.' });
  }
};
