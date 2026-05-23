import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const MERSER_PACKAGE_NAME = "@skyes0verl0nd0n/merser";
export const MERSER_DISPLAY_NAME = "Merser by Skyes Over London";
export const MERSER_BIN_ALIASES = ["Merser", "merser", "merser-mcp"];
export const MCP4_NAME = "merser";
export const MCP4_VERSION = "1.0.1";
export const MCP4_PUBLIC_BASE = "https://merser.pages.dev";

export const SOURCE_PACKS = [
  {
    id: "real-room-pack",
    title: "Skye Real World-Site Full Room Pack v3",
    path: "source-packs/skye_real_worldsite_full_room_pack_v3",
    origin: "skye_real_worldsite_full_room_pack_v3.zip",
    count: 5,
    purpose: "Actual environment pages with central physical anchors, hotspots, drag-to-pan, zoom, scroll camera movement, and drawer panels.",
  },
  {
    id: "visual-standard-themes",
    title: "MetrAIyux 0S Skye Visual Standard Themes v4",
    path: "source-packs",
    origin: "metraiyux-0s-skye-visual-standard-themes-v4.zip",
    count: 1162,
    purpose: "Theme engine, visual standard CSS, icon libraries, copy-paste components, MCP bridge packets, QA ledgers, and public claims docs.",
  },
  {
    id: "kaixu-arsenal",
    title: "Kaixu Personal Design Arsenal v3",
    path: "source-packs/kaixu_personal_design_arsenal_v3",
    origin: "kaixu-personal-design-arsenal-v3-copy-paste-fixed.zip",
    count: 182,
    purpose: "Zero-dependency personal design arsenal with icons, templates, snippets, social cards, and paste-ready UI material.",
  },
  {
    id: "mcp2-base",
    title: "MCP2 Base Lane",
    path: ".",
    origin: "copied from .vscode/MCP2 after zip extraction",
    count: 1,
    purpose: "The existing one-file directive, built assets, and immersive React source used as the starting structure for Merser.",
  },
];

export const REAL_ROOM_WORLDS = [
  {
    id: "barbershop",
    title: "Barbershop Chair Room World",
    sourcePath: "source-packs/skye_real_worldsite_full_room_pack_v3/barbershop_chair_room_world.html",
    liveUrl: `${MCP4_PUBLIC_BASE}/source-packs/skye_real_worldsite_full_room_pack_v3/barbershop_chair_room_world.html`,
    anchor: "barber chair",
    interactions: ["drag-to-pan room", "clickable service hotspots", "drawer conversion panels", "scroll camera movement", "ctrl-wheel zoom"],
    use: "Local-service world-site where the room sells the appointment through a physical environment instead of a generic layout.",
  },
  {
    id: "tattoo",
    title: "Tattoo Studio Ink Room",
    sourcePath: "source-packs/skye_real_worldsite_full_room_pack_v3/tattoo_studio_ink_room.html",
    liveUrl: `${MCP4_PUBLIC_BASE}/source-packs/skye_real_worldsite_full_room_pack_v3/tattoo_studio_ink_room.html`,
    anchor: "ink chair and studio walls",
    interactions: ["flash-wall hotspot", "artist proof drawer", "camera drift", "drag-to-pan room", "consult route"],
    use: "Portfolio and booking room with the studio itself as the navigation model.",
  },
  {
    id: "med-spa",
    title: "Med Spa Glow Room",
    sourcePath: "source-packs/skye_real_worldsite_full_room_pack_v3/med_spa_glow_room.html",
    liveUrl: `${MCP4_PUBLIC_BASE}/source-packs/skye_real_worldsite_full_room_pack_v3/med_spa_glow_room.html`,
    anchor: "treatment bed glow room",
    interactions: ["treatment hotspots", "proof drawer", "scroll camera", "drag-to-pan room", "soft zoom"],
    use: "High-trust service page where proof, service menu, and conversion live inside a calm treatment room.",
  },
  {
    id: "gym",
    title: "Gym Training Floor World",
    sourcePath: "source-packs/skye_real_worldsite_full_room_pack_v3/gym_training_floor_world.html",
    liveUrl: `${MCP4_PUBLIC_BASE}/source-packs/skye_real_worldsite_full_room_pack_v3/gym_training_floor_world.html`,
    anchor: "training floor",
    interactions: ["program hotspots", "trainer proof drawer", "camera rail", "drag-to-pan room", "zoom"],
    use: "Fitness offer surface with the training floor acting as the navigation and sales environment.",
  },
];

