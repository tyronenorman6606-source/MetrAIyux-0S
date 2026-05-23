# Skyes Over London Legal Fortress — Drop Ready

This is a branded static legal center for Skyes Over London LC, ready for Netlify Drop or Git deployment.

## Deploy
1. Upload this ZIP directly to Netlify Drop, or unzip and drag the folder.
2. Attach `solenterprises.org`.
3. Verify:
   - `https://skyes-over-london-legal.pages.dev/legal/`
   - `https://skyes-over-london-legal.pages.dev/legal/metraiyux-0s/`
   - `https://skyes-over-london-legal.pages.dev/legal/terms/`
   - `https://skyes-over-london-legal.pages.dev/legal/privacy/`
   - `https://skyes-over-london-legal.pages.dev/legal/ai-terms/`
   - `https://skyes-over-london-legal.pages.dev/legal/sms-communications/`
   - `https://skyes-over-london-legal.pages.dev/sms-consent/`
   - `https://skyes-over-london-legal.pages.dev/contact/`

## Included legal coverage
- Master Terms
- Privacy
- SMS, calls, and communications
- Acceptable Use
- AI Product Terms
- AI Transparency
- SaaS Platform Terms
- Client Services Terms
- Payments and Refunds
- Subscription Cancellation
- Marketplace and Commerce
- Delivery and Logistics
- Creator, Artist, and Media
- User Content and Community
- API and Developer
- Beta / Early Access
- DMCA and IP
- Security Reporting
- Data Processing Addendum
- Service Level Policy
- Affiliate and Referral
- Vendor / Contractor
- Cookie Policy
- Child Safety
- Accessibility
- Dispute Resolution / Arbitration / Class Waiver
- Enterprise MSA terms

## Smoke
Run:

`node smoke.mjs`

Expected proof:

`LEGAL_FORTRESS_DROP_READY_SMOKE_PASS`

## Important
This reduces legal exposure but cannot make a company impossible to sue. Attorney review is still required before major revenue, regulated industries, international expansion, child-directed products, finance, healthcare, employment, or high-volume telecom.


## Styling polish pass

This version fixes the menu-overlap problem by making the primary header non-sticky, rebuilding the navigation as responsive pill controls, constraining the legal layout columns, converting the legal table of contents to an inline chip menu on narrower screens, and adding long-text wrapping safeguards.

Expected proof:

`LEGAL_FORTRESS_POLISHED_DROP_READY_SMOKE_PASS`


## Global card-grid bleed fix

This version fixes the actual overlap issue shown on legal pages. The legal section menu used the global `.card` class, and `.card { grid-column: span 4; }` was bleeding into the legal page grid. The sidebar now has forced legal-layout placement, the document body is locked to the correct column, and the whole legal layout collapses safely on smaller screens.

Expected proof:

`LEGAL_FORTRESS_FIXED_LAYOUT_DROP_READY_SMOKE_PASS`


## Full-screen width pass

This version uses the full browser width instead of locking the legal pages inside a narrow centered container. Legal pages now use small viewport gutters, a controlled sidebar, and a fluid terms body that fills the available screen.

Expected proof:

`LEGAL_FORTRESS_FULLSCREEN_DROP_READY_SMOKE_PASS`
