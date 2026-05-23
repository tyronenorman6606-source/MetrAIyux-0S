import { pgTable, foreignKey, uuid, text, integer, boolean, timestamp, jsonb, numeric, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const knowledgeNuggets = pgTable("knowledge_nuggets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	sourceId: uuid("source_id"),
	sourceType: text("source_type").notNull(),
	content: text().notNull(),
	tags: text().array(),
	qualityScore: integer("quality_score"),
	isUsed: boolean("is_used").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "knowledge_nuggets_tenant_id_tenants_id_fk"
		}),
]);

export const aiActions = pgTable("ai_actions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	actionType: text("action_type").notNull(),
	input: text().notNull(),
	decision: jsonb().notNull(),
	result: text(),
	confidence: numeric({ precision: 3, scale:  2 }),
	auditId: uuid("audit_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ai_actions_tenant_id_tenants_id_fk"
		}),
]);

export const automationRuns = pgTable("automation_runs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	automationType: text("automation_type").notNull(),
	status: text().notNull(),
	input: jsonb(),
	output: jsonb(),
	error: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "automation_runs_tenant_id_tenants_id_fk"
		}),
]);

export const billingCustomers = pgTable("billing_customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	stripeCustomerId: text("stripe_customer_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "billing_customers_tenant_id_tenants_id_fk"
		}),
	unique("billing_customers_stripe_customer_id_unique").on(table.stripeCustomerId),
]);

export const billingSubscriptions = pgTable("billing_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	stripeSubscriptionId: text("stripe_subscription_id").notNull(),
	status: text().notNull(),
	planId: text("plan_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "billing_subscriptions_tenant_id_tenants_id_fk"
		}),
	unique("billing_subscriptions_stripe_subscription_id_unique").on(table.stripeSubscriptionId),
]);

export const blockedCallers = pgTable("blocked_callers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	phone: text().notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "blocked_callers_tenant_id_tenants_id_fk"
		}),
]);

export const businessPacks = pgTable("business_packs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	name: text().notNull(),
	category: text().notNull(),
	config: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "business_packs_tenant_id_tenants_id_fk"
		}),
]);

export const businessProfiles = pgTable("business_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	description: text(),
	industry: text(),
	website: text(),
	phone: text(),
	address: text(),
	timezone: text().default('UTC').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "business_profiles_tenant_id_tenants_id_fk"
		}),
]);

export const appointments = pgTable("appointments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	jobId: uuid("job_id"),
	contactId: uuid("contact_id").notNull(),
	serviceId: uuid("service_id"),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	status: text().default('confirmed').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "appointments_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "appointments_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "appointments_contact_id_contacts_id_fk"
		}),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "appointments_service_id_services_id_fk"
		}),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	resellerId: uuid("reseller_id"),
	userId: uuid("user_id"),
	actor: text().notNull(),
	action: text().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: uuid("entity_id"),
	input: jsonb(),
	result: text(),
	error: text(),
	integrityHash: text("integrity_hash"),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "audit_logs_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.resellerId],
			foreignColumns: [resellers.id],
			name: "audit_logs_reseller_id_resellers_id_fk"
		}),
]);

export const calls = pgTable("calls", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	sid: text(),
	direction: text().notNull(),
	status: text().notNull(),
	duration: integer(),
	recordingUrl: text("recording_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "calls_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "calls_contact_id_contacts_id_fk"
		}),
	unique("calls_sid_unique").on(table.sid),
]);

export const consentEvents = pgTable("consent_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	consentType: text("consent_type").notNull(),
	status: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "consent_events_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "consent_events_contact_id_contacts_id_fk"
		}),
]);

export const contentIdeas = pgTable("content_ideas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	topic: text().notNull(),
	type: text().notNull(),
	draft: text(),
	status: text().default('idea').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "content_ideas_tenant_id_tenants_id_fk"
		}),
]);

export const callTranscripts = pgTable("call_transcripts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	callId: uuid("call_id").notNull(),
	transcript: text().notNull(),
	summary: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "call_transcripts_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.callId],
			foreignColumns: [calls.id],
			name: "call_transcripts_call_id_calls_id_fk"
		}),
]);

export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	channel: text().notNull(),
	status: text().default('active').notNull(),
	lastMessageAt: timestamp("last_message_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "conversations_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "conversations_contact_id_contacts_id_fk"
		}),
]);

export const escrowLedger = pgTable("escrow_ledger", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	transactionId: uuid("transaction_id"),
	type: text().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "escrow_ledger_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [leadTradeTransactions.id],
			name: "escrow_ledger_transaction_id_lead_trade_transactions_id_fk"
		}),
]);

export const contacts = pgTable("contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	name: text(),
	email: text(),
	phone: text(),
	source: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "contacts_tenant_id_tenants_id_fk"
		}),
]);

export const integrations = pgTable("integrations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	provider: text().notNull(),
	config: jsonb().notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "integrations_tenant_id_tenants_id_fk"
		}),
]);

export const invoices = pgTable("invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	stripeInvoiceId: text("stripe_invoice_id").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	status: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "invoices_tenant_id_tenants_id_fk"
		}),
	unique("invoices_stripe_invoice_id_unique").on(table.stripeInvoiceId),
]);

export const followupSequences = pgTable("followup_sequences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	name: text().notNull(),
	steps: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "followup_sequences_tenant_id_tenants_id_fk"
		}),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	conversationId: uuid("conversation_id").notNull(),
	senderType: text("sender_type").notNull(),
	content: text().notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "messages_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}),
]);

