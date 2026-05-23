import { filterTenantRecords } from '../runtime/tenant-scope.mjs';
export const name='reminders.routes'; export const area='reminders'; export const owns=['reminders','compliance reminders']; export const routes=['GET /api/v17/reminders'];
export async function handle(ctx){ const { method,url,sendJSON,loadReminders,session }=ctx; if(method==='GET' && url.pathname==='/api/v17/reminders'){ const rows=filterTenantRecords(session, await loadReminders()); return sendJSON(200,{ok:true,count:rows.length,items:rows.slice(0,250)}); } return {handled:false}; }
