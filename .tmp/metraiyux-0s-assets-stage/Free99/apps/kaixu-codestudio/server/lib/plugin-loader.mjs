import { promises as fs } from 'node:fs';
import path from 'node:path';
import { nowISO, sha256 } from './ids.mjs';

const REQUIRED_PACK_FIELDS = ['id','title','lane','routes'];

export class ProviderPackLoader {
  constructor({root=process.cwd(), dir='platform/provider-packs'}={}){
    this.root = root;
    this.dir = path.resolve(root, dir);
  }

  async listPacks(manifestProviders=[]){
    const fromManifest = (Array.isArray(manifestProviders) ? manifestProviders : []).map(pack => normalizePack(pack, 'manifest'));
    const fromFiles = await this.readFilePacks();
    const merged = new Map();
    for (const pack of [...fromManifest, ...fromFiles]) merged.set(pack.id, {...merged.get(pack.id), ...pack});
    return [...merged.values()].sort((a,b) => String(a.lane).localeCompare(String(b.lane)) || String(a.id).localeCompare(String(b.id)));
  }

  async readFilePacks(){
    await fs.mkdir(this.dir, {recursive:true});
    const entries = await fs.readdir(this.dir, {withFileTypes:true}).catch(() => []);
    const packs = [];
    for (const entry of entries){
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const file = path.join(this.dir, entry.name);
      try{
        const raw = await fs.readFile(file, 'utf8');
        const parsed = JSON.parse(raw);
        packs.push(normalizePack(parsed, `file:${path.relative(this.root, file)}`, raw));
      }catch(error){
        packs.push({id:entry.name.replace(/\.json$/,''), title:entry.name, lane:'invalid', routes:[], source:`file:${path.relative(this.root, file)}`, valid:false, errors:[error.message]});
      }
    }
    return packs;
  }
}

export function normalizePack(input={}, source='unknown', raw=null){
  const errors = [];
  for (const field of REQUIRED_PACK_FIELDS){
    if (field === 'routes'){
      if (!Array.isArray(input.routes) || input.routes.length === 0) errors.push('routes must be a non-empty array');
    }else if (!String(input[field] || '').trim()) errors.push(`${field} is required`);
  }
  const id = String(input.id || '').trim().toLowerCase().replace(/[^a-z0-9_:-]+/g, '_');
  if (!id) errors.push('id is empty after normalization');
  const pack = {
    id,
    title:String(input.title || id || 'Untitled provider pack'),
    lane:String(input.lane || 'custom'),
    description:String(input.description || ''),
    requiredSecrets:Array.isArray(input.requiredSecrets) ? input.requiredSecrets.map(String) : [],
    routes:Array.isArray(input.routes) ? input.routes.map(String) : [],
    backend:String(input.backend || ''),
    capabilities:Array.isArray(input.capabilities) ? input.capabilities.map(String) : [],
    metering:input.metering && typeof input.metering === 'object' ? input.metering : {unit:'call', defaultCostCents:0},
    policyTags:Array.isArray(input.policyTags) ? input.policyTags.map(String) : [],
    source,
    sourceHash:sha256(raw || JSON.stringify(input)).slice(0,16),
    valid:errors.length === 0,
    errors,
    loadedAt:nowISO(),
  };
  return pack;
}
