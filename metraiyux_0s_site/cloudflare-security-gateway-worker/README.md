# 0meg4kAI Security Gateway Worker

This Worker is the recommended boundary between customer SaaS commands and privileged owner automation.

## Purpose

Customer SaaS requests should not call the Main Automation Brain directly. They should call this gateway or the SaaS Worker function that embeds the same 0meg4kAI policy.

Flow:

Customer command → 0meg4kAI scan → allow customer-scoped / approval_required / quarantine / reject → audit log → optional queue → admin review only when needed.

## Endpoints

`GET /api/omega/status`  
`POST /api/omega/scan`  
`POST /api/omega/customer-command`  
`GET /api/omega/audit`

## Required secrets / vars

`ADMIN_TOKEN` for admin audit reads.  
`CUSTOMER_COMMAND_TOKEN` optional token for customer-workspace calls.  
`PUBLIC_ADMIN_URL` optional link for approval inbox.  
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_APPROVAL_EMAIL` optional approval notification.

## D1 / KV / Queue

Bind `OMEGA_DB`, `OMEGA_KV`, and `OMEGA_QUEUE` if you want persistence and async review.

## Hard rule

Do not put owner production connector credentials in customer-facing code. Do not expose ADMIN_TOKEN or OAuth secrets in the browser.
