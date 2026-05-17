# Operating Cost Sheet

## Single-client serious production

- VPS: $24-$48/month on mainstream VPS providers, or cheaper on cost-optimized providers
- Backups/snapshots: $5-$15/month
- Transactional email: $0-$20/month starting out
- Object storage: $0-$5/month early; grows with file storage
- Domain: $10-$20/year
- Cloudflare DNS/SSL: $0/month basic

Estimated total: $60-$120/month.

## Shared small-client launch

- One 4 vCPU / 8 GB VPS can host several light clients if usage is modest.
- Estimated total: $30-$75/month early.
- Split across 3 clients: roughly $10-$25/client/month infrastructure.
- Split across 10 light clients: roughly $5-$15/client/month infrastructure, but isolation risk rises.

## Recommended customer pricing

- Starter Ops Portal: $497 setup + $99/month
- Business Command Center: $997 setup + $199/month
- Ops Pro: $1,997 setup + $399/month
- Dedicated Instance: $3,500 setup + $750/month

## When to isolate a client

Use a dedicated VPS/client instance when the client has:

- Sensitive customer data
- High ticket/email volume
- Large file/video uploads
- Staff concurrency
- Uptime demands
- Custom modules
- Legal/compliance sensitivity
