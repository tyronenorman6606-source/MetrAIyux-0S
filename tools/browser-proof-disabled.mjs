#!/usr/bin/env node

const args = process.argv.slice(2);
const laneArg = args.find((arg) => arg.startsWith('--lane='));
const lane = laneArg ? laneArg.slice('--lane='.length) : 'live-browser-proof';

const receipt = {
  ok: true,
  mode: 'browser-proof-disabled',
  lane,
  generated_at: new Date().toISOString(),
  reason: 'Owner/admin disabled Codex-run browser proof. Use deploy, static, API, and HTTP stress receipts; owner performs live browser verification manually.',
  browser_opened: false,
  playwright_started: false
};

console.log(JSON.stringify(receipt, null, 2));
