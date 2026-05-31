(function(){
  const SUITE = 'doctor_ops_suite';
  const PLATFORM = 'doctor_ops_platform';
  const CURRENT_VERSION = '6.0.0-personal-local-vault-website-core';

  function uid(prefix){
    if(window.crypto && crypto.randomUUID) return `${prefix || 'rec'}_${crypto.randomUUID()}`;
    return (prefix || 'rec') + '_' + Math.random().toString(36).slice(2,10) + '_' + Date.now().toString(36);
  }
  function isoNow(){ return new Date().toISOString(); }
  function formatDate(v){
    if(!v) return '—';
    const d = new Date(v);
    if(isNaN(d.getTime())) return v;
    return d.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});
  }
  function formatDateTime(v){
    if(!v) return '—';
    const d = new Date(v);
    if(isNaN(d.getTime())) return v;
    return d.toLocaleString(undefined, {year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'});
  }
  function daysBetween(a,b){
    const da = new Date(a), db = new Date(b || Date.now());
    if(isNaN(da.getTime()) || isNaN(db.getTime())) return null;
    return Math.floor((db-da)/(1000*60*60*24));
  }
  function esc(s){
    return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }
  function clone(v){ return JSON.parse(JSON.stringify(v ?? null)); }
  function labelize(v){
    return String(v || '').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]+/g,' ').replace(/\b\w/g, m => m.toUpperCase());
  }
  function download(name, text, type){
    const blob = new Blob([text], {type:type || 'text/plain;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 250); a.remove();
  }
  function toCSV(rows){
    if(!rows.length) return '';
    const headers = Array.from(rows.reduce((set,row)=>{ Object.keys(row).forEach(k=>set.add(k)); return set; }, new Set()));
    const q = (v) => {
      const s = Array.isArray(v) || (v && typeof v === 'object') ? JSON.stringify(v) : String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replaceAll('"','""') + '"' : s;
    };
    return [headers.join(','), ...rows.map(r => headers.map(h => q(r[h])).join(','))].join('\n');
  }
  function safeJsonParse(raw, fallback){
    try{ return JSON.parse(raw); }catch(err){ return fallback; }
  }
  function readStorage(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? safeJsonParse(raw, clone(fallback)) : clone(fallback);
    }catch(err){ return clone(fallback); }
  }
  function writeStorage(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function loadState(key, seed){
    const fresh = clone(seed);
    let parsed = readStorage(key, null);
    if(!parsed){ writeStorage(key, fresh); parsed = clone(fresh); }
    if(!Array.isArray(parsed.records)) parsed.records = [];
    if(!Array.isArray(parsed.audit)) parsed.audit = [];
    if(!Array.isArray(parsed.versions)) parsed.versions = [];
    if(!Array.isArray(parsed.receipts)) parsed.receipts = [];
    if(!parsed.meta) parsed.meta = {};
    parsed.meta.coreVersion = CURRENT_VERSION;
    return parsed;
  }
  function saveState(key, state){ writeStorage(key, state); }
  function getField(form, field){
    const el = form.querySelector(`[name="${field.name}"]`);
    if(!el) return '';
    if(field.type === 'checkbox') return !!el.checked;
    return el.value == null ? '' : String(el.value).trim();
  }
  function setField(form, field, value){
    const el = form.querySelector(`[name="${field.name}"]`);
    if(!el) return;
    if(field.type === 'checkbox') el.checked = !!value;
    else el.value = value ?? '';
  }
  function fieldEl(field){
    const wrap = document.createElement('div');
    wrap.className = 'field' + (field.full ? ' full' : '');
    const label = document.createElement('label');
    label.textContent = field.label + (field.required ? ' *' : '');
    wrap.appendChild(label);
    let input;
    if(field.type === 'select'){
      input = document.createElement('select');
      (field.options || []).forEach(opt => {
        const o = document.createElement('option');
        if(typeof opt === 'string'){ o.value = opt; o.textContent = opt; }
        else { o.value = opt.value; o.textContent = opt.label; }
        input.appendChild(o);
      });
    } else if(field.type === 'textarea'){
      input = document.createElement('textarea');
      input.rows = field.rows || 5;
      if(field.placeholder) input.placeholder = field.placeholder;
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
      if(field.placeholder) input.placeholder = field.placeholder;
      if(field.step) input.step = field.step;
    }
    input.name = field.name;
    if(field.required) input.required = true;
    if(field.autocomplete) input.autocomplete = field.autocomplete;
    wrap.appendChild(input);
    if(field.help){ const small = document.createElement('small'); small.textContent = field.help; wrap.appendChild(small); }
    return wrap;
  }
  function badgeTone(value){
    const v = String(value || '').toLowerCase();
    if(/critical|emergent|urgent|major|high|denied|open|needs|overdue|poor|failed|blocked|missing/.test(v)) return 'danger';
    if(/pending|draft|review|submitted|due today|expedited|medium|moderate|waiting|mixed|partial|in-prep/.test(v)) return 'warn';
    if(/approved|completed|closed|stable|ready|final|normal|good|yes|resolved|scheduled/.test(v)) return 'ok';
    return 'info';
  }
  function localBoundary(source){
    const s = String(source || 'browser-local');
    const localApi = /api|file/.test(s);
    return {
      source: localApi ? 'local-file-api' : 'browser-local',
      label: localApi ? 'local file API (local/offline)' : 'local/offline browser',
      liveBridgeReceipt:null
    };
  }
  function recordBoundary(rec){
    if(rec?.boundary?.liveBridgeReceipt || rec?.bridge_receipt || rec?.liveBridgeReceipt) return 'live bridge receipt';
    return rec?.boundary?.label || 'local/offline browser';
  }
  function boundaryBadge(rec){ return `<span class="badge info">${esc(recordBoundary(rec))}</span>`; }
  function storageKey(appId){ return `${SUITE}:${appId}:state`; }
  function workspaceKey(){ return `${PLATFORM}:workspace`; }
  function defaultWorkspace(){
    return {
      id:'default-workspace',
      name:'Doctor Ops Personal Vault',
      operator:'Personal operator',
      upstreamMode:'pass-through',
      createdAt:isoNow(),
      updatedAt:isoNow()
    };
  }
  function readWorkspace(){
    const ws = readStorage(workspaceKey(), defaultWorkspace());
    return {...defaultWorkspace(), ...ws};
  }
  function writeWorkspace(ws){ writeStorage(workspaceKey(), {...readWorkspace(), ...ws, updatedAt:isoNow()}); }
  function readUpstreamClaim(){
    const stored = readStorage(`${PLATFORM}:upstream_claim`, null) || {};
    const q = new URLSearchParams(location.search);
    const claim = {...stored};
    ['workspace','operator','role','org','tenant'].forEach(k => { if(q.get(k)) claim[k] = q.get(k); });
    if(window.UPSTREAM_AUTH_CLAIM && typeof window.UPSTREAM_AUTH_CLAIM === 'object') Object.assign(claim, window.UPSTREAM_AUTH_CLAIM);
    return claim;
  }
  function recordTitleFallback(config, rec){
    if(config.recordTitle) return config.recordTitle(rec);
    return rec.patientName || rec.name || rec.title || rec.id || 'Untitled record';
  }
  function fingerprint(config, rec){
    const dateKey = config.fields.find(f => f.type === 'date')?.name || 'updatedAt';
    return [config.id, rec.patientName || rec.name || recordTitleFallback(config, rec), rec[dateKey] || '', rec[config.statusField || 'status'] || ''].map(v => String(v || '').trim().toLowerCase()).join('|');
  }
  function createReceipt(state, config, action, detail, payload){
    const receipt = {id:uid('rcpt'), at:isoNow(), appId:config.id, appTitle:config.title, action, detail, payload:payload || null, boundary:localBoundary('browser-local')};
    state.receipts.unshift(receipt);
    state.receipts = state.receipts.slice(0,160);
    return receipt;
  }
  function snapshot(state, config, action, before, after){
    const version = {id:uid('ver'), at:isoNow(), appId:config.id, action, before:clone(before), after:clone(after)};
    state.versions.unshift(version);
    state.versions = state.versions.slice(0,80);
    return version;
  }
  function inferOpsSignals(rec){
    const values = Object.entries(rec).map(([k,v]) => `${k}: ${v}`).join(' ').toLowerCase();
    const signals = [];
    if(/critical|emergent|urgent|high|overdue|denied|poor|blocked/.test(values)) signals.push({tone:'danger', label:'Needs operator attention'});
    if(/due today|pending|submitted|waiting|draft|review|mixed|partial/.test(values)) signals.push({tone:'warn', label:'Follow-up path is open'});
    if(/ready|scheduled|approved|stable|closed|completed|final/.test(values)) signals.push({tone:'ok', label:'Closure signal present'});
    if(!signals.length) signals.push({tone:'info', label:'Standard tracking'});
    return signals.slice(0,3);
  }
  function qualityFor(config, rec){
    const required = config.requiredFields || config.fields.filter(f => f.required).map(f => f.name);
    const core = required.length ? required : config.fields.slice(0, Math.min(4, config.fields.length)).map(f => f.name);
    const missing = core.filter(k => !String(rec[k] ?? '').trim());
    const completed = config.fields.filter(f => String(rec[f.name] ?? '').trim()).length;
    return {missing, completed, total:config.fields.length, score:config.fields.length ? Math.round((completed/config.fields.length)*100) : 100};
  }

  function createApp(config){
    const key = storageKey(config.id);
    const compute = typeof config.compute === 'function' ? config.compute : (r => r);
    const seedRecords = clone(config.sampleRecords || []).map(r => compute({...r, id:r.id || uid(config.id), createdAt:r.createdAt || isoNow(), updatedAt:r.updatedAt || isoNow(), boundary:r.boundary || localBoundary('browser-local')}, {daysBetween, formatDate, formatDateTime}));
    const seed = {
      records: seedRecords,
      audit: [{id:uid('audit'), at:isoNow(), message:'Initialized app with synthetic demo records.'}],
      versions: [],
      receipts: [],
      meta:{appId:config.id, appTitle:config.title, coreVersion:CURRENT_VERSION, seededAt:isoNow()}
    };
    const state = loadState(key, seed);
    let selectedId = state.records[0]?.id || null;
    let editingId = null;
    const selected = new Set();

    const form = document.getElementById('record-form');
    const grid = form.querySelector('.form-grid');
    const metricsEl = document.getElementById('metrics');
    const tbody = document.getElementById('records-body');
    const table = tbody.closest('table');
    const theadRow = table?.querySelector('thead tr');
    const detailMeta = document.getElementById('detail-meta');
    const preview = document.getElementById('detail-preview');
    const audit = document.getElementById('audit-list');
    const search = document.getElementById('search');
    const statusFilter = document.getElementById('status-filter');
    const priorityFilter = document.getElementById('priority-filter');

    document.getElementById('app-title').textContent = config.title;
    document.getElementById('app-subtitle').textContent = config.subtitle;
    document.getElementById('app-blurb').textContent = config.blurb;
    document.getElementById('preview-title').textContent = config.previewTitle;
    document.getElementById('record-label').textContent = config.recordLabel;
    document.getElementById('empty-copy').textContent = config.emptyCopy || 'No records yet.';
    document.title = config.title + ' — Doctor Ops Platform';

    config.fields = config.fields.map((field, idx) => ({...field, required: field.required || (idx === 0 && field.type !== 'checkbox')}));
    config.fields.forEach(f => grid.appendChild(fieldEl(f)));

    (config.statusOptions || []).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; statusFilter.appendChild(o); });
    if(config.priorityOptions && config.priorityOptions.length){
      (config.priorityOptions || []).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; priorityFilter.appendChild(o); });
    } else if(priorityFilter?.parentElement) priorityFilter.parentElement.style.display = 'none';

    if(theadRow){
      theadRow.innerHTML = `<th class="select-col"><input type="checkbox" id="select-all-records" aria-label="Select all visible records"></th>` +
        config.columns.map(col => `<th>${esc(col.label || (col.key ? labelize(col.key) : 'Derived'))}</th>`).join('') +
        '<th>Actions</th>';
    }

    const appSection = tbody.closest('section');
    const batchBar = document.createElement('div');
    batchBar.className = 'batch-bar';
    batchBar.innerHTML = `<div><strong id="batch-count">0 selected</strong><span> Batch lane for filtered records.</span></div><div class="toolbar"><select id="batch-status"><option value="">Set status…</option></select><button class="btn ghost" type="button" id="batch-apply">Apply</button><button class="btn ghost" type="button" id="batch-json">Export selected JSON</button><button class="btn ghost" type="button" id="batch-csv">Export selected CSV</button></div>`;
    appSection.insertBefore(batchBar, appSection.querySelector('.table-wrap'));
    (config.statusOptions || []).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; batchBar.querySelector('#batch-status').appendChild(o); });

    const formErrors = document.createElement('div');
    formErrors.id = 'form-errors';
    formErrors.className = 'form-errors';
    form.appendChild(formErrors);

    const sideStack = preview.closest('.stack');
    const opsPanel = document.createElement('section');
    opsPanel.className = 'panel';
    opsPanel.innerHTML = `<div class="section-title"><div><h2>Record operations</h2><p>Data quality, action signals, and restore points for the selected record.</p></div></div><div id="record-ops"></div>`;
    sideStack.insertBefore(opsPanel, sideStack.children[1]);

    const historyPanel = document.createElement('section');
    historyPanel.className = 'panel';
    historyPanel.innerHTML = `<div class="section-title"><div><h2>Version history</h2><p>Restore an earlier saved state when a workflow gets polluted.</p></div></div><div id="version-history" class="audit-list"></div>`;
    sideStack.insertBefore(historyPanel, sideStack.children[2]);

    const syncPanel = document.createElement('section');
    syncPanel.className = 'panel';
    syncPanel.innerHTML = `<div class="section-title"><div><h2>Local file sync bridge</h2><p>Optional local file API persistence. Browser-only mode still works when the local runtime is not started.</p></div></div><div id="runtime-sync" class="sync-panel"><strong>Checking local file API...</strong><span>Run npm run server to enable file-backed local sync.</span></div>`;
    sideStack.insertBefore(syncPanel, sideStack.children[3]);

    const workspaceStrip = document.createElement('div');
    workspaceStrip.className = 'workspace-strip';
    const metricsParent = metricsEl.parentElement;
    metricsParent.appendChild(workspaceStrip);

    function persist(){ saveState(key, state); window.dispatchEvent(new CustomEvent('doctorops:statechanged', {detail:{appId:config.id}})); }
    function log(msg, action, payload){
      state.audit.unshift({id:uid('audit'), at:isoNow(), message:msg});
      state.audit = state.audit.slice(0,160);
      if(action) createReceipt(state, config, action, msg, payload);
      persist(); renderAudit();
    }
    function normalize(raw, isUpdate){
      let rec = {...raw};
      rec.id = raw.id || uid(config.id);
      rec.createdAt = isUpdate ? (raw.createdAt || isoNow()) : (raw.createdAt || isoNow());
      rec.updatedAt = isoNow();
      rec.boundary = raw.boundary || localBoundary(raw._boundarySource || 'browser-local');
      rec._fingerprint = fingerprint(config, rec);
      rec = compute(rec, {daysBetween, formatDate, formatDateTime});
      rec._quality = qualityFor(config, rec);
      rec._signals = inferOpsSignals(rec);
      return rec;
    }
    function fill(rec){ config.fields.forEach(f => setField(form, f, rec?.[f.name])); }
    function clearForm(){ editingId = null; document.getElementById('form-mode').textContent = 'Create'; form.reset(); fill(config.defaultValues || {}); formErrors.textContent = ''; }
    function current(){ return state.records.find(r => r.id === selectedId) || null; }
    function selectedRows(){ return state.records.filter(r => selected.has(r.id)); }
    function filtered(){
      const q = String(search.value || '').toLowerCase().trim();
      const st = statusFilter.value;
      const pr = priorityFilter.value;
      let rows = [...state.records];
      if(q) rows = rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)));
      if(st) rows = rows.filter(r => String(r[config.statusField || 'status'] || '') === st);
      if(pr && config.priorityField) rows = rows.filter(r => String(r[config.priorityField] || '') === pr);
      rows = config.sortRecords ? config.sortRecords(rows, {daysBetween, formatDate, formatDateTime}) : rows.sort((a,b)=> String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return rows;
    }
    function validate(raw){
      const required = config.requiredFields || config.fields.filter(f => f.required).map(f => f.name);
      const missing = required.filter(k => !String(raw[k] ?? '').trim());
      return missing.map(k => config.fields.find(f => f.name === k)?.label || labelize(k));
    }
    function renderWorkspace(){
      const ws = readWorkspace();
      const claim = readUpstreamClaim();
      workspaceStrip.innerHTML = `<strong>${esc(claim.org || ws.name)}</strong><span>Workspace: ${esc(claim.workspace || claim.tenant || ws.id)} · Operator: ${esc(claim.operator || ws.operator)} · Auth: inherited upstream context only</span>`;
    }
    function renderSyncPanel(message){
      const el = document.getElementById('runtime-sync');
      if(!el) return;
      const api = window.DOCTOR_OPS_API;
      const activeRecord = current();
      const selectedText = activeRecord ? `Selected: ${recordTitleFallback(config, activeRecord)}` : 'No record selected';
      el.innerHTML = `<div class="sync-grid"><div class="sync-card"><strong id="sync-health">Local runtime status</strong><span>${esc(message || 'Checking optional local file API bridge...')}</span><small>${esc(selectedText)}</small></div><div class="sync-card"><strong>${esc(state.records.length)}</strong><span>Local/offline records</span><small>Push mirrors browser data to the local file store only.</small></div><div class="sync-card"><strong>${esc(state.receipts.length)}</strong><span>Local/offline receipts</span><small>No live bridge receipt is created here.</small></div></div><div class="action-panel"><strong>Local file sync controls</strong><span>Uses same-origin /api endpoints when npm run server is active. Data stays in the local file vault; no backend telemetry bridge or login is implemented here.</span><div class="toolbar compact"><button class="btn ghost" id="sync-pull-app" type="button">Pull app from local API</button><button class="btn ghost" id="sync-push-app" type="button">Push app to local API</button><button class="btn ghost" id="sync-queue-record" type="button" ${activeRecord ? '' : 'disabled'}>Queue selected review</button><button class="btn ghost" id="sync-action-record" type="button" ${activeRecord ? '' : 'disabled'}>Receipt selected action</button></div></div>`;
      if(!api){ el.querySelector('#sync-health').textContent = 'Browser-only'; return; }
      api.health().then(h => { const s = el.querySelector('#sync-health'); if(s) s.textContent = `Local file API · ${h.version}`; }).catch(err => { const s = el.querySelector('#sync-health'); if(s) s.textContent = `Browser-only · ${err.message}`; });
      el.querySelector('#sync-pull-app').addEventListener('click', async () => {
        try{
          const remote = await api.pullApp(config.id);
          const rows = Array.isArray(remote.records) ? remote.records : [];
          const before = clone(state.records);
          const byId = new Map(state.records.map((r, idx) => [r.id, idx]));
          let created = 0, updated = 0;
          rows.forEach(row => {
            const normalized = normalize({...row, boundary:row.boundary || localBoundary('local-file-api'), _boundarySource:'local-file-api'}, !!row.id);
            if(normalized.id && byId.has(normalized.id)){ state.records[byId.get(normalized.id)] = {...state.records[byId.get(normalized.id)], ...normalized, updatedAt:isoNow()}; updated++; }
            else { state.records.unshift(normalized); created++; }
          });
          snapshot(state, config, 'api-pull-app', before, clone(state.records));
          log(`Pulled ${rows.length} local file API records into ${config.title}: ${created} created, ${updated} updated.`, 'api-pull-app', {rows:rows.length, created, updated, boundary:localBoundary('local-file-api')});
          persist(); renderAll();
        }catch(err){ renderSyncPanel(`Pull failed: ${err.message}`); }
      });
      el.querySelector('#sync-push-app').addEventListener('click', async () => {
        try{ const result = await api.pushApp(config.id, state.records); log(`Pushed ${state.records.length} records to local file API: ${result.created || 0} created, ${result.updated || 0} updated.`, 'api-push-app', {...result, boundary:localBoundary('local-file-api')}); renderSyncPanel('Local file API push completed.'); }
        catch(err){ renderSyncPanel(`Push failed: ${err.message}`); }
      });
      el.querySelector('#sync-queue-record')?.addEventListener('click', async () => {
        const rec = current(); if(!rec) return;
        try{ const result = await api.enqueue({slug:config.id, recordId:rec.id, action:'operator-review', priority:badgeTone(rec[config.statusField || 'status']) === 'danger' ? 'high' : 'normal', notes:`Review ${recordTitleFallback(config, rec)}`}); log(`Queued local file API review task for ${recordTitleFallback(config, rec)}.`, 'api-queue-record', result.task || result); renderSyncPanel('Review queued in local file API.'); }
        catch(err){ renderSyncPanel(`Queue failed: ${err.message}`); }
      });
      el.querySelector('#sync-action-record')?.addEventListener('click', async () => {
        const rec = current(); if(!rec) return;
        try{ const result = await api.executeAction({slug:config.id, recordId:rec.id, action:'operator-reviewed', notes:`Operator reviewed ${recordTitleFallback(config, rec)}`}); log(`Recorded local file API action for ${recordTitleFallback(config, rec)}.`, 'api-action-record', result.action || result); renderSyncPanel('Local/offline action receipt written to local API.'); }
        catch(err){ renderSyncPanel(`Action failed: ${err.message}`); }
      });
    }
    function renderMetrics(){
      metricsEl.innerHTML = '';
      const metricRows = typeof config.metrics === 'function' ? config.metrics(filtered(), {daysBetween, formatDate, formatDateTime}) : [];
      metricRows.forEach(m => {
        const d = document.createElement('div');
        d.className = 'metric ' + (m.tone || 'info');
        d.innerHTML = `<strong>${esc(m.value)}</strong><span>${esc(m.label)}</span>${m.subtext ? `<small>${esc(m.subtext)}</small>` : ''}`;
        metricsEl.appendChild(d);
      });
    }
    function renderBatchBar(){
      batchBar.querySelector('#batch-count').textContent = `${selected.size} selected`;
      const all = document.getElementById('select-all-records');
      const rows = filtered();
      if(all) all.checked = rows.length > 0 && rows.every(r => selected.has(r.id));
    }
    function renderTable(){
      const rows = filtered();
      tbody.innerHTML = '';
      if(!rows.length){
        tbody.innerHTML = `<tr><td colspan="${config.columns.length + 2}"><div class="empty">${esc(config.emptyCopy || 'No matching records.')}</div></td></tr>`;
        renderBatchBar();
        return;
      }
      rows.forEach(rec => {
        const tr = document.createElement('tr');
        if(rec.id === selectedId) tr.classList.add('selected-row');
        tr.addEventListener('click', (e) => { if(e.target.closest('button,input,select,a')) return; selectedId = rec.id; renderAll(); });
        const sel = document.createElement('td');
        sel.className = 'select-col';
        sel.innerHTML = `<input type="checkbox" aria-label="Select ${esc(recordTitleFallback(config, rec))}">`;
        const checkbox = sel.querySelector('input');
        checkbox.checked = selected.has(rec.id);
        checkbox.addEventListener('change', () => { checkbox.checked ? selected.add(rec.id) : selected.delete(rec.id); renderBatchBar(); });
        tr.appendChild(sel);
        config.columns.forEach(col => {
          const td = document.createElement('td');
          let val = typeof col.get === 'function' ? col.get(rec, {daysBetween, formatDate, formatDateTime}) : rec[col.key];
          if(val === undefined || val === null || val === '') val = '—';
          if(col.type === 'date') val = formatDate(val);
          if(col.type === 'datetime') val = formatDateTime(val);
          if(col.badge) td.innerHTML = `<span class="badge ${badgeTone(val)}">${esc(val)}</span>`;
          else td.textContent = String(val);
          tr.appendChild(td);
        });
        const a = document.createElement('td');
        a.innerHTML = `<div class="toolbar compact">${boundaryBadge(rec)}<button class="btn ghost" data-a="edit">Edit</button><button class="btn ghost" data-a="clone">Clone</button><button class="btn ghost" data-a="delete">Delete</button></div>`;
        a.querySelector('[data-a="edit"]').addEventListener('click', () => { editingId = rec.id; document.getElementById('form-mode').textContent = 'Update'; fill(rec); window.scrollTo({top:0, behavior:'smooth'}); });
        a.querySelector('[data-a="clone"]').addEventListener('click', () => {
          const c = normalize({...rec, id:null, createdAt:null, updatedAt:null}, false);
          snapshot(state, config, 'clone', null, c);
          state.records.unshift(c); selectedId = c.id; persist(); log(`Cloned ${config.recordLabel} ${recordTitleFallback(config, c)}.`, 'clone-record', {id:c.id}); renderAll();
        });
        a.querySelector('[data-a="delete"]').addEventListener('click', () => {
          if(!confirm(`Delete ${recordTitleFallback(config, rec)}?`)) return;
          snapshot(state, config, 'delete', rec, null);
          state.records = state.records.filter(r => r.id !== rec.id); selected.delete(rec.id);
          if(selectedId === rec.id) selectedId = state.records[0]?.id || null;
          persist(); log(`Deleted ${config.recordLabel} ${recordTitleFallback(config, rec)}.`, 'delete-record', {id:rec.id}); renderAll();
        });
        tr.appendChild(a); tbody.appendChild(tr);
      });
      renderBatchBar();
    }
    function renderDetail(){
      const rec = current();
      const title = document.getElementById('selected-title');
      if(!rec){ title.textContent = 'No record selected'; detailMeta.innerHTML = `<div class="empty">${esc(config.emptyCopy || 'No records yet.')}</div>`; preview.textContent = ''; return; }
      title.textContent = recordTitleFallback(config, rec);
      detailMeta.innerHTML = `<div class="kv">${config.detailKeys.map(k => {
        const field = config.fields.find(f => f.name === k); const label = field ? field.label : labelize(k); let val = rec[k];
        if(field && field.type === 'date') val = formatDate(val);
        return `<strong>${esc(label)}</strong><span>${esc(val || '—')}</span>`;
      }).join('')}<strong>Source boundary</strong><span>${esc(recordBoundary(rec))}</span><strong>Record ID</strong><span>${esc(rec.id)}</span><strong>Updated</strong><span>${esc(formatDateTime(rec.updatedAt))}</span></div>`;
      preview.textContent = config.preview(rec, {formatDate, formatDateTime, daysBetween});
    }
    function renderOps(){
      const rec = current();
      const el = document.getElementById('record-ops');
      if(!rec){ el.innerHTML = `<div class="empty">Select a record to see quality and action signals.</div>`; return; }
      const quality = qualityFor(config, rec);
      const signals = inferOpsSignals(rec);
      el.innerHTML = `<div class="ops-grid"><div class="ops-card"><strong>${quality.score}%</strong><span>Field completion</span><small>${quality.completed}/${quality.total} configured fields filled</small></div><div class="ops-card"><strong>${quality.missing.length}</strong><span>Core missing fields</span><small>${quality.missing.length ? quality.missing.map(labelize).join(', ') : 'Core data present'}</small></div><div class="ops-card"><strong>${esc(state.versions.filter(v => v.after?.id === rec.id || v.before?.id === rec.id).length)}</strong><span>Restore points</span><small>Saved for this record</small></div></div><div class="signal-row">${boundaryBadge(rec)}${signals.map(s => `<span class="badge ${esc(s.tone)}">${esc(s.label)}</span>`).join('')}</div><div class="toolbar"><button class="btn ghost" id="copy-summary" type="button">Copy summary</button><button class="btn ghost" id="copy-json" type="button">Copy record JSON</button></div>`;
      el.querySelector('#copy-summary').addEventListener('click', async () => { await navigator.clipboard.writeText(config.preview(rec, {formatDate, formatDateTime, daysBetween})); log(`Copied generated summary for ${recordTitleFallback(config, rec)}.`, 'copy-summary', {id:rec.id}); });
      el.querySelector('#copy-json').addEventListener('click', async () => { await navigator.clipboard.writeText(JSON.stringify(rec, null, 2)); log(`Copied JSON for ${recordTitleFallback(config, rec)}.`, 'copy-record-json', {id:rec.id}); });
    }
    function renderVersions(){
      const el = document.getElementById('version-history');
      const rec = current();
      const rows = state.versions.filter(v => !rec || v.after?.id === rec.id || v.before?.id === rec.id).slice(0,12);
      if(!rows.length){ el.innerHTML = `<div class="empty">No version snapshots yet. Create, update, clone, import, batch edit, or delete to generate restore points.</div>`; return; }
      el.innerHTML = '';
      rows.forEach(v => {
        const restoreCandidate = v.before || v.after;
        const d = document.createElement('div');
        d.className = 'audit-item';
        d.innerHTML = `<strong>${esc(labelize(v.action))}</strong><span>${esc(formatDateTime(v.at))}</span><div class="toolbar compact"><button class="btn ghost" type="button">Restore snapshot</button></div>`;
        d.querySelector('button').addEventListener('click', () => {
          if(!restoreCandidate) return;
          const restored = normalize({...restoreCandidate, updatedAt:isoNow()}, true);
          const idx = state.records.findIndex(r => r.id === restored.id);
          snapshot(state, config, 'restore', idx >= 0 ? state.records[idx] : null, restored);
          if(idx >= 0) state.records[idx] = restored; else state.records.unshift(restored);
          selectedId = restored.id; persist(); log(`Restored snapshot for ${recordTitleFallback(config, restored)}.`, 'restore-snapshot', {id:restored.id}); renderAll();
        });
        el.appendChild(d);
      });
    }
    function renderAudit(){
      audit.innerHTML = '';
      state.audit.slice(0,24).forEach(item => { const d = document.createElement('div'); d.className = 'audit-item'; d.innerHTML = `<strong>${esc(item.message)}</strong><span>${esc(formatDateTime(item.at))} · local/offline ledger</span>`; audit.appendChild(d); });
    }
    function renderAll(){ renderWorkspace(); renderMetrics(); renderTable(); renderDetail(); renderOps(); renderVersions(); renderAudit(); renderSyncPanel(); }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = {}; config.fields.forEach(f => raw[f.name] = getField(form, f));
      const missing = validate(raw);
      if(missing.length){ formErrors.innerHTML = `Missing required fields: ${esc(missing.join(', '))}`; return; }
      if(editingId){
        const idx = state.records.findIndex(r => r.id === editingId);
        if(idx >= 0){ const before = clone(state.records[idx]); state.records[idx] = normalize({...state.records[idx], ...raw}, true); snapshot(state, config, 'update', before, state.records[idx]); selectedId = state.records[idx].id; log(`Updated ${config.recordLabel} ${recordTitleFallback(config, state.records[idx])}.`, 'update-record', {id:state.records[idx].id}); }
      } else {
        const rec = normalize(raw, false); snapshot(state, config, 'create', null, rec); state.records.unshift(rec); selectedId = rec.id; log(`Created ${config.recordLabel} ${recordTitleFallback(config, rec)}.`, 'create-record', {id:rec.id});
      }
      persist(); clearForm(); renderAll();
    });

    document.getElementById('reset-form').addEventListener('click', clearForm);
    document.getElementById('export-json').addEventListener('click', () => { download(`${config.id}.json`, JSON.stringify(state, null, 2), 'application/json'); log(`Exported ${config.title} JSON package.`, 'export-json', {count:state.records.length}); });
    document.getElementById('export-csv').addEventListener('click', () => { download(`${config.id}.csv`, toCSV(state.records), 'text/csv;charset=utf-8'); log(`Exported ${config.title} CSV package.`, 'export-csv', {count:state.records.length}); });
    document.getElementById('export-preview').addEventListener('click', () => { const rec = current(); if(!rec) return; const name = `${config.id}-${recordTitleFallback(config, rec).replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.txt`; download(name, config.preview(rec, {formatDate, formatDateTime, daysBetween}), 'text/plain;charset=utf-8'); log(`Exported generated summary for ${recordTitleFallback(config, rec)}.`, 'export-summary', {id:rec.id}); });
    document.getElementById('seed-demo').addEventListener('click', () => { snapshot(state, config, 'restore-demo', clone(state.records), clone(seed.records)); state.records = clone(seed.records); selectedId = state.records[0]?.id || null; selected.clear(); log('Demo records restored.', 'restore-demo', {count:state.records.length}); persist(); clearForm(); renderAll(); });
    document.getElementById('clear-all').addEventListener('click', () => { if(!confirm(`Clear every ${config.recordLabel} record in this app?`)) return; snapshot(state, config, 'clear-all', clone(state.records), []); state.records = []; selectedId = null; selected.clear(); log('All records cleared.', 'clear-all', {}); persist(); clearForm(); renderAll(); });
    document.getElementById('import-file').addEventListener('change', async (e) => {
      const file = e.target.files?.[0]; if(!file) return;
      const text = await file.text();
      try{
        const parsed = JSON.parse(text);
        let rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.records) ? parsed.records : []);
        if(parsed.apps && parsed.apps[config.id]?.records) rows = parsed.apps[config.id].records;
        if(!Array.isArray(rows)) throw new Error('No records array found.');
        const before = clone(state.records);
        const byKey = new Map(state.records.map((r,idx) => [r.id || r._fingerprint || fingerprint(config, r), idx]));
        let created = 0, updated = 0;
        rows.forEach(row => {
          const normalized = normalize(row, !!row.id);
          const candidates = [normalized.id, normalized._fingerprint].filter(Boolean);
          const hitKey = candidates.find(c => byKey.has(c));
          if(hitKey){ state.records[byKey.get(hitKey)] = {...state.records[byKey.get(hitKey)], ...normalized, updatedAt:isoNow()}; updated++; }
          else { state.records.unshift(normalized); byKey.set(normalized.id, 0); created++; }
        });
        selectedId = state.records[0]?.id || null;
        snapshot(state, config, 'import-json', before, clone(state.records));
        log(`Imported ${rows.length} rows into ${config.title}: ${created} created, ${updated} updated.`, 'import-json', {rows:rows.length, created, updated});
        persist(); renderAll();
      }catch(err){ alert('Import failed. Provide a JSON array, { records: [...] }, or a workspace export containing this app.'); }
      finally { e.target.value = ''; }
    });
    document.getElementById('select-all-records')?.addEventListener('change', (e) => { filtered().forEach(r => e.target.checked ? selected.add(r.id) : selected.delete(r.id)); renderAll(); });
    batchBar.querySelector('#batch-apply').addEventListener('click', () => {
      const next = batchBar.querySelector('#batch-status').value; const rows = selectedRows(); if(!next || !rows.length) return;
      const before = clone(state.records);
      rows.forEach(row => { const idx = state.records.findIndex(r => r.id === row.id); if(idx >= 0) state.records[idx] = normalize({...state.records[idx], [config.statusField || 'status']:next}, true); });
      snapshot(state, config, 'batch-status-update', before, clone(state.records));
      log(`Batch-updated ${rows.length} records to ${next}.`, 'batch-status-update', {count:rows.length, status:next});
      persist(); selected.clear(); renderAll();
    });
    batchBar.querySelector('#batch-json').addEventListener('click', () => { const rows = selectedRows(); if(!rows.length) return; download(`${config.id}-selected.json`, JSON.stringify({records:rows}, null, 2), 'application/json'); log(`Exported ${rows.length} selected records as JSON.`, 'batch-export-json', {count:rows.length}); });
    batchBar.querySelector('#batch-csv').addEventListener('click', () => { const rows = selectedRows(); if(!rows.length) return; download(`${config.id}-selected.csv`, toCSV(rows), 'text/csv;charset=utf-8'); log(`Exported ${rows.length} selected records as CSV.`, 'batch-export-csv', {count:rows.length}); });
    [search,statusFilter,priorityFilter].forEach(el => el.addEventListener('input', renderAll));
    clearForm(); renderAll();
  }

  window.DOCTOR_OPS = { createApp, formatDate, formatDateTime, daysBetween, toCSV, esc, clone, uid, storageKey, readWorkspace, writeWorkspace, readUpstreamClaim, labelize, version:CURRENT_VERSION };
})();
