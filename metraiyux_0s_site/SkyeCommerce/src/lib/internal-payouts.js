import { dbAll, dbFirst, dbRun, uid } from './utils.js';

const METHOD_TYPES = new Set(['paypal', 'cashapp', 'venmo', 'zelle', 'ach_manual', 'check', 'other']);
const AGREEMENT_STATUSES = new Set(['not_started', 'sent', 'signed', 'approved', 'blocked']);
const TAX_STATUSES = new Set(['not_started', 'requested', 'received', 'approved', 'blocked']);
const PAYOUT_STATUSES = new Set(['not_ready', 'ready', 'hold']);
const DISBURSEMENT_STATUSES = new Set(['queued', 'ready', 'sent', 'paid', 'failed', 'hold', 'cancelled']);

function text(value = '', max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function int(value = 0, fallback = 0) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === '1' || value === 1;
}

function asJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
}

function pick(value, allowed, fallback) {
  const normalized = text(value, 80).toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

export function payoutProfileRecord(row = {}, methods = []) {
  if (!row) return null;
  const activeMethods = Array.isArray(methods) ? methods.filter((item) => item.active) : [];
  const hasActiveMethod = Boolean(activeMethods.length);
  const agreementReady = ['signed', 'approved'].includes(row.agreement_status || '');
  const taxReady = !['blocked'].includes(row.tax_profile_status || '');
  const ready = row.payout_status === 'ready' && agreementReady && taxReady && hasActiveMethod;
  return {
    id: row.id || '',
    merchantId: row.merchant_id || '',
    legalName: row.legal_name || '',
    businessName: row.business_name || '',
    agreementStatus: row.agreement_status || 'not_started',
    agreementReference: row.agreement_reference || '',
    taxProfileStatus: row.tax_profile_status || 'not_started',
    payoutStatus: row.payout_status || 'not_ready',
    primaryMethodId: row.primary_method_id || '',
    notes: row.notes || '',
    ready,
    blockers: [
      agreementReady ? '' : 'independent_contractor_agreement_not_signed',
      taxReady ? '' : 'tax_profile_blocked',
      hasActiveMethod ? '' : 'no_active_payout_method',
      row.payout_status === 'hold' ? 'payout_profile_on_hold' : ''
    ].filter(Boolean),
    methods,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || ''
  };
}

export function payoutMethodRecord(row = {}) {
  if (!row) return null;
  return {
    id: row.id || '',
    merchantId: row.merchant_id || '',
    profileId: row.profile_id || '',
    type: row.type || 'paypal',
    label: row.label || '',
    handle: row.handle || '',
    email: row.email || '',
    phoneLast4: row.phone_last4 || '',
    accountLast4: row.account_last4 || '',
    routingLast4: row.routing_last4 || '',
    instructions: asJson(row.instructions_json || '{}', {}),
    verified: Boolean(Number(row.verified || 0)),
    active: Boolean(Number(row.active ?? 1)),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || ''
  };
}

export function payoutDisbursementRecord(row = {}) {
  if (!row) return null;
  return {
    id: row.id || '',
    merchantId: row.merchant_id || '',
    ledgerId: row.ledger_id || '',
    methodId: row.method_id || '',
    provider: row.provider || 'internal_skyepay',
    amountCents: Number(row.amount_cents || 0),
    currency: text(row.currency || 'USD', 12).toUpperCase(),
    status: row.status || 'queued',
    externalReference: row.external_reference || '',
    operatorNote: row.operator_note || '',
    providerPayload: asJson(row.provider_payload_json || '{}', {}),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    paidAt: row.paid_at || ''
  };
}

export function normalizePayoutProfileInput(body = {}, existing = {}) {
  return {
    legalName: text(body.legalName || body.legal_name || existing.legalName || existing.legal_name || '', 180),
    businessName: text(body.businessName || body.business_name || existing.businessName || existing.business_name || '', 180),
    agreementStatus: pick(body.agreementStatus || body.agreement_status || existing.agreementStatus || existing.agreement_status, AGREEMENT_STATUSES, 'not_started'),
    agreementReference: text(body.agreementReference || body.agreement_reference || existing.agreementReference || existing.agreement_reference || '', 300),
    taxProfileStatus: pick(body.taxProfileStatus || body.tax_profile_status || existing.taxProfileStatus || existing.tax_profile_status, TAX_STATUSES, 'not_started'),
    payoutStatus: pick(body.payoutStatus || body.payout_status || existing.payoutStatus || existing.payout_status, PAYOUT_STATUSES, 'not_ready'),
    primaryMethodId: text(body.primaryMethodId || body.primary_method_id || existing.primaryMethodId || existing.primary_method_id || '', 120),
    notes: text(body.notes || existing.notes || '', 1000)
  };
}

export function normalizePayoutMethodInput(body = {}, existing = {}) {
  return {
    type: pick(body.type || existing.type, METHOD_TYPES, 'paypal'),
    label: text(body.label || existing.label || '', 120),
    handle: text(body.handle || existing.handle || '', 180),
    email: text(body.email || existing.email || '', 254).toLowerCase(),
    phoneLast4: text(body.phoneLast4 || body.phone_last4 || existing.phoneLast4 || existing.phone_last4 || '', 4),
    accountLast4: text(body.accountLast4 || body.account_last4 || existing.accountLast4 || existing.account_last4 || '', 4),
    routingLast4: text(body.routingLast4 || body.routing_last4 || existing.routingLast4 || existing.routing_last4 || '', 4),
    instructions: asJson(body.instructions || body.instructions_json || existing.instructions || existing.instructions_json || {}, {}),
    verified: bool(body.verified, Boolean(existing.verified)),
    active: bool(body.active, existing.active === undefined ? true : Boolean(existing.active))
  };
}

export function normalizeDisbursementInput(body = {}) {
  return {
    methodId: text(body.methodId || body.method_id || '', 120),
    provider: text(body.provider || 'internal_skyepay', 80),
    status: pick(body.status || 'queued', DISBURSEMENT_STATUSES, 'queued'),
    externalReference: text(body.externalReference || body.external_reference || body.payoutReference || body.payout_reference || '', 300),
    operatorNote: text(body.operatorNote || body.operator_note || body.note || '', 1000),
    providerPayload: asJson(body.providerPayload || body.provider_payload || {}, {})
  };
}

export async function listMerchantPayoutMethods(env = {}, merchantId = '') {
  const rows = await dbAll(env, `SELECT * FROM merchant_payout_methods WHERE merchant_id = ? ORDER BY active DESC, created_at DESC`, [merchantId]);
  return rows.map(payoutMethodRecord);
}

export async function getMerchantPayoutProfile(env = {}, merchantId = '') {
  const row = await dbFirst(env, `SELECT * FROM merchant_payout_profiles WHERE merchant_id = ? LIMIT 1`, [merchantId]);
  const methods = await listMerchantPayoutMethods(env, merchantId);
  return payoutProfileRecord(row || { merchant_id: merchantId }, methods);
}

export async function upsertMerchantPayoutProfile(env = {}, merchantId = '', body = {}) {
  const existing = await dbFirst(env, `SELECT * FROM merchant_payout_profiles WHERE merchant_id = ? LIMIT 1`, [merchantId]);
  const payload = normalizePayoutProfileInput(body, existing || {});
  const id = existing?.id || uid('mppr');
  await dbRun(env, `
    INSERT INTO merchant_payout_profiles (
      id, merchant_id, legal_name, business_name, agreement_status, agreement_reference,
      tax_profile_status, payout_status, primary_method_id, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(merchant_id) DO UPDATE SET
      legal_name = excluded.legal_name,
      business_name = excluded.business_name,
      agreement_status = excluded.agreement_status,
      agreement_reference = excluded.agreement_reference,
      tax_profile_status = excluded.tax_profile_status,
      payout_status = excluded.payout_status,
      primary_method_id = excluded.primary_method_id,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `, [id, merchantId, payload.legalName, payload.businessName, payload.agreementStatus, payload.agreementReference, payload.taxProfileStatus, payload.payoutStatus, payload.primaryMethodId, payload.notes]);
  return getMerchantPayoutProfile(env, merchantId);
}

export async function createMerchantPayoutMethod(env = {}, merchantId = '', body = {}) {
  const profile = await upsertMerchantPayoutProfile(env, merchantId, {});
  const payload = normalizePayoutMethodInput(body, {});
  if (!payload.handle && !payload.email && !payload.accountLast4 && !payload.phoneLast4) {
    const error = new Error('A payout handle, email, phone last4, or account last4 is required.');
    error.status = 400;
    throw error;
  }
  const id = uid('mpm');
  await dbRun(env, `
    INSERT INTO merchant_payout_methods (
      id, merchant_id, profile_id, type, label, handle, email, phone_last4,
      account_last4, routing_last4, instructions_json, verified, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, merchantId, profile.id || '', payload.type, payload.label, payload.handle, payload.email, payload.phoneLast4, payload.accountLast4, payload.routingLast4, JSON.stringify(payload.instructions), payload.verified ? 1 : 0, payload.active ? 1 : 0]);
  if (!profile.primaryMethodId) {
    await dbRun(env, `UPDATE merchant_payout_profiles SET primary_method_id = ?, updated_at = CURRENT_TIMESTAMP WHERE merchant_id = ?`, [id, merchantId]);
  }
  return payoutMethodRecord(await dbFirst(env, `SELECT * FROM merchant_payout_methods WHERE id = ? AND merchant_id = ? LIMIT 1`, [id, merchantId]));
}

export async function updateMerchantPayoutMethod(env = {}, merchantId = '', methodId = '', body = {}) {
  const existing = await dbFirst(env, `SELECT * FROM merchant_payout_methods WHERE id = ? AND merchant_id = ? LIMIT 1`, [methodId, merchantId]);
  if (!existing) return null;
  const payload = normalizePayoutMethodInput(body, existing);
  await dbRun(env, `
    UPDATE merchant_payout_methods
    SET type = ?, label = ?, handle = ?, email = ?, phone_last4 = ?, account_last4 = ?, routing_last4 = ?,
        instructions_json = ?, verified = ?, active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND merchant_id = ?
  `, [payload.type, payload.label, payload.handle, payload.email, payload.phoneLast4, payload.accountLast4, payload.routingLast4, JSON.stringify(payload.instructions), payload.verified ? 1 : 0, payload.active ? 1 : 0, methodId, merchantId]);
  return payoutMethodRecord(await dbFirst(env, `SELECT * FROM merchant_payout_methods WHERE id = ? AND merchant_id = ? LIMIT 1`, [methodId, merchantId]));
}

export async function listMerchantPayoutDisbursements(env = {}, merchantId = '') {
  const rows = await dbAll(env, `SELECT * FROM merchant_payout_disbursements WHERE merchant_id = ? ORDER BY created_at DESC`, [merchantId]);
  return rows.map(payoutDisbursementRecord);
}

export async function createMerchantPayoutDisbursement(env = {}, merchantId = '', ledgerId = '', body = {}) {
  const ledger = await dbFirst(env, `SELECT * FROM merchant_payout_ledger WHERE id = ? AND merchant_id = ? LIMIT 1`, [ledgerId, merchantId]);
  if (!ledger) {
    const error = new Error('Merchant payout ledger record not found.');
    error.status = 404;
    throw error;
  }
  if (!['payable', 'payout_scheduled'].includes(String(ledger.status || '').toLowerCase())) {
    const error = new Error('Merchant receivable is not payable yet.');
    error.status = 409;
    error.code = 'MERCHANT_RECEIVABLE_NOT_PAYABLE';
    throw error;
  }
  const profile = await getMerchantPayoutProfile(env, merchantId);
  if (!profile.ready) {
    const error = new Error('Merchant payout profile is not ready.');
    error.status = 409;
    error.code = 'MERCHANT_PAYOUT_PROFILE_NOT_READY';
    error.blockers = profile.blockers;
    throw error;
  }
  const payload = normalizeDisbursementInput(body);
  const methodId = payload.methodId || profile.primaryMethodId;
  const method = methodId ? await dbFirst(env, `SELECT * FROM merchant_payout_methods WHERE id = ? AND merchant_id = ? AND active = 1 LIMIT 1`, [methodId, merchantId]) : null;
  if (!method) {
    const error = new Error('Active payout method not found.');
    error.status = 409;
    error.code = 'PAYOUT_METHOD_NOT_READY';
    throw error;
  }
  const id = uid('mpd');
  const status = payload.status;
  await dbRun(env, `
    INSERT INTO merchant_payout_disbursements (
      id, merchant_id, ledger_id, method_id, provider, amount_cents, currency,
      status, external_reference, operator_note, provider_payload_json, paid_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END)
  `, [id, merchantId, ledgerId, method.id, payload.provider, Math.max(0, int(ledger.merchant_receivable_cents, 0)), ledger.currency || 'USD', status, payload.externalReference, payload.operatorNote, JSON.stringify({ ...payload.providerPayload, methodType: method.type, methodLabel: method.label }), status]);
  await dbRun(env, `
    UPDATE merchant_payout_ledger
    SET status = ?, payout_reference = COALESCE(NULLIF(?, ''), payout_reference), paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, CURRENT_TIMESTAMP) ELSE paid_at END, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND merchant_id = ?
  `, [status === 'paid' ? 'paid' : 'payout_scheduled', payload.externalReference, status, ledgerId, merchantId]);
  return payoutDisbursementRecord(await dbFirst(env, `SELECT * FROM merchant_payout_disbursements WHERE id = ? LIMIT 1`, [id]));
}

export async function updateMerchantPayoutDisbursement(env = {}, merchantId = '', disbursementId = '', body = {}) {
  const existing = await dbFirst(env, `SELECT * FROM merchant_payout_disbursements WHERE id = ? AND merchant_id = ? LIMIT 1`, [disbursementId, merchantId]);
  if (!existing) return null;
  const payload = normalizeDisbursementInput({ ...existing, ...body });
  await dbRun(env, `
    UPDATE merchant_payout_disbursements
    SET status = ?, external_reference = COALESCE(NULLIF(?, ''), external_reference), operator_note = ?, provider_payload_json = ?,
        paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, CURRENT_TIMESTAMP) ELSE paid_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND merchant_id = ?
  `, [payload.status, payload.externalReference, payload.operatorNote, JSON.stringify(payload.providerPayload), payload.status, disbursementId, merchantId]);
  if (payload.status === 'paid') {
    await dbRun(env, `UPDATE merchant_payout_ledger SET status = 'paid', payout_reference = COALESCE(NULLIF(?, ''), payout_reference), paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND merchant_id = ?`, [payload.externalReference, existing.ledger_id, merchantId]);
  }
  return payoutDisbursementRecord(await dbFirst(env, `SELECT * FROM merchant_payout_disbursements WHERE id = ? LIMIT 1`, [disbursementId]));
}
