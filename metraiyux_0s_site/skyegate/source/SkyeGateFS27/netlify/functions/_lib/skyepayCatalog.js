import { q } from "./db.js";
import {
  skyePayOfferRequiresOwnerApproval,
  skyePayOrderStatusesForPayment
} from "./skyepayActivation.js";
import { cleanRequestToken } from "./skyepaySecurity.js";
import {
  SKYEMERIT_AUTO_CODE,
  SKYEMERIT_FIRST_TIME_PACK_ID,
  buildSkyeMeritCheckout,
  skyeMeritMetadata
} from "./skyeMerit.js";
import { SKYPAY_REPO_STRIPE_OFFERS } from "./skyepayRepoStripeOffers.js";

const DEFAULT_CURRENCY = "usd";
const DEFAULT_TRIAL_DAYS = 7;

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

function nowIso() {
  return new Date().toISOString();
}

function free99PlatformUsagePolicy({
  paidPlatformLanes = 0,
  paidPlatformsEnabled = false,
  paidRpm = 30,
  paidRpd = 300,
  paidStatus = "requires_standalone_offer_or_owner_approval"
} = {}) {
  const paidEnabled = paidPlatformsEnabled === true;
  const freeBucket = (label, capability, rpm = 30, rpd = 500) => ({
    label,
    capability,
    billable: false,
    enabled: true,
    status: "free99_gated",
    default_rpm_limit: rpm,
    default_rpd_limit: rpd,
    monthly_cap_cents: 0
  });
  const paidBucket = (label, capability) => ({
    label,
    capability,
    billable: true,
    enabled: paidEnabled,
    status: paidEnabled ? "owner_approved_platform_lane" : paidStatus,
    default_rpm_limit: paidRpm,
    default_rpd_limit: paidRpd,
    monthly_cap_cents: null,
    requires_owner_approval: true,
    stripe_rebuild_required: true
  });
  return {
    platform_metering_mode: "shared_wallet_split_by_platform_id",
    default_platform_id: "metraiyux-0s",
    free99_access: ["skyeopsconsole", "still2vid-forge", "mydrive-offline-vault", "skyepics", "brandforge"],
    paid_platform_access: {
      active_lanes_included: paidEnabled ? paidPlatformLanes : 0,
      pending_lane_capacity: paidPlatformLanes,
      status: paidEnabled ? "owner_approved_platform_lanes_available" : paidStatus,
      stripe_rebuild_required: true,
      note: "Moving20s Free99 apps inherit the 0S gate. Provider AI, outbound automation, and JobPing runtime usage require a paid SkyPay lane."
    },
    platform_usage_buckets: {
      "skyeopsconsole": freeBucket("SkyeOpsConsole v2.13", "offline-ops-console"),
      "still2vid-forge": freeBucket("Still2Vid Forge", "offline-media-workbench", 20, 250),
      "mydrive-offline-vault": freeBucket("MyDrive Offline Encrypted Vault", "local-first-private-vault", 20, 250),
      "skyepics": freeBucket("SkyePics Vault", "local-photo-vault", 20, 250),
      "brandforge": freeBucket("BrandForge Free99 Core", "local-campaign-intelligence", 40, 500),
      "brandforge-ai-generation": paidBucket("BrandForge Paid AI Generation", "provider-backed-campaign-generation"),
      "jobping": paidBucket("JobPing Runtime", "job-match-intelligence-and-notification-runtime"),
      "skyeapi-aegiscore": paidBucket("SkyeAPI + AegisCore", "capability-gateway-control-plane"),
      "sovereigndocs": paidBucket("SovereignDocs v20", "document-workflow-exports"),
      "kaixu-codestudio": paidBucket("kAIxU CodeStudio", "provider-backplane-and-code-platform"),
      "skaixu-code-evaluator": paidBucket("skAIxU Code Evaluator", "evaluation-rubric-platform"),
      "skyevaultpro": paidBucket("SkyeVaultPro", "hosted-backup-ai-profile-sync"),
      "doctor-ops-personal-vault": paidBucket("Doctor Ops Personal Vault", "personal-vault-hosted-add-on"),
      "documorph": paidBucket("Documorph", "document-transform-db-platform"),
      "skyearcade": paidBucket("SkyeArcade Sovereign Vault", "member-game-vault"),
      "skyebox-authenticator": {
        label: "SkyeBox Authenticator Vault",
        capability: "local-first-encrypted-authenticator",
        billable: false,
        enabled: false,
        status: "bundle_candidate_requires_owner_approval",
        default_rpm_limit: 10,
        default_rpd_limit: 100,
        monthly_cap_cents: 0
      }
    }
  };
}

function moving20sPaidPolicy({
  policyId,
  paidPlatformId,
  paidLabel,
  paidCapability,
  paidRpm = 20,
  paidRpd = 200,
  monthlyCapCents = 2500
} = {}) {
  const policy = free99PlatformUsagePolicy({
    paidPlatformLanes: 1,
    paidPlatformsEnabled: true,
    paidRpm,
    paidRpd
  });
  const bucket = policy.platform_usage_buckets[paidPlatformId] || {};
  return {
    ...policy,
    policy_id: policyId,
    default_platform_id: paidPlatformId,
    default_rpm_limit: paidRpm,
    default_rpd_limit: paidRpd,
    monthly_cap_cents: monthlyCapCents,
    max_devices_per_key: 3,
    allowed_providers: ["openai", "gemini", "anthropic"],
    allowed_models: {
      openai: ["gpt-4.1-mini", "gpt-4o-mini"],
      gemini: ["gemini-1.5-flash"],
      anthropic: ["claude-3-5-haiku-latest"]
    },
    provider_call_gate: "skyepay_confirmed_entitlement_required",
    paid_platform_access: {
      ...policy.paid_platform_access,
      active_lanes_included: 1,
      pending_lane_capacity: 0,
      status: "skyepay_paid_auto_unlock_after_confirmed_payment",
      stripe_rebuild_required: false,
      note: "Paid provider usage unlocks only after Stripe/SkyePay confirms the order. Free99 core remains gate-owned and no-charge."
    },
    platform_usage_buckets: {
      ...policy.platform_usage_buckets,
      [paidPlatformId]: {
        ...bucket,
        label: paidLabel,
        capability: paidCapability,
        billable: true,
        enabled: true,
        status: "skyepay_paid_active_after_confirmed_payment",
        default_rpm_limit: paidRpm,
        default_rpd_limit: paidRpd,
        monthly_cap_cents: monthlyCapCents,
        requires_owner_approval: false,
        stripe_rebuild_required: false
      }
    }
  };
}

function safeText(value, max = 400) {
  return String(value || "").trim().slice(0, max);
}

function normalizeEmail(value) {
  const email = safeText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function clampTrialDays(value) {
  const days = parseInt(value, 10);
  if (!Number.isFinite(days) || days < 1) return 0;
  return Math.min(days, 730);
}

function sumLineItems(offer, type) {
  return offer.line_items
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
}

function statusText(value, fallback = "approved") {
  return safeText(value || fallback, 80);
}

function objectOrNull(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

const SKYPAY_OFFER_ENRICHMENTS = {
  "metraiyux-starter-command": {
    store_category: "Client app subscriptions",
    store_rank: 10,
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    setup_handling: "paid_pending_owner_approval",
    storefront: true,
    badge: "7-day trial",
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval",
    includes: [
      "Client workspace",
      "Private app closeout",
      "Basic AI command routing",
      "Paid status plus owner-approved activation"
    ],
    gate_policy: {
      monthly_cap_cents: 25000,
      default_rpm_limit: 30,
      default_rpd_limit: 600,
      max_devices_per_key: 2,
      require_install_id: true,
      allowed_providers: ["openai", "gemini"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"]
      },
      vault_storage_mb: 1024,
      vault_file_limit: 250,
      vault_workspace_limit: 1,
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 0, paidRpm: 15, paidRpd: 150 })
    }
  },
  "metraiyux-growth-cabinet": {
    store_category: "Client app subscriptions",
    store_rank: 20,
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    setup_handling: "owner_approved_after_route_scope",
    storefront: true,
    badge: "Growth lane",
    owner_approval_required: true,
    activation_path: "owner_approved_after_route_scope",
    includes: [
      "Recurring workflow routing",
      "Proof exports",
      "Weekly operating rhythm",
      "Paid status plus owner-approved activation"
    ],
    gate_policy: {
      monthly_cap_cents: 75000,
      default_rpm_limit: 90,
      default_rpd_limit: 2500,
      max_devices_per_key: 5,
      require_install_id: true,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"],
        anthropic: ["claude-3-5-sonnet-20241022"]
      },
      vault_storage_mb: 5120,
      vault_file_limit: 1200,
      vault_workspace_limit: 3,
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 1, paidRpm: 30, paidRpd: 600 })
    }
  },
  "agentic-growth-starter": {
    store_category: "Agentic growth",
    store_rank: 24,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "paid_pending_owner_approval",
    storefront: true,
    badge: "No-domain ready",
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval",
    includes: [
      "No-domain preview-site growth cycles",
      "Seed keyword and competitor fallback",
      "Service, location, FAQ, CTA, and internal-link drafts",
      "Static patch manifest proposals"
    ],
    gate_policy: {
      monthly_cap_cents: 75000,
      default_rpm_limit: 60,
      default_rpd_limit: 1500,
      max_devices_per_key: 3,
      require_install_id: true,
      allowed_providers: ["openai", "gemini"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"]
      },
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 1, paidPlatformsEnabled: true, paidRpm: 30, paidRpd: 500 })
    }
  },
  "agentic-growth-connected": {
    store_category: "Agentic growth",
    store_rank: 25,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "owner_approved_after_source_scope",
    storefront: true,
    badge: "Connected market data",
    owner_approval_required: true,
    activation_path: "owner_approved_after_source_scope",
    includes: [
      "GSC, SEMrush, live SERP, keyword, and crawl ingestion",
      "Prioritized developer-agent tasks",
      "Experiment ledger and proof packet",
      "Server-side source pull endpoint"
    ],
    gate_policy: {
      monthly_cap_cents: 150000,
      default_rpm_limit: 120,
      default_rpd_limit: 3500,
      max_devices_per_key: 6,
      require_install_id: true,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"],
        anthropic: ["claude-3-5-sonnet-20241022"]
      },
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 2, paidPlatformsEnabled: true, paidRpm: 45, paidRpd: 900 })
    }
  },
  "agentic-growth-operator": {
    store_category: "Agentic growth",
    store_rank: 26,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "owner_approved_after_adapter_scope",
    storefront: true,
    badge: "Managed operator lane",
    owner_approval_required: true,
    activation_path: "owner_approved_after_adapter_scope",
    includes: [
      "Managed approved auto-apply adapter path",
      "Live browser proof receipts",
      "Monthly site improvement cadence",
      "Owner-reviewed publishing policy"
    ],
    gate_policy: {
      monthly_cap_cents: 250000,
      default_rpm_limit: 180,
      default_rpd_limit: 6000,
      max_devices_per_key: 10,
      require_install_id: true,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"],
        anthropic: ["claude-3-5-sonnet-20241022", "claude-opus-4-6"]
      },
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 3, paidPlatformsEnabled: true, paidRpm: 70, paidRpd: 1500 })
    }
  },
  "valley-verified-app-build-lane": {
    store_category: "Client app subscriptions",
    store_rank: 21,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "owner_approved_after_app_scope",
    storefront: true,
    badge: "Valley app lane",
    owner_approval_required: true,
    activation_path: "owner_approved_after_app_scope",
    includes: [
      "Valley Verified public post",
      "Bob/Empire-style app build scope",
      "Media, forms, QR/share, and proof handoff",
      "0S mount plus owner-approved activation"
    ],
    gate_policy: {
      monthly_cap_cents: 50000,
      default_rpm_limit: 60,
      default_rpd_limit: 1200,
      max_devices_per_key: 3,
      require_install_id: true,
      allowed_providers: ["openai", "gemini"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"]
      },
      vault_storage_mb: 2048,
      vault_file_limit: 500,
      vault_workspace_limit: 1,
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 1, paidPlatformsEnabled: true, paidRpm: 25, paidRpd: 400 })
    }
  },
  "sovereigndocs-legal-review-lane": {
    store_category: "SovereignDocs",
    store_rank: 22,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "paid_held_for_partner_review_owner_release",
    storefront: true,
    badge: "Legal review routing",
    owner_approval_required: true,
    activation_path: "legal_review_checkout_then_operator_triage",
    includes: [
      "SovereignDocs review packet",
      "Vault record before partner routing",
      "Candidate legal partner assignment",
      "Payout ledger after returned work"
    ],
    gate_policy: {
      monthly_cap_cents: 0,
      default_rpm_limit: 20,
      default_rpd_limit: 120,
      max_devices_per_key: 2,
      require_install_id: true,
      vault_storage_mb: 1024,
      vault_file_limit: 250,
      vault_workspace_limit: 1,
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 1, paidPlatformsEnabled: true, paidRpm: 20, paidRpd: 120 })
    }
  },
  "metraiyux-houseoperations-command": {
    store_category: "Client app subscriptions",
    store_rank: 22,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "paid_pending_owner_approval",
    storefront: true,
    badge: "HouseOps lane",
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval",
    includes: [
      "HouseOperations command room",
      "Task/vendor/owner-alert/proof workflows",
      "SkyeBox local authenticator-vault handoff",
      "FS27 PIN Gate handoff",
      "Tutorial and claim-contract proof"
    ],
    gate_policy: {
      monthly_cap_cents: 50000,
      default_rpm_limit: 60,
      default_rpd_limit: 1200,
      max_devices_per_key: 3,
      require_install_id: true,
      allowed_providers: ["openai", "gemini"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"]
      },
      vault_storage_mb: 2048,
      vault_file_limit: 500,
      vault_workspace_limit: 1,
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 0, paidRpm: 20, paidRpd: 250 })
    }
  },
  "metraiyux-houseoperations-managed": {
    store_category: "Client app subscriptions",
    store_rank: 23,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "owner_approved_after_houseops_scope_review",
    storefront: true,
    badge: "Managed HouseOps",
    includes: [
      "Up to 3 HouseOperations command rooms",
      "Managed weekly proof review",
      "3 SkyeBox vault handoffs",
      "Custom FS27 event mirror policy",
      "Operator handoff and billing receipts"
    ],
    gate_policy: {
      monthly_cap_cents: 100000,
      default_rpm_limit: 120,
      default_rpd_limit: 3000,
      max_devices_per_key: 8,
      require_install_id: true,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"],
        anthropic: ["claude-3-5-sonnet-20241022"]
      },
      vault_storage_mb: 10240,
      vault_file_limit: 2500,
      vault_workspace_limit: 3,
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 1, paidRpm: 45, paidRpd: 900 })
    }
  },
  "metraiyux-routex-workforce-command": {
    store_category: "Client app subscriptions",
    store_rank: 25,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "owner_approved_after_route_scope",
    storefront: true,
    badge: "Workforce lane",
    owner_approval_required: true,
    activation_path: "owner_approved_after_route_scope",
    includes: [
      "SkyeRoutexFlow v0.4.0 local proof platform",
      "V83 routed shell",
      "Provider jobs and applicant pools",
      "Contractor assignments and proof",
      "Manual compliance proof vault",
      "Owner-approved activation"
    ],
    gate_policy: {
      monthly_cap_cents: 100000,
      default_rpm_limit: 120,
      default_rpd_limit: 3500,
      max_devices_per_key: 8,
      require_install_id: true,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"],
        anthropic: ["claude-3-5-sonnet-20241022"]
      },
      vault_storage_mb: 10240,
      vault_file_limit: 2500,
      vault_workspace_limit: 3,
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 1, paidRpm: 45, paidRpd: 900 })
    }
  },
  "metraiyux-autonomous-office": {
    store_category: "Client app subscriptions",
    store_rank: 30,
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    setup_handling: "owner_approved_after_sovereign_stack_review",
    storefront: true,
    badge: "Full office",
    owner_approval_required: true,
    activation_path: "owner_approved_after_sovereign_stack_review",
    includes: [
      "Managed operating office",
      "Approval inboxes",
      "Operator digests",
      "Connector readiness"
    ],
    gate_policy: {
      monthly_cap_cents: 150000,
      default_rpm_limit: 180,
      default_rpd_limit: 6000,
      max_devices_per_key: 12,
      require_install_id: true,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"],
        anthropic: ["claude-3-5-sonnet-20241022", "claude-opus-4-6"]
      },
      vault_storage_mb: 20480,
      vault_file_limit: 5000,
      vault_workspace_limit: 8,
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 3, paidRpm: 90, paidRpd: 2000 })
    }
  },
  "metraiyux-enterprise-command": {
    store_category: "Client app subscriptions",
    store_rank: 40,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "owner_approved_after_gate_scope",
    storefront: true,
    badge: "Managed enterprise",
    owner_approval_required: true,
    activation_path: "owner_approved_after_gate_scope",
    includes: [
      "Custom 0S deployment architecture",
      "Managed ConnectLog and Relay13 scope",
      "Custom SkyeRouteX workforce command deployment",
      "Advanced audit exports",
      "Written limits attached after owner-approved activation"
    ]
  },
  "skygatefs27-managed-control-plane": {
    store_category: "SkyePay infrastructure",
    store_rank: 45,
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    setup_handling: "deferred_owner_approval",
    storefront: true,
    badge: "Gate owned",
    includes: [
      "Billing visibility",
      "Usage ledger",
      "Auth clearance",
      "Platform mirroring"
    ],
    gate_policy: {
      monthly_cap_cents: 125000,
      default_rpm_limit: 120,
      default_rpd_limit: 5000,
      max_devices_per_key: 8,
      require_install_id: true,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"],
        anthropic: ["claude-3-5-sonnet-20241022"]
      },
      vault_storage_mb: 10240,
      vault_file_limit: 2500,
      vault_workspace_limit: 5,
      ...free99PlatformUsagePolicy({ paidPlatformLanes: 2, paidRpm: 60, paidRpd: 1500 })
    }
  }
};

