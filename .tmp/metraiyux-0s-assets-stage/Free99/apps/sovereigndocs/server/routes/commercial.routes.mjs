import { filterTenantRecords } from '../runtime/tenant-scope.mjs';
export const name='commercial.routes'; export const area='commercial'; export const owns=['orders','commercial workflows']; export const routes=['GET /api/v17/commercial/orders'];
export async function handle(ctx){ const { method,url,sendJSON,loadCustomerOrders,session }=ctx; if(method==='GET' && url.pathname==='/api/v17/commercial/orders'){ const rows=filterTenantRecords(session, await loadCustomerOrders()); return sendJSON(200,{ok:true,count:rows.length,items:rows.slice(0,250)}); } return {handled:false}; }
