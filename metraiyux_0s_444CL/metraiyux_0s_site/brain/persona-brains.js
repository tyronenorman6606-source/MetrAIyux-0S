
let KB = [];
let BRAINS = [];
let selectedBrain = 'central-company-command-brain';
const stopwords = new Set('a an and are as at be by for from has have i in into is it its of on or our that the their this to with we what when where who why how which should about across all can does do if so than then there they through use using within without'.split(' '));
function tokenize(text){return (text||'').toLowerCase().replace(/[^a-z0-9\s&/-]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stopwords.has(w));}
function activeBrain(){return BRAINS.find(b=>b.id===selectedBrain)||BRAINS[0];}
function brainPortrait(brain){return brain?.portrait || 'assets/metraiyux-0s-logo-transparent.png';}
function brainTitle(brain){return brain?.title || brain?.display_name || brain?.role || brain?.name || 'Scoped Client Command Deck brain';}
function brainPurpose(brain){return brain?.purpose || brain?.role || (brain?.scope || []).join(' · ') || 'Routes scoped work inside the Client Command Deck operating system.';}
function brainCanAnswer(brain){return brain?.can_answer || brain?.scope || [];}
function scoreChunk(query, chunk, brain){
  const q=tokenize(query); const hay=(chunk.title+' '+chunk.heading+' '+chunk.text+' '+chunk.source).toLowerCase();
  let score=0; const used=new Set();
  q.forEach(term=>{ if(hay.includes(term)){ score += used.has(term)?0:3; used.add(term); } });
  (brain.scope_keywords||[]).forEach(k=>{ const kk=(k||'').toLowerCase(); if(kk && hay.includes(kk)) score+=4; if(kk && query.toLowerCase().includes(kk)) score+=2; });
  if(brain.person_id && hay.includes(brain.person_id.replaceAll('-',' '))) score += 8;
  if(brain.cabinet && hay.includes(brain.cabinet.toLowerCase())) score += 8;
  ['gray london skyes','government','ae','sales','compliance','staffing','technology','founder','incorporation','legal','resume','cabinet','brain'].forEach(p=>{ if(query.toLowerCase().includes(p)&&hay.includes(p)) score+=5; });
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
  document.getElementById('activeBrainProfile').innerHTML=`<div class="active-brain-profile"><img src="${brainPortrait(b)}" alt="${b.name}"><div><p class="eyebrow">Active Lightweight Brain</p><h2>${b.name}</h2><p>${brainTitle(b)}</p><p><strong>Cabinet:</strong> ${b.cabinet}</p><p><strong>Purpose:</strong> ${brainPurpose(b)}</p><p><strong>Can answer:</strong> ${brainCanAnswer(b).join(' · ')}</p></div></div>`;
}
async function loadPersonaBrain(){
  const status=document.getElementById('personaStatus');
  try{
    const [kbRes, brainsRes]=await Promise.all([fetch('brain/knowledge-base.json'), fetch('brain/persona-brains.json')]);
    const kbData=await kbRes.json(); const brainData=await brainsRes.json(); KB=kbData.chunks||[]; BRAINS=brainData.profiles||[];
    status.textContent=`Ready. Loaded ${BRAINS.length} lightweight brains and ${KB.length} local knowledge chunks.`;
    renderBrainCards(); renderBrainProfile(); renderSources([]);
  }catch(e){ status.textContent='Could not load brain files. Serve the folder with a local/static server, not a blocked file:// preview.'; }
}
document.getElementById('brainSelector')?.addEventListener('change',e=>{selectedBrain=e.target.value; renderBrainCards(); renderBrainProfile(); document.getElementById('personaAnswer').innerHTML=''; renderSources([]);});
document.getElementById('askPersonaBrain')?.addEventListener('click',()=>{const q=document.getElementById('personaQuestion').value.trim(); if(!q) return; const sources=retrieve(q,7); renderSources(sources); document.getElementById('personaAnswer').innerHTML=buildAnswer(q,sources);});
document.getElementById('examplePersonaBrain')?.addEventListener('click',()=>{document.getElementById('personaQuestion').value='What do you own, what should an AE say about your cabinet, and what should not be claimed yet?';});
document.getElementById('clearPersonaBrain')?.addEventListener('click',()=>{document.getElementById('personaQuestion').value='';document.getElementById('personaAnswer').innerHTML='';renderSources([]);});
loadPersonaBrain();