function hydratedPolicy(offer, extra) {
  const policy = extra.gate_policy || offer.gate_policy;
  if (!policy) return null;
  return {
    policy_id: `${offer.id}-gate-policy`,
    monthly_cap_cents: Number(policy.monthly_cap_cents || 0),
    default_rpm_limit: Number(policy.default_rpm_limit || 0),
    default_rpd_limit: Number(policy.default_rpd_limit || 0),
    max_devices_per_key: policy.max_devices_per_key ?? null,
    require_install_id: policy.require_install_id === true,
    allowed_providers: Array.isArray(policy.allowed_providers) ? policy.allowed_providers : null,
    allowed_models: policy.allowed_models || null,
    vault_storage_mb: policy.vault_storage_mb ?? null,
    vault_file_limit: policy.vault_file_limit ?? null,
    vault_workspace_limit: policy.vault_workspace_limit ?? null,
    platform_metering_mode: policy.platform_metering_mode || null,
    default_platform_id: policy.default_platform_id || null,
    free99_access: Array.isArray(policy.free99_access) ? policy.free99_access : [],
    paid_platform_access: objectOrNull(policy.paid_platform_access),
    platform_usage_buckets: objectOrNull(policy.platform_usage_buckets),
    relay13_ai: objectOrNull(policy.relay13_ai)
  };
}

function hydrateOffer(offer) {
  const extra = SKYPAY_OFFER_ENRICHMENTS[offer.id] || {};
  const merged = {
    storefront: true,
    store_category: "Ecosystem store",
    store_rank: 500,
    status: "approved",
    ...offer,
    ...extra,
    line_items: offer.line_items
  };
  const trialDays = merged.mode === "subscription" && merged.zero_upfront_trial !== false
    ? clampTrialDays(merged.trial_days || DEFAULT_TRIAL_DAYS)
    : 0;
  return {
    ...merged,
    trial_days: trialDays,
    zero_upfront_trial: trialDays > 0,
    gate_policy: hydratedPolicy(offer, merged)
  };
}

