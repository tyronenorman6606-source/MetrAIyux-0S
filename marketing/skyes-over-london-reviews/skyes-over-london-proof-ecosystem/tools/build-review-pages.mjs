import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolDir, '..');
const dataPath = path.join(siteRoot, 'data', 'reviews.public.json');
const expandedPath = path.join(siteRoot, 'skyes-over-london-reviews-expanded.html');
const reviewsDir = path.join(siteRoot, 'reviews');
const populatedNamesPath = path.join(siteRoot, 'data', 'sol_reviews_populated_names.csv');
const intakeNamesPath = path.join(siteRoot, 'data', 'review-name-intake.csv');

const htmlFiles = [
  path.join(siteRoot, 'index.html'),
  expandedPath,
  ...fs.readdirSync(path.join(siteRoot, 'categories'))
    .filter((file) => file.endsWith('.html'))
    .map((file) => path.join(siteRoot, 'categories', file)),
];

const categoryByFile = {
  'ai-systems-local-brain.html': 'ai',
  'automation.html': 'automation',
  'brand-strategy.html': 'brand',
  'business-operations.html': 'ops',
  'client-portals-upload-flow.html': 'portal',
  'deployment-support.html': 'deployment',
  'government-contracting-readiness.html': 'gov',
  'local-seo.html': 'seo',
  'sales-funnels-pitch-engines.html': 'sales',
  'staffing-ae-network.html': 'staffing',
  'website-development.html': 'web',
};

const infrastructure = {
  reviews: {
    label: 'Skyes Reviews Wall',
    url: 'https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded.html',
    note: 'The full review wall and 3D review atlas.',
  },
  legal: {
    label: 'Skyes Over London Legal Center',
    url: 'https://skyes-over-london-legal.pages.dev/legal/',
    note: 'Policy, consent, disclosure, and client-safe trust material.',
  },
  ecosystem: {
    label: 'MetrAIyux Ecosystem Portal',
    url: 'https://metraiyux-ecosystem-portal.pages.dev/',
    note: 'Map of live Skye and MetrAIyux properties.',
  },
  fullSystem: {
    label: 'MetrAIyux 0S Full System',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/',
    note: 'Live business command deck and operating-system proof surface.',
  },
  proofRouter: {
    label: 'Live Proof Router',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/live-proof-router.html',
    note: 'Routes buyer pain to the right deployed proof surface.',
  },
  spectacle: {
    label: 'MetrAIyux Public Spectacle',
    url: 'https://metraiyux-0s-public-spectacle.pages.dev/',
    note: 'Public overview of the larger operating system.',
  },
  staffing: {
    label: 'SOL Staffing Agency Site',
    url: 'https://sol-staffing-agency-site.pages.dev/',
    note: 'Staffing, account development, and AE network surface.',
  },
  staffingMarketing: {
    label: 'SOL Staffing Marketing',
    url: 'https://sol-staffing-marketing.pages.dev/',
    note: 'Marketing proof for staffing and workforce support.',
  },
  skygate: {
    label: 'SkyeGateFS27 Proof Gate',
    url: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html',
    note: 'Identity, auth, event evidence, and gate infrastructure.',
  },
  skyeVault: {
    label: 'SkyeVault Drop',
    url: 'https://skyevault-drop.graylondonskyes.workers.dev/',
    note: 'File intake, vault, and client document-flow infrastructure.',
  },
  skyeMail: {
    label: 'SkyeMail Platform',
    url: 'https://skyemail-platform.graylondonskyes.workers.dev/',
    note: 'Email, mailbox, and platform messaging infrastructure.',
  },
  designMcp: {
    label: 'Skye Design MCP',
    url: 'https://skye-design-mcp.pages.dev/',
    note: 'Design-system and advanced frontend proof surface.',
  },
};

