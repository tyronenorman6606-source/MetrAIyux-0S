'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

const MUSIC_NEXUS_DIR = process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');
const STORE_FILE = 'commerce-spine.json';
const PLATFORM_FEE_BPS = 1300;
const STOREFRONT_LIMITS = {
  'free99-lite': { label: 'Free99 Lite storefront preview', maxProducts: 3, monthlyOrderIntents: 25, monthlySkyeNetPublishes: 0, skyePayCheckout: true, skyeNetPublish: false },
  'storefront-starter': { label: 'Nexus Storefront Starter', maxProducts: 10, monthlyOrderIntents: 150, monthlySkyeNetPublishes: 2, skyePayCheckout: true, skyeNetPublish: true },
  'artist-host': { label: 'Artist Host', maxProducts: 25, monthlyOrderIntents: 500, monthlySkyeNetPublishes: 6, skyePayCheckout: true, skyeNetPublish: true },
  'artist-collective': { label: 'Artist Collective', maxProducts: 150, monthlyOrderIntents: 2500, monthlySkyeNetPublishes: 20, skyePayCheckout: true, skyeNetPublish: true },
  managed: { label: 'Managed Music Ops', maxProducts: 1000, monthlyOrderIntents: 20000, monthlySkyeNetPublishes: 100, skyePayCheckout: true, skyeNetPublish: true }
};

function filePath(name) {
  return path.join(MUSIC_NEXUS_DIR, name);
}

function ensureFile(target, defaultValue) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) fs.writeFileSync(target, JSON.stringify(defaultValue, null, 2) + '\n', 'utf8');
}

function loadJson(name, defaultValue) {
  const target = filePath(name);
  ensureFile(target, defaultValue);
  try {
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    return parsed == null ? defaultValue : parsed;
  } catch {
    return defaultValue;
  }
}

