import { relations } from "drizzle-orm/relations";
import { tenants, knowledgeNuggets, aiActions, automationRuns, billingCustomers, billingSubscriptions, blockedCallers, businessPacks, businessProfiles, appointments, jobs, contacts, services, auditLogs, resellers, calls, consentEvents, contentIdeas, callTranscripts, conversations, escrowLedger, leadTradeTransactions, integrations, invoices, followupSequences, messages, leads, leadExchange, optOuts, ownerAlerts, reviewRequests, serviceAreas, leadScores, vendorIntake, webhookEvents, followupEvents, tasks, tenantBranding, tenantSettings, userRoles, users } from "./schema";

export const knowledgeNuggetsRelations = relations(knowledgeNuggets, ({one}) => ({
	tenant: one(tenants, {
		fields: [knowledgeNuggets.tenantId],
		references: [tenants.id]
	}),
}));

export const tenantsRelations = relations(tenants, ({one, many}) => ({
	knowledgeNuggets: many(knowledgeNuggets),
	aiActions: many(aiActions),
	automationRuns: many(automationRuns),
	billingCustomers: many(billingCustomers),
	billingSubscriptions: many(billingSubscriptions),
	blockedCallers: many(blockedCallers),
	businessPacks: many(businessPacks),
	businessProfiles: many(businessProfiles),
	appointments: many(appointments),
	auditLogs: many(auditLogs),
	calls: many(calls),
	consentEvents: many(consentEvents),
	contentIdeas: many(contentIdeas),
	callTranscripts: many(callTranscripts),
	conversations: many(conversations),
	escrowLedgers: many(escrowLedger),
	contacts: many(contacts),
	integrations: many(integrations),
	invoices: many(invoices),
	followupSequences: many(followupSequences),
	messages: many(messages),
	leads: many(leads),
	leadExchanges: many(leadExchange),
	optOuts: many(optOuts),
	ownerAlerts: many(ownerAlerts),
	reviewRequests: many(reviewRequests),
	leadTradeTransactions: many(leadTradeTransactions),
	serviceAreas: many(serviceAreas),
	services: many(services),
	leadScores: many(leadScores),
	vendorIntakes: many(vendorIntake),
	webhookEvents: many(webhookEvents),
	reseller: one(resellers, {
		fields: [tenants.resellerId],
		references: [resellers.id]
	}),
	jobs: many(jobs),
	followupEvents: many(followupEvents),
	tasks: many(tasks),
	tenantBrandings: many(tenantBranding),
	tenantSettings: many(tenantSettings),
	userRoles: many(userRoles),
	users: many(users),
}));

export const aiActionsRelations = relations(aiActions, ({one}) => ({
	tenant: one(tenants, {
		fields: [aiActions.tenantId],
		references: [tenants.id]
	}),
}));

export const automationRunsRelations = relations(automationRuns, ({one}) => ({
	tenant: one(tenants, {
		fields: [automationRuns.tenantId],
		references: [tenants.id]
	}),
}));

export const billingCustomersRelations = relations(billingCustomers, ({one}) => ({
	tenant: one(tenants, {
		fields: [billingCustomers.tenantId],
		references: [tenants.id]
	}),
}));

export const billingSubscriptionsRelations = relations(billingSubscriptions, ({one}) => ({
	tenant: one(tenants, {
		fields: [billingSubscriptions.tenantId],
		references: [tenants.id]
	}),
}));

export const blockedCallersRelations = relations(blockedCallers, ({one}) => ({
	tenant: one(tenants, {
		fields: [blockedCallers.tenantId],
		references: [tenants.id]
	}),
}));

export const businessPacksRelations = relations(businessPacks, ({one}) => ({
	tenant: one(tenants, {
		fields: [businessPacks.tenantId],
		references: [tenants.id]
	}),
}));

export const businessProfilesRelations = relations(businessProfiles, ({one}) => ({
	tenant: one(tenants, {
		fields: [businessProfiles.tenantId],
		references: [tenants.id]
	}),
}));

