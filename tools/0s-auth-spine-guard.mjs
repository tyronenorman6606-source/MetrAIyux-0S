#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const failOnWarnings = args.includes('--fail-on-warnings');

const checks = [];

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function check(name, ok, detail = {}, severity = 'blocker') {
  checks.push({ name, ok: Boolean(ok), severity, ...detail });
}

function contains(file, patterns) {
  const source = read(file);
  return patterns.every((pattern) => pattern.test(source));
}

function scanStaleStaticTokenLanguage(file) {
  const source = read(file);
  const stalePatterns = [
    /password:\s*the local value of `?SKYEVAULT_GIT_REMOTE_TOKEN`?/gi,
    /Browser prompt credentials/gi,
    /With auth enabled, the browser uses Basic auth/gi,
    /git remote add vault http:\/\/x-token:\$\{SKYEVAULT_GIT_REMOTE_TOKEN\}/gi,
    /curl -H "Authorization: Bearer \$\{SKYEVAULT_GIT_REMOTE_TOKEN\}"/gi
  ];
  const findings = [];
  for (const pattern of stalePatterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const window = source.slice(Math.max(0, (match.index || 0) - 240), Math.min(source.length, (match.index || 0) + 360));
      if (/emergency|legacy|static-token override|local-only/i.test(window)) continue;
      findings.push({
        file,
        line: lineNumber(source, match.index || 0),
        match: String(match[0]).slice(0, 160)
      });
    }
  }
  return findings;
}

function packageScriptFindings() {
  const pkg = JSON.parse(read('package.json'));
  const findings = [];
  for (const [name, script] of Object.entries(pkg.scripts || {})) {
    if (!/SKYEVAULT_GIT_REMOTE_TOKEN|--static-token|SKYEVAULT_OWNER_GIT_ALLOW_STATIC_TOKEN/.test(script)) continue;
    if (/emergency|static-token/.test(name) || /--static-token/.test(script)) continue;
    findings.push({ script: name, value: script });
  }
  return findings;
}

