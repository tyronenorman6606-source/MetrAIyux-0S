import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createServer } from '../server/http-server.mjs';

const root = process.cwd();
process.env.CODESTUDIO_PROVIDER_MODE = process.env.CODESTUDIO_PROVIDER_MODE || 'fixture';
process.env.CODESTUDIO_RECEIPT_DIR = process.env.CODESTUDIO_RECEIPT_DIR || './receipts/browser-smoke';
process.env.CODESTUDIO_DATA_DIR = process.env.CODESTUDIO_DATA_DIR || './data/browser-smoke';
process.env.CODESTUDIO_CORS_ORIGIN = '*';
await fs.rm(path.join(root, process.env.CODESTUDIO_DATA_DIR), {recursive:true, force:true});
await fs.rm(path.join(root, process.env.CODESTUDIO_RECEIPT_DIR), {recursive:true, force:true});

const report = {ok:false, ts:new Date().toISOString(), mode:process.env.CODESTUDIO_PROVIDER_MODE, checks:[]};
const chromium = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codestudio-browser-smoke-'));
let server;
let browser;
let cdp;
let fatalError = null;

try{
  const created = await createServer();
  server = created.server;
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const appPort = server.address().port;
  const apiBase = `http://127.0.0.1:${appPort}`;
  const browserUrl = `${apiBase}/app/`;
  report.base = apiBase;
  report.browserUrl = browserUrl;

  const debugPort = await freePort();
  browser = spawn(chromium, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--allow-insecure-localhost',
    '--disable-web-security',
    '--window-size=1440,1100',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    browserUrl
  ], {stdio:['ignore','ignore','pipe']});
  let stderr = '';
  browser.stderr.on('data', d => stderr += d.toString());

  const wsUrl = await waitForWs(debugPort, stderr);
  cdp = await connectCdp(wsUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', {url:browserUrl});
  await delay(750);
  await waitForExpression(cdp, "document.readyState === 'complete'", 15000);
  await evaluate(cdp, `localStorage.setItem('kaixu_platform_backend_base', ${JSON.stringify(apiBase)})`);
  await cdp.send('Page.navigate', {url:browserUrl});
  await delay(750);
  await waitForExpression(cdp, "document.readyState === 'complete' && !!document.querySelector('#btnPlatform')", 15000);

  await check('browser opens app shell and sees platform button', async () => {
    const detail = await evaluate(cdp, `({title:document.title, hasPlatform:!!document.querySelector('#btnPlatform'), appText:document.body.innerText.includes('kAIxu CodeStudio Pro')})`);
    assert(detail.hasPlatform, 'Platform button missing');
    assert(detail.appText, 'App brand text missing');
    return detail;
  });

  await check('real browser click opens Platform Console modal', async () => {
    await clickSelector(cdp, '#btnPlatform');
    await waitForExpression(cdp, "document.querySelector('#modalTitle')?.textContent.includes('Platform Console')", 10000);
    const detail = await evaluate(cdp, `({modalTitle:document.querySelector('#modalTitle')?.textContent || '', sectionCount:document.querySelectorAll('.platformSection').length, hasVisualBuilder:document.body.innerText.includes('Visual workflow graph builder'), hasInvoices:document.body.innerText.includes('Provider routing + usage invoices')})`);
    assert(detail.modalTitle.includes('Platform Console'), 'Platform modal did not open');
    assert(detail.sectionCount >= 10, 'Platform sections missing');
    assert(detail.hasVisualBuilder && detail.hasInvoices, 'New platform sections missing');
    return detail;
  });

  await check('browser click installs a workflow template', async () => {
    await clickButtonByText(cdp, 'Install');
    await waitForExpression(cdp, "[...document.querySelectorAll('button')].some(b => b.textContent.includes('Open file'))", 10000);
    const detail = await evaluate(cdp, `({openFileButtons:[...document.querySelectorAll('button')].filter(b => b.textContent.includes('Open file')).length, workflowMetric:[...document.querySelectorAll('.platformMetric')].map(x=>x.innerText).find(x=>x.includes('Workflows')) || ''})`);
    assert(detail.openFileButtons >= 1, 'Workflow install did not update UI');
    return detail;
  });

  await check('browser click saves visual workflow graph locally through backend', async () => {
    await clickButtonByText(cdp, 'Save graph + compile');
    await waitForExpression(cdp, "document.body.innerText.includes('Workflow graph saved') || [...document.querySelectorAll('.listItem')].some(x => x.innerText.includes('Lead intake'))", 10000);
    const graphs = await fetchJson(`${apiBase}/api/platform/workflow-builder/graphs?projectId=default&limit=10`);
    assert(graphs.ok && graphs.graphs.length >= 1, 'Backend graph was not persisted');
    return {graphCount:graphs.graphs.length, firstGraph:graphs.graphs[0].title};
  });

  await check('browser click runs provider route optimizer and invoice generator', async () => {
    await clickButtonByText(cdp, 'Optimize provider route');
    await waitForExpression(cdp, "document.body.innerText.includes('Provider route selected') || document.body.innerText.includes('No ready route')", 10000);
    await clickButtonByText(cdp, 'Generate usage invoice');
    await waitForExpression(cdp, "document.body.innerText.includes('Invoice generated') || [...document.querySelectorAll('.listItem')].some(x => x.innerText.includes('Invoice'))", 10000);
    const decisions = await fetchJson(`${apiBase}/api/platform/provider-router?projectId=default&limit=10`);
    const invoices = await fetchJson(`${apiBase}/api/platform/invoices?projectId=default&limit=10`);
    assert(decisions.decisions.length >= 1, 'Route decision missing');
    assert(invoices.invoices.length >= 1, 'Invoice missing');
    return {decisions:decisions.decisions.length, invoices:invoices.invoices.length};
  });

  report.ok = report.checks.every(c => c.ok);
} catch(error) {
  if (cdp) {
    try { report.debugPage = await evaluate(cdp, `({url:location.href, ready:document.readyState, title:document.title, text:document.body ? document.body.innerText.slice(0,500) : '', html:document.documentElement ? document.documentElement.outerHTML.slice(0,500) : ''})`); } catch(debugError) { report.debugPage = {error:debugError.message}; }
  }
  fatalError = error;
  report.fatal = {name:error.name, message:error.message, stack:String(error.stack || '').split('\n').slice(0,5)};
} finally {
  if (cdp) cdp.close();
  if (browser && !browser.killed) browser.kill('SIGTERM');
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(userDataDir, {recursive:true, force:true}).catch(()=>{});
  await fs.mkdir(path.join(root, 'platform/proof'), {recursive:true});
  await fs.writeFile(path.join(root, 'platform/proof/browser-click-smoke-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (fatalError || !report.ok) process.exit(1);
}

async function check(name, fn){
  const entry = {name, ok:false, ts:new Date().toISOString()};
  try{ entry.detail = await fn(); entry.ok = true; }
  catch(error){ entry.error = error.message; }
  report.checks.push(entry);
  if (!entry.ok) throw new Error(`${name}: ${entry.error}`);
}

function assert(cond, msg){ if (!cond) throw new Error(msg); }

async function freePort(){
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForWs(port){
  const started = Date.now();
  while (Date.now() - started < 15000){
    try{
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await res.json();
      const page = pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl) || pages[0];
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    }catch{}
    await delay(150);
  }
  throw new Error('Chromium DevTools websocket did not become available.');
}

function connectCdp(wsUrl){
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)){
      const {resolve, reject} = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else resolve(msg.result || {});
    }
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve({
      send(method, params={}){
        const id = ++seq;
        ws.send(JSON.stringify({id, method, params}));
        return new Promise((resolve, reject) => pending.set(id, {resolve, reject}));
      },
      close(){ try{ ws.close(); }catch{} }
    }));
    ws.addEventListener('error', () => reject(new Error('CDP websocket error')));
  });
}

