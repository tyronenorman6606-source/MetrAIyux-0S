import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const configPath = process.env.SKYEVAULT_CLI_CONFIG || path.join(os.homedir(), '.skyevault', 'config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const action = process.argv[2] || 'get';
const input = Object.fromEntries((await readStdin()).split(/\r?\n/).filter(Boolean).map((line) => {
  const split = line.indexOf('=');
  return split === -1 ? [line, ''] : [line.slice(0, split), line.slice(split + 1)];
}));

if (action !== 'get') process.exit(0);

const config = readConfig();
const accounts = Array.isArray(config.accounts) ? config.accounts : [];
const host = String(input.host || '').toLowerCase();
const protocol = String(input.protocol || 'http');
const match = accounts.find((account) => {
  try {
    const url = new URL(account.remoteUrl);
    return (url.host.toLowerCase() === host || url.hostname.toLowerCase() === host) && url.protocol.replace(':', '') === protocol;
  } catch {
    return false;
  }
});

if (!match?.token) process.exit(0);

process.stdout.write(`username=x-token\npassword=${match.token}\n`);
