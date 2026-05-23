/**
 * VantaCore Job Runner CLI
 * Usage: npx tsx scripts/run-job.ts <job-name>
 *
 * Fallback entrypoint for GitHub Actions cron or external schedulers
 * when platform-native cron triggers are unavailable.
 */

import { runJob } from "../src/lib/jobs";

const name = process.argv[2];

if (!name) {
  console.error("Usage: npx tsx scripts/run-job.ts <job-name>");
  console.error("Available jobs:");
  console.error("  revenue-rescue, call-to-content, reactivation-campaign,");
  console.error("  analytics-materialize, owner-digest, competitor-radar, trust-ledger-compact");
  process.exit(1);
}

runJob(name as any, { triggeredAt: new Date(), isDryRun: false })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    console.error("Job runner fatal error:", err);
    process.exit(1);
  });
