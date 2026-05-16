import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasValidOperatorSession } from './_lib/security.js';

const functionDir = path.dirname(fileURLToPath(import.meta.url));
const ROOT_CANDIDATES = [
  functionDir,
  path.resolve(functionDir, '..'),
  path.resolve(functionDir, '../..'),
  path.resolve(functionDir, '../../..'),
  process.cwd(),
  path.resolve(process.cwd(), 'SkyeVault-Drop'),
  process.env.LAMBDA_TASK_ROOT ? path.resolve(process.env.LAMBDA_TASK_ROOT, '..') : '',
  process.env.LAMBDA_TASK_ROOT ? path.resolve(process.env.LAMBDA_TASK_ROOT, '../..') : '',
  '/var/task',
  '/var/task/SkyeVault-Drop'
].filter(Boolean);
const PAGES = {
  admin: 'internal-pages/admin.html',
  setup: 'internal-pages/setup.html'
};

function html(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive',
      ...headers
    },
    body
  };
}

function redirect(location) {
  return {
    statusCode: 302,
    headers: {
      location,
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive'
    },
    body: ''
  };
}

export async function handler(event) {
  const page = event.queryStringParameters?.page || 'admin';
  const relativeFile = PAGES[page];
  const returnTo = page === 'setup' ? '/setup.html' : '/admin.html';
  if (!relativeFile) return html(404, '<!doctype html><title>Not found</title><h1>Operator page not found</h1>');
  if (!hasValidOperatorSession(event)) {
    return redirect(`/operator.html?return=${encodeURIComponent(returnTo)}`);
  }
  try {
    for (const root of ROOT_CANDIDATES) {
      try {
        const body = await fs.readFile(path.join(root, relativeFile), 'utf8');
        return html(200, body);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    throw new Error(`Could not locate ${relativeFile}.`);
  } catch (error) {
    return html(500, `<!doctype html><title>Operator page error</title><h1>Operator page error</h1><p>${error.message}</p>`);
  }
}
