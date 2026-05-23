import fs from 'node:fs';
function render(text, data) {
  return text
    .replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) => data[key.trim()] ? body : '')
    .replace(/\{\{\s*([^#/{][^}]*)\}\}/g, (_, key) => String(data[key.trim()] ?? ''));
}
function validate(template, data) {
  const missing = [];
  for (const field of template.questionnaire || []) {
    if (field.required && (data[field.key] === undefined || data[field.key] === '')) missing.push(field.key);
  }
  return { ok: missing.length === 0, missing };
}
const [,, templatePath, dataPath] = process.argv;
if (!templatePath || !dataPath) {
  console.error('Usage: node engines/render-document.mjs <template.json> <data.json>'); process.exit(1);
}
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const check = validate(template, data);
if (!check.ok) { console.error(JSON.stringify(check, null, 2)); process.exit(2); }
const md = render(template.render_markdown, data);
console.log(md);
export { render, validate };
