import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const failures = [];
const configs = [];
const helpers = {
  daysBetween(a, b){
    const da = new Date(a), db = new Date(b || Date.now());
    if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
    return Math.floor((db - da) / (1000 * 60 * 60 * 24));
  },
  formatDate(v){
    if(!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toISOString().slice(0, 10);
  },
  formatDateTime(v){
    if(!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toISOString();
  }
};
function assert(condition, message){ if(!condition) failures.push(message); }
function makeContext(){
  return vm.createContext({
    window: {
      DOCTOR_OPS: {
        createApp(config){ configs.push(config); }
      }
    },
    console
  });
}

const coreText = await readFile(join(root, 'assets/js/core.js'), 'utf8');
const coreContext = vm.createContext({
  window: {},
  console,
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  document: {},
  location: { search: '' },
  URLSearchParams,
  Blob,
  CustomEvent: class CustomEvent { constructor(type, init){ this.type = type; this.detail = init?.detail; } },
  addEventListener(){},
  dispatchEvent(){},
  navigator: { clipboard: { writeText: async () => undefined } }
});
vm.runInContext(coreText, coreContext, { filename: 'assets/js/core.js' });
assert(typeof coreContext.window.DOCTOR_OPS?.createApp === 'function', 'core exposes createApp');
assert(typeof coreContext.window.DOCTOR_OPS?.toCSV === 'function', 'core exposes toCSV');
assert(coreContext.window.DOCTOR_OPS?.toCSV([{a:1,b:'x'}]).includes('a,b'), 'core CSV helper emits headers');

const appFiles = (await readdir(join(root, 'assets/js/apps'))).filter(f => f.endsWith('.js')).sort();
for (const file of appFiles) {
  const context = makeContext();
  const text = await readFile(join(root, 'assets/js/apps', file), 'utf8');
  vm.runInContext(text, context, { filename: file });
}

assert(configs.length === 13, `expected 13 app configs, found ${configs.length}`);
for (const config of configs) {
  assert(Boolean(config.id), `${config.title || 'unknown'} has id`);
  assert(Boolean(config.title), `${config.id} has title`);
  assert(Array.isArray(config.fields) && config.fields.length >= 6, `${config.id} has meaningful fields`);
  assert(Array.isArray(config.columns) && config.columns.length >= 4, `${config.id} has table columns`);
  assert(Array.isArray(config.sampleRecords) && config.sampleRecords.length >= 1, `${config.id} has sample records`);
  assert(typeof config.compute === 'function', `${config.id} has compute function`);
  assert(typeof config.metrics === 'function', `${config.id} has metrics function`);
  assert(typeof config.preview === 'function', `${config.id} has preview function`);
  assert(typeof config.recordTitle === 'function', `${config.id} has recordTitle function`);
  const computed = config.sampleRecords.map((row, i) => config.compute({ ...row, id: `${config.id}_${i}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, helpers));
  const metrics = config.metrics(computed, helpers);
  assert(Array.isArray(metrics) && metrics.length >= 3, `${config.id} emits dashboard metrics`);
  const preview = config.preview(computed[0], helpers);
  assert(typeof preview === 'string' && preview.length > 80, `${config.id} emits generated packet text`);
  const title = config.recordTitle(computed[0]);
  assert(typeof title === 'string' && title.length > 3, `${config.id} emits record title`);
  if (typeof config.sortRecords === 'function') {
    const sorted = config.sortRecords([...computed], helpers);
    assert(Array.isArray(sorted), `${config.id} sortRecords returns array`);
  }
}

if (failures.length) {
  console.error('❌ Doctor Ops config runtime smoke failed');
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}
console.log('✅ Doctor Ops config runtime smoke passed');
console.log(`- Executed ${configs.length} app configs`);
console.log('- Exercised compute, metrics, preview, recordTitle, and sort hooks');
console.log('- Verified shared core helper export surface');
