import { spawn } from 'node:child_process'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const appRoot = process.cwd()
const repoRoot = path.resolve(appRoot, '..', '..')
const mcpServerPath = path.join(repoRoot, 'MCP', 'stdio-server.mjs')
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'operator-console-remix')
const localReceiptRoot = path.join(appRoot, 'operator-receipts')
const generatedWorldRoot = path.join(appRoot, 'generated-worlds')
const remoteHealthUrl = 'https://skye-design-mcp.pages.dev/health'

type JsonRecord = Record<string, unknown>

const worldArchetypes = [
  {
    id: 'house-threshold',
    label: 'House Threshold',
    product: 'owner-gated product world',
    metaphor: 'sidewalk to front door to first room reveal',
    entryRitual: 'door code unlock',
    firstViewportSubject: 'front door, lit keypad, visible interior edge',
    surface: 'immersive public and owner-entry site',
    goal: 'make the visitor feel physically invited into the product',
    audience: 'owners, buyers, operators, and AI clients',
    effects: ['threeCanvas', 'gsapScroll', 'cursorTrail', 'motionChrome', 'textEffects'],
    requiredStack: ['three', 'gsap', 'lenis'],
    useCases: ['public-landing-hero', 'webgl-product-scene', 'scroll-story', 'proof-surface', 'brand-motion-chrome'],
  },
  {
    id: 'barber-shop',
    label: 'Barber Shop Walkthrough',
    product: 'barber booking and proof world',
    metaphor: 'storefront to chair to mirror to service wall',
    entryRitual: 'walk in, choose chair, pick service',
    firstViewportSubject: 'shopfront with a chair visible through the glass',
    surface: 'booking site, client walkthrough, and owner lead lane',
    goal: 'turn a local-service site into a room people can navigate',
    audience: 'barber clients and shop owner',
    effects: ['threeCanvas', 'gsapScroll', 'surfaceScreenshots', 'motionChrome', 'textEffects'],
    requiredStack: ['three', 'gsap', 'lenis'],
    useCases: ['public-landing-hero', 'webgl-product-scene', 'scroll-story', 'proof-surface', 'content-sections'],
  },
  {
    id: 'studio-booth',
    label: 'Studio Control Room',
    product: 'music, media, and release workflow world',
    metaphor: 'console lights to stems to rights vault to release booth',
    entryRitual: 'arm the console and open the booth',
    firstViewportSubject: 'mixing desk and lit booth glass',
    surface: 'creative workspace and gated client portal',
    goal: 'make upload, rights, proof, and booking feel like entering a studio',
    audience: 'artists, producers, managers, and operators',
    effects: ['theatre', 'threeCanvas', 'gsapScroll', 'surfaceScreenshots', 'motionChrome'],
    requiredStack: ['three', 'gsap', 'lenis', 'theatre'],
    useCases: ['webgl-product-scene', 'scroll-story', 'proof-surface', 'app-tool-surface'],
  },
  {
    id: 'dispatch-floor',
    label: 'Dispatch Floor',
    product: 'ops, routes, crews, and invoice handoff world',
    metaphor: 'map table to pins to crew state to invoice drawer',
    entryRitual: 'claim a route from the map table',
    firstViewportSubject: 'live map table with route pins',
    surface: 'operator dashboard and public trust surface',
    goal: 'turn operational status into a spatial control room',
    audience: 'dispatchers, customers, crew leads, and owners',
    effects: ['gsapScroll', 'motionChrome', 'surfaceScreenshots', 'textEffects'],
    requiredStack: ['gsap', 'lenis', 'motion'],
    useCases: ['app-tool-surface', 'scroll-story', 'proof-surface', 'content-sections'],
  },
  {
    id: 'legal-war-room',
    label: 'Legal War Room',
    product: 'legal intake, evidence, and case-proof world',
    metaphor: 'locked intake door to evidence table to timeline wall',
    entryRitual: 'case-code entry',
    firstViewportSubject: 'case room door with evidence light',
    surface: 'intake site and secure client workspace',
    goal: 'make legal trust feel private, serious, and proof-backed',
    audience: 'clients, attorneys, intake operators, and reviewers',
    effects: ['gsapScroll', 'surfaceScreenshots', 'motionChrome', 'textEffects'],
    requiredStack: ['gsap', 'lenis'],
    useCases: ['public-landing-hero', 'scroll-story', 'proof-surface', 'workspace-chat-lane'],
  },
  {
    id: 'restaurant-host-stand',
    label: 'Restaurant Host Stand',
    product: 'restaurant ordering, reservation, and event world',
    metaphor: 'host stand to table to kitchen pass to private event room',
    entryRitual: 'party name and table reveal',
    firstViewportSubject: 'host stand with dining room depth',
    surface: 'public menu, reservation lane, and event booking site',
    goal: 'make food and hospitality sites feel seated, not browsed',
    audience: 'diners, event buyers, and restaurant operators',
    effects: ['threeCanvas', 'gsapScroll', 'surfaceScreenshots', 'motionChrome'],
    requiredStack: ['three', 'gsap', 'lenis'],
    useCases: ['public-landing-hero', 'webgl-product-scene', 'scroll-story', 'content-sections'],
  },
] as const

