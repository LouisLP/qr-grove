export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

/**
 * Palette rule that keeps the code scannable: everything standing on a dark module
 * has a dark top face; ground and ground decorations stay light.
 */
export interface Palette {
  label: string
  ground: string
  skirt: string
  trunk: string
  canopy: string[]
  pine: string[]
  bush: string[]
  rock: string[]
  hedge: string
  pond: string
  deco: string[]
  /** Share of dark modules that become pines instead of broadleaf trees. */
  pineShare: number
  /** Ambient tint behind the diorama. */
  sky: string
}

export const PALETTES: Record<Season, Palette> = {
  spring: {
    label: 'Spring',
    ground: '#eef3df',
    skirt: '#7a5a3c',
    trunk: '#5a3d28',
    canopy: ['#2e5e2e', '#386b33', '#2a5230'],
    pine: ['#24492c'],
    bush: ['#2f5d34', '#3b6a2f'],
    rock: ['#3b3f45', '#474a50'],
    hedge: '#264d2b',
    pond: '#1f3d57',
    deco: ['#ffffff', '#f6c9d6', '#fff2a8'],
    pineShare: 0.1,
    sky: '#e7efe0',
  },
  summer: {
    label: 'Summer',
    ground: '#e9efc9',
    skirt: '#7a5a3c',
    trunk: '#5a3d28',
    canopy: ['#1f4d2b', '#255a2c', '#1a4226'],
    pine: ['#1b3f2a'],
    bush: ['#22502a', '#2d5a26'],
    rock: ['#3b3f45', '#474a50'],
    hedge: '#1d4426',
    pond: '#1b3a5c',
    deco: ['#f7e27a', '#ffffff'],
    pineShare: 0.15,
    sky: '#e6eedb',
  },
  autumn: {
    label: 'Autumn',
    ground: '#f2e6cc',
    skirt: '#6e4f34',
    trunk: '#4f3423',
    canopy: [
      '#7a2e14',
      '#6a3612',
      '#5b2316',
      '#2f4a26',
    ],
    pine: ['#29402a'],
    bush: ['#6e3a14', '#5a2a18'],
    rock: ['#3f3a36', '#4a4440'],
    hedge: '#4f2a14',
    pond: '#233a4f',
    deco: ['#e8b26a', '#e5a05e'],
    pineShare: 0.15,
    sky: '#f1e8d8',
  },
  winter: {
    label: 'Winter',
    ground: '#f5f7fa',
    skirt: '#6a5a4e',
    trunk: '#4a3a30',
    canopy: ['#2a3a36'],
    pine: ['#1d3b34', '#24443b', '#1a332e'],
    bush: ['#2a3a3a', '#33403e'],
    rock: ['#3b4048', '#454a52'],
    hedge: '#22382f',
    pond: '#2b4a66',
    deco: ['#dfe6ee', '#e8edf3'],
    pineShare: 0.65,
    sky: '#e4e9ef',
  },
}
