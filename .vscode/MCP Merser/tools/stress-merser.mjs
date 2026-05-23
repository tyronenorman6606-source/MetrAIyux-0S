#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCP4_PUBLIC_BASE, MERSER_DISPLAY_NAME } from "../mcp4-core.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(rootDir, "../..");
const artifactRoot = resolve(repoRoot, "test-artifacts", "merser-mcp-stress");

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function intArg(name, fallback) {
  const value = Number(argValue(name, ""));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const config = {
  liveBase: String(argValue("--live-base", process.env.MERSER_LIVE_BASE || MCP4_PUBLIC_BASE)).replace(/\/+$/, ""),
  localPort: intArg("--local-port", Number(process.env.MERSER_STRESS_PORT || 8791)),
  concurrency: intArg("--concurrency", Number(process.env.MERSER_STRESS_CONCURRENCY || 24)),
  httpIterations: intArg("--http-iterations", Number(process.env.MERSER_STRESS_HTTP_ITERATIONS || 96)),
  liveIterations: intArg("--live-iterations", Number(process.env.MERSER_STRESS_LIVE_ITERATIONS || 45)),
  stdioIterations: intArg("--stdio-iterations", Number(process.env.MERSER_STRESS_STDIO_ITERATIONS || 18)),
  output: argValue("--output", ""),
};

function nowIsoForPath() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function elapsedMs(start) {
  return Number((performance.now() - start).toFixed(2));
}

function command(command, args, options = {}) {
  const start = performance.now();
  return new Promise((resolveCommand) => {
    const child = spawn(command, args, {
      cwd: options.cwd || rootDir,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code, signal) => {
      const stdoutLimit = options.stdoutLimit ?? 5000;
      const stderrLimit = options.stderrLimit ?? 5000;
      resolveCommand({
        ok: code === 0,
        command,
        args,
        code,
        signal,
        durationMs: elapsedMs(start),
        stdout: stdoutLimit === Infinity ? stdout : stdout.slice(0, stdoutLimit),
        stderr: stderrLimit === Infinity ? stderr : stderr.slice(0, stderrLimit),
      });
    });
  });
}

function summarizeSamples(samples) {
  const durations = samples.map((sample) => sample.durationMs).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const statuses = {};
  let failed = 0;
  for (const sample of samples) {
    statuses[String(sample.status ?? sample.code ?? "error")] = (statuses[String(sample.status ?? sample.code ?? "error")] || 0) + 1;
    if (!sample.ok) failed += 1;
  }
  const percentile = (p) => {
    if (!durations.length) return 0;
    const index = Math.min(durations.length - 1, Math.max(0, Math.ceil((p / 100) * durations.length) - 1));
    return Number(durations[index].toFixed(2));
  };
  return {
    total: samples.length,
    failed,
    statuses,
    minMs: durations.length ? Number(durations[0].toFixed(2)) : 0,
    p50Ms: percentile(50),
    p95Ms: percentile(95),
    maxMs: durations.length ? Number(durations[durations.length - 1].toFixed(2)) : 0,
  };
}

async function runPool(total, concurrency, task) {
  const samples = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(total, concurrency) }, async () => {
    while (next < total) {
      const index = next;
      next += 1;
      samples[index] = await task(index);
    }
  });
  await Promise.all(workers);
  return samples;
}

