const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const state = { tag:'', pos:null };

function toast(title, detail=''){
  const el = $('#toast');
  if(!el) return;
  el.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}`;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>el.classList.remove('show'), 2400);
}
function escapeHtml(v){ return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;').replaceAll("'",'&#39;'); }
async function loadRecords(url, key){ try{ const data = await fetch(url).then(r=>r.json()); return data[key] || data.records || data.businesses || []; }catch{ return []; } }
function text(v){ return String(v ?? '').replace(/\s+/g,' ').trim(); }
function slugify(v){ return text(v).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
function milesBetween(a,b){
  if(!a || !b) return Infinity;
  const R = 3958.7613, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng), lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const SHORTLIST_KEY = 'phxVerified.shortlist.v1';
function getShortlist(){ try{ return JSON.parse(localStorage.getItem(SHORTLIST_KEY) || '[]'); }catch{ return []; } }
function setShortlist(items){ try{ localStorage.setItem(SHORTLIST_KEY, JSON.stringify(items)); }catch{} }
function saveShortlistItem(item){
  const current = getShortlist();
  if(!item.id) return current;
  const next = [{ ...item, saved_at:new Date().toISOString() }, ...current.filter(x => x.id !== item.id)].slice(0, 80);
  setShortlist(next);
  return next;
}
function bindShortlistButtons(){
  $$('[data-save-business]').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('[data-card]');
    const item = {
      id: btn.dataset.businessId || card?.dataset.businessId || '',
      name: btn.dataset.businessName || card?.dataset.businessName || text($('h3', card)?.innerText),
      url: btn.dataset.url || card?.dataset.url || $('a[href^="/business/"]', card)?.getAttribute('href') || location.pathname,
      category: card?.dataset.category || '',
      city: card?.dataset.city || '',
      score: card?.dataset.score || ''
    };
    saveShortlistItem(item);
    btn.textContent = 'Saved';
    toast('Saved to shortlist', item.name);
    renderShortlistPage();
  }));
}
function renderShortlistPage(){
  const host = $('#shortlistItems');
  if(!host) return;
  const items = getShortlist();
  const count = $('#shortlistCount');
  if(count) count.textContent = `${items.length} saved`;
  if(!items.length){ host.innerHTML = '<p class="muted">No providers saved in this browser yet. Use Save on any business card.</p>'; return; }
  host.innerHTML = items.map(item => `<article class="shortlist-item"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml([item.city,item.category].filter(Boolean).join(' • ') || 'Saved provider')}</span></div><div class="button-row"><a class="btn small" href="${escapeHtml(item.url)}">Open</a><button class="btn small" data-remove-shortlist="${escapeHtml(item.id)}">Remove</button></div></article>`).join('');
  $$('[data-remove-shortlist]', host).forEach(btn => btn.addEventListener('click', () => { setShortlist(getShortlist().filter(x => x.id !== btn.dataset.removeShortlist)); renderShortlistPage(); toast('Removed from shortlist'); }));
}
function bindShortlistPage(){
  if(!$('#shortlistItems')) return;
  renderShortlistPage();
  $('[data-export-shortlist]')?.addEventListener('click', () => downloadJson(`phx-verified-shortlist-${Date.now()}.json`, { exported_at:new Date().toISOString(), businesses:getShortlist() }));
  $('[data-clear-shortlist]')?.addEventListener('click', () => { setShortlist([]); renderShortlistPage(); toast('Shortlist cleared'); });
  const form = $('[data-shortlist-request]');
  const output = $('#shortlistRequestOutput');
  const dl = $('[data-download-shortlist-request]');
  let packet = null;
  $('[data-build-shortlist-request]')?.addEventListener('click', () => {
    const raw = formObject(form);
    packet = { id:`shortlist-request-${Date.now()}`, created_at:new Date().toISOString(), source:'phx-verified-shortlist', contact:raw.contact || null, details:raw.details || '', businesses:getShortlist(), status:'shortlist_request_packet' };
    if(output) output.textContent = JSON.stringify(packet, null, 2);
    if(dl) dl.disabled = false;
    toast('Shortlist request built', `${packet.businesses.length} provider(s) included.`);
  });
  dl?.addEventListener('click', () => packet && downloadJson(`${packet.id}.json`, packet));
}
function compareCard(b){
  const badges = Object.entries(b.badges || {}).filter(([,v])=>v).map(([k])=>k.replaceAll('_',' ')).join(', ') || 'Provider supplied';
  const gaps = [];
  if(!b.phone) gaps.push('phone'); if(!b.email) gaps.push('email'); if(!b.website && !b.booking_url) gaps.push('website/booking'); if(!b.location) gaps.push('coordinates'); if(b.starting_price === null && !b.price_note) gaps.push('pricing');
  return `<article class="compare-card"><div class="card-top"><div><p class="eyebrow">${escapeHtml(b.city)} • ${escapeHtml(b.category)}</p><h3>${escapeHtml(b.name)}</h3></div><div class="score"><strong>${escapeHtml(b.verification_score)}</strong><small>score</small></div></div><div class="compare-list"><div><strong>Price</strong><span>${escapeHtml(b.starting_price ? '$'+b.starting_price : b.price_note || 'Quote required')}</span></div><div><strong>Contact</strong><span>${escapeHtml([b.phone,b.email].filter(Boolean).join(' / ') || 'Not listed')}</span></div><div><strong>Badges</strong><span>${escapeHtml(badges)}</span></div><div><strong>Data gaps</strong><span>${escapeHtml(gaps.join(', ') || 'No major gaps')}</span></div></div><div class="button-row"><a class="btn small primary" href="/business/${escapeHtml(b.id)}/">Open</a><a class="btn small" href="/request/?business=${escapeHtml(b.id)}">Request</a></div></article>`;
}
function bindComparePage(){
  const shell = $('[data-compare-page]');
  if(!shell) return;
  let data = JSON.parse($('#businessData')?.textContent || '[]');
  const grid = $('#compareGrid');
  const select = $('[data-compare-select]');
  const params = new URLSearchParams(location.search);
  let ids = (params.get('ids') || '').split(',').map(text).filter(Boolean).slice(0,4);
  function render(){
    const picked = ids.map(id => data.find(b => b.id === id)).filter(Boolean);
    if(!picked.length){ grid.innerHTML = '<p class="muted">Choose providers or load a shortlist.</p>'; return; }
    grid.innerHTML = picked.map(compareCard).join('');
    history.replaceState(null, '', `${location.pathname}?ids=${ids.join(',')}`);
  }
  async function boot(){
    if(!data.length){ grid.innerHTML = '<p class="muted">Loading comparison index…</p>'; data = await loadRecords('/data/search-index.json', 'records'); }
    render();
  }
  $('[data-add-compare]')?.addEventListener('click', async () => { if(!data.length) data = await loadRecords('/data/search-index.json', 'records'); const id = select?.value; if(id && !ids.includes(id)){ ids = [...ids, id].slice(0,4); render(); toast('Added to comparison'); } });
  $('[data-load-shortlist-compare]')?.addEventListener('click', () => { ids = getShortlist().map(x=>x.id).filter(Boolean).slice(0,4); render(); toast('Loaded shortlist', `${ids.length} provider(s).`); });
  $('[data-clear-compare]')?.addEventListener('click', () => { ids = []; render(); toast('Comparison cleared'); });
  boot();
}


function bindDirectory(){
  const shell = $('[data-directory-page]');
  if(!shell) return;
  const q = $('#q'), category = $('#category'), city = $('#city'), sort = $('#sort');
  const cardsHost = $('#cards');
  const empty = $('#empty');
  const visibleCount = $('[data-visible-count]');
  const liveCount = $('#liveCount');
  const controls = [q, category, city, sort, $('#verifiedOnly'), $('#transparentOnly'), $('#mobileOnly'), $('#pricedOnly')].filter(Boolean);
  const initialCategory = shell.dataset.initialCategory || '';
  const initialCity = shell.dataset.initialCity || '';
  if(initialCategory && category) category.value = initialCategory;
  if(initialCity && city) city.value = initialCity;
  function allCards(){ return $$('[data-card]', cardsHost); }
  function apply(){
    const query = text(q?.value).toLowerCase();
    const cat = category?.value || '';
    const cty = city?.value || '';
    const verified = $('#verifiedOnly')?.checked;
    const transparent = $('#transparentOnly')?.checked;
    const mobile = $('#mobileOnly')?.checked;
    const priced = $('#pricedOnly')?.checked;
    let visible = [];
    for(const card of allCards()){
      const hay = [card.dataset.name, card.dataset.category, card.dataset.city, card.dataset.tags].join(' ').toLowerCase();
      const ok = (!query || hay.includes(query)) && (!cat || card.dataset.category === cat) && (!cty || card.dataset.city === cty) && (!state.tag || hay.includes(state.tag.toLowerCase())) && (!verified || card.innerText.includes('Verified')) && (!transparent || card.innerText.toLowerCase().includes('no hidden')) && (!mobile || card.innerText.includes('Mobile')) && (!priced || !card.innerText.includes('Quote required'));
      card.classList.toggle('hidden', !ok);
      if(ok) visible.push(card);
    }
    const mode = sort?.value || 'featured';
    visible.sort((a,b)=>{
      if(mode === 'name') return a.dataset.name.localeCompare(b.dataset.name);
      if(mode === 'recent') return String(b.dataset.date).localeCompare(String(a.dataset.date));
      if(mode === 'distance'){
        const da = milesBetween(state.pos, { lat:Number(a.dataset.lat), lng:Number(a.dataset.lng) });
        const db = milesBetween(state.pos, { lat:Number(b.dataset.lat), lng:Number(b.dataset.lng) });
        return da - db;
      }
      return Number(b.dataset.featured)-Number(a.dataset.featured) || Number(b.dataset.score)-Number(a.dataset.score) || a.dataset.name.localeCompare(b.dataset.name);
    });
    visible.forEach(card => cardsHost.appendChild(card));
    empty?.classList.toggle('hidden', visible.length !== 0);
    if(visibleCount) visibleCount.textContent = `${visible.length} shown`;
    if(liveCount) liveCount.textContent = `${visible.length}`;
  }
  controls.forEach(el => el.addEventListener('input', apply));
  controls.forEach(el => el.addEventListener('change', apply));
  $$('[data-tag]').forEach(btn => btn.addEventListener('click', () => { state.tag = state.tag === btn.dataset.tag ? '' : btn.dataset.tag; $$('[data-tag]').forEach(b => b.classList.toggle('on', b.dataset.tag === state.tag)); apply(); }));
  $('[data-reset]')?.addEventListener('click', () => { if(q) q.value=''; if(category) category.value = initialCategory || ''; if(city) city.value = initialCity || ''; ['verifiedOnly','transparentOnly','mobileOnly','pricedOnly'].forEach(id=>{ const el = $('#'+id); if(el) el.checked = false; }); state.tag=''; $$('[data-tag]').forEach(b=>b.classList.remove('on')); apply(); });
  $('[data-use-location]')?.addEventListener('click', () => {
    if(!navigator.geolocation){ toast('Location unavailable', 'This browser does not expose geolocation.'); return; }
    navigator.geolocation.getCurrentPosition(pos => { state.pos = { lat:pos.coords.latitude, lng:pos.coords.longitude }; if(sort) sort.value='distance'; apply(); toast('Distance sorting enabled', 'Your location stays in this browser session.'); }, () => toast('Location not enabled', 'Distance sort needs browser permission.'));
  });
  $('[data-copy-link]')?.addEventListener('click', async () => { await navigator.clipboard?.writeText(location.href); toast('Link copied'); });
  $('[data-export-visible]')?.addEventListener('click', () => {
    const rows = allCards().filter(c => !c.classList.contains('hidden')).map(c => ({ name:text($('h3',c)?.innerText), category:c.dataset.category, city:c.dataset.city, url:$('a[href^="/business/"]',c)?.href || '' }));
    const csv = ['name,category,city,url', ...rows.map(r => [r.name,r.category,r.city,r.url].map(v => `"${String(v).replaceAll('"','""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'phx-verified-visible-businesses.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); toast('CSV exported', `${rows.length} visible listing(s).`);
  });
  apply();
}
function bindProfileTools(){
  async function copyShareUrl(url){
    try {
      await navigator.clipboard?.writeText(url);
      return true;
    } catch {
      return false;
    }
  }
  $$('[data-copy-profile]').forEach(btn => btn.addEventListener('click', async () => {
    const url = btn.dataset.shareUrl || location.href;
    const copied = await copyShareUrl(url);
    toast(copied ? 'Link copied' : 'Copy unavailable', copied ? url : 'Use your browser share menu.');
  }));
  $$('[data-share-profile]').forEach(btn => btn.addEventListener('click', async () => {
    const url = btn.dataset.shareUrl || location.href;
    const title = btn.dataset.shareTitle || document.title || 'Valley Verified';
    const shareText = btn.dataset.shareText || 'Open this Valley Verified page.';
    if(navigator.share){
      try {
        await navigator.share({ title, text:shareText, url });
        toast('Share sheet opened');
        return;
      } catch (err) {
        if(err?.name === 'AbortError') return;
      }
    }
    const copied = await copyShareUrl(url);
    toast(copied ? 'Share link copied' : 'Share unavailable', copied ? url : 'Use email, text, or browser share.');
  }));
  $('[data-vcard]')?.addEventListener('click', e => {
    const b = JSON.parse(e.currentTarget.dataset.vcard || '{}');
    const lines = ['BEGIN:VCARD','VERSION:3.0',`FN:${b.name || ''}`,`ORG:${b.name || ''}`,b.phone ? `TEL;TYPE=WORK,VOICE:${b.phone}` : '',b.email ? `EMAIL;TYPE=WORK:${b.email}` : '',b.website ? `URL:${b.website}` : '',b.address ? `ADR;TYPE=WORK:;;${b.address};${b.city};${b.state};${b.zip};US` : '',`NOTE:${b.description || 'Valley Verified listing'}`,'END:VCARD'].filter(Boolean).join('\n');
    const blob = new Blob([lines], { type:'text/vcard;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${slugify(b.name || 'business')}.vcf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); toast('vCard downloaded');
  });
}
function bindMotionChrome(){
  if(!$('.scroll-progress')){
    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.prepend(progress);
  }
  const progress = $('.scroll-progress');
  function updateProgress(){
    if(!progress) return;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / max))})`;
  }
  addEventListener('scroll', updateProgress, { passive:true });
  addEventListener('resize', updateProgress, { passive:true });
  updateProgress();
  document.body.classList.add('vv-motion-ready');
  $$('.btn,.business-card,.platform-tile,.proof-card,.map-pin').forEach(el => el.classList.add('vv-motion-control'));
}
function bindSkyeComponents(){
  $$('[data-skye-tab]').forEach(tab => tab.addEventListener('click', event => {
    event.preventDefault();
    const shell = tab.closest('[data-skye-component="app-first-command-center"]');
    if(!shell) return;
    $$('[data-skye-tab]', shell).forEach(item => item.classList.toggle('active', item === tab));
    $$('[data-skye-panel]', shell).forEach(panel => panel.classList.toggle('hidden', panel.dataset.skyePanel !== tab.dataset.skyeTab));
  }));
  const steps = $$('[data-skye-component="scroll-proof-funnel"] .proof-step');
  if(steps.length){
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      for(const entry of entries){
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      }
    }, { threshold:.28 }) : null;
    steps.forEach(step => observer?.observe(step));
    const updateRails = () => {
      steps.forEach(step => {
        const rail = $('.proof-rail__fill', step);
        if(!rail) return;
        const rect = step.getBoundingClientRect();
        const span = innerHeight + rect.height;
        const progress = Math.min(1, Math.max(0, (innerHeight - rect.top) / span));
        rail.style.transform = `scaleY(${progress})`;
      });
    };
    addEventListener('scroll', updateRails, { passive:true });
    addEventListener('resize', updateRails, { passive:true });
    updateRails();
  }
}
function startSky(){
  const canvas = $('#sky');
  if(!canvas) return;
  canvas.setAttribute('data-disabled', 'true');
  canvas.hidden = true;
  return;
  canvas.classList.add('skyesol-living-background', 'living-background');
  const ctx = canvas.getContext('2d');
  let nodes = [], w = 0, h = 0, t = 0;
  function resize(){
    const ratio = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = Math.floor(innerWidth * ratio); h = canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
    const count = Math.min(90, Math.max(32, Math.floor(innerWidth / 18)));
    const livingBackgroundParticles = count;
    nodes = Array.from({ length: count }, () => ({ x:Math.random()*w, y:Math.random()*h, r:Math.random()*1.6+.5, a:Math.random()*.28+.12, vx:(Math.random()-.5)*.18, vy:(Math.random()-.5)*.08 }));
    canvas.dataset.livingBackgroundParticles = String(livingBackgroundParticles);
  }
  function frame(){
    t += .006;
    ctx.clearRect(0,0,w,h);
    for(let band = 0; band < 3; band++){
      const y = h * (.18 + band * .18) + Math.sin(t * (1.4 + band * .18)) * h * .05;
      const gradient = ctx.createLinearGradient(0, y - h * .18, w, y + h * .16);
      gradient.addColorStop(0, band === 0 ? 'rgba(143,33,24,.0)' : 'rgba(11,111,115,.0)');
      gradient.addColorStop(.34, band === 0 ? 'rgba(143,33,24,.16)' : band === 1 ? 'rgba(184,137,47,.12)' : 'rgba(11,111,115,.14)');
      gradient.addColorStop(.72, band === 0 ? 'rgba(184,137,47,.12)' : band === 1 ? 'rgba(11,111,115,.13)' : 'rgba(143,33,24,.11)');
      gradient.addColorStop(1, 'rgba(11,111,115,.0)');
      ctx.globalAlpha = .9;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * .24, y - h * .16, w * .54, y + h * .12, w, y - h * .06);
      ctx.lineTo(w, y + h * .18);
      ctx.bezierCurveTo(w * .58, y + h * .25, w * .22, y + h * .04, 0, y + h * .2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineWidth = Math.max(1, (devicePixelRatio || 1));
    for(let i=0; i<nodes.length; i++){
      const a = nodes[i];
      a.x += a.vx; a.y += a.vy;
      if(a.x < -20) a.x = w + 20; if(a.x > w + 20) a.x = -20;
      if(a.y < -20) a.y = h + 20; if(a.y > h + 20) a.y = -20;
      for(let j=i+1; j<nodes.length; j++){
        const b = nodes[j];
        const dx = a.x-b.x, dy = a.y-b.y, d = Math.sqrt(dx*dx + dy*dy);
        if(d < 150){
          ctx.globalAlpha = (1 - d / 150) * .18;
          ctx.strokeStyle = 'rgba(11,111,115,.72)';
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = a.a + Math.sin(t*3 + a.x*.01)*.04;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(143,33,24,.72)' : i % 3 === 1 ? 'rgba(184,137,47,.75)' : 'rgba(11,111,115,.72)';
      ctx.beginPath(); ctx.arc(a.x,a.y,a.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  addEventListener('resize', resize, { passive:true }); resize(); frame();
}
bindDirectory(); bindProfileTools(); bindShortlistButtons(); bindShortlistPage(); bindComparePage(); bindMotionChrome(); bindSkyeComponents(); startSky();

function formObject(form){
  const out = {};
  for(const el of Array.from(form.elements || [])){
    if(!el.name || el.type === 'button' || el.type === 'submit') continue;
    if(el.type === 'checkbox') out[el.name] = !!el.checked;
    else out[el.name] = text(el.value);
  }
  return out;
}
function downloadJson(filename, data){
  const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([body], { type:'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}
function bindSeedBuilder(){
  const form = $('[data-seed-builder]');
  if(!form) return;
  const output = $('#seedBuilderOutput');
  const dl = $('[data-download-seed]');
  let payload = null;
  function build(){
    const raw = formObject(form);
    const record = {
      id: slugify([raw.name, raw.city, raw.state].filter(Boolean).join('-')),
      name: raw.name,
      category: raw.category || 'Local Services',
      subcategory: raw.niche || raw.subcategory || '',
      niche: raw.niche || raw.subcategory || '',
      city: raw.city || 'Phoenix',
      state: raw.state || 'AZ',
      phone: raw.phone,
      email: raw.email,
      website: raw.website,
      poster_email: raw.poster_email || '',
      source_url: raw.source_url || '',
      tags: splitInput(raw.tags),
      starting_price: raw.starting_price ? Number(raw.starting_price) : null,
      description: raw.description,
      badges: {
        business_verified: !!raw.business_verified,
        no_hidden_fees: !!raw.no_hidden_fees,
        mobile: !!raw.mobile,
        insured: !!raw.insured
      },
      claim_status: 'submitted',
      accepts_requests: true,
      last_verified: new Date().toISOString().slice(0,10)
    };
    payload = { updated_at: new Date().toISOString().slice(0,10), source: 'submit-page-seed-builder', businesses: [record] };
    output.textContent = JSON.stringify(payload, null, 2);
    if(dl) dl.disabled = false;
    toast('Seed JSON built', 'Review it before adding it to the seed inbox.');
  }
  $('[data-build-seed]')?.addEventListener('click', build);
  dl?.addEventListener('click', () => { if(payload) downloadJson(`${payload.businesses[0].id || 'business'}-seed.json`, payload); });
}
function splitInput(value){ return text(value).split(/[|;,]/).map(text).filter(Boolean); }
function bindRequestBuilder(){
  const form = $('[data-request-builder]');
  if(!form) return;
  const output = $('#requestOutput');
  const dl = $('[data-download-request]');
  const params = new URLSearchParams(location.search);
  if(params.get('business') && form.business_id) form.business_id.value = params.get('business');
  let packet = null;
  function build(){
    const raw = formObject(form);
    packet = {
      id: `request-${Date.now()}`,
      created_at: new Date().toISOString(),
      source: 'phx-verified-request-builder',
      business_id: raw.business_id || null,
      category: raw.category || null,
      city: raw.city || null,
      budget: raw.budget || null,
      timeline: raw.timeline || null,
      contact: raw.contact || null,
      details: raw.details || '',
      status: 'new_request_packet'
    };
    output.textContent = JSON.stringify(packet, null, 2);
    if(dl) dl.disabled = false;
    try{ localStorage.setItem('phx:lastRequestPacket', JSON.stringify(packet)); }catch{}
    toast('Request packet built', 'Saved in this browser and ready to download.');
  }
  $('[data-build-request]')?.addEventListener('click', build);
  dl?.addEventListener('click', () => packet && downloadJson(`${packet.id}.json`, packet));
}
function bindClaimBuilder(){
  const form = $('[data-claim-builder]');
  if(!form) return;
  const output = $('#claimOutput');
  const dl = $('[data-download-claim]');
  const params = new URLSearchParams(location.search);
  if(params.get('business') && form.business_id) form.business_id.value = params.get('business');
  let packet = null;
  function build(){
    const raw = formObject(form);
    packet = {
      id: `claim-${raw.business_id || 'listing'}-${Date.now()}`,
      created_at: new Date().toISOString(),
      source: 'phx-verified-claim-builder',
      business_id: raw.business_id || null,
      owner: { name: raw.owner_name, email: raw.owner_email, phone: raw.owner_phone },
      requested_response_time: raw.response_time || null,
      requested_updates: raw.updates || '',
      requested_badges: {
        business_verified: !!raw.business_verified,
        insured: !!raw.insured,
        no_hidden_fees: !!raw.no_hidden_fees
      },
      status: 'claim_review_packet'
    };
    output.textContent = JSON.stringify(packet, null, 2);
    if(dl) dl.disabled = false;
    try{ localStorage.setItem('phx:lastClaimPacket', JSON.stringify(packet)); }catch{}
    toast('Claim packet built', 'Ready to download or submit.');
  }
  $('[data-build-claim]')?.addEventListener('click', build);
  dl?.addEventListener('click', () => packet && downloadJson(`${packet.id}.json`, packet));
}
function bindMapBoard(){
  const board = $('[data-map-board]');
  if(!board) return;
  const points = Array.isArray(window.PHX_MAP_POINTS) ? window.PHX_MAP_POINTS : [];
  const list = $('#mapList');
  if(!points.length){ board.innerHTML = '<div class="map-empty">No coordinates seeded yet.</div>'; return; }
  const lats = points.map(p=>Number(p.lat)), lngs = points.map(p=>Number(p.lng));
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, .01), spanLng = Math.max(maxLng - minLng, .01);
  board.innerHTML = points.map(p => {
    const x = ((Number(p.lng) - minLng) / spanLng) * 88 + 6;
    const y = (1 - ((Number(p.lat) - minLat) / spanLat)) * 84 + 8;
    return `<a class="map-pin" href="${escapeHtml(p.url)}" style="left:${x}%;top:${y}%" aria-label="${escapeHtml(p.name)}"><span>${escapeHtml(String(p.score))}</span></a>`;
  }).join('');
  if(list) list.innerHTML = points.map(p => `<a href="${escapeHtml(p.url)}"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.city)} • ${escapeHtml(p.category)}</span></a>`).join('');
}
function bindMatchPage(){
  const shell = $('[data-match-page]');
  if(!shell) return;
  let data = JSON.parse($('#matchData')?.textContent || '[]');
  const results = $('#matchResults');
  const count = $('#matchCount');
  const exportBtn = $('[data-export-match]');
  let packet = null;
  function score(b, req){
    let s = Number(b.score || 0); const reasons = [];
    if(req.city && b.city === req.city){ s += 22; reasons.push('city match'); }
    if(req.category && b.category === req.category){ s += 26; reasons.push('category match'); }
    if(req.mobile && b.mobile){ s += 12; reasons.push('mobile signal'); }
    if(req.verified && b.badges?.business_verified){ s += 14; reasons.push('verified signal'); }
    if(req.transparent && b.badges?.no_hidden_fees){ s += 10; reasons.push('transparent pricing signal'); }
    if(req.budget && b.price && Number(b.price) <= Number(req.budget)){ s += 8; reasons.push('within seeded starting price'); }
    for(const term of splitInput(req.terms || '')){ if(term && String(b.text || '').includes(term.toLowerCase())){ s += 6; reasons.push(`term: ${term}`); } }
    if(b.accepts_requests){ s += 5; reasons.push('accepts requests'); }
    return { ...b, match_score:Math.min(s, 160), reasons:[...new Set(reasons)].slice(0,8) };
  }
  async function ensureData(){ if(data.length) return data; results.innerHTML = '<p class="muted">Loading match index…</p>'; data = await loadRecords('/data/match-index.json', 'records'); return data; }
  async function render(){
    await ensureData();
    const req = { city:$('#matchCity')?.value || '', category:$('#matchCategory')?.value || '', budget:$('#matchBudget')?.value || '', terms:$('#matchTerms')?.value || '', verified:!!$('#matchVerified')?.checked, transparent:!!$('#matchTransparent')?.checked, mobile:!!$('#matchMobile')?.checked };
    const matches = data.map(b=>score(b, req)).filter(b => (!req.city || b.city === req.city) && (!req.category || b.category === req.category)).sort((a,b)=>b.match_score-a.match_score || b.score-a.score).slice(0,12);
    packet = { id:`match-${Date.now()}`, created_at:new Date().toISOString(), request:req, matches };
    if(count) count.textContent = `${matches.length} matches`;
    if(exportBtn) exportBtn.disabled = !matches.length;
    results.innerHTML = matches.length ? matches.map(b => `<article class="business-card"><div class="card-top"><div><p class="eyebrow">${escapeHtml(b.city)} • ${escapeHtml(b.category)}</p><h3><a href="${escapeHtml(b.url)}">${escapeHtml(b.name)}</a></h3></div><div class="score"><strong>${escapeHtml(b.match_score)}</strong><small>match</small></div></div><p class="card-desc">${escapeHtml((b.reasons || []).join(' • ') || 'Ranked by seeded profile strength.')}</p><div class="mini-grid"><span>Profile score ${escapeHtml(b.score)}</span><span>${b.accepts_requests ? 'Accepts requests' : 'Review first'}</span><span>${b.price ? '$'+escapeHtml(b.price) : 'Quote required'}</span><span>${b.mobile ? 'Mobile' : 'Location-based'}</span></div><div class="card-actions"><a class="btn small primary" href="${escapeHtml(b.url)}">Open profile</a><button class="btn small" data-save-business data-business-id="${escapeHtml(b.id)}" data-business-name="${escapeHtml(b.name)}" data-url="${escapeHtml(b.url)}">Save</button><a class="btn small" href="/request/?business=${escapeHtml(b.id)}">Request</a></div></article>`).join('') : '<p class="muted">No matches. Loosen city/category filters or seed more businesses in this lane.</p>';
    bindShortlistButtons();
  }
  $('[data-run-match]')?.addEventListener('click', () => { render(); toast('Match run complete'); });
  exportBtn?.addEventListener('click', () => packet && downloadJson(`${packet.id}.json`, packet));
  render();
}


function bindAdminBatchPage(){
  const btn = $('[data-copy-batch]');
  const out = $('#batchOutput');
  if(!btn || !out) return;
  btn.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(out.textContent || '');
    toast('Batch patch copied', 'Review before adding to suppressions.json.');
  });
}

bindSeedBuilder(); bindRequestBuilder(); bindClaimBuilder(); bindMapBoard(); bindMatchPage(); bindAdminBatchPage();
