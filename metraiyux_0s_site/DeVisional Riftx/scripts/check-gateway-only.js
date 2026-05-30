const { repoPath, readJson, fail, ok } = require('./lib');
const secureDefaults = readJson(repoPath('config','secure-defaults.json'));
if (secureDefaults.gatewayMode !== 'fs27-skygate-only') fail('[gateway-check] FAIL: gatewayMode must stay fs27-skygate-only.');
if (secureDefaults.allowExternalProviders !== false) fail('[gateway-check] FAIL: allowExternalProviders must remain false.');
if (secureDefaults.openGate !== false) fail('[gateway-check] FAIL: openGate must remain false.');
ok('[gateway-check] PASS: gateway-only policy enforced.');