const SKYEMUSICNEXUS_OFFERS = [
  {
    id: "skyemusicnexus-studio",
    plan_name: "skyemusicnexus-studio",
    title: "SkyeMusicNexus Studio",
    family: "skyemusicnexus",
    description: "Paid music ops room for active creators and small teams that need gated upload studio, proof playback, release workflow, royalty ledger tracking, payout review, proof exports, and a basic operator dashboard.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyemusicnexus_studio_setup", "skyemusicnexus_studio_monthly"],
    line_items: [
      { id: "setup", name: "SkyeMusicNexus Studio Setup", amount_cents: cents(1500), type: "one_time", lookup_key: "skyemusicnexus_studio_setup" },
      { id: "monthly", name: "SkyeMusicNexus Studio", amount_cents: cents(497), type: "recurring", interval: "month", lookup_key: "skyemusicnexus_studio_monthly" }
    ],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Music ops",
    store_rank: 31,
    badge: "Music studio",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Gate session required", "Up to 5 artists", "25 active releases", "Gated upload studio", "Uploaded audio proof playback", "Release workflow board", "Royalty ledger tracking", "Payout review queue", "Proof exports"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-label-command",
    plan_name: "skyemusicnexus-label-command",
    title: "SkyeMusicNexus Label Command",
    family: "skyemusicnexus",
    description: "Label-grade music command lane for multi-artist release operations, gated upload studio, SkyeVault/R2 storage scoping, approval workflows, payout review controls, analytics, reporting, and custom proof receipts.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyemusicnexus_label_command_setup", "skyemusicnexus_label_command_monthly"],
    line_items: [
      { id: "setup", name: "SkyeMusicNexus Label Command Setup", amount_cents: cents(6500), type: "one_time", lookup_key: "skyemusicnexus_label_command_setup" },
      { id: "monthly", name: "SkyeMusicNexus Label Command", amount_cents: cents(1497), type: "recurring", interval: "month", lookup_key: "skyemusicnexus_label_command_monthly" }
    ],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Music ops",
    store_rank: 32,
    badge: "Label lane",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Gate session required", "Up to 25 artists", "150 active releases", "Gated upload studio", "Uploaded audio proof playback", "SkyeVault/R2 storage scoping", "Operator/admin stage", "Approval workflows", "Payout review controls", "Custom proof receipts"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-managed-music-ops",
    plan_name: "skyemusicnexus-managed-music-ops",
    title: "SkyeMusicNexus Managed Music Ops",
    family: "skyemusicnexus",
    description: "Managed music operations room with custom artist, release, upload, and storage limits, managed onboarding, team roles, client-facing music ops, custom proof receipts, and owner-approved integration scoping.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyemusicnexus_managed_music_ops_setup", "skyemusicnexus_managed_music_ops_monthly"],
    line_items: [
      { id: "setup", name: "SkyeMusicNexus Managed Music Ops Setup", amount_cents: cents(15000), type: "one_time", lookup_key: "skyemusicnexus_managed_music_ops_setup" },
      { id: "monthly", name: "SkyeMusicNexus Managed Music Ops", amount_cents: cents(3997), type: "recurring", interval: "month", lookup_key: "skyemusicnexus_managed_music_ops_monthly" }
    ],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Music ops",
    store_rank: 33,
    badge: "Managed music",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Gate session required", "Custom artist limits", "Custom release limits", "Custom upload and storage limits", "SkyeVault/R2 storage scoping", "Managed onboarding", "Team roles", "Client-facing music ops room", "Integration scope quoted separately"],
    owner_approval_required: true,
    activation_path: "owner_approved_after_music_scope"
  },
  {
    id: "skyemusicnexus-single-song-drop",
    plan_name: "skyemusicnexus-single-song-drop",
    title: "SkyeMusicNexus Single Song Drop",
    family: "skyemusicnexus",
    description: "One song release capsule, metadata checklist, gated handoff, and proof receipt. No DSP/distributor guarantee is included without separate provider proof.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_single_song_drop"],
    line_items: [{ id: "single-song-drop", name: "SkyeMusicNexus Single Song Drop", amount_cents: cents(199), type: "one_time", lookup_key: "skyemusicnexus_single_song_drop" }],
    store_category: "Music drops",
    store_rank: 34,
    badge: "One song",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["1 release capsule", "Metadata checklist", "Gated handoff", "Proof receipt", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-release-drop-plus",
    plan_name: "skyemusicnexus-release-drop-plus",
    title: "SkyeMusicNexus Release Drop Plus",
    family: "skyemusicnexus",
    description: "Single or multi-track release prep with cover/metadata QA, ops queue, and proof export.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_release_drop_plus"],
    line_items: [{ id: "release-drop-plus", name: "SkyeMusicNexus Release Drop Plus", amount_cents: cents(399), type: "one_time", lookup_key: "skyemusicnexus_release_drop_plus" }],
    store_category: "Music drops",
    store_rank: 35,
    badge: "Release prep",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Release prep", "Cover and metadata QA", "Ops queue", "Proof export", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-ep-drop",
    plan_name: "skyemusicnexus-ep-drop",
    title: "SkyeMusicNexus EP Drop",
    family: "skyemusicnexus",
    description: "Release capsule and proof workflow for up to 6 tracks.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_ep_drop"],
    line_items: [{ id: "ep-drop", name: "SkyeMusicNexus EP Drop", amount_cents: cents(799), type: "one_time", lookup_key: "skyemusicnexus_ep_drop" }],
    store_category: "Music drops",
    store_rank: 36,
    badge: "EP",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Up to 6 tracks", "Release capsule", "Proof workflow", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-album-drop",
    plan_name: "skyemusicnexus-album-drop",
    title: "SkyeMusicNexus Album Drop",
    family: "skyemusicnexus",
    description: "Release capsule and proof workflow for up to 14 tracks.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_album_drop"],
    line_items: [{ id: "album-drop", name: "SkyeMusicNexus Album Drop", amount_cents: cents(1497), type: "one_time", lookup_key: "skyemusicnexus_album_drop" }],
    store_category: "Music drops",
    store_rank: 37,
    badge: "Album",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Up to 14 tracks", "Release capsule", "Proof workflow", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-catalog-import-pack",
    plan_name: "skyemusicnexus-catalog-import-pack",
    title: "SkyeMusicNexus Catalog Import Pack",
    family: "skyemusicnexus",
    description: "Import and structure up to 25 legacy release records.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_catalog_import_pack"],
    line_items: [{ id: "catalog-import", name: "SkyeMusicNexus Catalog Import Pack", amount_cents: cents(299), type: "one_time", lookup_key: "skyemusicnexus_catalog_import_pack" }],
    store_category: "Music add-ons",
    store_rank: 38,
    badge: "Catalog",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Up to 25 release records", "Structured import", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-royalty-ledger-setup",
    plan_name: "skyemusicnexus-royalty-ledger-setup",
    title: "SkyeMusicNexus Royalty Ledger Setup",
    family: "skyemusicnexus",
    description: "Configure a proof-safe royalty ledger view and split notes.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_royalty_ledger_setup"],
    line_items: [{ id: "royalty-ledger", name: "SkyeMusicNexus Royalty Ledger Setup", amount_cents: cents(249), type: "one_time", lookup_key: "skyemusicnexus_royalty_ledger_setup" }],
    store_category: "Music add-ons",
    store_rank: 39,
    badge: "Ledger",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Ledger view", "Split notes", "Proof-safe setup", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-payout-review-pack",
    plan_name: "skyemusicnexus-payout-review-pack",
    title: "SkyeMusicNexus Payout Review Pack",
    family: "skyemusicnexus",
    description: "Prepare a gated payout review packet without moving real funds.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_payout_review_pack"],
    line_items: [{ id: "payout-review", name: "SkyeMusicNexus Payout Review Pack", amount_cents: cents(149), type: "one_time", lookup_key: "skyemusicnexus_payout_review_pack" }],
    store_category: "Music add-ons",
    store_rank: 40,
    badge: "Payout review",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Payout review packet", "No real funds movement", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-artist-profile-buildout",
    plan_name: "skyemusicnexus-artist-profile-buildout",
    title: "SkyeMusicNexus Artist Profile Buildout",
    family: "skyemusicnexus",
    description: "Build one artist profile with core bio, links, and proof fields.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_artist_profile_buildout"],
    line_items: [{ id: "artist-profile", name: "SkyeMusicNexus Artist Profile Buildout", amount_cents: cents(99), type: "one_time", lookup_key: "skyemusicnexus_artist_profile_buildout" }],
    store_category: "Music add-ons",
    store_rank: 41,
    badge: "Profile",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["One artist profile", "Bio and links", "Proof fields", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-social-caption-pack",
    plan_name: "skyemusicnexus-social-caption-pack",
    title: "SkyeMusicNexus Social Caption Pack",
    family: "skyemusicnexus",
    description: "Caption angles, posting prompts, and lightweight social copy for one release or artist milestone.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_social_caption_pack"],
    line_items: [{ id: "social-caption-pack", name: "SkyeMusicNexus Social Caption Pack", amount_cents: cents(99), type: "one_time", lookup_key: "skyemusicnexus_social_caption_pack" }],
    store_category: "Music content",
    store_rank: 42,
    badge: "Captions",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Caption angles", "Posting prompts", "Release or milestone focus", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-cover-canvas-request",
    plan_name: "skyemusicnexus-cover-canvas-request",
    title: "SkyeMusicNexus Cover / Canvas Request",
    family: "skyemusicnexus",
    description: "A gated creative request for cover direction, canvas notes, and proof-safe asset handoff.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_cover_canvas_request"],
    line_items: [{ id: "cover-canvas-request", name: "SkyeMusicNexus Cover / Canvas Request", amount_cents: cents(199), type: "one_time", lookup_key: "skyemusicnexus_cover_canvas_request" }],
    store_category: "Music content",
    store_rank: 43,
    badge: "Cover canvas",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Cover direction", "Canvas notes", "Asset handoff", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-short-form-clip-brief",
    plan_name: "skyemusicnexus-short-form-clip-brief",
    title: "SkyeMusicNexus Short-Form Clip Brief",
    family: "skyemusicnexus",
    description: "Hooks, shot list, caption angle, and creator handoff for a short-form release push.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_short_form_clip_brief"],
    line_items: [{ id: "short-form-clip-brief", name: "SkyeMusicNexus Short-Form Clip Brief", amount_cents: cents(249), type: "one_time", lookup_key: "skyemusicnexus_short_form_clip_brief" }],
    store_category: "Music content",
    store_rank: 44,
    badge: "Short form",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Short-form hooks", "Shot list", "Caption angle", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-release-content-kit",
    plan_name: "skyemusicnexus-release-content-kit",
    title: "SkyeMusicNexus Release Content Kit",
    family: "skyemusicnexus",
    description: "Captions, short-form hooks, asset requests, and release runway tasks generated from the gated exchange.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_release_content_kit"],
    line_items: [{ id: "release-content-kit", name: "SkyeMusicNexus Release Content Kit", amount_cents: cents(499), type: "one_time", lookup_key: "skyemusicnexus_release_content_kit" }],
    store_category: "Music content",
    store_rank: 45,
    badge: "Content kit",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Captions", "Short-form hooks", "Asset requests", "Release runway tasks", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-community-campaign-sprint",
    plan_name: "skyemusicnexus-community-campaign-sprint",
    title: "SkyeMusicNexus Community Campaign Sprint",
    family: "skyemusicnexus",
    description: "Exchange-led release campaign with community prompts, inbox coordination, content runway, and proof receipt.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_community_campaign_sprint"],
    line_items: [{ id: "community-campaign-sprint", name: "SkyeMusicNexus Community Campaign Sprint", amount_cents: cents(899), type: "one_time", lookup_key: "skyemusicnexus_community_campaign_sprint" }],
    store_category: "Music content",
    store_rank: 46,
    badge: "Campaign",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Community prompts", "Inbox coordination", "Content runway", "Proof receipt", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-extra-artist-seat",
    plan_name: "skyemusicnexus-extra-artist-seat",
    title: "SkyeMusicNexus Extra Artist Seat",
    family: "skyemusicnexus",
    description: "Add one recurring artist seat to a paid SkyeMusicNexus plan.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyemusicnexus_extra_artist_seat_monthly"],
    line_items: [{ id: "extra-artist-seat", name: "SkyeMusicNexus Extra Artist Seat", amount_cents: cents(29), type: "recurring", interval: "month", lookup_key: "skyemusicnexus_extra_artist_seat_monthly" }],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Music add-ons",
    store_rank: 42,
    badge: "Artist seat",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["1 extra artist seat", "Paid plan required", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-extra-release-pack",
    plan_name: "skyemusicnexus-extra-release-pack",
    title: "SkyeMusicNexus Extra Release Pack",
    family: "skyemusicnexus",
    description: "Add 25 active release slots to a paid SkyeMusicNexus plan.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyemusicnexus_extra_release_pack_monthly"],
    line_items: [{ id: "extra-release-pack", name: "SkyeMusicNexus Extra Release Pack", amount_cents: cents(99), type: "recurring", interval: "month", lookup_key: "skyemusicnexus_extra_release_pack_monthly" }],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Music add-ons",
    store_rank: 43,
    badge: "Release pack",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["25 active release slots", "Paid plan required", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-gated-audio-vault-pack",
    plan_name: "skyemusicnexus-gated-audio-vault-pack",
    title: "SkyeMusicNexus Gated Audio Vault Pack",
    family: "skyemusicnexus",
    description: "Music-specific SkyeVault/R2 storage lane for larger audio files, proof receipts, and gated handoff. This is storage and proof access, not public streaming licensing.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyemusicnexus_gated_audio_vault_pack_monthly"],
    line_items: [{ id: "gated-audio-vault-pack", name: "SkyeMusicNexus Gated Audio Vault Pack", amount_cents: cents(79), type: "recurring", interval: "month", lookup_key: "skyemusicnexus_gated_audio_vault_pack_monthly" }],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Music add-ons",
    store_rank: 48,
    badge: "Audio vault",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Music-specific vault lane", "Larger audio handoff", "Proof receipts", "Paid plan required", "Gate session required", "No public streaming license claim"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-white-label-artist-portal",
    plan_name: "skyemusicnexus-white-label-artist-portal",
    title: "SkyeMusicNexus White-Label Artist Portal",
    family: "skyemusicnexus",
    description: "Client-facing branded artist portal shell with gated proof handoff.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyemusicnexus_white_label_artist_portal_setup", "skyemusicnexus_white_label_artist_portal_monthly"],
    line_items: [
      { id: "setup", name: "SkyeMusicNexus White-Label Artist Portal Setup", amount_cents: cents(997), type: "one_time", lookup_key: "skyemusicnexus_white_label_artist_portal_setup" },
      { id: "monthly", name: "SkyeMusicNexus White-Label Artist Portal", amount_cents: cents(197), type: "recurring", interval: "month", lookup_key: "skyemusicnexus_white_label_artist_portal_monthly" }
    ],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Music add-ons",
    store_rank: 44,
    badge: "White label",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Branded artist portal shell", "Gated proof handoff", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-provider-integration-proof-lane",
    plan_name: "skyemusicnexus-provider-integration-proof-lane",
    title: "SkyeMusicNexus Provider Integration Proof Lane",
    family: "skyemusicnexus",
    description: "Owner-approved provider, distributor, payment, or identity proof lane before any live integration claim.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyemusicnexus_provider_integration_proof_lane"],
    line_items: [{ id: "integration-proof", name: "SkyeMusicNexus Provider Integration Proof Lane", amount_cents: cents(2500), type: "one_time", lookup_key: "skyemusicnexus_provider_integration_proof_lane" }],
    store_category: "Music add-ons",
    store_rank: 45,
    badge: "Proof lane",
    source_folder: "metraiyux_0s_site/SkyeMusicNexus",
    source_file: "metraiyux_0s_site/data/skyemusicnexus-pricing.json",
    brain_owner: "naomi-sterling-brain",
    includes: ["Provider proof lane", "Owner approval required", "No live claim before proof", "Gate session required"],
    owner_approval_required: true,
    activation_path: "owner_approved_after_provider_scope"
  }
];

