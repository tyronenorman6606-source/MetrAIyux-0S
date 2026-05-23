import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSecretPack,
  hashFile,
  sha256Bytes,
  writeSecretPack
} from '../packages/skye-secure/skye-secure-core.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skye-secure-e2e');
const sourceRoot = path.join(artifactRoot, 'source');
const restoreRoot = path.join(artifactRoot, 'restored-passphrase');
const restoreKeyRoot = path.join(artifactRoot, 'restored-key');
const keysRoot = path.join(artifactRoot, 'keys');
const passPack = path.join(artifactRoot, 'client-passphrase.skyesecrets');
const grantedPack = path.join(artifactRoot, 'client-granted.skyesecrets');
const revokedPack = path.join(artifactRoot, 'client-revoked.skyesecrets');
const keyPack = path.join(artifactRoot, 'client-key.skyesecrets');
const tamperedManifestPack = path.join(artifactRoot, 'client-tampered-manifest.skyesecrets');
const tamperedCipherPack = path.join(artifactRoot, 'client-tampered-cipher.skyesecrets');
const maliciousPathPack = path.join(artifactRoot, 'client-malicious-path.skyesecrets');
const pathsFile = path.join(artifactRoot, 'paths.txt');
const reportPath = path.join(artifactRoot, 'proof-report.json');
const fakeNeedle = 'FAKE_SKYE_SECURE_NEON_PASSWORD_ONLY_FOR_TESTS';
const env = {
  ...process.env,
  SKYETEST_PASS: 'skye-secure-test-passphrase-with-real-length-2026',
  SKYETEST_PEPPER: 'test-pepper-only-present-in-process-env',
  SKYETEST_WRONG: 'wrong-passphrase-for-negative-proof'
};