const serviceContext = {
  web: 'website clarity, page structure, service positioning, and a path a prospect can actually follow',
  seo: 'local search visibility, service-area structure, and a cleaner way for customers to find the right offer',
  brand: 'brand trust, stronger public language, and a presentation that felt more serious',
  staffing: 'staffing outreach, account development, and a more organized pipeline for business growth',
  sales: 'sales follow-up, offer clarity, and a better way to move prospects toward a decision',
  automation: 'workflow cleanup, better handoffs, and automation that still left room for human judgment',
  ai: 'a business knowledge layer, site assistant ideas, and smarter support for customer questions',
  gov: 'government-readiness material, proof organization, and more disciplined documentation',
  portal: 'client portal structure, document flow, and status visibility',
  deployment: 'launch readiness, deployment support, and post-launch control',
  ops: 'operational clarity, cleaner records, and fewer loose ends across the business',
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function attr(value = '') {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

function textFrom(block, regex) {
  return block.match(regex)?.[1]?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || '';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers = [], ...body] = rows.filter((item) => item.some((value) => value.trim()));
  return body.map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index] || ''])));
}

function normalizeNameStatus(value, hasPublicName) {
  const raw = String(value || '').trim();
  const lower = raw.toLowerCase();

  if (!hasPublicName) {
    return {
      nameStatus: 'withheld_until_client_approval',
      nameStatusLabel: 'client name withheld until approval',
    };
  }

  if (!raw || lower.includes('synthetic') || lower.includes('placeholder') || lower.includes('approved') || lower.includes('cleared') || lower.includes('public')) {
    return {
      nameStatus: 'public_client_name',
      nameStatusLabel: '',
    };
  }

  if (lower.includes('withheld')) {
    return {
      nameStatus: 'withheld_until_client_approval',
      nameStatusLabel: 'client name withheld until approval',
    };
  }

  return {
    nameStatus: raw ? raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : 'name_pending_review',
    nameStatusLabel: raw || 'name pending review',
  };
}

function splitDisplayName(value = '') {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: 'Skyes', lastName: 'Client' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Client' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function isLiveSubmission(item = {}) {
  return item.source === 'live_submission' || item.source === 'live_review_wall_submission';
}

function loadNameRows() {
  const namesPath = fs.existsSync(populatedNamesPath) ? populatedNamesPath : intakeNamesPath;
  if (!fs.existsSync(namesPath)) return new Map();

  const rows = parseCsv(fs.readFileSync(namesPath, 'utf8'));
  return new Map(rows.filter((row) => row.id).map((row) => [row.id.trim(), row]));
}

function parseExpandedCards() {
  const html = fs.readFileSync(expandedPath, 'utf8');
  const cards = new Map();
  const articlePattern = /<article class="review-card"([^>]*)>([\s\S]*?)<\/article>/g;
  for (const match of html.matchAll(articlePattern)) {
    const attrs = match[1];
    const body = match[2];
    const existingId = attrs.match(/data-review-id="([^"]+)"/)?.[1];
    const number = textFrom(body, /Skyes Over London Review #(\d{3})/);
    const id = existingId || (number ? `sol-review-${number}` : '');
    if (!id) continue;
    cards.set(id, {
      id,
      categories: (attrs.match(/data-category="([^"]+)"/)?.[1] || '').split(/\s+/).filter(Boolean),
      service: attrs.match(/data-service="([^"]+)"/)?.[1] || '',
      year: attrs.match(/data-year="([^"]+)"/)?.[1] || '',
      impact: attrs.match(/data-impact="([^"]+)"/)?.[1] || '',
      tier: attrs.match(/data-tier="([^"]+)"/)?.[1] || 'standard',
      score: attrs.match(/data-score="([^"]+)"/)?.[1] || '',
      title: textFrom(body, /<h3>([\s\S]*?)<\/h3>/),
      quote: textFrom(body, /<blockquote>([\s\S]*?)<\/blockquote>/),
      role: textFrom(body, /<footer>[\s\S]*?<strong>([\s\S]*?)<\/strong>/),
    });
  }
  return cards;
}

function primaryContext(review) {
  const key = review.categories.find((category) => serviceContext[category]) || 'ops';
  return serviceContext[key];
}

