import { createActionEnvelope } from './contracts.mjs';

export const CUSTOMER_POSTING_ENTITLEMENT_VERSION = '0s-first-month-1.0.0';

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_MONTH_DAYS = 30;

function clean(value){ return String(value ?? '').trim(); }
function parseDate(value){
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}
function addDays(date, days){ return new Date(date.getTime() + days * DAY_MS); }

export function firstMonthPostingEligibility({ subscription_started_at, first_paid_invoice_at, now = new Date() } = {}){
  const started = parseDate(subscription_started_at);
  const paid = parseDate(first_paid_invoice_at);
  const current = parseDate(now) || new Date();
  if(!started) return { eligible:false, reason:'subscription_started_at is required.' };
  if(!paid) return { eligible:false, reason:'first_paid_invoice_at is required.' };
  const eligible_at = addDays(started, FIRST_MONTH_DAYS);
  if(current < eligible_at) return { eligible:false, reason:'Customer has not completed the first 30 days yet.', eligible_at:eligible_at.toISOString() };
  if(paid < started) return { eligible:false, reason:'first_paid_invoice_at cannot be before subscription_started_at.' };
  return { eligible:true, reason:'First paid month completed.', eligible_at:eligible_at.toISOString() };
}

export function buildFirstMonthBusinessPosting({
  customer_id,
  workspace_id,
  business_name,
  owner_name,
  owner_contact,
  city,
  category,
  posting_reason = 'first_month_customer_network_posting',
  subscription_started_at,
  first_paid_invoice_at,
  website = '',
  phone = '',
  email = '',
  description = '',
  source_url = '',
  notes = '',
  actor = {},
  now = new Date()
} = {}){
  const eligibility = firstMonthPostingEligibility({ subscription_started_at, first_paid_invoice_at, now });
  if(!eligibility.eligible){
    const error = new Error(`Free business posting is not eligible yet: ${eligibility.reason}`);
    error.status = 400;
    error.eligibility = eligibility;
    throw error;
  }
  return createActionEnvelope({
    type:'customer_business_posting',
    actor,
    source:'0s-first-month-benefit',
    payload:{
      customer_id:clean(customer_id || actor.customer_id),
      workspace_id:clean(workspace_id || actor.workspace_id),
      business_name:clean(business_name),
      owner_name:clean(owner_name || actor.email || actor.id),
      owner_contact:clean(owner_contact || actor.email),
      city:clean(city),
      category:clean(category),
      posting_reason:clean(posting_reason),
      subscription_started_at:clean(subscription_started_at),
      first_paid_invoice_at:clean(first_paid_invoice_at),
      eligibility_checked_at:(parseDate(now) || new Date()).toISOString(),
      eligible_at:eligibility.eligible_at,
      website:clean(website),
      phone:clean(phone),
      email:clean(email),
      description:clean(description),
      source_url:clean(source_url),
      notes:clean(notes),
      free_posting_credit:true
    }
  });
}

export function customerPostingEntitlementForApi(){
  return {
    version:CUSTOMER_POSTING_ENTITLEMENT_VERSION,
    benefit:'Every qualified MetrAIyux 0S customer receives one free queued public business landing/posting to Valley Verified after the first paid month, with no obligation to buy upgrades.',
    eligibility:{ first_paid_month_days:FIRST_MONTH_DAYS, requires_first_paid_invoice:true },
    queue:'customer-business-postings',
    auto_publish:false,
    review_required:true,
    gate_auth_required:true
  };
}
