import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function bootLenis() {
  if (reduceMotion) return
  const lenis = new Lenis({
    lerp: 0.16,
    wheelMultiplier: 0.82,
    touchMultiplier: 0.9,
  })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

function bootScrollStages() {
  if (reduceMotion) return
  gsap.utils.toArray<HTMLElement>('section').forEach((section, index) => {
    if (index === 0) return
    gsap.fromTo(
      section,
      { opacity: 0.72, y: 42 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 78%',
          end: 'top 42%',
          scrub: 0.45,
        },
      },
    )
  })
}

function bootDoorMotion() {
  const door = document.querySelector<HTMLElement>('aside[aria-label="Owner threshold console"]')
  if (!door || reduceMotion) return
  window.addEventListener('pointermove', (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 10
    const y = (event.clientY / window.innerHeight - 0.5) * -7
    gsap.to(door, { x, y, duration: 0.35, ease: 'power3.out' })
  })
}

function bootCursorTrail() {
  const trail = document.querySelector<HTMLElement>('#threshold-cursor-trail')
  if (!trail || reduceMotion) return
  window.addEventListener(
    'pointermove',
    (event) => {
      gsap.to(
        trail,
        {
          opacity: 1,
          x: event.clientX - 19,
          y: event.clientY - 19,
          duration: 0.28,
          ease: 'power3.out',
        },
      )
    },
    { passive: true },
  )
  window.addEventListener('pointerleave', () => {
    gsap.to(trail, { opacity: 0, duration: 0.24, ease: 'power2.out' })
  })
}

function bootMotionChrome() {
  const rail = document.querySelector<HTMLElement>('#threshold-scroll-chrome')
  if (!rail) return
  const update = () => {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
    const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1)
    rail.style.transform = `scaleX(${progress})`
  }
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
}

function bootThreeThreshold() {
  const canvas = document.querySelector<HTMLCanvasElement>('#threshold-canvas')
  if (!canvas) return

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(0, 1.8, 7)

  const doorway = new THREE.Group()
  scene.add(doorway)

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0xedc775,
    metalness: 0.85,
    roughness: 0.2,
    emissive: 0x3a2206,
    emissiveIntensity: 0.32,
  })
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x66e7ff,
    metalness: 0.2,
    roughness: 0.12,
    transparent: true,
    opacity: 0.36,
    emissive: 0x0d5160,
    emissiveIntensity: 0.7,
  })

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.5, 0.12), frameMaterial)
  const right = left.clone()
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.12), frameMaterial)
  const panelMaterial = glassMaterial
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.74, 2.9, 0.04), panelMaterial)
  left.position.set(-1.1, 0.05, 0)
  right.position.set(1.1, 0.05, 0)
  top.position.set(0, 1.88, 0)
  panel.position.set(0, 0.1, -0.04)
  doorway.add(left, right, top, panel)

  const pathMaterial = new THREE.MeshStandardMaterial({
    color: 0x19130b,
    metalness: 0.25,
    roughness: 0.64,
    emissive: 0x100c07,
  })
  const path = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 9), pathMaterial)
  path.position.set(0, -1.72, 2.7)
  scene.add(path)

  const points = new Float32Array(260 * 3)
  for (let index = 0; index < points.length; index += 3) {
    points[index] = (Math.random() - 0.5) * 8
    points[index + 1] = Math.random() * 4 - 1.4
    points[index + 2] = (Math.random() - 0.35) * 8
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
  const particles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xedc775,
      size: 0.025,
      transparent: true,
      opacity: 0.78,
    }),
  )
  scene.add(particles)

  scene.add(new THREE.AmbientLight(0xfff2ce, 0.72))
  const cyan = new THREE.PointLight(0x66e7ff, 36, 10)
  cyan.position.set(0, 1.4, 2.4)
  scene.add(cyan)
  const fire = new THREE.PointLight(0xff694d, 18, 9)
  fire.position.set(-2.2, -0.3, 1.4)
  scene.add(fire)

  const pointer = { x: 0, y: 0 }
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX / window.innerWidth - 0.5
    pointer.y = event.clientY / window.innerHeight - 0.5
  })

  function resize() {
    const width = window.innerWidth
    const height = window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  const clock = new THREE.Clock()
  function tick() {
    const time = clock.getElapsedTime()
    doorway.rotation.y = pointer.x * 0.18 + Math.sin(time * 0.35) * 0.03
    doorway.rotation.x = pointer.y * -0.08
    panelMaterial.opacity = 0.28 + Math.sin(time * 1.4) * 0.08
    particles.rotation.y = time * 0.025
    camera.position.x += (pointer.x * 0.7 - camera.position.x) * 0.04
    camera.lookAt(0, 0.1, 0)
    renderer.render(scene, camera)
    requestAnimationFrame(tick)
  }
  tick()
}

function stringifyForConsole(payload: unknown) {
  return JSON.stringify(
    payload,
    (_key, value) => {
      if (typeof value === 'string' && value.length > 700) return `${value.slice(0, 700)}...`
      return value
    },
    2,
  )
}

async function fetchJson(path: string) {
  const response = await fetch(path, { headers: { Accept: 'application/json' } })
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`)
  }
  return payload
}

function setConsoleState(label: string, payload: unknown, ok = true) {
  const status = document.querySelector<HTMLElement>('[data-operator-status]')
  const output = document.querySelector<HTMLElement>('[data-operator-output]')
  if (status) {
    status.textContent = label
    status.dataset.state = ok ? 'ok' : 'error'
  }
  if (output) output.textContent = stringifyForConsole(payload)
}

function optionValue(selector: string, fallback: string) {
  const element = document.querySelector<HTMLSelectElement>(selector)
  return element?.value || fallback
}

function bootOperatorConsole() {
  const output = document.querySelector<HTMLElement>('[data-operator-output]')
  if (!output) return

  const run = async (label: string, path: string) => {
    setConsoleState(`${label} running`, { path }, true)
    try {
      const payload = await fetchJson(path)
      setConsoleState(`${label} complete`, payload, payload.ok !== false)
    } catch (error) {
      setConsoleState(
        `${label} failed`,
        { ok: false, error: error instanceof Error ? error.message : 'Unknown operator error' },
        false,
      )
    }
  }

  const buildPath = (base: string) => {
    const target = optionValue('[data-operator-target]', 'operator-console')
    const archetype = optionValue('[data-operator-archetype]', 'house-threshold')
    const params = new URLSearchParams({ target, archetype })
    return `${base}?${params.toString()}`
  }

  document.querySelectorAll<HTMLElement>('[data-operator-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.operatorAction
      if (action === 'status') void run('Remote health', '/api/status')
      if (action === 'catalog') void run('MCP catalog', '/api/catalog')
      if (action === 'targets') void run('Target scan', '/api/targets')
      if (action === 'worlds') void run('World catalog', '/api/worlds')
      if (action === 'plan') void run('World plan', buildPath('/api/plan'))
      if (action === 'build') void run('World build', buildPath('/api/build'))
      if (action === 'mine') void run('MCP mine', buildPath('/api/mine'))
      if (action === 'proof') void run('Proof status', '/api/proof')
    })
  })

  void run('Remote health', '/api/status')
}

bootLenis()
bootScrollStages()
bootDoorMotion()
bootCursorTrail()
bootMotionChrome()
bootThreeThreshold()
bootOperatorConsole()
