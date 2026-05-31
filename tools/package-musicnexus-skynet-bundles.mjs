#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const musicRoot = path.resolve('metraiyux_0s_site/SkyeMusicNexus');
const storefrontRoot = path.join(musicRoot, 'artist-storefronts');
const outRoot = path.resolve(process.env.MUSICNEXUS_SKYNET_BUNDLE_ROOT || '.tmp/skyenet-musicnexus-public-bundles');
const receiptPath = path.resolve('test-artifacts/musicnexus-skynet-bundles/musicnexus-skynet-bundles-latest.json');

const targets = [
  ['artist-apps', 'musicnexus-artist-apps'],
  ['artist-network-20260524122314', 'musicnexus-artist-network-20260524122314'],
  ['artist-network-20260524122637', 'musicnexus-artist-network-20260524122637'],
  ['dj-ajay', 'musicnexus-dj-ajay'],
  ['gray-skyes', 'musicnexus-gray-skyes'],
  ['gray-skyes-brain', 'musicnexus-gray-skyes-brain'],
  ['gray-skyes-collective', 'musicnexus-gray-skyes-collective'],
  ['jessica-walsh', 'musicnexus-jessica-walsh'],
  ['local-artists', 'musicnexus-local-artists'],
  ['music-4u', 'musicnexus-music-4u'],
  ['NexusArtistPrimePackage', 'musicnexus-NexusArtistPrimePackage'],
  ['radio-vibez', 'musicnexus-radio-vibez'],
  ['reflection', 'musicnexus-reflection'],
  ['sam-smith', 'musicnexus-sam-smith'],
  ['smoke-artist-mpku77m6', 'musicnexus-smoke-artist-mpku77m6'],
  ['smoke-artist-mpku84sm', 'musicnexus-smoke-artist-mpku84sm'],
  ['supaboy', 'musicnexus-supaboy'],
  ['tha-stoves', 'musicnexus-tha-stoves'],
  ['william-parker', 'musicnexus-william-parker']
].map(([slug, projectId]) => ({
  slug,
  projectId,
  workspaceId: projectId.replace(/^musicnexus-/, ''),
  liveUrl: `${skynetBase}/${projectId}/`
}));

function posix(file) {
  return String(file || '').replace(/\\/g, '/');
}

function rel(file) {
  return posix(path.relative(repoRoot, file));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function localRef(fromFile, bundleRoot, target) {
  const fromDir = path.dirname(fromFile);
  const wantsSlash = String(target).endsWith('/');
  const relative = posix(path.relative(fromDir, path.join(bundleRoot, target)));
  const prefixed = relative.startsWith('.') ? relative : `./${relative}`;
  return wantsSlash && !prefixed.endsWith('/') ? `${prefixed}/` : prefixed;
}

function skynetUrlForSlug(slug, slugToLiveUrl) {
  return slugToLiveUrl.get(slug) || `${zeroOsBase}/SkyeMusicNexus/artist-storefronts/${slug}/`;
}

async function existingStorefrontSlugs() {
  const entries = await fs.readdir(storefrontRoot, { withFileTypes: true });
  const slugs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (existsSync(path.join(storefrontRoot, entry.name, 'index.html'))) slugs.push(entry.name);
  }
  return slugs.sort((a, b) => b.length - a.length);
}

async function copyIfExists(source, destination) {
  if (!existsSync(source)) return false;
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true, dereference: true });
  return true;
}

async function walkFiles(root) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  await walk(root);
  return out;
}

function isTextFile(file) {
  return /\.(html?|css|js|json|webmanifest|txt|md|svg)$/i.test(file);
}

