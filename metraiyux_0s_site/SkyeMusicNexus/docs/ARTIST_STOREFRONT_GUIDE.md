# SkyeMusicNexus Artist Storefront Guide

Updated: 2026-05-25

## What This Store Is

The Nexus Store is the artist business lane inside SkyeMusicNexus. It lets an artist create a small storefront, add products, create SkyePay order intents, connect a SkyeCommerce storefront, and prepare SkyeNet publishing when their plan allows it.

The artist keeps their music and identity. The platform tracks products, order intent, fees, payout review, rights holds, and fulfillment notes so money can be handled through SkyPay and internal payout review instead of disconnected spreadsheets.

## Artist Flow

1. Open SkyeMusicNexus through the shared 0S/SkyGate/Free99 gate.
2. Create or confirm the artist profile.
3. Open `Store`.
4. Save the artist storefront profile with the artist ID, store name, fulfillment email, fee mode, and storefront plan.
5. Add products: digital access, merch, tickets, tips, bookings, memberships, or private access.
6. Create an order intent for the product.
7. Send the SkyePay checkout route to the buyer or connect the store to a SkyeCommerce storefront.
8. Fulfill the order after payment and operator review.
9. Use the payout review lane for artist/vendor payout tracking.

## What The Artist Should Do First

1. Finish the Gate/Nexus profile so the store has a stable artist ID, email, Skye ID, and payout reference.
2. Open the Store builder and choose the smallest plan that fits the launch. Free99 is for testing up to 3 active products.
3. Add one real product with a clear price, image, fulfillment note, and inventory or delivery rule.
4. Attach the SkyeCommerce storefront when the artist is ready for a public commerce page.
5. Open SovereignDocs for refund, shipping, privacy, website terms, seller, and digital license drafts.
6. Complete the contractor/vendor paperwork lane before any payout release is marked ready.
7. Use SkyePay checkout links for real buyer payment and keep fulfillment status updated after payment review.
8. Publish through SkyeNet only when the plan includes publish capacity and the operator has reviewed the storefront.

## Pricing And Limits

| Plan | Price | Active Products | Monthly Order Intents | SkyeNet Store Publishes |
| --- | ---: | ---: | ---: | ---: |
| Free99 Lite storefront preview | $0 | 3 | 25 | 0 |
| Nexus Storefront Starter | $5/mo | 10 | 150 | 2 |
| Artist Host | $9/mo | 25 | 500 | 6 |
| Artist Collective | $99 setup + $29/mo | 150 | 2,500 | 20 |
| Managed Music Ops | scoped | custom | custom | custom |

Free99 is for learning, testing, and starting. It is not an unlimited public commerce/deploy lane. Paid storefront plans unlock more products, more order intent volume, and SkyeNet publish capacity.

## SkyeCommerce And SkyeNet

If an artist has a Nexus account, SkyeCommerce can attach that Nexus artist ID, Skye ID, email, and Nexus store slug to the storefront. That makes the commerce side and the music side aware of each other.

SkyeNet publishing is deliberately limited by plan. Free99 storefronts can be created and tested, but SkyeNet public storefront publish capacity starts at the paid Storefront Starter tier.

The Music Nexus store API now exposes:

- `GET /api/skymusicnexus/music-store?action=analytics&artistId=...` for artist storefront analytics.
- `POST /api/skymusicnexus/music-store` with `action: "publish-skynet-storefront"` for plan-limited SkyeNet publish intents.
- `POST /api/skymusicnexus/music-store` with `action: "attach-skyecommerce-storefront"` for SkyeCommerce attachment.

The SkyeCommerce merchant command exposes:

- `/api/merchant/onboarding-readiness` for the 0S launch wizard state.
- `/api/music-nexus-link` for the SkyeCommerce-to-Nexus link.
- `/api/merchant-payout-profile`, `/api/merchant-payout-methods`, and `/api/merchant-payout-disbursements` for internal payout readiness.

## Artist Money Boundary

The store does not promise automatic income. It gives artists a cleaner path to sell offers they control:

- digital drops or private access
- merch and limited inventory
- tickets and event passes
- tips and memberships
- booking or custom service requests

SkyPay can collect the buyer payment. The platform records which artist/store/order the money belongs to, then payout review tracks what is owed after refunds, chargebacks, taxes, platform fees, paperwork holds, rights holds, and owner approval.