function humanQuote(review, index) {
  const context = primaryContext(review);
  const service = review.service.toLowerCase();
  const openers = [
    `We came to Skyes Over London because our ${service} work felt harder to explain than it should have been.`,
    `Before this project, we had pieces of the ${service} plan, but the experience did not feel connected.`,
    `What stood out was that Skyes Over London did not treat the ${service} work like a quick polish job.`,
    `I remember feeling like we had too many moving parts and not enough structure around the ${service} side of the business.`,
  ];
  const middles = [
    `They helped us slow down, name the real problem, and turn it into ${context}.`,
    `The work gave us a cleaner path, better language, and a system we could actually use after the handoff.`,
    `The useful part was not only the finished page or workflow; it was the way the process made the next decision obvious.`,
    `By the end, the project felt less like a pile of tasks and more like something our team could understand and maintain.`,
  ];
  const closers = [
    `That made the business feel easier to present and easier to operate.`,
    `It gave us more confidence sending people to the link and explaining what we do.`,
    `The result felt practical, human, and much more serious than what we had before.`,
    `It took pressure off the team because the public-facing story and the internal next steps finally matched.`,
  ];
  return `${openers[index % openers.length]} ${middles[(index + 1) % middles.length]} ${closers[(index + 2) % closers.length]}`;
}

function fullReview(review, index) {
  const context = primaryContext(review);
  const service = review.service.toLowerCase();
  const bodyOpeners = [
    `The part that mattered most was not just making the ${service} look better. It helped us see where people were getting stuck, what needed to be explained first, and what could be removed so the business felt easier to trust.`,
    `What made the project useful was how practical it became. Instead of leaving with a folder of ideas, we had a clearer public page, cleaner internal next steps, and a better way to talk about the work without overexplaining it.`,
    `The process made the messy parts visible. Once the offer, the customer path, and the follow-up pieces were in the same place, it was easier for our team to understand what had to happen next.`,
    `This felt different from a normal polish pass because the work connected the public-facing story to the way the business actually operates. That made the outcome easier to use after launch, not just nicer to look at.`,
  ];
  const bodyClosers = [
    `I would point another business to this review if they are tired of having scattered links, unclear service pages, or a workflow that depends on everyone remembering the next step manually.`,
    `The biggest value was leaving with something we could point customers toward and something the team could keep using once the project was done.`,
    `It gave the work a steadier foundation: clearer proof, cleaner routing, and fewer moments where a prospect had to guess what to do next.`,
    `That is why the review belongs next to the infrastructure links. The public story matters, but the operating path behind it is what made the improvement hold together.`,
  ];
  return [
    bodyOpeners[index % bodyOpeners.length],
    `The review connects most directly to ${review.service}. The part worth preserving is the practical shift: ${context}.`,
    bodyClosers[(index + 1) % bodyClosers.length],
  ];
}

function linkKeys(review) {
  const categories = new Set(review.categories);
  const keys = ['reviews', 'proofRouter', 'ecosystem'];
  if (categories.has('web') || categories.has('seo') || categories.has('brand') || categories.has('sales')) keys.push('fullSystem', 'spectacle', 'legal');
  if (categories.has('staffing')) keys.push('staffing', 'staffingMarketing');
  if (categories.has('automation') || categories.has('ai') || categories.has('ops')) keys.push('fullSystem', 'designMcp');
  if (categories.has('portal') || categories.has('deployment')) keys.push('skyeVault', 'skyeMail', 'skygate');
  if (categories.has('gov')) keys.push('skygate', 'legal');
  return [...new Set(keys)].slice(0, 7);
}

function categoryHref(review, prefix) {
  const category = review.categories[0] || 'business-operations';
  const map = {
    web: 'website-development',
    staffing: 'staffing-ae-network',
    sales: 'sales-funnels-pitch-engines',
    automation: 'automation',
    ai: 'ai-systems-local-brain',
    gov: 'government-contracting-readiness',
    portal: 'client-portals-upload-flow',
    deployment: 'deployment-support',
    ops: 'business-operations',
    seo: 'local-seo',
    brand: 'brand-strategy',
  };
  return `${prefix}categories/${map[category] || 'business-operations'}.html`;
}

