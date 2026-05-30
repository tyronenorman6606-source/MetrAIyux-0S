#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(repoRoot, 'marketing', 'devooderator');
const cardAssetRoot = path.join(siteRoot, 'assets', 'cards');
const qrRoot = path.join(cardAssetRoot, 'qr');
const vendorPath = path.join(siteRoot, 'assets', 'vendor', 'qrcode-generator.js');
const sandbox = { module: { exports: {} }, exports: {} };
vm.runInNewContext(readFileSync(vendorPath, 'utf8'), sandbox, { filename: vendorPath });
const qrcode = sandbox.module.exports;

const marketingOrigin = 'https://metraiyux-0s-marketing.pages.dev';
const devodeRatorOrigin = 'https://devooderator.pages.dev';

const targets = [
  {
    id: 'founder-contact',
    title: 'Gray London Skyes Marketing Page',
    kind: 'founder',
    url: `${marketingOrigin}/gray-skyes.html`,
    description: 'Founder marketing page for business-card scans.'
  },
  {
    id: 'founder-vcard',
    title: 'Save Gray London Skyes Contact',
    kind: 'contact',
    url: `${devodeRatorOrigin}/assets/cards/gray-london-skyes.vcf`,
    description: 'Downloadable vCard for Gray London Skyes.'
  },
  {
    id: 'card-studio',
    title: 'MetrAIyux 0S Business Card Studio',
    kind: 'card-studio',
    url: `${marketingOrigin}/business-cards.html`,
    description: 'Primary marketing-site business-card studio.'
  },
  {
    id: 'marketing-home',
    title: 'MetrAIyux 0S Marketing Home',
    kind: 'platform',
    url: `${marketingOrigin}/`,
    description: 'Buyer-facing MetrAIyux 0S marketing homepage.'
  },
  {
    id: 'sell-sheet',
    title: 'MetrAIyux 0S Sell Sheet',
    kind: 'sales',
    url: `${marketingOrigin}/sell-sheet.html`,
    description: 'Primary sales sheet for buyer handoffs.'
  },
  {
    id: 'capabilities',
    title: 'MetrAIyux 0S Capabilities',
    kind: 'sales',
    url: `${marketingOrigin}/capabilities.html`,
    description: 'Capabilities and platform lane overview.'
  },
  {
    id: 'pricing',
    title: 'MetrAIyux 0S Plans and Pricing',
    kind: 'sales',
    url: `${marketingOrigin}/#pricing`,
    description: 'Pricing anchor for qualified business-card scans.'
  },
  {
    id: 'free-business-stack',
    title: 'Free Business Stack',
    kind: 'offer',
    url: `${marketingOrigin}/business-owner-free-stack.html`,
    description: 'Small-business entry offer and free-stack marketing page.'
  },
  {
    id: 'white-label',
    title: 'White Label Licensing',
    kind: 'sales',
    url: `${marketingOrigin}/white-label.html`,
    description: 'White-label licensing page for agencies and operators.'
  },
  {
    id: 'live-proof',
    title: 'MetrAIyux 0S Live Proof',
    kind: 'proof',
    url: `${marketingOrigin}/proof.html`,
    description: 'Primary public proof page.'
  },
  {
    id: 'social-vault',
    title: 'MetrAIyux 0S Social Vault',
    kind: 'marketing',
    url: `${marketingOrigin}/social.html`,
    description: 'Primary marketing-site social vault.'
  },
  {
    id: 'devoderator-proof-journal',
    title: 'DevodeRator Proof Journal',
    kind: 'proof-journal',
    url: `${devodeRatorOrigin}/`,
    description: 'Behind-the-scenes proof journal and build diary.'
  },
  {
    id: 'valley-verified',
    title: 'Valley Verified Priority Access',
    kind: 'local-business',
    url: `${devodeRatorOrigin}/valley-verified/`,
    description: 'Public-safe Valley Verified card-specific handoff page.'
  },
  {
    id: 'skyeroutex',
    title: 'SkyeRouteX Workforce Command',
    kind: 'platform',
    url: `${marketingOrigin}/skyeroutex.html`,
    description: 'Route and workforce command marketing page.'
  },
  {
    id: 'skyevault-proof',
    title: 'SkyeVault Proof Ecology',
    kind: 'proof',
    url: `${marketingOrigin}/proof-ecology.html`,
    description: 'SkyeVault and proof ecology marketing surface.'
  },
  {
    id: 'skye-music-nexus',
    title: 'SkyeMusicNexus',
    kind: 'platform',
    url: `${marketingOrigin}/skye-music-nexus/nexus-marketing-hub.html`,
    description: 'Artist platform marketing hub.'
  },
  {
    id: 'quantumskyes-mcp',
    title: 'QuantumSkyes Design MCP',
    kind: 'tooling',
    url: 'https://skye-design-mcp.pages.dev/use-mcp.html',
    description: 'Remote MCP access guide and design tooling surface.'
  },
  {
    id: 'merser',
    title: 'Merser',
    kind: 'tooling',
    url: 'https://merser.pages.dev/',
    description: 'Public Merser world-registry and source-pack surface.'
  },
  {
    id: 'agentic-growth-layer',
    title: 'Agentic Growth Layer',
    kind: 'growth',
    url: 'https://agentic-growth-layer.pages.dev/',
    description: 'Public AI growth-operations surface.'
  },
  {
    id: 'legal-skyes',
    title: 'LegalSkyes',
    kind: 'policy',
    url: 'https://skyes-over-london-legal.pages.dev/legal/',
    description: 'Public legal/policy surface for Skyes Over London.'
  }
];

