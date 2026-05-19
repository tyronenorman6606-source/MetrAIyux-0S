import fs from "node:fs";
import path from "node:path";

const root = process.env.SOVEREIGNDOCS_LIBRARY_ROOT || "./template-library";
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

let missing = 0;
let badJson = 0;

for (const rec of manifest.records) {
  const p = path.join(".", rec.path);
  if (!fs.existsSync(p)) {
    missing++;
    console.error("Missing:", p);
    continue;
  }
  try {
    const obj = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!obj.id || !obj.title || !obj.jurisdiction || !obj.render_markdown) {
      badJson++;
      console.error("Bad record:", p);
    }
    if (obj.rights?.lawdepot_text_used !== false) {
      badJson++;
      console.error("Rights flag failed:", p);
    }
  } catch (err) {
    badJson++;
    console.error("Invalid JSON:", p, err.message);
  }
}

console.log(JSON.stringify({
  library: manifest.library_name,
  version: manifest.version,
  baseTemplateCount: manifest.base_template_count,
  jurisdictionCount: manifest.jurisdiction_count,
  generatedTemplateCount: manifest.generated_template_count,
  recordsInManifest: manifest.records.length,
  missing,
  badJson,
  ok: missing === 0 && badJson === 0
}, null, 2));

if (missing || badJson) process.exit(1);
