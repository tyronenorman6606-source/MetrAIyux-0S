import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRepoEnvSections, getRepoEnvSummary } from "../netlify/functions/_lib/repoEnvCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const proofPath = path.join(projectRoot, "docs", "proof", "ENV_WEBSITE_SYNC.json");

const sections = getRepoEnvSections();
const summary = getRepoEnvSummary();
const vars = sections.flatMap((section) => section.vars.map((entry) => entry.name));
const duplicates = vars.filter((name, index) => vars.indexOf(name) !== index);
const mcpSection = sections.find((section) => section.title === "QuantumSkyes MCP / AI repo write bridge");

const proof = {
  ok: duplicates.length === 0 && Boolean(mcpSection),
  checked_at: new Date().toISOString(),
  website_source: "netlify/functions/_lib/repoEnvCatalog.js",
  canonical_template: summary.canonical_template,
  note: "The admin website env table is generated from env.ultimate.template at runtime; this proof confirms the catalog can be read and includes the MCP bridge section.",
  summary,
  duplicate_vars: [...new Set(duplicates)],
  mcp_bridge_vars: mcpSection ? mcpSection.vars.map((entry) => entry.name) : []
};

fs.mkdirSync(path.dirname(proofPath), { recursive: true });
fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + "\n");
console.log(JSON.stringify(proof, null, 2));

if (!proof.ok) process.exitCode = 1;
