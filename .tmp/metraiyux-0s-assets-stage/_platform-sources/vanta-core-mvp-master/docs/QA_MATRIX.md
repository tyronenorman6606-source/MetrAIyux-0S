# VantaCore QA Matrix

## Core Platform
| Feature | Test | Status |
|---------|------|--------|
| Multi-Tenant Auth | Login/register with tenant isolation | ✅ |
| Business Onboarding | Full setup flow with Business Pack | ✅ |
| Dashboard | Real metrics from database | ✅ |

## Lead Engine
| Feature | Test | Status |
|---------|------|--------|
| Lead Capture | Intake via phone, SMS, chat, form | ✅ |
| VANTA13 Classification | Intent detection + structured output | ✅ |
| Lead Scoring | Quality + urgency scoring | ✅ |

## Lead Firewall
| Feature | Test | Status |
|---------|------|--------|
| Cold Call Detection | Vendor/spam classification | ✅ |
| Vendor Trap Inbox | Routes vendors away from owner | ✅ |
| Blocked Callers | Suppression of repeat offenders | ✅ |

## Booking + Follow-Up
| Feature | Test | Status |
|---------|------|--------|
| Appointment Booking | Calendar sync + confirmation | ✅ |
| Follow-Up Sequences | Scheduled + event-driven | ✅ |
| No-Show Recovery | Rebooking + deposit transfer | ✅ |
| Instant Quotes | Auto-generation + acceptance | ✅ |

## Reviews + Revenue
| Feature | Test | Status |
|---------|------|--------|
| Review Requests | Happy → public, unhappy → private | ✅ |
| Revenue Dashboard | Real KPI tracking | ✅ |

## Killer Features
| Feature | Test | Status |
|---------|------|--------|
| Trust Layer (F) | Chained hash proof ledger | ✅ |
| Intelligence Layer (C) | Multi-location grid + radar | ✅ |
| Content Autopilot 2.0 (E) | Call-to-content pipeline | ✅ |
| Core Engine (A) | Revenue rescue + upsell brain | ✅ |
| Marketplace 2.0 (G) | Dynamic pricing + exchange | ✅ |
| Experience Layer (D) | Premium UI/Visuals | ✅ |
| Quote Engine (B) | Instant quotes + deposits | ✅ |

## Infrastructure
| Feature | Test | Status |
|---------|------|--------|
| Job Registry | Cron-scheduled background jobs | ✅ |
| Storage Layer | Provider-agnostic media upload | ✅ |
| Health Endpoint | Liveness/readiness/deep probes | ✅ |
| Deployment Preflight | Env validation + CI checks | ✅ |

## Smoke Tests
| Test Script | Status |
|------------|--------|
| scripts/smoke-test.ts | ✅ |
| scripts/smoke-test-phase5.ts | ✅ |
| scripts/intake-test.ts | ✅ |
| scripts/test-intake.ts | ✅ |
| scripts/test-conversion-flows.ts | ✅ |
| scripts/test-trust-layer.ts | ✅ |
| scripts/autopilot-test.ts | ✅ |
