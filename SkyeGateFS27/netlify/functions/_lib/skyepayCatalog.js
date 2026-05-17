import { q } from "./db.js";
import {
  skyePayOfferRequiresOwnerApproval,
  skyePayOrderStatusesForPayment
} from "./skyepayActivation.js";
import { cleanRequestToken } from "./skyepaySecurity.js";
import { SKYPAY_REPO_STRIPE_OFFERS } from "./skyepayRepoStripeOffers.js";

const DEFAULT_CURRENCY = "usd";
const DEFAULT_TRIAL_DAYS = 7;

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

function nowIso() {
  return new Date().toISOString();
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

const SKYPAY_OFFER_ENRICHMENTS = {
  "metraiyux-starter-command": {
    store_category: "Client app subscriptions",
    store_rank: 10,
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    setup_handling: "deferred_owner_approval",
    storefront: true,
    badge: "7-day trial",
    includes: [
      "Client workspace",
      "Private app closeout",
      "Basic AI command routing",
      "Owner-approved activation"
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
      vault_workspace_limit: 1
    }
  },
  "metraiyux-growth-cabinet": {
    store_category: "Client app subscriptions",
    store_rank: 20,
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    setup_handling: "deferred_owner_approval",
    storefront: true,
    badge: "Growth lane",
    includes: [
      "Recurring workflow routing",
      "Proof exports",
      "Weekly operating rhythm",
      "Owner-approved activation"
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
      vault_workspace_limit: 3
    }
  },
  "metraiyux-houseoperations-command": {
    store_category: "Client app subscriptions",
    store_rank: 22,
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    setup_handling: "deferred_owner_approval",
    storefront: true,
    badge: "HouseOps lane",
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
      vault_workspace_limit: 1
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
      vault_workspace_limit: 3
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
    includes: [
      "SkyeRoutexFlow v0.4.0 local proof platform",
      "V83 routed shell",
      "Provider jobs and applicant pools",
      "Contractor assignments and proof",
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
      vault_workspace_limit: 3
    }
  },
  "metraiyux-autonomous-office": {
    store_category: "Client app subscriptions",
    store_rank: 30,
    trial_days: DEFAULT_TRIAL_DAYS,
    zero_upfront_trial: true,
    setup_handling: "deferred_owner_approval",
    storefront: true,
    badge: "Full office",
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
      vault_workspace_limit: 8
    }
  },
  "metraiyux-enterprise-command": {
    store_category: "Client app subscriptions",
    store_rank: 40,
    trial_days: 0,
    zero_upfront_trial: false,
    setup_handling: "owner_approved_after_scope_review",
    storefront: true,
    badge: "Managed enterprise",
    includes: [
      "Custom 0S deployment architecture",
      "Managed ConnectLog and Relay13 scope",
      "Custom SkyeRouteX workforce command deployment",
      "Advanced audit exports",
      "Owner-approved written limits"
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
      vault_workspace_limit: 5
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
    vault_workspace_limit: policy.vault_workspace_limit ?? null
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
    description: "Paid music ops room for active creators and small teams that need release workflow, royalty ledger tracking, payout review, proof exports, and a basic operator dashboard.",
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
    includes: ["Up to 5 artists", "25 active releases", "Release workflow board", "Royalty ledger tracking", "Payout review queue", "Proof exports", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-label-command",
    plan_name: "skyemusicnexus-label-command",
    title: "SkyeMusicNexus Label Command",
    family: "skyemusicnexus",
    description: "Label-grade music command lane for multi-artist release operations, approval workflows, payout review controls, analytics, reporting, and custom proof receipts.",
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
    includes: ["Up to 25 artists", "150 active releases", "Operator/admin stage", "Approval workflows", "Payout review controls", "Custom proof receipts", "Gate session required"],
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval"
  },
  {
    id: "skyemusicnexus-managed-music-ops",
    plan_name: "skyemusicnexus-managed-music-ops",
    title: "SkyeMusicNexus Managed Music Ops",
    family: "skyemusicnexus",
    description: "Managed music operations room with custom limits, managed onboarding, team roles, client-facing music ops, custom proof receipts, and owner-approved integration scoping.",
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
    includes: ["Custom artist limits", "Custom release limits", "Managed onboarding", "Team roles", "Client-facing music ops room", "Integration scope quoted separately", "Gate session required"],
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
    id: "metraiyux-starter-command",
    plan_name: "starter-command",
    title: "Starter Command",
    family: "metraiyux",
    description: "A managed starter operating room for preview clients who are ready to keep the app and unlock after confirmed SkyePay checkout.",
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
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment"
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
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment"
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
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment"
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
    description: "Paid workforce command lane with SkyeRoutexFlow v0.4.0 local proof, V83 routed shell, provider jobs, contractor assignments, proof, payments, route stops, and market reports.",
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
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment"
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
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment"
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
    activation_path: "owner_approved_after_scope_review"
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
      "Owner-approved workspace activation after confirmed Stripe payment",
      "Workspace handoff after SkyePay closeout",
      "FS27 order, usage, and activation ledger"
    ],
    special_offer: "Free preview first. Confirmed SkyePay checkout writes the FS27 plan policy and holds activation for owner approval.",
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
      "Owner-approved workspace activation after confirmed Stripe payment"
    ],
    special_offer: "Free preview first. If Bob wants to continue, confirmed SkyePay checkout writes the FS27 order and waits for owner-approved activation; discounts still require an approved quote.",
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
    platform_id: "bobs-smoke-shop-preview",
    title: "Bob's Smoke Shop Private Preview",
    route: "/skyepay.html?client=bobs-smoke-shop",
    default_offer_id: "metraiyux-starter-command",
    wiring_status: "client_preview_ready",
    note: "First client lane wired into SkyePay with free preview, owner-approved paid activation, and usage language."
  },
  {
    platform_id: "repo-platforms-next",
    title: "Repo Platform Billing Routes",
    route: "/admin/platform-control",
    default_offer_id: "metraiyux-growth-cabinet",
    wiring_status: "next_after_live_proof",
    note: "The next lane maps each repo platform to an approved offer, Stripe-confirmed payment, and workspace unlock behavior."
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
      "Owner-approved workspace activation after confirmed Stripe payment",
      "Workspace handoff after closeout"
    ],
    special_offer: "Free preview first. Continued work is confirmed through SkyePay, then the workspace waits for owner-approved activation after Stripe confirms the transaction.",
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
      vault_workspace_limit: offer.gate_policy.vault_workspace_limit || null
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
  const priceData = {
    currency: offer.currency || DEFAULT_CURRENCY,
    unit_amount: item.amount_cents,
    product_data: {
      name: item.name,
      metadata: {
        skyepay: "true",
        offer_id: offer.id,
        client_slug: client.slug,
        lookup_key: item.lookup_key,
        offer_family: offer.family,
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

export async function buildStripeLineItemsWithCatalogPrices({ stripe, offer, client, trialDays = 0 }) {
  const activeTrialDays = clampTrialDays(trialDays || 0);
  const checkoutItems = offer.mode === "subscription" && activeTrialDays > 0
    ? offer.line_items.filter((item) => item.type === "recurring")
    : offer.line_items;
  const useLookupKeys = String(process.env.SKYPAY_USE_STRIPE_LOOKUP_KEYS || "true").toLowerCase() !== "false";

  const lineItems = [];
  for (const item of checkoutItems) {
    if (useLookupKeys) {
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
    amount_due_today_cents: String(activeTrialDays > 0 ? 0 : setup + recurring),
    deferred_one_time_cents: String(activeTrialDays > 0 ? setup : 0),
    recurring_cents: String(recurring),
    gate_policy_id: safeText(offer.gate_policy?.policy_id, 140),
    source_folder: safeText(offer.source_folder || "SkyeGateFS27", 180),
    source_file: safeText(offer.source_file || "SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js", 180),
    catalog_source: safeText(offer.catalog_source || "SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js", 180),
    brain_owner: safeText(offer.brain_owner || "", 120),
    special_offer: safeText(client.special_offer, 450)
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
    metadata: buildSkyePayMetadata({
      client,
      offer,
      body,
      orderId,
      trialDays: resolveSkyePayTrialDays(offer, client)
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
    idempotency_key: cleanRequestToken(body?.idempotency_key || body?.request_id, 180)
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
