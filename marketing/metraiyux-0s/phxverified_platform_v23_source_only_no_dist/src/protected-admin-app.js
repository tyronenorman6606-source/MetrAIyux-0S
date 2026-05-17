const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
async function api(operation, payload = {}){
  const res = await fetch('/.netlify/functions/phx-admin', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ operation, ...payload }) });
  const body = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(body.error || `Request failed: ${res.status}`);
  return body;
}
function render(msg){ const out=$('#adminOutput'); if(out) out.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg,null,2); }
$('#loadQueues')?.addEventListener('click', async()=>{ try{ const res = await fetch('/.netlify/functions/phx-admin', { credentials:'include' }); render(await res.json()); }catch(e){ render(e.message); } });
$('#replayState')?.addEventListener('click', async()=>{ try{ render(await api('replay_actions')); }catch(e){ render(e.message); } });
$('#exportChanges')?.addEventListener('click', async()=>{ try{ render(await api('export_change_set')); }catch(e){ render(e.message); } });
$$('[data-admin-operation]').forEach(btn=>btn.addEventListener('click', async()=>{ try{ render(await api(btn.dataset.adminOperation)); }catch(e){ render(e.message); } }));
