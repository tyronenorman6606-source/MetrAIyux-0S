import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { assertConfiguredProvider, isProduction } from './config.mjs';

export async function storeArtifact({ rootDir, bytes, contentType='application/octet-stream', filename='artifact.bin', metadata={} }){
  const key = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
  if(process.env.R2_BUCKET && process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY){
    // This project deliberately avoids fake storage success. Wire an S3-compatible client in production dependency layer.
    return { ok:false, provider:'r2-configured-needs-client', key, contentType, metadata, message:'R2 env is configured. Install/wire an S3-compatible client before live storage writes.' };
  }
  if(isProduction()) assertConfiguredProvider(['R2_BUCKET','R2_ENDPOINT','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'], 'Object storage');
  const dir = path.join(rootDir, 'runtime', 'local-object-store', path.dirname(key));
  await mkdir(dir, { recursive:true });
  const file = path.join(rootDir, 'runtime', 'local-object-store', key);
  await writeFile(file, bytes);
  await writeFile(`${file}.metadata.json`, JSON.stringify({ contentType, filename, metadata, key, createdAt:new Date().toISOString() }, null, 2));
  return { ok:true, provider:'local-dev-object-store', key, contentType, filename, metadata };
}
