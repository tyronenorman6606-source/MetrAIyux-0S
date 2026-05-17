import fs from "node:fs";
import path from "node:path";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  const [, key, rawValue] = match;
  let value = rawValue.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

export function loadLocalEnv({ root, repoRoot = path.resolve(root, "..") }) {
  const files = [
    path.join(repoRoot, ".env"),
    path.join(root, ".env"),
    path.join(root, ".env.local")
  ];
  const loaded = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    let count = 0;
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = value;
        count += 1;
      }
    }
    loaded.push({ file, count });
  }
  if (process.env.DATABASE_URL && !process.env.NETLIFY_DATABASE_URL) {
    process.env.NETLIFY_DATABASE_URL = process.env.DATABASE_URL;
  }
  if (process.env.stripe_key) {
    process.env.STRIPE_SECRET_KEY = process.env.stripe_key;
  }
  return loaded;
}
