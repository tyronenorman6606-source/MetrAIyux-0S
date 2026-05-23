import fs from 'node:fs/promises';
import path from 'node:path';
import { listContracts } from './contracts.mjs';

export class FileActionStore {
  constructor(root = process.env.PHX_ACTION_STORE_DIR || path.join(process.cwd(), '.phx-actions')){
    this.root = root;
  }
  async ensureQueue(queue){
    await fs.mkdir(path.join(this.root, queue), { recursive:true });
  }
  async put(envelope){
    await this.ensureQueue(envelope.queue);
    const file = path.join(this.root, envelope.queue, `${envelope.action_id}.json`);
    try{
      await fs.writeFile(file, JSON.stringify(envelope, null, 2), { flag:'wx' });
      return { stored:true, duplicate:false, path:file, envelope };
    }catch(error){
      if(error.code === 'EEXIST'){
        const existing = JSON.parse(await fs.readFile(file, 'utf8'));
        return { stored:false, duplicate:true, path:file, envelope:existing };
      }
      throw error;
    }
  }
  async list(queue){
    await this.ensureQueue(queue);
    const files = await fs.readdir(path.join(this.root, queue)).catch(() => []);
    const rows = [];
    for(const file of files.filter(f => f.endsWith('.json')).sort()){
      rows.push(JSON.parse(await fs.readFile(path.join(this.root, queue, file), 'utf8')));
    }
    return rows;
  }
  async listQueues(){
    await fs.mkdir(this.root, { recursive:true });
    const existing = await fs.readdir(this.root, { withFileTypes:true }).catch(() => []);
    const discovered = existing.filter(entry => entry.isDirectory()).map(entry => entry.name);
    const contractQueues = listContracts().map(contract => contract.queue);
    return Array.from(new Set([...contractQueues, ...discovered])).sort();
  }
  async listAll(){
    const rows = [];
    for(const queue of await this.listQueues()) rows.push(...await this.list(queue));
    return rows.sort((a,b)=>String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.action_id).localeCompare(String(b.action_id)));
  }
  async findById(action_id){
    for(const action of await this.listAll()) if(action.action_id === action_id) return action;
    return null;
  }
}


export class MemoryActionStore {
  constructor(){ this.records = new Map(); }
  async put(envelope){
    const key = `${envelope.queue}/${envelope.action_id}`;
    if(this.records.has(key)) return { stored:false, duplicate:true, path:key, envelope:this.records.get(key) };
    this.records.set(key, envelope);
    return { stored:true, duplicate:false, path:key, envelope };
  }
  async list(queue){
    return Array.from(this.records.values()).filter(x => x.queue === queue);
  }
  async listQueues(){
    return Array.from(new Set([...listContracts().map(contract => contract.queue), ...Array.from(this.records.values()).map(action => action.queue)])).sort();
  }
  async listAll(){
    return Array.from(this.records.values()).sort((a,b)=>String(a.created_at || '').localeCompare(String(b.created_at || '')) || String(a.action_id).localeCompare(String(b.action_id)));
  }
  async findById(action_id){
    return Array.from(this.records.values()).find(action => action.action_id === action_id) || null;
  }
}