function run(args, options = {}) {
  const result = spawnSync(process.execPath, ['tools/skye-secure-packs.mjs', ...args], {
    cwd: repoRoot,
    env,
    encoding: 'utf8'
  });
  assert.equal(result.error, undefined, `${args.join(' ')} could not start: ${result.error?.message || ''}`);
  if (options.expectFailure) {
    assert.notEqual(result.status, 0, `${args.join(' ')} should have failed`);
    return result;
  }
  assert.equal(result.status, 0, `${args.join(' ')} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  return result;
}

function parseStdoutJson(result) {
  return JSON.parse(result.stdout);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readPackJson(file) {
  const raw = fs.readFileSync(file);
  const marker = Buffer.from('SKYESEC2\0', 'utf8');
  const body = raw.subarray(raw.subarray(0, marker.length).equals(marker) ? marker.length : 0).toString('utf8');
  return JSON.parse(body);
}

function writePackJson(file, pack) {
  fs.writeFileSync(file, `SKYESEC2\0${JSON.stringify(pack, null, 2)}\n`, { mode: 0o600 });
}

fs.rmSync(artifactRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(sourceRoot, 'private'), { recursive: true });
fs.writeFileSync(path.join(sourceRoot, '.env'), [
  'DATABASE_URL=postgres://skye:test@localhost:5432/skye',
  `NEON_PASSWORD=${fakeNeedle}`,
  'OPENAI_API_KEY=sk-test-only-not-real-not-long-enough'
].join('\n'));
fs.writeFileSync(path.join(sourceRoot, 'private', 'service-account.credentials.json'), JSON.stringify({
  type: 'service_account',
  project_id: 'skye-secure-test',
  private_key_id: 'fake-key-id',
  private_key: '-----BEGIN PRIVATE KEY-----\\nFAKE_TEST_ONLY\\n-----END PRIVATE KEY-----\\n',
  client_email: 'fake@example.test'
}, null, 2));
fs.writeFileSync(path.join(sourceRoot, 'private', 'token.txt'), 'local recovery token for smoke test only\n');
fs.writeFileSync(pathsFile, ['.env', 'private/service-account.credentials.json', 'private/token.txt', 'missing.optional'].join('\n'));

const keygen = parseStdoutJson(run(['keygen', '--recipient=dev-ci', `--out-dir=${keysRoot}`]));
assert.ok(fs.existsSync(keygen.publicKeyPath), 'public key was not written');
assert.ok(fs.existsSync(keygen.privateKeyPath), 'private key was not written');

const packResult = parseStdoutJson(run([
  'pack',
  `--root=${sourceRoot}`,
  `--paths-file=${pathsFile}`,
  `--out=${passPack}`,
  '--allow-missing',
  '--recipient=owner',
  '--passphrase-env=SKYETEST_PASS',
  '--pepper-env=SKYETEST_PEPPER',
  '--workspace=skye-secure-smoke',
  '--repo=fixture-repo',
  '--client=Test Client',
  '--project=SkyeSecure Smoke Proof',
  '--notes=Automated proof pack with fake secrets only.'
]));
assert.equal(packResult.summary.fileCount, 3);
assert.ok(fs.existsSync(passPack), 'passphrase pack was not written');

const inspect = run(['inspect', `--pack=${passPack}`]);
assert.equal(inspect.stdout.includes(fakeNeedle), false, 'inspect output leaked plaintext fake secret');
assert.equal(read(passPack).includes(fakeNeedle), false, 'encrypted pack leaked plaintext fake secret');

const verify = parseStdoutJson(run([
  'verify',
  `--pack=${passPack}`,
  '--recipient=owner',
  '--passphrase-env=SKYETEST_PASS',
  '--pepper-env=SKYETEST_PEPPER'
]));
assert.equal(verify.payloadVerified, true);
assert.equal(verify.fileCount, 3);

const tamperedManifest = readPackJson(passPack);
tamperedManifest.publicManifest.fileCount = 999;
writePackJson(tamperedManifestPack, tamperedManifest);
run(['inspect', `--pack=${tamperedManifestPack}`], { expectFailure: true });

const tamperedCipher = readPackJson(passPack);
tamperedCipher.encryptedPayload.cipher = `${tamperedCipher.encryptedPayload.cipher[0] === 'A' ? 'B' : 'A'}${tamperedCipher.encryptedPayload.cipher.slice(1)}`;
writePackJson(tamperedCipherPack, tamperedCipher);
run(['inspect', `--pack=${tamperedCipherPack}`], { expectFailure: true });

const evilBytes = Buffer.from('EVIL');
const { pack: maliciousPath } = buildSecretPack({
  payload: {
    files: [{
      path: '../evil.env',
      type: 'file',
      mode: '600',
      size: evilBytes.length,
      mtime: new Date().toISOString(),
      sha256: sha256Bytes(evilBytes),
      dataBase64: evilBytes.toString('base64')
    }]
  },
  recipients: [{
    type: 'passphrase',
    recipientId: 'owner',
    passphrase: env.SKYETEST_PASS,
    pepper: env.SKYETEST_PEPPER
  }],
  metadata: {
    workspaceId: 'skye-secure-smoke',
    repoId: 'fixture-repo',
    fileCount: 1,
    plaintextBytes: evilBytes.length
  }
});
writeSecretPack(maliciousPathPack, maliciousPath);
run([
  'verify',
  `--pack=${maliciousPathPack}`,
  '--recipient=owner',
  '--passphrase-env=SKYETEST_PASS',
  '--pepper-env=SKYETEST_PEPPER'
], { expectFailure: true });

const wrong = run([
  'verify',
  `--pack=${passPack}`,
  '--recipient=owner',
  '--passphrase-env=SKYETEST_WRONG',
  '--pepper-env=SKYETEST_PEPPER'
], { expectFailure: true });
assert.equal(`${wrong.stdout}\n${wrong.stderr}`.includes(fakeNeedle), false, 'wrong-key failure leaked plaintext fake secret');

const dryRestore = parseStdoutJson(run([
  'restore',
  `--pack=${passPack}`,
  `--root=${restoreRoot}`,
  '--recipient=owner',
  '--passphrase-env=SKYETEST_PASS',
  '--pepper-env=SKYETEST_PEPPER',
  '--dry-run'
]));
assert.equal(dryRestore.dryRun, true);
assert.equal(dryRestore.restored.length, 3);
assert.equal(fs.existsSync(path.join(restoreRoot, '.env')), false, 'dry-run wrote a file');

const restore = parseStdoutJson(run([
  'restore',
  `--pack=${passPack}`,
  `--root=${restoreRoot}`,
  '--recipient=owner',
  '--passphrase-env=SKYETEST_PASS',
  '--pepper-env=SKYETEST_PEPPER'
]));
assert.equal(restore.ok, true);
assert.equal(read(path.join(restoreRoot, '.env')), read(path.join(sourceRoot, '.env')));
assert.equal(read(path.join(restoreRoot, 'private', 'token.txt')), read(path.join(sourceRoot, 'private', 'token.txt')));

parseStdoutJson(run([
  'pack',
  `--root=${sourceRoot}`,
  '--paths=.env,private/service-account.credentials.json,private/token.txt',
  `--out=${keyPack}`,
  `--recipient-key=dev-ci:${keygen.publicKeyPath}`,
  '--workspace=skye-secure-smoke',
  '--repo=fixture-repo'
]));
parseStdoutJson(run([
  'restore',
  `--pack=${keyPack}`,
  `--root=${restoreKeyRoot}`,
  '--recipient=dev-ci',
  `--private-key=${keygen.privateKeyPath}`
]));
assert.equal(read(path.join(restoreKeyRoot, '.env')), read(path.join(sourceRoot, '.env')));

const grant = parseStdoutJson(run([
  'grant',
  `--pack=${passPack}`,
  `--out=${grantedPack}`,
  '--recipient=owner',
  '--passphrase-env=SKYETEST_PASS',
  '--pepper-env=SKYETEST_PEPPER',
  `--recipient-key=dev-ci:${keygen.publicKeyPath}`
]));
assert.equal(grant.summary.recipients.some((item) => item.recipientId === 'dev-ci'), true);

const revoked = parseStdoutJson(run([
  'revoke',
  `--pack=${grantedPack}`,
  `--out=${revokedPack}`,
  '--recipient=owner'
]));
assert.equal(revoked.summary.recipients.some((item) => item.recipientId === 'owner'), false);
assert.equal(revoked.summary.recipients.some((item) => item.recipientId === 'dev-ci'), true);

parseStdoutJson(run([
  'verify',
  `--pack=${revokedPack}`,
  '--recipient=dev-ci',
  `--private-key=${keygen.privateKeyPath}`
]));

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  artifactRoot,
  packs: {
    passphrase: { path: passPack, sha256: await hashFile(passPack) },
    key: { path: keyPack, sha256: await hashFile(keyPack) },
    granted: { path: grantedPack, sha256: await hashFile(grantedPack) },
    revoked: { path: revokedPack, sha256: await hashFile(revokedPack) }
  },
  assertions: {
    fakeSecretNotInInspectOutput: true,
    fakeSecretNotInPackBytes: true,
    wrongPassphraseRejected: true,
    tamperedManifestRejected: true,
    tamperedCipherRejected: true,
    pathTraversalPayloadRejected: true,
    passphraseRestoreMatchesSource: true,
    publicKeyRestoreMatchesSource: true,
    grantAddsRecipient: true,
    revokeRemovesOwnerFromNewPack: true
  }
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
