# Resend Approval Email Setup

## Purpose
Notify the admin when the Main Automation Brain needs approval before external action.

## Cloudflare secrets

```bash
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put RESEND_API_KEY
```

## Worker variables

```toml
RESEND_FROM_EMAIL = "13-Department Approval Desk <approvals@your-domain.com>"
ADMIN_APPROVAL_EMAIL = "you@your-domain.com"
PUBLIC_ADMIN_URL = "https://your-domain.com"
```

## Test

```bash
curl -X POST "$WORKER/api/admin/approval-email/test"   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{"message":"Test approval email."}'
```

## Approval-sensitive triggers
- publish/post/social/email/send
- contract/signature/legal/tax/filing
- payment/refund/price
- hire/fire/HR action
- public claim/proof-sensitive launch
