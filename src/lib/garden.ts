import type { QrMatrix } from './qr'
import type { Season } from './seasons'
import { finderPart } from './qr'
import { PALETTES } from './seasons'

export const QUIET_ZONE = 4

/** An axis-aligned box standing on y. Positions are in module units, centred on the code. */
export interface Part {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  color: string
  /** ms before this part starts growing in. */
  delay: number
  /** True for parts that sit on a light module (flowers, leaves, snow). */
  decor: boolean
}

export interface Garden {
  season: Season
  parts: Part[]
  /** Width of the ground plate, quiet zone included. */
  plate: number
  modules: number
}

export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Put = (dx: number, y: number, dz: number, w: number, h: number, d: number, color: string, extraDelay?: number) => void

const PROPS: Record<Season, (r: () => number, put: Put) => void> = {
  // Pale blossom shrubs and white tulips
  spring: (r, put) => {
    if (r() < 0.5) {
      put(0, 0, 0, 0.32, 0.22, 0.32, '#f4c4d3')
      put(0, 0.22, 0, 0.2, 0.1, 0.2, '#fbe0e8', 40)
    }
    else {
      for (const [dx, dz] of [
        [-0.1, -0.06],
        [0.08, 0.04],
        [-0.02, 0.12],
      ] as const) {
        put(dx, 0, dz, 0.03, 0.28, 0.03, '#4c7a3a')
        put(dx, 0.28, dz, 0.09, 0.1, 0.09, '#ffffff', 60)
      }
    }
  },
  // Sunflowers and beehives
  summer: (r, put) => {
    if (r() < 0.65) {
      const h = 0.7 + r() * 0.4
      put(0, 0, 0, 0.05, h, 0.05, '#3f6b2a')
      put(0, h, 0, 0.3, 0.05, 0.3, '#f6c933', 80)
      put(0, h + 0.05, 0, 0.1, 0.03, 0.1, '#6b4320', 100)
    }
    else {
      put(0, 0, 0, 0.3, 0.32, 0.3, '#efc75e')
      put(0, 0.32, 0, 0.34, 0.06, 0.34, '#f5d982', 40)
      put(0.151, 0.08, 0, 0.02, 0.06, 0.06, '#3a2a14', 40)
    }
  },
  // Pumpkins and pale mushrooms
  autumn: (r, put) => {
    if (r() < 0.55) {
      put(0, 0, 0, 0.3, 0.22, 0.3, '#f0a050')
      put(0, 0.22, 0, 0.04, 0.07, 0.04, '#4e5a22', 40)
    }
    else {
      for (const [dx, dz, s] of [
        [-0.08, 0, 1],
        [0.1, 0.08, 0.7],
      ] as const) {
        put(dx, 0, dz, 0.07 * s, 0.16 * s, 0.07 * s, '#f1e6d0')
        put(dx, 0.16 * s, dz, 0.24 * s, 0.07 * s, 0.24 * s, '#e3c79c', 40)
      }
    }
  },
  // Snowmen and snow drifts
  winter: (r, put) => {
    if (r() < 0.6) {
      put(0, 0, 0, 0.36, 0.3, 0.36, '#fbfdff')
      put(0, 0.3, 0, 0.27, 0.24, 0.27, '#fbfdff', 60)
      put(0, 0.54, 0, 0.19, 0.18, 0.19, '#fbfdff', 120)
      put(0.12, 0.6, 0, 0.1, 0.04, 0.04, '#f08a3c', 160)
    }
    else {
      put(0, 0, 0, 0.38, 0.1, 0.3, '#f2f6fb')
      put(0.05, 0.1, 0, 0.24, 0.07, 0.2, '#fbfdff', 40)
    }
  },
}

