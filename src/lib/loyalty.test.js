import { describe, it, expect } from 'vitest'
import {
  pointsEarnedFor, creditValue, pointsForCredit, maxRedeemablePoints,
  applyRedemption, balanceFrom, describeMovement,
  orderEarnsPoints, repairEarnsPoints, settlementDelta,
  POINTS_PER_BLOCK, SPEND_BLOCK, REDEEM_STEP, CREDIT_PER_STEP, MAX_DISCOUNT_RATE,
} from './loyalty.js'

// Loyalty points are money owed to a customer. Every figure the scheme was specified with is
// pinned here, plus the boundaries nobody writes down and everybody hits.

describe('earning — five points per complete £10', () => {
  it('matches every worked example in the scheme', () => {
    expect(pointsEarnedFor(10)).toBe(0)
    expect(pointsEarnedFor(11)).toBe(5)
    expect(pointsEarnedFor(19)).toBe(5)
    expect(pointsEarnedFor(20)).toBe(10)
    expect(pointsEarnedFor(29)).toBe(10)
    expect(pointsEarnedFor(30)).toBe(15)
    expect(pointsEarnedFor(39)).toBe(15)
    expect(pointsEarnedFor(50)).toBe(25)
    expect(pointsEarnedFor(100)).toBe(50)
  })

  it('earns nothing at or below the threshold, and five just above it', () => {
    // £10 exactly earns nothing while a penny more earns five. That is the scheme as written —
    // "£10 or less = 0" and "more than £10 = complete £10 blocks" — and it is the one place a
    // customer might reasonably be surprised, so the cliff is pinned rather than left to
    // whatever Math.floor happens to do.
    expect(pointsEarnedFor(0)).toBe(0)
    expect(pointsEarnedFor(9.99)).toBe(0)
    expect(pointsEarnedFor(10)).toBe(0)
    expect(pointsEarnedFor(10.01)).toBe(5)
    expect(pointsEarnedFor(10.99)).toBe(5)
  })

  it('ignores the pennies above the threshold', () => {
    expect(pointsEarnedFor(29.99)).toBe(10)
    expect(pointsEarnedFor(39.95)).toBe(15)
  })

  it('treats a total that is a hair off a block as being on it', () => {
    // Totals are sums of floats: 0.1 + 0.2 is 0.30000000000000004, and the same class of error
    // at £30 would otherwise cost a customer 5 points for arithmetic they did not do. A total
    // within a millionth of a penny of £30 is £30.
    expect(pointsEarnedFor(29.999999999999996)).toBe(15)
    expect(pointsEarnedFor(30.000000000000004)).toBe(15)
    // And a real £29.99 is still £29.99 — the nudge is far too small to reach it.
    expect(pointsEarnedFor(29.99)).toBe(10)
  })

  it('refuses to invent points from nonsense', () => {
    expect(pointsEarnedFor(-50)).toBe(0)
    expect(pointsEarnedFor(null)).toBe(0)
    expect(pointsEarnedFor(undefined)).toBe(0)
    expect(pointsEarnedFor('lots')).toBe(0)
    expect(pointsEarnedFor(NaN)).toBe(0)
    expect(pointsEarnedFor(Infinity)).toBe(0)
  })
})

describe('what points are worth', () => {
  it('matches every worked example in the scheme', () => {
    expect(creditValue(10)).toBe(2)
    expect(creditValue(20)).toBe(4)
    expect(creditValue(30)).toBe(6)
    expect(creditValue(50)).toBe(10)
    expect(creditValue(100)).toBe(20)
  })

  it('is worth nothing below a whole block, and ignores part-blocks', () => {
    expect(creditValue(0)).toBe(0)
    expect(creditValue(9)).toBe(0)
    expect(creditValue(19)).toBe(2)
    expect(creditValue(55)).toBe(10)
  })

  it('converts back the same way', () => {
    expect(pointsForCredit(2)).toBe(10)
    expect(pointsForCredit(8)).toBe(40)
    expect(pointsForCredit(1.99)).toBe(0)
    expect(pointsForCredit(0)).toBe(0)
    expect(pointsForCredit(-5)).toBe(0)
  })
})

describe('the 20% cap', () => {
  it('matches the worked example: £40 allows 40 points', () => {
    // £40 × 20% = £8, and £8 is 40 points.
    expect(maxRedeemablePoints(500, 40)).toBe(40)
  })

  it('never lets points cover more than a fifth of the bill', () => {
    for (const total of [15, 23.5, 40, 99.99, 250, 1049]) {
      const points = maxRedeemablePoints(100000, total)
      expect(creditValue(points)).toBeLessThanOrEqual(total * MAX_DISCOUNT_RATE + 1e-9)
    }
  })

  it('is limited by the balance when the balance is the smaller of the two', () => {
    expect(maxRedeemablePoints(20, 500)).toBe(20)
    expect(maxRedeemablePoints(25, 500)).toBe(20) // part-blocks are not spendable
  })

  it('allows nothing on a small bill', () => {
    // £9 × 20% = £1.80, which does not reach the £2 a block is worth.
    expect(maxRedeemablePoints(500, 9)).toBe(0)
    expect(maxRedeemablePoints(500, 10)).toBe(10) // £2 exactly
  })

  it('allows nothing when there is nothing to spend', () => {
    expect(maxRedeemablePoints(0, 100)).toBe(0)
    expect(maxRedeemablePoints(9, 100)).toBe(0)
    expect(maxRedeemablePoints(50, 0)).toBe(0)
    expect(maxRedeemablePoints(50, -20)).toBe(0)
    expect(maxRedeemablePoints(null, undefined)).toBe(0)
  })
})

