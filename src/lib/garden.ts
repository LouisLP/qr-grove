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

  return { parts, plate: qr.size + QUIET_ZONE * 2 + 1, modules: qr.size }
}
