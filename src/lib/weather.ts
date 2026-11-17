import type { Weather } from './seasons'
import * as THREE from 'three'
import { mulberry32 } from './garden'

interface Piece {
  size: [number, number, number]
  offset: [number, number, number]
  colors: string[]
}

interface Pose {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  roll: number
}

interface Kind {
  /** Particles per square module of plate area. */
  density: number
  opacity: number
  pieces: Piece[]
  pose: (rnd: Float32Array, t: number, plate: number) => Pose
}

const CEILING = 14

/** Spreads particles across the plate and loops them from the ceiling down to the ground. */
function falling(rnd: Float32Array, t: number, plate: number, speed: number) {
  const span = plate * 1.05
  const fall = (t * speed * (0.8 + rnd[3]! * 0.4) + rnd[2]! * CEILING) % CEILING
  return { x: (rnd[0]! - 0.5) * span, y: CEILING - fall, z: (rnd[1]! - 0.5) * span }
}

const KINDS: Record<Weather, Kind> = {
  petals: {
    density: 0.14,
    opacity: 0.95,
    pieces: [
      {
        size: [0.3, 0.04, 0.22],
        offset: [0, 0, 0],
        colors: [
          '#f7c6d6',
          '#f2a7bf',
          '#ffffff',
          '#fbd9e4',
        ],
      },
    ],
    pose: (rnd, t, plate) => {
      const p = falling(rnd, t, plate, 0.9)
      const ph = rnd[4]! * Math.PI * 2
      return {
        x: p.x + Math.sin(t * 0.9 + ph) * 0.8,
        y: p.y,
        z: p.z + Math.cos(t * 0.7 + ph) * 0.5,
        yaw: t * 1.3 + ph,
        pitch: Math.sin(t * 2.1 + ph) * 0.9,
        roll: Math.cos(t * 1.7 + ph) * 0.7,
      }
    },
  },
  bees: {
    density: 0.03,
    opacity: 1,
    pieces: [
      {
        size: [0.4, 0.24, 0.24],
        offset: [0, 0, 0],
        colors: ['#f2c230'],
      },
      {
        size: [0.08, 0.26, 0.26],
        offset: [0.04, 0, 0],
        colors: ['#2a2016'],
      },
      {
        size: [0.08, 0.26, 0.26],
        offset: [-0.14, 0, 0],
        colors: ['#2a2016'],
      },
      {
        size: [0.18, 0.02, 0.34],
        offset: [0, 0.16, 0],
        colors: ['#ffffff'],
      },
    ],
    pose: (rnd, t, plate) => {
      const cx = (rnd[0]! - 0.5) * plate * 0.85
      const cz = (rnd[1]! - 0.5) * plate * 0.85
      const radius = 0.5 + rnd[2]! * 1.3
      const speed = (1.6 + rnd[3]! * 1.8) * (rnd[5]! < 0.5
        ? 1
        : -1)
      const a = t * speed + rnd[4]! * Math.PI * 2
      return {
        x: cx + Math.cos(a) * radius + Math.sin(a * 3.1) * 0.15,
        y: 1.7 + rnd[5]! * 1.2 + Math.sin(t * 6 + rnd[4]! * 9) * 0.12,
        z: cz + Math.sin(a) * radius * 0.8,
        yaw: -a - (speed > 0
          ? Math.PI / 2
          : -Math.PI / 2),
        pitch: 0,
        roll: Math.sin(t * 30 + rnd[2]! * 9) * 0.25,
      }
    },
  },
  rain: {
    density: 0.45,
    opacity: 0.75,
    pieces: [
      {
        size: [0.05, 0.9, 0.05],
        offset: [0, 0, 0],
        colors: ['#5f7c97', '#7392ae'],
      },
    ],
    pose: (rnd, t, plate) => {
      const p = falling(rnd, t, plate, 15)
      return {
        x: p.x - p.y * 0.12,
        y: p.y,
        z: p.z,
        yaw: 0,
        pitch: 0,
        roll: 0.12,
      }
    },
  },
  snow: {
    density: 0.35,
    opacity: 1,
    pieces: [
      {
        size: [0.2, 0.2, 0.2],
        offset: [0, 0, 0],
        colors: ['#ffffff', '#eef4fb'],
      },
    ],
    pose: (rnd, t, plate) => {
      const p = falling(rnd, t, plate, 1.1)
      const ph = rnd[4]! * Math.PI * 2
      return {
        x: p.x + Math.sin(t * 0.6 + ph) * 0.5,
        y: p.y,
        z: p.z + Math.cos(t * 0.5 + ph) * 0.3,
        yaw: t + ph,
        pitch: ph,
        roll: 0,
      }
    },
  },
}

const m4 = new THREE.Matrix4()
const local = new THREE.Matrix4()
const pos = new THREE.Vector3()
const scl = new THREE.Vector3()
const quat = new THREE.Quaternion()
const euler = new THREE.Euler()
const identity = new THREE.Quaternion()

/** Ambient particles shown in the garden view. They fade out before the top-down view so they never cover the code. */
export class WeatherLayer {
  readonly mesh: THREE.InstancedMesh
  private kind: Kind
  private count: number
  private rnd: Float32Array[]
  private material: THREE.MeshLambertMaterial

  constructor(weather: Weather, private plate: number) {
    this.kind = KINDS[weather]
    this.count = Math.round(plate * plate * this.kind.density)
    const r = mulberry32(plate * 31 + weather.length)
    this.rnd = Array.from({ length: this.count }, () => Float32Array.from({ length: 6 }, r))
    const geo = new THREE.BoxGeometry(1, 1, 1)
    this.material = new THREE.MeshLambertMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: this.kind.opacity,
      depthWrite: false,
    })
    const total = this.count * this.kind.pieces.length
    this.mesh = new THREE.InstancedMesh(geo, this.material, Math.max(1, total))
    this.mesh.count = total
    this.mesh.frustumCulled = false
    const color = new THREE.Color()
    let i = 0
    for (let n = 0; n < this.count; n++) {
      for (const piece of this.kind.pieces)
        this.mesh.setColorAt(i++, color.set(piece.colors[Math.floor(this.rnd[n]![5]! * 997) % piece.colors.length]!))
    }
    if (this.mesh.instanceColor)
      this.mesh.instanceColor.needsUpdate = true
  }

  /** time in seconds; visibility 0..1 */
  update(time: number, visibility: number) {
    this.mesh.visible = visibility > 0.01
    if (!this.mesh.visible)
      return
    this.material.opacity = this.kind.opacity * visibility
    let i = 0
    for (let n = 0; n < this.count; n++) {
      const p = this.kind.pose(this.rnd[n]!, time, this.plate)
      quat.setFromEuler(euler.set(p.pitch, p.yaw, p.roll))
      m4.compose(pos.set(p.x, p.y, p.z), quat, scl.set(1, 1, 1))
      for (const piece of this.kind.pieces) {
        local.compose(pos.set(...piece.offset), identity, scl.set(...piece.size))
        this.mesh.setMatrixAt(i++, local.premultiply(m4))
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}
