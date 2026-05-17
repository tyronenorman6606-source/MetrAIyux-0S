import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skymailRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(skymailRoot, "../..");

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (isRealValue(key, value)) out[key] = value;
  }
  return out;
}

function isRealValue(key, value) {
  const clean = String(value || "").trim();
  if (!clean) return false;
  if (clean.includes("...")) return false;
  if (clean.includes("$(") || clean.includes("${")) return false;
  if (/^(your_|YOUR_|changeme|CHANGE_ME|replace_me|REPLACE_ME)/.test(clean)) return false;
  if (/(^|_)DATABASE_URL$/.test(key) && !/^postgres(ql)?:\/\//.test(clean)) return false;
  return true;
}

const env = {
  ...parseEnv(path.join(skymailRoot, ".env.template")),
  ...parseEnv(path.join(repoRoot, ".env")),
  ...parseEnv(path.join(skymailRoot, ".env")),
  ...process.env,
};

const databaseUrl = env.NEON_DATABASE_URL || env.DATABASE_URL;
if (!databaseUrl) {
  console.error("NEON_DATABASE_URL/DATABASE_URL is missing.");
  process.exit(1);
}

const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", "sql/schema.sql"], {
  cwd: skymailRoot,
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf8",
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "Schema apply failed.\n");
  process.exit(result.status || 1);
}

console.log("SkyeMail Neon schema applied.");
