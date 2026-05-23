const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json({limit:'1mb'}));
const PORT = process.env.BRAIN_SERVICE_PORT || 8099;
const provider = (process.env.LOCAL_LLM_PROVIDER || 'none').toLowerCase();
const ollamaBase = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b-instruct';
const openaiBase = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const openaiApiKey = process.env.OPENAI_API_KEY || '';
const kbPath = path.join(__dirname,'..','data','knowledge-base.json');
function loadKb(){ try { return JSON.parse(fs.readFileSync(kbPath,'utf8')); } catch { return []; } }
function score(query, item){ const words=String(query).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); const hay=JSON.stringify(item).toLowerCase(); return words.reduce((n,w)=>n+(hay.includes(w)?(w.length>4?2:1):0),0); }
function retrieve(query){ return loadKb().map(x=>({...x,score:score(query,x)})).sort((a,b)=>b.score-a.score).slice(0,5).filter(x=>x.score>0); }
function fallback(query){ const hits=retrieve(query); if(!hits.length) return 'No precise local KB match. Use the setup, command center, readiness, proof, and docs runbooks. Keep claims limited to verified deployment/support work.'; return hits.map((h,i)=>`${i+1}. ${h.title}: ${h.body}`).join('\n\n'); }
function responseText(data){
  if(data?.output_text) return data.output_text;
  const parts = [];
  for(const item of data?.output || []){
    for(const content of item?.content || []){
      if(content?.type === 'output_text' && content?.text) parts.push(content.text);
      if(content?.text && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}
function promptFor(query, hits){
  const context = hits.length ? hits.map(h=>`- ${h.title}: ${h.body}`).join('\n') : fallback(query);
  return {
    instructions: 'You are Orynth Local, the embedded site brain for Skye Business Command Center. Be direct, honest, production-safe, and never claim unverified completion. Answer using the local package context. If production infrastructure is not verified, say so clearly.',
    input: `Context:\n${context}\n\nQuestion: ${query}`
  };
}
async function askOpenAI(query, hits){
  if(!openaiApiKey) throw new Error('OPENAI_API_KEY is not configured');
  const prompt = promptFor(query, hits);
  const response = await fetch(`${openaiBase.replace(/\/$/,'')}/responses`, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiApiKey}`},
    body:JSON.stringify({
      model: openaiModel,
      instructions: prompt.instructions,
      input: prompt.input,
      max_output_tokens: 700
    }),
    signal: AbortSignal.timeout(30000)
  });
  if(!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
  const data = await response.json();
  return responseText(data) || fallback(query);
}
app.get('/health',(req,res)=>res.json({ok:true, provider, ollamaModel, openaiModel, openai_configured:Boolean(openaiApiKey), kb_items: loadKb().length}));
app.post('/ask', async (req,res)=>{
  const query = String(req.body?.query || '').slice(0,4000);
  const hits = retrieve(query);
  if(provider === 'openai'){
    try{
      return res.json({mode:'openai', answer:await askOpenAI(query, hits), sources:hits.map(h=>h.title)});
    }catch(err){
      return res.json({mode:'openai-fallback', answer:fallback(query)+`\n\nOpenAI bridge note: ${err.message}`, sources:hits.map(h=>h.title)});
    }
  }
  if(provider !== 'ollama') return res.json({mode:'local-kb', answer:fallback(query), sources:hits.map(h=>h.title)});
  try{
    const prompt = promptFor(query, hits);
    const ollamaPrompt = `${prompt.instructions}\n\n${prompt.input}`;
    const response = await fetch(`${ollamaBase.replace(/\/$/,'')}/api/generate`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({model:ollamaModel, prompt:ollamaPrompt, stream:false})});
    if(!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const data = await response.json();
    return res.json({mode:'ollama', answer:data.response || fallback(query), sources:hits.map(h=>h.title)});
  }catch(err){ return res.json({mode:'local-kb-fallback', answer:fallback(query)+`\n\nLocal LLM bridge note: ${err.message}`, sources:hits.map(h=>h.title)}); }
});
app.listen(PORT,()=>console.log(`SBCC brain-service listening on ${PORT}`));
