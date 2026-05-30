const DEFAULT_JURISDICTION = 'US-AZ';
const CATEGORY = 'website-digital-commerce';
const SOVEREIGNDOCS_ROOT = '/Free99/apps/sovereigndocs';
const SKYEDOCXMAX_EDITOR = '/Marketing-Made-Easy/SkyeDocxMax/editor.html';

export const SOVEREIGNDOCS_COMMERCE_TEMPLATES = Object.freeze([
  {
    slug: 'website-terms-of-use',
    title: 'Website Terms of Use',
    risk: 'high',
    use: 'Core terms for the public store, account behavior, IP boundaries, and acceptable usage.'
  },
  {
    slug: 'privacy-policy-basic',
    title: 'Privacy Policy Basic',
    risk: 'high',
    use: 'Starter privacy disclosure draft for customer accounts, checkout data, analytics, and contact forms.'
  },
  {
    slug: 'refund-policy',
    title: 'Refund Policy',
    risk: 'medium',
    use: 'Refund windows, return eligibility, exceptions, inspection language, and support handoff.'
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    risk: 'medium',
    use: 'Carrier timing, fulfillment estimates, tracking, delays, lost packages, and address correction language.'
  },
  {
    slug: 'marketplace-seller-agreement',
    title: 'Marketplace Seller Agreement',
    risk: 'high',
    use: 'Seller duties, product listing rules, payout handling, disputes, chargebacks, and platform boundaries.'
  },
  {
    slug: 'subscription-cancellation-policy',
    title: 'Subscription Cancellation Policy',
    risk: 'medium',
    use: 'Recurring product, membership, or subscription cancellation and renewal language.'
  },
  {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    risk: 'medium',
    use: 'Cookie, pixel, analytics, and preference notice draft for commerce storefronts.'
  },
  {
    slug: 'accessibility-statement',
    title: 'Accessibility Statement',
    risk: 'medium',
    use: 'Accessibility commitment, contact path, remediation posture, and known-boundary disclosure.'
  },
  {
    slug: 'acceptable-use-policy',
    title: 'Acceptable Use Policy',
    risk: 'medium',
    use: 'Rules for customer accounts, store comments, reviews, marketplace sellers, and abuse prevention.'
  },
  {
    slug: 'digital-product-license',
    title: 'Digital Product License',
    risk: 'medium',
    use: 'Download, template, media, course, beat, or digital file license scope and restrictions.'
  },
  {
    slug: 'creator-platform-terms',
    title: 'Creator Platform Terms',
    risk: 'high',
    use: 'Creator, artist, influencer, affiliate, or seller platform participation terms.'
  },
  {
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    risk: 'medium',
    use: 'Review, comment, creator, buyer, and seller behavior rules for storefront communities.'
  }
]);

function cleanSegment(value = '') {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const text = String(value || '').trim();
    if (text) query.set(key, text);
  });
  const out = query.toString();
  return out ? `?${out}` : '';
}

export function sovereignDocsCommerceTemplateUrl(slug, {
  jurisdiction = DEFAULT_JURISDICTION,
  storeSlug = '',
  merchantId = '',
  source = 'skyecommerce'
} = {}) {
  const state = cleanSegment(jurisdiction) || DEFAULT_JURISDICTION;
  const template = cleanSegment(slug);
  const query = buildQuery({ source, storeSlug, merchantId });
  return `${SOVEREIGNDOCS_ROOT}/build/${state}/${CATEGORY}/${template}/${query}`;
}

export function sovereignDocsSkyeDocxMaxUrl({
  templateSlug = '',
  jurisdiction = DEFAULT_JURISDICTION,
  storeSlug = '',
  merchantId = '',
  returnTo = '/SkyeCommerce/docs/'
} = {}) {
  const query = new URLSearchParams({
    source: 'skyecommerce',
    ws_id: 'skyecommerce',
    returnTo
  });
  if (templateSlug) query.set('templatePath', `${cleanSegment(jurisdiction) || DEFAULT_JURISDICTION}/${CATEGORY}/${cleanSegment(templateSlug)}/`);
  if (storeSlug) query.set('storeSlug', cleanSegment(storeSlug));
  if (merchantId) query.set('merchantId', cleanSegment(merchantId));
  return `${SKYEDOCXMAX_EDITOR}?${query.toString()}`;
}

export function buildSovereignDocsCommerceKit({
  jurisdiction = DEFAULT_JURISDICTION,
  storeSlug = '',
  merchantId = '',
  returnTo = '/SkyeCommerce/docs/'
} = {}) {
  const templates = SOVEREIGNDOCS_COMMERCE_TEMPLATES.map((template) => ({
    ...template,
    category: CATEGORY,
    jurisdiction: cleanSegment(jurisdiction) || DEFAULT_JURISDICTION,
    sovereignDocsUrl: sovereignDocsCommerceTemplateUrl(template.slug, { jurisdiction, storeSlug, merchantId }),
    skyeDocxMaxUrl: sovereignDocsSkyeDocxMaxUrl({ templateSlug: template.slug, jurisdiction, storeSlug, merchantId, returnTo })
  }));
  return {
    ok: true,
    lane: 'shared_0s_sovereigndocs',
    category: CATEGORY,
    jurisdiction: cleanSegment(jurisdiction) || DEFAULT_JURISDICTION,
    storeSlug: cleanSegment(storeSlug),
    merchantId: cleanSegment(merchantId),
    sovereignDocsRoot: `${SOVEREIGNDOCS_ROOT}/`,
    categoryUrl: `${SOVEREIGNDOCS_ROOT}/categories/${CATEGORY}/?source=skyecommerce`,
    skyeDocxMaxUrl: sovereignDocsSkyeDocxMaxUrl({ jurisdiction, storeSlug, merchantId, returnTo }),
    boundary: 'SovereignDocs is self-help document automation and SkyeDocxMax editing/export support. It is not a law firm, does not provide legal advice, and does not create attorney-client relationships.',
    templates
  };
}
