import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const agentPath = path.join(root, '.agents/artist-universe-builder/AGENTS.md');
const brainCardPath = path.join(root, 'metraiyux_0s_site/brain/artist-universe-builder-agent.json');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function usage() {
  console.log(`Usage:
  node tools/artist-universe-agent.mjs print
  node tools/artist-universe-agent.mjs card
  node tools/artist-universe-agent.mjs checklist --artist "Artist Name" --zip /path/to/artist.zip --flavor merser3.1 --route /ARTIST
`);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || '' : '';
}

function printAgent() {
  console.log(readFileSync(agentPath, 'utf8'));
}

function printCard() {
  console.log(JSON.stringify(readJson(brainCardPath), null, 2));
}

function checklist() {
  const artist = argValue('--artist') || '<artist name>';
  const zip = argValue('--zip') || '<zip path>';
  const flavor = argValue('--flavor') || 'merser3.1';
  const route = argValue('--route') || `/${artist.replace(/[^A-Za-z0-9]+/g, '').toUpperCase() || 'ARTIST'}`;
  const card = existsSync(brainCardPath) ? readJson(brainCardPath) : null;
  const checklistItems = card?.workflow || [
    'Unpack reference zip',
    'Mine assets and links',
    'Create new build folder',
    'Run MCP mining',
    'Build artist universe',
    'Serve locally',
    'Proof',
    'Deploy through SkyeNet when requested'
  ];

  console.log(JSON.stringify({
    agent: 'artist-universe-builder',
    artist,
    zip,
    flavor,
    route,
    targetFolderHint: `.1/${artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${flavor.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
    workflow: checklistItems,
    requiredReceipts: [
      'MCP_TOOLING_RECEIPT.json',
      'asset-link-inventory receipt',
      'local build/proof receipt',
      'FS27_SKYNET_DEPLOY_RECEIPT.json when deployed'
    ],
    directSkyeNetExample: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/SUPABOY/'
  }, null, 2));
}

const command = process.argv[2] || 'help';
if (command === 'print') printAgent();
else if (command === 'card') printCard();
else if (command === 'checklist') checklist();
else usage();
