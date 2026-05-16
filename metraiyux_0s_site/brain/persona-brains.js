
let KB = [];
let BRAINS = [];
let SURFACE_REGISTRY = null;
let SALES_OFFER_REGISTRY = null;
let selectedBrain = 'central-company-command-brain';
const BRAIN_SURFACE_LINKS = {
  'site-operator-brain': 'admin/automation-brain.html',
  '0meg4kai-security-brain': 'admin/0meg4kai-security.html',
  'central-company-command-brain': 'admin/brain-command-matrix.html',
  'gray-london-skyes-brain': 'crown-os/founder-override-ledger.html',
  'marcus-vale-brain': 'crown-os/autonomous-command-room.html',
  'celeste-monroe-brain': 'sales-enablement/index.html',
  'adrian-cross-brain': 'client-os/index.html',
  'naomi-sterling-brain': 'crown-os/revenue-pulse-engine.html',
  'julian-mercer-brain': 'contracts/index.html',
  'sienna-brooks-brain': 'crown-os/candidate-placement-engine.html',
  'orion-hayes-brain': 'cloudflare/index.html',
  'valentina-reyes-brain': 'crown-os/site-content-control.html',
  'donovan-pierce-brain': 'certification-readiness/government-document-room.html',
  'helena-ward-brain': 'crown-os/vendor-risk-engine.html',
  'victor-saint-brain': 'proof-export/index.html',
  'amara-voss-brain': 'branch-expansion/index.html'
};
const stopwords = new Set('a an and are as at be by for from has have i in into is it its of on or our that the their this to with we what when where who why how which should about across all can does do if so than then there they through use using within without'.split(' '));
function tokenize(text){return (text||'').toLowerCase().replace(/[^a-z0-9\s&/-]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stopwords.has(w));}
function activeBrain(){return BRAINS.find(b=>b.id===selectedBrain)||BRAINS[0];}
function brainPortrait(brain){return brain?.portrait || 'assets/metraiyux-0s-logo-transparent.png';}
function brainTitle(brain){return brain?.title || brain?.display_name || brain?.role || brain?.name || 'Scoped MetrAIyux 0S brain';}
function brainPurpose(brain){return brain?.purpose || brain?.role || (brain?.scope || []).join(' · ') || 'Routes scoped work inside the MetrAIyux 0S operating system.';}
function brainCanAnswer(brain){return brain?.can_answer || brain?.scope || [];}
function brainResumePath(brain){return brain?.person_id ? `resumes/${brain.person_id}.html` : '';}
function brainSurfacePath(brain){return BRAIN_SURFACE_LINKS[brain?.id] || 'person-brains.html';}
function brainProfileActions(brain){
  const surface = brainSurfacePath(brain);
  const resume = brainResumePath(brain);
  return `<p class="button-row brain-profile-actions"><a class="action-btn" href="${surface}">Open operating surface</a>${resume ? `<a class="action-btn" href="${resume}">Open resume</a>` : ''}<a class="action-btn" href="https://metraiyux-0s-public-spectacle.pages.dev/brain-system.html#operating-brain-rooms" target="_blank" rel="noopener">Public brain wall</a></p>`;
}
function scoreChunk(query, chunk, brain){
  const q=tokenize(query); const hay=(chunk.title+' '+chunk.heading+' '+chunk.text+' '+chunk.source).toLowerCase();
  let score=0; const used=new Set();
  q.forEach(term=>{ if(hay.includes(term)){ score += used.has(term)?0:3; used.add(term); } });
  (brain.scope_keywords||[]).forEach(k=>{ const kk=(k||'').toLowerCase(); if(kk && hay.includes(kk)) score+=4; if(kk && query.toLowerCase().includes(kk)) score+=2; });
  if(brain.person_id && hay.includes(brain.person_id.replaceAll('-',' '))) score += 8;
  if(brain.cabinet && hay.includes(brain.cabinet.toLowerCase())) score += 8;
  ['gray london skyes','government','ae','sales','compliance','staffing','technology','founder','incorporation','legal','resume','cabinet','brain','skygate','fs27','gate','proof surface','live surface','white label','client website','command deck','sovereign infrastructure','metraiyux'].forEach(p=>{ if(query.toLowerCase().includes(p)&&hay.includes(p)) score+=5; });
  return score;
}
function retrieve(query, limit=7){const brain=activeBrain(); return KB.map(c=>({...c,score:scoreChunk(query,c,brain)})).filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);}
function sentencePick(text, query, max=5){
  const terms=tokenize(query); const sentences=(text.match(/[^.!?]+[.!?]+/g)||[text]).map(s=>s.trim()).filter(Boolean);
  return sentences.map(s=>({s,score:terms.reduce((n,t)=>n+(s.toLowerCase().includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score).slice(0,max).map(x=>x.s);
}
function buildAnswer(query, sources){
  const brain=activeBrain();
  if(!sources.length) return `<div class="answer-block"><h3>${brain.name}: no strong match found.</h3><p>This scoped brain only knows what is inside this package. Try asking about ${brain.cabinet}, cabinet duties, resume background, AE positioning, governance language, or setup notes.</p></div>`;
  const top=sources[0];
  const points=[]; sources.slice(0,5).forEach(src=>{ sentencePick(src.text, query, 2).forEach(s=>points.push({s,src})); });
  const unique=[]; const seen=new Set();
  points.forEach(p=>{const k=p.s.toLowerCase().slice(0,120); if(!seen.has(k)){seen.add(k); unique.push(p)}});
  const guardrails=(brain.must_not_claim||[]).slice(0,3).map(x=>`<li>${x}</li>`).join('');
  const bullets=unique.slice(0,7).map(p=>`<p><span class="brain-pill">${p.src.title}</span>${p.s}</p>`).join('');
  return `<div class="answer-block"><h3>${brain.name}</h3><p><strong>Active scope:</strong> ${brain.purpose}</p><p>Strongest source: <strong>${top.heading}</strong> from <strong>${top.title}</strong>.</p>${bullets}<div class="guardrail"><strong>Guardrails</strong><ul>${guardrails}</ul></div></div>`;
}
function renderSources(sources){
  const el=document.getElementById('personaSources');
  el.innerHTML = sources.length ? sources.map(s=>`<div class="source-card"><strong>${s.heading}</strong><span>${s.title} · score ${s.score}</span><p>${s.text.slice(0,240)}...</p><p>${s.source}</p></div>`).join('') : '<p class="notice">No sources retrieved yet.</p>';
}
function renderBrainCards(){
  const wrap=document.getElementById('brainCards');
  const selector=document.getElementById('brainSelector');
  selector.innerHTML=BRAINS.map(b=>`<option value="${b.id}">${b.name} — ${b.cabinet}</option>`).join('');
  wrap.innerHTML=BRAINS.map((b,i)=>`<button class="brain-card ${b.id===selectedBrain?'active':''}" data-brain="${b.id}"><span>${String(i+1).padStart(2,'0')}</span><img src="${brainPortrait(b)}" alt="${b.name}"><strong>${b.name}</strong><em>${b.cabinet}</em></button>`).join('');
  wrap.querySelectorAll('[data-brain]').forEach(btn=>btn.addEventListener('click',()=>{selectedBrain=btn.dataset.brain; selector.value=selectedBrain; renderBrainCards(); renderBrainProfile(); document.getElementById('personaAnswer').innerHTML=''; renderSources([]);}));
}
function renderBrainProfile(){
  const b=activeBrain();
  document.getElementById('activeBrainProfile').innerHTML=`<div class="active-brain-profile"><img src="${brainPortrait(b)}" alt="${b.name}"><div><p class="eyebrow">Active Lightweight Brain</p><h2>${b.name}</h2><p>${brainTitle(b)}</p><p><strong>Cabinet:</strong> ${b.cabinet}</p><p><strong>Purpose:</strong> ${brainPurpose(b)}</p><p><strong>Can answer:</strong> ${brainCanAnswer(b).join(' · ')}</p>${brainProfileActions(b)}</div></div>`;
}
async function loadPersonaBrain(){
  const status=document.getElementById('personaStatus');
  try{
    const [kbRes, brainsRes, registryRes, salesRegistryRes]=await Promise.all([
      fetch('brain/knowledge-base.json'),
      fetch('brain/persona-brains.json'),
      fetch('brain/live-surface-registry.json').catch(()=>null),
      fetch('brain/sales-offer-registry.json').catch(()=>null)
    ]);
    const kbData=await kbRes.json(); const brainData=await brainsRes.json();
    SURFACE_REGISTRY = registryRes?.ok ? await registryRes.json() : null;
    SALES_OFFER_REGISTRY = salesRegistryRes?.ok ? await salesRegistryRes.json() : null;
    KB=[
      ...(kbData.chunks||[]),
      ...registryToChunks(SURFACE_REGISTRY),
      ...salesOfferRegistryToChunks(SALES_OFFER_REGISTRY)
    ];
    BRAINS=brainData.profiles||[];
    status.textContent=`Ready. Loaded ${BRAINS.length} lightweight brains and ${KB.length} local knowledge chunks${SURFACE_REGISTRY ? ' including live proof surfaces' : ''}${SALES_OFFER_REGISTRY ? ' and approved sales offers' : ''}.`;
    renderBrainCards(); renderBrainProfile(); renderSources([]);
  }catch(e){ status.textContent='Could not load brain files. Serve the folder with a local/static server, not a blocked file:// preview.'; }
}
function registryToChunks(registry){
  if(!registry) return [];
  const chunks=[{
    id:'live-surface-registry-positioning',
    title:'Live Surface Registry',
    heading:'MetrAIyux and SkyeGateFS27 sales architecture',
    text:[registry.positioning, registry.sales_rule, ...(registry.public_claim_boundary||[])].join(' '),
    source:'brain/live-surface-registry.json'
  }];
  Object.entries(registry.brain_guidance||{}).forEach(([brainId, guidance])=>chunks.push({
    id:`live-surface-guidance-${brainId}`,
    title:'Live Surface Registry',
    heading:`Sales guidance for ${brainId}`,
    text:guidance,
    source:'brain/live-surface-registry.json'
  }));
  (registry.surfaces||[]).forEach(surface=>chunks.push({
    id:`live-surface-${surface.id}`,
    title:'Live Surface Registry',
    heading:surface.name,
    text:`${surface.name} lives at ${surface.url}. Audience: ${surface.audience}. Privacy: ${surface.privacy}. Purpose: ${surface.purpose}. Sales use: ${surface.sales_use}. Route when: ${(surface.route_when||[]).join(', ')}. Primary brain: ${surface.primary_brain}. Secondary brain: ${surface.secondary_brain}.`,
    source:surface.local_path || 'brain/live-surface-registry.json'
  }));
  return chunks;
}
function salesOfferRegistryToChunks(registry){
  if(!registry) return [];
  const chunks=[{
    id:'sales-offer-registry-positioning',
    title:'Sales Offer Registry',
    heading:'Approved Stripe products and quote rules',
    text:[registry.positioning, registry.sales_rule, ...(registry.guardrails||[])].join(' '),
    source:'brain/sales-offer-registry.json'
  }];
  Object.entries(registry.public_routes||{}).forEach(([name, url])=>chunks.push({
    id:`sales-public-route-${name}`,
    title:'Sales Offer Registry',
    heading:`Public route: ${name}`,
    text:`${name} lives at ${url}. Use this route when the buyer needs live proof, a deployed surface, or a next step tied to the offer.`,
    source:'brain/sales-offer-registry.json'
  }));
  (registry.folders||[]).forEach(folder=>chunks.push({
    id:`sales-folder-${(folder.folder||'folder').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`,
    title:'Sales Offer Registry',
    heading:`Folder sales role: ${folder.folder}`,
    text:`${folder.folder}. Role: ${folder.role}. Stripe action: ${folder.stripe_action}.`,
    source:'brain/sales-offer-registry.json'
  }));
  (registry.catalog_groups||[]).forEach(group=>{
    const items=(group.items||[]).map(item=>`${item.product_name}: ${item.price_label} (${item.lookup_key})`).join('; ');
    chunks.push({
      id:`sales-catalog-group-${group.id}`,
      title:'Sales Offer Registry',
      heading:`Catalog group: ${group.id}`,
      text:`Folder: ${group.folder}. Status: ${group.status}. Brain owner: ${group.brain_owner}. Stripe action: ${group.stripe_action}. Offers: ${items}.`,
      source:'brain/sales-offer-registry.json'
    });
  });
  (registry.offers||[]).forEach(offer=>chunks.push({
    id:`sales-offer-${offer.lookup_key || offer.id}`,
    title:'Sales Offer Registry',
    heading:`${offer.product_name} - ${offer.price_label}`,
    text:`${offer.product_name}. Price: ${offer.price_label}. Stripe type: ${offer.price_type}. Billing: ${offer.billing_period}. Lookup key: ${offer.lookup_key}. Status: ${offer.status}. Folder: ${offer.source_folder}. Source: ${offer.source_file}. Brain owner: ${offer.brain_owner}. Sales use: ${offer.sales_use}. Includes: ${(offer.includes||[]).join(', ')}. ${offer.setup_lookup_key ? `Setup lookup key: ${offer.setup_lookup_key}.` : ''}`,
    source:offer.source_file || 'brain/sales-offer-registry.json'
  }));
  (registry.do_not_sell_as_prices||[]).forEach(item=>chunks.push({
    id:`sales-do-not-price-${(item.source||'source').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`,
    title:'Sales Offer Registry',
    heading:`Do not sell as price: ${item.value}`,
    text:`${item.value} from ${item.source} must not be quoted as a product price because ${item.reason}.`,
    source:'brain/sales-offer-registry.json'
  }));
  return chunks;
}
document.getElementById('brainSelector')?.addEventListener('change',e=>{selectedBrain=e.target.value; renderBrainCards(); renderBrainProfile(); document.getElementById('personaAnswer').innerHTML=''; renderSources([]);});
document.getElementById('askPersonaBrain')?.addEventListener('click',()=>{const q=document.getElementById('personaQuestion').value.trim(); if(!q) return; const sources=retrieve(q,7); renderSources(sources); document.getElementById('personaAnswer').innerHTML=buildAnswer(q,sources);});
document.getElementById('examplePersonaBrain')?.addEventListener('click',()=>{document.getElementById('personaQuestion').value='What do you own, what should an AE say about your cabinet, and what should not be claimed yet?';});
document.getElementById('clearPersonaBrain')?.addEventListener('click',()=>{document.getElementById('personaQuestion').value='';document.getElementById('personaAnswer').innerHTML='';renderSources([]);});
loadPersonaBrain();
