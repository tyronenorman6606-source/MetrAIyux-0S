import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMerchantPayoutDisbursement,
  createMerchantPayoutMethod,
  getMerchantPayoutProfile,
  updateMerchantPayoutDisbursement,
  upsertMerchantPayoutProfile
} from '../src/lib/internal-payouts.js';

function makeEnv() {
  const state = {
    profiles: [],
    methods: [],
    ledger: [{
      id: 'mpay_1',
      merchant_id: 'm1',
      order_id: 'ord_1',
      merchant_receivable_cents: 8750,
      currency: 'USD',
      status: 'payable',
      payout_reference: '',
      paid_at: null
    }],
    disbursements: []
  };
  return {
    state,
    DB: {
      prepare(sql) {
        return {
          bind(...bindings) {
            return {
              first: async () => {
                if (/SELECT \* FROM merchant_payout_profiles/.test(sql)) return state.profiles.find((row) => row.merchant_id === bindings[0]) || null;
                if (/SELECT \* FROM merchant_payout_methods WHERE id = \? AND merchant_id = \? AND active = 1/.test(sql)) return state.methods.find((row) => row.id === bindings[0] && row.merchant_id === bindings[1] && row.active === 1) || null;
                if (/SELECT \* FROM merchant_payout_methods WHERE id = \? AND merchant_id = \?/.test(sql)) return state.methods.find((row) => row.id === bindings[0] && row.merchant_id === bindings[1]) || null;
                if (/SELECT \* FROM merchant_payout_ledger/.test(sql)) return state.ledger.find((row) => row.id === bindings[0] && row.merchant_id === bindings[1]) || null;
                if (/SELECT \* FROM merchant_payout_disbursements/.test(sql)) return state.disbursements.find((row) => row.id === bindings[0]) || null;
                return null;
              },
              all: async () => {
                if (/FROM merchant_payout_methods/.test(sql)) return { results: state.methods.filter((row) => row.merchant_id === bindings[0]) };
                if (/FROM merchant_payout_disbursements/.test(sql)) return { results: state.disbursements.filter((row) => row.merchant_id === bindings[0]) };
                return { results: [] };
              },
              run: async () => {
                if (/INSERT INTO merchant_payout_profiles/.test(sql)) {
                  const row = {
                    id: bindings[0],
                    merchant_id: bindings[1],
                    legal_name: bindings[2],
                    business_name: bindings[3],
                    agreement_status: bindings[4],
                    agreement_reference: bindings[5],
                    tax_profile_status: bindings[6],
                    payout_status: bindings[7],
                    primary_method_id: bindings[8],
                    notes: bindings[9],
                    created_at: 'now',
                    updated_at: 'now'
                  };
                  const index = state.profiles.findIndex((item) => item.merchant_id === row.merchant_id);
                  if (index >= 0) state.profiles[index] = { ...state.profiles[index], ...row };
                  else state.profiles.push(row);
                }
                if (/UPDATE merchant_payout_profiles SET primary_method_id/.test(sql)) {
                  const row = state.profiles.find((item) => item.merchant_id === bindings[1]);
                  if (row) row.primary_method_id = bindings[0];
                }
                if (/INSERT INTO merchant_payout_methods/.test(sql)) {
                  state.methods.push({
                    id: bindings[0],
                    merchant_id: bindings[1],
                    profile_id: bindings[2],
                    type: bindings[3],
                    label: bindings[4],
                    handle: bindings[5],
                    email: bindings[6],
                    phone_last4: bindings[7],
                    account_last4: bindings[8],
                    routing_last4: bindings[9],
                    instructions_json: bindings[10],
                    verified: bindings[11],
                    active: bindings[12],
                    created_at: 'now',
                    updated_at: 'now'
                  });
                }
                if (/INSERT INTO merchant_payout_disbursements/.test(sql)) {
                  state.disbursements.push({
                    id: bindings[0],
                    merchant_id: bindings[1],
                    ledger_id: bindings[2],
                    method_id: bindings[3],
                    provider: bindings[4],
                    amount_cents: bindings[5],
                    currency: bindings[6],
                    status: bindings[7],
                    external_reference: bindings[8],
                    operator_note: bindings[9],
                    provider_payload_json: bindings[10],
                    created_at: 'now',
                    updated_at: 'now',
                    paid_at: bindings[11] === 'paid' ? 'now' : null
                  });
                }
                if (/UPDATE merchant_payout_ledger/.test(sql)) {
                  const row = state.ledger.find((item) => item.id === bindings[3] || item.id === bindings[1]);
                  if (row && bindings[0]) row.status = bindings[0];
                  if (row && bindings[1]) row.payout_reference = bindings[1];
                }
                if (/UPDATE merchant_payout_disbursements/.test(sql)) {
                  const row = state.disbursements.find((item) => item.id === bindings[5]);
                  if (row) {
                    row.status = bindings[0];
                    row.external_reference = bindings[1] || row.external_reference;
                    row.operator_note = bindings[2];
                    row.provider_payload_json = bindings[3];
                    row.paid_at = bindings[4] === 'paid' ? 'now' : row.paid_at;
                  }
                }
                return { success: true };
              }
            };
          }
        };
      }
    }
  };
}

test('internal payout profile requires agreement and active method before disbursement', async () => {
  const env = makeEnv();
  await upsertMerchantPayoutProfile(env, 'm1', {
    legalName: 'Example Seller LLC',
    agreementStatus: 'signed',
    taxProfileStatus: 'received',
    payoutStatus: 'ready'
  });
  const method = await createMerchantPayoutMethod(env, 'm1', {
    type: 'cashapp',
    label: 'Founder Cash App',
    handle: '$exampleco',
    verified: true
  });
  const profile = await getMerchantPayoutProfile(env, 'm1');
  assert.equal(profile.ready, true);
  assert.equal(profile.primaryMethodId, method.id);

  const disbursement = await createMerchantPayoutDisbursement(env, 'm1', 'mpay_1', {
    methodId: method.id,
    status: 'queued',
    provider: 'internal_skyepay',
    operatorNote: 'Ready for SkyePay operator payout.'
  });
  assert.equal(disbursement.amountCents, 8750);
  assert.equal(disbursement.status, 'queued');

  const paid = await updateMerchantPayoutDisbursement(env, 'm1', disbursement.id, {
    status: 'paid',
    externalReference: 'cashapp_manual_123'
  });
  assert.equal(paid.status, 'paid');
  assert.equal(paid.externalReference, 'cashapp_manual_123');
});
