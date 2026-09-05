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

// A repair is worked by the technician it was given to. Any staff member at the branch could
// previously advance anybody's job, so two people could move the same device in opposite
// directions and the history would not say who did what.
//
// The exception is a repair nobody holds yet. A device handed across the counter has to be
// booked in before an admin has assigned it to anyone, so an unassigned repair is open to the
// branch — that is the intake desk, not a loophole. The moment it is assigned it belongs to one
// person.
export function requireAssignedTechnician(actor, repair) {
  requireAuth(actor)
  if (isAdmin(actor)) return actor
  if (!repair?.tech) return actor
  if (repair.tech !== actor.id) {
    throw new AuthzError('This repair is assigned to another technician.')
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

// Records owned by a customer and addressed by their id (notifications, addresses,
// warranties). A caller may read their own; an admin may read anyone's. Asking for someone
// else's is a denial rather than an empty list, so the attempt surfaces instead of looking
// like there is simply no data.
export function scopeOwned(actor, rows, requestedOwnerId, key = 'customerId') {
  requireAuth(actor)
  if (requestedOwnerId != null) {
    requireSelfOrAdmin(actor, requestedOwnerId)
    // An admin may look up a named person's records; anyone else only their own.
    return rows.filter((r) => r[key] === requestedOwnerId)
  }
  // No owner named means "mine" — for an admin too. It used to hand an admin the entire table,
  // which put every customer's private notifications in the admin's own notification bell:
  // their unread count was the whole platform's, and the messages were addressed to somebody
  // else. An admin who wants another account's records asks for them by id.
  return rows.filter((r) => r[key] === actor.id)
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