async function jsonFetch(url, init = {}, acceptStatuses = [200]) {
  const start = performance.now();
  try {
    const response = await fetch(url, init);
    const bodyText = await response.text();
    return {
      ok: acceptStatuses.includes(response.status),
      status: response.status,
      durationMs: elapsedMs(start),
      bytes: bodyText.length,
      contentType: response.headers.get("content-type") || "",
      snippet: bodyText.slice(0, 240),
    };
  } catch (error) {
    return {
      ok: false,
      status: "network-error",
      durationMs: elapsedMs(start),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function rpcBody(id, method, params = {}) {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params });
}

function rpcHeaders(extra = {}) {
  return {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    ...extra,
  };
}

async function waitForHealth(base, timeoutMs = 9000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await jsonFetch(`${base}/health`);
    if (last.ok) return last;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  return last || { ok: false, status: "timeout", durationMs: timeoutMs };
}

async function runPackageSmoke() {
  const [help, tools, health, packDryRun] = await Promise.all([
    command(process.execPath, ["stdio-server.mjs", "--help"]),
    command(process.execPath, ["stdio-server.mjs", "--tools"]),
    command(process.execPath, ["stdio-server.mjs", "--health"]),
    command("npm", ["pack", "--dry-run", "--json"], { stdoutLimit: Infinity }),
  ]);
  let pack = null;
  let toolPayload = null;
  try {
    pack = JSON.parse(packDryRun.stdout)[0];
  } catch {
    pack = null;
  }
  try {
    toolPayload = JSON.parse(tools.stdout);
  } catch {
    toolPayload = null;
  }
  return {
    ok:
      help.ok &&
      tools.ok &&
      health.ok &&
      packDryRun.ok &&
      toolPayload?.tools?.length === 8 &&
      Boolean(pack) &&
      pack.files?.some((file) => file.path === "stdio-server.mjs") &&
      pack.files?.some((file) => file.path === "mcp4-core.mjs") &&
      pack.files?.some((file) => file.path === "src/App.jsx") &&
      pack.files?.some((file) => file.path === "remote/worker-source.mjs") &&
      pack.files?.some((file) => file.path === "tools/stress-merser.mjs"),
    help: { ok: help.ok, durationMs: help.durationMs, hasUsage: help.stdout.includes("Merser --stdio") },
    tools: {
      ok: tools.ok,
      durationMs: tools.durationMs,
      exposesEightTools: toolPayload?.tools?.length === 8,
    },
    health: {
      ok: health.ok,
      durationMs: health.durationMs,
      mentionsRemoteEndpoint: health.stdout.includes("/mcp"),
    },
    pack: pack
      ? {
          ok: packDryRun.ok,
          filename: pack.filename,
          files: pack.files?.length || 0,
          unpackedSize: pack.unpackedSize,
          size: pack.size,
          hasStdio: pack.files?.some((file) => file.path === "stdio-server.mjs") || false,
          hasCore: pack.files?.some((file) => file.path === "mcp4-core.mjs") || false,
          hasSourceApp: pack.files?.some((file) => file.path === "src/App.jsx") || false,
          hasWorkerSource: pack.files?.some((file) => file.path === "remote/worker-source.mjs") || false,
          hasStressTool: pack.files?.some((file) => file.path === "tools/stress-merser.mjs") || false,
          hasSkyesLogo: pack.files?.some((file) => file.path === "public/skyes-over-london-deity-logo.png") || false,
        }
      : { ok: false, parseError: true },
  };
}

async function runStdioStress() {
  const client = new Client({ name: "merser-stress", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(rootDir, "stdio-server.mjs"), "--stdio"],
    cwd: rootDir,
  });
  const start = performance.now();
  await client.connect(transport);
  const tools = await client.listTools();
  const samples = [];
  for (let index = 0; index < config.stdioIterations; index += 1) {
    const sampleStart = performance.now();
    try {
      const response = await client.callTool({ name: "mcp4_index", arguments: {} });
      samples.push({
        ok: Boolean(response?.content?.length),
        status: "ok",
        durationMs: elapsedMs(sampleStart),
      });
    } catch (error) {
      samples.push({
        ok: false,
        status: "error",
        durationMs: elapsedMs(sampleStart),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  await client.close();
  return {
    ok: tools.tools.length === 8 && samples.every((sample) => sample.ok),
    durationMs: elapsedMs(start),
    toolCount: tools.tools.length,
    samples: summarizeSamples(samples),
  };
}

async function runLocalHttpStress() {
  const localBase = `http://127.0.0.1:${config.localPort}`;
  const child = spawn(process.execPath, ["http-server.mjs"], {
    cwd: rootDir,
    env: { ...process.env, MCP_HTTP_PORT: String(config.localPort), MCP_HTTP_HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  try {
    const health = await waitForHealth(localBase);
    if (!health.ok) {
      return { ok: false, localBase, health, serverStderr: stderr.slice(0, 1200) };
    }
    const healthSamples = await runPool(config.httpIterations, config.concurrency, () => jsonFetch(`${localBase}/health`));
    const listSamples = await runPool(config.httpIterations, config.concurrency, (index) =>
      jsonFetch(`${localBase}/mcp`, {
        method: "POST",
        headers: rpcHeaders(),
        body: rpcBody(index + 1, "tools/list"),
      }),
    );
    const callSamples = await runPool(config.httpIterations, config.concurrency, (index) =>
      jsonFetch(`${localBase}/mcp`, {
        method: "POST",
        headers: rpcHeaders(),
        body: rpcBody(index + 1000, "tools/call", { name: "mcp4_index", arguments: {} }),
      }),
    );
    return {
      ok: [...healthSamples, ...listSamples, ...callSamples].every((sample) => sample.ok),
      localBase,
      health,
      healthSamples: summarizeSamples(healthSamples),
      listSamples: summarizeSamples(listSamples),
      callSamples: summarizeSamples(callSamples),
      serverStderr: stderr.slice(0, 1200),
    };
  } finally {
    child.kill("SIGTERM");
  }
}

async function runLiveStress() {
  const rootSamples = await runPool(config.liveIterations, config.concurrency, () => jsonFetch(`${config.liveBase}/`));
  const healthSamples = await runPool(config.liveIterations, config.concurrency, () => jsonFetch(`${config.liveBase}/health`));
  const gateSamples = await runPool(Math.max(8, Math.floor(config.liveIterations / 3)), config.concurrency, (index) =>
    jsonFetch(
      `${config.liveBase}/mcp`,
      {
        method: "POST",
        headers: rpcHeaders(),
        body: rpcBody(index + 1, "tools/list"),
      },
      [401],
    ),
  );

  const bearer = process.env.MERSER_MCP_BEARER || process.env.MCP_HTTP_BEARER_TOKEN || "";
  let authedMcp = { skipped: true, reason: "No MERSER_MCP_BEARER or MCP_HTTP_BEARER_TOKEN was provided." };
  if (bearer) {
    const authedSamples = await runPool(Math.max(8, Math.floor(config.liveIterations / 3)), config.concurrency, (index) =>
      jsonFetch(`${config.liveBase}/mcp`, {
        method: "POST",
        headers: rpcHeaders({ Authorization: `Bearer ${bearer}` }),
        body: rpcBody(index + 500, "tools/list"),
      }),
    );
    authedMcp = { skipped: false, samples: summarizeSamples(authedSamples) };
  }

  return {
    ok: [...rootSamples, ...healthSamples, ...gateSamples].every((sample) => sample.ok) && (authedMcp.skipped || authedMcp.samples.failed === 0),
    liveBase: config.liveBase,
    rootSamples: summarizeSamples(rootSamples),
    healthSamples: summarizeSamples(healthSamples),
    unauthenticatedMcpGateSamples: summarizeSamples(gateSamples),
    authedMcp,
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const [packageSmoke, stdioStress, localHttpStress, liveStress] = await Promise.all([
    runPackageSmoke(),
    runStdioStress(),
    runLocalHttpStress(),
    runLiveStress(),
  ]);
  const report = {
    ok: packageSmoke.ok && stdioStress.ok && localHttpStress.ok && liveStress.ok,
    name: MERSER_DISPLAY_NAME,
    startedAt,
    finishedAt: new Date().toISOString(),
    config: { ...config, output: config.output || "(auto)" },
    packageSmoke,
    stdioStress,
    localHttpStress,
    liveStress,
    limitations: [
      "Live /mcp authenticated tool calls run only when a bearer token is provided through environment variables; tokens are never printed.",
      "This is a functional concurrency stress smoke, not a paid external load-testing engagement or SLA benchmark.",
    ],
  };
  const outputPath = config.output || join(artifactRoot, `${nowIsoForPath()}-merser-mcp-stress-report.json`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: report.ok, outputPath, package: report.packageSmoke.ok, stdio: report.stdioStress.ok, localHttp: report.localHttpStress.ok, live: report.liveStress.ok }, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