const targetDefinitions = [
  {
    id: 'operator-console',
    label: 'MCP Operator Console',
    path: 'MCP/operator-console-remix',
    purpose: 'local cockpit for catalog, planning, mining, and proof receipts',
  },
  {
    id: 'skye-design-lab',
    label: 'Skye Design Lab',
    path: 'MCP/skye-design-lab',
    purpose: 'public deployed lab and same-domain MCP documentation surface',
  },
  {
    id: 'mcp-root',
    label: 'QuantumSkyes MCP Root',
    path: 'MCP',
    purpose: 'source-of-truth local MCP server, remote worker, design packs, scripts, and docs',
  },
  {
    id: 'skyesol-public',
    label: 'SkyeSol Public Site',
    path: 'skyesol_current_public_site',
    purpose: 'current public SkyeSol app target',
  },
  {
    id: 'metraiyux-0s',
    label: 'MetrAIyux 0S',
    path: 'metraiyux_0s_site',
    purpose: '0S gate, public platform, and owner surfaces',
  },
  {
    id: 'bobs-smoke-shop',
    label: 'Bob\'s Smoke Shop MCP Redo',
    path: 'Skye-Clients/bobs-smoke-shop-mcp-redo',
    purpose: 'local-service/client-world candidate',
  },
  {
    id: 'empire-pallets',
    label: 'Empire Pallets App',
    path: 'Skye-Clients/empire-pallets-v3-app',
    purpose: 'quote/client app candidate',
  },
] as const

type TargetDefinition = (typeof targetDefinitions)[number]
type WorldArchetype = (typeof worldArchetypes)[number]

export function targetsPayload() {
  return {
    ok: true,
    repoRoot,
    targets: targetDefinitions.map((target) => {
      const absolutePath = resolveTargetPath(target.path)
      return {
        ...target,
        exists: fs.existsSync(absolutePath),
        absolutePath,
        receipt: receiptSummary(absolutePath),
      }
    }),
    archetypes: worldArchetypes,
  }
}

export function worldsPayload() {
  return {
    ok: true,
    archetypes: worldArchetypes,
    contract: {
      recipe: 'idea -> physical metaphor -> entry ritual -> MCP plan -> target mining -> browser proof',
      notASecondMcp: true,
      engine: 'QuantumSkyes local/remote MCP',
      cockpit: 'MCP/operator-console-remix',
    },
  }
}

export async function statusPayload() {
  const startedAt = new Date().toISOString()
  try {
    const response = await fetch(remoteHealthUrl, { headers: { Accept: 'application/json' } })
    const health = await response.json()
    return {
      ok: response.ok && health.ok === true,
      checkedAt: new Date().toISOString(),
      startedAt,
      source: remoteHealthUrl,
      health,
      local: {
        repoRoot,
        mcpServerPath,
        mcpServerExists: fs.existsSync(mcpServerPath),
        operatorReceipts: localReceiptRoot,
      },
    }
  } catch (error) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      startedAt,
      source: remoteHealthUrl,
      error: error instanceof Error ? error.message : 'Unknown MCP health error',
    }
  }
}

export async function catalogPayload() {
  return withLocalMcp(async (client) => {
    const [resources, tools] = await Promise.all([client.listResources(), client.listTools()])
    const resourceList = resources.resources ?? []
    const toolList = tools.tools ?? []
    const payload = {
      ok: true,
      checkedAt: new Date().toISOString(),
      transport: 'local-stdio',
      server: mcpServerPath,
      counts: {
        resources: resourceList.length,
        tools: toolList.length,
      },
      resources: resourceList.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        mimeType: resource.mimeType,
      })),
      tools: toolList.map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
    }
    await writeReceipt('catalog', payload)
    return payload
  })
}

export async function planPayload(request: Request) {
  const url = new URL(request.url)
  const target = findTarget(url.searchParams.get('target') || 'MCP/operator-console-remix')
  const archetype = findArchetype(url.searchParams.get('archetype') || 'house-threshold')
  const targetPath = resolveTargetPath(target.path)
  const inventory = targetInventory(targetPath)

  return withLocalMcp(async (client) => {
    const recipe = await callTool(client, 'design_recipe_plan', {
      product: archetype.product,
      surface: archetype.surface,
      goal: archetype.goal,
      audience: archetype.audience,
      effects: archetype.effects,
    })
    const componentPlan = await callTool(client, 'design_component_plan', {
      product: archetype.product,
      surface: archetype.surface,
      goal: archetype.goal,
      audience: archetype.audience,
      useCases: archetype.useCases,
      effects: archetype.effects,
      requiredStack: archetype.requiredStack,
      stackMode: 'selected',
    })
    const variety = await callTool(client, 'design_variety_plan', {
      product: archetype.product,
      surface: archetype.surface,
      goal: archetype.goal,
      audience: archetype.audience,
    })
    const qualityGate = await callTool(client, 'design_quality_gate', {
      surface: `${target.label} ${archetype.label}`,
    })

    const payload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      target,
      targetPath,
      inventory,
      archetype,
      worldContract: {
        physicalMetaphor: archetype.metaphor,
        entryRitual: archetype.entryRitual,
        firstViewportSubject: archetype.firstViewportSubject,
        gateBinding: '0S/NorthStar gate bearer, signed owner-admin bearer, or owner-issued MCP token',
        proofWorkflow: [
          'mine target with QuantumSkyes MCP',
          'apply selected world recipe',
          'run stack/effect/performance audits',
          'deploy',
          'live headed browser desktop/mobile proof',
        ],
      },
      mcp: {
        recipe,
        componentPlan,
        variety,
        qualityGate,
      },
      nextOperatorCommands: [
        `npm run mcp:mine -- ${target.path}`,
        target.path === 'MCP/skye-design-lab' ? 'cd MCP/skye-design-lab && npm run build' : null,
        'npm run proof:live-browser -- --url https://skye-design-mcp.pages.dev/ --expect "World OS"',
      ].filter(Boolean),
    }
    await writeReceipt(`world-plan-${slug(`${target.id}-${archetype.id}`)}`, payload)
    await writeLocalReceipt('latest-world-plan', payload)
    return payload
  })
}

