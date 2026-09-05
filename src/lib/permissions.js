// Central permission system. UI components should call these helpers instead of
// scattering `role === 'admin'` checks — the same checks are re-applied at the
// adapter layer (src/services/adapter/mock.js) and, for Supabase, enforced again by
// Postgres RLS policies (supabase/migrations/0002_policies.sql, 0003_role_crud.sql).
// Hiding a button is a UX nicety here, never the actual security boundary.
import { ROLES } from '@/constants/roles.js'

const { CUSTOMER, STAFF, ADMIN } = ROLES

// action -> roles allowed to perform it, platform-wide (not accounting for ownership/branch scope)
const CAPABILITIES = {
  // repairs
  viewAllRepairs: [ADMIN],
  viewBranchRepairs: [STAFF, ADMIN],
  createRepairForCustomer: [STAFF, ADMIN],
  // Admin only. A technician works the job they are given but does not decide who holds it:
  // allowing reassignment from the job screen let staff pass work between themselves with no
  // rota decision behind it, including handing away a job assigned to them.
  assignTechnician: [ADMIN],
  // Staff only. Where a device has got to is recorded by the people handling it — an admin who
  // has not touched it should not be able to say it is ready for collection. The admin's part
  // in a repair is deciding who works it (assignTechnician) and reading the result.
  updateRepairStatus: [STAFF],
  // Cancelling is not a workshop step. It is a commercial decision that reaches head office as
  // often as the counter — a customer rings to call it off, a branch closes, a part is
  // discontinued — so it stays with the admin and is checked separately from progress.
  cancelRepair: [CUSTOMER, STAFF, ADMIN],
  deleteRepairDraft: [ADMIN],
  archiveRepair: [ADMIN],

  // users / staff
  manageUsers: [ADMIN],
  manageStaff: [ADMIN],
  deleteUser: [ADMIN],

  // customers
  manageCustomers: [STAFF, ADMIN],
  addCustomerNote: [STAFF, ADMIN],

  // catalogue / inventory
  manageServices: [ADMIN],
  manageProducts: [ADMIN],
  manageCategories: [ADMIN],
  manageInventory: [STAFF, ADMIN],
  transferStock: [ADMIN],
  deleteProduct: [ADMIN],

  // orders / payments
  manageOrders: [ADMIN],
  refundOrder: [ADMIN],

  // trade-ins
  viewTradeIns: [STAFF, ADMIN],
  inspectTradeIn: [STAFF, ADMIN],
  approveTradeIn: [ADMIN],
  recommendTradeInValuation: [STAFF, ADMIN],

  // branches
  manageBranches: [ADMIN],

  // shifts / timesheets
  // Staff submit their own hours; only an admin may approve, edit or reject them, and only
  // approved hours are paid (see payableShifts() in src/lib/wages.js).
  submitOwnShift: [STAFF],
  viewOwnShifts: [STAFF, ADMIN],
  viewAllShifts: [ADMIN],
  reviewShifts: [ADMIN],
  recordShiftForStaff: [ADMIN],

  // wages
  // A staff member may see their own hours and earnings; the payroll of the business —
  // everyone's rates and the total wage bill — is admin-only.
  viewOwnWages: [STAFF, ADMIN],
  viewAllWages: [ADMIN],

  // sign-in details
  // A customer and an admin own their own password outright. A staff password is issued by an
  // admin, so staff are absent here and are granted a change per occasion instead — see
  // canChangeOwnPassword() below, which is the only place that grant is interpreted.
  changeOwnPassword: [CUSTOMER, ADMIN],
  manageSignInDetails: [ADMIN],

  // platform
  manageSettings: [ADMIN],
  viewAuditLog: [ADMIN],
  viewFinancialReports: [ADMIN],
  viewStockCosts: [ADMIN],
}

export function can(role, action){
  const allowed = CAPABILITIES[action]
  if(!allowed) return false
  return allowed.includes(role)
}

// Named convenience wrappers for the most-used checks.
export const canView = (role, action)=>can(role, action)
export const canCreate = (role, action)=>can(role, action)
export const canUpdate = (role, action)=>can(role, action)
export const canDelete = (role, action)=>can(role, action)
export const canAssign = (role)=>can(role, 'assignTechnician')
export const canRefund = (role)=>can(role, 'refundOrder')
export const canManageUsers = (role)=>can(role, 'manageUsers')
export const canManageInventory = (role)=>can(role, 'manageInventory')
export const canManageSettings = (role)=>can(role, 'manageSettings')
export const canManageSignInDetails = (role)=>can(role, 'manageSignInDetails')

// May this person change their own password right now?
//
// Customers and admins always may. Staff may only when an admin has unlocked it for their
// account — either by granting a change (`changeAllowed`) or by issuing a password that must
// be replaced on first use (`mustChange`). The grant is consumed when it is used, so unlocking
// is per occasion rather than permanent.
//
// `credential` is the summary from AuthAPI.signInDetails — it carries the two flags and never
// a hash. Called from both the UI and the adapter so the rule is written once.
export function canChangeOwnPassword(user, credential){
  if(!user) return false
  if(can(user.role, 'changeOwnPassword')) return true
  if(user.role!==STAFF) return false
  return !!(credential?.changeAllowed || credential?.mustChange)
}

// Super admin: a distinct flag on top of the admin role (not a 4th ROLES value, so route
// guards/ROLE_HOME etc. don't need to know about it). Only a super admin may create another
// admin account or promote an existing account to admin — a regular admin can still manage
// customer/staff accounts freely.
export const isSuperAdmin = (user)=> user?.role===ADMIN && user?.superAdmin===true
export const canCreateAdmin = (actor)=> isSuperAdmin(actor)
export const canAssignRole = (actor, targetRole)=> targetRole===ADMIN ? isSuperAdmin(actor) : can(actor?.role, 'manageUsers')
export const isSelf = (actor, target)=> !!actor && !!target && actor.id===target.id

// Ownership / scope checks — these need the actual record, not just the role.
export const isOwnRecord = (user, record, key='customerId')=> !!user && !!record && record[key]===user.id
export const isOwnRepair = (user, repair)=> !!user && !!repair && (repair.email===user.email || repair.phone===user.phone)
export const isStaffBranch = (user, branchId)=> user?.role===ADMIN || !!(user?.branch && user.branch===branchId)

// A repair may only be self-cancelled by its customer before the device has been received.
export const CANCELLABLE_BY_CUSTOMER_BEFORE = ['Booking received', 'Awaiting device']
export function customerCanCancelRepair(repair){
  return CANCELLABLE_BY_CUSTOMER_BEFORE.includes(repair?.status)
}
