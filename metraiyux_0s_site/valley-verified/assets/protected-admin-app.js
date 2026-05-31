const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const VALLEY_DECISION_URL = '/valley-verified/VALLEY_RUNTIME_DECISION.json';
const PROOF_BOUNDARY = {
  boundary:'proof_only',
  proof_only:true,
  dry_run:true,
  worker_confirmed:false,
  worker_receipt:null,
  live_telemetry:false
};
async function api(operation, payload = {}){
  const decision = await fetch(VALLEY_DECISION_URL, { cache:'no-store', credentials:'include' }).then((res)=>res.json()).catch(()=>({ decision:'public_directory_static_admin_external_proof_only' }));
  return {
    ...PROOF_BOUNDARY,
    ok:false,
    operation,
    not_executed:true,
    mode:decision.decision,
    reason:'Valley PHX admin functions are not mounted on the 0S static Valley route.',
    use_live_backend:decision.liveBackends || {},
    payload:{ ...PROOF_BOUNDARY, ...payload }
  };
}
function render(msg){ const out=$('#adminOutput'); if(out) out.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg,null,2); }
$('#loadQueues')?.addEventListener('click', async()=>{ try{ render(await api('runtime_decision')); }catch(e){ render(e.message); } });
$('#replayState')?.addEventListener('click', async()=>{ try{ render(await api('replay_actions')); }catch(e){ render(e.message); } });
$('#exportChanges')?.addEventListener('click', async()=>{ try{ render(await api('export_change_set')); }catch(e){ render(e.message); } });
$$('[data-admin-operation]').forEach(btn=>btn.addEventListener('click', async()=>{ try{ render(await api(btn.dataset.adminOperation)); }catch(e){ render(e.message); } }));
