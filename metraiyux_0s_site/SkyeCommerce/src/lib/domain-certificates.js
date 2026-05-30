import { executeZeroOsAutomationAction } from '../../../cloudflare/zero-os-automation-spine.mjs';

function text(value = '') { return String(value || '').trim(); }
function safeJson(value, fallback) { if (value && typeof value === 'object') return value; try { return JSON.parse(value || ''); } catch { return fallback; } }

export function buildCloudflareCustomHostnameRequest(domain = {}, options = {}) {
  const hostname = text(domain.hostname || domain.domain || '').toLowerCase();
  const zoneId = text(options.zoneId || '${CLOUDFLARE_ZONE_ID}');
  return {
    provider: 'cloudflare',
    action: 'custom_hostname_create',
    url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`,
    method: 'POST',
    requiredSecrets: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID'],
    body: {
      hostname,
      ssl: {
        method: 'txt',
        type: 'dv',
        settings: { http2: 'on', min_tls_version: '1.2', tls_1_3: 'on' }
      },
      custom_metadata: { merchantId: domain.merchantId || domain.merchant_id || '', domainId: domain.id || '' }
    }
  };
}

export function buildCloudflareCustomHostnameStatusRequest(externalHostnameId = '', options = {}) {
  const zoneId = text(options.zoneId || '${CLOUDFLARE_ZONE_ID}');
  return {
    provider: 'cloudflare',
    action: 'custom_hostname_status',
    url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${encodeURIComponent(text(externalHostnameId))}`,
    method: 'GET',
    requiredSecrets: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID']
  };
}

export function domainCertificateJobRecord(row = {}) {
  return {
    id: row.id || '',
    merchantId: row.merchant_id || row.merchantId || '',
    domainId: row.domain_id || row.domainId || '',
    provider: row.provider || 'cloudflare',
    externalHostnameId: row.external_hostname_id || row.externalHostnameId || '',
    status: row.status || 'pending',
    validationRecords: safeJson(row.validation_records_json || row.validationRecordsJson, []),
    result: safeJson(row.result_json || row.resultJson, {}),
    createdAt: row.created_at || row.createdAt || '',
    updatedAt: row.updated_at || row.updatedAt || ''
  };
}

export function extractCloudflareCertificateResult(data = {}) {
  const result = data.result || data;
  const ssl = result.ssl || {};
  const records = [];
  const pushRecord = (item = {}) => {
    if (!item) return;
    const name = item.txt_name || item.name || item.cname_name || '';
    const value = item.txt_value || item.value || item.cname_target || '';
    if (name || value) records.push({ type: item.type || (item.txt_name ? 'TXT' : 'CNAME'), name, value });
  };
  if (Array.isArray(ssl.validation_records)) ssl.validation_records.forEach(pushRecord);
  pushRecord(ssl.validation_record);
  return {
    externalHostnameId: result.id || '',
    status: ssl.status || result.status || 'pending_validation',
    validationRecords: records,
    raw: data
  };
}


