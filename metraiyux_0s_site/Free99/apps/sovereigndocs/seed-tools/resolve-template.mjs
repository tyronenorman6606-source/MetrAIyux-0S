import fs from "node:fs";
import path from "node:path";

export function loadTemplate({ stateCode, categorySlug, slug, root = "./template-library" }) {
  const file = path.join(root, "generated", `US-${stateCode}`, categorySlug, `${slug}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function renderMarkdown(template, values = {}) {
  let out = template.render_markdown || "";
  const merged = {
    state_full_name: template.jurisdiction?.state_name,
    state_code: template.jurisdiction?.state_code,
    document_title: template.title,
    ...values
  };

  for (const [key, value] of Object.entries(merged)) {
    out = out.replaceAll(`{{${key}}}`, String(value ?? ""));
  }

  out = out.replace(/\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) => {
    return merged[key] ? body : "";
  });

  return out;
}

// Example:
// const t = loadTemplate({ stateCode: "AZ", categorySlug: "commercial-contracts", slug: "independent-contractor-agreement" });
// console.log(renderMarkdown(t, { party_one_name: "Skyes Over London", party_one_address: "Glendale, AZ" }));
