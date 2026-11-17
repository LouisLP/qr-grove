import { describe, expect, it } from 'vitest'
import { plantGarden } from './garden'
import { makeQr, QrTooLongError } from './qr'
import { SEASONS } from './seasons'

function luminance(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16)
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928
      ? s / 12.92
      : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!
}

describe('plantGarden', () => {
  const qr = makeQr('https://en.wikipedia.org/wiki/QR_code')

  it.each(SEASONS)('%s: every dark module is covered by a wide dark object', (season) => {
    const { parts } = plantGarden(qr, season, 1)
    const c = (qr.size - 1) / 2
    for (let row = 0; row < qr.size; row++) {
      for (let col = 0; col < qr.size; col++) {
        if (!qr.isDark(row, col))
          continue
        const cover = parts.filter(p => !p.decor && Math.abs(p.x - (col - c)) < 0.2 && Math.abs(p.z - (row - c)) < 0.2 && p.w >= 0.9)
        expect(cover.length, `module ${row},${col}`).toBeGreaterThan(0)
        for (const p of cover)
          expect(luminance(p.color)).toBeLessThan(0.12)
      }
    }
  })

  it.each(SEASONS)('%s: decorations on light modules stay small and light', (season) => {
    const { parts } = plantGarden(qr, season, 3)
    for (const p of parts.filter(p => p.decor)) {
      expect(p.w).toBeLessThan(0.25)
      expect(luminance(p.color)).toBeGreaterThan(0.4)
    }
  })

  it('is deterministic for a seed', () => {
    expect(plantGarden(qr, 'summer', 7)).toEqual(plantGarden(qr, 'summer', 7))
  })
})

describe('makeQr', () => {
  it('encodes non-ASCII text', () => {
    expect(makeQr('café ☕').size).toBeGreaterThanOrEqual(21)
  })
  it('rejects text over capacity', () => {
    expect(() => makeQr('x'.repeat(5000))).toThrow(QrTooLongError)
  })
})
