// Authorization primitives used by the data layer. permissions.js answers "may this role do
// this in principle?"; this module answers "may THIS caller do it to THIS record?", throws
// when the answer is no, and narrows result sets to what the caller is entitled to see.
//
// Every guard here throws rather than returning a filtered-but-empty result, so a denied
// action surfaces as an error the UI can report instead of silently doing nothing.
import { ROLES } from '@/constants/roles.js'
import { can } from '@/lib/permissions.js'

const { CUSTOMER, STAFF, ADMIN } = ROLES

export class AuthzError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthzError'
    this.code = 'forbidden'
  }
}

export function requireAuth(actor) {
  if (!actor?.id) throw new AuthzError('You must be signed in to do that.')
  return actor
}

export function requireRole(actor, ...roles) {
  requireAuth(actor)
  if (!roles.includes(actor.role)) throw new AuthzError('Your account does not have access to that.')
  return actor
}

export function requireCan(actor, action) {
  requireAuth(actor)
  if (!can(actor.role, action)) throw new AuthzError('Your account does not have access to that.')
  return actor
}

export const isAdmin = (actor) => actor?.role === ADMIN
export const isStaff = (actor) => actor?.role === STAFF
export const isCustomer = (actor) => actor?.role === CUSTOMER

// A staff member may only act within the branch they are assigned to. Admins are unscoped.
export function requireBranchScope(actor, branchId) {
  requireAuth(actor)
  if (isAdmin(actor)) return actor
  if (!actor.branch || actor.branch !== branchId) {
    throw new AuthzError('That record belongs to another branch.')
  }
  return actor
}

// Ownership check for records keyed by user id (shifts, orders, addresses).
export function requireSelfOrAdmin(actor, ownerId) {
  requireAuth(actor)
  if (isAdmin(actor)) return actor
  if (actor.id !== ownerId) throw new AuthzError('You can only access your own records.')
  return actor
}

// --- result scoping -----------------------------------------------------------------------
// These narrow a full result set to the caller's entitlement. They are applied inside the
// adapter, so a page that asks for "all repairs" as a staff member receives only its branch's
// — the filtering is not something the page can opt out of.

export function scopeRepairs(actor, repairs) {
  requireAuth(actor)
  if (isAdmin(actor)) return repairs
  if (isStaff(actor)) return repairs.filter((r) => r.branch === actor.branch)
  // Customers see only repairs booked against their own email or phone.
  return repairs.filter((r) => r.email === actor.email || (actor.phone && r.phone === actor.phone))
}

export function scopeOrders(actor, orders) {
  requireAuth(actor)
  if (isAdmin(actor)) return orders
  if (isStaff(actor)) return orders.filter((o) => o.branch === actor.branch)
  return orders.filter((o) => o.customerId === actor.id)
}

export function scopeShifts(actor, shifts) {
  requireAuth(actor)
  if (isAdmin(actor)) return shifts
  if (isStaff(actor)) return shifts.filter((s) => s.staffId === actor.id)
  throw new AuthzError('Only staff and admins can view shift records.')
}

export function scopeTradeIns(actor, tradeIns) {
  requireAuth(actor)
  if (isAdmin(actor) || isStaff(actor)) return tradeIns
  return tradeIns.filter((t) => t.customerId === actor.id)
}

// Pay rates are compensation data, and they are admin-only: what a shift is worth is decided
// by an admin at approval, not read off a rate by the person being paid. Staff records keep
// names and branches (needed for rotas and repair assignment) but never carry a rate to a
// non-admin caller — including the staff member's own record, since the rate is not theirs
// to see. Redacting rather than erroring keeps colleague lookups working.
export function redactUser(actor, user) {
  if (!user) return user
  if (isAdmin(actor)) return user
  // dailyRate is destructured too: no standing day rate exists any more, but stripping it
  // keeps any legacy record from leaking one.
  const { hourlyRate, dailyRate, ...safe } = user
  return safe
}

export function scopeUsers(actor, users) {
  requireAuth(actor)
  if (isAdmin(actor)) return users
  if (isStaff(actor)) {
    // Staff see colleagues (for rota and assignment context) and customers they serve, but
    // no pay rates at all — not a colleague's, and not their own.
    return users.map((u) => redactUser(actor, u))
  }
  // Customers get only their own record.
  return users.filter((u) => u.id === actor.id)
}
