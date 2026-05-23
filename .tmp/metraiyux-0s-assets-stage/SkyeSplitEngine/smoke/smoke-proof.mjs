import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.resolve(root, "..");

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(full, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mustContain(source, needle, label) {
  assert(source.includes(needle), `Missing ${label}: ${needle}`);
}

const html = read("index.html");
const gate = read("gate-session.js");
const sw = read("sw.js");
const manifest = JSON.parse(read("manifest.json"));
const readme = read("README_SKYE_SPLIT_ENGINE.md");
const notes = [
  read("PROOF_AND_DROP_NOTES.md"),
  read("PROOF_VISUAL_BUILD_CHECKS.md"),
  read("VISUAL_ENGINE_UPGRADE_NOTES.md")
].join("\n");

assert(!fs.existsSync(path.join(siteRoot, "skye_split_engine_visual_spectacle_v4.zip")), "Source zip should be deleted after import.");
mustContain(html, '<script src="gate-session.js"></script>', "gate script include");
mustContain(html, "await gate.requireSession()", "blocking gate-session await");
mustContain(html, "Free99. Gate-session required.", "visible Free99 app copy");
mustContain(gate, "Free99 means no charge", "Free99 gate copy");
mustContain(gate, "x-skye-split-engine-free99", "Free99 gate header");
mustContain(gate, "SkyeSplitGate", "global gate helper");
mustContain(sw, "gate-session.js", "gate helper service-worker cache");
mustContain(sw, "v4.1.1-transparent-gated-free99", "transparent gated cache version");
mustContain(sw, "skye-split-engine-logo-transparent.png", "transparent hero logo cache");
mustContain(sw, "skye-split-badge-transparent.png", "transparent badge cache");
mustContain(readme, "Free99 means no charge", "README no-charge language");
mustContain(notes, "gate session", "proof notes gate language");

assert(fs.existsSync(path.join(root, "assets", "skye-split-engine-logo-transparent.png")), "Missing transparent engine logo asset.");
assert(fs.existsSync(path.join(root, "assets", "skye-split-badge-transparent.png")), "Missing transparent badge logo asset.");

for (const forbidden of ["No auth. Local-first", "auth-free", "No auth layer is included", "Kept auth out of scope"]) {
  assert(!`${html}\n${readme}\n${notes}`.includes(forbidden), `Forbidden imported no-auth language still present: ${forbidden}`);
}

assert(manifest.name === "Skye Split Engine", "Manifest name mismatch.");
assert(manifest.icons?.length >= 8, "Manifest icon set is incomplete.");
assert(manifest.start_url === "./index.html", "Manifest start URL should stay folder-relative.");

const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
assert(inlineScripts.length === 1, `Expected one inline app script, got ${inlineScripts.length}.`);
new vm.Script(gate, { filename: "gate-session.js" });
new vm.Script(sw, { filename: "sw.js" });
new vm.Script(inlineScripts[0], { filename: "index-inline-app.js" });

console.log(JSON.stringify({
  ok: true,
  app: "SkyeSplitEngine",
  verified: [
    "archive deleted",
    "gate-session helper present",
    "app boot waits for gate session",
    "Free99 no-charge wording present",
    "transparent logo assets present",
    "service worker caches gate helper",
    "manifest parses",
    "gate, service-worker, and inline app JavaScript parse",
    "import notes no longer claim no-auth"
  ]
}, null, 2));
