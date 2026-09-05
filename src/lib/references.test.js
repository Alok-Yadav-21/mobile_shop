import { describe, it, expect } from 'vitest'
import { nextReference } from './references.js'

// Repair references are the customer's tracking number and the key every lookup uses, so two
// records sharing one is not a cosmetic problem: the permission check and the write can resolve
// to different rows. These pin the numbering that let that happen.
describe('nextReference', () => {
  const seededRepairs = [
    { ref: 'SPR-4805' }, { ref: 'SPR-4806' }, { ref: 'SPR-4807' }, { ref: 'SPR-4808' },
  ]

  it('continues past the highest reference in use, not the row count', () => {
    // The bug: four rows numbered 4805-4808 made the count-based formula produce SPR-4805,
    // handing a new customer a reference that already belonged to somebody else's repair.
    expect(nextReference(seededRepairs, 'SPR-', 4800, 'ref')).toBe('SPR-4809')
  })

  it('never reissues a reference after a row is deleted', () => {
    const afterDelete = seededRepairs.filter((r) => r.ref !== 'SPR-4806')
    expect(nextReference(afterDelete, 'SPR-', 4800, 'ref')).toBe('SPR-4809')
  })

  it('starts at the floor when there is nothing yet', () => {
    expect(nextReference([], 'VT-TI-', 3000)).toBe('VT-TI-3001')
  })

  it('keeps climbing as records are added', () => {
    let rows = []
    const issued = []
    for (let i = 0; i < 5; i += 1) {
      const reference = nextReference(rows, 'VT-TI-', 3000)
      issued.push(reference)
      rows = [...rows, { reference }]
    }
    expect(issued).toEqual(['VT-TI-3001', 'VT-TI-3002', 'VT-TI-3003', 'VT-TI-3004', 'VT-TI-3005'])
    expect(new Set(issued).size).toBe(issued.length)
  })

  it('respects the floor when existing references number below it', () => {
    // Seeded purchases use the 5000 range while new ones start at 9000; the floor has to win
    // or a new purchase would collide with the seeded history.
    const seededPurchases = [{ reference: 'VT-PO-5001' }, { reference: 'VT-PO-5002' }]
    expect(nextReference(seededPurchases, 'VT-PO-', 9000)).toBe('VT-PO-9001')
  })

  it('ignores rows with a missing or unparseable reference rather than producing NaN', () => {
    const messy = [{ ref: 'SPR-4805' }, { ref: null }, {}, { ref: 'SPR-DRAFT' }]
    expect(nextReference(messy, 'SPR-', 4800, 'ref')).toBe('SPR-4806')
  })

  it('does not let a stray high reference in another series bleed in', () => {
    const orders = [{ reference: 'VT-ORD-20001' }, { reference: 'VT-ORD-20002' }]
    expect(nextReference(orders, 'VT-ORD-', 10000)).toBe('VT-ORD-20003')
  })
})
