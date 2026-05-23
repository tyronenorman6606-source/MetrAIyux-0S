let KB = [];
let SURFACE_REGISTRY = null;
let PERSONA_REGISTRY = null;
let SITE_OPERATOR = null;
let LEGAL_DATA = null;
let SALES_OFFERS = null;
let SKYEVAULT_MAP = null;
let SKYERUNNERS_MAP = null;

const TOTAL_BRAINS = 16;
const BRAIN_ID_ALIASES = {
  'site-operator-autonomous-business-brain': 'site-operator-brain',
  'main-automation-brain': 'site-operator-brain',
  'central-command-brain': 'central-company-command-brain',
  '0meg4kai-brain': '0meg4kai-security-brain',
  'omegakai-security-brain': '0meg4kai-security-brain'
};

const stopwords = new Set('a an and are as at be by for from has have i in into is it its of on or our that the their this to with we what when where who why how which should about across all can does do if so than then there they through use using within without need needs needed want wants wanted give gives gave make makes made tell tells told ask asks asked'.split(' '));
const shortTerms = new Set(['ae', 'qa', 'hr', 'ai', 'os', '0s']);

const localRouteRules = [
  {
    intent: 'security_auth_gate',
    route_to: '0meg4kai-security-brain',
    secondary: 'orion-hayes-brain',
    create_task: 'Gate, token, tenant-isolation, admin-secret, or customer-side security review',
    triggers: ['auth', 'token', 'bearer', 'session', 'skygate', 'fs27', 'gate', 'introspect', 'mirror secret', 'platform events', 'tenant', 'admin key', 'secret', 'customer isolation', 'security']
  },
  {
    intent: 'skyevault_git_infra',
    route_to: 'orion-hayes-brain',
    secondary: '0meg4kai-security-brain',
    create_task: 'Treat SkyeVault as the Git/storage engine, Gate as the authority layer, and 0S as the neural-map operating layer',
    triggers: ['skyevault git', 'git remote', 'git clone', 'git push', 'git fetch', 'repo vault', 'bundle export', 'restore repo', 'git diff', 'branch protection', 'vault neural map', 'workspace brain map']
  },
  {
    intent: 'brain_count_or_runtime',
    route_to: 'site-operator-brain',
    secondary: 'central-company-command-brain',
    create_task: 'Explain the 17-brain runtime and route the question to the right owner',
    triggers: ['how many brains', 'brain count', '17 brains', 'cabinet brains', 'person brains', 'runtime', 'router', 'who owns', 'which brain']
  },
  {
    intent: 'client_review_or_feedback',
    route_to: 'adrian-cross-brain',
    secondary: 'victor-saint-brain',
    create_task: 'Send the client to the live review intake, capture consent/proof notes, and hold publication for 0S QA plus the five-review batch rule',
    triggers: ['review', 'reviews', 'testimonial', 'testimonials', 'feedback', 'customer experience', 'client experience', 'leave a review', 'submit review', 'write testimonial', 'talk about experience']
  },
  {
    intent: 'contact_service_request',
    route_to: 'celeste-monroe-brain',
    secondary: 'adrian-cross-brain',
    create_task: 'Send the person to the FS27-owned request-service intake so the 0S can triage privately with email as backup only',
    triggers: ['contact', 'request service', 'service request', 'start project', 'need help', 'talk to admin', 'private request', 'get in touch', 'inquiry']
  },
  {
    intent: 'review_wall_sales_proof',
    route_to: 'celeste-monroe-brain',
    secondary: 'valentina-reyes-brain',
    create_task: 'Send proof-seeking buyers to the Skyes Over London Reviews Proof Wall and keep the framing proof-safe',
    triggers: ['proof wall', 'review wall', 'client proof', 'customer proof', 'social proof', 'what do clients say', 'show reviews', 'see testimonials']
  },
  {
    intent: 'buyer_sales_proof',
    route_to: 'celeste-monroe-brain',
    secondary: 'gray-london-skyes-brain',
    create_task: 'Qualify the buyer, choose the proof surface, and frame the deployment without exposing private admin setup',
    triggers: ['buyer', 'prospect', 'lead', 'sell', 'sales', 'ae', 'discovery', 'close', 'proposal', 'proof router', 'live proof', 'website', 'command deck', 'white label', 'client deployment']
  },
  {
    intent: 'artist_universe_builder',
    route_to: 'orion-hayes-brain',
    secondary: 'valentina-reyes-brain',
    create_task: 'Invoke the Artist Universe Builder Agent: unpack the artist reference, mine real assets and links, run MCP tooling, build a new artist-specific universe, serve locally, proof, and deploy through FS27 SkyeNet when approved',
    triggers: ['artist website', 'artist build', 'music artist', 'rapper site', 'singer site', 'band site', 'artist universe', 'rebuild artist zip', 'polished artist build', 'merser3.1 artist', 'skrucible artist', 'music landing page', 'release site', 'album rollout', 'artist press kit', 'booking site', 'supaboy style build', 'skynet artist build']
  },
  {
    intent: 'pricing_subscription',
    route_to: 'naomi-sterling-brain',
    secondary: 'celeste-monroe-brain',
    create_task: 'Price from the offer registry, protect margin, and prepare the Stripe/subscription path',
    triggers: ['price', 'pricing', 'stripe', 'subscription', 'invoice', 'billing', 'margin', 'retainer', 'monthly', 'quote', 'package', 'cost']
  },
  {
    intent: 'government_enterprise',
    route_to: 'donovan-pierce-brain',
    secondary: 'julian-mercer-brain',
    create_task: 'Government or enterprise readiness review with claims checked before anything public is promised',
    triggers: ['government', 'enterprise', 'contracting', 'procurement', 'sam', 'naics', 'capability statement', 'bid', 'rfp', 'vendor registration']
  },
  {
    intent: 'public_content_brand',
    route_to: 'valentina-reyes-brain',
    secondary: 'victor-saint-brain',
    create_task: 'Public copy, brand, SEO, and proof-safe claim review',
    triggers: ['copy', 'public', 'brand', 'marketing', 'seo', 'content', 'homepage', 'spectacle', 'human facing', 'ai wrote', 'messaging']
  },
  {
    intent: 'technical_deploy_site',
    route_to: 'orion-hayes-brain',
    secondary: 'site-operator-brain',
    create_task: 'Technical deployment, Worker, dashboard, API, site, or automation review',
    triggers: ['deploy', 'cloudflare', 'worker', 'd1', 'kv', 'queue', 'durable', 'api', 'dashboard', 'automation', 'site', 'browser', 'production']
  },
  {
    intent: 'quality_proof_audit',
    route_to: 'victor-saint-brain',
    secondary: 'marcus-vale-brain',
    create_task: 'QA, proof receipt, link audit, or claim-evidence review',
    triggers: ['proof', 'qa', 'audit', 'test', 'receipt', 'evidence', 'claim', 'broken', 'overlap', 'dimension', 'screenshot']
  },
  {
    intent: 'founder_strategy',
    route_to: 'gray-london-skyes-brain',
    secondary: 'central-company-command-brain',
    create_task: 'Founder doctrine, ecosystem architecture, sovereign infrastructure, or strategic positioning review',
    triggers: ['gray', 'founder', 'skyes', 'sovereign', 'infrastructure', 'doctrine', 'ecosystem', 'architecture', 'operator', 'skyes over london']
  }
];