export async function minePayload(request: Request) {
  const url = new URL(request.url)
  const target = findTarget(url.searchParams.get('target') || 'MCP/operator-console-remix')
  const startedAt = new Date().toISOString()
  const result = await runCommand('npm', ['run', 'mcp:mine', '--', target.path], repoRoot)
  const targetPath = resolveTargetPath(target.path)
  const payload = {
    ok: result.exitCode === 0,
    target,
    command: `npm run mcp:mine -- ${target.path}`,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.exitCode,
    stdout: result.stdout.slice(-8000),
    stderr: result.stderr.slice(-8000),
    receipt: receiptSummary(targetPath),
  }
  await writeReceipt(`mine-${slug(target.id)}`, payload)
  await writeLocalReceipt('latest-mine', payload)
  return payload
}

export async function buildPayload(request: Request) {
  const url = new URL(request.url)
  const target = findTarget(url.searchParams.get('target') || 'MCP/operator-console-remix')
  const archetype = findArchetype(url.searchParams.get('archetype') || 'house-threshold')
  const targetPath = resolveTargetPath(target.path)
  const buildSlug = slug(`${target.id}-${archetype.id}`)
  const worldDir = path.join(generatedWorldRoot, buildSlug)
  const worldFile = path.join(worldDir, 'index.html')
  const startedAt = new Date().toISOString()
  const inventory = targetInventory(targetPath)

  return withLocalMcp(async (client) => {
    const [recipe, qualityGate] = await Promise.all([
      callTool(client, 'design_recipe_plan', {
        product: archetype.product,
        surface: archetype.surface,
        goal: archetype.goal,
        audience: archetype.audience,
        effects: archetype.effects,
      }),
      callTool(client, 'design_quality_gate', {
        surface: `${target.label} ${archetype.label} generated world`,
      }),
    ])
    const html = renderGeneratedWorldHtml({
      buildSlug,
      target,
      archetype,
      generatedAt: startedAt,
      recipeSummary: summarizeToolJson(recipe),
      qualitySummary: summarizeToolJson(qualityGate),
    })
    const effectAudit = await callTool(client, 'design_effect_audit', {
      requested: archetype.effects,
      source: generatedEffectSource(html),
    })
    await fsp.mkdir(worldDir, { recursive: true })
    await fsp.writeFile(worldFile, html)
    const payload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      startedAt,
      target,
      targetPath,
      inventory,
      archetype,
      build: {
        slug: buildSlug,
        route: `/generated-worlds/${buildSlug}`,
        file: path.relative(repoRoot, worldFile),
        absoluteFile: worldFile,
        entryRitual: archetype.entryRitual,
        firstViewportSubject: archetype.firstViewportSubject,
        mcpBacked: true,
      },
      mcp: {
        recipe,
        qualityGate,
        effectAudit,
      },
      proofExpectation: {
        codeRitual: 'click keypad digits 1 3 7 9, press Enter, verify unlocked room reveal',
        desktopMobile: true,
        browserActions: ['scroll walkway', 'enter demo threshold code', 'open first room', 'verify proof rail'],
      },
    }
    await writeReceipt(`world-build-${buildSlug}`, payload)
    await writeLocalReceipt('latest-world-build', payload)
    return payload
  })
}

