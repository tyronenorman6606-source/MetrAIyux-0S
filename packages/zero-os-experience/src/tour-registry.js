export const ZERO_OS_TOUR_REGISTRY_VERSION = 'metraiyux.0s.tour-registry.v1';

export const zeroOsTourRegistry = Object.freeze([
  {
    app_id: 'free99-skyepics',
    route: '/Free99/apps/skyepics/',
    role: 'creator',
    source_path: 'metraiyux_0s_site/Free99/apps/skyepics/src/main.jsx',
    react_surface_markers: ['createRoot', "from 'react'"],
    steps: [
      {
        id: 'vault-front-door',
        target: '#root',
        placement: 'center',
        copy: 'Start by creating or unlocking the encrypted local vault before captures, scans, or backups can become durable receipts.',
        prerequisites: ['shared-0s-gate-session', 'local-vault-present-or-create'],
        completion_receipt_event: 'skyepics.tour.vault-front-door.complete'
      },
      {
        id: 'capture-scan-save',
        target: '[data-tour="capture-scan-save"], .app-shell, main',
        placement: 'bottom',
        copy: 'Capture or import a secret image, run local OCR, verify the extracted text, then save the corrected record into the encrypted vault.',
        prerequisites: ['vault-unlocked'],
        completion_receipt_event: 'skyepics.tour.capture-scan-save.complete'
      },
      {
        id: 'backup-recovery',
        target: '[data-tour="backup-recovery"], main',
        placement: 'top',
        copy: 'Export and verify an encrypted backup so browser-local custody has a recovery path.',
        prerequisites: ['vault-unlocked', 'secret-record-saved'],
        completion_receipt_event: 'skyepics.tour.backup-recovery.complete'
      }
    ]
  },
  {
    app_id: 'client-next-level-gaming-az',
    route: '/client-app-factory/client-apps/next-level-gaming-az/',
    role: 'client',
    source_path: 'metraiyux_0s_site/client-app-factory/client-apps/next-level-gaming-az/assets/app.js',
    react_surface_markers: ['createRoot', 'React.createElement'],
    steps: [
      {
        id: 'event-schedule',
        target: '[data-schedule-board], main',
        placement: 'bottom',
        copy: 'Review the live event schedule before requesting a game, call, or shop handoff.',
        prerequisites: ['public-client-app-rendered'],
        completion_receipt_event: 'client-app.next-level-gaming-az.tour.event-schedule.complete'
      },
      {
        id: 'request-or-call',
        target: '.action-row, .btn.primary, main',
        placement: 'top',
        copy: 'Use the request and call paths as the real customer action lane; telemetry stays local unless the app is wired to a provider receipt.',
        prerequisites: ['event-selected'],
        completion_receipt_event: 'client-app.next-level-gaming-az.tour.request-or-call.complete'
      }
    ]
  },
  {
    app_id: 'client-next-level-gaming-goodyear',
    route: '/client-app-factory/client-apps/next-level-gaming-goodyear/',
    role: 'client',
    source_path: 'metraiyux_0s_site/client-app-factory/client-apps/next-level-gaming-goodyear/assets/app.js',
    react_surface_markers: ['createRoot', 'React.createElement'],
    steps: [
      {
        id: 'store-proof',
        target: 'main, [data-living-background]',
        placement: 'center',
        copy: 'Inspect the shop proof, event rails, and contact paths before treating this generated app as client-ready.',
        prerequisites: ['public-client-app-rendered'],
        completion_receipt_event: 'client-app.next-level-gaming-goodyear.tour.store-proof.complete'
      },
      {
        id: 'workspace-notes',
        target: '[data-workspace-notes], main',
        placement: 'bottom',
        copy: 'Record workspace notes locally and keep provider or CRM mutation claims separate until a backend receipt exists.',
        prerequisites: ['public-client-app-rendered'],
        completion_receipt_event: 'client-app.next-level-gaming-goodyear.tour.workspace-notes.complete'
      }
    ]
  },
  {
    app_id: 'skye-design-lab',
    route: '/MCP/skye-design-lab/',
    role: 'operator',
    source_path: 'MCP/skye-design-lab/src/main.tsx',
    react_surface_markers: ['createRoot', "@react-three/fiber", 'framer-motion'],
    steps: [
      {
        id: 'mcp-catalog',
        target: '#root',
        placement: 'center',
        copy: 'Start with the catalog and target selection so generated worlds stay tied to receipts, archetypes, and proof requirements.',
        prerequisites: ['mcp-catalog-loaded'],
        completion_receipt_event: 'skye-design-lab.tour.catalog.complete'
      },
      {
        id: 'proof-panel',
        target: '[data-tour="proof-panel"], main',
        placement: 'left',
        copy: 'Finish by checking proof outputs and receipts before using the world as production evidence.',
        prerequisites: ['world-plan-created'],
        completion_receipt_event: 'skye-design-lab.tour.proof-panel.complete'
      }
    ]
  }
]);

export function toursForSurface(appId, role = '') {
  return zeroOsTourRegistry.filter((entry) => {
    if (entry.app_id !== appId) return false;
    return !role || entry.role === role;
  });
}

export function stepsForSurface(appId, role = '') {
  return toursForSurface(appId, role).flatMap((entry) => entry.steps || []);
}

export function validateTourRegistry(registry = zeroOsTourRegistry) {
  const failures = [];
  registry.forEach((entry, entryIndex) => {
    const prefix = `entry ${entryIndex} ${entry.app_id || 'missing-app'}`;
    for (const key of ['app_id', 'route', 'role', 'source_path']) {
      if (!entry[key]) failures.push(`${prefix} missing ${key}`);
    }
    if (!Array.isArray(entry.steps) || entry.steps.length === 0) {
      failures.push(`${prefix} missing steps`);
      return;
    }
    entry.steps.forEach((step, stepIndex) => {
      for (const key of ['id', 'target', 'placement', 'copy', 'completion_receipt_event']) {
        if (!step[key]) failures.push(`${prefix} step ${stepIndex} missing ${key}`);
      }
      if (!Array.isArray(step.prerequisites)) failures.push(`${prefix} step ${stepIndex} missing prerequisites array`);
    });
  });
  return {
    ok: failures.length === 0,
    failures,
    count: registry.length,
    step_count: registry.reduce((total, entry) => total + (entry.steps?.length || 0), 0)
  };
}
