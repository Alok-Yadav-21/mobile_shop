import { describe, it, expect } from 'vitest'
import {
  can, canManageUsers, canApprove, canRefund, canManageInventory, canManageSettings,
  isOwnRecord, isOwnRepair, isStaffBranch, customerCanCancelRepair,
  isSuperAdmin, canCreateAdmin, canAssignRole, isSelf, canChangeOwnPassword,
} from './permissions.js'

describe('can / role capability checks', () => {
  it('only admin can manage users', () => {
    expect(can('admin', 'manageUsers')).toBe(true)
    expect(can('staff', 'manageUsers')).toBe(false)
    expect(can('customer', 'manageUsers')).toBe(false)
    expect(canManageUsers('admin')).toBe(true)
    expect(canManageUsers('staff')).toBe(false)
  })

  it('only admin can approve a quote on the customer\'s behalf or refund an order', () => {
    expect(canApprove('admin')).toBe(true)
    expect(canApprove('staff')).toBe(false)
    expect(canRefund('admin')).toBe(true)
    expect(canRefund('customer')).toBe(false)
  })

  it('staff and admin can manage inventory, customers cannot', () => {
    expect(canManageInventory('staff')).toBe(true)
    expect(canManageInventory('admin')).toBe(true)
    expect(canManageInventory('customer')).toBe(false)
  })

  it('unknown actions and unknown roles are denied by default', () => {
    expect(can('admin', 'notARealAction')).toBe(false)
    expect(can(undefined, 'manageUsers')).toBe(false)
    expect(canManageSettings('staff')).toBe(false)
  })
})

describe('ownership checks', () => {
  it('isOwnRecord matches on the given key', () => {
    const user = { id: 'u1' }
    expect(isOwnRecord(user, { customerId: 'u1' })).toBe(true)
    expect(isOwnRecord(user, { customerId: 'u2' })).toBe(false)
    expect(isOwnRecord(user, null)).toBe(false)
    expect(isOwnRecord(null, { customerId: 'u1' })).toBe(false)
  })

  it('isOwnRepair matches by email or phone', () => {
    const user = { email: 'alex@demo.com', phone: '07700 900123' }
    expect(isOwnRepair(user, { email: 'alex@demo.com' })).toBe(true)
    expect(isOwnRepair(user, { phone: '07700 900123' })).toBe(true)
    expect(isOwnRepair(user, { email: 'someone@else.com', phone: '000' })).toBe(false)
  })

  it('isStaffBranch: admin always passes, staff only for their own branch', () => {
    expect(isStaffBranch({ role: 'admin' }, 'wol')).toBe(true)
    expect(isStaffBranch({ role: 'staff', branch: 'wol' }, 'wol')).toBe(true)
    expect(isStaffBranch({ role: 'staff', branch: 'blv' }, 'wol')).toBe(false)
    expect(isStaffBranch({ role: 'customer' }, 'wol')).toBe(false)
  })
})

describe('super admin gating', () => {
  const superAdmin = { role: 'admin', superAdmin: true, id: 'u1' }
  const regularAdmin = { role: 'admin', id: 'u2' }
  const staff = { role: 'staff', id: 'u3' }

  it('isSuperAdmin requires both the admin role and the flag', () => {
    expect(isSuperAdmin(superAdmin)).toBe(true)
    expect(isSuperAdmin(regularAdmin)).toBe(false)
    expect(isSuperAdmin({ role: 'staff', superAdmin: true })).toBe(false)
    expect(isSuperAdmin(undefined)).toBe(false)
  })

  it('only a super admin can create an admin account', () => {
    expect(canCreateAdmin(superAdmin)).toBe(true)
    expect(canCreateAdmin(regularAdmin)).toBe(false)
    expect(canCreateAdmin(staff)).toBe(false)
  })

  it('canAssignRole requires super admin only when the target role is admin', () => {
    expect(canAssignRole(regularAdmin, 'staff')).toBe(true)
    expect(canAssignRole(regularAdmin, 'customer')).toBe(true)
    expect(canAssignRole(regularAdmin, 'admin')).toBe(false)
    expect(canAssignRole(superAdmin, 'admin')).toBe(true)
    expect(canAssignRole(staff, 'staff')).toBe(false)
  })

  it('isSelf compares by id', () => {
    expect(isSelf(superAdmin, { id: 'u1' })).toBe(true)
    expect(isSelf(superAdmin, { id: 'u2' })).toBe(false)
    expect(isSelf(null, { id: 'u1' })).toBe(false)
  })
})

describe('customerCanCancelRepair', () => {
  it('allows cancellation only before the device is received', () => {
    expect(customerCanCancelRepair({ status: 'Booking received' })).toBe(true)
    expect(customerCanCancelRepair({ status: 'Awaiting device' })).toBe(true)
    expect(customerCanCancelRepair({ status: 'Device received' })).toBe(false)
    expect(customerCanCancelRepair({ status: 'Repair in progress' })).toBe(false)
    expect(customerCanCancelRepair({ status: 'Completed' })).toBe(false)
  })
})

// --- who may change their own password -------------------------------------------------------
describe('canChangeOwnPassword', () => {
  const customer = { id: 'c1', role: 'customer' }
  const staff = { id: 's1', role: 'staff' }
  const admin = { id: 'a1', role: 'admin' }

  it('lets a customer change their own password with no grant on file', () => {
    expect(canChangeOwnPassword(customer, { changeAllowed: false, mustChange: false })).toBe(true)
  })

  it('lets an admin change their own password with no grant on file', () => {
    expect(canChangeOwnPassword(admin, { changeAllowed: false, mustChange: false })).toBe(true)
  })

  it('refuses a staff member until an admin unlocks it', () => {
    expect(canChangeOwnPassword(staff, { changeAllowed: false, mustChange: false })).toBe(false)
    expect(canChangeOwnPassword(staff, null)).toBe(false)
  })

  it('allows a staff member once an admin has unlocked it', () => {
    expect(canChangeOwnPassword(staff, { changeAllowed: true })).toBe(true)
  })

  it('allows a staff member holding a password they are required to replace', () => {
    expect(canChangeOwnPassword(staff, { changeAllowed: false, mustChange: true })).toBe(true)
  })

  it('refuses when there is no user at all', () => {
    expect(canChangeOwnPassword(null, { changeAllowed: true })).toBe(false)
  })
})

describe('assigning a technician', () => {
  // Staff could reassign a repair, including handing away a job assigned to them, straight from
  // the job screen — so work moved between technicians with no rota decision behind it.
  it('is an admin decision, not a technician one', () => {
    expect(can('admin', 'assignTechnician')).toBe(true)
    expect(can('staff', 'assignTechnician')).toBe(false)
    expect(can('customer', 'assignTechnician')).toBe(false)
  })

  it('does not stop staff working the job they hold', () => {
    expect(can('staff', 'updateRepairStatus')).toBe(true)
    expect(can('staff', 'addCustomerNote')).toBe(true)
  })
})