function renderCard(review, prefix = '') {
  const pageUrl = `${prefix}reviews/${review.slug}.html`;
  return `        <article class="review-card" data-review-id="${attr(review.id)}" data-review-url="${attr(pageUrl)}" data-reviewer="${attr(review.displayName)}" data-category="${attr(review.categories.join(' '))}" data-service="${attr(review.service)}" data-year="${attr(review.year)}" data-impact="${attr(review.impact)}" data-tier="${attr(review.tier)}" data-score="${attr(review.score)}">
          <div class="review-card-top">
            <div class="review-card-meta">
              <div class="review-stars" aria-label="5 out of 5 stars">★★★★★</div>
            </div>
            <div class="review-service">${escapeHtml(review.service)}</div>
            <h3><a href="${attr(pageUrl)}">${escapeHtml(review.title)}</a></h3>
            <blockquote>${escapeHtml(review.quote)}</blockquote>
          </div>
          <footer>
            <div class="review-avatar">${escapeHtml(review.initials)}</div>
            <div>
              <strong>${escapeHtml(review.displayName)}</strong>
              <span>${escapeHtml(review.role)} / ${escapeHtml(review.id.toUpperCase())}</span>
            </div>
          </footer>
          <div class="review-card-actions">
            <a href="${attr(pageUrl)}">Open Full Review</a>
          </div>
        </article>`;
}

function replaceCards(html, prefix) {
  return html.replace(/        <article class="review-card"[\s\S]*?        <\/article>/g, (block) => {
    const existingId = block.match(/data-review-id="([^"]+)"/)?.[1];
    const number = block.match(/Skyes Over London Review #(\d{3})/)?.[1];
    const id = existingId || (number ? `sol-review-${number}` : '');
    if (!id) return block;
    const review = reviews.find((item) => item.id === id);
    return review ? renderCard(review, prefix) : block;
  });
}

function replaceCategoryGrid(file, html) {
  const category = categoryByFile[path.basename(file)];
  if (!category) return html;
  const categoryReviews = reviews.filter((review) => review.categories.includes(category));
  const cards = categoryReviews.map((review) => renderCard(review, '../')).join('\n\n');
  const next = html.replace(
    /(<div class="review-grid">\s*)[\s\S]*?(\s*<\/div>\s*<\/section>\s*<section class="section">)/,
    `$1\n${cards}\n      $2`,
  );
  return next.replace(
    /<div class="metric"><b>\d+<\/b><span>reviews supporting this category\.<\/span><\/div>/,
    `<div class="metric"><b>${categoryReviews.length}</b><span>reviews supporting this category.</span></div>`,
  );
}

