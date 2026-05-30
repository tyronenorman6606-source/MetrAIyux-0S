PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  email TEXT,
  channels_json TEXT NOT NULL DEFAULT '["inbox"]',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','off')),
  digest_frequency TEXT NOT NULL DEFAULT 'instant' CHECK(digest_frequency IN ('off','instant','daily','weekly')),
  important_messages_enabled INTEGER NOT NULL DEFAULT 1 CHECK(important_messages_enabled IN (0,1)),
  paid_handoff_enabled INTEGER NOT NULL DEFAULT 1 CHECK(paid_handoff_enabled IN (0,1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(workspace_id, user_key)
);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_workspace ON user_notification_preferences(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_email ON user_notification_preferences(email);

CREATE TABLE IF NOT EXISTS notification_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  request_id TEXT REFERENCES connectlog_contact_requests(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info','low','medium','high')),
  recipient_key TEXT,
  recipient_email TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK(delivery_status IN ('queued','skipped','sent','failed','provider_required')),
  provider TEXT NOT NULL DEFAULT 'skyemail_or_resend_provider_gated',
  subject TEXT,
  body TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  delivered_at TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_notification_events_workspace_created ON notification_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_workspace_status ON notification_events(workspace_id, delivery_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_recipient_created ON notification_events(workspace_id, recipient_key, created_at DESC);

CREATE TABLE IF NOT EXISTS paid_event_handoffs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  offer_id TEXT,
  deliverable_type TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_provider TEXT,
  payment_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK(payment_status IN ('paid','pending','failed','refunded','manual_review')),
  immediate_artifact_json TEXT NOT NULL DEFAULT '{}',
  full_build_status TEXT NOT NULL DEFAULT 'queued_for_owner' CHECK(full_build_status IN ('queued_for_owner','in_progress','completed','cancelled')),
  assigned_to TEXT,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  request_id TEXT REFERENCES connectlog_contact_requests(id) ON DELETE SET NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_paid_event_handoffs_workspace_created ON paid_event_handoffs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paid_event_handoffs_workspace_status ON paid_event_handoffs(workspace_id, full_build_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paid_event_handoffs_payment_reference ON paid_event_handoffs(payment_provider, payment_reference);

CREATE TABLE IF NOT EXISTS paid_event_handoff_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  handoff_id TEXT NOT NULL REFERENCES paid_event_handoffs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  body TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_paid_event_handoff_events_handoff_created ON paid_event_handoff_events(handoff_id, created_at DESC);