function saveJson(name, value) {
  const target = filePath(name);
  ensureFile(target, Array.isArray(value) ? [] : {});
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function loadCommerce() {
  const commerce = loadJson(STORE_FILE, {});
  return {
    stores: Array.isArray(commerce.stores) ? commerce.stores : [],
    products: Array.isArray(commerce.products) ? commerce.products : [],
    orders: Array.isArray(commerce.orders) ? commerce.orders : [],
    fulfillments: Array.isArray(commerce.fulfillments) ? commerce.fulfillments : [],
  };
}

function saveCommerce(commerce) {
  saveJson(STORE_FILE, {
    stores: commerce.stores || [],
    products: commerce.products || [],
    orders: commerce.orders || [],
    fulfillments: commerce.fulfillments || [],
  });
}

function loadArtists() {
  return loadJson('artists.json', []);
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function clean(value, fallback = '', limit = 1000) {
  return String(value == null ? fallback : value).trim().slice(0, limit);
}

function slug(value, fallback = 'store') {
  const out = clean(value, fallback, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return out || fallback;
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

function cents(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
}

function normalizeProductType(value) {
  const type = clean(value || 'digital', 'digital', 60).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return ['digital', 'merch', 'ticket', 'tip', 'booking', 'membership', 'private_access'].includes(type) ? type : 'digital';
}

function normalizeStatus(value, fallback = 'active') {
  const status = clean(value || fallback, fallback, 60).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return status || fallback;
}

function normalizeFeeMode(value) {
  const mode = clean(value || 'buyer_covered', 'buyer_covered', 60).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return ['buyer_covered', 'artist_absorbed'].includes(mode) ? mode : 'buyer_covered';
}

function normalizeStorefrontPlan(value) {
  const plan = clean(value || 'free99-lite', 'free99-lite', 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  if (['skyemusicnexus-studio', 'studio', 'creator'].includes(plan)) return 'artist-host';
  if (['skyemusicnexus-label-command', 'label-command'].includes(plan)) return 'artist-collective';
  if (['skyemusicnexus-managed-music-ops', 'managed-music-ops'].includes(plan)) return 'managed';
  return STOREFRONT_LIMITS[plan] ? plan : 'free99-lite';
}

function storefrontLimits(plan) {
  const id = normalizeStorefrontPlan(plan);
  return { id, ...STOREFRONT_LIMITS[id] };
}

function orderMonth(order) {
  return String(order.createdAt || '').slice(0, 7);
}

function normalizeLinks(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const links = {};
  for (const [label, url] of Object.entries(input)) {
    const safeLabel = clean(label, '', 80);
    const safeUrl = clean(url, '', 800);
    if (safeLabel && safeUrl) links[safeLabel] = safeUrl;
  }
  return links;
}

function byId(list, id, fields = ['id']) {
  return list.find((item) => fields.some((field) => item[field] && item[field] === id)) || null;
}

function artistSummary(artistId) {
  const artist = loadArtists().find((item) => item.id === artistId || item.artistId === artistId || item.skyeId === artistId) || null;
  if (!artist) return null;
  return {
    id: artist.id || artist.artistId,
    name: artist.name || artist.stageName || artist.email || artist.id,
    email: artist.email || '',
    skyeId: artist.skyeId || artist.identityId || '',
  };
}

function checkoutUrl(order) {
  const params = new URLSearchParams({
    client: 'metraiyux-0s',
    offer: 'skyemusicnexus-artist-store',
    artistId: order.artistId,
    orderId: order.orderId,
    productId: order.productId,
    amountCents: String(order.totalCents),
  });
  return `/skyepay-store.html?${params.toString()}`;
}

function publicStore(store, products, orders) {
  const scopedProducts = products.filter((product) => product.artistId === store.artistId);
  const scopedOrders = orders.filter((order) => order.artistId === store.artistId);
  return {
    ...store,
    storefrontPlan: normalizeStorefrontPlan(store.storefrontPlan || store.planId),
    limits: storefrontLimits(store.storefrontPlan || store.planId),
    productCount: scopedProducts.length,
    activeProductCount: scopedProducts.filter((product) => product.status === 'active').length,
    orderCount: scopedOrders.length,
    grossCents: scopedOrders.reduce((sum, order) => sum + cents(order.subtotalCents), 0),
    artistNetCents: scopedOrders.reduce((sum, order) => sum + cents(order.artistNetCents), 0),
  };
}

function storeAnalytics(store, products, orders, fulfillments = []) {
  const scopedProducts = products.filter((product) => product.artistId === store.artistId);
  const scopedOrders = orders.filter((order) => order.artistId === store.artistId);
  const scopedFulfillments = fulfillments.filter((item) => item.artistId === store.artistId);
  const paidLike = scopedOrders.filter((order) => ['paid', 'fulfilled', 'payout_review', 'payout_eligible'].includes(normalizeStatus(order.status, order.status || '')));
  const productSales = new Map();
  for (const order of scopedOrders) {
    const key = order.productId || 'unknown';
    const current = productSales.get(key) || { productId: key, title: order.title || key, units: 0, grossCents: 0, artistNetCents: 0 };
    current.units += Number(order.quantity || 0);
    current.grossCents += cents(order.subtotalCents);
    current.artistNetCents += cents(order.artistNetCents);
    productSales.set(key, current);
  }
  return {
    counts: {
      products: scopedProducts.length,
      activeProducts: scopedProducts.filter((product) => product.status === 'active').length,
      orders: scopedOrders.length,
      pendingOrders: scopedOrders.filter((order) => !['fulfilled', 'refunded', 'cancelled'].includes(order.status)).length,
      fulfillments: scopedFulfillments.length
    },
    revenue: {
      grossCents: scopedOrders.reduce((sum, order) => sum + cents(order.subtotalCents), 0),
      platformFeeCents: scopedOrders.reduce((sum, order) => sum + cents(order.platformFeeCents), 0),
      artistNetCents: scopedOrders.reduce((sum, order) => sum + cents(order.artistNetCents), 0),
      paidOrFulfilledCents: paidLike.reduce((sum, order) => sum + cents(order.artistNetCents), 0)
    },
    topProducts: [...productSales.values()].sort((a, b) => b.units - a.units || b.grossCents - a.grossCents).slice(0, 8),
    readiness: {
      skyeCommerceAttached: Boolean(store.skyeCommerceMerchantId || store.skyeCommerceStorefrontUrl),
      payoutPolicy: store.payoutPolicy || '',
      limits: storefrontLimits(store.storefrontPlan || store.planId)
    }
  };
}

function skyeNetPublishesThisMonth(store) {
  const month = nowIso().slice(0, 7);
  return (Array.isArray(store.skyeNetPublishes) ? store.skyeNetPublishes : []).filter((item) => String(item.createdAt || '').slice(0, 7) === month).length;
}

function handleAnalytics(params) {
  const commerce = loadCommerce();
  const artistId = clean(params.artistId, '', 120);
  const stores = commerce.stores.filter((store) => !artistId || store.artistId === artistId);
  return respond(200, {
    ok: true,
    analytics: stores.map((store) => ({ store: publicStore(store, commerce.products, commerce.orders), analytics: storeAnalytics(store, commerce.products, commerce.orders, commerce.fulfillments) })),
    generatedAt: nowIso()
  });
}

function handleHub(params) {
  const commerce = loadCommerce();
  const artistId = clean(params.artistId, '', 120);
  const stores = commerce.stores
    .filter((store) => !artistId || store.artistId === artistId)
    .map((store) => publicStore(store, commerce.products, commerce.orders));
  const products = commerce.products.filter((product) => !artistId || product.artistId === artistId);
  const orders = commerce.orders.filter((order) => !artistId || order.artistId === artistId);
  return respond(200, {
    ok: true,
    gateSessionRequired: true,
    providerRequired: false,
    platformFeeBps: PLATFORM_FEE_BPS,
    stores,
    products,
    orders,
    fulfillments: commerce.fulfillments.filter((item) => !artistId || item.artistId === artistId),
    summary: {
      stores: stores.length,
      products: products.length,
      activeProducts: products.filter((product) => product.status === 'active').length,
      orders: orders.length,
      pendingOrders: orders.filter((order) => order.status !== 'fulfilled' && order.status !== 'refunded').length,
      grossCents: orders.reduce((sum, order) => sum + cents(order.subtotalCents), 0),
      platformFeeCents: orders.reduce((sum, order) => sum + cents(order.platformFeeCents), 0),
      artistNetCents: orders.reduce((sum, order) => sum + cents(order.artistNetCents), 0),
    },
    generatedAt: nowIso(),
  });
}

function handlePublishSkyeNet(payload) {
  const artistId = clean(payload.artistId, '', 120);
  if (!artistId) return respond(400, { ok: false, error: 'artistId is required.' });
  const commerce = loadCommerce();
  const store = commerce.stores.find((item) => item.artistId === artistId || item.storeId === payload.storeId);
  if (!store) return respond(404, { ok: false, error: 'Store not found.' });
  const limits = storefrontLimits(store.storefrontPlan || store.planId);
  if (!limits.skyeNetPublish) return respond(402, { ok: false, error: `${limits.label} does not include SkyeNet storefront publishing.`, code: 'SKYENET_PUBLISH_PLAN_REQUIRED', limits });
  const used = skyeNetPublishesThisMonth(store);
  if (used >= limits.monthlySkyeNetPublishes) return respond(402, { ok: false, error: `${limits.label} allows ${limits.monthlySkyeNetPublishes} SkyeNet publish(es) per month.`, code: 'SKYENET_PUBLISH_LIMIT_REACHED', limits, used });
  const publish = {
    publishId: makeId('skynet'),
    artistId,
    storeId: store.storeId,
    storeSlug: store.slug,
    status: 'publish_intent_recorded',
    provider: 'skyenet',
    mode: clean(payload.mode || 'operator_reviewed_static_storefront', 'operator_reviewed_static_storefront', 120),
    requestedUrl: clean(payload.url || payload.requestedUrl || '', '', 1000),
    liveUrl: clean(payload.liveUrl || store.skyeCommerceStorefrontUrl || `/SkyeCommerce/store/?slug=${store.skyeCommerceStoreSlug || store.slug}`, '', 1000),
    productCount: commerce.products.filter((product) => product.artistId === artistId && product.status === 'active').length,
    createdAt: nowIso()
  };
  store.skyeNetPublishes = [publish, ...(Array.isArray(store.skyeNetPublishes) ? store.skyeNetPublishes : [])].slice(0, 100);
  store.lastSkyeNetPublish = publish;
  store.updatedAt = publish.createdAt;
  saveCommerce(commerce);
  return respond(201, { ok: true, publish, usedThisMonth: used + 1, remainingThisMonth: Math.max(0, limits.monthlySkyeNetPublishes - used - 1), store: publicStore(store, commerce.products, commerce.orders) });
}

function handleUpsertStore(payload) {
  const artistId = clean(payload.artistId, '', 120);
  if (!artistId) return respond(400, { ok: false, error: 'artistId is required.' });
  const commerce = loadCommerce();
  const existing = commerce.stores.find((store) => store.artistId === artistId || store.storeId === payload.storeId);
  const artist = artistSummary(artistId);
  const store = {
    storeId: clean(payload.storeId || existing?.storeId || makeId('store'), '', 120),
    artistId,
    artistName: clean(payload.artistName || artist?.name || existing?.artistName || '', 180),
    name: clean(payload.name || existing?.name || `${artist?.name || artistId} Nexus Store`, '', 180),
    slug: slug(payload.slug || existing?.slug || payload.name || artist?.name || artistId, artistId),
    bio: clean(payload.bio || existing?.bio || '', '', 1600),
    status: normalizeStatus(payload.status || existing?.status || 'active'),
    feeMode: normalizeFeeMode(payload.feeMode || existing?.feeMode),
    storefrontPlan: normalizeStorefrontPlan(payload.storefrontPlan || payload.planId || existing?.storefrontPlan || existing?.planId),
    fulfillmentEmail: clean(payload.fulfillmentEmail || existing?.fulfillmentEmail || artist?.email || '', '', 180).toLowerCase(),
    supportUrl: clean(payload.supportUrl || existing?.supportUrl || '', '', 800),
    links: normalizeLinks(payload.links || existing?.links),
    skyeCommerceMerchantId: clean(payload.skyeCommerceMerchantId || payload.skyecommerceMerchantId || existing?.skyeCommerceMerchantId || '', '', 120),
    skyeCommerceStorefrontUrl: clean(payload.skyeCommerceStorefrontUrl || payload.storefrontUrl || existing?.skyeCommerceStorefrontUrl || '', '', 1000),
    skyeCommerceStoreSlug: clean(payload.skyeCommerceStoreSlug || payload.storefrontSlug || existing?.skyeCommerceStoreSlug || '', '', 120),
    skyeCommerceAttachedAt: payload.skyeCommerceMerchantId || payload.skyecommerceMerchantId || payload.skyeCommerceStorefrontUrl || payload.storefrontUrl ? nowIso() : existing?.skyeCommerceAttachedAt || '',
    payoutPolicy: clean(payload.payoutPolicy || existing?.payoutPolicy || 'Biweekly owner-approved payout review after refunds, disputes, paperwork holds, and rights holds.', '', 500),
    updatedAt: nowIso(),
    createdAt: existing?.createdAt || nowIso(),
  };
  const index = commerce.stores.findIndex((item) => item.storeId === store.storeId || item.artistId === artistId);
  if (index >= 0) commerce.stores[index] = store;
  else commerce.stores.unshift(store);
  saveCommerce(commerce);
  return respond(existing ? 200 : 201, { ok: true, store: publicStore(store, commerce.products, commerce.orders) });
}

function handleAttachSkyeCommerce(payload) {
  const artistId = clean(payload.artistId, '', 120);
  if (!artistId) return respond(400, { ok: false, error: 'artistId is required.' });
  return handleUpsertStore({
    ...payload,
    action: 'upsert-store',
    status: payload.status || 'active',
    skyeCommerceMerchantId: payload.skyeCommerceMerchantId || payload.merchantId,
    skyeCommerceStorefrontUrl: payload.skyeCommerceStorefrontUrl || payload.storefrontUrl,
    skyeCommerceStoreSlug: payload.skyeCommerceStoreSlug || payload.storefrontSlug,
  });
}

function handleCreateProduct(payload) {
  const artistId = clean(payload.artistId, '', 120);
  const title = clean(payload.title, '', 220);
  if (!artistId || !title) return respond(400, { ok: false, error: 'artistId and title are required.' });
  const commerce = loadCommerce();
  let store = commerce.stores.find((item) => item.artistId === artistId);
  if (!store) {
    const storeResponse = JSON.parse(handleUpsertStore({ artistId, artistName: payload.artistName }).body);
    commerce.stores = loadCommerce().stores;
    store = storeResponse.store;
  }
  const productId = clean(payload.productId || payload.id || makeId('prod'), '', 120);
  const limits = storefrontLimits(store.storefrontPlan || store.planId);
  const activeProducts = commerce.products.filter((item) => item.artistId === artistId && item.status === 'active' && item.productId !== productId && item.id !== productId).length;
  const nextStatus = normalizeStatus(payload.status || 'active');
  if (nextStatus === 'active' && activeProducts >= limits.maxProducts) {
    return respond(402, { ok: false, error: `Storefront plan limit reached: ${limits.label} allows ${limits.maxProducts} active product(s).`, code: 'STOREFRONT_PRODUCT_LIMIT_REACHED', limits });
  }
  const product = {
    productId,
    id: productId,
    storeId: store.storeId,
    artistId,
    releaseId: clean(payload.releaseId, '', 120),
    dropId: clean(payload.dropId, '', 120),
    title,
    description: clean(payload.description || '', '', 1400),
    productType: normalizeProductType(payload.productType || payload.type),
    priceCents: cents(payload.priceCents || payload.amountCents),
    currency: clean(payload.currency || 'USD', 'USD', 8).toUpperCase(),
    inventory: payload.inventory === '' || payload.inventory == null ? null : Math.max(0, Number(payload.inventory) || 0),
    imageUrl: clean(payload.imageUrl || payload.coverArtUrl || '', '', 800),
    fulfillmentType: clean(payload.fulfillmentType || 'manual', 'manual', 80),
    status: nextStatus,
    assetId: clean(payload.assetId || payload.asset_id || '', '', 160),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  commerce.products = commerce.products.filter((item) => item.productId !== productId && item.id !== productId);
  commerce.products.unshift(product);
  saveCommerce(commerce);
  return respond(201, { ok: true, product, store: publicStore(store, commerce.products, commerce.orders) });
}

function handleUpdateProduct(payload) {
  const productId = clean(payload.productId || payload.id, '', 120);
  if (!productId) return respond(400, { ok: false, error: 'productId is required.' });
  const commerce = loadCommerce();
  const product = byId(commerce.products, productId, ['productId', 'id']);
  if (!product) return respond(404, { ok: false, error: 'Product not found.' });
  Object.assign(product, {
    title: payload.title !== undefined ? clean(payload.title, product.title, 220) : product.title,
    description: payload.description !== undefined ? clean(payload.description, '', 1400) : product.description,
    priceCents: payload.priceCents !== undefined || payload.amountCents !== undefined ? cents(payload.priceCents || payload.amountCents) : product.priceCents,
    inventory: payload.inventory !== undefined ? (payload.inventory === '' || payload.inventory == null ? null : Math.max(0, Number(payload.inventory) || 0)) : product.inventory,
    imageUrl: payload.imageUrl !== undefined ? clean(payload.imageUrl, '', 800) : product.imageUrl,
    status: payload.status !== undefined ? normalizeStatus(payload.status, product.status) : product.status,
    updatedAt: nowIso(),
  });
  saveCommerce(commerce);
  return respond(200, { ok: true, product });
}

function handleRecordOrder(payload) {
  const commerce = loadCommerce();
  const productId = clean(payload.productId || payload.id, '', 120);
  const product = byId(commerce.products, productId, ['productId', 'id']);
  if (!product) return respond(404, { ok: false, error: 'Product not found.' });
  const quantity = Math.max(1, Math.min(100, Number(payload.quantity || 1) || 1));
  const store = commerce.stores.find((item) => item.storeId === product.storeId || item.artistId === product.artistId) || {};
  const limits = storefrontLimits(store.storefrontPlan || store.planId);
  const currentMonth = nowIso().slice(0, 7);
  const monthlyOrders = commerce.orders.filter((item) => item.artistId === product.artistId && orderMonth(item) === currentMonth).length;
  if (monthlyOrders >= limits.monthlyOrderIntents) {
    return respond(402, { ok: false, error: `Storefront plan limit reached: ${limits.label} allows ${limits.monthlyOrderIntents} order intent(s) per month.`, code: 'STOREFRONT_ORDER_LIMIT_REACHED', limits });
  }
  const feeMode = normalizeFeeMode(payload.feeMode || store.feeMode);
  const subtotalCents = cents(product.priceCents) * quantity;
  const platformFeeCents = Math.round(subtotalCents * PLATFORM_FEE_BPS / 10000);
  const totalCents = feeMode === 'buyer_covered' ? subtotalCents + platformFeeCents : subtotalCents;
  const artistNetCents = feeMode === 'buyer_covered' ? subtotalCents : Math.max(0, subtotalCents - platformFeeCents);
  const order = {
    orderId: clean(payload.orderId || makeId('order'), '', 120),
    artistId: product.artistId,
    storeId: product.storeId,
    productId: product.productId,
    title: product.title,
    quantity,
    currency: product.currency || 'USD',
    subtotalCents,
    platformFeeBps: PLATFORM_FEE_BPS,
    platformFeeCents,
    totalCents,
    artistNetCents,
    feeMode,
    buyerEmail: clean(payload.buyerEmail || '', '', 180).toLowerCase(),
    fanNote: clean(payload.fanNote || payload.note || '', '', 800),
    status: normalizeStatus(payload.status || 'pending_skyepay_checkout'),
    fulfillmentStatus: 'not_started',
    metadata: {
      source: 'SkyeMusicNexus Nexus Store',
      artistId: product.artistId,
      storeId: product.storeId,
      productId: product.productId,
      releaseId: product.releaseId || '',
      dropId: product.dropId || '',
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  order.checkoutIntent = {
    provider: 'skypay',
    providerRequiredForMoneyMovement: true,
    url: checkoutUrl(order),
    metadata: order.metadata,
  };
  commerce.orders.unshift(order);
  saveCommerce(commerce);
  return respond(201, { ok: true, order, checkoutIntent: order.checkoutIntent });
}

function handleFulfillOrder(payload) {
  const commerce = loadCommerce();
  const orderId = clean(payload.orderId || payload.id, '', 120);
  const order = byId(commerce.orders, orderId, ['orderId', 'id']);
  if (!order) return respond(404, { ok: false, error: 'Order not found.' });
  if (!paidOrderStatus(order)) return respond(402, { ok: false, code: 'SKYEPAY_REQUIRED_BEFORE_FULFILLMENT', error: 'Order fulfillment and asset delivery require confirmed SkyPay payment first.' });
  const fulfillment = {
    fulfillmentId: makeId('fulfill'),
    orderId,
    artistId: order.artistId,
    status: normalizeStatus(payload.status || 'fulfilled'),
    note: clean(payload.note || '', '', 1000),
    trackingUrl: clean(payload.trackingUrl || '', '', 800),
    createdAt: nowIso(),
  };
  order.status = fulfillment.status === 'fulfilled' ? 'fulfilled' : order.status;
  order.fulfillmentStatus = fulfillment.status;
  order.updatedAt = fulfillment.createdAt;
  commerce.fulfillments.unshift(fulfillment);
  saveCommerce(commerce);
  return respond(200, { ok: true, order, fulfillment });
}

function paidOrderStatus(order = {}) {
  const status = clean(order.status || '', '', 80).toLowerCase();
  const paymentStatus = clean(order.paymentStatus || order.payment_status || '', '', 80).toLowerCase();
  return ['paid', 'succeeded', 'confirmed', 'fulfilled', 'paid_pending_fulfillment'].includes(status) || ['paid', 'succeeded', 'confirmed'].includes(paymentStatus);
}

function handleConfirmSkyPayOrder(payload) {
  const commerce = loadCommerce();
  const orderId = clean(payload.orderId || payload.id, '', 120);
  const order = byId(commerce.orders, orderId, ['orderId', 'id']);
  if (!order) return respond(404, { ok: false, error: 'Order not found.' });
  const paymentStatus = clean(payload.paymentStatus || 'paid', 'paid', 80).toLowerCase();
  if (!['paid', 'succeeded', 'confirmed'].includes(paymentStatus)) return respond(402, { ok: false, code: 'SKYEPAY_PAYMENT_NOT_CONFIRMED', error: 'SkyPay confirmation must be paid, succeeded, or confirmed before download entitlement opens.' });
  order.paymentStatus = paymentStatus === 'succeeded' ? 'paid' : paymentStatus;
  order.status = 'paid_pending_fulfillment';
  order.skyepayOrderId = clean(payload.skyepayOrderId || payload.providerReference || payload.reference || '', '', 160);
  order.paidAt = nowIso();
  order.updatedAt = order.paidAt;
  saveCommerce(commerce);
  return respond(200, { ok: true, order, entitlement: { type: 'asset_download', status: 'active_after_skypay', buyerEmail: order.buyerEmail || '', productId: order.productId || '' } });
}

module.exports.handler = async (event) => {
  try {
    const denied = requireSkyGate(event);
    if (denied) return denied;
    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};
    if (method === 'GET') {
      const action = clean(params.action || 'hub', 'hub', 80);
      if (action === 'hub' || action === 'list') return handleHub(params);
      if (action === 'analytics') return handleAnalytics(params);
      return respond(400, { ok: false, error: `Unknown GET action: ${action}` });
    }
    if (method === 'POST' || method === 'PUT') {
      const payload = parseBody(event);
      if (payload === null) return respond(400, { ok: false, error: 'Invalid JSON body.' });
      const action = clean(payload.action || params.action, '', 80);
      if (action === 'upsert-store') return handleUpsertStore(payload);
      if (action === 'attach-skyecommerce-storefront') return handleAttachSkyeCommerce(payload);
      if (action === 'create-product') return handleCreateProduct(payload);
      if (action === 'update-product') return handleUpdateProduct(payload);
      if (action === 'record-order') return handleRecordOrder(payload);
      if (action === 'confirm-skypay-order' || action === 'record-skypay-confirmation') return handleConfirmSkyPayOrder(payload);
      if (action === 'fulfill-order') return handleFulfillOrder(payload);
      if (action === 'publish-skynet-storefront') return handlePublishSkyeNet(payload);
      return respond(400, { ok: false, error: `Unknown POST action: ${action}` });
    }
    return respond(405, { ok: false, error: 'Method not allowed.' });
  } catch (err) {
    return respond(err.statusCode || 500, { ok: false, error: err.message || 'Internal server error.' });
  }
};
