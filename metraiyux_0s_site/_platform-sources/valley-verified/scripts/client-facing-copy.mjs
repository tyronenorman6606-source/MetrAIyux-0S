import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DEFAULT_TARGET = path.join(ROOT, 'dist');
const TARGET = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_TARGET;

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes:true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.name === 'index.html' || entry.name === '404.html') out.push(full);
  }
  return out;
}

function sanitizeHtml(source) {
  let body = source;

  body = body
    .replaceAll('bob.s.smoke.shop@skyemail.solenterprises.org', 'bobs-smokeshop@skyemail.solenterprises.org')
    .replaceAll('bob.s.smoke.shop%40skyemail.solenterprises.org', 'bobs-smokeshop%40skyemail.solenterprises.org')
    .replaceAll('bob.s.smoke.shop%40skyemail.solenterprises.org', 'bobs-smokeshop%40skyemail.solenterprises.org');

  body = body
    .replaceAll('Valley source record', 'Profile overview')
    .replaceAll('Seeded offer', 'Customer path')
    .replaceAll('Client app texture', 'Live app experience')
    .replaceAll('Source metadata', 'Business details')
    .replaceAll('Data lineage', 'Business details')
    .replaceAll('Seeded profile record', 'Business profile record')
    .replaceAll('Valley Verified profile source:', 'Valley Verified profile details:')
    .replaceAll('profile source', 'profile details')
    .replaceAll('Source file:', 'Profile record:')
    .replaceAll('Source hash:', 'Profile reference:')
    .replaceAll('dist/data/businesses.json', 'the Valley Verified business profile')
    .replaceAll('seed/businesses/clients.json', 'the client workspace profile')
    .replaceAll('seed/businesses/inbox', 'public business review')
    .replaceAll('source metadata', 'business details')
    .replaceAll('source record', 'business profile')
    .replaceAll('source handoff', 'owner update path')
    .replaceAll('source policy', 'profile policy')
    .replaceAll('Source policy', 'Profile policy')
    .replaceAll('source line', 'profile note')
    .replaceAll('source lines', 'profile notes')
    .replaceAll('Not listed in source facts', 'Not publicly listed')
    .replaceAll('Not listed in source', 'Not publicly listed')
    .replaceAll('Public source status:', 'Public profile status:')
    .replaceAll('Open source listing', 'Open public listing')
    .replaceAll('Business Facts And Source', 'Business Facts')
    .replaceAll('Source filed', 'Profile filed')
    .replaceAll('Identity key:', 'Business profile:')
    .replaceAll('Canonical route', 'Business page')
    .replaceAll('canonical route', 'business page')
    .replaceAll('Open provisioning JSON', 'Review SkyEmail details')
    .replaceAll('Open service JSON', 'Review service details')
    .replaceAll('Open model JSON', 'Review details')
    .replaceAll('Open JSON', 'Review details')
    .replaceAll('service JSON', 'service details')
    .replaceAll('code-backed', 'workflow-backed')
    .replaceAll('upstream-auth', 'secure-gateway')
    .replaceAll('anti-theater', 'quality')
    .replaceAll('runtime adapter', 'service path')
    .replaceAll('idempotency', 'duplicate protection')
    .replaceAll('static public marketplace', 'public marketplace')
    .replaceAll('seed commit', 'profile update')
    .replaceAll('Darthom inbox check', 'current seat pool')
    .replaceAll('K4i', 'support follow-up');

  body = body
    .replace(
      /dist\/data\/businesses\.json and seed\/businesses\/clients\.json identify ([^<.]+?) as ([^<.]+?)\./g,
      '$1 is listed with a customer-facing business profile, contact paths, live app route, owner update path, and shareable Valley Verified page.'
    )
    .replace(
      /The seed offer is Open Bob&#39;s live shop app, described as inventory lanes, specials, gallery, workspace preview, and visit details\./g,
      'Bob can open the live shop app to review inventory lanes, specials, gallery media, workspace preview, and visit details.'
    )
    .replace(
      /The seed offer is Open Empire&#39;s live quote app, described as quote intake, pallet service lanes, scan route, and preview access\./g,
      'Empire can open the live quote app to review quote intake, pallet service lanes, scan route, and preview access.'
    )
    .replace(
      /The app includes a 21\+ entry screen, live homepage media, inventory pages, current-specials copy, gallery assets, contact details, workspace preview, QR handoff, and Valley Verified backlink\./g,
      'The live app gives shoppers a 21+ entry screen, mobile media, inventory pages, current-specials copy, gallery assets, contact details, workspace preview, QR handoff, and Valley Verified link.'
    )
    .replace(
      /The app includes a Phoenix pallet operations hero, quote form, service hub, new\/recycled\/removal\/heat\/drop\/custom pages, scan route, preview route, PWA\/offline shell, and Valley Verified backlink\./g,
      'The live app gives buyers a Phoenix pallet operations page, quote form, service hub, product and service pages, scan route, preview route, mobile shell, and Valley Verified link.'
    );

  body = body
    .replace(/<li><b>Source file<\/b><span>[\s\S]*?<\/span><\/li>\s*/g, '')
    .replace(/<li><b>Source hash<\/b><span>[\s\S]*?<\/span><\/li>\s*/g, '')
    .replace(/<li>\s*<span class="label">Source file<\/span>[\s\S]*?<\/li>\s*/g, '')
    .replace(/<li>\s*<span class="label">Source hash<\/span>[\s\S]*?<\/li>\s*/g, '')
    .replace(/<li>\s*<span class="label">Source lines<\/span>[\s\S]*?<\/li>\s*/g, '')
    .replace(/<li><strong>Checked source:<\/strong>[\s\S]*?<\/li>\s*/g, '')
    .replace(/<dt>Source hash<\/dt>\s*<dd>[\s\S]*?<\/dd>\s*/g, '')
    .replace(/<dt>Source file<\/dt>\s*<dd>[\s\S]*?<\/dd>\s*/g, '')
    .replace(/<dt>Source lines<\/dt>\s*<dd>[\s\S]*?<\/dd>\s*/g, '')
    .replace(/<article class="source-card">\s*<span class="label">Source lines<\/span>[\s\S]*?<\/article>\s*/g, '')
    .replace(/<div class="source-row">\s*<span>Source (?:file|hash|lines)<\/span>[\s\S]*?<\/div>\s*/g, '')
    .replace(/<div class="source-tile">\s*<span>Source file<\/span>[\s\S]*?<\/div>\s*/g, '')
    .replace(/<div class="source-tile">\s*<span>Source hash<\/span>[\s\S]*?<\/div>\s*/g, '')
    .replace(/<div class="source-item">\s*<span>Source (?:file|hash|lines)<\/span>[\s\S]*?<\/div>\s*/g, '')
    .replace(/<div class="fact"><span>Source file<\/span>[\s\S]*?<\/div>\s*/g, '')
    .replace(/<div class="fact"><span>Source hash<\/span>[\s\S]*?<\/div>\s*/g, '')
    .replace(/<div class="vv-fact">\s*<span>Source (?:file|hash|lines)<\/span>[\s\S]*?<\/div>\s*/g, '')
    .replace(/<div class="status-row">\s*<span>Source hash<\/span>[\s\S]*?<\/div>\s*/g, '')
    .replace(/<div class="blue-foot">\s*<span>Source hash<\/span>[\s\S]*?<\/div>\s*/g, '')
    .replace(/<li><span>Source hash<\/span><strong>[\s\S]*?<\/strong><\/li>\s*/g, '')
    .replace(/<li>Source lines?:[\s\S]*?<\/li>\s*/g, '')
    .replace(/<li><strong>Source lines:<\/strong>[\s\S]*?<\/li>\s*/g, '')
    .replace(/<p><strong>Source lines:<\/strong>[\s\S]*?<\/p>\s*/g, '')
    .replace(/<li>\s*<span>Source (?:file|hash|lines)<\/span>[\s\S]*?<\/li>\s*/g, '')
    .replace(/<span class="label">Source file<\/span>\s*<span class="value">[\s\S]*?<\/span>/g, '<span class="label">Profile</span><span class="value">Owner-reviewable business profile</span>')
    .replace(/<span class="label">Source hash<\/span>\s*<span class="value">[\s\S]*?<\/span>/g, '<span class="label">Profile reference</span><span class="value">Attached to this shareable business page</span>')
    .replace(/<span class="value">Not present in the Valley Verified business profile<\/span>/g, '<span class="value">Profile details are being reviewed for this route</span>')
    .replace(/<li><b>Source URL<\/b><span>([\s\S]*?)<\/span><\/li>/g, '<li><b>Website</b><span>$1</span></li>')
    .replace(/<li><b>Claim status<\/b><span>Unclaimed<\/span><\/li>/g, '<li><b>Owner updates</b><span>Available before activation</span></li>')
    .replace(/<li><b>Requests<\/b><span>Accepts requests: true<\/span><\/li>/g, '<li><b>Requests</b><span>Requests and updates can be sent from this page.</span></li>')
    .replace(/<p class="muted">Source file: <code>[\s\S]*?<\/code><\/p>\s*/g, '')
    .replace(/<p class="muted">Source hash: <code>[\s\S]*?<\/code><\/p>\s*/g, '')
    .replace(/<p class="source-note">[\s\S]*?<\/p>\s*/g, '<p class="source-note">Business details are based on public-facing profile information and can be updated by the owner.</p>\n')
    .replace(/<p><strong>Source:<\/strong> No matching business record for this route was present in the Valley Verified business profile\.<\/p>/g, '<p><strong>Profile note:</strong> This page is queued for owner-reviewable profile details.</p>')
    .replace(/<dd>the Valley Verified business profile slug review<\/dd>/g, '<dd>Business profile review</dd>')
    .replace(/<span>the Valley Verified business profile lookup for ([^<]+)<\/span>/g, '<span>Business profile review for $1</span>')
    .replace(/<p class="eyebrow">Source<\/p>/g, '<p class="eyebrow">Profile details</p>')
    .replace(/<h2>Source<\/h2>\s*<p>Imported from Valley Verified public lead build v4\.[\s\S]*?<\/p>/g, '<h2>Profile details</h2><p>Business details are based on public-facing profile information and can be updated by the owner.</p>')
    .replace(/<h2 id="source-heading">Public record receipt\.<\/h2>/g, '<h2 id="source-heading">Business profile details.</h2>')
    .replace(/aria-label="Source details"/g, 'aria-label="Profile details"')
    .replace(/<span>Source URL<\/span>/g, '<span>Public listing</span>')
    .replace(/<span class="label">Source URL<\/span>/g, '<span class="label">Public listing</span>')
    .replace(/Source lines? L\d+(?:-L\d+)?\.?\s*/g, '')
    .replace(/Source lines?: L\d+(?:-L\d+)?\.?\s*/g, '')
    .replace(/Source hash [a-f0-9]{7,}\.?/gi, '')
    .replace(/>Source<\/([a-z0-9-]+)>/g, '>Profile</$1>')
    .replace(/<p class="muted">Identity key: <code>[\s\S]*?<\/code><\/p>/g, '<p class="muted">Business details stay attached to one shareable owner-reviewable profile.</p>')
    .replace(/<small>src\/server[\s\S]*?<\/small>/g, '<small>Secure workflow</small>')
    .replace(/<h2 class="section-title" id="source-title">Source<\/h2>/g, '<h2 class="section-title" id="source-title">Profile details</h2>')
    .replace(/<h2 id="source-heading">Source And Lineage<\/h2>/g, '<h2 id="source-heading">Profile details</h2>');

  body = body
    .replace(
      'This static Valley Verified page uses the matching business source record for Bob&#39;s Smoke Shop and presents the owner-researched status, contact details, source metadata, and SkyEmail acceptance flow for manual review.',
      'This Valley Verified page gives customers a clear business profile for Bob&#39;s Smoke Shop, with owner-reviewable contact details, the live app link, and the SkyEmail acceptance path.'
    )
    .replace(
      'Notify Gray to provision the Valley Verified workspace when this business accepts. support follow-up escalates if the workspace is not active after 24 hours.',
      'Submit acceptance so Gray can provision the Valley Verified workspace. Support follows up if the workspace is not active after 24 hours.'
    )
    .replace(
      'Countdown seat pool from the current seat pool. Alert at 2 seats; buy more seats in groups of 5.',
      'Current shared seat pool. Gray gets an alert when the pool reaches 2 seats.'
    )
    .replace(
      'Reserved mailbox. Sign in through the shared 0S/SkyGate lane. Activation takes up to 24 hours after team provisioning.',
      'Reserved starter mailbox. Bob can request a cleaner handle before activation, then sign in through the shared secure 0S/SkyGate lane.'
    )
    .replace(
      'Use the shared 0S/SkyGate sign-in; do not create a separate app password lane.',
      'Use the shared secure 0S/SkyGate sign-in; no separate app password is created for this pilot.'
    )
    .replace(
      'Notify owner to provision workspace before the team goes live.',
      'Submit acceptance so Gray can provision the workspace before the team goes live.'
    )
    .replace(
      'Valley Verified profile details: matching business record in the Valley Verified business profile, last verified May 19, 2026.',
      'Valley Verified profile details: public-facing business details reviewed May 19, 2026.'
    );

  return body;
}

async function main() {
  const files = await walk(TARGET);
  let changed = 0;
  for (const file of files) {
    const before = await fs.readFile(file, 'utf8');
    const after = sanitizeHtml(before);
    if (after !== before) {
      await fs.writeFile(file, after);
      changed += 1;
    }
  }
  console.log(JSON.stringify({
    ok:true,
    target:TARGET,
    html_files:files.length,
    changed
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
