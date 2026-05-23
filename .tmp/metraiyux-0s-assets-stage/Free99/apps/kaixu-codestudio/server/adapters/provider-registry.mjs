import { createSign } from 'node:crypto';
import { spawn } from 'node:child_process';
import { requestJson, formBody } from '../lib/http.mjs';
import { id, nowISO, sha256 } from '../lib/ids.mjs';

function env(name, fallback=''){ return process.env[name] || fallback; }
function isFixture(){ return String(process.env.CODESTUDIO_PROVIDER_MODE || '').toLowerCase() === 'fixture'; }
function configured(required){ return required.filter(k => !!process.env[k]); }
function missing(required){ return required.filter(k => !process.env[k]); }
function fixtureResult(provider, action, data={}){
  return {ok:true, provider, action, mode:'fixture', fixture:true, id:id(`${provider}_${action}`), ts:nowISO(), ...data};
}
function block(provider, action, reason, details={}){
  return {ok:false, provider, action, blocked:true, reason, ...details};
}

class ProviderAdapter {
  constructor(id, required=[]){ this.id = id; this.required = required; }
  probe(){
    if (isFixture()) return {ok:true, provider:this.id, mode:'fixture', configured:true, missing:[], note:'Fixture mode exercises adapter code without claiming live provider proof.'};
    const miss = missing(this.required);
    return {ok:miss.length === 0, provider:this.id, mode:'live', configured:miss.length === 0, missing:miss};
  }
  requireLive(action){
    if (isFixture()) return null;
    const miss = missing(this.required);
    if (miss.length) return block(this.id, action, 'provider_not_configured', {missing:miss});
    return null;
  }
}

class StripeAdapter extends ProviderAdapter {
  constructor(){ super('stripe', ['STRIPE_SECRET_KEY']); }
  async checkoutCreate(input={}){
    if (isFixture()) return fixtureResult('stripe', 'checkout.create', {checkoutUrl:`fixture://stripe/checkout/${id('cs')}`, amountCents:Number(input.amountCents || 1000), currency:input.currency || 'usd'});
    const blocked = this.requireLive('checkout.create');
    if (blocked) return blocked;
    const amount = Number(input.amountCents || input.amount || 1000);
    const productName = String(input.productName || input.title || 'CodeStudio Platform Service');
    const body = formBody({
      mode:'payment',
      success_url: input.successUrl || env('STRIPE_SUCCESS_URL', 'https://example.com/success'),
      cancel_url: input.cancelUrl || env('STRIPE_CANCEL_URL', 'https://example.com/cancel'),
      'line_items[0][quantity]': 1,
      'line_items[0][price_data][currency]': input.currency || 'usd',
      'line_items[0][price_data][unit_amount]': Math.max(50, Math.round(amount)),
      'line_items[0][price_data][product_data][name]': productName,
      'metadata[platform]': 'kaixu-codestudio',
      'metadata[workflow]': input.workflowId || '',
    });
    const res = await requestJson('https://api.stripe.com/v1/checkout/sessions', {
      method:'POST',
      headers:{Authorization:`Bearer ${env('STRIPE_SECRET_KEY')}`, 'Content-Type':'application/x-www-form-urlencoded'},
      body,
    });
    return {ok:true, provider:'stripe', action:'checkout.create', mode:'live', checkoutUrl:res.json.url, sessionId:res.json.id, status:res.json.status};
  }
}

