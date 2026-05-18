const $ = (id) => document.getElementById(id);
let token = localStorage.getItem('r13_admin_token') || '';
let workspaces = [];
let conversations = [];
let activeWorkspace = '';
let activeConversation = null;
let activeMessages = [];
let guardrails = null;
let ws = null;
$('adminToken').value = token;
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function status(text,bad=false){$('liveStatus').textContent=text;$('liveStatus').classList.toggle('bad',bad)}
async function api(path, options={}){const r=await fetch(path,{...options,headers:{'content-type':'application/json',authorization:`Bearer ${token}`,...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed ${r.status}`);return d}
function currentWorkspace(){return workspaces.find(w=>w.id===activeWorkspace)}
async function loadAll(){token=$('adminToken').value.trim();if(!token)throw new Error('Admin token required');localStorage.setItem('r13_admin_token',token);await loadWorkspaces();if(activeWorkspace)await Promise.all([loadStats(),loadDomains(),loadGuardrails(),loadConversations()]);renderSnippet();}
async function loadWorkspaces(){const d=await api('/api/admin/workspaces');workspaces=d.workspaces||[];if(!activeWorkspace&&workspaces[0])activeWorkspace=workspaces[0].id;$('workspaceSelect').innerHTML=workspaces.map(w=>`<option value="${esc(w.id)}" ${w.id===activeWorkspace?'selected':''}>${esc(w.name)} · ${esc(w.slug)}</option>`).join('');}
async function loadStats(){if(!activeWorkspace)return;const d=await api(`/api/admin/dashboard?workspace_id=${encodeURIComponent(activeWorkspace)}`);const s=d.stats||{};$('stats').innerHTML=[['Open',s.open_count||0],['Pending',s.pending_count||0],['Unread',s.unread_for_operator||0],['Messages',s.total_messages||0]].map(([k,v])=>`<div class="stat"><strong>${Number(v||0)}</strong><span>${esc(k)}</span></div>`).join('')}
async function loadDomains(){if(!activeWorkspace)return;const d=await api(`/api/admin/workspace-domains?workspace_id=${encodeURIComponent(activeWorkspace)}`);const domains=d.domains||[];$('domainList').innerHTML=domains.length?domains.map(x=>`<span class="chip">${esc(x.domain)} · ${esc(x.status)}</span>`).join(' '):'No domains set. Until you add one, the widget is permissive for easier first setup.'}
async function loadGuardrails(){if(!activeWorkspace)return;const d=await api(`/api/admin/guardrails?workspace_id=${encodeURIComponent(activeWorkspace)}`);guardrails=d.guardrails||null;renderGuardrails();}
async function loadConversations(){if(!activeWorkspace)return;const statusParam=$('statusFilter').value?`&status=${encodeURIComponent($('statusFilter').value)}`:'';const d=await api(`/api/v1/conversations?workspace_id=${encodeURIComponent(activeWorkspace)}${statusParam}`);conversations=d.conversations||[];renderConversations();}
function renderConversations(){if(!conversations.length){$('conversationList').innerHTML='<div class="empty"><strong>No conversations.</strong><span>Real widget/API conversations appear here.</span></div>';return}$('conversationList').innerHTML=conversations.map(c=>`<button class="conv ${activeConversation?.id===c.id?'active':''}" data-id="${esc(c.id)}"><strong>${esc(c.customer_name||'Website Visitor')}</strong><small>${esc(c.status)} · ${Number(c.message_count||0)} messages · unread ${Number(c.operator_unread_count||0)}</small><small>${esc(c.last_message_preview||'No message yet')}</small></button>`).join('');document.querySelectorAll('.conv').forEach(b=>b.onclick=()=>openConversation(b.dataset.id));}
function renderProfile(){const c=activeConversation;if(!c){$('profile').innerHTML='<p class="micro">Conversation profile loads here.</p>';return}$('profile').innerHTML=`<dl><dt>Name</dt><dd>${esc(c.customer_name||'Website Visitor')}</dd><dt>Email</dt><dd>${esc(c.customer_email||'not provided')}</dd><dt>Source</dt><dd>${esc(c.source_url||'unknown')}</dd><dt>Status</dt><dd>${esc(c.status)}</dd><dt>Assigned</dt><dd>${esc(c.assigned_to||'unassigned')}</dd><dt>Created</dt><dd>${esc(c.created_at||'')}</dd></dl>`;$('threadStatus').value=c.status||'open';$('assignedTo').value=c.assigned_to||'';$('threadTitle').textContent=c.customer_name||c.id;}
function renderGuardrails(){if(!guardrails){$('guardrailPanel').textContent='No guardrail policy loaded.';return}const k=guardrails.app_knowledge||{};const r=guardrails.rate_limits||{};$('guardrailPanel').innerHTML=`<span class="chip">AI: ${esc(guardrails.ai_mode)}</span> <span class="chip">web search: ${guardrails.allow_web_search?'on':'off'}</span> <span class="chip">auto reply: ${guardrails.allow_ai_auto_reply?'on':'off'}</span><br>${esc(k.profile||'app knowledge')} · ${Number(r.messages_per_window||0)} messages / ${Number(r.window_minutes||0)} min`;}
async function openConversation(id){activeConversation=conversations.find(c=>c.id===id);renderProfile();renderConversations();$('replyText').disabled=false;$('replyButton').disabled=false;const d=await api(`/api/v1/conversations/${id}/messages?workspace_id=${encodeURIComponent(activeWorkspace)}`);activeMessages=d.messages||[];renderMessages();connect();await Promise.all([loadStats(),loadConversations()]);}
function renderMessages(){$('messages').innerHTML='';if(!activeMessages.length){$('messages').innerHTML='<div class="empty"><strong>No messages yet.</strong><span>When this thread receives a real message it appears here.</span></div>';return}activeMessages.forEach(addMessage)}
function addMessage(m){const holder=$('messages');const empty=holder.querySelector('.empty');if(empty)holder.innerHTML='';const div=document.createElement('div');div.className=`msg ${m.sender_role==='operator'||m.sender_role==='system'?'me':'them'}`;div.innerHTML=`${esc(m.body)}<small>${esc(m.sender_name||m.sender_role)} · ${esc(m.created_at||'')}</small>`;holder.appendChild(div);holder.scrollTop=holder.scrollHeight}
function connect(){if(ws)ws.close();if(!activeConversation)return;const proto=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(`${proto}//${location.host}/api/ws/${activeConversation.id}?role=operator&workspace_id=${encodeURIComponent(activeWorkspace)}&token=${encodeURIComponent(token)}&name=Operator`);status('connecting');ws.onopen=()=>status('live');ws.onclose=()=>status('offline',true);ws.onerror=()=>status('socket error',true);ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.type==='message'){activeMessages.push(d);addMessage(d);loadStats().catch(()=>{})}if(d.type==='presence')status(`${d.online} online`)}}
function renderSnippet(){const ws=currentWorkspace();$('installSnippet').textContent=ws?`<script src="${location.origin}/widget/embed.js" data-workspace="${ws.slug}" async></script>`:''}
$('saveToken').onclick=()=>loadAll().catch(e=>alert(e.message));
$('bootstrap').onclick=async()=>{await api('/api/bootstrap',{method:'POST'});await loadAll()};
$('workspaceSelect').onchange=async()=>{activeWorkspace=$('workspaceSelect').value;activeConversation=null;renderProfile();renderSnippet();await Promise.all([loadStats(),loadDomains(),loadGuardrails(),loadConversations()])};
$('createWorkspace').onclick=async()=>{const name=$('workspaceName').value.trim();if(!name)return;await api('/api/admin/workspaces',{method:'POST',body:JSON.stringify({name})});$('workspaceName').value='';await loadAll()};
$('addDomain').onclick=async()=>{const domain=$('domainName').value.trim();if(!activeWorkspace||!domain)return;await api('/api/admin/workspace-domains',{method:'POST',body:JSON.stringify({workspace_id:activeWorkspace,domain})});$('domainName').value='';await loadDomains()};
$('refresh').onclick=()=>Promise.all([loadStats(),loadDomains(),loadGuardrails(),loadConversations()]).catch(e=>alert(e.message));
$('statusFilter').onchange=()=>loadConversations().catch(e=>alert(e.message));
$('createKey').onclick=async()=>{if(!activeWorkspace)return;const d=await api('/api/admin/api-keys',{method:'POST',body:JSON.stringify({workspace_id:activeWorkspace,name:$('keyName').value||'Workspace key',scopes:['conversations:create','conversations:read','messages:read','messages:write','widget:read']})});$('newKey').textContent=`Copy now:\n${d.api_key.key}\n\nPrefix: ${d.api_key.key_prefix}`};
$('publishWidget').onclick=async()=>{if(!activeWorkspace)return;await api('/api/admin/widget-configs/publish',{method:'POST',body:JSON.stringify({workspace_id:activeWorkspace,brand_name:$('brandName').value||currentWorkspace()?.name||'Messages',welcome_text:$('welcomeText').value||'Send us a message. We will reply here.',launcher_text:'Message us',operator_name:'Operator',primary_color:'#f6c85f',accent_color:'#9a6cff'})});alert('Widget config published')};
$('enforceGuardrails').onclick=async()=>{if(!activeWorkspace)return;const d=await api('/api/admin/guardrails',{method:'POST',body:JSON.stringify({workspace_id:activeWorkspace,ai_mode:'draft_only',allow_ai_auto_reply:false,allow_web_search:false,per_ip_message_window_minutes:10,per_ip_message_limit:24,per_ip_conversation_limit:8})});guardrails=d.guardrails;renderGuardrails();alert('Guardrails enforced: app knowledge only, web search off.')};
$('saveThread').onclick=async()=>{if(!activeConversation)return;await api(`/api/admin/conversations/${activeConversation.id}`,{method:'PATCH',body:JSON.stringify({workspace_id:activeWorkspace,status:$('threadStatus').value,assigned_to:$('assignedTo').value})});await loadConversations();activeConversation=conversations.find(c=>c.id===activeConversation.id)||activeConversation;renderProfile()};
$('replyForm').onsubmit=async e=>{e.preventDefault();const body=$('replyText').value.trim();if(!body||!activeConversation)return;$('replyText').value='';if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'message',body,sender_name:'Operator'}));else{const d=await api(`/api/v1/conversations/${activeConversation.id}/messages`,{method:'POST',body:JSON.stringify({workspace_id:activeWorkspace,sender_role:'operator',sender_name:'Operator',body})});addMessage(d.message)}};
$('queueJob').onclick=async()=>{if(!activeWorkspace)return;const d=await api('/api/admin/jobs',{method:'POST',body:JSON.stringify({workspace_id:activeWorkspace,type:'release.widget_config.verify',payload:{conversation_id:activeConversation?.id||null}})});alert(`Queued job: ${d.job.id}`)};
if(token)loadAll().catch(()=>status('token required',true));

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
