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
const AI_PROVIDERS = {
  elevenlabs: {
    label: 'ElevenLabs Music',
    keyEnv: ['eleven_labs_api_key', 'ELEVEN_LABS_API_KEY', 'ELEVENLABS_API_KEY', 'ELEVENLABS_MUSIC_API_KEY', 'ELEVEN_API_KEY', 'eleven_labs_api_key_2', 'ELEVEN_LABS_API_KEY_2', 'ELEVENLABS_API_KEY_2'],
    endpointEnv: 'ELEVENLABS_MUSIC_GENERATE_URL',
    endpoint: 'https://api.elevenlabs.io/v1/music',
  },
  stability: {
    label: 'Stability AI Stable Audio',
    keyEnv: ['STABILITY_API_KEY', 'STABILITYAI_API_KEY', 'STABILITY_AI_API_KEY', 'STABILITY_KEY', 'Stability_api_key', 'stability_api_key'],
    endpointEnv: 'STABILITY_AUDIO_GENERATE_URL',
    endpoint: 'https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio',
  },
};

function clean(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function enabled(name) {
  return ['1', 'true', 'yes', 'on'].includes(clean(process.env[name]).toLowerCase());
}

function firstEnv(names) {
  for (const name of names) {
    if (clean(process.env[name], 4000)) return { name, value: clean(process.env[name], 4000), present: true };
  }
  return { name: names[0], value: '', present: false };
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

function aiProviderStatus() {
  return Object.entries(AI_PROVIDERS).map(([id, provider]) => {
    const key = firstEnv(provider.keyEnv);
    const endpoint = clean(process.env[provider.endpointEnv], 1000) || provider.endpoint;
    return {
      id,
      label: provider.label,
      configured: key.present,
      keyEnv: key.name,
      endpointEnv: provider.endpointEnv,
      endpointHost: new URL(endpoint).host,
      executeSupported: true,
      secretValuesReturned: false,
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

function aiJobFromPayload(payload) {
  const providerId = clean(payload.provider || 'elevenlabs', 40).toLowerCase();
  const provider = AI_PROVIDERS[providerId];
  if (!provider) return { ok: false, response: respond(400, { ok: false, error: 'provider must be elevenlabs or stability.' }) };
  const key = firstEnv(provider.keyEnv);
  return {
    ok: true,
    providerId,
    provider,
    key,
    endpoint: clean(process.env[provider.endpointEnv], 1000) || provider.endpoint,
    job: {
      id: `ai_job_${crypto.randomBytes(10).toString('hex')}`,
      provider: providerId,
      label: provider.label,
      artistId: clean(payload.artistId || '444666666666', 120),
      artistName: clean(payload.artistName || '', 180),
      collectiveId: clean(payload.collectiveId || 'gray-skyes-collective', 120),
      title: clean(payload.title || 'Generated MusicNexus Song', 220),
      prompt: clean(payload.prompt || payload.description || 'Create a finished SkyeMusicNexus song concept.', 4000),
      durationSeconds: Math.max(8, Math.min(300, Number(payload.durationSeconds || payload.duration || 60) || 60)),
      executeRequested: payload.execute === true || payload.live === true,
      providerConfigured: key.present,
      requiredEnv: key.present ? '' : key.name,
      status: key.present ? (payload.execute === true || payload.live === true ? 'calling-provider' : 'queued-provider-ready') : 'waiting-provider-key',
      createdAt: new Date().toISOString(),
    },
  };
}

async function executeAiProvider(built, payload) {
  if (!built.key.present) return { status: 'waiting-provider-key', providerCalled: false };
  const includeAudioBase64 = payload.includeAudioBase64 !== false;
  let response;
  if (built.providerId === 'elevenlabs') {
    response = await fetch(built.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'audio/mpeg', 'xi-api-key': built.key.value },
      body: JSON.stringify({
        prompt: built.job.prompt,
        music_length_ms: built.job.durationSeconds * 1000,
        model_id: clean(payload.modelId || payload.model || '', 120) || undefined,
        force_instrumental: payload.instrumental === true || payload.forceInstrumental === true || undefined,
      }),
    });
  } else {
    const form = new FormData();
    form.append('prompt', built.job.prompt);
    form.append('duration', String(built.job.durationSeconds));
    form.append('output_format', clean(payload.outputFormat || 'mp3', 20));
    response = await fetch(built.endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${built.key.value}`, accept: 'audio/*, application/json' },
      body: form,
    });
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await response.json().catch(() => ({}));
    return { status: response.ok ? 'generated' : 'provider-error', providerCalled: true, providerStatusCode: response.status, contentType, providerJson: JSON.stringify(json).slice(0, 1200), audioBase64: json.audio || json.audio_base64 || json.audioBase64 || '' };
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { status: response.ok ? 'generated' : 'provider-error', providerCalled: true, providerStatusCode: response.status, contentType: contentType || 'audio/mpeg', bytes: buffer.length, audioBase64: includeAudioBase64 && buffer.length <= 8 * 1024 * 1024 ? buffer.toString('base64') : '' };
}

module.exports.handler = async (event) => {
  try {
    const denied = requireSkyGate(event);
    if (denied) return denied;

    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};
    const action = clean(params.action || '', 40) || (method === 'GET' ? 'status' : 'queue-job');

    if (method === 'GET') {
      if (action === 'status') return respond(200, { ok: true, providers: providerStatus(), aiProviders: aiProviderStatus(), webhookGate: enabled('MUSIC_NEXUS_ENABLE_PROVIDER_WEBHOOKS') });
      if (action === 'ai-status') return respond(200, { ok: true, providers: aiProviderStatus(), jobs: loadJobs().filter((job) => job.provider === 'elevenlabs' || job.provider === 'stability').slice(-100).reverse() });
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
    if (['queue-ai-song', 'generate-ai-song', 'create-ai-song'].includes(postAction)) {
      const built = aiJobFromPayload(payload);
      if (!built.ok) return built.response;
      let execution = {};
      if ((postAction === 'generate-ai-song' || payload.execute === true || payload.live === true) && built.key.present) {
        execution = await executeAiProvider(built, payload).catch((err) => ({ status: 'provider-error', providerCalled: true, error: err.message || 'provider_call_failed' }));
        Object.assign(built.job, execution);
      }
      built.job.status = execution.status || built.job.status;
      built.job.updatedAt = new Date().toISOString();
      const jobs = loadJobs();
      jobs.push(built.job);
      saveJobs(jobs);
      return respond(built.job.status === 'generated' ? 201 : 202, { ok: true, job: built.job, providers: aiProviderStatus(), audioBase64: execution.audioBase64 || '', providerJson: execution.providerJson || '' });
    }
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
