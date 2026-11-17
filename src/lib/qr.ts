import qrcode from 'qrcode-generator'

// The library's default encoder truncates every char to one byte; use UTF-8 so emoji and accents survive.
qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s))

export type Ecc = 'L' | 'M' | 'Q' | 'H'

export interface QrMatrix {
  size: number
  version: number
  isDark: (row: number, col: number) => boolean
}

export class QrTooLongError extends Error {}

export function makeQr(text: string, ecc: Ecc = 'Q'): QrMatrix {
  const qr = qrcode(0, ecc)
  try {
    qr.addData(text.length ? text : ' ', 'Byte')
    qr.make()
  }
  catch {
    throw new QrTooLongError('Text is too long for a QR code')
  }
  const size = qr.getModuleCount()
  return {
    size,
    version: (size - 17) / 4,
    isDark: (row, col) => qr.isDark(row, col),
  }
}

export type FinderPart = 'ring' | 'core'

/** Which part of a finder pattern (the three big corner squares) a module belongs to, if any. */
export function finderPart(size: number, row: number, col: number): FinderPart | null {
  for (const [fr, fc] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ] as const) {
    const lr = row - fr
    const lc = col - fc
    if (lr >= 0 && lr < 7 && lc >= 0 && lc < 7) {
      if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4)
        return 'core'
      if (lr === 0 || lr === 6 || lc === 0 || lc === 6)
        return 'ring'
      return null
    }
  }
  return null
}
