const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, '.phc_data_v83_smoke');
const FABRIC_DIR = path.join(ROOT, 'netlify', '.phc_app_fabric_v83_smoke');
fs.rmSync(DATA_DIR, { recursive:true, force:true });
fs.rmSync(FABRIC_DIR, { recursive:true, force:true });
process.env.PHC_DATA_DIR = DATA_DIR;
process.env.PHC_APP_FABRIC_DIR = FABRIC_DIR;
process.env.PHC_SESSION_SECRET = 'v83-session-secret-abcdefghijklmnopqrstuvwxyz-123456789';
process.env.PHC_OPERATOR_PASSWORD = 'v83-password';
process.env.PHC_OPERATOR_ROLE = 'admin';
process.env.PHC_ALLOW_PROVIDER_NETWORK = '';
process.env.PHC_NEON_AUTOMIRROR = '';
process.env.PHC_REQUIRE_NEON_PRIMARY = '';
process.env.PHC_ALLOW_UNSIGNED_WEBHOOKS = '';
process.env.PHC_PRODUCTION = '';
process.env.PHC_ALLOW_BOOTSTRAP_LOGIN = '';

const login = require('./netlify/functions/phc-auth-login').handler;
const health = require('./netlify/functions/phc-health').handler;
const syncState = require('./netlify/functions/phc-sync-state').handler;
const paymentHealth = require('./netlify/functions/phc-payment-provider-health').handler;
const paymentIntent = require('./netlify/functions/phc-payment-intent').handler;
const refundIntent = require('./netlify/functions/phc-refund-intent').handler;
const stripeWebhook = require('./netlify/functions/phc-webhook-stripe').handler;
const paypalWebhook = require('./netlify/functions/phc-webhook-paypal').handler;
const persistencePolicyRoute = require('./netlify/functions/phc-persistence-policy').handler;
const deadButtonAudit = require('./netlify/functions/phc-app-fabric-dead-button-audit').handler;
const deploymentReceipts = require('./netlify/functions/phc-app-fabric-deployment-receipts').handler;
const zeroSMount = require('./netlify/functions/phc-app-fabric-0s-mount').handler;
const { readOrgState } = require('./netlify/functions/_lib/housecircle-cloud-store');
const { persistencePolicy, persistOrgState } = require('./netlify/functions/_lib/housecircle-persistence');
const { productionReadiness } = require('./netlify/functions/_lib/housecircle-runtime-guard');
const { PHC_SCHEMA_SQL, readNeonConfig } = require('./netlify/functions/_lib/housecircle-neon-store');

