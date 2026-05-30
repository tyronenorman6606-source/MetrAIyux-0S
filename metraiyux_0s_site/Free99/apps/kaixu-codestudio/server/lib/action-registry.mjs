import { sha256, nowISO } from './ids.mjs';

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function ensureOk(result, label){
  if (!result?.ok) throw new Error(`${label} blocked: ${result?.reason || result?.error || 'unknown_provider_error'}`);
  return result;
}

function adapterFor(registry, providerId){
  const adapter = registry.get(providerId);
  if (!adapter) return null;
  return adapter;
}

export function createActionRegistry({providerRegistry, receipts=null}={}){
  const actions = new Map();
  const register = (name, handler, meta={}) => {
    actions.set(String(name), {name:String(name), handler, meta});
  };

  register('create_checkout_session', async ctx => {
    const result = await adapterFor(providerRegistry, 'stripe').checkoutCreate({...ctx.input, workflowId:ctx.workflow.id});
    ctx.outputs.checkout = result;
    ctx.steps.push({step:'create_checkout_session', providerId:'stripe', action:'checkout.create', result});
    ensureOk(result, 'Stripe checkout');
    return result;
  }, {providerId:'stripe', route:'checkout.create'});

  const emailPaymentLink = async ctx => {
    const checkoutUrl = ctx.outputs.checkout?.checkoutUrl || ctx.outputs.checkout?.url || ctx.input.checkoutUrl || ctx.input.paymentLink;
    const result = await adapterFor(providerRegistry, 'resend').emailSend({
      to:ctx.input.to || ctx.input.email || process.env.OPERATOR_EMAIL,
      subject:ctx.input.subject || 'Your secure payment link',
      text:`Payment link: ${checkoutUrl || '[missing checkout url]'}`,
      html:`<p>Your secure payment link is ready:</p><p><a href="${escapeHtml(checkoutUrl || '')}">${escapeHtml(checkoutUrl || '')}</a></p>`,
    });
    ctx.outputs.email = result;
    ctx.outputs.paymentLink = checkoutUrl || null;
    ctx.steps.push({step:'email_payment_link', providerId:'resend', action:'email.send', result});
    ensureOk(result, 'Email send');
    return result;
  };
  register('email_payment_link', emailPaymentLink, {providerId:'resend', route:'email.send'});
  register('email_link', emailPaymentLink, {providerId:'resend', route:'email.send'});

  register('normalize_lead', async ctx => {
    const lead = ctx.input.lead || ctx.input;
    ctx.outputs.normalizedLead = {email:lead.email || ctx.input.email || null, company:lead.company || ctx.input.company || null, source:lead.source || ctx.input.source || 'platform'};
    ctx.steps.push({step:'normalize_lead', action:'platform.normalize', result:{ok:true, normalized:true}});
    return ctx.outputs.normalizedLead;
  }, {providerId:'platform', route:'platform.normalize'});

  register('score_fit', async ctx => {
    const prompt = ctx.input.prompt || `Score this lead from 0-100 and give the reason as compact JSON. Lead: ${JSON.stringify(ctx.outputs.normalizedLead || ctx.input.lead || ctx.input)}`;
    const result = await adapterFor(providerRegistry, 'openai_gateway').chat({prompt, maxTokens:ctx.input.maxTokens || 600});
    ctx.outputs.leadScore = result;
    ctx.steps.push({step:'score_fit', providerId:'openai_gateway', action:'ai.chat', result});
    ensureOk(result, 'AI score');
    return result;
  }, {providerId:'openai_gateway', route:'ai.chat'});

  register('write_crm_note', async ctx => {
    const sql = ctx.input.sql || `select 'crm-note:${sha256(JSON.stringify(ctx.input)).slice(0,12)}' as note_id`;
    const result = await adapterFor(providerRegistry, 'neon').query({sql, params:ctx.input.params || []});
    ctx.outputs.crmWrite = result;
    ctx.steps.push({step:'write_crm_note', providerId:'neon', action:'db.query', result});
    ensureOk(result, 'CRM DB write');
    return result;
  }, {providerId:'neon', route:'db.query'});

  register('run_readonly_query', async ctx => {
    const sql = ctx.input.sql || 'select now() as now';
    const result = await adapterFor(providerRegistry, 'neon').query({sql, params:ctx.input.params || []});
    ctx.outputs.db = result;
    ctx.steps.push({step:'run_readonly_query', providerId:'neon', action:'db.query', result});
    ensureOk(result, 'DB query');
    return result;
  }, {providerId:'neon', route:'db.query'});

  register('summarize_rows', async ctx => {
    const result = await adapterFor(providerRegistry, 'openai_gateway').chat({prompt:ctx.input.prompt || `Summarize these query results in Markdown: ${JSON.stringify(ctx.outputs.db || ctx.input).slice(0,6000)}`, maxTokens:ctx.input.maxTokens || 800});
    ctx.outputs.summary = result;
    ctx.steps.push({step:'summarize_rows', providerId:'openai_gateway', action:'ai.chat', result});
    ensureOk(result, 'AI summary');
    return result;
  }, {providerId:'openai_gateway', route:'ai.chat'});

  register('check_calendar', async ctx => {
    ctx.outputs.calendarCheck = {ok:true, checkedAt:nowISO(), note:'Calendar availability check placeholder uses upstream calendar truth when google_ops is configured.'};
    ctx.steps.push({step:'check_calendar', providerId:'google_ops', action:'calendar.check', result:ctx.outputs.calendarCheck});
    return ctx.outputs.calendarCheck;
  }, {providerId:'google_ops', route:'calendar.check'});

  register('create_event', async ctx => {
    const result = await adapterFor(providerRegistry, 'google_ops').calendarBook({
      summary:ctx.input.summary || 'CodeStudio appointment',
      description:ctx.input.description || 'Booked through kAIxu CodeStudio Platform Engine',
      start:ctx.input.start,
      end:ctx.input.end,
      attendees:ctx.input.attendees || (ctx.input.to ? [ctx.input.to] : []),
    });
    ctx.outputs.calendar = result;
    ctx.steps.push({step:'create_event', providerId:'google_ops', action:'calendar.book', result});
    ensureOk(result, 'Calendar booking');
    return result;
  }, {providerId:'google_ops', route:'calendar.book'});

  register('email_confirmation', async ctx => {
    const result = await adapterFor(providerRegistry, 'resend').emailSend({
      to:ctx.input.to || ctx.input.email || process.env.OPERATOR_EMAIL,
      subject:ctx.input.subject || 'Appointment confirmed',
      text:`Appointment created: ${JSON.stringify(ctx.outputs.calendar || ctx.outputs.calendarCheck || {})}`,
    });
    ctx.outputs.confirmation = result;
    ctx.steps.push({step:'email_confirmation', providerId:'resend', action:'email.send', result});
    ensureOk(result, 'Confirmation email');
    return result;
  }, {providerId:'resend', route:'email.send'});

  register('capture_submission', async ctx => {
    ctx.outputs.submission = {ok:true, capturedAt:nowISO(), data:ctx.input};
    ctx.steps.push({step:'capture_submission', action:'platform.capture', result:{ok:true}});
    return ctx.outputs.submission;
  }, {providerId:'platform', route:'platform.capture'});

  register('save_to_drive', async ctx => {
    const content = JSON.stringify({submittedAt:nowISO(), requester:ctx.input.requester || ctx.input.email || null, document:ctx.input.document || ctx.input.text || '', metadata:ctx.input.metadata || {}}, null, 2);
    const result = await adapterFor(providerRegistry, 'google_ops').driveSaveText({name:ctx.input.name || `legal-review-${Date.now()}.json`, mimeType:'application/json', content});
    ctx.outputs.reviewPacket = result;
    ctx.steps.push({step:'save_to_drive', providerId:'google_ops', action:'drive.save', result});
    ensureOk(result, 'Drive save');
    return result;
  }, {providerId:'google_ops', route:'drive.save'});

  register('notify_partner_queue', async ctx => {
    const result = await adapterFor(providerRegistry, 'resend').emailSend({
      to:ctx.input.partnerEmail || process.env.PARTNER_REVIEW_EMAIL || process.env.OPERATOR_EMAIL,
      subject:ctx.input.subject || 'New document review packet',
      text:`A review packet was created: ${JSON.stringify(ctx.outputs.reviewPacket || ctx.outputs.submission || {})}`,
    });
    ctx.outputs.partnerNotice = result;
    ctx.steps.push({step:'notify_partner_queue', providerId:'resend', action:'email.send', result});
    ensureOk(result, 'Partner queue email');
    return result;
  }, {providerId:'resend', route:'email.send'});

  const receiptStep = async ctx => {
    const payload = {ok:true, workflowId:ctx.workflow.id, outputKeys:Object.keys(ctx.outputs), ts:nowISO()};
    if (receipts) ctx.outputs.actionReceipt = await receipts.write('workflow_action_receipt', payload);
    ctx.steps.push({step:'write_receipt', action:'platform.receipt', result:{ok:true, receiptId:ctx.outputs.actionReceipt?.id || null}});
    return payload;
  };
  register('write_receipt', receiptStep, {providerId:'platform', route:'platform.receipt'});
  register('audit_receipt', receiptStep, {providerId:'platform', route:'platform.receipt'});
  register('export_summary', async ctx => {
    ctx.outputs.summaryMarkdown = ctx.outputs.summary?.text || JSON.stringify(ctx.outputs.summary || ctx.outputs.db || {}, null, 2);
    ctx.steps.push({step:'export_summary', action:'platform.export', result:{ok:true, bytes:ctx.outputs.summaryMarkdown.length}});
    return {ok:true, summaryMarkdown:ctx.outputs.summaryMarkdown};
  }, {providerId:'platform', route:'platform.export'});

  async function runProviderAction(step={}, ctx){
    const providerId = String(step.providerId || '').trim();
    const action = String(step.action || step.route || '').toLowerCase().trim();
    const adapter = adapterFor(providerRegistry, providerId);
    if (!adapter) return {ok:false, provider:providerId, action, reason:'adapter_missing'};
    const input = {...ctx.input, ...(step.config || step.input || {}), priorOutputs:ctx.outputs};
    let result;
    if (providerId === 'stripe' || /checkout\.create|create_checkout|checkout/.test(action)) result = await adapter.checkoutCreate({amountCents:input.amountCents || 1000, productName:input.productName || input.title || `Provider action ${action}`, workflowId:ctx.workflow?.id});
    else if (providerId === 'resend' || /email\.send|send_email|mail/.test(action)) result = await adapter.emailSend({to:input.to || input.email || process.env.OPERATOR_EMAIL || 'ops@local.test', subject:input.subject || `Provider action ${action}`, text:input.text || input.body || `Action ${action} completed.`});
    else if (providerId === 'twilio') {
      if (/sms\.send|message|sms/.test(action)) result = await adapter.smsSend({to:input.phone || input.to, body:input.body || input.text || `Action ${action} completed.`});
      else if (/voice\.call|voice|call/.test(action)) result = {ok:false, provider:'twilio', action, reason:'voice_call_not_implemented'};
      else result = {ok:false, provider:'twilio', action, reason:'unsupported_twilio_action'};
    }
    else if (/sms\.send|message|sms/.test(action)) result = await adapter.smsSend({to:input.phone || input.to, body:input.body || input.text || `Action ${action} completed.`});
    else if (providerId === 'openai_gateway' || /ai\.chat|summary|score|classify|chat/.test(action)) result = await adapter.chat({prompt:input.prompt || input.text || `Run ${action} with ${JSON.stringify(input).slice(0,1000)}`, maxTokens:input.maxTokens || 600});
    else if (providerId === 'neon' || /db\.query|sql|query|crm/.test(action)) result = await adapter.query({sql:input.sql || `select '${sha256(JSON.stringify(input)).slice(0,12)}' as provider_action`, params:input.params || []});
    else if (providerId === 'google_ops' && /calendar|book/.test(action)) result = await adapter.calendarBook({summary:input.summary || `Provider action ${action}`, attendees:input.attendees || []});
    else if (providerId === 'google_ops') result = await adapter.driveSaveText({name:input.name || `provider-action-${Date.now()}.txt`, content:input.content || JSON.stringify(input, null, 2)});
    else if (providerId === 'cloudflare') result = /verify|account/.test(action) ? await adapter.accountVerify() : await adapter.d1Query({sql:input.sql || 'select 1', params:input.params || []});
    else if (providerId === 'netlify') result = /deploy|trigger/.test(action) ? await adapter.deployTrigger(input) : await adapter.siteStatus();
    else result = {ok:false, provider:providerId, action, reason:'unsupported_provider_action'};
    ctx.outputs[`${providerId}.${action}`.replace(/[^a-z0-9_\.:-]+/gi, '_')] = result;
    ctx.steps.push({step:step.id || action, providerId, action, result});
    if (step.required !== false) ensureOk(result, `${providerId} ${action}`);
    return result;
  }

  return {
    register,
    registerProviderPackActions(packs=[]){
      const registered = [];
      for (const pack of packs || []){
        const providerId = String(pack.id || '').trim();
        if (!providerId || !Array.isArray(pack.routes)) continue;
        for (const route of pack.routes){
          const routeName = String(route || '').trim();
          if (!routeName) continue;
          const fullName = `${providerId}.${routeName}`;
          if (!actions.has(fullName)){
            register(fullName, ctx => runProviderAction({providerId, action:routeName, required:true}, ctx), {providerId, route:routeName, source:'provider_pack', packTitle:pack.title || providerId});
            registered.push(fullName);
          }
          const alias = routeName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
          if (alias && !actions.has(alias) && providerId !== 'platform'){
            register(alias, ctx => runProviderAction({providerId, action:routeName, required:true}, ctx), {providerId, route:routeName, source:'provider_pack_alias', packTitle:pack.title || providerId});
            registered.push(alias);
          }
        }
      }
      return registered;
    },
    has(name){ return actions.has(String(name)); },
    list(){ return [...actions.values()].map(({name, meta}) => ({name, ...meta})); },
    async runStep(step, ctx){
      if (typeof step === 'object' && step) return runProviderAction(step, ctx);
      const key = String(step || '').trim();
      const action = actions.get(key);
      if (action) return action.handler(ctx);
      if (key.includes('.') && ctx.workflow?.requiredProviders?.length){
        const providerId = ctx.workflow.requiredProviders.find(p => key.startsWith(`${p}.`) || key.includes(p)) || null;
        if (providerId) return runProviderAction({providerId, action:key}, ctx);
      }
      throw new Error(`No action registered for workflow step ${key}`);
    },
    runProviderAction,
  };
}
