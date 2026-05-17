# Security Baseline

## Required before client handoff
- Unique admin credentials per client.
- No default passwords left active.
- HTTPS enabled for all public hostnames.
- SMTP credentials stored in `.env`, not hardcoded.
- Backups stored outside the main app volume when possible.
- Server firewall only exposes needed ports.
- Root SSH password login disabled when possible.
- Staff users receive least-privilege access.
- Client instances are separated unless a real multi-tenant model exists.

## Recommended firewall
Expose 80 and 443 publicly. Restrict SSH to operator IP where possible. Do not expose database ports publicly.

## Data handling
Do not accept regulated health, banking, legal, tax, or payment-card data unless a proper compliance scope is separately designed and contracted.
