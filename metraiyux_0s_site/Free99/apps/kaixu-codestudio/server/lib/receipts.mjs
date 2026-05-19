import { promises as fs } from 'node:fs';
import path from 'node:path';
import { id, nowISO, redact } from './ids.mjs';

export class ReceiptStore {
  constructor(dir){
    this.dir = dir || './receipts';
    this.items = [];
  }
  async init(){
    await fs.mkdir(this.dir, {recursive:true});
    return this;
  }
  async write(type, payload){
    const receipt = {
      id: id('rcpt'),
      type,
      ts: nowISO(),
      ...redact(payload || {}),
    };
    this.items.unshift(receipt);
    if (this.items.length > 500) this.items.length = 500;
    const file = path.join(this.dir, `${receipt.id}.json`);
    await fs.writeFile(file, JSON.stringify(receipt, null, 2));
    return receipt;
  }
  list(limit=100){ return this.items.slice(0, Number(limit) || 100); }
}
