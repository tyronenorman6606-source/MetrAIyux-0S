import { db } from "../src/db";
import { MockVanta13Adapter } from "../src/lib/vanta13/adapter";
import { sql } from "drizzle-orm";

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const results: CheckResult[] = [];

type DbExecuteResult<T> = T[] | { rows?: T[] };

function rowsFrom<T>(result: DbExecuteResult<T>): T[] {
  return Array.isArray(result) ? result : result.rows ?? [];
}

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? undefined });
    console.log(`OK ${name}${detail ? ` - ${detail}` : ""}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, detail });
    console.error(`FAIL ${name} - ${detail}`);
  }
}

function requireEnv(name: string) {
  if (!process.env[name]) {
    throw new Error(`${name} is not set`);
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${body.slice(0, 180)}`);
  }
  return JSON.parse(body);
}

await check("critical env is present", async () => {
  requireEnv("DATABASE_URL");
  requireEnv("NEXT_PUBLIC_APP_URL");
});

await check("database responds", async () => {
  await db.execute(sql`SELECT 1`);
});

await check("core tables exist", async () => {
  const rows = rowsFrom<{ table_name: string }>(await db.execute(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'tenants',
        'contacts',
        'conversations',
        'messages',
        'leads',
        'appointments',
        'quotes',
        'audit_logs',
        'automation_runs'
      )
  `) as DbExecuteResult<{ table_name: string }>);
  const tableNames = new Set(rows.map((row) => row.table_name));
  const missing = [
    "tenants",
    "contacts",
    "conversations",
    "messages",
    "leads",
    "appointments",
    "quotes",
    "audit_logs",
    "automation_runs",
  ].filter((name) => !tableNames.has(name));
  if (missing.length > 0) {
    throw new Error(`missing tables: ${missing.join(", ")}`);
  }
  return `${tableNames.size} tables verified`;
});

await check("VANTA13 classifier handles lead/vendor/emergency", async () => {
  const adapter = new MockVanta13Adapter();
  const emergency = await adapter.classify({ text: "My pipe burst and water is everywhere" });
  const quote = await adapter.classify({ text: "How much for two bathroom fixtures?" });
  const vendor = await adapter.classify({ text: "We can rank your website number one with SEO" });

  if (emergency.urgency !== "emergency") {
    throw new Error(`emergency classified as ${emergency.urgency}`);
  }
  if (quote.intent !== "request_quote") {
    throw new Error(`quote request classified as ${quote.intent}`);
  }
  if (vendor.callerType !== "vendor") {
    throw new Error(`vendor classified as ${vendor.callerType}`);
  }
});

const smokeBaseUrl = process.env.SMOKE_BASE_URL;
if (smokeBaseUrl) {
  await check("HTTP health readiness endpoint", async () => {
    const health = await fetchJson(`${smokeBaseUrl.replace(/\/$/, "")}/api/health?ready=1`);
    if (health.status !== "healthy") {
      throw new Error(`health status is ${health.status}`);
    }
    return `latency ${health.latencyMs}ms`;
  });
}

const failed = results.filter((result) => !result.ok);
console.log(
  JSON.stringify(
    {
      passed: results.length - failed.length,
      failed: failed.length,
      results,
    },
    null,
    2
  )
);

if (failed.length > 0) {
  process.exit(1);
}
