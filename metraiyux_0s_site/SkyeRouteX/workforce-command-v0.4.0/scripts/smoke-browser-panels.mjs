import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { smokeEnv } from './smoke-env.mjs';

const root = process.cwd();
const proofDir = path.join(root, 'proof');
fs.mkdirSync(proofDir, { recursive: true });
const dbPath = path.join(root, 'data', 'browser-panel-smoke-db.json');
if (fs.existsSync(dbPath)) fs.rmSync(dbPath, { force: true });
const port = 5839;
const baseUrl = `http://127.0.0.1:${port}`;
const env = smokeEnv({ PORT: String(port), DATABASE_PATH: dbPath, SKYE_ADMIN_EMAIL: 'admin@browser.internal.invalid', SKYE_ADMIN_PASSWORD: 'AdminBrowser123!' });
const server = spawn('node', ['src/server.js'], { cwd: root, env, stdio: 'ignore' });

let logs = 'server spawned with stdio ignored for deterministic smoke exit.';
function wait(ms){ const end=Date.now()+ms; while(Date.now()<end){} return Promise.resolve(); }
async function fetchText(pathname){ const res=await fetch(`${baseUrl}${pathname}`); const text=await res.text(); if(!res.ok) throw new Error(`${pathname} returned ${res.status}: ${text}`); return text; }
const checks=[];
function pass(name, data={}){ checks.push({ status:'PASS', name, data }); }
function assert(cond, name, data={}){ if(!cond){ const e=new Error(`FAIL: ${name}`); e.data=data; throw e; } pass(name,data); }
try{
  for (let i=0; i<80; i++) { try { const r = await fetch(baseUrl + '/api/health'); if (r.ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  const health = await fetch(`${baseUrl}/api/health`).then(r=>r.json());
  assert(health.ok && health.version === '0.4.0', 'health_reports_v0_4_0', health);
  const html = await fetchText('/');
  const css = await fetchText('/public/styles.css');
  const js = await fetchText('/public/app.js');
  assert(!html.includes('id="login-form"') && !html.includes('id="signup-form"'), 'html_uses_gate_owned_auth_not_local_login');
  const requiredHtml = ['btn-gate-check','session-label','market-form','job-form','feed-form','provider-jobs','applicant-pool','contractor-feed','assignments','routes','roster','ratings','operator-assign-form','rating-form','house-jobs','payments','audits','workflow-board','workflow-timeline'];
  for (const id of requiredHtml) assert(html.includes(`id="${id}"`), `html_has_${id}`);
  assert(html.includes('free99-gate.js') && html.includes('data-platform-id="skyeroutex"'), 'html_mounts_free99_gate');
  const requiredJs = ['/api/provider/jobs','/api/assignments','/api/jobs/${b.dataset.job}/accept-applicant','/api/assignments/${id}/${action}','/api/autonomous/recommend/','/api/house-command/freeze-payment','/api/route-jobs','/api/provider/roster','/api/house-command/assign','/api/house-command/workflow-board','/api/house-command/workflow-timeline','/api/ratings'];
  for (const token of requiredJs) assert(js.includes(token), `app_js_wires_${token.replace(/[^a-z0-9]+/gi,'_').slice(0,60)}`);
  assert(css.includes('max-height:520px') && css.includes('overflow:auto'), 'panels_are_scrollable');
  const out = { started_at: new Date().toISOString(), checks, server_log_excerpt: logs.slice(-2000) };
  const outPath = path.join(proofDir, `SMOKE_BROWSER_PANELS_${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out,null,2));
  console.log(`Browser panel proof written: ${outPath}`);
} catch (err) {
  const out = { started_at: new Date().toISOString(), checks, failure: err.message, data: err.data || null, server_log_excerpt: logs.slice(-4000) };
  const outPath = path.join(proofDir, `SMOKE_BROWSER_PANELS_FAILED_${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out,null,2));
  console.error(err);
  process.exitCode = 1;
} finally {
  try { process.kill(server.pid, 'SIGKILL'); } catch {}
  process.exit(process.exitCode || 0);
}
