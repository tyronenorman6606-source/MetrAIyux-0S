import test from 'node:test';
import assert from 'node:assert/strict';

import {
  skyePayAdminCanVoidWithoutRefund,
  skyePayAdminNextRefundState,
  skyePayAdminPaymentIsRefundable,
  skyePayRemainingRefundableCents,
  skyePayRefundableOrderAmountCents
} from '../netlify/functions/admin-skyepay-ledger.js';

test('SkyePay admin cannot void paid orders without refunding them', () => {
  assert.equal(skyePayAdminPaymentIsRefundable('paid'), true);
  assert.equal(skyePayAdminPaymentIsRefundable('complete'), true);
  assert.equal(skyePayAdminPaymentIsRefundable('partially_refunded'), true);
  assert.equal(skyePayAdminPaymentIsRefundable('unpaid'), false);

  assert.equal(skyePayAdminCanVoidWithoutRefund({ payment_status: 'paid' }), false);
  assert.equal(skyePayAdminCanVoidWithoutRefund({ payment_status: 'complete' }), false);
  assert.equal(skyePayAdminCanVoidWithoutRefund({ payment_status: 'unpaid' }), true);
});

test('SkyePay admin refund state distinguishes partial and full refunds', () => {
  const order = {
    amount_setup_cents: 7500,
    amount_recurring_cents: 2500,
    payment_status: 'paid',
    approval_status: 'paid_pending_owner_approval',
    owner_status: 'pending_owner_approval',
    provisioning_status: 'waiting_for_owner_approval',
    metadata: {}
  };

  assert.equal(skyePayRefundableOrderAmountCents(order), 10000);

  const partial = skyePayAdminNextRefundState({ order, amountCents: 2500, priorRefundedCents: 0 });
  assert.equal(partial.full_refund, false);
  assert.equal(partial.payment_status, 'partially_refunded');
  assert.equal(partial.approval_status, 'paid_pending_owner_approval');

  const full = skyePayAdminNextRefundState({ order, amountCents: 7500, priorRefundedCents: 2500 });
  assert.equal(full.full_refund, true);
  assert.equal(full.payment_status, 'refunded');
  assert.equal(full.approval_status, 'refunded');
  assert.equal(full.owner_status, 'refunded');
  assert.equal(full.provisioning_status, 'refunded');
});

test('SkyePay admin refund amount honors adjusted SkyeMerit due amount', () => {
  const order = {
    amount_setup_cents: 500000,
    amount_recurring_cents: 0,
    metadata: {
      skyemerit_adjusted_due_cents: '29900'
    }
  };
  assert.equal(skyePayRefundableOrderAmountCents(order), 29900);
  assert.equal(skyePayRemainingRefundableCents(order, 9900), 20000);
  assert.equal(skyePayRemainingRefundableCents(order, 29900), 0);
});
