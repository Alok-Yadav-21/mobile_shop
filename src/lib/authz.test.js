import { describe, it, expect } from 'vitest'
import {
  AuthzError, requireAuth, requireRole, requireCan, requireBranchScope, requireSelfOrAdmin,
  requireAssignedTechnician,
  scopeRepairs, scopeOrders, scopeShifts, scopeUsers, scopeOwned, redactUser, isAdmin, isStaff,
} from './authz.js'

const admin = { id: 'u3', role: 'admin', email: 'admin@demo.com', superAdmin: true }
const staffWol = { id: 'u2', role: 'staff', branch: 'wol', email: 'staff@demo.com', hourlyRate: 16, dailyRate: 130 } // dailyRate is legacy; redaction must still strip it
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
  it('keeps the hourly rate for an admin', () => {
    expect(redactUser(admin, staffBlv).hourlyRate).toBe(14)
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


describe('scopeOwned', () => {
  // Notifications, addresses and warranties are all addressed by customer id. Before this
  // existed, calling list() with no argument returned the whole table to any caller.
  const rows = [
    { id: 'n1', customerId: 'u1', title: 'mine' },
    { id: 'n2', customerId: 'u9', title: 'someone else' },
  ]

  it('returns only the caller own rows when no owner is named', () => {
    expect(scopeOwned(customer, rows).map((r) => r.id)).toEqual(['n1'])
  })

  it('never returns the whole table to a customer', () => {
    expect(scopeOwned(customer, rows)).toHaveLength(1)
  })

  it('refuses an explicit request for someone else rows', () => {
    expect(() => scopeOwned(customer, rows, 'u9')).toThrow(AuthzError)
  })

  it('allows a caller to name themselves', () => {
    expect(scopeOwned(customer, rows, 'u1').map((r) => r.id)).toEqual(['n1'])
  })

  // This used to assert that an admin asking for "mine" received the whole table, and the code
  // did exactly that — which is how every customer's private notification ended up in the
  // admin's own bell, with an unread count belonging to the whole platform. Asking for nobody
  // in particular means yourself, whoever you are. An admin reads another account by naming it.
  it('gives an admin their own rows when they name nobody', () => {
    expect(scopeOwned(admin, rows).map((r) => r.id)).toEqual([])
    expect(scopeOwned(admin, [...rows, { id: 'n3', customerId: 'u3' }]).map((r) => r.id)).toEqual(['n3'])
  })

  it('still lets an admin read a named account', () => {
    expect(scopeOwned(admin, rows, 'u9').map((r) => r.id)).toEqual(['n2'])
  })

  it('refuses a signed-out caller', () => {
    expect(() => scopeOwned(null, rows)).toThrow(AuthzError)
  })

  it('supports a different owner key', () => {
    const staffRows = [{ id: 'a', staffId: 'u2' }, { id: 'b', staffId: 'u6' }]
    expect(scopeOwned(staffWol, staffRows, undefined, 'staffId').map((r) => r.id)).toEqual(['a'])
  })
})

describe('capability coverage for newly guarded actions', () => {
  it('keeps catalogue and platform writes admin-only', () => {
    for (const action of ['manageServices', 'manageProducts', 'manageCategories', 'manageBranches', 'manageOrders', 'manageSettings']) {
      expect(() => requireCan(customer, action)).toThrow(AuthzError)
      expect(() => requireCan(staffWol, action)).toThrow(AuthzError)
      expect(() => requireCan(admin, action)).not.toThrow()
    }
  })

  it('lets staff touch inventory and customer notes, but not a customer', () => {
    for (const action of ['manageInventory', 'addCustomerNote', 'updateRepairStatus']) {
      expect(() => requireCan(customer, action)).toThrow(AuthzError)
      expect(() => requireCan(staffWol, action)).not.toThrow()
    }
  })
})

describe('requireAssignedTechnician', () => {
  const priya = { id: 'u4', role: 'staff', branch: 'wol' }
  const sam = { id: 'u2', role: 'staff', branch: 'wol' }
  const boss = { id: 'u3', role: 'admin' }

  // Any staff member at the branch could advance anybody's job, so two people could move the
  // same device in opposite directions and the history would not say who did what.
  it('lets the assigned technician work their own job', () => {
    expect(() => requireAssignedTechnician(priya, { tech: 'u4' })).not.toThrow()
  })

  it('refuses a colleague who was not given it', () => {
    expect(() => requireAssignedTechnician(sam, { tech: 'u4' })).toThrow(AuthzError)
  })

  // This used to leave an unassigned repair open to the whole branch, as an intake desk. It is
  // closed: until a job is given to somebody there is nobody whose job it is, and an admin
  // assigning it is the step where that is decided.
  it('refuses a job nobody has been given yet', () => {
    expect(() => requireAssignedTechnician(sam, { tech: null })).toThrow(AuthzError)
    expect(() => requireAssignedTechnician(sam, {})).toThrow(AuthzError)
  })

  it('says which of the two reasons it refused for, so the branch knows what to do', () => {
    expect(() => requireAssignedTechnician(sam, { tech: null })).toThrow(/not been assigned/i)
    expect(() => requireAssignedTechnician(sam, { tech: 'u4' })).toThrow(/assigned to a colleague/i)
  })

  it('does not stand in an admin’s way', () => {
    expect(() => requireAssignedTechnician(boss, { tech: 'u4' })).not.toThrow()
  })

  it('still requires somebody to be signed in', () => {
    expect(() => requireAssignedTechnician(null, { tech: 'u4' })).toThrow(AuthzError)
  })
})

describe('scopeOwned — whose notifications land in whose bell', () => {
  const rows = [
    { id: 'n1', customerId: 'u1', title: "customer's" },
    { id: 'n2', customerId: 'u2', title: "staff's" },
    { id: 'n3', customerId: 'u3', title: "admin's" },
  ]

  // The leak: asking for "mine" handed an admin the whole table, so every customer's private
  // notification appeared in the admin's own bell and their unread count was the platform's.
  it('gives an admin their own rows, not everybody’s', () => {
    const mine = scopeOwned(admin, rows)
    expect(mine.map((r) => r.id)).toEqual(['n3'])
  })

  it('gives staff and customers their own', () => {
    expect(scopeOwned(staffWol, rows).map((r) => r.id)).toEqual(['n2'])
    expect(scopeOwned(customer, rows).map((r) => r.id)).toEqual(['n1'])
  })

  // An admin can still look somebody up — by asking for them by name.
  it('lets an admin read a named account’s rows', () => {
    expect(scopeOwned(admin, rows, 'u1').map((r) => r.id)).toEqual(['n1'])
  })

  it('refuses anyone else asking for somebody else’s', () => {
    expect(() => scopeOwned(staffWol, rows, 'u1')).toThrow(AuthzError)
    expect(() => scopeOwned(customer, rows, 'u2')).toThrow(AuthzError)
  })

  it('lets a caller name themselves without it meaning anything different', () => {
    expect(scopeOwned(customer, rows, 'u1').map((r) => r.id)).toEqual(['n1'])
  })
})
