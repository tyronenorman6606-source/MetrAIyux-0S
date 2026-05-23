/**
 * MetrAIyux 0S SDK — Basic usage example
 *
 * Requirements: one FS27 gate card token.
 * No Cloudflare account, no Resend key, no Stripe keys needed.
 */

import { MetrAIyux0S, ApprovalRequiredError } from '@metraiyux/0s-sdk';

const client = new MetrAIyux0S({
  token: process.env.FS27_TOKEN  // kx_live_... API key or session JWT from FS27
});

// Validate credentials at startup (optional — auto-runs on first call)
const card = await client.init();
console.log('Authenticated:', card.identity.email, '/', card.tier);
console.log('Plan limits:', card.budget, card.limits);

// Submit a command to the brain routing system
const result = await client.command('Review the proposal for Acme Corp and flag any compliance issues');
console.log('Brain routed to:', result.route?.primary);
console.log('Approval required:', result.approval_required);
console.log('0meg4kAI decision:', result.omega_review?.decision);

// Submit a command that will require approval — handle gracefully
try {
  await client.command('Post announcement to all social channels', { strict: true });
} catch (err) {
  if (err.name === 'ApprovalRequiredError') {
    console.log('Needs approval from:', err.route?.secondary);
  }
}

// Check workspace status
const status = await client.workspace.status();
console.log('Workspace:', status.workspace_id, '/', status.plan);

// Get a Stripe checkout URL to upgrade plan
const checkout = await client.billing.checkout('growth-cabinet', {
  customer_email: 'client@example.com'
});
console.log('Checkout URL:', checkout.checkout_url);

// Get recent proof ledger
const ledger = await client.proof.ledger(10);
console.log('Recent events:', ledger.rows?.length);