describe('applying a redemption', () => {
  it('takes what was asked for when the rules allow it', () => {
    const r = applyRedemption({ balance: 100, total: 40, requested: 40 })
    expect(r).toMatchObject({ points: 40, discount: 8, payable: 32, maxPoints: 40, trimmed: false })
  })

  it('trims a request that exceeds the cap rather than refusing it', () => {
    // Holding 500 points against a £40 bill: the cap is 40, not 500.
    const r = applyRedemption({ balance: 500, total: 40, requested: 500 })
    expect(r.points).toBe(40)
    expect(r.discount).toBe(8)
    expect(r.trimmed).toBe(true)
  })

  it('trims a request that exceeds the balance', () => {
    const r = applyRedemption({ balance: 30, total: 400, requested: 100 })
    expect(r.points).toBe(30)
    expect(r.discount).toBe(6)
    expect(r.trimmed).toBe(true)
  })

  it('rounds a request down to whole blocks', () => {
    expect(applyRedemption({ balance: 100, total: 400, requested: 37 }).points).toBe(30)
    expect(applyRedemption({ balance: 100, total: 400, requested: 9 }).points).toBe(0)
  })

  it('never produces a negative bill or a negative redemption', () => {
    expect(applyRedemption({ balance: 100, total: 400, requested: -50 }).points).toBe(0)
    const r = applyRedemption({ balance: 10000, total: 12, requested: 10000 })
    expect(r.payable).toBeGreaterThanOrEqual(0)
    expect(r.discount).toBeLessThanOrEqual(12)
  })

  it('leaves the bill alone when nothing is redeemed', () => {
    expect(applyRedemption({ balance: 0, total: 55.5, requested: 0 })).toMatchObject({ points: 0, discount: 0, payable: 55.5 })
  })

  it('does not leave floating-point dust in what is left to pay', () => {
    expect(applyRedemption({ balance: 100, total: 29.99, requested: 10 }).payable).toBe(27.99)
    expect(applyRedemption({ balance: 100, total: 0.1 + 0.2, requested: 0 }).payable).toBe(0.3)
  })

  it('survives being called with nothing at all', () => {
    expect(applyRedemption()).toMatchObject({ points: 0, discount: 0, payable: 0 })
  })
})

describe('the balance is the ledger, not a stored number', () => {
  it('adds up the movements', () => {
    expect(balanceFrom([{ delta: 50 }, { delta: -20 }, { delta: 5 }])).toBe(35)
  })

  it('is zero for an account that has never moved', () => {
    expect(balanceFrom([])).toBe(0)
    expect(balanceFrom()).toBe(0)
  })

  it('ignores a malformed row rather than producing NaN for the whole balance', () => {
    expect(balanceFrom([{ delta: 50 }, { delta: null }, {}, { delta: 'ten' }])).toBe(50)
  })
})

describe('how a movement reads to the customer', () => {
  it('says what happened, in their words', () => {
    expect(describeMovement({ kind: 'earned', delta: 25, sourceRef: 'VT-ORD-10001' }))
      .toBe('Earned 25 points on VT-ORD-10001')
    expect(describeMovement({ kind: 'redeemed', delta: -40, sourceRef: 'SPR-4805' }))
      .toBe('Redeemed 40 points on SPR-4805 for £8')
    expect(describeMovement({ kind: 'reversed', delta: -25, sourceRef: 'VT-ORD-10001' }))
      .toBe('25 points returned on VT-ORD-10001')
    expect(describeMovement({ kind: 'adjusted', delta: 100 })).toBe('Added 100 points')
    expect(describeMovement({ kind: 'adjusted', delta: -100 })).toBe('Removed 100 points')
  })
})

describe('the scheme’s own constants', () => {
  it('are what the business agreed, so a change here is a deliberate one', () => {
    expect({ POINTS_PER_BLOCK, SPEND_BLOCK, REDEEM_STEP, CREDIT_PER_STEP, MAX_DISCOUNT_RATE })
      .toEqual({ POINTS_PER_BLOCK: 5, SPEND_BLOCK: 10, REDEEM_STEP: 10, CREDIT_PER_STEP: 2, MAX_DISCOUNT_RATE: 0.2 })
  })

  it('means the scheme gives 10% back, once the points reach a whole block', () => {
    // Worth stating outright, because it is easy to get wrong from the two halves separately:
    // £10 spent earns 5 points, and 10 points are worth £2. That is 10% back — not 4%, not 20%.
    // Any marketing copy quoting a different figure is describing a different scheme.
    expect(creditValue(pointsEarnedFor(100))).toBe(10)
    expect(creditValue(pointsEarnedFor(1000))).toBe(100)
  })

  it('holds a part-block until the customer completes it', () => {
    // £50 earns 25 points, and only 20 of them are spendable — the odd 5 are worth nothing on
    // their own and wait for the next purchase. This is why nothing here uses a per-point rate:
    // £0.20 a point would say £5 and the customer would find only £4 at the till.
    expect(pointsEarnedFor(50)).toBe(25)
    expect(creditValue(25)).toBe(4)
    // Spend another £20 and the block completes: 35 points, £6.
    expect(creditValue(25 + pointsEarnedFor(20))).toBe(6)
  })
})

