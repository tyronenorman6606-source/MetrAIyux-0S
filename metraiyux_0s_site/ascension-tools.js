(function(){
  const MINI_APP_VERSION = 'ascension-mini-apps-2026-05-17';
  const LEDGER_KEY = 'ascension:mini-app-ledger';
  const SCORE_LABELS = [
    { min: 82, label: 'Ready for executive handoff' },
    { min: 64, label: 'Operator review' },
    { min: 42, label: 'Needs proof work' },
    { min: 0, label: 'Incomplete record' }
  ];

  const SURFACES = {
    'deal-room': {
      title: 'Deal Room',
      eyebrow: 'Conversion command',
      scoreLabel: 'Close readiness',
      routeLabel: 'Deal route',
      fields: [
        text('recordName', 'Deal name', 'Acme operations cleanup'),
        select('buyerRole', 'Buyer seat', ['Founder / owner', 'Operations lead', 'Procurement', 'Department head', 'Investor / board']),
        select('dealStage', 'Deal stage', ['Discovery', 'Scope shaping', 'Proposal', 'Decision review', 'Contract review', 'Ready for handoff']),
        number('estimatedValue', 'Estimated value', '25000'),
        select('urgency', 'Urgency', ['Low', 'Medium', 'High', 'Critical']),
        select('proofStatus', 'Proof coverage', ['Missing', 'Partial', 'Linked', 'Verified']),
        select('primaryObjection', 'Primary objection', ['No clear pain', 'Budget', 'Timing', 'Trust / proof', 'Authority', 'Scope risk']),
        date('nextAction', 'Next action date'),
        text('owner', 'Owner', 'Celeste Monroe'),
        textarea('notes', 'Deal notes', 'Buyer pain, objection language, proof links, next move.')
      ],
      evaluate(data){
        const stage = points(data.dealStage, {
          'Discovery': 28,
          'Scope shaping': 44,
          'Proposal': 62,
          'Decision review': 74,
          'Contract review': 82,
          'Ready for handoff': 90
        });
        const proof = points(data.proofStatus, { Missing: 0, Partial: 12, Linked: 22, Verified: 30 });
        const urgency = points(data.urgency, { Low: 3, Medium: 8, High: 14, Critical: 18 });
        const objectionPenalty = points(data.primaryObjection, {
          'No clear pain': 18,
          Budget: 9,
          Timing: 8,
          'Trust / proof': 13,
          Authority: 11,
          'Scope risk': 10
        });
        const nextAction = data.nextAction ? 7 : 0;
        const score = clamp(Math.round(stage + proof + urgency + nextAction - objectionPenalty), 0, 100);
        const value = money(numberValue(data.estimatedValue));
        return {
          score,
          status: scoreStatus(score),
          primaryMetric: value,
          secondaryMetric: data.dealStage || 'Discovery',
          route: proof < 22 ? 'Attach proof before the next buyer touch.' : 'Move to scoped next step with owner and date.',
          actions: [
            actionFor(!data.recordName, 'Name the deal so the export can travel.'),
            actionFor(proof < 22, 'Add proof links or mark the claim as unproven.'),
            actionFor(!data.nextAction, 'Set the next buyer action date.'),
            actionFor(data.primaryObjection === 'Authority', 'Route the brief to the economic buyer.'),
            actionFor(data.primaryObjection === 'Trust / proof', 'Send the proof receipt before pricing pressure starts.')
          ],
          summary: `${safe(data.recordName, 'This deal')} is at ${safe(data.dealStage, 'Discovery')} with ${safe(data.proofStatus, 'Missing')} proof coverage. ${value} is the current value signal.`
        };
      }
    },
    'revenue-war-room': {
      title: 'Revenue War Room',
      eyebrow: 'Revenue control',
      scoreLabel: 'Forecast confidence',
      routeLabel: 'Revenue route',
      fields: [
        text('recordName', 'Pipeline period', 'Q2 command lane'),
        number('pipelineValue', 'Open pipeline value', '180000'),
        number('qualifiedDeals', 'Qualified deals', '9'),
        number('stuckDeals', 'Stuck deals', '2'),
        number('averageDealSize', 'Average deal size', '20000'),
        select('followUpLag', 'Follow-up pressure', ['Same day', '1-2 days', '3-5 days', 'More than 5 days']),
        select('proofCoverage', 'Proof coverage', ['Missing', 'Partial', 'Linked', 'Verified']),
        select('topBlocker', 'Top blocker', ['Low activity', 'Unclear offer', 'Weak proof', 'Procurement delay', 'Owner bottleneck', 'No blocker']),
        text('owner', 'Owner', 'Celeste Monroe'),
        textarea('notes', 'Revenue notes', 'Pipeline movement, AE blockers, buyer pressure, follow-up commitments.')
      ],
      evaluate(data){
        const pipeline = numberValue(data.pipelineValue);
        const qualified = numberValue(data.qualifiedDeals);
        const stuck = numberValue(data.stuckDeals);
        const proof = points(data.proofCoverage, { Missing: .18, Partial: .38, Linked: .58, Verified: .72 });
        const lag = points(data.followUpLag, { 'Same day': 18, '1-2 days': 12, '3-5 days': 5, 'More than 5 days': -8 });
        const blockerPenalty = points(data.topBlocker, {
          'Low activity': 12,
          'Unclear offer': 10,
          'Weak proof': 13,
          'Procurement delay': 7,
          'Owner bottleneck': 9,
          'No blocker': 0
        });
        const movement = qualified ? clamp(Math.round(((qualified - stuck) / qualified) * 36), 0, 36) : 0;
        const score = clamp(Math.round(28 + movement + (proof * 34) + lag - blockerPenalty), 0, 100);
        const weighted = money(pipeline * proof);
        return {
          score,
          status: scoreStatus(score),
          primaryMetric: weighted,
          secondaryMetric: `${qualified || 0} qualified`,
          route: data.topBlocker === 'Weak proof' ? 'Move proof receipts into the next AE touch.' : 'Protect follow-up cadence and push stuck deals to owner review.',
          actions: [
            actionFor(!pipeline, 'Enter open pipeline value.'),
            actionFor(stuck > Math.max(1, qualified * .25), 'Review stuck deals with owner.'),
            actionFor(data.followUpLag === 'More than 5 days', 'Repair follow-up cadence today.'),
            actionFor(data.proofCoverage !== 'Verified', 'Increase proof coverage before forecast call.'),
            actionFor(data.topBlocker === 'Unclear offer', 'Rewrite offer fit in buyer language.')
          ],
          summary: `${safe(data.recordName, 'The pipeline')} has ${qualified || 0} qualified deals, ${stuck || 0} stuck deals, and a ${weighted} weighted forecast.`
        };
      }
    },
    'executive-briefing-room': {
      title: 'Executive Briefing Room',
      eyebrow: 'Executive status',
      scoreLabel: 'Briefing readiness',
      routeLabel: 'Brief route',
      fields: [
        text('recordName', 'Brief name', 'Weekly executive status'),
        text('reportingPeriod', 'Reporting period', 'Week of May 18'),
        textarea('wins', 'Wins', 'Completed launches, closed risks, shipped proof.'),
        textarea('risks', 'Risks', 'Open blockers, decisions needed, client exposure.'),
        textarea('decisions', 'Decisions needed', 'Founder or cabinet decisions required this week.'),
        number('blockedLanes', 'Blocked lanes', '1'),
        select('proofCoverage', 'Proof coverage', ['Missing', 'Partial', 'Linked', 'Verified']),
        date('nextReview', 'Next review date'),
        text('owner', 'Owner', 'Gray London Skyes')
      ],
      evaluate(data){
        const complete = ['recordName', 'reportingPeriod', 'wins', 'risks', 'decisions', 'owner'].reduce((sum, key) => sum + (has(data[key]) ? 9 : 0), 0);
        const proof = points(data.proofCoverage, { Missing: 0, Partial: 14, Linked: 24, Verified: 32 });
        const blocked = Math.min(numberValue(data.blockedLanes), 8);
        const review = data.nextReview ? 8 : 0;
        const score = clamp(Math.round(complete + proof + review - (blocked * 4)), 0, 100);
        return {
          score,
          status: scoreStatus(score),
          primaryMetric: `${blocked || 0} blocked`,
          secondaryMetric: data.proofCoverage || 'Missing',
          route: blocked > 2 ? 'Escalate blocked lanes before the weekly review.' : 'Package the briefing for leadership review.',
          actions: [
            actionFor(!has(data.wins), 'Write the wins section.'),
            actionFor(!has(data.risks), 'Write the risk section.'),
            actionFor(!has(data.decisions), 'List decisions needed.'),
            actionFor(data.proofCoverage !== 'Verified', 'Attach proof links to claims.'),
            actionFor(!data.nextReview, 'Set the next review date.')
          ],
          summary: `${safe(data.recordName, 'The brief')} covers ${safe(data.reportingPeriod, 'the current period')} with ${blocked || 0} blocked lanes and ${safe(data.proofCoverage, 'Missing')} proof coverage.`
        };
      }
    },
    'proof-export-center': {
      title: 'Proof Export Center',
      eyebrow: 'Proof control',
      scoreLabel: 'Claim safety',
      routeLabel: 'Proof route',
      fields: [
        text('recordName', 'Receipt name', 'Launch proof receipt'),
        textarea('claim', 'Public or buyer-facing claim', 'The system routes buyer intake into the right operating lane.'),
        url('proofLink', 'Proof link', '../proof/proof-center.html'),
        select('proofType', 'Proof type', ['None', 'Checklist', 'Screenshot', 'Recorded workflow', 'Signed handoff', 'Live URL']),
        select('verification', 'Verification status', ['Unreviewed', 'Operator reviewed', 'QA reviewed', 'Client ready']),
        select('audience', 'Audience', ['Internal', 'Buyer', 'Client', 'Investor', 'Public']),
        select('risk', 'Risk level', ['Low', 'Medium', 'High', 'Do not publish yet']),
        text('owner', 'Owner', 'Victor Saint'),
        textarea('notes', 'Proof notes', 'Evidence, limits, missing checks, export destination.')
      ],
      evaluate(data){
        const proof = points(data.proofType, { None: 0, Checklist: 12, Screenshot: 18, 'Recorded workflow': 28, 'Signed handoff': 24, 'Live URL': 22 });
        const verification = points(data.verification, { Unreviewed: 0, 'Operator reviewed': 16, 'QA reviewed': 28, 'Client ready': 36 });
        const riskPenalty = points(data.risk, { Low: 0, Medium: 8, High: 18, 'Do not publish yet': 36 });
        const link = has(data.proofLink) ? 14 : 0;
        const claim = has(data.claim) ? 12 : 0;
        const score = clamp(Math.round(proof + verification + link + claim + 18 - riskPenalty), 0, 100);
        return {
          score,
          status: data.risk === 'Do not publish yet' ? 'Do not publish yet' : scoreStatus(score),
          primaryMetric: data.proofType || 'None',
          secondaryMetric: data.verification || 'Unreviewed',
          route: score < 64 ? 'Keep this as internal proof until the missing evidence is attached.' : 'Export as client-safe proof receipt.',
          actions: [
            actionFor(!has(data.claim), 'Write the claim being proven.'),
            actionFor(!has(data.proofLink), 'Attach the proof link.'),
            actionFor(data.proofType === 'None', 'Select a real proof type.'),
            actionFor(!/QA reviewed|Client ready/.test(data.verification || ''), 'Run QA review before public use.'),
            actionFor(data.risk === 'Do not publish yet', 'Keep this receipt out of public pages.')
          ],
          summary: `${safe(data.recordName, 'The receipt')} covers a ${safe(data.proofType, 'None')} proof item with ${safe(data.verification, 'Unreviewed')} verification for ${safe(data.audience, 'Internal')} use.`
        };
      }
    },
    'buyer-intelligence-center': {
      title: 'Buyer Intelligence Center',
      eyebrow: 'Buyer mapping',
      scoreLabel: 'Buyer fit',
      routeLabel: 'Buyer route',
      fields: [
        text('recordName', 'Buyer or account', 'Operations buyer profile'),
        select('buyerRole', 'Buyer role', ['Founder / owner', 'Operations director', 'HR director', 'Procurement', 'Government program buyer', 'Department head']),
        textarea('pain', 'Pain signal', 'Manual follow-up, weak proof, scattered intake, slow handoff.'),
        select('authority', 'Authority', ['Unknown', 'Influencer', 'Decision maker', 'Economic buyer']),
        select('urgency', 'Urgency', ['Low', 'Medium', 'High', 'Critical']),
        select('budgetFit', 'Budget fit', ['Unknown', 'Low', 'Medium', 'Strong']),
        select('proofNeed', 'Proof need', ['Capability packet', 'Case study', 'Security brief', 'ROI model', 'Workflow demo']),
        select('procurementPath', 'Procurement path', ['Direct', 'Committee', 'RFP / procurement', 'Government', 'Unknown']),
        textarea('objection', 'Objection language', 'What the buyer will push back on.'),
        text('owner', 'Owner', 'Celeste Monroe')
      ],
      evaluate(data){
        const authority = points(data.authority, { Unknown: 0, Influencer: 10, 'Decision maker': 22, 'Economic buyer': 30 });
        const urgency = points(data.urgency, { Low: 4, Medium: 10, High: 18, Critical: 24 });
        const budget = points(data.budgetFit, { Unknown: 0, Low: 4, Medium: 14, Strong: 24 });
        const pain = has(data.pain) ? 12 : 0;
        const objection = has(data.objection) ? 6 : 0;
        const procurementPenalty = points(data.procurementPath, { Direct: 0, Committee: 5, 'RFP / procurement': 10, Government: 12, Unknown: 8 });
        const score = clamp(Math.round(authority + urgency + budget + pain + objection + 18 - procurementPenalty), 0, 100);
        return {
          score,
          status: scoreStatus(score),
          primaryMetric: data.buyerRole || 'Buyer',
          secondaryMetric: data.proofNeed || 'Capability packet',
          route: data.procurementPath === 'Government' ? 'Use procurement-safe proof and compliance language.' : 'Pair pain language with the proof asset the buyer needs.',
          actions: [
            actionFor(data.authority === 'Unknown', 'Confirm authority before proposal.'),
            actionFor(data.budgetFit === 'Unknown', 'Qualify budget fit.'),
            actionFor(!has(data.pain), 'Capture the pain signal in the buyer words.'),
            actionFor(!has(data.objection), 'Capture the likely objection.'),
            actionFor(data.procurementPath === 'RFP / procurement', 'Prepare procurement-safe capability language.')
          ],
          summary: `${safe(data.recordName, 'This buyer')} maps to ${safe(data.buyerRole, 'a buyer role')} with ${safe(data.urgency, 'Medium')} urgency and ${safe(data.proofNeed, 'Capability packet')} proof need.`
        };
      }
    },
    'public-conversion-system': {
      title: 'Public Conversion System',
      eyebrow: 'Conversion routes',
      scoreLabel: 'Conversion readiness',
      routeLabel: 'Conversion route',
      fields: [
        text('recordName', 'Page or campaign', 'Capability packet route'),
        text('pageOrOffer', 'Offer', 'Executive operations cleanup'),
        select('buyerSegment', 'Buyer segment', ['Founder / owner', 'Enterprise department', 'Government / public sector', 'Staffing buyer', 'Startup founder', 'Local business']),
        select('trafficSource', 'Traffic source', ['Organic search', 'Direct', 'Referral', 'Outbound AE', 'Social', 'Partner']),
        select('conversionGoal', 'Conversion goal', ['Book call', 'Download packet', 'Request demo', 'Submit intake', 'View proof', 'Client login']),
        select('cta', 'Primary CTA', ['Clear', 'Soft', 'Too many CTAs', 'Missing']),
        select('proofPlacement', 'Proof placement', ['None', 'Below fold', 'Near CTA', 'Dedicated proof room']),
        select('formFriction', 'Form friction', ['Low', 'Medium', 'High']),
        select('routingLane', 'Routing lane', ['Sales', 'Client success', 'Government / enterprise', 'Staffing', 'Operator review']),
        textarea('notes', 'Conversion notes', 'Page promise, CTA language, proof asset, routing target.')
      ],
      evaluate(data){
        const cta = points(data.cta, { Clear: 28, Soft: 16, 'Too many CTAs': 6, Missing: 0 });
        const proof = points(data.proofPlacement, { None: 0, 'Below fold': 10, 'Near CTA': 24, 'Dedicated proof room': 28 });
        const friction = points(data.formFriction, { Low: 18, Medium: 10, High: 0 });
        const goal = has(data.conversionGoal) ? 12 : 0;
        const lane = has(data.routingLane) ? 10 : 0;
        const source = has(data.trafficSource) ? 6 : 0;
        const score = clamp(Math.round(cta + proof + friction + goal + lane + source + 8), 0, 100);
        return {
          score,
          status: scoreStatus(score),
          primaryMetric: data.conversionGoal || 'Book call',
          secondaryMetric: data.routingLane || 'Sales',
          route: data.cta === 'Missing' ? 'Add one primary CTA before sending traffic.' : 'Route traffic into the selected lane and attach proof near the CTA.',
          actions: [
            actionFor(data.cta !== 'Clear', 'Simplify the primary CTA.'),
            actionFor(data.proofPlacement === 'None', 'Add proof near the conversion moment.'),
            actionFor(data.formFriction === 'High', 'Reduce form friction.'),
            actionFor(!has(data.routingLane), 'Select a routing lane.'),
            actionFor(!has(data.pageOrOffer), 'Name the offer.')
          ],
          summary: `${safe(data.recordName, 'This conversion route')} sends ${safe(data.buyerSegment, 'buyers')} toward ${safe(data.conversionGoal, 'Book call')} through ${safe(data.routingLane, 'Sales')}.`
        };
      }
    }
  };

  function text(name, label, placeholder){ return { name, label, type: 'text', placeholder }; }
  function url(name, label, placeholder){ return { name, label, type: 'url', placeholder }; }
  function number(name, label, placeholder){ return { name, label, type: 'number', placeholder }; }
  function date(name, label){ return { name, label, type: 'date' }; }
  function textarea(name, label, placeholder){ return { name, label, type: 'textarea', placeholder }; }
  function select(name, label, options){ return { name, label, type: 'select', options }; }

  function has(value){ return String(value || '').trim().length > 0; }
  function safe(value, fallback){ return has(value) ? String(value).trim() : fallback; }
  function numberValue(value){ return Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0; }
  function clamp(value, min, max){ return Math.min(max, Math.max(min, value)); }
  function points(value, map){ return Object.prototype.hasOwnProperty.call(map, value) ? map[value] : 0; }
  function scoreStatus(score){ return SCORE_LABELS.find(item => score >= item.min).label; }
  function actionFor(condition, text){ return condition ? text : null; }
  function money(value){
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
  }
  function escapeHtml(value){
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }
  function slug(value){
    return String(value || 'ascension-record').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ascension-record';
  }
  function recordKey(id){ return `ascension-mini:${id}`; }
  function legacyKey(id){ return `ascension-tool:${id}`; }
  function nowIso(){ return new Date().toISOString(); }

  function readJson(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(_err){
      return fallback;
    }
  }

  function writeDownload(filename, content, type){
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function collect(form){
    return Object.fromEntries(new FormData(form).entries());
  }

  function activeActions(result){
    return result.actions.filter(Boolean);
  }

  function buildMarkdown(config, data, result, surfaceId){
    const actions = activeActions(result);
    const fieldLines = config.fields
      .map(field => `- ${field.label}: ${safe(data[field.name], 'Not set')}`)
      .join('\n');
    const actionLines = actions.length ? actions.map(item => `- ${item}`).join('\n') : '- No immediate blockers.';
    return [
      `# ${config.title} Receipt`,
      '',
      `- Generated: ${nowIso()}`,
      `- Surface: ${surfaceId}`,
      `- Version: ${MINI_APP_VERSION}`,
      `- Score: ${result.score}/100`,
      `- Status: ${result.status}`,
      `- ${config.routeLabel}: ${result.route}`,
      '',
      '## Summary',
      result.summary,
      '',
      '## Fields',
      fieldLines,
      '',
      '## Next Actions',
      actionLines,
      '',
      '## Operator Notes',
      safe(data.notes, 'No notes captured.')
    ].join('\n');
  }

  function buildRecord(surfaceId, config, data, result){
    return {
      id: `ASC-${Date.now()}`,
      version: MINI_APP_VERSION,
      surface: surfaceId,
      title: config.title,
      recordName: safe(data.recordName, config.title),
      savedAt: nowIso(),
      score: result.score,
      status: result.status,
      route: result.route,
      primaryMetric: result.primaryMetric,
      secondaryMetric: result.secondaryMetric,
      data,
      result,
      markdown: buildMarkdown(config, data, result, surfaceId)
    };
  }

  function readLedger(){
    const ledger = readJson(LEDGER_KEY, []);
    return Array.isArray(ledger) ? ledger : [];
  }

  function writeLedger(record){
    const next = [
      record,
      ...readLedger().filter(item => item.surface !== record.surface)
    ].slice(0, 25);
    localStorage.setItem(LEDGER_KEY, JSON.stringify(next, null, 2));
    return next;
  }

  function readSavedRecord(surfaceId){
    const current = readJson(recordKey(surfaceId), null);
    if(current) return current;
    const legacy = readJson(legacyKey(surfaceId), null);
    if(legacy) return { data: legacy };
    return null;
  }

  function fieldHtml(field){
    if(field.type === 'textarea'){
      return `<label class="ascension-field-wide">${field.label}<textarea name="${field.name}" placeholder="${field.placeholder || ''}"></textarea></label>`;
    }
    if(field.type === 'select'){
      return [
        `<label>${field.label}<select name="${field.name}">`,
        field.options.map(option => `<option>${option}</option>`).join(''),
        '</select></label>'
      ].join('');
    }
    return `<label>${field.label}<input name="${field.name}" type="${field.type}" placeholder="${field.placeholder || ''}"></label>`;
  }

  function renderPreview(app, config, data, result, surfaceId){
    const actions = activeActions(result);
    const output = app.querySelector('[data-asc-result]');
    const receipt = buildMarkdown(config, data, result, surfaceId);
    app.querySelectorAll('[data-asc-score]').forEach(el => {
      el.textContent = `${result.score}`;
    });
    app.querySelector('[data-asc-status]').textContent = result.status;
    app.querySelector('[data-asc-primary]').textContent = result.primaryMetric;
    app.querySelector('[data-asc-secondary]').textContent = result.secondaryMetric;
    app.querySelector('[data-asc-route]').textContent = result.route;
    app.querySelector('[data-asc-receipt]').textContent = receipt;
    output.innerHTML = [
      `<h3>${escapeHtml(config.routeLabel)}</h3>`,
      `<p>${escapeHtml(result.summary)}</p>`,
      '<ul>',
      (actions.length ? actions : ['No immediate blockers.']).map(item => `<li>${escapeHtml(item)}</li>`).join(''),
      '</ul>'
    ].join('');
  }

  function restoreForm(form, data){
    Object.entries(data || {}).forEach(([name, value]) => {
      const el = form.elements[name];
      if(el) el.value = value;
    });
  }

  function mountSurface(legacyForm){
    const surfaceId = legacyForm.getAttribute('data-tool');
    const config = SURFACES[surfaceId];
    if(!config){
      mountLegacyTool(legacyForm);
      return;
    }

    const panel = legacyForm.closest('.asc-tool-panel') || legacyForm.parentElement;
    panel.classList.add('ascension-app-panel');
    panel.dataset.ascensionSurface = surfaceId;
    panel.innerHTML = [
      '<div class="ascension-app" data-ascension-mini-app>',
      '  <div class="ascension-app-head">',
      `    <p class="eyebrow">${config.eyebrow}</p>`,
      `    <h2>${config.title}</h2>`,
      '    <div class="ascension-status-strip">',
      `      <span><b data-asc-score>0</b>${config.scoreLabel}</span>`,
      '      <span><b data-asc-primary>Not set</b>Primary metric</span>',
      '      <span><b data-asc-secondary>Not set</b>Current lane</span>',
      '    </div>',
      '  </div>',
      '  <div class="ascension-app-grid">',
      '    <form class="ascension-app-form asc-tool">',
      config.fields.map(fieldHtml).join(''),
      '      <div class="button-row ascension-actions">',
      '        <button type="button" data-asc-save>Save</button>',
      '        <button type="button" data-asc-export-json>Export JSON</button>',
      '        <button type="button" data-asc-export-md>Export MD</button>',
      '        <button type="button" data-asc-copy>Copy receipt</button>',
      '        <button type="button" data-asc-clear>Clear</button>',
      '      </div>',
      '    </form>',
      '    <aside class="ascension-preview">',
      '      <div class="ascension-score-card">',
      `        <span>${config.scoreLabel}</span>`,
      '        <strong data-asc-score>0</strong>',
      '        <small data-asc-status>Incomplete record</small>',
      '      </div>',
      '      <div class="ascension-route-card">',
      '        <span>Route</span>',
      '        <p data-asc-route>Start the record.</p>',
      '      </div>',
      '      <div class="ascension-result" data-asc-result></div>',
      '    </aside>',
      '  </div>',
      '  <pre class="tool-output ascension-receipt" data-asc-receipt></pre>',
      '</div>'
    ].join('');

    const app = panel.querySelector('[data-ascension-mini-app]');
    const form = app.querySelector('form');
    const saved = readSavedRecord(surfaceId);
    if(saved && saved.data) restoreForm(form, saved.data);

    const update = () => {
      const data = collect(form);
      const result = config.evaluate(data);
      renderPreview(app, config, data, result, surfaceId);
      return { data, result };
    };

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    app.querySelector('[data-asc-save]').addEventListener('click', () => {
      const { data, result } = update();
      const record = buildRecord(surfaceId, config, data, result);
      localStorage.setItem(recordKey(surfaceId), JSON.stringify(record, null, 2));
      localStorage.setItem(legacyKey(surfaceId), JSON.stringify(data, null, 2));
      writeLedger(record);
      app.querySelector('[data-asc-receipt]').textContent = `${record.markdown}\n\nSaved locally: ${record.savedAt}`;
      mountHub();
    });
    app.querySelector('[data-asc-export-json]').addEventListener('click', () => {
      const { data, result } = update();
      const record = buildRecord(surfaceId, config, data, result);
      writeDownload(`${slug(record.recordName)}.json`, JSON.stringify(record, null, 2), 'application/json');
    });
    app.querySelector('[data-asc-export-md]').addEventListener('click', () => {
      const { data, result } = update();
      const record = buildRecord(surfaceId, config, data, result);
      writeDownload(`${slug(record.recordName)}.md`, record.markdown, 'text/markdown');
    });
    app.querySelector('[data-asc-copy]').addEventListener('click', async () => {
      const { data, result } = update();
      const receipt = buildMarkdown(config, data, result, surfaceId);
      try{
        await navigator.clipboard.writeText(receipt);
        app.querySelector('[data-asc-receipt]').textContent = `${receipt}\n\nCopied to clipboard.`;
      }catch(_err){
        app.querySelector('[data-asc-receipt]').textContent = receipt;
      }
    });
    app.querySelector('[data-asc-clear]').addEventListener('click', () => {
      localStorage.removeItem(recordKey(surfaceId));
      localStorage.removeItem(legacyKey(surfaceId));
      form.reset();
      update();
      app.querySelector('[data-asc-receipt]').textContent = 'Local Ascension record cleared.';
    });

    update();
  }

  function mountLegacyTool(form){
    const key = legacyKey(form.getAttribute('data-tool') || location.pathname);
    const out = form.querySelector('.tool-output');
    const saved = readJson(key, {});
    restoreForm(form, saved);
    if(out && Object.keys(saved).length) out.textContent = 'Loaded saved Ascension record.';

    form.querySelector('[data-save]')?.addEventListener('click', () => {
      const data = collect(form);
      data.savedAt = nowIso();
      data.page = location.pathname;
      localStorage.setItem(key, JSON.stringify(data, null, 2));
      if(out) out.textContent = `Saved locally.\n${JSON.stringify(data, null, 2)}`;
    });
    form.querySelector('[data-export]')?.addEventListener('click', () => {
      const data = collect(form);
      data.exportedAt = nowIso();
      data.page = location.pathname;
      writeDownload(`${slug(data.recordName || 'ascension-record')}.json`, JSON.stringify(data, null, 2), 'application/json');
      if(out) out.textContent = 'Exported JSON record.';
    });
    form.querySelector('[data-clear]')?.addEventListener('click', () => {
      localStorage.removeItem(key);
      form.reset();
      if(out) out.textContent = 'Cleared local Ascension record.';
    });
  }

  function buildHubCard(surfaceId, config, record){
    const href = `${surfaceId}.html`;
    const score = record ? record.score : 0;
    const status = record ? record.status : 'Not started';
    const metric = record ? record.primaryMetric : config.routeLabel;
    const saved = record ? new Date(record.savedAt).toLocaleString() : 'No local record';
    return [
      `<a class="ascension-hub-card" href="${href}">`,
      `  <span>${escapeHtml(config.eyebrow)}</span>`,
      `  <h3>${escapeHtml(config.title)}</h3>`,
      `  <strong>${score}/100</strong>`,
      `  <p>${escapeHtml(status)}</p>`,
      `  <small>${escapeHtml(metric)} - ${escapeHtml(saved)}</small>`,
      '</a>'
    ].join('');
  }

  function mountHub(){
    const grid = document.querySelector('main .route-grid');
    if(!grid || !location.pathname.includes('/ascension/')) return;
    const records = readLedger();
    const bySurface = Object.fromEntries(records.map(item => [item.surface, item]));
    const average = records.length ? Math.round(records.reduce((sum, item) => sum + (item.score || 0), 0) / records.length) : 0;
    const ready = records.filter(item => (item.score || 0) >= 82).length;
    const needsProof = records.filter(item => /proof|Incomplete|Do not publish/i.test(item.status || '') || (item.score || 0) < 64).length;
    const html = [
      '<section class="section ascension-hub-cockpit ascension-app-panel" data-ascension-hub>',
      '  <div class="ascension-app-head">',
      '    <p class="eyebrow">Ascension app cockpit</p>',
      '    <h2>Local platform records</h2>',
      '    <div class="ascension-status-strip">',
      `      <span><b>${average}</b>Average score</span>`,
      `      <span><b>${ready}</b>Ready rooms</span>`,
      `      <span><b>${needsProof}</b>Needs work</span>`,
      '    </div>',
      '  </div>',
      '  <div class="ascension-hub-grid">',
      Object.entries(SURFACES).map(([surfaceId, config]) => buildHubCard(surfaceId, config, bySurface[surfaceId])).join(''),
      '  </div>',
      '</section>'
    ].join('');
    const existing = document.querySelector('[data-ascension-hub]');
    if(existing){
      existing.outerHTML = html;
    }else{
      grid.closest('.section').before(document.createRange().createContextualFragment(html));
    }
  }

  function boot(){
    document.querySelectorAll('.asc-tool').forEach(mountSurface);
    mountHub();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }else{
    boot();
  }
})();
