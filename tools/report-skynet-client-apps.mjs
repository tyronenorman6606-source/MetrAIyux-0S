#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const clientAppsRoot = path.join(repoRoot, 'client-app-factory', 'client-apps');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyenet-client-app-report');
const jsonOutPath = path.join(artifactDir, 'skyenet-client-app-report-latest.json');
const markdownOutPath = path.join(repoRoot, 'metraiyux_0s_site', 'docs', 'SKYENET_CLIENT_APP_OWNER_BLASTS.md');
const excludedSlugs = new Set(['skye-app-template']);

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readText(file, fallback = '') {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return fallback;
  }
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^[a-z]\d/i.test(part)) return part.toUpperCase();
      if (/^[a-z]$/i.test(part)) return part.toUpperCase();
      return part.slice(0, 1).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function cleanBusinessName(value, slug) {
  const text = String(value || '').trim();
  if (!text) return titleFromSlug(slug);
  return text.replace(/\s+App$/i, '').trim();
}

function cleanDescription(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function sentenceList(values, max = 6) {
  const items = unique(values).slice(0, max);
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function htmlTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanDescription(match[1]) : '';
}

function inferPurpose({ siteData, manifest, packageJson, slug, businessName }) {
  const lane = cleanDescription(siteData?.lane || siteData?.business?.lane || siteData?.app?.lane);
  const services = Array.isArray(siteData?.services) ? sentenceList(siteData.services, 5) : '';
  const categoryNames = Array.isArray(siteData?.categories) ? sentenceList(siteData.categories.map((category) => category?.name), 5) : '';
  const description = cleanDescription(siteData?.description || siteData?.app?.description || manifest?.description || packageJson?.description);

  if (lane && services) return `A SkyeNet preview/prototype for ${lane}, with app flows around ${services}.`;
  if (lane) return `A SkyeNet preview/prototype for ${lane}.`;
  if (services) return `A SkyeNet preview/prototype with app flows around ${services}.`;
  if (categoryNames) return `A SkyeNet preview/prototype for ${businessName}, with app flows around ${categoryNames}.`;
  if (description) return description;
  return `A SkyeNet preview/prototype for ${titleFromSlug(slug)}.`;
}

function routeRecords(pathManifest) {
  if (!Array.isArray(pathManifest?.routes)) return [];
  return pathManifest.routes
    .map((route) => {
      if (Array.isArray(route)) return { path: route[0], label: route[1] || route[0] };
      if (route && typeof route === 'object') return { path: route.path || route.file || '', label: route.label || route.title || route.path || route.file || '' };
      return null;
    })
    .filter((route) => route?.path || route?.label);
}

async function htmlRouteRecords(appDir) {
  const children = await fs.readdir(appDir, { withFileTypes: true });
  return children
    .filter((child) => child.isFile() && child.name.endsWith('.html'))
    .map((child) => ({
      path: child.name,
      label: child.name === 'index.html' ? 'Home' : titleFromSlug(child.name.replace(/\.html$/i, ''))
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function notableFeatures({ siteData, routes }) {
  const routeLabels = routes.map((route) => route.label || route.path);
  const serviceLabels = Array.isArray(siteData?.services) ? siteData.services : [];
  const financeLabels = Array.isArray(siteData?.finance) ? siteData.finance : [];
  const categoryLabels = Array.isArray(siteData?.categories) ? siteData.categories.map((category) => category?.name) : [];
  return unique([...routeLabels, ...serviceLabels, ...categoryLabels, ...financeLabels]).slice(0, 12);
}

function proofState(deployTarget) {
  if (!deployTarget) {
    return {
      state: 'missing-deploy-target',
      summary: 'No deploy-target.json found; this folder has no recorded standalone SkyeNet deployment target.',
      checks: []
    };
  }

  const checks = [];
  const lastSmoke = deployTarget.lastSmoke || {};
  const hostHeader = lastSmoke.hostHeader || {};
  const sourceDownload = lastSmoke.sourceDownload || {};

  if (hostHeader.route_record) {
    checks.push({
      name: 'SkyeNet route record',
      ok: Boolean(hostHeader.route_record.ok),
      status: hostHeader.route_record.status ?? null
    });
  }
  if (hostHeader.dashboard) {
    checks.push({
      name: 'SkyeNet dashboard lookup',
      ok: Boolean(hostHeader.dashboard.ok),
      status: hostHeader.dashboard.status ?? null
    });
  }
  if (hostHeader.public_http) {
    checks.push({
      name: 'Public URL HTTP smoke',
      ok: Boolean(hostHeader.public_http.ok),
      status: hostHeader.public_http.status ?? null,
      note: hostHeader.public_http.blocker || hostHeader.public_http.error || ''
    });
  }
  if (sourceDownload.unauth) {
    checks.push({
      name: 'Source download unauth gate',
      ok: Boolean(sourceDownload.unauth.ok),
      status: sourceDownload.unauth.status ?? null
    });
  }
  if (sourceDownload.auth) {
    checks.push({
      name: 'Source custody authenticated download',
      ok: Boolean(sourceDownload.auth.ok),
      status: sourceDownload.auth.status ?? null
    });
  }

  const allKnownChecksOk = checks.length > 0 && checks.every((check) => check.ok);
  const hasPublicUrl = Boolean(String(deployTarget.publicUrl || '').trim());
  const hasDeploymentId = Boolean(String(deployTarget.deploymentId || '').trim());
  const publicHttpCheck = checks.find((check) => check.name === 'Public URL HTTP smoke');

  if (allKnownChecksOk) {
    return {
      state: 'proof-recorded',
      summary: 'deploy-target.json records SkyeNet deployment metadata and all included non-browser smoke checks passed.',
      checks
    };
  }
  if (hasPublicUrl && hasDeploymentId && publicHttpCheck && !publicHttpCheck.ok) {
    return {
      state: 'deployed-public-edge-pending',
      summary: 'deploy-target.json records a SkyeNet deployment, but the public URL HTTP smoke did not pass in the saved proof.',
      checks
    };
  }
  if (hasPublicUrl && hasDeploymentId) {
    return {
      state: 'deployment-target-recorded',
      summary: 'deploy-target.json records a SkyeNet deployment; no full passing non-browser proof set is recorded in that file.',
      checks
    };
  }
  return {
    state: 'deploy-target-incomplete',
    summary: 'deploy-target.json exists but does not include both publicUrl and deploymentId.',
    checks
  };
}

function ownerBlast({ businessName, publicUrl, features }) {
  const urlText = publicUrl || 'the preview link we provide';
  const featureText = sentenceList(features, 4);
  const featureSentence = featureText ? ` I focused the preview around ${featureText}.` : '';
  return `Hey ${businessName}, I built you a free live SkyeNet preview app: ${urlText}.${featureSentence} This is a working prototype hosted on our own sovereign infrastructure, not just a mockup or agency landing page. It is not an official ${businessName} site unless you approve and adopt it; we can remove it, update it, or hand it over on request.`;
}

async function collectApp(slug) {
  const appDir = path.join(clientAppsRoot, slug);
  const siteData = await readJson(path.join(appDir, 'site-data.json'));
  const manifest = await readJson(path.join(appDir, 'manifest.webmanifest'));
  const pathManifest = await readJson(path.join(appDir, 'APP_PATH_MANIFEST.json'));
  const deployTarget = await readJson(path.join(appDir, 'deploy-target.json'));
  const packageJson = await readJson(path.join(appDir, 'package.json'));
  const indexHtml = await readText(path.join(appDir, 'index.html'));
  const pathRoutes = routeRecords(pathManifest);
  const routes = pathRoutes.length ? pathRoutes : await htmlRouteRecords(appDir);
  const businessName = cleanBusinessName(siteData?.name || siteData?.business?.name || pathManifest?.client || manifest?.name || htmlTitle(indexHtml) || packageJson?.name, slug);
  const publicUrl = String(deployTarget?.publicUrl || '').trim() || null;
  const proof = proofState(deployTarget);
  const features = notableFeatures({ siteData, routes });

  return {
    business_name: businessName,
    slug,
    skynet_public_url: publicUrl,
    what_the_app_does: inferPurpose({ siteData, manifest, packageJson, slug, businessName }),
    notable_pages_features: features,
    deployment_proof_state: proof,
    owner_blast_message: ownerBlast({ businessName, publicUrl, features }),
    source_files: {
      app_root: rel(appDir),
      site_data: existsSync(path.join(appDir, 'site-data.json')) ? rel(path.join(appDir, 'site-data.json')) : null,
      manifest: existsSync(path.join(appDir, 'manifest.webmanifest')) ? rel(path.join(appDir, 'manifest.webmanifest')) : null,
      app_path_manifest: existsSync(path.join(appDir, 'APP_PATH_MANIFEST.json')) ? rel(path.join(appDir, 'APP_PATH_MANIFEST.json')) : null,
      deploy_target: existsSync(path.join(appDir, 'deploy-target.json')) ? rel(path.join(appDir, 'deploy-target.json')) : null
    }
  };
}

function markdownEscape(value) {
  return String(value || '').replace(/\|/g, '\\|');
}

function renderMarkdown(payload) {
  const lines = [
    '# SkyeNet Client App Owner Blasts',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    'This report is generated from `tools/report-skynet-client-apps.mjs` by scanning `client-app-factory/client-apps`. It excludes `skye-app-template` by default and uses only local metadata: `site-data.json`, `manifest.webmanifest`, `APP_PATH_MANIFEST.json`, and `deploy-target.json` when present.',
    '',
    'No browser proof was run for this report. Deployment proof states come from saved non-browser metadata in each app folder.',
    '',
    '## Summary',
    '',
    `- Real client apps reported: ${payload.app_count}`,
    `- Apps with SkyeNet public URL in deploy-target.json: ${payload.apps_with_skynet_public_url}`,
    `- Apps without deploy-target.json: ${payload.apps_without_deploy_target}`,
    '',
    '## Owner Blast Table',
    '',
    '| Business | Slug | SkyeNet public URL | Proof state | Owner blast |',
    '| --- | --- | --- | --- | --- |'
  ];

  for (const app of payload.apps) {
    lines.push(`| ${markdownEscape(app.business_name)} | \`${markdownEscape(app.slug)}\` | ${app.skynet_public_url ? markdownEscape(app.skynet_public_url) : 'Not recorded'} | \`${markdownEscape(app.deployment_proof_state.state)}\` | ${markdownEscape(app.owner_blast_message)} |`);
  }

  lines.push('', '## App Details', '');
  for (const app of payload.apps) {
    lines.push(
      `### ${app.business_name}`,
      '',
      `- Slug: \`${app.slug}\``,
      `- SkyeNet public URL: ${app.skynet_public_url || 'Not recorded in deploy-target.json'}`,
      `- What it does: ${app.what_the_app_does}`,
      `- Notable pages/features: ${app.notable_pages_features.length ? app.notable_pages_features.join(', ') : 'Not recorded'}`,
      `- Deployment proof state: \`${app.deployment_proof_state.state}\` - ${app.deployment_proof_state.summary}`,
      `- Owner blast: ${app.owner_blast_message}`,
      ''
    );
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const children = await fs.readdir(clientAppsRoot, { withFileTypes: true });
  const slugs = children
    .filter((child) => child.isDirectory())
    .map((child) => child.name)
    .filter((slug) => !excludedSlugs.has(slug))
    .sort((a, b) => a.localeCompare(b));

  const apps = [];
  for (const slug of slugs) {
    apps.push(await collectApp(slug));
  }

  const generatedAt = new Date().toISOString();
  const payload = {
    schema: 'skyenet.client-app-report.v1',
    generated_at: generatedAt,
    source_root: rel(clientAppsRoot),
    excluded_slugs: [...excludedSlugs].sort(),
    app_count: apps.length,
    apps_with_skynet_public_url: apps.filter((app) => app.skynet_public_url).length,
    apps_without_deploy_target: apps.filter((app) => !app.source_files.deploy_target).length,
    browser_proof: 'not-run-owner-manual-browser-verification-policy',
    apps
  };

  await fs.mkdir(path.dirname(jsonOutPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownOutPath), { recursive: true });
  await fs.writeFile(jsonOutPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(markdownOutPath, renderMarkdown(payload));

  console.log(JSON.stringify({
    ok: true,
    app_count: payload.app_count,
    apps_with_skynet_public_url: payload.apps_with_skynet_public_url,
    apps_without_deploy_target: payload.apps_without_deploy_target,
    json_report: rel(jsonOutPath),
    markdown_report: rel(markdownOutPath)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
