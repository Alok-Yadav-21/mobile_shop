import { describe, it, expect } from 'vitest'
import {
  distanceKm, kmToMiles, formatDistance, branchesByDistance, outwardCode, locatePostcode,
} from './geo.js'

const WOOLWICH = { lat: 51.4894, lng: 0.0640 }
const ORPINGTON = { lat: 51.3990, lng: 0.1060 }

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(WOOLWICH, WOOLWICH)).toBe(0)
  })

  it('measures a known short hop within a sensible margin', () => {
    // Woolwich to Orpington is roughly 10-11 km as the crow flies.
    const d = distanceKm(WOOLWICH, ORPINGTON)
    expect(d).toBeGreaterThan(9)
    expect(d).toBeLessThan(13)
  })

  it('is symmetric', () => {
    expect(distanceKm(WOOLWICH, ORPINGTON)).toBeCloseTo(distanceKm(ORPINGTON, WOOLWICH), 6)
  })

  it('returns null rather than NaN for missing coordinates', () => {
    expect(distanceKm(WOOLWICH, { lat: null, lng: null })).toBeNull()
    expect(distanceKm(null, WOOLWICH)).toBeNull()
    expect(distanceKm(WOOLWICH, {})).toBeNull()
  })
})

describe('formatDistance', () => {
  it('uses yards under a fifth of a mile, where "0.1 mi" is useless', () => {
    expect(formatDistance(0.16)).toMatch(/yd$/)
  })
  it('uses one decimal for short distances', () => {
    expect(formatDistance(5)).toBe('3.1 mi')
  })
  it('drops the decimal once the number is large', () => {
    expect(formatDistance(40)).toBe('25 mi')
  })
  it('converts km to miles', () => {
    expect(kmToMiles(10)).toBeCloseTo(6.21, 1)
  })
})

describe('branchesByDistance', () => {
  const branches = [
    { id: 'orp', area: 'Orpington', ...ORPINGTON },
    { id: 'wol', area: 'Woolwich', ...WOOLWICH },
    { id: 'nul', area: 'No coords', lat: null, lng: null },
  ]

  it('ranks nearest first from the given origin', () => {
    const out = branchesByDistance(branches, WOOLWICH)
    expect(out[0].branch.id).toBe('wol')
    expect(out[1].branch.id).toBe('orp')
  })

  it('flips the order when the origin moves', () => {
    expect(branchesByDistance(branches, ORPINGTON)[0].branch.id).toBe('orp')
  })

  it('keeps a branch with no coordinates, sorted last rather than dropped', () => {
    const out = branchesByDistance(branches, WOOLWICH)
    expect(out).toHaveLength(3)
    expect(out[out.length - 1].branch.id).toBe('nul')
  })

  it('returns every branch unranked when there is no origin yet', () => {
    const out = branchesByDistance(branches, null)
    expect(out).toHaveLength(3)
    expect(out.every((r) => r.km === null)).toBe(true)
  })
})

describe('outwardCode', () => {
  it('reads the part before the space', () => {
    expect(outwardCode('SE18 6EX')).toBe('SE18')
    expect(outwardCode('da17 5je')).toBe('DA17')
  })
  it('copes with no space at all', () => expect(outwardCode('BR52RG')).toBe('BR5'))
  it('returns null for something that is not a postcode', () => {
    expect(outwardCode('hello')).toBeNull()
    expect(outwardCode('')).toBeNull()
    expect(outwardCode(undefined)).toBeNull()
  })
})

describe('locatePostcode', () => {
  const branches = [{ id: 'wol', pc: 'SE18 6EX', lat: 51.49, lng: 0.06 }]

  it('places a known area from the table', () => {
    const p = locatePostcode('SE18 6EX', branches)
    expect(p.code).toBe('SE18')
    expect(p.lat).toBeCloseTo(51.489, 2)
  })

  it('falls back to a branch in the same area when the table has no entry', () => {
    const p = locatePostcode('SE18', [{ id: 'x', pc: 'SE18 1AA', lat: 51.4, lng: 0.1 }])
    expect(p).not.toBeNull()
  })

  it('returns null for an unrecognised postcode rather than guessing', () => {
    expect(locatePostcode('EH1 1AA', branches)).toBeNull()
    expect(locatePostcode('nonsense', branches)).toBeNull()
  })
})

// --- the reported bug: a Bromley postcode found no branch at all -----------------------------
// BranchAPI.nearest used to match postcodes as strings, so BR1 returned nothing: no branch has
// a BR1 postcode. Four are within four miles. These pin the ranking to the real branch data.
describe('ranking the real branch network', () => {
  const REAL_BRANCHES = [
    { id: 'blv', area: 'Belvedere', pc: 'DA17 5JE', lat: 51.49, lng: 0.17 },
    { id: 'sid', area: 'Sidcup', pc: 'DA15 9PS', lat: 51.43, lng: 0.10 },
    { id: 'nel', area: 'New Eltham', pc: 'SE9 2DR', lat: 51.44, lng: 0.07 },
    { id: 'nsa', area: 'New Eltham — Station Approach', pc: 'SE9 2AB', lat: 51.44, lng: 0.05 },
    { id: 'orp', area: 'Orpington', pc: 'BR5 2RG', lat: 51.38, lng: 0.10 },
    { id: 'wol', area: 'Woolwich', pc: 'SE18 6EX', lat: 51.49, lng: 0.06 },
    { id: 'wbs', area: 'Woolwich — Beresford Square', pc: 'SE18 6AY', lat: 51.49, lng: 0.07 },
    { id: 'whr', area: 'Woolwich — Herbert Road', pc: 'SE18 3TB', lat: 51.48, lng: 0.06 },
  ]
  const rank = (pc) => branchesByDistance(REAL_BRANCHES, locatePostcode(pc, REAL_BRANCHES))

  it('answers for BR1, which no branch shares a postcode area with', () => {
    const out = rank('BR1 5AL')
    expect(out[0].branch.id).toBe('nsa')
    expect(out[0].km).toBeLessThan(6)
    // Every branch is offered, not just ones in the same postcode area.
    expect(out).toHaveLength(8)
  })

  it('puts Belvedere furthest from Bromley and nearest to itself', () => {
    expect(rank('BR1 5AL').at(-1).branch.id).toBe('blv')
    expect(rank('DA17 5JE')[0].branch.id).toBe('blv')
  })

  it('ranks a Woolwich postcode onto a Woolwich branch', () => {
    expect(['wol', 'wbs']).toContain(rank('SE18 6EX')[0].branch.id)
  })

  it('places an unlisted district from its own postcode area rather than giving up', () => {
    // BR2 is not in AREA_CENTRES; it should still land in the Bromley cluster.
    const p = locatePostcode('BR2 9AA', REAL_BRANCHES)
    expect(p).not.toBeNull()
    expect(p.approximate).toBe(true)
    expect(p.lat).toBeGreaterThan(51.3)
    expect(p.lat).toBeLessThan(51.5)
  })

  it('still refuses a postcode from another part of the country', () => {
    expect(locatePostcode('EH1 1AA', REAL_BRANCHES)).toBeNull()
  })
})
