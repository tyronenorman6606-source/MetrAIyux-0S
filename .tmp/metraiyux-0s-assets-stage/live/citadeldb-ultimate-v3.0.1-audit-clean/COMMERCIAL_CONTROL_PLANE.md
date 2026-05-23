# CitadelDB Commercial Control Plane

v2.0 adds the commercial layer required for a sellable Neon-style product.

## Included

- accounts and teams from v1.9
- plans and quotas from v1.9
- billing customers
- subscriptions
- payment events
- entitlement checks
- Stripe-compatible webhook scaffold
- subscription enforcement flag
- database branch request scaffold
- commercial readiness dashboard

## Important

This is not a claim of live Stripe billing.

The package includes the schema, endpoints, readiness checks, webhook boundary, and dashboard workflows.

Live proof still requires:

☐ Stripe checkout/session creation  
☐ Stripe webhook delivery  
☐ signature verification with real webhook secret  
☐ subscription status changing entitlements  
☐ blocked provisioning when subscription is inactive  
