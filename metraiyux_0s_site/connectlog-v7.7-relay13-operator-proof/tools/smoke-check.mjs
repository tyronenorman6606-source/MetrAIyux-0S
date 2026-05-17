import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requiredFiles = [
  'index.html',
  'app.html',
  'landing.js',
  'styles.css',
  'app.js',
  'qr-lite.js',
  'sw.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'assets/connectlog-logo-192.png',
  'assets/connectlog-logo-512.png',
  'assets/connectlog-logo-master.png',
  'assets/apple-touch-icon.png',
  'assets/favicon.png',
  'assets/connectlog-og.png',
  'seed-data/manifest.json',
  'seed-data/sample-connections.json'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const landingHtml = read('index.html');
const appHtml = read('app.html');
const landingJs = read('landing.js');
const app = read('app.js');
const sw = read('sw.js');
const manifest = JSON.parse(read('manifest.json'));

for (const [name, html] of [['index.html', landingHtml], ['app.html', appHtml]]) {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`${name} duplicate HTML ids: ${[...new Set(duplicates)].join(', ')}`);
}

const appIds = [...appHtml.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const requiredIds = [
  'missionBrief',
  'relationshipQueue',
  'exportAgendaBtn',
  'copyDailyBriefBtn',
  'exportWarmCsvBtn',
  'findDuplicatesBtn',
  'requestPersistenceBtn',
  'copyIntroTemplateBtn',
  'importCsvInput',
  'dedupeDialog',
  'dedupeResults',
  'closeDedupeBtn',
  'qrOutput',
  'scanPayloadInput',
  'seedResults',
  'menuCollapseBtn',
  'profileCardSelect',
  'profileCardGrid',
  'newProfileCardBtn',
  'duplicateProfileCardBtn',
  'deleteProfileCardBtn',
  'profileCardNameInput',
  'profileAudienceInput',
  'profilePhotoInput',
  'profilePhotoPreview',
  'profileWelcomeInput',
  'clearProfilePhotoBtn',

  'relayModeInput',
  'relayOriginInput',
  'relayWorkspaceInput',
  'relayWorkspaceIdInput',
  'relayApiKeyInput',
  'relayOperatorNameInput',
  'relayShareBridgeInput',
  'relaySaveSettingsBtn',
  'relayHealthBtn',
  'relayBridgeHealthBtn',
  'relaySyncCardBtn',
  'relayRefreshRequestsBtn',
  'relayStatsBtn',
  'relayRefreshMessagesBtn',
  'relayCopyWebSocketProofBtn',
  'relayRunActivationProofBtn',
  'relayCopyActivationCurlBtn',
  'relayCopyCardPayloadBtn',
  'relayCreateThreadBtn',
  'relaySyncOutboxBtn',
  'relayRefreshThreadsBtn',
  'relayOpenAdminBtn',
  'relayConnectionStatus',
  'relayThreadList',
  'relayMessageLog',
  'relayMessageInput',
  'relaySendBtn',
  'relayFallbackLog',
  'relayRequestList',
  'relayProofOutput',
  'deploymentStatusDeck',
  'deploymentChecklist',
  'deploymentConfigOutput',
  'runLocalDiagnosticsBtn',
  'copyConnectLogDeployBtn',
  'copyRelayDeployBtn',
  'copyRelayEnvBtn',
  'relayRunPreflightBtn',
  'relayCopyOperatorRunbookBtn',
  'relayCopyBootstrapCurlBtn',
  'relayCopyApiKeyCurlBtn',
  'relayCopyLiveProofBtn',
  'relayExportBridgeConfigBtn',
  'relayImportBridgeConfigInput',
  'relayOperatorRunbookOutput',
];
for (const id of requiredIds) {
  if (!appIds.includes(id)) throw new Error(`Missing required app UI id: ${id}`);
}

for (const selector of [...app.matchAll(/\$\('#([^']+)'\)/g)].map((match) => match[1])) {
  if (!appIds.includes(selector)) throw new Error(`app.js references missing id in app.html: ${selector}`);
}

for (const id of requiredIds) {
  if (!app.includes(`${id}: $('#${id}')`) && !['missionBrief','relationshipQueue','exportAgendaBtn','copyDailyBriefBtn','exportWarmCsvBtn','findDuplicatesBtn','requestPersistenceBtn','copyIntroTemplateBtn','importCsvInput','dedupeDialog','dedupeResults','closeDedupeBtn','qrOutput','scanPayloadInput','seedResults','menuCollapseBtn','profileCardSelect','profileCardGrid','newProfileCardBtn','duplicateProfileCardBtn','deleteProfileCardBtn','profileCardNameInput','profileAudienceInput','profilePhotoInput','profilePhotoPreview','profileWelcomeInput','clearProfilePhotoBtn'].includes(id)) {
    throw new Error(`Required Relay13/deployment control is not bound in app.js: ${id}`);
  }
}

if (!app.includes("const APP_VERSION = '7.7.0'")) throw new Error('APP_VERSION is not 7.7.0');
if (!app.includes("new URL('./app.html', window.location.href)")) throw new Error('ConnectLog exchange links are not pinned to app.html.');
if (!sw.includes('connectlog-shell-v7.7.0')) throw new Error('Service worker cache is not v7.7.0');
if (!sw.includes("'./app.html'")) throw new Error('Service worker does not cache app.html.');
if (!sw.includes("'./landing.js'")) throw new Error('Service worker does not cache landing.js.');
if (manifest.id !== './app.html') throw new Error('Manifest id does not point to app.html.');
if (manifest.start_url !== './app.html') throw new Error('Manifest start_url does not point to app.html.');
if (!manifest.shortcuts?.every((shortcut) => shortcut.url.startsWith('./app.html'))) throw new Error('Manifest shortcuts must launch the actual app.');
if (!landingHtml.includes('data-open-app')) throw new Error('Landing page lacks app launch controls.');
if (!landingHtml.includes('What ConnectLog does')) throw new Error('Landing page does not explain the product capabilities.');
if (!landingJs.includes('connectlog:returnToApp')) throw new Error('Landing return-to-app preference missing.');
if (!landingJs.includes("rawHash.startsWith('#connect=')")) throw new Error('Landing page does not route incoming ConnectLog QR links to app.html.');
if (!landingJs.includes("serviceWorker.register('./sw.js')")) throw new Error('Landing page does not register the service worker.');
if (!appHtml.includes('assets/connectlog-logo-512.png')) throw new Error('Hero logo asset is not wired into app.html.');
if (!appHtml.includes('Card variants')) throw new Error('Card variant management surface is missing.');
if (!appHtml.includes('Welcome message')) throw new Error('Welcome-message setup field is missing.');
if (!appHtml.includes('Upload picture')) throw new Error('Picture upload control is missing.');
if (!app.includes('profileCards')) throw new Error('Multiple profile card state is missing.');
if (!app.includes('photoThumbData')) throw new Error('Photo thumbnail persistence is missing.');
if (!app.includes('welcomeMessage')) throw new Error('Per-card welcome message model is missing.');
if (!app.includes('connectlog-menu-collapsed')) throw new Error('Collapsible menu persistence is missing.');
if (!appHtml.includes('Relay13 bridge')) throw new Error('Relay13 bridge panel is missing.');
if (!app.includes('META_RELAY_CONFIG')) throw new Error('Relay13 config persistence is missing.');
if (!app.includes('Relay13 health check failed from this browser. Delivery queue remains protected.')) throw new Error('Relay13 delivery-integrity path is missing.');
if (!landingHtml.includes('assets/connectlog-logo-512.png')) throw new Error('Hero logo asset is not wired into landing page.');
if (!landingHtml.includes('assets/connectlog-og.png')) throw new Error('Open Graph logo image is not wired into landing page.');
if (!manifest.icons?.some((icon) => icon.src === 'assets/connectlog-logo-512.png')) throw new Error('Manifest is not using the approved logo assets.');
if (/https?:\/\//i.test(landingHtml) || /https?:\/\//i.test(appHtml.replace(/https:\/\/example\.com/g, ''))) throw new Error('Unexpected external runtime URL in HTML.');

const expectedFunctions = [
  'parseCsvContacts',
  'findDuplicateGroups',
  'exportDailyAgenda',
  'renderRelationshipIntelligence',
  'copySmartMessage',
  'requestPersistentStorage',
  'downloadContactVcard',
  'renderProfileCardGrid',
  'setActiveProfileCard',
  'duplicateActiveProfileCard',
  'deleteActiveProfileCard',
  'handleProfilePhotoInput',
  'resizeImageFile',
  'photoDataToVCardLine',
  'toggleMenuCollapsed',

  'loadRelayState',
  'saveRelaySettings',
  'checkRelayHealth',
  'checkRelayBridgeHealth',
  'syncActiveCardToRelay',
  'refreshRelayRequests',
  'fetchRelayStats',
  'refreshActiveRelayMessages',
  'buildRelayWebSocketProofBlock',
  'copyRelayWebSocketProofBlock',
  'buildRelayActivationCurlBlock',
  'copyRelayActivationCurlBlock',
  'runRelayActivationProof',
  'fetchRelayJson',
  'updateRelayRequestStatus',
  'copyActiveRelayCardPayload',
  'buildRelayCardPayload',
  'renderRelayRequests',
  'createRelayThreadFromActiveCard',
  'createRelayConversation',
  'sendRelayMessage',
  'syncRelayOutbox',
  'renderRelayPanel',
  'publicRelayBridgeFromConfig',
  'openMessageThreadForContact',
  'renderDeploymentCommandCenter',
  'runLocalDiagnostics',
  'buildConnectLogDeployBlock',
  'buildRelayDeployBlock',
  'buildRelayEnvBlock',
  'copyConnectLogDeployBlock',
  'copyRelayDeployBlock',
  'copyRelayEnvBlock',
  'relayPreflightChecklist',
  'runRelayPreflightChecklist',
  'buildRelayOperatorRunbookBlock',
  'copyRelayOperatorRunbookBlock',
  'buildRelayBootstrapCurlBlock',
  'copyRelayBootstrapCurlBlock',
  'buildRelayApiKeyCurlBlock',
  'copyRelayApiKeyCurlBlock',
  'buildRelayLiveProofBlock',
  'copyRelayLiveProofBlock',
  'exportRelayBridgeConfig',
  'importRelayBridgeConfig',
];
for (const fn of expectedFunctions) {
  if (!app.includes(`function ${fn}`) && !app.includes(`async function ${fn}`)) throw new Error(`Missing function: ${fn}`);
}

console.log('ConnectLog v7.7 Relay13 operator-proof smoke checks passed.');