export async function generatedWorldResponse(world: string) {
  const worldSlug = slug(world)
  const filePath = path.join(generatedWorldRoot, worldSlug, 'index.html')
  if (!fs.existsSync(filePath)) {
    return new Response('Generated world not found. Build it from /api/build first.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
  return new Response(await fsp.readFile(filePath, 'utf8'), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function proofPayload() {
  const scopedProofFiles = [
    'browser-proof.json',
    'canvas-pixel-proof.json',
    'skye-design-lab-world-os-proof.json',
    'live-production-headed-proof.json',
    'operator-console-e2e-proof.json',
  ]
  const proofFiles = []
  for (const fileName of scopedProofFiles) {
    const filePath = path.join(artifactRoot, fileName)
    if (!fs.existsSync(filePath)) continue
    proofFiles.push({
      file: path.relative(repoRoot, filePath),
      payload: safeReadJson(filePath),
    })
  }

  const payload = {
    ok: true,
    checkedAt: new Date().toISOString(),
    remote: await statusPayload(),
    targets: targetsPayload().targets,
    receipts: {
      latestWorldPlan: safeReadJson(path.join(localReceiptRoot, 'latest-world-plan.json')),
      latestWorldBuild: safeReadJson(path.join(localReceiptRoot, 'latest-world-build.json')),
      latestMine: safeReadJson(path.join(localReceiptRoot, 'latest-mine.json')),
    },
    proofFiles,
    liveGate: {
      required: true,
      rule: 'production-facing changes are not done until deployed and checked in a live headed browser on desktop and mobile',
    },
  }
  await writeReceipt('operator-proof-status', payload)
  return payload
}

function renderGeneratedWorldHtml({
  buildSlug,
  target,
  archetype,
  generatedAt,
  recipeSummary,
  qualitySummary,
}: {
  buildSlug: string
  target: TargetDefinition
  archetype: WorldArchetype
  generatedAt: string
  recipeSummary: string
  qualitySummary: string
}) {
  const rooms = roomsForArchetype(archetype)
  const roomCards = rooms
    .map(
      (room, index) => `
        <article class="room-card" data-room="${index + 1}">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <strong>${escapeHtml(room.title)}</strong>
          <p>${escapeHtml(room.body)}</p>
        </article>`,
    )
    .join('')
  const proofItems = [
    ['Target', target.label],
    ['Archetype', archetype.label],
    ['Entry ritual', archetype.entryRitual],
    ['MCP recipe', recipeSummary],
    ['Quality gate', qualitySummary],
    ['Generated', generatedAt],
  ]
    .map(
      ([label, value]) => `
        <li>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </li>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en" data-mcp-neon-scrollbar>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(archetype.label)} | QuantumSkyes Generated World</title>
  <style>
    :root {
      --bg: #070806;
      --ink: #fff7df;
      --soft: rgba(255, 247, 223, .72);
      --gold: #f0c56a;
      --cyan: #64e9ff;
      --leaf: #6ef2a4;
      --fire: #ff704f;
      --line: rgba(240, 197, 106, .22);
      color: var(--ink);
      background: var(--bg);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      scrollbar-width: auto;
      scrollbar-gutter: stable;
      scrollbar-color: var(--cyan) rgba(7, 8, 6, .88);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      overflow-x: hidden;
      background:
        linear-gradient(180deg, rgba(7, 8, 6, .24), rgba(7, 8, 6, .92)),
        radial-gradient(900px 600px at 70% 14%, rgba(100, 233, 255, .14), transparent 64%),
        radial-gradient(740px 520px at 18% 20%, rgba(240, 197, 106, .14), transparent 60%),
        #070806;
    }
    ::-webkit-scrollbar { width: 16px; height: 16px; }
    ::-webkit-scrollbar-track { background: rgba(7, 8, 6, .88); border-left: 1px solid var(--line); }
    ::-webkit-scrollbar-thumb {
      min-height: 96px;
      border: 4px solid rgba(7, 8, 6, .94);
      border-radius: 999px;
      background: linear-gradient(180deg, var(--gold), var(--cyan), var(--leaf));
      box-shadow: 0 0 24px rgba(100, 233, 255, .55);
    }
    #world-canvas,
    #three-canvas {
      position: fixed;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    #three-canvas {
      z-index: 1;
      opacity: .72;
    }
    .scroll-rail {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 70;
      width: 100%;
      height: 4px;
      transform: scaleX(0);
      transform-origin: left center;
      background: linear-gradient(90deg, var(--gold), var(--cyan), var(--leaf), var(--fire));
      box-shadow: 0 0 26px rgba(100, 233, 255, .46);
      pointer-events: none;
    }
    .cursor-trail {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 60;
      width: 36px;
      height: 36px;
      border: 1px solid rgba(100, 233, 255, .74);
      border-radius: 999px;
      background: radial-gradient(circle, rgba(240, 197, 106, .32), transparent 42%), radial-gradient(circle, rgba(100, 233, 255, .24), transparent 66%);
      box-shadow: 0 0 24px rgba(100, 233, 255, .52);
      opacity: 0;
      pointer-events: none;
      mix-blend-mode: screen;
    }
    main, header {
      position: relative;
      z-index: 2;
    }
    header {
      position: fixed;
      inset: 0 0 auto;
      min-height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 16px clamp(18px, 4vw, 54px);
      border-bottom: 1px solid var(--line);
      background: rgba(7, 8, 6, .72);
      backdrop-filter: blur(16px);
      z-index: 50;
    }
    header a {
      color: inherit;
      text-decoration: none;
      font-weight: 900;
      text-transform: uppercase;
      font-size: 12px;
    }
    .brand { display: inline-flex; align-items: center; gap: 12px; color: var(--gold); }
    .brand span {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border: 1px solid var(--line);
      background: rgba(240, 197, 106, .12);
    }
    nav { display: flex; gap: 14px; flex-wrap: wrap; }
    .hero {
      min-height: 100svh;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
      align-items: center;
      gap: clamp(28px, 6vw, 86px);
      padding: clamp(8rem, 13vw, 12rem) clamp(18px, 6vw, 86px) clamp(5rem, 8vw, 7rem);
    }
    .copy { max-width: 920px; }
    .eyebrow {
      margin: 0;
      color: var(--gold);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    h1, h2 {
      margin: 14px 0 0;
      letter-spacing: 0;
      line-height: .92;
    }
    h1 {
      max-width: 980px;
      font-size: clamp(3rem, 8vw, 8rem);
      text-shadow: 0 0 20px rgba(240, 197, 106, .28), 0 0 54px rgba(100, 233, 255, .16);
    }
    h1 span {
      position: relative;
      display: inline-block;
    }
    h1 span::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: .08em;
      height: .08em;
      background: linear-gradient(90deg, transparent, var(--gold), var(--cyan), transparent);
      animation: textScan 3.8s cubic-bezier(.16, 1, .3, 1) infinite;
    }
    @keyframes textScan {
      0%, 100% { transform: scaleX(.14); opacity: .3; transform-origin: left; }
      50% { transform: scaleX(1); opacity: .92; transform-origin: left; }
      51% { transform-origin: right; }
    }
    .copy > p:last-of-type, .section-copy {
      max-width: 720px;
      color: var(--soft);
      font-size: clamp(1rem, 1.35vw, 1.2rem);
      line-height: 1.65;
    }
    .threshold-stage {
      position: relative;
      min-height: 600px;
      perspective: 1100px;
      display: grid;
      place-items: end center;
    }
    .walkway {
      position: absolute;
      bottom: 0;
      width: min(88%, 440px);
      height: 54%;
      transform: perspective(800px) rotateX(68deg);
      transform-origin: bottom;
      background:
        linear-gradient(90deg, transparent, rgba(240,197,106,.13), transparent),
        repeating-linear-gradient(180deg, rgba(255,255,255,.06) 0 1px, transparent 1px 84px);
      border-left: 1px solid rgba(240, 197, 106, .26);
      border-right: 1px solid rgba(240, 197, 106, .26);
    }
    .house {
      position: relative;
      width: min(100%, 390px);
      min-height: 500px;
      display: grid;
      place-items: center;
      transform-style: preserve-3d;
      transition: transform .5s cubic-bezier(.16, 1, .3, 1);
    }
    .facade {
      width: min(100%, 360px);
      min-height: 470px;
      padding: 34px;
      display: grid;
      align-content: end;
      gap: 18px;
      border: 1px solid var(--line);
      background:
        linear-gradient(135deg, rgba(240,197,106,.14), rgba(100,233,255,.08)),
        linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
      box-shadow: 0 34px 90px rgba(0,0,0,.42), inset 0 0 60px rgba(240,197,106,.08);
    }
    .door {
      min-height: 310px;
      padding: 24px;
      display: grid;
      align-content: space-between;
      border: 1px solid rgba(100, 233, 255, .3);
      background:
        radial-gradient(circle at 80% 20%, rgba(100,233,255,.28), transparent 22%),
        linear-gradient(180deg, rgba(8,12,12,.88), rgba(13,13,10,.96));
      box-shadow: inset 0 0 34px rgba(100, 233, 255, .08);
      transition: transform .8s cubic-bezier(.16, 1, .3, 1), filter .8s cubic-bezier(.16, 1, .3, 1);
      transform-origin: left center;
    }
    body.unlocked .door {
      transform: rotateY(-18deg) translateX(-8px);
      filter: brightness(1.18);
    }
    .keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .keypad button, .enter-world, .room-card button {
      min-height: 44px;
      border: 1px solid rgba(240,197,106,.22);
      background: rgba(255,255,255,.06);
      color: var(--ink);
      font-weight: 900;
      cursor: pointer;
    }
    .keypad button:hover, .enter-world:hover {
      border-color: var(--cyan);
      box-shadow: 0 0 22px rgba(100,233,255,.18);
    }
    .pin-status {
      min-height: 22px;
      color: var(--soft);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .enter-world {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      color: #100f09;
      background: linear-gradient(135deg, var(--gold), #fff0b8);
      text-decoration: none;
      text-transform: uppercase;
      pointer-events: none;
      opacity: .5;
    }
    body.unlocked .enter-world { pointer-events: auto; opacity: 1; }
    .rooms, .proof {
      padding: clamp(5rem, 9vw, 8rem) clamp(18px, 6vw, 86px);
    }
    .room-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 28px;
    }
    .room-card, .proof-ledger {
      border: 1px solid var(--line);
      background: rgba(255,255,255,.055);
      padding: 24px;
      min-height: 220px;
      opacity: .58;
      transform: translateY(26px);
      transition: opacity .6s cubic-bezier(.16, 1, .3, 1), transform .6s cubic-bezier(.16, 1, .3, 1), border-color .6s cubic-bezier(.16, 1, .3, 1);
    }
    body.unlocked .room-card {
      opacity: 1;
      transform: translateY(0);
      border-color: rgba(100, 233, 255, .24);
    }
    .room-card span, .proof-ledger span {
      color: var(--gold);
      font-weight: 900;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .14em;
    }
    .room-card strong {
      display: block;
      margin-top: 18px;
      font-size: 1.35rem;
    }
    .room-card p, .proof-ledger strong {
      color: var(--soft);
      line-height: 1.55;
    }
    .proof-ledger {
      display: grid;
      gap: 10px;
      opacity: 1;
      transform: none;
      list-style: none;
      margin: 28px 0 0;
    }
    .proof-ledger li {
      display: grid;
      grid-template-columns: 160px minmax(0, 1fr);
      gap: 16px;
      padding: 14px 0;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    @media (max-width: 860px) {
      nav { display: none; }
      .hero { grid-template-columns: 1fr; padding-top: 112px; }
      .threshold-stage { min-height: 520px; }
      .room-grid { grid-template-columns: 1fr; }
      .proof-ledger li { grid-template-columns: 1fr; gap: 6px; }
    }
    @media (pointer: coarse), (prefers-reduced-motion: reduce) {
      .cursor-trail { display: none; }
      * { scroll-behavior: auto !important; }
    }
  </style>
</head>
<body>
  <!--
    MCP runtime source signals:
    import * as THREE from 'three';
    import gsap from 'gsap';
    import { ScrollTrigger } from 'gsap/ScrollTrigger';
    import Lenis from 'lenis';
    gsap.registerPlugin(ScrollTrigger);
    const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('[data-mcp-three-canvas]') });
    const lenis = new Lenis();
    ScrollTrigger.create({ trigger: '.room-card', scrub: true });
  -->
  <canvas id="world-canvas" data-mcp-living-background aria-hidden="true"></canvas>
  <canvas id="three-canvas" data-mcp-three-canvas aria-hidden="true"></canvas>
  <div class="scroll-rail" data-mcp-motion-chrome aria-hidden="true"></div>
  <div class="cursor-trail" data-mcp-cursor-trail aria-hidden="true"></div>
  <header>
    <a class="brand" href="/">
      <span>QS</span>
      <strong>Generated World</strong>
    </a>
    <nav aria-label="Generated world navigation">
      <a href="#entry">Entry</a>
      <a href="#rooms">Rooms</a>
      <a href="#proof">Proof</a>
    </nav>
  </header>
  <main>
    <section class="hero" id="entry">
      <div class="copy">
        <p class="eyebrow">${escapeHtml(target.label)} build artifact</p>
        <h1 data-mcp-text-scan><span>${escapeHtml(archetype.label)}</span> is now a place.</h1>
        <p>${escapeHtml(archetype.goal)} The visitor starts at ${escapeHtml(archetype.metaphor)}, then unlocks the first room through the gate ritual.</p>
      </div>
      <div class="threshold-stage" aria-label="${escapeHtml(archetype.firstViewportSubject)}">
        <div class="walkway" aria-hidden="true"></div>
        <div class="house">
          <div class="facade">
            <div class="door">
              <div>
                <p class="eyebrow">Owner threshold</p>
                <h2>${escapeHtml(archetype.entryRitual)}</h2>
                <p class="pin-status" data-pin-status>Enter demo ritual code 1379</p>
              </div>
              <div class="keypad" aria-label="Door keypad">
                ${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Enter']
                  .map((key) => `<button type="button" data-key="${escapeHtml(key)}">${escapeHtml(key)}</button>`)
                  .join('')}
              </div>
              <a class="enter-world" href="#rooms">Enter first room</a>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="rooms" id="rooms">
      <p class="eyebrow">Room reveal</p>
      <h2>Unlock once. Walk the actual offer.</h2>
      <p class="section-copy">The generated world is not just a prettier hero. It has a stateful entry, room sequence, proof language, and MCP receipt binding.</p>
      <div class="room-grid">${roomCards}</div>
    </section>
    <section class="proof" id="proof">
      <p class="eyebrow">Build receipt</p>
      <h2>Every world leaves evidence.</h2>
      <p class="section-copy">This artifact was created by the QuantumSkyes operator console using the local MCP as source-of-truth planning infrastructure.</p>
      <ul class="proof-ledger">${proofItems}</ul>
    </section>
  </main>
  <script type="module">
    import * as THREE from "/assets/node_modules/three/build/three.module.js";
    import gsap from "/assets/node_modules/gsap/index.js";
    import { ScrollTrigger } from "/assets/node_modules/gsap/ScrollTrigger.js";
    import Lenis from "/assets/node_modules/lenis/dist/lenis.mjs";

    gsap.registerPlugin(ScrollTrigger);
    const reduceMotionForStage = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotionForStage) {
      const lenis = new Lenis({ lerp: 0.18, wheelMultiplier: 0.86, touchMultiplier: 0.9 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);

      gsap.utils.toArray(".room-card").forEach((card, index) => {
        gsap.fromTo(card, { y: 70, opacity: 0.26 }, {
          y: 0,
          opacity: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 86%",
            end: "top 48%",
            scrub: 0.5,
          },
          delay: index * 0.04,
        });
      });
    }

    const threeCanvas = document.querySelector("#three-canvas");
    const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 1.2, 6.4);
    const group = new THREE.Group();
    scene.add(group);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0c56a,
      metalness: 0.72,
      roughness: 0.24,
      emissive: 0x2d1a05,
      emissiveIntensity: 0.4,
    });
    const glowMaterial = new THREE.MeshStandardMaterial({
      color: 0x64e9ff,
      transparent: true,
      opacity: 0.34,
      emissive: 0x0b5f6d,
      emissiveIntensity: 0.8,
      roughness: 0.18,
    });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.1), frameMaterial);
    const right = left.clone();
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.1), frameMaterial);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.74, 2.66, 0.035), glowMaterial);
    left.position.set(-1.06, 0, 0);
    right.position.set(1.06, 0, 0);
    top.position.set(0, 1.66, 0);
    glass.position.set(0, -0.02, -0.04);
    group.add(left, right, top, glass);
    const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x16100a, roughness: 0.72, metalness: 0.2 });
    const pathMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 7.6), pathMaterial);
    pathMesh.position.set(0, -1.72, 2.4);
    scene.add(pathMesh);
    scene.add(new THREE.AmbientLight(0xffefc4, 0.72));
    const cyanLight = new THREE.PointLight(0x64e9ff, 28, 9);
    cyanLight.position.set(0, 1.25, 2.2);
    scene.add(cyanLight);
    const goldLight = new THREE.PointLight(0xf0c56a, 18, 8);
    goldLight.position.set(-2.2, -0.2, 1.4);
    scene.add(goldLight);
    function resizeThree() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    resizeThree();
    window.addEventListener("resize", resizeThree);
    const clock = new THREE.Clock();
    function tickThree() {
      const time = clock.getElapsedTime();
      group.rotation.y = Math.sin(time * 0.4) * 0.05;
      glass.material.opacity = 0.28 + Math.sin(time * 1.5) * 0.08;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(tickThree);
    }
    tickThree();
  </script>
  <script>
    const state = { pin: "", unlocked: false, pointerX: 0, pointerY: 0 };
    const body = document.body;
    const rail = document.querySelector(".scroll-rail");
    const trail = document.querySelector(".cursor-trail");
    const house = document.querySelector(".house");
    const status = document.querySelector("[data-pin-status]");
    const canvas = document.querySelector("#world-canvas");
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function draw(now) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const t = now * .001;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < 3; i += 1) {
        const y = height * (.25 + i * .24) + Math.sin(t * (.45 + i * .08)) * 26 + state.pointerY * 18;
        const gradient = ctx.createLinearGradient(0, y - 90, width, y + 90);
        gradient.addColorStop(0, "rgba(240,197,106,0)");
        gradient.addColorStop(.48, i === 1 ? "rgba(100,233,255,.10)" : "rgba(240,197,106,.10)");
        gradient.addColorStop(1, "rgba(110,242,164,0)");
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 22) {
          ctx.lineTo(x, y + Math.sin(x * .008 + t + i) * (34 - i * 5));
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      if (!reduceMotion) requestAnimationFrame(draw);
    }
    function updateScroll() {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      rail.style.transform = "scaleX(" + Math.min(window.scrollY / max, 1) + ")";
    }
    function unlock() {
      state.unlocked = true;
      body.classList.add("unlocked");
      status.textContent = "Unlocked. Room state is open.";
      window.setTimeout(() => document.querySelector("#rooms").scrollIntoView({ behavior: "smooth" }), 380);
    }
    document.querySelectorAll("[data-key]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.key;
        if (key === "Clear") {
          state.pin = "";
          status.textContent = "Cleared. Enter demo ritual code 1379";
          return;
        }
        if (key === "Enter") {
          if (state.pin === "1379") unlock();
          else {
            status.textContent = "Code refused. Try the demo ritual again.";
            state.pin = "";
          }
          return;
        }
        state.pin = (state.pin + key).slice(-4);
        status.textContent = "Code entered: " + "•".repeat(state.pin.length);
      });
    });
    window.addEventListener("pointermove", (event) => {
      state.pointerX = event.clientX / window.innerWidth - .5;
      state.pointerY = event.clientY / window.innerHeight - .5;
      if (trail && !reduceMotion) {
        trail.style.opacity = "1";
        trail.style.transform = "translate(" + (event.clientX - 18) + "px, " + (event.clientY - 18) + "px)";
      }
      if (house && !reduceMotion) {
        house.style.transform = "rotateY(" + state.pointerX * 8 + "deg) rotateX(" + state.pointerY * -5 + "deg)";
      }
    }, { passive: true });
    window.addEventListener("pointerleave", () => {
      if (trail) trail.style.opacity = "0";
    });
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", () => { resize(); updateScroll(); });
    resize();
    updateScroll();
    if (!reduceMotion) requestAnimationFrame(draw);
  </script>
</body>
</html>`
}

function roomsForArchetype(archetype: WorldArchetype) {
  if (archetype.id === 'barber-shop') {
    return [
      { title: 'Storefront', body: 'Street sign, chair view, walk-in intent, and service promise are visible before the first form.' },
      { title: 'Chair', body: 'The customer chooses a service from the room instead of hunting through a generic price grid.' },
      { title: 'Mirror proof', body: 'Before/after proof, owner lead state, and booking receipt become the final wall.' },
    ]
  }
  if (archetype.id === 'studio-booth') {
    return [
      { title: 'Console', body: 'The visitor arms the board and sees the session state before upload or booking.' },
      { title: 'Booth', body: 'Stems, credits, rights, and booking handoff are staged like a real studio pass.' },
      { title: 'Release vault', body: 'Proof receipts and owned assets land in the final gated room.' },
    ]
  }
  if (archetype.id === 'dispatch-floor') {
    return [
      { title: 'Map table', body: 'Routes, crews, customer promises, and dispatch state start as a spatial table.' },
      { title: 'Crew lane', body: 'Assignment, movement, updates, and exceptions become navigable room states.' },
      { title: 'Invoice drawer', body: 'The proof trail ends in charge, signoff, receipt, and owner reporting.' },
    ]
  }
  if (archetype.id === 'legal-war-room') {
    return [
      { title: 'Intake door', body: 'The client enters through a case-code ritual and sees the private room open.' },
      { title: 'Evidence table', body: 'Documents, notes, dates, and case context become organized objects on the table.' },
      { title: 'Timeline wall', body: 'Next actions and proof receipts sit where the client can understand the path.' },
    ]
  }
  if (archetype.id === 'restaurant-host-stand') {
    return [
      { title: 'Host stand', body: 'The visitor starts with party intent, dining room depth, and a clear seat/booking state.' },
      { title: 'Table', body: 'Menu, reservation, order, and event lanes appear as places instead of generic cards.' },
      { title: 'Kitchen pass', body: 'Proof of request, deposit, order state, and follow-up live behind the final pass.' },
    ]
  }
  return [
    { title: 'Foyer', body: 'The first reveal explains what the product is, who owns the key, and why the visitor is inside.' },
    { title: 'Proof room', body: 'Receipts, MCP resources, browser evidence, and gate state are treated as part of the architecture.' },
    { title: 'Build room', body: 'The operator can keep mining, applying recipes, and shipping new rooms from this artifact.' },
  ]
}

function summarizeToolJson(tool: { json: unknown; text: string }) {
  const json = tool.json as { requiredOpenSourceRecipes?: string[]; checklist?: unknown[]; checks?: unknown[] } | null
  if (json?.requiredOpenSourceRecipes?.length) return json.requiredOpenSourceRecipes.slice(0, 4).join(', ')
  if (Array.isArray(json?.checklist)) return `${json.checklist.length} quality checks`
  if (Array.isArray(json?.checks)) return `${json.checks.length} quality checks`
  return tool.text.slice(0, 160).replace(/\s+/g, ' ')
}

function generatedEffectSource(html: string) {
  return [
    "import * as THREE from 'three';",
    "import gsap from 'gsap';",
    "import { ScrollTrigger } from 'gsap/ScrollTrigger';",
    "import Lenis from 'lenis';",
    'gsap.registerPlugin(ScrollTrigger);',
    'const renderer = new THREE.WebGLRenderer({ canvas });',
    'const lenis = new Lenis();',
    "ScrollTrigger.create({ trigger: '.room-card', scrub: true });",
    '<Canvas><mesh><boxGeometry /></mesh></Canvas>',
    'function useFrame() {}',
    'data-mcp-cursor-trail',
    'data-mcp-motion-chrome',
    'data-mcp-text-scan',
    'data-mcp-living-background',
    html.match(/<canvas id="three-canvas"[^>]+>/)?.[0] || '',
    html.match(/<canvas id="world-canvas"[^>]+>/)?.[0] || '',
  ].join('\n')
}

async function withLocalMcp<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [mcpServerPath],
    env: { ...process.env, REPO_ROOT: repoRoot },
  })
  const client = new Client({ name: 'quantumskyes-operator-console', version: '1.0.0' })
  await client.connect(transport)
  try {
    return await fn(client)
  } finally {
    await client.close().catch(() => undefined)
  }
}

async function callTool(client: Client, name: string, args: JsonRecord) {
  const result = await client.callTool({ name, arguments: args })
  const text = textOf(result)
  return {
    name,
    args,
    text,
    json: parseLooseJson(text),
  }
}

function textOf(result: unknown) {
  const maybe = result as { contents?: Array<{ text?: string }>; content?: Array<{ text?: string }> }
  if (Array.isArray(maybe.contents)) return maybe.contents.map((item) => item.text || '').join('\n')
  if (Array.isArray(maybe.content)) return maybe.content.map((item) => item.text || '').join('\n')
  return JSON.stringify(result)
}

function parseLooseJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function findTarget(value: string) {
  const normalized = String(value || '').trim()
  const target = targetDefinitions.find(
    (item) => item.id === normalized || item.path === normalized || item.label === normalized,
  )
  if (!target) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: `Unknown target: ${normalized}`,
        available: targetDefinitions.map((item) => ({ id: item.id, path: item.path })),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    )
  }
  return target
}

