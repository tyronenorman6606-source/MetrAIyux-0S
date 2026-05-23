function text(value = '', max = 1200) {
  return String(value || '').trim().slice(0, max);
}

function array(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function unique(value) {
  return [...new Set(array(value).map((item) => String(item || '').trim()).filter(Boolean))];
}

function clientNiche(record = {}) {
  const haystack = [
    record.displayName,
    record.industry,
    ...(record.services || []),
    ...(record.sourceUrls || [])
  ].join(' ').toLowerCase();

  if (/(trading card|tcg|card shop|pokemon|magic|yu-gi-oh|yugioh|gaming|party rental|tabletop)/i.test(haystack)) {
    return {
      id: 'trading-card',
      label: 'Trading Card / Community Retail',
      priorities: [
        'Use real store visuals, event cadence, and inventory language instead of generic retail copy.',
        'Keep TCG storefront links, tournament CTAs, and party-booking lanes clean and verified.',
        'Favor high-energy collectible presentation over sterile dashboard blocks.'
      ]
    };
  }

  if (/(pallet|logistics|yard|freight|warehouse|industrial|manufactur|recycling|shipping)/i.test(haystack)) {
    return {
      id: 'industrial-ops',
      label: 'Industrial Operations',
      priorities: [
        'Lead with operational trust, same-day response, and service radius clarity.',
        'Keep quote, dispatch, and yard capability obvious above the fold.',
        'Use dense proof and capability modules rather than lifestyle marketing.'
      ]
    };
  }

  if (/(film|photo|video|production|creative|cinema|studio|director|photography)/i.test(haystack)) {
    return {
      id: 'creative-studio',
      label: 'Creative Studio',
      priorities: [
        'Hero media needs to feel cinematic and portfolio-grade from the client’s real work.',
        'Use project, reel, and booking surfaces instead of business-dashboard language.',
        'Position the app as a client-facing portfolio plus booking lane.'
      ]
    };
  }

  if (/(barber|barbershop|salon|stylist|beauty|fade|cut|grooming)/i.test(haystack)) {
    return {
      id: 'service-beauty',
      label: 'Appointment Service',
      priorities: [
        'Lead with booking, gallery proof, and trust markers.',
        'Keep local SEO, hours, and direct-contact lanes obvious.',
        'Use modern lifestyle polish instead of enterprise operator wording.'
      ]
    };
  }

  return {
    id: 'general-service',
    label: 'General Service Business',
    priorities: [
      'Clarify offer, proof, local market, and next-step CTA fast.',
      'Reduce generic template language and push the client’s real identity forward.',
      'Keep the generated app feeling buyer-ready, not operator-only.'
    ]
  };
}

function collectIssues(record = {}, reports = {}) {
  const issues = [];
  const verification = reports.verification || reports.verified || {};
  const scan = reports.scan || {};
  const clientId = record.clientId || 'client';

  const routeProblems = array(verification.issues).slice(0, 8);
  for (const issue of routeProblems) {
    issues.push({
      kind: 'verification',
      severity: issue.severity || 'warn',
      title: issue.title || issue.code || 'Verification issue',
      detail: issue.detail || issue.message || issue.path || 'Factory verification flagged an issue.',
      source: `/api/client-app-factory/factory/reports/${clientId}/verification.json`
    });
  }

  if (!record.sourceUrls?.[0]) {
    issues.push({
      kind: 'source',
      severity: 'warn',
      title: 'Live surface is missing',
      detail: 'The client record has no live source URL, so media harvesting and client-specific tone will stay weak.',
      source: 'client-record'
    });
  }

  if (!record.logoAssets?.length) {
    issues.push({
      kind: 'branding',
      severity: 'warn',
      title: 'Brand logo asset is missing',
      detail: 'The generated app still needs a real brand mark or a harvested logo before it feels bespoke.',
      source: 'client-record'
    });
  }

  if (!record.mediaAssets?.length) {
    issues.push({
      kind: 'media',
      severity: 'warn',
      title: 'Live media is thin',
      detail: 'No media assets are attached yet, so the app will fall back to generic presentation unless we harvest or upload proof media.',
      source: 'client-record'
    });
  }

  if (!record.generatedApps?.length) {
    issues.push({
      kind: 'build',
      severity: 'critical',
      title: 'No generated app package exists',
      detail: 'Core has not produced a package yet, so there is nothing trustworthy to preview or prove.',
      source: 'factory-core'
    });
  }

  if (!scan?.ok && scan?.completionGate) {
    const failedGate = Object.entries(scan.completionGate).find(([, ok]) => ok === false);
    if (failedGate) {
      issues.push({
        kind: 'proof',
        severity: 'warn',
        title: `Completion gate missing: ${failedGate[0]}`,
        detail: 'The scanner still sees a release gate that lacks proof.',
        source: `/api/client-app-factory/factory/reports/${clientId}/scan.json`
      });
    }
  }

  return issues.slice(0, 8);
}

function buildActions(record = {}, reports = {}, room = 'overview') {
  const actions = [];
  const clientId = record.clientId || 'client';

  actions.push({
    label: 'Open generated app',
    room: 'overview',
    href: `/client-app-factory/generated/${clientId}/index.html`,
    reason: 'See the real runtime surface instead of the record shell.'
  });

  if (!record.sourceUrls?.[0]) {
    actions.push({
      label: 'Fix live surface URL',
      room: 'intake',
      reason: 'Without a live surface, the factory cannot harvest real client identity.'
    });
  }

  if (!record.logoAssets?.length || !record.mediaAssets?.length) {
    actions.push({
      label: 'Run enhance again',
      room: 'builder',
      command: 'enhance',
      reason: 'Enhance should harvest logo/media or generate a better fallback pack.'
    });
  }

  if ((reports.verification?.issueCount || 0) > 0) {
    actions.push({
      label: 'Review proof issues',
      room: 'proof',
      href: `/api/client-app-factory/factory/reports/${clientId}/verification.json`,
      reason: 'Verification still has flagged issues that should be resolved before shipping.'
    });
  }

  if (!array(record.completedStates).includes('workspace-linked')) {
    actions.push({
      label: 'Link workspace',
      room: 'workspace',
      reason: 'The client preview lane should be provisioned before handoff.'
    });
  }

  if (!array(record.completedStates).includes('payment-lane-linked')) {
    actions.push({
      label: 'Check SkyePay lane',
      room: 'skyepay',
      reason: 'Continuation should stay attached to the client package instead of becoming a later manual chore.'
    });
  }

  if (room !== 'auren') {
    actions.push({
      label: 'Stay with Auren',
      room: 'auren',
      reason: 'Keep the client context, issues, and next actions in one lane while we debug.'
    });
  }

  return actions.slice(0, 6);
}

function buildContext(record = {}, reports = {}, room = 'overview') {
  const niche = clientNiche(record);
  const primaryContact = array(record.contacts)[0] || {};
  const primaryLocation = array(record.locations)[0] || {};
  const generatedApp = array(record.generatedApps)[0] || {};
  const verification = reports.verification || reports.verified || {};
  const scan = reports.scan || {};
  return {
    clientId: record.clientId || 'client',
    displayName: record.displayName || 'Client App',
    industry: record.industry || niche.label,
    niche: niche.label,
    room,
    status: record.status || 'intake-created',
    liveSurface: record.sourceUrls?.[0] || record.brandProfile?.publicUrl || '',
    city: primaryLocation.city || '',
    state: primaryLocation.state || '',
    contact: {
      name: primaryContact.name || '',
      phone: primaryContact.phone || '',
      email: primaryContact.email || ''
    },
    previewCode: record.previewConfig?.accessCode || '',
    generatedRoute: generatedApp.publicBasePath ? `/client-app-factory/generated/${record.clientId}/index.html` : '',
    routeCount: array(record.publicRoutes).length + array(record.privateRoutes).length,
    verificationOk: verification.ok ?? null,
    verificationIssues: verification.issueCount ?? array(verification.issues).length,
    scanOk: scan.ok ?? null,
    priorities: niche.priorities
  };
}

function deterministicReply(message = '', record = {}, reports = {}, room = 'overview') {
  const context = buildContext(record, reports, room);
  const issues = collectIssues(record, reports);
  const actions = buildActions(record, reports, room);
  const intent = String(message || '').toLowerCase();
  const opener = `I’m looking at ${context.displayName} in ${room}.`;
  const location = [context.city, context.state].filter(Boolean).join(', ');
  let focus = `The main job is to turn this into a buyer-ready ${context.niche.toLowerCase()} app without losing the workspace, proof, and continuation lanes.`;

  if (/fix|broken|issue|error|404|500|bug|problem/.test(intent)) {
    focus = issues.length
      ? `The sharpest problems right now are ${issues.slice(0, 2).map((issue) => issue.title.toLowerCase()).join(' and ')}.`
      : 'The current reports are green, so the next move is refinement rather than emergency repair.';
  } else if (/design|ui|hero|video|media|beautiful|polish/.test(intent)) {
    focus = `${context.displayName} should lean into ${context.niche.toLowerCase()} signals. ${context.priorities[0]}`;
  } else if (/next|what now|do next|priority/.test(intent)) {
    focus = actions.length
      ? `The most useful next move is ${actions[0].label.toLowerCase()}. ${actions[0].reason}`
      : 'The record is unusually clean, so I would move into final proof and deployment.';
  } else if (/workspace|preview|tester|code/.test(intent)) {
    focus = context.previewCode
      ? `The preview lane is anchored to code ${context.previewCode}. We should keep that visible while we polish the client-facing app.`
      : 'The preview/workspace lane still needs to be attached before this is really handoff-ready.';
  }

  const proofLine = context.verificationOk === false
    ? `Verification is still red with ${context.verificationIssues} issue${context.verificationIssues === 1 ? '' : 's'}.`
    : context.verificationOk === true
      ? 'Verification is green right now.'
      : 'Verification has not fully reported back yet.';

  const issueLine = issues.length
    ? `Top issue: ${issues[0].title}. ${issues[0].detail}`
    : 'No obvious blocking issue is surfaced in the current record snapshot.';

  const locationLine = location ? `This client is anchored in ${location}.` : '';

  const reply = [opener, locationLine, focus, proofLine, issueLine]
    .filter(Boolean)
    .join(' ');

  return {
    ok: true,
    assistant: 'Auren',
    engine: 'deterministic-factory-operator',
    reply,
    context,
    issues,
    actions,
    prompts: [
      `What would make ${context.displayName} feel more bespoke?`,
      `What should we fix before we ship ${context.displayName}?`,
      `How should this ${context.niche.toLowerCase()} app look and convert?`
    ]
  };
}

async function maybeCallOpenAI({ message = '', record = {}, reports = {}, room = 'overview', env = {}, allowLiveAi = false } = {}) {
  if (!allowLiveAi) return null;
  const apiKey = env.OPENAI_API_KEY || env.openaiApiKey || '';
  const disable = String(env.VANTA_DISABLE_LIVE_AI ?? env.disableLiveAi ?? '0') === '1';
  const allow = String(env.VANTA_ALLOW_LIVE_AI ?? env.allowLiveAi ?? '0') === '1' || Boolean(env.forceLiveAi);
  if (!apiKey || disable || !allow) return null;

  const baseUrl = String(env.OPENAI_BASE_URL || env.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = String(env.OPENAI_MODEL || env.openaiModel || 'gpt-4.1-mini');
  const draft = deterministicReply(message, record, reports, room);
  const system = [
    'You are Auren, the embedded operator assistant inside the 0S Client App Factory.',
    'You help turn imported Valley clients into polished client apps.',
    'Be concise, practical, and grounded in the supplied record and reports.',
    'Return strict JSON with keys: reply, issues, actions.',
    'issues must be an array of up to 5 objects with title and detail.',
    'actions must be an array of up to 5 objects with label, room, and reason.'
  ].join(' ');

  const user = {
    room,
    message,
    draft,
    record: buildContext(record, reports, room),
    currentIssues: collectIssues(record, reports)
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text().catch(() => '');
    throw new Error(`OpenAI ${response.status}: ${error || response.statusText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);
  return {
    ok: true,
    assistant: 'Auren',
    engine: `openai:${model}`,
    reply: text(parsed.reply, 2800) || draft.reply,
    context: draft.context,
    issues: array(parsed.issues).map((issue) => ({
      title: text(issue.title, 160),
      detail: text(issue.detail, 500),
      severity: text(issue.severity || 'warn', 40)
    })).filter((issue) => issue.title),
    actions: array(parsed.actions).map((action) => ({
      label: text(action.label, 120),
      room: text(action.room, 40),
      reason: text(action.reason, 240),
      href: text(action.href, 300),
      command: text(action.command, 40)
    })).filter((action) => action.label),
    prompts: draft.prompts
  };
}

export async function generateFactoryAurenReply({
  message = '',
  record = {},
  reports = {},
  room = 'overview',
  env = {},
  allowLiveAi = false
} = {}) {
  const draft = deterministicReply(message, record, reports, room);
  try {
    const live = await maybeCallOpenAI({ message, record, reports, room, env, allowLiveAi });
    return live || draft;
  } catch (error) {
    return {
      ...draft,
      engine: `${draft.engine}+fallback`,
      note: text(error.message, 320)
    };
  }
}

export function factoryAurenContext(record = {}, reports = {}, room = 'overview') {
  return {
    context: buildContext(record, reports, room),
    issues: collectIssues(record, reports),
    actions: buildActions(record, reports, room)
  };
}
