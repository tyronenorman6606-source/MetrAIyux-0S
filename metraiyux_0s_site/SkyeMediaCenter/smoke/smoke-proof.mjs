#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

function assert(condition, message){ if(!condition) throw new Error(message); }
function parse(response){ return JSON.parse(response.body || '{}'); }
async function call(handler, { method='GET', query={}, body, authToken } = {}){
  return handler.handler({
    httpMethod: method,
    queryStringParameters: query,
    headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    body: body === undefined ? '' : JSON.stringify(body),
  });
}
function base64urlJson(value){ return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function signJwt(privateKey, payload){
  const header = base64urlJson({ alg:'RS256', typ:'JWT', kid:'fs27-proof-key' });
  const body = base64urlJson({
    iss:'local://skygatefs27/proof',
    aud:'skygatefs27',
    exp:Math.floor(Date.now()/1000)+3600,
    iat:Math.floor(Date.now()/1000),
    ...payload
  });
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url');
  return `${header}.${body}.${signature}`;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skye-mediacenter-proof-'));
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.MEDIA_CENTER_DATA_DIR = tmpDir;
process.env.SKYGATE_PUBLIC_KEY_PEM = publicKey.export({ type: 'spki', format: 'pem' });
process.env.SKYGATEFS27_PUBLIC_KEY_PEM = publicKey.export({ type: 'spki', format: 'pem' });
process.env.SKYGATEFS27_EXPECTED_AUDIENCE = 'skygatefs27';
process.env.SKYGATEFS27_ISSUER = 'local://skygatefs27/proof';
process.env.SKYGATE_LOCAL_SESSION_PRIVATE_KEY_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
process.env.SKYGATE_ENABLE_LOCAL_SESSION_BOOTSTRAP = '1';
process.env.SKYGATE_LOCAL_OPERATOR_EMAIL = 'operator@internal.invalid';
process.env.SKYGATE_LOCAL_OPERATOR_PASSWORD = 'proof-password';
process.env.SKYGATE_LOCAL_OPERATOR_ROLE = 'admin';

const require = createRequire(import.meta.url);
const mediaAssets = require(path.join(root, 'netlify/functions/media-assets.js'));
const mediaFile = require(path.join(root, 'netlify/functions/media-file.js'));
const mediaPublish = require(path.join(root, 'netlify/functions/media-publish.js'));
const mediaSearch = require(path.join(root, 'netlify/functions/media-search.js'));
const mediaStats = require(path.join(root, 'netlify/functions/media-stats.js'));
const session = require(path.join(root, 'netlify/functions/skygate-session.js'));

const rootHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'public/admin.html'), 'utf8');
const browserJs = fs.readFileSync(path.join(root, 'public/media-experience.js'), 'utf8');
const authHelper = fs.readFileSync(path.join(root, 'public/skygate-auth.js'), 'utf8');
const gateHelper = fs.readFileSync(path.join(root, 'gate-session.js'), 'utf8');
assert(rootHtml.includes('data-platform-hardening="p3-experiential"'), 'root surface is missing the P3 experiential marker');
assert(rootHtml.includes('gate-session.js'), 'root surface is missing gate-session.js');
assert(indexHtml.includes('Asset Drop Reactor'), 'public intake is not the rebuilt Asset Drop Reactor');
assert(indexHtml.includes('skygate-auth.js') && indexHtml.includes('../gate-session.js') && indexHtml.includes('media-experience.js'), 'public intake is missing browser auth/gate/app wiring');
assert(adminHtml.includes('Operator Theater') && adminHtml.includes('Operator Review Board'), 'operator theater or review board heading missing');
assert(adminHtml.includes('Execution Board') && adminHtml.includes('Dispatch Board') && adminHtml.includes('Workflow Timeline'), 'operator theater workflow lanes missing');
assert(browserJs.includes('content_base64'), 'browser JS is not wired to the media-assets upload contract');
assert(browserJs.includes('media-assets?action=list'), 'browser JS is not wired to the public recent-assets list');
assert(browserJs.includes('skygate-session'), 'browser JS is missing local SkyGate session bootstrap wiring');
assert(browserJs.includes('requireGateSession'), 'browser JS is missing required gate-session startup');
assert(browserJs.includes('Operator upload') && browserJs.includes('Save Review State'), 'operator browser JS is missing upload/review controls');
assert(browserJs.includes('window.open(asset.url'), 'operator browser JS is not wired to open local asset URLs');
assert(authHelper.includes('window.sessionStorage'), 'skygate-auth.js is not using session-scoped token storage');
assert(authHelper.includes('loginLocalOperator'), 'skygate-auth.js is missing local operator login wiring');
assert(authHelper.includes('logoutSession'), 'skygate-auth.js is missing local session logout wiring');
assert(gateHelper.includes('SkyeMediaCenter is Free99, not ungated.'), 'gate-session.js is missing Free99 gate copy');
assert(gateHelper.includes('x-skye-media-center-free99'), 'gate-session.js is missing Free99 gate header');

