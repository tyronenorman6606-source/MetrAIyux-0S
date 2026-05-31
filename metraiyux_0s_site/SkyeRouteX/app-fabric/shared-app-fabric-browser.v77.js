(function(){
  if(window.RoutexSharedAppFabricV77) return;
  var KEY = 'skye-app-fabric-v77-cache';
  var listeners = [];
  function clean(v){ return String(v == null ? '' : v).trim(); }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function nowISO(){ return new Date().toISOString(); }
  function read(){ try{ return JSON.parse(localStorage.getItem(KEY) || '{}'); }catch(_){ return {}; } }
  function write(v){ localStorage.setItem(KEY, JSON.stringify(v)); listeners.slice().forEach(function(fn){ try{ fn(clone(v)); }catch(_){} }); return v; }
  function authHeaders(){
    var token = clean(localStorage.getItem('phcSessionToken') || localStorage.getItem('skyeRoutexSessionToken') || '');
    var headers = { 'content-type':'application/json' };
    if(token) headers.authorization = 'Bearer ' + token;
    return headers;
  }
  function localOnly(payload){
    return Object.assign({
      ok:false,
      localOnly:true,
      backendProof:false,
      deploymentProof:false,
      liveProviderProof:false,
      proofScope:'browser-local-cache-not-production-proof',
      message:'This result came from the browser cache only. It is not certification, deployment proof, live telemetry, or provider proof.'
    }, payload || {});
  }
  function fallbackDisabled(path, err){ return localOnly({ error:'backend_unavailable_or_unauthorized', path:path, fallback:false, message:'Backend request failed or was unauthorized. No local success fallback was used.' }); }
  function req(path, body, fallback){
    return fetch(path, { method:'POST', headers:authHeaders(), body: JSON.stringify(body || {}) })
      .then(function(res){ return res.json().then(function(json){ if(!res.ok || json.ok === false) return json; return json; }); })
      .catch(function(err){
        if(window.SKYE_APP_FABRIC_ALLOW_LOCAL_FALLBACKS === true) return typeof fallback === 'function' ? fallback() : fallback;
        return fallbackDisabled(path, err);
      });
  }
  function ensure(){ var current = read(); if(!current.apps){ current = { apps:[{ slug:'skye-routex-core', title:'SkyeRoutex Core', route:'./index.html', appType:'ui' }, { slug:'audit-ready-console', title:'Audit Ready Console', route:'./apps/audit-ready-console/index.html', appType:'ui' }], installations:[], bindings:[], qaReports:[], buttonAudits:[], certifications:[], rbacPolicies:[], tenantPolicies:[], receipts:[], zeroSMounts:[], autodiscoveryRuns:[], updatedAt:nowISO() }; write(current); } return current; }
  function localRegistry(){ return localOnly({ registry:ensure() }); }
  function localAutodiscover(){ var s = ensure(); var known = [
    { slug:'ae-flow', title:'AE FLOW', route:'../AE-FLOW/AE-Flow/index.html', appType:'ui' },
    { slug:'whiteglove-bookings', title:'WhiteGlove Bookings', route:'../skyesol-whiteglove-bookings/index.js', appType:'service' },
    { slug:'whiteglove-dispatch', title:'WhiteGlove Dispatch', route:'../skyesol-whiteglove-dispatch/index.js', appType:'service' },
    { slug:'whiteglove-memberships', title:'WhiteGlove Memberships', route:'../skyesol-whiteglove-memberships/index.js', appType:'service' },
    { slug:'whiteglove-payments', title:'WhiteGlove Payments', route:'../skyesol-whiteglove-payments/index.js', appType:'service' },
    { slug:'whiteglove-sync', title:'WhiteGlove Sync', route:'../skyesol-whiteglove-sync/index.js', appType:'service' },
    { slug:'whiteglove-runtime', title:'WhiteGlove Runtime', route:'../skyesol-whiteglove-runtime/shared.js', appType:'service' }
  ];
    known.forEach(function(app){ if(!(s.apps || []).some(function(row){ return row.slug === app.slug; })) s.apps.push(app); });
    s.autodiscoveryRuns.unshift({ generatedAt:nowISO(), discovered:known.length, localOnly:true, backendProof:false });
    s.updatedAt = nowISO(); write(s); return localOnly({ run:s.autodiscoveryRuns[0], registry:s });
  }
  function localAutowire(){ var s = ensure(); if((s.apps || []).length < 3) localAutodiscover(); s.installations = (s.apps || []).map(function(app){ return { appSlug:app.slug, status:'browser-cache-installed-not-runtime-mounted', installedAt:nowISO(), localOnly:true, backendProof:false }; }); s.bindings = (s.apps || []).filter(function(app){ return app.slug !== 'skye-routex-core'; }).map(function(app){ return { appSlug:app.slug, shellSlug:'skye-routex-core', mode:'app-dock', status:'browser-cache-binding-not-runtime-mounted', boundAt:nowISO(), localOnly:true, backendProof:false }; }); s.updatedAt = nowISO(); write(s); return localOnly({ run:{ installed:s.installations.length, bound:s.bindings.length, generatedAt:nowISO(), localOnly:true, backendProof:false }, registry:s }); }
  function localQA(){ var s = ensure(); var reports = (s.apps || []).map(function(app){ return { slug:app.slug, ok:false, localOnly:true, checks:[{ label:'registered in browser cache', ok:!!app.slug }, { label:'route string present', ok:!!app.route }, { label:'backend proof present', ok:false }] }; }); var audit = { totalApps:reports.length, passingApps:0, ok:false, localOnly:true, backendProof:false, proofScope:'browser-local-cache-not-production-proof', reports:reports, generatedAt:nowISO() }; s.qaReports.unshift(audit); write(s); return localOnly({ audit:audit }); }
  function localDeadButtons(){ var qa = window.RoutexAuditReadyConsoleV77 && window.RoutexAuditReadyConsoleV77.collectStaticQa ? window.RoutexAuditReadyConsoleV77.collectStaticQa() : { totalButtons:0, buttons:[] }; var audit = { totalApps:(ensure().apps || []).length, passingApps:0, ok:false, localOnly:true, backendProof:false, browserClickProof:false, proofScope:'static-browser-cache-audit-not-click-proof', reports:[{ slug:'audit-ready-console', ok:false, localOnly:true, totalButtons:qa.totalButtons, deadButtons:null, note:'Button inventory only. No browser click proof or runtime backend proof was executed.', generatedAt:nowISO() }], generatedAt:nowISO() }; var s = ensure(); s.buttonAudits.unshift(audit); write(s); return localOnly({ audit:audit }); }
  function localCertify(){ var s = ensure(); var reports = (s.apps || []).map(function(app){ return { slug:app.slug, ok:false, score:null, localOnly:true, status:'browser-local-not-certified-backend-proof-required' }; }); var audit = { totalApps:reports.length, passingApps:0, ok:false, localOnly:true, backendProof:false, deploymentProof:false, liveProviderProof:false, proofScope:'browser-local-cache-not-certification', reports:reports, generatedAt:nowISO() }; s.certifications.unshift(audit); write(s); return localOnly({ audit:audit }); }
  function localSeedRbac(){ var s = ensure(); s.rbacPolicies = []; (s.apps || []).forEach(function(app){ ['viewer','operator','admin'].forEach(function(role){ s.rbacPolicies.push({ appSlug:app.slug, roleKey:role, permissions:['view:app'], scopes:[app.slug], updatedAt:nowISO(), localOnly:true, backendProof:false }); }); }); write(s); return localOnly({ policies:s.rbacPolicies }); }
  function localRbacAudit(){ var s = ensure(); if(!(s.rbacPolicies || []).length) localSeedRbac(); var reports = (s.apps || []).map(function(app){ return { slug:app.slug, ok:false, localOnly:true, roles:['viewer','operator','admin'], backendProof:false }; }); return localOnly({ audit:{ totalApps:reports.length, passingApps:0, ok:false, localOnly:true, backendProof:false, reports:reports, generatedAt:nowISO() } }); }
  function localSeedTenant(){ var s = ensure(); s.tenantPolicies = (s.apps || []).map(function(app){ return { appSlug:app.slug, storageNamespace:'phc.' + app.slug + '.{orgId}.{tenantId}', dbSchema:'tenant_' + app.slug.replace(/[^a-z0-9]+/g,'_'), allowedTargets:[app.slug,'skye-routex-core'], updatedAt:nowISO(), localOnly:true, backendProof:false }; }); write(s); return localOnly({ policies:s.tenantPolicies }); }
  function localTenantAudit(){ var s = ensure(); if(!(s.tenantPolicies || []).length) localSeedTenant(); var reports = (s.apps || []).map(function(app){ return { slug:app.slug, ok:false, localOnly:true, checks:{ policyPresent:true, crossTenantDenied:null, backendProof:false } }; }); return localOnly({ audit:{ totalApps:reports.length, passingApps:0, ok:false, localOnly:true, backendProof:false, reports:reports, generatedAt:nowISO() } }); }
  function localReceipts(){ var s = ensure(); s.receipts = (s.apps || []).map(function(app){ return { appSlug:app.slug, status:'browser-cache-only-not-deployment-proof', generatedAt:nowISO(), localOnly:true, deploymentProof:false }; }); write(s); return localOnly({ receipts:s.receipts }); }
  function localMount(){ var s = ensure(); var plan = { generatedAt:nowISO(), localOnly:true, backendProof:false, runtimeMounted:false, apps:(s.apps || []).map(function(app){ return { slug:app.slug, route:app.route }; }), bindings:s.bindings || [] }; s.zeroSMounts.unshift(plan); write(s); return localOnly({ mountPlan:plan }); }
  function localScaffoldPlus(input){ var slug = clean(input && input.slug || 'dropin-' + Date.now().toString(36)).toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'') || 'dropin-app'; return localOnly({ output:{ appDir:'./apps/' + slug + '/', manifestPath:'./apps/' + slug + '/skye-app.v77.json', bridgeScript:'./app-fabric/shared-app-fabric-browser.v77.js', shellBridge:'./housecircle.integral.v77.js', localOnly:true, created:false, note:'No filesystem write happened from the browser. Use the backend scaffold endpoint for a real app package.' } }); }
  var api = {
    listen:function(fn){ listeners.push(fn); return function(){ listeners = listeners.filter(function(x){ return x !== fn; }); }; },
    readCache:function(){ return ensure(); },
    refreshRegistry:function(){ return req('/.netlify/functions/phc-app-fabric-registry', {}, localRegistry); },
    autodiscoverEstate:function(){ return req('/.netlify/functions/phc-app-fabric-autodiscover', {}, localAutodiscover); },
    autowireEstate:function(){ return req('/.netlify/functions/phc-app-fabric-autowire', {}, localAutowire); },
    runEstateQA:function(){ return req('/.netlify/functions/phc-app-fabric-estate-qa', {}, localQA); },
    runDeadButtonAudit:function(){ return req('/.netlify/functions/phc-app-fabric-dead-button-audit', {}, localDeadButtons); },
    certifyEstate:function(){ return req('/.netlify/functions/phc-app-fabric-certify', {}, localCertify); },
    seedRbac:function(){ return req('/.netlify/functions/phc-app-fabric-rbac', {}, localSeedRbac); },
    auditRbac:function(){ return req('/.netlify/functions/phc-app-fabric-rbac-audit', {}, localRbacAudit); },
    seedTenant:function(){ return req('/.netlify/functions/phc-app-fabric-tenant-isolation', { mode:'seed' }, localSeedTenant); },
    auditTenant:function(){ return req('/.netlify/functions/phc-app-fabric-tenant-audit', {}, localTenantAudit); },
    deploymentReceipts:function(){ return req('/.netlify/functions/phc-app-fabric-deployment-receipts', {}, localReceipts); },
    executeZeroSMount:function(){ return req('/.netlify/functions/phc-app-fabric-0s-mount', {}, localMount); },
    scaffoldPlus:function(input){ return req('/.netlify/functions/phc-app-fabric-scaffold-plus', input || {}, function(){ return localScaffoldPlus(input); }); }
  };
  window.RoutexSharedAppFabricV77 = api;
  ensure();
})();
