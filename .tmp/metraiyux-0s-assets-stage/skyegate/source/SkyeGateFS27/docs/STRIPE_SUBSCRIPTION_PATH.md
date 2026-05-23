# SkyeGateFS27 Stripe Subscription Path

Updated: 2026-05-16

Root source of truth: `../../STRIPE_PRODUCT_PRICE_CATALOG.md`

This file exists so the gate folder knows how managed gate billing is supposed to be sold. The existing SkyeGate checkout code supports usage top-ups. Managed operation is a separate subscription path.

## Managed Gate Products

Create these in Stripe when offering SkyeGateFS27 as a managed service:

| Product | Type | Amount | Billing | Lookup key |
| --- | --- | ---: | --- | --- |
| SkyeGateFS27 Managed Gate Onboarding | One-time | $12,500.00 | Once | `skygatefs27_managed_gate_onboarding` |
| SkyeGateFS27 Managed Control Plane | Recurring | $1,250.00 | Monthly | `skygatefs27_managed_control_plane_monthly` |
| SkyeGateFS27 Lane Maintenance | Recurring | $249.00 | Monthly per lane | `skygatefs27_lane_maintenance_monthly` |
| SkyeGateFS27 Usage Top-Up | One-time variable | Admin-entered | Once | `skygatefs27_usage_topup_variable` |

## What The Customer Is Buying

Managed SkyeGateFS27 covers the control plane around bearer-token validation, customer policy, key/cap management, platform event mirroring, usage visibility, exports, monitor events, billing controls, and operational support.

The usage top-up is not a subscription. It credits usage through the existing Stripe checkout/top-up path.

## Do Not Sell These As Plans

| Source | Value | Why |
| --- | --- | --- |
| `SkyeGateFS27/index.html` / env defaults | `$20/month cap` | This is a default spend limit, not a product. |
| `SkyeGateFS27/pricing/pricing.json` | model/provider token prices | Internal metering inputs. |
| `env.ultimate.template` voice values | per-minute costs | Metering inputs until markup and policy are approved. |

## Operational Rule

When gate billing changes, update:

1. `../../STRIPE_PRODUCT_PRICE_CATALOG.md`
2. `../THE_GATE_MAP.md`
3. `../../metraiyux_0s_site/brain/sales-offer-registry.json`
4. Any Stripe dashboard products, prices, Payment Links, or checkout code that changed
