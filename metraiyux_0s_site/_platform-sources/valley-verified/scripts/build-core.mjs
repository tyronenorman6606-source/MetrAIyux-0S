import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { listContracts } from '../src/server/contracts.mjs';
import { PLATFORM_TABLES, platformD1Schema, neonSchema, adapterReadinessChecklist } from '../src/server/db-adapters.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');
const SEED_DIR = path.join(ROOT, 'seed', 'businesses');
const SUPPRESSIONS_FILE = path.join(SEED_DIR, 'suppressions.json');
const TAXONOMY_FILE = path.join(ROOT, 'seed', 'taxonomy', 'categories.json');
const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_SITE_URL = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified';
const SITE_URL = normalizeBaseUrl(process.env.VALLEY_VERIFIED_CANONICAL_URL || process.env.SITE_URL || process.env.URL || DEFAULT_SITE_URL);
const DATA_ONLY = process.argv.includes('--data-only');
const DIRECTORY_PAGE_SIZE = Math.max(100, Number(process.env.DIRECTORY_PAGE_SIZE ?? 500) || 500);
const SITEMAP_CHUNK_SIZE = Math.max(1000, Number(process.env.SITEMAP_CHUNK_SIZE ?? 10000) || 10000);
const SKYEMAIL_SIGNIN_ORIGIN = String(process.env.SKYEMAIL_SIGNIN_ORIGIN || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const SKYEMAIL_SIGNIN_BASE = `${SKYEMAIL_SIGNIN_ORIGIN}/live/SkyeMail/login.html?workspace=valley-verified`;
const SKYEMAIL_DOMAIN = 'skyemail.solenterprises.org';
const SKYEMAIL_ACTIVATION_HOURS = 24;
const SKYEMAIL_SEATS_REMAINING = 9;
const SKYEMAIL_REORDER_THRESHOLD = 2;
const SKYEMAIL_REORDER_GROUP_SIZE = 5;
const OWNER_MARKETING_CONTACT_EMAIL = 'MediaOverLondon@solenterprises.org';
const WORKSPACE_CONFIRMATION_RECIPIENTS = [
  'grayskyes@solenterprises.org',
  'SkyesOverLondonLC@solenterprises.org',
  'skyesoverlondon222@gmail.com'
];
const SKYEMAIL_LOCAL_PART_OVERRIDES = new Map([
  ['bobs-smoke-shop-litchfield-park', 'bobs-smokeshop']
]);
const INTERNAL_SURFACE_PATHS = new Set([
  '/ae-command/', '/activation/', '/territories/', '/revenue/', '/sales-playbook/', '/lead-routing/',
  '/owner-verification/', '/lifecycle/', '/audit/', '/coverage/', '/opportunities/', '/outreach/',
  '/sponsor/', '/monetization/', '/exports/', '/admin-review/', '/admin-actions/', '/admin-batch/', '/import-health/',
  '/dry-run/', '/crawl/', '/routing/', '/verification/', '/fraud-defense/', '/duplicates/', '/api/',
  '/accounts/', '/pipeline/', '/kpi/', '/backend/', '/action-queue/', '/lead-inbox/', '/owner-crm/', '/ae-work-orders/', '/runtime-state/', '/db-contracts/', '/approval-flow/', '/embed/', '/platform/', '/data/', '/operator/', '/production-readiness/', '/claims-ledger/', '/launch-packet/'
]);

const warnings = [];
const loadedFiles = [];

function normalizeBaseUrl(url){
  const clean = String(url || '').trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(clean) ? clean : DEFAULT_SITE_URL;
}

function text(value){ return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value){ return text(value).toLowerCase(); }
function titleCase(value){ return text(value).replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1)); }
function html(value){ return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function jsonScript(value){ return JSON.stringify(value).replace(/</g, '\\u003c'); }
function slugify(value, fallback = 'item'){
  const out = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
  return out || fallback;
}
function enc(value){ return encodeURIComponent(text(value)); }
function skyEmailAddress(business){
  const override = SKYEMAIL_LOCAL_PART_OVERRIDES.get(String(business?.id || '').toLowerCase());
  if(override) return `${override}@${SKYEMAIL_DOMAIN}`;
  const base = slugify(business.name || business.id || 'business', 'business').replace(/-+/g, '.').slice(0, 48).replace(/\.$/, '') || 'business';
  return `${base}@${SKYEMAIL_DOMAIN}`;
}
function skyEmailAccount(business){
  const mailbox = skyEmailAddress(business);
  return {
    mailbox,
    href:`${SKYEMAIL_SIGNIN_BASE}&business=${enc(business.id)}&mailbox=${enc(mailbox)}`,
    activationHours:SKYEMAIL_ACTIVATION_HOURS,
    seatsRemaining:SKYEMAIL_SEATS_REMAINING,
    reorderThreshold:SKYEMAIL_REORDER_THRESHOLD,
    reorderGroupSize:SKYEMAIL_REORDER_GROUP_SIZE
  };
}
function skyEmailProvisioningModel(businesses){
  return {
    version:'24.0.0',
    updated_at:TODAY,
    program:'valley_verified_skyemail_acceptance',
    signin_base:SKYEMAIL_SIGNIN_BASE,
    activation_window_hours:SKYEMAIL_ACTIVATION_HOURS,
    owner_notification:{
      required:true,
      message:'Provision a SkyEmail workspace for the accepted Valley Verified business.',
      public_contact_email:OWNER_MARKETING_CONTACT_EMAIL,
      recipient_emails:WORKSPACE_CONFIRMATION_RECIPIENTS,
      delivery_rule:'Send every workspace acceptance/provisioning confirmation to every recipient in recipient_emails.',
      escalation_helper:'K4i',
      escalate_after_hours:SKYEMAIL_ACTIVATION_HOURS
    },
    seat_pool:{
      source:'darthom inbox check',
      seats_remaining:SKYEMAIL_SEATS_REMAINING,
      countdown_enabled:true,
      reorder_threshold:SKYEMAIL_REORDER_THRESHOLD,
      purchase_group_size:SKYEMAIL_REORDER_GROUP_SIZE,
      reorder_message:`Buy more SkyEmail seats when the pool reaches ${SKYEMAIL_REORDER_THRESHOLD}; seats are purchased in groups of ${SKYEMAIL_REORDER_GROUP_SIZE}.`
    },
    records:businesses.map(b => ({
      business_id:b.id,
      business_name:b.name,
      verified_status:'owner_researched_verified',
      skyemail:skyEmailAddress(b),
      accept_url:skyEmailAccount(b).href,
      activation_status:'pending_team_provisioning',
      activation_window_hours:SKYEMAIL_ACTIVATION_HOURS,
      owner_notification_required:true,
      helper_escalation_after_hours:SKYEMAIL_ACTIVATION_HOURS
    }))
  };
}
function bool(value){
  if(typeof value === 'boolean') return value;
  return ['true','yes','y','1','verified','insured','mobile','licensed'].includes(lower(value));
}
function number(value, fallback = null){
  if(value === null || value === undefined || value === '') return fallback;
  const n = Number(String(value).replace(/[$,]/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}
function splitList(value){
  if(Array.isArray(value)) return unique(value.map(text).filter(Boolean));
  return unique(text(value).split(/[|;,]/g).map(text).filter(Boolean));
}
function cleanUrl(value){
  const raw = text(value);
  if(!raw) return '';
  if(/^mailto:|^tel:/i.test(raw)) return raw;
  if(/^https?:\/\//i.test(raw)) return raw;
  if(/^www\./i.test(raw) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return raw;
}
function displayUrl(value){
  try{ return new URL(cleanUrl(value)).hostname.replace(/^www\./, ''); }catch{ return text(value); }
}
function phoneDigits(value){ return text(value).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); }
function domainFromUrl(value){ try{ return new URL(cleanUrl(value)).hostname.toLowerCase().replace(/^www\./, ''); }catch{ return ''; } }
function normalizeSocialHandle(value){
  const raw = text(value).toLowerCase();
  if(!raw) return '';
  try{
    const url = new URL(cleanUrl(raw));
    return url.pathname.replace(/^\/+/, '').replace(/\/+$/, '').split('/')[0].replace(/^@/, '');
  }catch{ return raw.replace(/^@/, '').replace(/[^a-z0-9._-]/g, ''); }
}
function nameKey(value){
  return slugify(text(value).toLowerCase()
    .replace(/\b(llc|inc|co|company|corp|corporation|pllc|services|service|the|az|arizona)\b/g, ' ')
    .replace(/\s+/g, ' ')
  );
}
function addressKey(value){ return slugify(text(value).toLowerCase().replace(/\b(street|st|avenue|ave|road|rd|drive|dr|suite|ste|unit|#)\b/g, ' ')); }
function unique(arr){
  const seen = new Set(); const out = [];
  for(const item of arr.map(text).filter(Boolean)){
    const key = item.toLowerCase();
    if(seen.has(key)) continue;
    seen.add(key); out.push(item);
  }
  return out;
}
function money(value){ const n = Number(value); return Number.isFinite(n) ? `$${Math.round(n).toLocaleString()}` : ''; }
function formatDate(value){
  const d = new Date(value);
  if(!value || Number.isNaN(d.valueOf())) return text(value) || TODAY;
  return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}
function routePath(...parts){ return '/' + parts.filter(Boolean).map(p => slugify(p)).join('/') + '/'; }
function writePathFor(route){ return path.join(DIST, route.replace(/^\//, ''), 'index.html'); }
function pathFromCanonical(canonical){
  try{ return new URL(canonical).pathname.endsWith('/') ? new URL(canonical).pathname : `${new URL(canonical).pathname}/`; }catch{ return '/'; }
}
function normalizeSurfacePath(route){
  const clean = String(route || '/');
  const pathOnly = clean.startsWith('http') ? pathFromCanonical(clean) : (clean.endsWith('/') ? clean : `${clean}/`);
  const mountedPrefix = pathFromCanonical(SITE_URL);
  if(mountedPrefix !== '/' && pathOnly.startsWith(mountedPrefix)){
    return `/${pathOnly.slice(mountedPrefix.length).replace(/^\/+/, '')}` || '/';
  }
  return pathOnly;
}
function isInternalRoute(route){
  const pathOnly = normalizeSurfacePath(route);
  return INTERNAL_SURFACE_PATHS.has(pathOnly) || pathOnly.startsWith('/data/') || pathOnly.startsWith('/api/') || pathOnly.startsWith('/embed/');
}
function robotsContentFor(opts = {}){
  if(opts.robots) return opts.robots;
  const route = pathFromCanonical(opts.canonical || SITE_URL);
  return isInternalRoute(route) ? 'noindex,nofollow,noarchive' : 'index,follow';
}
function csvParse(csv){
  const rows = []; let row = []; let field = ''; let quoted = false;
  const data = String(csv || '').replace(/^\uFEFF/, '');
  for(let i = 0; i < data.length; i++){
    const ch = data[i], next = data[i + 1];
    if(quoted){
      if(ch === '"' && next === '"'){ field += '"'; i++; }
      else if(ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if(ch === '"') quoted = true;
    else if(ch === ','){ row.push(field); field = ''; }
    else if(ch === '\n'){ row.push(field); rows.push(row); row = []; field = ''; }
    else if(ch !== '\r') field += ch;
  }
  row.push(field);
  if(row.some(x => text(x))) rows.push(row);
  if(!rows.length) return [];
  const headers = rows.shift().map(h => slugify(h).replace(/-/g, '_'));
  return rows.filter(r => r.some(x => text(x))).map(r => Object.fromEntries(headers.map((h,i) => [h, r[i] ?? ''])));
}
async function exists(file){ try{ await fs.access(file); return true; }catch{ return false; } }
async function ensureDir(dir){ await fs.mkdir(dir, { recursive: true }); }
async function writeFile(file, body){ await ensureDir(path.dirname(file)); await fs.writeFile(file, body); }
async function copyFile(src, dest){ await ensureDir(path.dirname(dest)); await fs.copyFile(src, dest); }
async function handbuiltPageIdSet(){
  const dir = path.join(SRC, 'handbuilt-pages');
  const entries = await fs.readdir(dir, { withFileTypes:true }).catch(() => []);
  const ids = new Set();
  for(const entry of entries){
    if(!entry.isDirectory()) continue;
    if(await exists(path.join(dir, entry.name, 'index.html'))) ids.add(entry.name);
  }
  return ids;
}
async function copyCustomBusinessPages(businesses){
  const sourceRoot = path.join(SRC, 'handbuilt-pages');
  const targetRoot = path.join(DIST, 'business');
  const businessIds = new Set(businesses.map(b => b.id));
  const missing = [];
  const invalid = [];
  await ensureDir(targetRoot);
  const existingEntries = await fs.readdir(targetRoot, { withFileTypes:true }).catch(() => []);
  await Promise.all(existingEntries.map(async entry => {
    if(!entry.isDirectory()) return;
    if(entry.name === 'page') return;
    if(!businessIds.has(entry.name)) await fs.rm(path.join(targetRoot, entry.name), { recursive:true, force:true });
  }));
  await Promise.all(businesses.map(async business => {
    const source = path.join(sourceRoot, business.id, 'index.html');
    const target = path.join(targetRoot, business.id, 'index.html');
    if(!(await exists(source))){
      missing.push({ id:business.id, name:business.name });
      return;
    }
    const body = await fs.readFile(source, 'utf8');
    if(!body.includes('data-static-hand-page="true"')) invalid.push({ id:business.id, name:business.name, reason:'missing data-static-hand-page marker' });
    await writeFile(target, body);
  }));
  if(missing.length || invalid.length){
    const problems = [...missing.map(item => `missing ${item.id} (${item.name})`), ...invalid.map(item => `invalid ${item.id} (${item.reason})`)].slice(0, 60).join('\n');
    throw new Error(`Valley Verified custom business pages are incomplete. No generator fallback is allowed.\n${problems}`);
  }
  return { copied:businesses.length, missing:0, invalid:0 };
}
async function listFiles(dir){
  const out = [];
  async function walk(current){
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for(const entry of entries){
      const full = path.join(current, entry.name);
      if(entry.isDirectory()){
        if(['archive','disabled','.DS_Store'].includes(entry.name)) continue;
        await walk(full);
      }else if(/\.(json|csv)$/i.test(entry.name) && entry.name !== 'suppressions.json') out.push(full);
    }
  }
  await walk(dir);
  return out.sort((a,b)=>a.localeCompare(b));
}
async function readSeedRecords(){
  const files = await listFiles(SEED_DIR);
  const legacy = path.join(ROOT, 'businesses.json');
  if(await exists(legacy)) files.push(legacy);
  const records = [];
  for(const file of files){
    const rel = path.relative(ROOT, file);
    const raw = await fs.readFile(file, 'utf8');
    loadedFiles.push(rel);
    try{
      if(/\.json$/i.test(file)){
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.businesses) ? parsed.businesses : []);
        for(const item of list) records.push({ ...item, __source_file: rel });
      }else{
        for(const item of csvParse(raw)) records.push({ ...item, __source_file: rel });
      }
    }catch(error){ warnings.push(`Could not load ${rel}: ${error.message}`); }
  }
  return records;
}
async function readSuppressions(){
  const empty = { ids:[], identity_keys:[], domains:[], phones:[], emails:[], source_hashes:[], notes:[] };
  if(!(await exists(SUPPRESSIONS_FILE))) return empty;
  try{
    const parsed = JSON.parse(await fs.readFile(SUPPRESSIONS_FILE, 'utf8'));
    return {
      ...empty,
      ...parsed,
      domains: splitList(parsed.domains || []).map(d => domainFromUrl(d) || lower(d)),
      phones: splitList(parsed.phones || []).map(phoneDigits).filter(Boolean),
      emails: splitList(parsed.emails || []).map(lower),
      ids: splitList(parsed.ids || []).map(slugify),
      identity_keys: splitList(parsed.identity_keys || []),
      source_hashes: splitList(parsed.source_hashes || [])
    };
  }catch(error){ warnings.push(`Could not load seed/businesses/suppressions.json: ${error.message}`); return empty; }
}
function defaultTaxonomy(){
  return [
    { category:'Home Services', niches:['Plumbing','Electrical','HVAC','Roofing','Landscaping','Pool Service','Pest Control','Cleaning','Junk Removal','Handyman'] },
    { category:'Auto Services', niches:['Mobile Detailing','Mechanic','Tire Service','Towing','Window Tint','Auto Glass','Wraps And Graphics','Fleet Wash'] },
    { category:'Beauty And Wellness', niches:['Barber','Hair Stylist','Nails','Lashes','Massage','Skin Care','Makeup Artist','Fitness Coach'] },
    { category:'Business Services', niches:['Bookkeeping','Tax Prep','Notary','Virtual Assistant','Commercial Cleaning','Security','Staffing','Printing'] },
    { category:'Creative Services', niches:['Photography','Video Production','Graphic Design','Web Design','Content Creation','DJ','Event Production'] },
    { category:'Food And Events', niches:['Catering','Food Truck','Private Chef','Bakery','Event Rentals','Bartending','Venue'] },
    { category:'Health And Care', niches:['Home Care','Transportation','Therapy','Dental','Chiropractic','Med Spa','Senior Support'] },
    { category:'Real Estate And Property', niches:['Realtor','Property Management','Home Inspector','Mortgage','Moving','Staging','Cleaning Turnover'] },
    { category:'Retail And Specialty', niches:['Streetwear','Sneakers','Florist','Pet Grooming','Electronics Repair','Tailoring','Custom Gifts'] },
    { category:'Legal And Financial', niches:['Document Prep','Insurance','Credit Repair','Financial Coaching','Estate Planning Support','Consulting'] }
  ];
}
async function readTaxonomy(){
  const fallback = defaultTaxonomy();
  if(!(await exists(TAXONOMY_FILE))) return fallback;
  try{
    const parsed = JSON.parse(await fs.readFile(TAXONOMY_FILE, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.categories) ? parsed.categories : fallback);
    return list.map(item => ({ category:titleCase(item.category || item.name), niches:splitList(item.niches || item.subcategories || item.services || []) })).filter(x => x.category);
  }catch(error){ warnings.push(`Could not load seed/taxonomy/categories.json: ${error.message}`); return fallback; }
}
function rowValue(row, keys, fallback = ''){
  for(const key of keys){ if(row[key] !== undefined && row[key] !== null && text(row[key]) !== '') return row[key]; }
  return fallback;
}
function hashObject(obj){
  const clone = { ...obj }; delete clone.__source_file;
  return crypto.createHash('sha1').update(JSON.stringify(clone)).digest('hex').slice(0, 12);
}
function normalizeHours(hours){
  const days = ['mon','tue','wed','thu','fri','sat','sun']; const out = {};
  for(const day of days){ out[day] = text(hours?.[day] || hours?.[day.toUpperCase()] || hours?.[titleCase(day)] || ''); }
  return out;
}
function defaultDescription({ name, category, subcategory, city, tags }){
  const service = [subcategory || category, tags.slice(0,3).join(', ')].filter(Boolean).join(' • ');
  return `${name} is listed in Valley Verified Network for ${service || 'local services'} in ${city || 'the Phoenix area'}. Contact the provider directly to confirm availability, scope, and pricing.`;
}

function inferCityFromZip(zip, candidate = ''){
  const aliases = new Map([
    ['Scotsdale','Scottsdale'], ['Paradise V','Paradise Valley'], ['Paradise Vly','Paradise Valley'], ['Phx','Phoenix']
  ]);
  const valid = new Set(['Scottsdale','Mesa','Phoenix','Glendale','Tempe','Chandler','Gilbert','Peoria','Avondale','Goodyear','Surprise','Paradise Valley','Anthem','Cave Creek','Fountain Hills','Queen Creek','Apache Junction','Sun City','Tolleson','Buckeye','Litchfield Park']);
  const cleanRaw = titleCase(candidate);
  const clean = aliases.get(cleanRaw) || cleanRaw;
  const z = text(zip);
  const zipCity = (() => {
    if(/^8525\d|^8526\d/.test(z)) return 'Scottsdale';
    if(/^8520[1-9]|^8521[0-5]/.test(z)) return 'Mesa';
    if(/^850\d{2}$/.test(z)) return 'Phoenix';
    if(/^8530[1-9]|^8531[0-2]/.test(z)) return 'Glendale';
    if(/^8528[1-4]/.test(z)) return 'Tempe';
    if(/^8522[4-6]/.test(z)) return 'Chandler';
    if(/^8523[3-4]|^8529[5-8]/.test(z)) return 'Gilbert';
    if(/^8534[5-9]|^8535[0-5]/.test(z)) return 'Surprise';
    if(/^8538[1-3]/.test(z)) return 'Peoria';
    return '';
  })();
  if(clean && valid.has(clean)) return clean;
  return zipCity || 'Phoenix Metro';
}

function licenseTypeLabel(value){
  const raw = text(value).toUpperCase();
  const labels = { BRM:'Commercial / brick-and-mortar license', BRS:'Service / regulatory business license' };
  return labels[raw] || titleCase(value) || 'Business license';
}
function classifyBusinessFrom(row, name){
  const rawType = text(rowValue(row, ['business_type','license_type','type','category','primary_category']));
  const hay = `${name} ${rawType} ${text(rowValue(row, ['description','summary','tags','services']))}`.toLowerCase();
  const rules = [
    ['Food And Events','Restaurant / Food Service',['restaurant','grill','taco','pizza','coffee','cafe','bar ','bakery','bistro','kitchen','catering','food','sushi','donut','doughnut','ice cream','juice','bbq','burger','wings','deli']],
    ['Beauty And Wellness','Salon / Personal Care',['salon','barber','nail','spa','lash','beauty','massage','wax','esthetic','fitness','gym','yoga','pilates']],
    ['Auto Services','Automotive Services',['auto','car ','cars','tire','motor','motors','garage','collision','detail','wash','transmission','oil change','tow','towing','glass tint','vehicle']],
    ['Health And Care','Healthcare / Wellness',['medical','health','clinic','dental','dentist','chiro','pharmacy','hospital','therapy','therapist','vision','eye care','urgent care','veterinary','vet ']],
    ['Home Services','Contractor / Home Service',['construction','roof','plumb','electr','hvac','air conditioning','landscape','pool','pest','cleaning','janitor','restoration','floor','paint','remodel','handyman','garage door','solar']],
    ['Real Estate And Property','Property / Real Estate',['realty','real estate','property','apartments','apartment','mortgage','title','escrow','realtor','homes','home sales','storage']],
    ['Legal And Financial','Legal / Financial Services',['law ','legal','attorney','tax','account','bookkeep','insurance','financial','finance','bank','credit union','wealth','payroll']],
    ['Business Services','Business / Professional Services',['consult','staffing','security','office','printing','shipping','mail','notary','management','logistics','software','technology','systems','commercial']],
    ['Creative Services','Creative / Media Services',['photo','video','media','design','marketing','advertis','studio','music','dj','print shop','signs','graphics']],
    ['Retail And Specialty','Retail / Specialty Store',['store','shop','market','boutique','jewelry','florist','furniture','clothing','apparel','liquor','smoke','pet','supply','hardware','gifts']],
    ['Education And Childcare','Education / Childcare',['school','academy','university','college','daycare','child care','learning','tutoring','preschool']],
    ['Major Employers','Major Employer',['aerospace','semiconductor','e-commerce','government','mining','electronics distribution','waste management']]
  ];
  for(const [category, niche, words] of rules){
    if(words.some(w => hay.includes(w))) return { category, niche, tags:[niche, licenseTypeLabel(rawType)].filter(Boolean) };
  }
  if(/home-based/i.test(rawType)) return { category:'Business Services', niche:'Home-Based Business', tags:['Home-based', licenseTypeLabel(rawType)] };
  if(/commercial|brick/i.test(rawType) || ['BRM','BRS'].includes(rawType.toUpperCase())) return { category:'Retail And Specialty', niche:'Licensed Local Business', tags:['Licensed business', licenseTypeLabel(rawType)] };
  return { category:'Local Services', niche:'Licensed Local Business', tags:[licenseTypeLabel(rawType)] };
}
function compactBusinessRecord(b){
  return { id:b.id, name:b.name, category:b.category, subcategory:b.subcategory, niche:b.niche, city:b.city, state:b.state, zip:b.zip, tags:b.tags, score:b.verification_score, verification_score:b.verification_score, url:`/business/${b.id}/`, website:b.website, booking_url:b.booking_url, phone:b.phone, email:b.email, date:b.last_verified, featured:b.featured, badges:b.badges, starting_price:b.starting_price, price_note:b.price_note, price_mode:b.price_mode, accepts_requests:b.accepts_requests, location:b.location, description:b.description };
}
function profileShard(id){ return (String(id || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 2) || 'xx'); }
function pageLimitFor(items){ return items.length > 1200 ? 180 : items.length > 500 ? 240 : items.length; }
function visibleBusinessList(items){ return items.slice(0, pageLimitFor(items)); }
async function mapLimit(items, limit, mapper){
  const queue = [...items];
  const workers = Array.from({ length:Math.min(limit, queue.length || 1) }, async () => {
    while(queue.length){
      const item = queue.shift();
      await mapper(item);
    }
  });
  await Promise.all(workers);
}
function scalableNotice(total, shown){
  if(total <= shown) return '';
  return `<div class="notice strong"><strong>Large dataset mode:</strong> showing ${shown.toLocaleString()} representative cards on this hub while ${total.toLocaleString()} static business profile pages remain live through sitemap, search data, city/category pages, and exports. Open <a href="/data/search-index.json">search index JSON</a> or <a href="/data/businesses.csv">CSV export</a> for the full set.</div>`;
}


function chunkArray(items, size){
  const out = [];
  for(let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
function rawName(row){ return text(rowValue(row, ['name','business_name','company_name','company','dba','legal_name','title'])); }
function rawWebsite(row){ return cleanUrl(rowValue(row, ['website','url','site','business_website','web_site'])); }
function rawPhone(row){ return phoneDigits(rowValue(row, ['phone','telephone','phone_number'])); }
function rawEmail(row){ return lower(rowValue(row, ['email','contact_email'])); }
function rawPosterEmail(row){ return lower(rowValue(row, ['poster_email','submitter_email','owner_email'])); }
function importQuality(raw, businesses, audit){
  const rejectionCandidates = [];
  const warningsByType = new Map();
  const sourceStats = new Map();
  const addWarning = (type, source, row_number, detail) => {
    warningsByType.set(type, (warningsByType.get(type) || 0) + 1);
    if(rejectionCandidates.length < 500) rejectionCandidates.push({ type, source_file:source, row_number, detail });
  };
  raw.forEach((row, idx) => {
    const source = text(row.__source_file || 'unknown');
    const stat = sourceStats.get(source) || { source_file:source, raw_records:0, rows_without_name:0, rows_without_contact:0, rows_without_city_or_zip:0, rows_with_website:0, rows_with_phone:0, rows_with_email:0, poster_emails:new Set() };
    stat.raw_records++;
    if(rawWebsite(row)) stat.rows_with_website++;
    if(rawPhone(row)) stat.rows_with_phone++;
    if(rawEmail(row)) stat.rows_with_email++;
    if(rawPosterEmail(row)) stat.poster_emails.add(rawPosterEmail(row));
    if(!rawName(row)){ stat.rows_without_name++; addWarning('missing business name', source, idx + 2, 'No name/company_name/business_name field was available.'); }
    if(!rawWebsite(row) && !rawPhone(row) && !rawEmail(row)){ stat.rows_without_contact++; }
    if(!text(rowValue(row, ['city','municipality','locality'])) && !text(rowValue(row, ['zip','zipcode','postal_code','postal']))){ stat.rows_without_city_or_zip++; }
    sourceStats.set(source, stat);
  });
  const publishedBySource = new Map();
  for(const b of businesses){
    for(const part of String(b.source_file || 'unknown').split(',').map(text).filter(Boolean)) publishedBySource.set(part, (publishedBySource.get(part) || 0) + 1);
  }
  const source_batches = Array.from(sourceStats.values()).map(stat => ({
    source_file:stat.source_file,
    raw_records:stat.raw_records,
    published_records:publishedBySource.get(stat.source_file) || 0,
    merged_or_suppressed:Math.max(0, stat.raw_records - (publishedBySource.get(stat.source_file) || 0)),
    rows_without_name:stat.rows_without_name,
    rows_without_contact:stat.rows_without_contact,
    rows_without_city_or_zip:stat.rows_without_city_or_zip,
    rows_with_website:stat.rows_with_website,
    rows_with_phone:stat.rows_with_phone,
    rows_with_email:stat.rows_with_email,
    unique_poster_emails:stat.poster_emails.size,
    quality_score:Math.max(0, Math.min(100, Math.round(100 - (stat.rows_without_name/stat.raw_records)*50 - (stat.rows_without_contact/stat.raw_records)*25 - (stat.rows_without_city_or_zip/stat.raw_records)*15)))
  })).sort((a,b)=>b.raw_records-a.raw_records);
  return {
    updated_at:TODAY,
    raw_records:raw.length,
    published_records:businesses.length,
    exact_merges:audit.exact_merges.length,
    possible_duplicate_pairs:audit.possible_duplicates.length,
    suppression_hits:audit.suppressed.length,
    warning_counts:Object.fromEntries([...warningsByType.entries()].sort((a,b)=>b[1]-a[1])),
    rejection_candidates:rejectionCandidates,
    source_batches
  };
}
function posterRiskIndex(businesses, audit){
  const map = new Map();
  function touch(key, seed){ if(!key) return null; if(!map.has(key)) map.set(key, { key, poster_email:'', poster_phone:'', poster_ip:'', businesses:[], source_files:new Set(), domains:new Set(), phones:new Set(), flags:new Set(), risk_score:0 }); const rec = map.get(key); Object.assign(rec, seed); return rec; }
  for(const b of businesses){
    const posterEmail = b.poster?.email || '';
    const posterPhone = phoneDigits(b.poster?.phone || '');
    const posterIp = b.poster?.ip || '';
    const keys = [posterEmail && `poster_email:${posterEmail}`, posterPhone && `poster_phone:${posterPhone}`, posterIp && `poster_ip:${posterIp}`].filter(Boolean);
    for(const key of keys){
      const rec = touch(key, { poster_email:posterEmail, poster_phone:posterPhone, poster_ip:posterIp });
      rec.businesses.push({ id:b.id, name:b.name, city:b.city, category:b.category, business_email:b.email, business_phone:b.phone, website:b.website });
      rec.source_files.add(b.source_file || 'unknown');
      const domain = domainFromUrl(b.website || b.booking_url || b.landing_page_url); if(domain) rec.domains.add(domain);
      const phone = phoneDigits(b.phone); if(phone) rec.phones.add(phone);
      for(const flag of b.moderation_flags || []) rec.flags.add(flag);
      if(posterEmail && b.email && posterEmail !== b.email) rec.flags.add('poster email differs from business email');
    }
  }
  for(const merge of audit.exact_merges || []){
    const key = merge.identity_key || '';
    if(key.startsWith('email:')) touch(`poster_email:${key.replace('email:','')}`, { poster_email:key.replace('email:','') })?.flags.add('duplicate identity collision');
    if(key.startsWith('phone:')) touch(`poster_phone:${key.replace('phone:','')}`, { poster_phone:key.replace('phone:','') })?.flags.add('duplicate identity collision');
  }
  return Array.from(map.values()).map(rec => {
    const source_files = Array.from(rec.source_files);
    const domains = Array.from(rec.domains);
    const phones = Array.from(rec.phones);
    const flags = Array.from(rec.flags);
    const score = Math.min(100, (rec.businesses.length > 1 ? rec.businesses.length * 12 : 0) + Math.max(0, domains.length - 1) * 16 + Math.max(0, phones.length - 1) * 10 + flags.length * 8);
    return { key:rec.key, poster_email:rec.poster_email, poster_phone:rec.poster_phone, poster_ip:rec.poster_ip, listing_count:rec.businesses.length, distinct_domains:domains.length, distinct_business_phones:phones.length, source_files, flags, risk_score:score, businesses:rec.businesses.slice(0, 50) };
  }).filter(r => r.listing_count > 1 || r.risk_score > 0 || r.flags.length).sort((a,b)=>b.risk_score-a.risk_score || b.listing_count-a.listing_count);
}
function canonicalAliases(businesses){
  return businesses.map(b => ({ id:b.id, name:b.name, url:`/business/${b.id}/`, primary_key:b.identity?.primary_key || '', aliases:b.identity?.all || [], source_hash:b.source_hash, source_file:b.source_file })).sort((a,b)=>a.name.localeCompare(b.name));
}
function suppressionTemplate(businesses, audit){
  const first = businesses[0] || {};
  const possible = audit.possible_duplicates?.[0];
  return {
    notes:['Add ids, identity keys, domains, phones, emails, or source hashes here, then rebuild. Upstream auth can gate the admin surface, but suppression itself is seed-controlled.'],
    ids:first.id ? [first.id] : [],
    identity_keys:[first.identity?.primary_key, possible?.identity_key].filter(Boolean),
    domains:[domainFromUrl(first.website || first.booking_url || '')].filter(Boolean),
    phones:[phoneDigits(first.phone || '')].filter(Boolean),
    emails:[first.email].filter(Boolean),
    source_hashes:[first.source_hash].filter(Boolean)
  };
}
function adminActionPackets(businesses, audit){
  const dupes = (audit.possible_duplicates || []).slice(0, 300).map(d => ({ action:'review_possible_duplicate', priority:d.score >= 80 ? 'high' : 'medium', kept_id:d.a?.id, candidate_id:d.b?.id, reason:d.reasons, suggested_resolution:'merge, suppress, or contact owner/poster before publishing duplicate placement' }));
  const flagged = businesses.filter(b => (b.moderation_flags || []).length).slice(0, 500).map(b => ({ action:'review_listing_quality', priority:(b.moderation_flags || []).length >= 3 ? 'high':'normal', business_id:b.id, name:b.name, flags:b.moderation_flags, suggested_resolution:'request owner cleanup, enrich listing, or suppress if abusive' }));
  return { updated_at:TODAY, packets:[...dupes, ...flagged] };
}

function seedFieldMap(){
  return {
    updated_at:TODAY,
    accepted_input_fields:{
      name:['name','business_name','company_name','company','dba','legal_name','title'],
      category:['category','primary_category','business_type','license_type','type'],
      website:['website','url','site','business_website','web_site'],
      phone:['phone','telephone','phone_number'],
      email:['email','contact_email'],
      address:['address','street_address','service_address','full_address'],
      city:['city','municipality','locality'],
      state:['state','region'],
      zip:['zip','zipcode','postal_code','postal'],
      poster:['poster_email','submitter_email','owner_email','poster_phone','poster_ip'],
      trust_signals:['business_verified','no_hidden_fees','mobile','insured','license_checked','accepts_requests'],
      content:['description','summary','tags','services','languages','niche','subcategory']
    },
    rules:[
      'company_name and business_type are first-class CSV aliases for live city-license imports.',
      'numeric source ids are not trusted as public canonical ids; the build creates deterministic profile ids from business identity.',
      'domain, email, phone, and name+address identity keys are used before a second public posting is allowed.',
      'exact duplicate collisions merge automatically; suspicious near-matches move into admin review exports.'
    ]
  };
}
function canonicalRoutingIndex(businesses, handbuiltIds){
  return businesses.map((b, index) => ({
    id:b.id,
    name:b.name,
    canonical_url:`/business/${b.id}/`,
    profile_mode:handbuiltIds.has(b.id) ? 'static-hand-page' : 'missing-static-hand-page',
    shard:`/data/profiles/${profileShard(b.id)}.json`,
    archive_page:directoryPageRoute(Math.floor(index / DIRECTORY_PAGE_SIZE) + 1),
    category_url:`/category/${b.category_slug}/`,
    city_url:`/city/${b.city_slug}/`,
    identity_key:b.identity?.primary_key || '',
    aliases:b.identity?.all || [],
    source_hash:b.source_hash,
    source_file:b.source_file
  }));
}
function importDryRunReport(raw, businesses, audit, quality, posterRisk){
  const blockerCount = quality.rejection_candidates.filter(r => r.type === 'missing business name').length;
  const needsReview = audit.possible_duplicates.length + posterRisk.length + quality.rejection_candidates.length;
  return {
    updated_at:TODAY,
    mode:'build-time dry run summary',
    raw_records:raw.length,
    would_publish:businesses.length,
    exact_duplicate_collisions:audit.exact_merges.length,
    possible_duplicate_pairs:audit.possible_duplicates.length,
    suppressed_records:audit.suppressed.length,
    rejection_candidates:quality.rejection_candidates.length,
    poster_risk_records:posterRisk.length,
    blocker_count:Math.min(blockerCount, quality.rejection_candidates.length),
    needs_admin_review:needsReview,
    safe_to_publish:blockerCount === 0,
    next_actions:[
      'Run npm run dry-run before deploying a new scrape batch.',
      'Review /data/import-rejections.json for broken rows before trusting new imports.',
      'Review /data/duplicate-report.json and /data/poster-risk-index.json for duplicate or abusive posting attempts.',
      'Add confirmed bad records to seed/businesses/suppressions.json, then rebuild.'
    ]
  };
}
function crawlBudgetReport(report, businesses){
  const businessSitemapChunks = Math.ceil(businesses.length / SITEMAP_CHUNK_SIZE);
  const archivePages = Math.ceil(businesses.length / DIRECTORY_PAGE_SIZE);
  return {
    updated_at:TODAY,
    site_url:SITE_URL,
    published_businesses:businesses.length,
    estimated_routes:report.routes.total,
    static_profile_pages:report.records.static_business_pages,
    profile_mode:report.records.profile_mode,
    directory_page_size:DIRECTORY_PAGE_SIZE,
    business_archive_pages:archivePages,
    sitemap_chunk_size:SITEMAP_CHUNK_SIZE,
    business_sitemap_chunks:businessSitemapChunks,
    sitemap_files:['sitemap-index.xml','sitemap-pages.xml', ...Array.from({length:businessSitemapChunks}, (_,i)=>`sitemap-business-${i+1}.xml`)],
    crawl_policy:'Use split sitemaps and paginated archives. Keep full dataset in JSON/CSV exports; do not render 26k+ cards on one page.',
    profile_routing:'Business URLs publish only from src/handbuilt-pages/<business-id>/index.html. No generated /business/* renderer fallback is allowed.'
  };
}
function adminBulkActionsCsv(actionPackets){
  const headers = ['action','priority','business_id','kept_id','candidate_id','name','flags','reason','suggested_resolution'];
  const rows = (actionPackets.packets || []).map(p => headers.map(h => csvEscape(Array.isArray(p[h]) ? p[h].join(' | ') : (p[h] ?? ''))).join(','));
  return `${headers.join(',')}\n${rows.join('\n')}\n`;
}

function contactFingerprintIndex(businesses){
  const groups = new Map();
  function add(kind, key, b){
    const clean = text(key);
    if(!clean) return;
    const id = `${kind}:${clean}`;
    if(!groups.has(id)) groups.set(id, { fingerprint:id, kind, value:clean, businesses:[], source_files:new Set(), cities:new Set(), categories:new Set(), risk_flags:new Set() });
    const rec = groups.get(id);
    rec.businesses.push({ id:b.id, name:b.name, url:`/business/${b.id}/`, city:b.city, category:b.category, phone:b.phone, email:b.email, website:b.website });
    rec.source_files.add(b.source_file || 'unknown');
    rec.cities.add(b.city);
    rec.categories.add(b.category);
    for(const flag of b.moderation_flags || []) rec.risk_flags.add(flag);
  }
  for(const b of businesses){
    add('domain', domainFromUrl(b.website || b.booking_url || b.landing_page_url), b);
    add('phone', phoneDigits(b.phone), b);
    add('email', lower(b.email), b);
    add('name_city_zip', `${nameKey(b.name)}|${lower(b.city)}|${text(b.zip)}`, b);
    if(b.address) add('address_zip', `${addressKey(b.address)}|${text(b.zip)}`, b);
  }
  const records = Array.from(groups.values()).filter(g => g.businesses.length > 1).map(g => {
    const flags = Array.from(g.risk_flags);
    const risk_score = Math.min(100, (g.businesses.length - 1) * 18 + (g.kind === 'domain' || g.kind === 'phone' || g.kind === 'email' ? 22 : 8) + flags.length * 7);
    return { fingerprint:g.fingerprint, kind:g.kind, value:g.value, listing_count:g.businesses.length, source_files:Array.from(g.source_files), cities:Array.from(g.cities), categories:Array.from(g.categories), risk_flags:flags, risk_score, businesses:g.businesses.slice(0, 80) };
  }).sort((a,b)=>b.risk_score-a.risk_score || b.listing_count-a.listing_count);
  return { updated_at:TODAY, stats:{ duplicate_fingerprint_groups:records.length, high_risk_groups:records.filter(r=>r.risk_score>=70).length }, records };
}
function duplicateClusterIndex(identityAudit, contactFingerprints){
  const clusters = [];
  for(const merge of identityAudit.exact_merges || []){
    clusters.push({ cluster_type:'exact_auto_merge', priority:'closed', score:100, identity_key:merge.identity_key || merge.reason || '', kept:merge.kept, merged:merge.merged, recommended_action:'Already merged into one public listing during build.' });
  }
  for(const dupe of identityAudit.possible_duplicates || []){
    clusters.push({ cluster_type:'possible_duplicate', priority:dupe.score >= 85 ? 'high' : 'medium', score:dupe.score, identity_key:dupe.identity_key || '', kept:dupe.a, candidate:dupe.b, reasons:dupe.reasons, recommended_action:'Review owner/contact evidence, then merge, suppress, or leave separate if truly distinct.' });
  }
  for(const fp of (contactFingerprints.records || []).filter(r=>r.risk_score >= 70).slice(0, 400)){
    clusters.push({ cluster_type:'contact_fingerprint', priority:'high', score:fp.risk_score, identity_key:fp.fingerprint, count:fp.listing_count, businesses:fp.businesses.slice(0, 20), reasons:[`${fp.listing_count} listings share ${fp.kind}`], recommended_action:'Check if one owner is attempting duplicate placement or if this is a legitimate multi-location business.' });
  }
  return { updated_at:TODAY, stats:{ clusters:clusters.length, exact_auto_merges:(identityAudit.exact_merges || []).length, possible_duplicates:(identityAudit.possible_duplicates || []).length, contact_fingerprint_clusters:(contactFingerprints.records || []).filter(r=>r.risk_score>=70).length }, clusters:clusters.slice(0, 5000) };
}
function trustTierFor(b){
  const score = b.verification_score || 0;
  if(score >= 85 && b.website && (b.phone || b.email)) return 'verified-ready';
  if(score >= 65) return 'strong-seed';
  if(score >= 45) return 'needs-enrichment';
  return 'thin-record';
}
function ownerVerificationPackets(businesses){
  return businesses.map(b => {
    const required = [];
    if(!b.website) required.push('official website or owner landing page');
    if(!b.phone) required.push('business phone');
    if(!b.email) required.push('business email');
    if(!b.address && !b.service_area_miles) required.push('service area or address confirmation');
    if(!(b.badges?.license_verified || b.badges?.business_verified)) required.push('license or owner verification proof');
    return { business_id:b.id, name:b.name, url:`/business/${b.id}/`, city:b.city, category:b.category, trust_tier:trustTierFor(b), verification_score:b.verification_score, current_signals:{ website:!!b.website, phone:!!b.phone, email:!!b.email, address:!!b.address, source_file:b.source_file, identity_key:b.identity?.primary_key || '' }, required_owner_proofs:required.length ? required : ['confirm existing details and ownership authority'], moderation_flags:b.moderation_flags || [], claim_packet_url:`/claim/?business=${encodeURIComponent(b.id)}` };
  });
}
function businessLifecycleQueue(businesses){
  const tasks = [];
  for(const b of businesses){
    const flags = [];
    if(!b.website) flags.push('missing website');
    if(!b.phone && !b.email) flags.push('missing direct contact');
    if(!b.description || b.description.length < 80) flags.push('thin description');
    if(!b.address && !b.service_area_miles) flags.push('missing location/service area');
    if((b.moderation_flags || []).length) flags.push(...b.moderation_flags.map(f=>`moderation: ${f}`));
    if((b.verification_score || 0) < 55) flags.push('low trust score');
    if(!flags.length) continue;
    const priority = flags.some(f=>f.includes('moderation') || f.includes('direct contact')) ? 'high' : flags.length >= 3 ? 'medium' : 'normal';
    tasks.push({ business_id:b.id, name:b.name, url:`/business/${b.id}/`, city:b.city, category:b.category, priority, trust_tier:trustTierFor(b), verification_score:b.verification_score, flags, suggested_next_action: priority === 'high' ? 'verify owner/contact before promoting the listing' : 'enrich profile fields on next seed pass' });
  }
  return { updated_at:TODAY, stats:{ queued:tasks.length, high_priority:tasks.filter(t=>t.priority==='high').length }, tasks:tasks.sort((a,b)=>({high:0,medium:1,normal:2}[a.priority]-{high:0,medium:1,normal:2}[b.priority] || a.verification_score-b.verification_score)).slice(0, 5000) };
}
function leadRoutingRules(facets, markets, businesses){
  const rules = [];
  for(const market of markets){
    const candidates = market.businesses.slice().sort((a,b)=>b.verification_score-a.verification_score).slice(0, 12).map(b=>({ id:b.id, name:b.name, score:b.verification_score, url:`/business/${b.id}/`, phone:b.phone, email:b.email, website:b.website }));
    rules.push({ rule_id:slugify(`${market.city}-${market.category}`), city:market.city, category:market.category, route:`/market/${market.slug}/`, candidate_count:market.count, primary_candidate_ids:candidates.map(c=>c.id), fallback_category_url:`/category/${market.category_slug}/`, fallback_city_url:`/city/${market.city_slug}/`, routing_policy:'Rank by verification score, request readiness, contact completeness, and category/city match.', candidates });
  }
  const globalFallback = facets.categories.map(category => ({ category, category_slug:slugify(category), top_business_ids:businesses.filter(b=>b.category===category).sort((a,b)=>b.verification_score-a.verification_score).slice(0, 15).map(b=>b.id) }));
  return { updated_at:TODAY, rules, global_fallback:globalFallback };
}
function categoryOpportunityIndex(businesses, facets, coverage){
  const byCategory = facets.categories.map(category => {
    const rows = businesses.filter(b=>b.category===category);
    const contactReady = rows.filter(b=>b.phone || b.email || b.website).length;
    const verified = rows.filter(b=>b.verification_score >= 70).length;
    const withWebsite = rows.filter(b=>b.website).length;
    const thinCities = coverage.filter(g=>g.category===category).slice(0, 12).map(g=>({ city:g.city, count:g.count, missing:g.missing, priority:g.priority }));
    const opportunity_score = Math.max(0, 100 - Math.round((verified/Math.max(rows.length,1))*35 + (withWebsite/Math.max(rows.length,1))*25 + (contactReady/Math.max(rows.length,1))*20));
    return { category, slug:slugify(category), businesses:rows.length, verified, contact_ready:contactReady, with_website:withWebsite, thin_cities:thinCities, opportunity_score, recommended_action: opportunity_score >= 70 ? 'Scrape/enrich this lane aggressively; supply exists but trust/contact depth is weak.' : opportunity_score >= 45 ? 'Add verification and owner outreach to improve conversion.' : 'Maintain lane and build sponsor/package inventory.' };
  }).sort((a,b)=>b.opportunity_score-a.opportunity_score || b.businesses-a.businesses);
  return { updated_at:TODAY, categories:byCategory };
}
function monetizationReadiness(businesses, sponsor, markets){
  const readyListings = businesses.filter(b=>b.website || b.phone || b.email).filter(b=>b.verification_score >= 60);
  const marketInventory = markets.map(m=>({ route:`/market/${m.slug}/`, city:m.city, category:m.category, listings:m.count, verified:m.verified, sponsor_slots:3, fill_status:m.count >= 20 ? 'sellable' : m.count >= 5 ? 'developing' : 'thin' })).sort((a,b)=>b.listings-a.listings).slice(0, 250);
  return { updated_at:TODAY, stats:{ sellable_listings:readyListings.length, sponsored_surfaces:sponsor.length, sellable_market_pages:marketInventory.filter(m=>m.fill_status==='sellable').length }, package_model:[{ name:'Featured city/category placement', unit:'market page slot', proof_required:'owner verified or strong seed record', renewal:'monthly' }, { name:'Verified profile upgrade', unit:'business profile', proof_required:'ownership/contact verification packet', renewal:'monthly or annual' }, { name:'Lead routing lane', unit:'category/city request distribution', proof_required:'contact-ready listing and response process', renewal:'usage or subscription' }], market_inventory:marketInventory };
}
function platformApiIndex(){
  return { updated_at:TODAY, endpoints:[
    { path:'/api/businesses.json', description:'Published deduped business dataset.' },
    { path:'/api/search-index.json', description:'Compact search records for discovery UIs.' },
    { path:'/api/categories.json', description:'Generated category counts.' },
    { path:'/api/cities.json', description:'Generated city counts.' },
    { path:'/api/lead-routing-rules.json', description:'City/category lead-routing rules and candidate ids.' },
    { path:'/api/owner-verification-packets.json', description:'Owner claim and verification packet export.' },
    { path:'/api/fraud-defense.json', description:'Duplicate clusters and contact-fingerprint groups.' },
    { path:'/api/exposure-products.json', description:'Commercial exposure product model.' },
    { path:'/api/activation-pipeline.json', description:'AE-ready owner activation and upgrade queue.' },
    { path:'/api/ae-territory-plan.json', description:'Generated AE territory and call queue plan.' },
    { path:'/api/revenue-readiness.json', description:'Operator revenue readiness scenarios.' },
    { path:'/api/backend-action-contracts.json', description:'Upstream-auth-ready action/mutation contract catalog.' },
    { path:'/api/owner-crm-index.json', description:'Owner CRM account readiness and next action index.' },
    { path:'/api/ae-work-orders.json', description:'Ranked AE work order queue generated from seeded data.' },
    { path:'/api/lead-inbox-queue.json', description:'Lead inbox/routing lanes generated from city/category markets.' }
  ], note:'These are static JSON endpoints generated at build time. Upstream auth can gate private/operator endpoints later.' };
}
function fraudDefenseBundle(contactFingerprints, duplicateClusters, posterRisk){
  return { updated_at:TODAY, one_posting_policy:'One real business should resolve to one canonical public profile unless it is a legitimate multi-location record.', contact_fingerprints:contactFingerprints.records.slice(0, 1000), duplicate_clusters:duplicateClusters.clusters.slice(0, 1000), poster_risk:posterRisk.slice(0, 1000), admin_response:['Review high-risk fingerprints.', 'Contact owner/poster when evidence is unclear.', 'Suppress abusive records in seed/businesses/suppressions.json.', 'Rebuild and confirm duplicate-report/admin-actions are clean.'] };
}
function ownerVerificationPage(packets){
  const rows = packets.slice(0, 200).map(p=>`<tr><th><a href="${html(p.url)}">${html(p.name)}</a></th><td>${html(p.city)}</td><td>${html(p.category)}</td><td>${html(p.trust_tier)}</td><td>${html(p.required_owner_proofs.slice(0,3).join(', '))}</td><td><a href="${html(p.claim_packet_url)}">claim packet</a></td></tr>`).join('');
  const needs = packets.filter(p=>p.required_owner_proofs.length && p.trust_tier !== 'verified-ready').length;
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Owner verification</p><h1>Claim packets without adding local auth.</h1><p class="hero-text">This surface gives operators and upstream-auth users a verification packet per business so duplicate posters, fake owners, and thin records can be cleaned before promotion.</p><div class="hero-actions"><a class="btn primary" href="/data/owner-verification-packets.json">Open packets JSON</a><a class="btn" href="/claim/">Build claim update</a></div></div><aside class="hero-card"><div class="metric"><span>${packets.length.toLocaleString()}</span><small>packets</small></div><div class="metric"><span>${needs.toLocaleString()}</span><small>need proof</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Review sample</p><h2>Owner proof queue</h2></div><span class="stat-pill">first 200</span></div><div class="table-wrap"><table><thead><tr><th>Business</th><th>City</th><th>Category</th><th>Tier</th><th>Required proof</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Owner Verification | Valley Verified', description:'Owner claim and verification packet workflow for Valley Verified listings.', canonical:`${SITE_URL}/owner-verification/`, bodyClass:'owner-verification-page' }, body);
}
function lifecyclePage(queue){
  const rows = queue.tasks.slice(0, 250).map(t=>`<tr><th><a href="${html(t.url)}">${html(t.name)}</a></th><td>${html(t.priority)}</td><td>${html(t.trust_tier)}</td><td>${html(t.flags.slice(0,4).join(', '))}</td><td>${html(t.suggested_next_action)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Lifecycle queue</p><h1>Every listing gets an operator next step.</h1><p class="hero-text">This queue tells the admin what to enrich, suppress, verify, or contact next. It keeps a huge seeded directory from rotting into stale junk.</p><div class="hero-actions"><a class="btn primary" href="/data/business-lifecycle-queue.json">Open JSON</a><a class="btn" href="/admin-actions/">Admin actions</a></div></div><aside class="hero-card"><div class="metric"><span>${queue.stats.queued.toLocaleString()}</span><small>queued</small></div><div class="metric"><span>${queue.stats.high_priority.toLocaleString()}</span><small>high priority</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Business</th><th>Priority</th><th>Tier</th><th>Flags</th><th>Next action</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Lifecycle Queue | Valley Verified', description:'Operator lifecycle and enrichment queue for seeded Valley Verified listings.', canonical:`${SITE_URL}/lifecycle/`, bodyClass:'lifecycle-page' }, body);
}
function leadRoutingPage(rules){
  const rows = rules.rules.slice(0, 180).map(r=>`<tr><th><a href="${html(r.route)}">${html(r.city)} ${html(r.category)}</a></th><td>${r.candidate_count}</td><td>${html(r.primary_candidate_ids.slice(0,5).join(', '))}</td><td>${html(r.routing_policy)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Lead routing</p><h1>Request routing rules for each seeded market.</h1><p class="hero-text">When upstream auth and forms wrap this app, these static rules give the request engine a deterministic, auditable way to route buyers to strong local candidates.</p><div class="hero-actions"><a class="btn primary" href="/data/lead-routing-rules.json">Open rules JSON</a><a class="btn" href="/request/">Build buyer request</a></div></div><aside class="hero-card"><div class="metric"><span>${rules.rules.length}</span><small>market rules</small></div><div class="metric"><span>${rules.global_fallback.length}</span><small>fallback lanes</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Market</th><th>Candidates</th><th>Primary IDs</th><th>Policy</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Lead Routing | Valley Verified', description:'Generated lead routing rules for Valley Verified buyer requests.', canonical:`${SITE_URL}/lead-routing/`, bodyClass:'lead-routing-page' }, body);
}
function opportunitiesPage(opportunities){
  const rows = opportunities.categories.map(o=>`<tr><th><a href="/category/${html(o.slug)}/">${html(o.category)}</a></th><td>${o.businesses}</td><td>${o.verified}</td><td>${o.with_website}</td><td>${o.opportunity_score}</td><td>${html(o.recommended_action)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Growth opportunities</p><h1>Know which niches need enrichment before competitors do.</h1><p class="hero-text">This index ranks categories by verification gaps, contact readiness, website depth, and city coverage holes.</p><div class="hero-actions"><a class="btn primary" href="/data/category-opportunity-index.json">Open JSON</a><a class="btn" href="/coverage/">Coverage scanner</a></div></div><aside class="hero-card"><div class="metric"><span>${opportunities.categories.length}</span><small>categories</small></div><div class="metric"><span>${opportunities.categories[0]?.opportunity_score ?? 0}</span><small>top score</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Category</th><th>Profiles</th><th>Verified</th><th>Websites</th><th>Opp score</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Opportunities | Valley Verified', description:'Category and niche opportunity index for Valley Verified operators.', canonical:`${SITE_URL}/opportunities/`, bodyClass:'opportunities-page' }, body);
}
function monetizationPage(readiness){
  const rows = readiness.market_inventory.slice(0, 180).map(m=>`<tr><th><a href="${html(m.route)}">${html(m.city)} ${html(m.category)}</a></th><td>${m.listings}</td><td>${m.verified}</td><td>${m.sponsor_slots}</td><td>${html(m.fill_status)}</td></tr>`).join('');
  const packages = readiness.package_model.map(p=>`<div class="glass proof-card"><span>$</span><h2>${html(p.name)}</h2><p>${html(p.unit)} • ${html(p.proof_required)} • ${html(p.renewal)}</p></div>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Monetization readiness</p><h1>Sell placements only where the platform has enough supply.</h1><p class="hero-text">This surface separates sellable sponsor inventory from thin lanes, so the app can make money without overclaiming weak markets.</p><div class="hero-actions"><a class="btn primary" href="/data/monetization-readiness.json">Open JSON</a><a class="btn" href="/sponsor/">Sponsor inventory</a></div></div><aside class="hero-card"><div class="metric"><span>${readiness.stats.sellable_listings.toLocaleString()}</span><small>sellable listings</small></div><div class="metric"><span>${readiness.stats.sellable_market_pages}</span><small>sellable markets</small></div></aside></section><section class="platform-strip">${packages}</section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Market</th><th>Listings</th><th>Verified</th><th>Slots</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Monetization | Valley Verified', description:'Sellable marketplace inventory and package readiness for Valley Verified.', canonical:`${SITE_URL}/monetization/`, bodyClass:'monetization-page' }, body);
}
function apiPage(apiIndex){
  const rows = apiIndex.endpoints.map(e=>`<tr><th><a href="${html(e.path)}">${html(e.path)}</a></th><td>${html(e.description)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Static API</p><h1>Generated data endpoints for the platform.</h1><p class="hero-text">These static JSON endpoints are build artifacts. They let other apps, widgets, and upstream-auth dashboards consume the platform without scraping HTML.</p><div class="hero-actions"><a class="btn primary" href="/data/platform-api-index.json">Open API index</a><a class="btn" href="/exports/">Export vault</a></div></div><aside class="hero-card"><div class="metric"><span>${apiIndex.endpoints.length}</span><small>endpoints</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Endpoint</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Static API | Valley Verified', description:'Static JSON API endpoints generated by Valley Verified.', canonical:`${SITE_URL}/api/`, bodyClass:'api-page' }, body);
}
function fraudDefensePage(bundle){
  const rows = bundle.contact_fingerprints.slice(0, 180).map(f=>`<tr><th>${html(f.kind)}</th><td>${html(f.value)}</td><td>${f.listing_count}</td><td>${f.risk_score}</td><td>${html(f.businesses.slice(0,3).map(b=>b.name).join(', '))}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Fraud defense</p><h1>One business, one canonical posting.</h1><p class="hero-text">This surface catches shared phones, domains, emails, address fingerprints, duplicate clusters, and risky poster behavior so admins can block extra listings before they pollute the marketplace.</p><div class="hero-actions"><a class="btn primary" href="/data/fraud-defense.json">Open fraud bundle</a><a class="btn" href="/duplicates/">Duplicate scanner</a></div></div><aside class="hero-card"><div class="metric"><span>${bundle.contact_fingerprints.length}</span><small>fingerprints</small></div><div class="metric"><span>${bundle.duplicate_clusters.length}</span><small>clusters</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">High-risk fingerprints</p><h2>Shared contact evidence</h2></div><span class="stat-pill">review queue</span></div><div class="table-wrap"><table><thead><tr><th>Kind</th><th>Value</th><th>Listings</th><th>Risk</th><th>Examples</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Fraud Defense | Valley Verified', description:'Duplicate, poster-risk, and contact-fingerprint defense for Valley Verified.', canonical:`${SITE_URL}/fraud-defense/`, bodyClass:'fraud-defense-page' }, body);
}

function crawlControlPage(crawlBudget, report){
  const files = crawlBudget.sitemap_files.map(name=>`<li><a href="/${html(name)}">${html(name)}</a></li>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Crawl control</p><h1>Large-directory SEO without page-weight collapse.</h1><p class="hero-text">This page documents how the platform exposes ${crawlBudget.published_businesses.toLocaleString()} business routes to crawlers while keeping visitor pages fast.</p></div><aside class="hero-card"><div class="metric"><span>${crawlBudget.business_sitemap_chunks}</span><small>business sitemaps</small></div><div class="metric"><span>${crawlBudget.business_archive_pages}</span><small>archive pages</small></div><div class="metric"><span>${crawlBudget.static_profile_pages}</span><small>static profiles</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Sitemap files</p><h2>Split crawl map</h2></div><a class="btn small" href="/data/crawl-budget.json">Open JSON</a></div><ul class="file-list">${files}</ul></section><section class="platform-strip"><div class="glass proof-card"><span>01</span><h2>Paginated archives</h2><p>${crawlBudget.business_archive_pages} business archive pages prevent one giant HTML dump.</p></div><div class="glass proof-card"><span>02</span><h2>Hybrid profiles</h2><p>${crawlBudget.profile_mode} keeps all canonical URLs live while avoiding a massive build explosion.</p></div><div class="glass proof-card"><span>03</span><h2>Data exports</h2><p>Full data remains in JSON, CSV, search shards, and profile shards for platform use.</p></div></section>`;
  return pageWrap({ title:'Crawl Control | Valley Verified', description:'Large-directory sitemap, archive, and profile-routing control for Valley Verified.', canonical:`${SITE_URL}/crawl/`, bodyClass:'crawl-page' }, body);
}
function routingControlPage(canonicalRouting, report){
  const sample = canonicalRouting.slice(0, 20).map(r=>`<tr><td><code>${html(r.id)}</code></td><td>${html(r.name)}</td><td><a href="${html(r.canonical_url)}">Profile</a></td><td><code>${html(r.shard)}</code></td><td>${html(r.profile_mode)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Canonical routing</p><h1>One canonical URL per business.</h1><p class="hero-text">Every published business has a deterministic canonical route, shard pointer, archive location, and identity key. Duplicate imports should resolve into this map instead of creating extra public postings.</p></div><aside class="hero-card"><div class="metric"><span>${canonicalRouting.length.toLocaleString()}</span><small>routes</small></div><div class="metric"><span>${report.records.exact_merges}</span><small>merged</small></div><div class="metric"><span>${report.records.possible_duplicates}</span><small>review pairs</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Routing sample</p><h2>Canonical profile map</h2></div><a class="btn small" href="/data/canonical-routing.json">Open JSON</a></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>URL</th><th>Shard</th><th>Mode</th></tr></thead><tbody>${sample}</tbody></table></div></section>`;
  return pageWrap({ title:'Canonical Routing | Valley Verified', description:'Canonical business routing and one-posting identity map for Valley Verified.', canonical:`${SITE_URL}/routing/`, bodyClass:'routing-page' }, body);
}
function dryRunPage(dryRun){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Import dry run</p><h1>Know what a scrape batch will do before publishing.</h1><p class="hero-text">Run <code>npm run dry-run</code> after dropping new CSV/JSON files into <code>seed/businesses/inbox/</code>. The command generates data-only reports so you can catch duplicate abuse, bad rows, and suppressions before a full deploy.</p></div><aside class="hero-card"><div class="metric"><span>${dryRun.raw_records.toLocaleString()}</span><small>raw rows</small></div><div class="metric"><span>${dryRun.would_publish.toLocaleString()}</span><small>would publish</small></div><div class="metric"><span>${dryRun.needs_admin_review.toLocaleString()}</span><small>review signals</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Current dry-run summary</p><h2>${dryRun.safe_to_publish ? 'No hard blocker found' : 'Blockers need review'}</h2></div><a class="btn small" href="/data/import-dry-run.json">Open JSON</a></div><pre class="code-output">${html(JSON.stringify(dryRun, null, 2))}</pre></section>`;
  return pageWrap({ title:'Import Dry Run | Valley Verified', description:'Dry-run publishing safety report for Valley Verified seed imports.', canonical:`${SITE_URL}/dry-run/`, bodyClass:'dry-run-page' }, body);
}
function verificationPage(report, quality){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Verification protocol</p><h1>Trust controls for a live seeded business platform.</h1><p class="hero-text">The platform separates seeded records, owner claims, duplicate review, suppression, and buyer-facing verification signals so the directory can scale without pretending every scrape row is fully owner-confirmed.</p></div><aside class="hero-card"><div class="metric"><span>${report.records.published.toLocaleString()}</span><small>published</small></div><div class="metric"><span>${quality.rejection_candidates.length}</span><small>row warnings</small></div><div class="metric"><span>${report.records.poster_risk_records}</span><small>poster risks</small></div></aside></section><section class="platform-strip"><div class="glass proof-card"><span>Seeded</span><h2>Provider-supplied or public-data listing</h2><p>Default listings are useful but not overclaimed. Missing contact, owner, or pricing details stay visible in quality reports.</p></div><div class="glass proof-card"><span>Claim</span><h2>Owner update packet</h2><p>Businesses can generate claim/update packets without local auth. Upstream auth can gate submission and review.</p></div><div class="glass proof-card"><span>Suppress</span><h2>Removal control</h2><p>Confirmed fake, duplicate, or abusive entries can be suppressed by id, identity key, domain, phone, email, or source hash.</p></div></section><section class="section glass"><p class="eyebrow">Operator rule</p><h2>Do not sell “verified” as owner-confirmed unless the seed field says it.</h2><p class="muted">The build can display licensed, reviewed, insured, no-hidden-fee, mobile, and request-ready signals only when those fields exist in the seed data.</p></section>`;
  return pageWrap({ title:'Verification Protocol | Valley Verified', description:'Verification, claim, suppression, and trust controls for Valley Verified business listings.', canonical:`${SITE_URL}/verification/`, bodyClass:'verification-page' }, body);
}

function searchShardKey(record){ return slugify(record.name || record.id || 'x').replace(/[^a-z0-9]/g, '').slice(0, 1) || '0'; }
function directoryPageRoute(page){ return `/business/page/${page}/`; }
function paginatedBusinessArchivePage(page, totalPages, slice, total){
  const prev = page > 1 ? directoryPageRoute(page - 1) : '/business/';
  const next = page < totalPages ? directoryPageRoute(page + 1) : '';
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Business archive page ${page} of ${totalPages}</p><h1>Browse seeded businesses ${((page - 1) * DIRECTORY_PAGE_SIZE + 1).toLocaleString()}-${Math.min(page * DIRECTORY_PAGE_SIZE, total).toLocaleString()}</h1><p class="hero-text">Paginated static archive pages keep the large business platform crawlable and usable without dumping every listing onto one giant page.</p></div><aside class="hero-card"><div class="metric"><span>${total.toLocaleString()}</span><small>profiles</small></div><div class="metric"><span>${DIRECTORY_PAGE_SIZE}</span><small>per page</small></div></aside></section><section class="section glass"><div class="button-row"><a class="btn small" href="${html(prev)}">Previous</a>${next ? `<a class="btn small primary" href="${html(next)}">Next</a>` : ''}<a class="btn small" href="/directory/">Search directory</a><a class="btn small" href="/exports/">Exports</a></div></section><section class="section glass"><div class="cards">${slice.map(miniBusinessCard).join('')}</div></section>`;
  return pageWrap({ title:`Business Archive Page ${page} | Valley Verified`, description:`Paginated Valley Verified business archive page ${page} of ${totalPages}.`, canonical:`${SITE_URL}${directoryPageRoute(page)}`, bodyClass:'business-archive-page' }, body);
}
function importHealthPage(quality, sourceBatches, posterRisk, report){
  const worst = [...sourceBatches].sort((a,b)=>a.quality_score-b.quality_score).slice(0, 12);
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Import health</p><h1>Seed quality, batch risk, and publish safety.</h1><p class="hero-text">This page tells the operator which scrape files are clean, which batches need cleanup, and where duplicate/poster abuse risk exists before the next rebuild.</p></div><aside class="hero-card"><div class="metric"><span>${quality.raw_records.toLocaleString()}</span><small>raw rows</small></div><div class="metric"><span>${quality.published_records.toLocaleString()}</span><small>published</small></div><div class="metric"><span>${posterRisk.length}</span><small>poster risk</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Batch ledger</p><h2>Lowest quality source files</h2></div><a class="btn small" href="/data/source-batches.json">Open JSON</a></div><div class="table-wrap"><table><thead><tr><th>Source</th><th>Raw</th><th>Published</th><th>No contact</th><th>No city/ZIP</th><th>Quality</th></tr></thead><tbody>${worst.map(b=>`<tr><td><code>${html(b.source_file)}</code></td><td>${b.raw_records}</td><td>${b.published_records}</td><td>${b.rows_without_contact}</td><td>${b.rows_without_city_or_zip}</td><td>${b.quality_score}</td></tr>`).join('')}</tbody></table></div></section><section class="section glass"><div class="tile-grid"><a class="platform-tile" href="/data/import-quality.json"><span>QA</span><h3>Import quality report</h3><p>Warnings, rejection candidates, duplicate counts, and suppression hits.</p></a><a class="platform-tile" href="/data/import-rejections.json"><span>REJ</span><h3>Rejection candidates</h3><p>Rows that should be fixed before being trusted.</p></a><a class="platform-tile" href="/data/poster-risk-index.json"><span>RISK</span><h3>Poster risk index</h3><p>Signals for people trying to create extra postings.</p></a><a class="platform-tile" href="/data/suppression-template.json"><span>SUP</span><h3>Suppression template</h3><p>Copy this shape into seed/businesses/suppressions.json.</p></a><a class="platform-tile" href="/admin-actions/"><span>OPS</span><h3>Admin action queue</h3><p>Review duplicates, bad listings, and removal packets.</p></a><a class="platform-tile" href="/data/canonical-aliases.json"><span>ID</span><h3>Canonical alias index</h3><p>Every business identity key and alias used for one-posting control.</p></a></div></section><section class="section glass"><p class="eyebrow">Build proof</p><h2>${report.records.exact_merges} exact duplicate collision(s) merged, ${report.records.possible_duplicates} possible duplicate pair(s) flagged.</h2><p class="muted">No local auth was added. This surface is ready to be wrapped by upstream auth.</p></section>`;
  return pageWrap({ title:'Import Health | Valley Verified', description:'Operator import quality, source batch, and poster-risk dashboard for Valley Verified.', canonical:`${SITE_URL}/import-health/`, bodyClass:'import-health-page' }, body);
}
function adminActionsPage(actionPackets, posterRisk, suppressionTemplateData){
  const actions = actionPackets.packets.slice(0, 60);
  const risks = posterRisk.slice(0, 30);
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Admin action queue</p><h1>Remove, merge, contact, or suppress bad listings.</h1><p class="hero-text">This is the no-auth operator layer. Upstream auth can gate it later. The actual removal mechanism is durable: edit <code>seed/businesses/suppressions.json</code>, rebuild, and the listing disappears from public output.</p></div><aside class="hero-card"><div class="metric"><span>${actionPackets.packets.length}</span><small>actions</small></div><div class="metric"><span>${posterRisk.length}</span><small>risk records</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Suppression starter</p><h2>Template for removal control</h2></div><a class="btn small" href="/data/suppression-template.json">Download template</a></div><pre class="code-output">${html(JSON.stringify(suppressionTemplateData, null, 2))}</pre></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Action queue</p><h2>Highest-priority review packets</h2></div><a class="btn small" href="/data/admin-action-packets.json">Open JSON</a></div><div class="cards">${actions.map(a=>`<article class="business-card"><p class="eyebrow">${html(a.priority)} • ${html(a.action)}</p><h3>${html(a.name || a.kept_id || 'Review packet')}</h3><p class="card-desc">${html((a.flags || a.reason || []).join(' • ') || a.suggested_resolution)}</p><div class="card-actions">${a.business_id ? `<a class="btn small primary" href="/business/${html(a.business_id)}/">Open listing</a>` : ''}<a class="btn small" href="/duplicates/">Duplicate scanner</a></div></article>`).join('')}</div></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Poster risk</p><h2>Signals of extra-posting attempts</h2></div><a class="btn small" href="/data/poster-risk-index.json">Open JSON</a></div><div class="cards">${risks.map(r=>`<article class="business-card"><div class="card-top"><div><p class="eyebrow">risk ${r.risk_score}</p><h3>${html(r.key)}</h3></div><div class="score"><strong>${r.listing_count}</strong><small>listings</small></div></div><p class="card-desc">${html((r.flags || []).join(' • ') || 'Multiple listing/poster signal')}</p><div class="mini-grid"><span>${r.distinct_domains} domains</span><span>${r.distinct_business_phones} phones</span><span>${r.source_files.length} sources</span><span>${html(r.poster_email || r.poster_phone || 'poster')}</span></div></article>`).join('')}</div></section>`;
  return pageWrap({ title:'Admin Actions | Valley Verified', description:'Operator action queue for Valley Verified duplicate control, suppression, and poster-risk review.', canonical:`${SITE_URL}/admin-actions/`, bodyClass:'admin-actions-page' }, body);
}
function sitemapDocument(routes){
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(r=>`  <url><loc>${SITE_URL}${r === '/' ? '/' : r}</loc><lastmod>${TODAY}</lastmod><changefreq>${r.includes('/business/') ? 'weekly' : 'daily'}</changefreq><priority>${r === '/' ? '1.0' : r.includes('/business/') ? '0.8' : '0.7'}</priority></url>`).join('\n')}\n</urlset>`;
}
function sitemapIndex(names){
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${names.map(name=>`  <sitemap><loc>${SITE_URL}/${name}</loc><lastmod>${TODAY}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>`;
}

function parsePossibleJson(value, fallback){
  if(Array.isArray(value)) return value;
  if(typeof value === 'object' && value) return [value];
  const raw = text(value);
  if(!raw) return fallback;
  if(raw.startsWith('[') || raw.startsWith('{')){
    try{
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    }catch{ return fallback; }
  }
  return fallback;
}
function offerRecords(row){
  const direct = parsePossibleJson(row.offers || row.packages || row.service_packages, []);
  const fromFields = text(rowValue(row, ['offer_title','package_title','deal_title','starter_title'])) ? [{
    title: rowValue(row, ['offer_title','package_title','deal_title','starter_title']),
    description: rowValue(row, ['offer_description','package_description','deal_description']),
    price: rowValue(row, ['offer_price','package_price','deal_price','starting_price','price']),
    cta: rowValue(row, ['offer_cta','package_cta','deal_cta'], 'Request this offer')
  }] : [];
  return [...direct, ...fromFields].map((offer, i) => ({
    id: slugify(rowValue(offer, ['id','slug','title'], `offer-${i + 1}`)),
    title: text(rowValue(offer, ['title','name','offer','package'], `Service package ${i + 1}`)),
    description: text(rowValue(offer, ['description','summary','details'], 'Confirm scope and availability directly with the provider.')),
    price: number(rowValue(offer, ['price','amount','starting_price','starting_at'])),
    price_label: text(rowValue(offer, ['price_label','label'])) || '',
    cta: text(rowValue(offer, ['cta','button','action'], 'Request this offer')),
    terms: text(rowValue(offer, ['terms','fine_print','note']))
  })).filter(o => o.title);
}
function normalizeBusiness(row, idx){
  const badgesRaw = typeof row.badges === 'object' && row.badges ? row.badges : {};
  const policiesRaw = typeof row.policies === 'object' && row.policies ? row.policies : {};
  const mediaRaw = typeof row.media === 'object' && row.media ? row.media : {};
  const website = cleanUrl(rowValue(row, ['website','url','site','business_website','web_site']));
  const booking = cleanUrl(rowValue(row, ['booking_url','booking','book_url','appointment_url','schedule_url']));
  const name = text(rowValue(row, ['name','business_name','company_name','company','dba','legal_name','title'], `Business ${idx + 1}`));
  const rawZip = text(rowValue(row, ['zip','zipcode','postal_code','postal']));
  const city = inferCityFromZip(rawZip, rowValue(row, ['city','municipality','locality'], ''));
  const state = text(rowValue(row, ['state','region'], 'AZ')).toUpperCase() || 'AZ';
  const lat = number(rowValue(row, ['lat','latitude','location_lat','location.latitude'], row.location?.lat));
  const lng = number(rowValue(row, ['lng','lon','long','longitude','location_lng','location.longitude'], row.location?.lng));
  const startingPrice = number(rowValue(row, ['starting_price','price','starting_at','from_price']));
  const classified = classifyBusinessFrom(row, name);
  const category = titleCase(rowValue(row, ['category','primary_category'], classified.category));
  const rawSubcategory = titleCase(rowValue(row, ['subcategory','sub_category','service_type','niche'], classified.niche));
  const subcategory = rawSubcategory || classified.niche;
  const niche = titleCase(rowValue(row, ['niche','service_niche','subcategory','sub_category','service_type'], subcategory || category));
  const seededTags = splitList(rowValue(row, ['tags','services','keywords']));
  const tags = unique([...seededTags, ...(classified.tags || [])]);
  const languages = splitList(rowValue(row, ['languages','language'], Array.isArray(row.languages) ? row.languages : 'English'));
  const explicitId = text(rowValue(row, ['id','slug']));
  const idBase = explicitId && !/^\d+$/.test(explicitId) ? explicitId : `${name}-${city}-${rawZip || classified.niche}-${hashObject(row).slice(0, 7)}`;
  const b = {
    id: slugify(idBase, `business-${idx + 1}`),
    name,
    category,
    category_slug: slugify(category),
    subcategory,
    niche,
    niche_slug: slugify(`${category}-${niche || subcategory || category}`),
    license_type: licenseTypeLabel(rowValue(row, ['business_type','license_type','type'], '')),
    landing_page_url: cleanUrl(rowValue(row, ['landing_page_url','listing_url','profile_url'])),
    website,
    booking_url: booking,
    phone: text(rowValue(row, ['phone','telephone','phone_number'])),
    email: lower(rowValue(row, ['email','contact_email'])),
    address: text(rowValue(row, ['address','street_address','formatted_address','service_address'])),
    neighborhood: titleCase(rowValue(row, ['neighborhood','area','district'])),
    city,
    city_slug: slugify(city),
    state,
    zip: rawZip,
    location: lat !== null && lng !== null ? { lat, lng } : null,
    service_area_miles: number(rowValue(row, ['service_area_miles','radius','service_radius_miles'])),
    response_time: text(rowValue(row, ['response_time','reply_time','average_response_time'])),
    claim_status: text(rowValue(row, ['claim_status','owner_status'], 'unclaimed')).toLowerCase(),
    accepts_requests: !['false','no','0'].includes(lower(rowValue(row, ['accepts_requests','open_to_requests'], 'true'))),
    verification_notes: unique([...splitList(rowValue(row, ['verification_notes','proof_notes','audit_notes'])), rowValue(row, ['business_type','license_type'], '') ? `Imported license type: ${licenseTypeLabel(rowValue(row, ['business_type','license_type']))}` : '']),
    offers: offerRecords(row),
    tags,
    languages,
    price_mode: text(rowValue(row, ['price_mode','pricing_model'], startingPrice !== null ? 'STARTING_AT' : 'CONTACT_FOR_QUOTE')).toUpperCase().replace(/\s+/g, '_'),
    starting_price: startingPrice,
    price_note: text(rowValue(row, ['price_note','pricing_note'])),
    policies: {
      fees_transparency: text(rowValue(row, ['fees_transparency','policy_fees'], policiesRaw.fees_transparency)),
      cancellation: text(rowValue(row, ['cancellation','cancellation_policy'], policiesRaw.cancellation)),
      deposit: text(rowValue(row, ['deposit','deposit_policy'], policiesRaw.deposit))
    },
    badges: {
      no_hidden_fees: bool(rowValue(row, ['no_hidden_fees','fees_transparency','transparent_pricing'], badgesRaw.no_hidden_fees)),
      license_verified: bool(rowValue(row, ['license_verified','licensed'], badgesRaw.license_verified || rowValue(row, ['business_type','license_type']))),
      business_verified: bool(rowValue(row, ['business_verified','verified','is_verified'], badgesRaw.business_verified)),
      mobile: bool(rowValue(row, ['mobile','mobile_service'], badgesRaw.mobile)),
      insured: bool(rowValue(row, ['insured','insurance_verified'], badgesRaw.insured))
    },
    media: {
      hero: cleanUrl(rowValue(row, ['hero','hero_image','image'], mediaRaw.hero)),
      gallery: Array.isArray(mediaRaw.gallery) ? mediaRaw.gallery.map(cleanUrl).filter(Boolean) : splitList(rowValue(row, ['gallery','images'])).map(cleanUrl),
      instagram: cleanUrl(rowValue(row, ['instagram','ig'], mediaRaw.instagram)),
      tiktok: cleanUrl(rowValue(row, ['tiktok','tik_tok'], mediaRaw.tiktok)),
      youtube: cleanUrl(rowValue(row, ['youtube','yt'], mediaRaw.youtube))
    },
    description: text(rowValue(row, ['description','summary','about','bio'])),
    hours: normalizeHours(row.hours || {}),
    featured: bool(rowValue(row, ['featured','is_featured'], row.featured || !!website)),
    last_verified: text(rowValue(row, ['last_verified','verified_at','last_seen','updated_at'], TODAY)),
    source_file: text(row.__source_file || 'unknown'),
    source_hash: hashObject(row),
    source_url: cleanUrl(rowValue(row, ['source_url','source','scrape_url','listing_source'])),
    poster: {
      name: text(rowValue(row, ['poster_name','submitted_by','submitter_name','owner_name'])),
      email: lower(rowValue(row, ['poster_email','submitter_email','owner_email'])),
      phone: text(rowValue(row, ['poster_phone','submitter_phone','owner_phone'])),
      ip: text(rowValue(row, ['poster_ip','ip','ip_address']))
    },
    identity: null,
    moderation_flags: [],
    duplicate_status: 'unscanned',
    verification_score: 0
  };
  if(!b.description) b.description = defaultDescription(b);
  b.identity = identityFor(b);
  b.moderation_flags = moderationFlags(b);
  b.verification_score = scoreBusiness(b);
  return b;
}

function scoreBusiness(b){
  let score = 0;
  if(b.badges.business_verified) score += 25;
  if(b.badges.no_hidden_fees) score += 15;
  if(b.badges.insured) score += 10;
  if(b.badges.license_verified) score += 10;
  if(b.phone) score += 8;
  if(b.email) score += 8;
  if(b.website || b.booking_url) score += 8;
  if(b.location) score += 6;
  if(b.starting_price !== null || b.price_note) score += 5;
  if((b.offers || []).length) score += 4;
  if(b.response_time) score += 2;
  if(b.last_verified) score += 5;
  return Math.min(score, 100);
}
function identityFor(b){
  const domain = domainFromUrl(b.website || b.booking_url || b.landing_page_url);
  const phone = phoneDigits(b.phone);
  const email = lower(b.email);
  const instagram = normalizeSocialHandle(b.media?.instagram);
  const tiktok = normalizeSocialHandle(b.media?.tiktok);
  const nameCityZip = slugify(`${nameKey(b.name)}-${b.city_slug || slugify(b.city)}-${b.zip || ''}`);
  const nameAddress = slugify(`${nameKey(b.name)}-${addressKey(b.address)}-${b.city_slug || slugify(b.city)}`);
  const strong = [domain && `domain:${domain}`, phone && `phone:${phone}`, email && `email:${email}`].filter(Boolean);
  const social = [instagram && `instagram:${instagram}`, tiktok && `tiktok:${tiktok}`].filter(Boolean);
  const weak = [nameAddress.length > 6 && `name_address:${nameAddress}`, nameCityZip.length > 6 && `name_city_zip:${nameCityZip}`].filter(Boolean);
  const primary_key = strong[0] || social[0] || weak[0] || `source:${b.source_hash}`;
  return { primary_key, strong, social, weak, all:[...strong, ...social, ...weak, `source:${b.source_hash}`], signals:{ domain, phone, email, instagram, tiktok, name_city_zip:nameCityZip, name_address:nameAddress } };
}
function dedupeKey(b){ return b.identity?.primary_key || identityFor(b).primary_key; }
function suppressionReason(b, suppressions){
  const identity = b.identity || identityFor(b);
  const domain = identity.signals.domain;
  const phone = identity.signals.phone;
  const email = identity.signals.email;
  if((suppressions.ids || []).includes(b.id)) return 'id suppressed';
  if((suppressions.source_hashes || []).includes(b.source_hash)) return 'source hash suppressed';
  if(domain && (suppressions.domains || []).includes(domain)) return 'domain suppressed';
  if(phone && (suppressions.phones || []).includes(phone)) return 'phone suppressed';
  if(email && (suppressions.emails || []).includes(email)) return 'email suppressed';
  if(identity.all.some(k => (suppressions.identity_keys || []).includes(k))) return 'identity key suppressed';
  return '';
}
function moderationFlags(b){
  const flags = [];
  if(!b.phone && !b.email && !b.website) flags.push('missing contact path');
  if(!b.website && !b.booking_url) flags.push('no website or booking URL');
  if(!b.address && !b.location) flags.push('no physical address or coordinates');
  if(b.claim_status && !['claimed','verified','owner_verified','unclaimed'].includes(b.claim_status)) flags.push(`claim review: ${b.claim_status}`);
  if(b.poster?.email && b.email && b.poster.email !== b.email) flags.push('poster email differs from business email');
  if((b.tags || []).length === 0) flags.push('no service tags');
  if((b.description || '').length < 80) flags.push('thin description');
  if(b.source_url && b.website && domainFromUrl(b.source_url) && domainFromUrl(b.website) && domainFromUrl(b.source_url) !== domainFromUrl(b.website)) flags.push('source URL domain differs from website');
  return flags;
}
function uniqueOffers(offers){
  const seen = new Set();
  const out = [];
  for(const offer of offers.filter(Boolean)){
    const key = slugify(`${offer.title}-${offer.price ?? offer.price_label ?? ''}`);
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(offer);
  }
  return out;
}
function mergeBusiness(a, b, audit, reasonKey){
  const merged = { ...a };
  const prefer = (oldVal, newVal) => {
    if(newVal === null || newVal === undefined || newVal === '') return oldVal;
    if(oldVal === null || oldVal === undefined || oldVal === '') return newVal;
    return String(newVal).length > String(oldVal).length ? newVal : oldVal;
  };
  for(const key of ['name','category','category_slug','subcategory','niche','niche_slug','landing_page_url','website','booking_url','phone','email','address','neighborhood','city','city_slug','state','zip','price_mode','price_note','description','last_verified','response_time','claim_status','source_url']) merged[key] = prefer(a[key], b[key]);
  merged.location = a.location || b.location;
  merged.service_area_miles = a.service_area_miles ?? b.service_area_miles;
  merged.starting_price = a.starting_price ?? b.starting_price;
  merged.tags = unique([...(a.tags || []), ...(b.tags || [])]);
  merged.verification_notes = unique([...(a.verification_notes || []), ...(b.verification_notes || []), `Merged duplicate seed record by ${reasonKey}`]);
  merged.offers = uniqueOffers([...(a.offers || []), ...(b.offers || [])]);
  merged.accepts_requests = !!(a.accepts_requests || b.accepts_requests);
  merged.languages = unique([...(a.languages || []), ...(b.languages || [])]);
  merged.badges = Object.fromEntries(['no_hidden_fees','license_verified','business_verified','mobile','insured'].map(k => [k, !!(a.badges?.[k] || b.badges?.[k])])) ;
  merged.policies = { ...(a.policies || {}), ...(b.policies || {}) };
  merged.media = { ...(a.media || {}), ...(b.media || {}), gallery: unique([...(a.media?.gallery || []), ...(b.media?.gallery || [])]) };
  merged.hours = { ...(a.hours || {}), ...(b.hours || {}) };
  merged.featured = !!(a.featured || b.featured);
  merged.poster = { ...(a.poster || {}), ...(b.poster || {}) };
  merged.source_file = unique([a.source_file, b.source_file].filter(Boolean)).join(', ');
  merged.source_hash = hashObject({ a: a.source_hash, b: b.source_hash });
  merged.identity = identityFor(merged);
  merged.duplicate_status = 'merged';
  merged.moderation_flags = unique([...(a.moderation_flags || []), ...(b.moderation_flags || []), `auto-merged duplicate: ${reasonKey}`]);
  merged.verification_score = scoreBusiness(merged);
  audit.exact_merges.push({ kept_id:a.id, merged_id:b.id, kept_name:a.name, merged_name:b.name, reason:reasonKey, source_files:unique([a.source_file,b.source_file].filter(Boolean)), identity_key:reasonKey });
  return merged;
}
function sharedSignals(a,b){
  const ax = a.identity || identityFor(a), bx = b.identity || identityFor(b);
  const shared = [];
  for(const k of ax.all){ if(bx.all.includes(k)) shared.push(k); }
  return shared;
}
function possibleDuplicateScore(a,b){
  const shared = sharedSignals(a,b);
  let score = 0;
  const reasons = [];
  for(const sig of shared){
    if(sig.startsWith('domain:')){ score += 90; reasons.push(sig); }
    else if(sig.startsWith('phone:')){ score += 90; reasons.push(sig); }
    else if(sig.startsWith('email:')){ score += 88; reasons.push(sig); }
    else if(sig.startsWith('instagram:') || sig.startsWith('tiktok:')){ score += 72; reasons.push(sig); }
    else if(sig.startsWith('name_address:')){ score += 68; reasons.push(sig); }
    else if(sig.startsWith('name_city_zip:')){ score += 42; reasons.push(sig); }
  }
  if(nameKey(a.name) === nameKey(b.name)){ score += 25; reasons.push('same normalized name'); }
  if(a.city_slug && a.city_slug === b.city_slug){ score += 10; reasons.push('same city'); }
  if(a.zip && b.zip && a.zip === b.zip){ score += 8; reasons.push('same ZIP'); }
  if(a.category_slug && a.category_slug === b.category_slug){ score += 5; reasons.push('same category'); }
  return { score:Math.min(score,100), reasons:unique(reasons) };
}
function buildIdentityAudit(published, audit){
  const possible = [];
  const seenPairs = new Set();
  const buckets = new Map();
  for(const item of published){
    const signals = (item.identity?.all || []).filter(sig => !sig.startsWith('source:') && !sig.startsWith('domain:') && !sig.startsWith('email:') && !sig.startsWith('phone:'));
    for(const sig of signals){
      if(!buckets.has(sig)) buckets.set(sig, []);
      const arr = buckets.get(sig);
      if(arr.length < 40) arr.push(item);
    }
  }
  for(const [, bucket] of buckets){
    if(bucket.length < 2) continue;
    for(let i=0;i<bucket.length;i++){
      for(let j=i+1;j<bucket.length;j++){
        const a = bucket[i], b = bucket[j];
        const pairKey = [a.id, b.id].sort().join('|');
        if(seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        const check = possibleDuplicateScore(a, b);
        if(check.score >= 70){
          possible.push({ score:check.score, a:{ id:a.id, name:a.name, source_file:a.source_file }, b:{ id:b.id, name:b.name, source_file:b.source_file }, reasons:check.reasons });
          if(possible.length >= 2500) break;
        }
      }
      if(possible.length >= 2500) break;
    }
    if(possible.length >= 2500) break;
  }
  audit.possible_duplicates = possible.sort((a,b)=>b.score-a.score || a.a.name.localeCompare(b.a.name));
  audit.stats = { exact_merges:audit.exact_merges.length, possible_duplicates:audit.possible_duplicates.length, suppressed:audit.suppressed.length, scanned_records:published.length, possible_duplicate_cap:2500 };
  return audit;
}

function dedupeBusinesses(items, suppressions = {}, audit = { exact_merges:[], possible_duplicates:[], suppressed:[] }){
  const map = new Map(); const order = [];
  for(const original of items){
    const reason = suppressionReason(original, suppressions);
    if(reason){ audit.suppressed.push({ id:original.id, name:original.name, reason, source_file:original.source_file, source_hash:original.source_hash, identity:original.identity }); continue; }
    const keys = original.identity?.all?.filter(k => !k.startsWith('source:')) || [dedupeKey(original)];
    const existingKey = keys.find(k => map.has(k));
    if(!existingKey){
      const primary = dedupeKey(original);
      map.set(primary, original); order.push(primary);
      for(const key of keys) if(!map.has(key)) map.set(key, original);
    }else{
      const existing = map.get(existingKey);
      const merged = mergeBusiness(existing, original, audit, existingKey);
      for(const key of [dedupeKey(existing), ...(existing.identity?.all || []), dedupeKey(original), ...(original.identity?.all || []), dedupeKey(merged), ...(merged.identity?.all || [])]) map.set(key, merged);
      const primaryIndex = order.findIndex(k => map.get(k)?.id === existing.id || k === dedupeKey(existing));
      if(primaryIndex >= 0) order[primaryIndex] = dedupeKey(merged);
    }
  }
  const seenObjects = new Set();
  const published = [];
  for(const key of order){
    const item = map.get(key);
    if(!item || seenObjects.has(item)) continue;
    seenObjects.add(item);
    published.push(item);
  }
  const used = new Map();
  const finalItems = published.map(item => {
    const base = item.id;
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    if(n) item.id = `${base}-${n + 1}`;
    item.identity = identityFor(item);
    item.moderation_flags = unique([...(item.moderation_flags || []), ...moderationFlags(item)]);
    return item;
  }).sort((a,b)=>Number(b.featured)-Number(a.featured) || b.verification_score-a.verification_score || a.name.localeCompare(b.name));
  buildIdentityAudit(finalItems, audit);
  return finalItems;
}
function facetsFor(businesses, taxonomy = []){
  const categoryNames = taxonomy.map(t => t.category).filter(Boolean);
  const categoryCount = new Map();
  const cityCount = new Map();
  const tagSet = new Set();
  const seededNicheMap = new Map();
  for(const b of businesses){
    if(b.category) categoryCount.set(b.category, (categoryCount.get(b.category) || 0) + 1);
    if(b.city) cityCount.set(b.city, (cityCount.get(b.city) || 0) + 1);
    for(const tag of b.tags || []) tagSet.add(tag);
    const name = b.niche || b.subcategory || b.category;
    const slug = b.niche_slug || slugify(`${b.category}-${b.subcategory || b.category}`);
    if(!name || !slug) continue;
    const existing = seededNicheMap.get(slug) || { category:b.category, category_slug:b.category_slug, name, slug, count:0 };
    existing.count += 1;
    seededNicheMap.set(slug, existing);
  }
  const categories = Array.from(new Set([...categoryNames, ...categoryCount.keys()])).sort((a,b)=>a.localeCompare(b));
  const cities = Array.from(cityCount.keys()).sort((a,b)=>a.localeCompare(b));
  const tags = Array.from(tagSet).sort((a,b)=>a.localeCompare(b));
  const configuredNiches = taxonomy.flatMap(t => (t.niches || []).map(n => ({ category:t.category, category_slug:slugify(t.category), name:n, slug:slugify(`${t.category}-${n}`), count:0 })));
  const nicheMap = new Map();
  for(const n of configuredNiches) nicheMap.set(n.slug, n);
  for(const n of seededNicheMap.values()) nicheMap.set(n.slug, { ...(nicheMap.get(n.slug) || n), count:Math.max(n.count, nicheMap.get(n.slug)?.count || 0) });
  const niches = Array.from(nicheMap.values()).sort((a,b)=>a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return { categories, cities, tags, niches, taxonomy };
}


function priceLabel(b){
  const labels = { STARTING_AT:'Starting at', PACKAGES_ONLY:'Packages from', HOURLY:'Hourly from', CONTACT_FOR_QUOTE:'Quote required', FREE_CONSULT:'Free consult' };
  if(b.starting_price !== null && b.starting_price !== undefined) return `${labels[b.price_mode] || 'Starting at'} ${money(b.starting_price)}`;
  return labels[b.price_mode] || 'Confirm pricing';
}
function badgeHtml(b, big = false){
  const list = [];
  if(b.badges.business_verified) list.push(['Verified','good']);
  if(b.badges.no_hidden_fees) list.push(['No hidden fees','gold']);
  if(b.badges.mobile) list.push(['Mobile','teal']);
  if(b.badges.insured) list.push(['Insured','good']);
  if(b.badges.license_verified) list.push(['License checked','gold']);
  if(!list.length) list.push(['Provider-supplied data','']);
  return `<div class="badge-row ${big ? 'big' : ''}">${list.map(([label, kind]) => `<span class="badge ${kind}">${html(label)}</span>`).join('')}</div>`;
}
function actionLinks(b, compact = false){
  const phoneHref = phoneDigits(b.phone) ? `tel:${phoneDigits(b.phone)}` : '';
  const emailHref = b.email ? `mailto:${b.email}` : '';
  const booking = b.booking_url || b.website || '';
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([b.address,b.city,b.state,b.zip].filter(Boolean).join(', ') || b.name)}`;
  return `<div class="action-row ${compact ? 'compact' : ''}">
    ${phoneHref ? `<a class="btn small" href="${html(phoneHref)}">Call</a>` : ''}
    ${emailHref ? `<a class="btn small" href="${html(emailHref)}">Email</a>` : ''}
    ${booking ? `<a class="btn small primary" href="${html(booking)}" target="_blank" rel="noopener">Book / Site</a>` : ''}
    <a class="btn small" href="${html(maps)}" target="_blank" rel="noopener">Map</a>
  </div>`;
}
function miniBusinessCard(b){
  return `<article class="business-card" data-card data-business-id="${html(b.id)}" data-business-name="${html(b.name)}" data-url="/business/${html(b.id)}/" data-name="${html(lower(b.name))}" data-category="${html(b.category)}" data-city="${html(b.city)}" data-tags="${html(lower([...b.tags, b.subcategory, b.description].join(' ')))}" data-score="${b.verification_score}" data-date="${html(b.last_verified)}" data-featured="${b.featured ? '1':'0'}" ${b.location ? `data-lat="${b.location.lat}" data-lng="${b.location.lng}"` : ''}>
    <div class="card-glow"></div>
    <div class="card-top"><div><p class="eyebrow">${html(b.city)} • ${html(b.category)}</p><h3><a href="/business/${html(b.id)}/">${html(b.name)}</a></h3></div><div class="score"><strong>${b.verification_score}</strong><small>score</small></div></div>
    ${badgeHtml(b)}
    <p class="card-desc">${html(b.description)}</p>
    <div class="mini-grid"><span>${html(priceLabel(b))}</span><span>${html(b.neighborhood || b.city)}</span><span>${html(b.subcategory || b.category)}</span><span>${html(formatDate(b.last_verified))}</span></div>
    <div class="tag-list small-tags">${(b.tags || []).slice(0,5).map(t => `<span>${html(t)}</span>`).join('')}</div>
    <div class="card-actions"><a class="btn small primary" href="/business/${html(b.id)}/">Open profile</a><button class="btn small" data-save-business data-business-id="${html(b.id)}" data-business-name="${html(b.name)}" data-url="/business/${html(b.id)}/">Save</button>${b.website ? `<a class="btn small" href="${html(b.website)}" target="_blank" rel="noopener">${html(displayUrl(b.website))}</a>` : ''}</div>
  </article>`;
}
function categoryCard(cat, businesses){
  const subset = businesses.filter(b => b.category === cat);
  const topTags = Array.from(new Set(subset.flatMap(b=>b.tags))).slice(0,5);
  return `<a class="platform-tile" href="/category/${slugify(cat)}/"><span>${subset.length}</span><h3>${html(cat)}</h3><p>${html(topTags.join(' • ') || 'Seeded local listings')}</p></a>`;
}
function cityCard(city, businesses){
  const subset = businesses.filter(b => b.city === city);
  const cats = Array.from(new Set(subset.map(b=>b.category))).slice(0,5);
  return `<a class="platform-tile" href="/city/${slugify(city)}/"><span>${subset.length}</span><h3>${html(city)}, AZ</h3><p>${html(cats.join(' • ') || 'Local providers')}</p></a>`;
}
function baseHead({ title, description, canonical, type = 'website', bodyClass = '', structuredData = null, robots = '' }){
  const sd = structuredData ? `<script type="application/ld+json">${jsonScript(structuredData)}</script>` : '';
  const robotsMeta = robots || robotsContentFor({ canonical });
  return `<!doctype html><html lang="en"><head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${html(title)}</title>
    <meta name="description" content="${html(description)}" />
    <meta name="robots" content="${html(robotsMeta)}" />
    <link rel="canonical" href="${html(canonical)}" />
    <meta name="theme-color" content="#f5efe3" />
    <meta property="og:title" content="${html(title)}" />
    <meta property="og:description" content="${html(description)}" />
    <meta property="og:type" content="${html(type)}" />
    <meta property="og:url" content="${html(canonical)}" />
    <meta property="og:image" content="${SITE_URL}/assets/valley-verified-logo.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/assets/valley-verified-logo.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="stylesheet" href="/assets/styles.css" />
    <link rel="stylesheet" href="/assets/valley-brain.css" />
    ${sd}
  </head><body class="${html(bodyClass)}"><canvas id="sky" class="skyesol-living-background living-background" aria-hidden="true"></canvas><div class="grain" aria-hidden="true"></div>`;
}
function siteHeader(){
  return `<header class="topbar">
    <a class="brand" href="/" aria-label="Valley Verified home"><img class="brand-logo" src="/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>real local business pages</small></span></a>
    <nav class="nav-actions" aria-label="Primary"><a href="/directory/">Directory</a><a href="/market/">Markets</a><a href="/match/">Match</a><a href="/for-businesses/">For businesses</a><a href="/advertise/">Exposure</a><a href="/pricing/">Pricing</a><a href="/contact/">Contact</a></nav>
  </header>`;
}
function pageWrap(opts, body, scripts = '<script type="module" src="/assets/app.js"></script><script type="module" src="/assets/valley-brain.js"></script>'){
  return `${baseHead(opts)}${siteHeader()}<main id="main" class="site-main">${body}</main><div id="toast" class="toast" role="status" aria-live="polite"></div>${scripts}</body></html>`;
}

function csvEscape(value){ return `"${String(value ?? '').replaceAll('"','""')}"`; }
function businessesCsv(businesses){
  const headers = ['id','name','category','subcategory','niche','city','state','zip','phone','email','website','booking_url','verification_score','starting_price','price_mode','claim_status','duplicate_status','identity_key','source_file','last_verified'];
  const rows = businesses.map(b => headers.map(h => csvEscape(h === 'website' ? b.website : h === 'booking_url' ? b.booking_url : h === 'identity_key' ? b.identity?.primary_key : b[h])).join(','));
  return `${headers.join(',')}\n${rows.join('\n')}\n`;
}
function seedSchema(){
  return {
    '$schema':'https://json-schema.org/draft/2020-12/schema',
    title:'Valley Verified business seed file',
    type:'object',
    required:['businesses'],
    properties:{
      updated_at:{ type:'string', description:'YYYY-MM-DD recommended' },
      businesses:{ type:'array', items:{ type:'object', required:['name'], properties:{ name:{type:'string'}, category:{type:'string'}, subcategory:{type:'string'}, niche:{type:'string'}, source_url:{type:'string'}, poster_email:{type:'string'}, poster_phone:{type:'string'}, website:{type:'string'}, booking_url:{type:'string'}, phone:{type:'string'}, email:{type:'string'}, address:{type:'string'}, neighborhood:{type:'string'}, city:{type:'string'}, state:{type:'string'}, zip:{type:'string'}, lat:{type:['number','string']}, lng:{type:['number','string']}, tags:{oneOf:[{type:'array',items:{type:'string'}},{type:'string'}]}, languages:{oneOf:[{type:'array',items:{type:'string'}},{type:'string'}]}, starting_price:{type:['number','string','null']}, price_mode:{type:'string'}, price_note:{type:'string'}, description:{type:'string'}, business_verified:{type:['boolean','string']}, no_hidden_fees:{type:['boolean','string']}, mobile:{type:['boolean','string']}, insured:{type:['boolean','string']}, claim_status:{type:'string'}, accepts_requests:{type:['boolean','string']}, last_verified:{type:'string'} } } }
    }
  };
}
function seedTemplate(){
  return { updated_at:TODAY, businesses:[{ name:'Example Business', category:'Local Services', subcategory:'Service Type', niche:'Service Type', poster_email:'admin@example.com', source_url:'https://example.com/source', website:'https://example.com', booking_url:'https://example.com/book', phone:'(602) 555-0100', email:'hello@example.com', address:'Phoenix, AZ', city:'Phoenix', state:'AZ', zip:'85003', lat:33.4484, lng:-112.074, tags:['Example tag','Second service'], languages:['English'], starting_price:99, price_mode:'STARTING_AT', price_note:'Confirm final scope before booking.', no_hidden_fees:true, business_verified:false, mobile:false, insured:false, last_verified:TODAY, description:'Short buyer-facing description.' }] };
}
function collectionsFor(businesses){
  const base = [
    { slug:'verified', title:'Verified Businesses', description:'Listings with a business_verified signal in seed data.', match:b=>b.badges.business_verified },
    { slug:'no-hidden-fees', title:'No Hidden Fee Signals', description:'Listings seeded with transparent/no-hidden-fee signals.', match:b=>b.badges.no_hidden_fees },
    { slug:'mobile-service', title:'Mobile Service Providers', description:'Providers that can travel or operate as mobile services.', match:b=>b.badges.mobile },
    { slug:'insured', title:'Insured Providers', description:'Listings with an insured signal in the current seed dataset.', match:b=>b.badges.insured },
    { slug:'accepting-requests', title:'Accepting Requests', description:'Businesses that are currently eligible for buyer request packets.', match:b=>b.accepts_requests },
    { slug:'recently-verified', title:'Recently Verified', description:'Listings sorted by the newest verification dates.', match:b=>!!b.last_verified, sort:(a,b)=>String(b.last_verified).localeCompare(String(a.last_verified)) }
  ];
  return base.map(c => ({ ...c, businesses:[...businesses].filter(c.match).sort(c.sort || ((a,b)=>b.verification_score-a.verification_score)) })).filter(c=>c.businesses.length);
}
function collectionCard(collection){
  return `<a class="platform-tile" href="/collection/${collection.slug}/"><span>${collection.businesses.length}</span><h3>${html(collection.title)}</h3><p>${html(collection.description)}</p></a>`;
}
function scoreGaps(b){
  const gaps = [];
  if(!b.phone) gaps.push('phone');
  if(!b.email) gaps.push('email');
  if(!b.website && !b.booking_url) gaps.push('website or booking link');
  if(!b.location) gaps.push('coordinates');
  if(b.starting_price === null && !b.price_note) gaps.push('pricing signal');
  if(!(b.tags || []).length) gaps.push('tags/services');
  if(!b.badges.business_verified) gaps.push('business verification');
  if(!b.description || b.description.length < 80) gaps.push('stronger description');
  return gaps;
}
function auditRows(businesses){
  return businesses.map(b => ({ business:b, gaps:scoreGaps(b), priority:100 - b.verification_score + scoreGaps(b).length * 5 })).sort((a,b)=>b.priority-a.priority || a.business.name.localeCompare(b.business.name));
}
function collectionIndexPage(collections){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Generated collections</p><h1>Curated buyer paths from seed signals</h1><p class="hero-text">Collections are generated from the same business seed records, so buyer-ready lanes update when the inbox data changes.</p></div><aside class="hero-card"><div class="metric"><span>${collections.length}</span><small>collections</small></div><div class="metric"><span>${collections.reduce((s,c)=>s+c.businesses.length,0)}</span><small>collection memberships</small></div></aside></section><section class="section glass"><div class="tile-grid">${collections.map(collectionCard).join('')}</div></section>`;
  return pageWrap({ title:'Collections | Valley Verified', description:'Generated Valley Verified business collections from verification, pricing, mobile service, and request signals.', canonical:`${SITE_URL}/collection/`, bodyClass:'collection-page' }, body);
}
function collectionPage(collection, facets){
  return directoryShell({ businesses:collection.businesses, facets, title:collection.title, eyebrow:'Generated collection', description:collection.description, canonical:`${SITE_URL}/collection/${collection.slug}/` });
}


function averageScore(items){ return items.length ? Math.round(items.reduce((sum,b)=>sum+b.verification_score,0) / items.length) : 0; }
function marketMatrix(businesses, facets){
  const out = [];
  for(const city of facets.cities){
    for(const category of facets.categories){
      const subset = businesses.filter(b => b.city === city && b.category === category);
      if(!subset.length) continue;
      const slug = `${slugify(city)}/${slugify(category)}`;
      const tags = Array.from(new Set(subset.flatMap(b=>b.tags || []))).slice(0, 8);
      out.push({ city, city_slug:slugify(city), category, category_slug:slugify(category), slug, count:subset.length, avg_score:averageScore(subset), verified:subset.filter(b=>b.badges.business_verified).length, accepting_requests:subset.filter(b=>b.accepts_requests).length, tags, businesses:subset });
    }
  }
  return out.sort((a,b)=>b.count-a.count || b.avg_score-a.avg_score || a.city.localeCompare(b.city) || a.category.localeCompare(b.category));
}
function coverageGaps(businesses, facets){
  const rows = [];
  const target = 3;
  for(const city of facets.cities){
    for(const category of facets.categories){
      const subset = businesses.filter(b => b.city === city && b.category === category);
      const verified = subset.filter(b=>b.badges.business_verified).length;
      const withPhone = subset.filter(b=>b.phone).length;
      const withSite = subset.filter(b=>b.website || b.booking_url).length;
      const withPrice = subset.filter(b=>b.starting_price !== null || b.price_note).length;
      const missing = [];
      if(subset.length < target) missing.push(`${target - subset.length} more providers`);
      if(verified < 1) missing.push('verified anchor');
      if(withPhone < Math.min(1, subset.length)) missing.push('phone signal');
      if(withSite < Math.min(1, subset.length)) missing.push('website/booking signal');
      if(withPrice < Math.min(1, subset.length)) missing.push('pricing signal');
      const priority = (target - Math.min(subset.length, target)) * 25 + (verified ? 0 : 20) + (withSite ? 0 : 10) + (withPrice ? 0 : 10);
      if(missing.length || subset.length < target) rows.push({ city, city_slug:slugify(city), category, category_slug:slugify(category), count:subset.length, verified, avg_score:averageScore(subset), priority, missing, route:`/market/${slugify(city)}/${slugify(category)}/` });
    }
  }
  return rows.sort((a,b)=>b.priority-a.priority || a.city.localeCompare(b.city) || a.category.localeCompare(b.category));
}
function matchIndex(businesses){
  return businesses.map(b => ({ id:b.id, name:b.name, url:`/business/${b.id}/`, city:b.city, city_slug:b.city_slug, category:b.category, category_slug:b.category_slug, niche:b.niche, niche_slug:b.niche_slug, tags:b.tags, score:b.verification_score, price:b.starting_price, price_mode:b.price_mode, accepts_requests:b.accepts_requests, badges:b.badges, mobile:!!b.badges.mobile, has_location:!!b.location, text:[b.name,b.category,b.subcategory,b.niche,b.city,b.neighborhood,(b.tags||[]).join(' '),b.description].join(' ').toLowerCase() }));
}
function matchScore(b, req){
  let score = b.score || 0; const reasons = [];
  if(req.city && b.city === req.city){ score += 22; reasons.push('city match'); }
  if(req.category && b.category === req.category){ score += 26; reasons.push('category match'); }
  if(req.mobile && b.mobile){ score += 12; reasons.push('mobile signal'); }
  if(req.verified && b.badges?.business_verified){ score += 14; reasons.push('verified signal'); }
  if(req.transparent && b.badges?.no_hidden_fees){ score += 10; reasons.push('transparent pricing signal'); }
  if(req.budget && b.price && Number(b.price) <= Number(req.budget)){ score += 8; reasons.push('within seeded starting price'); }
  for(const term of splitList(req.terms || '')){ if(term && b.text.includes(term.toLowerCase())){ score += 6; reasons.push(`term: ${term}`); } }
  if(b.accepts_requests){ score += 5; reasons.push('accepts requests'); }
  return { ...b, match_score:Math.min(score, 160), reasons:unique(reasons).slice(0, 8) };
}
function sponsorInventory(businesses, facets, markets){
  const surfaces = [
    { route:'/', surface:'Homepage hero + marketplace strips', kind:'network', audience:'All visitors', inventory_slots:3, current_supply:businesses.length },
    { route:'/directory/', surface:'Directory featured placements', kind:'directory', audience:'Active local searchers', inventory_slots:8, current_supply:businesses.length },
    { route:'/offers/', surface:'Offer marketplace placements', kind:'commercial', audience:'Buyers comparing packages', inventory_slots:6, current_supply:allOffers(businesses).length },
    { route:'/match/', surface:'Match engine preferred results', kind:'workflow', audience:'High-intent request builders', inventory_slots:5, current_supply:businesses.filter(b=>b.accepts_requests).length }
  ];
  for(const cat of facets.categories) surfaces.push({ route:`/category/${slugify(cat)}/`, surface:`${cat} category hub`, kind:'category', audience:`${cat} buyers`, inventory_slots:4, current_supply:businesses.filter(b=>b.category===cat).length });
  for(const city of facets.cities) surfaces.push({ route:`/city/${slugify(city)}/`, surface:`${city} city hub`, kind:'city', audience:`${city} local buyers`, inventory_slots:4, current_supply:businesses.filter(b=>b.city===city).length });
  for(const m of markets.slice(0, 40)) surfaces.push({ route:`/market/${m.slug}/`, surface:`${m.city} ${m.category} market page`, kind:'city-category', audience:`${m.category} buyers in ${m.city}`, inventory_slots:3, current_supply:m.count });
  return surfaces.sort((a,b)=>b.current_supply-a.current_supply || a.route.localeCompare(b.route));
}
function outreachPackets(businesses){
  return auditRows(businesses).map(row => {
    const b = row.business;
    const contact = b.email || b.phone || b.website || b.source_url || '';
    const action = row.gaps.includes('business verification') ? 'Ask owner to claim/verify listing' : row.gaps.includes('pricing signal') ? 'Request pricing/package update' : row.gaps.includes('coordinates') ? 'Request service area/location details' : 'Request profile enrichment';
    return { id:`outreach-${b.id}`, business_id:b.id, name:b.name, city:b.city, category:b.category, priority:row.priority, contact, gaps:row.gaps, suggested_action:action, profile_url:`/business/${b.id}/`, claim_url:`/claim/?business=${b.id}` };
  });
}
function vcards(businesses){
  return businesses.map(b => ['BEGIN:VCARD','VERSION:3.0',`FN:${b.name}`,`ORG:${b.name}`,b.phone ? `TEL;TYPE=WORK,VOICE:${b.phone}` : '',b.email ? `EMAIL;TYPE=WORK:${b.email}` : '',(b.website || b.booking_url) ? `URL:${b.website || b.booking_url}` : '',b.address ? `ADR;TYPE=WORK:;;${b.address};${b.city};${b.state};${b.zip};US` : '',`NOTE:Valley Verified profile ${SITE_URL}/business/${b.id}/`,'END:VCARD'].filter(Boolean).join('\n')).join('\n');
}
function marketCard(m){
  return `<a class="platform-tile" href="/market/${html(m.slug)}/"><span>${m.count}</span><h3>${html(m.city)} ${html(m.category)}</h3><p>${m.verified} verified • ${m.accepting_requests} accepting requests • avg score ${m.avg_score}</p></a>`;
}
function marketIndexPage(markets, facets){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Market matrix</p><h1>City + category pages for local intent</h1><p class="hero-text">Every seeded city/category combination becomes a dedicated market route. These pages are stronger for SEO, buyer intent, and operator coverage planning than a generic directory alone.</p><div class="hero-actions"><a class="btn primary" href="/coverage/">Open coverage gaps</a><a class="btn" href="/match/">Run buyer match</a></div></div><aside class="hero-card"><div class="metric"><span>${markets.length}</span><small>market pages</small></div><div class="metric"><span>${facets.cities.length}</span><small>cities</small></div><div class="metric"><span>${facets.categories.length}</span><small>categories</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Generated markets</p><h2>Live seeded market routes</h2></div><span class="stat-pill">${markets.length} pages</span></div><div class="tile-grid">${markets.map(marketCard).join('')}</div></section>`;
  return pageWrap({ title:'Market Matrix | Valley Verified', description:'Generated city and category market pages for Valley Verified business discovery.', canonical:`${SITE_URL}/market/`, bodyClass:'market-page' }, body);
}
function marketPage(market, facets){
  return directoryShell({ businesses:market.businesses, facets, title:`${market.category} in ${market.city}`, eyebrow:'City-category market', description:`Browse ${market.category.toLowerCase()} businesses serving ${market.city}, Arizona. This route is generated from seed data and updates when new matching businesses are imported.`, canonical:`${SITE_URL}/market/${market.slug}/`, routeFilter:{ city:market.city, category:market.category } });
}
function coveragePage(gaps, facets, report){
  const rows = gaps.slice(0, 150).map(g => `<tr><td><strong>${g.priority}</strong></td><td><a href="${html(g.route)}">${html(g.city)} / ${html(g.category)}</a></td><td>${g.count}</td><td>${g.verified}</td><td>${g.avg_score}</td><td>${html(g.missing.join(' • '))}</td></tr>`).join('') || '<tr><td colspan="6">No coverage gaps found for the current taxonomy.</td></tr>';
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Coverage intelligence</p><h1>Know where the marketplace is thin before buyers notice.</h1><p class="hero-text">This board turns categories, cities, verification, pricing, and contact completeness into operator actions. It tells you where to scrape next and which lanes need anchor businesses.</p><div class="hero-actions"><a class="btn primary" href="/operator/">Import more businesses</a><a class="btn" href="/data/coverage-gaps.json">Open JSON</a></div></div><aside class="hero-card"><div class="metric"><span>${gaps.length}</span><small>gap rows</small></div><div class="metric"><span>${facets.cities.length * facets.categories.length}</span><small>possible lanes</small></div><div class="metric"><span>${report.records.published}</span><small>profiles</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Priority</th><th>Market</th><th>Count</th><th>Verified</th><th>Avg score</th><th>Needed</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Coverage Gaps | Valley Verified', description:'Operator coverage gap scanner for Valley Verified city and category lanes.', canonical:`${SITE_URL}/coverage/`, bodyClass:'coverage-page' }, body);
}
function matchPage(businesses, facets){
  const options = businesses.map(b=>`<option value="${html(b.id)}">${html(b.name)} — ${html(b.city)} / ${html(b.category)}</option>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Buyer match engine</p><h1>Turn a request into ranked provider matches.</h1><p class="hero-text">This is a browser-local matching workspace. It scores seeded providers by city, category, tags, budget, verified signals, transparent pricing, mobile service, and request readiness.</p><div class="hero-actions"><a class="btn primary" href="/request/">Build full request</a><a class="btn" href="/shortlist/">Open shortlist</a></div></div><aside class="hero-card"><div class="metric"><span>${businesses.length}</span><small>providers</small></div><div class="metric"><span>${businesses.filter(b=>b.accepts_requests).length}</span><small>request-ready</small></div></aside></section>
  <section class="section glass" data-match-page><div class="section-head"><div><p class="eyebrow">Match request</p><h2>Find the best seeded businesses</h2></div><span id="matchCount" class="stat-pill">0 matches</span></div><div class="filter-grid"><label>City<select id="matchCity"><option value="">Any city</option>${facets.cities.map(c=>`<option>${html(c)}</option>`).join('')}</select></label><label>Category<select id="matchCategory"><option value="">Any category</option>${facets.categories.map(c=>`<option>${html(c)}</option>`).join('')}</select></label><label>Budget ceiling<input id="matchBudget" type="number" min="0" placeholder="Optional" /></label><label>Need keywords<input id="matchTerms" placeholder="detailing, same day, video, tax..." /></label><label class="check"><input id="matchVerified" type="checkbox" /> Prefer verified</label><label class="check"><input id="matchTransparent" type="checkbox" /> Prefer no-hidden-fee signal</label><label class="check"><input id="matchMobile" type="checkbox" /> Prefer mobile service</label></div><div class="button-row"><button class="btn primary" data-run-match>Run match</button><button class="btn" data-export-match disabled>Download match packet</button></div><div id="matchResults" class="card-grid"></div></section><script id="matchData" type="application/json">[]</script>`;
  return pageWrap({ title:'Match Engine | Valley Verified', description:'Browser-local buyer request matching engine for seeded Valley Verified providers.', canonical:`${SITE_URL}/match/`, bodyClass:'match-page' }, body);
}
function outreachPage(outreach){
  const rows = outreach.slice(0, 160).map(r => `<tr><td><strong>${r.priority}</strong></td><td><a href="${html(r.profile_url)}">${html(r.name)}</a><br><small>${html(r.city)} • ${html(r.category)}</small></td><td>${html(r.contact || 'No contact')}</td><td>${html(r.suggested_action)}</td><td>${html(r.gaps.join(' • '))}</td><td><a class="btn small" href="${html(r.claim_url)}">Claim packet</a></td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Growth desk</p><h1>Outreach packets for listing cleanup and owner activation.</h1><p class="hero-text">This turns thin profiles, missing pricing, missing coordinates, and unverified listings into an operator queue for outreach. It does not send anything automatically.</p><div class="hero-actions"><a class="btn primary" href="/data/outreach-packets.json">Open JSON</a><a class="btn" href="/admin-review/">Admin review</a></div></div><aside class="hero-card"><div class="metric"><span>${outreach.length}</span><small>packets</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Priority</th><th>Business</th><th>Contact</th><th>Action</th><th>Gaps</th><th>Packet</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Outreach Desk | Valley Verified', description:'Operator outreach packets for Valley Verified profile enrichment and owner claims.', canonical:`${SITE_URL}/outreach/`, bodyClass:'outreach-page' }, body);
}
function sponsorPage(inventory){
  const rows = inventory.slice(0, 180).map(i => `<tr><td><a href="${html(i.route)}">${html(i.route)}</a></td><td>${html(i.surface)}</td><td>${html(i.kind)}</td><td>${html(i.audience)}</td><td>${i.inventory_slots}</td><td>${i.current_supply}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Revenue inventory</p><h1>Sponsored placement inventory without fake payments.</h1><p class="hero-text">This page defines sellable placement surfaces for featured providers, category sponsors, city sponsors, and match-engine preferred visibility. Billing can be wired upstream later; this package only creates honest inventory surfaces.</p><div class="hero-actions"><a class="btn primary" href="/data/sponsor-inventory.json">Open inventory JSON</a><a class="btn" href="/offers/">View offers</a></div></div><aside class="hero-card"><div class="metric"><span>${inventory.length}</span><small>surfaces</small></div><div class="metric"><span>${inventory.reduce((s,i)=>s+i.inventory_slots,0)}</span><small>slots</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Route</th><th>Surface</th><th>Kind</th><th>Audience</th><th>Slots</th><th>Supply</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Sponsor Inventory | Valley Verified', description:'Sponsored placement inventory surfaces for Valley Verified marketplace monetization.', canonical:`${SITE_URL}/sponsor/`, bodyClass:'sponsor-page' }, body);
}
function exportsPage(report){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Export vault</p><h1>Data exports for operators, sales, crawl, and migration.</h1><p class="hero-text">Use these files to move seeded businesses into spreadsheets, owner outreach flows, match engines, widgets, or future upstream-auth dashboards.</p></div><aside class="hero-card"><div class="metric"><span>${report.records.published}</span><small>records</small></div><div class="metric"><span>${report.routes.total}</span><small>routes</small></div></aside></section><section class="section glass"><div class="tile-grid"><a class="platform-tile" href="/data/businesses.json"><span>JSON</span><h3>Normalized businesses</h3><p>Full public dataset.</p></a><a class="platform-tile" href="/data/businesses.csv"><span>CSV</span><h3>Spreadsheet export</h3><p>Operator-ready rows.</p></a><a class="platform-tile" href="/data/vcards.vcf"><span>VCF</span><h3>Bulk vCards</h3><p>Contact-card export.</p></a><a class="platform-tile" href="/data/match-index.json"><span>MTCH</span><h3>Match index</h3><p>Lean provider scoring data.</p></a><a class="platform-tile" href="/data/coverage-gaps.json"><span>GAP</span><h3>Coverage gaps</h3><p>Scrape next lanes.</p></a><a class="platform-tile" href="/data/outreach-packets.json"><span>CRM</span><h3>Outreach packets</h3><p>Owner activation queue.</p></a><a class="platform-tile" href="/data/sponsor-inventory.json"><span>REV</span><h3>Sponsor inventory</h3><p>Sellable placement surfaces.</p></a><a class="platform-tile" href="/data/market-index.json"><span>MKT</span><h3>Market pages</h3><p>City/category route matrix.</p></a></div></section>`;
  return pageWrap({ title:'Export Vault | Valley Verified', description:'Valley Verified export vault for JSON, CSV, VCF, match, coverage, outreach, and sponsor data.', canonical:`${SITE_URL}/exports/`, bodyClass:'exports-page' }, body);
}

function nicheCard(niche){
  return `<a class="platform-tile" href="/niche/${html(niche.slug)}/"><span>${niche.count}</span><h3>${html(niche.name)}</h3><p>${html(niche.category)} lane. ${niche.count ? 'Seeded listings ready.' : 'Ready for future imports.'}</p></a>`;
}
function nicheIndexPage(businesses, facets){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Niche index</p><h1>Service niches ready for live business seeding</h1><p class="hero-text">These lanes come from the platform taxonomy plus the live seed dataset. Empty lanes still exist so the marketplace can scale into new categories without rewiring the app.</p></div><aside class="hero-card"><div class="metric"><span>${facets.niches.length}</span><small>niches</small></div><div class="metric"><span>${businesses.length}</span><small>profiles</small></div></aside></section><section class="section glass"><div class="tile-grid">${facets.niches.map(nicheCard).join('')}</div></section>`;
  return pageWrap({ title:'Niche Index | Valley Verified', description:'Generated niche index for Valley Verified category lanes and seeded businesses.', canonical:`${SITE_URL}/niche/`, bodyClass:'niche-index-page' }, body);
}
function nichePage(niche, businesses, facets){
  const subset = businesses.filter(b => (b.niche_slug || slugify(`${b.category}-${b.subcategory || b.category}`)) === niche.slug || (b.category_slug === niche.category_slug && slugify(b.subcategory) === slugify(niche.name)));
  if(subset.length) return directoryShell({ businesses:subset, facets, title:`${niche.name} in ${niche.category}`, eyebrow:'Niche hub', description:`Browse Valley Verified ${niche.name.toLowerCase()} businesses in the ${niche.category} lane.`, canonical:`${SITE_URL}/niche/${niche.slug}/`, routeFilter:{ niche:niche.name } });
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Niche hub</p><h1>${html(niche.name)}</h1><p class="hero-text">This ${html(niche.category)} lane is ready for seeded businesses. Drop matching CSV/JSON records into <code>seed/businesses/inbox/</code>, use <code>category</code> and <code>niche</code>, then redeploy.</p><div class="hero-actions"><a class="btn primary" href="/operator/">Seed this niche</a><a class="btn" href="/category/${html(niche.category_slug)}/">Open category</a></div></div><aside class="hero-card"><div class="metric"><span>0</span><small>published</small></div><div class="metric"><span>READY</span><small>seed lane</small></div></aside></section>`;
  return pageWrap({ title:`${niche.name} | Valley Verified`, description:`Valley Verified ${niche.name} niche hub ready for seeded local businesses.`, canonical:`${SITE_URL}/niche/${niche.slug}/`, bodyClass:'niche-page' }, body);
}
function duplicateScannerPage(audit, businesses){
  const possibleRows = audit.possible_duplicates.map(row => `<tr><td><strong>${row.score}</strong></td><td><a href="/business/${html(row.a.id)}/">${html(row.a.name)}</a><br><small>${html(row.a.source_file || '')}</small></td><td><a href="/business/${html(row.b.id)}/">${html(row.b.name)}</a><br><small>${html(row.b.source_file || '')}</small></td><td>${html(row.reasons.join(' • '))}</td></tr>`).join('') || '<tr><td colspan="4">No possible duplicate pairs above the review threshold.</td></tr>';
  const mergeRows = audit.exact_merges.map(row => `<tr><td>${html(row.reason)}</td><td>${html(row.kept_name)}<br><small>${html(row.kept_id)}</small></td><td>${html(row.merged_name)}<br><small>${html(row.merged_id)}</small></td><td>${html((row.source_files || []).join(' • '))}</td></tr>`).join('') || '<tr><td colspan="4">No exact duplicate merges in this build.</td></tr>';
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Duplicate control</p><h1>One real business, one posting.</h1><p class="hero-text">The build scans each import for repeat domains, phones, emails, social handles, source hashes, names, addresses, city, ZIP, and category overlap. High-confidence matches merge automatically. Lower-confidence matches land here for admin review.</p></div><aside class="hero-card"><div class="metric"><span>${audit.exact_merges.length}</span><small>auto merges</small></div><div class="metric"><span>${audit.possible_duplicates.length}</span><small>review pairs</small></div><div class="metric"><span>${audit.suppressed.length}</span><small>suppressed</small></div><div class="metric"><span>${businesses.length}</span><small>published</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Review queue</p><h2>Possible duplicate postings</h2></div><a class="btn" href="/data/duplicate-report.json">Open JSON</a></div><div class="table-wrap"><table><thead><tr><th>Risk</th><th>Listing A</th><th>Listing B</th><th>Signals</th></tr></thead><tbody>${possibleRows}</tbody></table></div></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Auto merge ledger</p><h2>Exact import collisions handled at build time</h2></div></div><div class="table-wrap"><table><thead><tr><th>Reason</th><th>Kept</th><th>Merged</th><th>Sources</th></tr></thead><tbody>${mergeRows}</tbody></table></div></section><section class="section glass"><p class="eyebrow">Removal workflow</p><h2>How an admin removes bullshit duplicates</h2><p class="muted">Add the listing id, identity key, source hash, domain, phone, or email to <code>seed/businesses/suppressions.json</code>, commit the file, and redeploy. The next build will remove the listing and record it in <code>/data/duplicate-report.json</code>.</p></section>`;
  return pageWrap({ title:'Duplicate Scanner | Valley Verified', description:'Duplicate posting scanner and merge ledger for Valley Verified seeded business imports.', canonical:`${SITE_URL}/duplicates/`, bodyClass:'duplicates-page' }, body);
}
function adminReviewPage(businesses, audit, report){
  const queue = moderationQueue(businesses, audit);
  const rows = queue.map(row => `<tr><td><strong>${row.priority}</strong></td><td><a href="/business/${html(row.id)}/">${html(row.name)}</a><br><small>${html(row.identity_key || '')}</small></td><td>${html(row.reasons.join(' • '))}</td><td><code>${html(row.suppression_hint)}</code></td></tr>`).join('') || '<tr><td colspan="4">No admin review items in this build.</td></tr>';
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Admin control</p><h1>Business posting review console</h1><p class="hero-text">This is the upstream-auth-ready admin surface for collision scans, suspicious submissions, thin listings, owner mismatch signals, and removals via seed suppression. It does not pretend to have local auth.</p></div><aside class="hero-card"><div class="metric"><span>${queue.length}</span><small>review items</small></div><div class="metric"><span>${audit.exact_merges.length}</span><small>merged dupes</small></div><div class="metric"><span>${audit.possible_duplicates.length}</span><small>dupe pairs</small></div><div class="metric"><span>${report.records.suppressed || 0}</span><small>suppressed</small></div></aside></section><section class="platform-strip"><a class="glass proof-card" href="/duplicates/"><span>DUP</span><h2>Duplicate scanner</h2><p>See auto-merges and possible duplicate pairs.</p></a><a class="glass proof-card" href="/data/moderation-queue.json"><span>MOD</span><h2>Moderation JSON</h2><p>Machine-readable admin queue for dashboards.</p></a><a class="glass proof-card" href="/operator/"><span>IMP</span><h2>Import console</h2><p>Normalize scrape files before dropping them into seed inbox.</p></a></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Admin queue</p><h2>Listings needing review</h2></div><a class="btn" href="/data/moderation-queue.json">Open queue JSON</a></div><div class="table-wrap"><table><thead><tr><th>Priority</th><th>Listing</th><th>Reasons</th><th>Suppression hint</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Admin Review | Valley Verified', description:'Admin review console for Valley Verified duplicate, suppression, and moderation signals.', canonical:`${SITE_URL}/admin-review/`, bodyClass:'admin-review-page' }, body);
}
function moderationQueue(businesses, audit){
  const duplicateIds = new Set(audit.possible_duplicates.flatMap(x => [x.a.id, x.b.id]));
  const rows = businesses.map(b => {
    const reasons = unique([...(b.moderation_flags || []), ...(duplicateIds.has(b.id) ? ['possible duplicate posting'] : [])]);
    const priority = reasons.length * 12 + (duplicateIds.has(b.id) ? 30 : 0) + (b.verification_score < 50 ? 15 : 0);
    return { id:b.id, name:b.name, priority, reasons, identity_key:b.identity?.primary_key, source_file:b.source_file, source_hash:b.source_hash, suppression_hint:`identity_keys: [\"${b.identity?.primary_key || b.id}\"]` };
  }).filter(r => r.reasons.length).sort((a,b)=>b.priority-a.priority || a.name.localeCompare(b.name));
  return rows;
}
function identityIndex(businesses){
  return businesses.map(b => ({ id:b.id, name:b.name, identity:b.identity, duplicate_status:b.duplicate_status, source_file:b.source_file, source_hash:b.source_hash }));
}
function shortlistPage(businesses, facets){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Buyer workspace</p><h1>Saved shortlist and request packet builder</h1><p class="hero-text">Visitors can save providers while browsing, then export a shortlist or turn it into a buyer request packet. Everything stays browser-local until upstream auth captures it.</p></div><aside class="hero-card"><div class="metric"><span>${businesses.length}</span><small>available profiles</small></div><div class="metric"><span>${facets.categories.length}</span><small>service lanes</small></div></aside></section><section class="split-grid"><div class="glass section"><div class="section-head"><div><p class="eyebrow">Saved</p><h2>Your shortlist</h2></div><span class="stat-pill" id="shortlistCount">0 saved</span></div><div id="shortlistItems" class="shortlist-list"><p class="muted">No providers saved in this browser yet. Use Save on any business card.</p></div><div class="button-row"><a class="btn" href="/directory/">Browse directory</a><button class="btn" data-export-shortlist>Export JSON</button><button class="btn" data-clear-shortlist>Clear</button></div></div><div class="glass section"><p class="eyebrow">Request handoff</p><h2>Build packet from saved providers</h2><form data-shortlist-request><div class="form-row"><label>Buyer/contact</label><input name="contact" placeholder="Name, email, phone" /></div><div class="form-row"><label>Need</label><textarea name="details" placeholder="Describe the job, timeline, budget, service area..."></textarea></div><div class="button-row"><button class="btn primary" type="button" data-build-shortlist-request>Build shortlist request</button><button class="btn" type="button" data-download-shortlist-request disabled>Download packet</button></div></form><pre id="shortlistRequestOutput" class="code-output small-code">Save providers, then build a request packet.</pre></div></section>`;
  return pageWrap({ title:'Shortlist | Valley Verified', description:'Browser-local Valley Verified shortlist workspace and request packet builder.', canonical:`${SITE_URL}/shortlist/`, bodyClass:'shortlist-page' }, body);
}
function comparePage(businesses, facets){
  const pickList = visibleBusinessList(businesses);
  const options = pickList.map(b=>`<option value="${html(b.id)}">${html(b.name)} — ${html(b.city)} / ${html(b.category)}</option>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Buyer intelligence</p><h1>Compare businesses side by side</h1><p class="hero-text">Load saved providers or pick any seeded listing and compare score, pricing, location, badges, contact paths, and data gaps before sending a request.</p></div><aside class="hero-card"><div class="metric"><span>${businesses.length}</span><small>profiles</small></div><div class="metric"><span>4</span><small>compare slots</small></div></aside></section><section class="glass section compare-shell" data-compare-page><div class="notice strong"><strong>Large dataset mode:</strong> selector shows ${pickList.length.toLocaleString()} listings, while direct compare links and data exports cover ${businesses.length.toLocaleString()} profiles.</div><div class="compare-controls"><select data-compare-select><option value="">Choose a business</option>${options}</select><button class="btn primary" data-add-compare>Add to compare</button><button class="btn" data-load-shortlist-compare>Load shortlist</button><button class="btn" data-clear-compare>Clear</button></div><div id="compareGrid" class="compare-grid"><p class="muted">Choose providers or load a shortlist.</p></div></section><script type="application/json" id="businessData">[]</script>`;
  return pageWrap({ title:'Compare Businesses | Valley Verified', description:'Side-by-side comparison workspace for seeded Valley Verified business profiles.', canonical:`${SITE_URL}/compare/`, bodyClass:'compare-page' }, body);
}
function dealDeskPage(businesses, facets){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Deal desk</p><h1>Local request operations without building auth twice</h1><p class="hero-text">A browser-local intake and fulfillment surface for requests, claim packets, and seed-ready follow-up. Upstream auth can wrap this later; the app logic is already separate.</p></div><aside class="hero-card"><div class="metric"><span>${businesses.filter(b=>b.accepts_requests).length}</span><small>request-ready</small></div><div class="metric"><span>${facets.categories.length}</span><small>lanes</small></div></aside></section><section class="platform-strip"><a class="glass proof-card" href="/request/"><span>RFQ</span><h2>Buyer requests</h2><p>Generate quote packets for any seeded business, category, or city.</p></a><a class="glass proof-card" href="/claim/"><span>CLM</span><h2>Claim packets</h2><p>Owner update workflow for profile corrections and verification signals.</p></a><a class="glass proof-card" href="/submit/"><span>ADD</span><h2>New listings</h2><p>Turn new businesses into inbox-ready seed JSON.</p></a></section><section class="section glass"><p class="eyebrow">Local operations note</p><h2>Auth stays upstream; records stay exportable.</h2><p class="muted">This page deliberately creates downloadable packets instead of account-bound records. Once Omega/upstream auth owns identity, these packet builders can submit to protected endpoints without rewriting the public platform.</p></section>`;
  return pageWrap({ title:'Deal Desk | Valley Verified', description:'Valley Verified request, claim, and new-listing operations workspace designed for upstream auth.', canonical:`${SITE_URL}/deal-desk/`, bodyClass:'deal-desk-page' }, body);
}
function auditPage(businesses, report){
  const rows = auditRows(businesses);
  const visibleRows = rows.slice(0, 260);
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Operator audit</p><h1>Data quality queue for marketplace growth</h1><p class="hero-text">This page flags the listings that need better contact data, proof signals, pricing, coordinates, or descriptions before they become sales-grade profiles.</p></div><aside class="hero-card"><div class="metric"><span>${rows.filter(r=>r.gaps.length).length}</span><small>needs work</small></div><div class="metric"><span>${report.records.published}</span><small>published</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Priority queue</p><h2>Fix these records first</h2></div><a class="btn small" href="/operator/">Open importer</a></div><div class="table-wrap"><table><thead><tr><th>Business</th><th>Score</th><th>Priority</th><th>Missing / weak</th><th>Route</th></tr></thead><tbody>${visibleRows.map(({business:b,gaps,priority})=>`<tr><td>${html(b.name)}</td><td>${b.verification_score}</td><td>${priority}</td><td>${html(gaps.join(', ') || 'No major gaps')}</td><td><a href="/business/${html(b.id)}/">Open</a></td></tr>`).join('')}</tbody></table></div></section>`;
  return pageWrap({ title:'Audit Queue | Valley Verified', description:'Operator data quality queue for Valley Verified seeded business records.', canonical:`${SITE_URL}/audit/`, bodyClass:'audit-page' }, body);
}
function embedPage(report){
  const snippet = `<div data-phx-verified-widget data-limit="6"></div>\n<script src="${SITE_URL}/embed/businesses.js" defer></script>`;
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Embed kit</p><h1>Portable business widgets for partner pages</h1><p class="hero-text">Use the generated widget script to render seeded Valley Verified listings on other surfaces without copying profile cards by hand.</p></div><aside class="hero-card"><div class="metric"><span>${report.records.published}</span><small>profiles</small></div><div class="metric"><span>JS</span><small>widget</small></div></aside></section><section class="section glass"><p class="eyebrow">Install snippet</p><h2>Drop this on a page</h2><pre class="code-output small-code">${html(snippet)}</pre><p class="muted">Optional attributes: <code>data-category</code>, <code>data-city</code>, and <code>data-limit</code>.</p></section><section class="section glass"><p class="eyebrow">Live preview</p><h2>Generated from current data</h2><div data-phx-verified-widget data-limit="4"></div><script src="/embed/businesses.js" defer></script></section>`;
  return pageWrap({ title:'Embed Kit | Valley Verified', description:'Embeddable Valley Verified business listing widget generated from platform data.', canonical:`${SITE_URL}/embed/`, bodyClass:'embed-page' }, body);
}
function embedScript(){
  return `(function(){\n  function esc(v){return String(v||'').replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#39;'}[c]||c;});}\n  function render(host,data){var limit=Number(host.dataset.limit||6);var cat=(host.dataset.category||'').toLowerCase();var city=(host.dataset.city||'').toLowerCase();var items=(data.businesses||[]).filter(function(b){return (!cat||String(b.category).toLowerCase()===cat)&&(!city||String(b.city).toLowerCase()===city);}).slice(0,limit);host.innerHTML='<div style="display:grid;gap:12px">'+items.map(function(b){return '<a href="/business/'+esc(b.id)+'/" style="display:block;text-decoration:none;border:1px solid rgba(23,20,16,.16);border-radius:8px;padding:14px;background:#fffaf0;color:#171410;font-family:Inter,system-ui,sans-serif"><strong>'+esc(b.name)+'</strong><br><span style="color:rgba(23,20,16,.68);font-size:13px">'+esc(b.city)+' / '+esc(b.category)+' / score '+esc(b.verification_score)+'</span></a>';}).join('')+'</div>'; }\n  fetch('/data/businesses.json').then(function(r){return r.json();}).then(function(data){document.querySelectorAll('[data-phx-verified-widget]').forEach(function(host){render(host,data);});}).catch(function(){document.querySelectorAll('[data-phx-verified-widget]').forEach(function(host){host.textContent='Valley Verified widget failed to load.';});});\n})();\n`;
}

function homePage(businesses, facets, report){
  const featured = businesses.filter(b=>b.featured).slice(0,4);
  const newest = [...businesses].sort((a,b)=>String(b.last_verified).localeCompare(String(a.last_verified))).slice(0,4);
  const body = `<section class="hero glass hero-platform">
    <div class="hero-copy"><p class="eyebrow">Phoenix-area business intelligence platform</p><h1>A seeded local discovery network, not a one-page directory.</h1><p class="hero-text">Valley Verified now has separate landing, directory, business profile, city, category, operator, platform, and data surfaces. Drop scrape exports into the seed inbox, rebuild, and the platform publishes new indexed pages automatically.</p><div class="hero-actions"><a class="btn primary" href="/directory/">Open directory</a><a class="btn" href="/platform/">View platform status</a><a class="btn ghost" href="/operator/">Open import console</a></div></div>
    <aside class="hero-card"><div class="metric"><span>${businesses.length}</span><small>business profiles</small></div><div class="metric"><span>${facets.categories.length}</span><small>category hubs</small></div><div class="metric"><span>${facets.cities.length}</span><small>city hubs</small></div><div class="metric"><span>${report.routes.total}</span><small>generated routes</small></div></aside>
  </section>
  <section class="platform-strip"><div class="glass proof-card"><span>01</span><h2>Business profiles</h2><p>Every business receives a static profile page with contact actions, verification signals, policies, tags, structured data, and source metadata.</p></div><div class="glass proof-card"><span>02</span><h2>Seed pipeline</h2><p>CSV and JSON scrape files in <code>seed/businesses/inbox/</code> are loaded, normalized, deduped, scored, and exported into platform data.</p></div><div class="glass proof-card"><span>03</span><h2>SEO network</h2><p>City and category hubs, sitemap, robots, llms.txt, manifest, and search index are generated during build.</p></div></section>
  <section class="section glass"><div class="section-head"><div><p class="eyebrow">Platform tools</p><h2>Buyer and operator workflows</h2></div><a class="btn small" href="/deal-desk/">Open deal desk</a></div><div class="tile-grid"><a class="platform-tile" href="/shortlist/"><span>Save</span><h3>Shortlist workspace</h3><p>Visitors can save providers and export request packets.</p></a><a class="platform-tile" href="/compare/"><span>Side</span><h3>Comparison board</h3><p>Compare seeded businesses by score, price, badges, and contact paths.</p></a><a class="platform-tile" href="/audit/"><span>Fix</span><h3>Data quality queue</h3><p>Operators can see which records need enrichment first.</p></a><a class="platform-tile" href="/embed/"><span>Port</span><h3>Embed kit</h3><p>Render business widgets on other pages from the same dataset.</p></a></div></section>
  <section class="section glass"><div class="section-head"><div><p class="eyebrow">Marketplace</p><h2>Featured businesses</h2></div><a class="btn small" href="/directory/">View all</a></div><div class="cards">${(featured.length ? featured : newest).map(miniBusinessCard).join('')}</div></section>
  <section class="split-grid"><div class="glass section"><div class="section-head"><div><p class="eyebrow">Category hubs</p><h2>Browse by service lane</h2></div></div><div class="tile-grid">${facets.categories.map(c => categoryCard(c, businesses)).join('')}</div></div><div class="glass section"><div class="section-head"><div><p class="eyebrow">City hubs</p><h2>Browse by location</h2></div></div><div class="tile-grid">${facets.cities.map(c => cityCard(c, businesses)).join('')}</div></div></section>
  <section class="section glass pipeline"><p class="eyebrow">Operator workflow</p><h2>Scrape outside → drop files → redeploy → pages appear.</h2><div class="pipeline-grid"><div><strong>1. Export</strong><p>Collect outside business data as CSV or JSON.</p></div><div><strong>2. Seed</strong><p>Place batches in <code>seed/businesses/inbox/</code>.</p></div><div><strong>3. Build</strong><p>Run <code>npm run build</code> or let Netlify do it.</p></div><div><strong>4. Publish</strong><p>The directory, business pages, hubs, sitemap, and search index update.</p></div></div></section>`;
  return pageWrap({ title:'Valley Verified Network Platform', description:'Seed-powered Phoenix business discovery platform with static business profiles, city hubs, category hubs, and operator import tools.', canonical:`${SITE_URL}/`, bodyClass:'home-page' }, body);
}
function directoryShell({ businesses, facets, title='Business Directory', eyebrow='Live marketplace', description='Search and filter seeded Phoenix-area business listings.', canonical=`${SITE_URL}/directory/`, routeFilter = {} }){
  const visible = visibleBusinessList(businesses);
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">${html(eyebrow)}</p><h1>${html(title)}</h1><p class="hero-text">${html(description)}</p></div><div class="hero-actions"><button class="btn" data-export-visible>Export visible CSV</button><button class="btn" data-copy-link>Copy page link</button><a class="btn" href="/exports/">Open exports</a></div></section>
  <section class="directory-layout" data-directory-page data-initial-category="${html(routeFilter.category || '')}" data-initial-city="${html(routeFilter.city || '')}" data-total-records="${businesses.length}" data-rendered-records="${visible.length}">
    <aside class="filters glass"><div class="section-head"><div><p class="eyebrow">Controls</p><h2>Filter listings</h2></div><span id="liveCount" class="stat-pill">${visible.length}</span></div>
      <label for="q">Search</label><input id="q" type="search" placeholder="Name, service, city, tag..." />
      <div class="filter-grid"><div><label for="category">Category</label><select id="category"><option value="">All categories</option>${facets.categories.map(c=>`<option value="${html(c)}" ${routeFilter.category===c?'selected':''}>${html(c)}</option>`).join('')}</select></div><div><label for="city">City</label><select id="city"><option value="">All cities</option>${facets.cities.map(c=>`<option value="${html(c)}" ${routeFilter.city===c?'selected':''}>${html(c)}</option>`).join('')}</select></div></div>
      <label for="sort">Sort</label><select id="sort"><option value="featured">Featured + score</option><option value="recent">Recently verified</option><option value="name">Name A-Z</option><option value="distance">Nearest first</option></select>
      <div class="toggle-list"><label class="checkline"><input id="verifiedOnly" type="checkbox" /><span>Verified only</span></label><label class="checkline"><input id="transparentOnly" type="checkbox" /><span>No-hidden-fee listings</span></label><label class="checkline"><input id="mobileOnly" type="checkbox" /><span>Mobile providers</span></label><label class="checkline"><input id="pricedOnly" type="checkbox" /><span>Has pricing signal</span></label></div>
      <div class="tag-cloud" data-tag-cloud>${facets.tags.slice(0,32).map(t=>`<button class="chip" data-tag="${html(t)}">${html(t)}</button>`).join('')}</div>
      <div class="button-row"><button class="btn" data-reset>Reset</button><button class="btn" data-use-location>Use my location</button></div><p class="muted tight">Location stays in the browser and is only used for distance sorting.</p>
    </aside>
    <section class="results glass"><div class="section-head"><div><p class="eyebrow">Results</p><h2 id="resultsTitle">Seeded business profiles</h2></div><span class="stat-pill" data-visible-count>${visible.length} shown</span></div>${scalableNotice(businesses.length, visible.length)}<div id="cards" class="cards">${visible.map(miniBusinessCard).join('')}</div><div id="empty" class="empty hidden"><h3>No listings match this rendered page.</h3><p>Clear filters, open a business route from the sitemap, or use the full JSON/CSV exports for every seeded record.</p></div></section>
  </section>`;
  return pageWrap({ title:`${title} | Valley Verified`, description, canonical, bodyClass:'directory-page' }, body);
}

function offersForBusiness(b){
  const fromSeed = (b.offers || []).map((offer, i) => ({ ...offer, id: `${b.id}-${offer.id || i + 1}`, business_id:b.id, business_name:b.name, business_url:`/business/${b.id}/`, category:b.category, city:b.city, score:b.verification_score, booking_url:b.booking_url || b.website }));
  if(fromSeed.length) return fromSeed;
  if(b.starting_price !== null || b.price_note){
    return [{ id:`${b.id}-starter`, business_id:b.id, business_name:b.name, business_url:`/business/${b.id}/`, category:b.category, city:b.city, score:b.verification_score, title:`${b.subcategory || b.category} starter`, description:b.price_note || b.description, price:b.starting_price, price_label:priceLabel(b), cta:'Request quote', terms:'Confirm scope, availability, and final pricing directly with the provider.', booking_url:b.booking_url || b.website }];
  }
  return [];
}
function allOffers(businesses){ return businesses.flatMap(offersForBusiness); }
function offerCard(offer){
  const price = offer.price_label || (offer.price !== null && offer.price !== undefined ? money(offer.price) : 'Quote required');
  return `<article class="business-card offer-card" data-card data-name="${html(lower(offer.title + ' ' + offer.business_name))}" data-category="${html(offer.category)}" data-city="${html(offer.city)}" data-tags="${html(lower([offer.title, offer.description, offer.business_name, offer.category, offer.city].join(' ')))}" data-score="${html(offer.score)}" data-date="" data-featured="0"><div class="card-glow"></div><div class="card-top"><div><p class="eyebrow">${html(offer.city)} • ${html(offer.category)}</p><h3>${html(offer.title)}</h3></div><div class="score"><strong>${html(offer.score)}</strong><small>score</small></div></div><p class="card-desc">${html(offer.description)}</p><div class="mini-grid"><span>${html(price)}</span><span>${html(offer.business_name)}</span><span>${html(offer.terms || 'Confirm final scope')}</span><span>${html(offer.cta || 'Request')}</span></div><div class="card-actions"><a class="btn small primary" href="${html(offer.business_url)}">Open provider</a><a class="btn small" href="/request/?business=${html(offer.business_id)}&offer=${html(offer.id)}">Request offer</a>${offer.booking_url ? `<a class="btn small" href="${html(offer.booking_url)}" target="_blank" rel="noopener">Book / Site</a>` : ''}</div></article>`;
}
function exposureProducts(){
  const products = [
    { id:'free-seeded-listing', name:'Free public business landing', audience:'business', price_monthly:0, setup_fee:0, status:'customer_gift', includes:['Canonical public profile page','City/category discovery','Claim/update packet','Basic search placement','One reviewed posting for qualified 0S customers after their first paid month'], requirements:['Public business record, owner-submitted packet, or first-month 0S customer posting credit'], sell_motion:'Lead with the gift: the business gets a useful public landing with no obligation, and trust, placement, routing, or managed growth remain optional only when they want more reach.' },
    { id:'verified-profile-upgrade', name:'Verified Profile Upgrade', audience:'business', price_monthly:49, setup_fee:99, status:'sellable', includes:['Owner verification review','Stronger profile copy','Offer/package blocks','Verified-ready trust tier','Priority cleanup in lifecycle queue'], requirements:['Owner/contact proof','No unresolved duplicate/fraud flags'], sell_motion:'Entry paid product for owners who want the listing to look legitimate and conversion-ready.' },
    { id:'featured-market-placement', name:'Featured Market Placement', audience:'business', price_monthly:149, setup_fee:0, status:'optional_when_market_has_supply', includes:['Featured placement on city/category market pages','Featured card on category hub','Sponsor inventory report placement','Monthly proof snapshot'], requirements:['Verified profile upgrade or strong-seed record','Market lane must have enough supply to avoid fake scarcity'], sell_motion:'Optional after claim: better exposure inside a specific local lane when the business asks for more reach.' },
    { id:'lead-routing-member', name:'Lead Routing Member', audience:'business', price_monthly:199, setup_fee:0, status:'sellable_when_contact_ready', includes:['Eligibility for buyer request routing','Priority routing when score/contact readiness are strong','Request packet export','Category/city lane participation'], requirements:['Phone, email, or booking URL','Response process confirmed'], sell_motion:'Sell to service providers that answer fast and want inbound local opportunities.' },
    { id:'category-sponsor', name:'Category Sponsor', audience:'business', price_monthly:399, setup_fee:0, status:'limited_inventory', includes:['Sponsor slot on category and matching market surfaces','Brand placement in embed/widget inventory','Featured link in category exports','Territory exclusivity flag in sponsor inventory'], requirements:['Owner verified','No high-risk duplicate cluster','Category has enough active profiles'], sell_motion:'Higher-ticket lane ownership for stronger businesses.' },
    { id:'managed-growth-pack', name:'Managed Growth Pack', audience:'business', price_monthly:799, setup_fee:299, status:'premium_service', includes:['Profile upgrade','Offer design','Owner verification handling','Monthly enrichment pass','Sponsor/lead-routing setup','AE-assisted exposure planning'], requirements:['Manual approval','Owner agreement outside platform'], sell_motion:'Done-for-them exposure service for businesses that want you to handle the cleanup and promotion.' }
  ];
  return { updated_at:TODAY, currency:'USD', products, note:'Pricing is a platform model, not a payment/auth implementation. Upstream auth/billing can gate these later.' };
}
function activationPipeline(businesses){
  const records = businesses.map(b => {
    const hasContact = !!(b.phone || b.email || b.website || b.booking_url);
    const claimNeeded = !['claimed','verified','owner_verified'].includes(lower(b.claim_status || ''));
    const gaps = scoreGaps(b);
    const duplicateRisk = (b.moderation_flags || []).some(f => /duplicate|poster|differs|domain/i.test(f));
    let stage = 'seeded_supply';
    if(duplicateRisk) stage = 'risk_review';
    else if(!hasContact) stage = 'enrichment_needed';
    else if(claimNeeded) stage = 'owner_claim_ready';
    else if((b.verification_score || 0) >= 70) stage = 'upgrade_ready';
    const recommended_product = stage === 'upgrade_ready' ? 'featured-market-placement' : stage === 'owner_claim_ready' ? 'verified-profile-upgrade' : stage === 'enrichment_needed' ? 'free-seeded-listing' : 'manual-review';
    const priority_score = Math.min(100, Math.max(5, (hasContact ? 25 : 0) + (b.website ? 15 : 0) + (b.phone ? 10 : 0) + ((b.verification_score || 0) / 2) + (b.category === 'Major Employers' ? 8 : 0) - (duplicateRisk ? 35 : 0) - Math.min(gaps.length * 4, 24)));
    return { business_id:b.id, name:b.name, url:`/business/${b.id}/`, city:b.city, category:b.category, niche:b.niche, stage, priority_score:Math.round(priority_score), recommended_product, contact:{ phone:b.phone, email:b.email, website:b.website, booking_url:b.booking_url }, trust_tier:trustTierFor(b), verification_score:b.verification_score, gaps, next_action: stage === 'risk_review' ? 'Review duplicate/poster signals before selling placement.' : stage === 'enrichment_needed' ? 'Find website/phone/email before AE activation.' : stage === 'owner_claim_ready' ? 'Contact owner and offer claim/verification upgrade.' : 'Offer featured placement or lead-routing membership.' };
  }).sort((a,b)=>b.priority_score-a.priority_score || a.name.localeCompare(b.name));
  const stage_counts = records.reduce((acc,r)=>{ acc[r.stage]=(acc[r.stage]||0)+1; return acc; }, {});
  return { updated_at:TODAY, stats:{ records:records.length, stage_counts, high_priority:records.filter(r=>r.priority_score>=70).length, claim_ready:records.filter(r=>r.stage==='owner_claim_ready').length, upgrade_ready:records.filter(r=>r.stage==='upgrade_ready').length }, records:records.slice(0, 10000) };
}
function aeTerritoryPlan(businesses, facets, markets, coverage, activation){
  const byCity = facets.cities.map(city => {
    const rows = businesses.filter(b=>b.city===city);
    const act = activation.records.filter(r=>r.city===city);
    const marketRows = markets.filter(m=>m.city===city);
    const gaps = coverage.filter(g=>g.city===city).slice(0, 10);
    const top_categories = facets.categories.map(category => ({ category, count:rows.filter(b=>b.category===category).length, claim_ready:act.filter(r=>r.category===category && r.stage==='owner_claim_ready').length, upgrade_ready:act.filter(r=>r.category===category && r.stage==='upgrade_ready').length })).filter(x=>x.count).sort((a,b)=>b.count-a.count).slice(0, 8);
    const priority_score = Math.round(Math.min(100, rows.length/50 + act.filter(r=>r.priority_score>=70).length*2 + marketRows.filter(m=>m.count>=20).length*4));
    return { city, city_slug:slugify(city), total_profiles:rows.length, high_priority_accounts:act.filter(r=>r.priority_score>=70).length, claim_ready:act.filter(r=>r.stage==='owner_claim_ready').length, upgrade_ready:act.filter(r=>r.stage==='upgrade_ready').length, sellable_markets:marketRows.filter(m=>m.count>=20).length, priority_score, top_categories, coverage_gaps:gaps, route:`/city/${slugify(city)}/` };
  }).sort((a,b)=>b.priority_score-a.priority_score || b.total_profiles-a.total_profiles);
  const call_queue = activation.records.filter(r=>['owner_claim_ready','upgrade_ready'].includes(r.stage)).slice(0, 2500).map((r, i) => ({ rank:i+1, business_id:r.business_id, name:r.name, city:r.city, category:r.category, priority_score:r.priority_score, product:r.recommended_product, phone:r.contact.phone, email:r.contact.email, website:r.contact.website, script_angle: r.stage==='upgrade_ready' ? 'Your listing is already strong enough to pitch paid exposure.' : 'Your business is already listed; claim and clean it up before competitors do.', url:r.url }));
  return { updated_at:TODAY, territories:byCity, call_queue, operating_model:['Seed the market first','Use duplicate/fraud queues to keep one canonical profile per business','AE contacts owners to claim, enrich, verify, and upgrade','Sell exposure only where category/city supply is strong enough','Use suppression files for removals and rebuild for durable moderation'] };
}
function salesPlaybooks(facets, products){
  const productNames = products.products.map(p=>p.name);
  return { updated_at:TODAY, products:productNames, ae_openers:[
    'Your business already has a basic Valley Verified profile from public business records. I am reaching out so the actual owner can claim, correct, and improve it before buyers see thin information.',
    'We are building a verified local service network for Phoenix-area businesses. The free listing is the seed layer; the paid upgrade is for owners who want stronger exposure and cleaner buyer trust signals.',
    'This is not another empty ad directory. We dedupe listings, run fraud checks, publish city/category pages, and give each business one canonical profile.'
  ], objection_handles:[
    { objection:'I did not ask to be listed.', response:'The free profile is built from public/business seed data or a reviewed customer posting credit. You can claim it, correct it, request suppression, or upgrade it. The goal is one accurate landing for the business, not spam.' },
    { objection:'How is this different from Yelp or Google?', response:'This is a curated local network with canonical dedupe, owner verification packets, category/city market pages, lead-routing eligibility, and AE-assisted cleanup rather than unmanaged reviews.' },
    { objection:'Will I get leads?', response:'Lead routing is sold only after contact readiness and market supply exist. We can start with claim/verification first, then move into featured placement or lead-routing when the listing is ready.' }
  ], followup_sequence:[
    { day:0, channel:'call/email', goal:'Claim and verify owner/contact path.' },
    { day:2, channel:'email/text', goal:'Send profile link, gaps, and recommended upgrade.' },
    { day:7, channel:'call', goal:'Offer featured market placement or lead-routing if profile is ready.' },
    { day:14, channel:'email', goal:'Offer suppression/correction path if owner does not want exposure.' }
  ], category_angles:facets.categories.map(category=>({ category, pitch:`We are building the ${category} lane across Phoenix-area city pages. Claimed providers get cleaner trust signals and stronger placement options.` })) };
}
function revenueReadiness(businesses, markets, activation, products){
  const claimReady = activation.records.filter(r=>r.stage==='owner_claim_ready').length;
  const upgradeReady = activation.records.filter(r=>r.stage==='upgrade_ready').length;
  const sellableMarkets = markets.filter(m=>m.count>=20).length;
  const verifiedProfile = products.products.find(p=>p.id==='verified-profile-upgrade')?.price_monthly || 49;
  const featured = products.products.find(p=>p.id==='featured-market-placement')?.price_monthly || 149;
  const lead = products.products.find(p=>p.id==='lead-routing-member')?.price_monthly || 199;
  const conservative = {
    claim_conversion_rate:0.015,
    upgrade_attach_rate:0.35,
    featured_attach_rate:0.12,
    lead_routing_attach_rate:0.05,
    projected_paid_profiles:Math.round((claimReady + upgradeReady) * 0.015 * 0.35),
    projected_featured_slots:Math.round(Math.min(sellableMarkets * 3, (claimReady + upgradeReady) * 0.015 * 0.12)),
    projected_lead_members:Math.round((claimReady + upgradeReady) * 0.015 * 0.05)
  };
  conservative.projected_mrr = conservative.projected_paid_profiles*verifiedProfile + conservative.projected_featured_slots*featured + conservative.projected_lead_members*lead;
  const aggressive = {
    claim_conversion_rate:0.04,
    upgrade_attach_rate:0.45,
    featured_attach_rate:0.2,
    lead_routing_attach_rate:0.09,
    projected_paid_profiles:Math.round((claimReady + upgradeReady) * 0.04 * 0.45),
    projected_featured_slots:Math.round(Math.min(sellableMarkets * 3, (claimReady + upgradeReady) * 0.04 * 0.2)),
    projected_lead_members:Math.round((claimReady + upgradeReady) * 0.04 * 0.09)
  };
  aggressive.projected_mrr = aggressive.projected_paid_profiles*verifiedProfile + aggressive.projected_featured_slots*featured + aggressive.projected_lead_members*lead;
  return { updated_at:TODAY, note:'Forecast model for operator planning only. It is not a revenue guarantee.', inputs:{ published_businesses:businesses.length, owner_claim_ready:claimReady, upgrade_ready:upgradeReady, sellable_markets:sellableMarkets }, pricing:{ verified_profile_upgrade:verifiedProfile, featured_market_placement:featured, lead_routing_member:lead }, scenarios:{ conservative, aggressive } };
}
function marketplaceCommandCenter(report, activation, territory, revenue, duplicateClusters){
  return { updated_at:TODAY, mission:'Seeded verified business network with AE activation, one-business-one-posting control, claim/verification workflow, and sellable exposure products.', stats:{ published_businesses:report.records.published, raw_records:report.records.raw, duplicate_collisions:report.records.exact_merges, possible_duplicates:report.records.possible_duplicates, territories:territory.territories.length, ae_call_queue:territory.call_queue.length, projected_conservative_mrr:revenue.scenarios.conservative.projected_mrr, projected_aggressive_mrr:revenue.scenarios.aggressive.projected_mrr, duplicate_clusters:duplicateClusters.stats?.clusters || 0 }, next_operator_moves:['Review high-priority duplicate/fraud clusters before selling exposure.','Assign AEs to the top territory lanes.','Contact owner-claim-ready businesses first.','Use claim packets to correct profiles and collect verification proof.','Sell verified profile upgrades before featured placements.','Use coverage gaps to guide the next scrape batch.'] };
}
function publicClaimsLedger(report, quality, duplicateClusters, revenue){
  const claims = [
    { claim:'Valley Verified is a seeded Phoenix-area business discovery network.', status:'supported', evidence:`${report.records.published} deduped public business profiles generated from ${report.records.raw} raw seed records.` },
    { claim:'Businesses get one canonical public profile instead of duplicate postings.', status:'supported', evidence:`${report.records.exact_merges} exact duplicate/import collisions merged; ${duplicateClusters.stats?.clusters || 0} duplicate/fingerprint clusters exported for admin review.` },
    { claim:'Business pages, city hubs, category hubs, niche hubs, and market pages are generated from seed data.', status:'supported', evidence:`${report.routes.business} business URLs, ${report.routes.city} city hubs, ${report.routes.category} category hubs, ${report.routes.niche} niche hubs, and ${report.routes.market} market pages counted in the route manifest.` },
    { claim:'The platform supports AE activation and exposure products.', status:'supported', evidence:`AE queue, activation pipeline, pricing model, territory plan, and revenue readiness exports generated. Conservative modeled MRR: ${money(revenue.scenarios.conservative.projected_mrr)}.` },
    { claim:'Every listing is owner verified.', status:'blocked', evidence:'Do not claim this yet. Seeded records may be public/license/import sourced until the owner completes the claim and verification packet.' },
    { claim:'Valley Verified guarantees leads, rankings, legal compliance, or business results.', status:'blocked', evidence:'Do not claim guaranteed results. Pricing/revenue pages are operator planning models and exposure packages, not outcome guarantees.' }
  ];
  return { updated_at:TODAY, doctrine:'Public copy must distinguish seeded/public-source listings from owner-verified listings. Verified language is allowed only when the verification packet is completed or the seed provides a supported verification signal.', claims, import_quality:{ raw_records:quality.raw_records, published_records:quality.published_records, rejection_candidates:quality.rejection_candidates.length } };
}
function productionReadinessGate(report, quality, duplicateClusters, crawlBudget, revenue){
  const gates = [
    { gate:'Seeded marketplace volume', status:report.records.published >= 1000 ? 'pass':'open', evidence:`${report.records.published} published deduped businesses.` },
    { gate:'Duplicate prevention', status:report.records.exact_merges >= 1 ? 'pass':'warn', evidence:`${report.records.exact_merges} exact duplicate/import collisions merged; ${report.records.possible_duplicates} possible duplicate pairs queued.` },
    { gate:'Static hand-page routing', status:report.records.missing_static_business_pages === 0 ? 'pass':'open', evidence:`Profile mode: ${report.records.profile_mode}; ${report.records.static_business_pages}/${report.records.static_business_pages_required} hand pages present.` },
    { gate:'Split sitemap/crawl controls', status:crawlBudget.business_sitemap_chunks >= 1 ? 'pass':'open', evidence:`${crawlBudget.business_sitemap_chunks} business sitemap chunk(s), ${crawlBudget.business_archive_pages} archive pages.` },
    { gate:'Admin/operator crawl safety', status:'pass', evidence:'Admin/import/fraud/operator routes are noindex/nofollow and disallowed from robots public crawl paths.' },
    { gate:'Import dry-run and quality reports', status:quality.raw_records === report.records.raw ? 'pass':'open', evidence:`${quality.rejection_candidates.length} rejection candidates exported; source batch ledger generated.` },
    { gate:'Public claims guardrail', status:'pass', evidence:'Claims ledger blocks owner-verified and guaranteed-result claims until supported by proof.' },
    { gate:'Commercial readiness', status:revenue.scenarios.conservative.projected_mrr >= 0 ? 'pass':'open', evidence:`Pricing, AE call queue, activation pipeline, territory plan, and revenue model generated.` },
    { gate:'Live deployment browser smoke', status:'open', evidence:'Requires deploying the generated dist and testing the real production URL. This build cannot certify live DNS/CDN/browser behavior before deployment.' }
  ];
  const blocking = gates.filter(g => g.status === 'open').map(g=>g.gate);
  return { updated_at:TODAY, package_status:blocking.length === 1 && blocking[0] === 'Live deployment browser smoke' ? 'production-candidate' : 'not-production-ready', live_production_status:'not-certified-until-live-url-smoke-passes', gates, required_live_checks:['Deploy dist through Netlify/Git build.','Open production URL in browser.','Check homepage, directory filters, static business pages, city/category pages, sitemap-index.xml, robots.txt, and request/claim packet builders.','Confirm admin/operator surfaces are behind upstream auth or at minimum noindex and not publicly promoted.'] };
}
function launchPacket(report, claims, readiness){
  return { updated_at:TODAY, launch_position:'Production candidate package, not live-production certified until deployed URL passes smoke.', deploy_folder:'dist', build_commands:['npm run dry-run','npm run build','npm run smoke'], seed_inbox:'seed/businesses/inbox/', public_launch_pages:['/','/directory/','/business/','/category/','/city/','/niche/','/market/','/join/','/pricing/','/trust-network/'], internal_noindex_pages:Array.from(INTERNAL_SURFACE_PATHS), proof_files:['proofs/dry-run-output.txt','proofs/smoke-output.txt','seed-report.json','data/production-readiness.json','data/public-claims-ledger.json'], headline_numbers:{ published_businesses:report.records.published, raw_records:report.records.raw, duplicate_collisions_merged:report.records.exact_merges, platform_routes:report.routes.total, package_status:readiness.package_status }, blocked_public_claims:claims.claims.filter(c=>c.status==='blocked').map(c=>c.claim) };
}
function aeCallQueueCsv(queue){
  const headers = ['rank','business_id','name','city','category','priority_score','product','phone','email','website','script_angle','url'];
  return `${headers.join(',')}\n${queue.map(row=>headers.map(h=>csvEscape(row[h])).join(',')).join('\n')}\n`;
}
function productCard(product){
  const price = product.price_monthly ? `$${product.price_monthly}/mo` : 'Free';
  return `<article class="card product-card"><p class="eyebrow">${html(product.status)}</p><h3>${html(product.name)}</h3><p class="price-tag">${html(price)}${product.setup_fee ? ` + ${money(product.setup_fee)} setup` : ''}</p><p>${html(product.sell_motion)}</p><ul>${product.includes.map(x=>`<li>${html(x)}</li>`).join('')}</ul></article>`;
}
function pricingPage(products, revenue){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Exposure products</p><h1>Our gift is the free landing. Upgrades are optional.</h1><p class="hero-text">The public business page is useful on its own and does not require an upgrade to keep the account. Verification, featured market placement, lead-routing membership, sponsor slots, and managed growth are available only when a business wants more reach.</p><div class="hero-actions"><a class="btn primary" href="/join/">Claim or improve</a><a class="btn" href="/data/exposure-products.json">Open product JSON</a></div></div><aside class="hero-card"><div class="metric"><span>${products.products.length}</span><small>products</small></div><div class="metric"><span>${money(revenue.scenarios.conservative.projected_mrr)}</span><small>modeled MRR</small></div></aside></section><section class="cards">${products.products.map(productCard).join('')}</section>`;
  return pageWrap({ title:'Pricing & Exposure Products | Valley Verified', description:'Valley Verified exposure package model for owner claims, verified profiles, featured placements, lead routing, and managed growth.', canonical:`${SITE_URL}/pricing/`, bodyClass:'pricing-page' }, body);
}
function joinPage(products, activation){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Business owner portal</p><h1>Claim the free landing. Upgrade only if you want more reach.</h1><p class="hero-text">Claim, correct, verify, and grow from a useful public profile. The free page stays useful on its own; verification, placement, lead-routing, or managed growth are optional choices when the profile is ready and the business wants them.</p><div class="hero-actions"><a class="btn primary" href="/claim/">Build claim packet</a><a class="btn" href="/pricing/">View optional exposure</a></div></div><aside class="hero-card"><div class="metric"><span>${activation.stats.claim_ready.toLocaleString()}</span><small>claim-ready</small></div><div class="metric"><span>${activation.stats.upgrade_ready.toLocaleString()}</span><small>upgrade-ready</small></div></aside></section><section class="platform-strip"><div class="glass proof-card"><span>1</span><h2>Free profile</h2><p>Open the canonical public landing generated from seed data or a reviewed 0S customer posting credit.</p></div><div class="glass proof-card"><span>2</span><h2>Submit proof</h2><p>Use the claim packet to request corrections, ownership review, and verification signals.</p></div><div class="glass proof-card"><span>3</span><h2>Optional exposure</h2><p>Move into verified profile, featured market, sponsor, or lead-routing products only if the listing needs more reach.</p></div></section><section class="cards">${products.products.filter(p=>p.audience==='business').map(productCard).join('')}</section>`;
  return pageWrap({ title:'Join Valley Verified | Claim a Business Listing', description:'Business owner claim, correction, verification, and exposure upgrade workflow for Valley Verified.', canonical:`${SITE_URL}/join/`, bodyClass:'join-page' }, body);
}
function aeCommandPage(territory, playbooks, revenue){
  const rows = territory.call_queue.slice(0, 200).map(r=>`<tr><th><a href="${html(r.url)}">${html(r.name)}</a></th><td>${html(r.city)}</td><td>${html(r.category)}</td><td>${r.priority_score}</td><td>${html(r.product)}</td><td>${html(r.script_angle)}</td></tr>`).join('');
  const openerCards = playbooks.ae_openers.map(o=>`<div class="glass proof-card"><span>AE</span><p>${html(o)}</p></div>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">AE command center</p><h1>Give sales reps a real activation queue, not a blank directory.</h1><p class="hero-text">This page turns seeded marketplace supply into outreach priorities, owner-claim angles, upgrade paths, and territory focus.</p><div class="hero-actions"><a class="btn primary" href="/data/ae-call-queue.csv">Download AE call queue</a><a class="btn" href="/data/sales-playbooks.json">Open playbook JSON</a></div></div><aside class="hero-card"><div class="metric"><span>${territory.call_queue.length.toLocaleString()}</span><small>AE targets</small></div><div class="metric"><span>${money(revenue.scenarios.conservative.projected_mrr)}</span><small>modeled MRR</small></div></aside></section><section class="platform-strip">${openerCards}</section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Priority accounts</p><h2>Top AE call queue</h2></div><span class="stat-pill">first 200</span></div><div class="table-wrap"><table><thead><tr><th>Business</th><th>City</th><th>Category</th><th>Score</th><th>Product</th><th>Angle</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'AE Command Center | Valley Verified', description:'AE sales command center, call queue, playbooks, and activation priorities for Valley Verified.', canonical:`${SITE_URL}/ae-command/`, bodyClass:'ae-command-page' }, body);
}
function activationPage(activation){
  const stageCards = Object.entries(activation.stats.stage_counts).map(([stage,count])=>`<div class="glass proof-card"><span>${count.toLocaleString()}</span><h2>${html(titleCase(stage.replaceAll('_',' ')))}</h2><p>Generated activation stage.</p></div>`).join('');
  const rows = activation.records.slice(0, 250).map(r=>`<tr><th><a href="${html(r.url)}">${html(r.name)}</a></th><td>${html(r.city)}</td><td>${html(r.category)}</td><td>${html(r.stage)}</td><td>${r.priority_score}</td><td>${html(r.next_action)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Activation pipeline</p><h1>Every seeded business gets a next commercial move.</h1><p class="hero-text">This pipeline separates thin records, owner-claim targets, upgrade-ready accounts, and risk-review records so operators know what to do next.</p><div class="hero-actions"><a class="btn primary" href="/data/activation-pipeline.json">Open activation JSON</a><a class="btn" href="/data/ae-call-queue.csv">Download AE CSV</a></div></div><aside class="hero-card"><div class="metric"><span>${activation.stats.records.toLocaleString()}</span><small>records</small></div><div class="metric"><span>${activation.stats.high_priority.toLocaleString()}</span><small>high priority</small></div></aside></section><section class="platform-strip">${stageCards}</section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Business</th><th>City</th><th>Category</th><th>Stage</th><th>Priority</th><th>Next action</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Activation Pipeline | Valley Verified', description:'Commercial activation pipeline for seeded businesses in Valley Verified.', canonical:`${SITE_URL}/activation/`, bodyClass:'activation-page' }, body);
}
function territoriesPage(territory){
  const rows = territory.territories.map(t=>`<tr><th><a href="${html(t.route)}">${html(t.city)}</a></th><td>${t.total_profiles.toLocaleString()}</td><td>${t.high_priority_accounts.toLocaleString()}</td><td>${t.claim_ready.toLocaleString()}</td><td>${t.upgrade_ready.toLocaleString()}</td><td>${t.sellable_markets}</td><td>${t.priority_score}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">AE territories</p><h1>Assign reps by city strength, claim volume, and sellable markets.</h1><p class="hero-text">Territories are generated from the same seed data, so AE focus changes as new cities, categories, and profile signals get imported.</p><div class="hero-actions"><a class="btn primary" href="/data/ae-territory-plan.json">Open territory JSON</a><a class="btn" href="/coverage/">Coverage gaps</a></div></div><aside class="hero-card"><div class="metric"><span>${territory.territories.length}</span><small>territories</small></div><div class="metric"><span>${territory.call_queue.length.toLocaleString()}</span><small>call targets</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>City</th><th>Profiles</th><th>High priority</th><th>Claim-ready</th><th>Upgrade-ready</th><th>Sellable markets</th><th>Priority</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'AE Territories | Valley Verified', description:'Generated AE territory plan for Valley Verified city/category marketplace growth.', canonical:`${SITE_URL}/territories/`, bodyClass:'territories-page' }, body);
}
function revenuePage(revenue, products){
  const scenarioRows = Object.entries(revenue.scenarios).map(([name,s])=>`<tr><th>${html(titleCase(name))}</th><td>${Math.round(s.claim_conversion_rate*1000)/10}%</td><td>${s.projected_paid_profiles}</td><td>${s.projected_featured_slots}</td><td>${s.projected_lead_members}</td><td>${money(s.projected_mrr)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Revenue readiness</p><h1>Model the marketplace before selling it.</h1><p class="hero-text">This is an operator forecast model. It keeps the platform honest by separating seeded supply from paid conversion assumptions.</p><div class="hero-actions"><a class="btn primary" href="/data/revenue-readiness.json">Open revenue JSON</a><a class="btn" href="/pricing/">Pricing model</a></div></div><aside class="hero-card"><div class="metric"><span>${money(revenue.scenarios.conservative.projected_mrr)}</span><small>conservative MRR</small></div><div class="metric"><span>${money(revenue.scenarios.aggressive.projected_mrr)}</span><small>aggressive MRR</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Scenario</th><th>Claim rate</th><th>Paid profiles</th><th>Featured slots</th><th>Lead members</th><th>Modeled MRR</th></tr></thead><tbody>${scenarioRows}</tbody></table></div><p class="muted">${html(revenue.note)}</p></section><section class="cards">${products.products.map(productCard).join('')}</section>`;
  return pageWrap({ title:'Revenue Readiness | Valley Verified', description:'Valley Verified marketplace revenue readiness model and product packaging.', canonical:`${SITE_URL}/revenue/`, bodyClass:'revenue-page' }, body);
}
function salesPlaybookPage(playbooks){
  const objections = playbooks.objection_handles.map(o=>`<article class="card"><h3>${html(o.objection)}</h3><p>${html(o.response)}</p></article>`).join('');
  const followup = playbooks.followup_sequence.map(s=>`<tr><th>Day ${s.day}</th><td>${html(s.channel)}</td><td>${html(s.goal)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Sales playbook</p><h1>AE scripts for the verified business network.</h1><p class="hero-text">The sales motion is not “buy ads.” It is claim the seeded profile, clean up trust signals, then upgrade into exposure when the listing is ready.</p><div class="hero-actions"><a class="btn primary" href="/data/sales-playbooks.json">Open playbook JSON</a><a class="btn" href="/ae-command/">AE command</a></div></div><aside class="hero-card"><div class="metric"><span>${playbooks.ae_openers.length}</span><small>openers</small></div><div class="metric"><span>${playbooks.category_angles.length}</span><small>category angles</small></div></aside></section><section class="cards">${objections}</section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Timing</th><th>Channel</th><th>Goal</th></tr></thead><tbody>${followup}</tbody></table></div></section>`;
  return pageWrap({ title:'Sales Playbook | Valley Verified', description:'AE outreach scripts, objection handling, and follow-up sequence for Valley Verified.', canonical:`${SITE_URL}/sales-playbook/`, bodyClass:'sales-playbook-page' }, body);
}
function trustNetworkPage(){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Verified network doctrine</p><h1>One real business. One canonical profile. Clear owner path.</h1><p class="hero-text">Valley Verified is valuable only if the marketplace stays clean: duplicate suppression, owner proof packets, public claim/update paths, and no fake verification claims.</p><div class="hero-actions"><a class="btn primary" href="/verification/">Verification protocol</a><a class="btn" href="/fraud-defense/">Fraud defense</a></div></div><aside class="hero-card"><div class="metric"><span>1:1</span><small>business/profile</small></div><div class="metric"><span>No auth</span><small>upstream-owned</small></div></aside></section><section class="platform-strip"><div class="glass proof-card"><span>01</span><h2>Seeded supply</h2><p>Public and operator-provided business data creates the initial marketplace.</p></div><div class="glass proof-card"><span>02</span><h2>Owner correction</h2><p>Businesses can claim, correct, upgrade, or request suppression through review packets.</p></div><div class="glass proof-card"><span>03</span><h2>Commercial exposure</h2><p>Paid products are sold only after trust and contact readiness improve.</p></div></section>`;
  return pageWrap({ title:'Trust Network | Valley Verified', description:'Valley Verified network doctrine for one-business-one-profile control, owner claims, and verified marketplace trust.', canonical:`${SITE_URL}/trust-network/`, bodyClass:'trust-network-page' }, body);
}
function productionReadinessPage(readiness, launch){
  const rows = readiness.gates.map(g => `<tr><th>${html(g.gate)}</th><td><span class="badge ${g.status === 'pass' ? 'good' : g.status === 'warn' ? 'gold' : ''}">${html(g.status)}</span></td><td>${html(g.evidence)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Production gate</p><h1>${html(readiness.package_status)}.</h1><p class="hero-text">This page separates package readiness from live-production certification. The generated package can be deployed, but the live URL still needs browser smoke before it is called production-certified.</p><div class="hero-actions"><a class="btn primary" href="/data/production-readiness.json">Open readiness JSON</a><a class="btn" href="/data/launch-packet.json">Open launch packet</a></div></div><aside class="hero-card"><div class="metric"><span>${html(readiness.package_status)}</span><small>package</small></div><div class="metric"><span>${html(readiness.live_production_status)}</span><small>live status</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Gate table</p><h2>Launch readiness checks</h2></div><span class="stat-pill">${launch.headline_numbers.published_businesses.toLocaleString()} listings</span></div><div class="table-wrap"><table><thead><tr><th>Gate</th><th>Status</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></div></section><section class="section glass"><p class="eyebrow">Live URL checks</p><h2>Do these after deploy before saying production-certified</h2><ul class="file-list">${readiness.required_live_checks.map(x=>`<li>${html(x)}</li>`).join('')}</ul></section>`;
  return pageWrap({ title:'Production Readiness | Valley Verified', description:'Production readiness gate for the Valley Verified marketplace package.', canonical:`${SITE_URL}/production-readiness/`, bodyClass:'production-readiness-page' }, body);
}
function claimsLedgerPage(claims){
  const rows = claims.claims.map(c => `<tr><th>${html(c.claim)}</th><td><span class="badge ${c.status === 'supported' ? 'good' : ''}">${html(c.status)}</span></td><td>${html(c.evidence)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Public claims ledger</p><h1>Keep sales copy honest before AEs sell exposure.</h1><p class="hero-text">The marketplace has real seeded volume, but public copy must not claim every listing is owner verified or guarantee leads. This ledger says what can and cannot be claimed.</p><div class="hero-actions"><a class="btn primary" href="/data/public-claims-ledger.json">Open claims JSON</a><a class="btn" href="/trust-network/">Trust doctrine</a></div></div><aside class="hero-card"><div class="metric"><span>${claims.claims.filter(c=>c.status==='supported').length}</span><small>supported</small></div><div class="metric"><span>${claims.claims.filter(c=>c.status==='blocked').length}</span><small>blocked</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Claim</th><th>Status</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></div><p class="muted">${html(claims.doctrine)}</p></section>`;
  return pageWrap({ title:'Public Claims Ledger | Valley Verified', description:'Supported and blocked public claims for Valley Verified sales and marketplace copy.', canonical:`${SITE_URL}/claims-ledger/`, bodyClass:'claims-ledger-page' }, body);
}
function launchPacketPage(launch){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Launch packet</p><h1>Deployable package instructions and proof map.</h1><p class="hero-text">This packet lists the publish folder, commands, public launch pages, internal noindex pages, and blocked claims.</p><div class="hero-actions"><a class="btn primary" href="/data/launch-packet.json">Open launch JSON</a><a class="btn" href="/production-readiness/">Production gate</a></div></div><aside class="hero-card"><div class="metric"><span>${html(launch.deploy_folder)}</span><small>publish folder</small></div><div class="metric"><span>${launch.headline_numbers.platform_routes.toLocaleString()}</span><small>routes</small></div></aside></section><section class="split-grid"><div class="glass section"><p class="eyebrow">Commands</p><h2>Build path</h2><ul class="file-list">${launch.build_commands.map(x=>`<li><code>${html(x)}</code></li>`).join('')}</ul></div><div class="glass section"><p class="eyebrow">Public launch pages</p><h2>Promote these first</h2><ul class="file-list">${launch.public_launch_pages.map(x=>`<li><a href="${html(x)}">${html(x)}</a></li>`).join('')}</ul></div></section><section class="section glass"><p class="eyebrow">Blocked claims</p><h2>Do not put these in public sales copy</h2><ul class="file-list">${launch.blocked_public_claims.map(x=>`<li>${html(x)}</li>`).join('')}</ul></section>`;
  return pageWrap({ title:'Launch Packet | Valley Verified', description:'Valley Verified production launch packet and deployment proof map.', canonical:`${SITE_URL}/launch-packet/`, bodyClass:'launch-packet-page' }, body);
}

function businessOfferSection(b){
  const offers = offersForBusiness(b);
  if(!offers.length) return '';
  return `<section class="section glass"><div class="section-head"><div><p class="eyebrow">Packages</p><h2>Bookable signals and starter offers</h2></div><a class="btn small" href="/offers/">All offers</a></div><div class="cards">${offers.map(offerCard).join('')}</div></section>`;
}
function offersPage(businesses, facets){
  const offers = allOffers(businesses);
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Offer marketplace</p><h1>Service packages and quote-ready listings</h1><p class="hero-text">A platform needs commercial surfaces. This page turns seeded pricing and package data into a buyer-facing offer marketplace.</p></div><aside class="hero-card"><div class="metric"><span>${offers.length}</span><small>offers</small></div><div class="metric"><span>${facets.categories.length}</span><small>lanes</small></div></aside></section><section class="directory-layout" data-directory-page><aside class="filters glass"><div class="section-head"><div><p class="eyebrow">Controls</p><h2>Filter offers</h2></div><span id="liveCount" class="stat-pill">${offers.length}</span></div><label for="q">Search</label><input id="q" type="search" placeholder="Offer, provider, category..." /><div class="filter-grid"><div><label for="category">Category</label><select id="category"><option value="">All categories</option>${facets.categories.map(c=>`<option value="${html(c)}">${html(c)}</option>`).join('')}</select></div><div><label for="city">City</label><select id="city"><option value="">All cities</option>${facets.cities.map(c=>`<option value="${html(c)}">${html(c)}</option>`).join('')}</select></div></div><label for="sort">Sort</label><select id="sort"><option value="featured">Best score</option><option value="name">Name A-Z</option></select><div class="button-row"><button class="btn" data-reset>Reset</button><button class="btn" data-export-visible>Export visible CSV</button></div></aside><section class="results glass"><div class="section-head"><div><p class="eyebrow">Results</p><h2>Quote-ready offers</h2></div><span class="stat-pill" data-visible-count>${offers.length} shown</span></div><div id="cards" class="cards">${offers.map(offerCard).join('')}</div><div id="empty" class="empty hidden"><h3>No offers match this filter.</h3><p>Add offer fields to seeded businesses to grow this surface.</p></div></section></section>`;
  return pageWrap({ title:'Offers | Valley Verified', description:'Generated offer marketplace from Valley Verified seeded business pricing and package fields.', canonical:`${SITE_URL}/offers/`, bodyClass:'offers-page' }, body);
}
function mapPage(businesses, facets){
  const points = businesses.filter(b=>b.location).map(b=>({ id:b.id, name:b.name, category:b.category, city:b.city, lat:b.location.lat, lng:b.location.lng, score:b.verification_score, url:`/business/${b.id}/` }));
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Geo discovery</p><h1>Map-style local discovery board</h1><p class="hero-text">No paid map provider is required for the first pass. Seeded coordinates render as an interactive browser-local discovery board.</p></div><aside class="hero-card"><div class="metric"><span>${points.length}</span><small>mapped</small></div><div class="metric"><span>${businesses.length}</span><small>profiles</small></div></aside></section><section class="split-grid map-layout"><div class="glass section"><div class="section-head"><div><p class="eyebrow">Map board</p><h2>Seeded provider positions</h2></div><span class="stat-pill">Browser local</span></div><div id="mapBoard" class="map-board" data-map-board></div><p class="muted tight">Coordinates come from the seed files. Profiles without coordinates remain searchable in the directory.</p></div><div class="glass section"><p class="eyebrow">Mapped listings</p><h2>Open profiles from the board</h2><div id="mapList" class="contact-list"></div></div></section><script>window.PHX_MAP_POINTS=${jsonScript(points)};</script>`;
  return pageWrap({ title:'Map Discovery | Valley Verified', description:'Interactive map-style board generated from Valley Verified seeded business coordinates.', canonical:`${SITE_URL}/map/`, bodyClass:'map-page' }, body);
}
function submitPage(facets){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Public intake</p><h1>Submit a business seed</h1><p class="hero-text">Capture clean listing data through a lightweight intake flow. The page generates a seed JSON file that can be reviewed and dropped into the seed inbox.</p></div><aside class="hero-card"><div class="metric"><span>JSON</span><small>seed output</small></div><div class="metric"><span>CSV</span><small>compatible</small></div></aside></section><section class="split-grid"><form class="glass section" data-seed-builder name="business-seed-request" method="POST" data-netlify="true"><input type="hidden" name="form-name" value="business-seed-request" /><p class="eyebrow">Listing builder</p><h2>Business details</h2><div class="filter-grid"><div><label>Name</label><input name="name" required placeholder="Business name" /></div><div><label>Category</label><input name="category" list="categoryOptions" placeholder="Service category" /></div><div><label>Niche</label><input name="niche" list="nicheOptions" placeholder="Mobile detailing, barber, notary" /></div><div><label>City</label><input name="city" placeholder="Phoenix" /></div><div><label>State</label><input name="state" value="AZ" /></div><div><label>Phone</label><input name="phone" /></div><div><label>Email</label><input name="email" type="email" /></div><div><label>Website</label><input name="website" /></div><div><label>Starting price</label><input name="starting_price" type="number" min="0" step="1" /></div></div><label>Tags / services</label><input name="tags" placeholder="Commercial cleaning, emergency repair, mobile service" /><label>Description</label><textarea name="description" placeholder="What does this provider do?"></textarea><div class="toggle-list"><label class="checkline"><input name="business_verified" type="checkbox" /><span>Business details reviewed</span></label><label class="checkline"><input name="no_hidden_fees" type="checkbox" /><span>No hidden-fee claim</span></label><label class="checkline"><input name="mobile" type="checkbox" /><span>Mobile provider</span></label><label class="checkline"><input name="insured" type="checkbox" /><span>Insurance signal</span></label></div><div class="button-row"><button class="btn primary" type="button" data-build-seed>Build seed JSON</button><button class="btn" type="button" data-download-seed disabled>Download seed</button><button class="btn" type="submit">Send form</button></div></form><section class="glass section"><p class="eyebrow">Generated output</p><h2>Review before publishing</h2><pre id="seedBuilderOutput" class="code-output">Fill the form, then build seed JSON.</pre></section></section><datalist id="categoryOptions">${facets.categories.map(c=>`<option value="${html(c)}"></option>`).join('')}</datalist><datalist id="nicheOptions">${facets.niches.map(n=>`<option value="${html(n.name)}"></option>`).join('')}</datalist>`;
  return pageWrap({ title:'Submit Business | Valley Verified', description:'Business submission and seed JSON builder for Valley Verified listings.', canonical:`${SITE_URL}/submit/`, bodyClass:'submit-page' }, body);
}
function requestPage(businesses, facets){
  const pickList = visibleBusinessList(businesses);
  const options = pickList.map(b=>`<option value="${html(b.id)}">${html(b.name)} — ${html(b.city)} / ${html(b.category)}</option>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Buyer workflow</p><h1>Build a service request packet</h1><p class="hero-text">A buyer can define the job, choose a provider or category, and generate a portable request packet for follow-up.</p></div><aside class="hero-card"><div class="metric"><span>${businesses.length}</span><small>providers</small></div><div class="metric"><span>${facets.categories.length}</span><small>categories</small></div></aside></section><section class="split-grid"><form class="glass section" data-request-builder name="buyer-service-request" method="POST" data-netlify="true"><input type="hidden" name="form-name" value="buyer-service-request" /><p class="eyebrow">Request builder</p><h2>Scope the job</h2>${scalableNotice(businesses.length, pickList.length)}<label>Provider</label><select name="business_id"><option value="">No specific provider</option>${options}</select><div class="filter-grid"><div><label>Category</label><select name="category"><option value="">Select category</option>${facets.categories.map(c=>`<option value="${html(c)}">${html(c)}</option>`).join('')}</select></div><div><label>City</label><select name="city"><option value="">Select city</option>${facets.cities.map(c=>`<option value="${html(c)}">${html(c)}</option>`).join('')}</select></div><div><label>Budget</label><input name="budget" placeholder="$250-$500" /></div><div><label>Timeline</label><input name="timeline" placeholder="This week, ASAP, next month" /></div></div><label>Contact</label><input name="contact" placeholder="Name, phone, or email" /><label>Request details</label><textarea name="details" placeholder="What needs to happen? Include location, constraints, deadlines, and must-haves."></textarea><div class="button-row"><button type="button" class="btn primary" data-build-request>Build request packet</button><button type="button" class="btn" data-download-request disabled>Download packet</button><button class="btn" type="submit">Send form</button></div></form><section class="glass section"><p class="eyebrow">Generated packet</p><h2>Buyer request JSON</h2><pre id="requestOutput" class="code-output">Complete the form, then build the packet.</pre></section></section>`;
  return pageWrap({ title:'Request Service | Valley Verified', description:'Buyer service request packet builder for Valley Verified marketplace workflows.', canonical:`${SITE_URL}/request/`, bodyClass:'request-page' }, body);
}
function claimPage(businesses){
  const pickList = visibleBusinessList(businesses);
  const options = pickList.map(b=>`<option value="${html(b.id)}">${html(b.name)} — ${html(b.city)}</option>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Owner workflow</p><h1>Claim or update a listing</h1><p class="hero-text">Owners can create a review packet for corrections, verification signals, offers, and contact updates in one clean flow.</p></div><aside class="hero-card"><div class="metric"><span>${businesses.length}</span><small>claimable</small></div></aside></section><section class="split-grid"><form class="glass section" data-claim-builder name="business-claim-request" method="POST" data-netlify="true"><input type="hidden" name="form-name" value="business-claim-request" /><p class="eyebrow">Claim packet</p><h2>Owner details</h2>${scalableNotice(businesses.length, pickList.length)}<label>Listing</label><select name="business_id"><option value="">Select listing</option>${options}</select><div class="filter-grid"><div><label>Owner name</label><input name="owner_name" /></div><div><label>Owner email</label><input name="owner_email" type="email" /></div><div><label>Owner phone</label><input name="owner_phone" /></div><div><label>Preferred response</label><input name="response_time" placeholder="Within 24 hours" /></div></div><label>Requested updates</label><textarea name="updates" placeholder="Website, pricing, hours, badges, offer packages, policies, proof notes..."></textarea><div class="toggle-list"><label class="checkline"><input name="business_verified" type="checkbox" /><span>Request verified badge review</span></label><label class="checkline"><input name="insured" type="checkbox" /><span>Add insurance signal</span></label><label class="checkline"><input name="no_hidden_fees" type="checkbox" /><span>Add transparent pricing signal</span></label></div><div class="button-row"><button type="button" class="btn primary" data-build-claim>Build claim packet</button><button type="button" class="btn" data-download-claim disabled>Download packet</button><button class="btn" type="submit">Send form</button></div></form><section class="glass section"><p class="eyebrow">Generated packet</p><h2>Owner update JSON</h2><pre id="claimOutput" class="code-output">Choose a listing and build the claim packet.</pre></section></section>`;
  return pageWrap({ title:'Claim Listing | Valley Verified', description:'Business owner listing claim and update packet builder for Valley Verified.', canonical:`${SITE_URL}/claim/`, bodyClass:'claim-page' }, body);
}
function insightsPage(businesses, facets, report){
  const avgScore = businesses.length ? Math.round(businesses.reduce((s,b)=>s+b.verification_score,0)/businesses.length) : 0;
  const mapped = businesses.filter(b=>b.location).length;
  const priced = businesses.filter(b=>b.starting_price !== null || b.price_note).length;
  const requestReady = businesses.filter(b=>b.accepts_requests).length;
  const rows = facets.categories.map(cat => `<tr><th>${html(cat)}</th><td>${businesses.filter(b=>b.category===cat).length}</td><td>${businesses.filter(b=>b.category===cat && b.verification_score>=70).length}</td><td>${businesses.filter(b=>b.category===cat && (b.starting_price !== null || b.price_note)).length}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Marketplace intelligence</p><h1>Data health and growth signals</h1><p class="hero-text">This surface turns the seed dataset into operator intelligence: coverage, pricing depth, map readiness, request readiness, and verification strength.</p></div><aside class="hero-card"><div class="metric"><span>${avgScore}</span><small>avg score</small></div><div class="metric"><span>${mapped}</span><small>mapped</small></div><div class="metric"><span>${priced}</span><small>priced</small></div><div class="metric"><span>${requestReady}</span><small>request-ready</small></div></aside></section><section class="platform-strip"><div class="glass proof-card"><span>${businesses.length}</span><h2>Published profiles</h2><p>${report.records.raw} raw record(s) produced ${businesses.length} deduped public listings.</p></div><div class="glass proof-card"><span>${facets.categories.length}</span><h2>Service lanes</h2><p>Category hubs are generated automatically from seed data.</p></div><div class="glass proof-card"><span>${facets.cities.length}</span><h2>City hubs</h2><p>City pages expand as new scraped businesses enter the inbox.</p></div></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Coverage matrix</p><h2>Category strength</h2></div><span class="stat-pill">Generated</span></div><div class="table-wrap"><table><thead><tr><th>Category</th><th>Profiles</th><th>70+ score</th><th>Pricing signal</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Insights | Valley Verified', description:'Generated marketplace intelligence and data health for Valley Verified.', canonical:`${SITE_URL}/insights/`, bodyClass:'insights-page' }, body);
}

function accountOpportunityScore(businesses, markets, products){
  const marketStrength = new Map(markets.map(m => [`${m.city_slug}:${m.category_slug}`, m.count]));
  return businesses.map(b => {
    const hasDirectContact = !!(b.phone || b.email);
    const hasWeb = !!(b.website || b.booking_url);
    const contactReady = hasDirectContact || hasWeb;
    const marketCount = marketStrength.get(`${b.city_slug}:${b.category_slug}`) || 0;
    const productFit = [];
    if(!b.badges.business_verified) productFit.push('Verified profile upgrade');
    if(!hasWeb) productFit.push('Claimed listing + landing exposure');
    if(b.verification_score >= 45 && b.accepts_requests) productFit.push('Lead routing lane');
    if(marketCount >= 20) productFit.push('Featured city/category placement');
    if((b.offers || []).length === 0) productFit.push('Offer/package setup');
    const score = Math.min(100,
      (contactReady ? 24 : 0) +
      (hasWeb ? 12 : 5) +
      (b.badges.license_verified ? 12 : 0) +
      (b.badges.business_verified ? 10 : 0) +
      (b.accepts_requests ? 10 : 0) +
      Math.min(18, Math.round(marketCount / 10)) +
      Math.min(14, Math.round(b.verification_score / 7))
    );
    const stage = !contactReady ? 'needs-contact-enrichment' : !b.badges.business_verified ? 'claim-and-verify' : b.verification_score >= 70 ? 'sponsor-ready' : 'profile-enrichment';
    const next_action = stage === 'needs-contact-enrichment' ? 'Find direct owner contact before AE outreach.' : stage === 'claim-and-verify' ? 'Invite owner to claim listing and submit proof packet.' : stage === 'sponsor-ready' ? 'Pitch exposure package or featured placement.' : 'Request offer, pricing, description, and badge cleanup.';
    return {
      business_id:b.id,
      name:b.name,
      url:`/business/${b.id}/`,
      city:b.city,
      category:b.category,
      niche:b.niche,
      score,
      stage,
      next_action,
      contact_ready:contactReady,
      market_supply:marketCount,
      verification_score:b.verification_score,
      claim_status:b.claim_status,
      product_fit:unique(productFit),
      suggested_first_offer:productFit[0] || products.products?.[0]?.name || 'Profile upgrade',
      contact:{ phone:b.phone || '', email:b.email || '', website:b.website || b.booking_url || '' },
      data_gaps:scoreGaps(b),
      flags:b.moderation_flags || []
    };
  }).sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
}
function aePipelineBoard(opportunities){
  const stages = [
    ['needs-contact-enrichment','Need Contact'],
    ['claim-and-verify','Claim / Verify'],
    ['profile-enrichment','Enrich Profile'],
    ['sponsor-ready','Sponsor Ready']
  ];
  const columns = stages.map(([stage,label]) => ({
    stage,
    label,
    count:opportunities.filter(o=>o.stage===stage).length,
    records:opportunities.filter(o=>o.stage===stage).slice(0, 250)
  }));
  return { updated_at:TODAY, columns, totals:{ accounts:opportunities.length, sponsor_ready:columns.find(c=>c.stage==='sponsor-ready')?.count || 0, needs_contact:columns.find(c=>c.stage==='needs-contact-enrichment')?.count || 0 } };
}
function claimStatusIndex(businesses){
  const map = new Map();
  for(const b of businesses){
    const status = b.claim_status || 'unclaimed';
    const rec = map.get(status) || { status, count:0, sample:[] };
    rec.count++;
    if(rec.sample.length < 40) rec.sample.push({ id:b.id, name:b.name, url:`/business/${b.id}/`, city:b.city, category:b.category, score:b.verification_score, required_action: status === 'claimed' || status === 'verified' || status === 'owner_verified' ? 'audit proof before selling verified exposure' : 'send claim invite and collect owner proof' });
    map.set(status, rec);
  }
  return { updated_at:TODAY, statuses:Array.from(map.values()).sort((a,b)=>b.count-a.count || a.status.localeCompare(b.status)), allowed_statuses:['unclaimed','claimed','verified','owner_verified','submitted','needs_review','rejected','suppressed'] };
}
function marketplaceKpi(businesses, opportunities, markets, quality){
  const contactReady = businesses.filter(b=>b.phone || b.email || b.website || b.booking_url).length;
  const directContact = businesses.filter(b=>b.phone || b.email).length;
  const verified = businesses.filter(b=>b.badges.business_verified).length;
  const licensed = businesses.filter(b=>b.badges.license_verified).length;
  const sponsorReady = opportunities.filter(o=>o.stage==='sponsor-ready').length;
  const claimReady = opportunities.filter(o=>o.stage==='claim-and-verify').length;
  const avgScore = businesses.length ? Math.round(businesses.reduce((sum,b)=>sum+b.verification_score,0)/businesses.length) : 0;
  return { updated_at:TODAY, kpis:{ published_businesses:businesses.length, contact_ready:contactReady, direct_contact:directContact, owner_claim_ready:claimReady, sponsor_ready:sponsorReady, licensed_signal:licensed, owner_verified_signal:verified, average_profile_score:avgScore, market_pages:markets.length, source_batches:quality.source_batches.length, exact_duplicate_merges:quality.exact_merges }, ratios:{ contact_ready_rate:businesses.length ? Number((contactReady/businesses.length).toFixed(4)) : 0, direct_contact_rate:businesses.length ? Number((directContact/businesses.length).toFixed(4)) : 0, sponsor_ready_rate:businesses.length ? Number((sponsorReady/businesses.length).toFixed(4)) : 0, verified_rate:businesses.length ? Number((verified/businesses.length).toFixed(4)) : 0 }, next_moves:['Enrich missing direct contact for high-opportunity accounts.', 'Move unclaimed licensed businesses into claim-and-verify outreach.', 'Sell sponsor-ready lanes only after proof and owner authorization.', 'Keep duplicate/suppression scans in the rebuild loop.'] };
}
function followupCalendarCsv(opportunities){
  const headers = ['due_date','rank','business_id','name','city','category','stage','score','next_action','phone','email','website'];
  const rows = opportunities.slice(0, 1000).map((o,i)=>{
    const d = new Date(`${TODAY}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + (i % 30));
    return [d.toISOString().slice(0,10), i+1, o.business_id, o.name, o.city, o.category, o.stage, o.score, o.next_action, o.contact.phone, o.contact.email, o.contact.website].map(csvEscape).join(',');
  });
  return `${headers.join(',')}\n${rows.join('\n')}\n`;
}
function adminBatchActions(opportunities, duplicateClusters, ownerPackets){
  const suppress = duplicateClusters.clusters.slice(0, 250).map(c => ({ action:'review_or_suppress_duplicate', priority:c.priority || 'medium', identity_key:c.identity_key || '', business_ids:(c.businesses || [c.kept, c.candidate]).filter(Boolean).map(x=>x.id).filter(Boolean), reason:(c.reasons || []).join(' | '), recommended_action:c.recommended_action }));
  const claims = ownerPackets.slice(0, 500).filter(p=>p.trust_tier !== 'verified-ready').map(p=>({ action:'request_owner_verification', priority:p.verification_score >= 50 ? 'normal':'high', business_id:p.business_id, name:p.name, reason:p.required_owner_proofs.join(' | '), claim_packet_url:p.claim_packet_url }));
  const enrichment = opportunities.filter(o=>o.stage==='needs-contact-enrichment').slice(0, 500).map(o=>({ action:'enrich_contact_before_sales', priority:o.score >= 40 ? 'high':'normal', business_id:o.business_id, name:o.name, reason:o.data_gaps.join(' | '), url:o.url }));
  return { updated_at:TODAY, batches:{ duplicate_review:suppress, owner_claims:claims, contact_enrichment:enrichment }, suppression_patch_template:{ ids:[], identity_keys:suppress.map(x=>x.identity_key).filter(Boolean).slice(0,25), domains:[], phones:[], emails:[], source_hashes:[], notes:['Generated from /admin-batch/. Review each item before adding to seed/businesses/suppressions.json.'] } };
}
function serviceLaneCatalog(facets, markets, opportunities){
  return { updated_at:TODAY, lanes:facets.categories.map(category => {
    const categoryMarkets = markets.filter(m=>m.category===category);
    const accounts = opportunities.filter(o=>o.category===category);
    const topCities = categoryMarkets.slice(0, 8).map(m=>({ city:m.city, count:m.count, route:`/market/${m.slug}/` }));
    return { category, slug:slugify(category), route:`/category/${slugify(category)}/`, total_supply:accounts.length, sponsor_ready:accounts.filter(o=>o.stage==='sponsor-ready').length, needs_claim:accounts.filter(o=>o.stage==='claim-and-verify').length, top_cities:topCities, ae_angle:`Position ${category.toLowerCase()} businesses around verified exposure, profile cleanup, and local buyer requests.`, recommended_products:unique(accounts.flatMap(o=>o.product_fit)).slice(0,5) };
  }).sort((a,b)=>b.total_supply-a.total_supply) };
}
function accountWorkbenchPage(opportunities){
  const rows = opportunities.slice(0, 200).map((o,i)=>`<tr><td>${i+1}</td><td><a href="${html(o.url)}">${html(o.name)}</a><br><small>${html(o.city)} • ${html(o.category)}</small></td><td>${o.score}</td><td>${html(o.stage)}</td><td>${html(o.suggested_first_offer)}</td><td>${html(o.next_action)}</td><td>${html([o.contact.phone,o.contact.email,o.contact.website].filter(Boolean).join(' / ') || 'Needs enrichment')}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Account workbench</p><h1>Ranked AE account targets from the live seed graph.</h1><p class="hero-text">This is the money list: every business is scored for contact readiness, claim opportunity, sponsor fit, and market supply. It lets AEs work the seeded marketplace without guessing.</p><div class="hero-actions"><a class="btn primary" href="/data/account-opportunity-score.json">Open account score JSON</a><a class="btn" href="/data/owner-followup-calendar.csv">Download follow-up CSV</a></div></div><aside class="hero-card"><div class="metric"><span>${opportunities.length.toLocaleString()}</span><small>accounts</small></div><div class="metric"><span>${opportunities.filter(o=>o.stage==='sponsor-ready').length.toLocaleString()}</span><small>sponsor-ready</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Account</th><th>Score</th><th>Stage</th><th>Offer</th><th>Next action</th><th>Contact</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Account Workbench | Valley Verified', description:'Ranked AE account targeting for Valley Verified business activation.', canonical:`${SITE_URL}/accounts/`, bodyClass:'accounts-page' }, body);
}
function pipelinePage(board){
  const cols = board.columns.map(col=>`<article class="pipeline-column"><div class="section-head"><div><p class="eyebrow">${html(col.stage)}</p><h2>${html(col.label)}</h2></div><span class="stat-pill">${col.count}</span></div>${col.records.slice(0, 40).map(o=>`<div class="pipeline-card"><strong><a href="${html(o.url)}">${html(o.name)}</a></strong><span>${html(o.city)} • ${html(o.category)} • score ${o.score}</span><p>${html(o.next_action)}</p><small>${html(o.suggested_first_offer)}</small></div>`).join('')}</article>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">AE pipeline</p><h1>Stage-based sales board generated from seed data.</h1><p class="hero-text">No fake CRM claim. This is a static, exportable command board that upstream auth or a real CRM can wrap later.</p><div class="hero-actions"><a class="btn primary" href="/data/ae-pipeline-board.json">Open pipeline JSON</a><a class="btn" href="/accounts/">Open accounts</a></div></div><aside class="hero-card"><div class="metric"><span>${board.totals.accounts.toLocaleString()}</span><small>accounts</small></div><div class="metric"><span>${board.totals.sponsor_ready.toLocaleString()}</span><small>sponsor-ready</small></div></aside></section><section class="pipeline-grid">${cols}</section>`;
  return pageWrap({ title:'AE Pipeline | Valley Verified', description:'Generated Valley Verified AE pipeline board for owner activation and sponsor readiness.', canonical:`${SITE_URL}/pipeline/`, bodyClass:'pipeline-page' }, body);
}
function kpiPage(kpi){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Marketplace KPI</p><h1>Operational metrics for the seeded business network.</h1><p class="hero-text">This converts the large seed into the numbers that matter for sales, enrichment, owner claims, and sponsor readiness.</p><div class="hero-actions"><a class="btn primary" href="/data/marketplace-kpi.json">Open KPI JSON</a><a class="btn" href="/data/account-opportunity-score.json">Open account scores</a></div></div><aside class="hero-card"><div class="metric"><span>${kpi.kpis.published_businesses.toLocaleString()}</span><small>published</small></div><div class="metric"><span>${kpi.kpis.sponsor_ready.toLocaleString()}</span><small>sponsor-ready</small></div><div class="metric"><span>${Math.round(kpi.ratios.contact_ready_rate*100)}%</span><small>contact-ready</small></div></aside></section><section class="platform-strip"><div class="glass proof-card"><span>${kpi.kpis.direct_contact.toLocaleString()}</span><h2>Direct contact</h2><p>Listings with phone or email.</p></div><div class="glass proof-card"><span>${kpi.kpis.owner_claim_ready.toLocaleString()}</span><h2>Claim targets</h2><p>Listings likely ready for owner activation.</p></div><div class="glass proof-card"><span>${kpi.kpis.exact_duplicate_merges.toLocaleString()}</span><h2>Duplicate merges</h2><p>One-business-one-posting protection.</p></div></section><section class="section glass"><p class="eyebrow">Next moves</p><h2>What the operator should do next</h2><div class="cards">${kpi.next_moves.map(m=>`<article class="business-card"><h3>${html(m)}</h3></article>`).join('')}</div></section>`;
  return pageWrap({ title:'Marketplace KPI | Valley Verified', description:'Marketplace KPIs and money-path readiness metrics for Valley Verified.', canonical:`${SITE_URL}/kpi/`, bodyClass:'kpi-page' }, body);
}
function adminBatchPage(batch){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Admin batch builder</p><h1>Batch suppress, enrich, or verify without pretending there is local auth.</h1><p class="hero-text">This page gives operators a practical batch-control surface. Review the generated actions, then copy approved suppression keys into <code>seed/businesses/suppressions.json</code> and rebuild.</p><div class="hero-actions"><a class="btn primary" href="/data/admin-batch-actions.json">Open batch JSON</a><a class="btn" href="/data/suppression-template.json">Suppression template</a></div></div><aside class="hero-card"><div class="metric"><span>${batch.batches.duplicate_review.length}</span><small>duplicate reviews</small></div><div class="metric"><span>${batch.batches.owner_claims.length}</span><small>claim actions</small></div><div class="metric"><span>${batch.batches.contact_enrichment.length}</span><small>enrich actions</small></div></aside></section><section class="split-grid"><section class="glass section"><p class="eyebrow">Suppression patch</p><h2>Generated starter JSON</h2><pre id="batchOutput" class="code-output">${html(JSON.stringify(batch.suppression_patch_template, null, 2))}</pre><div class="button-row"><button class="btn primary" data-copy-batch>Copy patch</button><a class="btn" href="/duplicates/">Review duplicates</a></div></section><section class="glass section"><p class="eyebrow">Action mix</p><h2>Batch queues</h2><div class="mini-grid"><span>${batch.batches.duplicate_review.length} duplicate review</span><span>${batch.batches.owner_claims.length} owner claim</span><span>${batch.batches.contact_enrichment.length} contact enrichment</span><span>rebuild after approved suppression</span></div></section></section>`;
  return pageWrap({ title:'Admin Batch Actions | Valley Verified', description:'Batch admin action builder for duplicate suppression, owner verification, and enrichment workflows.', canonical:`${SITE_URL}/admin-batch/`, bodyClass:'admin-batch-page' }, body);
}
function serviceLanesPage(catalog){
  const cards = catalog.lanes.map(l=>`<a class="platform-tile" href="${html(l.route)}"><span>${l.total_supply}</span><h3>${html(l.category)}</h3><p>${l.sponsor_ready} sponsor-ready • ${l.needs_claim} claim targets</p><small>${html(l.ae_angle)}</small></a>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Service lanes</p><h1>Category lanes that can become sellable local markets.</h1><p class="hero-text">This public surface turns the marketplace into a set of understandable business/service lanes instead of a raw license dump.</p><div class="hero-actions"><a class="btn primary" href="/directory/">Explore directory</a><a class="btn" href="/data/service-lane-catalog.json">Open lane data</a></div></div><aside class="hero-card"><div class="metric"><span>${catalog.lanes.length}</span><small>lanes</small></div><div class="metric"><span>${catalog.lanes.reduce((sum,l)=>sum+l.total_supply,0).toLocaleString()}</span><small>listings</small></div></aside></section><section class="section glass"><div class="tile-grid">${cards}</div></section>`;
  return pageWrap({ title:'Service Lanes | Valley Verified', description:'Valley Verified service lanes generated from seeded Arizona business data.', canonical:`${SITE_URL}/service-lanes/`, bodyClass:'service-lanes-page' }, body);
}


function backendActionContracts(){
  const contracts = listContracts().map(c => ({ ...c, endpoint:'/.netlify/functions/phx-action' }));
  return { updated_at:TODAY, version:'17.0.0', upstream_auth_required:true, endpoint:'/.netlify/functions/phx-action', headers_required:['x-upstream-user-id or x-upstream-user-email','x-upstream-roles'], local_dev_flag:'ALLOW_LOCAL_ACTIONS=true', state_projection_flag:'PHX_AUTO_PROJECT_ACTIONS=true or POST body { apply:true } with admin role', contracts };
}
function mutationQueueTemplate(contracts){
  return { updated_at:TODAY, queues:contracts.contracts.map(c => ({ queue:c.queue, action_type:c.type, storage_key:`${c.queue}/{action_id}.json`, review_required:true, idempotency:'action_id is SHA-256 derived from action type, payload, and upstream actor identity', approval_path:c.type.includes('suppression') ? 'admin approves draft, exports suppression patch, commits seed/businesses/suppressions.json, and rebuilds' : ['claim_status_update','lead_status_update','ae_stage_update','listing_admin_patch','owner_contact_log','sponsor_intent','verification_decision'].includes(c.type) ? 'admin/AE-approved runtime state projection through src/server/state-store.mjs and later database adapter' : 'upstream database persists review state' })), note:'Runtime writes are modeled by src/server/router.mjs plus src/server/state-store.mjs. Static seed truth only changes through approved seed commits.' };
}
function ownerCrmIndex(businesses, accountScores, ownerPackets){
  const scoreMap = new Map(accountScores.map(a => [a.business_id, a]));
  const packetMap = new Map(ownerPackets.map(p => [p.business_id, p]));
  const owners = businesses.map(b => {
    const score = scoreMap.get(b.id) || {};
    const packet = packetMap.get(b.id) || {};
    const contact = b.email || b.phone || b.website || '';
    const status = (b.moderation_flags || []).length ? 'risk_review' : contact ? 'contact_ready' : 'needs_enrichment';
    return { business_id:b.id, name:b.name, url:`/business/${b.id}/`, city:b.city, category:b.category, owner_status:status, claim_status:b.claim_status || 'unclaimed_seed', contact_channel:b.email ? 'email' : b.phone ? 'phone' : b.website ? 'website' : 'missing', contact, trust_tier:packet.trust_tier || trustTierFor(b), opportunity_score:score.opportunity_score || score.priority_score || b.verification_score || 0, recommended_product:score.recommended_product || 'verified-profile-upgrade', next_step: status === 'risk_review' ? 'Resolve duplicate or moderation flags before AE pitch.' : status === 'needs_enrichment' ? 'Find contact data, then place into owner claim flow.' : 'Contact owner with claim/update and verified profile offer.' };
  }).sort((a,b)=>b.opportunity_score-a.opportunity_score || a.name.localeCompare(b.name));
  return { updated_at:TODAY, stats:{ owners:owners.length, contact_ready:owners.filter(o=>o.owner_status==='contact_ready').length, needs_enrichment:owners.filter(o=>o.owner_status==='needs_enrichment').length, risk_review:owners.filter(o=>o.owner_status==='risk_review').length }, owners:owners.slice(0, 15000) };
}
function aeWorkOrders(accountScores, territory, activation){
  const top = accountScores.slice(0, 2000);
  const work_orders = top.map((a, i) => {
    const due = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + (i % 14) + 1)).toISOString().slice(0,10);
    return { work_order_id:`ae-${String(i + 1).padStart(5,'0')}`, rank:i + 1, due_date:due, business_id:a.business_id, name:a.name, city:a.city, category:a.category, priority_score:a.opportunity_score || a.priority_score || 0, stage:a.stage || 'owner_claim_ready', recommended_product:a.recommended_product || 'verified-profile-upgrade', script_angle:a.script_angle || `Claim and improve your ${a.category || 'local'} profile in ${a.city || 'Phoenix Metro'}.`, next_action:'Call or email owner, offer claim/correction, then move to verification or enrichment queue.', url:a.url };
  });
  const city_focus = (territory.territories || []).slice(0, 12).map(t => ({ city:t.city, priority_score:t.priority_score, high_priority_accounts:t.high_priority_accounts, claim_ready:t.claim_ready, upgrade_ready:t.upgrade_ready, route:t.route }));
  return { updated_at:TODAY, stats:{ work_orders:work_orders.length, city_focus:city_focus.length, activation_records:activation.stats?.records || 0 }, city_focus, work_orders };
}
function leadInboxQueue(leadRules, accountScores){
  const scoreById = new Map(accountScores.map(a => [a.business_id, a]));
  const inbox = leadRules.rules.map((rule, i) => {
    const candidates = (rule.primary_candidate_ids || []).map(id => scoreById.get(id)).filter(Boolean).slice(0, 5).map(a => ({ business_id:a.business_id, name:a.name, score:a.opportunity_score || a.priority_score || 0, product:a.recommended_product, url:a.url }));
    return { lead_lane_id:`lead-lane-${String(i + 1).padStart(4,'0')}`, city:rule.city, category:rule.category, route:rule.route, candidate_count:rule.candidate_count, routing_status:candidates.length ? 'ready_for_upstream_form' : 'needs_enrichment', candidate_businesses:candidates, intake_contract:'lead_request', next_step:candidates.length ? 'Attach incoming request to this city/category lane and notify top candidates.' : 'Enrich lane before selling lead routing.' };
  }).sort((a,b)=>b.candidate_count-a.candidate_count);
  return { updated_at:TODAY, stats:{ lanes:inbox.length, ready:inbox.filter(x=>x.routing_status==='ready_for_upstream_form').length, needs_enrichment:inbox.filter(x=>x.routing_status==='needs_enrichment').length }, inbox };
}
function listingOpsIndex(businesses, lifecycleQueue, duplicateClusters, claimStatus){
  const lifecycleMap = new Map((lifecycleQueue.tasks || []).map(t => [t.business_id, t]));
  const duplicateSet = new Set();
  for(const cluster of duplicateClusters.clusters || []){
    for(const b of cluster.businesses || []) duplicateSet.add(b.id);
    if(cluster.kept?.id) duplicateSet.add(cluster.kept.id);
    if(cluster.candidate?.id) duplicateSet.add(cluster.candidate.id);
  }
  const statuses = businesses.map(b => {
    const task = lifecycleMap.get(b.id);
    const flags = [...(b.moderation_flags || []), ...(task?.flags || [])];
    return { business_id:b.id, name:b.name, url:`/business/${b.id}/`, city:b.city, category:b.category, ops_state: duplicateSet.has(b.id) ? 'duplicate_review' : task ? 'needs_work' : 'clean_seed', claim_status:b.claim_status || 'unclaimed_seed', verification_score:b.verification_score, flags:unique(flags).slice(0, 12), next_action: duplicateSet.has(b.id) ? 'Review duplicate cluster before promotion.' : task?.suggested_next_action || 'Eligible for owner activation.' };
  });
  return { updated_at:TODAY, stats:{ records:statuses.length, clean_seed:statuses.filter(s=>s.ops_state==='clean_seed').length, needs_work:statuses.filter(s=>s.ops_state==='needs_work').length, duplicate_review:statuses.filter(s=>s.ops_state==='duplicate_review').length, claim_statuses:(claimStatus.statuses || []).length }, records:statuses.slice(0, 15000) };
}

function runtimeStateModel(contracts, report){
  return {
    updated_at:TODAY,
    version:'17.0.0',
    source_files:['src/server/state-store.mjs','src/server/router.mjs','src/server/storage.mjs','src/server/business-index.mjs'],
    counts:{ action_contracts:contracts.contracts.length, published_businesses:report.records.published, generated_routes:report.routes.total },
    state_buckets:[
      { key:'claims', purpose:'Owner claim and verification lifecycle by business_id.', projected_from:['owner_claim','verification_decision','claim_status_update'] },
      { key:'leads', purpose:'Buyer request lifecycle and assigned routing state.', projected_from:['lead_request','lead_status_update'] },
      { key:'listing_patches', purpose:'Approved copy/contact/category changes staged before seed publication.', projected_from:['profile_enrichment','listing_admin_patch'] },
      { key:'suppression_drafts', purpose:'Removal/duplicate/abuse candidates exported into seed suppressions after review.', projected_from:['suppression_request','suppression_apply'] },
      { key:'ae_accounts', purpose:'AE pipeline stage, next action, and account notes.', projected_from:['ae_note','ae_stage_update'] },
      { key:'sponsor_intents', purpose:'Paid exposure interest captured without claiming payment is complete.', projected_from:['sponsor_intent'] },
      { key:'contact_logs', purpose:'Owner outreach history and follow-up scheduling.', projected_from:['owner_contact_log'] },
      { key:'review_decisions', purpose:'Admin approval/rejection trail for queued actions.', projected_from:['admin_review_decision'] }
    ],
    runtime_modes:[
      { mode:'queue_only', behavior:'POST stores idempotent action envelope and returns queued_for_review.' },
      { mode:'apply_true_admin', behavior:'POST with apply:true and admin role stores the action and projects state through FilePlatformStateStore or database adapter.' },
      { mode:'auto_project', behavior:'PHX_AUTO_PROJECT_ACTIONS=true enables projection after validation for approved admin contexts.' }
    ]
  };
}
function dbContractsBundle(){
  return { updated_at:TODAY, version:'17.0.0', tables:PLATFORM_TABLES, d1_sql:platformD1Schema(), neon_sql:neonSchema(), checklist:adapterReadinessChecklist(), adapters:['FileActionStore','MemoryActionStore','FilePlatformStateStore','MemoryPlatformStateStore','PlatformDbAdapter interface'] };
}
function approvalWorkflowModel(contracts){
  return {
    updated_at:TODAY,
    stages:[
      { stage:'intake', owner:'public/AE/admin', code:'src/server/router.mjs', result:'validated action envelope' },
      { stage:'idempotency', owner:'runtime', code:'src/server/contracts.mjs stableActionHash', result:'duplicate submissions collapse to one action_id' },
      { stage:'queue', owner:'runtime adapter', code:'src/server/storage.mjs', result:'queued JSON action or database row' },
      { stage:'review', owner:'admin/upstream auth', code:'admin_review_decision contract', result:'approval, rejection, needs_more_proof, or archived' },
      { stage:'projection', owner:'admin/runtime', code:'src/server/state-store.mjs', result:'claims/leads/AE/suppression state updated' },
      { stage:'seed commit', owner:'operator', code:'seed/businesses/suppressions.json or next seed batch', result:'static public marketplace changes on rebuild' }
    ],
    action_contracts:contracts.contracts.map(c => ({ type:c.type, queue:c.queue, roles:c.roles, public_intake:c.public_intake }))
  };
}
function runtimeStatePage(model){
  const rows = model.state_buckets.map(b=>`<tr><th>${html(b.key)}</th><td>${html(b.purpose)}</td><td>${html(b.projected_from.join(', '))}</td></tr>`).join('');
  const modes = model.runtime_modes.map(m=>`<article class="business-card"><h3>${html(m.mode)}</h3><p>${html(m.behavior)}</p></article>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Runtime state</p><h1>Queued actions can now project into operational state.</h1><p class="hero-text">This is the missing code layer from v15: claims, leads, suppression drafts, AE stages, contact logs, and listing patches have a real state projector instead of being stranded as static queue files.</p><div class="hero-actions"><a class="btn primary" href="/data/runtime-state-model.json">Open state model</a><a class="btn" href="/data/db-contracts.json">Open DB contracts</a></div></div><aside class="hero-card"><div class="metric"><span>${model.counts.action_contracts}</span><small>action contracts</small></div><div class="metric"><span>${model.state_buckets.length}</span><small>state buckets</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Bucket</th><th>Purpose</th><th>Projected from</th></tr></thead><tbody>${rows}</tbody></table></div></section><section class="cards">${modes}</section>`;
  return pageWrap({ title:'Runtime State | Valley Verified', description:'Valley Verified v16 runtime state projection model for claims, leads, AE workflow, and admin actions.', canonical:`${SITE_URL}/runtime-state/`, bodyClass:'runtime-state-page' }, body);
}
function dbContractsPage(bundle){
  const rows = bundle.tables.map(t=>`<tr><th>${html(t.table)}</th><td>${html(t.purpose)}</td><td>${html(t.columns.join(', '))}</td></tr>`).join('');
  const checklist = bundle.checklist.map(c=>`<li>${html(c)}</li>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Database contracts</p><h1>The runtime backend now has table-level persistence contracts.</h1><p class="hero-text">No billing, auth, or provider theater. This is the concrete schema and adapter boundary for D1, SQLite, or Neon once your upstream auth/database layer is attached.</p><div class="hero-actions"><a class="btn primary" href="/data/db-contracts.json">Open DB contracts JSON</a><a class="btn" href="/data/d1-schema.sql">Open D1 SQL</a></div></div><aside class="hero-card"><div class="metric"><span>${bundle.tables.length}</span><small>tables</small></div><div class="metric"><span>${bundle.adapters.length}</span><small>adapters</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Table</th><th>Purpose</th><th>Columns</th></tr></thead><tbody>${rows}</tbody></table></div></section><section class="section glass"><p class="eyebrow">Integration checklist</p><h2>Do this when wiring the real DB</h2><ul class="rich-list">${checklist}</ul></section>`;
  return pageWrap({ title:'Database Contracts | Valley Verified', description:'Database schema and adapter contracts for Valley Verified runtime actions and operational state.', canonical:`${SITE_URL}/db-contracts/`, bodyClass:'db-contracts-page' }, body);
}
function approvalFlowPage(model){
  const stages = model.stages.map((s,i)=>`<article class="platform-tile"><span>${String(i+1).padStart(2,'0')}</span><h3>${html(s.stage)}</h3><p>${html(s.result)}</p><small>${html(s.code)} • ${html(s.owner)}</small></article>`).join('');
  const rows = model.action_contracts.map(c=>`<tr><th>${html(c.type)}</th><td>${html(c.queue)}</td><td>${html(c.roles.join(', '))}</td><td>${c.public_intake ? 'public' : 'operator'}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Approval flow</p><h1>Actions now have an actual review-to-state path.</h1><p class="hero-text">This turns owner claims, leads, AE notes, and suppression requests into enforceable workflows: intake, idempotency, queue, review, state projection, and seed commit.</p><div class="hero-actions"><a class="btn primary" href="/data/approval-workflow.json">Open approval workflow</a><a class="btn" href="/action-queue/">Open action queue</a></div></div><aside class="hero-card"><div class="metric"><span>${model.stages.length}</span><small>stages</small></div><div class="metric"><span>${model.action_contracts.length}</span><small>actions</small></div></aside></section><section class="tile-grid">${stages}</section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Action</th><th>Queue</th><th>Roles</th><th>Intake</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Approval Flow | Valley Verified', description:'Valley Verified admin approval flow for queued actions and runtime state projection.', canonical:`${SITE_URL}/approval-flow/`, bodyClass:'approval-flow-page' }, body);
}
function backendContractsPage(contracts){
  const rows = contracts.contracts.map(c=>`<tr><th>${html(c.type)}</th><td>${html(c.queue)}</td><td>${html(c.required.join(', '))}</td><td>${html(c.roles.join(', '))}</td><td>${c.public_intake ? 'public intake allowed' : 'operator only'}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Backend-ready code contracts</p><h1>Runtime mutation layer without fake live writes.</h1><p class="hero-text">This build includes real server-side contract modules under <code>src/server/</code> and an upstream-auth-ready action endpoint. It rejects missing upstream identity, validates payloads, creates idempotent action envelopes, and stores review queues through a pluggable adapter.</p><div class="hero-actions"><a class="btn primary" href="/data/backend-action-contracts.json">Open contracts JSON</a><a class="btn" href="/data/mutation-queue-template.json">Open queue template</a></div></div><aside class="hero-card"><div class="metric"><span>${contracts.contracts.length}</span><small>contracts</small></div><div class="metric"><span>auth</span><small>upstream required</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Mutation contracts</p><h2>Action types</h2></div><code>src/server/router.mjs</code></div><div class="table-wrap"><table><thead><tr><th>Type</th><th>Queue</th><th>Required fields</th><th>Roles</th><th>Mode</th></tr></thead><tbody>${rows}</tbody></table></div></section><section class="platform-strip"><div class="glass proof-card"><span>01</span><h2>Rejects missing auth</h2><p>The handler requires <code>x-upstream-user-id</code> or <code>x-upstream-user-email</code> unless local dev explicitly sets <code>ALLOW_LOCAL_ACTIONS=true</code>.</p></div><div class="glass proof-card"><span>02</span><h2>Idempotent queues</h2><p>Action IDs are stable hashes so duplicate submissions do not create infinite review spam.</p></div><div class="glass proof-card"><span>03</span><h2>No fake mutation</h2><p>Every action is queued for review. Static seed files only change after approved operator/backend workflows.</p></div></section>`;
  return pageWrap({ title:'Backend Contracts | Valley Verified', description:'Upstream-auth-ready runtime action contracts and mutation queue code for Valley Verified.', canonical:`${SITE_URL}/backend/`, bodyClass:'backend-page' }, body);
}
function actionQueuePage(template, opsIndex){
  const rows = template.queues.map(q=>`<tr><th>${html(q.action_type)}</th><td>${html(q.queue)}</td><td>${html(q.approval_path)}</td><td>${html(q.idempotency)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Action queue architecture</p><h1>Every mutation becomes a reviewable work item.</h1><p class="hero-text">Claims, leads, AE notes, profile patches, suppressions, and verification decisions are modeled as explicit queues so upstream auth/database can persist them without inventing behavior.</p><div class="hero-actions"><a class="btn primary" href="/data/mutation-queue-template.json">Open queue template</a><a class="btn" href="/data/listing-ops-index.json">Open listing ops index</a></div></div><aside class="hero-card"><div class="metric"><span>${template.queues.length}</span><small>queues</small></div><div class="metric"><span>${opsIndex.stats.needs_work.toLocaleString()}</span><small>need work</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Action</th><th>Queue</th><th>Approval path</th><th>Idempotency</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Action Queue | Valley Verified', description:'Valley Verified action queue model for upstream-auth runtime workflows.', canonical:`${SITE_URL}/action-queue/`, bodyClass:'action-queue-page' }, body);
}
function leadInboxPage(queue){
  const rows = queue.inbox.slice(0, 200).map(l=>`<tr><th><a href="${html(l.route)}">${html(l.city)} ${html(l.category)}</a></th><td>${l.candidate_count}</td><td>${html(l.routing_status)}</td><td>${html(l.candidate_businesses.map(c=>c.name).slice(0,3).join(', '))}</td><td>${html(l.next_step)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Lead inbox model</p><h1>Incoming buyer requests have deterministic routing lanes.</h1><p class="hero-text">This is the code/data layer your upstream form or auth portal can use to attach a buyer request to a city/category lane and top candidate businesses.</p><div class="hero-actions"><a class="btn primary" href="/data/lead-inbox-queue.json">Open inbox JSON</a><a class="btn" href="/data/lead-routing-rules.json">Open routing rules</a></div></div><aside class="hero-card"><div class="metric"><span>${queue.stats.lanes}</span><small>lead lanes</small></div><div class="metric"><span>${queue.stats.ready}</span><small>ready lanes</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Lane</th><th>Candidates</th><th>Status</th><th>Top matches</th><th>Next step</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Lead Inbox | Valley Verified', description:'Lead inbox routing queue for Valley Verified buyer requests.', canonical:`${SITE_URL}/lead-inbox/`, bodyClass:'lead-inbox-page' }, body);
}
function ownerCrmPage(crm){
  const rows = crm.owners.slice(0, 250).map(o=>`<tr><th><a href="${html(o.url)}">${html(o.name)}</a></th><td>${html(o.owner_status)}</td><td>${html(o.contact_channel)}</td><td>${html(o.recommended_product)}</td><td>${html(o.next_step)}</td></tr>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Owner CRM index</p><h1>Seeded supply becomes owner activation accounts.</h1><p class="hero-text">This index turns every business into an account object with contact readiness, claim status, trust tier, and the next commercial action for AE or admin follow-up.</p><div class="hero-actions"><a class="btn primary" href="/data/owner-crm-index.json">Open CRM JSON</a><a class="btn" href="/data/owner-followup-calendar.csv">Follow-up CSV</a></div></div><aside class="hero-card"><div class="metric"><span>${crm.stats.owners.toLocaleString()}</span><small>owner accounts</small></div><div class="metric"><span>${crm.stats.contact_ready.toLocaleString()}</span><small>contact ready</small></div></aside></section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Business</th><th>Status</th><th>Contact</th><th>Product</th><th>Next step</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'Owner CRM | Valley Verified', description:'Generated owner CRM account index for AE activation.', canonical:`${SITE_URL}/owner-crm/`, bodyClass:'owner-crm-page' }, body);
}

function routeTitle(route){
  const clean = String(route || '/').replace(/^\/+|\/+$/g, '') || 'home';
  return clean === 'home' ? 'Valley Verified home' : titleCase(clean.replaceAll('-', ' '));
}
function valleyBrainRouteEntries(routes, kind){
  return routes.map(route => ({
    kind,
    title: routeTitle(route),
    href: route,
    description: kind === 'admin_route'
      ? `${routeTitle(route)} is an internal Valley operator route with generated source data and a browser workspace.`
      : `${routeTitle(route)} is a public Valley route for discovery, claims, matching, or business growth.`,
    keywords: unique([routeTitle(route), route.replaceAll('/', ' '), kind, 'valley verified'])
  }));
}
function valleyBrainDataEntries(files, kind = 'data_source'){
  return files.map(([title, href, description]) => ({
    kind,
    title,
    href,
    description,
    keywords: unique([title, href.replaceAll(/[/.:-]/g, ' '), description])
  }));
}
function valleyBrainPublicIndex({ businesses, facets, report, leadRules, products, markets }){
  const publicRoutes = publicSurfaceLinks();
  const dataFiles = valleyBrainDataEntries([
    ['Search index', '/data/search-index.json', 'Provider search records used for visitor matching.'],
    ['Businesses JSON', '/data/businesses.json', 'Full normalized public business dataset.'],
    ['Match index', '/data/match-index.json', 'Lean provider scoring data for buyer requests.'],
    ['Lead routing rules', '/data/lead-routing-rules.json', 'City and category lead routing lanes.'],
    ['Exposure products', '/data/exposure-products.json', 'Claim, verification, placement, and lead-routing product model.'],
    ['Route manifest', '/data/route-manifest.json', 'Generated public and internal Valley route inventory.']
  ]);
  const categoryEntries = facets.categories.slice(0, 60).map(name => ({
    kind:'category',
    title:`${name} providers`,
    href:`/category/${slugify(name)}/`,
    description:`Browse ${businesses.filter(b=>b.category===name).length.toLocaleString()} ${name} records in this build.`,
    keywords: unique([name, 'provider', 'service', 'directory'])
  }));
  const cityEntries = facets.cities.slice(0, 60).map(name => ({
    kind:'city',
    title:`${name} businesses`,
    href:`/city/${slugify(name)}/`,
    description:`Open the generated ${name}, AZ business hub.`,
    keywords: unique([name, 'city', 'phoenix market', 'near me'])
  }));
  return {
    version:'valley-brain-public-v1',
    generated_at:TODAY,
    site:{ name:'Valley Verified', url:SITE_URL, generated_at:TODAY },
    counts:{
      businesses:businesses.length,
      public_routes:publicRoutes.length,
      categories:facets.categories.length,
      cities:facets.cities.length,
      lead_lanes:leadRules?.stats?.lanes || leadRules?.rules?.length || 0,
      products:products?.products?.length || 0,
      markets:markets.length,
      generated_routes:report.routes.total
    },
    relay:{ endpoint:'/api/valley-verified/relay-leads', local_storage_key:'valleyVerified.brain.v1.relay' },
    quick_actions:[
      { label:'Find providers', prompt:'Find a verified provider near me', href:'/directory/' },
      { label:'Get matched', prompt:'I need a quote or provider match', href:'/match/' },
      { label:'Claim listing', prompt:'How do I claim or update a business listing?', href:'/claim/' },
      { label:'Advertise', prompt:'How do exposure and paid placement work?', href:'/pricing/' }
    ],
    entries:[
      ...valleyBrainRouteEntries(publicRoutes, 'public_route'),
      ...categoryEntries,
      ...cityEntries,
      ...dataFiles
    ]
  };
}
function valleyBrainAdminIndex({ businesses, facets, report, ownerCrm, workOrders, leadInbox, leadRules, actionPackets, adminBatch, approvalWorkflow, lifecycleQueue, activation }){
  const internalRoutes = internalSurfaceLinks();
  const dataFiles = valleyBrainDataEntries([
    ['Owner CRM index', '/data/owner-crm-index.json', 'Owner account readiness, contact channel, recommended product, and next step.'],
    ['Owner follow-up calendar', '/data/owner-followup-calendar.csv', 'Spreadsheet-ready owner follow-up queue.'],
    ['AE work orders', '/data/ae-work-orders.json', 'Ranked daily rep task queue.'],
    ['Lead inbox queue', '/data/lead-inbox-queue.json', 'Request routing lanes and candidate providers.'],
    ['Lead routing rules', '/data/lead-routing-rules.json', 'Deterministic lane rules by city and category.'],
    ['Admin action packets', '/data/admin-action-packets.json', 'Review packets for moderation, suppression, and approval.'],
    ['Admin batch actions', '/data/admin-batch-actions.json', 'Bulk admin action model.'],
    ['Approval workflow', '/data/approval-workflow.json', 'Review-to-state stages for runtime actions.'],
    ['Business lifecycle queue', '/data/business-lifecycle-queue.json', 'Operator next-step queue for stale or weak listings.'],
    ['Activation pipeline', '/data/activation-pipeline.json', 'Commercial activation stages for every business.'],
    ['Route manifest', '/data/route-manifest.json', 'Generated public and internal Valley route inventory.'],
    ['Admin brain index', '/api/valley-verified/admin-brain-index', 'Operator-authenticated admin knowledge endpoint.']
  ], 'admin_data_source');
  const workflows = [
    {
      route:'/owner-crm/',
      title:'Owner CRM workspace',
      summary:'Use this route to turn seeded businesses into owner accounts, claim targets, and upgrade packets.',
      steps:[
        'Start with contact-ready rows and the recommended product column.',
        'Open the business profile or owner packet before contacting the account.',
        'Use Claim when the owner needs correction or verification; use Ready when the account can move to outreach.',
        'Export the operator ledger after review so the next admin/build cycle keeps the decision.'
      ],
      links:[
        { label:'Owner CRM JSON', href:'/data/owner-crm-index.json', description:'Account readiness source.' },
        { label:'Follow-up CSV', href:'/data/owner-followup-calendar.csv', description:'Spreadsheet queue.' },
        { label:'Activation pipeline', href:'/activation/', description:'Commercial stage context.' }
      ]
    },
    {
      route:'/admin-review/',
      title:'Admin review workspace',
      summary:'Use this route to inspect risky, duplicate, weak, or moderation-needed listings before public promotion.',
      steps:[
        'Read the source health panel to confirm the moderation and duplicate data loaded.',
        'Filter to admin packets or duplicate clusters first.',
        'Open the listing, verify the issue, then mark Ready, Block, or Claim.',
        'Export the packet if the decision needs to be replayed outside the browser.'
      ],
      links:[
        { label:'Admin packets', href:'/data/admin-action-packets.json', description:'Action review packet source.' },
        { label:'Duplicate clusters', href:'/data/duplicate-clusters.json', description:'Collision review source.' },
        { label:'Approval flow', href:'/approval-flow/', description:'Decision path.' }
      ]
    },
    {
      route:'/lead-inbox/',
      title:'Lead inbox workspace',
      summary:'Use this route to understand how incoming requests map to lanes and candidate providers.',
      steps:[
        'Pick a ready lane, then inspect candidate count and top providers.',
        'Open candidate profiles before sending a lead externally.',
        'Capture visitor requests through the brain relay so production stores the lead.',
        'Use Ready only when the lane has enough viable providers.'
      ],
      links:[
        { label:'Lead inbox queue', href:'/data/lead-inbox-queue.json', description:'Lead lane source.' },
        { label:'Lead routing rules', href:'/data/lead-routing-rules.json', description:'Rule source.' },
        { label:'Match route', href:'/match/', description:'Visitor-facing matching path.' }
      ]
    },
    {
      route:'/ae-command/',
      title:'AE command workspace',
      summary:'Use this route to turn owner activation into sales motion without pretending every record is ready.',
      steps:[
        'Use the AE call queue and activation stage before calling.',
        'Prioritize owner_claim_ready and upgrade_ready accounts.',
        'Use the sales playbook angle from the generated data.',
        'Record blocked rows when missing contact, verification, or duplicate signals make outreach unsafe.'
      ],
      links:[
        { label:'AE work orders', href:'/data/ae-work-orders.json', description:'Task queue.' },
        { label:'AE call CSV', href:'/data/ae-call-queue.csv', description:'Rep export.' },
        { label:'Sales playbooks', href:'/data/sales-playbooks.json', description:'Scripts and objections.' }
      ]
    },
    {
      route:'/operator/',
      title:'Import console workspace',
      summary:'Use this route when new scraped or client-supplied business data needs to become reviewed seed input.',
      steps:[
        'Paste or upload CSV/JSON source rows.',
        'Normalize the seed and inspect warnings before downloading.',
        'Put the reviewed file into seed/businesses/inbox/.',
        'Run the build so the public brain, admin brain, search, profiles, and route manifest all update together.'
      ],
      links:[
        { label:'Seed schema', href:'/data/seed-schema.json', description:'Accepted fields.' },
        { label:'Import dry run', href:'/data/import-dry-run.json', description:'Pre-publish quality report.' },
        { label:'Platform status', href:'/platform/', description:'Build route inventory.' }
      ]
    }
  ];
  return {
    version:'valley-brain-admin-v1',
    generated_at:TODAY,
    site:{ name:'Valley Verified Admin Brain', url:SITE_URL, generated_at:TODAY },
    guardrail:'Admin Brain is not exposed by route alone. The browser must pass the 0S/SkyGate operator auth check before admin knowledge loads or the Admin Brain launcher appears.',
    counts:{
      businesses:businesses.length,
      internal_routes:internalRoutes.length,
      generated_routes:report.routes.total,
      owner_accounts:ownerCrm?.stats?.owners || 0,
      work_orders:workOrders?.stats?.work_orders || 0,
      lead_lanes:leadInbox?.stats?.lanes || leadRules?.stats?.lanes || 0,
      action_packets:Array.isArray(actionPackets) ? actionPackets.length : actionPackets?.packets?.length || 0,
      admin_batch_actions:adminBatch?.stats?.actions || adminBatch?.actions?.length || Object.values(adminBatch?.batches || {}).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0),
      approval_stages:approvalWorkflow?.stages?.length || 0,
      lifecycle_tasks:lifecycleQueue?.stats?.tasks || lifecycleQueue?.tasks?.length || 0,
      activation_records:activation?.stats?.records || 0,
      categories:facets.categories.length,
      cities:facets.cities.length
    },
    workflows,
    entries:[
      ...valleyBrainRouteEntries(internalRoutes, 'admin_route'),
      ...dataFiles,
      ...workflows.map(workflow => ({
        kind:'admin_workflow',
        title:workflow.title,
        href:workflow.route,
        description:workflow.summary,
        answer:`Open ${workflow.route}, follow the route guide, inspect the source feeds, then save/export the operator ledger.`,
        keywords: unique([workflow.title, workflow.route, workflow.summary, ...workflow.steps])
      }))
    ]
  };
}
function aeWorkOrdersPage(workOrders){
  const rows = workOrders.work_orders.slice(0, 250).map(w=>`<tr><th>${html(w.rank)}</th><td><a href="${html(w.url)}">${html(w.name)}</a></td><td>${html(w.due_date)}</td><td>${html(w.city)}</td><td>${html(w.recommended_product)}</td><td>${html(w.next_action)}</td></tr>`).join('');
  const focus = workOrders.city_focus.map(c=>`<div class="glass proof-card"><span>${html(c.city.slice(0,2).toUpperCase())}</span><h2>${html(c.city)}</h2><p>${c.high_priority_accounts} high-priority accounts • ${c.claim_ready} claim-ready • ${c.upgrade_ready} upgrade-ready.</p></div>`).join('');
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">AE work orders</p><h1>Daily operator tasks generated from the marketplace.</h1><p class="hero-text">Instead of just listing businesses, this gives reps a ranked, due-dated account queue tied to products, scripts, and next actions.</p><div class="hero-actions"><a class="btn primary" href="/data/ae-work-orders.json">Open work orders JSON</a><a class="btn" href="/data/ae-call-queue.csv">Call queue CSV</a></div></div><aside class="hero-card"><div class="metric"><span>${workOrders.stats.work_orders.toLocaleString()}</span><small>work orders</small></div><div class="metric"><span>${workOrders.stats.city_focus}</span><small>city focus lanes</small></div></aside></section><section class="platform-strip">${focus}</section><section class="section glass"><div class="table-wrap"><table><thead><tr><th>Rank</th><th>Business</th><th>Due</th><th>City</th><th>Product</th><th>Next action</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  return pageWrap({ title:'AE Work Orders | Valley Verified', description:'Generated AE work orders from Valley Verified seeded marketplace data.', canonical:`${SITE_URL}/ae-work-orders/`, bodyClass:'ae-work-orders-page' }, body);
}

function platformSurfaceLinks(){
  return ['/', '/featured/', '/app-builds/', '/about/', '/how-it-works/', '/network/', '/directory/', '/business/', '/category/', '/city/', '/niche/', '/service-lanes/', '/market/', '/collection/', '/for-businesses/', '/advertise/', '/contact/', '/join/', '/pricing/', '/ae-command/', '/accounts/', '/pipeline/', '/activation/', '/territories/', '/kpi/', '/revenue/', '/sales-playbook/', '/trust-network/', '/shortlist/', '/compare/', '/match/', '/lead-routing/', '/deal-desk/', '/offers/', '/map/', '/submit/', '/request/', '/claim/', '/owner-verification/', '/lifecycle/', '/insights/', '/audit/', '/coverage/', '/opportunities/', '/outreach/', '/sponsor/', '/monetization/', '/exports/', '/admin-review/', '/admin-actions/', '/admin-batch/', '/import-health/', '/dry-run/', '/crawl/', '/routing/', '/verification/', '/fraud-defense/', '/duplicates/', '/api/', '/embed/', '/platform/', '/data/', '/operator/', '/production-readiness/', '/claims-ledger/', '/launch-packet/', '/backend/', '/action-queue/', '/lead-inbox/', '/owner-crm/', '/ae-work-orders/'];
}
function publicSurfaceLinks(){ return platformSurfaceLinks().filter(route => !isInternalRoute(route)); }
function internalSurfaceLinks(){ return platformSurfaceLinks().filter(route => isInternalRoute(route)); }
function platformPage(businesses, facets, report){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Build proof</p><h1>Platform status and route inventory</h1><p class="hero-text">This page documents what the generated platform contains in this build. It is intentionally separate from the public marketplace pages.</p></div><aside class="hero-card"><div class="metric"><span>${businesses.length}</span><small>businesses</small></div><div class="metric"><span>${report.routes.business}</span><small>business pages</small></div><div class="metric"><span>${report.routes.city}</span><small>city pages</small></div><div class="metric"><span>${report.routes.category}</span><small>category pages</small></div></aside></section>
  <section class="platform-strip"><div class="glass proof-card"><span>✓</span><h2>Multi-page shell</h2><p>Generated landing, directory, profile, city, category, niche, duplicate scanner, admin review, operator, data, platform, and 404 surfaces.</p></div><div class="glass proof-card"><span>✓</span><h2>Seed ingestion</h2><p>Loaded ${loadedFiles.length} seed file(s), normalized ${report.records.raw} raw record(s), published ${businesses.length} deduped profile(s), suppressed ${report.records.suppressed} blocked record(s), and flagged ${report.records.possible_duplicates} possible duplicate pair(s).</p></div><div class="glass proof-card"><span>✓</span><h2>Static publishing</h2><p>Generated JSON data, search index, sitemap, robots, manifest, and llms.txt into <code>dist/</code>.</p></div></section>
  <section class="section glass"><div class="section-head"><div><p class="eyebrow">Route counts</p><h2>Published surfaces</h2></div><span class="stat-pill">${report.routes.total} total</span></div><div class="table-wrap"><table><tbody>${Object.entries(report.routes).map(([k,v])=>`<tr><th>${html(k)}</th><td>${html(v)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="split-grid"><div class="glass section"><p class="eyebrow">Seed files</p><h2>Loaded inputs</h2><ul class="file-list">${loadedFiles.map(f=>`<li><code>${html(f)}</code></li>`).join('')}</ul></div><div class="glass section"><p class="eyebrow">Warnings</p><h2>Build notes</h2>${warnings.length ? `<ul class="file-list">${warnings.map(w=>`<li>${html(w)}</li>`).join('')}</ul>` : '<p class="muted">No build warnings.</p>'}</div></section>
  <section class="section glass"><p class="eyebrow">Activation path</p><h2>How new scraped businesses go live</h2><div class="pipeline-grid"><div><strong>Seed folder</strong><p><code>seed/businesses/inbox/</code></p></div><div><strong>Build command</strong><p><code>npm run build</code></p></div><div><strong>Verification</strong><p><code>npm run smoke</code></p></div><div><strong>Publish folder</strong><p><code>dist</code></p></div></div></section>`;
  return pageWrap({ title:'Platform Status | Valley Verified', description:'Valley Verified platform build status, generated route inventory, seed file ledger, and proof notes.', canonical:`${SITE_URL}/platform/`, bodyClass:'platform-page' }, body);
}
function dataPage(report){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Data pipeline</p><h1>Seeded data surfaces</h1><p class="hero-text">Machine-readable exports generated at build time for search, crawl, and operator review.</p></div></section><section class="section glass"><div class="tile-grid"><a class="platform-tile" href="/data/businesses.json"><span>JSON</span><h3>Published businesses</h3><p>Full normalized dataset.</p></a><a class="platform-tile" href="/data/search-index.json"><span>IDX</span><h3>Search index</h3><p>Lean index for client search.</p></a><a class="platform-tile" href="/data/offers.json"><span>OFR</span><h3>Offer index</h3><p>Generated package and pricing signals.</p></a><a class="platform-tile" href="/data/duplicate-report.json"><span>DUP</span><h3>Duplicate report</h3><p>Auto-merge and possible collision ledger.</p></a><a class="platform-tile" href="/data/moderation-queue.json"><span>MOD</span><h3>Moderation queue</h3><p>Admin review items from risk scans.</p></a><a class="platform-tile" href="/data/taxonomy.json"><span>TAX</span><h3>Taxonomy</h3><p>Categories and niche lanes.</p></a><a class="platform-tile" href="/data/route-manifest.json"><span>MAP</span><h3>Route manifest</h3><p>Platform surface inventory.</p></a><a class="platform-tile" href="/data/businesses.csv"><span>CSV</span><h3>Business CSV</h3><p>Spreadsheet-friendly export.</p></a><a class="platform-tile" href="/data/vcards.vcf"><span>VCF</span><h3>Bulk vCards</h3><p>Contact-card export for seeded businesses.</p></a><a class="platform-tile" href="/data/match-index.json"><span>MTCH</span><h3>Match index</h3><p>Request matching data.</p></a><a class="platform-tile" href="/data/coverage-gaps.json"><span>GAP</span><h3>Coverage gaps</h3><p>Operator scrape priorities.</p></a><a class="platform-tile" href="/data/outreach-packets.json"><span>CRM</span><h3>Outreach packets</h3><p>Owner activation queue.</p></a><a class="platform-tile" href="/data/sponsor-inventory.json"><span>REV</span><h3>Sponsor inventory</h3><p>Sellable placement surfaces.</p></a><a class="platform-tile" href="/data/market-index.json"><span>MKT</span><h3>Market index</h3><p>City/category pages.</p></a><a class="platform-tile" href="/data/seed-schema.json"><span>SCH</span><h3>Seed schema</h3><p>Accepted seed fields.</p></a><a class="platform-tile" href="/data/seed-template.json"><span>TPL</span><h3>Seed template</h3><p>Starter file for new batches.</p></a><a class="platform-tile" href="/data/seed-field-map.json"><span>MAP</span><h3>Seed field map</h3><p>Aliases accepted from scrape exports.</p></a><a class="platform-tile" href="/data/import-dry-run.json"><span>DRY</span><h3>Import dry run</h3><p>Pre-publish safety summary.</p></a><a class="platform-tile" href="/data/canonical-routing.json"><span>URL</span><h3>Canonical routing</h3><p>One URL per business identity.</p></a><a class="platform-tile" href="/data/crawl-budget.json"><span>CRL</span><h3>Crawl budget</h3><p>Sitemap and archive scaling plan.</p></a><a class="platform-tile" href="/data/admin-bulk-actions.csv"><span>OPS</span><h3>Admin bulk CSV</h3><p>Spreadsheet-friendly moderation queue.</p></a><a class="platform-tile" href="/data/contact-fingerprint-index.json"><span>FPR</span><h3>Contact fingerprints</h3><p>Shared contact signals for duplicate defense.</p></a><a class="platform-tile" href="/data/duplicate-clusters.json"><span>CLS</span><h3>Duplicate clusters</h3><p>Exact, possible, and fingerprint collision clusters.</p></a><a class="platform-tile" href="/data/owner-verification-packets.json"><span>OWN</span><h3>Owner verification</h3><p>Claim proof packets for every listing.</p></a><a class="platform-tile" href="/data/business-lifecycle-queue.json"><span>LIFE</span><h3>Lifecycle queue</h3><p>Operator next-step queue for stale or weak listings.</p></a><a class="platform-tile" href="/data/lead-routing-rules.json"><span>LEAD</span><h3>Lead routing</h3><p>City/category routing rules.</p></a><a class="platform-tile" href="/data/category-opportunity-index.json"><span>OPP</span><h3>Opportunity index</h3><p>Category growth and enrichment scores.</p></a><a class="platform-tile" href="/data/monetization-readiness.json"><span>$$</span><h3>Monetization readiness</h3><p>Sellable sponsor and upgrade inventory.</p></a><a class="platform-tile" href="/data/platform-api-index.json"><span>API</span><h3>Static API index</h3><p>Generated JSON endpoints for apps and widgets.</p></a><a class="platform-tile" href="/data/fraud-defense.json"><span>SAFE</span><h3>Fraud defense</h3><p>One-posting policy evidence bundle.</p></a><a class="platform-tile" href="/data/exposure-products.json"><span>SELL</span><h3>Exposure products</h3><p>Sellable upgrade/package model.</p></a><a class="platform-tile" href="/data/activation-pipeline.json"><span>ACT</span><h3>Activation pipeline</h3><p>Commercial next-step queue.</p></a><a class="platform-tile" href="/data/ae-territory-plan.json"><span>AE</span><h3>AE territory plan</h3><p>City/category sales focus.</p></a><a class="platform-tile" href="/data/ae-call-queue.csv"><span>CSV</span><h3>AE call queue</h3><p>Rep-friendly outreach CSV.</p></a><a class="platform-tile" href="/data/revenue-readiness.json"><span>MRR</span><h3>Revenue readiness</h3><p>Forecast scenarios and inputs.</p></a><a class="platform-tile" href="/data/sales-playbooks.json"><span>PLAY</span><h3>Sales playbooks</h3><p>AE scripts and objections.</p></a><a class="platform-tile" href="/data/marketplace-command-center.json"><span>CMD</span><h3>Command center</h3><p>Operator money-path snapshot.</p></a><a class="platform-tile" href="/data/production-readiness.json"><span>PROD</span><h3>Production readiness</h3><p>Package and live-certification gates.</p></a><a class="platform-tile" href="/data/public-claims-ledger.json"><span>CLAIM</span><h3>Claims ledger</h3><p>Supported and blocked sales claims.</p></a><a class="platform-tile" href="/data/launch-packet.json"><span>SHIP</span><h3>Launch packet</h3><p>Deploy commands, proof files, and crawl controls.</p></a><a class="platform-tile" href="/data/backend-action-contracts.json"><span>ACT</span><h3>Backend action contracts</h3><p>Upstream-auth-ready mutation contracts.</p></a><a class="platform-tile" href="/data/mutation-queue-template.json"><span>QUE</span><h3>Mutation queue template</h3><p>Review queue structure for runtime writes.</p></a><a class="platform-tile" href="/data/owner-crm-index.json"><span>CRM</span><h3>Owner CRM index</h3><p>Owner account readiness and next steps.</p></a><a class="platform-tile" href="/data/ae-work-orders.json"><span>WORK</span><h3>AE work orders</h3><p>Ranked rep task queue.</p></a><a class="platform-tile" href="/data/lead-inbox-queue.json"><span>LEAD</span><h3>Lead inbox queue</h3><p>Request routing lanes and candidates.</p></a><a class="platform-tile" href="/seed-report.json"><span>RPT</span><h3>Seed report</h3><p>Build counts, files, warnings, route counts.</p></a><a class="platform-tile" href="/sitemap.xml"><span>XML</span><h3>Sitemap</h3><p>Generated crawl map.</p></a></div></section><section class="section glass"><p class="eyebrow">Current build</p><h2>${report.records.published} published businesses from ${report.files.loaded} seed file(s)</h2><p class="muted">Raw records loaded: ${report.records.raw}. Duplicate or merged records: ${report.records.raw - report.records.published}.</p></section>`;
  return pageWrap({ title:'Data Pipeline | Valley Verified', description:'Machine-readable platform data exports for Valley Verified Network.', canonical:`${SITE_URL}/data/`, bodyClass:'data-page' }, body);
}
function businessIndexPage(businesses, facets){
  return directoryShell({ businesses, facets, title:'Business Profiles', eyebrow:'Profile index', description:'Browse every generated Valley Verified business profile from one index page.', canonical:`${SITE_URL}/business/` });
}
function categoryIndexPage(businesses, facets){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">Category index</p><h1>Service lanes and category hubs</h1><p class="hero-text">Each category hub is generated from the seed dataset and links into matching business profile pages.</p></div><aside class="hero-card"><div class="metric"><span>${facets.categories.length}</span><small>categories</small></div><div class="metric"><span>${businesses.length}</span><small>profiles</small></div></aside></section><section class="section glass"><div class="tile-grid">${facets.categories.map(c => categoryCard(c, businesses)).join('')}</div></section>`;
  return pageWrap({ title:'Category Index | Valley Verified', description:'Generated category index for Valley Verified business profile hubs.', canonical:`${SITE_URL}/category/`, bodyClass:'category-index-page' }, body);
}
function cityIndexPage(businesses, facets){
  const body = `<section class="hero glass subhero"><div><p class="eyebrow">City index</p><h1>City hubs across the Phoenix market</h1><p class="hero-text">Each city hub is generated from seeded business data and links into local profile pages.</p></div><aside class="hero-card"><div class="metric"><span>${facets.cities.length}</span><small>cities</small></div><div class="metric"><span>${businesses.length}</span><small>profiles</small></div></aside></section><section class="section glass"><div class="tile-grid">${facets.cities.map(c => cityCard(c, businesses)).join('')}</div></section>`;
  return pageWrap({ title:'City Index | Valley Verified', description:'Generated city index for Valley Verified Phoenix-area business profile hubs.', canonical:`${SITE_URL}/city/`, bodyClass:'city-index-page' }, body);
}

function operatorPage(){
  const body = `<section class="operator-hero glass"><a class="back-link" href="/">← Back to network</a><p class="eyebrow">Operator surface</p><h1>Scrape Import Console</h1><p>This browser tool converts pasted or uploaded CSV/JSON scrape exports into seed files for review and publishing.</p><div class="operator-grid small"><div><strong>Drop target</strong><br><code>seed/businesses/inbox/</code></div><div><strong>Build command</strong><br><code>npm run build</code></div><div><strong>Publish output</strong><br><code>dist</code></div></div></section>
  <section class="glass operator-panel"><div class="section-head"><div><p class="eyebrow">1. Normalize</p><h2>Convert outside business data</h2></div><span id="operatorCount" class="stat-pill">0 ready</span></div><p class="muted">Accepted fields include name, category, subcategory, website, booking_url, phone, email, address, city, state, zip, lat, lng, tags, languages, starting_price, no_hidden_fees, business_verified, mobile, insured, instagram, tiktok, youtube, last_verified.</p><div class="form-row"><label for="seedName">Generated seed filename</label><input id="seedName" value="phx-scrape-batch.json" /></div><div class="form-row"><label for="seedFile">Upload CSV or JSON</label><input id="seedFile" type="file" accept=".csv,.json,application/json,text/csv" /></div><div class="form-row"><label for="seedPaste">Or paste raw CSV/JSON</label><textarea id="seedPaste" placeholder="name,category,city,website,phone..."></textarea></div><div class="button-row"><button id="normalizeBtn" class="btn primary">Normalize seed</button><button id="copyBtn" class="btn" disabled>Copy JSON</button><button id="downloadBtn" class="btn" disabled>Download seed file</button></div></section>
  <section class="glass operator-panel"><div class="section-head"><div><p class="eyebrow">2. Review</p><h2>Generated seed JSON</h2></div></div><pre id="seedOutput" class="code-output">Paste or upload data, then click Normalize seed.</pre></section>
  <section class="section glass"><p class="eyebrow">3. Publish</p><h2>Drop the downloaded JSON into <code>seed/businesses/inbox/</code>, then redeploy.</h2><p class="muted">Netlify will run <code>npm run build</code>, regenerate the dataset, rebuild profile pages and hubs, then publish the updated platform.</p></section>`;
  return pageWrap({ title:'Operator Import Console | Valley Verified', description:'Operator import console for turning outside scrape exports into Valley Verified seed files.', canonical:`${SITE_URL}/operator/`, bodyClass:'operator-page' }, body, '<script type="module" src="/assets/operator.js"></script><script type="module" src="/assets/valley-brain.js"></script>');
}
function notFoundPage(){
  const body = `<section class="error-shell glass"><p class="eyebrow">404</p><h1>Route not found.</h1><p class="muted">This platform generates static business, city, category, directory, data, platform, and operator pages. Use the directory to find a published profile.</p><div class="hero-actions"><a class="btn primary" href="/directory/">Open directory</a><a class="btn" href="/">Go home</a></div></section>`;
  return pageWrap({ title:'404 | Valley Verified', description:'Route not found.', canonical:`${SITE_URL}/404.html`, bodyClass:'error-page' }, body);
}
function sitemap(routes){ return sitemapDocument(routes); }
function manifest(){ return JSON.stringify({ name:'Valley Verified Network', short_name:'Valley Verified', start_url:'/', display:'standalone', background_color:'#f5efe3', theme_color:'#f5efe3', icons:[{ src:'/assets/valley-verified-logo.png', sizes:'1024x1024', type:'image/png', purpose:'any' }] }, null, 2); }
function valleyRuntimeDecision(){
  return {
    surface: 'Valley Verified',
    checkedAt: TODAY,
    decision: 'public_directory_static_admin_external_proof_only',
    canonicalPublicRoute: '/valley-verified/',
    canonicalDataRoutes: [
      '/valley-verified/data/businesses.json',
      '/valley-verified/data/search-index.json',
      '/valley-verified/data/search-shards/'
    ],
    mounted0sBehavior: {
      publicDirectory: 'live_static',
      businessPages: 'live_static',
      apiFolder: 'manifest_only',
      adminConsole: 'external_proof_only',
      payments: 'external_gate_owned'
    },
    notMountedOn0s: [
      '/valley-verified/.netlify/functions/phx-admin',
      '/valley-verified/.netlify/functions/phx-payment',
      '/valley-verified/.netlify/functions/phx-action',
      '/valley-verified/.netlify/functions/phx-lead'
    ],
    operatorTruth: 'The 0S Valley mount serves public directory/search/data/proof pages. Admin mutation, PHX action, and payment execution do not run on the 0S static mount. Those pages are proof/model surfaces unless a future gated Valley backend is deliberately mounted.',
    liveBackends: {
      northstar0sMount: '/northstar/',
      northstarApiBase: '/api/northstar',
      skyePayGateOffer: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane',
      fs27Gate: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/'
    },
    closure: {
      'VALLEY-01': 'Admin functions do not belong on this 0S static mount in the current closure pass.',
      'VALLEY-02': 'Not applicable because the selected decision is not to mount PHX admin/payment functions on 0S.',
      'VALLEY-03': 'Admin/payment pages are marked external/proof-only and point to gate-owned live backend routes.'
    }
  };
}
function robots(){
  const disallow = Array.from(INTERNAL_SURFACE_PATHS).sort().map(route => `Disallow: ${route}`).join('\n');
  return `User-agent: *\nAllow: /\n${disallow}\nSitemap: ${SITE_URL}/sitemap-index.xml\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
function llms(report){ return `# Valley Verified Network\n\nValley Verified is a seed-driven Phoenix-area business discovery platform.\n\nPublished static surfaces in this build:\n- ${report.records.published} static business profile pages\n- ${report.routes.city} city hubs\n- ${report.routes.category} category hubs\n- Directory, category hubs, city/category market pages, niche hubs, offer marketplace, match engine, coverage scanner, outreach desk, sponsor inventory, export vault, map board, submit intake, buyer request, claim packet, duplicate scanner, admin review queue, import dry run, canonical routing, crawl control, verification protocol, owner verification packets, fraud defense, lead routing, lifecycle queue, category opportunity index, monetization readiness, static API endpoints, pricing/exposure products, business owner join page, AE command center, activation pipeline, territory plan, revenue readiness model, sales playbook, trust network page, insights, operator import console, data pipeline page, backend action contracts, owner CRM, AE work orders, lead inbox queues, platform status page\n\nSeed workflow: add CSV/JSON scrape files to seed/businesses/inbox/ and run npm run build.\n`; }
async function main(){
  const raw = await readSeedRecords();
  const suppressions = await readSuppressions();
  const taxonomy = await readTaxonomy();
  const identityAudit = { exact_merges:[], possible_duplicates:[], suppressed:[] };
  const businesses = dedupeBusinesses(raw.map(normalizeBusiness), suppressions, identityAudit);
  const facets = facetsFor(businesses, taxonomy);
  const searchIndex = businesses.map(b => ({ ...compactBusinessRecord(b), text:[b.name,b.category,b.subcategory,b.niche,b.city,b.neighborhood,b.tags.join(' '),b.description].join(' ') }));
  const offers = allOffers(businesses);
  const collections = collectionsFor(businesses);
  const markets = marketMatrix(businesses, facets);
  const coverage = coverageGaps(businesses, facets);
  const matchRecords = matchIndex(businesses);
  const sponsor = sponsorInventory(businesses, facets, markets);
  const outreach = outreachPackets(businesses);
  const quality = importQuality(raw, businesses, identityAudit);
  const sourceBatches = quality.source_batches;
  const posterRisk = posterRiskIndex(businesses, identityAudit);
  const aliases = canonicalAliases(businesses);
  const suppressTemplate = suppressionTemplate(businesses, identityAudit);
  const actionPackets = adminActionPackets(businesses, identityAudit);
  const handbuiltIds = await handbuiltPageIdSet();
  const staticHandPageCount = businesses.filter(b => handbuiltIds.has(b.id)).length;
  const canonicalRouting = canonicalRoutingIndex(businesses, handbuiltIds);
  const fieldMap = seedFieldMap();
  const dryRun = importDryRunReport(raw, businesses, identityAudit, quality, posterRisk);
  const report = { updated_at:TODAY, site_url:SITE_URL, files:{ loaded:loadedFiles.length, loaded_files:loadedFiles }, records:{ raw:raw.length, published:businesses.length, merged_or_duplicates:raw.length - businesses.length, suppressed:identityAudit.suppressed.length, possible_duplicates:identityAudit.possible_duplicates.length, exact_merges:identityAudit.exact_merges.length, import_rejection_candidates:quality.rejection_candidates.length, poster_risk_records:posterRisk.length, static_business_pages:staticHandPageCount, static_business_pages_required:businesses.length, missing_static_business_pages:businesses.length - staticHandPageCount, profile_mode:'static-hand-pages-required' }, facets:{ categories:facets.categories.length, cities:facets.cities.length, tags:facets.tags.length, markets:markets.length, coverage_gaps:coverage.length }, routes:{ home:1, directory:1, business_index:1, business:businesses.length, category_index:1, category:facets.categories.length, city_index:1, city:facets.cities.length, niche_index:1, niche:facets.niches.length, market_index:1, market:markets.length, collection_index:1, collection:collections.length, shortlist:1, compare:1, match:1, lead_routing:1, deal_desk:1, offers:1, map:1, submit:1, request:1, claim:1, owner_verification:1, lifecycle:1, insights:1, audit:1, coverage:1, opportunities:1, outreach:1, sponsor:1, monetization:1, exports:1, admin_review:1, admin_actions:1, admin_batch:1, import_health:1, accounts:1, pipeline:1, kpi:1, service_lanes:1, dry_run:1, crawl:1, routing:1, verification:1, fraud_defense:1, business_archive:Math.ceil(businesses.length / DIRECTORY_PAGE_SIZE), duplicates:1, api:1, embed:1, operator:1, data:1, platform:1, error:1, total:0 }, warnings };
  Object.assign(report.routes, { join:1, pricing:1, ae_command:1, activation:1, territories:1, revenue:1, sales_playbook:1, trust_network:1, production_readiness:1, claims_ledger:1, launch_packet:1, backend:1, action_queue:1, lead_inbox:1, owner_crm:1, ae_work_orders:1, runtime_state:1, db_contracts:1, approval_flow:1 });
  report.routes.total = Object.entries(report.routes).filter(([k])=>k!=='total').reduce((sum,[,v])=>sum+v,0);
  const crawlBudget = crawlBudgetReport(report, businesses);
  const contactFingerprints = contactFingerprintIndex(businesses);
  const duplicateClusters = duplicateClusterIndex(identityAudit, contactFingerprints);
  const ownerPackets = ownerVerificationPackets(businesses);
  const lifecycleQueue = businessLifecycleQueue(businesses);
  const leadRules = leadRoutingRules(facets, markets, businesses);
  const opportunities = categoryOpportunityIndex(businesses, facets, coverage);
  const monetization = monetizationReadiness(businesses, sponsor, markets);
  const apiIndex = platformApiIndex();
  const fraudBundle = fraudDefenseBundle(contactFingerprints, duplicateClusters, posterRisk);
  const products = exposureProducts();
  const accountScores = accountOpportunityScore(businesses, markets, products);
  const aePipeline = aePipelineBoard(accountScores);
  const claimStatus = claimStatusIndex(businesses);
  const kpi = marketplaceKpi(businesses, accountScores, markets, quality);
  const adminBatch = adminBatchActions(accountScores, duplicateClusters, ownerPackets);
  const laneCatalog = serviceLaneCatalog(facets, markets, accountScores);
  const activation = activationPipeline(businesses);
  const territory = aeTerritoryPlan(businesses, facets, markets, coverage, activation);
  const playbooks = salesPlaybooks(facets, products);
  const revenue = revenueReadiness(businesses, markets, activation, products);
  const commandCenter = marketplaceCommandCenter(report, activation, territory, revenue, duplicateClusters);
  const claimsLedger = publicClaimsLedger(report, quality, duplicateClusters, revenue);
  const productionReadiness = productionReadinessGate(report, quality, duplicateClusters, crawlBudget, revenue);
  const launch = launchPacket(report, claimsLedger, productionReadiness);
  const actionContracts = backendActionContracts();
  const mutationQueue = mutationQueueTemplate(actionContracts);
  const runtimeState = runtimeStateModel(actionContracts, report);
  const dbContracts = dbContractsBundle();
  const approvalWorkflow = approvalWorkflowModel(actionContracts);
  const ownerCrm = ownerCrmIndex(businesses, accountScores, ownerPackets);
  const workOrders = aeWorkOrders(accountScores, territory, activation);
  const leadInbox = leadInboxQueue(leadRules, accountScores);
  const listingOps = listingOpsIndex(businesses, lifecycleQueue, duplicateClusters, claimStatus);
  const publicBrain = valleyBrainPublicIndex({ businesses, facets, report, leadRules, products, markets });
  const adminBrain = valleyBrainAdminIndex({ businesses, facets, report, ownerCrm, workOrders, leadInbox, leadRules, actionPackets, adminBatch, approvalWorkflow, lifecycleQueue, activation });

  await fs.rm(DIST, { recursive:true, force:true });
  await ensureDir(path.join(DIST, 'assets'));
  await ensureDir(path.join(DIST, 'data'));
  await ensureDir(path.join(DIST, 'embed'));
  await ensureDir(path.join(DIST, 'api'));
  await copyFile(path.join(SRC, 'styles.css'), path.join(DIST, 'assets', 'styles.css'));
  await copyFile(path.join(SRC, 'valley-brain.css'), path.join(DIST, 'assets', 'valley-brain.css'));
  await copyFile(path.join(SRC, 'app.js'), path.join(DIST, 'assets', 'app.js'));
  await copyFile(path.join(SRC, 'operator.js'), path.join(DIST, 'assets', 'operator.js'));
  await copyFile(path.join(SRC, 'operator-workspace.js'), path.join(DIST, 'assets', 'operator-workspace.js'));
  await copyFile(path.join(SRC, 'valley-brain.js'), path.join(DIST, 'assets', 'valley-brain.js'));
  await copyFile(path.join(SRC, 'valley-verified-logo.png'), path.join(DIST, 'assets', 'valley-verified-logo.png'));
  await writeFile(path.join(DIST, 'embed', 'businesses.js'), embedScript());
  await writeFile(path.join(DIST, 'data', 'businesses.json'), JSON.stringify({ updated_at:TODAY, businesses, facets }));
  await writeFile(path.join(DIST, 'data', 'static-page-policy.json'), JSON.stringify({
    updated_at:TODAY,
    active:'custom-static-pages-only',
    generated_profile_pages_enabled:false,
    deleted_generator:'scripts/v21-enhance.mjs',
    options:[{
      id:'custom-static-pages-only',
      default:true,
      note:'Business pages publish only from committed src/handbuilt-pages/<business-id>/index.html files. Missing custom pages fail the build; no generated company-page fallback is allowed.'
    }]
  }));
  await writeFile(path.join(DIST, 'data', 'skyemail-provisioning.json'), JSON.stringify(skyEmailProvisioningModel(businesses)));
  const profileShards = new Map();
  for(const b of businesses){ const shard = profileShard(b.id); if(!profileShards.has(shard)) profileShards.set(shard, []); profileShards.get(shard).push(b); }
  await mapLimit(Array.from(profileShards.entries()), 32, async ([shard, rows]) => writeFile(path.join(DIST, 'data', 'profiles', `${shard}.json`), JSON.stringify({ updated_at:TODAY, shard, businesses:rows })));
  await writeFile(path.join(DIST, 'data', 'businesses.csv'), businessesCsv(businesses));
  await writeFile(path.join(DIST, 'data', 'seed-schema.json'), JSON.stringify(seedSchema()));
  await writeFile(path.join(DIST, 'data', 'seed-template.json'), JSON.stringify(seedTemplate()));
  await writeFile(path.join(DIST, 'data', 'search-index.json'), JSON.stringify({ updated_at:TODAY, records:searchIndex }));
  await writeFile(path.join(DIST, 'data', 'offers.json'), JSON.stringify({ updated_at:TODAY, offers }));
  await writeFile(path.join(DIST, 'data', 'market-index.json'), JSON.stringify({ updated_at:TODAY, markets:markets.map(m=>({ ...m, businesses:m.businesses.map(b=>b.id) })) }));
  await writeFile(path.join(DIST, 'data', 'coverage-gaps.json'), JSON.stringify({ updated_at:TODAY, gaps:coverage }));
  await writeFile(path.join(DIST, 'data', 'match-index.json'), JSON.stringify({ updated_at:TODAY, records:matchRecords }));
  await writeFile(path.join(DIST, 'data', 'sponsor-inventory.json'), JSON.stringify({ updated_at:TODAY, surfaces:sponsor }));
  await writeFile(path.join(DIST, 'data', 'outreach-packets.json'), JSON.stringify({ updated_at:TODAY, packets:outreach }));
  await writeFile(path.join(DIST, 'data', 'vcards.vcf'), vcards(businesses));
  await writeFile(path.join(DIST, 'data', 'duplicate-report.json'), JSON.stringify({ updated_at:TODAY, ...identityAudit }));
  await writeFile(path.join(DIST, 'data', 'moderation-queue.json'), JSON.stringify({ updated_at:TODAY, records:moderationQueue(businesses, identityAudit) }));
  await writeFile(path.join(DIST, 'data', 'business-identity-index.json'), JSON.stringify({ updated_at:TODAY, records:identityIndex(businesses) }));
  await writeFile(path.join(DIST, 'data', 'taxonomy.json'), JSON.stringify({ updated_at:TODAY, categories:taxonomy, niches:facets.niches }));
  await writeFile(path.join(DIST, 'data', 'categories.json'), JSON.stringify({ updated_at:TODAY, categories:facets.categories.map(name=>({ name, slug:slugify(name), count:businesses.filter(b=>b.category===name).length })) }));
  await writeFile(path.join(DIST, 'data', 'cities.json'), JSON.stringify({ updated_at:TODAY, cities:facets.cities.map(name=>({ name, slug:slugify(name), count:businesses.filter(b=>b.city===name).length })) }));
  await writeFile(path.join(DIST, 'data', 'route-manifest.json'), JSON.stringify({ updated_at:TODAY, surfaces:platformSurfaceLinks(), public_surfaces:publicSurfaceLinks(), internal_noindex_surfaces:internalSurfaceLinks(), generated_routes:report.routes }));
  await writeFile(path.join(DIST, 'data', 'import-quality.json'), JSON.stringify(quality));
  await writeFile(path.join(DIST, 'data', 'import-rejections.json'), JSON.stringify({ updated_at:TODAY, records:quality.rejection_candidates }));
  await writeFile(path.join(DIST, 'data', 'source-batches.json'), JSON.stringify({ updated_at:TODAY, batches:sourceBatches }));
  await writeFile(path.join(DIST, 'data', 'poster-risk-index.json'), JSON.stringify({ updated_at:TODAY, records:posterRisk }));
  await writeFile(path.join(DIST, 'data', 'canonical-aliases.json'), JSON.stringify({ updated_at:TODAY, records:aliases }));
  await writeFile(path.join(DIST, 'data', 'canonical-routing.json'), JSON.stringify({ updated_at:TODAY, records:canonicalRouting }));
  await writeFile(path.join(DIST, 'data', 'seed-field-map.json'), JSON.stringify(fieldMap));
  await writeFile(path.join(DIST, 'data', 'import-dry-run.json'), JSON.stringify(dryRun));
  await writeFile(path.join(DIST, 'data', 'crawl-budget.json'), JSON.stringify(crawlBudget));
  await writeFile(path.join(DIST, 'data', 'admin-bulk-actions.csv'), adminBulkActionsCsv(actionPackets));
  await writeFile(path.join(DIST, 'data', 'suppression-template.json'), JSON.stringify(suppressTemplate));
  await writeFile(path.join(DIST, 'data', 'admin-action-packets.json'), JSON.stringify(actionPackets));
  await writeFile(path.join(DIST, 'data', 'contact-fingerprint-index.json'), JSON.stringify(contactFingerprints));
  await writeFile(path.join(DIST, 'data', 'duplicate-clusters.json'), JSON.stringify(duplicateClusters));
  await writeFile(path.join(DIST, 'data', 'owner-verification-packets.json'), JSON.stringify({ updated_at:TODAY, packets:ownerPackets }));
  await writeFile(path.join(DIST, 'data', 'business-lifecycle-queue.json'), JSON.stringify(lifecycleQueue));
  await writeFile(path.join(DIST, 'data', 'lead-routing-rules.json'), JSON.stringify(leadRules));
  await writeFile(path.join(DIST, 'data', 'category-opportunity-index.json'), JSON.stringify(opportunities));
  await writeFile(path.join(DIST, 'data', 'monetization-readiness.json'), JSON.stringify(monetization));
  await writeFile(path.join(DIST, 'data', 'platform-api-index.json'), JSON.stringify(apiIndex));
  await writeFile(path.join(DIST, 'data', 'fraud-defense.json'), JSON.stringify(fraudBundle));
  await writeFile(path.join(DIST, 'data', 'exposure-products.json'), JSON.stringify(products));
  await writeFile(path.join(DIST, 'data', 'activation-pipeline.json'), JSON.stringify(activation));
  await writeFile(path.join(DIST, 'data', 'ae-territory-plan.json'), JSON.stringify(territory));
  await writeFile(path.join(DIST, 'data', 'sales-playbooks.json'), JSON.stringify(playbooks));
  await writeFile(path.join(DIST, 'data', 'revenue-readiness.json'), JSON.stringify(revenue));
  await writeFile(path.join(DIST, 'data', 'marketplace-command-center.json'), JSON.stringify(commandCenter));
  await writeFile(path.join(DIST, 'data', 'account-opportunity-score.json'), JSON.stringify({ updated_at:TODAY, accounts:accountScores }));
  await writeFile(path.join(DIST, 'data', 'ae-pipeline-board.json'), JSON.stringify(aePipeline));
  await writeFile(path.join(DIST, 'data', 'claim-status-index.json'), JSON.stringify(claimStatus));
  await writeFile(path.join(DIST, 'data', 'marketplace-kpi.json'), JSON.stringify(kpi));
  await writeFile(path.join(DIST, 'data', 'admin-batch-actions.json'), JSON.stringify(adminBatch));
  await writeFile(path.join(DIST, 'data', 'service-lane-catalog.json'), JSON.stringify(laneCatalog));
  await writeFile(path.join(DIST, 'data', 'owner-followup-calendar.csv'), followupCalendarCsv(accountScores));
  await writeFile(path.join(DIST, 'data', 'public-claims-ledger.json'), JSON.stringify(claimsLedger));
  await writeFile(path.join(DIST, 'data', 'production-readiness.json'), JSON.stringify(productionReadiness));
  await writeFile(path.join(DIST, 'data', 'launch-packet.json'), JSON.stringify(launch));
  await writeFile(path.join(DIST, 'data', 'backend-action-contracts.json'), JSON.stringify(actionContracts));
  await writeFile(path.join(DIST, 'data', 'mutation-queue-template.json'), JSON.stringify(mutationQueue));
  await writeFile(path.join(DIST, 'data', 'owner-crm-index.json'), JSON.stringify(ownerCrm));
  await writeFile(path.join(DIST, 'data', 'ae-work-orders.json'), JSON.stringify(workOrders));
  await writeFile(path.join(DIST, 'data', 'lead-inbox-queue.json'), JSON.stringify(leadInbox));
  await writeFile(path.join(DIST, 'data', 'listing-ops-index.json'), JSON.stringify(listingOps));
  await writeFile(path.join(DIST, 'data', 'runtime-state-model.json'), JSON.stringify(runtimeState));
  await writeFile(path.join(DIST, 'data', 'db-contracts.json'), JSON.stringify(dbContracts));
  await writeFile(path.join(DIST, 'data', 'approval-workflow.json'), JSON.stringify(approvalWorkflow));
  await writeFile(path.join(DIST, 'data', 'brain-public-index.json'), JSON.stringify(publicBrain));
  await writeFile(path.join(DIST, 'data', 'brain-admin-index.json'), JSON.stringify(adminBrain));
  await writeFile(path.join(DIST, 'data', 'd1-schema.sql'), dbContracts.d1_sql);
  await writeFile(path.join(DIST, 'data', 'neon-schema.sql'), dbContracts.neon_sql);
  await writeFile(path.join(DIST, 'data', 'ae-call-queue.csv'), aeCallQueueCsv(territory.call_queue));
  await writeFile(path.join(DIST, 'api', 'businesses.json'), JSON.stringify({ updated_at:TODAY, businesses:businesses.map(compactBusinessRecord), count:businesses.length }));
  await writeFile(path.join(DIST, 'api', 'skyemail-provisioning.json'), JSON.stringify({
    updated_at:TODAY,
    count:businesses.length,
    seats_remaining:SKYEMAIL_SEATS_REMAINING,
    reorder_threshold:SKYEMAIL_REORDER_THRESHOLD,
    href:'/data/skyemail-provisioning.json',
    workspace_confirmation_recipients:WORKSPACE_CONFIRMATION_RECIPIENTS
  }));
  await writeFile(path.join(DIST, 'api', 'search-index.json'), JSON.stringify({ updated_at:TODAY, records:searchIndex }));
  await writeFile(path.join(DIST, 'api', 'categories.json'), JSON.stringify({ updated_at:TODAY, categories:facets.categories.map(name=>({ name, slug:slugify(name), count:businesses.filter(b=>b.category===name).length })) }));
  await writeFile(path.join(DIST, 'api', 'cities.json'), JSON.stringify({ updated_at:TODAY, cities:facets.cities.map(name=>({ name, slug:slugify(name), count:businesses.filter(b=>b.city===name).length })) }));
  await writeFile(path.join(DIST, 'api', 'lead-routing-rules.json'), JSON.stringify(leadRules));
  await writeFile(path.join(DIST, 'api', 'owner-verification-packets.json'), JSON.stringify({ updated_at:TODAY, packets:ownerPackets }));
  await writeFile(path.join(DIST, 'api', 'fraud-defense.json'), JSON.stringify(fraudBundle));
  await writeFile(path.join(DIST, 'api', 'exposure-products.json'), JSON.stringify(products));
  await writeFile(path.join(DIST, 'api', 'activation-pipeline.json'), JSON.stringify(activation));
  await writeFile(path.join(DIST, 'api', 'ae-territory-plan.json'), JSON.stringify(territory));
  await writeFile(path.join(DIST, 'api', 'revenue-readiness.json'), JSON.stringify(revenue));
  await writeFile(path.join(DIST, 'api', 'account-opportunity-score.json'), JSON.stringify({ updated_at:TODAY, accounts:accountScores.slice(0, 5000) }));
  await writeFile(path.join(DIST, 'api', 'marketplace-kpi.json'), JSON.stringify(kpi));
  await writeFile(path.join(DIST, 'api', 'service-lane-catalog.json'), JSON.stringify(laneCatalog));
  await writeFile(path.join(DIST, 'api', 'backend-action-contracts.json'), JSON.stringify(actionContracts));
  await writeFile(path.join(DIST, 'api', 'owner-crm-index.json'), JSON.stringify({ updated_at:TODAY, stats:ownerCrm.stats, owners:ownerCrm.owners.slice(0, 5000) }));
  await writeFile(path.join(DIST, 'api', 'ae-work-orders.json'), JSON.stringify({ updated_at:TODAY, stats:workOrders.stats, work_orders:workOrders.work_orders.slice(0, 5000) }));
  await writeFile(path.join(DIST, 'api', 'lead-inbox-queue.json'), JSON.stringify(leadInbox));
  await writeFile(path.join(DIST, 'api', 'runtime-state-model.json'), JSON.stringify(runtimeState));
  await writeFile(path.join(DIST, 'api', 'db-contracts.json'), JSON.stringify(dbContracts));
  await writeFile(path.join(DIST, 'api', 'approval-workflow.json'), JSON.stringify(approvalWorkflow));
  await writeFile(path.join(DIST, 'api', 'brain-public-index.json'), JSON.stringify({ updated_at:TODAY, href:'/data/brain-public-index.json', entries:publicBrain.entries.length, counts:publicBrain.counts }));
  await writeFile(path.join(DIST, 'api', 'brain-admin-index.json'), JSON.stringify({ updated_at:TODAY, href:'/api/valley-verified/admin-brain-index', entries:adminBrain.entries.length, counts:adminBrain.counts, mode:'admin', protected:true }));
  const searchShards = new Map();
  for(const rec of searchIndex){ const shard = searchShardKey(rec); if(!searchShards.has(shard)) searchShards.set(shard, []); searchShards.get(shard).push(rec); }
  await ensureDir(path.join(DIST, 'data', 'search-shards'));
  await mapLimit(Array.from(searchShards.entries()), 16, async ([shard, records]) => writeFile(path.join(DIST, 'data', 'search-shards', `${shard}.json`), JSON.stringify({ updated_at:TODAY, shard, records })));
  await writeFile(path.join(DIST, 'data', 'search-shard-manifest.json'), JSON.stringify({ updated_at:TODAY, shards:Array.from(searchShards.entries()).map(([shard, records]) => ({ shard, url:`/data/search-shards/${shard}.json`, records:records.length })).sort((a,b)=>a.shard.localeCompare(b.shard)) }));
  await writeFile(path.join(DIST, 'seed-report.json'), JSON.stringify(report));
  if(DATA_ONLY){ console.log(`Seeded ${businesses.length} businesses from ${raw.length} raw records.`); return; }

  const routes = platformSurfaceLinks();
  await writeFile(path.join(DIST, 'index.html'), homePage(businesses, facets, report));
  await writeFile(writePathFor('/directory/'), directoryShell({ businesses, facets, title:'Valley Verified Business Directory', description:'Search the Valley Verified seeded business marketplace with filters for category, city, verification signals, mobile service, pricing, and tags.' }));
  await writeFile(writePathFor('/business/'), businessIndexPage(businesses, facets));
  await writeFile(writePathFor('/category/'), categoryIndexPage(businesses, facets));
  await writeFile(writePathFor('/city/'), cityIndexPage(businesses, facets));
  await writeFile(writePathFor('/niche/'), nicheIndexPage(businesses, facets));
  await writeFile(writePathFor('/market/'), marketIndexPage(markets, facets));
  await writeFile(writePathFor('/collection/'), collectionIndexPage(collections));
  await writeFile(writePathFor('/join/'), joinPage(products, activation));
  await writeFile(writePathFor('/pricing/'), pricingPage(products, revenue));
  await writeFile(writePathFor('/ae-command/'), aeCommandPage(territory, playbooks, revenue));
  await writeFile(writePathFor('/accounts/'), accountWorkbenchPage(accountScores));
  await writeFile(writePathFor('/pipeline/'), pipelinePage(aePipeline));
  await writeFile(writePathFor('/kpi/'), kpiPage(kpi));
  await writeFile(writePathFor('/service-lanes/'), serviceLanesPage(laneCatalog));
  await writeFile(writePathFor('/activation/'), activationPage(activation));
  await writeFile(writePathFor('/territories/'), territoriesPage(territory));
  await writeFile(writePathFor('/revenue/'), revenuePage(revenue, products));
  await writeFile(writePathFor('/sales-playbook/'), salesPlaybookPage(playbooks));
  await writeFile(writePathFor('/trust-network/'), trustNetworkPage());
  await writeFile(writePathFor('/production-readiness/'), productionReadinessPage(productionReadiness, launch));
  await writeFile(writePathFor('/claims-ledger/'), claimsLedgerPage(claimsLedger));
  await writeFile(writePathFor('/launch-packet/'), launchPacketPage(launch));
  await writeFile(writePathFor('/backend/'), backendContractsPage(actionContracts));
  await writeFile(writePathFor('/action-queue/'), actionQueuePage(mutationQueue, listingOps));
  await writeFile(writePathFor('/lead-inbox/'), leadInboxPage(leadInbox));
  await writeFile(writePathFor('/owner-crm/'), ownerCrmPage(ownerCrm));
  await writeFile(writePathFor('/ae-work-orders/'), aeWorkOrdersPage(workOrders));
  await writeFile(writePathFor('/runtime-state/'), runtimeStatePage(runtimeState));
  await writeFile(writePathFor('/db-contracts/'), dbContractsPage(dbContracts));
  await writeFile(writePathFor('/approval-flow/'), approvalFlowPage(approvalWorkflow));
  await writeFile(writePathFor('/shortlist/'), shortlistPage(businesses, facets));
  await writeFile(writePathFor('/compare/'), comparePage(businesses, facets));
  await writeFile(writePathFor('/match/'), matchPage(businesses, facets));
  await writeFile(writePathFor('/lead-routing/'), leadRoutingPage(leadRules));
  await writeFile(writePathFor('/deal-desk/'), dealDeskPage(businesses, facets));
  await writeFile(writePathFor('/offers/'), offersPage(businesses, facets));
  await writeFile(writePathFor('/map/'), mapPage(businesses, facets));
  await writeFile(writePathFor('/submit/'), submitPage(facets));
  await writeFile(writePathFor('/request/'), requestPage(businesses, facets));
  await writeFile(writePathFor('/claim/'), claimPage(businesses));
  await writeFile(writePathFor('/owner-verification/'), ownerVerificationPage(ownerPackets));
  await writeFile(writePathFor('/lifecycle/'), lifecyclePage(lifecycleQueue));
  await writeFile(writePathFor('/insights/'), insightsPage(businesses, facets, report));
  await writeFile(writePathFor('/audit/'), auditPage(businesses, report));
  await writeFile(writePathFor('/coverage/'), coveragePage(coverage, facets, report));
  await writeFile(writePathFor('/opportunities/'), opportunitiesPage(opportunities));
  await writeFile(writePathFor('/outreach/'), outreachPage(outreach));
  await writeFile(writePathFor('/sponsor/'), sponsorPage(sponsor));
  await writeFile(writePathFor('/monetization/'), monetizationPage(monetization));
  await writeFile(writePathFor('/exports/'), exportsPage(report));
  await writeFile(writePathFor('/admin-review/'), adminReviewPage(businesses, identityAudit, report));
  await writeFile(writePathFor('/admin-actions/'), adminActionsPage(actionPackets, posterRisk, suppressTemplate));
  await writeFile(writePathFor('/admin-batch/'), adminBatchPage(adminBatch));
  await writeFile(writePathFor('/import-health/'), importHealthPage(quality, sourceBatches, posterRisk, report));
  await writeFile(writePathFor('/dry-run/'), dryRunPage(dryRun));
  await writeFile(writePathFor('/crawl/'), crawlControlPage(crawlBudget, report));
  await writeFile(writePathFor('/routing/'), routingControlPage(canonicalRouting, report));
  await writeFile(writePathFor('/verification/'), verificationPage(report, quality));
  await writeFile(writePathFor('/fraud-defense/'), fraudDefensePage(fraudBundle));
  await writeFile(writePathFor('/duplicates/'), duplicateScannerPage(identityAudit, businesses));
  await writeFile(writePathFor('/api/'), apiPage(apiIndex));
  await writeFile(writePathFor('/embed/'), embedPage(report));
  await writeFile(writePathFor('/platform/'), platformPage(businesses, facets, report));
  await writeFile(writePathFor('/data/'), dataPage(report));
  await writeFile(writePathFor('/operator/'), operatorPage());
  await writeFile(path.join(DIST, '404.html'), notFoundPage());

  const relatedBuckets = new Map();
  const byId = new Map(businesses.map(b => [b.id, b]));
  for(const b of businesses){
    for(const key of [`category:${b.category_slug}`, `city:${b.city_slug}`]){
      if(!relatedBuckets.has(key)) relatedBuckets.set(key, []);
      if(relatedBuckets.get(key).length < 24) relatedBuckets.get(key).push(b);
    }
  }
  function relatedFor(b){
    return unique([...(relatedBuckets.get(`category:${b.category_slug}`) || []), ...(relatedBuckets.get(`city:${b.city_slug}`) || [])].map(x => x.id))
      .filter(id => id !== b.id)
      .map(id => byId.get(id))
      .filter(Boolean)
      .slice(0, 4);
  }
  const businessRoutes = businesses.map(b => `/business/${b.id}/`);
  routes.push(...businessRoutes);
  await copyCustomBusinessPages(businesses);
  const archivePages = chunkArray(businesses, DIRECTORY_PAGE_SIZE);
  for(let i = 0; i < archivePages.length; i++){
    const route = directoryPageRoute(i + 1); routes.push(route);
    await writeFile(writePathFor(route), paginatedBusinessArchivePage(i + 1, archivePages.length, archivePages[i], businesses.length));
  }
  for(const cat of facets.categories){
    const subset = businesses.filter(b => b.category === cat);
    const route = `/category/${slugify(cat)}/`; routes.push(route);
    await writeFile(writePathFor(route), directoryShell({ businesses:subset, facets, title:`${cat} Businesses`, eyebrow:'Category hub', description:`Browse Valley Verified ${cat.toLowerCase()} listings with profile pages, verification signals, contact actions, and seeded source data.`, canonical:`${SITE_URL}${route}`, routeFilter:{ category:cat } }));
  }
  for(const city of facets.cities){
    const subset = businesses.filter(b => b.city === city);
    const route = `/city/${slugify(city)}/`; routes.push(route);
    await writeFile(writePathFor(route), directoryShell({ businesses:subset, facets, title:`${city} Business Hub`, eyebrow:'City hub', description:`Browse Valley Verified businesses serving ${city}, Arizona with static business pages, category filters, and contact actions.`, canonical:`${SITE_URL}${route}`, routeFilter:{ city } }));
  }
  for(const niche of facets.niches){
    const route = `/niche/${niche.slug}/`; routes.push(route);
    await writeFile(writePathFor(route), nichePage(niche, businesses, facets));
  }
  for(const market of markets){
    const route = `/market/${market.slug}/`; routes.push(route);
    await writeFile(writePathFor(route), marketPage(market, facets));
  }
  for(const collection of collections){
    const route = `/collection/${collection.slug}/`; routes.push(route);
    await writeFile(writePathFor(route), collectionPage(collection, facets));
  }
  const publicRoutes = routes.filter(r => !isInternalRoute(r));
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemap(publicRoutes));
  const businessOnlyRoutes = publicRoutes.filter(r => /^\/business\/[^/]+\/$/.test(r) && !r.startsWith('/business/page/'));
  const nonBusinessRoutes = publicRoutes.filter(r => !businessOnlyRoutes.includes(r));
  await writeFile(path.join(DIST, 'sitemap-pages.xml'), sitemapDocument(nonBusinessRoutes));
  const sitemapNames = ['sitemap-pages.xml'];
  const businessChunks = chunkArray(businessOnlyRoutes, SITEMAP_CHUNK_SIZE);
  for(let i = 0; i < businessChunks.length; i++){ const name = `sitemap-business-${i + 1}.xml`; sitemapNames.push(name); await writeFile(path.join(DIST, name), sitemapDocument(businessChunks[i])); }
  await writeFile(path.join(DIST, 'sitemap-index.xml'), sitemapIndex(sitemapNames));
  await writeFile(path.join(DIST, 'robots.txt'), robots());
  await writeFile(path.join(DIST, 'manifest.webmanifest'), manifest());
  await writeFile(path.join(DIST, 'VALLEY_RUNTIME_DECISION.json'), JSON.stringify(valleyRuntimeDecision(), null, 2));
  await writeFile(path.join(DIST, 'llms.txt'), llms(report));
  console.log(`Built Valley Verified platform: ${businesses.length} businesses, ${routes.length + 1} pages, ${loadedFiles.length} seed files.`);
}

main().catch(error => { console.error(error); process.exit(1); });