export const SKYPAY_OFFERS = [
  {
    id: "brandforge-ai-generation",
    plan_name: "brandforge-ai-generation",
    title: "BrandForge AI Generation Pack",
    family: "moving20s-free99-paid-ai",
    description: "Paid provider-backed campaign generation for the BrandForge app mounted inside the 0S Free99 gate. Local intelligence remains Free99; model calls unlock only after confirmed SkyePay checkout.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    status: "approved",
    storefront: true,
    store_category: "Moving20s paid AI",
    store_rank: 18,
    badge: "Paid AI lane",
    lookup_keys: ["brandforge_ai_generation_pack"],
    line_items: [
      {
        id: "generation_pack",
        name: "BrandForge AI Generation Pack",
        amount_cents: cents(29),
        type: "one_time",
        lookup_key: "brandforge_ai_generation_pack"
      }
    ],
    included_usage: [
      "Provider-backed campaign generation",
      "0S shared gate session required",
      "Metered AI receipts",
      "Post-payment entitlement claim"
    ],
    includes: [
      "AI-generated campaign copy",
      "Landing-page outline",
      "SMS/email variants",
      "Usage receipt ledger"
    ],
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
    gate_policy: moving20sPaidPolicy({
      policyId: "moving20s-brandforge-ai-generation",
      paidPlatformId: "brandforge-ai-generation",
      paidLabel: "BrandForge Paid AI Generation",
      paidCapability: "provider-backed-campaign-generation",
      paidRpm: 12,
      paidRpd: 80,
      monthlyCapCents: 2500
    })
  },
  {
    id: "social-batch-ai-burst",
    plan_name: "social-batch-ai-burst",
    title: "Social Batch Factory AI Burst",
    family: "social-batch-factory-paid-ai",
    description: "Metered AI copy generation for Social Batch Factory. Free99 keeps every local export, proof sheet, ZIP, and brand-kit tool unlocked; model calls unlock only after confirmed SkyePay checkout.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    zero_upfront_trial: false,
    trial_days: 0,
    status: "approved",
    storefront: true,
    store_category: "Social Batch Factory AI",
    store_rank: 18.1,
    badge: "75 AI/month",
    lookup_keys: ["social_batch_ai_burst_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "Social Batch Factory AI Burst",
        amount_cents: cents(19),
        type: "recurring",
        interval: "month",
        lookup_key: "social_batch_ai_burst_monthly"
      }
    ],
    included_usage: [
      "75 gated AI generations per month",
      "0S shared gate session required",
      "SkyGate provider calls only",
      "Metered AI receipts"
    ],
    includes: [
      "Campaign copy variants",
      "Selected-asset headline/subline/CTA refresh",
      "Caption deck support",
      "Usage receipt ledger"
    ],
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
    gate_policy: moving20sPaidPolicy({
      policyId: "social-batch-ai-burst",
      paidPlatformId: "social-batch-ai-burst",
      paidLabel: "Social Batch Factory AI Burst",
      paidCapability: "social-batch-copy-generation",
      paidRpm: 8,
      paidRpd: 75,
      monthlyCapCents: 1900
    })
  },
  {
    id: "social-batch-ai-studio",
    plan_name: "social-batch-ai-studio",
    title: "Social Batch Factory AI Studio",
    family: "social-batch-factory-paid-ai",
    description: "Higher-volume AI copy generation for Social Batch Factory operators who need larger monthly campaign output under the shared 0S gate.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    zero_upfront_trial: false,
    trial_days: 0,
    status: "approved",
    storefront: true,
    store_category: "Social Batch Factory AI",
    store_rank: 18.2,
    badge: "350 AI/month",
    lookup_keys: ["social_batch_ai_studio_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "Social Batch Factory AI Studio",
        amount_cents: cents(49),
        type: "recurring",
        interval: "month",
        lookup_key: "social_batch_ai_studio_monthly"
      }
    ],
    included_usage: [
      "350 gated AI generations per month",
      "0S shared gate session required",
      "SkyGate provider calls only",
      "Metered AI receipts"
    ],
    includes: [
      "Campaign copy variants",
      "Caption deck support",
      "Asset-level rewrite assistance",
      "Usage receipt ledger"
    ],
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
    gate_policy: moving20sPaidPolicy({
      policyId: "social-batch-ai-studio",
      paidPlatformId: "social-batch-ai-studio",
      paidLabel: "Social Batch Factory AI Studio",
      paidCapability: "social-batch-high-volume-copy-generation",
      paidRpm: 15,
      paidRpd: 350,
      monthlyCapCents: 4900
    })
  },
  {
    id: "social-batch-ai-unlimited",
    plan_name: "social-batch-ai-unlimited",
    title: "Social Batch Factory AI Unlimited",
    family: "social-batch-factory-paid-ai",
    description: "Unlimited paid Social Batch Factory AI generation lane, still routed through the shared FS27/SkyGate provider gateway with usage receipts and no provider keys in the app UI.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    zero_upfront_trial: false,
    trial_days: 0,
    status: "approved",
    storefront: true,
    store_category: "Social Batch Factory AI",
    store_rank: 18.3,
    badge: "Unlimited AI",
    lookup_keys: ["social_batch_ai_unlimited_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "Social Batch Factory AI Unlimited",
        amount_cents: cents(99),
        type: "recurring",
        interval: "month",
        lookup_key: "social_batch_ai_unlimited_monthly"
      }
    ],
    included_usage: [
      "Unlimited gated AI generation lane",
      "0S shared gate session required",
      "SkyGate provider calls only",
      "Metered AI receipts"
    ],
    includes: [
      "Unlimited campaign copy generation lane",
      "Caption deck support",
      "Asset-level rewrite assistance",
      "Usage receipt ledger"
    ],
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
    gate_policy: moving20sPaidPolicy({
      policyId: "social-batch-ai-unlimited",
      paidPlatformId: "social-batch-ai-unlimited",
      paidLabel: "Social Batch Factory AI Unlimited",
      paidCapability: "social-batch-unlimited-copy-generation",
      paidRpm: 30,
      paidRpd: 2000,
      monthlyCapCents: 9900
    })
  },
  {
    id: "jobping-runtime",
    plan_name: "jobping-runtime",
    title: "JobPing Runtime",
    family: "moving20s-jobping",
    description: "JobPing's paid runtime lane for AI job-fit analysis, candidate/job matching, next-step planning, and notification-ready outputs under the shared 0S gate.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    zero_upfront_trial: false,
    trial_days: 0,
    status: "approved",
    storefront: true,
    store_category: "Moving20s paid apps",
    store_rank: 19,
    badge: "Own pricing",
    lookup_keys: ["jobping_runtime_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "JobPing Runtime",
        amount_cents: cents(97),
        type: "recurring",
        interval: "month",
        lookup_key: "jobping_runtime_monthly"
      }
    ],
    included_usage: [
      "AI job-fit analysis",
      "Candidate/job matching output",
      "0S shared gate session required",
      "Metered paid runtime receipts"
    ],
    includes: [
      "Match score and fit reasons",
      "Risk/gap notes",
      "Outreach draft",
      "Usage receipt ledger"
    ],
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
    gate_policy: moving20sPaidPolicy({
      policyId: "moving20s-jobping-runtime",
      paidPlatformId: "jobping",
      paidLabel: "JobPing Runtime",
      paidCapability: "job-match-intelligence-and-notification-runtime",
      paidRpm: 10,
      paidRpd: 120,
      monthlyCapCents: 3500
    })
  },
  {
    id: "metraiyux-starter-command",
    plan_name: "starter-command",
    title: "Starter Command",
    family: "metraiyux",
    description: "A managed starter operating room for preview clients who are ready to keep the app after confirmed SkyePay checkout and owner-approved workspace activation.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["metraiyux_starter_command_setup", "metraiyux_starter_command_monthly"],
    line_items: [
      {
        id: "setup",
        name: "MetrAIyux 0S - Starter Command Setup",
        amount_cents: cents(1500),
        type: "one_time",
        lookup_key: "metraiyux_starter_command_setup"
      },
      {
        id: "monthly",
        name: "MetrAIyux 0S - Starter Command",
        amount_cents: cents(397),
        type: "recurring",
        interval: "month",
        lookup_key: "metraiyux_starter_command_monthly"
      }
    ],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "metraiyux-growth-cabinet",
    plan_name: "growth-cabinet",
    title: "Growth Cabinet",
    family: "metraiyux",
    description: "A stronger company operating room for clients who need recurring workflow routing, proof exports, and weekly operating rhythm.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["metraiyux_growth_cabinet_setup", "metraiyux_growth_cabinet_monthly"],
    line_items: [
      {
        id: "setup",
        name: "MetrAIyux 0S - Growth Cabinet Setup",
        amount_cents: cents(3500),
        type: "one_time",
        lookup_key: "metraiyux_growth_cabinet_setup"
      },
      {
        id: "monthly",
        name: "MetrAIyux 0S - Growth Cabinet",
        amount_cents: cents(997),
        type: "recurring",
        interval: "month",
        lookup_key: "metraiyux_growth_cabinet_monthly"
      }
    ],
    owner_approval_required: true,
    activation_path: "owner_approved_after_route_scope"
  },
  {
    id: "agentic-growth-starter",
    plan_name: "agentic-growth-starter",
    title: "Agentic Growth Layer Starter",
    family: "agentic-growth",
    description: "No-domain and preview-site agentic growth cycles for clients who need market-driven site improvements before Search Console exists. Generates service, location, FAQ, CTA, internal-link, and patch proposals behind review gates.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    status: "approved",
    storefront: true,
    store_category: "Agentic growth",
    store_rank: 24,
    badge: "No-domain ready",
    lookup_keys: ["agentic_growth_starter_setup", "agentic_growth_starter_monthly"],
    line_items: [
      {
        id: "setup",
        name: "Agentic Growth Starter Setup",
        amount_cents: cents(1500),
        type: "one_time",
        lookup_key: "agentic_growth_starter_setup"
      },
      {
        id: "monthly",
        name: "Agentic Growth Starter",
        amount_cents: cents(497),
        type: "recurring",
        interval: "month",
        lookup_key: "agentic_growth_starter_monthly"
      }
    ],
    included_usage: [
      "No-domain fallback cycles",
      "Seed keyword and competitor mapping",
      "Static patch manifest proposals",
      "0S/FS27 gate-owned activation"
    ],
    includes: [
      "Preview-site growth cycle",
      "Service/location/FAQ draft tasks",
      "CTA and internal-link proposals",
      "Proof-safe review gates"
    ],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "agentic-growth-connected",
    plan_name: "agentic-growth-connected",
    title: "Agentic Growth Layer Connected",
    family: "agentic-growth",
    description: "Connected market-data growth engine for websites with GSC, SEMrush, live SERP, keyword, and crawl signals. Produces prioritized developer-agent tasks, experiment plans, patch manifests, and proof packets.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    status: "approved",
    storefront: true,
    store_category: "Agentic growth",
    store_rank: 25,
    badge: "Connected data",
    lookup_keys: ["agentic_growth_connected_setup", "agentic_growth_connected_monthly"],
    line_items: [
      {
        id: "setup",
        name: "Agentic Growth Connected Setup",
        amount_cents: cents(3500),
        type: "one_time",
        lookup_key: "agentic_growth_connected_setup"
      },
      {
        id: "monthly",
        name: "Agentic Growth Connected",
        amount_cents: cents(1497),
        type: "recurring",
        interval: "month",
        lookup_key: "agentic_growth_connected_monthly"
      }
    ],
    included_usage: [
      "GSC, SEMrush, DataForSEO-style SERP, and crawl ingestion",
      "Key Gate 13th encrypted provider-key custody and credential refs",
      "Recurring opportunity scoring",
      "Developer-agent task contracts",
      "Monthly proof packet"
    ],
    includes: [
      "Connected source pull endpoint",
      "Encrypted provider-key refs through Key Gate 13th",
      "Prioritized improvement roadmap",
      "Experiment ledger",
      "Static-site patch manifests"
    ],
    owner_approval_required: true,
    activation_path: "owner_approved_after_source_scope"
  },
  {
    id: "agentic-growth-operator",
    plan_name: "agentic-growth-operator",
    title: "Agentic Growth Layer Operator",
    family: "agentic-growth",
    description: "Managed operator lane for approved auto-apply adapters, source-pull hardening, browser proof receipts, and monthly improvement cadence. Publishing remains owner-reviewed and proof-gated.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    status: "approved",
    storefront: true,
    store_category: "Agentic growth",
    store_rank: 26,
    badge: "Managed operator",
    lookup_keys: ["agentic_growth_operator_setup", "agentic_growth_operator_monthly"],
    line_items: [
      {
        id: "setup",
        name: "Agentic Growth Operator Setup",
        amount_cents: cents(7500),
        type: "one_time",
        lookup_key: "agentic_growth_operator_setup"
      },
      {
        id: "monthly",
        name: "Agentic Growth Operator",
        amount_cents: cents(2997),
        type: "recurring",
        interval: "month",
        lookup_key: "agentic_growth_operator_monthly"
      }
    ],
    included_usage: [
      "Managed approved adapter path",
      "Key Gate 13th credential rotation, test, revoke, and audit lane",
      "Live browser proof receipts",
      "Monthly growth ledger",
      "Owner-reviewed publish cadence"
    ],
    includes: [
      "Approved auto-apply adapter policy",
      "Source pull monitoring",
      "Browser proof receipts",
      "Monthly site improvement cadence"
    ],
    owner_approval_required: true,
    activation_path: "owner_approved_after_adapter_scope"
  },
  {
    id: "valley-verified-app-build-lane",
    plan_name: "valley-verified-app-build-lane",
    title: "Valley Verified App Build Lane",
    family: "valley-verified",
    description: "Owner-approved Valley Verified lane for a business that wants a public post plus an actual Bob/Empire-style app build with media, routes, forms, QR/share handoff, and proof-backed 0S mounting.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["valley_verified_app_build_setup", "valley_verified_app_build_monthly"],
    line_items: [
      {
        id: "setup",
        name: "Valley Verified App Build Setup",
        amount_cents: cents(2500),
        type: "one_time",
        lookup_key: "valley_verified_app_build_setup"
      },
      {
        id: "monthly",
        name: "Valley Verified App Build Lane",
        amount_cents: cents(497),
        type: "recurring",
        interval: "month",
        lookup_key: "valley_verified_app_build_monthly"
      }
    ],
    owner_approval_required: true,
    activation_path: "owner_approved_after_app_scope"
  },
  {
    id: "sovereigndocs-legal-review-lane",
    plan_name: "sovereigndocs-legal-review-lane",
    title: "SovereignDocs Legal Review Routing Deposit",
    family: "sovereigndocs",
    description: "Upfront SkyePay deposit for a SovereignDocs review packet that must be stored in the vault before operator triage and candidate legal-partner routing. Partner acceptance, attorney-client terms, and payout release remain separate controls.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["sovereigndocs_legal_review_routing_deposit"],
    line_items: [
      {
        id: "legal-review-routing-deposit",
        name: "SovereignDocs Legal Review Routing Deposit",
        amount_cents: cents(299),
        type: "one_time",
        lookup_key: "sovereigndocs_legal_review_routing_deposit"
      }
    ],
    owner_approval_required: true,
    activation_path: "legal_review_checkout_then_operator_triage"
  },
  {
    id: "relay13-ai-response-starter",
    plan_name: "relay13-ai-response-starter",
    title: "Relay13 AI Response Starter",
    family: "relay13",
    description: "Paid add-on that unlocks owner-reviewed AI-generated Relay13 response drafts for a client workspace after Stripe checkout. Local brain triage remains the default path; provider calls stay blocked until the paid add-on is active and capped, and the backup bucket protects traffic spikes before hard stop.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["relay13_ai_response_starter_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "Relay13 AI Response Starter",
        amount_cents: cents(35),
        type: "recurring",
        interval: "month",
        lookup_key: "relay13_ai_response_starter_monthly"
      }
    ],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Messaging add-ons",
    store_rank: 72,
    badge: "AI add-on",
    includes: [
      "Local brain remains default",
      "125 AI response messages/month",
      "31-message backup bucket",
      "No web-search customer chat",
      "Owner approval before customer-facing send"
    ],
    gate_policy: {
      monthly_cap_cents: 3500,
      default_rpm_limit: 12,
      default_rpd_limit: 200,
      allowed_providers: ["openai", "gemini"],
      allowed_models: {
        openai: ["gpt-4o-mini"],
        gemini: ["gemini-2.5-flash"]
      },
      relay13_ai: {
        enabled_after_stripe: true,
        monthly_flat_fee_cents: 3500,
        included_ai_responses_monthly: 125,
        backup_bucket_responses_monthly: 31,
        total_protected_responses_monthly: 156,
        local_brain_first: true,
        default_mode: "draft_only",
        allow_ai_auto_reply_default: false,
        customer_web_search: false,
        provider_call_gate: "paid_addon_required",
        overflow_policy: "use_backup_bucket_then_local_manual_queue",
        activation_steps: [
          "Stripe checkout complete",
          "SkyePay order recorded",
          "Owner approves workspace AI cap",
          "Relay13 guardrails switch from off to draft_only with monthly limit and backup bucket"
        ]
      }
    },
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "relay13-ai-response-plus",
    plan_name: "relay13-ai-response-plus",
    title: "Relay13 AI Response Plus",
    family: "relay13",
    description: "Higher-volume paid Relay13 response lane with owner-reviewed AI drafts, expanded FAQ tuning, priority routing, and a backup bucket before provider calls hard-stop.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["relay13_ai_response_plus_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "Relay13 AI Response Plus",
        amount_cents: cents(79),
        type: "recurring",
        interval: "month",
        lookup_key: "relay13_ai_response_plus_monthly"
      }
    ],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Messaging add-ons",
    store_rank: 73,
    badge: "AI add-on",
    includes: [
      "Local brain remains default",
      "425 AI response messages/month",
      "76-message backup bucket",
      "Priority routing and expanded FAQ tuning",
      "Owner approval before customer-facing send"
    ],
    gate_policy: {
      monthly_cap_cents: 7900,
      default_rpm_limit: 18,
      default_rpd_limit: 400,
      allowed_providers: ["openai", "gemini"],
      allowed_models: {
        openai: ["gpt-4o-mini"],
        gemini: ["gemini-2.5-flash"]
      },
      relay13_ai: {
        enabled_after_stripe: true,
        monthly_flat_fee_cents: 7900,
        included_ai_responses_monthly: 425,
        backup_bucket_responses_monthly: 76,
        total_protected_responses_monthly: 501,
        local_brain_first: true,
        default_mode: "priority_draft_only",
        allow_ai_auto_reply_default: false,
        customer_web_search: false,
        provider_call_gate: "paid_addon_required",
        overflow_policy: "use_backup_bucket_then_local_manual_queue",
        activation_steps: [
          "Stripe checkout complete",
          "SkyePay order recorded",
          "Owner approves workspace AI cap",
          "Relay13 guardrails switch to priority draft mode with usage monitor and backup bucket"
        ]
      }
    },
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "relay13-managed-ai-inbox",
    plan_name: "relay13-managed-ai-inbox",
    title: "Relay13 Managed AI Inbox",
    family: "relay13",
    description: "Managed Relay13 inbox lane where AI triages, labels, drafts, sends allowlisted routine responses, starts follow-up timers, writes ConnectLog summaries, and escalates risky messages to a human.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["relay13_managed_ai_inbox_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "Relay13 Managed AI Inbox",
        amount_cents: cents(149),
        type: "recurring",
        interval: "month",
        lookup_key: "relay13_managed_ai_inbox_monthly"
      }
    ],
    trial_days: 0,
    zero_upfront_trial: false,
    store_category: "Messaging add-ons",
    store_rank: 74,
    badge: "Managed AI inbox",
    includes: [
      "1,000 AI-managed messages/month",
      "222-message backup bucket",
      "Auto-triage and intent labels",
      "Allowlisted routine replies",
      "Follow-up timers and ConnectLog summaries",
      "Human escalation for risky messages"
    ],
    gate_policy: {
      monthly_cap_cents: 14900,
      default_rpm_limit: 24,
      default_rpd_limit: 800,
      allowed_providers: ["openai", "gemini"],
      allowed_models: {
        openai: ["gpt-4o-mini"],
        gemini: ["gemini-2.5-flash"]
      },
      relay13_ai: {
        enabled_after_stripe: true,
        monthly_flat_fee_cents: 14900,
        included_ai_responses_monthly: 1000,
        backup_bucket_responses_monthly: 222,
        total_protected_responses_monthly: 1222,
        local_brain_first: true,
        default_mode: "managed_inbox",
        allow_ai_auto_reply_default: true,
        auto_reply_policy: "allowlisted_routine_only",
        customer_web_search: false,
        provider_call_gate: "paid_addon_required",
        overflow_policy: "use_backup_bucket_then_local_manual_queue",
        managed_actions: [
          "auto_triage",
          "intent_labeling",
          "priority_scoring",
          "policy_allowlisted_auto_reply",
          "follow_up_timer",
          "human_escalation",
          "connectlog_summary"
        ],
        activation_steps: [
          "Stripe checkout complete",
          "SkyePay order recorded",
          "Owner approves managed inbox policy",
          "Relay13 guardrails switch to managed inbox mode with usage monitor and backup bucket"
        ]
      }
    },
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "metraiyux-houseoperations-command",
    plan_name: "houseoperations-command",
    title: "HouseOperations Command",
    family: "metraiyux",
    description: "Paid HouseOperations command room with task, vendor, owner-alert, proof, tutorial, local SkyeBox vault, and FS27 PIN Gate handoff boundaries.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["metraiyux_houseoperations_command_setup", "metraiyux_houseoperations_command_monthly"],
    line_items: [
      {
        id: "setup",
        name: "MetrAIyux 0S - HouseOperations Command Setup",
        amount_cents: cents(2500),
        type: "one_time",
        lookup_key: "metraiyux_houseoperations_command_setup"
      },
      {
        id: "monthly",
        name: "MetrAIyux 0S - HouseOperations Command",
        amount_cents: cents(497),
        type: "recurring",
        interval: "month",
        lookup_key: "metraiyux_houseoperations_command_monthly"
      }
    ],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "metraiyux-houseoperations-managed",
    plan_name: "houseoperations-managed",
    title: "HouseOperations Managed",
    family: "metraiyux",
    description: "Managed HouseOperations rollout with weekly proof review, multiple local vault handoffs, event mirror policy, and operator handoff.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["metraiyux_houseoperations_managed_setup", "metraiyux_houseoperations_managed_monthly"],
    line_items: [
      {
        id: "setup",
        name: "MetrAIyux 0S - HouseOperations Managed Setup",
        amount_cents: cents(5000),
        type: "one_time",
        lookup_key: "metraiyux_houseoperations_managed_setup"
      },
      {
        id: "monthly",
        name: "MetrAIyux 0S - HouseOperations Managed",
        amount_cents: cents(997),
        type: "recurring",
        interval: "month",
        lookup_key: "metraiyux_houseoperations_managed_monthly"
      }
    ],
    owner_approval_required: true,
    activation_path: "owner_approved_after_houseops_scope_review"
  },
  {
    id: "metraiyux-routex-workforce-command",
    plan_name: "routex-workforce-command",
    title: "RouteX Workforce Command",
    family: "metraiyux",
    description: "Paid workforce command lane with SkyeRoutexFlow v0.4.0 local proof, V83 routed shell, provider jobs, contractor assignments, proof, payments, route stops, manual compliance vaults, and market reports.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["metraiyux_routex_workforce_command_setup", "metraiyux_routex_workforce_command_monthly"],
    line_items: [
      {
        id: "setup",
        name: "MetrAIyux 0S - RouteX Workforce Command Setup",
        amount_cents: cents(6500),
        type: "one_time",
        lookup_key: "metraiyux_routex_workforce_command_setup"
      },
      {
        id: "monthly",
        name: "MetrAIyux 0S - RouteX Workforce Command",
        amount_cents: cents(1497),
        type: "recurring",
        interval: "month",
        lookup_key: "metraiyux_routex_workforce_command_monthly"
      }
    ],
    owner_approval_required: true,
    activation_path: "owner_approved_after_route_scope"
  },
  {
    id: "metraiyux-autonomous-office",
    plan_name: "autonomous-office",
    title: "Autonomous Office",
    family: "metraiyux",
    description: "The full managed office lane with stronger gate persistence, approval inboxes, operator digests, and connector readiness.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["metraiyux_autonomous_office_setup", "metraiyux_autonomous_office_monthly"],
    line_items: [
      {
        id: "setup",
        name: "MetrAIyux 0S - Autonomous Office Setup",
        amount_cents: cents(7500),
        type: "one_time",
        lookup_key: "metraiyux_autonomous_office_setup"
      },
      {
        id: "monthly",
        name: "MetrAIyux 0S - Autonomous Office",
        amount_cents: cents(2497),
        type: "recurring",
        interval: "month",
        lookup_key: "metraiyux_autonomous_office_monthly"
      }
    ],
    owner_approval_required: true,
    activation_path: "owner_approved_after_sovereign_stack_review"
  },
  {
    id: "metraiyux-enterprise-command",
    plan_name: "enterprise-command",
    title: "Enterprise / Managed Gate",
    family: "metraiyux",
    description: "Base enterprise 0S lane with custom written limits, managed deployment architecture, audit exports, ConnectLog/Relay13 scope, and custom SkyeRouteX workforce command deployment.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["metraiyux_enterprise_setup", "metraiyux_enterprise_monthly"],
    line_items: [
      {
        id: "setup",
        name: "MetrAIyux 0S - Enterprise Setup",
        amount_cents: cents(15000),
        type: "one_time",
        lookup_key: "metraiyux_enterprise_setup"
      },
      {
        id: "monthly",
        name: "MetrAIyux 0S - Enterprise",
        amount_cents: cents(3997),
        type: "recurring",
        interval: "month",
        lookup_key: "metraiyux_enterprise_monthly"
      }
    ],
    owner_approval_required: true,
    activation_path: "owner_approved_after_gate_scope"
  },
  ...SKYEMUSICNEXUS_OFFERS,
  {
    id: "skygatefs27-managed-control-plane",
    plan_name: "skygatefs27-managed",
    title: "SkyeGateFS27 Managed Control Plane",
    family: "skygate",
    description: "Managed gate operations, billing visibility, auth clearance, usage ledger, platform mirroring, and control-plane support.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skygatefs27_managed_gate_onboarding", "skygatefs27_managed_control_plane_monthly"],
    line_items: [
      {
        id: "onboarding",
        name: "SkyeGateFS27 Managed Gate Onboarding",
        amount_cents: cents(12500),
        type: "one_time",
        lookup_key: "skygatefs27_managed_gate_onboarding"
      },
      {
        id: "monthly",
        name: "SkyeGateFS27 Managed Control Plane",
        amount_cents: cents(1250),
        type: "recurring",
        interval: "month",
        lookup_key: "skygatefs27_managed_control_plane_monthly"
      }
    ],
    owner_approval_required: true,
    activation_path: "owner_approved_after_gate_scope"
  },
  {
    id: "skyevault-starter-access",
    plan_name: "skyevault-starter",
    title: "SkyeVault Starter Access",
    family: "skyevault",
    description: "Starter vault access for buyers who need gated files, AI usage, and controlled app-room access behind FS27.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyevault_starter_access_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "SkyeVault Starter Access",
        amount_cents: cents(49),
        type: "recurring",
        interval: "month",
        lookup_key: "skyevault_starter_access_monthly"
      }
    ],
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    store_category: "Vault access",
    store_rank: 110,
    badge: "Vault starter",
    includes: ["1 workspace", "1GB vault", "250 files/month", "Starter gate limits"],
    gate_policy: {
      monthly_cap_cents: 5000,
      default_rpm_limit: 30,
      default_rpd_limit: 500,
      max_devices_per_key: 1,
      require_install_id: true,
      allowed_providers: ["openai", "gemini"],
      allowed_models: {
        openai: ["gpt-4o-mini"],
        gemini: ["gemini-2.5-flash"]
      },
      vault_storage_mb: 1024,
      vault_file_limit: 250,
      vault_workspace_limit: 1
    },
    owner_approval_required: false,
    activation_path: "vault_workspace_auto_provision"
  },
  {
    id: "skyevault-pro-access",
    plan_name: "skyevault-pro",
    title: "SkyeVault Pro Access",
    family: "skyevault",
    description: "Pro vault subscription for active client rooms, stronger daily command volume, and larger sovereign file lanes.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyevault_pro_access_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "SkyeVault Pro Access",
        amount_cents: cents(149),
        type: "recurring",
        interval: "month",
        lookup_key: "skyevault_pro_access_monthly"
      }
    ],
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    store_category: "Vault access",
    store_rank: 120,
    badge: "Vault pro",
    includes: ["3 workspaces", "25GB vault", "1500 files/month", "Pro gate limits"],
    gate_policy: {
      monthly_cap_cents: 15000,
      default_rpm_limit: 90,
      default_rpd_limit: 2500,
      max_devices_per_key: 3,
      require_install_id: true,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"],
        anthropic: ["claude-3-5-sonnet-20241022"]
      },
      vault_storage_mb: 25600,
      vault_file_limit: 1500,
      vault_workspace_limit: 3
    },
    owner_approval_required: false,
    activation_path: "vault_workspace_auto_provision"
  },
  {
    id: "skyevault-command-access",
    plan_name: "skyevault-command",
    title: "SkyeVault Command Access",
    family: "skyevault",
    description: "Command-grade vault access for serious client rooms, higher rate limits, and multi-workspace AI infrastructure.",
    currency: DEFAULT_CURRENCY,
    mode: "subscription",
    lookup_keys: ["skyevault_command_access_monthly"],
    line_items: [
      {
        id: "monthly",
        name: "SkyeVault Command Access",
        amount_cents: cents(499),
        type: "recurring",
        interval: "month",
        lookup_key: "skyevault_command_access_monthly"
      }
    ],
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    store_category: "Vault access",
    store_rank: 130,
    badge: "Vault command",
    includes: ["10 workspaces", "100GB vault", "10000 files/month", "Command gate limits"],
    gate_policy: {
      monthly_cap_cents: 50000,
      default_rpm_limit: 240,
      default_rpd_limit: 10000,
      max_devices_per_key: 10,
      require_install_id: true,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: {
        openai: ["gpt-4o-mini", "gpt-4o"],
        gemini: ["gemini-2.5-flash"],
        anthropic: ["claude-3-5-sonnet-20241022", "claude-opus-4-6"]
      },
      vault_storage_mb: 102400,
      vault_file_limit: 10000,
      vault_workspace_limit: 10
    },
    owner_approval_required: false,
    activation_path: "vault_workspace_auto_provision"
  },
  {
    id: "skyecard-ai-boost-25",
    plan_name: "skyecard-ai-boost",
    title: "SkyeCard AI Boost",
    family: "skyecards",
    description: "A small AI usage credit card for buyers who need more command room usage without changing their subscription.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyecard_ai_boost_25"],
    line_items: [
      {
        id: "ai-boost",
        name: "SkyeCard AI Boost - $30 usage credit",
        amount_cents: cents(25),
        type: "one_time",
        lookup_key: "skyecard_ai_boost_25"
      }
    ],
    store_category: "Usage cards",
    store_rank: 210,
    badge: "$30 credit",
    credits: [{ bucket: "ai_usage", amount_cents: cents(30) }],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyecard-push-pack-49",
    plan_name: "skyecard-push-pack",
    title: "SkyeCard Push Pack",
    family: "skyecards",
    description: "Twelve owner-tracked pushes for deployment, content, QR, PWA, proof, or client app tune-ups.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyecard_push_pack_49"],
    line_items: [
      {
        id: "push-pack",
        name: "SkyeCard Push Pack - 12 pushes",
        amount_cents: cents(49),
        type: "one_time",
        lookup_key: "skyecard_push_pack_49"
      }
    ],
    store_category: "Usage cards",
    store_rank: 220,
    badge: "12 pushes",
    credits: [{ bucket: "pushes", unit_count: 12 }],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyecard-launch-credit-99",
    plan_name: "skyecard-launch-credit",
    title: "SkyeCard Launch Credit",
    family: "skyecards",
    description: "A launch credit card that routes into service or product work for the next serious app push.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyecard_launch_credit_99"],
    line_items: [
      {
        id: "launch-credit",
        name: "SkyeCard Launch Credit - $150 credit",
        amount_cents: cents(99),
        type: "one_time",
        lookup_key: "skyecard_launch_credit_99"
      }
    ],
    store_category: "Usage cards",
    store_rank: 230,
    badge: "$150 credit",
    credits: [{ bucket: "service_credit", amount_cents: cents(150), expires_after_months: 8 }],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyecard-audit-pack-299",
    plan_name: "skyecard-audit-pack",
    title: "SkyeCard Audit Pack",
    family: "skyecards",
    description: "A paid audit and proof pack for buyers who need a clean app scan, closeout notes, and a controlled next move.",
    currency: DEFAULT_CURRENCY,
    mode: "payment",
    lookup_keys: ["skyecard_audit_pack_299"],
    line_items: [
      {
        id: "audit-pack",
        name: "SkyeCard Audit Pack",
        amount_cents: cents(299),
        type: "one_time",
        lookup_key: "skyecard_audit_pack_299"
      }
    ],
    store_category: "Usage cards",
    store_rank: 240,
    badge: "Audit pack",
    credits: [{ bucket: "service_credit", amount_cents: cents(299) }],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  ...SKYPAY_REPO_STRIPE_OFFERS
].map(hydrateOffer);

