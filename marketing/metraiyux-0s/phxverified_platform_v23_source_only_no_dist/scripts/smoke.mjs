import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0;
let fail = 0;

async function read(rel){ return fs.readFile(path.join(DIST, rel), 'utf8'); }
async function exists(rel){ try{ await fs.access(path.join(DIST, rel)); return true; }catch{ return false; } }
function ok(condition, label){ if(condition){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }
function has(body, needle){ return body.includes(needle); }
function parseJson(body, label){ try{ const out = JSON.parse(body); ok(true, `${label} parses as JSON`); return out; } catch(error){ ok(false, `${label} parses as JSON: ${error.message}`); return {}; } }

const report = parseJson(await read('seed-report.json'), 'seed report');
const data = parseJson(await read('data/businesses.json'), 'business data');
const searchIndex = parseJson(await read('data/search-index.json'), 'search index');
const offersData = parseJson(await read('data/offers.json'), 'offers data');
const marketData = parseJson(await read('data/market-index.json'), 'market index');
const coverageData = parseJson(await read('data/coverage-gaps.json'), 'coverage gaps');
const matchData = parseJson(await read('data/match-index.json'), 'match index');
const sponsorData = parseJson(await read('data/sponsor-inventory.json'), 'sponsor inventory');
const outreachData = parseJson(await read('data/outreach-packets.json'), 'outreach packets');
const vcardsData = await read('data/vcards.vcf');
const categoriesData = parseJson(await read('data/categories.json'), 'categories data');
const citiesData = parseJson(await read('data/cities.json'), 'cities data');
const duplicateReport = parseJson(await read('data/duplicate-report.json'), 'duplicate report');
const moderationData = parseJson(await read('data/moderation-queue.json'), 'moderation queue');
const identityData = parseJson(await read('data/business-identity-index.json'), 'business identity index');
const taxonomyData = parseJson(await read('data/taxonomy.json'), 'taxonomy data');
const routeManifest = parseJson(await read('data/route-manifest.json'), 'route manifest');
const importQuality = parseJson(await read('data/import-quality.json'), 'import quality');
const importRejections = parseJson(await read('data/import-rejections.json'), 'import rejections');
const sourceBatches = parseJson(await read('data/source-batches.json'), 'source batches');
const posterRisk = parseJson(await read('data/poster-risk-index.json'), 'poster risk index');
const canonicalAliases = parseJson(await read('data/canonical-aliases.json'), 'canonical aliases');
const suppressionTemplate = parseJson(await read('data/suppression-template.json'), 'suppression template');
const adminActionPackets = parseJson(await read('data/admin-action-packets.json'), 'admin action packets');
const contactFingerprint = parseJson(await read('data/contact-fingerprint-index.json'), 'contact fingerprint index');
const duplicateClusters = parseJson(await read('data/duplicate-clusters.json'), 'duplicate clusters');
const ownerPackets = parseJson(await read('data/owner-verification-packets.json'), 'owner verification packets');
const lifecycleQueue = parseJson(await read('data/business-lifecycle-queue.json'), 'business lifecycle queue');
const leadRules = parseJson(await read('data/lead-routing-rules.json'), 'lead routing rules');
const opportunities = parseJson(await read('data/category-opportunity-index.json'), 'category opportunity index');
const monetization = parseJson(await read('data/monetization-readiness.json'), 'monetization readiness');
const apiIndexData = parseJson(await read('data/platform-api-index.json'), 'platform API index');
const fraudDefense = parseJson(await read('data/fraud-defense.json'), 'fraud defense bundle');
const exposureProducts = parseJson(await read('data/exposure-products.json'), 'exposure products');
const activationPipeline = parseJson(await read('data/activation-pipeline.json'), 'activation pipeline');
const aeTerritoryPlan = parseJson(await read('data/ae-territory-plan.json'), 'AE territory plan');
const salesPlaybooks = parseJson(await read('data/sales-playbooks.json'), 'sales playbooks');
const revenueReadiness = parseJson(await read('data/revenue-readiness.json'), 'revenue readiness');
const marketplaceCommandCenter = parseJson(await read('data/marketplace-command-center.json'), 'marketplace command center');
const publicClaimsLedger = parseJson(await read('data/public-claims-ledger.json'), 'public claims ledger');
const productionReadiness = parseJson(await read('data/production-readiness.json'), 'production readiness gate');
const launchPacket = parseJson(await read('data/launch-packet.json'), 'launch packet');
const backendContracts = parseJson(await read('data/backend-action-contracts.json'), 'backend action contracts');
const mutationQueue = parseJson(await read('data/mutation-queue-template.json'), 'mutation queue template');
const ownerCrmIndex = parseJson(await read('data/owner-crm-index.json'), 'owner CRM index');
const aeWorkOrders = parseJson(await read('data/ae-work-orders.json'), 'AE work orders');
const leadInboxQueue = parseJson(await read('data/lead-inbox-queue.json'), 'lead inbox queue');
const listingOpsIndex = parseJson(await read('data/listing-ops-index.json'), 'listing ops index');
const runtimeStateModelData = parseJson(await read('data/runtime-state-model.json'), 'runtime state model');
const dbContractsData = parseJson(await read('data/db-contracts.json'), 'database contracts');
const approvalWorkflowData = parseJson(await read('data/approval-workflow.json'), 'approval workflow');
const mutationServiceModel = parseJson(await read('data/mutation-service-model.json'), 'mutation service model');
const eventLedgerModel = parseJson(await read('data/event-ledger-model.json'), 'event ledger model');
const webhookOutboxTemplate = parseJson(await read('data/webhook-outbox-template.json'), 'webhook outbox template');
const adminChangeSetTemplate = parseJson(await read('data/admin-change-set-template.json'), 'admin change-set template');
const policyEngineData = parseJson(await read('data/policy-engine.json'), 'policy engine');
const apiMutationServiceModel = parseJson(await read('api/mutation-service-model.json'), 'static API mutation service model');
const apiEventLedgerModel = parseJson(await read('api/event-ledger-model.json'), 'static API event ledger model');
const apiPolicyEngine = parseJson(await read('api/policy-engine.json'), 'static API policy engine');
const d1SchemaSql = await read('data/d1-schema.sql');
const neonSchemaSql = await read('data/neon-schema.sql');
const accountScores = parseJson(await read('data/account-opportunity-score.json'), 'account opportunity score');
const aePipeline = parseJson(await read('data/ae-pipeline-board.json'), 'AE pipeline board');
const claimStatusIndex = parseJson(await read('data/claim-status-index.json'), 'claim status index');
const marketplaceKpi = parseJson(await read('data/marketplace-kpi.json'), 'marketplace KPI');
const adminBatchActions = parseJson(await read('data/admin-batch-actions.json'), 'admin batch actions');
const serviceLaneCatalog = parseJson(await read('data/service-lane-catalog.json'), 'service lane catalog');
const ownerFollowupCalendarCsv = await read('data/owner-followup-calendar.csv');
const aeCallQueueCsv = await read('data/ae-call-queue.csv');
const apiBusinesses = parseJson(await read('api/businesses.json'), 'static API businesses');
const apiRuntimeState = parseJson(await read('api/runtime-state-model.json'), 'static API runtime state model');
const apiDbContracts = parseJson(await read('api/db-contracts.json'), 'static API database contracts');
const apiApprovalWorkflow = parseJson(await read('api/approval-workflow.json'), 'static API approval workflow');
const searchShardManifest = parseJson(await read('data/search-shard-manifest.json'), 'search shard manifest');
const canonicalRouting = parseJson(await read('data/canonical-routing.json'), 'canonical routing');
const seedFieldMap = parseJson(await read('data/seed-field-map.json'), 'seed field map');
const importDryRun = parseJson(await read('data/import-dry-run.json'), 'import dry run');
const crawlBudget = parseJson(await read('data/crawl-budget.json'), 'crawl budget');
const adminBulkCsv = await read('data/admin-bulk-actions.csv');
const seedSchema = parseJson(await read('data/seed-schema.json'), 'seed schema');
const seedTemplate = parseJson(await read('data/seed-template.json'), 'seed template');
const businessCsv = await read('data/businesses.csv');
const home = await read('index.html');
const directory = await read('directory/index.html');
const platform = await read('platform/index.html');
const dataPage = await read('data/index.html');
const operator = await read('operator/index.html');
const businessIndex = await read('business/index.html');
const categoryIndex = await read('category/index.html');
const cityIndex = await read('city/index.html');
const nicheIndex = await read('niche/index.html');
const marketIndex = await read('market/index.html');
const collectionIndex = await read('collection/index.html');
const joinPage = await read('join/index.html');
const pricingPage = await read('pricing/index.html');
const aeCommandPage = await read('ae-command/index.html');
const accountsPage = await read('accounts/index.html');
const pipelinePage = await read('pipeline/index.html');
const kpiPage = await read('kpi/index.html');
const serviceLanesPage = await read('service-lanes/index.html');
const activationPage = await read('activation/index.html');
const territoriesPage = await read('territories/index.html');
const revenuePage = await read('revenue/index.html');
const salesPlaybookPage = await read('sales-playbook/index.html');
const trustNetworkPage = await read('trust-network/index.html');
const productionReadinessPage = await read('production-readiness/index.html');
const claimsLedgerPage = await read('claims-ledger/index.html');
const launchPacketPage = await read('launch-packet/index.html');
const backendPage = await read('backend/index.html');
const actionQueuePage = await read('action-queue/index.html');
const leadInboxPage = await read('lead-inbox/index.html');
const ownerCrmPage = await read('owner-crm/index.html');
const aeWorkOrdersPage = await read('ae-work-orders/index.html');
const runtimeStatePage = await read('runtime-state/index.html');
const dbContractsPage = await read('db-contracts/index.html');
const approvalFlowPage = await read('approval-flow/index.html');
const mutationServicePage = await read('mutation-service/index.html');
const eventLedgerPage = await read('event-ledger/index.html');
const webhookOutboxPage = await read('webhook-outbox/index.html');
const changeSetsPage = await read('change-sets/index.html');
const policyEnginePage = await read('policy-engine/index.html');
const shortlistPage = await read('shortlist/index.html');
const comparePage = await read('compare/index.html');
const matchPage = await read('match/index.html');
const leadRoutingPage = await read('lead-routing/index.html');
const dealDeskPage = await read('deal-desk/index.html');
const offersPage = await read('offers/index.html');
const mapPage = await read('map/index.html');
const submitPage = await read('submit/index.html');
const requestPage = await read('request/index.html');
const claimPage = await read('claim/index.html');
const ownerVerificationPage = await read('owner-verification/index.html');
const lifecyclePage = await read('lifecycle/index.html');
const insightsPage = await read('insights/index.html');
const auditPage = await read('audit/index.html');
const coveragePage = await read('coverage/index.html');
const opportunitiesPage = await read('opportunities/index.html');
const outreachPage = await read('outreach/index.html');
const sponsorPage = await read('sponsor/index.html');
const monetizationPage = await read('monetization/index.html');
const exportsPage = await read('exports/index.html');
const adminReviewPage = await read('admin-review/index.html');
const adminActionsPage = await read('admin-actions/index.html');
const adminBatchPage = await read('admin-batch/index.html');
const importHealthPage = await read('import-health/index.html');
const dryRunPage = await read('dry-run/index.html');
const crawlPage = await read('crawl/index.html');
const routingPage = await read('routing/index.html');
const verificationPage = await read('verification/index.html');
const fraudDefensePage = await read('fraud-defense/index.html');
const duplicatesPage = await read('duplicates/index.html');
const apiPage = await read('api/index.html');
const embedPage = await read('embed/index.html');
const profileRenderer = await read('business-profile/index.html');
const redirects = await read('_redirects');
const embedJs = await read('embed/businesses.js');
const sitemap = await read('sitemap.xml');
const robotsTxt = await read('robots.txt');
const sitemapIndex = await read('sitemap-index.xml');
const sitemapPages = await read('sitemap-pages.xml');
const appJs = await read('assets/app.js');
const operatorJs = await read('assets/operator.js');
const stylesCss = await read('assets/styles.css');

const requiredFiles = [
  ['index.html', 'home page exists'],
  ['directory/index.html', 'directory page exists'],
  ['business/index.html', 'business profile index exists'],
  ['category/index.html', 'category index exists'],
  ['city/index.html', 'city index exists'],
  ['niche/index.html', 'niche index exists'],
  ['market/index.html', 'market matrix exists'],
  ['collection/index.html', 'collection index exists'],
  ['join/index.html', 'business owner join page exists'],
  ['pricing/index.html', 'pricing/exposure product page exists'],
  ['ae-command/index.html', 'AE command center exists'],
  ['accounts/index.html', 'account workbench exists'],
  ['pipeline/index.html', 'AE pipeline board page exists'],
  ['kpi/index.html', 'marketplace KPI page exists'],
  ['service-lanes/index.html', 'service lanes page exists'],
  ['activation/index.html', 'activation pipeline page exists'],
  ['territories/index.html', 'territory plan page exists'],
  ['revenue/index.html', 'revenue readiness page exists'],
  ['sales-playbook/index.html', 'sales playbook page exists'],
  ['trust-network/index.html', 'trust network page exists'],
  ['production-readiness/index.html', 'production readiness page exists'],
  ['claims-ledger/index.html', 'public claims ledger page exists'],
  ['launch-packet/index.html', 'launch packet page exists'],
  ['backend/index.html', 'backend contracts page exists'],
  ['action-queue/index.html', 'action queue page exists'],
  ['lead-inbox/index.html', 'lead inbox page exists'],
  ['owner-crm/index.html', 'owner CRM page exists'],
  ['ae-work-orders/index.html', 'AE work orders page exists'],
  ['runtime-state/index.html', 'runtime state page exists'],
  ['db-contracts/index.html', 'database contracts page exists'],
  ['approval-flow/index.html', 'approval flow page exists'],
  ['shortlist/index.html', 'shortlist workspace exists'],
  ['compare/index.html', 'comparison workspace exists'],
  ['match/index.html', 'match engine exists'],
  ['lead-routing/index.html', 'lead routing page exists'],
  ['deal-desk/index.html', 'deal desk exists'],
  ['offers/index.html', 'offers marketplace exists'],
  ['map/index.html', 'map discovery page exists'],
  ['submit/index.html', 'submit business page exists'],
  ['request/index.html', 'buyer request page exists'],
  ['claim/index.html', 'claim/update page exists'],
  ['owner-verification/index.html', 'owner verification page exists'],
  ['lifecycle/index.html', 'business lifecycle queue page exists'],
  ['insights/index.html', 'marketplace insights page exists'],
  ['audit/index.html', 'operator audit queue exists'],
  ['coverage/index.html', 'coverage intelligence page exists'],
  ['opportunities/index.html', 'opportunity index page exists'],
  ['outreach/index.html', 'outreach desk exists'],
  ['sponsor/index.html', 'sponsor inventory page exists'],
  ['monetization/index.html', 'monetization readiness page exists'],
  ['exports/index.html', 'export vault exists'],
  ['admin-review/index.html', 'admin review console exists'],
  ['admin-actions/index.html', 'admin action queue exists'],
  ['admin-batch/index.html', 'admin batch builder exists'],
  ['import-health/index.html', 'import health page exists'],
  ['dry-run/index.html', 'import dry-run page exists'],
  ['crawl/index.html', 'crawl control page exists'],
  ['routing/index.html', 'canonical routing page exists'],
  ['verification/index.html', 'verification protocol page exists'],
  ['fraud-defense/index.html', 'fraud defense page exists'],
  ['duplicates/index.html', 'duplicate scanner exists'],
  ['api/index.html', 'static API page exists'],
  ['embed/index.html', 'embed kit page exists'],
  ['business-profile/index.html', 'scalable business profile renderer exists'],
  ['_redirects', 'static redirect file exists'],
  ['platform/index.html', 'platform status page exists'],
  ['data/index.html', 'data pipeline page exists'],
  ['operator/index.html', 'operator import console exists'],
  ['404.html', '404 page exists'],
  ['assets/valley-verified-logo.png', 'Valley Verified logo asset exists'],
  ['data/businesses.json', 'published business data exists'],
  ['data/businesses.csv', 'published business CSV exists'],
  ['data/search-index.json', 'search index exists'],
  ['data/offers.json', 'offer index exists'],
  ['data/market-index.json', 'market index data exists'],
  ['data/coverage-gaps.json', 'coverage gaps data exists'],
  ['data/match-index.json', 'match index data exists'],
  ['data/sponsor-inventory.json', 'sponsor inventory data exists'],
  ['data/outreach-packets.json', 'outreach packet data exists'],
  ['data/vcards.vcf', 'bulk vCard export exists'],
  ['data/categories.json', 'category data exists'],
  ['data/cities.json', 'city data exists'],
  ['data/duplicate-report.json', 'duplicate report exists'],
  ['data/moderation-queue.json', 'moderation queue exists'],
  ['data/business-identity-index.json', 'identity index exists'],
  ['data/taxonomy.json', 'taxonomy data exists'],
  ['data/seed-schema.json', 'seed schema exists'],
  ['data/seed-template.json', 'seed template exists'],
  ['data/route-manifest.json', 'route manifest exists'],
  ['data/import-quality.json', 'import quality report exists'],
  ['data/import-rejections.json', 'import rejection candidate report exists'],
  ['data/source-batches.json', 'source batch ledger exists'],
  ['data/poster-risk-index.json', 'poster risk index exists'],
  ['data/canonical-aliases.json', 'canonical alias index exists'],
  ['data/canonical-routing.json', 'canonical routing index exists'],
  ['data/seed-field-map.json', 'seed field map exists'],
  ['data/import-dry-run.json', 'import dry-run report exists'],
  ['data/crawl-budget.json', 'crawl budget report exists'],
  ['data/admin-bulk-actions.csv', 'admin bulk action CSV exists'],
  ['data/suppression-template.json', 'suppression template exists'],
  ['data/admin-action-packets.json', 'admin action packet export exists'],
  ['data/contact-fingerprint-index.json', 'contact fingerprint index exists'],
  ['data/duplicate-clusters.json', 'duplicate cluster export exists'],
  ['data/owner-verification-packets.json', 'owner verification packet export exists'],
  ['data/business-lifecycle-queue.json', 'business lifecycle queue export exists'],
  ['data/lead-routing-rules.json', 'lead routing rules export exists'],
  ['data/category-opportunity-index.json', 'category opportunity index exists'],
  ['data/monetization-readiness.json', 'monetization readiness export exists'],
  ['data/platform-api-index.json', 'platform API index exists'],
  ['data/fraud-defense.json', 'fraud defense bundle exists'],
  ['data/public-claims-ledger.json', 'public claims ledger export exists'],
  ['data/production-readiness.json', 'production readiness export exists'],
  ['data/launch-packet.json', 'launch packet export exists'],
  ['data/backend-action-contracts.json', 'backend action contracts export exists'],
  ['data/mutation-queue-template.json', 'mutation queue template export exists'],
  ['data/owner-crm-index.json', 'owner CRM index export exists'],
  ['data/ae-work-orders.json', 'AE work orders export exists'],
  ['data/lead-inbox-queue.json', 'lead inbox queue export exists'],
  ['data/listing-ops-index.json', 'listing ops index export exists'],
  ['data/runtime-state-model.json', 'runtime state model export exists'],
  ['data/db-contracts.json', 'database contract export exists'],
  ['data/approval-workflow.json', 'approval workflow export exists'],
  ['data/d1-schema.sql', 'D1 SQL schema export exists'],
  ['data/neon-schema.sql', 'Neon SQL schema export exists'],
  ['data/account-opportunity-score.json', 'account opportunity score export exists'],
  ['data/ae-pipeline-board.json', 'AE pipeline board export exists'],
  ['data/claim-status-index.json', 'claim status index export exists'],
  ['data/marketplace-kpi.json', 'marketplace KPI export exists'],
  ['data/admin-batch-actions.json', 'admin batch action export exists'],
  ['data/service-lane-catalog.json', 'service lane catalog export exists'],
  ['data/owner-followup-calendar.csv', 'owner follow-up calendar CSV exists'],
  ['api/businesses.json', 'static API business endpoint exists'],
  ['api/search-index.json', 'static API search endpoint exists'],
  ['api/lead-routing-rules.json', 'static API lead routing endpoint exists'],
  ['api/backend-action-contracts.json', 'static API backend contracts endpoint exists'],
  ['api/owner-crm-index.json', 'static API owner CRM endpoint exists'],
  ['api/ae-work-orders.json', 'static API AE work orders endpoint exists'],
  ['api/lead-inbox-queue.json', 'static API lead inbox endpoint exists'],
  ['data/search-shard-manifest.json', 'search shard manifest exists'],
  ['embed/businesses.js', 'embeddable widget script exists'],
  ['sitemap.xml', 'sitemap exists'],
  ['sitemap-index.xml', 'sitemap index exists'],
  ['sitemap-pages.xml', 'pages sitemap exists'],
  ['robots.txt', 'robots file exists'],
  ['llms.txt', 'llms file exists']
];
for(const [rel,label] of requiredFiles) ok(await exists(rel), label);

ok(report.routes.total >= 35, 'route inventory contains platform-scale surfaces');
ok(report.routes.business_archive >= 1, 'paginated business archive route count is recorded');
ok(importQuality.raw_records === report.records.raw, 'import quality matches raw record count');
ok(importQuality.published_records === report.records.published, 'import quality matches published record count');
ok(Array.isArray(importRejections.records), 'import rejection candidates export is generated');
ok(Array.isArray(sourceBatches.batches) && sourceBatches.batches.length >= 1, 'source batch ledger contains seed files');
ok(Array.isArray(posterRisk.records), 'poster risk index export is generated');
ok(Array.isArray(canonicalAliases.records) && canonicalAliases.records.length === data.businesses.length, 'canonical alias index matches business count');
ok(Array.isArray(canonicalRouting.records) && canonicalRouting.records.length === data.businesses.length, 'canonical routing index matches business count');
ok(seedFieldMap.accepted_input_fields?.name?.includes('company_name'), 'seed field map documents company_name alias');
ok(importDryRun.raw_records === report.records.raw && importDryRun.would_publish === report.records.published, 'import dry-run matches seed report counts');
ok(crawlBudget.published_businesses === report.records.published, 'crawl budget matches published business count');
ok(adminBulkCsv.startsWith('action,priority,business_id'), 'admin bulk action CSV has expected header');
ok(Array.isArray(suppressionTemplate.notes) && suppressionTemplate.notes.length >= 1, 'suppression template documents removal workflow');
ok(Array.isArray(adminActionPackets.packets), 'admin action packet export is generated');
ok(Array.isArray(contactFingerprint.records), 'contact fingerprint index is generated');
ok(Array.isArray(duplicateClusters.clusters), 'duplicate cluster export is generated');
ok(Array.isArray(ownerPackets.packets) && ownerPackets.packets.length === data.businesses.length, 'owner verification packets match business count');
ok(Array.isArray(lifecycleQueue.tasks), 'business lifecycle queue is generated');
ok(Array.isArray(leadRules.rules) && leadRules.rules.length === marketData.markets.length, 'lead routing rules match market count');
ok(Array.isArray(opportunities.categories) && opportunities.categories.length === categoriesData.categories.length, 'category opportunity index matches category count');
ok(monetization.stats?.sellable_listings >= 0 && Array.isArray(monetization.market_inventory), 'monetization readiness is generated');
ok(Array.isArray(apiIndexData.endpoints) && apiIndexData.endpoints.length >= 5, 'static API index is generated');
ok(Array.isArray(fraudDefense.contact_fingerprints) && Array.isArray(fraudDefense.duplicate_clusters), 'fraud defense bundle contains fingerprints and clusters');
ok(apiBusinesses.count === data.businesses.length, 'static API business endpoint matches business count');
ok(Array.isArray(searchShardManifest.shards) && searchShardManifest.shards.length >= 1, 'search shard manifest is generated');
ok(report.records.published === data.businesses.length, 'seed report matches published business count');
ok(data.businesses.length > 0, 'business data is non-empty');
ok(Array.isArray(searchIndex.records) && searchIndex.records.length === data.businesses.length, 'search index matches business count');
ok(Array.isArray(offersData.offers) && offersData.offers.length > 0, 'offer data is generated');
ok(Array.isArray(marketData.markets) && marketData.markets.length > 0, 'market index is generated');
ok(Array.isArray(coverageData.gaps) && coverageData.gaps.length > 0, 'coverage gap data is generated');
ok(Array.isArray(matchData.records) && matchData.records.length === data.businesses.length, 'match index matches business count');
ok(Array.isArray(sponsorData.surfaces) && sponsorData.surfaces.length > 0, 'sponsor inventory is generated');
ok(Array.isArray(outreachData.packets) && outreachData.packets.length === data.businesses.length, 'outreach packets match business count');
ok(vcardsData.includes('BEGIN:VCARD') && vcardsData.includes('END:VCARD'), 'bulk vCard export contains vCards');
ok(Array.isArray(categoriesData.categories) && categoriesData.categories.length > 0, 'category data is generated');
ok(Array.isArray(citiesData.cities) && citiesData.cities.length > 0, 'city data is generated');
ok(Array.isArray(taxonomyData.categories) && taxonomyData.categories.length >= 8, 'taxonomy categories are generated');
ok(Array.isArray(taxonomyData.niches) && taxonomyData.niches.length >= 50, 'taxonomy niches are generated');
ok(Array.isArray(duplicateReport.exact_merges), 'duplicate report contains exact merge ledger');
ok(duplicateReport.stats?.exact_merges >= 1, 'duplicate import collision is merged, not double-posted');
ok(report.records.raw > report.records.published, 'raw duplicate import does not create another published listing');
ok(report.records.static_business_pages >= 1, 'static profile sample pages are generated');
ok(['hybrid-static-plus-renderer','full-static'].includes(report.records.profile_mode), 'profile publishing mode is recorded');
ok(Array.isArray(moderationData.records), 'moderation queue is generated');
ok(Array.isArray(identityData.records) && identityData.records.length === data.businesses.length, 'identity index matches business count');
ok(seedSchema.properties?.businesses?.type === 'array', 'seed schema documents business array');
ok(Array.isArray(seedTemplate.businesses) && seedTemplate.businesses.length === 1, 'seed template contains one starter business');
ok(businessCsv.startsWith('id,name,category'), 'business CSV has expected header');
ok(businessCsv.split('\n').length >= data.businesses.length + 1, 'business CSV has exported rows');
ok(Array.isArray(exposureProducts.products) && exposureProducts.products.length >= 6, 'exposure product catalog is generated');
ok(activationPipeline.stats?.records === data.businesses.length, 'activation pipeline covers every published business');
ok(Array.isArray(aeTerritoryPlan.territories) && aeTerritoryPlan.territories.length === citiesData.cities.length, 'AE territory plan covers every city');
ok(aeCallQueueCsv.startsWith('rank,business_id,name'), 'AE call queue CSV has expected header');
ok(Array.isArray(salesPlaybooks.ae_openers) && salesPlaybooks.ae_openers.length >= 3, 'sales playbooks include AE openers');
ok(revenueReadiness.scenarios?.conservative?.projected_mrr >= 0, 'revenue readiness includes conservative MRR model');
ok(marketplaceCommandCenter.mission?.includes('AE activation'), 'marketplace command center states AE activation mission');
ok(publicClaimsLedger.claims?.some(c => c.status === 'blocked'), 'public claims ledger blocks unsupported claims');
ok(publicClaimsLedger.claims?.some(c => c.claim.includes('one canonical public profile') || c.claim.includes('canonical')), 'public claims ledger covers one-business-one-profile claim');
ok(['production-candidate','not-production-ready'].includes(productionReadiness.package_status), 'production readiness has package status');
ok(productionReadiness.live_production_status === 'not-certified-until-live-url-smoke-passes', 'production readiness does not fake live certification');
ok(productionReadiness.gates?.some(g => g.gate === 'Admin/operator crawl safety' && g.status === 'pass'), 'production readiness includes admin crawl safety gate');
ok(launchPacket.deploy_folder === 'dist', 'launch packet declares dist publish folder');
ok(launchPacket.blocked_public_claims?.length >= 1, 'launch packet carries blocked public claims');
ok(Array.isArray(backendContracts.contracts) && backendContracts.contracts.length >= 6, 'backend action contracts expose mutation contracts');
ok(backendContracts.upstream_auth_required === true, 'backend action contracts require upstream auth');
ok(backendContracts.contracts.some(c => c.type === 'suppression_request'), 'backend contracts include suppression request flow');
ok(backendContracts.contracts.some(c => c.type === 'claim_status_update'), 'backend contracts include claim status runtime update');
ok(apiRuntimeState.version === '17.0.0', 'static API exposes runtime state model');
ok(apiDbContracts.tables?.length >= 6, 'static API exposes database contracts');
ok(apiApprovalWorkflow.stages?.length >= 6, 'static API exposes approval workflow');
ok(mutationQueue.queues?.length === backendContracts.contracts.length, 'mutation queue template mirrors backend contracts');
ok(ownerCrmIndex.stats?.owners === data.businesses.length, 'owner CRM covers every business');
ok(aeWorkOrders.stats?.work_orders >= 100, 'AE work orders generate a substantial rep queue');
ok(leadInboxQueue.stats?.lanes === leadRules.rules.length, 'lead inbox lanes match lead routing rules');
ok(listingOpsIndex.stats?.records === data.businesses.length, 'listing ops index covers every business');
ok(runtimeStateModelData.version === '17.0.0' && runtimeStateModelData.state_buckets?.length >= 8, 'runtime state model exposes projected state buckets');
ok(dbContractsData.tables?.length >= 6 && dbContractsData.d1_sql?.includes('phx_actions'), 'database contracts include runtime tables and SQL');
ok(approvalWorkflowData.stages?.length >= 6, 'approval workflow includes intake-to-seed stages');
ok(d1SchemaSql.includes('CREATE TABLE IF NOT EXISTS phx_actions'), 'D1 schema SQL includes actions table');
ok(neonSchemaSql.includes('phx_listing_state'), 'Neon schema SQL includes listing state table');
ok(Array.isArray(accountScores.accounts) && accountScores.accounts.length === data.businesses.length, 'account opportunity score covers every business');
ok(aePipeline.totals?.accounts === data.businesses.length, 'AE pipeline board covers every business');
ok(Array.isArray(claimStatusIndex.statuses) && claimStatusIndex.statuses.length >= 1, 'claim status index has lifecycle statuses');
ok(marketplaceKpi.kpis?.published_businesses === data.businesses.length, 'marketplace KPI matches published business count');
ok(adminBatchActions.batches?.owner_claims && adminBatchActions.suppression_patch_template, 'admin batch actions include owner claims and suppression template');
ok(Array.isArray(serviceLaneCatalog.lanes) && serviceLaneCatalog.lanes.length === categoriesData.categories.length, 'service lane catalog matches category count');
ok(ownerFollowupCalendarCsv.startsWith('due_date,rank,business_id'), 'owner follow-up calendar CSV has expected header');

ok(has(home, 'A free public business page as our gift') && has(home, 'See live client builds'), 'home is a platform landing page, not bare directory');
ok(has(home, '/assets/valley-verified-logo.png'), 'home uses supplied Valley Verified logo asset');
ok(has(stylesCss, 'brand-logo'), 'stylesheet styles the supplied Valley Verified logo');
ok(has(home, 'Buyer and operator workflows'), 'home links platform workflows');
ok(has(directory, 'data-directory-page'), 'directory has interactive marketplace controls');
ok(has(platform, 'Platform status and route inventory'), 'platform page has proof/status content');
ok(has(dataPage, 'Machine-readable exports'), 'data page documents exports');
ok(has(dataPage, 'Business CSV'), 'data page links CSV export');
ok(has(dataPage, 'Seed schema'), 'data page links seed schema');
ok(has(dataPage, 'Seed field map'), 'data page links seed field map');
ok(has(dataPage, 'Import dry run'), 'data page links import dry run');
ok(has(dataPage, 'Canonical routing'), 'data page links canonical routing');
ok(has(dataPage, 'Crawl budget'), 'data page links crawl budget');
ok(has(dataPage, 'Exposure products'), 'data page links exposure product export');
ok(has(dataPage, 'Activation pipeline'), 'data page links activation pipeline export');
ok(has(dataPage, 'AE territory plan'), 'data page links AE territory export');
ok(has(dataPage, 'Revenue readiness'), 'data page links revenue readiness export');
ok(has(dataPage, 'Production readiness'), 'data page links production readiness export');
ok(has(dataPage, 'Claims ledger'), 'data page links claims ledger export');
ok(has(dataPage, 'Launch packet'), 'data page links launch packet export');
ok(has(dataPage, 'Duplicate report'), 'data page links duplicate report');
ok(has(dataPage, 'Moderation queue'), 'data page links moderation queue');
ok(has(dataPage, 'Taxonomy'), 'data page links taxonomy export');
ok(has(operator, 'Scrape Import Console'), 'operator page has scrape import tooling');
ok(has(operator, 'seed/businesses/inbox/'), 'operator explains seed inbox workflow');
ok(has(businessIndex, 'Business Profiles'), 'business index has profile content');
ok(has(categoryIndex, 'Service lanes and category hubs'), 'category index has hub content');
ok(has(cityIndex, 'City hubs across the Phoenix market'), 'city index has hub content');
ok(has(nicheIndex, 'Service niches ready for live business seeding'), 'niche index has taxonomy lane content');
ok(has(marketIndex, 'City + category pages for local intent'), 'market index has city/category matrix content');
ok(has(collectionIndex, 'Curated buyer paths from seed signals'), 'collection index has generated collection content');
ok(has(joinPage, 'Claim the free landing') && has(joinPage, 'Upgrade only if you want more reach'), 'join page has business-owner no-obligation claim path');
ok(has(pricingPage, 'Our gift is the free landing') && has(pricingPage, 'Upgrades are optional'), 'pricing page has optional exposure product model');
ok(has(aeCommandPage, 'Give sales reps a real activation queue'), 'AE command page has real rep queue content');
ok(has(accountsPage, 'Ranked AE account targets'), 'account workbench has ranked AE account content');
ok(has(pipelinePage, 'Stage-based sales board'), 'pipeline page has stage board content');
ok(has(kpiPage, 'Operational metrics'), 'KPI page has marketplace metric content');
ok(has(serviceLanesPage, 'Category lanes'), 'service lanes page has category lane content');
ok(has(activationPage, 'Every seeded business gets a next commercial move'), 'activation page has commercial next-step pipeline');
ok(has(territoriesPage, 'Assign reps by city strength'), 'territory page has AE city assignment logic');
ok(has(revenuePage, 'Model the marketplace before selling it'), 'revenue page has planning model content');
ok(has(salesPlaybookPage, 'AE scripts for the verified business network'), 'sales playbook page has AE scripts');
ok(has(trustNetworkPage, 'One real business. One canonical profile'), 'trust network page states platform doctrine');
ok(has(productionReadinessPage, 'Production gate'), 'production readiness page has production gate content');
ok(has(productionReadinessPage, 'cannot certify live DNS/CDN/browser behavior'), 'production readiness page avoids fake live certification');
ok(has(claimsLedgerPage, 'Public claims ledger'), 'claims ledger page has claims content');
ok(has(claimsLedgerPage, 'guarantee leads'), 'claims ledger page blocks guarantee claims');
ok(has(launchPacketPage, 'Launch packet'), 'launch packet page has deployment content');
ok(has(launchPacketPage, 'Deployable package instructions'), 'launch packet page has deploy instructions');
ok(has(backendPage, 'Runtime mutation layer without fake live writes'), 'backend page states mutation layer without fake writes');
ok(has(backendPage, 'x-upstream-user-id'), 'backend page documents upstream auth identity headers');
ok(has(actionQueuePage, 'Every mutation becomes a reviewable work item'), 'action queue page explains reviewable work items');
ok(has(leadInboxPage, 'Incoming buyer requests have deterministic routing lanes'), 'lead inbox page explains deterministic routing');
ok(has(ownerCrmPage, 'Seeded supply becomes owner activation accounts'), 'owner CRM page explains owner activation');
ok(has(aeWorkOrdersPage, 'Daily operator tasks generated from the marketplace'), 'AE work orders page explains generated tasks');
ok(has(mutationServicePage, 'Actions now have a real service layer'), 'mutation service page explains service layer');
ok(has(eventLedgerPage, 'Every action can leave an auditable trail'), 'event ledger page explains audit trail');
ok(has(webhookOutboxPage, 'Provider-ready notifications without fake sending'), 'webhook outbox page avoids fake sending');
ok(has(changeSetsPage, 'Runtime decisions export into reviewable seed patches'), 'change-sets page explains seed patch exports');
ok(has(policyEnginePage, 'Mutations are blocked before they can poison listings'), 'policy engine page explains mutation defense');
ok(has(shortlistPage, 'Saved shortlist and request packet builder'), 'shortlist page has buyer workspace content');
ok(has(shortlistPage, 'data-shortlist-request'), 'shortlist page has request builder form');
ok(has(comparePage, 'data-compare-page'), 'compare page has interactive compare mount');
ok(has(comparePage, 'businessData'), 'compare page embeds business data JSON');
ok(has(matchPage, 'data-match-page'), 'match page has interactive match mount');
ok(has(matchPage, 'matchData'), 'match page embeds match data JSON');
ok(has(leadRoutingPage, 'Request routing rules for each seeded market'), 'lead routing page has generated routing rules');
ok(has(dealDeskPage, 'Local request operations'), 'deal desk explains request operations');
ok(has(offersPage, 'Service packages and quote-ready listings'), 'offers page has commercial marketplace content');
ok(has(mapPage, 'data-map-board'), 'map page has interactive map board mount');
ok(has(submitPage, 'data-seed-builder'), 'submit page has seed builder form');
ok(has(requestPage, 'data-request-builder'), 'request page has buyer request builder');
ok(has(claimPage, 'data-claim-builder'), 'claim page has owner update builder');
ok(has(ownerVerificationPage, 'Claim packets without adding local auth'), 'owner verification page has claim packet workflow');
ok(has(lifecyclePage, 'Every listing gets an operator next step'), 'lifecycle page has operator next-step queue');
ok(has(insightsPage, 'Data health and growth signals'), 'insights page has marketplace intelligence');
ok(has(auditPage, 'Data quality queue for marketplace growth'), 'audit page has operator queue');
ok(has(coveragePage, 'Know where the marketplace is thin'), 'coverage page has operator coverage intelligence');
ok(has(opportunitiesPage, 'Know which niches need enrichment'), 'opportunities page has growth index content');
ok(has(outreachPage, 'Outreach packets for listing cleanup'), 'outreach page has growth desk content');
ok(has(sponsorPage, 'Sponsored placement inventory'), 'sponsor page has revenue inventory content');
ok(has(monetizationPage, 'Sell placements only where the platform has enough supply'), 'monetization page has sellable inventory content');
ok(has(exportsPage, 'Data exports for operators'), 'exports page has export vault content');
ok(has(adminReviewPage, 'Business posting review console'), 'admin review page has posting control content');
ok(has(adminActionsPage, 'Admin action queue'), 'admin action page has operator queue content');
ok(has(adminActionsPage, 'Suppression starter'), 'admin action page exposes suppression template');
ok(has(adminBatchPage, 'Admin batch builder'), 'admin batch page has batch action content');
ok(has(adminBatchPage, 'Suppression patch'), 'admin batch page exposes suppression patch');
ok(has(importHealthPage, 'Import health'), 'import health page has batch quality content');
ok(has(importHealthPage, 'Poster risk index'), 'import health page links poster risk index');
ok(has(dryRunPage, 'Import dry run'), 'dry-run page has import dry-run content');
ok(has(dryRunPage, 'npm run dry-run'), 'dry-run page exposes dry-run command');
ok(has(crawlPage, 'Crawl control'), 'crawl page has crawl control content');
ok(has(crawlPage, 'Split crawl map'), 'crawl page lists split sitemap controls');
ok(has(routingPage, 'Canonical routing'), 'routing page has canonical route content');
ok(has(routingPage, 'One canonical URL per business'), 'routing page states one-business-one-url control');
ok(has(verificationPage, 'Verification protocol'), 'verification page has verification protocol content');
ok(has(verificationPage, 'Do not sell'), 'verification page prevents overclaiming verified status');
ok(has(fraudDefensePage, 'One business, one canonical posting'), 'fraud defense page states one-posting control');
ok(has(apiPage, 'Generated data endpoints'), 'static API page documents endpoints');
ok(has(adminReviewPage, 'suppression'), 'admin review page explains suppression workflow');
ok(has(duplicatesPage, 'One real business, one posting'), 'duplicates page states one-posting policy');
ok(has(duplicatesPage, 'Auto merge ledger'), 'duplicates page shows auto merge ledger');
ok(has(embedPage, 'Portable business widgets'), 'embed page has widget installation content');
ok(has(profileRenderer, 'scalable profile renderer'), 'profile renderer explains scalable route rendering');
ok(has(profileRenderer, '/data/profiles/'), 'profile renderer loads sharded generated business data');
if(report.records?.profile_mode === 'full-static'){
  ok(!has(redirects, '/business/* /business-profile/ 200'), 'full-static business pages are not shadowed by renderer redirects');
} else {
  ok(has(redirects, '/business/* /business-profile/ 200'), 'redirects support business profile fallback routes');
}
ok(has(embedJs, 'data-phx-verified-widget'), 'embed script targets widget mounts');
try{ new vm.Script(embedJs); ok(true, 'embed widget JavaScript is syntactically valid'); }catch(error){ ok(false, `embed widget JavaScript is syntactically valid: ${error.message}`); }
try{ new vm.Script(appJs); ok(true, 'app JavaScript is syntactically valid'); }catch(error){ ok(false, `app JavaScript is syntactically valid: ${error.message}`); }

const expectedSurfaces = ['/', '/directory/', '/business/', '/category/', '/city/', '/niche/', '/service-lanes/', '/market/', '/collection/', '/join/', '/pricing/', '/ae-command/', '/accounts/', '/pipeline/', '/activation/', '/territories/', '/kpi/', '/revenue/', '/sales-playbook/', '/trust-network/', '/production-readiness/', '/claims-ledger/', '/launch-packet/', '/backend/', '/action-queue/', '/lead-inbox/', '/owner-crm/', '/ae-work-orders/', '/shortlist/', '/compare/', '/match/', '/lead-routing/', '/deal-desk/', '/offers/', '/map/', '/submit/', '/request/', '/claim/', '/owner-verification/', '/lifecycle/', '/insights/', '/audit/', '/coverage/', '/opportunities/', '/outreach/', '/sponsor/', '/monetization/', '/exports/', '/admin-review/', '/admin-actions/', '/admin-batch/', '/import-health/', '/dry-run/', '/crawl/', '/routing/', '/verification/', '/fraud-defense/', '/duplicates/', '/api/', '/embed/', '/mutation-service/', '/event-ledger/', '/webhook-outbox/', '/change-sets/', '/policy-engine/', '/platform/', '/data/', '/operator/'];
for(const surface of expectedSurfaces){
  ok(routeManifest.surfaces.includes(surface), `route manifest includes ${surface}`);
}
for(const surface of routeManifest.public_surfaces || []){
  ok(has(sitemap, surface), `public sitemap includes ${surface}`);
  ok(has(sitemapPages, surface) || surface === '/', `pages sitemap includes public surface ${surface}`);
}
for(const surface of routeManifest.internal_noindex_surfaces || []){
  ok(!has(sitemap, surface), `public sitemap excludes internal/noindex route ${surface}`);
  ok(has(robotsTxt, `Disallow: ${surface}`), `robots disallows internal/noindex route ${surface}`);
}
ok(has(aeCommandPage, 'noindex,nofollow,noarchive'), 'AE command page is noindex');
ok(has(adminActionsPage, 'noindex,nofollow,noarchive'), 'admin actions page is noindex');
ok(has(adminBatchPage, 'noindex,nofollow,noarchive'), 'admin batch page is noindex');
ok(has(accountsPage, 'noindex,nofollow,noarchive'), 'accounts page is noindex');
ok(has(pipelinePage, 'noindex,nofollow,noarchive'), 'pipeline page is noindex');
ok(has(kpiPage, 'noindex,nofollow,noarchive'), 'KPI page is noindex');
ok(has(operator, 'noindex,nofollow,noarchive'), 'operator page is noindex');
ok(has(dataPage, 'noindex,nofollow,noarchive'), 'data page is noindex');
ok(has(productionReadinessPage, 'noindex,nofollow,noarchive'), 'production readiness page is noindex');
ok(has(backendPage, 'noindex,nofollow,noarchive'), 'backend contracts page is noindex');
ok(has(actionQueuePage, 'noindex,nofollow,noarchive'), 'action queue page is noindex');
ok(has(leadInboxPage, 'noindex,nofollow,noarchive'), 'lead inbox page is noindex');
ok(has(ownerCrmPage, 'noindex,nofollow,noarchive'), 'owner CRM page is noindex');
ok(has(aeWorkOrdersPage, 'noindex,nofollow,noarchive'), 'AE work orders page is noindex');
ok(has(mutationServicePage, 'noindex,nofollow,noarchive'), 'mutation service page is noindex');
ok(has(eventLedgerPage, 'noindex,nofollow,noarchive'), 'event ledger page is noindex');
ok(has(webhookOutboxPage, 'noindex,nofollow,noarchive'), 'webhook outbox page is noindex');
ok(has(changeSetsPage, 'noindex,nofollow,noarchive'), 'change-sets page is noindex');
ok(has(policyEnginePage, 'noindex,nofollow,noarchive'), 'policy engine page is noindex');

ok(has(sitemapIndex, 'sitemap-pages.xml'), 'sitemap index links pages sitemap');
ok(has(sitemapIndex, 'sitemap-business-1.xml'), 'sitemap index links business sitemap chunk');
ok(has(sitemapPages, '/join/'), 'pages sitemap includes business owner join route');
ok(has(sitemapPages, '/pricing/'), 'pages sitemap includes pricing route');
ok(has(sitemapPages, '/trust-network/'), 'pages sitemap includes trust network route');
ok(await exists('business/page/1/index.html'), 'paginated business archive page 1 exists');
ok(await exists(`business/page/${report.routes.business_archive}/index.html`), 'last paginated business archive page exists');
const archivePage = await read('business/page/1/index.html');
ok(has(archivePage, 'Business archive page 1'), 'business archive page has archive content');
const firstShard = searchShardManifest.shards[0]?.shard;
ok(firstShard ? await exists(`data/search-shards/${firstShard}.json`) : false, 'first search shard file exists');
const categories = new Set();
const cities = new Set();
const expectedCollections = new Set(['verified','no-hidden-fees','mobile-service','insured','accepting-requests','recently-verified']);
const businessSamples = [...data.businesses.slice(0, 14), ...data.businesses.slice(-6)];
for(const b of businessSamples){
  categories.add(b.category_slug);
  cities.add(b.city_slug);
  const rel = `business/${b.id}/index.html`;
  const staticExists = await exists(rel);
  const body = staticExists ? await read(rel) : profileRenderer;
  ok(staticExists || has(profileRenderer, '/data/businesses.json'), `business route is supported by static page or renderer: ${b.id}`);
  ok(staticExists ? has(body, b.name) : has(body, 'Loading profile'), `business page/render shell resolves: ${b.name}`);
  ok(has(body, 'application/ld+json') || has(body, 'profile renderer'), `business route has structured data or renderer: ${b.name}`);
  ok(has(body, 'Claim / update') || has(body, '/claim/?business='), `business route has claim action: ${b.name}`);
  ok(has(body, 'Request quote') || has(body, '/request/?business='), `business route has request action: ${b.name}`);
  ok(staticExists ? has(body, 'Save shortlist') : true, `business static page has shortlist action when pre-rendered: ${b.name}`);
  ok(staticExists ? has(body, '/compare/?ids=') : true, `business static page has compare action when pre-rendered: ${b.name}`);
  ok(b.identity?.primary_key, `business has canonical identity key: ${b.id}`);
  ok(canonicalRouting.records.some(r => r.id === b.id && r.canonical_url === `/business/${b.id}/`), `canonical routing has business route: ${b.id}`);
  ok(Array.isArray(b.moderation_flags), `business has moderation flags array: ${b.id}`);
  ok(has(sitemap, `/business/${b.id}/`), `sitemap includes business route: ${b.id}`);
}
for(const b of data.businesses){ categories.add(b.category_slug); cities.add(b.city_slug); }

for(const slug of categories){
  ok(await exists(`category/${slug}/index.html`), `category hub exists: ${slug}`);
  ok(has(sitemap, `/category/${slug}/`), `sitemap includes category hub: ${slug}`);
}
for(const slug of cities){
  ok(await exists(`city/${slug}/index.html`), `city hub exists: ${slug}`);
  ok(has(sitemap, `/city/${slug}/`), `sitemap includes city hub: ${slug}`);
}
for(const market of marketData.markets.slice(0, 8)){
  ok(await exists(`market/${market.slug}/index.html`), `market page exists: ${market.slug}`);
  ok(has(sitemap, `/market/${market.slug}/`), `sitemap includes market page: ${market.slug}`);
}
for(const niche of taxonomyData.niches.slice(0, 10)){
  ok(await exists(`niche/${niche.slug}/index.html`), `niche hub exists: ${niche.slug}`);
  ok(has(sitemap, `/niche/${niche.slug}/`), `sitemap includes niche hub: ${niche.slug}`);
}
for(const slug of expectedCollections){
  ok(await exists(`collection/${slug}/index.html`), `collection page exists: ${slug}`);
  ok(has(sitemap, `/collection/${slug}/`), `sitemap includes collection page: ${slug}`);
}

ok(has(appJs, 'bindDirectory'), 'directory JavaScript binds filters/export/location');
ok(has(appJs, 'data-vcard'), 'profile JavaScript supports vCard export');
ok(has(appJs, 'bindSeedBuilder'), 'submit JavaScript builds seed JSON');
ok(has(appJs, 'bindRequestBuilder'), 'request JavaScript builds buyer packets');
ok(has(appJs, 'bindClaimBuilder'), 'claim JavaScript builds owner packets');
ok(has(appJs, 'bindMapBoard'), 'map JavaScript renders seeded points');
ok(has(appJs, 'bindShortlistButtons'), 'JavaScript saves providers to shortlist');
ok(has(appJs, 'bindShortlistPage'), 'JavaScript renders shortlist workspace');
ok(has(appJs, 'bindComparePage'), 'JavaScript renders comparison workspace');
ok(has(appJs, 'bindMatchPage'), 'JavaScript renders match engine workspace');
ok(has(appJs, 'bindAdminBatchPage'), 'JavaScript supports admin batch copy action');
ok(has(operatorJs, 'normalizeSeed'), 'operator JavaScript normalizes seed exports');
ok(has(operatorJs, 'company_name'), 'operator importer supports company_name alias');
ok(has(operatorJs, 'record.identity_key = identityKey(record)'), 'operator importer generates identity keys for duplicate preview');

if(fail){
  console.error(`\n${fail} check(s) failed, ${pass} passed.`);
  process.exit(1);
}
console.log(`\n${pass} checks passed.`);
