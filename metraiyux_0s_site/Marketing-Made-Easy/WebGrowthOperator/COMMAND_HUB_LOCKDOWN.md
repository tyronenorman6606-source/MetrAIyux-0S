# AE Command Hub Lockdown Instructions

The `/ae-command-hub/` and `/operator-playbook/` folders are internal pages. They include sales scripts, discovery prompts, compensation planning, objection handling, fulfillment SOPs, deliverables, reporting rules, and internal operating guidance.

## Included gate
This package includes Netlify Basic Authentication rules in both `_headers` and `netlify.toml`:

```txt
/ae-command-hub/*
  Basic-Auth: skyesadmin:CHANGE_ME_ADMIN_PASSWORD skyesae:CHANGE_ME_AE_PASSWORD

/operator-playbook/*
  Basic-Auth: skyesadmin:CHANGE_ME_ADMIN_PASSWORD skyesae:CHANGE_ME_AE_PASSWORD
```

Before deploy, replace both temporary passwords. Do not deploy with `CHANGE_ME_ADMIN_PASSWORD` or `CHANGE_ME_AE_PASSWORD` unchanged.

## Real security note
Netlify Basic Authentication headers are the intended static-site gate included here. Netlify documents Basic Auth through custom headers for Pro and Enterprise plans. For stronger access control, use Netlify Password Protection, Netlify team login protection, Netlify Identity, Cloudflare Access, or a server-side auth layer.

## Do not expose internally protected URLs
Do not link `/ae-command-hub/` or `/operator-playbook/` from public-facing service pages. They are excluded from public navigation, blocked in `robots.txt`, tagged with `X-Robots-Tag: noindex, nofollow`, and protected by Basic Auth headers.


## Contractor packet lockdown

The onboarding form and Netlify Function are protected by Basic Auth in this package. Replace temporary credentials before deploy. Store contractor packet output in a restricted Google Drive folder. Sensitive payout fields are encrypted into `contractor-payment-profile.encrypted.json`; uploaded W-9 files and IDs remain files in Drive and must be permission-restricted.
