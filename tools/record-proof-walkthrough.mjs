import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { extname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const args = parseArgs(process.argv.slice(2));
const configPath = args.config || args.c || 'proof-recipes/metraiyux-public-proof.json';
const config = readJson(resolve(repoRoot, configPath));
const slug = config.slug || slugify(config.name || 'proof-walkthrough');
const outDir = resolve(repoRoot, args.out || config.outDir || join('test-artifacts', 'proof-recordings', slug));
const frameDir = join(outDir, 'frames');
const videoDir = join(outDir, 'recording');
const mode = args.mode || config.mode || 'frames';
const frameSeconds = Number(args.frameSeconds || config.frameSeconds || 7);
const viewport = config.viewport || { width: 1440, height: 900 };
const videoSize = config.videoSize || viewport;
const finalMp4 = join(outDir, `${slug}-proof-walkthrough.mp4`);
const reportPath = join(outDir, `${slug}-proof-report.json`);

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
]);

function parseArgs(items) {
  const parsed = {};
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item.startsWith('--')) continue;
    const [key, inline] = item.slice(2).split('=');
    parsed[key] = inline ?? items[i + 1] ?? true;
    if (inline === undefined && items[i + 1] && !items[i + 1].startsWith('--')) i += 1;
  }
  return parsed;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'proof';
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

function startStaticServer(root) {
  const absoluteRoot = resolve(repoRoot, root);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filePath = resolve(absoluteRoot, `.${pathname}`);
    if (!filePath.startsWith(absoluteRoot) || !existsSync(filePath)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': mime.get(extname(filePath).toLowerCase()) || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => resolveServer({ server, baseUrl: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch (error) {
    throw new Error(`Playwright is required for proof recording. Run: npm install. Original error: ${error.message}`);
  }
}

