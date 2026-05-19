import { filterTenantRecords } from '../runtime/tenant-scope.mjs';
export const name='packets.routes'; export const area='packets'; export const owns=['packet assembly','packet records']; export const routes=['GET /api/v17/packets'];
export async function handle(ctx){ const { method,url,sendJSON,loadPacketRecords,session }=ctx; if(method==='GET' && url.pathname==='/api/v17/packets'){ const rows=filterTenantRecords(session, await loadPacketRecords()); return sendJSON(200,{ok:true,count:rows.length,items:rows.slice(0,250)}); } return {handled:false}; }
