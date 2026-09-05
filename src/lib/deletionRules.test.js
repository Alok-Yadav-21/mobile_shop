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
      repairs: [{ tech: 's1' }], tradeIns: [{ inspectedBy: 's1' }], auditLogs: [{ actorId: 's1' }],
    })
    expect(reasons).toHaveLength(3)
  })
  it('allows deletion for a staff member with no activity', () => {
    expect(staffDeleteBlockers(staff, {})).toEqual([])
  })
  it('staffActiveRepairs excludes completed/cancelled jobs', () => {
    const repairs = [
      { tech: 's1', status: 'Repair in progress' },
      { tech: 's1', status: 'Completed' },
      { tech: 's2', status: 'Repair in progress' },
    ]
    expect(staffActiveRepairs(staff, repairs)).toHaveLength(1)
  })

  // These fixtures used to say `tech: 'Sam Patel'`, and passed — but nothing in the app ever
  // wrote a full name there. The seed repairs held first names ('Priya'), TECHS offered first
  // names, and Supabase held an id, so the guard matched in the test and never in production:
  // a technician with live jobs could be deleted. Assignment is an account id now, and this
  // pins it.
  it('does not match a technician by name — assignment is an account id', () => {
    const repairs = [{ tech: 'Sam Patel', status: 'Repair in progress' }]
    expect(staffActiveRepairs(staff, repairs)).toHaveLength(0)
    expect(staffDeleteBlockers(staff, { repairs })).toEqual([])
  })

  it('counts a repair assigned by id', () => {
    expect(staffActiveRepairs(staff, [{ tech: 's1', status: 'Diagnostics' }])).toHaveLength(1)
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
