import fs from "node:fs";
import path from "node:path";

const root = process.env.SOVEREIGNDOCS_LIBRARY_ROOT || "./template-library/generated";

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (item.endsWith(".json") && !item.startsWith("index-") && item !== "index.json") out.push(full);
  }
  return out;
}

const files = walk(root);
const templates = files.map((file) => JSON.parse(fs.readFileSync(file, "utf8")));

console.log(JSON.stringify({
  root,
  count: templates.length,
  sample: templates.slice(0, 3).map((t) => ({
    id: t.id,
    title: t.title,
    state: t.jurisdiction?.state_name,
    category: t.category?.name
  }))
}, null, 2));
