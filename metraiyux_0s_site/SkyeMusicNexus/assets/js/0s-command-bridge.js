(function () {
  'use strict';

  const script = document.currentScript || {};
  const dataset = script.dataset || {};
  const app = dataset.commandBridgeApp || document.body?.dataset?.commandBridgeApp || 'skymusicnexus';
  const surface = dataset.commandBridgeSurface || document.body?.dataset?.commandBridgeSurface || document.title || location.pathname;
  const queueKey = 'skymusicnexus.commandBridge.localQueue.v1';

  function clean(value, max) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max || 500);
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

  function pageEntity() {
    const data = document.body?.dataset || {};
    const slug = location.pathname.split('/').filter(Boolean).at(-1) || '';
    return {
      kind: clean(data.artistId ? 'artist' : data.entityKind || 'surface', 80),
      id: clean(data.artistId || data.merchantId || data.entityId || slug, 180),
      label: clean(data.artistName || data.merchantName || document.querySelector('h1')?.textContent || document.title, 220)
    };
  }

  async function capture(type, payload) {
    const event = {
      source_app: payload?.source_app || app,
      source_surface: payload?.source_surface || surface,
      event_type: type || `${app}.surface_view`,
      summary: payload?.summary || document.title || location.pathname,
      entity: payload?.entity || pageEntity(),
      ids: payload?.ids || {},
      money: payload?.money || {},
      links: payload?.links || [{ label: 'Source Page', href: location.pathname + location.search, kind: 'surface' }],
      metadata: {
        pathname: location.pathname,
        search: location.search,
        referrer: document.referrer || '',
        title: document.title || '',
        standalonePagesShim: true,
        ...(payload?.metadata || {})
      },
      createdAt: new Date().toISOString()
    };

    writeQueue([...readQueue(), event]);
    try {
      window.dispatchEvent(new CustomEvent('skymusicnexus:command-bridge-event', { detail: event }));
    } catch {}
    return { ok: true, local: true, event };
  }

  window.SkyeCommandBridge = {
    capture,
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
})();
