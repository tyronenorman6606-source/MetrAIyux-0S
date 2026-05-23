const LegalReadiness = (() => {
  const storageKey = 'metraiyuxLegalReadiness.v1';
  const packetKey = 'metraiyuxLegalReadinessPacket.v1';
  const statuses = ['Founder confirmed', 'Evidence attached', 'Counsel review', 'Ready', 'Needs evidence', 'Blocked'];
  const baselineItems = [
    {id:'entity-name', lane:'Registered operating company', status:'Founder confirmed', owner:'Founder', due:'', evidence:'Company registration is confirmed by founder; attach exact legal name and jurisdiction privately for diligence.'},
    {id:'state-filing', lane:'Formation receipt in diligence packet', status:'Founder confirmed', owner:'Founder / counsel', due:'', evidence:'Registered entity is confirmed; store state filing/registration evidence privately, not on public pages.'},
    {id:'ein', lane:'IRS EIN', status:'Founder confirmed', owner:'Founder', due:'', evidence:'EIN is issued; store confirmation privately and do not publish the full EIN.'},
    {id:'operating-agreement', lane:'Operating agreement / signer authority', status:'Counsel review', owner:'Counsel', due:'', evidence:'Attach the current operating agreement or authority resolution; counsel should confirm who can sign commercial agreements.'},
    {id:'brand-ip-stewardship', lane:'Brand and IP stewardship', status:'Counsel review', owner:'Counsel / founder', due:'', evidence:'Keep product names, logos, source assets, and usage records organized for counsel and diligence.'},
    {id:'license-template', lane:'Platform contract template', status:'Counsel review', owner:'Counsel', due:'', evidence:'Counsel-review platform contract draft exists in contracts folder.'},
    {id:'ip-assignment', lane:'IP assignment and confidentiality', status:'Counsel review', owner:'Counsel / ops', due:'', evidence:'Draft exists; signatures and vendor workflow still required.'},
    {id:'legal-skyes-sync', lane:'Legal Skyes policy sync', status:'Needs evidence', owner:'Compliance', due:'', evidence:'Public policy hub exists; sync MetrAIyux-specific contract and IP pages after review.'}
  ];
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let state = load();
  let currentPacket = '';

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return Array.isArray(parsed?.items) ? parsed : {updated_at:null, items:baselineItems};
    } catch {
      return {updated_at:null, items:baselineItems};
    }
  }

  function save() {
    state.updated_at = new Date().toISOString();
    localStorage.setItem(storageKey, JSON.stringify(state, null, 2));
  }

  function renderStatus() {
    const counts = state.items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    const confirmed = counts['Founder confirmed'] || 0;
    const attached = counts['Evidence attached'] || 0;
    const ready = counts.Ready || 0;
    const counsel = counts['Counsel review'] || 0;
    const needsEvidence = counts['Needs evidence'] || 0;
    const blocked = counts.Blocked || 0;
    const labels = [
      `${confirmed + attached + ready} confirmed/attached`,
      `${ready} ready`,
      `${counsel} counsel review`,
      `${needsEvidence} needs evidence`,
      `${blocked} blocked`,
      state.updated_at ? `saved ${new Date(state.updated_at).toLocaleString()}` : 'baseline not saved'
    ];
    $('legalReadinessStatus').innerHTML = labels.map(label => `<span class="status-pill">${esc(label)}</span>`).join('');
  }

  function renderTable() {
    const tbody = $('legalReadinessTable')?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = state.items.map(item => {
      const options = statuses.map(status => `<option${status === item.status ? ' selected' : ''}>${esc(status)}</option>`).join('');
      return `<tr data-id="${esc(item.id)}">
        <td><b>${esc(item.lane)}</b></td>
        <td><select data-field="status">${options}</select></td>
        <td><input data-field="owner" value="${esc(item.owner)}"></td>
        <td><input data-field="due" value="${esc(item.due)}" placeholder="YYYY-MM-DD"></td>
        <td><textarea data-field="evidence">${esc(item.evidence)}</textarea></td>
      </tr>`;
    }).join('');
  }

  function collect() {
    const rows = [...document.querySelectorAll('#legalReadinessTable tbody tr')];
    rows.forEach(row => {
      const item = state.items.find(candidate => candidate.id === row.dataset.id);
      if (!item) return;
      row.querySelectorAll('[data-field]').forEach(field => {
        item[field.dataset.field] = field.value;
      });
    });
  }

  function buildPacket() {
    collect();
    save();
    const fields = {
      entity_name: $('entityNameInput').value.trim() || 'MetrAIyux 0S LLC',
      jurisdiction: $('jurisdictionInput').value.trim() || 'Arizona, United States',
      primary_mark: $('markInput').value.trim() || 'MetrAIyux 0S',
      deal_target: $('dealTargetInput').value.trim() || 'Commercial readiness'
    };
    const lines = [
      '# MetrAIyux Legal Readiness Counsel Packet',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Preferred entity name: ${fields.entity_name}`,
      `Jurisdiction assumption: ${fields.jurisdiction}`,
      `Primary product / system name: ${fields.primary_mark}`,
      `Deal target: ${fields.deal_target}`,
      '',
      '## Boundary',
      '',
      'This packet is an internal legal-operations handoff. It is not legal advice and does not replace counsel review.',
      '',
      '## Readiness Ledger',
      '',
      '| Lane | Status | Owner | Due | Evidence / blocker |',
      '|---|---|---|---|---|',
      ...state.items.map(item => `| ${item.lane} | ${item.status} | ${item.owner || ''} | ${item.due || ''} | ${(item.evidence || '').replace(/\|/g, '/')} |`),
      '',
      '## Official Sources To Use',
      '',
      '- Arizona LLC forms: https://www.azcc.gov/corporations/forms/llc-forms',
      '- IRS EIN information: https://www.irs.gov/ein',
      '',
      '## Requested Counsel Review',
      '',
      '- Confirm entity strategy, operating agreement structure, member/manager authority, signer authority, and tax-professional handoff.',
      '- Review platform contract template, IP assignment template, privacy/security references, and public Legal Skyes policy alignment.',
      '- Identify any missing contract exhibits before MetrAIyux is offered in enterprise or partner channels.'
    ];
    currentPacket = lines.join('\n');
    localStorage.setItem(packetKey, currentPacket);
    $('counselPacketOutput').textContent = currentPacket;
    renderStatus();
  }

  function downloadPacket() {
    if (!currentPacket) currentPacket = localStorage.getItem(packetKey) || '';
    if (!currentPacket) buildPacket();
    const blob = new Blob([currentPacket], {type:'text/markdown'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'metraiyux-legal-readiness-counsel-packet.md';
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  }

  function bind() {
    $('saveLegalReadiness')?.addEventListener('click', () => {
      collect();
      save();
      $('legalSaveResult').textContent = JSON.stringify(state, null, 2);
      renderStatus();
    });
    $('resetLegalReadiness')?.addEventListener('click', () => {
      state = {updated_at:null, items:baselineItems.map(item => ({...item}))};
      save();
      renderTable();
      renderStatus();
      $('legalSaveResult').textContent = 'Baseline restored.';
    });
    $('buildCounselPacket')?.addEventListener('click', buildPacket);
    $('downloadCounselPacket')?.addEventListener('click', downloadPacket);
  }

  function boot() {
    renderTable();
    renderStatus();
    bind();
    $('counselPacketOutput').textContent = localStorage.getItem(packetKey) || 'Build a counsel packet when the ledger is current.';
  }

  return {boot};
})();

document.addEventListener('DOMContentLoaded', () => LegalReadiness.boot());