export const SKYPAY_CLIENTS = {
  "metraiyux-0s": {
    slug: "metraiyux-0s",
    client_name: "MetrAIyux 0S",
    company_name: "MetrAIyux 0S",
    workspace_slug: "metraiyux-0s",
    default_offer_id: "metraiyux-starter-command",
    preview_status: "public_gateway_active",
    free_trial_days: 7,
    included_usage: [
      "Private app preview closeout",
      "Paid status with controlled owner-approved activation",
      "Workspace handoff after SkyePay closeout",
      "FS27 order, usage, and activation ledger"
    ],
    special_offer: "Free preview first. Confirmed SkyePay checkout writes the FS27 plan policy, paid status, and owner approval state before activation.",
    contact: {
      email: "SkyesOverLondonLC@solenterprises.org",
      phone: "(623) 260-7073",
      contact_url: "https://skyesol.netlify.app/contact"
    }
  },
  "valley-verified": {
    slug: "valley-verified",
    client_name: "Valley Verified",
    company_name: "MetrAIyux 0S",
    workspace_slug: "valley-verified",
    default_offer_id: "valley-verified-app-build-lane",
    preview_status: "app_build_lane_ready",
    free_trial_days: 0,
    included_usage: [
      "Valley Verified public post",
      "Bob/Empire-style app-build scope",
      "0S mounted business app lane",
      "Owner-approved activation after app scope"
    ],
    special_offer: "A business can start with a Valley Verified post, then scope an actual app build like Bob's Smoke Shop or Empire Pallets. Payment intent does not auto-activate production work without owner approval.",
    contact: {
      email: "SkyesOverLondonLC@solenterprises.org",
      phone: "(623) 260-7073",
      contact_url: "https://skyesol.netlify.app/contact"
    }
  },
  "metraiyux-0s-skm": {
    slug: "metraiyux-0s-skm",
    client_name: "MetrAIyux 0S - SKM",
    company_name: "MetrAIyux 0S",
    workspace_slug: "connectlog-main",
    default_offer_id: "metraiyux-starter-command",
    preview_status: "skm_house_paid_test_account",
    free_trial_days: 0,
    skye_merit_account_code: "METRAIYUX-0S-SKM",
    included_usage: [
      "House-paid SkyeMerit usage ledger",
      "Relay13 public-site chat workspace",
      "ConnectLog relationship request proof",
      "FS27 messaging lane mirror"
    ],
    special_offer: "Internal SKM account for proving the live 0S chat system before client handoff.",
    contact: {
      email: "SkyesOverLondonLC@solenterprises.org",
      phone: "(623) 260-7073",
      contact_url: "https://skyesol.netlify.app/contact"
    }
  },
  "bobs-smoke-shop": {
    slug: "bobs-smoke-shop",
    client_name: "Bob's Smoke Shop",
    company_name: "Bob's Smoke Shop",
    workspace_slug: "bobs-smoke-shop",
    default_offer_id: "metraiyux-starter-command",
    preview_status: "free_preview_active",
    free_trial_days: 7,
    included_usage: [
      "7 app scans",
      "25 SkyePay and MetrAIyux commands",
      "PWA, QR, SEO, media, link, and copy checks",
      "Paid status with owner-approved activation"
    ],
    special_offer: "Free preview first. If Bob wants to continue, confirmed SkyePay checkout writes the FS27 order, paid status, and owner approval state; discounts still require an approved quote.",
    contact: {
      email: "SkyesOverLondonLC@solenterprises.org",
      phone: "(623) 260-7073",
      contact_url: "https://skyesol.netlify.app/contact"
    }
  },
  "bobs-smoke-shop-skm": {
    slug: "bobs-smoke-shop-skm",
    client_name: "Bob's Smoke Shop - SKM",
    company_name: "Bob's Smoke Shop",
    workspace_slug: "bobs-smoke-shop",
    default_offer_id: "metraiyux-starter-command",
    preview_status: "skm_house_paid_test_account",
    free_trial_days: 0,
    skye_merit_account_code: "BOBS-SMOKE-SHOP-SKM",
    included_usage: [
      "House-paid SkyeMerit usage ledger",
      "Bob client workspace chat test account",
      "Relay13 message persistence proof",
      "FS27 messaging event mirror"
    ],
    special_offer: "Internal SKM test lane. Bob remains a real client workspace while MetrAIyux pays for proof and QA usage.",
    contact: {
      email: "SkyesOverLondonLC@solenterprises.org",
      phone: "(623) 260-7073",
      contact_url: "https://skyesol.netlify.app/contact"
    }
  },
  "empire-pallets": {
    slug: "empire-pallets",
    client_name: "Empire Pallets",
    company_name: "Empire Pallets",
    workspace_slug: "empire-pallets",
    default_offer_id: "metraiyux-starter-command",
    preview_status: "client_preview_active",
    free_trial_days: 7,
    included_usage: [
      "Operations app chat lane",
      "Relay13 workspace conversations",
      "ConnectLog follow-up proof",
      "Paid status with owner-approved activation"
    ],
    special_offer: "Free preview first. Confirmed SkyePay checkout writes the FS27 order, paid status, owner approval state, and usage language.",
    contact: {
      email: "SkyesOverLondonLC@solenterprises.org",
      phone: "(623) 260-7073",
      contact_url: "https://skyesol.netlify.app/contact"
    }
  },
  "empire-pallets-skm": {
    slug: "empire-pallets-skm",
    client_name: "Empire Pallets - SKM",
    company_name: "Empire Pallets",
    workspace_slug: "empire-pallets",
    default_offer_id: "metraiyux-starter-command",
    preview_status: "skm_house_paid_test_account",
    free_trial_days: 0,
    skye_merit_account_code: "EMPIRE-PALLETS-SKM",
    included_usage: [
      "House-paid SkyeMerit usage ledger",
      "Empire client workspace chat test account",
      "Relay13 message persistence proof",
      "FS27 messaging event mirror"
    ],
    special_offer: "Internal SKM test lane. Empire remains a real client workspace while MetrAIyux pays for proof and QA usage.",
    contact: {
      email: "SkyesOverLondonLC@solenterprises.org",
      phone: "(623) 260-7073",
      contact_url: "https://skyesol.netlify.app/contact"
    }
  }
};