const ownerWrapper = 'tools/skyevault-owner-git-origin.mjs';
const mainWorker = 'metraiyux_0s_site/cloudflare/worker.js';
const mainWorkerSource = read(mainWorker);
const routexServer = 'metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/src/server.js';
const routexIndex = 'metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/index.html';
const skyeVaultWorker = 'SkyeVault-Drop/cloudflare/worker.mjs';
const skyeVaultProvision = 'SkyeVault-Drop/netlify/functions/provision-workspace.js';
const codeStudioClaims = 'metraiyux_0s_site/Free99/apps/kaixu-codestudio/server/lib/claims.mjs';
const codeStudioServer = 'metraiyux_0s_site/Free99/apps/kaixu-codestudio/server/http-server.mjs';
const codeStudioEngine = 'metraiyux_0s_site/Free99/apps/kaixu-codestudio/server/platform-engine.mjs';
const skyeCommerceCustomers = 'metraiyux_0s_site/SkyeCommerce/src/lib/customer-api.js';
const skyeCommerceApp = 'metraiyux_0s_site/SkyeCommerce/src/index.js';
const skyeCommerceAdapter = 'metraiyux_0s_site/cloudflare/skyecommerce-adapter.mjs';
const skyeCommerceGateMigration = 'metraiyux_0s_site/SkyeCommerce/migrations/0031_shared_gate_identity_links.sql';
const tenantBackbone = 'metraiyux_0s_site/cloudflare/tenant-backbone.mjs';
const companyKnowledge = 'metraiyux_0s_site/cloudflare/company-knowledge.mjs';
const fs27Admin = 'metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/admin.js';
const fs27AdminLogin = 'metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/admin-login.js';
const signinproLib = 'metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/signinpro.js';
const northstarLogin = 'metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/northstar-auth-login.js';
const siteOperatorWorker = 'metraiyux_0s_site/cloudflare-worker-site-operator/site-operator-worker.js';
const omegaWorker = 'metraiyux_0s_site/cloudflare-security-gateway-worker/src/worker.js';
const kaixuBrainWorker = 'metraiyux_0s_site/cloudflare-kaixu-brain/kaixu-worker.js';
const relay13Worker = 'metraiyux_0s_site/relay13-core-v1.7-connectlog-operator-proof/src/index.js';
const skyeMailUtils = 'metraiyux_0s_site/live/SkyeMail/netlify/functions/_utils.js';
const skyeMailGmail = 'metraiyux_0s_site/live/SkyeMail/netlify/functions/_gmail.js';
const skyeMailFs27Session = 'metraiyux_0s_site/live/SkyeMail/netlify/functions/auth-fs27-session.js';
const skyeMailBrowserFiles = [
  'metraiyux_0s_site/live/SkyeMail/assets/app.js',
  'metraiyux_0s_site/live/SkyeMail/assets/os-bridge.js',
  'metraiyux_0s_site/live/SkyeMail/suite/assets/platform.js',
  'metraiyux_0s_site/live/SkyeMail/assets/js/0s-gate-card-bridge.js'
];
const skyeMailRecoveryExport = 'metraiyux_0s_site/live/SkyeMail/netlify/functions/recovery-export.js';
const skyeContentServer = 'metraiyux_0s_site/skye-content-repurposer-local/server.js';
const skyeContentGate = 'metraiyux_0s_site/skye-content-repurposer-local/public/gate-session.js';
const skyeContentApp = 'metraiyux_0s_site/skye-content-repurposer-local/public/app.js';
const rootGateBridge = 'metraiyux_0s_site/assets/js/0s-gate-card-bridge.js';
const free99Gate = 'metraiyux_0s_site/Free99/free99-gate.js';
const routexFree99Gate = 'metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/assets/free99-gate.js';
const skyeSplitGate = 'metraiyux_0s_site/SkyeSplitEngine/gate-session.js';
const skyeProfitGate = 'metraiyux_0s_site/SkyeProfitConsole/gate-session.js';
const skyeMusicGate = 'metraiyux_0s_site/SkyeMusicNexus/gate-session.js';
const skyeMediaGate = 'metraiyux_0s_site/SkyeMediaCenter/gate-session.js';
const skyeMusicAuth = 'metraiyux_0s_site/SkyeMusicNexus/netlify/functions/_lib/skygate-auth.js';
const skyeSolStandalone = 'metraiyux_0s_site/skyenet-drops/skyesol-company-public/_shared/standalone-session.js';
const skyeSolKaixuSession = 'metraiyux_0s_site/skyenet-drops/skyesol-company-public/js/kaixu-session.js';
const skyeSolIdentityInit = 'metraiyux_0s_site/skyenet-drops/skyesol-company-public/js/netlify-identity-init.js';
const skyeSolGrowth = 'metraiyux_0s_site/skyenet-drops/skyesol-company-public/js/growth.js';
const skyeSolWelcome = 'metraiyux_0s_site/skyenet-drops/skyesol-company-public/welcome/index.html';
const skyeSolKaixuAdminBridge = 'metraiyux_0s_site/skyenet-drops/skyesol-company-public/js/kaixu-admin-bridge.js';
const valleyBrain = 'metraiyux_0s_site/valley-verified/assets/valley-brain.js';
const valleyAdminConsole = 'metraiyux_0s_site/valley-verified/assets/admin-console.js';
const founderCommandApp = 'metraiyux_0s_site/founder-command/app.js';
const skynetConsole = 'metraiyux_0s_site/skyenet/skyenet.js';
const fs27PublicApp = 'metraiyux_0s_site/skyegate/source/SkyeGateFS27/public/assets/app.js';
const fs27SourceApp = 'metraiyux_0s_site/skyegate/source/SkyeGateFS27/assets/app.js';
const aeCommandApp = 'metraiyux_0s_site/ae-command/ae-command.js';
const clientAppFactoryApp = 'metraiyux_0s_site/client-app-factory/assets/app.js';
const skyeMailSkygate = 'metraiyux_0s_site/live/SkyeMail/netlify/functions/_skygate.js';
const divisionalGate = 'metraiyux_0s_site/DeVisional Riftx/platform/fs27-gate.js';
const adminLoginPage = 'metraiyux_0s_site/admin/login.html';
const generatedAdminLoginPage = 'metraiyux_0s_site/cloudflare/generated-admin-login-page.mjs';
const gateSignupPage = 'metraiyux_0s_site/gate/signup/index.html';
const gateSignupRootPage = 'metraiyux_0s_site/gate/signup.html';
const skyeRouteXPublicSite = 'metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public/assets/site.js';
const routexAppBrowserFiles = [
  'metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/assets/app.js',
  'metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/public/app.js',
  'metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.js',
  'metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/scripts/smoke-browser-clicks.mjs'
];
const vantacoreCrmDashboard = 'metraiyux_0s_site/skyegate/source/SkyeGateFS27/vantacore-crm-dashboard.html';
const routexAeProfile = 'metraiyux_0s_site/ae-command/profile.js';
const zeroOsGateAuthHelper = 'tools/lib/zero-os-gate-auth.mjs';
const skynetDeployToolFiles = [
  'tools/deploy-bobs-app-skynet.mjs',
  'tools/skyenet-upload-bobs-changes.mjs',
  'tools/deploy-skynet-static-surfaces.mjs',
  'tools/deploy-skynet-client-apps.mjs',
  'tools/deploy-musicnexus-skynet-bundles.mjs',
  'tools/hotpatch-musicnexus-skynet-active-deployments.mjs',
  'tools/skyevault-mint-receipt-downloads.mjs'
];
const skyeVaultToolFiles = [
  'tools/skyevault-repo-push.mjs',
  'tools/skyevault-full-repo-push.mjs',
  'tools/run-root-wrangler.mjs'
];
const liveProofToolFiles = [
  'tools/proof-skyeroutex-operator-entry-live-http.mjs',
  'tools/live-e2e-metraiyux.mjs'
];
const adminBrowserAuthFiles = [
  'metraiyux_0s_site/admin/skygate-auth-bridge.js',
  'metraiyux_0s_site/admin/admin-brain-chat.js',
  'metraiyux_0s_site/admin/content-engine-lane.js',
  'metraiyux_0s_site/admin/approval-inbox.js',
  'metraiyux_0s_site/admin/skyevault-command-center.js',
  'metraiyux_0s_site/assets/js/company-knowledge-console.js',
  'metraiyux_0s_site/northstar/assets/workspace-client.js',
  'metraiyux_0s_site/Marketing-Made-Easy/SkyeWebCreatorMax/js/skygate-client.js',
  'metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro/app.js'
];
check('Owner Git origin wrapper obtains shared gate auth', contains(ownerWrapper, [
  /async function ownerAuth\(/,
  /\/api\/owner\/admin-login/,
  /SKYEVAULT_GATE_INTROSPECT_URL/,
  /gate-introspection/
]), { file: ownerWrapper });
check('Owner Git origin static token is explicit emergency mode only', contains(ownerWrapper, [
  /SKYEVAULT_OWNER_GIT_ALLOW_STATIC_TOKEN/,
  /explicit-emergency-static-token/,
  /gate-managed-no-static-token/
]), { file: ownerWrapper });

const remoteServer = 'tools/skyevault-git-remote-server.mjs';
check('Git remote server supports gate introspection and shared gate landing copy', contains(remoteServer, [
  /gateIntrospectUrl/,
  /auth: devNoAuth \? 'disabled' : gateIntrospectUrl \? 'gate-introspection' : 'static-token'/,
  /shared 0S\/FS27\/SkyGate bearer session/
]), { file: remoteServer });

const repoWorkspace = 'tools/skyevault-repo-workspace.mjs';
check('Repo workspace client prefers shared gate bearer over static token', contains(repoWorkspace, [
  /Authorization: Bearer/,
  /SKYEVAULT_REPO_WORKSPACE_AUTH_MODE/,
  /Use the shared 0S\/FS27 gate bearer/
]), { file: repoWorkspace });

const staleDocs = [
  'docs/SKYEVAULT_GIT_REMOTE_SERVICE.md',
  'docs/SKYEVAULT_INFRA_HARDENING.md',
  'docs/SKYEVAULT_REPO_WORKSPACE_UPGRADE.md',
  'docs/SKYEVAULT_AUTOSYNC_PARITY.md',
  'docs/SKYEVAULT_OWNER_PRIVATE_CUSTODY_RECEIPT.md'
].flatMap(scanStaleStaticTokenLanguage);
check('Docs do not present static Git token as normal owner login', staleDocs.length === 0, { findings: staleDocs });

const packageFindings = packageScriptFindings();
check('Package scripts do not default to static SkyeVault Git auth', packageFindings.length === 0, { findings: packageFindings });

check('Main Worker does not authorize production routes with local shared gate-code fallback', !/via:\s*['"]local-shared-gate-code['"]|dev-local-shared-gate-code|local-shared-gate-code/.test(mainWorkerSource)
  && /function\s+explicitLocalSharedGateFallbackAllowed\(env = \{\}\)\s*\{\s*return false;\s*\}/.test(mainWorkerSource), {
  file: mainWorker
});

check('Main Worker paid-lane proof mode requires FS27/SkyGate authority', !/function\s+paidLaneProofModeAllowed[\s\S]*?via:\s*['"]local-shared-gate-code['"][\s\S]*?\n}/.test(mainWorkerSource), {
  file: mainWorker
});

check('Main Worker owner credential fallback does not scan generic app admin tokens', !/const OWNER_ADMIN_CREDENTIAL_ENV_KEYS = \[[\s\S]*?(?:SITE_OPERATOR_ADMIN_TOKEN|METRAIYUX_ADMIN_TOKEN|ADMIN_TOKEN|SKYGATEFS13_WORKER_ADMIN_TOKEN|MCP_HTTP_BEARER_TOKEN)[\s\S]*?\];/.test(mainWorkerSource), {
  file: mainWorker
});

check('Main Worker SkyeMusic gate does not accept raw ADMIN_TOKEN authority', !/async function requireMusicGate[\s\S]*?(?:SITE_OPERATOR_ADMIN_TOKEN|METRAIYUX_ADMIN_TOKEN|ADMIN_TOKEN)[\s\S]*?\n}/.test(mainWorkerSource)
  && !/via:\s*['"]admin_token['"]/.test(mainWorkerSource), {
  file: mainWorker
});

check('Main Worker protected proxy APIs do not have a broad public GET/HEAD bypass', !/!MUTATING_METHODS\.has\(method\)[\s\S]{0,240}PROXIES\.some\(\(\[prefix\]\)[\s\S]{0,160}url\.pathname\.startsWith\(prefix\)/.test(mainWorkerSource), {
  file: mainWorker
});

check('Main Worker site-operator ledger requires operator auth', /url\.pathname === '\/api\/site-operator\/ledger'[\s\S]{0,260}requireOperatorAuth\(request, env, 'site operator ledger'\)/.test(mainWorkerSource), {
  file: mainWorker
});

check('Main Worker disables the retired Founder Command login minting alias', /url\.pathname === '\/api\/founder-command\/login'[\s\S]{0,260}canonical_owner_admin_login_required/.test(mainWorkerSource)
  && !/ZERO_OS_GATE_ENTRY_PATHS[\s\S]{0,900}\/api\/founder-command\/login/.test(mainWorkerSource), {
  file: mainWorker
});

check('FS27 / 0S auth contract is documented', contains('docs/FS27_ZERO_OS_AUTH_CONTRACT.md', [
  /FS27\/SkyGate is the canonical auth source/,
  /Free99 is not a second login system/,
  /No app-specific founder password/,
  /Tour\/demo tokens stay scoped/
]), { file: 'docs/FS27_ZERO_OS_AUTH_CONTRACT.md' });

check('FS27 admin password header is explicit break-glass only', contains(fs27Admin, [
  /FS27_ALLOW_ADMIN_PASSWORD_HEADER/,
  /explicit-break-glass-password-header/,
  /The password header is not a normal auth lane/
]), { file: fs27Admin });

check('FS27 admin login returns a canonical gate session and disables static admin by default', contains(fs27AdminLogin, [
  /createSession/,
  /gateBearerToken/,
  /FS27_CENTRAL_ADMIN_LOGIN_REQUIRED/,
  /FS27_ALLOW_STATIC_ADMIN_LOGIN/,
  /explicit-break-glass-static-admin/
]), { file: fs27AdminLogin });

check('NorthStar SigninPro resolves workspace access from FS27 sessions before any local cookie', contains(signinproLib, [
  /resolveWorkspaceSessionFromGate/,
  /verifySessionToken/,
  /source_session_kind:\s*"fs27_user_session"/,
  /SIGNINPRO_ALLOW_LOCAL_WORKSPACE_COOKIE/,
  /SIGNINPRO_ALLOW_LEGACY_OPERATOR_TOKEN/
]), { file: signinproLib });

check('NorthStar password login is disabled by shared gate by default', contains(northstarLogin, [
  /SIGNINPRO_ALLOW_LEGACY_PASSWORD_LOGIN/,
  /northstar_password_login_disabled_by_shared_gate/,
  /FS27\/SkyGate\/Free99/
]), { file: northstarLogin });

check('SkyeRouteX unknown credentials no longer default to house command', contains(routexServer, [
  /function gateRole\(req\)[\s\S]*return '';/,
  /if \(!role\) return null;/,
  /readonly_demo:\s*true/,
  /SkyeRouteX tour\/free99 demo tokens are read-only/
]), { file: routexServer });

check('SkyeRouteX tour token stays scoped and does not overwrite the shared gate session', (() => {
  const source = read(routexIndex);
  return /SKYEROUTEX_TOUR_SESSION/.test(source)
    && /readonly:\s*true/.test(source)
    && !/setItem\(['"]FREE99_PLATFORM_GATE_SESSION/.test(source);
})(), { file: routexIndex });

check('SkyeVault mounted Worker gates admin/provisioning lanes through FS27', contains(skyeVaultWorker, [
  /GATE_PROTECTED_FUNCTIONS/,
  /introspectSkygateBearer/,
  /requireSkyVaultGateAdmin/,
  /SkyeVault local operator sessions are disabled on the mounted 0S surface/
]), { file: skyeVaultWorker });

check('SkyeVault provisioning requires FS27 scoped bearer instead of provisioning secret authority', (() => {
  const source = read(skyeVaultProvision);
  return /requireProvisioningGate/.test(source)
    && /introspectSkygateBearer/.test(source)
    && !/SKYEVAULT_PROVISIONING_SECRET|PROVISIONING_SHARED_SECRET|constantTimeEqual/.test(source);
})(), { file: skyeVaultProvision });

check('CodeStudio platform routes require FS27 or signed upstream claims by default', contains(codeStudioClaims, [
  /CODESTUDIO_ALLOW_UNSIGNED_DEV_CLAIMS/,
  /claimsFromRequest/,
  /introspectFs27Bearer/,
  /FS27\/SkyGate bearer or signed upstream claims are required/
]), { file: codeStudioClaims });

check('CodeStudio server gates platform APIs before route execution', contains(codeStudioServer, [
  /pathname\.startsWith\('\/api\/platform\/'\)/,
  /const claims = await claimsFrom\(req, \{\}\)/,
  /claimsFromRequest/
]), { file: codeStudioServer });

check('CodeStudio engine does not fall back to sample owner claims outside explicit dev mode', contains(codeStudioEngine, [
  /noAuthImplemented:false/,
  /allowDevClaimsSample\(\)/,
  /CODESTUDIO_ALLOW_UNSIGNED_DEV_CLAIMS/,
  /Verified FS27\/SkyGate claims are required for CodeStudio platform execution/
]), { file: codeStudioEngine });

check('SkyeCommerce mounted customer auth reconciles to FS27 gate without issuing a local session cookie', (() => {
  const source = read(skyeCommerceCustomers);
  const sharedGateBlocks = source.match(/if \(hasSharedGateHandoff\(request, env\)\) \{[\s\S]*?sessionSource: 'fs27-gate'[\s\S]*?\n    \}/g) || [];
  return /SHARED_GATE_CUSTOMER_PASSWORD_HASH = 'shared-0s-gate-only'/.test(source)
    && sharedGateBlocks.length >= 2
    && sharedGateBlocks.every(block => !/createCustomerSession|Set-Cookie/.test(block));
})(), { file: skyeCommerceCustomers });

check('SkyeCommerce owner/operator access is linked to FS27 without deleting local merchant data', (() => {
  const source = read(skyeCommerceApp);
  const migration = read(skyeCommerceGateMigration);
  const getSessionBlock = source.match(/async function getSession\(request, env\) \{[\s\S]*?\n}/)?.[0] || '';
  return /CREATE TABLE IF NOT EXISTS shared_gate_identity_links/.test(source)
    && /upsertSharedGateIdentityLink\(env, row, actor\)/.test(source)
    && /fs27_sub TEXT NOT NULL DEFAULT ''/.test(migration)
    && /local_merchant_email TEXT NOT NULL DEFAULT ''/.test(migration)
    && /if \(sharedGateSession\) return sharedGateSession;\s*return null;/.test(getSessionBlock)
    && !/request\.headers\.get\(['"]cookie['"]\)|dbFirst\(env,\s*`SELECT \* FROM sessions|getCookie\(request/.test(getSessionBlock);
})(), { files: [skyeCommerceApp, skyeCommerceGateMigration] });

check('SkyeCommerce local password entrypoints are retired to the shared FS27 gate', (() => {
  const source = read(skyeCommerceApp);
  return /\/api\/merchant\/register[\s\S]{0,180}shared_gate_required/.test(source)
    && /\/api\/auth\/login[\s\S]{0,180}shared_gate_required/.test(source)
    && /\/api\/staff\/login[\s\S]{0,180}shared_gate_required/.test(source)
    && /\/api\/staff\/invitations\/accept[\s\S]{0,220}shared_gate_required/.test(source)
    && /const passwordHash = '';\s*await dbRun\(env, `INSERT INTO staff_members/.test(source);
})(), { file: skyeCommerceApp });

check('SkyeCommerce mount only enters through main Worker gate handoff', (() => {
  const source = read(skyeCommerceAdapter);
  return /helpers\.requireGateAuth/.test(source)
    && /code:\s*'fs27_helper_required'/.test(source)
    && /x-skyecommerce-gate-sub/.test(source)
    && /x-skyecommerce-gate-customer-id/.test(source)
    && /x-skyecommerce-gate-workspace-id/.test(source)
    && !/SKYECOMMERCE_GATE_HANDOFF_SECRET[\s\S]{0,120}(?:FREE99_ADMIN_CODE|ADMIN_TOKEN|METRAIYUX_ADMIN_TOKEN)/.test(source);
})(), { file: skyeCommerceAdapter });

check('Mounted helper adapters fail closed when FS27 auth helper is missing', (() => {
  const tenant = read(tenantBackbone);
  const knowledge = read(companyKnowledge);
  const commerce = read(skyeCommerceAdapter);
  return /fs27_helper_required/.test(tenant)
    && /fs27_helper_required/.test(knowledge)
    && /fs27_helper_required/.test(commerce)
    && !/local-test|return \{ ok:\s*true,\s*role:\s*'admin'|return \{ ok:\s*true,\s*user:/.test(`${tenant}\n${knowledge}\n${commerce}`);
})(), { files: [tenantBackbone, companyKnowledge, skyeCommerceAdapter] });

check('Direct site-operator helper gates mutations and ledger through FS27 or 0S internal proxy', contains(siteOperatorWorker, [
  /authorized\(request, env\)/,
  /introspectFs27Token/,
  /fs27_required/,
  /\/api\/site-operator\/intake/,
  /\/api\/site-operator\/ledger/
]), { file: siteOperatorWorker });

check('Omega security helper no longer has open customer command or ADMIN_TOKEN auth by default', (() => {
  const source = read(omegaWorker);
  return /introspectGate/.test(source)
    && /OMEGA_ALLOW_LEGACY_ADMIN_TOKEN/.test(source)
    && /OMEGA_ALLOW_LEGACY_CUSTOMER_TOKEN/.test(source)
    && !/if\(!env\.CUSTOMER_COMMAND_TOKEN\) return true/.test(source)
    && /url\.pathname===['"]\/api\/omega\/scan['"][\s\S]{0,180}adminAuth\(req,env\)/.test(source);
})(), { file: omegaWorker });

check('Standalone kAIxu brain requires FS27 by default and makes legacy keys explicit only', contains(kaixuBrainWorker, [
  /introspectGate/,
  /KAIXU_ALLOW_LEGACY_KEY_AUTH/,
  /KAIXU_ALLOW_AUTH_DISABLED_DEV/,
  /fs27_required/,
  /FS27\/SkyGate bearer sessions/
]), { file: kaixuBrainWorker });

check('Relay13 admin/operator routes require FS27 by default instead of platform admin token authority', (() => {
  const source = read(relay13Worker);
  return /async function requireAdmin\(request, env\)/.test(source)
    && /introspectRelay13AdminToken/.test(source)
    && /sharedProxyAuth\(request, env\)/.test(source)
    && /Canonical FS27\/SkyGate session is required for Relay13 admin access/.test(source)
    && /const gate = await introspectRelay13AdminToken\(tokenValue, this\.env\)/.test(source)
    && !/RELAY13_ALLOW_LEGACY_PLATFORM_ADMIN_TOKEN|platformAdminTokens|isPlatformAdmin|explicit-legacy-platform-admin-token/.test(source);
})(), { file: relay13Worker });

check('Main Worker Valley publish execution uses FS27 operator auth instead of VALLEY_PUBLISH_ADMIN_TOKEN', (() => {
  const source = read(mainWorker);
  return /async function valleyTickAuthorized\(request, env\)[\s\S]{0,140}requireOperatorAuth\(request, env, 'Valley content schedule execution'\)/.test(source)
    && !/VALLEY_PUBLISH_ADMIN_TOKEN|Manual Valley publish ticks require VALLEY_PUBLISH_ADMIN_TOKEN/.test(source);
})(), { file: mainWorker });

check('SkyeMail Netlify auth verifies FS27 sessions instead of local JWT_SECRET', (() => {
  const utils = read(skyeMailUtils);
  const gmail = read(skyeMailGmail);
  const fs27Session = read(skyeMailFs27Session);
  return /requireFs27/.test(utils)
    && /ensureSkyeMailUser/.test(utils)
    && /sessionFromGateUser/.test(utils)
    && !/jsonwebtoken|JWT_SECRET/.test(utils)
    && !/JWT_SECRET/.test(gmail)
    && /session_kind:\s*"fs27_gate_bearer"/.test(fs27Session)
    && !/mintSkyeMailSession/.test(fs27Session);
})(), { files: [skyeMailUtils, skyeMailGmail, skyeMailFs27Session] });

check('SkyeMail browser and recovery export use shared FS27 gate without local mail/admin token authority', (() => {
  const browser = skyeMailBrowserFiles.map((file) => `\n/* ${file} */\n${read(file)}`).join('\n');
  const recovery = read(skyeMailRecoveryExport);
  const skyemailBridgeKeys = read('metraiyux_0s_site/live/SkyeMail/assets/js/0s-gate-card-bridge.js').match(/const SESSION_KEYS = \[[\s\S]*?\n  \];/)?.[0] || '';
  return /MetrAIyuxGateBridge/.test(browser)
    && !/const keys = \[|readStoredToken|sessionFromUrl|params\.get\(["'](?:gate_session|skygate_session|session)["']\)|url-gate-session|__KAIXU_RUNTIME__|__SKYEGATE_RUNTIME__|sessionStorage\.setItem\(["']SMV_(?:SKYEMAIL_SESSION|AUTH_TOKEN)|localStorage\.setItem\(["']SMV_(?:SKYEMAIL_SESSION|AUTH_TOKEN)|"x-admin-token":token|"x-free99-admin-code":token/.test(browser)
    && !/FREE99_PLATFORM_GATE_SESSION|adminBrainToken|adminSecuritySession|saas_client_session|SKYGATE_USER_TOKEN|SKYGATE_SESSION_TOKEN/.test(skyemailBridgeKeys)
    && /requireFs27\(event, \{ admin: true \}\)/.test(recovery)
    && !/ADMIN_RECOVERY_TOKEN|x-admin-token/.test(recovery);
})(), { files: [...skyeMailBrowserFiles, skyeMailRecoveryExport] });

check('SkyeContent dashboard authority is FS27 gate plus scheduler service token only', (() => {
  const server = read(skyeContentServer);
  const gate = read(skyeContentGate);
  const app = read(skyeContentApp);
  return /introspectFs27Token/.test(server)
    && /SKYGATEFS27_ORIGIN/.test(server)
    && !/process\.env\.APP_ACCESS_TOKEN|process\.env\.ADMIN_ACCESS_TOKEN/.test(server)
    && !/query\.get\(["'](?:gate_session|skygate_session|content_session|session)["']\)|url-gate-session|skye-content-forge-access-token|x-app-token|manual-gate-session|manual-dashboard-token|LOCAL_ADMIN|local-admin-dev-gate|sessionStorage\.setItem\(SESSION_KEY/.test(gate)
    && !/skye-content-forge-access-token|X-App-Token|manual-dashboard-token/.test(app);
})(), { files: [skyeContentServer, skyeContentGate, skyeContentApp] });

check('Root browser gate bridge only consumes canonical shared FS27 session aliases', (() => {
  const source = read(rootGateBridge);
  const sessionKeysBlock = source.match(/const SESSION_KEYS = \[[\s\S]*?\n  \];/)?.[0] || '';
  return /METRAIYUX_GATE_SESSION/.test(sessionKeysBlock)
    && /SKYGATEFS27_GATE_SESSION/.test(sessionKeysBlock)
    && !/FREE99_PLATFORM_GATE_SESSION|adminBrainToken|adminSecuritySession|saas_client_session|SKYGATE_USER_TOKEN|SKYGATE_SESSION_TOKEN/.test(sessionKeysBlock)
    && !/function\s+sessionFromUrl|params\.get\(["'](?:gate_session|skygate_session|session)["']\)|url-gate-session|__KAIXU_RUNTIME__|__SKYEGATE_RUNTIME__/.test(source)
    && !/writeStore\(sessionStorage,\s*["']SKYGATE_USER_TOKEN|writeStore\(sessionStorage,\s*["']SKYGATE_SESSION_TOKEN/.test(source);
})(), { file: rootGateBridge });

check('Free99 browser gates use the shared bridge and keep SkyeRouteX tour tokens read-only', (() => {
  const sources = [read(free99Gate), read(routexFree99Gate)];
  return sources.every((source) => /MetrAIyuxGateBridge/.test(source)
    && /tour_token/.test(source)
    && /readonly:\s*true/.test(source)
    && /if \(!cleanSession\.readonly\) gateBridge\(\)\?\.persist/.test(source)
    && !/const storageKey|readJson|saas_client_session|FREE99_PLATFORM_GATE_SESSION|SKYGATE_USER_TOKEN|__KAIXU_RUNTIME__|sessionStorage\.setItem\(storageKey/.test(source));
})(), { files: [free99Gate, routexFree99Gate] });

check('SkyeSplit and SkyeProfit browser gates have no manual, URL, client-session, or local-admin auth path', (() => {
  const sources = [read(skyeSplitGate), read(skyeProfitGate)];
  return sources.every((source) => /MetrAIyuxGateBridge/.test(source)
    && /Open FS27 Gate/.test(source)
    && !/query\.get\(["'](?:gate_session|skygate_session|split_session|session)["']\)|url-gate-session|manual-gate-session|saas_client_session|LEGACY_KEYS|LOCAL_ADMIN|Attach Fallback|Gate session token|Use Local Admin|Use 0S Client Session|__KAIXU_RUNTIME__/.test(source));
})(), { files: [skyeSplitGate, skyeProfitGate] });

check('Admin/browser command surfaces do not use adminBrainToken, local owner-token storage, or app-local client sessions as auth', (() => {
  const combined = adminBrowserAuthFiles.map((file) => `\n/* ${file} */\n${read(file)}`).join('\n');
  return /MetrAIyuxGateBridge|SkygateAuthBridge/.test(combined)
    && !/adminBrainToken|adminSecuritySession|saas_client_session|FREE99_PLATFORM_GATE_SESSION|quantumskyes_mcp_owner_token|metraiyux\.founderCommand\.token|SKYGATE_USER_TOKEN|skygate_session|manual-gate-session|Attach Fallback|Use Local Admin|Gate session token|x-admin-session/.test(combined);
})(), { files: adminBrowserAuthFiles });

check('SkyeMusic and SkyeMedia browser gates use the shared gate bridge without URL/localStorage token auth', (() => {
  const music = read(skyeMusicGate);
  const media = read(skyeMediaGate);
  const musicAuth = read(skyeMusicAuth);
  return !/query\.get\(["'](?:gate_session|skygate_session|media_session|session)["']\)|saas_client_session|LEGACY_KEYS|__KAIXU_RUNTIME__|url-gate-session/.test(music)
    && !/query\.get\(["'](?:gate_session|skygate_session|media_session|session)["']\)|saas_client_session|LEGACY_KEYS|__KAIXU_RUNTIME__|url-gate-session/.test(media)
    && /SKYGATEFS27_PUBLIC_KEY_PEM/.test(musicAuth)
    && /skygatefs27,skygatefs13,skye-music-nexus/.test(musicAuth);
})(), { files: [skyeMusicGate, skyeMediaGate, skyeMusicAuth] });

check('SkyeSol public auth uses FS27 bridge instead of Netlify Identity or persisted kAIxu virtual keys', (() => {
  const standalone = read(skyeSolStandalone);
  const kaixu = read(skyeSolKaixuSession);
  const identity = read(skyeSolIdentityInit);
  const growth = read(skyeSolGrowth);
  const welcome = read(skyeSolWelcome);
  const adminBridge = read(skyeSolKaixuAdminBridge);
  return /MetrAIyuxGateBridge/.test(standalone)
    && !/skye\.omega|localStorage\.setItem|localStorage\.getItem/.test(standalone)
    && /FS27_GATE_SESSION/.test(kaixu)
    && !/KAIXU_VIRTUAL_KEY|kaixu_session|localStorage|sessionStorage/.test(kaixu)
    && /provider:\s*"fs27-skygate"/.test(identity)
    && /\/api\/owner\/admin-session/.test(adminBridge)
    && !/KAIXU_ADMIN_TOKEN|admin-session-check/.test(adminBridge)
    && !/window\.netlifyIdentity|identity\.netlify\.com|\/\.netlify\/identity/.test(growth + '\n' + welcome);
})(), { files: [skyeSolStandalone, skyeSolKaixuSession, skyeSolIdentityInit, skyeSolGrowth, skyeSolWelcome, skyeSolKaixuAdminBridge] });

check('Valley admin browser lanes use the shared gate bridge instead of stored admin tokens', (() => {
  const brain = read(valleyBrain);
  const admin = read(valleyAdminConsole);
  return /MetrAIyuxGateBridge/.test(brain)
    && /MetrAIyuxGateBridge/.test(admin)
    && !/ownerAdminLogin|saveAdminToken|x-admin-token|localStorage\.getItem\('metraiyux\.adminToken'|localStorage\.getItem\('valleyVerified\.adminToken'/.test(brain)
    && !/fs27_gate_token|x-admin-token/.test(admin);
})(), { files: [valleyBrain, valleyAdminConsole] });

check('Founder, SkyeNet, AE, and client-factory browsers use canonical gate aliases only', (() => {
  const files = [founderCommandApp, skynetConsole, fs27PublicApp, fs27SourceApp, aeCommandApp, clientAppFactoryApp];
  const combined = files.map((file) => `\n/* ${file} */\n${read(file)}`).join('\n');
  return /MetrAIyuxGateBridge|METRAIYUX_GATE_SESSION|SKYGATEFS27_GATE_SESSION/.test(combined)
    && !/(?:FREE99_PLATFORM_GATE_SESSION|SKYGATE_USER_TOKEN|SKYGATE_SESSION_TOKEN|adminBrainToken|adminSecuritySession|saas_client_session|kaixu_virtual_key|KAIXU_VIRTUAL_KEY|x-admin-token|x-free99-admin-code)/.test(combined);
})(), { files: [founderCommandApp, skynetConsole, fs27PublicApp, fs27SourceApp, aeCommandApp, clientAppFactoryApp] });

check('SkyeMail Netlify gate helper extracts only shared FS27 session aliases', (() => {
  const source = read(skyeMailSkygate);
  return /METRAIYUX_GATE_SESSION/.test(source)
    && /SKYGATEFS27_GATE_SESSION/.test(source)
    && /SKYE_GATE_SESSION/.test(source)
    && !/FREE99_PLATFORM_GATE_SESSION|SKYGATE_USER_TOKEN|SKYGATE_SESSION_TOKEN|x-admin-token|x-free99-admin-code/.test(source);
})(), { file: skyeMailSkygate });

check('DeVisional copied FS27 gate helper no longer reads legacy Free99 platform browser storage', (() => {
  const source = read(divisionalGate);
  const cookieLoop = source.match(/for \(const name of \[[\s\S]*?\]\) \{/)?.[0] || '';
  return /introspectGateCredential/.test(source)
    && /FS27_AUTH_INTROSPECT_URL/.test(source)
    && !/FREE99_PLATFORM_GATE_SESSION/.test(cookieLoop)
    && !/SITE_OPERATOR_ADMIN_TOKEN|METRAIYUX_ADMIN_TOKEN|ADMIN_TOKEN/.test(source);
})(), { file: divisionalGate });

check('Tooling resolves deploy/auth through the shared FS27 gate helper', (() => {
  const source = read(zeroOsGateAuthHelper);
  return /DIRECT_GATE_BEARER_KEYS/.test(source)
    && /OWNER_GATE_EXCHANGE_KEYS/.test(source)
    && /\/api\/owner\/admin-login/.test(source)
    && /exchange-only aliases/.test(source)
    && !/\/api\/founder-command\/login/.test(source);
})(), { file: zeroOsGateAuthHelper });

check('SkyeNet deploy tools no longer use founder-command login or local owner password scans', (() => {
  return skynetDeployToolFiles.every((file) => {
    const source = read(file);
    return /resolveZeroOsGateAuth/.test(source)
      && !/credentialKeys|ownerCredential|readEnvFile\(file\)|\/api\/founder-command\/login|OWNER_ADMIN_PASSWORD|FS27_ADMIN_PASSWORD|x-admin-token|x-free99-admin-code/.test(source);
  });
})(), { files: skynetDeployToolFiles });

check('SkyeVault push/root tooling forwards shared gate sessions instead of raw admin-token lanes', (() => {
  return skyeVaultToolFiles.every((file) => {
    const source = read(file).replace(/PLATFORM_ADMIN_TOKEN:\s*''/g, '');
    return /resolveZeroOsGateAuth/.test(source)
      && !/\/api\/founder-command\/login|SKYEVAULT_ADMIN_TOKEN|ADMIN_TOKEN|x-admin-token|x-free99-admin-code/.test(source);
  }) && /PLATFORM_ADMIN_TOKEN:\s*''/.test(read('tools/run-root-wrangler.mjs'));
})(), { files: skyeVaultToolFiles });

check('Live proof tooling uses shared FS27 gate bearer and not standalone admin tokens', (() => {
  return liveProofToolFiles.every((file) => {
    const source = read(file);
    return /resolveZeroOsGateAuth/.test(source)
      && !/METRAIYUX_ADMIN_TOKEN|ADMIN_TOKEN|ADMIN_PASSWORD|x-admin-token|x-free99-admin-code/.test(source);
  });
})(), { files: liveProofToolFiles });

check('Owner login and signup write only canonical shared gate session aliases', (() => {
  const login = read(adminLoginPage);
  const generatedLogin = read(generatedAdminLoginPage);
  const signup = `${read(gateSignupPage)}\n${read(gateSignupRootPage)}`;
  const combined = `${login}\n${generatedLogin}\n${signup}`;
  return /0s-gate-card-bridge\.js/.test(login)
    && /METRAIYUX_GATE_SESSION/.test(combined)
    && /SKYGATEFS27_GATE_SESSION/.test(combined)
    && !/(?:localStorage|sessionStorage)\.setItem\(["'](?:FREE99_PLATFORM_GATE_SESSION|adminBrainToken|adminSecuritySession|quantumskyes_mcp_owner_token|SKYGATE_USER_TOKEN|SKYGATE_SESSION_TOKEN)/.test(combined);
})(), { files: [adminLoginPage, generatedAdminLoginPage, gateSignupPage, gateSignupRootPage] });

check('SkyeRouteX public tour token never overwrites the shared gate session', (() => {
  const source = read(skyeRouteXPublicSite);
  return /skyeroutex_tour_token/.test(source)
    && /tour_token/.test(source)
    && !/(?:localStorage|sessionStorage)\.setItem\(["']FREE99_PLATFORM_GATE_SESSION/.test(source);
})(), { file: skyeRouteXPublicSite });

check('SkyeRouteX app browser lanes use FS27 bridge plus separate read-only tour storage', (() => {
  const index = read(routexIndex);
  const combined = routexAppBrowserFiles.map((file) => `\n/* ${file} */\n${read(file)}`).join('\n');
  return /SKYEROUTEX_TOUR_SESSION/.test(index)
    && /readonly:\s*true/.test(index)
    && /MetrAIyuxGateBridge/.test(combined)
    && /Free99PlatformGate/.test(combined)
    && /Read-only tour tokens cannot change SkyeRouteX data/.test(combined)
    && !/(?:localStorage|sessionStorage)\.setItem\(["']FREE99_PLATFORM_GATE_SESSION/.test(index + '\n' + combined)
    && !/(?:localStorage|sessionStorage)\.setItem\(["'](?:SKYGATE_USER_TOKEN|SKYGATE_SESSION_TOKEN)/.test(index + '\n' + combined);
})(), { files: [routexIndex, ...routexAppBrowserFiles] });

check('Vantacore and RouteX AE browser pages consume the shared gate bridge instead of token islands', (() => {
  const vantacore = read(vantacoreCrmDashboard);
  const ae = read(routexAeProfile);
  return /MetrAIyuxGateBridge/.test(vantacore)
    && /MetrAIyuxGateBridge/.test(ae)
    && !/query\.get\(["'](?:gate_session|skygate_session|session)["']\)|FREE99_PLATFORM_GATE_SESSION|adminBrainToken|adminSecuritySession|saas_client_session|SKYGATE_USER_TOKEN|SKYGATE_SESSION_TOKEN|__KAIXU_RUNTIME__|__SKYEGATE_RUNTIME__/.test(vantacore)
    && !/FREE99_PLATFORM_GATE_SESSION|saas_client_session/.test(ae);
})(), { files: [vantacoreCrmDashboard, routexAeProfile] });

const receipt = {
  ok: checks.every((item) => item.ok || (item.severity === 'warning' && !failOnWarnings)),
  schema: 'metraiyux-0s.auth-spine-guard.v1',
  generatedAt: new Date().toISOString(),
  summary: {
    checks: checks.length,
    blockers: checks.filter((item) => !item.ok && item.severity === 'blocker').length,
    warnings: checks.filter((item) => !item.ok && item.severity === 'warning').length
  },
  checks
};

const outDir = path.join(repoRoot, 'test-artifacts', '0s-auth-spine-guard');
fs.mkdirSync(outDir, { recursive: true });
const stamp = receipt.generatedAt.replace(/[:.]/g, '-');
const stamped = path.join(outDir, `0s-auth-spine-guard-${stamp}.json`);
const latest = path.join(outDir, 'latest.json');
fs.writeFileSync(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(latest, `${JSON.stringify({ ...receipt, stampedReceipt: rel(stamped) }, null, 2)}\n`);

if (jsonOnly) console.log(JSON.stringify({ ...receipt, stampedReceipt: rel(stamped) }, null, 2));
else {
  console.log(`0S auth spine guard: ${receipt.ok ? 'ok' : 'fail'}`);
  console.log(`Receipt: ${rel(latest)}`);
  for (const item of checks.filter((entry) => !entry.ok)) {
    console.log(`- ${item.severity}: ${item.name}`);
  }
}

if (!receipt.ok) process.exitCode = 1;
