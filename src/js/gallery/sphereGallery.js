import * as THREE from 'three'
import { gsap, ScrollTrigger } from '../core/scroll.js'
import { tiles } from './galleryData.js'

const TILE_W = 512
const TILE_H = 384
const SPHERE_R = 5.2
const COUNT = 24 // tiles wrapped around the Fibonacci sphere

/**
 * phantom.land-style sphere of image tiles. Loaded lazily (this module
 * is the only place three.js is imported). Returns { destroy } or null
 * on failure; the caller keeps the CSS grid as fallback.
 */
export async function createSphereGallery(container) {
  try {
    return build(container)
  } catch (err) {
    console.error('[sphereGallery] init failed, falling back to grid', err)
    return null
  }
}

/** Placeholder tile texture: warm field, laurel-toned label. */
function placeholderTexture(label) {
  const c = document.createElement('canvas')
  c.width = TILE_W
  c.height = TILE_H
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, TILE_W, TILE_H)
  g.addColorStop(0, '#fff4e8')
  g.addColorStop(0.55, '#fefaf3')
  g.addColorStop(1, '#fcedeb')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TILE_W, TILE_H)
  ctx.strokeStyle = 'rgba(7,25,56,0.18)'
  ctx.setLineDash([6, 6])
  ctx.strokeRect(10, 10, TILE_W - 20, TILE_H - 20)
  ctx.fillStyle = 'rgba(7,25,56,0.52)'
  ctx.font = '500 26px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const words = label.split(' ')
  const mid = Math.ceil(words.length / 2)
  ctx.fillText(words.slice(0, mid).join(' '), TILE_W / 2, TILE_H / 2 - 18)
  ctx.fillText(words.slice(mid).join(' '), TILE_W / 2, TILE_H / 2 + 20)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function build(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setClearColor(0x000000, 0)
  container.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.set(0, 0, 12.5)

  const group = new THREE.Group()
  scene.add(group)

  const geometry = new THREE.PlaneGeometry(1.9, 1.42)
  const loader = new THREE.TextureLoader()
  const meshes = []

  for (let i = 0; i < COUNT; i++) {
    const t = tiles[i % tiles.length]
    // Fibonacci sphere distribution
    const y = 1 - (i / (COUNT - 1)) * 2
    const rAtY = Math.sqrt(1 - y * y)
    const theta = i * Math.PI * (3 - Math.sqrt(5))
    const pos = new THREE.Vector3(
      Math.cos(theta) * rAtY * SPHERE_R,
      y * SPHERE_R * 0.86,
      Math.sin(theta) * rAtY * SPHERE_R
    )

    let texture
    if (t.src) {
      texture = loader.load(t.src)
      texture.colorSpace = THREE.SRGBColorSpace
    } else {
      texture = placeholderTexture(t.label)
    }
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(pos)
    mesh.lookAt(pos.clone().multiplyScalar(2))
    mesh.userData = { href: t.href, baseScale: 1 }
    group.add(mesh)
    meshes.push(mesh)
  }

  // --- rotation model -----------------------------------------------
  const rot = { x: -0.08, y: 0 }
  const target = { x: -0.08, y: 0 }
  let scrollRot = 0
  let velocity = { x: 0, y: 0 }
  let dragging = false
  let lastPointer = { x: 0, y: 0 }
  let idleTimer = 0
  const AUTO = 0.0016

  function onPointerDown(e) {
    dragging = true
    lastPointer = { x: e.clientX, y: e.clientY }
    velocity = { x: 0, y: 0 }
    container.style.cursor = 'grabbing'
  }
  function onPointerMove(e) {
    updateRay(e)
    if (!dragging) return
    const dx = (e.clientX - lastPointer.x) / container.clientWidth
    const dy = (e.clientY - lastPointer.y) / container.clientHeight
    target.y += dx * 3.4
    target.x = THREE.MathUtils.clamp(target.x + dy * 2, -0.5, 0.5)
    velocity = { x: dy * 2, y: dx * 3.4 }
    lastPointer = { x: e.clientX, y: e.clientY }
    idleTimer = 0
  }
  function onPointerUp() {
    dragging = false
    container.style.cursor = 'grab'
  }

  container.style.cursor = 'grab'
  container.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)

  // --- raycast hover -------------------------------------------------
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2(-2, -2)
  let hovered = null

  function updateRay(e) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  renderer.domElement.addEventListener('click', (e) => {
    if (Math.abs(velocity.y) > 0.02) return // was a drag, not a click
    updateRay(e)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(meshes)[0]
    if (hit) window.location.href = hit.object.userData.href
  })

  // --- scroll-linked rotation (inline section, never pinned) ----------
  const st = ScrollTrigger.create({
    trigger: container,
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      scrollRot = self.progress * 0.7
    },
  })

  // --- render loop on the shared gsap ticker ---------------------------
  let running = true
  let disposed = false

  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(container)

  function tick(_, delta) {
    if (!running || disposed) return
    idleTimer += delta
    if (!dragging) {
      if (idleTimer > 2000) target.y += AUTO * (delta / 16.7)
      velocity.y *= 0.95
      velocity.x *= 0.95
      target.y += velocity.y * 0.06
      target.x = THREE.MathUtils.clamp(target.x + velocity.x * 0.06, -0.5, 0.5)
    }
    rot.y += (target.y + scrollRot - rot.y) * 0.07
    rot.x += (target.x - rot.x) * 0.07
    group.rotation.set(rot.x, rot.y, 0)

    // hover
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(meshes)[0]
    const next = hit ? hit.object : null
    if (next !== hovered) {
      if (hovered) gsap.to(hovered.scale, { x: 1, y: 1, z: 1, duration: 0.4 })
      if (next) gsap.to(next.scale, { x: 1.07, y: 1.07, z: 1.07, duration: 0.4 })
      hovered = next
    }
    meshes.forEach((m) => {
      const facing = m.getWorldPosition(new THREE.Vector3()).z > 0
      const targetOpacity = m === hovered ? 1 : facing ? 0.96 : 0.35
      m.material.opacity += (targetOpacity - m.material.opacity) * 0.08
    })

    renderer.render(scene, camera)
  }
  gsap.ticker.add(tick)

  // Pause rendering entirely when offscreen
  const io = new IntersectionObserver(([e]) => (running = e.isIntersecting))
  io.observe(container)

  // Context loss: try one restore; on failure caller's grid remains
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    running = false
  })
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    running = true
  })

  function destroy() {
    disposed = true
    gsap.ticker.remove(tick)
    io.disconnect()
    ro.disconnect()
    st.kill()
    container.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    meshes.forEach((m) => {
      m.material.map?.dispose()
      m.material.dispose()
    })
    geometry.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { destroy }
}