export const SKYPAY_PLATFORM_ROUTES = [
  {
    platform_id: "skyegatefs27",
    title: "SkyeGateFS27",
    route: "/index.html",
    default_offer_id: "skygatefs27-managed-control-plane",
    wiring_status: "gate_owned",
    note: "Parent control plane for auth, billing, usage, push, platform events, and SkyePay approval."
  },
  {
    platform_id: "metraiyux-0s",
    title: "MetrAIyux 0S",
    route: "/platforms/metraiyux-0s",
    default_offer_id: "metraiyux-starter-command",
    wiring_status: "wiring_started",
    note: "Canonical company OS offers route into SkyePay closeout after preview proof."
  },
  {
    platform_id: "valley-verified",
    title: "Valley Verified App Build Lane",
    route: "/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane",
    default_offer_id: "valley-verified-app-build-lane",
    wiring_status: "app_build_lane_ready",
    note: "Mounted 0S business network with actual Bob and Empire app examples. Checkout remains owner-approved after app scope."
  },
  {
    platform_id: "sovereigndocs-legal-review",
    title: "SovereignDocs Legal Review Routing",
    route: "/skyepay-store.html?client=metraiyux-0s&offer=sovereigndocs-legal-review-lane",
    default_offer_id: "sovereigndocs-legal-review-lane",
    wiring_status: "checkout_then_operator_triage",
    note: "Upfront review deposit for SovereignDocs vault packet routing. Candidate legal partners stay pending until verification, terms, conflicts, and payout setup are complete."
  },
  {
    platform_id: "relay13-ai-response-addon",
    title: "Relay13 AI Response Starter",
    route: "/skyepay.html?client=metraiyux-0s-skm&offer=relay13-ai-response-starter",
    default_offer_id: "relay13-ai-response-starter",
    wiring_status: "stripe_gate_ready",
    note: "Starter AI response drafts are a paid add-on. Local brain and operator review stay active by default; provider calls stay locked until checkout and owner-approved caps are applied."
  },
  {
    platform_id: "relay13-ai-response-plus",
    title: "Relay13 AI Response Plus",
    route: "/skyepay.html?client=metraiyux-0s-skm&offer=relay13-ai-response-plus",
    default_offer_id: "relay13-ai-response-plus",
    wiring_status: "stripe_gate_ready",
    note: "Higher-volume owner-reviewed response lane with backup bucket protection before provider-call hard stop."
  },
  {
    platform_id: "relay13-managed-ai-inbox",
    title: "Relay13 Managed AI Inbox",
    route: "/skyepay.html?client=metraiyux-0s-skm&offer=relay13-managed-ai-inbox",
    default_offer_id: "relay13-managed-ai-inbox",
    wiring_status: "stripe_gate_ready",
    note: "Managed inbox lane where AI triages, labels, sends allowlisted routine replies, starts follow-up timers, and escalates risky messages."
  },
  {
    platform_id: "brandforge-ai-generation",
    title: "BrandForge Paid AI Generation",
    route: "/skyepay-store.html?client=metraiyux-0s&offer=brandforge-ai-generation",
    default_offer_id: "brandforge-ai-generation",
    wiring_status: "stripe_gate_ready_auto_unlock",
    note: "BrandForge local intelligence stays Free99. Provider-backed generation unlocks only after SkyePay confirms payment and the 0S app claims the entitlement."
  },
  {
    platform_id: "social-batch-factory",
    title: "Social Batch Factory Paid AI",
    route: "/skyepay-store.html?client=metraiyux-0s&offer=social-batch-ai-burst",
    default_offer_id: "social-batch-ai-burst",
    wiring_status: "stripe_gate_ready_auto_unlock",
    note: "Social Batch Factory Free99 exports stay unlocked. Paid AI tiers are metered through the shared FS27/SkyGate provider lane and claimed back inside the 0S-mounted app."
  },
  {
    platform_id: "jobping",
    title: "JobPing Runtime",
    route: "/skyepay-store.html?client=metraiyux-0s&offer=jobping-runtime",
    default_offer_id: "jobping-runtime",
    wiring_status: "stripe_gate_ready_auto_unlock",
    note: "JobPing has its own reserved SkyPay runtime pricing. The 0S surface inherits the shared gate and blocks provider-backed matching until the real runtime is mounted and payment entitlement is confirmed."
  },
  {
    platform_id: "skyeopsconsole",
    title: "SkyeOpsConsole Free99",
    route: "/platforms/free99/skyeopsconsole",
    default_offer_id: "metraiyux-starter-command",
    wiring_status: "free99_gated_no_checkout",
    note: "Free99 core apps remain gate-session protected and meter with billable=false. Provider-backed AI and JobPing runtime usage stay on named SkyPay paid lanes."
  },
  {
    platform_id: "free99-paid-platform-intake",
    title: "Free99 Paid Platform Intake",
    route: "/admin/platform-control?lane=free99-paid-platform-intake",
    default_offer_id: "metraiyux-growth-cabinet",
    wiring_status: "scanned_pending_stripe_rebuild",
    note: "Paid-app zips are inventoried as platform lanes; Stripe SKU rebuild happens after owner-approved pricing and provider-cost review."
  },
  {
    platform_id: "bobs-smoke-shop-preview",
    title: "Bob's Smoke Shop Private Preview",
    route: "/skyepay.html?client=bobs-smoke-shop",
    default_offer_id: "metraiyux-starter-command",
    wiring_status: "client_preview_ready",
    note: "First client lane wired into SkyePay with free preview, paid status, owner approval state, and usage language."
  },
  {
    platform_id: "bobs-smoke-shop-skm",
    title: "Bob's Smoke Shop SKM Test Account",
    route: "/skyepay.html?client=bobs-smoke-shop-skm",
    default_offer_id: "metraiyux-starter-command",
    wiring_status: "skm_house_paid_test_account",
    note: "Bob is both a real client workspace and a house-paid SkyeMerit test account for Relay13/ConnectLog messaging proof."
  },
  {
    platform_id: "empire-pallets-skm",
    title: "Empire Pallets SKM Test Account",
    route: "/skyepay.html?client=empire-pallets-skm",
    default_offer_id: "metraiyux-starter-command",
    wiring_status: "skm_house_paid_test_account",
    note: "Empire is both a real client workspace and a house-paid SkyeMerit test account for Relay13/ConnectLog messaging proof."
  },
  {
    platform_id: "repo-platforms-next",
    title: "Repo Platform Billing Routes",
    route: "/admin/platform-control",
    default_offer_id: "metraiyux-growth-cabinet",
    wiring_status: "next_after_live_proof",
    note: "The next lane maps each repo platform to an approved offer, Stripe-confirmed payment, and controlled activation behavior."
  }
];