export const appointmentsRelations = relations(appointments, ({one}) => ({
	tenant: one(tenants, {
		fields: [appointments.tenantId],
		references: [tenants.id]
	}),
	job: one(jobs, {
		fields: [appointments.jobId],
		references: [jobs.id]
	}),
	contact: one(contacts, {
		fields: [appointments.contactId],
		references: [contacts.id]
	}),
	service: one(services, {
		fields: [appointments.serviceId],
		references: [services.id]
	}),
}));

export const jobsRelations = relations(jobs, ({one, many}) => ({
	appointments: many(appointments),
	reviewRequests: many(reviewRequests),
	tenant: one(tenants, {
		fields: [jobs.tenantId],
		references: [tenants.id]
	}),
	lead: one(leads, {
		fields: [jobs.leadId],
		references: [leads.id]
	}),
	contact: one(contacts, {
		fields: [jobs.contactId],
		references: [contacts.id]
	}),
}));

export const contactsRelations = relations(contacts, ({one, many}) => ({
	appointments: many(appointments),
	calls: many(calls),
	consentEvents: many(consentEvents),
	conversations: many(conversations),
	tenant: one(tenants, {
		fields: [contacts.tenantId],
		references: [tenants.id]
	}),
	leads: many(leads),
	optOuts: many(optOuts),
	reviewRequests: many(reviewRequests),
	jobs: many(jobs),
}));

export const servicesRelations = relations(services, ({one, many}) => ({
	appointments: many(appointments),
	leads: many(leads),
	tenant: one(tenants, {
		fields: [services.tenantId],
		references: [tenants.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	tenant: one(tenants, {
		fields: [auditLogs.tenantId],
		references: [tenants.id]
	}),
	reseller: one(resellers, {
		fields: [auditLogs.resellerId],
		references: [resellers.id]
	}),
}));

export const resellersRelations = relations(resellers, ({many}) => ({
	auditLogs: many(auditLogs),
	tenants: many(tenants),
	users: many(users),
}));

export const callsRelations = relations(calls, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [calls.tenantId],
		references: [tenants.id]
	}),
	contact: one(contacts, {
		fields: [calls.contactId],
		references: [contacts.id]
	}),
	callTranscripts: many(callTranscripts),
}));

export const consentEventsRelations = relations(consentEvents, ({one}) => ({
	tenant: one(tenants, {
		fields: [consentEvents.tenantId],
		references: [tenants.id]
	}),
	contact: one(contacts, {
		fields: [consentEvents.contactId],
		references: [contacts.id]
	}),
}));

export const contentIdeasRelations = relations(contentIdeas, ({one}) => ({
	tenant: one(tenants, {
		fields: [contentIdeas.tenantId],
		references: [tenants.id]
	}),
}));

export const callTranscriptsRelations = relations(callTranscripts, ({one}) => ({
	tenant: one(tenants, {
		fields: [callTranscripts.tenantId],
		references: [tenants.id]
	}),
	call: one(calls, {
		fields: [callTranscripts.callId],
		references: [calls.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [conversations.tenantId],
		references: [tenants.id]
	}),
	contact: one(contacts, {
		fields: [conversations.contactId],
		references: [contacts.id]
	}),
	messages: many(messages),
}));

export const escrowLedgerRelations = relations(escrowLedger, ({one}) => ({
	tenant: one(tenants, {
		fields: [escrowLedger.tenantId],
		references: [tenants.id]
	}),
	leadTradeTransaction: one(leadTradeTransactions, {
		fields: [escrowLedger.transactionId],
		references: [leadTradeTransactions.id]
	}),
}));

export const leadTradeTransactionsRelations = relations(leadTradeTransactions, ({one, many}) => ({
	escrowLedgers: many(escrowLedger),
	leadExchange: one(leadExchange, {
		fields: [leadTradeTransactions.exchangeId],
		references: [leadExchange.id]
	}),
	tenant: one(tenants, {
		fields: [leadTradeTransactions.buyerTenantId],
		references: [tenants.id]
	}),
}));

export const integrationsRelations = relations(integrations, ({one}) => ({
	tenant: one(tenants, {
		fields: [integrations.tenantId],
		references: [tenants.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one}) => ({
	tenant: one(tenants, {
		fields: [invoices.tenantId],
		references: [tenants.id]
	}),
}));

export const followupSequencesRelations = relations(followupSequences, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [followupSequences.tenantId],
		references: [tenants.id]
	}),
	followupEvents: many(followupEvents),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	tenant: one(tenants, {
		fields: [messages.tenantId],
		references: [tenants.id]
	}),
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
}));