async function caption(page, title, body = '') {
  await page.evaluate(({ title, body }) => {
    const safe = (text) => String(text || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    let proof = document.querySelector('[data-proof-caption]');
    if (!proof) {
      proof = document.createElement('div');
      proof.setAttribute('data-proof-caption', 'true');
      proof.style.cssText = [
        'position:fixed',
        'left:22px',
        'bottom:22px',
        'z-index:2147483647',
        'max-width:min(700px,calc(100vw - 44px))',
        'padding:16px 18px',
        'border:1px solid rgba(99,241,255,.68)',
        'background:rgba(3,10,22,.9)',
        'box-shadow:0 0 28px rgba(99,241,255,.28),inset 0 0 20px rgba(255,210,106,.08)',
        'color:#f8fbff',
        'font:600 16px/1.35 Inter,Arial,sans-serif',
        'border-radius:8px',
        'backdrop-filter:blur(12px)',
      ].join(';');
      document.body.appendChild(proof);
    }
    proof.innerHTML = `<div style="color:#63f1ff;text-transform:uppercase;letter-spacing:.12em;font-size:11px;margin-bottom:6px;">Browser proof capture</div><div style="font-size:19px;">${safe(title)}</div>${body ? `<div style="margin-top:7px;color:#cbd9ef;font-weight:500;font-size:14px;">${safe(body)}</div>` : ''}`;
  }, { title, body });
}

async function setValue(page, selector, value) {
  await page.evaluate(({ selector, value }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, value });
}

async function selectValue(page, selector, value) {
  await page.evaluate(({ selector, value }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const option = [...el.options].find((item) => item.value === value || item.textContent.trim() === value);
    if (option) el.value = option.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, value });
}

async function checkValue(page, selector, value) {
  await page.evaluate(({ selector, value }) => {
    const nodes = selector ? [...document.querySelectorAll(selector)] : [...document.querySelectorAll('input[type="checkbox"],input[type="radio"]')];
    const el = nodes.find((node) => node.value === value || node.getAttribute('aria-label') === value);
    if (!el) return;
    el.checked = true;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, value });
}

async function clickTarget(page, action) {
  if (action.selector) {
    await page.locator(action.selector).first().evaluate((el) => el.click());
    return;
  }
  if (action.text) {
    await page.getByText(action.text, { exact: action.exact !== false }).first().evaluate((el) => el.click());
  }
}

async function captureFrame(page, frames, name) {
  const file = join(frameDir, `frame-${String(frames.length + 1).padStart(3, '0')}-${slugify(name || 'proof')}.png`);
  await page.screenshot({ path: file, fullPage: false, animations: 'disabled', timeout: 45000 });
  frames.push({ name: name || `Frame ${frames.length + 1}`, file });
}

async function runAction(page, action, frames) {
  switch (action.type) {
    case 'caption':
      await caption(page, action.title || '', action.body || '');
      break;
    case 'fill':
      await setValue(page, action.selector, action.value || '');
      break;
    case 'select':
      await selectValue(page, action.selector, action.value || action.label || '');
      break;
    case 'check':
      await checkValue(page, action.selector, action.value || action.label || '');
      break;
    case 'click':
      await clickTarget(page, action);
      break;
    case 'scroll':
      await page.mouse.wheel(action.x || 0, action.y || action.amount || 700);
      break;
    case 'wait':
      await wait(Number(action.ms || 1000));
      break;
    case 'screenshot':
      await captureFrame(page, frames, action.name);
      break;
    default:
      throw new Error(`Unknown proof action type: ${action.type}`);
  }
  if (action.afterMs) await wait(Number(action.afterMs));
}

function buildFramesVideo(frames) {
  if (!frames.length) throw new Error('No proof frames captured.');
  const concatFile = join(frameDir, 'frames.ffconcat');
  const lines = ['ffconcat version 1.0'];
  for (const frame of frames) {
    lines.push(`file '${resolve(frame.file).replaceAll("'", "'\\''")}'`);
    lines.push(`duration ${frameSeconds}`);
  }
  lines.push(`file '${resolve(frames.at(-1).file).replaceAll("'", "'\\''")}'`);
  writeFileSync(concatFile, `${lines.join('\n')}\n`);
  const result = spawnSync('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-vf', `scale=${videoSize.width}:${videoSize.height}:force_original_aspect_ratio=decrease,pad=${videoSize.width}:${videoSize.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
    '-r', '25',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', String(config.crf || 24),
    '-movflags', '+faststart',
    '-an',
    finalMp4,
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffmpeg failed:\n${result.stderr || result.stdout}`);
}

function copyRecordedVideo() {
  const videoFiles = readdirSync(videoDir)
    .filter((file) => file.endsWith('.webm'))
    .map((file) => join(videoDir, file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!videoFiles[0]) return null;
  const output = join(outDir, `${slug}-raw-browser-recording.webm`);
  spawnSync('cp', [videoFiles[0], output]);
  return output;
}

async function main() {
  rmSync(frameDir, { recursive: true, force: true });
  rmSync(videoDir, { recursive: true, force: true });
  mkdirSync(frameDir, { recursive: true });
  mkdirSync(videoDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const { chromium } = await loadPlaywright();
  const localServer = config.siteRoot ? await startStaticServer(config.siteRoot) : null;
  const baseUrl = (args.baseUrl || config.baseUrl || localServer?.baseUrl || '').replace(/\/$/, '');
  if (!baseUrl) throw new Error('Config needs either siteRoot or baseUrl.');

  const browser = await chromium.launch({
    headless: true,
    args: config.browserArgs || ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox'],
  });
  const contextOptions = {
    viewport,
    deviceScaleFactor: config.deviceScaleFactor || 1,
  };
  if (mode === 'video') {
    contextOptions.recordVideo = { dir: videoDir, size: videoSize };
  }
  const context = await browser.newContext(contextOptions);
  for (const pattern of config.blockUrls || []) {
    await context.route(pattern, (route) => route.abort('failed'));
  }
  const page = await context.newPage();
  page.setDefaultTimeout(config.defaultTimeout || 12000);
  const frames = [];
  const routeLog = [];

  try {
    for (const chapter of config.chapters || []) {
      const target = chapter.url || `${baseUrl}/${chapter.path || ''}`.replace(/([^:]\/)\/+/g, '$1');
      console.log(`proof chapter: ${chapter.title || target}`);
      await page.goto(target, { waitUntil: chapter.waitUntil || 'domcontentloaded', timeout: chapter.timeout || 30000 });
      await page.waitForLoadState('networkidle', { timeout: chapter.networkIdleTimeout || 5000 }).catch(() => {});
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      await caption(page, chapter.title || '', chapter.body || '');
      if (chapter.holdMs) await wait(Number(chapter.holdMs));
      routeLog.push({ title: chapter.title, path: chapter.path || chapter.url });
      for (const action of chapter.actions || []) {
        await runAction(page, action, frames);
      }
      if (chapter.capture !== false) await captureFrame(page, frames, chapter.frameName || chapter.title || 'chapter');
    }
  } finally {
    await context.close().catch((error) => console.warn(`context close warning: ${error.message}`));
    await browser.close().catch(() => {});
    localServer?.server.close();
  }

  const rawVideo = mode === 'video' ? copyRecordedVideo() : null;
  if (mode === 'frames' || !rawVideo) buildFramesVideo(frames);

  const report = {
    generated_at: new Date().toISOString(),
    name: config.name || slug,
    slug,
    mode,
    baseUrl,
    output: {
      finalMp4: mode === 'frames' || !rawVideo ? finalMp4 : rawVideo,
      rawVideo,
      outDir,
      reportPath,
    },
    frames,
    routeLog,
    boundaries: config.boundaries || [
      'No private .env values or secrets should be shown in public proof captures.',
      'Public proof should demonstrate user-visible behavior and name any provider or production gates honestly.',
    ],
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, video: report.output.finalMp4, report: reportPath, frames: frames.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
