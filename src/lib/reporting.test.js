import { describe, it, expect } from 'vitest'
import {
  startOfWeek, periodKey, periodStart, rangeForLastPeriods, isEarning, filterOrders,
  salesSummary, salesByPeriod, salesByBranch, unassignedSales,
  purchaseCost, purchasesByBranch, stockState, branchStockReport, overallStockReport,
  branchPerformance,
} from './reporting.js'

const at = (iso) => new Date(iso).getTime()
const order = (over = {}) => ({
  reference: 'VT-ORD-1', kind: 'retail', branch: 'wol', paymentMethod: 'cash',
  total: 100, status: 'paid', createdAt: at('2026-03-04T12:00:00'), ...over,
})

const BRANCHES = [{ id: 'wol', area: 'Woolwich' }, { id: 'blv', area: 'Belvedere' }]

describe('startOfWeek', () => {
  it('anchors weeks to Monday', () => {
    // 2026-03-04 is a Wednesday; its week starts Monday 2026-03-02.
    expect(new Date(startOfWeek(at('2026-03-04T12:00:00'))).getDay()).toBe(1)
    expect(new Date(startOfWeek(at('2026-03-04T12:00:00'))).getDate()).toBe(2)
  })
  it('keeps Sunday in the week that just ended, not the one starting', () => {
    expect(startOfWeek(at('2026-03-08T23:00:00'))).toBe(startOfWeek(at('2026-03-02T09:00:00')))
  })
})

describe('periodKey', () => {
  it('gives two days in one week the same week key', () => {
    expect(periodKey(at('2026-03-02T09:00:00'), 'week')).toBe(periodKey(at('2026-03-07T20:00:00'), 'week'))
  })
  it('separates days within a week at day granularity', () => {
    expect(periodKey(at('2026-03-02T09:00:00'), 'day')).not.toBe(periodKey(at('2026-03-03T09:00:00'), 'day'))
  })
  it('uses a year-month key for months', () => {
    expect(periodKey(at('2026-03-31T23:30:00'), 'month')).toBe('2026-03')
  })
})

describe('rangeForLastPeriods', () => {
  it('walks back whole months rather than fixed 30-day blocks', () => {
    const { from } = rangeForLastPeriods('month', 3, at('2026-03-15T10:00:00'))
    expect(periodKey(from, 'month')).toBe('2026-01')
  })
  it('returns the current period when asked for one', () => {
    const { from } = rangeForLastPeriods('month', 1, at('2026-03-15T10:00:00'))
    expect(periodKey(from, 'month')).toBe('2026-03')
  })
})

describe('isEarning', () => {
  it('excludes cancelled and refunded orders', () => {
    expect(isEarning(order({ status: 'cancelled' }))).toBe(false)
    expect(isEarning(order({ status: 'refunded' }))).toBe(false)
    expect(isEarning(order())).toBe(true)
  })
})

describe('filterOrders', () => {
  const orders = [
    order({ reference: 'a' }),
    order({ reference: 'b', status: 'refunded' }),
    order({ reference: 'c', branch: 'blv' }),
    order({ reference: 'd', createdAt: at('2025-01-01T12:00:00') }),
  ]
  it('drops non-earning orders by default', () => {
    expect(filterOrders(orders).map((o) => o.reference)).not.toContain('b')
  })
  it('keeps them when earningOnly is off, for the payments view', () => {
    expect(filterOrders(orders, { earningOnly: false }).map((o) => o.reference)).toContain('b')
  })
  it('scopes to a branch', () => {
    expect(filterOrders(orders, { branchId: 'blv' }).map((o) => o.reference)).toEqual(['c'])
  })
  it('scopes to a date window', () => {
    const out = filterOrders(orders, { from: at('2026-01-01T00:00:00') })
    expect(out.map((o) => o.reference)).not.toContain('d')
  })
})

describe('salesSummary', () => {
  it('splits by payment method so cash plus online equals the total', () => {
    const out = salesSummary([
      order({ paymentMethod: 'cash', total: 100 }),
      order({ paymentMethod: 'online', total: 50 }),
    ])
    expect(out.cash).toBe(100)
    expect(out.online).toBe(50)
    expect(out.cash + out.online).toBe(out.total)
  })
  it('splits retail from repair revenue', () => {
    const out = salesSummary([order({ kind: 'retail', total: 100 }), order({ kind: 'repair', total: 60 })])
    expect(out.retail).toBe(100)
    expect(out.repair).toBe(60)
    expect(out.total).toBe(160)
  })
  it('counts orders per payment method', () => {
    const out = salesSummary([order({ paymentMethod: 'cash' }), order({ paymentMethod: 'online' }), order({ paymentMethod: 'online' })])
    expect(out.cashOrders).toBe(1)
    expect(out.onlineOrders).toBe(2)
  })
  it('avoids dividing by zero on an empty set', () => {
    expect(salesSummary([]).avgOrder).toBe(0)
  })
})

