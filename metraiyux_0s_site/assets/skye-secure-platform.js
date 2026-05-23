(function () {
  const state = {
    index: null,
    policy: null,
    audit: [],
    matches: []
  };

  const el = {
    indexFile: document.getElementById('indexFile'),
    policyFile: document.getElementById('policyFile'),
    auditFile: document.getElementById('auditFile'),
    loadButton: document.getElementById('loadButton'),
    searchButton: document.getElementById('searchButton'),
    queryInput: document.getElementById('queryInput'),
    typeInput: document.getElementById('typeInput'),
    summary: document.getElementById('summary'),
    objects: document.getElementById('objects'),
    policy: document.getElementById('policy'),
    audit: document.getElementById('audit')
  };

  async function readText(fileInput) {
    const file = fileInput.files?.[0];
    if (!file) return '';
    return file.text();
  }

  async function readJson(fileInput) {
    const text = await readText(fileInput);
    return text ? JSON.parse(text) : null;
  }

  async function readJsonl(fileInput) {
    const text = await readText(fileInput);
    return text
      ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
      : [];
  }

  function metric(label, value) {
    const div = document.createElement('div');
    div.className = 'metric';
    const b = document.createElement('b');
    b.textContent = String(value ?? '');
    const span = document.createElement('span');
    span.textContent = label;
    div.append(b, span);
    return div;
  }

  function pill(text) {
    const span = document.createElement('span');
    span.className = 'platform-pill';
    span.textContent = text;
    return span;
  }

  function allTypes(objects) {
    const types = {};
    for (const item of objects) {
      for (const [type, count] of Object.entries(item.types || {})) types[type] = (types[type] || 0) + count;
    }
    return types;
  }

  function renderSummary() {
    const objects = state.matches.length ? state.matches : state.index?.objects || [];
    const bytes = objects.reduce((sum, item) => sum + Number(item.bytes || 0), 0);
    const types = allTypes(objects);
    el.summary.replaceChildren(
      metric('Vault objects', objects.length),
      metric('Total bytes', bytes),
      metric('Audit events', state.audit.length),
      metric('Types', Object.keys(types).length)
    );
  }

  function renderObjects() {
    const objects = state.matches.length ? state.matches : state.index?.objects || [];
    if (!objects.length) {
      el.objects.innerHTML = '<div class="platform-empty">No encrypted objects match.</div>';
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'platform-table-wrap';
    const table = document.createElement('table');
    table.className = 'platform-table';
    table.innerHTML = '<thead><tr><th>Pack</th><th>Project</th><th>Files</th><th>Types</th><th>Recipients</th><th>Source</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const item of objects) {
      const tr = document.createElement('tr');
      const pack = document.createElement('td');
      pack.textContent = item.packId;
      const project = document.createElement('td');
      project.textContent = [item.clientName, item.projectName, item.repoId].filter(Boolean).join(' / ') || 'unlabeled';
      const files = document.createElement('td');
      files.textContent = `${item.fileCount || 0} files, ${item.plaintextBytes || 0} plaintext bytes`;
      const types = document.createElement('td');
      for (const [type, count] of Object.entries(item.types || {})) types.append(pill(`${type}:${count}`));
      const recipients = document.createElement('td');
      for (const recipient of item.recipients || []) recipients.append(pill(`${recipient.recipientId}:${recipient.type}`));
      const source = document.createElement('td');
      source.textContent = item.source?.originalRoot || item.source?.originalPath || item.source?.kind || '';
      tr.append(pack, project, files, types, recipients, source);
      tbody.append(tr);
    }
    table.append(tbody);
    wrap.append(table);
    el.objects.replaceChildren(wrap);
  }

  function renderPolicy() {
    const subjects = Object.values(state.policy?.subjects || {});
    if (!subjects.length) {
      el.policy.innerHTML = '<div class="platform-empty">No access subjects loaded.</div>';
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'platform-table-wrap';
    const table = document.createElement('table');
    table.className = 'platform-table';
    table.innerHTML = '<thead><tr><th>Subject</th><th>Roles</th><th>Grants</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const subject of subjects) {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = `${subject.displayName || subject.id} (${subject.type || 'user'})`;
      const roles = document.createElement('td');
      for (const role of subject.roles || []) roles.append(pill(role));
      const grants = document.createElement('td');
      for (const grant of subject.grants || []) grants.append(pill(`${grant.role}:${grant.resource}`));
      tr.append(name, roles, grants);
      tbody.append(tr);
    }
    table.append(tbody);
    wrap.append(table);
    el.policy.replaceChildren(wrap);
  }

  function renderAudit() {
    const events = state.audit.slice(-12).reverse();
    if (!events.length) {
      el.audit.innerHTML = '<div class="platform-empty">No audit events loaded.</div>';
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'platform-table-wrap';
    const table = document.createElement('table');
    table.className = 'platform-table';
    table.innerHTML = '<thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Pack</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const event of events) {
      const tr = document.createElement('tr');
      for (const value of [event.recordedAt, event.action, event.actor, event.packId || event.resource || '']) {
        const td = document.createElement('td');
        td.textContent = value || '';
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(tbody);
    wrap.append(table);
    el.audit.replaceChildren(wrap);
  }

  function renderAll() {
    renderSummary();
    renderObjects();
    renderPolicy();
    renderAudit();
  }

  async function loadEvidence() {
    state.index = await readJson(el.indexFile);
    state.policy = await readJson(el.policyFile);
    state.audit = await readJsonl(el.auditFile);
    state.matches = [];
    renderAll();
  }

  function search() {
    const query = el.queryInput.value.trim().toLowerCase();
    const type = el.typeInput.value.trim().toLowerCase();
    const objects = state.index?.objects || [];
    state.matches = objects.filter((item) => {
      const haystack = JSON.stringify({
        packId: item.packId,
        repoId: item.repoId,
        workspaceId: item.workspaceId,
        clientName: item.clientName,
        projectName: item.projectName,
        source: item.source,
        tags: item.tags
      }).toLowerCase();
      const queryOk = !query || haystack.includes(query);
      const typeOk = !type || Object.prototype.hasOwnProperty.call(item.types || {}, type);
      return queryOk && typeOk;
    });
    renderAll();
  }

  el.loadButton.addEventListener('click', () => {
    loadEvidence().catch((error) => {
      el.summary.innerHTML = `<div class="platform-empty">${error.message}</div>`;
    });
  });
  el.searchButton.addEventListener('click', search);
}());
