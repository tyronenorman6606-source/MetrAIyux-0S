const fs = require('fs');
const vm = require('vm');
const path = require('path');

function makeElement(id = '') {
  const classList = { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
  return {
    id,
    hidden: false,
    style: {},
    dataset: {},
    classList,
    textContent: '',
    innerHTML: '',
    addEventListener(){},
    removeEventListener(){},
    setPointerCapture(){},
    querySelectorAll(){ return []; },
    querySelector(){ return makeElement(); },
    getContext(){ return ctx; },
  };
}

const ctx = new Proxy({}, { get(target, prop) {
  if (prop === 'canvas') return makeElement('canvas');
  if (prop === 'createLinearGradient') return () => ({ addColorStop(){} });
  if (prop === 'measureText') return () => ({ width: 10 });
  return typeof target[prop] === 'undefined' ? (() => {}) : target[prop];
}});

const elements = new Map();
const ids = [
  'appShell','gameCanvas','holdCanvas','nextCanvas','boardStage','overlay','overlayPanel','score','best','level','combo','lines','timeText','shieldText','surgeText','rivalText','todayStreakText','prestigeText','modeLabel','missionText','riftLabel','riftValue','riftFill','riftBtn','riftMobileBtn','installBtn','profileBtn','moodBtn','seasonBtn','liveOpsBtn','academyBtn','rivalsBtn','mapBtn','sanctuaryBtn','relicsBtn','runLabBtn','licenseBtn','codexBtn','leagueBtn','academySideBtn','liveOpsSideBtn','coachBtn','matrixBtn','forgeBtn','protocolBtn','analyticsBtn','companionsBtn','chronicleBtn','aftercareBtn','crownBtn','curatorBtn','finalBtn','moodMiniBtn','moodSideBtn','moodChip','moodSideText','beatSideText','rankChip','muteBtn','pauseBtn','leftBtn','rightBtn','rotateBtn','dropBtn','holdBtn','toast'
];
ids.forEach(id => elements.set(id, makeElement(id)));

const localStore = new Map();
const sandbox = {
  window: {},
  document: {
    body: makeElement('body'),
    getElementById(id){ if (!elements.has(id)) elements.set(id, makeElement(id)); return elements.get(id); },
    addEventListener(){},
  },
  navigator: { serviceWorker: { register(){ return Promise.resolve(); } }, vibrate(){}, clipboard: { writeText(){ return Promise.resolve(); } } },
  localStorage: { getItem(k){ return localStore.get(k) || null; }, setItem(k,v){ localStore.set(k, String(v)); }, removeItem(k){ localStore.delete(k); } },
  Audio: function(){ return { loop:false, preload:'', crossOrigin:'', src:'', volume:0, play(){ return Promise.resolve(); }, pause(){} }; },
  requestAnimationFrame(){ return 1; },
  cancelAnimationFrame(){},
  setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now(){ return 1000; } },
  URL,
  Math,
  Date,
  console,
  prompt(){ return ''; },
  confirm(){ return false; },
  btoa(str){ return Buffer.from(str, 'binary').toString('base64'); },
  atob(str){ return Buffer.from(str, 'base64').toString('binary'); },
  unescape, escape, encodeURIComponent, decodeURIComponent,
};
sandbox.window = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.window.removeEventListener = () => {};
sandbox.window.AudioContext = function(){};
sandbox.window.webkitAudioContext = sandbox.window.AudioContext;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8'), sandbox, { filename: 'game.js' });

if (!localStore.has('nrb_profile_v13')) throw new Error('v13 profile key was not created');
const payload = JSON.parse(localStore.get('nrb_profile_v13'));
if (payload.version !== 13) throw new Error('profile version not v13');
const required = ['license','codex','league','drills','pulse','skillTree','challengeForge','protocol','analytics','companions','chronicle','aftercare','memoryBank','v12','v13'];
const missing = required.filter((key) => !payload[key]);
if (missing.length) throw new Error(`v13 profile systems missing: ${missing.join(', ')}`);
if (!payload.skillTree.owned || !payload.challengeForge.completed || !Array.isArray(payload.analytics.runs) || !payload.companions.owned || !payload.chronicle.completed || !Array.isArray(payload.memoryBank.notes)) throw new Error('legacy nested profile systems malformed');
if (!payload.v12.moodMastery || !payload.v12.crownTrials?.completed || !payload.v12.curator?.purchased || !Array.isArray(payload.v12.receipts?.runs)) throw new Error('v12 nested profile systems malformed');
if (!payload.v13.releaseChecklist || typeof payload.v13.oathSigned !== 'boolean' || typeof payload.v13.sessionQuality !== 'number') throw new Error('v13 nested profile systems malformed');
console.log('runtime smoke passed');
