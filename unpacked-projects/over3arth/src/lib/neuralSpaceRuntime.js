import { neuralSpaceRuntimeBase } from '../data/neuralSpacePro.js';

const REQUEST_TIMEOUT = 2400;

function runtimeUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const configuredBase = import.meta.env.VITE_NEURALSPACE_RUNTIME_BASE || neuralSpaceRuntimeBase;
  return `${configuredBase}${cleanPath}`;
}

async function requestRuntime(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(runtimeUrl(path), {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {})
      },
      signal: controller.signal
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || `runtime-${response.status}`);
    }
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadNeuralRuntimeSignal() {
  const [healthResult, summaryResult, queueResult, handoffResult, timelineResult] = await Promise.allSettled([
    requestRuntime('/health'),
    requestRuntime('/v1/runtime-summary'),
    requestRuntime('/queue'),
    requestRuntime('/handoff-packs'),
    requestRuntime('/workflow-timeline')
  ]);

  const health = valueFrom(healthResult);
  const runtimeSummary = valueFrom(summaryResult);
  const queue = valueFrom(queueResult);
  const handoffs = valueFrom(handoffResult);
  const timeline = valueFrom(timelineResult);
  const summary = runtimeSummary?.summary || health?.runtimeSummary || {};

  return {
    online: Boolean(health?.ok || runtimeSummary?.ok),
    checkedAt: new Date().toISOString(),
    mode: health?.mode || runtimeSummary?.workerMode || 'local-runtime',
    summary: {
      sessionCount: Number(summary.sessionCount || 0),
      projectCount: Number(summary.projectCount || health?.projectCount || 0),
      queueDepth: Number(queue?.queueDepth ?? summary.queueDepth ?? health?.queueDepth ?? 0),
      handoffPackCount: Number(handoffs?.totalHandoffPacks ?? summary.handoffPackCount ?? health?.handoffPackCount ?? 0),
      messageCountTotal: Number(summary.messageCountTotal || 0),
      timelineTotal: Number(timeline?.summary?.total || health?.workflowTimeline?.total || 0)
    },
    raw: { health, runtimeSummary, queue, handoffs, timeline }
  };
}

export async function archiveNeuralSpaceExchange({ transcript, response, laneId, context }) {
  return requestRuntime('/.netlify/functions/gateway-chat', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: 'over3arth-universe',
      messages: [
        {
          role: 'system',
          content: [
            'Overearth assistant dimension session.',
            `Lane: ${laneId || 'chat'}.`,
            `World: ${context?.worldName || 'Overearth'}.`,
            `Realm: ${context?.realmName || 'Unknown realm'}.`,
            `Gate: ${context?.gateName || 'Unknown gate'}.`
          ].join('\n')
        },
        { role: 'user', content: transcript },
        { role: 'assistant', content: response }
      ]
    })
  });
}

export async function triggerNeuralSpaceBuild({ brief, laneId, context }) {
  return requestRuntime('/build-website', {
    method: 'POST',
    body: JSON.stringify({
      siteName: `${context?.worldName || 'Overearth'} ${laneId || 'Neural'} Build`,
      brief,
      actorId: 'overearth-energy-vessel',
      tenantId: 'over3arth-universe'
    })
  });
}

function valueFrom(result) {
  return result.status === 'fulfilled' ? result.value : null;
}