export function buildDnsTxtLookupRequest(recordName = '') {
  const name = text(recordName).replace(/\.$/, '');
  return {
    provider: 'dns',
    action: 'txt_lookup',
    url: `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
    method: 'GET',
    headers: { accept: 'application/dns-json' },
    recordName: name
  };
}

function normalizeTxtValue(value = '') {
  return text(value)
    .replace(/^TXT\s+/i, '')
    .replace(/^"|"$/g, '')
    .replace(/"\s+"/g, '')
    .trim();
}

function extractTxtAnswers(data = {}) {
  const answers = Array.isArray(data.Answer) ? data.Answer : [];
  return answers
    .filter((answer) => String(answer.type || '') === '16' || String(answer.type || '').toUpperCase() === 'TXT')
    .map((answer) => normalizeTxtValue(answer.data || answer.value || ''))
    .filter(Boolean);
}

export async function verifyDnsTxtRecord({ recordName = '', expectedValue = '' } = {}, env = {}, options = {}) {
  const expected = normalizeTxtValue(expectedValue);
  const spec = buildDnsTxtLookupRequest(recordName);
  if (!spec.recordName || !expected) {
    return { verified: false, status: 'invalid_request', recordName: spec.recordName, expectedValue: expected, answers: [], url: spec.url };
  }
  const sandbox = ['SKYECOMMERCE_PROVIDER_RUNTIME_SANDBOX', 'ZERO_OS_PROVIDER_SANDBOX']
    .some((name) => ['1', 'true'].includes(String(env?.[name] || env?.vars?.[name] || '').toLowerCase()));
  const runtime = await executeZeroOsAutomationAction(env, {}, {
    provider_id: 'dns',
    action: 'dns.txt.lookup',
    app_id: 'skyecommerce',
    usage_lane: 'skyecommerce.domain_dns_txt_lookup',
    live: !sandbox,
    sandbox,
    owner_approved: true,
    payload: { record_name: spec.recordName, expected_value: expected }
  }, { actor: 'skyecommerce-provider-runtime', identity: { role: 'system', email: 'skyecommerce@metraiyux.local' } }, { operator_ok: true });
  const receipt = runtime?.response?.receipt || null;
  const result = receipt?.provider_result || {};
  const answers = Array.isArray(result.answers) ? result.answers : [];
  const verified = runtime?.response?.ok === true && answers.some((answer) => normalizeTxtValue(answer) === expected);
  return {
    verified,
    status: verified ? 'verified' : 'pending',
    httpStatus: result.http_status || receipt?.http_status || runtime?.status || 0,
    recordName: spec.recordName,
    expectedValue: expected,
    answers,
    url: spec.url,
    provider_runtime: receipt ? { receipt_id: receipt.id, provider_id: receipt.provider_id, action: receipt.action, provider_call_made: receipt.provider_call_made === true, status: receipt.status || null } : null
  };
}

export async function executeCloudflareCertificateRequest(requestSpec = {}, env = {}, options = {}) {
  const zoneId = env.CLOUDFLARE_ZONE_ID || env.vars?.CLOUDFLARE_ZONE_ID || '';
  const missing = [];
  if (!(env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN || env.vars?.CLOUDFLARE_API_TOKEN || env.vars?.CF_API_TOKEN)) missing.push('CLOUDFLARE_API_TOKEN');
  if (!zoneId) missing.push('CLOUDFLARE_ZONE_ID');
  if (missing.length) {
    const error = new Error(`Missing Cloudflare secret(s): ${missing.join(', ')}`);
    error.code = 'CLOUDFLARE_SECRETS_MISSING';
    error.missing = missing;
    throw error;
  }
  const sandbox = ['SKYECOMMERCE_PROVIDER_RUNTIME_SANDBOX', 'ZERO_OS_PROVIDER_SANDBOX']
    .some((name) => ['1', 'true'].includes(String(env?.[name] || env?.vars?.[name] || '').toLowerCase()));
  const runtimeAction = requestSpec.action === 'custom_hostname_status' ? 'cloudflare.custom_hostname.status' : 'cloudflare.custom_hostname.create';
  const runtime = await executeZeroOsAutomationAction(env, {}, {
    provider_id: 'cloudflare',
    action: runtimeAction,
    app_id: 'skyecommerce',
    usage_lane: `skyecommerce.${runtimeAction}`,
    live: !sandbox,
    sandbox,
    owner_approved: true,
    payload: { zone_id: zoneId, external_hostname_id: requestSpec.externalHostnameId || requestSpec.external_hostname_id || '', body: requestSpec.body || {} }
  }, { actor: 'skyecommerce-provider-runtime', identity: { role: 'system', email: 'skyecommerce@metraiyux.local' } }, { operator_ok: true });
  const receipt = runtime?.response?.receipt || null;
  const result = receipt?.provider_result || {};
  return { provider: 'cloudflare', action: requestSpec.action, status: runtime?.response?.ok ? 'executed' : 'failed', httpStatus: result.http_status || receipt?.http_status || runtime?.status || 0, certificateStatus: result.status || 'pending_validation', externalHostnameId: result.external_hostname_id || result.id || '', validationRecords: result.validation_records || [], raw: result, provider_runtime: receipt ? { receipt_id: receipt.id, provider_id: receipt.provider_id, action: receipt.action, provider_call_made: receipt.provider_call_made === true, status: receipt.status || null } : null };
}
