#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILE = process.env.ROOT_ENV_FILE || path.join(ROOT, ".env");
const OUT_DIR = path.join(ROOT, "test-artifacts", "stripe-sync");
const OUT_FILE = path.join(OUT_DIR, "metraiyux-stripe-sync-receipt.json");

function parseEnv(file) {
  const out = {};
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

const env = parseEnv(ENV_FILE);
const stripeKey = env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY || env.stripe_key || env.stripe_agent_key;

if (!stripeKey) {
  console.error("Missing Stripe secret key in root env.");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
const PLAN_FILTERS = process.argv
  .filter((arg) => arg.startsWith("--plan="))
  .flatMap((arg) => arg.slice("--plan=".length).split(","))
  .map((item) => item.trim())
  .filter(Boolean);
const musicPricingPath = path.join(ROOT, "metraiyux_0s_site", "data", "skyemusicnexus-pricing.json");
const musicPricing = JSON.parse(fs.readFileSync(musicPricingPath, "utf8"));

function dollarsToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function musicPriceSpecs(item) {
  if (item.monthly && item.setup !== undefined) {
    return [
      { kind: "setup", nickname: `${item.name} setup`, lookupKey: item.lookup_keys[0], amount: dollarsToCents(item.setup) },
      { kind: "monthly", nickname: `${item.name} monthly`, lookupKey: item.lookup_keys[1], amount: dollarsToCents(item.monthly), interval: "month" }
    ];
  }
  if (item.billing === "monthly_with_setup") {
    return [
      { kind: "setup", nickname: `${item.name} setup`, lookupKey: item.lookup_keys[0], amount: dollarsToCents(item.setup) },
      { kind: "monthly", nickname: `${item.name} monthly`, lookupKey: item.lookup_keys[1], amount: dollarsToCents(item.amount), interval: "month" }
    ];
  }
  if (item.billing === "monthly") {
    return [{ kind: "monthly", nickname: `${item.name} monthly`, lookupKey: item.lookup_key, amount: dollarsToCents(item.amount), interval: "month" }];
  }
  return [{ kind: "one-time", nickname: item.name, lookupKey: item.lookup_key, amount: dollarsToCents(item.amount) }];
}

const musicOffers = [
  ...musicPricing.paid_tiers,
  ...musicPricing.addons.filter((item) => item.billing !== "quote_starting_at")
].map((item) => ({
  planId: item.id,
  productName: item.name,
  description: `${item.summary} Gate session required; paid checkout does not create live distributor, DSP, payment, legal, label, identity-provider, or deployed persistence claims without separate provider proof.`,
  sourceFolder: "metraiyux_0s_site/SkyeMusicNexus",
  brainOwner: "naomi-sterling-brain",
  ownerApprovalRequired: true,
  prices: musicPriceSpecs(item),
  includes: `skyemusicnexus_${item.id.replace(/^skyemusicnexus-/, "").replace(/-/g, "_")}_gate_required`
}));

function mediaOverLondonOffer({
  planId,
  productName,
  description,
  prices,
  includes,
  status = "approved"
}) {
  return {
    planId,
    productName,
    description,
    sourceFolder: "marketing/metraiyux-0s",
    sourceFile: "marketing/metraiyux-0s/media-over-london.html",
    offerFamily: "media-over-london",
    brainOwner: "media-over-london",
    ownerApprovalRequired: true,
    status,
    prices,
    includes
  };
}

const mediaOverLondonOffers = [
  mediaOverLondonOffer({
    planId: "media-over-london-static-preview-page",
    productName: "Media Over London Static Preview Page",
    description: "Static preview and QR-ready campaign landing surface for a single artist drop, product, logo, client picture, or focused offer.",
    prices: [{ kind: "one-time", nickname: "Media Over London Static Preview Page", lookupKey: "media_over_london_static_preview_page", amount: 23900 }],
    includes: "static_preview_qr_ready_client_asset_skypay_receipt"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-floating-orb-gallery",
    productName: "Media Over London Floating Orb Gallery",
    description: "Floating picture orbit gallery for artists, stores, founders, products, and campaigns with gallery, EPK/media, booking/contact, and proof-ready surface.",
    prices: [{ kind: "one-time", nickname: "Media Over London Floating Orb Gallery", lookupKey: "media_over_london_floating_orb_gallery", amount: 44400 }],
    includes: "floating_orbit_gallery_epk_booking_client_assets"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-video-rotator-page",
    productName: "Media Over London Multi-Video Rotator",
    description: "Animated landing or visualizer page with multi-video rotator treatment, image stack, and campaign-ready checkout handoff.",
    prices: [{ kind: "one-time", nickname: "Media Over London Multi-Video Rotator", lookupKey: "media_over_london_video_rotator_page", amount: 79600 }],
    includes: "animated_landing_multi_video_rotator_campaign_cta"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-campaign-universe",
    productName: "Media Over London Custom Campaign Universe",
    description: "Custom campaign universe like the SupaBoy-level artist build or full client media world, quoted manually after scope with a starting SkyePay floor.",
    status: "approved_floor",
    prices: [{ kind: "one-time-floor", nickname: "Media Over London Custom Campaign Universe", lookupKey: "media_over_london_campaign_universe", amount: 119700 }],
    includes: "custom_media_universe_asset_mining_manual_scope_floor"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-launch-page",
    productName: "Media Over London Launch Page",
    description: "One high-converting launch page with up to eight sections, core copy, contact form, mobile QA, deployment, and launch handoff.",
    prices: [{ kind: "one-time", nickname: "Media Over London Launch Page", lookupKey: "media_over_london_launch_page", amount: 79900 }],
    includes: "launch_page_core_copy_contact_form_mobile_qa_deployment"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-business-site",
    productName: "Media Over London Business Site",
    description: "Up to five pages with service sections, trust blocks, SEO foundation, form handling, performance pass, and handoff.",
    prices: [{ kind: "one-time", nickname: "Media Over London Business Site", lookupKey: "media_over_london_business_site", amount: 225000 }],
    includes: "five_page_business_site_services_trust_seo_forms_performance"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-authority-suite",
    productName: "Media Over London Authority Suite",
    description: "Up to ten pages with deeper positioning, expanded FAQs, stronger proof sections, premium visual polish, and launch checklist.",
    prices: [{ kind: "one-time", nickname: "Media Over London Authority Suite", lookupKey: "media_over_london_authority_suite", amount: 475000 }],
    includes: "ten_page_authority_suite_positioning_faqs_proof_visual_polish"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-managed-host",
    productName: "Media Over London Managed Host",
    description: "Hosting, SSL, CDN-backed delivery, lightweight form routing, and one small edit monthly.",
    prices: [{ kind: "monthly", nickname: "Media Over London Managed Host", lookupKey: "media_over_london_managed_host_monthly", amount: 2900, interval: "month" }],
    includes: "hosting_ssl_cdn_forms_one_edit_monthly"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-host-care",
    productName: "Media Over London Host + Care",
    description: "Up to four small edits monthly, quarterly tune-up, priority response window, and status note.",
    prices: [{ kind: "monthly", nickname: "Media Over London Host + Care", lookupKey: "media_over_london_host_care_monthly", amount: 5900, interval: "month" }],
    includes: "four_edits_quarterly_tuneup_priority_status_note"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-host-growth",
    productName: "Media Over London Host + Growth",
    description: "Care plus meaningful page or section expansion support and monthly growth recommendations.",
    prices: [{ kind: "monthly", nickname: "Media Over London Host + Growth", lookupKey: "media_over_london_host_growth_monthly", amount: 9900, interval: "month" }],
    includes: "care_page_section_expansion_monthly_recommendations"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-starter-content-engine",
    productName: "Media Over London Starter Content Engine",
    description: "Two content assets monthly plus basic optimization on existing pages.",
    prices: [{ kind: "monthly", nickname: "Media Over London Starter Content Engine", lookupKey: "media_over_london_starter_content_engine_monthly", amount: 24900, interval: "month" }],
    includes: "two_content_assets_basic_optimization"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-growth-content-engine",
    productName: "Media Over London Growth Content Engine",
    description: "Four content assets monthly with stronger service, city, FAQ, offer, and trust-building work.",
    prices: [{ kind: "monthly", nickname: "Media Over London Growth Content Engine", lookupKey: "media_over_london_growth_content_engine_monthly", amount: 49900, interval: "month" }],
    includes: "four_content_assets_service_city_faq_offer_trust"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-authority-engine",
    productName: "Media Over London Authority Engine",
    description: "Editorial cadence, larger service/city/topic expansion, and deeper credibility reinforcement.",
    status: "approved_floor",
    prices: [{ kind: "monthly-floor", nickname: "Media Over London Authority Engine", lookupKey: "media_over_london_authority_engine_monthly", amount: 125000, interval: "month" }],
    includes: "editorial_cadence_topic_expansion_credibility_floor"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-starter-ppc-management",
    productName: "Media Over London Starter PPC Management",
    description: "One simple campaign lane with basic monthly optimization and reporting. Ad spend is separate.",
    prices: [{ kind: "monthly", nickname: "Media Over London Starter PPC Management", lookupKey: "media_over_london_starter_ppc_management_monthly", amount: 39900, interval: "month" }],
    includes: "starter_ppc_campaign_optimization_reporting_ad_spend_separate"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-local-lead-campaigns",
    productName: "Media Over London Local Lead Campaigns",
    description: "Landing page support, tracking plan, campaign iteration, and conversion reporting. Ad spend is separate.",
    prices: [{ kind: "monthly", nickname: "Media Over London Local Lead Campaigns", lookupKey: "media_over_london_local_lead_campaigns_monthly", amount: 79900, interval: "month" }],
    includes: "local_lead_campaigns_landing_tracking_iteration_reporting"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-multi-channel-growth",
    productName: "Media Over London Multi-Channel Growth",
    description: "Google, Meta, retargeting, offer testing, deeper reporting, and campaign coordination. Ad spend is separate.",
    status: "approved_floor",
    prices: [{ kind: "monthly-floor", nickname: "Media Over London Multi-Channel Growth", lookupKey: "media_over_london_multi_channel_growth_monthly", amount: 150000, interval: "month" }],
    includes: "multi_channel_growth_google_meta_reporting_floor"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-campaign-buildout",
    productName: "Media Over London Campaign Buildout",
    description: "Landing page, tracking, creative, and setup work based on complexity. Checkout is the starting floor before final scope.",
    status: "approved_floor",
    prices: [{ kind: "one-time-floor", nickname: "Media Over London Campaign Buildout", lookupKey: "media_over_london_campaign_buildout", amount: 50000 }],
    includes: "campaign_buildout_landing_tracking_creative_floor"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-gbp-cleanup",
    productName: "Media Over London GBP Cleanup",
    description: "Profile audit, cleanup recommendations, services/categories, description, links, and basic fix list.",
    prices: [{ kind: "one-time", nickname: "Media Over London GBP Cleanup", lookupKey: "media_over_london_gbp_cleanup", amount: 29900 }],
    includes: "gbp_audit_categories_description_links_fix_list"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-gbp-monthly-ops",
    productName: "Media Over London GBP Monthly Ops",
    description: "Posts, photos, offers, Q&A, service updates, and monthly activity summary.",
    prices: [{ kind: "monthly", nickname: "Media Over London GBP Monthly Ops", lookupKey: "media_over_london_gbp_monthly_ops_monthly", amount: 19900, interval: "month" }],
    includes: "gbp_posts_photos_offers_qna_service_updates"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-local-trust-system",
    productName: "Media Over London Local Trust System",
    description: "GBP Ops plus review engine, local pages, and trust-content coordination.",
    status: "approved_floor",
    prices: [{ kind: "monthly-floor", nickname: "Media Over London Local Trust System", lookupKey: "media_over_london_local_trust_system_monthly", amount: 49900, interval: "month" }],
    includes: "gbp_review_engine_local_pages_trust_content"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-review-setup",
    productName: "Media Over London Review Setup",
    description: "Review link, QR asset, request templates, and staff instruction sheet.",
    prices: [{ kind: "one-time", nickname: "Media Over London Review Setup", lookupKey: "media_over_london_review_setup", amount: 19900 }],
    includes: "review_link_qr_templates_staff_sheet"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-review-engine",
    productName: "Media Over London Review Engine",
    description: "Monthly request support, testimonial capture, and reputation report.",
    prices: [{ kind: "monthly", nickname: "Media Over London Review Engine", lookupKey: "media_over_london_review_engine_monthly", amount: 14900, interval: "month" }],
    includes: "monthly_review_support_testimonials_reputation_report"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-reputation-ops",
    productName: "Media Over London Reputation Ops",
    description: "Review engine plus GBP posts, response guidance, and trust-content reuse.",
    status: "approved_floor",
    prices: [{ kind: "monthly-floor", nickname: "Media Over London Reputation Ops", lookupKey: "media_over_london_reputation_ops_monthly", amount: 39900, interval: "month" }],
    includes: "review_engine_gbp_posts_response_guidance_trust_reuse"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-lead-rescue-setup",
    productName: "Media Over London Lead Rescue Setup",
    description: "Missed-call flow, auto-response copy, booking/quote link, alerts, and test proof.",
    prices: [{ kind: "one-time", nickname: "Media Over London Lead Rescue Setup", lookupKey: "media_over_london_lead_rescue_setup", amount: 39900 }],
    includes: "missed_call_flow_auto_response_booking_alerts_test_proof"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-lead-recovery-ops",
    productName: "Media Over London Lead Recovery Ops",
    description: "Monitoring support, script updates, lead summaries, and monthly missed-lead report.",
    prices: [{ kind: "monthly", nickname: "Media Over London Lead Recovery Ops", lookupKey: "media_over_london_lead_recovery_ops_monthly", amount: 19900, interval: "month" }],
    includes: "lead_recovery_monitoring_scripts_summaries_report"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-crm-setup",
    productName: "Media Over London CRM Setup",
    description: "Pipeline, fields, stages, lead forms, templates, and basic staff handoff. Checkout is the starting floor.",
    status: "approved_floor",
    prices: [{ kind: "one-time-floor", nickname: "Media Over London CRM Setup", lookupKey: "media_over_london_crm_setup", amount: 75000 }],
    includes: "crm_pipeline_fields_stages_forms_templates_floor"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-follow-up-ops",
    productName: "Media Over London Follow-Up Ops",
    description: "Template maintenance, reactivation campaigns, pipeline cleanup, and monthly summary.",
    prices: [{ kind: "monthly", nickname: "Media Over London Follow-Up Ops", lookupKey: "media_over_london_follow_up_ops_monthly", amount: 29900, interval: "month" }],
    includes: "follow_up_templates_reactivation_pipeline_cleanup_summary"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-monthly-operator-report",
    productName: "Media Over London Monthly Operator Report",
    description: "Executive summary, shipped-work log, key metrics, blockers, and next recommendations.",
    prices: [{ kind: "monthly", nickname: "Media Over London Monthly Operator Report", lookupKey: "media_over_london_monthly_operator_report_monthly", amount: 14900, interval: "month" }],
    includes: "operator_report_summary_work_log_metrics_blockers"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-lead-dashboard",
    productName: "Media Over London Lead Dashboard",
    description: "Dashboard setup and monthly maintenance for available sources.",
    prices: [
      { kind: "setup", nickname: "Media Over London Lead Dashboard setup", lookupKey: "media_over_london_lead_dashboard_setup", amount: 39900 },
      { kind: "monthly", nickname: "Media Over London Lead Dashboard monthly", lookupKey: "media_over_london_lead_dashboard_monthly", amount: 9900, interval: "month" }
    ],
    includes: "lead_dashboard_setup_monthly_maintenance_available_sources"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-growth-command",
    productName: "Media Over London Growth Command",
    description: "Hosting + care, GBP support, review engine, basic reporting, and monthly recommendations.",
    prices: [{ kind: "monthly", nickname: "Media Over London Growth Command", lookupKey: "media_over_london_growth_command_monthly", amount: 39900, interval: "month" }],
    includes: "growth_command_hosting_gbp_reviews_reporting_recommendations"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-lead-engine",
    productName: "Media Over London Lead Engine",
    description: "Landing page support, paid traffic management, tracking, review flow, and monthly conversion report. Ad spend is separate.",
    prices: [{ kind: "monthly", nickname: "Media Over London Lead Engine", lookupKey: "media_over_london_lead_engine_monthly", amount: 79900, interval: "month" }],
    includes: "lead_engine_landing_paid_traffic_tracking_reviews_ad_spend_separate"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-revenue-ops",
    productName: "Media Over London Revenue Ops",
    description: "CRM pipeline, missed-call recovery, booking flow, content, PPC coordination, dashboard, and reputation system. Tools and ad spend are separate.",
    status: "approved_floor",
    prices: [{ kind: "monthly-floor", nickname: "Media Over London Revenue Ops", lookupKey: "media_over_london_revenue_ops_monthly", amount: 150000, interval: "month" }],
    includes: "revenue_ops_crm_lead_recovery_content_ppc_dashboard_floor"
  }),
  mediaOverLondonOffer({
    planId: "media-over-london-embedded-growth-operator",
    productName: "Media Over London Embedded Growth Operator",
    description: "Website, content, ads, vendors, automation, review ops, reporting, offer calendar, and strategy cadence.",
    status: "approved_floor",
    prices: [{ kind: "monthly-floor", nickname: "Media Over London Embedded Growth Operator", lookupKey: "media_over_london_embedded_growth_operator_monthly", amount: 300000, interval: "month" }],
    includes: "embedded_growth_operator_site_content_ads_vendors_automation_reporting"
  })
];

const skyEmailOffers = [
  {
    planId: "skyemail-starter-mailbox",
    productName: "SkyEmail Starter Mailbox",
    description: "SkyEmail production mailbox with one inbox, verified aliases, one custom domain, shared SkyeGate FS27 login custody, and delivery proof.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail Starter Mailbox monthly", lookupKey: "skyemail_starter_mailbox_monthly", amount: 900, interval: "month" }
    ],
    includes: "skyemail_1_mailbox_5_aliases_1_domain_5gb_2000_sends"
  },
  {
    planId: "skyemail-business-mailbox",
    productName: "SkyEmail Business Mailbox",
    description: "SkyEmail team mailbox plan with three production mailboxes, verified domains, pooled storage, send volume, admin visibility, and 0S handoff context.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail Business Mailbox monthly", lookupKey: "skyemail_business_mailbox_monthly", amount: 1900, interval: "month" }
    ],
    includes: "skyemail_3_mailboxes_15_aliases_3_domains_25gb_10000_sends"
  },
  {
    planId: "skyemail-operator-mailbox",
    productName: "SkyEmail Operator Mailbox",
    description: "Operator-grade SkyEmail mailbox fleet for managed rooms, agencies, and multi-workspace operators with monitoring and priority provisioning.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail Operator Mailbox monthly", lookupKey: "skyemail_operator_mailbox_monthly", amount: 4900, interval: "month" }
    ],
    includes: "skyemail_10_mailboxes_50_aliases_10_domains_100gb_50000_sends"
  },
  {
    planId: "skyemail-extra-mailbox",
    productName: "SkyEmail Extra Mailbox",
    description: "Owner-approved capacity add-on for one additional SkyEmail production mailbox.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail Extra Mailbox monthly", lookupKey: "skyemail_extra_mailbox_monthly", amount: 500, interval: "month" }
    ],
    includes: "skyemail_capacity_1_extra_mailbox"
  },
  {
    planId: "skyemail-extra-domain",
    productName: "SkyEmail Extra Verified Domain",
    description: "Owner-approved capacity add-on for one additional verified custom domain on an active SkyEmail plan.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail Extra Verified Domain monthly", lookupKey: "skyemail_extra_domain_monthly", amount: 300, interval: "month" }
    ],
    includes: "skyemail_capacity_1_extra_verified_domain"
  },
  {
    planId: "skyemail-storage-5gb-block",
    productName: "SkyEmail 5 GB Storage Block",
    description: "Owner-approved capacity add-on for 5 GB additional pooled SkyEmail mailbox storage.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail 5 GB Storage Block monthly", lookupKey: "skyemail_storage_5gb_monthly", amount: 300, interval: "month" }
    ],
    includes: "skyemail_capacity_5gb_storage"
  },
  {
    planId: "skyemail-send-volume-1000",
    productName: "SkyEmail 1,000 Send Block",
    description: "Owner-approved capacity add-on for 1,000 additional outbound SkyEmail sends per month.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail 1,000 Send Block monthly", lookupKey: "skyemail_send_volume_1000_monthly", amount: 200, interval: "month" }
    ],
    includes: "skyemail_capacity_1000_outbound_sends"
  },
  {
    planId: "skyemail-alias-pack-10",
    productName: "SkyEmail 10 Alias Pack",
    description: "Owner-approved capacity add-on for 10 additional verified SkyEmail send-as aliases.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail 10 Alias Pack monthly", lookupKey: "skyemail_alias_pack_10_monthly", amount: 200, interval: "month" }
    ],
    includes: "skyemail_capacity_10_aliases"
  },
  {
    planId: "skyemail-ai-response-starter",
    productName: "SkyEmail AI Response Starter",
    description: "Paid SkyEmail Brain starter add-on with SkyeGate FS27 metering, SkyePay entitlement claims, mailbox-scoped usage ledgering, owner-reviewed response drafts, and no browser-side model keys.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    brainOwner: "skyemail-fs27-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail AI Response Starter monthly", lookupKey: "skyemail_ai_response_starter_monthly", amount: 3500, interval: "month" }
    ],
    includes: "skyemail_brain_125_metered_calls_fs27_skygate_skypay_entitlement"
  },
  {
    planId: "skyemail-ai-response-plus",
    productName: "SkyEmail AI Response Plus",
    description: "Higher-volume SkyEmail Brain add-on with SkyeGate FS27 metering, SkyePay entitlement claims, usage caps, priority draft work, expanded FAQ tuning, and no direct outside-model exposure.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    brainOwner: "skyemail-fs27-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail AI Response Plus monthly", lookupKey: "skyemail_ai_response_plus_monthly", amount: 7900, interval: "month" }
    ],
    includes: "skyemail_brain_425_metered_calls_fs27_skygate_skypay_entitlement"
  },
  {
    planId: "skyemail-managed-ai-inbox",
    productName: "SkyEmail Managed AI Inbox",
    description: "Managed SkyEmail Brain inbox add-on with SkyeGate FS27 metering, SkyePay entitlement claims, monitored usage caps, allowlisted routine response policy, and human escalation boundaries.",
    sourceFolder: "metraiyux_0s_site/live/SkyeMail",
    sourceFile: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
    offerFamily: "skyemail",
    brainOwner: "skyemail-fs27-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "SkyEmail Managed AI Inbox monthly", lookupKey: "skyemail_managed_ai_inbox_monthly", amount: 14900, interval: "month" }
    ],
    includes: "skyemail_managed_inbox_1000_metered_calls_fs27_skygate_skypay_entitlement"
  }
];

