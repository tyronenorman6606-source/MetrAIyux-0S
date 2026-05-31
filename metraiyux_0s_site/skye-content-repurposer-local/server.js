import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const SHELL_ENV_KEYS = new Set(Object.keys(process.env));

loadDotEnv(path.join(REPO_ROOT, '.env'));
loadDotEnv(path.join(__dirname, '.env'), { override: true, protectKeys: SHELL_ENV_KEYS });
applyEnvAliases();

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const EXPORT_DIR = path.resolve(__dirname, process.env.EXPORT_DIR || 'exports');
const DRAFTS_FILE = path.join(DATA_DIR, 'drafts.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PUBLISH_QUEUE_FILE = path.join(DATA_DIR, 'publish-queue.json');
const PUBLISH_LOG_FILE = path.join(DATA_DIR, 'publish-log.json');
const STATIC_SITE_DIR = path.resolve(__dirname, process.env.STATIC_SITE_DIR || 'site-build');
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const PORT = Number(process.env.PORT || 4313);
const APP_NAME = process.env.APP_NAME || 'Skye Content Forge';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Skyes Over London';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const LOCAL_DEV_GATE_TOKEN = process.env.LOCAL_DEV_GATE_TOKEN || 'FREE99-CONTENT-LOCAL';
const GATE_SESSION_REQUIRED = process.env.GATE_SESSION_REQUIRED !== '0';

const SOURCE_REGISTRY = [
  {
    id: 'animalz',
    name: 'Animalz Blog',
    homeUrl: 'https://www.animalz.co/blog',
    allowedHosts: ['animalz.co', 'www.animalz.co'],
    articlePathPatterns: [/^\/blog\/[^/]+\/?$/i],
    topic: 'content strategy, writing, SEO, distribution, SaaS growth'
  },
  {
    id: 'openai',
    name: 'OpenAI News / Blog',
    homeUrl: 'https://openai.com/news/',
    feedUrls: ['https://openai.com/news/rss.xml'],
    allowedHosts: ['openai.com', 'www.openai.com'],
    articlePathPatterns: [/^\/index\/[^/]+\/?$/i, /^\/news\/[^/]+\/?$/i, /^\/research\/[^/]+\/?$/i],
    topic: 'frontier AI, product releases, safety, enterprise adoption, research'
  },
  {
    id: 'google-research',
    name: 'Google Research Blog',
    homeUrl: 'https://research.google/blog/',
    allowedHosts: ['research.google'],
    articlePathPatterns: [/^\/blog\/[^/]+\/?$/i],
    topic: 'computer science research, AI systems, applied machine learning, data science'
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind Blog',
    homeUrl: 'https://deepmind.google/blog/',
    allowedHosts: ['deepmind.google'],
    articlePathPatterns: [/^\/blog\/[^/]+\/?$/i, /^\/discover\/blog\/[^/]+\/?$/i],
    topic: 'AI breakthroughs, models, scientific discovery, AI safety, agents'
  },
  {
    id: 'nvidia',
    name: 'NVIDIA Blog',
    homeUrl: 'https://blogs.nvidia.com/',
    allowedHosts: ['blogs.nvidia.com'],
    articlePathPatterns: [/^\/blog\/[^/]+\/?$/i, /^\/blog\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/?$/i, /^\/blog\/tag\/artificial-intelligence\/?$/i],
    topic: 'AI infrastructure, GPUs, inference, robotics, simulation, accelerated computing'
  },
  {
    id: 'mit-tech-review',
    name: 'MIT Technology Review — AI',
    homeUrl: 'https://www.technologyreview.com/artificial-intelligence/',
    allowedHosts: ['technologyreview.com', 'www.technologyreview.com'],
    articlePathPatterns: [/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/?$/i, /^\/s\/\d+\/[^/]+\/?$/i],
    topic: 'AI industry analysis, emerging technology, policy, trends, risks, business impact'
  },
  {
    id: 'scale',
    name: 'Scale AI Blog',
    homeUrl: 'https://scale.com/blog',
    allowedHosts: ['scale.com', 'www.scale.com'],
    articlePathPatterns: [/^\/blog\/[^/]+\/?$/i],
    topic: 'data engine, evaluations, enterprise AI, frontier model operations, agent benchmarks'
  },
  {
    id: 'uipath-ai',
    name: 'UiPath AI Blog',
    homeUrl: 'https://www.uipath.com/blog/ai',
    allowedHosts: ['uipath.com', 'www.uipath.com'],
    articlePathPatterns: [/^\/blog\/ai\/[^/]+\/?$/i, /^\/blog\/automation\/[^/]+\/?$/i, /^\/ai\/research\/[^/]+\/?$/i],
    topic: 'agentic automation, RPA, AI governance, workflow automation, enterprise operations'
  }
];

await fs.mkdir(DATA_DIR, { recursive: true });
await fs.mkdir(EXPORT_DIR, { recursive: true });
await ensureJsonFile(DRAFTS_FILE, []);
await ensureJsonFile(SETTINGS_FILE, defaultSettings());
await ensureJsonFile(PUBLISH_QUEUE_FILE, []);
await ensureJsonFile(PUBLISH_LOG_FILE, []);
await fs.mkdir(STATIC_SITE_DIR, { recursive: true });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error?.message || 'Internal server error'
    });
  }
});

server.listen(PORT, () => {
  console.log(`${APP_NAME} is running at http://localhost:${PORT}`);
  console.log(`AI key configured: ${Boolean(process.env.OPENAI_API_KEY) ? 'yes' : 'no'}`);
  console.log(`Local exports folder: ${EXPORT_DIR}`);
  console.log(`Static site build folder: ${STATIC_SITE_DIR}`);
});

if (truthy(process.env.PUBLISHER_AUTORUN)) {
  const seconds = Math.max(60, Number(process.env.PUBLISHER_POLL_SECONDS || 900));
  setInterval(() => {
    runPublisher({ mode: 'due', source: 'autorun' }).catch((error) => {
      console.error('Publisher autorun failed:', error.message);
    });
  }, seconds * 1000);
}

