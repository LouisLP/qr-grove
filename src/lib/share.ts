import type { Season } from './seasons'
import { SEASONS } from './seasons'

export interface ShareState {
  text: string
  season: Season
  seed: number
}

export const DEFAULT_STATE: ShareState = {
  text: 'https://en.wikipedia.org/wiki/QR_code',
  season: 'summer',
  seed: 1,
}

export function readState(search: string): ShareState {
  const q = new URLSearchParams(search)
  const season = q.get('season') as Season | null
  const seed = Number(q.get('seed'))
  return {
    text: q.get('text') ?? DEFAULT_STATE.text,
    season: season && SEASONS.includes(season)
      ? season
      : DEFAULT_STATE.season,
    seed: Number.isInteger(seed) && seed > 0
      ? seed
      : DEFAULT_STATE.seed,
  }
}

export function writeState(s: ShareState): string {
  return `?${new URLSearchParams({
    text: s.text,
    season: s.season,
    seed: String(s.seed),
  })}`
}
