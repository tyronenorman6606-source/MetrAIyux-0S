# VantaCore Intelligence Layer

This document describes the data/analytics layer behind Feature Pack C:
**Multi-Location Command Grid** and **Competitor Response Radar**.

## Schema Changes

### `tenants.parentId`
Added a self-referential `parent_id` column to support multi-location business hierarchies (franchises, chains, white-label agencies). Child tenants are discovered via:

```sql
SELECT * FROM tenants WHERE parent_id = $1
```

### `competitor_monitors`
Tracks named competitors per tenant:
- `competitor_name` — Display name
- `url` — Optional URL to monitor
- `type` — `pricing` | `services` | `reviews`
- `last_value` — Snapshot of last observed value
- `status` — `active` | `paused`

### `competitor_alerts`
Stores detected changes:
- `monitor_id` — FK to `competitor_monitors`
- `change_summary` — Human-readable description
- `severity` — `info` | `warning` | `critical`
- `is_read` — Read/unread state

## 1. Multi-Location Command Grid (MLCG)

### Endpoint
`GET /api/intelligence/grid?parentTenantId={uuid}`

### Aggregation Model
Aggregates KPIs across all child tenants linked to a parent tenant.

| Metric | Source | Calculation |
| :--- | :--- | :--- |
| Leads Captured | `leads` | `COUNT(*)` per tenant |
| Booked Leads | `leads` | `COUNT(*)` where `status = 'booked'` |
| Revenue Protected | `jobs` | `SUM(total_amount)` where `status = 'completed'` |
| Calls Answered | `calls` | `COUNT(*)` where `status = 'completed'` |
| Missed Calls Recovered | `audit_logs` | `COUNT(*)` where `action = 'missed_call_recovery_sent'` |
| Cold Calls Blocked | `audit_logs` | `COUNT(*)` where `action = 'block_caller'` |
| Response Time | `messages` + `conversations` | First `contact` message → first `ai`/`user` response, averaged per tenant |
| Conversion Rate | Derived | `(Booked Leads / Total Leads) * 100` |

### Benchmarks
Calculated as simple averages across **active** sibling locations:
- `avgLeads`, `avgRevenue`, `avgConversion`, `avgResponseTime`, `avgCallsAnswered`, `avgColdCallsBlocked`

### Lagging Location Detection
A location is flagged as **Lagging** if:
1. **Response Time** > Benchmark × 1.2 (20% slower than average)
2. **Conversion Rate** < Benchmark × 0.8 (minimum 5 leads to avoid noise)

**Actions on Detection:**
- `isLagging: true` and `lagReasons` array populated
- `owner_alert` created with type `lagging_location`
- Grid generation audited via `audit_logs` (`action: multi_location_grid_generated`)

## 2. Competitor Response Radar (CRR)

### Endpoint
`GET /api/intelligence/radar?tenantId={uuid}`

### Industry Benchmark Model
Compares tenant response time against the industry average derived from all tenants sharing the same `business_profiles.industry`.

**Response Time Calculation:**
Difference in minutes between the first `contact` message and the first subsequent `ai` or `user` response within the same conversation.

**SQL Approach:** Uses portable sub-queries (`MIN(created_at)` per `conversation_id` and `sender_type`) rather than `LAG()` window functions for maximum Postgres provider compatibility.

### Alert Thresholds

| Status | Condition | Action |
| :--- | :--- | :--- |
| **Healthy** | Target ≤ Industry Benchmark | None |
| **Warning** | Target > Benchmark AND ≤ Benchmark × 1.5 | `owner_alert` type `lag_warning` |
| **Critical** | Target > Benchmark × 1.5 | `owner_alert` type `lag_spike` |

### Market Percentile
- **Top 25%**: Target ≤ benchmark
- **Average**: Target within 5m above benchmark
- **Below Average**: Target > 5m above benchmark

### Audit
Every scan is logged to `audit_logs` with:
- `action`: `competitor_radar_scan`
- `input`: `{ industry, tenantResponseTime, industryBenchmark }`
- `result`: `Status: {status}. Gap: {gap}m.`

The audit log ID is returned in the API response as `auditId`.

## 3. Competitor Monitor CRUD

### Endpoint
`GET /api/intelligence/competitors?tenantId={uuid}` — List monitors + alerts
`POST /api/intelligence/competitors` — Create monitor or alert

**POST body for monitor:**
```json
{
  "tenantId": "...",
  "competitorName": "Acme Plumbing",
  "url": "https://acme.com",
  "type": "pricing"
}
```

**POST body for alert:**
```json
{
  "tenantId": "...",
  "action": "alert",
  "monitorId": "...",
  "changeSummary": "Acme lowered drain cleaning to $89",
  "severity": "critical"
}
```

Critical alerts automatically trigger an `owner_alert`.

## Data Integrity & Scaling
- **Tenant Isolation**: All queries enforce strict `tenantId` or `parentId` scoping
- **Query Optimization**: Grouped aggregations avoid N+1 patterns during cross-location analysis
- **Fallback Values**: If no message data exists, defaults to 8-minute industry benchmark and optimistic 90% of benchmark for tenant
- **Audit Immutability**: Every intelligence action is written to `audit_logs`
