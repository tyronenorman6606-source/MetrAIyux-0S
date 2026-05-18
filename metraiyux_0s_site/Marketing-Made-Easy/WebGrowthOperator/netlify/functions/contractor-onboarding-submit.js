const { google } = require('googleapis');
const Busboy = require('busboy');
const crypto = require('crypto');
const { Readable } = require('stream');

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_UPLOAD = 30 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const ALLOWED_EXT = new Set(['.pdf','.png','.jpg','.jpeg','.docx']);
const REQUIRED_FIELDS = ['legal_name','email','phone','typed_signature','signature_date','accept_ic_agreement','accept_commission_plan','accept_confidentiality','accept_no_guarantees','payment_method','payment_display_name'];

function json(statusCode, payload){
  return { statusCode, headers: {'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify(payload) };
}
function sanitize(name){ return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,140); }
function ext(name){ const m=String(name||'').toLowerCase().match(/\.[a-z0-9]+$/); return m ? m[0] : ''; }
function streamBuffer(buf){ return Readable.from(buf); }
function escapeHtml(value){ return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function field(value, max=500){ return String(value || '').trim().slice(0,max); }
function validEmail(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim()); }
function validateFile(f){
  if(!ALLOWED_MIME.has(f.mimeType)) return `File type not allowed for ${f.filename}. Allowed: PDF, PNG, JPG, DOCX.`;
  if(!ALLOWED_EXT.has(ext(f.filename))) return `File extension not allowed for ${f.filename}.`;
  if(f.buffer.length > MAX_FILE_SIZE) return `${f.filename} exceeds the 8MB per-file limit.`;
  return '';
}
function encryptObject(obj){
  const raw = process.env.CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64;
  if(!raw) throw new Error('Missing CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64.');
  const key = Buffer.from(raw, 'base64');
  if(key.length !== 32) throw new Error('CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64 must decode to 32 bytes.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj, null, 2));
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { algorithm:'aes-256-gcm', iv:iv.toString('base64'), tag:tag.toString('base64'), ciphertext:encrypted.toString('base64') };
}
function parseMultipart(event){
  return new Promise((resolve,reject)=>{
    const headers = {}; Object.keys(event.headers || {}).forEach(k => headers[k.toLowerCase()] = event.headers[k]);
    const contentType = headers['content-type'];
    if(!contentType) return reject(new Error('Missing multipart content-type.'));
    const bb = Busboy({ headers: { 'content-type': contentType }, limits:{ fileSize: MAX_FILE_SIZE, files: 8, fields: 170, fieldSize: 6000 } });
    const fields = {}; const files = [];
    let totalBytes = 0; let rejected = '';
    bb.on('field', (name, val) => { fields[name] = field(val, 6000); });
    bb.on('file', (name, file, info) => {
      const chunks = []; const filename = sanitize(info.filename || name); const mimeType = info.mimeType || 'application/octet-stream';
      file.on('data', d => { totalBytes += d.length; if(totalBytes > MAX_TOTAL_UPLOAD) rejected = 'Total upload exceeds 30MB limit.'; chunks.push(d); });
      file.on('limit', () => { rejected = 'Uploaded file too large.'; });
      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if(buffer.length) files.push({ field:name, filename, mimeType, buffer });
      });
    });
    bb.on('error', reject);
    bb.on('finish', () => rejected ? reject(new Error(rejected)) : resolve({fields, files}));
    bb.end(Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8'));
  });
}
async function driveClient(){
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if(!email || !privateKey || !process.env.GOOGLE_DRIVE_FOLDER_ID) throw new Error('Google Drive environment variables are not configured.');
  const auth = new google.auth.JWT(email, null, privateKey, ['https://www.googleapis.com/auth/drive.file']);
  await auth.authorize();
  return google.drive({ version:'v3', auth });
}
async function upload(drive, folderId, name, mimeType, buffer){
  const created = await drive.files.create({ requestBody:{ name, parents:[folderId], mimeType }, media:{ mimeType, body: streamBuffer(buffer) }, fields:'id,name,webViewLink' });
  return created.data;
}
async function findDuplicate(drive, parentId, fingerprint){
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name contains '${fingerprint}' and trashed=false`;
  const res = await drive.files.list({ q, fields:'files(id,name,webViewLink)', pageSize:5 });
  return (res.data.files || [])[0] || null;
}
async function sendAdminNotification(summary, folderLink){
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || 'Skyes Over London <onboarding@solenterprises.org>';
  if(!to || !apiKey) return {sent:false, reason:'ADMIN_NOTIFICATION_EMAIL or RESEND_API_KEY not configured'};
  const subject = `New AE contractor packet: ${summary.legal_name}`;
  const html = `<h1>New AE contractor packet saved</h1><p><strong>Name:</strong> ${escapeHtml(summary.legal_name)}</p><p><strong>Email:</strong> ${escapeHtml(summary.email)}</p><p><strong>Submission:</strong> ${escapeHtml(summary.submissionId)}</p><p><strong>Drive:</strong> <a href="${escapeHtml(folderLink)}">Open packet folder</a></p>`;
  const res = await fetch('https://api.resend.com/emails', { method:'POST', headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'}, body:JSON.stringify({from,to,subject,html}) });
  return {sent:res.ok, status:res.status};
}
exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return json(405, {error:'Method not allowed.'});
  try{
    const {fields, files} = await parseMultipart(event);
    if(fields._honey) return json(400, {error:'Spam check failed.'});
    const started = Number(fields.form_started_at || 0);
    if(started && Date.now() - started < 3500) return json(400, {error:'Submission was too fast. Please review the packet and submit again.'});
    const missing = REQUIRED_FIELDS.filter(k => !fields[k]);
    if(missing.length) return json(400, {error:'Missing required fields: '+missing.join(', ')});
    if(!validEmail(fields.email)) return json(400, {error:'Valid email is required.'});
    if(field(fields.typed_signature).toLowerCase() !== field(fields.legal_name).toLowerCase()) return json(400, {error:'Typed signature must match legal name.'});
    const w9 = files.find(f => f.field === 'w9_file');
    if(!w9) return json(400, {error:'Completed W-9 upload is required.'});
    const fileError = files.map(validateFile).find(Boolean);
    if(fileError) return json(400, {error:fileError});
    const drive = await driveClient();
    const fingerprint = crypto.createHash('sha256').update(field(fields.email).toLowerCase()+'|'+field(fields.legal_name).toLowerCase()).digest('hex').slice(0,12);
    const duplicate = await findDuplicate(drive, process.env.GOOGLE_DRIVE_FOLDER_ID, fingerprint);
    if(duplicate && !fields.allow_duplicate_submission) return json(409, {error:'A contractor packet with this name/email already appears to exist. Ask admin to review or enable duplicate submission intentionally.', existingFolderLink:duplicate.webViewLink});
    const submissionId = 'ae-' + new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14) + '-' + crypto.randomBytes(4).toString('hex');
    const folderName = `${submissionId}-${fingerprint}-${sanitize(fields.legal_name).slice(0,60)}`;
    const folder = await drive.files.create({ requestBody:{ name:folderName, mimeType:'application/vnd.google-apps.folder', parents:[process.env.GOOGLE_DRIVE_FOLDER_ID] }, fields:'id,name,webViewLink' });
    const folderId = folder.data.id;
    const sensitiveKeys = ['bank_account_type','bank_name','bank_routing','bank_account','stripe_account','paypal_email','cashapp_tag','backup_payment_method','payment_display_name','address_line_1','city_state_zip','phone'];
    const sensitive = {}; sensitiveKeys.forEach(k => { if(fields[k]) sensitive[k]=field(fields[k], 1000); });
    const summary = {...fields, submissionId, fingerprint, submittedAt:new Date().toISOString(), userAgent:(event.headers||{})['user-agent'] || '', sourceIp:(event.headers||{})['x-nf-client-connection-ip'] || (event.headers||{})['client-ip'] || '', validation:{allowedFileTypes:Array.from(ALLOWED_EXT), maxFileSizeBytes:MAX_FILE_SIZE, maxTotalUploadBytes:MAX_TOTAL_UPLOAD}};
    sensitiveKeys.forEach(k => { if(summary[k]) summary[k] = '[stored in encrypted payment profile]'; });
    const acceptanceHtml = `<!doctype html><meta charset="utf-8"><title>AE Contractor Acceptance ${escapeHtml(submissionId)}</title><h1>Skyes Over London LC Contractor Packet Acceptance</h1><p><strong>Submission:</strong> ${escapeHtml(submissionId)}</p><p><strong>Name:</strong> ${escapeHtml(fields.legal_name)}</p><p><strong>Email:</strong> ${escapeHtml(fields.email)}</p><p><strong>Role:</strong> ${escapeHtml(fields.role_lane || '')}</p><p><strong>Typed signature:</strong> ${escapeHtml(fields.typed_signature)}</p><p><strong>Signature date:</strong> ${escapeHtml(fields.signature_date)}</p><p><strong>Accepted IC Agreement:</strong> ${!!fields.accept_ic_agreement}</p><p><strong>Accepted Commission Plan:</strong> ${!!fields.accept_commission_plan}</p><p><strong>Accepted Confidentiality:</strong> ${!!fields.accept_confidentiality}</p><p><strong>Accepted No-Guarantee Rule:</strong> ${!!fields.accept_no_guarantees}</p><p><strong>Submitted at:</strong> ${escapeHtml(summary.submittedAt)}</p>`;
    await upload(drive, folderId, 'contractor-onboarding-summary.json', 'application/json', Buffer.from(JSON.stringify(summary, null, 2)));
    await upload(drive, folderId, 'contractor-payment-profile.encrypted.json', 'application/json', Buffer.from(JSON.stringify(encryptObject({submissionId, legal_name:fields.legal_name, email:fields.email, sensitive}), null, 2)));
    await upload(drive, folderId, 'contractor-agreement-acceptance.html', 'text/html', Buffer.from(acceptanceHtml));
    for(const f of files){ await upload(drive, folderId, sanitize(f.field + '-' + f.filename), f.mimeType, f.buffer); }
    const notification = await sendAdminNotification(summary, folder.data.webViewLink);
    return json(200, {ok:true, submissionId, driveFolderId:folderId, driveFolderLink:folder.data.webViewLink, adminNotification:notification});
  }catch(err){ return json(500, {error: err.message || 'Server error while saving contractor packet.'}); }
};