describe('salesByPeriod', () => {
  it('returns buckets oldest first', () => {
    const rows = salesByPeriod([
      order({ createdAt: at('2026-03-10T10:00:00') }),
      order({ createdAt: at('2026-01-10T10:00:00') }),
    ], 'month')
    expect(rows).toHaveLength(2)
    expect(rows[0].start).toBeLessThan(rows[1].start)
  })
})

describe('salesByBranch', () => {
  it('lists every branch, including one that took nothing', () => {
    const rows = salesByBranch([order({ branch: 'wol' })], BRANCHES)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.branch.id === 'blv').total).toBe(0)
  })
})

describe('unassignedSales', () => {
  it('catches web orders with no branch so branch rows still reconcile to the total', () => {
    const orders = [order({ branch: 'wol', total: 100 }), order({ branch: null, total: 40 })]
    const branchTotal = salesByBranch(orders, BRANCHES).reduce((s, r) => s + r.total, 0)
    const web = unassignedSales(orders, BRANCHES)
    expect(web.total).toBe(40)
    expect(branchTotal + web.total).toBe(salesSummary(orders).total)
  })
})

describe('purchaseCost', () => {
  it('multiplies quantity by the unit cost captured on the record', () => {
    expect(purchaseCost([{ quantity: 3, unitCost: 10.5 }, { quantity: 2, unitCost: 4 }])).toBe(39.5)
  })
  it('is zero for no purchases', () => expect(purchaseCost([])).toBe(0))
})

describe('purchasesByBranch', () => {
  it('totals cost and units per branch', () => {
    const rows = purchasesByBranch([
      { branchId: 'wol', quantity: 2, unitCost: 10, at: at('2026-03-01T00:00:00') },
      { branchId: 'wol', quantity: 1, unitCost: 5, at: at('2026-03-02T00:00:00') },
    ], BRANCHES)
    const wol = rows.find((r) => r.branch.id === 'wol')
    expect(wol.cost).toBe(25)
    expect(wol.units).toBe(3)
    expect(rows.find((r) => r.branch.id === 'blv').cost).toBe(0)
  })
})

describe('stockState', () => {
  it('reports zero or missing stock as sold out', () => {
    expect(stockState(0)).toBe('sold_out')
    expect(stockState(undefined)).toBe('sold_out')
  })
  it('reports at-or-below threshold as low', () => expect(stockState(3, 3)).toBe('low'))
  it('reports above threshold as in stock', () => expect(stockState(4, 3)).toBe('in_stock'))
})

describe('branchStockReport', () => {
  const products = [{ id: 'p1', name: 'iPhone', lowStockThreshold: 3 }]
  it('treats a product with no row at the branch as sold out there', () => {
    const [row] = branchStockReport(products, [{ productId: 'p1', branchId: 'blv', quantity: 9 }], 'wol')
    expect(row.quantity).toBe(0)
    expect(row.state).toBe('sold_out')
  })
})

describe('overallStockReport', () => {
  const products = [{ id: 'p1', name: 'iPhone', lowStockThreshold: 3 }]
  it('names the branches that have run out while the network still has stock', () => {
    const [row] = overallStockReport(products, [
      { productId: 'p1', branchId: 'wol', quantity: 9 },
      { productId: 'p1', branchId: 'blv', quantity: 0 },
    ], BRANCHES)
    expect(row.total).toBe(9)
    expect(row.state).toBe('in_stock')
    expect(row.soldOutBranches.map((b) => b.id)).toEqual(['blv'])
    expect(row.stockedBranches).toBe(1)
  })
})

describe('branchPerformance', () => {
  it('nets sales against stock cost and wages', () => {
    const out = branchPerformance({
      branch: BRANCHES[0],
      orders: [order({ total: 500 })],
      purchases: [{ quantity: 2, unitCost: 50 }],
      wages: { wage: 120, hours: 8 },
    })
    expect(out.total).toBe(500)
    expect(out.stockCost).toBe(100)
    expect(out.wageCost).toBe(120)
    expect(out.net).toBe(280)
  })
})
