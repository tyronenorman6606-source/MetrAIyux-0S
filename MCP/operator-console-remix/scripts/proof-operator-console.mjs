#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const url = process.env.OPERATOR_CONSOLE_URL || 'http://localhost:44100/'
const repoRoot = path.resolve(process.cwd(), '..', '..')
const artifactDir = path.join(repoRoot, 'test-artifacts', 'operator-console-remix')
const headed = process.env.HEADED === '1'

await fs.mkdir(artifactDir, { recursive: true })

const consoleErrors = []
const failedRequests = []
const actions = []

const browser = await chromium.launch({
  headless: !headed,
  chromiumSandbox: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
})

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  desktop.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  desktop.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' })
  })

  const response = await desktop.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await desktop.waitForSelector('[data-operator-output]', { timeout: 30_000 })
  await desktop.waitForTimeout(1000)
  actions.push('loaded desktop operator console')

  await desktop.mouse.move(960, 360)
  await desktop.click('a[href="#operator"]')
  await desktop.waitForTimeout(450)
  actions.push('clicked workbench nav')

  await desktop.click('[data-operator-action="catalog"]')
  await desktop.waitForFunction(() => document.querySelector('[data-operator-output]')?.textContent?.includes('"counts"'), null, {
    timeout: 45_000,
  })
  actions.push('listed real local MCP catalog')

  await desktop.selectOption('[data-operator-target]', 'operator-console')
  await desktop.selectOption('[data-operator-archetype]', 'barber-shop')
  await desktop.click('[data-operator-action="plan"]')
  await desktop.waitForFunction(
    () => document.querySelector('[data-operator-output]')?.textContent?.includes('storefront to chair'),
    null,
    { timeout: 45_000 },
  )
  actions.push('generated MCP-backed barber-shop world plan')

  await desktop.click('[data-operator-action="build"]')
  await desktop.waitForFunction(
    () => document.querySelector('[data-operator-output]')?.textContent?.includes('/generated-worlds/'),
    null,
    { timeout: 90_000 },
  )
  const buildPayload = JSON.parse(await desktop.locator('[data-operator-output]').innerText())
  const generatedRoute = buildPayload.build.route
  actions.push('built a portable generated barber-shop world artifact')

  const generatedWorld = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  generatedWorld.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  generatedWorld.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' })
  })
  await generatedWorld.goto(new URL(generatedRoute, url).toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  for (const digit of ['1', '3', '7', '9']) {
    await generatedWorld.click(`[data-key="${digit}"]`)
  }
  await generatedWorld.click('[data-key="Enter"]')
  await generatedWorld.waitForFunction(() => document.body.classList.contains('unlocked'), null, {
    timeout: 10_000,
  })
  await generatedWorld.waitForSelector('#rooms', { timeout: 10_000 })
  actions.push('opened generated world and unlocked the keypad room reveal')
  const generatedWorldScreenshot = path.join(artifactDir, 'operator-console-generated-world-e2e.png')
  await generatedWorld.screenshot({ path: generatedWorldScreenshot, fullPage: true })
  await generatedWorld.close()

  await desktop.click('[data-operator-action="mine"]')
  await desktop.waitForFunction(
    () => document.querySelector('[data-operator-output]')?.textContent?.includes('"exitCode": 0'),
    null,
    { timeout: 120_000 },
  )
  actions.push('ran MCP mine for operator-console target')

  await desktop.click('[data-operator-action="proof"]')
  await desktop.waitForFunction(
    () => document.querySelector('[data-operator-output]')?.textContent?.includes('"liveGate"'),
    null,
    { timeout: 45_000 },
  )
  actions.push('aggregated proof status')

  const desktopScreenshot = path.join(artifactDir, 'operator-console-desktop-e2e.png')
  await desktop.screenshot({ path: desktopScreenshot, fullPage: true })
  const canvasScreenshot = path.join(artifactDir, 'operator-console-canvas-e2e.png')
  await desktop.locator('#threshold-canvas').screenshot({ path: canvasScreenshot })
  const canvasPixels = await nonBlackPixelRatio(canvasScreenshot)

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  mobile.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  mobile.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' })
  })
  await mobile.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await mobile.waitForSelector('[data-operator-output]', { timeout: 30_000 })
  await mobile.click('[data-operator-action="worlds"]')
  await mobile.waitForFunction(
    () => document.querySelector('[data-operator-output]')?.textContent?.includes('house-threshold'),
    null,
    { timeout: 45_000 },
  )
  actions.push('loaded mobile console and listed world archetypes')
  const mobileScreenshot = path.join(artifactDir, 'operator-console-mobile-e2e.png')
  await mobile.screenshot({ path: mobileScreenshot, fullPage: true })

  const proof = {
    ok: response?.ok() === true && canvasPixels.ok && consoleErrors.length === 0 && failedRequests.length === 0,
    url,
    browserMode: headed ? 'headed' : 'headless',
    checkedAt: new Date().toISOString(),
    status: response?.status() ?? null,
    actions,
    desktop: {
      viewport: { width: 1440, height: 1000 },
      screenshot: path.relative(repoRoot, desktopScreenshot),
      canvasScreenshot: path.relative(repoRoot, canvasScreenshot),
      canvasPixels,
    },
    generatedWorld: {
      route: generatedRoute,
      screenshot: path.relative(repoRoot, generatedWorldScreenshot),
    },
    mobile: {
      viewport: { width: 390, height: 844 },
      screenshot: path.relative(repoRoot, mobileScreenshot),
    },
    consoleErrors,
    failedRequests,
  }
  const proofPath = path.join(artifactDir, 'operator-console-e2e-proof.json')
  await fs.writeFile(proofPath, JSON.stringify(proof, null, 2))
  console.log(JSON.stringify(proof, null, 2))
  if (!proof.ok) process.exitCode = 1
} finally {
  await browser.close()
}

async function nonBlackPixelRatio(filePath) {
  const buffer = await fs.readFile(filePath)
  const png = PNG.sync.read(buffer)
  let nonBlack = 0
  let sampled = 0
  for (let y = 0; y < png.height; y += 8) {
    for (let x = 0; x < png.width; x += 8) {
      const offset = (png.width * y + x) * 4
      const r = png.data[offset]
      const g = png.data[offset + 1]
      const b = png.data[offset + 2]
      const a = png.data[offset + 3]
      if (a > 12) {
        sampled += 1
        if (r + g + b > 36) nonBlack += 1
      }
    }
  }
  const ratio = sampled ? nonBlack / sampled : 0
  return {
    ok: ratio > 0.01,
    ratio,
    sampled,
    nonBlack,
  }
}
