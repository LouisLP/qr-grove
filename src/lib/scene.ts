import type { Garden } from './garden'
import type { Palette } from './seasons'
import * as THREE from 'three'
import { WeatherLayer } from './weather'

export type View = 'iso' | 'top'

const ISO_ELEVATION = Math.atan(1 / Math.SQRT2) // true isometric, ~35.26°
const TOP_ELEVATION = Math.PI / 2 - 1e-4 // a hair off vertical so lookAt keeps a stable "up"
const ISO_AZIMUTH = Math.PI / 4
const TRANSITION_MS = 1400
const GROW_MS = 450

function easeInOutCubic(x: number) {
  return x < 0.5
    ? 4 * x ** 3
    : 1 - (-2 * x + 2) ** 3 / 2
}
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3

/** Half-extents of the visible area, in plate widths, at t=0 (iso) and t=1 (top). */
function frame(t: number, aspect: number, plate: number, margin = 1) {
  const e = easeInOutCubic(t)
  const halfH = (0.52 + (0.5 - 0.52) * e) * margin
  const halfW = (0.75 + (0.5 - 0.75) * e) * margin
  return plate * Math.max(halfH, halfW / aspect)
}

function placeCamera(camera: THREE.OrthographicCamera, t: number, aspect: number, plate: number, margin = 1.08) {
  const e = easeInOutCubic(t)
  const el = ISO_ELEVATION + (TOP_ELEVATION - ISO_ELEVATION) * e
  const az = ISO_AZIMUTH * (1 - e)
  const D = 500
  camera.position.set(D * Math.cos(el) * Math.sin(az), D * Math.sin(el), D * Math.cos(el) * Math.cos(az))
  camera.lookAt(0, -0.3 * (1 - e), 0)
  const half = frame(t, aspect, plate, margin)
  camera.left = -half * aspect
  camera.right = half * aspect
  camera.top = half
  camera.bottom = -half
  camera.updateProjectionMatrix()
}

function buildWorld(garden: Garden, palette: Palette) {
  const world = new THREE.Group()
  const { plate } = garden

  const slab = new THREE.Mesh(new THREE.BoxGeometry(plate, 0.3, plate), new THREE.MeshLambertMaterial({ color: palette.ground }))
  slab.position.y = -0.15
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(plate, 1.4, plate), new THREE.MeshLambertMaterial({ color: palette.skirt }))
  skirt.position.y = -1
  world.add(slab, skirt)

  const geo = new THREE.BoxGeometry(1, 1, 1)
  geo.translate(0, 0.5, 0)
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xFFFFFF }), Math.max(1, garden.parts.length))
  mesh.count = garden.parts.length
  const color = new THREE.Color()
  garden.parts.forEach((p, i) => mesh.setColorAt(i, color.set(p.color)))
  if (mesh.instanceColor)
    mesh.instanceColor.needsUpdate = true
  world.add(mesh)
  return { world, mesh }
}

function addLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xFFFFFF, 0x8A8A7A, 1.9))
  const sun = new THREE.DirectionalLight(0xFFFFFF, 1.6)
  sun.position.set(0.35, 1, 0.5)
  scene.add(sun)
}

const m4 = new THREE.Matrix4()
const pos = new THREE.Vector3()
const quat = new THREE.Quaternion()
const scl = new THREE.Vector3()

function writeMatrices(mesh: THREE.InstancedMesh, garden: Garden, progress: (delay: number) => number) {
  let done = true
  garden.parts.forEach((p, i) => {
    const k = progress(p.delay)
    if (k < 1)
      done = false
    const s = Math.max(easeOutCubic(k), 1e-4)
    pos.set(p.x, p.y * s, p.z)
    scl.set(p.w * (0.6 + 0.4 * s), p.h * s, p.d * (0.6 + 0.4 * s))
    mesh.setMatrixAt(i, m4.compose(pos, quat, scl))
  })
  mesh.instanceMatrix.needsUpdate = true
  return done
}

export class GardenScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000)
  private world: THREE.Group | null = null
  private weather: WeatherLayer | null = null
  private mesh: THREE.InstancedMesh | null = null
  private garden: Garden | null = null
  private palette: Palette | null = null
  private growStart = 0
  private growing = false
  private t = 0
  private from = 0
  private to = 0
  private transitionStart = 0
  private raf = 0
  private reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    addLights(this.scene)
    this.raf = requestAnimationFrame(this.loop)
  }

  setGarden(garden: Garden, palette: Palette, { grow = true } = {}) {
    this.disposeWorld()
    const { world, mesh } = buildWorld(garden, palette)
    this.world = world
    this.mesh = mesh
    this.garden = garden
    this.palette = palette
    this.weather = new WeatherLayer(palette.weather, garden.plate)
    world.add(this.weather.mesh)
    this.scene.add(world)
    this.growStart = performance.now()
    this.growing = grow && !this.reduceMotion
    writeMatrices(mesh, garden, () => (this.growing ? 0 : 1))
  }

  setView(view: View) {
    const next = view === 'top'
      ? 1
      : 0
    if (next === this.to)
      return
    this.from = this.t
    this.to = next
    this.transitionStart = performance.now()
  }

  /** Renders a square still at the given size, independent of the on-screen canvas. */
  async exportPng(view: View, size = 2048): Promise<Blob> {
    if (!this.garden || !this.palette)
      throw new Error('Nothing planted yet')
    const canvas = document.createElement('canvas')
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(size, size, false)
    renderer.setClearColor(new THREE.Color(this.palette.sky), 1)
    const scene = new THREE.Scene()
    addLights(scene)
    const { world, mesh } = buildWorld(this.garden, this.palette)
    writeMatrices(mesh, this.garden, () => 1)
    let weather: WeatherLayer | null = null
    if (view === 'iso') {
      weather = new WeatherLayer(this.palette.weather, this.garden.plate)
      weather.update(4, 1)
      world.add(weather.mesh)
    }
    scene.add(world)
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000)
    placeCamera(camera, view === 'top'
      ? 1
      : 0, 1, this.garden.plate, view === 'top'
      ? 1.04
      : 1.06)
    renderer.render(scene, camera)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
    world.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose()
      }
    })
    weather?.dispose()
    renderer.dispose()
    if (!blob)
      throw new Error('Could not encode the image')
    return blob
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.disposeWorld()
    this.renderer.dispose()
  }

  private disposeWorld() {
    if (!this.world)
      return
    this.scene.remove(this.world)
    this.weather?.dispose()
    this.weather = null
    this.world.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose()
      }
    })
    this.world = null
    this.mesh = null
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop)
    const { canvas, renderer } = this
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h || !this.garden)
      return
    const dpr = renderer.getPixelRatio()
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr))
      renderer.setSize(w, h, false)

    if (this.t !== this.to) {
      const k = this.reduceMotion
        ? 1
        : Math.min(1, (now - this.transitionStart) / TRANSITION_MS)
      this.t = this.from + (this.to - this.from) * k
    }
    if (this.growing && this.mesh)
      this.growing = !writeMatrices(this.mesh, this.garden, d => Math.min(1, Math.max(0, (now - this.growStart - d) / GROW_MS)))

    // Weather is gone well before the camera reaches top-down, so it never covers the code
    this.weather?.update(this.reduceMotion
      ? 4
      : now / 1000, Math.max(0, 1 - easeInOutCubic(this.t) * 2))
    placeCamera(this.camera, this.t, w / h, this.garden.plate)
    renderer.render(this.scene, this.camera)
  }
}