async function rewriteBundleText(bundleRoot, sourceSlug, storefrontSlugs, slugToLiveUrl) {
  const files = await walkFiles(bundleRoot);
  for (const file of files.filter(isTextFile)) {
    let text = await fs.readFile(file, 'utf8');
    const original = text;
    const cssRef = localRef(file, bundleRoot, 'artist-storefronts.css');
    const mcpRef = localRef(file, bundleRoot, 'assets/mcp-implementation/');
    const mcpCssRef = localRef(file, bundleRoot, 'assets/mcp-implementation/mcp-effects.css');
    const bridgeRef = localRef(file, bundleRoot, 'assets/js/0s-command-bridge.js');
    const nexusAssetsRef = localRef(file, bundleRoot, 'shared/SkyeMusicNexus/assets/');
    const nexusPublicRef = localRef(file, bundleRoot, 'shared/SkyeMusicNexus/public/');

    text = text.replace(/\/SkyeMusicNexus\/assets\//g, nexusAssetsRef);
    text = text.replace(/\/SkyeMusicNexus\/public\//g, nexusPublicRef);
    text = text.replace(/\/assets\/js\/0s-command-bridge\.js/g, bridgeRef);
    text = text.replace(/(?:\.\.\/)+artist-storefronts\.css/g, cssRef);
    text = text.replace(/(?:\.\.\/)+assets\/mcp-implementation\//g, mcpRef);
    text = text.replace(/(?:\.\.\/)+public\//g, nexusPublicRef);
    text = text.replace(
      /\/SkyeMusicNexus\/artist-storefronts\/NexusArtistPrimePackage\/originals\/assets\/mcp-implementation\/mcp-effects\.css/g,
      mcpCssRef
    );

    for (const slug of storefrontSlugs) {
      const targetUrl = skynetUrlForSlug(slug, slugToLiveUrl);
      text = text.replace(
        new RegExp(`/SkyeMusicNexus/artist-storefronts/${escapeRegExp(slug)}/`, 'g'),
        targetUrl
      );
      text = text.replace(
        new RegExp(`((?:\\.\\./)+)${escapeRegExp(slug)}/`, 'g'),
        targetUrl
      );
    }

    if (path.dirname(file) === bundleRoot) {
      text = text.replace(/((?:href|src|action)=["'])\.\.\/(["'])/g, `$1${skynetUrlForSlug('artist-apps', slugToLiveUrl)}$2`);
    }

    if (text !== original) await fs.writeFile(file, text);
  }
}

async function buildBundle(target, storefrontSlugs, slugToLiveUrl) {
  const sourceDir = path.join(storefrontRoot, target.slug);
  const bundleRoot = path.join(outRoot, target.projectId);
  if (!existsSync(sourceDir)) throw new Error(`Missing source app folder: ${rel(sourceDir)}`);
  await fs.rm(bundleRoot, { recursive: true, force: true });
  await fs.mkdir(bundleRoot, { recursive: true });
  await fs.cp(sourceDir, bundleRoot, { recursive: true, dereference: true });
  await fs.rm(path.join(bundleRoot, 'deploy-target.json'), { force: true });
  await copyIfExists(path.join(storefrontRoot, 'artist-storefronts.css'), path.join(bundleRoot, 'artist-storefronts.css'));
  await copyIfExists(path.join(storefrontRoot, 'assets', 'mcp-implementation'), path.join(bundleRoot, 'assets', 'mcp-implementation'));
  await copyIfExists(
    path.join(storefrontRoot, 'NexusArtistPrimePackage', 'assets', 'mcp-implementation', 'mcp-effects.css'),
    path.join(bundleRoot, 'assets', 'mcp-implementation', 'mcp-effects.css')
  );
  await copyIfExists(path.resolve('metraiyux_0s_site/assets/js/0s-command-bridge.js'), path.join(bundleRoot, 'assets/js/0s-command-bridge.js'));
  await copyIfExists(path.join(musicRoot, 'assets'), path.join(bundleRoot, 'shared/SkyeMusicNexus/assets'));
  await copyIfExists(path.join(musicRoot, 'public'), path.join(bundleRoot, 'shared/SkyeMusicNexus/public'));
  await fs.rm(path.join(bundleRoot, 'shared/SkyeMusicNexus/public/MCP_TOOLING_RECEIPT.json'), { force: true });
  await rewriteBundleText(bundleRoot, target.slug, storefrontSlugs, slugToLiveUrl);
  const stats = await bundleStats(bundleRoot);
  return {
    ...target,
    bundleDir: rel(bundleRoot),
    sourceRoot: rel(bundleRoot),
    files: stats.files,
    bytes: stats.bytes,
    mb: Number((stats.bytes / 1024 / 1024).toFixed(2))
  };
}

async function bundleStats(root) {
  const files = await walkFiles(root);
  let bytes = 0;
  for (const file of files) bytes += (await fs.stat(file)).size;
  return { files: files.length, bytes };
}

const storefrontSlugs = await existingStorefrontSlugs();
const slugToLiveUrl = new Map(targets.map((target) => [target.slug, target.liveUrl]));
await fs.rm(outRoot, { recursive: true, force: true });
await fs.mkdir(outRoot, { recursive: true });
const bundles = [];
for (const target of targets) bundles.push(await buildBundle(target, storefrontSlugs, slugToLiveUrl));
const receipt = {
  schema: 'musicnexus.skynet.public_bundle.repair.v1',
  generated_at: new Date().toISOString(),
  no_browser_proof_run: true,
  owner_manual_live_check: true,
  source_root: rel(musicRoot),
  bundle_root: rel(outRoot),
  bundles
};
await fs.mkdir(path.dirname(receiptPath), { recursive: true });
await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