class ResendAdapter extends ProviderAdapter {
  constructor(){ super('resend', ['RESEND_API_KEY']); }
  async emailSend(input={}){
    if (isFixture()) return fixtureResult('resend', 'email.send', {messageId:id('email'), to:input.to || input.email || 'fixture@example.com', subject:input.subject || 'Fixture email'});
    const blocked = this.requireLive('email.send');
    if (blocked) return blocked;
    const payload = {
      from: input.from || env('RESEND_FROM', 'ops@skyesoverlondon.com'),
      to: Array.isArray(input.to) ? input.to : [input.to || input.email],
      subject: input.subject || 'CodeStudio Platform Notification',
      html: input.html || `<p>${escapeHtml(input.text || 'CodeStudio platform message')}</p>`,
      text: input.text || undefined,
    };
    if (!payload.to[0]) return block('resend', 'email.send', 'recipient_required');
    const res = await requestJson('https://api.resend.com/emails', {
      method:'POST',
      headers:{Authorization:`Bearer ${env('RESEND_API_KEY')}`, 'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    });
    return {ok:true, provider:'resend', action:'email.send', mode:'live', messageId:res.json.id};
  }
}

class TwilioAdapter extends ProviderAdapter {
  constructor(){ super('twilio', ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM']); }
  async smsSend(input={}){
    if (isFixture()) return fixtureResult('twilio', 'sms.send', {messageSid:id('SM'), to:input.to || '+15555550123'});
    const blocked = this.requireLive('sms.send');
    if (blocked) return blocked;
    if (!input.to || !input.body) return block('twilio', 'sms.send', 'to_and_body_required');
    const auth = Buffer.from(`${env('TWILIO_ACCOUNT_SID')}:${env('TWILIO_AUTH_TOKEN')}`).toString('base64');
    const body = formBody({To:input.to, From:env('TWILIO_FROM'), Body:input.body});
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env('TWILIO_ACCOUNT_SID')}/Messages.json`;
    const res = await requestJson(url, {method:'POST', headers:{Authorization:`Basic ${auth}`, 'Content-Type':'application/x-www-form-urlencoded'}, body});
    return {ok:true, provider:'twilio', action:'sms.send', mode:'live', messageSid:res.json.sid, status:res.json.status};
  }
}

class AIGatewayAdapter extends ProviderAdapter {
  constructor(){ super('openai_gateway', []); }
  probe(){
    if (isFixture()) return {ok:true, provider:this.id, mode:'fixture', configured:true, missing:[]};
    const hasGateway = !!env('KAIXU_GATEWAY_URL') && !!env('KAIXU_GATEWAY_SUBKEY');
    const hasOpenAI = !!env('OPENAI_API_KEY');
    return {ok:hasGateway || hasOpenAI, provider:this.id, mode:'live', configured:hasGateway || hasOpenAI, missing:hasGateway || hasOpenAI ? [] : ['KAIXU_GATEWAY_URL+KAIXU_GATEWAY_SUBKEY or OPENAI_API_KEY']};
  }
  async chat(input={}){
    if (isFixture()) return fixtureResult('openai_gateway', 'ai.chat', {text:`Fixture AI summary for ${String(input.prompt || input.text || 'request').slice(0,80)}`});
    const hasGateway = !!env('KAIXU_GATEWAY_URL') && !!env('KAIXU_GATEWAY_SUBKEY');
    if (hasGateway){
      const res = await requestJson(env('KAIXU_GATEWAY_URL'), {
        method:'POST',
        headers:{Authorization:`Bearer ${env('KAIXU_GATEWAY_SUBKEY')}`, 'Content-Type':'application/json'},
        body: JSON.stringify({model:input.model || 'kaixu:smart', messages:[{role:'user', content:input.prompt || input.text || ''}], max_tokens:input.maxTokens || 800}),
      });
      return {ok:true, provider:'openai_gateway', action:'ai.chat', mode:'live', text:res.json.text || res.json.message || res.json?.choices?.[0]?.message?.content || JSON.stringify(res.json).slice(0,2000)};
    }
    if (env('OPENAI_API_KEY')){
      const res = await requestJson('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{Authorization:`Bearer ${env('OPENAI_API_KEY')}`, 'Content-Type':'application/json'},
        body: JSON.stringify({model:input.model || env('OPENAI_MODEL','gpt-4.1-mini'), messages:[{role:'user', content:input.prompt || input.text || ''}], max_tokens:input.maxTokens || 800}),
      });
      return {ok:true, provider:'openai_gateway', action:'ai.chat', mode:'live', text:res.json?.choices?.[0]?.message?.content || ''};
    }
    return block('openai_gateway', 'ai.chat', 'provider_not_configured', {missing:['KAIXU_GATEWAY_URL+KAIXU_GATEWAY_SUBKEY or OPENAI_API_KEY']});
  }
}

class NetlifyAdapter extends ProviderAdapter {
  constructor(){ super('netlify', ['NETLIFY_AUTH_TOKEN','NETLIFY_SITE_ID']); }
  async siteStatus(){
    if (isFixture()) return fixtureResult('netlify', 'site.status', {siteId:'fixture-site', state:'ready'});
    const blocked = this.requireLive('site.status');
    if (blocked) return blocked;
    const res = await requestJson(`https://api.netlify.com/api/v1/sites/${env('NETLIFY_SITE_ID')}`, {headers:{Authorization:`Bearer ${env('NETLIFY_AUTH_TOKEN')}`}});
    return {ok:true, provider:'netlify', action:'site.status', mode:'live', siteId:res.json.id, name:res.json.name, url:res.json.ssl_url || res.json.url};
  }
  async deployTrigger(input={}){
    if (isFixture()) return fixtureResult('netlify', 'deploy.trigger', {hook:'fixture'});
    if (!env('NETLIFY_BUILD_HOOK_URL')) return block('netlify','deploy.trigger','NETLIFY_BUILD_HOOK_URL_required');
    const res = await requestJson(env('NETLIFY_BUILD_HOOK_URL'), {method:'POST', body: JSON.stringify(input || {}), headers:{'Content-Type':'application/json'}});
    return {ok:true, provider:'netlify', action:'deploy.trigger', mode:'live', response:res.json || res.text};
  }
}

class CloudflareAdapter extends ProviderAdapter {
  constructor(){ super('cloudflare', ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN']); }
  async d1Query(input={}){
    if (isFixture()) return fixtureResult('cloudflare', 'd1.query', {rows:[{fixture:1}], sql:input.sql || 'select 1'});
    const blocked = this.requireLive('d1.query');
    if (blocked) return blocked;
    if (!env('CLOUDFLARE_D1_DATABASE_ID')) return block('cloudflare','d1.query','CLOUDFLARE_D1_DATABASE_ID_required');
    const url = `https://api.cloudflare.com/client/v4/accounts/${env('CLOUDFLARE_ACCOUNT_ID')}/d1/database/${env('CLOUDFLARE_D1_DATABASE_ID')}/query`;
    const res = await requestJson(url, {method:'POST', headers:{Authorization:`Bearer ${env('CLOUDFLARE_API_TOKEN')}`, 'Content-Type':'application/json'}, body:JSON.stringify({sql:input.sql || 'select 1', params:input.params || []})});
    return {ok:true, provider:'cloudflare', action:'d1.query', mode:'live', result:res.json.result};
  }
  async accountVerify(){
    if (isFixture()) return fixtureResult('cloudflare', 'account.verify', {accountId:'fixture-account'});
    const blocked = this.requireLive('account.verify');
    if (blocked) return blocked;
    const res = await requestJson(`https://api.cloudflare.com/client/v4/accounts/${env('CLOUDFLARE_ACCOUNT_ID')}`, {headers:{Authorization:`Bearer ${env('CLOUDFLARE_API_TOKEN')}`}});
    return {ok:true, provider:'cloudflare', action:'account.verify', mode:'live', accountId:res.json?.result?.id, name:res.json?.result?.name};
  }
}

class NeonAdapter extends ProviderAdapter {
  constructor(){ super('neon', []); }
  probe(){
    if (isFixture()) return {ok:true, provider:this.id, mode:'fixture', configured:true, missing:[]};
    if (env('DATABASE_URL') || env('NEON_SQL_HTTP_URL')) return {ok:true, provider:this.id, mode:'live', configured:true, missing:[]};
    return {ok:false, provider:this.id, mode:'live', configured:false, missing:['DATABASE_URL or NEON_SQL_HTTP_URL']};
  }
  async query(input={}){
    const sql = input.sql || 'select now() as now';
    if (isFixture()) return fixtureResult('neon', 'db.query', {rows:[{fixture:true, sqlHash:sha256(sql).slice(0,12)}], rowCount:1});
    if (env('NEON_SQL_HTTP_URL')){
      const res = await requestJson(env('NEON_SQL_HTTP_URL'), {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sql, params:input.params || []})});
      return {ok:true, provider:'neon', action:'db.query', mode:'live', result:res.json};
    }
    if (!env('DATABASE_URL')) return block('neon','db.query','provider_not_configured',{missing:['DATABASE_URL or NEON_SQL_HTTP_URL']});
    try{
      const {Client} = await import('pg');
      const client = new Client({connectionString:env('DATABASE_URL')});
      await client.connect();
      const result = await client.query(sql, input.params || []);
      await client.end();
      return {ok:true, provider:'neon', action:'db.query', mode:'live', rows:result.rows, rowCount:result.rowCount};
    }catch(e){
      const psql = await runPsql(sql).catch(err => ({ok:false, error:err.message}));
      if (psql.ok) return {ok:true, provider:'neon', action:'db.query', mode:'live', via:'psql', rows:psql.rows};
      return block('neon','db.query','postgres_driver_unavailable',{detail:'Install optional dependency pg or expose NEON_SQL_HTTP_URL.', error:e.message, psqlError:psql.error});
    }
  }
}

function runPsql(sql){
  return new Promise((resolve, reject) => {
    const child = spawn('psql', [env('DATABASE_URL'), '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], {stdio:['ignore','pipe','pipe']});
    let out = ''; let err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) reject(new Error(err || `psql exited ${code}`));
      else resolve({ok:true, rows:out.trim().split('\n').filter(Boolean).map(line => ({raw:line}))});
    });
  });
}

class GoogleOpsAdapter extends ProviderAdapter {
  constructor(){ super('google_ops', ['GOOGLE_SERVICE_ACCOUNT_JSON']); }
  async token(scopes){
    const raw = env('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON missing');
    const svc = JSON.parse(raw);
    const now = Math.floor(Date.now()/1000);
    const header = b64url(JSON.stringify({alg:'RS256', typ:'JWT'}));
    const claim = b64url(JSON.stringify({
      iss: svc.client_email,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }));
    const unsigned = `${header}.${claim}`;
    const sign = createSign('RSA-SHA256');
    sign.update(unsigned);
    const signature = sign.sign(svc.private_key, 'base64url');
    const body = formBody({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion:`${unsigned}.${signature}`});
    const res = await requestJson('https://oauth2.googleapis.com/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
    return res.json.access_token;
  }
  async driveSaveText(input={}){
    if (isFixture()) return fixtureResult('google_ops', 'drive.save', {fileId:id('gdrive'), name:input.name || 'fixture.txt'});
    const blocked = this.requireLive('drive.save');
    if (blocked) return blocked;
    const access = await this.token(['https://www.googleapis.com/auth/drive.file']);
    const boundary = `kaixu_${Date.now()}`;
    const metadata = {name:input.name || `codestudio-${Date.now()}.txt`, mimeType:input.mimeType || 'text/plain'};
    if (env('GOOGLE_DRIVE_FOLDER_ID')) metadata.parents = [env('GOOGLE_DRIVE_FOLDER_ID')];
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n${input.content || ''}\r\n--${boundary}--`;
    const res = await requestJson('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {method:'POST', headers:{Authorization:`Bearer ${access}`, 'Content-Type':`multipart/related; boundary=${boundary}`}, body});
    return {ok:true, provider:'google_ops', action:'drive.save', mode:'live', file:res.json};
  }
  async calendarBook(input={}){
    if (isFixture()) return fixtureResult('google_ops', 'calendar.book', {eventId:id('gcal'), summary:input.summary || 'Fixture appointment'});
    const blocked = this.requireLive('calendar.book');
    if (blocked) return blocked;
    const access = await this.token(['https://www.googleapis.com/auth/calendar.events']);
    const calendarId = encodeURIComponent(env('GOOGLE_CALENDAR_ID','primary'));
    const start = input.start || new Date(Date.now()+86400000).toISOString();
    const end = input.end || new Date(Date.parse(start)+3600000).toISOString();
    const payload = {summary:input.summary || 'CodeStudio appointment', description:input.description || '', start:{dateTime:start}, end:{dateTime:end}, attendees:(input.attendees || []).map(email => ({email}))};
    const res = await requestJson(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {method:'POST', headers:{Authorization:`Bearer ${access}`, 'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    return {ok:true, provider:'google_ops', action:'calendar.book', mode:'live', event:res.json};
  }
}

function b64url(input){ return Buffer.from(input).toString('base64url'); }
function escapeHtml(value){ return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

export function createProviderRegistry(){
  const adapters = {
    stripe: new StripeAdapter(),
    resend: new ResendAdapter(),
    twilio: new TwilioAdapter(),
    openai_gateway: new AIGatewayAdapter(),
    netlify: new NetlifyAdapter(),
    cloudflare: new CloudflareAdapter(),
    neon: new NeonAdapter(),
    google_ops: new GoogleOpsAdapter(),
  };
  return {
    get(id){ return adapters[id] || null; },
    ids(){ return Object.keys(adapters); },
    probeAll(){ return Object.fromEntries(Object.entries(adapters).map(([key, adapter]) => [key, adapter.probe()])); },
  };
}