export function listSkyePayOffers(client = null) {
  return SKYPAY_OFFERS
    .slice()
    .sort((a, b) => Number(a.store_rank || 999) - Number(b.store_rank || 999))
    .map((offer) => publicOffer(offer, client));
}

export function listSkyePayPlatformRoutes() {
  return SKYPAY_PLATFORM_ROUTES.map((route) => ({ ...route }));
}

export function getSkyePayOffer(id) {
  return SKYPAY_OFFERS.find((offer) => offer.id === safeText(id, 100)) || null;
}

export function getSkyePayClient(slug) {
  const key = safeText(slug || "bobs-smoke-shop", 120).toLowerCase() || "bobs-smoke-shop";
  return SKYPAY_CLIENTS[key] || {
    slug: key,
    client_name: "Private Preview Client",
    company_name: "Private Preview Client",
    workspace_slug: key,
    default_offer_id: "metraiyux-starter-command",
    preview_status: "private_preview",
    free_trial_days: 7,
    included_usage: [
      "Private app preview",
      "Paid status with owner-approved activation",
      "Workspace handoff after closeout"
    ],
    special_offer: "Free preview first. Continued work is confirmed through SkyePay, then paid status and owner approval state are recorded after Stripe confirms the transaction.",
    contact: {
      email: "SkyesOverLondonLC@solenterprises.org",
      phone: "(623) 260-7073",
      contact_url: "https://skyesol.netlify.app/contact"
    }
  };
}

export function resolveSkyePayTrialDays(offer, client = null) {
  if (!offer || offer.mode !== "subscription" || offer.zero_upfront_trial === false) return 0;
  return clampTrialDays(offer.trial_days || client?.free_trial_days || DEFAULT_TRIAL_DAYS);
}

export function publicOffer(offer, client = null) {
  const setup = sumLineItems(offer, "one_time");
  const recurring = sumLineItems(offer, "recurring");
  const trialDays = resolveSkyePayTrialDays(offer, client);
  const todayCents = trialDays > 0 ? 0 : setup + recurring;
  const deferredOneTimeCents = trialDays > 0 ? setup : 0;
  return {
    id: offer.id,
    plan_name: offer.plan_name,
    title: offer.title,
    family: offer.family,
    description: offer.description,
    status: statusText(offer.status),
    storefront: offer.storefront !== false,
    store_category: offer.store_category || "Ecosystem store",
    store_rank: Number(offer.store_rank || 999),
    badge: offer.badge || null,
    currency: offer.currency,
    mode: offer.mode,
    setup_cents: setup,
    recurring_cents: recurring,
    recurring_interval: "month",
    trial_days: trialDays,
    zero_upfront_trial: trialDays > 0,
    today_cents: todayCents,
    post_trial_cents: recurring,
    deferred_one_time_cents: deferredOneTimeCents,
    skyemerit: {
      eligible: true,
      auto_code: SKYEMERIT_AUTO_CODE,
      first_time_pack_id: SKYEMERIT_FIRST_TIME_PACK_ID,
      discountable_cents: trialDays > 0 ? 0 : offer.mode === "subscription" ? setup : setup + recurring,
      no_stripe_promo_stack_when_applied: true,
      gate_required: true
    },
    setup_handling: trialDays > 0 && setup > 0 ? (offer.setup_handling || "deferred_owner_approval") : null,
    price_summary: trialDays > 0
      ? `${offer.status === "approved_floor" ? "starts at " : ""}$0 today, then ${recurring ? `$${Math.round(recurring / 100).toLocaleString("en-US")}/mo` : "confirmed continuation"} after ${trialDays} days`
      : `${offer.status === "approved_floor" ? "starts at " : ""}${setup + recurring ? `$${Math.round((setup + recurring) / 100).toLocaleString("en-US")} today` : "Owner-approved"}`,
    price_label: offer.price_label || null,
    catalog_source: offer.catalog_source || null,
    source_folder: offer.source_folder || null,
    source_file: offer.source_file || null,
    brain_owner: offer.brain_owner || null,
    catalog_note: offer.catalog_note || null,
    includes: Array.isArray(offer.includes) ? offer.includes.slice(0, 8) : [],
    credits: Array.isArray(offer.credits) ? offer.credits : [],
    gate_policy: offer.gate_policy || null,
    rate_limits: offer.gate_policy ? {
      rpm: offer.gate_policy.default_rpm_limit || null,
      rpd: offer.gate_policy.default_rpd_limit || null,
      monthly_cap_cents: offer.gate_policy.monthly_cap_cents || null,
      max_devices_per_key: offer.gate_policy.max_devices_per_key || null,
      vault_storage_mb: offer.gate_policy.vault_storage_mb || null,
      vault_file_limit: offer.gate_policy.vault_file_limit || null,
      vault_workspace_limit: offer.gate_policy.vault_workspace_limit || null,
      platform_metering_mode: offer.gate_policy.platform_metering_mode || null,
      default_platform_id: offer.gate_policy.default_platform_id || null,
      free99_access: offer.gate_policy.free99_access || [],
      paid_platform_access: offer.gate_policy.paid_platform_access || null,
      platform_usage_buckets: offer.gate_policy.platform_usage_buckets || null,
      relay13_ai: offer.gate_policy.relay13_ai || null
    } : null,
    ai_response_policy: offer.gate_policy?.relay13_ai ? {
      monthly_limit: offer.gate_policy.relay13_ai.included_ai_responses_monthly || null,
      backup_bucket: offer.gate_policy.relay13_ai.backup_bucket_responses_monthly || null,
      total_protected_messages: offer.gate_policy.relay13_ai.total_protected_responses_monthly || null,
      local_brain_first: offer.gate_policy.relay13_ai.local_brain_first !== false,
      owner_review_required: offer.owner_approval_required === true,
      allowlisted_auto_replies: offer.gate_policy.relay13_ai.allow_ai_auto_reply_default === true,
      mode: offer.gate_policy.relay13_ai.default_mode || null,
      auto_reply_policy: offer.gate_policy.relay13_ai.auto_reply_policy || null,
      overflow_policy: offer.gate_policy.relay13_ai.overflow_policy || null,
      provider_calls_hard_stop_after_backup: offer.gate_policy.relay13_ai.overflow_policy === "use_backup_bucket_then_local_manual_queue"
    } : null,
    line_items: offer.line_items.map((item) => ({
      id: item.id,
      name: item.name,
      amount_cents: item.amount_cents,
      type: item.type,
      interval: item.interval || null,
      lookup_key: item.lookup_key
    })),
    owner_approval_required: offer.owner_approval_required,
    activation_path: offer.activation_path
  };
}

export function buildStripeLineItems(offer, client, options = {}) {
  const trialDays = clampTrialDays(options.trialDays || 0);
  const checkoutItems = offer.mode === "subscription" && trialDays > 0
    ? offer.line_items.filter((item) => item.type === "recurring")
    : offer.line_items;

  return checkoutItems.map((item) => buildStripeLineItemFromPriceData({ item, offer, client, trialDays }));
}

function buildStripeLineItemFromPriceData({ item, offer, client, trialDays }) {
  const adjustedName = item.skyemerit_adjusted
    ? `${item.name} - SkyeMerit adjusted`
    : item.name;
  const priceData = {
    currency: offer.currency || DEFAULT_CURRENCY,
    unit_amount: item.amount_cents,
    product_data: {
      name: adjustedName,
      metadata: {
        skyepay: "true",
        offer_id: offer.id,
        client_slug: client.slug,
        lookup_key: item.lookup_key || "",
        offer_family: offer.family,
        skyemerit_adjusted: String(item.skyemerit_adjusted === true),
        skyemerit_original_amount_cents: String(item.skyemerit_original_amount_cents || item.amount_cents || 0),
        skyemerit_discount_cents: String(item.skyemerit_discount_cents || 0),
        store_category: safeText(offer.store_category, 80),
        zero_upfront_trial: String(trialDays > 0),
        source_folder: safeText(offer.source_folder || "SkyeGateFS27", 180),
        source_file: safeText(offer.source_file || "SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js", 180),
        catalog_source: safeText(offer.catalog_source || "SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js", 180),
        brain_owner: safeText(offer.brain_owner || "", 120),
        status: statusText(offer.status)
      }
    }
  };

  if (item.type === "recurring") {
    priceData.recurring = { interval: item.interval || "month" };
  }

  return { quantity: 1, price_data: priceData };
}

async function findStripePriceByLookupKey({ stripe, item, offer }) {
  if (!stripe || !item.lookup_key) return null;
  const result = await stripe.prices.list({
    active: true,
    lookup_keys: [item.lookup_key],
    limit: 1
  });
  const price = result?.data?.[0] || null;
  if (!price) return null;

  const amountMatches = Number(price.unit_amount || 0) === Number(item.amount_cents || 0);
  const currencyMatches = String(price.currency || "").toLowerCase() === String(offer.currency || DEFAULT_CURRENCY).toLowerCase();
  const recurrenceMatches = item.type === "recurring"
    ? Boolean(price.recurring)
    : !price.recurring;
  return amountMatches && currencyMatches && recurrenceMatches ? price : null;
}

