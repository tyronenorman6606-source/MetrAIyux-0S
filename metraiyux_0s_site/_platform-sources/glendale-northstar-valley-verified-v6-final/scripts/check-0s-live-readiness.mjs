import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const execFileAsync = promisify(execFile);

const requiredNorthstarTables = [
  "workspaces",
  "workspace_users",
  "workspace_settings",
  "workspace_states",
  "attendees",
  "workspace_audit_events",
  "workspace_login_attempts",
  "workspace_invites",
  "workspace_backups"
];

const requiredFs27Tables = [
  "customers",
  "users",
  "user_passwords",
  "user_sessions",
  "api_keys",
  "usage_events",
  "audit_events",
  "rate_limit_windows",
  "rate_limit_scoped_windows"
];

const valleyClients = JSON.parse(
  await fs.readFile(path.join(projectRoot, "NORTHSTAR_VALLEY_CLIENT_MANIFEST_2026-05-19.json"), "utf8")
).clients;

async function main() {
  const outDir = path.join(projectRoot, "integration");
  await fs.mkdir(outDir, { recursive: true });

  const report = {
    generated_at: new Date().toISOString(),
    repo_root: repoRoot,
    project_root: projectRoot,
    checks: {}
  };

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    report.checks.database = {
      ok: false,
      error: "DATABASE_URL is not set"
    };
  } else {
    const query = `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name;
    `;
    const { stdout } = await execFileAsync("psql", [dbUrl, "-Atc", query], {
      cwd: repoRoot,
      env: process.env
    });
    const liveTables = new Set(
      stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    );
    report.checks.database = {
      ok: true,
      present_fs27_tables: requiredFs27Tables.filter((name) => liveTables.has(name)),
      missing_fs27_tables: requiredFs27Tables.filter((name) => !liveTables.has(name)),
      present_northstar_tables: requiredNorthstarTables.filter((name) => liveTables.has(name)),
      missing_northstar_tables: requiredNorthstarTables.filter((name) => !liveTables.has(name))
    };
  }

  const valleyRoot = path.join(repoRoot, "metraiyux_0s_site", "valley-verified");
  const mountedPath = path.join(valleyRoot, "MOUNTED_IN_0S.json");
  let mounted = null;
  try {
    mounted = JSON.parse(await fs.readFile(mountedPath, "utf8"));
  } catch (error) {
    report.checks.valley_mount = {
      ok: false,
      error: `Could not read ${mountedPath}: ${error.message}`
    };
  }

  const businessChecks = [];
  for (const client of valleyClients) {
    const businessRel = client.proposed_valley_business_route
      .replace(/^\/valley-verified\//, "")
      .replace(/^\//, "");
    const businessIndex = path.join(valleyRoot, businessRel, "index.html");
    let exists = false;
    try {
      await fs.access(businessIndex);
      exists = true;
    } catch {}
    businessChecks.push({
      slug: client.slug,
      name: client.name,
      proposed_route: client.proposed_valley_business_route,
      business_page_exists: exists,
      business_page_file: businessIndex
    });
  }

  report.checks.valley_mount = report.checks.valley_mount || {
    ok: true,
    mounted_public_route: mounted?.public_route || null,
    mounted_app_build_lane: mounted?.app_build_lane || null,
    mount_receipt_present: Boolean(mounted),
    businesses: businessChecks
  };

  const summary = {
    fs27_ready: report.checks.database?.ok ? report.checks.database.missing_fs27_tables.length === 0 : false,
    northstar_schema_live: report.checks.database?.ok ? report.checks.database.missing_northstar_tables.length === 0 : false,
    custom_valley_pages_present: businessChecks.filter((item) => item.business_page_exists).length,
    custom_valley_pages_missing: businessChecks.filter((item) => !item.business_page_exists).length
  };
  report.summary = summary;

  const outPath = path.join(outDir, "NORTHSTAR_0S_LIVE_READINESS_2026-05-19.json");
  await fs.writeFile(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(outPath);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
