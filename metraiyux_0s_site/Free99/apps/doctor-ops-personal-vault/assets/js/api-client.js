(function(){
  const PARAM = new URLSearchParams(location.search);
  const stored = (() => { try { return localStorage.getItem('doctor_ops_platform:api_base') || ''; } catch { return ''; } })();
  const base = (PARAM.get('api') || stored || '').replace(/\/$/, '');
  const state = {available:null, lastHealth:null, error:null, base};
  function url(path){ return `${base}${path}`; }
  async function request(path, options){
    const headers = {'content-type':'application/json', ...(options?.headers || {})};
    const res = await fetch(url(path), {...options, headers});
    const text = await res.text();
    let body = null;
    try{ body = text ? JSON.parse(text) : null; }catch{ body = {raw:text}; }
    if(!res.ok){ const err = new Error(body?.error || `HTTP ${res.status}`); err.status = res.status; err.body = body; throw err; }
    return body;
  }
  async function health(){ try{ const result = await request('/api/health'); state.available = true; state.error = null; state.lastHealth = result; return result; }catch(err){ state.available = false; state.error = err.message; throw err; } }
  function setBase(next){ const clean = String(next || '').trim().replace(/\/$/, ''); try{ localStorage.setItem('doctor_ops_platform:api_base', clean); }catch{} state.base = clean; location.reload(); }
  async function exportStore(){ return request('/api/export'); }
  async function importWorkspace(payload){ return request('/api/import-workspace', {method:'POST', body:JSON.stringify(payload)}); }
  async function privacyStatus(){ return request('/api/privacy/status'); }
  async function listBackups(){ return request('/api/backups'); }
  async function createBackup(reason){ return request('/api/backups', {method:'POST', body:JSON.stringify({reason:reason || 'manual-ui-backup'})}); }
  async function downloadBackup(id){ return request(`/api/backups/${encodeURIComponent(id)}`); }
  async function restoreBackup(id){ return request(`/api/backups/${encodeURIComponent(id)}/restore`, {method:'POST', body:JSON.stringify({})}); }
  async function pullApp(slug){ return request(`/api/apps/${encodeURIComponent(slug)}`); }
  async function pushApp(slug, records){ return request(`/api/apps/${encodeURIComponent(slug)}/import`, {method:'POST', body:JSON.stringify({records})}); }
  async function upsertRecord(slug, record){ return request(`/api/apps/${encodeURIComponent(slug)}/records`, {method:'POST', body:JSON.stringify({record})}); }
  async function enqueue(task){ return request('/api/queue', {method:'POST', body:JSON.stringify(task)}); }
  async function executeAction(action){ return request('/api/actions/execute', {method:'POST', body:JSON.stringify(action)}); }
  async function audit(){ return request('/api/audit'); }
  async function workspace(next){ if(next) return request('/api/workspace', {method:'PUT', body:JSON.stringify(next)}); return request('/api/workspace'); }
  window.DOCTOR_OPS_API = {state, setBase, health, exportStore, importWorkspace, privacyStatus, listBackups, createBackup, downloadBackup, restoreBackup, pullApp, pushApp, upsertRecord, enqueue, executeAction, audit, workspace};
})();
