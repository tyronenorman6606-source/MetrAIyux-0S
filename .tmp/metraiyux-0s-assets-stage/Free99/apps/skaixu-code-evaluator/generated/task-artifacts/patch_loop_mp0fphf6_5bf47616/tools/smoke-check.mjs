import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const required = ['tab-workspace', 'tab-proof'];
const missing = required.filter(id => !html.includes(id));
if (missing.length) throw new Error('Missing required UI ids: ' + missing.join(', '));
console.log('✅ smoke-check passed');
