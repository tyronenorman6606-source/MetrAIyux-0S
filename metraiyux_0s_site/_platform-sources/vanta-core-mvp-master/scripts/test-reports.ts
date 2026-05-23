import { db } from "../src/db";
import { tenants } from "../src/db/schema/schema";
import { deliverReport } from "../src/lib/report-delivery";
import { generateDailyDigest, generateWeeklyReport } from "../src/lib/reports";

function assertNumber(name: string, value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name} must be a number`);
  }
}

const tenant = await db.query.tenants.findFirst({
  columns: {
    id: true,
    name: true,
  },
});

if (!tenant) {
  throw new Error("No tenant found; seed or connect a database before running report tests.");
}

console.log(`Testing reports against tenant ${tenant.name} (${tenant.id})`);

const daily = await generateDailyDigest(tenant.id);
assertNumber("daily.newLeads", daily.newLeads);
assertNumber("daily.completedJobs", daily.completedJobs);
assertNumber("daily.revenue", daily.revenue);
assertNumber("daily.noiseFiltered", daily.noiseFiltered);
await deliverReport({ tenantId: tenant.id, type: "daily", data: daily });
console.log("OK daily digest generated and delivery path executed");

const weekly = await generateWeeklyReport(tenant.id);
assertNumber("weekly.totalRevenue", weekly.totalRevenue);
assertNumber("weekly.conversionRate", weekly.conversionRate);
assertNumber("weekly.leadsCaptured", weekly.leadsCaptured);
assertNumber("weekly.noiseBlocked", weekly.noiseBlocked);
if (!Array.isArray(weekly.topServices)) {
  throw new Error("weekly.topServices must be an array");
}
await deliverReport({ tenantId: tenant.id, type: "weekly", data: weekly });
console.log("OK weekly report generated and delivery path executed");
