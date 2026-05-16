import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
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
    if (value && !value.includes("...") && !value.includes("${")) out[key] = value;
  }
  return out;
}

const env = { ...process.env, ...parseEnv(path.join(repoRoot, ".env")) };
const child = spawn("npx", ["wrangler", "deploy"], {
  cwd: skymailRoot,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => process.stdout.write(chunk));
child.stderr.on("data", (chunk) => process.stderr.write(chunk));

const heartbeat = setInterval(() => {
  console.log("wrangler deploy still running...");
}, 5000);

const code = await new Promise((resolve) => child.on("close", resolve));
clearInterval(heartbeat);
process.exit(code || 0);
