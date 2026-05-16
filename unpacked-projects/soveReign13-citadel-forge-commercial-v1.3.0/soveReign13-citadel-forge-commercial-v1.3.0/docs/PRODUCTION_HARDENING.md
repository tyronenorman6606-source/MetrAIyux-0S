# Production Hardening

## Before selling access

✅ Put the control plane behind your upstream auth gate.
✅ Keep Forgejo direct registration disabled.
✅ Configure Forgejo OIDC/external auth to the same gate.
✅ Generate and store a Forgejo admin API token for provisioning.
✅ Configure SMTP for Forgejo notifications and control-plane invitation email.
✅ Configure offsite backups for both databases and Forgejo data.
✅ Register at least one runner and prove a real workflow.
✅ Add WAF/rate limiting in front of portal/control/forge.
✅ Decide terms of service, acceptable use, repo content policy, and abuse takedown policy.

## Strong recommended deployment shape

- Forgejo/control-plane on a stable CPU VPS.
- Heavy runners on separate GPU or build machines.
- R2/S3/restic/borg for backups.
- Separate staging instance for upgrades.
- Do not let customer builds run on the same box as the forge database in production.

## Hard truth

You can sell this as a focused sovereign Git forge once auth, payment, backups, and runner proof are live. You should not market it as GitHub-scale global infrastructure. The correct positioning is sovereign GitHub alternative for teams, agencies, creators, local businesses, internal platforms, and customers that want repos/CI/packages without being trapped inside GitHub.