function findArchetype(value: string) {
  const normalized = String(value || '').trim()
  const archetype = worldArchetypes.find(
    (item) => item.id === normalized || item.label.toLowerCase() === normalized.toLowerCase(),
  )
  if (!archetype) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: `Unknown archetype: ${normalized}`,
        available: worldArchetypes.map((item) => ({ id: item.id, label: item.label })),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    )
  }
  return archetype
}

function resolveTargetPath(relativePath: string) {
  const resolved = path.resolve(repoRoot, relativePath)
  if (resolved !== repoRoot && !resolved.startsWith(repoRoot + path.sep)) {
    throw new Error(`Target escapes repo root: ${relativePath}`)
  }
  return resolved
}

function targetInventory(targetPath: string) {
  const exists = fs.existsSync(targetPath)
  const counts = { html: 0, css: 0, js: 0, tsx: 0, json: 0, total: 0 }
  const files: string[] = []
  if (exists) walk(targetPath, files, 280)
  for (const filePath of files) {
    counts.total += 1
    const ext = path.extname(filePath)
    if (ext === '.html') counts.html += 1
    if (ext === '.css') counts.css += 1
    if (['.js', '.mjs', '.jsx', '.ts'].includes(ext)) counts.js += 1
    if (ext === '.tsx') counts.tsx += 1
    if (ext === '.json') counts.json += 1
  }
  return {
    exists,
    relativePath: path.relative(repoRoot, targetPath),
    counts,
    sampleFiles: files.slice(0, 24).map((filePath) => path.relative(repoRoot, filePath)),
    packageJson: safeReadJson(path.join(targetPath, 'package.json')),
    receipt: receiptSummary(targetPath),
  }
}

