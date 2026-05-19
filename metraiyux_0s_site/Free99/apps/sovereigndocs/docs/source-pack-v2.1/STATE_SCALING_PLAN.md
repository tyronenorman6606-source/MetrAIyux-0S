# State Scaling Plan

## Current state

Every template has generated records for all 50 states plus D.C.

## Next phase

Add optional state-specific override files:

```txt
template-library/_state-overrides/
  US-AZ/
    real-estate-property/residential-lease-agreement.json
  US-CA/
    employment-hr/separation-agreement.json
```

An override should only contain reviewed jurisdiction-specific differences:

```json
{
  "base_id": "real-estate-property/residential-lease-agreement",
  "jurisdiction_id": "US-AZ",
  "reviewed_by": "Attorney or compliance reviewer name",
  "reviewed_at": "YYYY-MM-DD",
  "state_specific_law_included": true,
  "override_sections": []
}
```

## Do not fake state law

If a record is not reviewed, keep the generic state overlay and leave the review flag active.
