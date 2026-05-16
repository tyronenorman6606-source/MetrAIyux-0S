# Billing Provider Setup

The package implements honest billing infrastructure. It does not create fake paid subscriptions.

## Current billing capabilities

✅ Public plan table.  
✅ Checkout session record table.  
✅ Stripe Checkout creation through REST when Stripe env vars are present.  
✅ Stripe webhook signature verification.  
✅ Stripe checkout-completed event can update account plan and billing status.  
✅ Stripe subscription-created/updated/deleted events are recorded.  
✅ Generic billing webhook intake for manual/Paddle/LemonSqueezy-style provider events.  
☐ Full provider dashboard configuration must be done by the operator.  
☐ Tax, invoices, chargebacks, and customer portal flows are not implemented in this package.

## Stripe env

```env
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_live_or_test_secret
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_AGENCY=price_...
```

The price env names map to control-plane plan codes. Example: plan `studio` uses `STRIPE_PRICE_STUDIO`.

## Stripe webhook endpoint

```text
https://CONTROL_DOMAIN/api/billing/stripe/webhook
```

Subscribe to these event types first:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

## Generic webhook endpoint

```text
https://CONTROL_DOMAIN/api/billing/webhook
```

Header required when `BILLING_WEBHOOK_SECRET` is set:

```text
x-s13-billing-secret: your-secret
```

This generic endpoint records events. It does not auto-upgrade accounts because each provider uses different payload semantics.
