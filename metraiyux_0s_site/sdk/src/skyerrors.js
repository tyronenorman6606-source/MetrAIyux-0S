const DEFAULT_ZERO_OS_URL = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Captured exception',
      stack: error.stack || ''
    };
  }
  if (error && typeof error === 'object') {
    return {
      name: clean(error.name, 'Error'),
      message: clean(error.message || JSON.stringify(error), 'Captured exception'),
      stack: clean(error.stack)
    };
  }
  return {
    name: 'Error',
    message: clean(error, 'Captured exception'),
    stack: ''
  };
}

function currentBrowserUrl() {
  try {
    return typeof window !== 'undefined' && window.location ? window.location.href : '';
  } catch {
    return '';
  }
}

export function createSkyErrorsClient({
  token,
  endpoint,
  zeroOsUrl,
  service = 'metraiyux-0s-sdk',
  release = '',
  environment = 'production',
  beforeSend = null,
  fetchImpl = globalThis.fetch?.bind(globalThis)
} = {}) {
  const base = clean(endpoint || zeroOsUrl || DEFAULT_ZERO_OS_URL).replace(/\/$/, '');
  const captureUrl = base.endsWith('/api/skyerrors/events') ? base : `${base}/api/skyerrors/events`;

  async function send(payload) {
    if (!fetchImpl) throw new Error('fetch is required for SkyErrors capture');
    const next = {
      service,
      release,
      environment,
      url: currentBrowserUrl(),
      ...payload
    };
    const finalPayload = typeof beforeSend === 'function' ? await beforeSend(next) : next;
    if (finalPayload === null || finalPayload === false) return { ok: false, skipped: true };
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetchImpl(captureUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(finalPayload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data?.error || `SkyErrors capture failed with ${response.status}`);
      err.response = data;
      err.status = response.status;
      throw err;
    }
    return data;
  }

  function captureException(error, context = {}) {
    const exception = serializeError(error);
    return send({
      level: context.level || 'error',
      message: context.message || exception.message,
      exception,
      tags: context.tags || {},
      contexts: context.contexts || context.context || {},
      user: context.user || {},
      fingerprint: context.fingerprint || []
    });
  }

  function captureMessage(message, context = {}) {
    return send({
      level: context.level || 'info',
      message: clean(message, 'Captured message'),
      tags: context.tags || {},
      contexts: context.contexts || context.context || {},
      user: context.user || {},
      fingerprint: context.fingerprint || []
    });
  }

  function installGlobalHandlers(options = {}) {
    if (typeof window === 'undefined') return () => {};
    const onError = (event) => {
      captureException(event.error || event.message || 'Unhandled browser error', {
        ...options,
        contexts: { ...(options.contexts || {}), filename: event.filename || '', lineno: event.lineno || 0, colno: event.colno || 0 }
      }).catch(() => {});
    };
    const onRejection = (event) => {
      captureException(event.reason || 'Unhandled promise rejection', {
        ...options,
        contexts: { ...(options.contexts || {}), source: 'unhandledrejection' }
      }).catch(() => {});
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }

  return {
    captureException,
    captureMessage,
    installGlobalHandlers,
    send
  };
}