const offers = [
  {
    planId: "starter-command",
    productName: "MetrAIyux 0S - Starter Command",
    description: "Starter company operating room with ConnectLog relationship capture, Relay13 bridge readiness, proof routing, and owner-approved workspace activation.",
    sourceFolder: "metraiyux_0s_site",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Starter Command setup", lookupKey: "metraiyux_starter_command_setup", amount: 150000 },
      { kind: "monthly", nickname: "Starter Command monthly", lookupKey: "metraiyux_starter_command_monthly", amount: 39700, interval: "month" }
    ],
    includes: "connectlog_relay13_houseops_skyebox_skyeroutex_static_ready"
  },
  {
    planId: "growth-cabinet",
    productName: "MetrAIyux 0S - Growth Cabinet",
    description: "Growth operating room with ConnectLog workflows, Relay13 workspace bridge, proof exports, weekly operating rhythm, and owner-approved activation.",
    sourceFolder: "metraiyux_0s_site",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Growth Cabinet setup", lookupKey: "metraiyux_growth_cabinet_setup", amount: 350000 },
      { kind: "monthly", nickname: "Growth Cabinet monthly", lookupKey: "metraiyux_growth_cabinet_monthly", amount: 99700, interval: "month" }
    ],
    includes: "connectlog_relay13_houseops_skyebox_skyeroutex_workflow_map"
  },
  {
    planId: "agentic-growth-starter",
    productName: "Agentic Growth Layer - Starter",
    description: "No-domain and preview-site agentic growth cycles: seed keyword fallback, competitor mapping, site inventory intake, service/location/FAQ/CTA draft tasks, static patch manifests, and proof-safe review gates.",
    sourceFolder: "packages/agentic-growth-layer",
    offerFamily: "agentic_growth",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Agentic Growth Starter setup", lookupKey: "agentic_growth_starter_setup", amount: 150000 },
      { kind: "monthly", nickname: "Agentic Growth Starter monthly", lookupKey: "agentic_growth_starter_monthly", amount: 49700, interval: "month" }
    ],
    includes: "no_domain_preview_growth_cycles_seed_keywords_competitor_mapping_static_patch_manifests"
  },
  {
    planId: "agentic-growth-connected",
    productName: "Agentic Growth Layer - Connected",
    description: "Connected agentic growth monitoring for live client sites: GSC, SEMrush, live SERP, keyword, and crawl ingestion with prioritized developer-agent tasks, experiment ledger, static patch manifests, and monthly proof packet.",
    sourceFolder: "packages/agentic-growth-layer",
    offerFamily: "agentic_growth",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Agentic Growth Connected setup", lookupKey: "agentic_growth_connected_setup", amount: 350000 },
      { kind: "monthly", nickname: "Agentic Growth Connected monthly", lookupKey: "agentic_growth_connected_monthly", amount: 149700, interval: "month" }
    ],
    includes: "gsc_semrush_dataforseo_serp_pull_prioritized_tasks_experiment_ledger_proof_packet"
  },
  {
    planId: "agentic-growth-operator",
    productName: "Agentic Growth Layer - Operator",
    description: "Managed operator lane for approved auto-apply adapters, live browser proof receipts, monthly site improvement cadence, source-pull hardening, and owner-reviewed publishing policy.",
    sourceFolder: "packages/agentic-growth-layer",
    offerFamily: "agentic_growth",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Agentic Growth Operator setup", lookupKey: "agentic_growth_operator_setup", amount: 750000 },
      { kind: "monthly", nickname: "Agentic Growth Operator monthly", lookupKey: "agentic_growth_operator_monthly", amount: 299700, interval: "month" }
    ],
    includes: "managed_adapter_auto_apply_policy_live_browser_proof_monthly_growth_ledger"
  },
  {
    planId: "skyenet-edge-starter",
    productName: "SkyeNet Edge Starter",
    description: "Owner-approved SkyeNet starter hosting lane for one static surface, shared-gate deploy control, route registration, observability receipts, and capped Free99-safe usage.",
    sourceFolder: "metraiyux_0s_site/skyenet",
    offerFamily: "skyenet",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "SkyeNet Edge Starter setup", lookupKey: "skyenet_edge_starter_setup", amount: 29700 },
      { kind: "monthly", nickname: "SkyeNet Edge Starter monthly", lookupKey: "skyenet_edge_starter_monthly", amount: 9700, interval: "month" }
    ],
    includes: "static_drop_route_registry_observability_free99_caps_owner_approval"
  },
  {
    planId: "skyenet-edge-growth",
    productName: "SkyeNet Edge Growth",
    description: "Owner-approved SkyeNet growth lane for multiple routed surfaces, deployment receipts, custom route support, managed platform functions, and stronger usage guardrails.",
    sourceFolder: "metraiyux_0s_site/skyenet",
    offerFamily: "skyenet",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "SkyeNet Edge Growth setup", lookupKey: "skyenet_edge_growth_setup", amount: 99700 },
      { kind: "monthly", nickname: "SkyeNet Edge Growth monthly", lookupKey: "skyenet_edge_growth_monthly", amount: 29700, interval: "month" }
    ],
    includes: "multi_surface_skynet_hosting_custom_routes_managed_functions_cost_receipts"
  },
  {
    planId: "skyenet-functions-managed",
    productName: "SkyeNet Functions Managed",
    description: "Managed SkyeNet Functions lane for Netlify-compatible function intake, conversion, inspection, signing, staging, and platform-owned execution support under owner-approved limits.",
    sourceFolder: "tools/skyenet-functions-convert.mjs",
    offerFamily: "skyenet",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "SkyeNet Functions Managed setup", lookupKey: "skyenet_functions_managed_setup", amount: 150000 },
      { kind: "monthly", nickname: "SkyeNet Functions Managed monthly", lookupKey: "skyenet_functions_managed_monthly", amount: 49700, interval: "month" }
    ],
    includes: "netlify_functions_intake_conversion_signing_staging_managed_execution"
  },
  {
    planId: "skyenet-sovereign-runtime-reserve",
    productName: "SkyeNet Sovereign Runtime Reserve",
    description: "Owner-scoped SkyeNet capacity reserve for isolated customer-uploaded functions, private runtime admission, secret boundaries, egress policy, abuse controls, and billing cutoffs.",
    sourceFolder: "docs/SKYENET_HYBRID_RELEASE_ARCHITECTURE.md",
    offerFamily: "skyenet",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "SkyeNet Sovereign Runtime setup reserve", lookupKey: "skyenet_sovereign_runtime_setup", amount: 500000 },
      { kind: "monthly", nickname: "SkyeNet Sovereign Runtime monthly reserve", lookupKey: "skyenet_sovereign_runtime_monthly", amount: 99700, interval: "month" }
    ],
    includes: "private_runtime_isolation_secret_egress_abuse_controls_billing_cutoffs"
  },
  {
    planId: "houseoperations-command",
    productName: "MetrAIyux 0S - HouseOperations Command",
    description: "Paid HouseOperations command room with task, vendor, owner-alert, proof, tutorial, local SkyeBox vault, and FS27 PIN Gate handoff boundaries.",
    sourceFolder: "metraiyux_0s_site/HouseOperations",
    brainOwner: "marcus-vale-brain",
    prices: [
      { kind: "setup", nickname: "HouseOperations Command setup", lookupKey: "metraiyux_houseoperations_command_setup", amount: 250000 },
      { kind: "monthly", nickname: "HouseOperations Command monthly", lookupKey: "metraiyux_houseoperations_command_monthly", amount: 49700, interval: "month" }
    ],
    includes: "houseoperations_task_vendor_alert_proof_skyebox_pin_gate_tutorial"
  },
  {
    planId: "houseoperations-managed",
    productName: "MetrAIyux 0S - HouseOperations Managed",
    description: "Managed HouseOperations rollout with weekly proof review, multiple local vault handoffs, event mirror policy, and operator handoff.",
    sourceFolder: "metraiyux_0s_site/HouseOperations",
    brainOwner: "marcus-vale-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "HouseOperations Managed setup", lookupKey: "metraiyux_houseoperations_managed_setup", amount: 500000 },
      { kind: "monthly", nickname: "HouseOperations Managed monthly", lookupKey: "metraiyux_houseoperations_managed_monthly", amount: 99700, interval: "month" }
    ],
    includes: "managed_houseoperations_weekly_proof_multi_vault_event_mirror_policy"
  },
  {
    planId: "routex-workforce-command",
    productName: "MetrAIyux 0S - RouteX Workforce Command",
    description: "Owner-approved workforce command lane with SkyeRoutexFlow v0.4.0 local proof, V83 routed shell, jobs, assignments, proof, payments, stops, and reports.",
    sourceFolder: "metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0",
    brainOwner: "marcus-vale-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "RouteX Workforce Command setup", lookupKey: "metraiyux_routex_workforce_command_setup", amount: 650000 },
      { kind: "monthly", nickname: "RouteX Workforce Command monthly", lookupKey: "metraiyux_routex_workforce_command_monthly", amount: 149700, interval: "month" }
    ],
    includes: "skyeroutex_v040_api_browser_proof_v83_local_runtime"
  },
  {
    planId: "autonomous-office",
    productName: "MetrAIyux 0S - Autonomous Office",
    description: "Full managed office lane with stronger gate persistence, approval inboxes, ConnectLog operator proof, Relay13 live handoff, connector readiness, and owner-approved sovereign stack activation.",
    sourceFolder: "metraiyux_0s_site",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Autonomous Office setup", lookupKey: "metraiyux_autonomous_office_setup", amount: 750000 },
      { kind: "monthly", nickname: "Autonomous Office monthly", lookupKey: "metraiyux_autonomous_office_monthly", amount: 249700, interval: "month" }
    ],
    includes: "connectlog_relay13_houseops_skyebox_skyeroutex_v040_handoff"
  },
  {
    planId: "enterprise-command",
    productName: "MetrAIyux 0S - Enterprise",
    description: "Enterprise managed gate base with custom written limits, ConnectLog/Relay13 architecture, SkyeRouteX deployment scope, and audit exports.",
    sourceFolder: "metraiyux_0s_site",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Enterprise setup", lookupKey: "metraiyux_enterprise_setup", amount: 1500000 },
      { kind: "monthly", nickname: "Enterprise monthly", lookupKey: "metraiyux_enterprise_monthly", amount: 399700, interval: "month" }
    ],
    includes: "managed_connectlog_relay13_houseops_skyebox_custom_skyeroutex_v040"
  },
  {
    planId: "ae-flowpro-manual-json-ledger",
    productName: "AE FlowPro Manual JSON Ledger Backup",
    description: "Low-cost AE FlowPro backup lane for local-first CRM users who want an app-kept JSON ledger, manual export/import workflow, and owner-visible backup receipts without automatic external database sync.",
    sourceFolder: "metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro",
    offerFamily: "ae-flowpro",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "AE FlowPro Manual JSON Ledger", lookupKey: "ae_flowpro_manual_json_ledger_monthly", amount: 499, interval: "month" }
    ],
    includes: "local_json_ledger_manual_backup_owner_receipts_no_auto_cloud_sync"
  },
  {
    planId: "ae-flowpro-cloud-sync-unlimited",
    productName: "AE FlowPro Cloud Sync Unlimited",
    description: "AE FlowPro cloud sync lane with app-kept JSON ledger, CitadelDB primary storage, Neon fallback mirror when configured, and a two-day external database write cadence for durable CRM backups.",
    sourceFolder: "metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro",
    offerFamily: "ae-flowpro",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "monthly", nickname: "AE FlowPro Cloud Sync Unlimited", lookupKey: "ae_flowpro_cloud_sync_unlimited_monthly", amount: 1299, interval: "month" }
    ],
    includes: "json_ledger_citadeldb_primary_neon_fallback_two_day_external_sync"
  },
  ...skyEmailOffers,
  ...mediaOverLondonOffers,
  ...musicOffers,
  {
    planId: "skygatefs27-managed",
    productName: "SkyeGate FS27 Managed Control Plane",
    description: "Managed gate operations, billing visibility, auth clearance, usage ledger, platform mirroring, and control-plane support.",
    sourceFolder: "SkyeGate FS27",
    brainOwner: "naomi-sterling-brain",
    prices: [
      { kind: "onboarding", nickname: "Managed gate onboarding", lookupKey: "skygatefs27_managed_gate_onboarding", amount: 1250000 },
      { kind: "monthly", nickname: "Managed gate operations monthly", lookupKey: "skygatefs27_managed_control_plane_monthly", amount: 125000, interval: "month" }
    ],
    includes: "auth_usage_billing_platform_event_mirroring"
  },
  {
    planId: "skygatefs27-lane-maintenance",
    productName: "SkyeGate FS27 Lane Maintenance",
    description: "Monthly lane maintenance for gate-connected client app routes, updates, small fixes, and proof support.",
    sourceFolder: "SkyeGate FS27",
    brainOwner: "naomi-sterling-brain",
    prices: [
      { kind: "monthly", nickname: "Lane maintenance monthly", lookupKey: "skygatefs27_lane_maintenance_monthly", amount: 24900, interval: "month" }
    ],
    includes: "lane_updates_small_tweaks_support"
  }
];

