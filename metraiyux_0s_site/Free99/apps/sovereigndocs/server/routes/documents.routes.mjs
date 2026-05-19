import { filterTenantRecords } from '../runtime/tenant-scope.mjs';
export const name='documents.routes'; export const area='documents'; export const owns=['documents','document lifecycle']; export const routes=['GET /api/v17/documents'];
export async function handle(ctx){ const { method,url,sendJSON,loadDocumentRecords,session }=ctx; if(method==='GET' && url.pathname==='/api/v17/documents'){ const rows=filterTenantRecords(session, await loadDocumentRecords()); return sendJSON(200,{ok:true,count:rows.length,items:rows.slice(0,250)}); } return {handled:false}; }
