
let KB = [];
const stopwords = new Set('a an and are as at be by for from has have i in into is it its of on or our that the their this to with we what when where who why how which should about across all can does do if so than then there they through use using within without'.split(' '));
function tokenize(text){return (text||'').toLowerCase().replace(/[^a-z0-9\s&/-]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stopwords.has(w));}
function scoreChunk(query, chunk){
  const q=tokenize(query); const hay=(chunk.title+' '+chunk.heading+' '+chunk.text+' '+chunk.source).toLowerCase();
  let score=0; const used=new Set();
  q.forEach(term=>{ if(hay.includes(term)){ score += used.has(term)?0:3; used.add(term); } });
  // boost exact important phrases
  ['gray london skyes','government','ae','sales','compliance','staffing','technology','founder','incorporation','legal','resume','cabinet'].forEach(p=>{ if(query.toLowerCase().includes(p)&&hay.includes(p)) score+=5; });
  return score;
}
function retrieve(query, limit=5){return KB.map(c=>({...c,score:scoreChunk(query,c)})).filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);}
function sentencePick(text, query, max=5){
  const terms=tokenize(query); const sentences=(text.match(/[^.!?]+[.!?]+/g)||[text]).map(s=>s.trim()).filter(Boolean);
  return sentences.map(s=>({s,score:terms.reduce((n,t)=>n+(s.toLowerCase().includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score).slice(0,max).map(x=>x.s);
}
function buildAnswer(query, sources){
  if(!sources.length) return `<div class="answer-block"><h3>No strong match found.</h3><p>The local brain only knows what is inside this package. Try asking about cabinet roles, resumes, AE positioning, governance, founder image rules, deployment, or incorporation cautions.</p></div>`;
  const top=sources[0];
  const points=[];
  sources.slice(0,4).forEach(src=>{ sentencePick(src.text, query, 2).forEach(s=>points.push({s,src})); });
  const unique=[]; const seen=new Set();
  points.forEach(p=>{const k=p.s.toLowerCase().slice(0,120); if(!seen.has(k)){seen.add(k); unique.push(p)}});
  const bullets=unique.slice(0,7).map(p=>`<p><span class="brain-pill">${p.src.title}</span>${p.s}</p>`).join('');
  return `<div class="answer-block"><h3>Local answer</h3><p>Based on the strongest match, start with <strong>${top.heading}</strong> from <strong>${top.title}</strong>.</p>${bullets}<p><strong>Operational caution:</strong> These cabinet identities remain demonstrative until real people are appointed. Use verified officer data for actual legal filings.</p></div>`;
}
function renderSources(sources){
  const el=document.getElementById('brainSources');
  el.innerHTML = sources.length ? sources.map(s=>`<div class="source-card"><strong>${s.heading}</strong><span>${s.title} · score ${s.score}</span><p>${s.text.slice(0,240)}...</p><p>${s.source}</p></div>`).join('') : '<p class="notice">No sources retrieved yet.</p>';
}
async function loadKB(){
  const status=document.getElementById('brainStatus');
  try{ const res=await fetch('brain/knowledge-base.json'); const data=await res.json(); KB=data.chunks||[]; status.textContent=`Ready. Loaded ${KB.length} local knowledge chunks.`; renderSources([]); }
  catch(e){ status.textContent='Could not load brain/knowledge-base.json. Check that the site is served from a local/static server.'; }
}
document.getElementById('askBrain')?.addEventListener('click',()=>{
  const q=document.getElementById('brainQuestion').value.trim(); if(!q) return;
  const sources=retrieve(q,6); renderSources(sources); document.getElementById('brainAnswer').innerHTML=buildAnswer(q,sources);
});
document.getElementById('exampleBrain')?.addEventListener('click',()=>{document.getElementById('brainQuestion').value='Which cabinet owns government contracting readiness, and how should an AE explain the 13-department model to a client?';});
document.getElementById('clearBrain')?.addEventListener('click',()=>{document.getElementById('brainQuestion').value='';document.getElementById('brainAnswer').innerHTML='';renderSources([]);});
document.getElementById('testEndpoint')?.addEventListener('click', async()=>{
  const out=document.getElementById('endpointResult'); const url=document.getElementById('endpointUrl').value.trim(); const model=document.getElementById('endpointModel').value.trim();
  out.textContent='Testing endpoint...';
  try{
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:'You are a concise local company cabinet assistant.'},{role:'user',content:'Reply with one sentence confirming the local brain endpoint works.'}],stream:false})});
    const data=await res.json(); out.textContent=JSON.stringify(data,null,2).slice(0,2000);
  }catch(e){ out.textContent='Endpoint test failed: '+e.message+'\nThis is normal if Ollama/llama.cpp is not running or CORS is not enabled.'; }
});
loadKB();
