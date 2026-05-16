# Legal Brain Sync Guide

The brain at `brain/legal-sync.json` mirrors the live legal center at [solenterprises.org](https://solenterprises.org/).

## When to sync

Update this file any time you change policies on the legal site — new terms, updated privacy policy, added agreements, changed contact info, etc.

## How to sync

1. Open `brain/legal-sync.json`
2. Find the chunk whose `heading` matches what changed (e.g. `"Master Terms of Service"`, `"Enterprise Privacy Policy"`, etc.)
3. Edit the `text` field to match the updated content / URLs
4. Update `"last_synced"` to today's date
5. Save — the brain picks it up automatically on next load (no rebuild needed)

## Chunk map — what each chunk covers

| Chunk ID | Heading | URL |
|---|---|---|
| legalskyes-001 | Legal Center Overview | https://solenterprises.org/ |
| legalskyes-002 | Master Terms of Service | https://solenterprises.org/legal/terms/ |
| legalskyes-003 | Enterprise Privacy Policy | https://solenterprises.org/legal/privacy/ |
| legalskyes-004 | AI Terms and Transparency | https://solenterprises.org/legal/ai-terms/ |
| legalskyes-005 | SMS Communications | https://solenterprises.org/legal/sms-communications/ |
| legalskyes-006 | DMCA and IP | https://solenterprises.org/legal/dmca-ip/ |
| legalskyes-007 | Enterprise MSA and SaaS | https://solenterprises.org/legal/enterprise-msa/ |
| legalskyes-008 | Payments, Refunds, Subscriptions | https://solenterprises.org/legal/payments-refunds/ |
| legalskyes-009 | Acceptable Use and Community | https://solenterprises.org/legal/acceptable-use/ |
| legalskyes-010 | Full Legal Hub Index | https://solenterprises.org/legal/ |
| legalskyes-011 | Cookie Policy and Security | https://solenterprises.org/legal/cookie-policy/ |
| legalskyes-012 | Sync Instructions (meta) | — |

## Adding a new policy page

Add a new object to the `chunks` array in `legal-sync.json`:

```json
{
  "id": "legalskyes-013",
  "source": "brain/legal-sync.json",
  "title": "Skyes Over London Legal Center",
  "heading": "Your New Policy Name",
  "text": "Plain-language summary of the policy. Include the URL: https://solenterprises.org/legal/your-page/. Include key facts the brain should surface when asked."
}
```

## Brain routing

Legal queries automatically route a +5 boost in the brain scorer for terms: `legal`, `privacy`, `terms`, `dmca`, `sms`, `cookie`, `refund`, `enterprise msa`, `acceptable use`, `ai terms`, `solenterprises`, `legal center`, `skyes over london`.

All compliance decisions should still route through **Julian Mercer (Legal & Compliance Cabinet)** — the brain informs, it does not replace counsel.
