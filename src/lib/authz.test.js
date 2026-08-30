import { describe, it, expect } from 'vitest'
import {
  AuthzError, requireAuth, requireRole, requireCan, requireBranchScope, requireSelfOrAdmin,
  scopeRepairs, scopeOrders, scopeShifts, scopeUsers, redactUser, isAdmin, isStaff,
} from './authz.js'

const admin = { id: 'u3', role: 'admin', email: 'admin@demo.com', superAdmin: true }
const staffWol = { id: 'u2', role: 'staff', branch: 'wol', email: 'staff@demo.com', hourlyRate: 16, dailyRate: 130 }
const staffBlv = { id: 'u6', role: 'staff', branch: 'blv', email: 'jason@demo.com', hourlyRate: 14, dailyRate: 112 }
const customer = { id: 'u1', role: 'customer', email: 'customer@demo.com', phone: '07700 900123' }

describe('requireAuth', () => {
  it('rejects a signed-out caller', () => {
    expect(() => requireAuth(null)).toThrow(AuthzError)
  })
  it('allows a signed-in caller', () => expect(requireAuth(customer)).toBe(customer))
})

describe('requireRole', () => {
  it('rejects a role that is not listed', () => {
    expect(() => requireRole(customer, 'admin')).toThrow(AuthzError)
  })
  it('allows a listed role', () => expect(requireRole(admin, 'admin')).toBe(admin))
})

describe('requireCan', () => {
  it('stops a staff member reviewing timesheets', () => {
    expect(() => requireCan(staffWol, 'reviewShifts')).toThrow(AuthzError)
  })
  it('stops a customer reading stock costs', () => {
    expect(() => requireCan(customer, 'viewStockCosts')).toThrow(AuthzError)
  })
  it('stops a staff member reading financial reports', () => {
    expect(() => requireCan(staffWol, 'viewFinancialReports')).toThrow(AuthzError)
  })
  it('lets an admin do all three', () => {
    expect(() => requireCan(admin, 'reviewShifts')).not.toThrow()
    expect(() => requireCan(admin, 'viewStockCosts')).not.toThrow()
    expect(() => requireCan(admin, 'viewFinancialReports')).not.toThrow()
  })
  it('lets a staff member submit their own hours', () => {
    expect(() => requireCan(staffWol, 'submitOwnShift')).not.toThrow()
  })
  it('does not let a customer submit hours', () => {
    expect(() => requireCan(customer, 'submitOwnShift')).toThrow(AuthzError)
  })
})

describe('requireBranchScope', () => {
  it('stops staff acting on another branch', () => {
    expect(() => requireBranchScope(staffWol, 'blv')).toThrow(AuthzError)
  })
  it('allows staff within their own branch', () => {
    expect(() => requireBranchScope(staffWol, 'wol')).not.toThrow()
  })
  it('does not scope an admin', () => {
    expect(() => requireBranchScope(admin, 'blv')).not.toThrow()
  })
})

describe('requireSelfOrAdmin', () => {
  it('stops one staff member reading a colleague', () => {
    expect(() => requireSelfOrAdmin(staffWol, staffBlv.id)).toThrow(AuthzError)
  })
  it('allows a staff member their own record', () => {
    expect(() => requireSelfOrAdmin(staffWol, staffWol.id)).not.toThrow()
  })
  it('allows an admin anyone', () => {
    expect(() => requireSelfOrAdmin(admin, staffWol.id)).not.toThrow()
  })
})