function form(data) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  return params;
}

async function stripe(method, route, data = null) {
  const response = await fetch(`https://api.stripe.com/v1/${route}`, {
    method,
    headers: {
      authorization: `Bearer ${stripeKey}`,
      ...(data ? { "content-type": "application/x-www-form-urlencoded" } : {})
    },
    body: data ? form(data).toString() : undefined
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(JSON.stringify({ method, route, status: response.status, error: body.error?.message || body }));
  }
  return body;
}

async function listPricesByLookup(lookupKey) {
  const params = new URLSearchParams();
  params.set("limit", "10");
  params.append("lookup_keys[]", lookupKey);
  params.append("expand[]", "data.product");
  const response = await fetch(`https://api.stripe.com/v1/prices?${params}`, {
    headers: { authorization: `Bearer ${stripeKey}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(JSON.stringify({ lookupKey, status: response.status, error: body.error?.message || body }));
  return body.data || [];
}

async function searchProductsByPlan(planId) {
  const params = new URLSearchParams();
  params.set("limit", "10");
  params.set("query", `metadata['plan_id']:'${planId}'`);
  const response = await fetch(`https://api.stripe.com/v1/products/search?${params}`, {
    headers: { authorization: `Bearer ${stripeKey}` }
  });
  const body = await response.json();
  if (!response.ok) return [];
  return body.data || [];
}

function priceMatches(price, spec) {
  return (
    price.active === true &&
    price.unit_amount === spec.amount &&
    price.currency === "usd" &&
    (spec.interval ? price.recurring?.interval === spec.interval : !price.recurring)
  );
}

function productId(product) {
  return typeof product === "string" ? product : product?.id;
}

async function ensureProduct(offer, existingPrices) {
  const fromPrices = existingPrices.map((price) => productId(price.product)).filter(Boolean);
  if (fromPrices[0]) return fromPrices[0];

  const byPlan = await searchProductsByPlan(offer.planId);
  if (byPlan[0]?.id) return byPlan[0].id;

  if (DRY_RUN) return `dry_run_product_${offer.planId}`;

  const product = await stripe("POST", "products", {
    name: offer.productName,
    description: offer.description,
    statement_descriptor: offer.productName.startsWith("SkyeGate") ? "SKYEGATEFS27" : "METRAIYUX0S",
    "metadata[source_folder]": offer.sourceFolder,
    "metadata[source_file]": offer.sourceFile || "STRIPE_PRODUCT_PRICE_CATALOG.md",
    "metadata[offer_family]": offer.offerFamily || (offer.productName.startsWith("SkyeGate") ? "skygate" : "metraiyux"),
    "metadata[plan_id]": offer.planId,
    "metadata[status]": offer.status || "approved",
    "metadata[brain_owner]": offer.brainOwner,
    "metadata[includes]": offer.includes,
    ...(offer.ownerApprovalRequired ? { "metadata[owner_approval_required]": "true" } : {})
  });
  return product.id;
}

async function updateProduct(productIdValue, offer) {
  if (DRY_RUN || String(productIdValue).startsWith("dry_run_")) return { updated: false };
  return stripe("POST", `products/${productIdValue}`, {
    name: offer.productName,
    description: offer.description,
    "metadata[source_folder]": offer.sourceFolder,
    "metadata[source_file]": offer.sourceFile || "STRIPE_PRODUCT_PRICE_CATALOG.md",
    "metadata[offer_family]": offer.offerFamily || (offer.productName.startsWith("SkyeGate") ? "skygate" : "metraiyux"),
    "metadata[plan_id]": offer.planId,
    "metadata[status]": offer.status || "approved",
    "metadata[brain_owner]": offer.brainOwner,
    "metadata[includes]": offer.includes,
    ...(offer.ownerApprovalRequired ? { "metadata[owner_approval_required]": "true" } : {})
  });
}

async function createPrice(productIdValue, offer, spec) {
  if (DRY_RUN) {
    return {
      id: `dry_run_price_${spec.lookupKey}`,
      active: true,
      livemode: false,
      lookup_key: spec.lookupKey,
      unit_amount: spec.amount,
      recurring: spec.interval ? { interval: spec.interval } : null,
      product: productIdValue
    };
  }
  return stripe("POST", "prices", {
    product: productIdValue,
    currency: "usd",
    unit_amount: spec.amount,
    ...(spec.interval ? { "recurring[interval]": spec.interval } : {}),
    nickname: spec.nickname,
    lookup_key: spec.lookupKey,
    transfer_lookup_key: "true",
    "metadata[source_folder]": offer.sourceFolder,
    "metadata[source_file]": offer.sourceFile || "STRIPE_PRODUCT_PRICE_CATALOG.md",
    "metadata[offer_family]": offer.offerFamily || (offer.productName.startsWith("SkyeGate") ? "skygate" : "metraiyux"),
    "metadata[plan_id]": offer.planId,
    "metadata[status]": offer.status || "approved",
    "metadata[brain_owner]": offer.brainOwner,
    "metadata[price_kind]": spec.kind,
    "metadata[includes]": offer.includes,
    ...(spec.kind !== "monthly" ? { "metadata[setup_for]": offer.planId } : {}),
    ...(offer.ownerApprovalRequired ? { "metadata[owner_approval_required]": "true" } : {})
  });
}

async function archivePrice(priceIdValue) {
  if (DRY_RUN || !priceIdValue || String(priceIdValue).startsWith("dry_run_")) return null;
  return stripe("POST", `prices/${priceIdValue}`, { active: "false" });
}

const startedAt = new Date().toISOString();
const account = await stripe("GET", "account");
const selectedOffers = PLAN_FILTERS.length ? offers.filter((offer) => PLAN_FILTERS.includes(offer.planId)) : offers;
if (PLAN_FILTERS.length && selectedOffers.length !== PLAN_FILTERS.length) {
  const found = new Set(selectedOffers.map((offer) => offer.planId));
  const missing = PLAN_FILTERS.filter((plan) => !found.has(plan));
  throw new Error(`Unknown Stripe plan filter(s): ${missing.join(", ")}`);
}
const receipt = {
  ok: true,
  mode: DRY_RUN ? "dry_run" : "live",
  generated_at: startedAt,
  stripe_account: {
    id: account.id,
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted
  },
  source_env_file: ENV_FILE.replace(ROOT, "."),
  plan_filters: PLAN_FILTERS,
  synced: []
};

for (const offer of selectedOffers) {
  const existingBySpec = {};
  const allExisting = [];
  for (const spec of offer.prices) {
    const prices = await listPricesByLookup(spec.lookupKey);
    existingBySpec[spec.lookupKey] = prices;
    allExisting.push(...prices);
  }

  const product = await ensureProduct(offer, allExisting);
  await updateProduct(product, offer);
  const offerReceipt = {
    plan_id: offer.planId,
    product_id: product,
    product_name: offer.productName,
    prices: []
  };

  for (const spec of offer.prices) {
    const existing = existingBySpec[spec.lookupKey] || [];
    const current = existing.find((price) => priceMatches(price, spec));
    if (current) {
      offerReceipt.prices.push({
        lookup_key: spec.lookupKey,
        desired_amount_cents: spec.amount,
        interval: spec.interval || null,
        action: "reused_current_price",
        price_id: current.id,
        livemode: current.livemode,
        archived_price_ids: []
      });
      continue;
    }

    const stale = existing.map((price) => ({
      id: price.id,
      amount_cents: price.unit_amount,
      interval: price.recurring?.interval || null,
      active: price.active,
      livemode: price.livemode
    }));

    const created = await createPrice(product, offer, spec);
    const archived = [];
    for (const price of existing) {
      if (price.id !== created.id && price.active) {
        await archivePrice(price.id);
        archived.push(price.id);
      }
    }
    offerReceipt.prices.push({
      lookup_key: spec.lookupKey,
      desired_amount_cents: spec.amount,
      interval: spec.interval || null,
      action: stale.length ? "created_replacement_price" : "created_new_price",
      price_id: created.id,
      livemode: created.livemode,
      stale_before: stale,
      archived_price_ids: archived
    });
  }

  receipt.synced.push(offerReceipt);
}

receipt.completed_at = new Date().toISOString();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  mode: receipt.mode,
  stripe_account: receipt.stripe_account.id,
  synced_offer_count: receipt.synced.length,
  changed_price_count: receipt.synced.flatMap((offer) => offer.prices).filter((price) => price.action !== "reused_current_price").length,
  receipt: OUT_FILE
}, null, 2));
