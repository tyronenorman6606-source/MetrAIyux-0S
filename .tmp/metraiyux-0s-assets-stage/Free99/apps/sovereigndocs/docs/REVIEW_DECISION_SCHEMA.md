# Review Decision Schema

Local API-mode review decisions are stored in `data/review-decisions.json`. This is an operator workflow and does not equal attorney review.

```json
{
  "id": "uuid",
  "templateId": "US-AZ-...",
  "status": "keep_blocked | prep_worksheet_only | public_gated_draft_after_review | needs_attorney_review",
  "notes": "Short operator note",
  "reviewer": "local-operator",
  "createdAt": "ISO timestamp",
  "session": { "mode": "operator-local-api" }
}
```

Allowed production promotion requires separate proof that the review process exists and is legally safe.