describe('which transactions earn', () => {
  const order = (over = {}) => ({ status: 'delivered', total: 100, ...over })
  const repair = (over = {}) => ({ status: 'Completed', quote: 100, ...over })

  it('earns on an order once it has reached the customer', () => {
    expect(orderEarnsPoints(order({ status: 'delivered' }))).toEqual({ points: 50, spend: 100 })
    expect(orderEarnsPoints(order({ status: 'collected' }))).toEqual({ points: 50, spend: 100 })
  })

  it('earns nothing on an order still in progress', () => {
    // It can still be cancelled up to the moment it ships, so nothing is owed yet.
    for (const status of ['pending', 'paid', 'processing', 'ready', 'dispatched']) {
      expect(orderEarnsPoints(order({ status }))).toBeNull()
    }
  })

  it('earns nothing on an order that was called off or refunded', () => {
    expect(orderEarnsPoints(order({ status: 'cancelled' }))).toBeNull()
    expect(orderEarnsPoints(order({ status: 'refunded' }))).toBeNull()
  })

  it('earns on a repair when the device is handed back', () => {
    // A repair is paid at the counter on collection, so "Completed" is when money changes hands.
    expect(repairEarnsPoints(repair({ quote: 119 }))).toEqual({ points: 55, spend: 119 })
  })

  it('earns nothing on a repair still on the bench, or cancelled', () => {
    for (const status of ['Booking received', 'Diagnostics', 'Quote awaiting approval',
      'Repair in progress', 'Ready for collection', 'Dispatched']) {
      expect(repairEarnsPoints(repair({ status }))).toBeNull()
    }
    expect(repairEarnsPoints(repair({ status: 'Cancelled' }))).toBeNull()
  })

  it('earns nothing on a completed repair that was never charged for', () => {
    // A goodwill fix, or a warranty job: finished, but no money changed hands.
    expect(repairEarnsPoints(repair({ quote: null }))).toBeNull()
    expect(repairEarnsPoints(repair({ quote: 0 }))).toBeNull()
    expect(repairEarnsPoints(repair({ quote: 9 }))).toBeNull()
  })

  it('survives being handed nothing', () => {
    expect(orderEarnsPoints(null)).toBeNull()
    expect(repairEarnsPoints(undefined)).toBeNull()
  })
})

describe('keeping one transaction’s points in line with itself', () => {
  it('pays the entitlement when nothing has been credited yet', () => {
    expect(settlementDelta({ credited: 0, target: 50, balance: 0 })).toBe(50)
  })

  it('does nothing when the ledger already matches', () => {
    expect(settlementDelta({ credited: 50, target: 50, balance: 50 })).toBe(0)
  })

  it('takes the points back when the transaction is undone', () => {
    expect(settlementDelta({ credited: 50, target: 0, balance: 50 })).toBe(-50)
  })

  it('pays again after a reversal, rather than treating the award as spent', () => {
    // The bug this exists to prevent: with a one-shot "already awarded" flag, an order moved
    // back over the finish line and forward again lost its points for good — so a staff member
    // correcting a mis-click quietly cost the customer money.
    let credited = 0
    credited += settlementDelta({ credited, target: 50, balance: 0 })    // delivered
    credited += settlementDelta({ credited, target: 0, balance: 50 })    // moved back
    credited += settlementDelta({ credited, target: 50, balance: 0 })    // delivered again
    expect(credited).toBe(50)
  })

  it('never claws back more than the account actually holds', () => {
    // Earned 50 on this order, spent them elsewhere, then the order is refunded. The shop
    // absorbs the difference: the balance stops at zero rather than going negative.
    expect(settlementDelta({ credited: 50, target: 0, balance: 20 })).toBe(-20)
    expect(settlementDelta({ credited: 50, target: 0, balance: 0 })).toBe(0)
  })

  it('tops up to the entitlement when an earlier clawback was capped', () => {
    // Only 20 of the 50 could be taken back, so 30 remain credited to this order. Delivering it
    // again owes the customer the other 20, not another 50.
    expect(settlementDelta({ credited: 30, target: 50, balance: 0 })).toBe(20)
  })

  it('handles a changed entitlement, such as a corrected quote', () => {
    expect(settlementDelta({ credited: 50, target: 65, balance: 50 })).toBe(15)
    expect(settlementDelta({ credited: 65, target: 50, balance: 65 })).toBe(-15)
  })

  it('survives being called with nothing', () => {
    expect(settlementDelta()).toBe(0)
    expect(settlementDelta({})).toBe(0)
  })
})
