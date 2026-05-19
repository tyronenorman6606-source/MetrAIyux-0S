export function normalizeClaims(raw){
  if (!raw || typeof raw !== 'object') return {roles:['viewer']};
  const roles = Array.isArray(raw.roles) ? raw.roles.map(String) : [];
  return {...raw, roles: roles.length ? roles : ['viewer']};
}

export function canRun(claims){
  const roles = new Set(normalizeClaims(claims).roles);
  return roles.has('owner') || roles.has('admin') || roles.has('operator');
}

export function enforcePolicy({manifest, workflow, input, claims, approvals={}, liveReplay=false}){
  const blocks = [];
  const warnings = [];
  if (!canRun(claims)) blocks.push({code:'role_blocked', message:'Upstream claims do not include owner/admin/operator.'});
  const rules = Array.isArray(manifest?.policyRules) ? manifest.policyRules.filter(r => r && r.enabled !== false) : [];
  const amount = Number(input?.amountCents ?? input?.amount ?? 0);
  for (const rule of rules){
    const scope = String(rule.scope || '');
    const action = String(rule.action || '');
    const limit = rule.limit;
    if (scope === 'payments' && /refund|charge|over_500/.test(action)){
      const dollarLimit = Number(limit) || 500;
      if (amount > dollarLimit * 100 && !approvals[rule.id]){
        blocks.push({code:'approval_required', ruleId:rule.id, message:`Payment amount requires approval over $${dollarLimit}.`});
      }
    }
    if (scope === 'database' && /destructive|write/.test(action)){
      const sql = String(input?.sql || '').trim().toLowerCase();
      if (/\b(delete|drop|truncate|alter|update|insert)\b/.test(sql) && !approvals[rule.id]){
        blocks.push({code:'db_write_blocked', ruleId:rule.id, message:'Destructive or write SQL requires approval.'});
      }
    }
    if (scope === 'webhooks' && liveReplay && !approvals[rule.id]){
      blocks.push({code:'webhook_live_replay_blocked', ruleId:rule.id, message:'Live webhook replay requires approval.'});
    }
    if (scope === 'ai' && /tokens/.test(action)){
      const max = Number(limit) || 1200;
      const requested = Number(input?.maxTokens || input?.max_tokens || 0);
      if (requested > max) warnings.push({code:'ai_tokens_capped', ruleId:rule.id, message:`AI tokens capped to ${max}.`, cap:max});
    }
  }
  return {ok: blocks.length === 0, blocks, warnings, workflowId:workflow?.id || workflow?.templateId || null};
}