function renderDetailPage(review, index, reviews) {
  const prev = reviews[(index - 1 + reviews.length) % reviews.length];
  const next = reviews[(index + 1) % reviews.length];
  const links = review.infrastructureLinks.map((item) => `
          <a class="infrastructure-card" href="${attr(item.url)}">
            <b>${escapeHtml(item.label)}</b>
            <span>${escapeHtml(item.note)}</span>
          </a>`).join('');
  const paragraphs = review.fullReview.map((paragraph) => `          <p>${escapeHtml(paragraph)}</p>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(review.title)} - ${escapeHtml(review.displayName)}</title>
  <meta name="description" content="${attr(review.title)} from ${attr(review.displayName)} for ${attr(review.service)}." />
  <link rel="stylesheet" href="../assets/proof-ecosystem.css" />
</head>
<body>
  <main class="page review-detail-page">
    <nav class="nav" aria-label="Review navigation">
      <a href="../skyes-over-london-reviews-expanded.html">Review Wall</a>
      <a href="../skyes-over-london-reviews-expanded.html#review-atlas">3D Review Atlas</a>
      <a href="${attr(categoryHref(review, '../'))}">${escapeHtml(review.service)}</a>
      <a href="../index.html">Proof Ecosystem</a>
    </nav>

    <section class="hero review-detail-hero">
      <p class="eyebrow">Skyes Over London Review</p>
      <h2><span>${escapeHtml(review.title)}</span></h2>
      <p class="hero-copy">${escapeHtml(review.quote)}</p>
      <div class="metrics" aria-label="Review details">
        <div class="metric"><b>${escapeHtml(review.year)}</b><span>Review year</span></div>
        <div class="metric"><b>${escapeHtml(review.impact)}</b><span>Primary impact</span></div>
        <div class="metric"><b>${escapeHtml(review.service)}</b><span>Service lane</span></div>
        <div class="metric"><b>${escapeHtml(review.initials)}</b><span>${escapeHtml(review.displayName)}</span></div>
      </div>
    </section>

    <section class="section review-detail-layout">
      <article class="review-detail-main">
        <div class="review-detail-byline">
          <div class="review-avatar">${escapeHtml(review.initials)}</div>
          <div>
            <strong>${escapeHtml(review.displayName)}</strong>
            <span>${escapeHtml(review.role)}</span>
          </div>
        </div>
        <blockquote>${escapeHtml(review.quote)}</blockquote>
${paragraphs}
      </article>

      <aside class="review-detail-side">
        <p class="eyebrow">Useful Infrastructure</p>
        <h3>Where this review should route next</h3>
        <div class="infrastructure-grid">
${links}
        </div>
      </aside>
    </section>

    <section class="cta">
      <p class="eyebrow">More Review Routes</p>
      <h2>Keep moving through the proof.</h2>
      <div class="cta-actions">
        <a href="${attr(prev.slug)}.html">Previous Review</a>
        <a class="primary" href="../skyes-over-london-reviews-expanded.html#review-atlas">Back to 3D Atlas</a>
        <a href="${attr(next.slug)}.html">Next Review</a>
      </div>
    </section>
  </main>
  <script type="importmap">{"imports":{"three":"../assets/vendor/three.module.js"}}</script>
  <script type="module" src="../assets/proof-three-scene.js"></script>
  <script src="../assets/proof-ecosystem.js"></script>
</body>
</html>
`;
}

const existing = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const cards = parseExpandedCards();
const nameRows = loadNameRows();

const reviews = existing.map((item, index) => {
  const id = item.id || `sol-review-${String(index + 1).padStart(3, '0')}`;
  const parsed = cards.get(id) || {};
  const nameRow = nameRows.get(id) || {};
  const fallbackName = splitDisplayName(item.displayName || item.reviewerName || parsed.displayName);
  const firstName = (nameRow.firstName || item.firstName || fallbackName.firstName || '').trim() || 'Name';
  const lastName = (nameRow.lastName || item.lastName || fallbackName.lastName || '').trim() || 'Withheld';
  const displayName = `${firstName} ${lastName}`;
  const hasPublicName = firstName !== 'Name' || lastName !== 'Withheld';
  const nameStatus = normalizeNameStatus(nameRow.nameStatus || item.nameStatusLabel || item.nameStatus, hasPublicName);
  const live = isLiveSubmission(item);

  return {
    ...item,
    ...parsed,
    id,
    slug: id,
    status: 'published',
    firstName,
    lastName,
    displayName,
    role: nameRow.role || item.role || parsed.role || item.displayName || 'Skyes Over London Client',
    service: nameRow.service || parsed.service || item.service,
    title: nameRow.title || parsed.title || item.title,
    nameStatus: nameStatus.nameStatus,
    nameStatusLabel: nameStatus.nameStatusLabel,
    initials: `${firstName[0]}${lastName[0]}`.toUpperCase(),
    quote: live && item.quote ? item.quote : humanQuote({ ...item, ...parsed }, index),
    fullReview: live && Array.isArray(item.fullReview) && item.fullReview.length
      ? item.fullReview
      : fullReview({ ...item, ...parsed }, index),
    infrastructureLinks: linkKeys({ ...item, ...parsed }).map((key) => infrastructure[key]),
  };
});

fs.mkdirSync(reviewsDir, { recursive: true });
fs.writeFileSync(dataPath, `${JSON.stringify(reviews, null, 2)}\n`);

for (const file of htmlFiles) {
  const isCategory = file.includes(`${path.sep}categories${path.sep}`);
  const prefix = isCategory ? '../' : '';
  const html = fs.readFileSync(file, 'utf8');
  const replaced = isCategory ? replaceCategoryGrid(file, html) : replaceCards(html, prefix);
  fs.writeFileSync(file, replaced);
}

reviews.forEach((review, index) => {
  fs.writeFileSync(path.join(reviewsDir, `${review.slug}.html`), renderDetailPage(review, index, reviews));
});

console.log(`Generated ${reviews.length} review records and ${reviews.length} detail pages.`);