function flattenValue(value) {
  if (Array.isArray(value)) return value.map(flattenValue).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(flattenValue).join(' ');
  return value == null ? '' : String(value);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&/-]/g, ' ')
    .split(/\s+/)
    .filter(w => (w.length > 2 || shortTerms.has(w)) && !stopwords.has(w));
}

function hasAny(text, terms) {
  const hay = (text || '').toLowerCase();
  return terms.some(term => hay.includes(term));
}

function scoreText(query, haystack) {
  const q = tokenize(query);
  const hay = (haystack || '').toLowerCase();
  let score = 0;
  const used = new Set();
  q.forEach(term => {
    if (hay.includes(term)) {
      score += used.has(term) ? 0 : 3;
      used.add(term);
    }
  });
  [
    'gray london skyes',
    '0meg4kai',
    'skygate',
    'fs27',
    'auth introspect',
    'platform events',
    'mirror secret',
    'government contracting',
    'account executive',
    'ae',
    'sales',
    'client success',
    'compliance',
    'staffing',
    'technology',
    'founder',
    'legal',
    'resume',
    'cabinet',
    'proof surface',
    'live surface',
    'white label',
    'client website',
    'command deck',
    'sovereign infrastructure',
    'pricing',
    'stripe',
    'subscription',
    'marketplace',
    'vault',
    'skye vault',
    'campaign',
    'brain campaign',
    'ecosystem portal',
    'product hub',
    'empire',
    'embed',
    'upload',
    'source tag',
    'review wall',
    'leave a review',
    'submit review',
    'customer experience',
    'client feedback',
    'social proof'
  ].forEach(phrase => {
    if ((query || '').toLowerCase().includes(phrase) && hay.includes(phrase)) score += 7;
  });
  return score;
}

function scoreChunk(query, chunk) {
  return scoreText(query, `${chunk.title || ''} ${chunk.heading || ''} ${chunk.text || ''} ${chunk.source || ''}`);
}