export const COMPONENT_REGISTRY = [
  {
    id: "sovereign-hero-slab",
    path: "source-packs/copy-paste/components/sovereign-hero-slab.html",
    group: "core copy-paste",
    use: "First-viewport brand/offer slab for 0S pages.",
  },
  {
    id: "route-selector-widget",
    path: "source-packs/copy-paste/components/route-selector-widget.html",
    group: "core copy-paste",
    use: "Clickable route selector for platform lanes and world rooms.",
  },
  {
    id: "workspace-dock",
    path: "source-packs/copy-paste/components/workspace-dock.html",
    group: "core copy-paste",
    use: "Persistent workspace navigation dock.",
  },
  {
    id: "proof-receipt-rail",
    path: "source-packs/copy-paste/components/proof-receipt-rail.html",
    group: "core copy-paste",
    use: "Receipt strip for deployments, QA, and browser proof.",
  },
  {
    id: "command-terminal-card",
    path: "source-packs/copy-paste/components/command-terminal-card.html",
    group: "core copy-paste",
    use: "Terminal-style CLI and command display.",
  },
  {
    id: "enterprise-hero-orbit",
    path: "source-packs/copy-paste/expanded/components/enterprise-hero-orbit.html",
    group: "expanded",
    use: "Orbiting hero system for larger platform pages.",
  },
  {
    id: "command-palette",
    path: "source-packs/copy-paste/expanded/components/command-palette.html",
    group: "expanded",
    use: "Keyboard-style route/search affordance.",
  },
  {
    id: "operator-sidebar-shell",
    path: "source-packs/copy-paste/expanded/components/operator-sidebar-shell.html",
    group: "expanded",
    use: "Operator console shell for internal/admin tools.",
  },
  {
    id: "metraiyux-icons",
    path: "source-packs/assets/icons/metraiyux-icons.json",
    group: "icon system",
    use: "78 themed platform icons in SVG and PNG form.",
  },
];

export const PROMPT_PACKS = [
  {
    id: "context",
    title: "MetrAIyux MCP Context Packet",
    path: "source-packs/mcp/METRAIYUX_MCP_CONTEXT_PACKET.md",
    use: "Brand/output contract for MCP-backed generation.",
  },
  {
    id: "prompts",
    title: "MetrAIyux MCP Prompt Pack",
    path: "source-packs/mcp/METRAIYUX_MCP_PROMPT_PACK.md",
    use: "Ready prompts for icons, components, registries, and polish passes.",
  },
  {
    id: "bridge",
    title: "Skye Design MCP Bridge",
    path: "source-packs/mcp/README_MCP_BRIDGE.md",
    use: "Explains how the copy-paste vault is wired into the MCP workflow.",
  },
];

export const CLI_COMMANDS = [
  "cd /workspaces/MetrAIyux-0S/.vscode/MCP4",
  "npm install",
  "npx @skyes0verl0nd0n/merser --help",
  "npx @skyes0verl0nd0n/merser --stdio",
  "npx --package @skyes0verl0nd0n/merser Merser --stdio",
  "npm run dev",
  "npm start",
  "npm run start:http",
  "npm run build",
  "npm run build:worker",
  "npm run deploy",
  "npm run stress",
  "npm run mcp:mine -- .vscode/MCP4",
  "npm run proof:live-browser -- --url https://merser.pages.dev/ --expect \"Merser\"",
];

export const TOOL_MANIFEST = [
  { name: "mcp4_index", desc: "List Merser tools, source packs, commands, and exposed world lanes." },
  { name: "mcp4_packs", desc: "Return the extracted source-pack manifest and provenance." },
  { name: "mcp4_room", desc: "Return a real world-site room contract. id: barbershop | tattoo | med-spa | gym" },
  { name: "mcp4_component", desc: "Return a source component registry entry by id." },
  { name: "mcp4_prompt_pack", desc: "Return prompt/context pack paths and uses." },
  { name: "mcp4_cli", desc: "Return npx, stdio, local HTTP, build, worker, deploy, mine, and proof commands." },
  { name: "mcp4_build_plan", desc: "Return the Merser implementation contract for building from these packs." },
  { name: "mcp4_icons", desc: "Return the MetrAIyux icon-system location and representative icon names." },
];