export const leadsRelations = relations(leads, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [leads.tenantId],
		references: [tenants.id]
	}),
	contact: one(contacts, {
		fields: [leads.contactId],
		references: [contacts.id]
	}),
	service: one(services, {
		fields: [leads.serviceId],
		references: [services.id]
	}),
	leadExchanges: many(leadExchange),
	leadScores: many(leadScores),
	jobs: many(jobs),
	followupEvents: many(followupEvents),
}));

export const leadExchangeRelations = relations(leadExchange, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [leadExchange.tenantId],
		references: [tenants.id]
	}),
	lead: one(leads, {
		fields: [leadExchange.leadId],
		references: [leads.id]
	}),
	leadTradeTransactions: many(leadTradeTransactions),
}));

export const optOutsRelations = relations(optOuts, ({one}) => ({
	tenant: one(tenants, {
		fields: [optOuts.tenantId],
		references: [tenants.id]
	}),
	contact: one(contacts, {
		fields: [optOuts.contactId],
		references: [contacts.id]
	}),
}));

export const ownerAlertsRelations = relations(ownerAlerts, ({one}) => ({
	tenant: one(tenants, {
		fields: [ownerAlerts.tenantId],
		references: [tenants.id]
	}),
}));

export const reviewRequestsRelations = relations(reviewRequests, ({one}) => ({
	tenant: one(tenants, {
		fields: [reviewRequests.tenantId],
		references: [tenants.id]
	}),
	job: one(jobs, {
		fields: [reviewRequests.jobId],
		references: [jobs.id]
	}),
	contact: one(contacts, {
		fields: [reviewRequests.contactId],
		references: [contacts.id]
	}),
}));

export const serviceAreasRelations = relations(serviceAreas, ({one}) => ({
	tenant: one(tenants, {
		fields: [serviceAreas.tenantId],
		references: [tenants.id]
	}),
}));

export const leadScoresRelations = relations(leadScores, ({one}) => ({
	tenant: one(tenants, {
		fields: [leadScores.tenantId],
		references: [tenants.id]
	}),
	lead: one(leads, {
		fields: [leadScores.leadId],
		references: [leads.id]
	}),
}));

export const vendorIntakeRelations = relations(vendorIntake, ({one}) => ({
	tenant: one(tenants, {
		fields: [vendorIntake.tenantId],
		references: [tenants.id]
	}),
}));

export const webhookEventsRelations = relations(webhookEvents, ({one}) => ({
	tenant: one(tenants, {
		fields: [webhookEvents.tenantId],
		references: [tenants.id]
	}),
}));

export const followupEventsRelations = relations(followupEvents, ({one}) => ({
	tenant: one(tenants, {
		fields: [followupEvents.tenantId],
		references: [tenants.id]
	}),
	followupSequence: one(followupSequences, {
		fields: [followupEvents.sequenceId],
		references: [followupSequences.id]
	}),
	lead: one(leads, {
		fields: [followupEvents.leadId],
		references: [leads.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	tenant: one(tenants, {
		fields: [tasks.tenantId],
		references: [tenants.id]
	}),
}));

export const tenantBrandingRelations = relations(tenantBranding, ({one}) => ({
	tenant: one(tenants, {
		fields: [tenantBranding.tenantId],
		references: [tenants.id]
	}),
}));

export const tenantSettingsRelations = relations(tenantSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [tenantSettings.tenantId],
		references: [tenants.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	tenant: one(tenants, {
		fields: [userRoles.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	userRoles: many(userRoles),
	tenant: one(tenants, {
		fields: [users.tenantId],
		references: [tenants.id]
	}),
	reseller: one(resellers, {
		fields: [users.resellerId],
		references: [resellers.id]
	}),
}));