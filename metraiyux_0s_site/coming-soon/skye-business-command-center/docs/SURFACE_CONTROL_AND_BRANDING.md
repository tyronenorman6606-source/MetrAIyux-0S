# Surface Control and Branding Map

This stack is self-hosted, but the attached applications still have their own native login screens. Production should treat those screens as operator-only tools, not customer signup destinations.

## Customer Rule

Customers sign up for the branded platform. They should not be asked to create separate FreeScout, EspoCRM, InvoiceShelf, or Formbricks accounts unless you intentionally sell them an admin/operator seat.

## Surface Map

| Surface | Audience | URL | Rule |
| --- | --- | --- | --- |
| Product site | Public / buyers | `/index.html`, `/pricing.html`, `/demo.html` | Branded, no raw app login links |
| Customer portal | Customers | `/customer-portal.html` | Main customer front door |
| Support request | Customers | `/support.html` | Branded support intake; route internally to support desk |
| Client intake | Customers | `/intake.html` | Branded onboarding; route internally to forms/CRM |
| Billing center | Customers | `/billing.html` | Branded billing explanation; route internally to billing records |
| Operator dashboard | Owner / staff | `/dashboard.html` | Internal launchpad |
| Admin tools | Owner / staff | `/admin-tools.html` | Raw attached app links; private |
| Setup / command / proof | Owner / deployment operator | `/setup.html`, `/command-center.html`, `/proof.html`, `/maintenance.html` | Private deployment and proof surfaces |
| Attached app ports | Owner / staff only | `8081` to `8084` | Bound to localhost by default; protect behind auth/VPN/reverse proxy |

## Production Position

- The attached apps are not external SaaS in this package. They run in the local Docker stack.
- They are still separate applications internally, so their native login screens must be hidden or protected.
- The customer-facing product should be the branded portal.
- Admin users can use the raw tools through `/admin-tools.html` or protected admin subdomains.
- Future production work should add unified auth/provisioning so one platform signup creates the correct customer workspace and internal records.

## Branding Checklist

- Set `PUBLIC_BRAND_NAME`, `PUBLIC_COMPANY_NAME`, support email, and sales email in `.env`.
- Configure native branding inside each internal app after first login.
- Send customers only the branded portal URL.
- Keep operator URLs out of public emails, public pages, and client handoff language unless the user is an admin.
- Bind internal module ports to `127.0.0.1` unless a protected reverse proxy is in front of them.
