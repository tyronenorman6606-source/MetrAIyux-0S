import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pages = ["index.html","documents.html","editor.html","templates.html","packages.html","exports.html","security.html","status.html","settings.html"];
const failures = [];
for (const page of pages) {
  try {
    const html = await fs.readFile(path.join(root, page), 'utf8');
    if (page !== 'editor.html' && !html.includes('platform.css')) failures.push(page + ' missing platform.css');
  } catch {
    failures.push(page + ' missing');
  }
}
await fs.access(path.join(root, 'editor.html'));
await fs.access(path.join(root, 'homepage.html'));
await fs.access(path.join(root, 'docs', 'DOCX_SUPPORT.md'));
await fs.access(path.join(root, 'PLATFORM_TRUTH.json'));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('SkyeDocxMax routed platform smoke passed: ' + pages.length + ' surfaces checked.');
