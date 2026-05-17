import fs from 'node:fs/promises';
import path from 'node:path';

export class BusinessIndex {
  constructor(root = process.env.PHX_DIST_DIR || path.join(process.cwd(), 'dist')){
    this.root = root;
    this.loaded = false;
    this.ids = new Set();
  }
  async load(){
    if(this.loaded) return this;
    const file = path.join(this.root, 'data', 'businesses.json');
    try{
      const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
      for(const b of parsed.businesses || []) if(b.id) this.ids.add(String(b.id));
    }catch{ /* index is optional for local contract tests */ }
    this.loaded = true;
    return this;
  }
  async has(id){ await this.load(); return this.ids.size === 0 ? true : this.ids.has(String(id)); }
  async assert(id){
    if(!id) return;
    if(!(await this.has(id))){
      const error = new Error(`Unknown business_id: ${id}`);
      error.status = 404;
      throw error;
    }
  }
}