async function evaluate(cdp, expression){
  const res = await cdp.send('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true});
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || 'Runtime evaluation failed');
  return res.result?.value;
}

async function waitForExpression(cdp, expression, timeout=10000){
  const started = Date.now();
  while (Date.now() - started < timeout){
    if (await evaluate(cdp, expression).catch(()=>false)) return true;
    await delay(150);
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

async function clickSelector(cdp, selector){
  const rect = await evaluate(cdp, `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return {x:r.left + r.width/2, y:r.top + r.height/2, width:r.width, height:r.height}; })()`);
  if (!rect) throw new Error(`Selector not found: ${selector}`);
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseMoved', x:rect.x, y:rect.y, button:'left'});
  await cdp.send('Input.dispatchMouseEvent', {type:'mousePressed', x:rect.x, y:rect.y, button:'left', clickCount:1});
  await cdp.send('Input.dispatchMouseEvent', {type:'mouseReleased', x:rect.x, y:rect.y, button:'left', clickCount:1});
  await delay(250);
}

async function clickButtonByText(cdp, text){
  const handle = await evaluate(cdp, `(() => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim().includes(${JSON.stringify(text)})); if (!btn) return null; btn.setAttribute('data-smoke-target','1'); return true; })()`);
  if (!handle) throw new Error(`Button not found: ${text}`);
  await clickSelector(cdp, '[data-smoke-target="1"]');
  await evaluate(cdp, `document.querySelector('[data-smoke-target="1"]')?.removeAttribute('data-smoke-target')`);
}

async function fetchJson(url){
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(`${url} failed ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

function delay(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
