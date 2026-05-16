#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const configPath = path.resolve(process.argv[2] || path.join(root, 'client-intake.example.json'));
const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const required = ['clientSlug', 'platformName', 'companyName', 'founderName', 'publicUrl', 'adminEmail'];
const missing = required.filter((key) => !raw[key]);
if (missing.length) {
  console.error(`Missing required client fields: ${missing.join(', ')}`);
  process.exit(1);
}

const publicUrl = new URL(raw.publicUrl);
const config = {
  platformName: raw.platformName,
  companyName: raw.companyName,
  founderName: raw.founderName,
  tagline: raw.tagline || `Autonomous business command deck for ${raw.companyName}.`,
  publicUrl: publicUrl.href.replace(/\/$/, ''),
  adminEmail: raw.adminEmail,
  approvalFromEmail: raw.approvalFromEmail || `approvals@${publicUrl.host}`,
  accent: raw.accent || '#d7aa43',
  operator: raw.operator || 'Gray Skyes / Skyes Over London white-label deployment'
};

fs.writeFileSync(path.join(root, 'client-config.json'), `${JSON.stringify(config, null, 2)}\n`);

const sitemapPath = path.join(root, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8')
    .replace(/https:\/\/client-command-deck-full-system\.CLIENT_WORKERS_SUBDOMAIN\.workers\.dev/g, config.publicUrl)
    .replace(/https:\/\/client-domain\.example/g, config.publicUrl);
  fs.writeFileSync(sitemapPath, sitemap);
}

const rootWrangler = path.join(root, 'wrangler.toml');
const generatedWrangler = path.join(root, 'wrangler.client.generated.toml');
const workersSubdomain = raw.workersSubdomain || raw.clientSlug;
if (fs.existsSync(rootWrangler)) {
  const wrangler = fs.readFileSync(rootWrangler, 'utf8')
    .replace(/client-command-deck/g, raw.clientSlug)
    .replace(/Client Command Deck/g, raw.platformName)
    .replace(/Client Company/g, raw.companyName)
    .replace(/https:\/\/client-domain\.example/g, config.publicUrl)
    .replace(/CLIENT_WORKERS_SUBDOMAIN/g, workersSubdomain);
  fs.writeFileSync(generatedWrangler, wrangler);
}

console.log(`Prepared ${config.platformName} for ${config.companyName}`);
console.log(`Updated: ${path.relative(process.cwd(), path.join(root, 'client-config.json'))}`);
console.log(`Generated: ${path.relative(process.cwd(), generatedWrangler)}`);
console.log('Next: create per-client Cloudflare KV/D1/Queues, replace REPLACE_WITH_* IDs, then set secrets with wrangler secret put.');
