import { promises as fs } from 'node:fs';
import path from 'node:path';

async function walk(dir, root = dir, out = {}) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'tmp'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll(path.sep, '/');
    if (entry.isDirectory()) {
      await walk(full, root, out);
    } else {
      const stat = await fs.stat(full).catch(() => null);
      if (stat && stat.size < 512_000) out[rel] = await fs.readFile(full, 'utf8').catch(() => '');
    }
  }
  return out;
}

export async function loadProjectFileMap(rootDir = process.cwd()) { return walk(rootDir); }

function hasPath(files, re) { return Object.keys(files).some(p => re.test(p)); }
function readPackage(files) { try { return JSON.parse(files['package.json'] || '{}'); } catch { return {}; } }

export function detectFrameworks(files = {}) {
  const pkg = readPackage(files);
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const scripts = pkg.scripts || {};
  const frameworks = [];
  const add = (id, confidence, evidence, commands = {}) => frameworks.push({ id, confidence, evidence, commands });
  if (deps.next || hasPath(files, /^app\//) || hasPath(files, /^pages\//)) add('next', deps.next ? 95 : 70, deps.next ? 'package.json depends on next' : 'app/pages directory detected', { dev: 'npm run dev', build: 'npm run build', start: 'npm run start' });
  if (deps.vite || hasPath(files, /^vite\.config\./)) add('vite', deps.vite ? 95 : 80, deps.vite ? 'package.json depends on vite' : 'vite config detected', { dev: 'npm run dev', build: 'npm run build', preview: 'npm run preview' });
  if (deps.react || hasPath(files, /\.(jsx|tsx)$/)) add('react', deps.react ? 90 : 65, deps.react ? 'react dependency detected' : 'jsx/tsx files detected', {});
  if (deps.svelte || hasPath(files, /^svelte\.config\./)) add('sveltekit', deps['@sveltejs/kit'] ? 92 : 70, 'svelte files/config detected', { dev: 'npm run dev', build: 'npm run build' });
  if (deps.vue || hasPath(files, /\.vue$/)) add('vue', deps.vue ? 90 : 65, 'vue files/dependency detected', { dev: 'npm run dev', build: 'npm run build' });
  if (hasPath(files, /^netlify\/functions\//) || files['netlify.toml']) add('netlify-functions', 90, 'netlify functions/config detected', { functions: 'netlify functions:serve' });
  if (files['wrangler.toml'] || hasPath(files, /^src\/worker\./) || hasPath(files, /^functions\//)) add('cloudflare-workers', 75, 'worker/config pattern detected', { dev: 'wrangler dev', deploy: 'wrangler deploy' });
  if (files['index.html'] && frameworks.length === 0) add('static-html', 85, 'root index.html detected', { preview: 'static file server' });
  if (!frameworks.length && Object.keys(files).length) add('unknown', 35, 'no known framework markers detected', {});
  return frameworks.sort((a, b) => b.confidence - a.confidence);
}

export function buildFrameworkAdapterManifest(files = {}) {
  const pkg = readPackage(files);
  const frameworks = detectFrameworks(files);
  const primary = frameworks[0] || { id: 'unknown', confidence: 0, commands: {} };
  const scripts = pkg.scripts || {};
  const command = (name, fallback = null) => scripts[name] ? `npm run ${name}` : fallback;
  return {
    generatedAt: new Date().toISOString(),
    primaryFramework: primary.id,
    confidence: primary.confidence,
    frameworks,
    entrypoints: Object.keys(files).filter(p => /(^|\/)index\.html$|^src\/(main|index)\.|^app\/(page|layout)\.|^pages\/index\./i.test(p)).sort(),
    commands: {
      install: files['package.json'] ? 'npm install' : null,
      dev: command('dev', primary.commands?.dev || null),
      build: command('build', primary.commands?.build || null),
      test: command('test', 'node tools/smoke-check.mjs'),
      preview: command('preview', primary.commands?.preview || null),
    },
    adapterContracts: [
      { id: 'workspace-load', required: true, description: 'Can load project file map into evaluator memory' },
      { id: 'preview', required: true, description: 'Can preview selected entrypoint or framework dev server URL' },
      { id: 'proof', required: true, description: 'Can run deterministic smoke/proof commands without live provider keys' },
      { id: 'seed-materialization', required: false, description: 'Can materialize platform-seed assets into generated platform data' },
    ],
  };
}
