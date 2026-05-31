const BLOCKED_PREFIXES = [
  '/artist-storefronts/gray-skyes/drops/wooooah-factor',
  '/artist-storefronts/sam-smith/drops/velvet-ledger',
  '/artist-storefronts/sam-smith/drops/storefront-weather',
  '/artist-storefronts/gray-skyes/drops/owner-mode',
  '/artist-storefronts/artist-live-browser-20260524113443/drops/glass-at-the-line',
  '/artist-storefronts/artist-live-browser-20260524113443/drops/neon-glass-relay',
  '/song-creation-bin',
  '/SkyeMusicNexus/song-creation-bin',
  '/song-creator',
  '/SkyeMusicNexus/song-creator',
  '/create.html',
  '/public/create.html',
  '/SkyeMusicNexus/create.html',
  '/SkyeMusicNexus/public/create.html',
];

const PROTECTED_CREATIVE_EXTENSIONS = new Set([
  '.zip', '.rar', '.7z', '.stem', '.stems', '.als', '.aup3', '.logicx', '.band', '.ptx',
  '.psd', '.ai', '.pdf',
]);

function extensionFor(pathname) {
  const clean = String(pathname || '').split(/[?#]/)[0].toLowerCase();
  const index = clean.lastIndexOf('.');
  return index >= 0 ? clean.slice(index) : '';
}

function isBlocked(pathname) {
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isProtectedCreativeAsset(pathname) {
  const clean = String(pathname || '').replace(/\/+/g, '/');
  if (!clean.startsWith('/artist-storefronts/')) return false;
  if (/\/drops\/[^/]+\/audio\//i.test(clean)) return false;
  if (/^\/artist-storefronts\/gray-skyes\/media\/audio\//i.test(clean)) return false;
  if (/\/pics2vid\/package\.json$/i.test(clean)) return true;
  if (/\/(?:audio|media\/audio)\//i.test(clean) && !/\/drops\/[^/]+\/audio\//i.test(clean)) return true;
  return PROTECTED_CREATIVE_EXTENSIONS.has(extensionFor(clean));
}

function notFound() {
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>404</title><meta name="robots" content="noindex,nofollow"></head><body><h1>404</h1></body></html>',
    {
      status: 404,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, no-cache, max-age=0, must-revalidate',
        'x-robots-tag': 'noindex, nofollow',
      },
    },
  );
}

function purchaseRequired(pathname) {
  return new Response(
    JSON.stringify({
      ok: false,
      code: 'SKYEPAY_ASSET_PURCHASE_REQUIRED',
      error: 'Direct creative asset delivery is blocked. Use the gated SkyeMusicNexus stream/download API after artist authentication or paid SkyPay entitlement.',
      path: pathname,
      unlock: '/public/store.html',
      gated_download_api: '/.netlify/functions/music-assets?action=download&id=<assetId>',
    }),
    {
      status: 402,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store, no-cache, max-age=0, must-revalidate',
        'x-robots-tag': 'noindex, nofollow',
        'x-skye-download-gate': 'artist-or-paid-skypay',
      },
    },
  );
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (isBlocked(url.pathname)) return notFound();
    if (isProtectedCreativeAsset(url.pathname)) return purchaseRequired(url.pathname);
    return env.ASSETS.fetch(request);
  },
};
