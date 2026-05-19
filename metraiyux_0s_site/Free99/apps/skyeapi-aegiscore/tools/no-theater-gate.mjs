import { readFile, writeFile, mkdir } from "node:fs/promises";
import { runNoTheaterGate } from "../packages/ops/dist/index.js";
const files = ["README.md", "PROOF_LEDGER.md", "docs/PUBLIC_CLAIMS_REGISTER.md", "apps/console/index.html", "apps/website/index.html", "apps/website/public/llms.txt", "apps/website/public/ai.md"];
const report = runNoTheaterGate(await Promise.all(files.map(async (path) => ({ path, content: await readFile(path, "utf8") }))));
await mkdir(".proof", { recursive: true });
await writeFile(".proof/no-theater-gate-result.json", `${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) throw new Error(`No-theater gate failed:\n${report.findings.map((f) => `${f.file}: ${f.code}`).join("\n")}`);
console.log(JSON.stringify(report, null, 2));
