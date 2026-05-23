import { assertConfiguredProvider, isProduction } from './config.mjs';

export async function sendNotification({ to, subject, text, html, type='transactional' }){
  if(!to) throw Object.assign(new Error('Notification recipient is required.'), { status:400 });
  if(process.env.RESEND_API_KEY){
    const payload = { from: process.env.SOVEREIGNDOCS_EMAIL_FROM || 'SovereignDocs <notifications@sovereigndocs.local>', to, subject, text, html };
    // Native fetch call intentionally uses no extra dependency. Network only runs when provider key is configured.
    const res = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'content-type':'application/json' }, body:JSON.stringify(payload) });
    const body = await res.json().catch(()=>({}));
    if(!res.ok) throw Object.assign(new Error(`Resend notification failed: ${res.status}`), { status:502, providerBody:body });
    return { ok:true, provider:'resend', type, result:body };
  }
  if(isProduction()) assertConfiguredProvider(['RESEND_API_KEY','SOVEREIGNDOCS_EMAIL_FROM'], 'Email notifications');
  return { ok:true, provider:'dev-noop', type, queued:false, message:'Development notification skipped. Configure RESEND_API_KEY for real email delivery.' };
}
