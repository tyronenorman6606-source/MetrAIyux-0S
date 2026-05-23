#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const testsDir = path.dirname(__filename);
const factoryRoot = path.resolve(testsDir, "..");
const repoRoot = path.resolve(factoryRoot, "..");
const nodeBin = process.execPath;

async function waitFor(url, attempts = 60, delayMs = 500) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return true;
    } catch (error) {
      // wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      stdio: options.stdio || "inherit",
      env: { ...process.env, ...(options.env || {}) }
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} ${args.join(" ")} exited ${code}`));
    });
    child.on("error", reject);
  });
}

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || repoRoot,
    stdio: options.stdio || "inherit",
    env: { ...process.env, ...(options.env || {}) }
  });
  return child;
}

let backendProcess = null;
let mountedProcess = null;
let spawnedBackend = false;

try {
  await run(nodeBin, [path.join(factoryRoot, "scripts/publish-0s-shell.mjs")], { cwd: repoRoot });

  const backendHealthy = await waitFor("http://127.0.0.1:4199/api/health", 6, 250);
  if (!backendHealthy) {
    backendProcess = start(nodeBin, [path.join(factoryRoot, "server.mjs"), "4199"], { cwd: factoryRoot });
    spawnedBackend = true;
    const ready = await waitFor("http://127.0.0.1:4199/api/health", 60, 500);
    if (!ready) throw new Error("Factory backend did not become healthy on :4199");
  }

  mountedProcess = start(nodeBin, [path.join(factoryRoot, "scripts/dev-mounted-server.mjs"), "4319", "http://127.0.0.1:4199"], { cwd: repoRoot });
  const mountedReady = await waitFor("http://127.0.0.1:4319/client-app-factory/", 60, 500);
  if (!mountedReady) throw new Error("Mounted 0S proof server did not become healthy on :4319");

  await run(nodeBin, [path.join(factoryRoot, "tests/browser-proof.mjs"), "http://127.0.0.1:4319/client-app-factory/"], { cwd: repoRoot });
} finally {
  if (mountedProcess) mountedProcess.kill("SIGTERM");
  if (spawnedBackend && backendProcess) backendProcess.kill("SIGTERM");
}
