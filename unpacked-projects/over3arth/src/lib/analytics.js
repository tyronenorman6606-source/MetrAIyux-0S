const ANALYTICS_PREFIX = 'over3arth';

export function trackEvent(name, payload = {}) {
  const eventName = `${ANALYTICS_PREFIX}:${name}`;
  const detail = {
    app: 'Over3arth',
    version: '1.4.0',
    timestamp: new Date().toISOString(),
    ...payload
  };

  window.dispatchEvent(new window.CustomEvent(eventName, { detail }));

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: eventName, ...detail });
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, detail);
  }
}