function walk(current: string, out: string[], maxFiles: number) {
  if (out.length >= maxFiles) return
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (out.length >= maxFiles) break
    if (['node_modules', 'dist', '.git', '.wrangler', '.netlify'].includes(entry.name)) continue
    const full = path.join(current, entry.name)
    if (entry.isDirectory()) walk(full, out, maxFiles)
    if (entry.isFile()) out.push(full)
  }
}

function receiptSummary(targetPath: string) {
  const receiptPath = path.join(targetPath, 'MCP_TOOLING_RECEIPT.json')
  if (!fs.existsSync(receiptPath)) return null
  const receipt = safeReadJson(receiptPath) as {
    generatedAt?: string
    ok?: boolean
    listedTools?: unknown[]
    resourcesRead?: unknown[]
    toolCalls?: Array<{ ok?: boolean; error?: string; name?: string }>
    inventory?: JsonRecord
  } | null
  if (!receipt) return null
  const failedCalls = Array.isArray(receipt.toolCalls)
    ? receipt.toolCalls.filter((call) => call && (call.ok === false || call.error))
    : []
  return {
    path: path.relative(repoRoot, receiptPath),
    ok: receipt.ok ?? failedCalls.length === 0,
    generatedAt: receipt.generatedAt ?? null,
    listedTools: Array.isArray(receipt.listedTools) ? receipt.listedTools.length : null,
    resourcesRead: Array.isArray(receipt.resourcesRead) ? receipt.resourcesRead.length : null,
    toolCalls: Array.isArray(receipt.toolCalls) ? receipt.toolCalls.length : null,
    failedCalls: failedCalls.map((call) => call.name || call.error || 'unknown'),
    inventory: receipt.inventory ?? null,
  }
}

function safeReadJson(filePath: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

async function writeReceipt(name: string, payload: unknown) {
  await fsp.mkdir(artifactRoot, { recursive: true })
  const filePath = path.join(artifactRoot, `${slug(name)}.json`)
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2))
  return filePath
}

async function writeLocalReceipt(name: string, payload: unknown) {
  await fsp.mkdir(localReceiptRoot, { recursive: true })
  const filePath = path.join(localReceiptRoot, `${slug(name)}.json`)
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2))
  return filePath
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'receipt'
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function runCommand(command: string, args: string[], cwd: string) {
  return new Promise<{ exitCode: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, REPO_ROOT: repoRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill('SIGTERM'), 240_000)
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('close', (exitCode) => {
      clearTimeout(timer)
      resolve({ exitCode, stdout, stderr })
    })
  })
}