const sessionStatusRes = await call(session, { method: 'GET' });
assert(sessionStatusRes.statusCode === 200, `session status failed: ${sessionStatusRes.statusCode}`);
const sessionStatus = parse(sessionStatusRes);
assert(sessionStatus.localProofBootstrap === true, 'session status did not report local proof bootstrap availability');
assert(sessionStatus.localOperatorLogin === true, 'session status did not report local operator login availability');
assert(sessionStatus.localIdentity === true, 'session status did not expose local identity mode');

const sessionRes = await call(session, { method:'POST', body:{ subject:'proof-operator', role:'admin' } });
assert(sessionRes.statusCode === 200, `local session bootstrap failed: ${sessionRes.statusCode}`);
const token = parse(sessionRes).token;
assert(token && token.startsWith('skls_'), 'local session bootstrap did not return a local session token');
const activeSessionRes = await call(session, { method:'GET', authToken: token });
assert(parse(activeSessionRes).activeSession?.source === 'local-identity-session', 'session status did not surface active local session');

const badLoginRes = await call(session, { method:'POST', body:{ grantType:'password', email:'operator@internal.invalid', password:'wrong-password' } });
assert(badLoginRes.statusCode === 401, `invalid local operator login returned ${badLoginRes.statusCode}`);
const operatorLoginRes = await call(session, { method:'POST', body:{ grantType:'password', email:'operator@internal.invalid', password:'proof-password', subject:'proof-operator-login' } });
assert(operatorLoginRes.statusCode === 200, `local operator login failed: ${operatorLoginRes.statusCode}`);
const operatorToken = parse(operatorLoginRes).token;
const revokeRes = await call(session, { method:'DELETE', authToken: operatorToken });
assert(revokeRes.statusCode === 200, `local operator logout failed: ${revokeRes.statusCode}`);

const uploadRes = await call(mediaAssets, { method:'POST', authToken:token, body:{ action:'upload', title:'Proof Asset', type:'document', filename:'proof-asset.txt', content_base64:Buffer.from('proof asset body','utf8').toString('base64'), tags:['proof','certification'], description:'Local proof upload', status:'draft', mimeType:'text/plain; charset=utf-8' } });
assert(uploadRes.statusCode === 201, `asset upload failed: ${uploadRes.statusCode}`);
const uploadData = parse(uploadRes);
const assetId = uploadData.asset?.id;
assert(assetId, 'asset upload did not return an id');
assert(uploadData.asset?.status === 'draft', 'asset upload did not preserve draft status');
assert(uploadData.asset?.review?.status === 'draft', 'asset upload did not initialize draft review state');

const unauthListRes = await call(mediaAssets, { method:'GET', query:{action:'list'} });
assert(unauthListRes.statusCode === 401, `asset list unexpectedly worked without auth: ${unauthListRes.statusCode}`);
const unauthSearchRes = await call(mediaSearch, { method:'GET', query:{q:'proof'} });
assert(unauthSearchRes.statusCode === 401, `media search unexpectedly worked without auth: ${unauthSearchRes.statusCode}`);
const unauthReviewBoardRes = await call(mediaAssets, { method:'GET', query:{action:'review-board'} });
assert(unauthReviewBoardRes.statusCode === 401, `review board unexpectedly worked without auth: ${unauthReviewBoardRes.statusCode}`);

const reviewUpdateRes = await call(mediaAssets, { method:'PUT', authToken:token, body:{ action:'review', id:assetId, owner:'creative-ops', status:'approved', checkpoint:'thumbnail', notes:'Ready for final publish pass' } });
assert(reviewUpdateRes.statusCode === 200, `review update failed: ${reviewUpdateRes.statusCode}`);
assert(parse(reviewUpdateRes).review?.owner === 'creative-ops', 'review update did not persist owner');
const reviewBoardRes = await call(mediaAssets, { method:'GET', query:{action:'review-board'}, authToken:token });
assert(parse(reviewBoardRes).counts?.approved >= 1, 'review board did not count approved assets');

const executionUpdateRes = await call(mediaAssets, { method:'PUT', authToken:token, body:{ action:'execution', id:assetId, owner:'publishing-ops', status:'active', checkpoint:'publish-prep', notes:'Execution queued for storefront rollout', targets:['SkyeWebCreatorMax','SkyeProofx'] } });
assert(executionUpdateRes.statusCode === 200, `execution update failed: ${executionUpdateRes.statusCode}`);
const executionBoardRes = await call(mediaAssets, { method:'GET', query:{action:'execution-board'}, authToken:token });
assert(parse(executionBoardRes).counts?.active >= 1, 'execution board did not count active assets');

