import { readFile, writeFile, mkdir } from 'node:fs/promises';

const files = [
  'README.md',
  'PROOF_LEDGER.md',
  'SECURITY.md',
  'docs/ARCHITECTURE.md',
  'docs/CAPABILITY_MODEL.md',
  'docs/HOSTED_DEPLOYMENT_CLOUDFLARE.md',
  'docs/V0_2_UPGRADES.md',
  'docs/V0_3_REAL_PLATFORM_UPGRADES.md',
  'docs/V0_4_PAID_PLATFORM_HARDENING.md',
  'docs/V0_5_WORKFLOW_ENGINE.md',
  'docs/PUBLIC_CLAIMS_REGISTER.md',
  'apps/console/index.html',
  'apps/website/index.html',
  'apps/website/public/llms.txt',
  'apps/website/public/ai.md'
];

const bannedPatterns = [
  /production[- ]ready/ig,
  /fully production/ig,
  /enterprise[- ]grade/ig,
  /live provider proof(?! requires| is not|s are only claimed after)/ig,
  /guaranteed delivery/ig,
  /unlimited calls/ig,
  /bank[- ]grade/ig,
  /military[- ]grade/ig,
  /zero risk/ig,
  /cannot fail/ig
];

const requiredTruthPhrases = [
  ['PROOF_LEDGER.md', 'Not yet claimed'],
  ['README.md', 'Live provider calls are only claimed after you run them with real provider credentials'],
  ['docs/PUBLIC_CLAIMS_REGISTER.md', 'Allowed public claim'],
  ['apps/console/index.html', 'Truth mode: configured means configured'],
  ['apps/website/index.html', 'Claim boundary']
];

const failures = [];
for (const file of files) {
  let text = '';
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    failures.push(`${file}: missing`);
    continue;
  }
  for (const pattern of bannedPatterns) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) failures.push(`${file}: banned phrase ${JSON.stringify([...new Set(matches)].join(', '))}`);
  }
}

for (const [file, phrase] of requiredTruthPhrases) {
  const text = await readFile(file, 'utf8').catch(() => '');
  if (!text.includes(phrase)) failures.push(`${file}: missing required truth phrase ${JSON.stringify(phrase)}`);
}

if (failures.length) {
  throw new Error(`Truth gate failed:\n${failures.join('\n')}`);
}

await mkdir('.proof', { recursive: true });
const result = {
  ok: true,
  name: 'public-truth-gate',
  scannedFiles: files,
  bannedPatterns: bannedPatterns.map((pattern) => String(pattern)),
  requiredTruthPhrases: Object.fromEntries(requiredTruthPhrases),
  proves: [
    'public docs and console do not use banned overclaim phrases',
    'proof ledger retains explicit not-yet-claimed section',
    'README tells users live provider success requires live credentials and explicit live proof'
  ],
  does_not_prove: [
    'marketing conversion quality',
    'legal sufficiency of external claims',
    'future edits after this proof run'
  ],
  secrets_exposed: false,
  generatedAt: new Date().toISOString()
};
await writeFile('.proof/truth-gate-result.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