export function plantGarden(qr: QrMatrix, season: Season, seed: number): Garden {
  const p = PALETTES[season]
  const r = mulberry32(seed * 9973 + qr.size)
  const pick = <T>(arr: T[]): T => arr[Math.floor(r() * arr.length)]!
  const parts: Part[] = []
  const c = (qr.size - 1) / 2

  for (let row = 0; row < qr.size; row++) {
    for (let col = 0; col < qr.size; col++) {
      const x = col - c
      const z = row - c
      const delay = Math.hypot(x, z) * 28 + r() * 120
      const add = (dx: number, y: number, dz: number, w: number, h: number, d: number, color: string, extraDelay = 0, decor = false) =>
        parts.push({
          x: x + dx,
          y,
          z: z + dz,
          w,
          h,
          d,
          color,
          delay: delay + extraDelay,
          decor,
        })

      if (!qr.isDark(row, col)) {
        if (r() < 0.1) {
          const s = 0.12 + r() * 0.08
          add((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6, s, 0.06 + r() * 0.06, s, pick(p.deco), 0, true)
        }
        continue
      }

      const finder = finderPart(qr.size, row, col)
      if (finder === 'core') {
        add(0, 0, 0, 1, 0.08, 1, p.pond)
        continue
      }
      if (finder === 'ring') {
        add(0, 0, 0, 1, 0.55, 1, p.hedge)
        continue
      }

      const t = r()
      if (t < p.pineShare) {
        const trunk = 0.2 + r() * 0.3
        const tier = 0.4 + r() * 0.15
        const color = pick(p.pine)
        add(0, 0, 0, 0.18, trunk, 0.18, p.trunk)
        add(0, trunk, 0, 0.94, tier, 0.94, color)
        add(0, trunk + tier, 0, 0.68, tier, 0.68, color, 40)
        add(0, trunk + tier * 2, 0, 0.4, tier * 0.9, 0.4, color, 80)
      }
      else if (t < 0.62) {
        const trunk = 0.3 + r() * 0.5
        const crown = 0.5 + r() * 0.6
        const color = pick(p.canopy)
        add(0, 0, 0, 0.2, trunk, 0.2, p.trunk)
        add(0, trunk, 0, 0.94, crown, 0.94, color)
        if (r() < 0.5)
          add((r() - 0.5) * 0.1, trunk + crown, (r() - 0.5) * 0.1, 0.6, 0.25 + r() * 0.2, 0.6, color, 60)
      }
      else if (t < 0.88) {
        add(0, 0, 0, 0.94, 0.3 + r() * 0.25, 0.94, pick(p.bush))
      }
      else {
        const color = pick(p.rock)
        add(0, 0, 0, 0.92, 0.25 + r() * 0.2, 0.9, color)
        add((r() - 0.5) * 0.2, 0.3, (r() - 0.5) * 0.2, 0.55, 0.15 + r() * 0.15, 0.55, color, 30)
      }
    }
  }

  // Seasonal props stand on light squares and the quiet zone. They're light-coloured
  // (or tiny) so the top-down view still reads as open ground.
  for (let row = -QUIET_ZONE; row < qr.size + QUIET_ZONE; row++) {
    for (let col = -QUIET_ZONE; col < qr.size + QUIET_ZONE; col++) {
      const inGrid = row >= 0 && col >= 0 && row < qr.size && col < qr.size
      if (inGrid && qr.isDark(row, col))
        continue
      if (r() > (inGrid ? 0.035 : 0.06))
        continue
      const x = col - c + (r() - 0.5) * 0.3
      const z = row - c + (r() - 0.5) * 0.3
      const delay = Math.hypot(x, z) * 28 + 200 + r() * 200
      PROPS[season](r, (dx, y, dz, w, h, d, color, extra = 0) =>
        parts.push({
          x: x + dx,
          y,
          z: z + dz,
          w,
          h,
          d,
          color,
          delay: delay + extra,
          decor: true,
        }))
    }
  }

  return {
    season,
    parts,
    plate: qr.size + QUIET_ZONE * 2 + 1,
    modules: qr.size,
  }
}