function event(method, body, token, query, headers){ const h={ 'content-type':'application/json', ...(headers||{}) }; if(token) h.authorization='Bearer '+token; return { httpMethod:method, headers:h, queryStringParameters:query||{}, body: body===undefined ? '' : (typeof body === 'string' ? body : JSON.stringify(body)) }; }
function parsed(res){ try{ return JSON.parse(res.body || '{}'); }catch(_){ return {}; } }
const results=[];
async function check(name, fn){ try{ const detail=await fn(); const ok=detail===true || !!(detail && detail.ok); results.push({ name, ok, detail:detail===true?{}:detail }); }catch(err){ results.push({ name, ok:false, error:err && err.stack || String(err) }); } }
async function doLogin(){ const res=await login(event('POST',{ orgId:'v83-org', operatorId:'founder-admin', operatorName:'Skyes Over London', role:'admin', password:'v83-password', deviceId:'device-admin' })); return { res, body:parsed(res) }; }
(async()=>{
  const admin = await doLogin(); const token=admin.body.token;
  await check('V83 login creates active revocation-aware session', async()=>{ const state=readOrgState('v83-org'); return { ok:admin.res.statusCode===200 && !!token && state.sessions.length===1 && state.sessions[0].trustedDevice===true, statusCode:admin.res.statusCode, sessions:state.sessions.length }; });
  await check('V83 health is auth locked', async()=>{ const denied=await health({ httpMethod:'GET', headers:{}, queryStringParameters:{ orgId:'v83-org' }, body:'' }); const allowed=await health({ httpMethod:'GET', headers:{ authorization:'Bearer '+token }, queryStringParameters:{ orgId:'v83-org' }, body:'' }); return { ok:denied.statusCode===401 && allowed.statusCode===200 && parsed(allowed).storage.productionRequirement.includes('not deployed DNS/SSL proof'), denied:denied.statusCode, allowed:allowed.statusCode }; });
  await check('V83 strict Neon-primary blocks before local JSON write when Neon env is absent', async()=>{ const before = fs.existsSync(path.join(DATA_DIR,'strict-neon-org.json')); process.env.PHC_REQUIRE_NEON_PRIMARY='1'; delete process.env.NEON_DATABASE_URL; delete process.env.DATABASE_URL; let blocked=false, message=''; try{ await persistOrgState('strict-neon-org', { orgId:'strict-neon-org', bundle:{}, sessions:[] }, { eventKind:'strict_test' }); }catch(err){ blocked=true; message=String(err.message||''); } process.env.PHC_REQUIRE_NEON_PRIMARY=''; const after = fs.existsSync(path.join(DATA_DIR,'strict-neon-org.json')); return { ok:blocked && !before && !after && /Local fallback write was blocked/.test(message), blocked, before, after, message }; });
  await check('V83 persistence policy route is locked and labels local mode honestly', async()=>{ const denied=await persistencePolicyRoute({ httpMethod:'GET', headers:{}, queryStringParameters:{ orgId:'v83-org' }, body:'' }); const allowed=await persistencePolicyRoute({ httpMethod:'GET', headers:{ authorization:'Bearer '+token }, queryStringParameters:{ orgId:'v83-org' }, body:'' }); const body=parsed(allowed); return { ok:denied.statusCode===401 && allowed.statusCode===200 && body.policy && body.policy.mode==='file-primary-local', denied:denied.statusCode, policy:body.policy }; });
  await check('V83 sync-state writes through persistence wrapper', async()=>{ const res=await syncState(event('POST',{ orgId:'v83-org', bundle:{ state:{ locations:[{ id:'v83-loc', name:'V83 Location', updatedAt:new Date().toISOString() }] } }, reason:'v83 smoke sync' }, token)); const state=readOrgState('v83-org'); return { ok:res.statusCode===200 && state.eventLog.some((row)=>row.kind==='persistence_policy'), statusCode:res.statusCode, eventCount:state.eventLog.length }; });
  await check('V83 production readiness refuses plaintext/bootstrap-only credentials', async()=>{ const oldProd=process.env.PHC_PRODUCTION, oldPlain=process.env.PHC_OPERATOR_PASSWORD, oldHash=process.env.PHC_OPERATOR_PASSWORD_HASH, oldSalt=process.env.PHC_OPERATOR_PASSWORD_SALT; process.env.PHC_PRODUCTION='1'; process.env.PHC_OPERATOR_PASSWORD='plain-prod-password'; delete process.env.PHC_OPERATOR_PASSWORD_HASH; delete process.env.PHC_OPERATOR_PASSWORD_SALT; const ready=productionReadiness(); process.env.PHC_PRODUCTION=oldProd||''; process.env.PHC_OPERATOR_PASSWORD=oldPlain||''; if(oldHash) process.env.PHC_OPERATOR_PASSWORD_HASH=oldHash; else delete process.env.PHC_OPERATOR_PASSWORD_HASH; if(oldSalt) process.env.PHC_OPERATOR_PASSWORD_SALT=oldSalt; else delete process.env.PHC_OPERATOR_PASSWORD_SALT; return { ok:ready.ok===false && ready.failing.some((row)=>row.key==='operatorCredentialHashInProduction'), failing:ready.failing }; });
  await check('V83 Neon schema contains operational tables, not snapshot-only mirror', async()=>{ const required=['phc_operational_events','phc_payment_ledger','phc_webhook_replay_ledger','phc_active_sessions']; return { ok:required.every((name)=>PHC_SCHEMA_SQL.includes(name)), required, mode:readNeonConfig().mode }; });
  await check('V83 provider health reports no live execution without env/network', async()=>{ const res=await paymentHealth({ httpMethod:'GET', headers:{ authorization:'Bearer '+token }, queryStringParameters:{ orgId:'v83-org' }, body:'' }); const body=parsed(res); return { ok:res.statusCode===200 && body.providers.every((p)=>p.liveExecutionReady===false), providers:body.providers.map((p)=>({provider:p.provider, ready:p.liveExecutionReady})) }; });
  await check('V83 payment/refund ledgers do not claim money movement when network is blocked', async()=>{ process.env.STRIPE_SECRET_KEY='sk_test_v83_fake'; process.env.PHC_ALLOW_PROVIDER_NETWORK=''; const pay=await paymentIntent(event('POST',{ orgId:'v83-org', provider:'stripe', amountCents:2200, currency:'USD', orderId:'order-v83-network-blocked' }, token)); const ref=await refundIntent(event('POST',{ orgId:'v83-org', provider:'stripe', amountCents:1100, currency:'USD', paymentIntentId:'pi_fake_v83', idempotencyKey:'refund-v83' }, token)); const b1=parsed(pay), b2=parsed(ref); const state=readOrgState('v83-org'); return { ok:pay.statusCode===503 && ref.statusCode===503 && b1.liveMoneyMoved===false && b2.liveMoneyMoved===false && state.paymentLedger.length>=2, paymentStatus:b1.ledger&&b1.ledger.status, refundStatus:b2.ledger&&b2.ledger.status, ledger:state.paymentLedger.length }; });
  await check('V83 signed Stripe webhook persists through persistence wrapper and denies replay', async()=>{ process.env.STRIPE_WEBHOOK_SECRET='whsec_v83'; const payload=JSON.stringify({ id:'evt_v83_stripe_1', type:'payment_intent.succeeded', orgId:'v83-org', data:{ object:{ metadata:{ orgId:'v83-org' } } } }); const t=Math.floor(Date.now()/1000).toString(); const sig=crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(t+'.'+payload).digest('hex'); const first=await stripeWebhook(event('POST', payload, '', {}, { 'Stripe-Signature':'t='+t+',v1='+sig })); const second=await stripeWebhook(event('POST', payload, '', {}, { 'Stripe-Signature':'t='+t+',v1='+sig })); const state=readOrgState('v83-org'); return { ok:first.statusCode===200 && second.statusCode===409 && state.eventLog.some((row)=>row.kind==='persistence_policy'), first:parsed(first), second:parsed(second) }; });
  await check('V83 PayPal verification path refuses fake success without network and has real verify call available', async()=>{ process.env.PAYPAL_WEBHOOK_ID='paypal-webhook-v83'; process.env.PHC_ALLOW_PROVIDER_NETWORK=''; process.env.PAYPAL_CLIENT_ID='client'; process.env.PAYPAL_CLIENT_SECRET='secret'; const headers={ 'paypal-transmission-id':'tx-v83', 'paypal-transmission-time':new Date().toISOString(), 'paypal-cert-url':'https://api.paypal.com/cert.pem', 'paypal-auth-algo':'SHA256withRSA', 'paypal-transmission-sig':'sig' }; const res=await paypalWebhook(event('POST',{ id:'WH-v83-2', event_type:'PAYMENT.CAPTURE.COMPLETED', orgId:'v83-org' }, '', {}, headers)); const providerFile=fs.readFileSync(path.join(ROOT,'netlify/functions/_lib/housecircle-payment-providers.js'),'utf8'); return { ok:res.statusCode===503 && parsed(res).verificationReady===true && providerFile.includes('/v1/notifications/verify-webhook-signature') && providerFile.includes('/v1/oauth2/token'), statusCode:res.statusCode, body:parsed(res) }; });
  await check('V83 App Fabric static audit says it is not browser click automation', async()=>{ const res=await deadButtonAudit(event('POST',{ orgId:'v83-org' }, token)); const body=parsed(res); return { ok:res.statusCode===200 && body.audit && body.audit.browserClickProof===false && body.audit.proofScope==='static-file-analysis-not-browser-click-automation', scope:body.audit && body.audit.proofScope }; });
  await check('V83 deployment receipts are local-readiness only', async()=>{ const res=await deploymentReceipts(event('POST',{ orgId:'v83-org' }, token)); const body=parsed(res); const receipts=body.receipts||[]; return { ok:res.statusCode===200 && receipts.length>0 && receipts.every((r)=>r.deploymentProof===false && r.liveProviderProof===false && /local readiness only/i.test(r.note||'')), statuses:receipts.map((r)=>r.status).slice(0,5) }; });
  await check('V83 0s mount does not claim sandbox/process runtime', async()=>{ const res=await zeroSMount(event('POST',{ orgId:'v83-org' }, token)); const body=parsed(res); return { ok:res.statusCode===200 && body.mountPlan && body.mountPlan.mountMode==='shell-manifest-mount-not-process-or-sandbox-runtime', mode:body.mountPlan && body.mountPlan.mountMode }; });

  await check('V83 index runtime wiring exists', async()=>{ const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'); return { ok:html.includes('const platform =') && html.includes('data-action=') && html.includes('async function pingRuntime') && html.includes('./v1/runtime-summary'), inlineRuntime:true }; });

  await check('V83 package is pruned of old smoke/state/directive residue', async()=>{ const forbidden=[]; function walk(dir){ for(const item of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,item.name); const rel=path.relative(ROOT,p).replace(/\\/g,'/'); if(item.isDirectory()){ if(/^WHITE_GLOVE_V8[12]$/.test(item.name) || /^\.phc_data_v8[12]/.test(item.name) || /\.phc_app_fabric_v77/.test(rel)) forbidden.push(rel); else walk(p); } else { if(/PLATFORM_HOUSE_CIRCLE_SMOKE_V8[12]\.js$/.test(item.name) || /MASSIVE_HARDENING_DIRECTIVE_V8[12]\.md$/.test(item.name) || /V8[12]_IMPLEMENTATION_STATUS\.md$/.test(item.name)) forbidden.push(rel); } } } walk(ROOT); return { ok:forbidden.length===0, forbidden }; });

  const passed=results.filter((r)=>r.ok).length; const failed=results.filter((r)=>!r.ok);
  const out={ ok:failed.length===0, version:'83.0.0', generatedAt:new Date().toISOString(), passed, total:results.length, failed:failed.length, results, truth:{ livePaymentProof:false, liveProviderNetworkProof:false, liveNeonPrimaryProof:false, deployedDnsSslProof:false, browserClickAutomationProof:false, retainedLegacyClientModules:true, retainedLegacyClientModulesReason:'Current index.html depends on historical client modules; old proof/state/docs were pruned and claims were corrected.' } };
  fs.mkdirSync(path.join(ROOT,'WHITE_GLOVE_V83'), { recursive:true });
  fs.writeFileSync(path.join(ROOT,'WHITE_GLOVE_V83/smoke_output_v83.json'), JSON.stringify(out,null,2));
  fs.writeFileSync(path.join(ROOT,'WHITE_GLOVE_V83/V83_TRUTH_LEDGER.json'), JSON.stringify({ version:'83.0.0', generatedAt:out.generatedAt, implemented:['clean V83 package pruning of old proof/state/doc residue','strict Neon-primary fails before local fallback write when missing','operational Neon table schema for sessions/events/payments/webhook replay in addition to snapshots','real PayPal OAuth + verify-webhook-signature path when network and credentials are enabled','Stripe and PayPal webhook persistence through the shared persistence layer','production readiness refuses plaintext/bootstrap-only credential posture','static audit explicitly labeled as non-browser-click proof','deployment receipts explicitly local-readiness only','0s mount explicitly manifest-only, not sandbox/process runtime'], notClaimed:['live payment movement','live provider callback proof','live Neon primary proof','deployed DNS/SSL proof','browser click automation proof','full warehouse/driver/navigation operations depth'] }, null, 2));
  console.log(JSON.stringify({ ok:out.ok, passed, total:results.length, failed:failed.length, output:'WHITE_GLOVE_V83/smoke_output_v83.json' }, null, 2));
  if(!out.ok){ console.error(JSON.stringify(failed,null,2)); process.exit(1); }
})();

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
// BEGIN quantumskyes:adaptive-neon-scrollbar-js
(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function verticalSource(){
    return document.scrollingElement || document.documentElement;
  }

  function horizontalSource(){
    const doc = document.scrollingElement || document.documentElement;
    if(doc.scrollWidth > doc.clientWidth + 4) return { node: doc, mode: 'horizontal' };
    const selectors = [
      '.site-header nav',
      '.table-wrap',
      '.topnav',
      '.route-grid',
      '.command-table',
      '.saas-table'
    ];
    const node = selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find((element) => element.scrollWidth > element.clientWidth + 4);
    return node ? { node, mode: 'horizontal' } : { node: doc, mode: 'page' };
  }

  onReady(() => {
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.querySelectorAll('.mcp-neon-scroll-rail,.mcp-neon-scroll-corner').forEach((node) => node.remove());

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const corner = document.createElement('div');
    corner.className = 'mcp-neon-scroll-corner';
    corner.setAttribute('aria-hidden', 'true');

    document.body.append(yRail, xRail, corner);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let activeHorizontal = horizontalSource();
    let raf = 0;
    let dragRaf = 0;
    let pendingDrag = null;
    let metrics = null;

    function measure(){
      const ySource = verticalSource();
      const yTrack = Math.max(1, yRail.clientHeight);
      const yMax = Math.max(1, ySource.scrollHeight - window.innerHeight);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      const ySize = clamp((window.innerHeight / Math.max(ySource.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);

      if(!activeHorizontal?.node || !document.documentElement.contains(activeHorizontal.node)){
        activeHorizontal = horizontalSource();
      }
      const xTrack = Math.max(1, xRail.clientWidth);
      const xSource = activeHorizontal.node;
      const xMax = Math.max(0, xSource.scrollWidth - xSource.clientWidth);
      const pageMode = activeHorizontal.mode === 'page' || xMax <= 1;
      const xRatio = pageMode ? yRatio : clamp(xSource.scrollLeft / xMax, 0, 1);
      const xSize = pageMode
        ? clamp(xTrack * .24, 84, Math.max(84, xTrack * .38))
        : clamp((xSource.clientWidth / Math.max(xSource.scrollWidth, xSource.clientWidth)) * xTrack, 84, xTrack);

      return { ySource, yTrack, yMax, yRatio, ySize, xSource, xTrack, xMax, xRatio, xSize, pageMode };
    }

    function paintRails(view){
      yThumb.style.height = `${Math.floor(view.ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(view.yRatio * Math.max(0, view.yTrack - view.ySize))}px`);
      xThumb.style.width = `${Math.floor(view.xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(view.xRatio * Math.max(0, view.xTrack - view.xSize))}px`);
      xRail.dataset.scrollMode = view.pageMode ? 'page' : 'horizontal';
    }

    function scheduleUpdate(){
      if(raf) return;
      raf = window.requestAnimationFrame(updateRails);
    }

    function updateRails(){
      raf = 0;
      metrics = measure();
      paintRails(metrics);
    }

    function flushDrag(){
      dragRaf = 0;
      if(!pendingDrag) return;
      const { axis, ratio, snapshot } = pendingDrag;
      pendingDrag = null;
      const next = snapshot || measure();
      const bounded = clamp(ratio, 0, 1);

      if(axis === 'y'){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: next.pageMode ? yRatio : next.xRatio
        });
      }else if(next.pageMode){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: yRatio
        });
      }else{
        next.xSource.scrollLeft = bounded * next.xMax;
        paintRails({
          ...next,
          xRatio: clamp(next.xSource.scrollLeft / Math.max(1, next.xMax), 0, 1)
        });
      }
      scheduleUpdate();
    }

    function queueDrag(axis, ratio, snapshot){
      pendingDrag = { axis, ratio, snapshot };
      if(!dragRaf) dragRaf = window.requestAnimationFrame(flushDrag);
    }

    function bindRail(rail, thumb, axis, setter){
      let dragging = false;
      let pointerOffset = 0;
      let dragSnapshot = null;
      let railStart = 0;
      let track = 1;
      let size = 1;

      function ratioFromEvent(event, keepOffset){
        const coordinate = axis === 'y' ? event.clientY : event.clientX;
        const localOffset = keepOffset ? pointerOffset : size / 2;
        return clamp((coordinate - railStart - localOffset) / Math.max(1, track - size), 0, 1);
      }

      rail.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        dragSnapshot = measure();
        const railRect = rail.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        railStart = axis === 'y' ? railRect.top : railRect.left;
        track = axis === 'y' ? dragSnapshot.yTrack : dragSnapshot.xTrack;
        size = axis === 'y' ? dragSnapshot.ySize : dragSnapshot.xSize;
        document.documentElement.classList.add('mcp-neon-scroll-dragging');
        rail.classList.add('is-dragging');
        rail.setPointerCapture?.(event.pointerId);
        pointerOffset = event.target === thumb || thumb.contains(event.target)
          ? (axis === 'y' ? event.clientY - thumbRect.top : event.clientX - thumbRect.left)
          : (axis === 'y' ? thumbRect.height / 2 : thumbRect.width / 2);
        setter(ratioFromEvent(event, event.target === thumb || thumb.contains(event.target)), dragSnapshot);
      });

      rail.addEventListener('pointermove', (event) => {
        if(!dragging) return;
        event.preventDefault();
        setter(ratioFromEvent(event, true), dragSnapshot);
      });

      function endDrag(event){
        if(!dragging) return;
        dragging = false;
        dragSnapshot = null;
        document.documentElement.classList.remove('mcp-neon-scroll-dragging');
        rail.classList.remove('is-dragging');
        rail.releasePointerCapture?.(event.pointerId);
        scheduleUpdate();
      }

      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
    }

    bindRail(yRail, yThumb, 'y', (ratio, snapshot) => queueDrag('y', ratio, snapshot));
    bindRail(xRail, xThumb, 'x', (ratio, snapshot) => queueDrag('x', ratio, snapshot));

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      activeHorizontal = horizontalSource();
      scheduleUpdate();
    }, { passive: true });
    document.addEventListener('scroll', (event) => {
      if(event.target && event.target === activeHorizontal.node) scheduleUpdate();
    }, true);
    document.addEventListener('pointerover', (event) => {
      const candidate = event.target && event.target.closest && event.target.closest('.site-header nav,.table-wrap,.topnav,.route-grid');
      if(candidate && candidate.scrollWidth > candidate.clientWidth + 4){
        activeHorizontal = { node: candidate, mode: 'horizontal' };
        scheduleUpdate();
      }
    }, { passive: true });

    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 350);
    window.setTimeout(scheduleUpdate, 1200);
  });
})();
// END quantumskyes:adaptive-neon-scrollbar-js

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js

// BEGIN quantumskyes:neon-motion-chrome-vanilla-js
(function(){
  if(window.__mcpNeonMotionChrome) return;
  window.__mcpNeonMotionChrome = true;
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(function(){
    if(!document.querySelector('.neon-scroll-progress')){
      const progress = document.createElement('i');
      progress.className = 'neon-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      const update = function(){
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
    if(!document.querySelector('.neon-cursor-trail') && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const glow = document.createElement('div');
      glow.className = 'neon-cursor-trail';
      glow.setAttribute('aria-hidden', 'true');
      document.body.append(glow);
      window.addEventListener('pointermove', function(event){
        glow.style.transform = 'translate3d(' + (event.clientX - 150) + 'px,' + (event.clientY - 150) + 'px,0)';
      }, { passive: true });
    }
  });
})();
// END quantumskyes:neon-motion-chrome-vanilla-js
}
