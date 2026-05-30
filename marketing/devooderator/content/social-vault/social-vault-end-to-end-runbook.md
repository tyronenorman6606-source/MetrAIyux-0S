# Social Vault End-to-End Runbook

This is the operating pass for using the DevodeRator Social Vault as a real posting machine.

## Daily Flow

1. Open the live Social Vault.
2. Use the Daily Calendar workbench or `platform-app-posting-calendar.csv` to pick today's app.
3. Copy the matching campaign, ad variant, or short-video block.
4. Download the matching PNG card from `assets/social/generated/platforms/`.
5. Post the primary channel first.
6. Cross-post to the two secondary channels with a shorter caption.
7. Save public post URLs, replies, leads, objections, or DMs into `platform-app-posting-log-template.csv`.

## Proof Boundary

Do not post bearer tokens, admin codes, signed owner URLs, raw env values, private proof routes, screenshots with private dashboards, client credentials, or unverified metrics. If a route is gated, say it is a 0S/gated owner route. If proof was not browser-verified by Codex, say owner browser verification is manual.

## Channel Translation

- LinkedIn: use the full longform block, keep the architecture explanation, end with one CTA.
- Instagram/Facebook: use the caption plus carousel slides; pair with the PNG card.
- X: use the thread. Keep each post narrow and concrete.
- Reddit/community: lead with the discussion question, not the sale.
- Facebook groups: use the problem/solution angle and remove heavy internal terms.

## Weekly Rhythm

- Monday: launch one platform/app lane.
- Tuesday: proof or recovery angle from the same lane.
- Wednesday: audience pain point and practical use case.
- Thursday: repost as a short thread or carousel.
- Friday: invite comments, questions, or DMs.

## What To Track

- Which app got posted.
- Which visual was used.
- Which channel got comments.
- Which CTA got replies.
- Which objections repeated.
- Which app deserves a deeper landing page or case study next.

## Tracker Files

- `platform-app-posting-log-template.csv`: spreadsheet-ready campaign tracker.
- `platform-app-posting-log-template.md`: markdown tracker for manual notes.
- `platform-app-quick-launch-index.json`: structured index with PNG, CTA, approval label, and anchors.