const dispatchUpdateRes = await call(mediaAssets, { method:'PUT', authToken:token, body:{ action:'dispatch', id:assetId, owner:'distribution-ops', status:'scheduled', checkpoint:'storefront-scheduled', notes:'Scheduled for staged rollout', targets:['web','social'] } });
assert(dispatchUpdateRes.statusCode === 200, `dispatch update failed: ${dispatchUpdateRes.statusCode}`);
const dispatchBoardRes = await call(mediaAssets, { method:'GET', query:{action:'dispatch-board'}, authToken:token });
assert(parse(dispatchBoardRes).counts?.scheduled >= 1, 'dispatch board did not count scheduled assets');

const listRes = await call(mediaAssets, { method:'GET', query:{action:'list'}, authToken:token });
assert(parse(listRes).assets?.some((asset)=>asset.id === assetId), 'uploaded asset not present in public list');
const searchRes = await call(mediaSearch, { method:'GET', query:{q:'proof', type:'document'}, authToken:token });
assert(parse(searchRes).results?.some((result)=>result.asset?.id === assetId), 'uploaded asset not present in media search results');
const protectedFileRes = await call(mediaFile, { method:'GET', query:{id:assetId} });
assert(protectedFileRes.statusCode === 401, `draft asset unexpectedly served without auth: ${protectedFileRes.statusCode}`);

const publishRes = await call(mediaPublish, { method:'POST', authToken:token, body:{assetId, publishTarget:'web'} });
assert(publishRes.statusCode === 200, `media publish failed: ${publishRes.statusCode}`);
const publishedFileNoAuthRes = await call(mediaFile, { method:'GET', query:{id:assetId} });
assert(publishedFileNoAuthRes.statusCode === 401, `published media file unexpectedly served without auth: ${publishedFileNoAuthRes.statusCode}`);
const fileRes = await call(mediaFile, { method:'GET', query:{id:assetId}, authToken:token });
assert(fileRes.statusCode === 200, `published media file fetch failed: ${fileRes.statusCode}`);
assert(fileRes.isBase64Encoded === true, 'published media file response is not marked base64');
assert(Buffer.from(fileRes.body || '', 'base64').toString('utf8') === 'proof asset body', 'published media file did not return stored asset body');
const statsRes = await call(mediaStats, { method:'GET', authToken:token });
assert(parse(statsRes).totalAssets >= 1, 'media stats did not count uploaded asset');
const fs27Token = signJwt(privateKey, { sub:'fs27-media-customer', email:'fs27-media@internal.invalid', role:'admin' });
const fs27StatsRes = await call(mediaStats, { method:'GET', authToken:fs27Token });
assert(fs27StatsRes.statusCode === 200, `FS27 external SkyGate JWT did not unlock protected stats: ${fs27StatsRes.statusCode}`);
const statsByRevokedTokenRes = await call(mediaStats, { method:'GET', authToken:operatorToken });
assert(statsByRevokedTokenRes.statusCode === 401, `revoked local operator session still worked: ${statsByRevokedTokenRes.statusCode}`);

const deleteRes = await call(mediaAssets, { method:'DELETE', query:{id:assetId}, authToken:token });
assert(deleteRes.statusCode === 200, `asset delete/archive failed: ${deleteRes.statusCode}`);
const workflowTimelineRes = await call(mediaAssets, { method:'GET', query:{action:'workflow-timeline'}, authToken:token });
const workflowTimeline = parse(workflowTimelineRes);
assert(workflowTimeline.ok === true, 'workflow timeline did not return ok');
assert(workflowTimeline.workflowTimeline?.summary?.archive >= 1, 'workflow timeline did not capture archive events');
assert(workflowTimeline.workflowTimeline?.summary?.review >= 1, 'workflow timeline did not capture review events');
assert(workflowTimeline.workflowTimeline?.summary?.execution >= 1, 'workflow timeline did not capture execution events');
assert(workflowTimeline.workflowTimeline?.summary?.dispatch >= 1, 'workflow timeline did not capture dispatch events');

console.log(JSON.stringify({
  ok:true,
  app:'SkyeMediaCenter',
  surface:'P3 experiential media app plus local SkyGate-backed media handlers',
  verified:[
    'P3 root shell exists and routes load the rebuilt platform system',
    'Asset Drop Reactor and Operator Theater are wired to browser auth, Free99 gate overlay, and media contracts',
    'local proof bootstrap and local operator login work',
    'asset list, search, and published file delivery require a gate session',
    'bad operator credentials are rejected and revoked sessions fail protected stats',
    'authenticated upload, review, execution, dispatch, search, publish, file delivery, stats, and archive flows work',
    'workflow timeline captures review, execution, dispatch, and archive events'
  ],
  not_proven:[
    'hosted deployment behavior',
    'real external identity-provider handoff into SkyGate tokens',
    'durable production storage beyond local file-backed runtime',
    'multi-operator hosted synchronization'
  ],
  assetId
}, null, 2));