function buildSvg(target) {
  const qr = qrcode(0, 'M');
  qr.addData(target.url);
  qr.make();
  const rawSvg = qr.createSvgTag({
    cellSize: 8,
    margin: 32,
    scalable: true,
    title: target.title,
    alt: `${target.title}: ${target.url}`
  });
  return rawSvg
    .replace('<svg version="1.1"', `<!-- ${target.title} | ${target.url} -->\n<svg version="1.1"`)
    .replace('<description ', '<desc ')
    .replace('</description>', '</desc>');
}

const vcard = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:Skyes;Gray;London;;;',
  'FN:Gray London Skyes',
  'ORG:Skyes Over London;SOLEnterprises International Nexus and Holdings',
  'TITLE:Founder / Builder / Operator',
  'EMAIL;TYPE=WORK:grayskyes@solenterprises.org',
  'TEL;TYPE=WORK,VOICE:+18004844788',
  `URL:${marketingOrigin}/gray-skyes.html`,
  'NOTE:Shared Gray London Skyes contact card. Main QR targets point to buyer-facing marketing pages; DevodeRator remains the proof journal.',
  'END:VCARD'
].join('\r\n');

await rm(qrRoot, { recursive: true, force: true });
await mkdir(qrRoot, { recursive: true });
for (const target of targets) {
  await writeFile(path.join(qrRoot, `${target.id}.svg`), `${buildSvg(target)}\n`, 'utf8');
}

const manifest = {
  generatedAt: '2026-05-27',
  primaryOrigin: marketingOrigin,
  devodeRatorOrigin,
  targetCount: targets.length,
  targets: targets.map((target) => ({
    ...target,
    qrSvg: `assets/cards/qr/${target.id}.svg`
  }))
};

await writeFile(path.join(cardAssetRoot, 'qr-targets.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(path.join(cardAssetRoot, 'gray-london-skyes.vcf'), `${vcard}\r\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  targetCount: targets.length,
  qrRoot,
  manifest: path.join(cardAssetRoot, 'qr-targets.json'),
  vcard: path.join(cardAssetRoot, 'gray-london-skyes.vcf')
}, null, 2));
