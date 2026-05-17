/**
 * MetrAIyux 0S SDK — Enterprise / white-label example
 *
 * Enterprise clients deploy on your gate, your workers.
 * Their customers interact through your branded interface;
 * the SDK handles all auth and routing behind the scenes.
 */

import { MetrAIyux0S, ApprovalRequiredError, PlanLimitError } from '@metraiyux/0s-sdk';

// For white-label deployments, point at your own FS27 + gateway instances
const client = new MetrAIyux0S({
  token: process.env.FS27_TOKEN,
  fs27Url: process.env.FS27_URL,     // your FS27 Worker URL
  gatewayUrl: process.env.GATEWAY_URL  // your provisioning Worker URL
});

await client.init();

// Batch submit commands with error handling
async function submitWithPolicy(commands) {
  const results = [];
  for (const text of commands) {
    try {
      const result = await client.command(text, { strict: false });
      results.push({
        text,
        status: result.approval_required ? 'pending_approval' : 'routed',
        brain: result.route?.primary,
        command_id: result.command_id
      });
    } catch (err) {
      if (err instanceof PlanLimitError) {
        console.error('Plan limit hit — upgrade workspace');
        break;
      }
      results.push({ text, status: 'error', error: err.message });
    }
  }
  return results;
}

const batch = [
  'Review the staffing proposal for Field Tech Solutions',
  'Check compliance status on the Q2 government bid',
  'Prepare founder strategy briefing for Monday',
  'Flag any vendor partner risk in the new contract'
];

const outcomes = await submitWithPolicy(batch);
console.table(outcomes);

// Pull workspace visual data for a dashboard
const visuals = await client.workspace.visuals();
console.log('KPIs:', visuals.visuals?.kpis);
console.log('Open commands:', visuals.visuals?.donut);