export const leads = pgTable("leads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	serviceId: uuid("service_id"),
	status: text().default('new').notNull(),
	urgency: text().default('normal').notNull(),
	qualityScore: integer("quality_score"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "leads_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "leads_contact_id_contacts_id_fk"
		}),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "leads_service_id_services_id_fk"
		}),
]);

export const leadExchange = pgTable("lead_exchange", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	leadId: uuid("lead_id").notNull(),
	status: text().default('available').notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	anonymizedData: jsonb("anonymized_data").notNull(),
	metadata: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "lead_exchange_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_exchange_lead_id_leads_id_fk"
		}),
]);

export const optOuts = pgTable("opt_outs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	channel: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "opt_outs_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "opt_outs_contact_id_contacts_id_fk"
		}),
]);

export const ownerAlerts = pgTable("owner_alerts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	type: text().notNull(),
	message: text().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "owner_alerts_tenant_id_tenants_id_fk"
		}),
]);

export const reviewRequests = pgTable("review_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	jobId: uuid("job_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	status: text().default('sent').notNull(),
	rating: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "review_requests_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "review_requests_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "review_requests_contact_id_contacts_id_fk"
		}),
]);

export const leadTradeTransactions = pgTable("lead_trade_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	exchangeId: uuid("exchange_id").notNull(),
	buyerTenantId: uuid("buyer_tenant_id").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	successFee: numeric("success_fee", { precision: 10, scale:  2 }).notNull(),
	status: text().default('escrow').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.exchangeId],
			foreignColumns: [leadExchange.id],
			name: "lead_trade_transactions_exchange_id_lead_exchange_id_fk"
		}),
	foreignKey({
			columns: [table.buyerTenantId],
			foreignColumns: [tenants.id],
			name: "lead_trade_transactions_buyer_tenant_id_tenants_id_fk"
		}),
]);

export const serviceAreas = pgTable("service_areas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	name: text().notNull(),
	zipCodes: text("zip_codes").array(),
	geometry: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "service_areas_tenant_id_tenants_id_fk"
		}),
]);

export const resellers = pgTable("resellers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logoUrl: text("logo_url"),
	branding: jsonb(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("resellers_slug_unique").on(table.slug),
]);

export const services = pgTable("services", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	name: text().notNull(),
	description: text(),
	price: numeric({ precision: 10, scale:  2 }),
	duration: integer(),
	isEmergency: boolean("is_emergency").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "services_tenant_id_tenants_id_fk"
		}),
]);

export const leadScores = pgTable("lead_scores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	leadId: uuid("lead_id").notNull(),
	score: integer().notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "lead_scores_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_scores_lead_id_leads_id_fk"
		}),
]);

export const vendorIntake = pgTable("vendor_intake", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	name: text(),
	email: text(),
	phone: text(),
	pitch: text(),
	status: text().default('new').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "vendor_intake_tenant_id_tenants_id_fk"
		}),
]);

export const webhookEvents = pgTable("webhook_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	provider: text().notNull(),
	payload: jsonb().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "webhook_events_tenant_id_tenants_id_fk"
		}),
]);

export const tenants = pgTable("tenants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	resellerId: uuid("reseller_id"),
	name: text().notNull(),
	slug: text().notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.resellerId],
			foreignColumns: [resellers.id],
			name: "tenants_reseller_id_resellers_id_fk"
		}),
	unique("tenants_slug_unique").on(table.slug),
]);

export const jobs = pgTable("jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	leadId: uuid("lead_id"),
	contactId: uuid("contact_id").notNull(),
	title: text(),
	status: text().default('scheduled').notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "jobs_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "jobs_lead_id_leads_id_fk"
		}),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "jobs_contact_id_contacts_id_fk"
		}),
]);

export const followupEvents = pgTable("followup_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	sequenceId: uuid("sequence_id").notNull(),
	leadId: uuid("lead_id").notNull(),
	status: text().default('pending').notNull(),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }).notNull(),
	executedAt: timestamp("executed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "followup_events_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.sequenceId],
			foreignColumns: [followupSequences.id],
			name: "followup_events_sequence_id_followup_sequences_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "followup_events_lead_id_leads_id_fk"
		}),
]);

export const tasks = pgTable("tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	assignedTo: uuid("assigned_to"),
	title: text().notNull(),
	description: text(),
	status: text().default('todo').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "tasks_tenant_id_tenants_id_fk"
		}),
]);

export const tenantBranding = pgTable("tenant_branding", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	logoUrl: text("logo_url"),
	primaryColor: text("primary_color"),
	secondaryColor: text("secondary_color"),
	fontFamily: text("font_family"),
	customCss: text("custom_css"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "tenant_branding_tenant_id_tenants_id_fk"
		}),
]);

export const tenantSettings = pgTable("tenant_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	key: text().notNull(),
	value: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "tenant_settings_tenant_id_tenants_id_fk"
		}),
]);

export const userRoles = pgTable("user_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	userId: uuid("user_id").notNull(),
	roleName: text("role_name").notNull(),
	permissions: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "user_roles_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	resellerId: uuid("reseller_id"),
	email: text().notNull(),
	name: text(),
	role: text().default('VantaCore-User').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "users_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.resellerId],
			foreignColumns: [resellers.id],
			name: "users_reseller_id_resellers_id_fk"
		}),
	unique("users_email_unique").on(table.email),
]);
