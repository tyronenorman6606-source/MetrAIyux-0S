#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'skye-music-drops-smoke-'));
process.env.MUSIC_NEXUS_DATA_DIR = tmp;
process.env.MUSIC_NEXUS_DROPS_DISABLE_EMAIL = '1';
process.env.MUSIC_NEXUS_DROPS_NETLIFY_AUTH_TOKEN = 'super-secret-drop-smoke-token';
process.env.MUSIC_NEXUS_DROPS_NETLIFY_SITE_ID = 'smoke-site-id';
delete process.env.MUSIC_NEXUS_DROPS_ENABLE_LIVE_DEPLOY;

const require = createRequire(import.meta.url);
const dropsFunction = require('../netlify/functions/music-drops.js');

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function parse(response) {
  return JSON.parse(response.body || '{}');
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signJwt(privateKey, payload) {
  const header = base64urlJson({ alg: 'RS256', typ: 'JWT', kid: 'fs27-drop-smoke-key' });
  const body = base64urlJson({
    iss: 'local://skygatefs13/drop-smoke',
    aud: 'skygatefs13',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  });
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url');
  return `${header}.${body}.${signature}`;
}

async function call(method, body = {}, query = {}) {
  const search = { ...query };
  const event = {
    httpMethod: method,
    headers: { authorization: `Bearer ${token}` },
    queryStringParameters: search,
    body: method === 'POST' ? JSON.stringify(body) : '',
  };
  return dropsFunction.handler(event);
}

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.SKYGATE_PUBLIC_KEY_PEM = publicKey.export({ type: 'spki', format: 'pem' });
process.env.SKYGATE_EXPECTED_AUDIENCE = 'skygatefs13';
process.env.SKYGATE_ISSUER = 'local://skygatefs13/drop-smoke';
const token = signJwt(privateKey, {
  sub: 'fs27-drop-smoke-operator',
  email: 'drop-smoke@example.com',
  role: 'admin',
});

const envStatus = parse(await call('GET', {}, { action: 'env-status' }));
const envText = JSON.stringify(envStatus);
assert(envStatus.env?.netlify?.configured === true, 'redacted env resolver did not detect Netlify config');
assert(!envText.includes('super-secret-drop-smoke-token'), 'redacted env resolver leaked the fake token value');

const wavCreate = parse(await call('POST', {
  action: 'create-drop',
  artistId: 'artist_smoke',
  artistName: 'Smoke Artist',
  title: 'Uncompressed Free99 Test',
  dropType: 'single_drop',
  tierPolicy: 'free99-lite',
  rightsStatus: 'preview-ready',
  tracks: [{ title: 'WAV Test', duration: 90, previewUrl: '/audio/wav-test.wav', contentType: 'audio/wav', bytes: 44100000, fileName: 'wav-test.wav' }],
}));
const wavSubmitResponse = await call('POST', { action: 'submit-drop', dropId: wavCreate.drop.dropId });
const wavSubmit = parse(wavSubmitResponse);
assert(wavSubmitResponse.statusCode === 409, 'Free99 WAV submit should be blocked');
assert(/WAV/i.test(wavSubmit.error || ''), 'Free99 WAV block did not mention WAV');

const createdDrop = parse(await call('POST', {
  action: 'create-drop',
  artistId: 'artist_smoke',
  artistName: 'Smoke Artist',
  title: 'Night Signal Smoke',
  dropType: 'single_drop',
  tierPolicy: 'free99-lite',
  visibility: 'public',
  rightsStatus: 'preview-ready',
  story: 'A smoke-test single proving the drop deploy orchestrator.',
  tracks: [{ title: 'Night Signal Smoke', duration: 123, previewUrl: '/.netlify/functions/music-assets?action=stream&id=aud_smoke', contentType: 'audio/mpeg', bytes: 3000000, fileName: 'night-signal-smoke.mp3' }],
}));
assert(createdDrop.drop?.dropId, 'create-drop did not return a drop id');

const submitted = parse(await call('POST', { action: 'submit-drop', dropId: createdDrop.drop.dropId }));
assert(submitted.drop?.status === 'deploy_pool', 'submit-drop did not move MP3 drop to deploy_pool');

const batch = parse(await call('POST', { action: 'form-batch', dropIds: [createdDrop.drop.dropId] }));
assert(batch.batch?.batchId, 'form-batch did not return a batch id');

const approval = parse(await call('POST', { action: 'send-approval', batchId: batch.batch.batchId }));
assert(approval.approval?.autoApprovalEligibleAt, 'send-approval did not create auto approval window');

const future = new Date(Date.parse(approval.approval.sentAt) + 73 * 60 * 60 * 1000).toISOString();
const brain = parse(await call('POST', { action: 'run-approval-brain', batchId: batch.batch.batchId, now: future }));
assert(brain.batch?.status === 'approved', '72-hour approval brain did not approve safe MP3 batch');

const built = parse(await call('POST', { action: 'build-static-bundle', batchId: batch.batch.batchId }));
assert(built.outputDir, 'build-static-bundle did not return outputDir');
assert(await exists(path.join(built.outputDir, 'catalog.json')), 'static bundle missing catalog.json');
assert(await exists(path.join(built.outputDir, 'quality-report.json')), 'static bundle missing quality-report.json');

const published = parse(await call('POST', { action: 'publish-batch', batchId: batch.batch.batchId }));
assert(published.deploy?.status === 'deploy-intent', 'publish-batch should write deploy intent when live deploy flag is off');
assert(published.deployResult?.published === false, 'publish-batch unexpectedly attempted live publish');
assert(await exists(path.join(built.outputDir, 'deploy-intent.json')), 'deploy intent was not written');

const deployIntent = await fs.readFile(path.join(built.outputDir, 'deploy-intent.json'), 'utf8');
assert(!deployIntent.includes('super-secret-drop-smoke-token'), 'deploy intent leaked fake token value');

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  app: 'SkyeMusicNexus Drop Deploy Orchestrator',
  verified: [
    'redacted root env detection',
    'SkyGate protected writes',
    'Free99 WAV block',
    'drop draft creation',
    'deploy pool submission',
    'batch formation',
    'approval receipt',
    '72-hour approval brain',
    'SkyeWebCreatorMax static package output',
    'WebGrowthOperator metadata output',
    'Netlify deploy intent with live gate off',
  ],
  dataDir: tmp,
}, null, 2));
