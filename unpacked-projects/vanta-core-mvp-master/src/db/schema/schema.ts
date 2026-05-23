import { AnyPgColumn, pgTable, text, timestamp, uuid, boolean, integer, jsonb, decimal } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

// --- Multi-Tenant Foundation ---

export const resellers = pgTable("resellers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  logoUrl: text("logo_url"),
  branding: jsonb("branding"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  status: text("status").default("active").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => tenants.id),
  resellerId: uuid("reseller_id").references(() => resellers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tenantSettings = pgTable("tenant_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tenantBranding = pgTable("tenant_branding", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  fontFamily: text("font_family"),
  customCss: text("custom_css"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Auth & Users ---

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  email: text("email").unique().notNull(),
  name: text("name"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  roleName: text("role_name").notNull(),
  permissions: jsonb("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Business Profile ---

export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  description: text("description"),
  industry: text("industry"),
  website: text("website"),
  phone: text("phone"),
  address: text("address"),
  timezone: text("timezone").default("UTC").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const businessPacks = pgTable("business_packs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  config: jsonb("config").notNull(), // Questions, follow-ups, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  duration: integer("duration"), // in minutes
  isEmergency: boolean("is_emergency").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceAreas = pgTable("service_areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  zipCodes: text("zip_codes").array(),
  geometry: jsonb("geometry"), // GeoJSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Leads & Conversations ---

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  channel: text("channel").notNull(), // sms, call, chat, email
  status: text("status").default("active").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  senderType: text("sender_type").notNull(), // contact, ai, user
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calls = pgTable("calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  sid: text("sid").unique(), // Twilio/SignalWire SID
  direction: text("direction").notNull(), // inbound, outbound
  status: text("status").notNull(),
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callTranscripts = pgTable("call_transcripts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  callId: uuid("call_id").references(() => calls.id).notNull(),
  transcript: text("transcript").notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id),
  status: text("status").default("new").notNull(),
  urgency: text("urgency").default("normal").notNull(),
  qualityScore: integer("quality_score"),
  metadata: jsonb("metadata"), // Added for flexible intake data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  leadId: uuid("lead_id").references(() => leads.id),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  details: jsonb("details"), // Line items, calculations, etc.
  status: text("status").default("pending").notNull(), // pending, accepted, rejected, expired
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadScores = pgTable("lead_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  leadId: uuid("lead_id").references(() => leads.id).notNull(),
  score: integer("score").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Jobs & Appointments ---

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  leadId: uuid("lead_id").references(() => leads.id),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  status: text("status").default("scheduled").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").default("confirmed").notNull(), // confirmed, cancelled, no-show, completed
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  depositStatus: text("deposit_status"), // pending, paid, refunded
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  assignedTo: uuid("assigned_to"), // userId
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo").notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Automation & AI ---

export const followupSequences = pgTable("followup_sequences", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  steps: jsonb("steps").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const followupEvents = pgTable("followup_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  sequenceId: uuid("sequence_id").references(() => followupSequences.id).notNull(),
  leadId: uuid("lead_id").references(() => leads.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  status: text("status").default("pending").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blockedCallers = pgTable("blocked_callers", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  phone: text("phone").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendorIntake = pgTable("vendor_intake", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  pitch: text("pitch"),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const automationRuns = pgTable("automation_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  automationType: text("automation_type").notNull(),
  status: text("status").notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiActions = pgTable("ai_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  actionType: text("action_type").notNull(),
  input: text("input").notNull(),
  decision: jsonb("decision").notNull(),
  result: text("result"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  auditId: uuid("audit_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ownerAlerts = pgTable("owner_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Compliance & Reviews ---

export const reviewRequests = pgTable("review_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  status: text("status").default("sent").notNull(),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentIdeas = pgTable("content_ideas", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  topic: text("topic").notNull(),
  type: text("type").notNull(),
  draft: text("draft"),
  status: text("status").default("pending_review").notNull(),
  sourceId: uuid("source_id"),
  sourceType: text("source_type"), // call_transcript, message, review
  qualityScore: integer("quality_score").default(0),
  approvedAt: timestamp("approved_at"),
  publishedAt: timestamp("published_at"),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const consentEvents = pgTable("consent_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  consentType: text("consent_type").notNull(), // sms, email, recording
  status: text("status").notNull(), // granted, withdrawn
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const optOuts = pgTable("opt_outs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  contactId: uuid("contact_id").references(() => contacts.id).notNull(),
  channel: text("channel").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Integrations & Billing ---

export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  provider: text("provider").notNull(),
  config: jsonb("config").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  provider: text("provider").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const billingCustomers = pgTable("billing_customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  stripeCustomerId: text("stripe_customer_id").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const billingSubscriptions = pgTable("billing_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique().notNull(),
  status: text("status").notNull(),
  planId: text("plan_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  stripeInvoiceId: text("stripe_invoice_id").unique().notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Audit & Logging ---

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  userId: uuid("user_id"),
  resellerId: uuid("reseller_id").references(() => resellers.id),
  actor: text("actor").notNull(), // system, ai, user
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  input: jsonb("input"),
  result: text("result"),
  error: text("error"),
  integrityHash: text("integrity_hash"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Trust & Compliance Ledger ---

export const proofLedger = pgTable("proof_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  proofType: text("proof_type").notNull(), // audit, consent, transaction, compliance_snapshot, custom
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  dataHash: text("data_hash").notNull(),
  previousHash: text("previous_hash"),
  proofHash: text("proof_hash").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Competitor Intelligence ---

export const competitorMonitors = pgTable("competitor_monitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  competitorName: text("competitor_name").notNull(),
  url: text("url"),
  type: text("type").notNull(), // pricing, services, reviews
  lastValue: text("last_value"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const competitorAlerts = pgTable("competitor_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  monitorId: uuid("monitor_id").references(() => competitorMonitors.id).notNull(),
  changeSummary: text("change_summary").notNull(),
  severity: text("severity").default("info").notNull(), // info, warning, critical
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations ---

export const contactsRelations = relations(contacts, ({ many }) => ({
  conversations: many(conversations),
  leads: many(leads),
  jobs: many(jobs),
  appointments: many(appointments),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [conversations.contactId],
    references: [contacts.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [leads.contactId],
    references: [contacts.id],
  }),
  service: one(services, {
    fields: [leads.serviceId],
    references: [services.id],
  }),
  scores: many(leadScores),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  leads: many(leads),
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [appointments.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [appointments.contactId],
    references: [contacts.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  job: one(jobs, {
    fields: [appointments.jobId],
    references: [jobs.id],
  }),
}));

export const followupSequencesRelations = relations(followupSequences, ({ many }) => ({
  events: many(followupEvents),
}));

export const followupEventsRelations = relations(followupEvents, ({ one }) => ({
  sequence: one(followupSequences, {
    fields: [followupEvents.sequenceId],
    references: [followupSequences.id],
  }),
  lead: one(leads, {
    fields: [followupEvents.leadId],
    references: [leads.id],
  }),
  contact: one(contacts, {
    fields: [followupEvents.contactId],
    references: [contacts.id],
  }),
}));

export const resellersRelations = relations(resellers, ({ many }) => ({
  tenants: many(tenants),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  parent: one(tenants, {
    fields: [tenants.parentId],
    references: [tenants.id],
  }),
  children: many(tenants),
  reseller: one(resellers, {
    fields: [tenants.resellerId],
    references: [resellers.id],
  }),
  contacts: many(contacts),
  leads: many(leads),
}));

export const competitorMonitorsRelations = relations(competitorMonitors, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [competitorMonitors.tenantId],
    references: [tenants.id],
  }),
  alerts: many(competitorAlerts),
}));

export const competitorAlertsRelations = relations(competitorAlerts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [competitorAlerts.tenantId],
    references: [tenants.id],
  }),
  monitor: one(competitorMonitors, {
    fields: [competitorAlerts.monitorId],
    references: [competitorMonitors.id],
  }),
}));

export const proofLedgerRelations = relations(proofLedger, ({ one }) => ({
  tenant: one(tenants, {
    fields: [proofLedger.tenantId],
    references: [tenants.id],
  }),
}));

// --- VantaCore Trade (Marketplace) ---

export const leadExchange = pgTable("lead_exchange", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  leadId: uuid("lead_id").references(() => leads.id).notNull(),
  status: text("status").default("available").notNull(), // available, pending, sold, expired
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  reservePrice: decimal("reserve_price", { precision: 10, scale: 2 }),
  closeProbability: decimal("close_probability", { precision: 3, scale: 2 }),
  dynamicScore: integer("dynamic_score"),
  buyerConfidence: decimal("buyer_confidence", { precision: 3, scale: 2 }),
  anonymizedData: jsonb("anonymized_data").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadTradeTransactions = pgTable("lead_trade_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  exchangeId: uuid("exchange_id").references(() => leadExchange.id).notNull(),
  buyerTenantId: uuid("buyer_tenant_id").references(() => tenants.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  successFee: decimal("success_fee", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("escrow").notNull(), // escrow, completed, disputed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const escrowLedger = pgTable("escrow_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  transactionId: uuid("transaction_id").references(() => leadTradeTransactions.id),
  type: text("type").notNull(), // credit, debit
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Trade Relations ---

export const leadExchangeRelations = relations(leadExchange, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leadExchange.tenantId],
    references: [tenants.id],
  }),
  lead: one(leads, {
    fields: [leadExchange.leadId],
    references: [leads.id],
  }),
  transactions: many(leadTradeTransactions),
}));

export const leadTradeTransactionsRelations = relations(leadTradeTransactions, ({ one }) => ({
  exchange: one(leadExchange, {
    fields: [leadTradeTransactions.exchangeId],
    references: [leadExchange.id],
  }),
  buyer: one(tenants, {
    fields: [leadTradeTransactions.buyerTenantId],
    references: [tenants.id],
  }),
}));

export const escrowLedgerRelations = relations(escrowLedger, ({ one }) => ({
  tenant: one(tenants, {
    fields: [escrowLedger.tenantId],
    references: [tenants.id],
  }),
  transaction: one(leadTradeTransactions, {
    fields: [escrowLedger.transactionId],
    references: [leadTradeTransactions.id],
  }),
}));