export async function buildStripeLineItemsWithCatalogPrices({ stripe, offer, client, trialDays = 0, skyeMeritCheckout = null }) {
  const activeTrialDays = clampTrialDays(trialDays || 0);
  const checkoutItems = Array.isArray(skyeMeritCheckout?.line_items)
    ? skyeMeritCheckout.line_items
    : offer.mode === "subscription" && activeTrialDays > 0
      ? offer.line_items.filter((item) => item.type === "recurring")
      : offer.line_items;
  const useLookupKeys = String(process.env.SKYPAY_USE_STRIPE_LOOKUP_KEYS || "true").toLowerCase() !== "false";

  const lineItems = [];
  for (const item of checkoutItems) {
    if (useLookupKeys && !item.skyemerit_adjusted) {
      try {
        const price = await findStripePriceByLookupKey({ stripe, item, offer });
        if (price?.id) {
          lineItems.push({ quantity: 1, price: price.id });
          continue;
        }
      } catch {
        // Keep checkout resilient if a Stripe account has not created lookup-key prices yet.
      }
    }
    lineItems.push(buildStripeLineItemFromPriceData({ item, offer, client, trialDays: activeTrialDays }));
  }
  return lineItems;
}

export function buildSkyePayMetadata({ client, offer, body = {}, orderId = "", trialDays = 0 }) {
  const setup = sumLineItems(offer, "one_time");
  const recurring = sumLineItems(offer, "recurring");
  const activeTrialDays = clampTrialDays(trialDays || resolveSkyePayTrialDays(offer, client));
  const skyeMeritCheckout = body.skyeMeritCheckout || body.skyemerit_checkout || null;
  const adjustedDueToday = activeTrialDays > 0
    ? 0
    : Number(skyeMeritCheckout?.adjusted_due_cents ?? setup + recurring);
  const originalDueToday = activeTrialDays > 0 ? 0 : setup + recurring;
  return {
    skyepay: "true",
    gate: "SkyeGateFS27",
    order_id: safeText(orderId, 120),
    client_slug: client.slug,
    workspace_slug: safeText(body.workspace_slug || body.workspace || client.workspace_slug, 120).toLowerCase(),
    offer_id: offer.id,
    plan_name: offer.plan_name,
    offer_family: offer.family,
    vault_workspace: offer.family === "skyevault" ? "true" : "false",
    customer_email: normalizeEmail(body.customer_email || body.email),
    customer_name: safeText(body.customer_name || body.name, 160),
    company_name: safeText(body.company_name || client.company_name, 180),
    checkout_request_id: cleanRequestToken(body.idempotency_key || body.request_id, 180),
    owner_approval_required: String(skyePayOfferRequiresOwnerApproval(offer)),
    approval_status: skyePayOfferRequiresOwnerApproval(offer)
      ? "paid_pending_owner_approval"
      : "auto_unlock_after_confirmed_payment",
    activation_path: offer.activation_path,
    store_category: safeText(offer.store_category, 80),
    free_trial_days: String(activeTrialDays),
    zero_upfront_trial: String(activeTrialDays > 0),
    amount_due_today_cents: String(adjustedDueToday),
    original_amount_due_today_cents: String(originalDueToday),
    deferred_one_time_cents: String(activeTrialDays > 0 ? setup : 0),
    recurring_cents: String(recurring),
    gate_policy_id: safeText(offer.gate_policy?.policy_id, 140),
    platform_metering_mode: safeText(offer.gate_policy?.platform_metering_mode, 120),
    free99_platforms: Array.isArray(offer.gate_policy?.free99_access) ? offer.gate_policy.free99_access.join(",") : "",
    platform_usage_bucket_count: String(Object.keys(offer.gate_policy?.platform_usage_buckets || {}).length),
    relay13_ai_addon: offer.gate_policy?.relay13_ai ? "true" : "false",
    relay13_ai_included_responses: String(offer.gate_policy?.relay13_ai?.included_ai_responses_monthly || 0),
    relay13_ai_provider_gate: safeText(offer.gate_policy?.relay13_ai?.provider_call_gate, 120),
    source_folder: safeText(offer.source_folder || "SkyeGateFS27", 180),
    source_file: safeText(offer.source_file || "SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js", 180),
    catalog_source: safeText(offer.catalog_source || "SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js", 180),
    brain_owner: safeText(offer.brain_owner || "", 120),
    special_offer: safeText(client.special_offer, 450),
    ...skyeMeritMetadata(skyeMeritCheckout)
  };
}

export function summarizeOfferTotals(offer) {
  return {
    setup_cents: sumLineItems(offer, "one_time"),
    recurring_cents: sumLineItems(offer, "recurring"),
    currency: offer.currency || DEFAULT_CURRENCY
  };
}

export function makeDemoSession({ client, offer, body = {}, origin }) {
  const requestToken = cleanRequestToken(body.idempotency_key || body.request_id, 120);
  const orderId = requestToken
    ? `skypay_demo_${requestToken}`
    : `skypay_demo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const statusUrl = new URL("/skyepay.html", origin);
  statusUrl.searchParams.set("client", client.slug);
  statusUrl.searchParams.set("status", "success");
  statusUrl.searchParams.set("demo_session", orderId);
  statusUrl.searchParams.set("offer", offer.id);
  const trialDays = resolveSkyePayTrialDays(offer, client);
  const skyeMeritCheckout = buildSkyeMeritCheckout({
    offer,
    trialDays,
    code: body.skyemerit_apply === false ? "" : (body.skyemerit_code || SKYEMERIT_AUTO_CODE),
    packId: body.skyemerit_pack_id || SKYEMERIT_FIRST_TIME_PACK_ID,
    firstTimeEligible: body.skyemerit_first_time !== false
  });
  const bodyWithMerit = { ...body, skyeMeritCheckout };
  return {
    ok: true,
    dry_run: true,
    id: orderId,
    order_id: orderId,
    url: statusUrl.toString(),
    payment_status: "demo_not_charged",
    approval_status: skyePayOfferRequiresOwnerApproval(offer)
      ? "demo_pending_owner_approval"
      : "demo_checkout",
    owner_approval_required: skyePayOfferRequiresOwnerApproval(offer),
    activation_path: offer.activation_path || null,
    client: {
      slug: client.slug,
      client_name: client.client_name,
      workspace_slug: client.workspace_slug
    },
    offer: publicOffer(offer, client),
    skyemerit: skyeMeritCheckout,
    metadata: buildSkyePayMetadata({
      client,
      offer,
      body: bodyWithMerit,
      orderId,
      trialDays
    })
  };
}

export function normalizeSkyePayCheckoutBody(body) {
  return {
    client_slug: safeText(body?.client_slug || body?.client || "bobs-smoke-shop", 120).toLowerCase(),
    workspace_slug: safeText(body?.workspace_slug || body?.workspace || "", 120).toLowerCase(),
    offer_id: safeText(body?.offer_id || body?.offer || "", 140),
    customer_email: normalizeEmail(body?.customer_email || body?.email),
    customer_name: safeText(body?.customer_name || body?.name, 160),
    company_name: safeText(body?.company_name || body?.company, 180),
    dry_run: body?.dry_run === true || body?.dry_run === "true",
    success_url: safeText(body?.success_url || body?.successUrl, 1000),
    cancel_url: safeText(body?.cancel_url || body?.cancelUrl, 1000),
    idempotency_key: cleanRequestToken(body?.idempotency_key || body?.request_id, 180),
    skyemerit_code: cleanRequestToken(body?.skyemerit_code || body?.skyemerit || "", 120),
    skyemerit_pack_id: cleanRequestToken(body?.skyemerit_pack_id || SKYEMERIT_FIRST_TIME_PACK_ID, 120),
    skyemerit_apply: !(body?.skyemerit_apply === false || body?.skyemerit_apply === "false"),
    skyemerit_first_time: !(body?.skyemerit_first_time === false || body?.skyemerit_first_time === "false")
  };
}

export async function upsertSkyePayOrderFromSession({ session, offer = null, client = null, source = "stripe_checkout" }) {
  const md = session?.metadata || {};
  if (md.skyepay !== "true") return null;

  const resolvedOffer = offer || getSkyePayOffer(md.offer_id);
  const resolvedClient = client || getSkyePayClient(md.client_slug);
  const totals = resolvedOffer ? summarizeOfferTotals(resolvedOffer) : {
    setup_cents: 0,
    recurring_cents: 0,
    currency: session.currency || DEFAULT_CURRENCY
  };

  const orderId = safeText(md.order_id, 160) || safeText(session.id, 160);
  const email = normalizeEmail(md.customer_email || session.customer_details?.email || session.customer_email);
  const customerName = safeText(md.customer_name || session.customer_details?.name, 160);
  const companyName = safeText(md.company_name || resolvedClient.company_name, 180);
  const paymentStatus = safeText(session.payment_status || session.status, 80);
  const stripeCustomerId = safeText(session.customer, 160) || null;
  const subscriptionId = safeText(session.subscription, 160) || null;
  const paymentIntentId = safeText(session.payment_intent, 160) || null;
  const paidAtExpr = paymentStatus === "paid" || session.status === "complete" ? "now()" : "null";
  const paymentConfirmed = ["paid", "complete", "no_payment_required"].includes(String(paymentStatus || "").toLowerCase());
  const orderStatuses = skyePayOrderStatusesForPayment({
    offer: resolvedOffer || {
      metadata: md,
      activation_path: md.activation_path,
      owner_approval_required: String(md.owner_approval_required || "").toLowerCase() === "true"
    },
    paymentConfirmed
  });

  const params = [
    orderId,
    resolvedClient.slug,
    safeText(md.workspace_slug || resolvedClient.workspace_slug, 120).toLowerCase(),
    email || null,
    customerName || null,
    companyName || null,
    resolvedOffer?.id || safeText(md.offer_id, 140),
    resolvedOffer ? JSON.stringify(publicOffer(resolvedOffer, resolvedClient)) : JSON.stringify({ metadata: md }),
    Number(totals.setup_cents || 0),
    Number(totals.recurring_cents || 0),
    String(totals.currency || session.currency || DEFAULT_CURRENCY).toLowerCase(),
    safeText(session.mode || resolvedOffer?.mode || "payment", 40),
    safeText(session.id, 180),
    stripeCustomerId,
    subscriptionId,
    paymentIntentId,
    paymentStatus || "created",
    orderStatuses.approval_status,
    orderStatuses.owner_status,
    orderStatuses.provisioning_status,
    safeText(source, 80),
    safeText(session.success_url, 1000) || null,
    safeText(session.cancel_url, 1000) || null,
    JSON.stringify({
      checkout_status: session.status || null,
      session_created_at: session.created || null,
      metadata: md,
      updated_at: nowIso()
    })
  ];

  const result = await q(
    `insert into skyepay_orders
      (id, client_slug, workspace_slug, customer_email, customer_name, company_name,
       offer_id, offer_snapshot, amount_setup_cents, amount_recurring_cents, currency,
       checkout_mode, stripe_session_id, stripe_customer_id, stripe_subscription_id,
       payment_intent_id, payment_status, approval_status, owner_status, provisioning_status, source,
       success_url, cancel_url, metadata, paid_at)
     values
      ($1,$2,$3,$4,$5,$6,
       $7,$8::jsonb,$9,$10,$11,
       $12,$13,$14,$15,
       $16,$17,$18,$19,$20,$21,
       $22,$23,$24::jsonb,${paidAtExpr})
     on conflict (stripe_session_id)
     do update set
       customer_email=coalesce(excluded.customer_email, skyepay_orders.customer_email),
       customer_name=coalesce(excluded.customer_name, skyepay_orders.customer_name),
       company_name=coalesce(excluded.company_name, skyepay_orders.company_name),
       stripe_customer_id=coalesce(excluded.stripe_customer_id, skyepay_orders.stripe_customer_id),
       stripe_subscription_id=coalesce(excluded.stripe_subscription_id, skyepay_orders.stripe_subscription_id),
       payment_intent_id=coalesce(excluded.payment_intent_id, skyepay_orders.payment_intent_id),
       payment_status=excluded.payment_status,
       approval_status=case
         when skyepay_orders.approval_status in ('approved','void','refunded') then skyepay_orders.approval_status
         else excluded.approval_status
       end,
       owner_status=case
         when skyepay_orders.owner_status in ('approved','void') then skyepay_orders.owner_status
         else excluded.owner_status
       end,
       provisioning_status=case
         when skyepay_orders.provisioning_status in ('workspace_unlocked','void') then skyepay_orders.provisioning_status
         else excluded.provisioning_status
       end,
       metadata=skyepay_orders.metadata || excluded.metadata,
       paid_at=coalesce(skyepay_orders.paid_at, excluded.paid_at),
       updated_at=now()
     returning *`,
    params
  );

  return result.rows[0] || null;
}
