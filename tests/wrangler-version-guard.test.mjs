import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertWranglerVersionSupportsConfig,
  configPathFromWranglerArgs,
  envWithModernNodeForWrangler,
  wranglerConfigUsesWorkerLoaders,
  wranglerVersionSupportsWorkerLoaders
} from '../tools/lib/wrangler-version-guard.mjs';

test('worker loader configs require a Wrangler version that preserves worker_loaders', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrangler-loader-guard-'));
  const configFile = path.join(dir, 'wrangler.toml');
  fs.writeFileSync(configFile, 'name = "skyegatefs27-citadeldb"\n[[worker_loaders]]\nbinding = "SKYENET_FUNCTION_LOADER"\n');

  assert.equal(wranglerConfigUsesWorkerLoaders(configFile), true);
  assert.equal(wranglerVersionSupportsWorkerLoaders('4.14.0'), false);
  assert.equal(wranglerVersionSupportsWorkerLoaders('old-local'), false);
  assert.equal(wranglerVersionSupportsWorkerLoaders('4.95.0'), true);
  assert.throws(
    () => assertWranglerVersionSupportsConfig({ configFile, wranglerVersion: '4.14.0' }),
    /SKYENET_FUNCTION_LOADER/
  );
  assert.deepEqual(
    assertWranglerVersionSupportsConfig({ configFile, wranglerVersion: '4.95.0' }),
    { ok: true, usesWorkerLoaders: true }
  );
});

test('wrangler config path is resolved from deploy args', () => {
  const cwd = '/tmp/skyenet-guard';
  assert.equal(
    configPathFromWranglerArgs(['deploy', '--config', 'fs27/wrangler.toml'], cwd),
    '/tmp/skyenet-guard/fs27/wrangler.toml'
  );
  assert.equal(
    configPathFromWranglerArgs(['deploy'], cwd),
    '/tmp/skyenet-guard/wrangler.toml'
  );
});

test('wrangler child env prefers an available modern Node bin', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrangler-node-guard-'));
  const nodeBin = path.join(dir, '.nvm', 'versions', 'node', 'v24.15.0', 'bin');
  fs.mkdirSync(nodeBin, { recursive: true });
  const nodePath = path.join(nodeBin, 'node');
  fs.writeFileSync(nodePath, '#!/bin/sh\necho v24.15.0\n');
  fs.chmodSync(nodePath, 0o755);

  const env = envWithModernNodeForWrangler({
    HOME: dir,
    PATH: '/usr/bin'
  });
  assert.equal(env.PATH.split(path.delimiter)[0], nodeBin);
});
