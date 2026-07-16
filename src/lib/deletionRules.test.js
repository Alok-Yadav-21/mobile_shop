import { describe, it, expect } from 'vitest'
import {
  customerDeleteBlockers, staffDeleteBlockers, staffActiveRepairs,
  productDeleteBlockers, categoryDeleteBlockers, branchDeleteBlockers,
} from './deletionRules.js'

describe('customerDeleteBlockers', () => {
  const customer = { id: 'u1', email: 'alex@demo.com', phone: '07700 900123' }
  it('blocks deletion when repairs/orders/trade-ins exist', () => {
    const reasons = customerDeleteBlockers(customer, {
      repairs: [{ email: 'alex@demo.com' }], orders: [{ customerId: 'u1' }], tradeIns: [{ customerId: 'u1' }],
    })
    expect(reasons).toHaveLength(3)
  })
  it('allows deletion when there is no history', () => {
    expect(customerDeleteBlockers(customer, {})).toEqual([])
  })
})

describe('staffDeleteBlockers / staffActiveRepairs', () => {
  const staff = { id: 's1', name: 'Sam Patel' }
  it('blocks on repair assignments, trade-in inspections and audit history', () => {
    const reasons = staffDeleteBlockers(staff, {
      repairs: [{ tech: 'Sam Patel' }], tradeIns: [{ inspectedBy: 's1' }], auditLogs: [{ actorId: 's1' }],
    })
    expect(reasons).toHaveLength(3)
  })
  it('allows deletion for a staff member with no activity', () => {
    expect(staffDeleteBlockers(staff, {})).toEqual([])
  })
  it('staffActiveRepairs excludes completed/cancelled jobs', () => {
    const repairs = [
      { tech: 'Sam Patel', status: 'Repair in progress' },
      { tech: 'Sam Patel', status: 'Completed' },
      { tech: 'Other Tech', status: 'Repair in progress' },
    ]
    expect(staffActiveRepairs(staff, repairs)).toHaveLength(1)
  })
})

describe('productDeleteBlockers', () => {
  const product = { id: 'p1', stock: 0 }
  it('blocks when the product has stock, orders, or stock-movement history', () => {
    const reasons = productDeleteBlockers({ ...product, stock: 3 }, {
      orders: [{ items: [{ productId: 'p1' }] }], stockMoves: [{ productId: 'p1' }],
    })
    expect(reasons).toHaveLength(3)
  })
  it('allows deletion for an unused draft product', () => {
    expect(productDeleteBlockers(product, {})).toEqual([])
  })
})

describe('categoryDeleteBlockers / branchDeleteBlockers', () => {
  it('blocks a category still used by products', () => {
    expect(categoryDeleteBlockers({ name: 'Audio' }, { products: [{ category: 'Audio' }] })).toHaveLength(1)
    expect(categoryDeleteBlockers({ name: 'Audio' }, { products: [] })).toEqual([])
  })
  it('blocks a branch with staff, repairs or orders linked', () => {
    const branch = { id: 'wol' }
    const reasons = branchDeleteBlockers(branch, {
      staff: [{ branch: 'wol' }], repairs: [{ branch: 'wol' }], orders: [{ branchId: 'wol' }],
    })
    expect(reasons).toHaveLength(3)
    expect(branchDeleteBlockers(branch, {})).toEqual([])
  })
})
