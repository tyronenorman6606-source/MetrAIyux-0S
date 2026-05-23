#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CLI_COMMANDS,
  MCP4_NAME,
  MCP4_PUBLIC_BASE,
  MCP4_VERSION,
  MERSER_BIN_ALIASES,
  MERSER_DISPLAY_NAME,
  MERSER_PACKAGE_NAME,
  TOOL_MANIFEST,
  createMcp4SourceWorldServer,
} from "./mcp4-core.mjs";

function resolveEntrypoint(candidate) {
  if (!candidate) return "";
  try {
    return realpathSync(path.resolve(candidate));
  } catch {
    return path.resolve(candidate);
  }
}

const modulePath = realpathSync(fileURLToPath(import.meta.url));
const isEntrypoint = modulePath === resolveEntrypoint(process.argv[1]);

export { createMcp4SourceWorldServer };

function printHelp() {
  process.stdout.write(`${MERSER_DISPLAY_NAME}

Usage:
  Merser --stdio            Start the MCP stdio server
  Merser --help             Show this help
  Merser --version          Print the package version
  Merser --tools            List exposed MCP tools
  Merser --config           Print an MCP client config snippet
  Merser --health           Print local package/remote endpoint metadata

npx:
  npx ${MERSER_PACKAGE_NAME} --stdio
  npx --package ${MERSER_PACKAGE_NAME} Merser --stdio

Package:
  npm package: ${MERSER_PACKAGE_NAME}
  bin aliases: ${MERSER_BIN_ALIASES.join(", ")}
`);
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function runStdioServer() {
  const server = createMcp4SourceWorldServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export async function runMerserCli(args = process.argv.slice(2)) {
  const command = args[0] || "--stdio";

  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
  } else if (command === "--version" || command === "-v" || command === "version") {
    process.stdout.write(`${MCP4_VERSION}\n`);
  } else if (command === "--tools" || command === "tools") {
    printJson({ name: MCP4_NAME, displayName: MERSER_DISPLAY_NAME, tools: TOOL_MANIFEST });
  } else if (command === "--config" || command === "config") {
    printJson({
      mcpServers: {
        merser: {
          command: "npx",
          args: ["-y", MERSER_PACKAGE_NAME, "--stdio"],
        },
      },
    });
  } else if (command === "--health" || command === "health") {
    printJson({
      ok: true,
      name: MCP4_NAME,
      displayName: MERSER_DISPLAY_NAME,
      version: MCP4_VERSION,
      packageName: MERSER_PACKAGE_NAME,
      binAliases: MERSER_BIN_ALIASES,
      remote: {
        site: `${MCP4_PUBLIC_BASE}/`,
        health: `${MCP4_PUBLIC_BASE}/health`,
        endpoint: `${MCP4_PUBLIC_BASE}/mcp`,
      },
      commands: CLI_COMMANDS,
    });
  } else if (command === "--stdio" || command === "stdio") {
    await runStdioServer();
  } else {
    process.stderr.write(`Unknown Merser command: ${command}\nRun: Merser --help\n`);
    process.exitCode = 1;
  }
}

if (isEntrypoint) {
  await runMerserCli(process.argv.slice(2));
}