async function handleApi(req, res, url) {
  setSecurityHeaders(res);

  if (requiresAppAccessToken(req, url) && !(await hasValidAppAccessToken(req, url))) {
    sendJson(res, 401, { ok: false, error: gateAccessErrorMessage() });
    return;
  }

  if (url.pathname.startsWith('/api/automation/') && !hasValidSchedulerToken(req, url)) {
    sendJson(res, 401, { ok: false, error: 'Scheduler token required. Set SCHEDULER_API_KEY and pass it as X-Scheduler-Key, Bearer token, or ?key=.' });
    return;
  }

  if (url.pathname.startsWith('/api/backup/') && !hasValidSchedulerToken(req, url)) {
    sendJson(res, 401, { ok: false, error: 'Backup token required. Set SCHEDULER_API_KEY and pass it as X-Scheduler-Key, Bearer token, or ?key=.' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      appName: APP_NAME,
      companyName: COMPANY_NAME,
      model: OPENAI_MODEL,
      keyConfigured: Boolean(process.env.OPENAI_API_KEY),
      sources: SOURCE_REGISTRY.map(publicSource),
      storage: {
        draftsFile: path.relative(__dirname, DRAFTS_FILE),
        settingsFile: path.relative(__dirname, SETTINGS_FILE),
        exportDir: path.relative(__dirname, EXPORT_DIR)
      },
      skyeVaultR2: skyeVaultStatus(),
      googleDrive: driveStatus(),
      publisher: publisherStatus(),
      runtime: runtimeStatus(),
      backup: backupStatus()
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/sources') {
    sendJson(res, 200, { ok: true, sources: SOURCE_REGISTRY.map(publicSource) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/runtime/status') {
    sendJson(res, 200, { ok: true, runtime: runtimeStatus(), backup: backupStatus() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/automation/tick') {
    const body = await readJsonBody(req).catch(() => ({}));
    const result = await runAutomationTick({
      source: body.source || url.searchParams.get('source') || 'external-scheduler',
      dryRun: truthy(body.dryRun) || truthy(url.searchParams.get('dryRun')),
      backup: body.backup === undefined ? undefined : truthy(body.backup)
    });
    sendJson(res, 200, { ok: true, ...result });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/backup/github') {
    const result = await backupDataToGitHub();
    sendJson(res, 200, { ok: true, backup: result });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/backup/github/restore') {
    const body = await readJsonBody(req).catch(() => ({}));
    const result = await restoreDataFromGitHub({ apply: truthy(body.apply) });
    sendJson(res, 200, { ok: true, restore: result });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/source/scan') {
    const sourceId = url.searchParams.get('source') || 'animalz';
    const customUrl = url.searchParams.get('url') || '';
    const result = await scanSource(sourceId, customUrl);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/source/scan-all') {
    const results = [];
    for (const source of SOURCE_REGISTRY) {
      try {
        results.push(await scanSource(source.id));
      } catch (error) {
        results.push({ ok: false, source: publicSource(source), error: error.message, posts: [] });
      }
    }
    sendJson(res, 200, {
      ok: true,
      scannedAt: new Date().toISOString(),
      count: results.reduce((sum, item) => sum + (item.posts?.length || 0), 0),
      results,
      posts: dedupePosts(results.flatMap((item) => item.posts || []))
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/source/article') {
    const body = await readJsonBody(req);
    const articleUrl = requireUrl(body.url, 'Article URL is required.');
    const source = findSourceForUrl(articleUrl);
    if (!source) {
      sendJson(res, 400, {
        ok: false,
        error: 'This local build only fetches from the approved source registry. Add a source in SOURCE_REGISTRY if you want more domains.'
      });
      return;
    }
    const html = await fetchHtml(articleUrl);
    const article = extractArticle(html, articleUrl, source);
    sendJson(res, 200, { ok: true, source: publicSource(source), article });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/repurpose') {
    const body = await readJsonBody(req);
    const output = await repurposeContent(body);
    const draft = await saveDraft({
      title: output.title,
      sourceUrl: body?.source?.url || body?.sourceUrl || '',
      sourceTitle: body?.source?.title || '',
      sourceName: body?.source?.sourceName || '',
      format: body?.format || 'content-pack',
      output: output.markdown,
      metadata: output.metadata,
      autoSaved: true
    });
    sendJson(res, 200, { ok: true, draft, output });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/drafts') {
    const drafts = await readJson(DRAFTS_FILE, []);
    sendJson(res, 200, { ok: true, drafts: drafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/drafts') {
    const body = await readJsonBody(req);
    const draft = await saveDraft({
      title: body.title || 'Untitled Skye draft',
      sourceUrl: body.sourceUrl || '',
      sourceTitle: body.sourceTitle || '',
      sourceName: body.sourceName || '',
      format: body.format || 'manual',
      output: body.output || '',
      metadata: body.metadata || {},
      autoSaved: false
    });
    sendJson(res, 200, { ok: true, draft });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/drafts/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/drafts/', ''));
    const drafts = await readJson(DRAFTS_FILE, []);
    const next = drafts.filter((draft) => draft.id !== id);
    await writeJson(DRAFTS_FILE, next);
    sendJson(res, 200, { ok: true, deleted: drafts.length !== next.length });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/settings') {
    sendJson(res, 200, { ok: true, settings: await readJson(SETTINGS_FILE, defaultSettings()) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/settings') {
    const body = await readJsonBody(req);
    const settings = {
      ...defaultSettings(),
      ...(await readJson(SETTINGS_FILE, defaultSettings())),
      ...body,
      updatedAt: new Date().toISOString()
    };
    await writeJson(SETTINGS_FILE, settings);
    sendJson(res, 200, { ok: true, settings });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/export/status') {
    sendJson(res, 200, { ok: true, local: { exportDir: path.relative(__dirname, EXPORT_DIR) }, googleDrive: driveStatus() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/export/local') {
    const body = await readJsonBody(req);
    const result = await exportMarkdownLocal(body);
    sendJson(res, 200, { ok: true, export: result });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/export/skyevault-r2') {
    const body = await readJsonBody(req);
    const result = await uploadMarkdownToSkyeVault(body);
    sendJson(res, 200, { ok: true, skyeVaultFile: result });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/export/google-drive') {
    const body = await readJsonBody(req);
    const result = await uploadMarkdownToDrive(body);
    sendJson(res, 200, { ok: true, driveFile: result });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/exports') {
    const files = await listExports();
    sendJson(res, 200, { ok: true, files });
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/exports/download/')) {
    const fileName = decodeURIComponent(url.pathname.replace('/api/exports/download/', ''));
    const safeName = path.basename(fileName);
    const filePath = path.join(EXPORT_DIR, safeName);
    if (!filePath.startsWith(EXPORT_DIR) || !existsSync(filePath)) {
      sendJson(res, 404, { ok: false, error: 'Export file not found.' });
      return;
    }
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName.replace(/"/g, '')}"`
    });
    res.end(data);
    return;
  }


  if (req.method === 'GET' && url.pathname === '/api/pipeline/status') {
    sendJson(res, 200, { ok: true, status: publisherStatus() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/publish/queue') {
    const queue = await readJson(PUBLISH_QUEUE_FILE, []);
    sendJson(res, 200, { ok: true, queue: queue.sort((a, b) => new Date(a.publishAt || a.createdAt) - new Date(b.publishAt || b.createdAt)) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/publish/log') {
    const log = await readJson(PUBLISH_LOG_FILE, []);
    sendJson(res, 200, { ok: true, log: log.slice(-100).reverse() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/publish/schedule') {
    const body = await readJsonBody(req);
    const item = await schedulePublishItem(body);
    sendJson(res, 200, { ok: true, item });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/publish/run') {
    const body = await readJsonBody(req);
    const result = await runPublisher(body || {});
    sendJson(res, 200, { ok: true, ...result });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/site/rebuild') {
    const body = await readJsonBody(req);
    const result = await rebuildStaticSite(body?.includeQueued ? 'include-queued' : 'published-only');
    sendJson(res, 200, { ok: true, site: result });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/deploy/netlify') {
    const body = await readJsonBody(req);
    const result = body?.mode === 'cli' ? await deployNetlifyCli() : await triggerNetlifyHook();
    sendJson(res, 200, { ok: true, deploy: result });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/deploy/cloudflare') {
    const body = await readJsonBody(req);
    const result = body?.mode === 'wrangler' ? await deployCloudflareWrangler() : await triggerCloudflareHook();
    sendJson(res, 200, { ok: true, deploy: result });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'API route not found.' });
}

async function scanSource(sourceId, customUrl = '') {
  const source = getSource(sourceId);
  const scanUrl = customUrl ? requireUrl(customUrl, 'Scan URL is invalid.') : source.homeUrl;
  const matchingSource = findSourceForUrl(scanUrl) || source;
  if (!isUrlAllowedForSource(scanUrl, matchingSource, { allowHome: true })) {
    throw new Error(`Scan URL is not allowed for ${source.name}.`);
  }

  let posts = [];
  const feedPosts = await scanFeeds(source);
  if (feedPosts.length) posts = feedPosts;

  const html = await fetchHtml(scanUrl);
  const pagePosts = extractSourceLinks(html, scanUrl, source);
  posts = dedupePosts([...posts, ...pagePosts]).slice(0, 100);

  return {
    ok: true,
    source: publicSource(source),
    sourceUrl: scanUrl,
    scannedAt: new Date().toISOString(),
    count: posts.length,
    posts
  };
}

async function scanFeeds(source) {
  const posts = [];
  for (const feedUrl of source.feedUrls || []) {
    try {
      const xml = await fetchText(feedUrl, 'application/rss+xml,application/xml,text/xml,*/*');
      posts.push(...extractFeedItems(xml, source));
    } catch {
      // Feeds are best-effort; page scanning still runs.
    }
  }
  return posts;
}

function extractFeedItems(xml, source) {
  const items = [...String(xml || '').matchAll(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi)];
  return items.map((m) => {
    const block = m[0];
    const url = cleanText(stripTags(matchFirstRaw(block, /<link[^>]*href=["']([^"']+)["'][^>]*>/i) || matchFirstRaw(block, /<link[^>]*>([\s\S]*?)<\/link>/i)));
    const href = url || getAttr(block.match(/<link[^>]+href=["'][^"']+["'][^>]*>/i)?.[0] || '', 'href');
    const absolute = normalizeUrl(href, source.homeUrl);
    if (!absolute || !isUrlAllowedForSource(absolute, source)) return null;
    const title = cleanText(stripTags(matchFirstRaw(block, /<title[^>]*>([\s\S]*?)<\/title>/i))) || titleFromUrl(absolute);
    const excerpt = cleanText(stripTags(matchFirstRaw(block, /<description[^>]*>([\s\S]*?)<\/description>/i) || matchFirstRaw(block, /<summary[^>]*>([\s\S]*?)<\/summary>/i))).slice(0, 240);
    const date = cleanText(stripTags(matchFirstRaw(block, /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || matchFirstRaw(block, /<updated[^>]*>([\s\S]*?)<\/updated>/i) || matchFirstRaw(block, /<published[^>]*>([\s\S]*?)<\/published>/i)));
    return { title, url: absolute, date, excerpt, source: source.name, sourceId: source.id, topic: source.topic };
  }).filter(Boolean);
}

async function repurposeContent(body) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing. Add it to .env, then restart the app.');
  }

  const source = body.source || {};
  const sourceUrl = requireUrl(source.url || body.sourceUrl, 'Source article URL is required.');
  const sourceInfo = findSourceForUrl(sourceUrl);
  const sourceText = String(source.text || body.sourceText || '').trim();
  if (sourceText.length < 400) {
    throw new Error('Source article text is too short. Fetch the article first, then generate.');
  }

  const settings = {
    ...defaultSettings(),
    ...(await readJson(SETTINGS_FILE, defaultSettings())),
    ...(body.brandProfile || {})
  };

  const format = body.format || 'full-content-pack';
  const target = body.target || settings.targetAudience;
  const keywords = body.keywords || settings.defaultKeywords;
  const cta = body.cta || settings.defaultCta;
  const sourceDigest = sourceText.slice(0, 28000);

  const input = [
    {
      role: 'system',
      content: [
        'You are SkyeDexia, the private content strategy engine for Skyes Over London.',
        'Create original, transformed marketing content. Do not copy phrases, sections, examples, or structure from the source article.',
        'Use the source only for topic discovery, strategic angles, factual prompts, and market signal extraction.',
        'Tailor every output for a Phoenix-area AI, automation, web, SEO, AEO, and local growth company.',
        'Include attribution as a short source reference line. Do not imply partnership, endorsement, or affiliation with the source publisher.',
        'Write decisively, commercially, practically, and with information gain. Avoid generic marketing filler.',
        'Never claim a customer result, certification, guarantee, legal status, direct quote, or live implementation unless the user supplied proof.'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `Company: ${settings.companyName}`,
        `Brand offer: ${settings.offer}`,
        `Service area: ${settings.serviceArea}`,
        `Audience: ${target}`,
        `Voice: ${settings.voice}`,
        `Required keywords/topics: ${keywords}`,
        `Preferred CTA: ${cta}`,
        `Requested output format: ${format}`,
        `Source publisher: ${source.sourceName || sourceInfo?.name || 'Approved source'}`,
        `Source title: ${source.title || 'Unknown title'}`,
        `Source URL: ${sourceUrl}`,
        '',
        'Build the output with these sections:',
        '1. Repurpose Strategy: why this source angle matters for Skyes Over London.',
        '2. Original Content Asset: the finished asset in the requested format.',
        '3. Local SEO/GEO/AEO Layer: title tag, meta description, slug, target keywords, FAQ ideas, answer-engine snippet, schema suggestions, and local internal-link targets.',
        '4. Distribution Pack: LinkedIn post, short email/newsletter blurb, 5 social hooks, 3 sales follow-up angles, and 3 content upgrades.',
        '5. Compliance Notes: short reminder that the output is transformed, not copied, and source claims should be verified before publishing.',
        '',
        'Source material to transform, not copy:',
        sourceDigest
      ].join('\n')
    }
  ];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  const markdown = extractOpenAIText(data).trim();
  if (!markdown) {
    throw new Error('The AI returned an empty response. Try a shorter source article or a different model.');
  }

  const title = inferTitle(markdown, source.title || 'Skye Repurposed Content');
  return {
    title,
    markdown,
    metadata: {
      model: OPENAI_MODEL,
      sourceUrl,
      sourceTitle: source.title || '',
      sourceName: source.sourceName || sourceInfo?.name || '',
      format,
      generatedAt: new Date().toISOString(),
      sourceCharsUsed: sourceDigest.length,
      companyName: settings.companyName
    }
  };
}

function extractOpenAIText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') parts.push(content.text);
      if (typeof content?.type === 'string' && typeof content?.value === 'string') parts.push(content.value);
    }
  }
  return parts.join('\n');
}

function inferTitle(markdown, fallback) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1] || markdown.match(/^##\s+(.+)$/m)?.[1];
  return cleanText(heading || fallback).slice(0, 120);
}

async function saveDraft(input) {
  const drafts = await readJson(DRAFTS_FILE, []);
  const now = new Date().toISOString();
  const draft = {
    id: crypto.randomUUID(),
    title: input.title || 'Untitled Skye draft',
    sourceUrl: input.sourceUrl || '',
    sourceTitle: input.sourceTitle || '',
    sourceName: input.sourceName || '',
    format: input.format || 'content-pack',
    output: input.output || '',
    metadata: input.metadata || {},
    autoSaved: Boolean(input.autoSaved),
    createdAt: now,
    updatedAt: now
  };
  drafts.push(draft);
  await writeJson(DRAFTS_FILE, drafts);
  return draft;
}

async function exportMarkdownLocal(input) {
  const title = input.title || 'skye-content-export';
  const output = String(input.output || '').trim();
  if (!output) throw new Error('There is no output to export.');
  const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}-${slugify(title)}.md`;
  const filePath = path.join(EXPORT_DIR, fileName);
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  await fs.writeFile(filePath, output, 'utf8');
  return {
    fileName,
    relativePath: path.relative(__dirname, filePath),
    absolutePath: filePath,
    downloadUrl: `/api/exports/download/${encodeURIComponent(fileName)}`,
    exportedAt: new Date().toISOString()
  };
}

async function uploadMarkdownToDrive(input) {
  const status = driveStatus();
  if (!status.configured) {
    throw new Error(`Google Drive is not configured. Missing: ${status.missing.join(', ')}`);
  }
  const title = input.title || 'skye-content-export';
  const output = String(input.output || '').trim();
  if (!output) throw new Error('There is no output to upload.');
  const fileName = `${slugify(title)}-${new Date().toISOString().slice(0, 10)}.md`;
  const token = await getGoogleDriveAccessToken();
  const boundary = `skye_${crypto.randomBytes(12).toString('hex')}`;
  const metadata = {
    name: `${process.env.GOOGLE_DRIVE_EXPORT_PREFIX || 'Skye Content Forge - '}${fileName}`,
    mimeType: 'text/markdown',
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
  };
  const multipart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/markdown; charset=UTF-8',
    '',
    output,
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const uploadParams = new URLSearchParams({
    uploadType: 'multipart',
    fields: 'id,name,webViewLink,webContentLink,mimeType,size,parents,driveId'
  });
  if (process.env.GOOGLE_DRIVE_SUPPORTS_ALL_DRIVES !== '0') uploadParams.set('supportsAllDrives', 'true');
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?${uploadParams.toString()}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipart
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Google Drive upload failed with status ${response.status}.`;
    if (/Service Accounts do not have storage quota/i.test(message)) {
      throw new Error(`${message} Set GOOGLE_DRIVE_FOLDER_ID to a writable Shared Drive folder, or use delegated OAuth for a user-owned Drive folder.`);
    }
    throw new Error(message);
  }
  return { ...data, uploadedAt: new Date().toISOString() };
}

let skyeVaultModulePromise = null;

function skyeVaultStatus() {
  const modulePath = path.join(REPO_ROOT, 'SkyeVault-Drop/netlify/functions/_lib/google-drive.js');
  const required = {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || process.env.cloudflare_account_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY || process.env.S3_ACCESS_KEY,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_KEY || process.env.S3_SECRET_KEY
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (!existsSync(modulePath)) missing.push('SkyeVault-Drop R2 adapter');
  return {
    configured: missing.length === 0,
    missing,
    provider: 'cloudflare-r2',
    bucket: process.env.R2_BUCKET || process.env.S3_BUCKET || 'client-drop-vault',
    prefix: skyeVaultContentPrefix(),
    adapterPath: path.relative(REPO_ROOT, modulePath)
  };
}

function skyeVaultContentPrefix() {
  return String(process.env.SKYE_CONTENT_FORGE_R2_PREFIX || process.env.SKYEVAULT_CONTENT_FORGE_PREFIX || 'content-forge-exports')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/') || 'content-forge-exports';
}

async function skyeVaultStorage() {
  const modulePath = path.join(REPO_ROOT, 'SkyeVault-Drop/netlify/functions/_lib/google-drive.js');
  if (!existsSync(modulePath)) throw new Error('SkyeVault R2 adapter was not found at SkyeVault-Drop/netlify/functions/_lib/google-drive.js.');
  skyeVaultModulePromise ||= import(pathToFileURL(modulePath).href);
  return skyeVaultModulePromise;
}

async function uploadMarkdownToSkyeVault(input) {
  const status = skyeVaultStatus();
  if (!status.configured) {
    throw new Error(`SkyeVault/R2 is not configured. Missing: ${status.missing.join(', ')}`);
  }
  const title = input.title || 'skye-content-export';
  const output = String(input.output || '').trim();
  if (!output) throw new Error('There is no output to upload.');

  const storage = await skyeVaultStorage();
  const fileName = `${slugify(title)}-${new Date().toISOString().slice(0, 10)}.md`;
  const body = Buffer.from(output, 'utf8');
  const sessionId = `content-forge-${crypto.randomUUID()}`;
  const session = await storage.createResumableSession({
    id: 'skye-content-forge',
    name: 'Skye Content Forge',
    folderId: status.prefix,
    role: 'content-forge',
    priority: 1,
    maxFileSizeGb: 5,
    accept: 'text/markdown,text/plain'
  }, {
    sessionId,
    fileName,
    fileSize: body.length,
    mimeType: 'text/markdown; charset=utf-8',
    chunkSizeMb: Number(process.env.SKYE_CONTENT_FORGE_R2_CHUNK_MB || 8),
    projectName: 'Skye Content Forge',
    clientReference: 'metraiyux-0s-content-forge',
    assetType: 'Content Forge Markdown Export',
    usageRightsAccepted: true,
    retentionAcknowledged: true
  });

  const parts = [];
  for (const part of session.parts || []) {
    const chunk = body.subarray(part.start, part.end + 1);
    const response = await fetch(part.uploadUrl, { method: 'PUT', body: chunk });
    const text = await response.text().catch(() => '');
    if (!response.ok) throw new Error(`SkyeVault/R2 part ${part.partNumber} failed ${response.status}: ${text.slice(0, 240)}`);
    parts.push({ partNumber: part.partNumber, eTag: response.headers.get('etag') || response.headers.get('ETag') || '' });
  }
  if (!parts.every((part) => part.eTag)) throw new Error('SkyeVault/R2 upload completed without ETag proof for every part.');

  await storage.completeMultipartUpload(session.objectKey, session.uploadId, parts);
  const metadata = await storage.getDriveFileMetadata(session.objectKey);
  const downloadUrl = storage.createDownloadUrl(session.objectKey, {
    fileName,
    mimeType: 'text/markdown; charset=utf-8',
    expires: Number(process.env.SKYE_CONTENT_FORGE_R2_DOWNLOAD_SECONDS || 3600)
  });
  return {
    provider: 'cloudflare-r2',
    bucket: session.bucket || status.bucket,
    prefix: status.prefix,
    objectKey: session.objectKey,
    fileName,
    size: body.length,
    mimeType: 'text/markdown; charset=utf-8',
    downloadUrl,
    uploadedAt: new Date().toISOString(),
    metadata
  };
}



function runtimeStatus() {
  return {
    mode: process.env.NODE_ENV || 'development',
    port: PORT,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    appAccessTokenConfigured: Boolean(appAccessTokenState().token),
    gateSessionRequired: appAccessTokenState().required,
    localDevGateEnabled: appAccessTokenState().localDev,
    schedulerTokenConfigured: Boolean(schedulerTokenState().token),
    publisherAutorun: truthy(process.env.PUBLISHER_AUTORUN),
    pollSeconds: Number(process.env.PUBLISHER_POLL_SECONDS || 900),
    schedulerEndpoint: '/api/automation/tick',
    persistenceMode: process.env.PERSISTENCE_MODE || 'json-files-plus-optional-github-backup',
    dataDir: path.relative(__dirname, DATA_DIR),
    exportDir: path.relative(__dirname, EXPORT_DIR),
    staticSiteDir: path.relative(__dirname, STATIC_SITE_DIR),
    processManager: process.env.PROCESS_MANAGER || 'node'
  };
}

function getRequestToken(req, url) {
  return getGateTokens(req, url)[0] || getSchedulerTokens(req, url)[0] || '';
}

function headerValue(req, name) {
  return String(req.headers[String(name || '').toLowerCase()] || '').trim();
}

function bearerToken(req) {
  const auth = req.headers.authorization || '';
  return /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, '').trim() : '';
}

function cookieValue(req, name) {
  const wanted = String(name || '').trim();
  return String(req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .map((part) => {
      const idx = part.indexOf('=');
      return idx >= 0 ? [part.slice(0, idx), part.slice(idx + 1)] : [part, ''];
    })
    .find(([key]) => key === wanted)?.[1] || '';
}

function tokenFromCookie(value) {
  const raw = decodeURIComponent(String(value || '')).replace(/^Bearer\s+/i, '').trim();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return String(parsed.token || parsed.session || parsed.sessionToken || '').replace(/^Bearer\s+/i, '').trim();
  } catch {
    return raw;
  }
}

function getGateTokens(req, _url) {
  const candidates = [
    bearerToken(req),
    headerValue(req, 'x-skye-gate-session'),
    headerValue(req, 'x-free99-gate-session'),
    headerValue(req, 'x-0s-gate-session'),
    headerValue(req, 'x-skygate-session'),
    tokenFromCookie(cookieValue(req, 'free99_gate_session')),
    tokenFromCookie(cookieValue(req, 'skye_gate_session')),
    tokenFromCookie(cookieValue(req, 'skygate_session')),
    tokenFromCookie(cookieValue(req, 'FREE99_PLATFORM_GATE_SESSION')),
    tokenFromCookie(cookieValue(req, 'METRAIYUX_GATE_SESSION'))
  ];
  return [...new Set(candidates.map((value) => String(value || '').trim()).filter(Boolean))];
}

function getSchedulerTokens(req, url) {
  const candidates = [
    bearerToken(req),
    headerValue(req, 'x-scheduler-key'),
    url.searchParams.get('key')
  ];
  return [...new Set(candidates.map((value) => String(value || '').trim()).filter(Boolean))];
}

function fs27Origin() {
  return String(process.env.SKYGATEFS27_ORIGIN || process.env.SKYGATE_ORIGIN || process.env.ZERO_OS_GATE_ORIGIN || '').trim().replace(/\/+$/, '');
}

function localDevGateAllowed() {
  return (process.env.NODE_ENV || 'development') !== 'production'
    && truthy(process.env.SKYE_CONTENT_ALLOW_LOCAL_DEV_GATE || process.env.ZERO_OS_DEV_LOCAL_GATE_FALLBACK);
}

async function introspectFs27Token(token) {
  const origin = fs27Origin();
  if (!origin || !token) return { ok: false, active: false, error: origin ? 'missing_gate_token' : 'fs27_origin_not_configured' };
  const paths = ['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'];
  let last = null;
  for (const pathName of paths) {
    const response = await fetch(`${origin}${pathName}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ token })
    }).catch((error) => ({ ok: false, status: 502, json: async () => ({ active: false, error: error.message }) }));
    const data = await response.json().catch(() => ({ active: false, error: 'invalid_fs27_response' }));
    last = { status: response.status, data, pathName };
    if (response.status === 404) continue;
    return { ok: response.ok && data.active === true, active: data.active === true, status: response.status, data, pathName };
  }
  return { ok: false, active: false, status: last?.status || 404, data: last?.data || null, error: 'fs27_introspection_not_found' };
}

function appAccessTokenState() {
  if (!GATE_SESSION_REQUIRED) return { required: false, token: '', localDev: false };
  if (localDevGateAllowed()) return { required: true, token: LOCAL_DEV_GATE_TOKEN, localDev: true, fs27Origin: fs27Origin() };
  return { required: true, token: '', localDev: false, fs27Origin: fs27Origin() };
}

function schedulerTokenState() {
  const configured = process.env.SCHEDULER_API_KEY || '';
  if (configured) return { required: true, token: configured, localDev: false };
  if (!GATE_SESSION_REQUIRED) return { required: false, token: '', localDev: false };
  if (localDevGateAllowed()) return { required: true, token: LOCAL_DEV_GATE_TOKEN, localDev: true };
  return { required: true, token: '', localDev: false };
}

async function hasValidAppAccessToken(req, url) {
  const { required, token: expected } = appAccessTokenState();
  if (!required) return true;
  if (url.pathname.startsWith('/api/automation/') || url.pathname.startsWith('/api/backup/')) {
    const scheduler = schedulerTokenState().token;
    if (scheduler && getSchedulerTokens(req, url).some((token) => safeCompare(token, scheduler))) return true;
  }
  const incoming = getGateTokens(req, url);
  if (expected && incoming.some((token) => safeCompare(token, expected))) return true;
  for (const token of incoming) {
    const gate = await introspectFs27Token(token);
    if (gate.ok) return true;
  }
  return false;
}

function hasValidSchedulerToken(req, url) {
  const { required, token: expected } = schedulerTokenState();
  if (!required) return true;
  if (!expected) return false;
  return getSchedulerTokens(req, url).some((token) => safeCompare(token, expected));
}

function requiresAppAccessToken(req, url) {
  if (!appAccessTokenState().required) return false;
  if (!url.pathname.startsWith('/api/')) return false;
  return true;
}

function gateAccessErrorMessage() {
  const state = appAccessTokenState();
  if (!state.fs27Origin && state.required && !state.localDev) return 'Gate session required. Configure SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN so this Free99 app can verify the shared 0S gate.';
  if (state.localDev) return `Gate session required. Local dev fallback only works when SKYE_CONTENT_ALLOW_LOCAL_DEV_GATE or ZERO_OS_DEV_LOCAL_GATE_FALLBACK is enabled.`;
  return 'Gate session required. Free99 means no charge, not anonymous access.';
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function backupStatus() {
  const missing = missingEnv(['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO']);
  return {
    configured: missing.length === 0,
    missing,
    branch: process.env.GITHUB_BACKUP_BRANCH || process.env.GITHUB_BRANCH || 'main',
    backupDir: (process.env.GITHUB_BACKUP_DIR || 'skye-content-forge-backups').replace(/^\/+|\/+$/g, ''),
    autoBackupOnTick: truthy(process.env.BACKUP_TO_GITHUB_ON_TICK)
  };
}

async function runAutomationTick(options = {}) {
  const startedAt = new Date().toISOString();
  const dryRun = Boolean(options.dryRun);
  const source = options.source || 'scheduler';
  const publisher = await runPublisher({ mode: 'due', dryRun, source });
  let backup = { skipped: true, reason: 'BACKUP_TO_GITHUB_ON_TICK is not enabled.' };
  const shouldBackup = options.backup === undefined ? truthy(process.env.BACKUP_TO_GITHUB_ON_TICK) : Boolean(options.backup);
  if (shouldBackup && !dryRun) {
    try {
      backup = await backupDataToGitHub({ reason: `automation-tick:${source}` });
    } catch (error) {
      backup = { ok: false, error: error.message };
      await appendPublishLog({ type: 'backup-failed', status: 'failed', title: 'GitHub data backup', error: error.message });
    }
  }
  await appendPublishLog({ type: 'automation-tick', status: 'complete', title: 'External scheduler tick', source, dryRun, processedCount: publisher.processedCount, backup });
  return { startedAt, finishedAt: new Date().toISOString(), source, dryRun, publisher, backup, runtime: runtimeStatus() };
}

async function backupDataToGitHub(options = {}) {
  const status = backupStatus();
  if (!status.configured) throw new Error(`GitHub backup is not configured. Missing: ${status.missing.join(', ')}`);
  const snapshot = await buildDataSnapshot(options);
  const dir = status.backupDir;
  const branch = status.branch;
  const files = [
    { path: `${dir}/snapshot.json`, content: JSON.stringify(snapshot, null, 2) },
    { path: `${dir}/drafts.json`, content: JSON.stringify(snapshot.drafts, null, 2) },
    { path: `${dir}/publish-queue.json`, content: JSON.stringify(snapshot.publishQueue, null, 2) },
    { path: `${dir}/publish-log.json`, content: JSON.stringify(snapshot.publishLog, null, 2) },
    { path: `${dir}/settings.json`, content: JSON.stringify(snapshot.settings, null, 2) },
    { path: `${dir}/README.md`, content: renderBackupReadme(snapshot) }
  ];
  const results = [];
  for (const file of files) {
    results.push(await putGitHubTextFile({ filePath: file.path, content: file.content, message: `Backup Skye Content Forge data (${snapshot.metadata.createdAt})`, branch }));
  }
  await appendPublishLog({ type: 'github-backup', status: 'complete', title: 'GitHub data backup', files: results.map((x) => x.path) });
  return { ok: true, branch, backupDir: dir, files: results, counts: snapshot.counts, createdAt: snapshot.metadata.createdAt };
}

async function restoreDataFromGitHub(options = {}) {
  const status = backupStatus();
  if (!status.configured) throw new Error(`GitHub backup restore is not configured. Missing: ${status.missing.join(', ')}`);
  const filePath = `${status.backupDir}/snapshot.json`;
  const remote = await getGitHubTextFile({ filePath, branch: status.branch });
  const snapshot = JSON.parse(remote.content);
  const counts = snapshot.counts || {
    drafts: Array.isArray(snapshot.drafts) ? snapshot.drafts.length : 0,
    publishQueue: Array.isArray(snapshot.publishQueue) ? snapshot.publishQueue.length : 0,
    publishLog: Array.isArray(snapshot.publishLog) ? snapshot.publishLog.length : 0
  };
  if (options.apply) {
    await writeJson(DRAFTS_FILE, Array.isArray(snapshot.drafts) ? snapshot.drafts : []);
    await writeJson(PUBLISH_QUEUE_FILE, Array.isArray(snapshot.publishQueue) ? snapshot.publishQueue : []);
    await writeJson(PUBLISH_LOG_FILE, Array.isArray(snapshot.publishLog) ? snapshot.publishLog : []);
    await writeJson(SETTINGS_FILE, snapshot.settings || defaultSettings());
    await appendPublishLog({ type: 'github-restore', status: 'complete', title: 'GitHub data restore', sourcePath: filePath, counts });
  }
  return { ok: true, applied: Boolean(options.apply), sourcePath: filePath, branch: status.branch, snapshotCreatedAt: snapshot.metadata?.createdAt || '', counts };
}

async function buildDataSnapshot(options = {}) {
  const drafts = await readJson(DRAFTS_FILE, []);
  const publishQueue = await readJson(PUBLISH_QUEUE_FILE, []);
  const publishLog = await readJson(PUBLISH_LOG_FILE, []);
  const settings = await readJson(SETTINGS_FILE, defaultSettings());
  const exportsIndex = await listExports().catch(() => []);
  return {
    metadata: {
      appName: APP_NAME,
      companyName: COMPANY_NAME,
      version: '4.0.0',
      createdAt: new Date().toISOString(),
      reason: options.reason || 'manual-backup',
      runtime: runtimeStatus()
    },
    counts: {
      drafts: drafts.length,
      publishQueue: publishQueue.length,
      publishLog: publishLog.length,
      exports: exportsIndex.length
    },
    settings,
    drafts,
    publishQueue,
    publishLog,
    exportsIndex
  };
}

function renderBackupReadme(snapshot) {
  return `# Skye Content Forge Backup\n\nLast backup: ${snapshot.metadata.createdAt}\n\nReason: ${snapshot.metadata.reason}\n\nCounts:\n\n- Drafts: ${snapshot.counts.drafts}\n- Publish queue items: ${snapshot.counts.publishQueue}\n- Publish log entries: ${snapshot.counts.publishLog}\n- Export index entries: ${snapshot.counts.exports}\n\nThis folder is written by Skye Content Forge so the live app can be recovered even if the local machine or working folder is lost.\n`;
}

async function putGitHubTextFile({ filePath, content, message, branch }) {
  const apiBase = githubContentUrl(filePath);
  let sha;
  const existing = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders() });
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  } else if (existing.status !== 404) {
    const error = await existing.json().catch(() => ({}));
    throw new Error(error?.message || `GitHub backup lookup failed with status ${existing.status}`);
  }
  const response = await fetch(apiBase, {
    method: 'PUT',
    headers: githubHeaders(),
    body: JSON.stringify({ message, content: Buffer.from(content, 'utf8').toString('base64'), branch, sha })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `GitHub backup failed with status ${response.status}`);
  return { path: filePath, branch, commitSha: data?.commit?.sha || '', htmlUrl: data?.content?.html_url || '' };
}

async function getGitHubTextFile({ filePath, branch }) {
  const response = await fetch(`${githubContentUrl(filePath)}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `GitHub restore failed with status ${response.status}`);
  return { path: filePath, branch, content: Buffer.from(String(data.content || '').replace(/\s/g, ''), 'base64').toString('utf8'), sha: data.sha || '' };
}

function githubContentUrl(filePath) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${String(filePath).split('/').map(encodeURIComponent).join('/')}`;
}

function publisherStatus() {
  const githubMissing = missingEnv(['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO']);
  const netlifyHook = process.env.NETLIFY_DEPLOY_HOOK_URL || '';
  const netlifyCliMissing = missingEnv(['NETLIFY_AUTH_TOKEN', 'NETLIFY_SITE_ID']);
  const cloudflareHook = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL || process.env.CF_PAGES_DEPLOY_HOOK_URL || '';
  const cloudflareCliMissing = missingEnv(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_PAGES_PROJECT_NAME']);
  const facebookMissing = missingEnv(['META_PAGE_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID']);
  const instagramMissing = missingEnv(['META_PAGE_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID', 'INSTAGRAM_DEFAULT_IMAGE_URL']);
  const linkedinMissing = missingEnv(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN']);
  return {
    autorun: truthy(process.env.PUBLISHER_AUTORUN),
    pollSeconds: Number(process.env.PUBLISHER_POLL_SECONDS || 900),
    queueFile: path.relative(__dirname, PUBLISH_QUEUE_FILE),
    logFile: path.relative(__dirname, PUBLISH_LOG_FILE),
    staticSiteDir: path.relative(__dirname, STATIC_SITE_DIR),
    targets: {
      local: { configured: true, kind: 'filesystem', detail: path.relative(__dirname, EXPORT_DIR) },
      skyeVaultR2: skyeVaultStatus(),
      googleDrive: driveStatus(),
      github: { configured: githubMissing.length === 0, missing: githubMissing, repo: [process.env.GITHUB_OWNER, process.env.GITHUB_REPO].filter(Boolean).join('/'), branch: process.env.GITHUB_BRANCH || 'main', contentDir: process.env.GITHUB_CONTENT_DIR || 'content/blog' },
      netlifyHook: { configured: Boolean(netlifyHook), missing: netlifyHook ? [] : ['NETLIFY_DEPLOY_HOOK_URL'] },
      netlifyCli: { configured: netlifyCliMissing.length === 0, missing: netlifyCliMissing, siteIdConfigured: Boolean(process.env.NETLIFY_SITE_ID) },
      cloudflareHook: { configured: Boolean(cloudflareHook), missing: cloudflareHook ? [] : ['CLOUDFLARE_PAGES_DEPLOY_HOOK_URL'] },
      cloudflareWrangler: { configured: cloudflareCliMissing.length === 0, missing: cloudflareCliMissing, projectName: process.env.CLOUDFLARE_PAGES_PROJECT_NAME || '' },
      facebook: { configured: facebookMissing.length === 0, missing: facebookMissing, pageIdConfigured: Boolean(process.env.FACEBOOK_PAGE_ID) },
      instagram: { configured: instagramMissing.length === 0, missing: instagramMissing, requiresPublicImageUrl: true },
      linkedin: { configured: linkedinMissing.length === 0, missing: linkedinMissing, authorUrnConfigured: Boolean(process.env.LINKEDIN_AUTHOR_URN) }
    }
  };
}

async function schedulePublishItem(body) {
  const drafts = await readJson(DRAFTS_FILE, []);
  const draft = body?.draftId ? drafts.find((item) => item.id === body.draftId) : null;
  const output = String(body?.output || draft?.output || '').trim();
  if (!output) throw new Error('There is no generated content to schedule. Generate or load a draft first.');
  const title = String(body?.title || draft?.title || inferTitle(output, 'Skye scheduled content')).trim();
  const now = new Date();
  const publishAt = body?.publishAt ? new Date(body.publishAt) : now;
  if (Number.isNaN(publishAt.getTime())) throw new Error('publishAt must be a valid date/time.');
  const targets = normalizeTargets(body?.targets);
  const item = {
    id: crypto.randomUUID(),
    draftId: draft?.id || body?.draftId || '',
    title,
    slug: slugify(body?.slug || title),
    excerpt: String(body?.excerpt || deriveExcerpt(output)).slice(0, 260),
    sourceUrl: body?.sourceUrl || draft?.sourceUrl || '',
    sourceTitle: body?.sourceTitle || draft?.sourceTitle || '',
    sourceName: body?.sourceName || draft?.sourceName || '',
    format: body?.format || draft?.format || 'scheduled-content',
    output,
    targets,
    publishAt: publishAt.toISOString(),
    status: 'queued',
    attempts: 0,
    results: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  const queue = await readJson(PUBLISH_QUEUE_FILE, []);
  queue.push(item);
  await writeJson(PUBLISH_QUEUE_FILE, queue);
  await appendPublishLog({ type: 'scheduled', itemId: item.id, title: item.title, targets, publishAt: item.publishAt });
  return item;
}

function normalizeTargets(targets) {
  const allowed = new Set(['local', 'skyevault-r2', 'google-drive', 'github', 'netlify-hook', 'netlify-cli', 'cloudflare-hook', 'cloudflare-wrangler', 'facebook', 'instagram', 'linkedin']);
  const list = Array.isArray(targets) ? targets : ['local'];
  const normalized = [...new Set(list.map((x) => String(x || '').trim()).filter((x) => allowed.has(x)))];
  return normalized.length ? normalized : ['local'];
}

async function runPublisher(options = {}) {
  const mode = options.mode || 'due';
  const dryRun = Boolean(options.dryRun);
  const now = new Date();
  const queue = await readJson(PUBLISH_QUEUE_FILE, []);
  const selected = queue.filter((item) => {
    if (options.itemId) return item.id === options.itemId;
    if (mode === 'all') return ['queued', 'failed', 'partial'].includes(item.status);
    return item.status === 'queued' && new Date(item.publishAt) <= now;
  });
  const processed = [];
  for (const item of selected) {
    const result = dryRun ? { itemId: item.id, dryRun: true, targets: item.targets } : await publishItem(item);
    processed.push(result);
  }
  return { processedCount: processed.length, dryRun, processed };
}

async function publishItem(item) {
  const startedAt = new Date().toISOString();
  const results = [];
  for (const target of item.targets) {
    try {
      const result = await publishToTarget(target, item);
      results.push({ target, ok: true, result, finishedAt: new Date().toISOString() });
    } catch (error) {
      results.push({ target, ok: false, error: error.message, finishedAt: new Date().toISOString() });
    }
  }
  const okCount = results.filter((x) => x.ok).length;
  const nextStatus = okCount === results.length ? 'published' : okCount > 0 ? 'partial' : 'failed';
  const queue = await readJson(PUBLISH_QUEUE_FILE, []);
  const index = queue.findIndex((queued) => queued.id === item.id);
  if (index !== -1) {
    queue[index] = {
      ...queue[index],
      status: nextStatus,
      attempts: Number(queue[index].attempts || 0) + 1,
      results,
      lastPublishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await writeJson(PUBLISH_QUEUE_FILE, queue);
  }
  await appendPublishLog({ type: 'publish-run', itemId: item.id, title: item.title, status: nextStatus, startedAt, results });
  return { itemId: item.id, title: item.title, status: nextStatus, results };
}

async function publishToTarget(target, item) {
  if (target === 'local') {
    const local = await exportMarkdownLocal({ title: item.title, output: toPostMarkdown(item) });
    const site = await rebuildStaticSite('include-queued', item);
    return { local, site };
  }
  if (target === 'skyevault-r2') return uploadMarkdownToSkyeVault({ title: item.title, output: toPostMarkdown(item) });
  if (target === 'google-drive') return uploadMarkdownToDrive({ title: item.title, output: toPostMarkdown(item) });
  if (target === 'github') return pushPostToGitHub(item);
  if (target === 'netlify-hook') return triggerNetlifyHook();
  if (target === 'netlify-cli') return deployNetlifyCli();
  if (target === 'cloudflare-hook') return triggerCloudflareHook();
  if (target === 'cloudflare-wrangler') return deployCloudflareWrangler();
  if (target === 'facebook') return publishFacebookPost(item);
  if (target === 'instagram') return publishInstagramPost(item);
  if (target === 'linkedin') return publishLinkedInPost(item);
  throw new Error(`Unsupported target: ${target}`);
}

function toPostMarkdown(item) {
  const date = new Date(item.publishAt || item.createdAt || Date.now()).toISOString();
  const frontmatter = {
    title: item.title,
    slug: item.slug,
    date,
    description: item.excerpt || deriveExcerpt(item.output),
    source_url: item.sourceUrl || '',
    source_name: item.sourceName || '',
    generated_by: 'Skye Content Forge'
  };
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${JSON.stringify(String(value || ''))}`)
    .join('\n');
  return `---\n${yaml}\n---\n\n${String(item.output || '').trim()}\n`;
}

async function pushPostToGitHub(item) {
  const missing = missingEnv(['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO']);
  if (missing.length) throw new Error(`GitHub is not configured. Missing: ${missing.join(', ')}`);
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const contentDir = (process.env.GITHUB_CONTENT_DIR || 'content/blog').replace(/^\/+|\/+$/g, '');
  const filePath = `${contentDir}/${new Date(item.publishAt).toISOString().slice(0, 10)}-${item.slug}.md`;
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}`;
  let sha;
  const existing = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, {
    headers: githubHeaders()
  });
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  } else if (existing.status !== 404) {
    const error = await existing.json().catch(() => ({}));
    throw new Error(error?.message || `GitHub lookup failed with status ${existing.status}`);
  }
  const response = await fetch(apiBase, {
    method: 'PUT',
    headers: githubHeaders(),
    body: JSON.stringify({
      message: `Publish ${item.title}`,
      content: Buffer.from(toPostMarkdown(item), 'utf8').toString('base64'),
      branch,
      sha
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || `GitHub publish failed with status ${response.status}`);
  return { path: filePath, branch, commitSha: data?.commit?.sha || '', htmlUrl: data?.content?.html_url || '' };
}

function githubHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': `${APP_NAME}/publisher`,
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function triggerNetlifyHook() {
  const hook = process.env.NETLIFY_DEPLOY_HOOK_URL;
  if (!hook) throw new Error('NETLIFY_DEPLOY_HOOK_URL is missing.');
  const response = await fetch(hook, { method: 'POST' });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`Netlify hook failed with status ${response.status}: ${text.slice(0, 180)}`);
  return { mode: 'deploy-hook', status: response.status, response: text.slice(0, 500) };
}

async function triggerCloudflareHook() {
  const hook = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL || process.env.CF_PAGES_DEPLOY_HOOK_URL;
  if (!hook) throw new Error('CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is missing.');
  const response = await fetch(hook, { method: 'POST' });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`Cloudflare Pages hook failed with status ${response.status}: ${text.slice(0, 180)}`);
  return { mode: 'deploy-hook', status: response.status, response: text.slice(0, 500) };
}

async function deployNetlifyCli() {
  const missing = missingEnv(['NETLIFY_AUTH_TOKEN', 'NETLIFY_SITE_ID']);
  if (missing.length) throw new Error(`Netlify CLI deploy is not configured. Missing: ${missing.join(', ')}`);
  await rebuildStaticSite('include-queued');
  return runCommand('npx', ['--yes', 'netlify-cli', 'deploy', '--prod', '--dir', STATIC_SITE_DIR, '--site', process.env.NETLIFY_SITE_ID, '--auth', process.env.NETLIFY_AUTH_TOKEN], { timeoutMs: 180000 });
}

async function deployCloudflareWrangler() {
  const missing = missingEnv(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_PAGES_PROJECT_NAME']);
  if (missing.length) throw new Error(`Cloudflare Wrangler deploy is not configured. Missing: ${missing.join(', ')}`);
  await rebuildStaticSite('include-queued');
  return runCommand('npx', ['--yes', 'wrangler@latest', 'pages', 'deploy', STATIC_SITE_DIR, '--project-name', process.env.CLOUDFLARE_PAGES_PROJECT_NAME, '--branch', process.env.CLOUDFLARE_PAGES_BRANCH || process.env.GITHUB_BRANCH || 'main'], { timeoutMs: 180000, env: { CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN } });
}

async function publishFacebookPost(item) {
  const missing = missingEnv(['META_PAGE_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID']);
  if (missing.length) throw new Error(`Facebook Pages publishing is not configured. Missing: ${missing.join(', ')}`);
  const version = process.env.META_GRAPH_API_VERSION || 'v25.0';
  const message = socialCaption(item, 'facebook');
  const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(process.env.FACEBOOK_PAGE_ID)}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: process.env.META_PAGE_ACCESS_TOKEN })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Facebook publish failed with status ${response.status}`);
  return data;
}

async function publishInstagramPost(item) {
  const missing = missingEnv(['META_PAGE_ACCESS_TOKEN', 'INSTAGRAM_BUSINESS_ACCOUNT_ID', 'INSTAGRAM_DEFAULT_IMAGE_URL']);
  if (missing.length) throw new Error(`Instagram publishing is not configured. Missing: ${missing.join(', ')}. Instagram feed publishing requires a public image/video URL.`);
  const version = process.env.META_GRAPH_API_VERSION || 'v25.0';
  const caption = socialCaption(item, 'instagram').slice(0, 2200);
  const create = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID)}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image_url: process.env.INSTAGRAM_DEFAULT_IMAGE_URL, caption, access_token: process.env.META_PAGE_ACCESS_TOKEN })
  });
  const created = await create.json().catch(() => ({}));
  if (!create.ok) throw new Error(created?.error?.message || `Instagram media container failed with status ${create.status}`);
  const publish = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID)}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: created.id, access_token: process.env.META_PAGE_ACCESS_TOKEN })
  });
  const data = await publish.json().catch(() => ({}));
  if (!publish.ok) throw new Error(data?.error?.message || `Instagram publish failed with status ${publish.status}`);
  return data;
}

async function publishLinkedInPost(item) {
  const missing = missingEnv(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN']);
  if (missing.length) throw new Error(`LinkedIn publishing is not configured. Missing: ${missing.join(', ')}`);
  const body = {
    author: process.env.LINKEDIN_AUTHOR_URN,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: socialCaption(item, 'linkedin').slice(0, 2900) },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': process.env.LINKEDIN_VISIBILITY || 'PUBLIC' }
  };
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`LinkedIn publish failed with status ${response.status}: ${text.slice(0, 240)}`);
  return { status: response.status, response: text.slice(0, 500) };
}

function socialCaption(item, channel) {
  const base = deriveExcerpt(item.output || item.excerpt || item.title).replace(/\s+/g, ' ').trim();
  const url = process.env.PUBLIC_BLOG_BASE_URL ? `${process.env.PUBLIC_BLOG_BASE_URL.replace(/\/$/, '')}/posts/${item.slug}.html` : '';
  const cta = process.env.SOCIAL_DEFAULT_CTA || 'Book a Skyes Over London AI, website, and search visibility audit.';
  const tags = '#SkyesOverLondon #PhoenixBusiness #AISEO #Automation';
  if (channel === 'instagram') return `${item.title}\n\n${base}\n\n${cta}\n\n${tags}`;
  if (channel === 'linkedin') return `${item.title}\n\n${base}\n\n${cta}${url ? `\n\nRead more: ${url}` : ''}`;
  return `${item.title}\n\n${base}\n\n${cta}${url ? `\n\n${url}` : ''}`;
}

async function rebuildStaticSite(mode = 'published-only', extraItem = null) {
  await fs.mkdir(STATIC_SITE_DIR, { recursive: true });
  const queue = await readJson(PUBLISH_QUEUE_FILE, []);
  const includeQueued = mode === 'include-queued';
  let posts = queue.filter((item) => item.status === 'published' || item.status === 'partial' || includeQueued);
  if (extraItem && !posts.some((item) => item.id === extraItem.id)) posts.push(extraItem);
  posts = posts.sort((a, b) => new Date(b.publishAt || b.createdAt) - new Date(a.publishAt || a.createdAt));
  const postsDir = path.join(STATIC_SITE_DIR, 'posts');
  await fs.rm(postsDir, { recursive: true, force: true });
  await fs.mkdir(postsDir, { recursive: true });
  for (const post of posts) {
    const html = renderPostHtml(post);
    await fs.writeFile(path.join(postsDir, `${post.slug}.html`), html, 'utf8');
  }
  await fs.writeFile(path.join(STATIC_SITE_DIR, 'index.html'), renderBlogIndex(posts), 'utf8');
  await fs.writeFile(path.join(STATIC_SITE_DIR, 'feed.xml'), renderRss(posts), 'utf8');
  await fs.writeFile(path.join(STATIC_SITE_DIR, 'llms.txt'), renderLlmsTxt(posts), 'utf8');
  return { staticSiteDir: path.relative(__dirname, STATIC_SITE_DIR), postCount: posts.length, files: ['index.html', 'feed.xml', 'llms.txt', ...posts.map((post) => `posts/${post.slug}.html`)] };
}

function renderBlogIndex(posts) {
  const cards = posts.map((post) => `<article class="post-card"><p>${escapeHtml(new Date(post.publishAt || post.createdAt).toLocaleDateString())}</p><h2><a href="/posts/${escapeAttr(post.slug)}.html">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.excerpt || deriveExcerpt(post.output))}</p></article>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skyes Over London Insights</title><meta name="description" content="AI, SEO, automation, AEO, GEO, and local growth insights from Skyes Over London."><style>${staticCss()}</style></head><body><main><header><p class="eyebrow">Skyes Over London</p><h1>AI Search, Automation, and Local Growth Insights</h1><p>Original strategy assets generated and governed through Skye Content Forge.</p></header><section>${cards || '<p>No published posts yet.</p>'}</section></main></body></html>`;
}

function renderPostHtml(post) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(post.title)} | Skyes Over London</title><meta name="description" content="${escapeAttr(post.excerpt || deriveExcerpt(post.output))}"><style>${staticCss()}</style></head><body><main><nav><a href="/">← Insights home</a></nav><article><p class="eyebrow">Skyes Over London Insight</p>${markdownToHtml(post.output)}<footer><p>Generated by Skye Content Forge. Source reference: ${post.sourceUrl ? `<a href="${escapeAttr(post.sourceUrl)}">${escapeHtml(post.sourceName || post.sourceUrl)}</a>` : 'internal strategy source'}.</p></footer></article></main></body></html>`;
}

function renderRss(posts) {
  const base = (process.env.PUBLIC_BLOG_BASE_URL || 'http://localhost:4313').replace(/\/$/, '');
  const items = posts.slice(0, 50).map((post) => `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(`${base}/posts/${post.slug}.html`)}</link><description>${escapeXml(post.excerpt || deriveExcerpt(post.output))}</description><pubDate>${new Date(post.publishAt || post.createdAt).toUTCString()}</pubDate></item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Skyes Over London Insights</title><link>${escapeXml(base)}</link><description>AI, SEO, AEO, GEO, automation, and local business growth.</description>${items}</channel></rss>`;
}

function renderLlmsTxt(posts) {
  return [`# Skyes Over London Insights`, `Generated by Skye Content Forge.`, `Primary topics: AI automation, local SEO, AEO, GEO, Phoenix business growth, websites, dashboards, and follow-up systems.`, '', ...posts.map((post) => `- ${post.title}: /posts/${post.slug}.html`)].join('\n');
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').replace(/^---[\s\S]*?---\s*/, '').split(/\r?\n/);
  const html = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { html.push('</ul>'); inList = false; }
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      if (inList) { html.push('</ul>'); inList = false; }
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }
    if (inList) { html.push('</ul>'); inList = false; }
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  if (inList) html.push('</ul>');
  return html.join('\n');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
}

function staticCss() {
  return `:root{color-scheme:dark;--bg:#080612;--card:#141021;--line:#2d2440;--gold:#f7d84b;--text:#f7f1ff;--muted:#b7a9cb}body{margin:0;background:radial-gradient(circle at top left,#3b216c55,transparent 38%),var(--bg);color:var(--text);font-family:Inter,system-ui,Segoe UI,sans-serif;line-height:1.65}main{max-width:980px;margin:0 auto;padding:48px 20px}header,article,.post-card{background:linear-gradient(145deg,#161126,#0e0a19);border:1px solid var(--line);border-radius:26px;padding:28px;box-shadow:0 24px 70px #0008;margin-bottom:22px}.eyebrow{color:var(--gold);text-transform:uppercase;letter-spacing:.16em;font-weight:800;font-size:.75rem}h1{font-size:clamp(2.2rem,6vw,5rem);line-height:.95;margin:.1em 0 .3em}h2{font-size:1.55rem}a{color:var(--gold)}p{color:var(--muted)}article p,li{font-size:1.06rem}footer{border-top:1px solid var(--line);margin-top:36px;padding-top:18px}`;
}

function deriveExcerpt(markdown) {
  return cleanText(String(markdown || '').replace(/^---[\s\S]*?---\s*/, '').replace(/[#>*_`\[\]()]/g, ' ')).slice(0, 220) || 'Skyes Over London content asset.';
}

async function appendPublishLog(entry) {
  const log = await readJson(PUBLISH_LOG_FILE, []);
  log.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry });
  await writeJson(PUBLISH_LOG_FILE, log.slice(-500));
}

async function runCommand(command, args, options = {}) {
  const startedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: __dirname,
      env: { ...process.env, ...(options.env || {}) },
      shell: false
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out.`));
    }, options.timeoutMs || 120000);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      const result = { command, args: args.map((arg) => /token|auth/i.test(String(arg)) ? '[redacted]' : arg), code, startedAt, finishedAt: new Date().toISOString(), stdout: stdout.slice(-4000), stderr: stderr.slice(-4000) };
      if (code === 0) resolve(result);
      else reject(new Error(`${command} exited with ${code}: ${(stderr || stdout).slice(-500)}`));
    });
  });
}

function missingEnv(keys) {
  return keys.filter((key) => !process.env[key]);
}

function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function escapeXml(value) {
  return String(value || '').replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]));
}

function driveStatus() {
  const auth = googleDriveAuthStatus();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '';
  const required = {
    GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
    ...auth.required
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  return {
    configured: missing.length === 0,
    missing,
    authMode: auth.mode,
    folderIdConfigured: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID),
    serviceAccountEmail: email || '',
    exportPrefix: process.env.GOOGLE_DRIVE_EXPORT_PREFIX || 'Skye Content Forge - '
  };
}

function googleDriveAuthStatus() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN || process.env.GOOGLE_DRIVE_ACCESS_TOKEN || process.env.GOOGLE_ACCESS_TOKEN) {
    return { mode: 'oauth-access-token', required: { GOOGLE_OAUTH_ACCESS_TOKEN: process.env.GOOGLE_OAUTH_ACCESS_TOKEN || process.env.GOOGLE_DRIVE_ACCESS_TOKEN || process.env.GOOGLE_ACCESS_TOKEN } };
  }
  if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
    return {
      mode: 'oauth-refresh-token',
      required: {
        GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID,
        GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET,
        GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_DRIVE_REFRESH_TOKEN
      }
    };
  }
  return {
    mode: 'service-account',
    required: {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY
    }
  };
}

async function getGoogleDriveAccessToken() {
  const oauthAccessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN || process.env.GOOGLE_DRIVE_ACCESS_TOKEN || process.env.GOOGLE_ACCESS_TOKEN;
  if (oauthAccessToken) return oauthAccessToken;

  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (refreshToken) return getGoogleOAuthAccessToken(refreshToken);

  return getGoogleServiceAccountAccessToken();
}

async function getGoogleOAuthAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth refresh token is present, but GOOGLE_OAUTH_CLIENT_ID/GOOGLE_OAUTH_CLIENT_SECRET are missing.');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || `Google OAuth refresh failed with status ${response.status}.`);
  }
  return data.access_token;
}

async function getGoogleServiceAccountAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY || '');
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const claim = base64UrlJson({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  });
  const signingInput = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);
  const jwt = `${signingInput}.${base64Url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || `Google token request failed with status ${response.status}.`);
  }
  return data.access_token;
}

async function listExports() {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const names = await fs.readdir(EXPORT_DIR);
  const files = [];
  for (const name of names) {
    if (!name.endsWith('.md')) continue;
    const full = path.join(EXPORT_DIR, name);
    const stat = await fs.stat(full);
    files.push({
      fileName: name,
      relativePath: path.relative(__dirname, full),
      bytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
      downloadUrl: `/api/exports/download/${encodeURIComponent(name)}`
    });
  }
  return files.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function fetchHtml(targetUrl) {
  const parsed = requireUrl(targetUrl, 'URL is required.');
  const text = await fetchText(parsed, 'text/html,application/xhtml+xml');
  return text;
}

async function fetchText(targetUrl, accept = '*/*') {
  const parsed = requireUrl(targetUrl, 'URL is required.');
  const response = await fetch(parsed, {
    headers: {
      'User-Agent': `${APP_NAME}/2.0 local research tool`,
      'Accept': accept
    }
  });

  if (!response.ok) {
    throw new Error(`Could not fetch ${parsed}. Status: ${response.status}`);
  }

  return response.text();
}

function extractSourceLinks(html, sourceUrl, source) {
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const posts = [];

  for (const match of anchors) {
    const attrs = match[1] || '';
    const inner = match[2] || '';
    const href = getAttr(attrs, 'href');
    const absolute = normalizeUrl(href, sourceUrl);
    if (!absolute || !isUrlAllowedForSource(absolute, source)) continue;

    const rawText = cleanText(stripTags(`${getAttr(attrs, 'aria-label')} ${getAttr(attrs, 'title')} ${inner}`));
    let title = cleanBlogTitle(rawText, absolute);
    if (!title || /^(read more|learn more|view article|article|blog|news)$/i.test(title)) title = titleFromUrl(absolute);
    if (!title || title.length < 8) continue;

    posts.push({
      title,
      url: absolute,
      date: inferDate(rawText, absolute),
      readTime: rawText.match(/\b\d+\s+min\s+read\b/i)?.[0] || '',
      excerpt: buildExcerpt(rawText, title),
      source: source.name,
      sourceId: source.id,
      topic: source.topic
    });
  }

  return dedupePosts(posts).slice(0, 100);
}

function extractArticle(html, articleUrl, source) {
  const jsonLd = extractJsonLdArticle(html);
  const title = cleanText(
    jsonLd.headline ||
    getMeta(html, 'property', 'og:title') ||
    getMeta(html, 'name', 'twitter:title') ||
    matchFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    titleFromUrl(articleUrl)
  );
  const description = cleanText(
    jsonLd.description ||
    getMeta(html, 'name', 'description') ||
    getMeta(html, 'property', 'og:description') ||
    ''
  );
  const canonical = getCanonical(html) || articleUrl;
  const date = cleanText(
    jsonLd.datePublished ||
    getMeta(html, 'property', 'article:published_time') ||
    getMeta(html, 'name', 'date') ||
    matchFirst(html, /<time[^>]*datetime=["']([^"']+)["'][^>]*>/i) ||
    html.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ||
    html.match(/\b\d{1,2}\/[0-3]?\d\/\d{2,4}\b/)?.[0] ||
    ''
  );

  const contentHtml = pickMainHtml(html);
  const headings = [...contentHtml.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)]
    .map((m) => cleanText(stripTags(m[1])))
    .filter((x) => x.length > 2 && !looksLikeNavText(x))
    .slice(0, 30);

  const paragraphMatches = [...contentHtml.matchAll(/<(p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi)];
  const paragraphs = paragraphMatches
    .map((m) => cleanText(stripTags(m[2])))
    .filter((x) => x.length > 35 && !looksLikeNavText(x))
    .slice(0, 160);

  const text = cleanText([
    title ? `Title: ${title}` : '',
    source?.name ? `Publisher: ${source.name}` : '',
    description ? `Description: ${description}` : '',
    headings.length ? `Headings: ${headings.join(' | ')}` : '',
    paragraphs.join('\n\n')
  ].filter(Boolean).join('\n\n'));

  return {
    title,
    description,
    url: canonical,
    sourceUrl: articleUrl,
    sourceName: source?.name || '',
    sourceId: source?.id || '',
    date,
    headings,
    text: text.slice(0, 60000),
    wordCountEstimate: text ? Math.round(text.split(/\s+/).length) : 0,
    extractedAt: new Date().toISOString()
  };
}

function extractJsonLdArticle(html) {
  const scripts = [...String(html || '').matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    try {
      const raw = decodeHtml(script[1].trim());
      const json = JSON.parse(raw);
      const candidates = Array.isArray(json) ? json : [json, ...(json['@graph'] || [])];
      for (const item of candidates.flat()) {
        const type = item?.['@type'];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((x) => /Article|BlogPosting|NewsArticle/i.test(String(x)))) {
          return item;
        }
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  }
  return {};
}

function pickMainHtml(html) {
  const withoutNoise = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ');

  return matchFirstRaw(withoutNoise, /<article[^>]*>([\s\S]*?)<\/article>/i) ||
    matchFirstRaw(withoutNoise, /<main[^>]*>([\s\S]*?)<\/main>/i) ||
    matchFirstRaw(withoutNoise, /<section[^>]+(?:article|post|content|story)[^>]*>([\s\S]*?)<\/section>/i) ||
    withoutNoise;
}

function getSource(sourceId) {
  const source = SOURCE_REGISTRY.find((item) => item.id === sourceId);
  if (!source) throw new Error(`Unknown source: ${sourceId}`);
  return source;
}

function findSourceForUrl(value) {
  try {
    const url = new URL(value);
    return SOURCE_REGISTRY.find((source) => source.allowedHosts.includes(url.hostname.replace(/^www\./, '')) || source.allowedHosts.includes(url.hostname));
  } catch {
    return null;
  }
}

function isUrlAllowedForSource(value, source, options = {}) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    const allowed = source.allowedHosts.some((allowedHost) => allowedHost.replace(/^www\./, '') === host);
    if (!allowed) return false;
    const pathName = url.pathname.replace(/\/$/, '') || '/';
    const homePath = new URL(source.homeUrl).pathname.replace(/\/$/, '') || '/';
    if (options.allowHome && (pathName === homePath || pathName === '/' || pathName.startsWith(homePath + '/'))) return true;
    if (pathName === '/' || pathName === homePath) return false;
    return source.articlePathPatterns.some((pattern) => pattern.test(url.pathname));
  } catch {
    return false;
  }
}

function publicSource(source) {
  return {
    id: source.id,
    name: source.name,
    homeUrl: source.homeUrl,
    topic: source.topic,
    allowedHosts: source.allowedHosts
  };
}

function dedupePosts(posts) {
  const seen = new Set();
  const output = [];
  for (const post of posts) {
    const key = normalizePostUrl(post.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(post);
  }
  return output;
}

function normalizePostUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.href.replace(/\/$/, '');
  } catch {
    return '';
  }
}

function normalizeUrl(href, base) {
  if (!href) return '';
  try {
    const url = new URL(decodeHtml(href), base);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

function inferDate(rawText, absolute) {
  return cleanText(
    rawText.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/i)?.[0] ||
    rawText.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ||
    rawText.match(/\b\d{1,2}\/[0-3]?\d\/\d{2,4}\b/)?.[0] ||
    absolute.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//)?.slice(1).join('-') ||
    ''
  );
}

function cleanBlogTitle(rawText, url) {
  let text = cleanText(rawText);
  text = text
    .replace(/\b(the-blog|Writing|Strategy|Data|News|Podcast|Research|AI|Automation|Product|Company|Read more|Learn more)\b\s*/gi, '')
    .replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+•\s+\d+\s+min\s+read\s+\d{1,2}\/[0-3]?\d\/\d{2,4}\b/g, '')
    .replace(/\b\d+\s+min\s+read\b/gi, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/\b\d{1,2}\/[0-3]?\d\/\d{2,4}\b/g, '')
    .replace(/\s*[|•]\s*$/g, '')
    .trim();

  if (text.length > 150) {
    const sentence = text.split(/(?<=[.!?])\s+/)[0];
    text = sentence.length > 24 && sentence.length < 150 ? sentence : text.slice(0, 150);
  }

  return cleanText(text || titleFromUrl(url));
}

function buildExcerpt(rawText, title) {
  const cleaned = cleanText(rawText)
    .replace(title, '')
    .replace(/\b\d+\s+min\s+read\b/gi, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/\b\d{1,2}\/[0-3]?\d\/\d{2,4}\b/g, '')
    .trim();
  if (!cleaned || cleaned.length < 40) return '';
  return cleaned.slice(0, 240) + (cleaned.length > 240 ? '…' : '');
}

function titleFromUrl(value) {
  try {
    const url = new URL(value);
    const slug = url.pathname.split('/').filter(Boolean).pop() || 'article';
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return 'Article';
  }
}

function looksLikeNavText(text) {
  return /^(services|customers|resources|about|blog|news|subscribe|search|contact|careers|privacy|terms|sign in|try now|view all|see all|learn more|read more)$/i.test(text.trim());
}

function stripTags(html) {
  return decodeHtml(String(html || '').replace(/<[^>]+>/g, ' '));
}

function cleanText(text) {
  return decodeHtml(String(text || ''))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function decodeHtml(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/');
}

function getAttr(attrs, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(attrs || '').match(new RegExp(`${escaped}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match?.[1] || '';
}

function getMeta(html, attrName, attrValue) {
  const regex = new RegExp(`<meta[^>]+${attrName}=["']${escapeRegex(attrValue)}["'][^>]*>`, 'i');
  const tag = String(html || '').match(regex)?.[0];
  return tag ? getAttr(tag, 'content') : '';
}

function getCanonical(html) {
  const tag = String(html || '').match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0];
  return tag ? getAttr(tag, 'href') : '';
}

function matchFirst(text, regex) {
  const match = String(text || '').match(regex);
  return match ? stripTags(match[1]) : '';
}

function matchFirstRaw(text, regex) {
  const match = String(text || '').match(regex);
  return match ? match[1] : '';
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireUrl(value, message) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
    return parsed.href;
  } catch {
    throw new Error(message);
  }
}

async function serveStatic(req, res, url) {
  setSecurityHeaders(res);
  const normalizedPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const requestedPath = path.normalize(path.join(PUBLIC_DIR, normalizedPath));

  if (!requestedPath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  const filePath = existsSync(requestedPath) ? requestedPath : path.join(PUBLIC_DIR, 'index.html');
  const data = await fs.readFile(filePath);
  res.writeHead(200, { 'Content-Type': mimeType(filePath) });
  res.end(data);
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.md': 'text/markdown; charset=utf-8'
  }[ext] || 'application/octet-stream';
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
}

async function ensureJsonFile(filePath, fallback) {
  if (!existsSync(filePath)) await writeJson(filePath, fallback);
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function defaultSettings() {
  return {
    companyName: COMPANY_NAME,
    offer: 'AI-powered websites, content engines, local SEO, AEO/GEO visibility, automation, follow-up systems, dashboards, and business growth infrastructure for local companies.',
    serviceArea: 'Glendale, Phoenix, Mesa, Scottsdale, Peoria, Tempe, Chandler, Gilbert, Surprise, Avondale, Goodyear, and the broader Arizona Valley.',
    targetAudience: 'Arizona business owners who need stronger websites, more leads, better local visibility, AI-search visibility, and automated follow-up without hiring a full internal marketing team.',
    voice: 'cinematic, direct, premium, practical, founder-led, locally grounded, proof-oriented, and commercially sharp.',
    defaultKeywords: 'Phoenix AI automation, Glendale web design, Arizona SEO, local business content engine, AEO, GEO, AI search visibility, website conversion systems, agentic automation.',
    defaultCta: 'Book a Skyes Over London website, AI automation, and search visibility audit.',
    updatedAt: new Date().toISOString()
  };
}

function loadDotEnv(filePath, options = {}) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim().replace(/^export\s+/, '');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (options.protectKeys?.has(key)) continue;
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    if (options.override || !process.env[key]) process.env[key] = value;
  }
}

function applyEnvAliases() {
  const aliases = {
    OPENAI_API_KEY: ['SKYE_CONTENT_FORGE_OPENAI_API_KEY', 'SKYGATEFS13_OPENAI_API_KEY'],
    OPENAI_MODEL: ['SKYE_CONTENT_FORGE_OPENAI_MODEL'],
    GOOGLE_DRIVE_FOLDER_ID: ['SKYE_CONTENT_FORGE_GOOGLE_DRIVE_FOLDER_ID', 'CONTENT_FORGE_GOOGLE_DRIVE_FOLDER_ID', 'BACKUPS_FOLDER_ID'],
    GOOGLE_SERVICE_ACCOUNT_EMAIL: ['GOOGLE_CLIENT_EMAIL', 'SKYE_CONTENT_FORGE_GOOGLE_CLIENT_EMAIL'],
    GOOGLE_PRIVATE_KEY: ['GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'SKYE_CONTENT_FORGE_GOOGLE_PRIVATE_KEY'],
    GOOGLE_OAUTH_ACCESS_TOKEN: ['GOOGLE_DRIVE_ACCESS_TOKEN', 'GOOGLE_ACCESS_TOKEN', 'SKYE_CONTENT_FORGE_GOOGLE_OAUTH_ACCESS_TOKEN'],
    GOOGLE_OAUTH_REFRESH_TOKEN: ['GOOGLE_REFRESH_TOKEN', 'GOOGLE_DRIVE_REFRESH_TOKEN', 'SKYE_CONTENT_FORGE_GOOGLE_OAUTH_REFRESH_TOKEN'],
    GOOGLE_OAUTH_CLIENT_ID: ['GOOGLE_CLIENT_ID', 'GOOGLE_DRIVE_CLIENT_ID', 'SKYE_CONTENT_FORGE_GOOGLE_OAUTH_CLIENT_ID'],
    GOOGLE_OAUTH_CLIENT_SECRET: ['GOOGLE_CLIENT_SECRET', 'GOOGLE_DRIVE_CLIENT_SECRET', 'SKYE_CONTENT_FORGE_GOOGLE_OAUTH_CLIENT_SECRET'],
    GITHUB_TOKEN: ['GITHUB_PAT', 'PERSONAL_ACCESS_TOKEN', 'personal_access_token'],
    NETLIFY_AUTH_TOKEN: ['netlify_personal_access_token', 'SkyeGateBAckup_netlify_token'],
    CLOUDFLARE_API_TOKEN: ['cloudflare_api_token'],
    CLOUDFLARE_ACCOUNT_ID: ['cloudflare_account_ID', 'METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID']
  };
  for (const [target, candidates] of Object.entries(aliases)) {
    if (process.env[target]) continue;
    const found = candidates.find((key) => process.env[key]);
    if (found) process.env[target] = process.env[found];
  }
}

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n');
}

function base64UrlJson(value) {
  return base64Url(Buffer.from(JSON.stringify(value), 'utf8'));
}

function base64Url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function slugify(value) {
  return String(value || 'skye-content-export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'skye-content-export';
}
