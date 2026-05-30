import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMerchantOnboardingReadiness } from '../src/lib/merchant-onboarding.js';

test('merchant onboarding readiness treats the 0S bridge as the storefront launch spine', () => {
  const readiness = buildMerchantOnboardingReadiness({
    merchant: { brandName: 'Artist Shop', slug: 'artist-shop' },
    products: [{ id: 'p1', status: 'active', trackInventory: true, inventoryOnHand: 12 }],
    shippingProfiles: [{ id: 'ship1' }],
    taxProfiles: [{ id: 'tax1' }],
    discounts: [],
    analytics: { counts: { orders: 2, customers: 1, products: 1 } },
    payoutProfile: { ready: true, agreementStatus: 'signed', taxProfileStatus: 'complete', payoutStatus: 'ready', blockers: [] },
    payoutMethods: [{ id: 'pm1', active: true }],
    musicNexusLink: { artistName: 'Artist One' },
    providerConnections: []
  });

  assert.equal(readiness.ok, true);
  assert.equal(readiness.checkoutArchitecture.noStripeConnectRequiredForMerchant, true);
  assert.ok(readiness.zeroOsBridgeLinks.some((link) => link.id === 'workforce'));
  assert.ok(readiness.steps.some((step) => step.id === 'payout-paperwork' && step.ready));
});

test('merchant onboarding readiness blocks launch when products and payout paperwork are missing', () => {
  const readiness = buildMerchantOnboardingReadiness({
    merchant: { brandName: 'Empty Shop', slug: 'empty-shop' },
    products: [],
    shippingProfiles: [{ id: 'ship1' }],
    taxProfiles: [{ id: 'tax1' }],
    payoutProfile: { ready: false, blockers: ['agreement_required'] },
    payoutMethods: []
  });

  assert.equal(readiness.ok, false);
  assert.ok(readiness.blockers.includes('products'));
  assert.ok(readiness.blockers.includes('payout-paperwork'));
  assert.ok(readiness.blockers.includes('payout-method'));
});
