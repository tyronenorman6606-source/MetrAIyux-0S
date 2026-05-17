export const DB_ADAPTER_VERSION = '22.0.0';

export class PlatformDbAdapter {
  async putAction(){ throw new Error('putAction not implemented'); }
  async getAction(){ throw new Error('getAction not implemented'); }
  async listActions(){ throw new Error('listActions not implemented'); }
  async putState(){ throw new Error('putState not implemented'); }
  async getState(){ throw new Error('getState not implemented'); }
  async appendEvent(){ throw new Error('appendEvent not implemented'); }
}

export const PLATFORM_TABLES = [
  {
    table:'phx_actions',
    purpose:'Immutable action envelopes from upstream-auth intake.',
    columns:['action_id primary key','action_type','queue','status','actor_id','actor_email','payload_json','created_at','updated_at']
  },
  {
    table:'phx_action_events',
    purpose:'Append-only decision/projection/history events.',
    columns:['event_id primary key','action_id','event_type','decision','reviewer','event_json','created_at']
  },
  {
    table:'phx_listing_state',
    purpose:'Mutable operational state by canonical business_id; never replaces seed truth without approval.',
    columns:['business_id primary key','claim_status','verification_status','ae_stage','suppression_status','state_json','updated_at']
  },
  {
    table:'phx_leads',
    purpose:'Buyer request lifecycle routed against seeded city/category lanes.',
    columns:['lead_id primary key','lead_status','city','category','buyer_contact_hash','assigned_to','payload_json','created_at','updated_at']
  },
  {
    table:'phx_owner_contacts',
    purpose:'AE/admin owner contact attempts and follow-ups.',
    columns:['contact_id primary key','business_id','channel','outcome','next_action','due_date','notes','created_at']
  },
  {
    table:'phx_suppression_drafts',
    purpose:'Approved removal/duplicate/abuse candidates before seed suppressions are committed.',
    columns:['business_id primary key','reason','evidence_json','status','reviewer','created_at','updated_at']
  }
];

export function platformD1Schema(){
  return `-- PHX Verified v18 runtime state schema for Cloudflare D1 / SQLite\nCREATE TABLE IF NOT EXISTS phx_actions (\n  action_id TEXT PRIMARY KEY,\n  action_type TEXT NOT NULL,\n  queue TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'queued_for_review',\n  actor_id TEXT,\n  actor_email TEXT,\n  payload_json TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\nCREATE INDEX IF NOT EXISTS idx_phx_actions_queue_status ON phx_actions(queue, status);\nCREATE INDEX IF NOT EXISTS idx_phx_actions_type_created ON phx_actions(action_type, created_at);\nCREATE TABLE IF NOT EXISTS phx_action_events (\n  event_id TEXT PRIMARY KEY,\n  action_id TEXT NOT NULL,\n  event_type TEXT NOT NULL,\n  decision TEXT,\n  reviewer TEXT,\n  event_json TEXT NOT NULL,\n  created_at TEXT NOT NULL\n);\nCREATE INDEX IF NOT EXISTS idx_phx_action_events_action ON phx_action_events(action_id, created_at);\nCREATE TABLE IF NOT EXISTS phx_listing_state (\n  business_id TEXT PRIMARY KEY,\n  claim_status TEXT,\n  verification_status TEXT,\n  ae_stage TEXT,\n  suppression_status TEXT,\n  state_json TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\nCREATE INDEX IF NOT EXISTS idx_phx_listing_state_claim ON phx_listing_state(claim_status);\nCREATE INDEX IF NOT EXISTS idx_phx_listing_state_ae ON phx_listing_state(ae_stage);\nCREATE TABLE IF NOT EXISTS phx_leads (\n  lead_id TEXT PRIMARY KEY,\n  lead_status TEXT NOT NULL,\n  city TEXT,\n  category TEXT,\n  buyer_contact_hash TEXT,\n  assigned_to TEXT,\n  payload_json TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\nCREATE INDEX IF NOT EXISTS idx_phx_leads_lane_status ON phx_leads(city, category, lead_status);\nCREATE TABLE IF NOT EXISTS phx_owner_contacts (\n  contact_id TEXT PRIMARY KEY,\n  business_id TEXT NOT NULL,\n  channel TEXT,\n  outcome TEXT,\n  next_action TEXT,\n  due_date TEXT,\n  notes TEXT,\n  created_at TEXT NOT NULL\n);\nCREATE INDEX IF NOT EXISTS idx_phx_owner_contacts_business ON phx_owner_contacts(business_id, created_at);\nCREATE TABLE IF NOT EXISTS phx_suppression_drafts (\n  business_id TEXT PRIMARY KEY,\n  reason TEXT NOT NULL,\n  evidence_json TEXT NOT NULL,\n  status TEXT NOT NULL,\n  reviewer TEXT,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n`;
}

export function neonSchema(){
  return platformD1Schema()
    .replaceAll('TEXT PRIMARY KEY', 'text PRIMARY KEY')
    .replaceAll('TEXT NOT NULL', 'text NOT NULL')
    .replaceAll('TEXT,', 'text,')
    .replaceAll('TEXT\n', 'text\n');
}

export function adapterReadinessChecklist(){
  return [
    'Map upstream auth user id/email/roles into x-upstream-* headers before phx-action receives requests.',
    'Persist every action envelope before projecting state.',
    'Use action_id as the idempotency key across retries.',
    'Append action events instead of overwriting history.',
    'Keep seed/businesses/inbox as source ingest and use runtime state only for claims, leads, notes, approvals, and suppression drafts.',
    'Only write seed/businesses/suppressions.json through an explicit admin export/commit workflow.'
  ];
}
