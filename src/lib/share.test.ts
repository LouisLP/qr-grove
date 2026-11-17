import { expect, it } from 'vitest'
import { DEFAULT_STATE, readState, writeState } from './share'

it('round-trips state through the query string', () => {
  const s = { text: 'héllo & bye?', season: 'winter' as const, seed: 42 }
  expect(readState(writeState(s))).toEqual(s)
})

it('falls back to defaults on junk', () => {
  expect(readState('?season=monsoon&seed=-3')).toEqual(DEFAULT_STATE)
})
