const hookUrl = process.env.NETLIFY_BUILD_HOOK_URL || process.env.SKYGATEFS27_NETLIFY_BUILD_HOOK_URL;
const fs = await import("node:fs");
const path = await import("node:path");
const { fileURLToPath } = await import("node:url");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const proofPath = path.join(__dirname, "..", "docs", "proof", "NETLIFY_BUILD_HOOK.json");

function writeProof(proof) {
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + "\n");
}

if (!hookUrl) {
  const proof = {
    ok: false,
    blocked: true,
    reason: "missing NETLIFY_BUILD_HOOK_URL or SKYGATEFS27_NETLIFY_BUILD_HOOK_URL",
    checked_at: new Date().toISOString()
  };
  writeProof(proof);
  console.error(JSON.stringify(proof, null, 2));
  process.exit(2);
}

const response = await fetch(hookUrl, { method: "POST" });
const text = await response.text().catch(() => "");

const proof = {
  ok: response.ok,
  status: response.status,
  status_text: response.statusText,
  checked_at: new Date().toISOString(),
  response_body: text.slice(0, 1000)
};

writeProof(proof);
console.log(JSON.stringify(proof, null, 2));

if (!response.ok) process.exit(1);
