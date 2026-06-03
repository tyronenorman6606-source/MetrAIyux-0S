
(function(){
  const $ = (id)=>document.getElementById(id);
  const read = (k, fallback=null)=>{try{return JSON.parse(localStorage.getItem(k)) ?? fallback}catch(e){return fallback}}
  const write = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
  const now = ()=>new Date().toISOString();
  const rid = (p='rec')=>p+'_'+Math.random().toString(36).slice(2,8)+'_'+Date.now().toString(36);
  const query = new URLSearchParams(location.search);
  const slugify = (value, fallback='customer-workspace')=>String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80) || fallback;
  function shortHash(value=''){
    let hash = 2166136261;
    String(value).split('').forEach((char)=>{ hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); });
    return (hash >>> 0).toString(36).slice(0,8);
  }
  function identityPreview(data={}, source='identity_preview'){
    const email = String(data.email || data.customer_email || data.approval_email || '').trim().toLowerCase();
    const company = String(data.company_name || data.company || data.client || email.split('@')[0] || 'customer').trim();
    const workspace_slug = slugify(data.workspace_slug || company);
    const suffix = shortHash(`${workspace_slug}:${email}:${data.plan || 'starter-command'}`);
    return {
      customer_id: data.customer_id || `cust_${workspace_slug}_${suffix}`,
      workspace_id: data.workspace_id || `ws_${workspace_slug}_${suffix}`,
      workspace_slug,
      company_name: company,
      owner_email: email,
      gate_username: email || `${workspace_slug}@gate.metraiyux.local`,
      requested_skyemail: String(data.requested_skyemail || data.skyemail || data.skyemail_alias || data.mailbox_email || '').trim().toLowerCase(),
      plan: data.plan || 'starter-command',
      client_login_path: `client-login.html?client=${encodeURIComponent(workspace_slug)}`,
      founder_recovery_path: `/founder-command/?tab=recovery&workspace=${encodeURIComponent(workspace_slug)}`,
      source,
      generated_at: now()
    };
  }
  function output(id, data){ const el=$(id); if(el) el.textContent = typeof data==='string'?data:JSON.stringify(data,null,2); }
  function getForm(formId){ const form=$(formId); const data={}; if(!form) return data; new FormData(form).forEach((v,k)=>{data[k]=v}); return data; }
  const quoteOnlyPlanRoutes = {
    'houseoperations-command':'/sales/pricing-offer-router.html#houseoperations-stack-included',
    'houseoperations-managed':'/sales/pricing-offer-router.html#houseoperations-stack-included',
    'houseoperations-standalone-review':'/sales/pricing-offer-router.html#houseoperations-stack-included',
    'skyemusicnexus-provider-integration-proof-lane':'/sales/pricing-offer-router.html#skyemusicnexus-provider-integration-proof-lane'
  };
  const isQuoteOnlyPlan = (plan)=>Object.prototype.hasOwnProperty.call(quoteOnlyPlanRoutes, plan);
  function skyePayUrl(plan='starter-command', client='metraiyux-0s'){
    if (isQuoteOnlyPlan(plan)) {
      const reviewUrl = new URL(quoteOnlyPlanRoutes[plan], location.origin);
      reviewUrl.searchParams.set('client', client || 'metraiyux-0s');
      reviewUrl.searchParams.set('plan', plan);
      return reviewUrl.toString();
    }
    const offers={
      'starter-command':'metraiyux-starter-command',
      'growth-cabinet':'metraiyux-growth-cabinet',
      'routex-workforce-command':'metraiyux-routex-workforce-command',
      'autonomous-office':'metraiyux-autonomous-office',
      'enterprise-command':'metraiyux-enterprise-command',
      'skyemusicnexus-studio':'skyemusicnexus-studio',
      'skyemusicnexus-label-command':'skyemusicnexus-label-command',
      'skyemusicnexus-managed-music-ops':'skyemusicnexus-managed-music-ops',
      'skyemusicnexus-single-song-drop':'skyemusicnexus-single-song-drop',
      'skyemusicnexus-release-drop-plus':'skyemusicnexus-release-drop-plus',
      'skyemusicnexus-ep-drop':'skyemusicnexus-ep-drop',
      'skyemusicnexus-album-drop':'skyemusicnexus-album-drop',
      'skyemusicnexus-catalog-import-pack':'skyemusicnexus-catalog-import-pack',
      'skyemusicnexus-royalty-ledger-setup':'skyemusicnexus-royalty-ledger-setup',
      'skyemusicnexus-payout-review-pack':'skyemusicnexus-payout-review-pack',
      'skyemusicnexus-artist-profile-buildout':'skyemusicnexus-artist-profile-buildout',
      'skyemusicnexus-social-caption-pack':'skyemusicnexus-social-caption-pack',
      'skyemusicnexus-cover-canvas-request':'skyemusicnexus-cover-canvas-request',
      'skyemusicnexus-short-form-clip-brief':'skyemusicnexus-short-form-clip-brief',
      'skyemusicnexus-release-content-kit':'skyemusicnexus-release-content-kit',
      'skyemusicnexus-community-campaign-sprint':'skyemusicnexus-community-campaign-sprint',
      'skyemusicnexus-extra-artist-seat':'skyemusicnexus-extra-artist-seat',
      'skyemusicnexus-extra-release-pack':'skyemusicnexus-extra-release-pack',
      'skyemusicnexus-gated-audio-vault-pack':'skyemusicnexus-gated-audio-vault-pack',
      'skyemusicnexus-white-label-artist-portal':'skyemusicnexus-white-label-artist-portal',
      'managed-gate':'skygatefs27-managed-control-plane'
    };
    const url=new URL('https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html');
    url.searchParams.set('client', client || 'metraiyux-0s');
    url.searchParams.set('offer', offers[plan] || offers['starter-command']);
    url.searchParams.set('skyemerit_code', 'SKYEMERIT-FIRST-BEST');
    return url.toString();
  }
  async function issueSkyeMeritPack(data={}, source='onboarding'){
    const result = await postJson('/api/saas/skyemerit/issue', {...data, source});
    if (result.skyemerit) write('saas_skyemerit_pack', result.skyemerit);
    return result.skyemerit || result;
  }
  function wirePlanLinks(){
    document.querySelectorAll('a[data-plan]').forEach((link)=>{
      link.addEventListener('click', (event)=>{
        const plan = link.getAttribute('data-plan') || 'starter-command';
        const client = link.getAttribute('data-client') || query.get('client') || 'metraiyux-0s';
        event.preventDefault();
        location.href = skyePayUrl(plan, client);
      });
    });
    const planSelect = document.querySelector('select[name="plan"]');
    const requestedPlan = query.get('plan');
    if (planSelect && requestedPlan) planSelect.value = requestedPlan;
  }
  function ensureIdentityPreview(formId, label){
    const form = $(formId);
    if (!form) return;
    let preview = document.querySelector(`[data-identity-preview="${formId}"]`);
    if (!preview) {
      preview = document.createElement('pre');
      preview.className = 'saas-receipt';
      preview.dataset.identityPreview = formId;
      form.insertAdjacentElement('afterend', preview);
    }
    const render = ()=>{
      const identity = identityPreview(getForm(formId), label);
      preview.textContent = JSON.stringify({ok:true, lane:'identity_email_recovery_preview', identity}, null, 2);
    };
    form.addEventListener('input', render);
    form.addEventListener('change', render);
    render();
  }
  const ACTIVE_WORKSPACE_KEY = 'saas_active_workspace';
  const LEGACY_CLIENT_SESSION_KEY = 'saas_client_session';
  function removeLocal(key){ try{ localStorage.removeItem(key); }catch(e){} }
  function gateBridge(){ return window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null); }
  function workspaceContext(input={}){
    const source = input || {};
    const context = {
      client_id: source.client_id || source.workspace_slug || source.workspace_id || query.get('client') || '',
      workspace_id: source.workspace_id || '',
      workspace_slug: source.workspace_slug || source.client_id || '',
      client: source.client || source.company_name || source.workspace || source.workspace_slug || '',
      email: source.email || source.owner_email || '',
      workspace: source.workspace || source.company_name || source.workspace_id || source.workspace_slug || '',
      status: source.status || 'shared_gate_workspace',
      issued_at: source.issued_at || now(),
      shared_gate: true
    };
    return context.workspace_id || context.workspace_slug || context.client_id ? context : null;
  }
  function saveActiveWorkspace(input={}){
    const context = workspaceContext(input);
    if (!context) return null;
    write(ACTIVE_WORKSPACE_KEY, context);
    removeLocal(LEGACY_CLIENT_SESSION_KEY);
    return context;
  }
  function getActiveSession(){
    const active = workspaceContext(read(ACTIVE_WORKSPACE_KEY, null));
    if (active) return active;
    const legacy = workspaceContext(read(LEGACY_CLIENT_SESSION_KEY, null));
    if (legacy) return saveActiveWorkspace({...legacy, migrated_from:'legacy_saas_client_session'});
    return null;
  }
	  function htmlEscape(value){ return String(value ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
	  function linkButton(label, href){ return href ? `<a class='saas-btn' href='${htmlEscape(href)}'>${htmlEscape(label)}</a>` : ''; }
	  function numberLike(value, fallback=0){
	    const number = Number(value);
	    return Number.isFinite(number) ? number : fallback;
	  }
	  function progressValue(progress=[], label=''){
	    const wanted = String(label || '').toLowerCase();
	    const row = (progress || []).find((item)=>String(item.label || '').toLowerCase() === wanted);
	    return numberLike(row?.used, 0);
	  }
	  function kpiValue(kpis=[], label=''){
	    const wanted = String(label || '').toLowerCase();
	    const row = (kpis || []).find((item)=>String(item.label || '').toLowerCase() === wanted);
	    return numberLike(String(row?.value || '').replace(/[^0-9.-]/g, ''), 0);
	  }
	  function setLiveUsageCounters(usage={}){
	    document.querySelectorAll('[data-live-usage]').forEach((el)=>{
	      const key = el.dataset.liveUsage;
	      el.textContent = String(usage[key] ?? '-');
	    });
	  }
	  function usageFromVisuals(visuals={}, workspace={}){
	    const progress = visuals.progress || [];
	    const kpis = visuals.kpis || [];
	    return {
	      commands: progressValue(progress, 'Commands'),
	      events: kpiValue(kpis, '0S Events'),
	      proof_exports: progressValue(progress, 'Proof exports'),
	      seats: numberLike(workspace.limits?.seats ?? workspace.included_usage?.tester_seats ?? workspace.included_usage?.seats, 0),
	      mailboxes: progressValue(progress, 'Mailboxes')
	    };
	  }
	  async function loadLiveWorkspaceUsage(workspaceId, workspace={}){
	    if(!workspaceId) return null;
	    try{
	      const result = await apiJson(`/api/saas/customer-visuals?workspace_id=${encodeURIComponent(workspaceId)}`);
	      const usage = usageFromVisuals(result.visuals || {}, workspace);
	      const active = read('saas_active_workspace', {}) || {};
	      write('saas_active_workspace', {...active, live_usage:usage, live_usage_loaded_at:now()});
	      setLiveUsageCounters(usage);
	      return {result, usage};
	    }catch(error){
	      setLiveUsageCounters({commands:'-', events:'-', proof_exports:'-', seats:'-'});
	      return {ok:false,error:error.message || 'live_usage_unavailable'};
	    }
	  }
	  async function loadLlcWorkflowStatus(){
	    const target=$('llcWorkflowStatus');
	    if(!target) return;
	    const workflowId=query.get('workflow') || query.get('workflowId') || query.get('llc_workflow') || read('saas_llc_workflow_id','');
	    if(!workflowId){
	      target.innerHTML = '<p>No LLC workflow is linked to this dashboard yet.</p><div class="button-row"><a class="saas-btn" href="../Free99/apps/sovereigndocs/business-formation/">Start LLC to 0S</a><a class="saas-btn" href="../Free99/apps/sovereigndocs/customer-dashboard/">SovereignDocs dashboard</a></div>';
	      return;
	    }
	    try{
	      const res=await fetch(`/api/sovereigndocs/business-formation/workflows/${encodeURIComponent(workflowId)}/client-dashboard`,{headers:{accept:'application/json'}});
	      const data=await res.json().catch(()=>({ok:false,error:'invalid_json_response'}));
	      if(!res.ok || data.ok===false) throw new Error(data.error || `Workflow status failed: ${res.status}`);
	      write('saas_llc_workflow_id', workflowId);
	      target.innerHTML = `<span class='status-pill'>${data.status || 'pending'}</span><h3>${data.businessName || workflowId}</h3><p><strong>Workflow:</strong> ${workflowId}</p><div class='button-row'>${(data.nextActions||[]).map(a=>linkButton(a.label,a.href)).join('')}</div><p>${data.boundary || ''}</p>`;
	      output('llcWorkflowReceipt', data);
	    }catch(error){
	      target.innerHTML = `<span class='danger-pill'>Workflow unavailable</span><p>${error.message}</p>`;
	      output('llcWorkflowReceipt',{ok:false,error:error.message,workflowId});
	    }
	  }
	  function renderSession(){
    const session = getActiveSession();
    document.querySelectorAll('[data-client-session]').forEach((el)=>{
      if(!session) {
        el.innerHTML = '<span class="danger-pill">Not signed in</span><p>Use the client login page to open a workspace.</p>';
        return;
      }
	      const workspace = read('saas_active_workspace', {}) || {};
	      const usage = workspace.live_usage || usageFromVisuals({}, workspace);
	      const merit = read('saas_skyemerit_pack', null);
	      el.innerHTML = `<span class="status-pill">Signed in</span><h3>${session.client}</h3><p><strong>Workspace:</strong> ${session.workspace}</p><p><strong>Email:</strong> ${session.email}</p><p><strong>Status:</strong> ${session.status}</p><p><strong>Live usage:</strong> ${usage.events ?? 0} 0S events, ${usage.commands ?? 0} commands, ${usage.proof_exports ?? 0} proof exports, ${usage.seats ?? 0} seats</p>${workspace.live_usage_loaded_at ? `<p><strong>Usage updated:</strong> ${workspace.live_usage_loaded_at}</p>` : '<p><strong>Usage:</strong> waiting for live workspace visuals.</p>'}${merit ? `<p><strong>SkyeMerit:</strong> ${merit.kaixu_credit_label}; ${merit.coupon_codes.join(', ')}. Gate required.</p>` : ''}`;
	    });
	  }
  const sharedGateKeys = [
    'METRAIYUX_GATE_SESSION',
    'SKYGATEFS27_GATE_SESSION',
    'SKYE_GATE_SESSION'
  ];
  function cleanToken(value){ return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim(); }
  function tokenFromStore(store, key){
    try{
      const raw=store.getItem(key);
      if(!raw) return '';
      const parsed=raw.startsWith('{') ? JSON.parse(raw) : null;
      return cleanToken(parsed?.token || parsed?.gate_token || raw);
    }catch(e){ return ''; }
  }
  function sharedGateToken(){
    const bridge = gateBridge();
    const bridgeSession = bridge?.requireSession?.({platformId:'metraiyux-0s', usageLane:'saas-customer-workspace'})
      || bridge?.current?.();
    const bridgeToken = cleanToken(bridgeSession?.token || '');
    if (bridgeToken) return bridgeToken;
    for(const key of sharedGateKeys){
      const token=tokenFromStore(sessionStorage,key) || tokenFromStore(localStorage,key);
      if(token) return token;
    }
    return '';
  }
  function authHeaders(extra={}){
    const token=sharedGateToken();
    const headers={accept:'application/json', ...extra};
    if(token){
      headers.authorization=`Bearer ${token}`;
      headers['x-free99-gate-session']=token;
      headers['x-skye-gate-session']=token;
      headers['x-skygate-session']=token;
    }
    return headers;
  }
  async function apiJson(url, init={}){
    const res = await fetch(url, {cache:'no-store', credentials:'include', ...init, headers:authHeaders(init.headers || {})});
    const data = await res.json().catch(()=>({ok:false,error:'invalid_json_response'}));
    if(!res.ok || data.ok === false) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
  }
  async function postJson(url, payload){
    const res = await fetch(url, {method:'POST', credentials:'include', headers:authHeaders({'content-type':'application/json'}), body:JSON.stringify(payload)});
    const data = await res.json().catch(()=>({ok:false,error:'invalid_json_response'}));
    if(!res.ok || data.ok === false) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
  }
  async function recordAction(event_type, payload={}){
    const workspace=read('saas_active_workspace',{}) || read('saas_workspace',{}) || {};
    const session=getActiveSession() || {};
    const body={
      type:event_type,
      action:event_type,
      lane:payload.lane || 'saas-ui',
      summary:payload.summary || event_type,
      event_type,
      workspace_id: payload.workspace_id || workspace.workspace_id || session.workspace_id || query.get('workspace_id') || query.get('workspace') || '',
      workspace_slug: payload.workspace_slug || workspace.workspace_slug || session.workspace_slug || query.get('client') || '',
      source:'saas-tools',
      surface:document.title || location.pathname,
      metadata:{
        ...payload,
        pathname:location.pathname,
        search:location.search,
        title:document.title || ''
      }
    };
    try{
      const res=await fetch('/api/saas/action-event',{method:'POST',credentials:'include',headers:authHeaders({'content-type':'application/json'}),body:JSON.stringify(body)});
      const data=await res.json().catch(()=>({ok:res.ok,status:res.status}));
      return {...data, ok:Boolean(res.ok && data?.ok !== false), status:res.status};
    }catch(error){
      return {ok:false,error:error.message || 'saas_action_event_failed'};
    }
  }
  window.SaaSUpgrade = {
    async clientLogin(){
      const data=getForm('clientLoginForm');
      const clientId=data.client_id || query.get('client') || query.get('workspace') || query.get('workspace_id') || '';
      if(!clientId){
        output('clientLoginReceipt',{ok:false,error:'workspace_or_client_slug_required'});
        return null;
      }
      try {
        const result = await apiJson(`/api/saas/client-preview?client=${encodeURIComponent(clientId)}`);
        const workspace = result.workspace || {};
        const session = saveActiveWorkspace(result.session || {
          client_id: workspace.workspace_slug || clientId,
          workspace_id: workspace.workspace_id,
          workspace_slug: workspace.workspace_slug,
          client: workspace.company_name || clientId,
          email: workspace.owner_email || data.email || '',
          workspace: workspace.company_name || workspace.workspace_id,
          status: workspace.status || 'shared_gate_workspace',
          issued_at: now(),
          shared_gate: true
        });
        write('saas_active_workspace', workspace);
        const gateToken = sharedGateToken();
        if (gateToken) gateBridge()?.persist?.({
          ...session,
          token: gateToken,
          source: '0s-client-session-shared-gate',
          platform_id: 'metraiyux-0s',
          usage_lane: 'customer-workspace',
          gate_cards: [
            { id: '0s-core', name: '0S Core', scope: 'customer-workspace' },
            { id: 'fs27', name: 'FS27 SkyGate', scope: 'identity-auth' },
            { id: 'skyerunners', name: 'SkyeRunners', scope: 'workspace-routing' }
          ]
        });
	        output('clientLoginReceipt', {...result, session, next:'Claim workspace or open dashboard.'});
	        recordAction('client_login.opened_workspace', {workspace_id: workspace.workspace_id, workspace_slug: workspace.workspace_slug, client_id: clientId});
	        await loadLiveWorkspaceUsage(workspace.workspace_id, workspace);
	        renderSession();
	        return result;
      } catch(error) {
        output('clientLoginReceipt',{ok:false,error:error.message || 'workspace_unavailable', gate:'FS27/SkyGate/Free99'});
        return null;
      }
    },
    async claimClientWorkspace(){
      const session=getActiveSession();
      if(!session){ output('clientClaimReceipt',{ok:false,error:'client_not_signed_in'}); return null; }
      let result;
      try {
        result = await postJson('/api/saas/client-workspace/claim', {client_id:session.client_id, workspace_id:session.workspace_id});
      } catch(error) {
        output('clientClaimReceipt',{ok:false,error:error.message || 'workspace_claim_failed'});
        return null;
      }
      write('saas_workspace', result.workspace);
      output('clientClaimReceipt', result);
      recordAction('client_workspace.claimed', {workspace_id: result.workspace?.workspace_id || session.workspace_id, workspace_slug: result.workspace?.workspace_slug || session.workspace_slug});
      return result;
    },
    openClientDashboard(){
      const session=getActiveSession();
      if(!session){ location.href='client-login.html'; return; }
      location.href=`customer-dashboard.html?workspace=${encodeURIComponent(session.workspace_id)}`;
    },
    async saveSignup(){
      const data=getForm('signupForm');
      const form=$('signupForm');
      if(form && form.legal_acknowledgment && !form.legal_acknowledgment.checked){
        output('signupReceipt',{ok:false,error:'legal_acknowledgment_required', required_links:['https://skyes-over-london-legal.pages.dev/legal/twilio-sms/','https://skyes-over-london-legal.pages.dev/legal/terms/','https://skyes-over-london-legal.pages.dev/legal/privacy/']});
        return null;
      }
      try{
        const identity=identityPreview(data,'signup');
        const result=await postJson('/api/saas/signup', {...data, legal_acknowledgment:data.legal_acknowledgment === 'yes', workspace_id:identity.workspace_id, workspace_slug:identity.workspace_slug});
        write('saas_identity_preview', result.identity || identity);
        const all=read('saas_signups',[]);
        all.push(result.signup || result);
        write('saas_signups',all);
        recordAction('signup.submitted', {workspace_id: identity.workspace_id, workspace_slug: identity.workspace_slug, plan: identity.plan});
        output('signupReceipt',result);
        return result;
      }catch(error){
        output('signupReceipt',{ok:false,error:error.message || 'signup_failed'});
        return null;
      }
    },
    async saveOnboarding(){
      const data=getForm('onboardingForm');
      const signup=read('saas_signups',[]).slice(-1)[0]||{};
      const identity=identityPreview({...signup.identity,...signup,...data,email:data.approval_email||signup.email},'onboarding');
      const rec={id:rid('onboarding'), type:'customer_onboarding', status:'staged_until_workspace_create', created_at:now(), identity, ...data};
      const all=read('saas_onboarding',[]);
      all.push(rec);
      write('saas_onboarding',all);
      write('saas_identity_preview',identity);
      try{ rec.skyemerit=await issueSkyeMeritPack({...data, email:data.approval_email || signup.email || identity.owner_email, workspace_id:identity.workspace_id},'onboarding'); }catch(error){ rec.skyemerit_error=error.message; }
      recordAction('onboarding.staged', {workspace_id: identity.workspace_id, workspace_slug: identity.workspace_slug, approval_email: data.approval_email || ''});
      output('onboardingReceipt',{ok:true, staged:true, receipt:rec, next:'Create Workspace posts this staged packet to the live Worker.'});
      return rec;
    },
    saveCompanyProfile(){
      const data=getForm('companyProfileForm');
      const rec={id:rid('company'), type:'company_profile', status:'staged_until_workspace_create', updated_at:now(), ...data};
      write('saas_company_profile',rec);
      recordAction('company_profile.staged', {company_name: data.company_name || data.brand_name || '', workspace_slug: slugify(data.company_name || data.brand_name || '')});
      output('companyProfileReceipt',{ok:true, staged:true, receipt:rec, next:'Create Workspace persists this profile to the live Worker.'});
      return rec;
    },
    saveServices(){
      const data=getForm('serviceSelectorForm');
      const services=[...document.querySelectorAll('input[name="services"]:checked')].map(x=>x.value);
      const rec={id:rid('services'), type:'service_selection', status:'staged_until_workspace_create', created_at:now(), plan:data.plan, services, notes:data.notes||''};
      write('saas_service_selection',rec);
      recordAction('services.staged', {plan:data.plan || '', services});
      output('serviceReceipt',{ok:true, staged:true, receipt:rec, next:'Create Workspace persists this service selection to the live Worker.'});
      return rec;
    },
    async createWorkspace(){
      const profile=read('saas_company_profile',{}), services=read('saas_service_selection',{}), onboarding=read('saas_onboarding',[]).slice(-1)[0]||{};
      const identity=read('saas_identity_preview', null)||identityPreview({...profile,...onboarding},'workspace');
	      const payload={...identity, company_name:identity.company_name || profile.company_name || profile.brand_name, email:identity.owner_email || onboarding.approval_email, plan:services.plan || identity.plan_id || query.get('plan') || 'starter-command', profile, services:services.services || [], onboarding};
	      if (identity.requested_skyemail) payload.mailbox_email = identity.requested_skyemail;
	      if (identity.mailbox_local_part) payload.mailbox_local_part = identity.mailbox_local_part;
	      if (identity.mailbox_domain) payload.mailbox_domain = identity.mailbox_domain;
      try{
        const result=await postJson('/api/saas/workspaces', payload);
        write('saas_workspace',result.workspace);
        write('saas_active_workspace',result.workspace);
        if(result.workspace?.workspace_id){
          saveActiveWorkspace({workspace_id:result.workspace.workspace_id, workspace_slug:result.workspace.workspace_slug, client:result.workspace.company_name, email:result.workspace.owner_email, workspace:result.workspace.company_name, status:result.workspace.status, issued_at:now(), shared_gate:true});
        }
        recordAction('workspace.created', {workspace_id: result.workspace?.workspace_id || payload.workspace_id, workspace_slug: result.workspace?.workspace_slug || payload.workspace_slug, plan: payload.plan});
        output('workspaceReceipt',result);
        renderSession();
        return result;
      }catch(error){
        output('workspaceReceipt',{ok:false,error:error.message || 'workspace_create_failed'});
        return null;
      }
    },
    async makeBillingIntent(){
      const data=getForm('billingForm');
      const plan=data.plan || query.get('plan') || 'starter-command';
      if(isQuoteOnlyPlan(plan)){
        const rec={ok:false,error:'quote_only_owner_review_required', plan, review_url:skyePayUrl(plan, data.client_slug || 'metraiyux-0s')};
        output('billingReceipt',rec);
        return rec;
      }
      try{
        const workspace=read('saas_workspace',{}) || {};
        const result=await postJson('/api/saas/billing/checkout-session', {...data, plan_id:plan, workspace_id:data.workspace_id || workspace.workspace_id || data.client_slug || query.get('workspace') || 'metraiyux-0s'});
        const all=read('saas_billing_intents',[]);
        all.push(result.billing_intent || result);
        write('saas_billing_intents',all);
	        recordAction('billing.skypay_handoff_recorded', {workspace_id:data.workspace_id || workspace.workspace_id || data.client_slug || query.get('workspace') || 'metraiyux-0s', plan});
        output('billingReceipt',result);
        return result;
      }catch(error){
        output('billingReceipt',{ok:false,error:error.message || 'billing_intent_failed'});
        return null;
      }
    },
    async openSkyePay(){
      const data=getForm('billingForm');
      const result=await this.makeBillingIntent();
      location.href=result?.checkout_url || result?.billing_intent?.checkout_url || skyePayUrl(data.plan || query.get('plan') || 'starter-command', data.client_slug || 'metraiyux-0s');
    },
    async command(){
      const data=getForm('customerCommandForm');
      const session=getActiveSession();
      const workspace_id=data.workspace_id || query.get('workspace') || query.get('workspace_id') || session?.workspace_id || '';
      try{
        const result=await postJson('/api/saas/customer-command', {...data, workspace_id});
        const all=read('saas_customer_commands',[]);
        all.push(result.command || result);
        write('saas_customer_commands',all);
        recordAction('customer_command.submitted', {workspace_id, command:data.command || data.request || ''});
        output('commandReceipt',result);
        return result;
      }catch(error){
        output('commandReceipt',{ok:false,error:error.message || 'command_route_failed', workspace_id});
        return null;
      }
    },
    routeCommand(text){ const t=text.toLowerCase(); if(/post|social|content|blog|marketing/.test(t)) return {primary:'Valentina Reyes / Marketing Brain', secondary:'Victor Saint / QA Brain', approval_required:true}; if(/hire|candidate|recruit|staff|worker/.test(t)) return {primary:'Sienna Brooks / Staffing Brain', secondary:'Marcus Vale / Operations Brain', approval_required:true}; if(/contract|legal|compliance|filing|claim/.test(t)) return {primary:'Julian Mercer / Compliance Brain', secondary:'Victor Saint / QA Brain', approval_required:true}; if(/invoice|price|billing|payment/.test(t)) return {primary:'Naomi Sterling / Finance Brain', secondary:'Marcus Vale / Operations Brain', approval_required:true}; if(/lead|sale|proposal|close/.test(t)) return {primary:'Celeste Monroe / Revenue Brain', secondary:'Adrian Cross / Client Success Brain', approval_required:false}; return {primary:'Site Operator Brain', secondary:'Central Company Command Brain', approval_required:false}; },
    exportAll(){ const keys=['saas_signups','saas_onboarding','saas_company_profile','saas_service_selection','saas_workspace','saas_billing_intents','saas_customer_commands','saas_active_workspace','saas_skyemerit_pack']; const bundle={exported_at:now(), note:'Browser cache export only. Production records live behind /api/saas and the 0S Command Bridge.'}; keys.forEach(k=>bundle[k]=read(k, null)); recordAction('browser_cache.exported',{keys}); output('exportReceipt',bundle); const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='saas-customer-portal-cache-export.json'; a.click(); },
    clearAll(){ ['saas_signups','saas_onboarding','saas_company_profile','saas_service_selection','saas_workspace','saas_billing_intents','saas_customer_commands','saas_client_session','saas_active_workspace','saas_skyemerit_pack'].forEach(k=>localStorage.removeItem(k)); recordAction('browser_cache.cleared',{}); output('exportReceipt',{cleared_at:now(), cleared:'browser_cache_only'}); renderSession(); }
  }
	  document.addEventListener('DOMContentLoaded', ()=>{
	    const workspaceFromUrl=query.get('workspace') || query.get('workspace_id') || '';
	    if(workspaceFromUrl) document.querySelectorAll('input[name="workspace_id"]').forEach((input)=>{ if(!input.value) input.value=workspaceFromUrl; });
	    renderSession();
	    loadLlcWorkflowStatus();
	    wirePlanLinks();
    ensureIdentityPreview('signupForm','signup');
    ensureIdentityPreview('onboardingForm','onboarding');
  });
})();
