(() => {
  const defaults = {
    siteOperator: '/api/site-operator',
    companyKnowledge: '/api/0s/company-knowledge',
    admin: '/api/admin',
    saas: '/api/saas',
    media: '/api/media',
    sovereigndocs: '/api/sovereigndocs',
    kaixuCodestudio: '/api/kaixu-codestudio',
    routex: '/api/routex',
    skyeroutex: '/api/routex',
    skymusicnexus: '/api/skymusicnexus',
    profit: '/api/profit',
    skyeprofitconsole: '/api/profit',
    houseops: '/api/houseops',
    houseoperations: '/api/houseops',
    agenticGrowth: '/api/agentic-growth',
    agentic_growth: '/api/agentic-growth',
    keyGate13th: '/api/key-gate-13th',
    key_gate_13th: '/api/key-gate-13th',
    marketingMadeEasy: '/api/marketing-made-easy',
    relay13: '/api/relay13',
    crown: '/api/crown',
    nexus: '/api/nexus',
    sentinel: '/api/sentinel',
    omega: '/api/omega'
  };
  const existing = window.METRAIYUX_API_BASES || {};
  const bases = { ...defaults, ...existing };

  function cleanBase(value) {
    return String(value || '').replace(/\/+$/, '');
  }

  function path(appId, apiPath = '') {
    const base = cleanBase(bases[appId]);
    if (!base) return apiPath;
    const raw = String(apiPath || '');
    if (!raw) return base;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw === base || raw.startsWith(`${base}/`)) return raw;
    if (raw.startsWith('/api/')) return `${base}${raw.slice('/api'.length)}`;
    return `${base}/${raw.replace(/^\/+/, '')}`;
  }

  window.METRAIYUX_API_BASES = bases;
  window.MetrAIyuxApi = { bases, path };
})();
