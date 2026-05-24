import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function findRepoRoot(start) {
  let current = start;
  while (current && current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) return current;
    current = path.dirname(current);
  }
  return path.resolve(start, "../../../..");
}

const repoRoot = findRepoRoot(__dirname);
const envFile = path.join(repoRoot, ".env");
const args = process.argv.slice(2);

if (!args.length) {
  console.error("Usage: node tools/run-with-root-env.mjs <command> [args...]");
  process.exit(2);
}

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
    if (value) out[key] = value;
  }
  return out;
}

const env = { ...process.env, ...parseEnv(envFile) };
const child = spawnSync(args[0], args.slice(1), {
  cwd: path.resolve(__dirname, ".."),
  env,
  stdio: "inherit",
});

process.exit(child.status ?? 1);
