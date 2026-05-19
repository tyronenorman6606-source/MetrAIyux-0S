import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [, , category, id, ...titleParts] = process.argv;
if(!category || !id || !titleParts.length){
  console.error('Usage: node scripts/create-template.mjs <category> <template-id> <Template Title>');
  process.exit(1);
}
const title = titleParts.join(' ');
const ROOT = process.cwd();
const folder = path.join(ROOT, 'template-library', category, id);
await mkdir(folder, { recursive: true });

const templateJson = {
  id,
  title,
  category,
  description: `Create a self-help ${title.toLowerCase()} using guided SovereignDocs intake fields.`,
  riskLevel: 'medium',
  notLegalAdviceRequired: true,
  jurisdictionSensitive: true,
  version: '1.0.0',
  outputFormats: ['markdown', 'word-compatible-doc', 'print-to-pdf'],
  estimatedCompletionMinutes: 8
};
const questions = [
  { id: 'document_date', label: 'Document Date', type: 'date', required: true },
  { id: 'party_one_name', label: 'First Party / Primary Name', type: 'text', required: true },
  { id: 'party_two_name', label: 'Second Party / Related Name', type: 'text', required: false },
  { id: 'purpose_summary', label: 'Purpose / Summary', type: 'textarea', required: true },
  { id: 'special_terms', label: 'Special Terms or Notes', type: 'textarea', required: false }
];
const document = `# ${title}\n\n> SovereignDocs self-help document automation notice: this template is not legal advice, not attorney review, and does not create an attorney-client relationship.\n\nDocument Date: {{document_date}}\n\nPrimary Party: {{party_one_name}}\n\nRelated Party: {{party_two_name}}\n\n## Purpose\n\n{{purpose_summary}}\n\n## Terms / Notes\n\n{{special_terms}}\n\n## Acknowledgment\n\nThe user is responsible for reviewing this document and deciding whether qualified professional or attorney review is needed for their situation.\n`;

await writeFile(path.join(folder, 'template.json'), `${JSON.stringify(templateJson, null, 2)}\n`);
await writeFile(path.join(folder, 'questions.json'), `${JSON.stringify(questions, null, 2)}\n`);
await writeFile(path.join(folder, 'document.md'), document);
await writeFile(path.join(folder, 'preview.md'), document.replace(/{{[^}]+}}/g, '[sample field]'));
await writeFile(path.join(folder, 'disclaimer.md'), `# Required Boundary\n\nSovereignDocs provides self-help document automation only. This template is not legal advice, not attorney review, and does not create an attorney-client relationship.\n`);

const manifestPath = path.join(ROOT, 'template-library', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if(!manifest.categories.some(c => c.id === category)){
  manifest.categories.push({ id: category, name: category.replaceAll('-', ' ').replace(/\b\w/g, m => m.toUpperCase()), description: 'Custom SovereignDocs template category.' });
}
if(!manifest.templates.some(t => t.id === id)){
  manifest.templates.push({
    id,
    category,
    title,
    folder: `${category}/${id}`,
    riskLevel: templateJson.riskLevel,
    jurisdictionSensitive: templateJson.jurisdictionSensitive,
    formats: templateJson.outputFormats,
    tags: [category, 'custom', 'self-help'],
    estimatedCompletionMinutes: templateJson.estimatedCompletionMinutes
  });
  manifest.lastUpdated = new Date().toISOString().slice(0, 10);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(`✅ Template created at template-library/${category}/${id}`);