function text(payload) {
  return {
    content: [
      {
        type: "text",
        text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function createMcp4SourceWorldServer() {
  const server = new McpServer({
    name: MCP4_NAME,
    version: MCP4_VERSION,
  });

  server.tool("mcp4_index", "List all Merser tools and the source-pack contract.", {}, async () =>
    text({
      name: MCP4_NAME,
      displayName: MERSER_DISPLAY_NAME,
      packageName: MERSER_PACKAGE_NAME,
      binAliases: MERSER_BIN_ALIASES,
      version: MCP4_VERSION,
      tools: TOOL_MANIFEST,
      sourcePacks: SOURCE_PACKS.map(({ id, title, path, origin }) => ({ id, title, path, origin })),
      roomWorlds: REAL_ROOM_WORLDS.map(({ id, title, sourcePath, liveUrl }) => ({ id, title, sourcePath, liveUrl })),
      componentCount: COMPONENT_REGISTRY.length,
      cli: CLI_COMMANDS,
    }),
  );

  server.tool("mcp4_packs", "Return extracted source-pack manifest and provenance.", {}, async () =>
    text({
      extractedInto: "/workspaces/MetrAIyux-0S/.vscode/MCP4/source-packs",
      zipsMovedFrom: "/workspaces/MetrAIyux-0S/.vscode/MCP2",
      zipsDeletedAfterExtract: true,
      packs: SOURCE_PACKS,
      deployedSourceRoot: `${MCP4_PUBLIC_BASE}/source-packs/`,
      mcpMineReceipt: "MCP_TOOLING_RECEIPT.json",
    }),
  );

  server.tool(
    "mcp4_room",
    "Return a real world-site room contract.",
    { id: z.enum(["barbershop", "tattoo", "med-spa", "gym"]) },
    async ({ id }) => text(REAL_ROOM_WORLDS.find((room) => room.id === id)),
  );

  server.tool(
    "mcp4_component",
    "Return a component registry entry.",
    { id: z.enum(COMPONENT_REGISTRY.map((item) => item.id)) },
    async ({ id }) => text(COMPONENT_REGISTRY.find((item) => item.id === id)),
  );

  server.tool("mcp4_prompt_pack", "Return prompt/context pack paths and uses.", {}, async () => text(PROMPT_PACKS));

  server.tool("mcp4_cli", "Return all Merser local and deploy commands.", {}, async () =>
    text({
      localStdio: {
        command: "npx",
        args: ["-y", MERSER_PACKAGE_NAME, "--stdio"],
      },
      localSourceStdio: {
        command: "node",
        args: ["/workspaces/MetrAIyux-0S/.vscode/MCP4/stdio-server.mjs", "--stdio"],
      },
      binAliases: MERSER_BIN_ALIASES,
      localHttp: "cd /workspaces/MetrAIyux-0S/.vscode/MCP4 && npm run start:http",
      remoteEndpoint: "https://merser.pages.dev/mcp",
      health: "https://merser.pages.dev/health",
      auth: "Remote access is gate-owned. Use the shared FS27/SkyGate/Free99 bearer or an owner-issued MCP_HTTP_BEARER_TOKEN.",
      commands: CLI_COMMANDS,
    }),
  );

  server.tool("mcp4_build_plan", "Return the source-pack-based implementation contract.", {}, async () =>
    text({
      name: MERSER_DISPLAY_NAME,
      packageName: MERSER_PACKAGE_NAME,
      rule: "Merser starts from the extracted MCP2 zip packs, not from a disconnected visual demo.",
      appSurface: "React/R3F world with draggable chambers, 360 orbit/focus controls, live iframe source-room previews, and a deployed source-pack browser.",
      runtimeStack: ["React", "Three", "R3F", "Drei", "postprocessing", "GSAP", "Lenis", "Framer Motion", "Motion", "Theatre", "Remotion", "live source-pack iframe previews"],
      deployedRoomWorlds: REAL_ROOM_WORLDS.map(({ id, title, liveUrl }) => ({ id, title, liveUrl })),
      mcpSurfaces: ["stdio", "streamable HTTP", "Cloudflare Pages Worker"],
      gatePolicy: "No new app password. Remote worker uses the shared 0S gate introspection or owner bearer.",
      proofPolicy: "Mine with quantumskyes, build, deploy, then live headed browser proof on desktop and mobile.",
    }),
  );

  server.tool("mcp4_icons", "Return icon-system location and representative icon names.", {}, async () =>
    text({
      registry: "source-packs/assets/icons/metraiyux-icons.json",
      svgDir: "source-packs/assets/icons/metraiyux",
      pngDir: "source-packs/assets/icons/metraiyux-png",
      representative: [
        "command-core",
        "component-kit",
        "proof-ledger",
        "route-engine",
        "worker-node",
        "workspace-orbit",
        "approval-gate",
        "database-vault",
      ],
    }),
  );

  return server;
}