describe('scopeRepairs', () => {
  const repairs = [
    { ref: 'A', branch: 'wol', email: 'customer@demo.com', phone: '07700 900123' },
    { ref: 'B', branch: 'blv', email: 'someone@else.com', phone: '07700 111222' },
    { ref: 'C', branch: 'wol', email: 'other@person.com', phone: '07700 333444' },
  ]
  it('gives an admin every branch', () => {
    expect(scopeRepairs(admin, repairs)).toHaveLength(3)
  })
  it('limits staff to their own branch', () => {
    expect(scopeRepairs(staffWol, repairs).map((r) => r.ref)).toEqual(['A', 'C'])
  })
  it('limits a customer to repairs booked in their name', () => {
    expect(scopeRepairs(customer, repairs).map((r) => r.ref)).toEqual(['A'])
  })
  it('refuses a signed-out caller outright', () => {
    expect(() => scopeRepairs(null, repairs)).toThrow(AuthzError)
  })
})

describe('scopeOrders', () => {
  const orders = [
    { reference: '1', branch: 'wol', customerId: 'u1' },
    { reference: '2', branch: 'blv', customerId: 'u9' },
    { reference: '3', branch: 'wol', customerId: 'u9' },
  ]
  it('gives an admin everything', () => expect(scopeOrders(admin, orders)).toHaveLength(3))
  it('limits staff to their branch', () => {
    expect(scopeOrders(staffWol, orders).map((o) => o.reference)).toEqual(['1', '3'])
  })
  it('limits a customer to their own orders', () => {
    expect(scopeOrders(customer, orders).map((o) => o.reference)).toEqual(['1'])
  })
})

describe('scopeShifts', () => {
  const shifts = [
    { id: 'a', staffId: 'u2' },
    { id: 'b', staffId: 'u6' },
  ]
  it('gives an admin every timesheet', () => expect(scopeShifts(admin, shifts)).toHaveLength(2))
  it('limits a staff member to their own', () => {
    expect(scopeShifts(staffWol, shifts).map((s) => s.id)).toEqual(['a'])
  })
  it('refuses a customer entirely', () => {
    expect(() => scopeShifts(customer, shifts)).toThrow(AuthzError)
  })
})

describe('redactUser', () => {
  it('strips a colleague pay rate from a staff view', () => {
    expect(redactUser(staffWol, staffBlv)).not.toHaveProperty('hourlyRate')
  })
  it('strips a staff member OWN rate too — rates are an admin decision, not theirs to read', () => {
    const out = redactUser(staffWol, staffWol)
    expect(out).not.toHaveProperty('hourlyRate')
    expect(out).not.toHaveProperty('dailyRate')
  })
  it('strips the day rate as well as the hourly one', () => {
    expect(redactUser(staffWol, staffBlv)).not.toHaveProperty('dailyRate')
  })
  it('keeps every rate for an admin', () => {
    expect(redactUser(admin, staffBlv).hourlyRate).toBe(14)
    expect(redactUser(admin, staffBlv).dailyRate).toBe(112)
  })
  it('keeps the rest of the record intact when redacting', () => {
    const out = redactUser(staffWol, staffBlv)
    expect(out.name ?? out.id).toBeDefined()
    expect(out.branch).toBe('blv')
  })
})

describe('scopeUsers', () => {
  const users = [admin, staffWol, staffBlv, customer]
  it('gives an admin the full directory with rates', () => {
    const out = scopeUsers(admin, users)
    expect(out).toHaveLength(4)
    expect(out.find((u) => u.id === 'u6').hourlyRate).toBe(14)
  })
  it('lets staff see colleagues but no pay rates at all, their own included', () => {
    const out = scopeUsers(staffWol, users)
    expect(out).toHaveLength(4)
    expect(out.find((u) => u.id === 'u6')).not.toHaveProperty('hourlyRate')
    expect(out.find((u) => u.id === 'u2')).not.toHaveProperty('hourlyRate')
    expect(out.find((u) => u.id === 'u2')).not.toHaveProperty('dailyRate')
  })
  it('limits a customer to their own record', () => {
    const out = scopeUsers(customer, users)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('u1')
  })
})

describe('role predicates', () => {
  it('identifies roles', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(staffWol)).toBe(false)
    expect(isStaff(staffWol)).toBe(true)
    expect(isAdmin(null)).toBe(false)
  })
})
