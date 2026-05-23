import { readFile, writeFile } from 'node:fs/promises';

const html = await readFile('metraiyux_0s_site/changelog/index.html', 'utf8');
await writeFile('metraiyux_0s_site/cloudflare/generated-changelog-page.mjs', `export default ${JSON.stringify(html)};\n`);
console.log(JSON.stringify({ ok: true, source: 'metraiyux_0s_site/changelog/index.html', target: 'metraiyux_0s_site/cloudflare/generated-changelog-page.mjs' }, null, 2));
