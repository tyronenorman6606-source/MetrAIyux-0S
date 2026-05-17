# Tenant Isolation and 0meg4kAI Security Policy

Updated: 2026-05-15T11:13:02Z

## Executive Rule

The customer SaaS layer must remain separate from the owner/admin company OS. Customers can run their own workspace. They cannot access the owner Main Automation Brain, owner credentials, owner social connectors, admin audit ledgers, private founder/admin materials, or production publishing authority.

## 17-Brain Structure

1. Main Automation Brain / Site Operator Brain — owner/admin command.  
2. 0meg4kAI — security, QA, tenant isolation, approval decisioning.  
3. Central Company Command Brain.  
4-16. The 13 cabinet/person brains.

## Customer Command Flow

Customer command → SaaS Worker → 0meg4kAI review → safe customer-scoped route OR approval-required OR quarantine OR reject.

## 0meg4kAI Decision Labels

✅ allow_customer_scoped  
☐ approval_required  
☐ quarantine_for_admin_review  
☐ reject_privilege_escalation  
☐ reject_policy_or_security_risk

## Customer Cannot Access

- ADMIN_TOKEN
- RESEND_API_KEY
- owner social OAuth
- owner production posting connectors
- owner Main Automation Brain direct route
- global/all-tenant D1 ledgers
- admin proof vault internals
- Cloudflare deployment secrets
- private governance/admin materials

## Live Deployment Requirements

✅ Put admin behind upstream auth or Cloudflare Access.  
✅ Keep customer SaaS Worker separate from admin automation Worker.  
✅ Keep owner connector credentials in admin Worker only.  
✅ Route customer commands through 0meg4kAI before admin review.  
✅ Use D1/KV/Queues to record customer security reviews.  
✅ Send approval notifications through Resend for approval-required or quarantined items.  
✅ Prove blocked customer access with smoke tests.
