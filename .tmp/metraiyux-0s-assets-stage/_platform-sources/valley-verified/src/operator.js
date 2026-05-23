const $ = s => document.querySelector(s);

const output = $('#seedOutput');
const count = $('#operatorCount');
const downloadBtn = $('#downloadBtn');
const copyBtn = $('#copyBtn');
let normalized = [];

function text(value){ return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function bool(value){ return ['true','yes','y','1','verified','insured','mobile'].includes(text(value).toLowerCase()); }
function num(value){ const n = Number(String(value ?? '').replace(/[$,]/g, '').trim()); return Number.isFinite(n) ? n : null; }
function split(value){ return Array.isArray(value) ? value.map(text).filter(Boolean) : text(value).split(/[|;,]/).map(text).filter(Boolean); }
function slugify(value){ return text(value).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'business'; }
function url(value){ const v = text(value); if(!v) return ''; if(/^https?:\/\//i.test(v)) return v; if(/^www\./i.test(v) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`; return v; }
function phoneDigits(value){ return text(value).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); }
function domain(value){ try{ return new URL(url(value)).hostname.toLowerCase().replace(/^www\./, ''); }catch{ return ''; } }
function nameKey(value){ return slugify(text(value).toLowerCase().replace(/\b(llc|inc|co|company|corp|corporation|pllc|services|service|the|az|arizona)\b/g, ' ')); }
function identityKey(record){
  const d = domain(record.website || record.booking_url);
  const p = phoneDigits(record.phone);
  const e = text(record.email).toLowerCase();
  if(d) return `domain:${d}`;
  if(p) return `phone:${p}`;
  if(e) return `email:${e}`;
  return `name_city_zip:${slugify(`${nameKey(record.name)}-${record.city}-${record.zip || ''}`)}`;
}
function duplicatePreview(records){
  const groups = new Map();
  for(const record of records){
    const key = identityKey(record);
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record.name);
  }
  return Array.from(groups.entries()).filter(([,names]) => names.length > 1).map(([identity_key,names]) => ({ identity_key, count:names.length, names }));
}

function csvParse(csv){
  const rows = [];
  let row = [], field = '', quoted = false;
  const data = String(csv || '').replace(/^\uFEFF/, '');
  for(let i=0; i<data.length; i++){
    const ch = data[i], next = data[i+1];
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
  if(row.some(text)) rows.push(row);
  if(!rows.length) return [];
  const headers = rows.shift().map(h => slugify(h).replace(/-/g, '_'));
  return rows.filter(r => r.some(text)).map(r => Object.fromEntries(headers.map((h,i) => [h, r[i] ?? ''])));
}

function parseInput(raw){
  const trimmed = text(raw);
  if(!trimmed) return [];
  if(trimmed.startsWith('[') || trimmed.startsWith('{')){
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (Array.isArray(parsed.businesses) ? parsed.businesses : [parsed]);
  }
  return csvParse(raw);
}

function val(row, keys, fallback = ''){
  for(const key of keys){
    if(row[key] !== undefined && text(row[key]) !== '') return row[key];
  }
  return fallback;
}

function normalize(row, index){
  const name = text(val(row, ['name','business_name','company_name','company','dba','legal_name','title'], `Business ${index + 1}`));
  const city = text(val(row, ['city'], 'Phoenix'));
  const state = text(val(row, ['state','region'], 'AZ'));
  const zip = text(val(row, ['zip','zipcode','postal_code']));
  const startingPrice = num(val(row, ['starting_price','price','starting_at','from_price']));
  const lat = num(val(row, ['lat','latitude']));
  const lng = num(val(row, ['lng','lon','long','longitude']));
  const record = {
    id: slugify(val(row, ['id','slug'], `${name}-${city}-${zip}`)),
    name,
    category: text(val(row, ['category','primary_category','business_type','license_type','type'], 'Local Services')),
    subcategory: text(val(row, ['subcategory','sub_category','service_type','niche'])),
    niche: text(val(row, ['niche','service_niche','subcategory','sub_category','service_type'])),
    landing_page_url: url(val(row, ['landing_page_url','listing_url','profile_url'])),
    website: url(val(row, ['website','url','site','business_website'])),
    booking_url: url(val(row, ['booking_url','booking','book_url','appointment_url','schedule_url'])),
    phone: text(val(row, ['phone','telephone','phone_number'])),
    email: text(val(row, ['email','contact_email'])).toLowerCase(),
    address: text(val(row, ['address','street_address','service_address','formatted_address','full_address'])),
    neighborhood: text(val(row, ['neighborhood','area','district'])),
    city,
    state,
    zip,
    location: lat !== null && lng !== null ? { lat, lng } : null,
    service_area_miles: num(val(row, ['service_area_miles','radius','service_radius_miles'])),
    tags: split(val(row, ['tags','services','keywords'])),
    languages: split(val(row, ['languages','language'], 'English')),
    price_mode: text(val(row, ['price_mode','pricing_model'], startingPrice !== null ? 'STARTING_AT' : 'CONTACT_FOR_QUOTE')).toUpperCase().replace(/\s+/g, '_'),
    starting_price: startingPrice,
    price_note: text(val(row, ['price_note','pricing_note'])),
    policies: {
      fees_transparency: text(val(row, ['fees_transparency','policy_fees'])),
      cancellation: text(val(row, ['cancellation','cancellation_policy'])),
      deposit: text(val(row, ['deposit','deposit_policy']))
    },
    badges: {
      no_hidden_fees: bool(val(row, ['no_hidden_fees','fees_transparency','transparent_pricing'])),
      license_verified: bool(val(row, ['license_verified','licensed'])),
      business_verified: bool(val(row, ['business_verified','verified','is_verified'])),
      mobile: bool(val(row, ['mobile','mobile_service'])),
      insured: bool(val(row, ['insured','insurance_verified']))
    },
    media: {
      hero: url(val(row, ['hero','hero_image','image'])),
      gallery: split(val(row, ['gallery','images'])).map(url),
      instagram: url(val(row, ['instagram','ig'])),
      tiktok: url(val(row, ['tiktok','tik_tok'])),
      youtube: url(val(row, ['youtube','yt']))
    },
    description: text(val(row, ['description','summary','about','bio'])),
    source_url: url(val(row, ['source_url','source','scrape_url','listing_source'])),
    poster_email: text(val(row, ['poster_email','submitter_email','owner_email'])).toLowerCase(),
    poster_phone: text(val(row, ['poster_phone','submitter_phone','owner_phone'])),
    identity_key: '',
    featured: bool(val(row, ['featured','is_featured'])),
    last_verified: text(val(row, ['last_verified','verified_at','last_seen','updated_at'], new Date().toISOString().slice(0,10)))
  };
  record.identity_key = identityKey(record);
  return record;
}

async function readUpload(){
  const file = $('#seedFile').files?.[0];
  if(!file) return '';
  return await file.text();
}

async function normalizeSeed(){
  const fileRaw = await readUpload();
  const pasteRaw = $('#seedPaste').value;
  const raw = fileRaw || pasteRaw;
  try{
    normalized = parseInput(raw).map(normalize);
    const duplicate_preview = duplicatePreview(normalized);
    output.textContent = JSON.stringify({ updated_at: new Date().toISOString().slice(0,10), duplicate_preview, businesses: normalized }, null, 2);
    count.textContent = duplicate_preview.length ? `${normalized.length} ready • ${duplicate_preview.length} collision(s)` : `${normalized.length} ready`;
    downloadBtn.disabled = normalized.length === 0;
    copyBtn.disabled = normalized.length === 0;
  }catch(error){
    output.textContent = `Import failed: ${error.message}`;
    count.textContent = '0 ready';
    downloadBtn.disabled = true;
    copyBtn.disabled = true;
  }
}

function downloadSeed(){
  const filename = text($('#seedName').value) || 'phx-scrape-batch.json';
  const blob = new Blob([output.textContent], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

async function copySeed(){
  await navigator.clipboard?.writeText(output.textContent);
  count.textContent = `${normalized.length} copied`;
}

$('#normalizeBtn')?.addEventListener('click', normalizeSeed);
downloadBtn?.addEventListener('click', downloadSeed);
copyBtn?.addEventListener('click', copySeed);

// Lightweight animated background, intentionally dependency-free.
const canvas = $('#sky');
if(canvas){
  const ctx = canvas.getContext('2d');
  let stars = [], w = 0, h = 0, tick = 0;
  function resize(){
    w = canvas.width = innerWidth * devicePixelRatio;
    h = canvas.height = innerHeight * devicePixelRatio;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    stars = Array.from({ length: 100 }, () => ({ x: Math.random()*w, y: Math.random()*h, r: Math.random()*1.7+.4, a: Math.random()*.5+.15 }));
  }
  function frame(){
    tick += .01;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = 'rgba(247,201,72,.35)';
    for(const s of stars){ ctx.globalAlpha = s.a + Math.sin(tick + s.x)*.08; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  addEventListener('resize', resize, { passive: true });
  resize(); frame();
}
