import { describe, expect, it } from 'vitest'

import {
  defaultVersionId,
  filterModpacks,
  formatDownloads,
  pageOf,
  splitGameVersion,
} from './modpacks'

describe('formatDownloads', () => {
  it('leaves counts under a thousand alone', () => {
    expect(formatDownloads(0)).toBe('0')
    expect(formatDownloads(842)).toBe('842')
  })

  it('rounds to thousands', () => {
    expect(formatDownloads(840_007)).toBe('840\u00A0k')
    expect(formatDownloads(1_000)).toBe('1\u00A0k')
  })

  it('keeps one decimal under ten million, where it still separates packs', () => {
    expect(formatDownloads(2_064_938)).toBe('2,1\u00A0M')
    expect(formatDownloads(9_940_000)).toBe('9,9\u00A0M')
  })

  it('drops the decimal past ten million', () => {
    expect(formatDownloads(24_400_000)).toBe('24\u00A0M')
  })

  it('returns null rather than a wrong reading', () => {
    expect(formatDownloads(null)).toBeNull()
    expect(formatDownloads(undefined)).toBeNull()
    expect(formatDownloads(Number.NaN)).toBeNull()
    expect(formatDownloads(-5)).toBeNull()
  })
})

describe('defaultVersionId', () => {
  it('preselects the newest, which the panel lists first', () => {
    expect(defaultVersionId([{ id: '30110' }, { id: '29905' }])).toBe('30110')
  })

  it('has nothing to preselect on an empty list', () => {
    expect(defaultVersionId([])).toBeNull()
  })
})

describe('splitGameVersion', () => {
  it('separates loader from Minecraft version, whichever order the source uses', () => {
    expect(splitGameVersion('NeoForge - 26.1.2')).toEqual({ loader: 'NeoForge', minecraft: '26.1.2' })
    expect(splitGameVersion('1.20.1 - Forge')).toEqual({ loader: 'Forge', minecraft: '1.20.1' })
  })

  it('treats a lone value as the Minecraft version', () => {
    expect(splitGameVersion('1.20.1')).toEqual({ loader: null, minecraft: '1.20.1' })
  })

  it('survives a missing field', () => {
    expect(splitGameVersion(null)).toEqual({ loader: null, minecraft: null })
    expect(splitGameVersion('')).toEqual({ loader: null, minecraft: null })
  })
})

describe('filterModpacks', () => {
  const packs = [
    { name: 'All the Mods 9 - ATM9', summary: 'Over 400 mods and a Gregstar' },
    { name: 'SkyFactory 5', summary: null },
    { name: 'Better MC [FORGE]', summary: 'Curated adventure' },
  ]

  it('returns everything for an empty query', () => {
    expect(filterModpacks(packs, '   ')).toHaveLength(3)
  })

  it('matches on name, case-insensitively', () => {
    expect(filterModpacks(packs, 'skyfactory').map((p) => p.name)).toEqual(['SkyFactory 5'])
  })

  it('also matches the summary, so a pack is findable by what it is', () => {
    expect(filterModpacks(packs, 'gregstar').map((p) => p.name)).toEqual(['All the Mods 9 - ATM9'])
  })

  it('survives a pack with no summary', () => {
    expect(filterModpacks(packs, 'adventure')).toHaveLength(1)
  })
})

describe('pageOf', () => {
  const items = Array.from({ length: 25 }, (_, i) => i)

  it('cuts the first page and knows another follows', () => {
    const page = pageOf(items, 0, 10)
    expect(page.items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(page.hasNextPage).toBe(true)
    expect(page.total).toBe(25)
  })

  it('marks the last page as last, even when it is short', () => {
    const page = pageOf(items, 2, 10)
    expect(page.items).toEqual([20, 21, 22, 23, 24])
    expect(page.hasNextPage).toBe(false)
  })

  it('returns nothing past the end rather than wrapping', () => {
    expect(pageOf(items, 9, 10).items).toEqual([])
  })

  it('clamps a negative page and a zero size', () => {
    expect(pageOf(items, -3, 10).pageId).toBe(0)
    expect(pageOf(items, 0, 0).items).toEqual([0])
  })
})