function retrieve(query, limit = 8) {
  return KB
    .map(c => ({ ...c, score: scoreChunk(query, c) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function normalizeBrainId(id) {
  const key = String(id || '').trim();
  return BRAIN_ID_ALIASES[key] || key;
}

function profiles() {
  return PERSONA_REGISTRY?.profiles || [];
}

function profileById(id) {
  const normalized = normalizeBrainId(id);
  return profiles().find(p => p.id === normalized) || profiles().find(p => p.id === 'central-company-command-brain') || null;
}

function ownerName(profile) {
  if (!profile) return 'Central Company Command';
  return profile.owner || (profile.name || 'Central Company Command').replace(/\s+Brain$/i, '');
}

function profileHay(profile) {
  return [
    profile?.id,
    profile?.name,
    profile?.owner,
    profile?.title,
    profile?.cabinet,
    profile?.role,
    profile?.purpose,
    flattenValue(profile?.scope),
    flattenValue(profile?.scope_keywords),
    flattenValue(profile?.can_answer),
    flattenValue(profile?.guardrails),
    flattenValue(profile?.must_not_claim)
  ].filter(Boolean).join(' ');
}

function scopeSummary(profile) {
  const parts = [
    profile?.role,
    profile?.purpose,
    ...(profile?.can_answer || []),
    ...(profile?.scope || []),
    ...(profile?.scope_keywords || [])
  ].filter(Boolean);
  return parts.slice(0, 3).join('; ') || 'routing the request to the correct cabinet lane and producing a usable next action';
}

function scoreProfile(query, profile) {
  let score = scoreText(query, profileHay(profile));
  const q = (query || '').toLowerCase();
  if (profile?.name && q.includes(profile.name.toLowerCase().replace(/\s+brain$/i, ''))) score += 18;
  if (profile?.owner && q.includes(profile.owner.toLowerCase())) score += 18;
  if (profile?.cabinet && q.includes(profile.cabinet.toLowerCase().replace(/&amp;/g, '&'))) score += 12;
  return score;
}

function routeHay(route) {
  const primary = profileById(route.route_to);
  const secondary = profileById(route.secondary);
  return [
    route.intent,
    route.create_task,
    flattenValue(route.triggers),
    profileHay(primary),
    profileHay(secondary)
  ].join(' ');
}

function routePool() {
  return [...(SITE_OPERATOR?.routes || []), ...localRouteRules];
}

function chooseRoute(query) {
  const q = (query || '').toLowerCase();
  if (hasAny(q, ['buyer', 'prospect', 'lead', 'ae', 'sales']) && hasAny(q, ['auth', 'proof', 'gate', 'skygate', 'fs27', 'trust', 'more than a website'])) {
    return {
      intent: 'buyer_auth_proof_demo',
      primary: profileById('celeste-monroe-brain'),
      secondary: profileById('0meg4kai-security-brain'),
      createTask: 'Qualify the buyer, send the proof surface, and have 0meg4kAI check gate/security language',
      score: 99
    };
  }
  if (hasAny(q, ['how many brains', 'brain count', 'total brains', '17 brains', 'cabinet brains'])) {
    return {
      intent: 'brain_count_or_runtime',
      primary: profileById('site-operator-brain'),
      secondary: profileById('central-company-command-brain'),
      createTask: 'Explain the 17-brain runtime accurately',
      score: 99
    };
  }
  if (hasAny(q, ['leave a review', 'submit review', 'write testimonial', 'send testimonial', 'give feedback', 'customer feedback', 'client feedback', 'talk about their experience', 'talk about our experience', 'share experience'])) {
    return {
      intent: 'client_review_or_feedback',
      primary: profileById('adrian-cross-brain'),
      secondary: profileById('victor-saint-brain'),
      createTask: 'Send the customer to the live review intake and queue 0S QA before public proof-wall publication',
      score: 99
    };
  }
  if (hasAny(q, ['contact', 'request service', 'service request', 'start project', 'need help', 'talk to admin', 'private request', 'get in touch', 'inquiry'])) {
    return {
      intent: 'contact_service_request',
      primary: profileById('celeste-monroe-brain'),
      secondary: profileById('adrian-cross-brain'),
      createTask: 'Send the request to the FS27-owned service intake and keep follow-up private in admin triage',
      score: 99
    };
  }
  if (hasAny(q, ['proof wall', 'review wall', 'testimonials', 'client proof', 'customer proof', 'social proof', 'what do clients say', 'show reviews'])) {
    return {
      intent: 'review_wall_sales_proof',
      primary: profileById('celeste-monroe-brain'),
      secondary: profileById('valentina-reyes-brain'),
      createTask: 'Route the buyer to the public reviews proof wall and keep the claims proof-safe',
      score: 99
    };
  }
  const routeCandidates = routePool().map(route => {
    let score = scoreText(query, routeHay(route));
    (route.triggers || []).forEach(trigger => {
      if (q.includes(trigger.toLowerCase())) score += trigger.includes(' ') ? 18 : 10;
    });
    return { ...route, score };
  }).sort((a, b) => b.score - a.score);

  const profileCandidates = profiles()
    .map(profile => ({ profile, score: scoreProfile(query, profile) }))
    .sort((a, b) => b.score - a.score);

  const bestRoute = routeCandidates[0];
  const bestProfile = profileCandidates[0];

  if (bestRoute && bestRoute.score >= Math.max(8, (bestProfile?.score || 0) - 2)) {
    return {
      intent: bestRoute.intent || 'site_route',
      primary: profileById(bestRoute.route_to),
      secondary: profileById(bestRoute.secondary),
      createTask: bestRoute.create_task || 'Route the request and produce a usable next action',
      score: bestRoute.score
    };
  }

  if (bestProfile && bestProfile.score > 0) {
    const central = profileById('central-company-command-brain');
    const site = profileById('site-operator-brain');
    return {
      intent: 'profile_match',
      primary: bestProfile.profile,
      secondary: bestProfile.profile.id === central?.id ? site : central,
      createTask: 'Answer from the selected cabinet lane and flag any cross-cabinet handoff',
      score: bestProfile.score
    };
  }

  return {
    intent: 'general_routing',
    primary: profileById('site-operator-brain') || profileById('central-company-command-brain'),
    secondary: profileById('central-company-command-brain'),
    createTask: 'Clarify the request, route it to the right owner, and attach proof or guardrails',
    score: 0
  };
}

function surfaceMatches(query, route, limit = 4) {
  const surfaces = SURFACE_REGISTRY?.surfaces || [];
  const primaryId = route?.primary?.id;
  const secondaryId = route?.secondary?.id;
  return surfaces
    .map(surface => {
      const hay = [
        surface.id,
        surface.name,
        surface.url,
        surface.audience,
        surface.privacy,
        surface.purpose,
        surface.sales_use,
        flattenValue(surface.route_when),
        surface.primary_brain,
        surface.secondary_brain
      ].join(' ');
      let score = scoreText(query, hay);
      if (normalizeBrainId(surface.primary_brain) === primaryId) score += 8;
      if (normalizeBrainId(surface.secondary_brain) === secondaryId) score += 4;
      return { ...surface, score };
    })
    .filter(surface => surface.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function smartDirectAnswer(query, route, surfaces) {
  const q = (query || '').toLowerCase();
  const primary = route.primary;
  const secondary = route.secondary;
  const primaryOwner = ownerName(primary);
  const secondaryOwner = ownerName(secondary);
  const firstSurface = surfaces[0];

  if (hasAny(q, ['how many brains', 'brain count', 'total brains', '17 brains', 'cabinet brains'])) {
    return `There are ${TOTAL_BRAINS} operating brains in this runtime: Site Operator, 0meg4kAI, Central Company Command, and 13 cabinet executive brains. Site Operator handles routing, 0meg4kAI handles gate/security/tenant review, Central Command handles cross-company questions, and the cabinet brains own their functional lanes.`;
  }

  if (hasAny(q, ['leave a review', 'submit review', 'write testimonial', 'send testimonial', 'give feedback', 'customer feedback', 'client feedback', 'talk about their experience', 'talk about our experience', 'share experience'])) {
    return `${primaryOwner} owns the client-success side of this, with ${secondaryOwner} checking publication safety. Send the customer to the live review intake at https://skyes-over-london-reviews.pages.dev/submit-review.html. Tell them their submission goes to 0S QA first; it does not become public until consent and claims are checked, five approved unpublished reviews are batched, and the proof wall is pushed to production.`;
  }

  if (hasAny(q, ['contact', 'request service', 'service request', 'start project', 'need help', 'talk to admin', 'private request', 'get in touch', 'inquiry'])) {
    return `${primaryOwner} owns the intake conversation, with ${secondaryOwner} watching the client-success handoff. Send the person to https://skyes-over-london-reviews.pages.dev/request-service.html. That page posts to FS27 contact intake first, keeps the record private for admin triage, sends Resend/Gmail as backup notification, and only uses mailto:skyesoverlondon@gmail.com if the owned intake lane is unavailable.`;
  }

  if (hasAny(q, ['proof wall', 'review wall', 'testimonials', 'client proof', 'customer proof', 'social proof', 'what do clients say', 'show reviews'])) {
    return `${primaryOwner} owns the buyer conversation, with ${secondaryOwner} keeping the public framing clean. Send proof-seeking prospects to the Skyes Over London Reviews Proof Wall at https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded.html. Use it when they ask for reviews, testimonials, client experience, or social proof, and avoid inventing client names, outcomes, or approval status.`;
  }

  if (hasAny(q, ['houseoperations', 'house operations', 'house ops', 'owner alerts', 'vendor pressure', 'skye box', 'skyebox', 'authenticator vault', 'totp', '2fa vault'])) {
    return `${primaryOwner} owns the operations answer, with ${secondaryOwner} checking the security boundary. Route the user to /live/houseoperations-skyebox-operator-proof.html for the 0S expansion hub. HouseOperations proves task, vendor, schedule, assignment, alert, proof-save, and export workflows. SkyeBox proves a private encrypted TOTP vault. Do not claim cloud sync, password recovery, managed secret custody, or enterprise credential compliance without a separate approved scope.`;
  }

  if (hasAny(q, ['buyer', 'prospect', 'lead', 'sell', 'ae', 'sales', 'proof router', 'what link', 'which link', 'client website', 'white label', 'command deck'])) {
    const linkLine = firstSurface ? ` The first surface I would send is ${firstSurface.name}, because ${firstSurface.sales_use || firstSurface.purpose}` : '';
    const proofLine = hasAny(q, ['auth', 'gate', 'skygate', 'fs27', 'proof', 'trust']) ? ` Keep ${secondaryOwner} in the review because the buyer is asking about gate/proof language, not just a pretty demo.` : '';
    return `${primaryOwner} owns the buyer conversation, with ${secondaryOwner} checking the risk/proof lane. The pitch should stay concrete: this is not just a website, it is a public site backed by a protected command deck, auth gate, proof loop, routing layer, and operating rooms the client can actually use.${proofLine}${linkLine}`;
  }

  if (hasAny(q, ['skygate', 'fs27', 'auth', 'token', 'bearer', 'session', 'introspect', 'platform events', 'mirror secret', 'admin key'])) {
    return `Route this through ${primaryOwner}. FS27 is the gate layer: it validates bearer/session state through auth introspection, accepts mirrored platform events through the mirror-secret path, and keeps admin/key surfaces away from public copy. MetrAIyux 0S should consume that gate as proof, identity, and event context, then route the work to the correct cabinet brain.`;
  }

  if (hasAny(q, ['price', 'pricing', 'stripe', 'subscription', 'billing', 'invoice', 'quote', 'package', 'cost', 'retainer'])) {
    return `${primaryOwner} owns the pricing and margin lane, with ${secondaryOwner} packaging it for the buyer. Do not quote phantom prices from old page copy. Use the sales offer registry or Stripe catalog as the source of truth, then review margin, setup scope, monthly management, and any custom client risk before giving a number.`;
  }

  if (hasAny(q, ['government', 'enterprise', 'procurement', 'sam', 'naics', 'capability', 'rfp', 'bid'])) {
    return `${primaryOwner} owns government and enterprise readiness. The AE should say the system can organize capability statements, intake, proof, contracting readiness, and enterprise follow-up, but it must not claim registrations, certifications, insurance, or bid authority until those are verified and reviewed.`;
  }

  if (hasAny(q, ['legal', 'compliance', 'contract', 'terms', 'privacy', 'risk', 'policy', 'license', 'filing'])) {
    return `${primaryOwner} owns the compliance lane. The brain can prepare issue lists, document checklists, claim boundaries, and review packets, but it should not present itself as a lawyer, file documents, or approve regulated claims. Anything binding needs human and professional review.`;
  }

  if (hasAny(q, ['deploy', 'cloudflare', 'worker', 'd1', 'kv', 'queue', 'api', 'dashboard', 'automation', 'production'])) {
    return `${primaryOwner} owns the technical lane. The useful answer should identify the surface, route the change, check auth/proof implications, and only then push to production. ${secondaryOwner} should confirm the operational receipt or routing result.`;
  }

  if (hasAny(q, ['skyevault git', 'git remote', 'git clone', 'git push', 'git fetch', 'repo vault', 'bundle export', 'restore repo', 'git diff', 'branch protection', 'vault neural map', 'workspace brain map'])) {
    const repoCount = SKYEVAULT_MAP?.repo_count ?? 0;
    const receiptCount = SKYEVAULT_MAP?.receipt_count ?? 0;
    const workspaceCount = SKYEVAULT_MAP?.workspace_maps?.length ?? 0;
    return `${primaryOwner} owns the Git/storage implementation, with ${secondaryOwner} checking access and tenant boundaries. The correct architecture is Gate for identity/roles/limits, SkyeVault for Git push/fetch/clone/export/restore, and 0S for the neural map that explains what changed. The current 0S vault map has ${repoCount} repos, ${receiptCount} upload receipts, and ${workspaceCount} separate workspace map files loaded from brain/skyevault-vault-map.json.`;
  }

  if (hasAny(q, ['marketplace', 'product hub', 'product catalog', 'all products', 'full catalog'])) {
    return `The MetrAIyux 0S Marketplace at https://metraiyux-marketing.pages.dev/marketplace.html is the unified product hub. It lists MetrAIyux 0S (17 brains, 17 Workers, $900K+ infrastructure), Skye BCC, SOLEnterprises, Skye Vault, Legal Center, and White-Label deployments. The brain campaign terminal on that page routes sales, marketing, and enterprise deals through the correct cabinet brain.`;
  }

  if (hasAny(q, ['vault', 'upload', 'file drop', 'storage', 'send files', 'client upload'])) {
    return `Skye Vault at https://skyevault-drop.netlify.app is the empire-wide client file drop and storage system. It accepts uploads via drag-drop, supports source routing with ?source= tags, and is embeddable on any site via iframe or the vault-widget.js script. Backend uses Cloudflare R2. ${primaryOwner} handles the vault conversation; for pricing, loop in ${secondaryOwner}.`;
  }

  if (hasAny(q, ['campaign', 'brain campaign', 'run campaign', 'autonomous', 'auto sell', 'ai campaign'])) {
    return `Brain campaigns route sales and marketing tasks autonomously through the 17-brain runtime. Four campaigns are available: MetrAIyux 0S (Celeste Monroe + Valentina Reyes), Skye BCC (Donovan Pierce for enterprise/government), Vault (Celeste Monroe), and White-Label (Julian Mercer + Gray London Skyes). Launch them from the marketplace campaign terminal at https://metraiyux-marketing.pages.dev/marketplace.html.`;
  }

  if (hasAny(q, ['portal', 'ecosystem portal', 'empire hub', 'all sites', 'all properties'])) {
    return `The Ecosystem Portal at https://metraiyux-ecosystem-portal.pages.dev/ links all 7+ empire properties: SOLEnterprises, MetrAIyux 0S, Public Spectacle, Marketing, Skye BCC, Legal Center (Legal Skyes), and Skye Vault. It includes a particle field canvas, property cards, vault upload spotlight, and a full legal policy strip.`;
  }

  return `${primaryOwner} is the primary owner for this question through ${primary?.cabinet || 'the routed cabinet lane'}. ${secondaryOwner} is the secondary check. The practical answer is to keep the request inside that owner lane, use the live proof surface when one matches, and create a receipt or escalation if the answer touches money, legal claims, admin access, client commitments, or public promises.`;
}

function nextSteps(route, surfaces, sources) {
  const primary = ownerName(route.primary);
  const secondary = ownerName(route.secondary);
  const steps = [
    `Let ${primary} own the first-pass answer and task framing.`,
    `Send the result to ${secondary} for a second check if it touches sales, security, client delivery, money, legal/compliance, or public claims.`
  ];
  if (surfaces[0]) steps.push(`Use ${surfaces[0].name} as the proof surface for this conversation.`);
  if (sources[0]) steps.push(`Check ${sources[0].heading || sources[0].title} before turning the answer into public copy or a client promise.`);
  steps.push('Record the decision as a receipt when the work affects production, pricing, client access, or public claims.');
  return steps;
}

function guardrailFor(route) {
  const profile = route.primary;
  const rules = [
    ...(profile?.must_not_claim || []),
    ...(profile?.must_not_do || []),
    ...(profile?.guardrails || [])
  ].filter(Boolean);
  if (rules.length) return rules.slice(0, 2).join(' ');
  return 'Keep private setup, tokens, mirror secrets, admin credentials, and unverified legal or financial claims out of public-facing answers.';
}

function renderLiveSurfaces(surfaces) {
  if (!surfaces.length) return '<p class="notice">No live surface matched strongly. Use the full system demo or ask a narrower buyer/problem question.</p>';
  return `<div class="live-surface-list">${surfaces.map(surface => `
    <a class="live-surface-card" href="${escapeHtml(surface.url)}" target="_blank" rel="noopener">
      <strong>${escapeHtml(surface.name)}</strong>
      <span>${escapeHtml(surface.privacy || 'public')}</span>
      <p>${escapeHtml(surface.sales_use || surface.purpose || 'Open the matched surface.')}</p>
    </a>
  `).join('')}</div>`;
}

function renderSourceChips(sources) {
  if (!sources.length) return '<p class="notice">No document chunks matched strongly, so the route came from the brain registry.</p>';
  return sources.slice(0, 4).map(src => `<span class="brain-pill">${escapeHtml(src.heading || src.title || src.source)}</span>`).join('');
}

function buildAnswer(query, sources) {
  const route = chooseRoute(query);
  const surfaces = surfaceMatches(query, route, 4);
  const directAnswer = smartDirectAnswer(query, route, surfaces);
  const steps = nextSteps(route, surfaces, sources).map(step => `<li>${escapeHtml(step)}</li>`).join('');
  const profileScope = scopeSummary(route.primary);

  return `
    <div class="answer-block serious-answer">
      <div class="route-summary">
        <span class="route-pill">Primary: ${escapeHtml(ownerName(route.primary))}</span>
        <span class="route-pill secondary">Secondary: ${escapeHtml(ownerName(route.secondary))}</span>
        <span class="route-pill">Intent: ${escapeHtml(route.intent)}</span>
      </div>
      <h3>Serious route: ${escapeHtml(route.primary?.name || 'Site Operator Brain')}</h3>
      <p><strong>Owner lane:</strong> ${escapeHtml(route.primary?.cabinet || 'MetrAIyux 0S routing layer')}.</p>
      <p><strong>What this brain owns:</strong> ${escapeHtml(profileScope)}</p>
      <h4>Direct answer</h4>
      <p>${escapeHtml(directAnswer)}</p>
      <h4>What I would do next</h4>
      <ul>${steps}</ul>
      <h4>Live surfaces to use</h4>
      ${renderLiveSurfaces(surfaces)}
      <h4>Sources checked</h4>
      <p>${renderSourceChips(sources)}</p>
      <div class="guardrail"><strong>Guardrail:</strong> ${escapeHtml(guardrailFor(route))}</div>
    </div>
  `;
}

function renderSources(sources) {
  const el = document.getElementById('brainSources');
  if (!el) return;
  el.innerHTML = sources.length ? sources.map(s => `
    <div class="source-card">
      <strong>${escapeHtml(s.heading || s.title || 'Untitled source')}</strong>
      <span>${escapeHtml(s.title || 'Knowledge source')} - score ${escapeHtml(s.score)}</span>
      <p>${escapeHtml((s.text || '').slice(0, 260))}${(s.text || '').length > 260 ? '...' : ''}</p>
      <p>${escapeHtml(s.source || '')}</p>
    </div>
  `).join('') : '<p class="notice">No sources retrieved yet.</p>';
}

async function fetchJson(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function loadKB() {
  const status = document.getElementById('brainStatus');
  try {
    const [kbData, registry, legalData, marketplaceData, obsidianData, personas, siteOperator, offers, skyevaultMap, skyerunnersMap] = await Promise.all([
      fetchJson('brain/knowledge-base.json'),
      fetchJson('brain/live-surface-registry.json'),
      fetchJson('brain/legal-sync.json'),
      fetchJson('brain/marketplace-sync.json'),
      fetchJson('brain/obsidian-sync.json'),
      fetchJson('brain/persona-brains.json'),
      fetchJson('brain/site-operator-brain.json'),
      fetchJson('brain/sales-offer-registry.json'),
      fetchJson('brain/skyevault-vault-map.json'),
      fetchJson('brain/skyerunners.json')
    ]);

    if (!kbData) throw new Error('knowledge-base missing');

    SURFACE_REGISTRY = registry;
    LEGAL_DATA = legalData;
    PERSONA_REGISTRY = personas;
    SITE_OPERATOR = siteOperator;
    SALES_OFFERS = offers;
    SKYEVAULT_MAP = skyevaultMap;
    SKYERUNNERS_MAP = skyerunnersMap;

    KB = [
      ...(kbData.chunks || []),
      ...registryToChunks(SURFACE_REGISTRY),
      ...personasToChunks(PERSONA_REGISTRY),
      ...siteOperatorToChunks(SITE_OPERATOR),
      ...offersToChunks(SALES_OFFERS),
      ...skyevaultToChunks(SKYEVAULT_MAP),
      ...skyerunnersToChunks(SKYERUNNERS_MAP),
      ...(LEGAL_DATA?.chunks || []),
      ...(marketplaceData?.chunks || []),
      ...(obsidianData?.chunks || [])
    ];

    const brainCount = PERSONA_REGISTRY?.total_brains || SITE_OPERATOR?.total_system_brains || TOTAL_BRAINS;
    const extras = [
      SURFACE_REGISTRY ? 'live surface routing' : null,
      PERSONA_REGISTRY ? 'persona registry' : null,
      SITE_OPERATOR ? 'site-operator routes' : null,
      SALES_OFFERS ? 'sales offer registry' : null,
      LEGAL_DATA ? 'legal center' : null,
      marketplaceData ? 'marketplace catalog' : null,
      skyevaultMap ? 'SkyeVault repo map' : null,
      skyerunnersMap ? 'SkyeRunners repo map' : null,
      obsidianData ? 'Obsidian vault sync' : null
    ].filter(Boolean);
    if (status) status.textContent = `Ready. Loaded ${brainCount} operating brains and ${KB.length} private knowledge chunks with ${extras.join(', ')}.`;
    renderSources([]);
  } catch (e) {
    if (status) status.textContent = 'Could not load the cabinet brain data. Serve the site from the 0S Worker or an operator server and confirm brain/knowledge-base.json is present.';
  }
}

function registryToChunks(registry) {
  if (!registry) return [];
  const chunks = [{
    id: 'live-surface-registry-positioning',
    title: 'Live Surface Registry',
    heading: 'MetrAIyux and SkyeGateFS27 sales architecture',
    text: [registry.positioning, registry.sales_rule, ...(registry.public_claim_boundary || [])].join(' '),
    source: 'brain/live-surface-registry.json'
  }];
  (registry.surfaces || []).forEach(surface => chunks.push({
    id: `live-surface-${surface.id}`,
    title: 'Live Surface Registry',
    heading: surface.name,
    text: `${surface.name} lives at ${surface.url}. Audience: ${surface.audience}. Privacy: ${surface.privacy}. Purpose: ${surface.purpose}. Sales use: ${surface.sales_use}. Route when: ${(surface.route_when || []).join(', ')}. Primary brain: ${surface.primary_brain}. Secondary brain: ${surface.secondary_brain}.`,
    source: surface.local_path || 'brain/live-surface-registry.json'
  }));
  return chunks;
}

function personasToChunks(personas) {
  return (personas?.profiles || []).map(profile => ({
    id: `persona-${profile.id}`,
    title: '16-Brain Persona Registry',
    heading: profile.name,
    text: profileHay(profile),
    source: 'brain/persona-brains.json'
  }));
}

function siteOperatorToChunks(siteOperator) {
  if (!siteOperator) return [];
  const chunks = [{
    id: 'site-operator-purpose',
    title: 'Site Operator Brain',
    heading: siteOperator.title || siteOperator.name,
    text: flattenValue(siteOperator),
    source: 'brain/site-operator-brain.json'
  }];
  (siteOperator.routes || []).forEach(route => chunks.push({
    id: `site-operator-route-${route.intent}`,
    title: 'Site Operator Brain Routes',
    heading: route.intent,
    text: `Intent ${route.intent}. Primary ${route.route_to}. Secondary ${route.secondary}. Task ${route.create_task}.`,
    source: 'brain/site-operator-brain.json'
  }));
  return chunks;
}

function offersToChunks(offers) {
  if (!offers) return [];
  const chunks = [{
    id: 'sales-offer-registry',
    title: 'Sales Offer Registry',
    heading: 'Pricing and Stripe source of truth',
    text: flattenValue(offers),
    source: 'brain/sales-offer-registry.json'
  }];
  const maybeOffers = [
    ...(offers.offers || []),
    ...(offers.products || []),
    ...(offers.pricing || []),
    ...(offers.packages || [])
  ];
  maybeOffers.forEach((offer, index) => chunks.push({
    id: `sales-offer-${offer.id || index}`,
    title: 'Sales Offer Registry',
    heading: offer.name || offer.title || offer.id || `Offer ${index + 1}`,
    text: flattenValue(offer),
    source: 'brain/sales-offer-registry.json'
  }));
  return chunks;
}

function skyevaultToChunks(map) {
  if (!map) return [];
  const chunks = [...(map.chunks || [])];
  (map.repos || []).forEach(repo => chunks.push({
    id: `skyevault-map-repo-${repo.workspace_id}-${repo.repo_id}`,
    title: 'SkyeVault 0S Neural Map',
    heading: `${repo.workspace_id}/${repo.repo_id}`,
    text: `SkyeVault repo ${repo.workspace_id}/${repo.repo_id}: ${repo.ref_updates || 0} ref updates, ${repo.requests || 0} Git requests, ${repo.exports || 0} exports, latest subject ${repo.latest_subject || 'none'}, latest head ${repo.latest_head || 'none'}. Gate should authorize access; 0S should show this in the workspace brain map.`,
    source: 'brain/skyevault-vault-map.json'
  }));
  return chunks;
}

function skyerunnersToChunks(map) {
  if (!map) return [];
  const chunks = [...(map.chunks || [])];
  (map.runners || []).forEach(runner => chunks.push({
    id: `skyerunners-role-${runner.id}`,
    title: 'SkyeRunners Repo Agent Map',
    heading: runner.name,
    text: `${runner.name} is the ${runner.lane} SkyeRunner. Mission: ${runner.mission}. Primary brain: ${runner.primary_brain}. Secondary brain: ${runner.secondary_brain}. Default command: ${runner.default_command}. Uses: ${(runner.uses || []).join(', ')}.`,
    source: 'brain/skyerunners.json'
  }));
  (map.commands || []).forEach(command => chunks.push({
    id: `skyerunners-command-${command.id}`,
    title: 'SkyeRunners Command Catalog',
    heading: command.title,
    text: `Command ${command.id} runs ${command.title}. Lane: ${command.lane}. Risk: ${command.risk}. Spend profile: ${command.spend_profile}. Result: ${command.result}. Steps: ${(command.steps || []).join(', ')}.`,
    source: 'brain/skyerunners.json'
  }));
  return chunks;
}

document.getElementById('askBrain')?.addEventListener('click', () => {
  const input = document.getElementById('brainQuestion');
  const answer = document.getElementById('brainAnswer');
  const q = input?.value.trim();
  if (!q || !answer) return;
  const sources = retrieve(q, 8);
  renderSources(sources);
  answer.innerHTML = buildAnswer(q, sources);
});

document.getElementById('exampleBrain')?.addEventListener('click', () => {
  const input = document.getElementById('brainQuestion');
  if (input) input.value = 'A Phoenix buyer asks how this is more than a website and wants auth/proof. Which brain handles it and what link do I send?';
});

document.getElementById('clearBrain')?.addEventListener('click', () => {
  const input = document.getElementById('brainQuestion');
  const answer = document.getElementById('brainAnswer');
  if (input) input.value = '';
  if (answer) answer.innerHTML = '';
  renderSources([]);
});

document.getElementById('testEndpoint')?.addEventListener('click', async () => {
  const out = document.getElementById('endpointResult');
  const url = document.getElementById('endpointUrl')?.value.trim();
  const model = document.getElementById('endpointModel')?.value.trim();
  if (!out || !url || !model) return;
  out.textContent = 'Testing endpoint...';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a serious MetrAIyux 0S cabinet router. Answer with the owner brain, secondary brain, next action, and one guardrail.' },
          { role: 'user', content: 'Reply with one sentence confirming the private brain endpoint works.' }
        ],
        stream: false
      })
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2).slice(0, 2000);
  } catch (e) {
    out.textContent = `Endpoint test failed: ${e.message}\nThis is normal if Ollama/llama.cpp is not running or CORS is not enabled.`;
  }
});

loadKB();
