# Skyes Over London Tracking Implementation

This package includes `js/tracking.js`, which emits consistent browser events for lead forms and CTA clicks. Connect the events to your preferred analytics stack after deployment.

Required launch tasks:

1. Verify the domain in Google Search Console.
2. Verify the domain in Bing Webmaster Tools.
3. Submit `/sitemap.xml` to both platforms.
4. Install GA4 or your analytics provider.
5. Install Microsoft Clarity if you want session recordings and heatmaps.
6. Install Google Ads conversion tracking if paid traffic is active.
7. Install Meta Pixel only when Meta campaigns are active.
8. Configure call tracking for the main phone CTA if call attribution matters.
9. Confirm the intake form emits `lead_submit` and CTA links emit `cta_click`.

Event names included:

- `lead_submit`
- `cta_click`

Public pages should never claim attribution certainty when tracking is incomplete. Reports should clearly separate measured leads, estimated activity, and unknown/offline actions.
