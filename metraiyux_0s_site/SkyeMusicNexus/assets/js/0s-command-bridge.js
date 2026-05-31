(function () {
  'use strict';

  const workerOrigin = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const script = document.currentScript || {};
  const dataset = script.dataset || {};
  const app = dataset.commandBridgeApp || document.body?.dataset?.commandBridgeApp || 'skymusicnexus';
  const surface = dataset.commandBridgeSurface || document.body?.dataset?.commandBridgeSurface || document.title || location.pathname;
  const queueKey = 'skymusicnexus.commandBridge.localQueue.v1';
  const gateKeys = [
    'FREE99_PLATFORM_GATE_SESSION',
    'METRAIYUX_GATE_SESSION',
    'SKYGATEFS27_GATE_SESSION',
    'SKYGATE_USER_TOKEN',
    'SKYE_GATE_SESSION',
    'SKYGATE_SESSION_TOKEN',
    'SKYE_MUSIC_NEXUS_GATE_SESSION',
    'skye_music_nexus_session',
    'saas_client_session',
    'quantumskyes_mcp_owner_token',
    'adminBrainToken'
  ];

  function commandBridgeEndpoint() {
    if (dataset.commandBridgeEndpoint) return dataset.commandBridgeEndpoint;
    if (window.METRAIYUX_COMMAND_BRIDGE_ENDPOINT) return window.METRAIYUX_COMMAND_BRIDGE_ENDPOINT;
    if (/^(127\.0\.0\.1|localhost)$/i.test(location.hostname)) return '/api/0s-command-bridge/events';
    if (/metraiyux-0s-full-system\.graylondonskyes\.workers\.dev$/i.test(location.hostname)) return '/api/0s-command-bridge/events';
    return `${workerOrigin}/api/0s-command-bridge/events`;
  }

  const endpoint = commandBridgeEndpoint();

  function clean(value, max) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max || 500);
  }

  function cleanToken(value) {
    return String(value || '').trim().replace(/^Bearer\s+/i, '').replace(/[^a-zA-Z0-9:_.-]/g, '').slice(0, 500);
  }

  function tokenFromValue(value) {
    if (!value) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      try {
        return tokenFromValue(JSON.parse(trimmed));
      } catch {
        return cleanToken(trimmed);
      }
    }
    if (typeof value === 'object') {
      return cleanToken(
        value.token ||
        value.gateToken ||
        value.gateBearerToken ||
        value.session ||
        value.sessionToken ||
        value.authToken ||
        value.bearerToken ||
        value.auth?.token ||
        value.auth?.bearerToken
      );
    }
    return cleanToken(value);
  }

  function readStoredToken(key) {
    try {
      return tokenFromValue(sessionStorage.getItem(key)) || tokenFromValue(localStorage.getItem(key));
    } catch {
      return '';
    }
  }

  function sharedGateToken() {
    const musicSession = window.SkyeMusicGate?.session?.();
    const bridgeSession = window.MetrAIyuxGateBridge?.current?.() || window.MetrAIyuxGateBridge?.session?.();
    const runtime = window.__SKYEGATE_RUNTIME__ || window.__KAIXU_RUNTIME__ || {};
    const direct = tokenFromValue(musicSession) || tokenFromValue(bridgeSession) || tokenFromValue(runtime);
    if (direct) return direct;
    for (const key of gateKeys) {
      const token = readStoredToken(key);
      if (token) return token;
    }
    return '';
  }

  function authHeaders(extra) {
    const token = sharedGateToken();
    return token ? {
      ...(extra || {}),
      authorization: `Bearer ${token}`,
      'x-free99-gate-session': token,
      'x-skye-gate-session': token,
      'x-skygate-session': token
    } : { ...(extra || {}) };
  }

  function readQueue() {
    try {
      return JSON.parse(localStorage.getItem(queueKey) || '[]');
    } catch {
      return [];
    }
  }

  function writeQueue(events) {
    try {
      localStorage.setItem(queueKey, JSON.stringify(events.slice(-100)));
    } catch {}
  }

  function eventId(event) {
    return event?.id || event?.ids?.local_event_id || event?.created_at || event?.createdAt || '';
  }

  function updateQueuedEvent(original, patch) {
    const id = eventId(original);
    const updated = readQueue().map((event) => eventId(event) === id ? { ...event, ...patch } : event);
    writeQueue(updated);
    return updated.find((event) => eventId(event) === id) || { ...original, ...patch };
  }

  function dispatch(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {}
  }

  function pageEntity() {
    const data = document.body?.dataset || {};
    const slug = location.pathname.split('/').filter(Boolean).at(-1) || '';
    return {
      kind: clean(data.artistId ? 'artist' : data.entityKind || 'surface', 80),
      id: clean(data.artistId || data.merchantId || data.entityId || slug, 180),
      label: clean(data.artistName || data.merchantName || document.querySelector('h1')?.textContent || document.title, 220)
    };
  }

  async function postEvent(event) {
    const target = new URL(endpoint, location.href);
    const sameOrigin = target.origin === location.origin;
    const token = sharedGateToken();
    if (!sameOrigin && !token) throw new Error('shared_gate_session_required');
    const serverEvent = {
      ...event,
      status: 'recorded',
      metadata: {
        ...(event.metadata || {}),
        browser_receipt_lane: event.receiptLane,
        browser_local_event_id: event.id
      }
    };
    const response = await fetch(target.toString(), {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders({ 'content-type': 'application/json', accept: 'application/json' }),
      body: JSON.stringify(serverEvent)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || `command_bridge_${response.status}`);
    return data;
  }

  async function capture(type, payload = {}) {
    const createdAt = new Date().toISOString();
    const event = {
      id: `skymusicnexus_cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      source_app: payload?.source_app || app,
      source_surface: payload?.source_surface || surface,
      event_type: type || `${app}.surface_view`,
      summary: payload?.summary || document.title || location.pathname,
      entity: payload?.entity || pageEntity(),
      ids: { ...(payload?.ids || {}) },
      money: payload?.money || {},
      links: payload?.links || [{ label: 'Source Page', href: location.pathname + location.search, kind: 'surface' }],
      status: 'pending_worker_confirm',
      receiptLane: 'browser_pending_command_bridge',
      serverConfirmed: false,
      metadata: {
        pathname: location.pathname,
        search: location.search,
        referrer: document.referrer || '',
        title: document.title || '',
        commandBridgeEndpoint: endpoint,
        localOnlyUntilWorkerConfirms: true,
        ...(payload?.metadata || {})
      },
      created_at: createdAt,
      createdAt
    };
    event.ids.local_event_id = event.id;

    writeQueue([...readQueue(), event]);
    dispatch('skymusicnexus:command-bridge-event', event);
    try {
      const saved = await postEvent(event);
      const confirmed = updateQueuedEvent(event, {
        status: 'worker-confirmed',
        receiptLane: 'worker-confirmed',
        serverConfirmed: true,
        serverEventId: saved.event?.id || '',
        serverStorage: saved.storage || '',
        confirmedAt: new Date().toISOString(),
        commandBridgeError: ''
      });
      dispatch('skymusicnexus:command-bridge-event-confirmed', { event: confirmed, response: saved });
      return { ok: true, stored: saved.stored !== false, local: true, event: confirmed, response: saved };
    } catch (error) {
      const pending = updateQueuedEvent(event, {
        status: 'pending_worker_confirm',
        receiptLane: 'browser_pending_command_bridge',
        serverConfirmed: false,
        commandBridgeError: error?.message || 'command_bridge_unavailable'
      });
      dispatch('skymusicnexus:command-bridge-event-pending', { event: pending, error: pending.commandBridgeError });
      return { ok: false, stored: false, local: true, pending: true, event: pending, error: pending.commandBridgeError };
    }
  }

  async function flush() {
    const pending = readQueue().filter((event) => event && event.serverConfirmed !== true);
    const results = [];
    for (const event of pending) {
      try {
        const saved = await postEvent(event);
        const confirmed = updateQueuedEvent(event, {
          status: 'worker-confirmed',
          receiptLane: 'worker-confirmed',
          serverConfirmed: true,
          serverEventId: saved.event?.id || '',
          serverStorage: saved.storage || '',
          confirmedAt: new Date().toISOString(),
          commandBridgeError: ''
        });
        results.push({ ok: true, event: confirmed, response: saved });
      } catch (error) {
        const failed = updateQueuedEvent(event, {
          status: 'pending_worker_confirm',
          receiptLane: 'browser_pending_command_bridge',
          serverConfirmed: false,
          commandBridgeError: error?.message || 'command_bridge_unavailable'
        });
        results.push({ ok: false, event: failed, error: failed.commandBridgeError });
      }
    }
    dispatch('skymusicnexus:command-bridge-flush', { results });
    return { ok: results.every((result) => result.ok), attempted: pending.length, results };
  }

  window.SkyeCommandBridge = {
    capture,
    flush,
    readLocalQueue: readQueue,
    view(metadata) {
      return capture(`${app}.surface_view`, { metadata });
    },
    productIntent(product) {
      return capture(`${app}.product_intent`, {
        entity: { kind: 'product', id: product?.id || product?.productId || '', label: product?.title || product?.name || '' },
        money: product?.money || {},
        metadata: product || {}
      });
    },
    pwaDrop(drop) {
      return capture(`${app}.pwa_drop_intent`, {
        entity: { kind: 'pwa-drop', id: drop?.id || drop?.dropId || '', label: drop?.title || drop?.name || '' },
        metadata: drop || {}
      });
    }
  };

  if (dataset.commandBridgeAuto !== 'false') {
    const run = () => capture(`${app}.surface_view`, { metadata: { ready_state: document.readyState } });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  }
  window.addEventListener('online', () => { flush(); });
})();
