import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

async function readLastLine(file){
  try{
    const text = await readFile(file, 'utf8');
    const lines = text.trim().split(/\n+/).filter(Boolean);
    if(!lines.length) return null;
    return JSON.parse(lines.at(-1));
  } catch { return null; }
}

function sha256(value){ return crypto.createHash('sha256').update(value).digest('hex'); }

export async function appendAuditEvent({ ledgerFile, legacyFile, type, detail = {}, session }){
  await mkdir(path.dirname(ledgerFile), { recursive: true });
  const previous = await readLastLine(ledgerFile);
  const event = {
    id: crypto.randomUUID(),
    type,
    detail,
    at: new Date().toISOString(),
    session: session || null,
    previousHash: previous?.hash || null
  };
  event.hash = sha256(JSON.stringify({ id:event.id, type:event.type, detail:event.detail, at:event.at, session:event.session, previousHash:event.previousHash }));
  await appendFile(ledgerFile, `${JSON.stringify(event)}\n`);

  if(legacyFile){
    try{
      const rows = JSON.parse(await readFile(legacyFile, 'utf8'));
      rows.unshift(event);
      await writeFile(legacyFile, `${JSON.stringify(rows.slice(0,1000), null, 2)}\n`);
    } catch {
      await writeFile(legacyFile, `${JSON.stringify([event], null, 2)}\n`);
    }
  }
  return event;
}

export async function verifyAuditLedger(ledgerFile){
  try{
    const text = await readFile(ledgerFile, 'utf8');
    const lines = text.trim().split(/\n+/).filter(Boolean);
    let previousHash = null;
    let count = 0;
    for(const line of lines){
      const event = JSON.parse(line);
      const expected = sha256(JSON.stringify({ id:event.id, type:event.type, detail:event.detail, at:event.at, session:event.session, previousHash:event.previousHash }));
      if(event.hash !== expected) return { ok:false, count, error:`Hash mismatch at event ${event.id}` };
      if(event.previousHash !== previousHash) return { ok:false, count, error:`Previous hash mismatch at event ${event.id}` };
      previousHash = event.hash;
      count++;
    }
    return { ok:true, count, headHash:previousHash };
  } catch(error){ return { ok:true, count:0, headHash:null, note:'ledger file does not exist yet' }; }
}
