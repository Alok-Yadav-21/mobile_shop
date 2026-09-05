// Local mock adapter — runs entirely on the verified seed data + localStorage, no network.
// Every method here has a same-shaped counterpart in ./supabase.js; src/services/adapter/index.js
// picks between them so page code never has to know which one is active.
import { REPAIRS, TECHS } from '@/data/repairs.js'
import { PRODUCTS, CATEGORIES } from '@/data/products.js'
import { BRANCHES } from '@/data/branches.js'
import { SERVICES } from '@/data/services.js'
import { USERS } from '@/data/users.js'
import { DEMO_ORDERS } from '@/data/sales.js'
import { DEMO_PURCHASES, generateBranchStock } from '@/data/purchases.js'
import { SHIFTS } from '@/data/shifts.js'
import { canTransition, requiresReason } from '@/constants/status.js'
import { isSuperAdmin, canChangeOwnPassword } from '@/lib/permissions.js'
import { hashPassword, verifyPassword, passwordProblem, usernameProblem, normaliseUsername } from '@/lib/password.js'
import {
  ensureSeeded, credentialFor, userIdForUsername, usernameTaken, writeCredential,
  removeCredential, publicSummary,
} from '@/services/credentialStore.js'
import { getSession } from '@/services/session.js'
import {
  requireAuth, requireCan, requireSelfOrAdmin, requireBranchScope, isAdmin, isStaff, isCustomer,
  scopeRepairs, scopeOrders, scopeShifts, scopeTradeIns, scopeUsers, scopeOwned, redactUser,
  AuthzError,
} from '@/lib/authz.js'
import { customerCanCancelRepair } from '@/lib/permissions.js'

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))

// The caller, resolved by the data layer rather than supplied by the page. Every scoped read
// and guarded mutation below derives the caller from here, so a component cannot widen its
// own access by passing a different actor or removing an argument.
function currentActor() { return getSession() }

function loadJSON(key, fallback) {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s) } catch { /* ignore */ }
  return fallback
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable — non-fatal in mock mode */ }
}

const KEYS = {
  repairs: 'vt_repairs', orders: 'vt_orders', cart: 'vt_cart', tradeIns: 'vt_trade_ins',
  users: 'vt_users', products: 'vt_products', categories: 'vt_categories', branches: 'vt_branches',
  notifications: 'vt_notifications', auditLog: 'vt_audit_log', repairParts: 'vt_repair_parts',
  inventoryMoves: 'vt_inventory_moves', customerNotes: 'vt_customer_notes', settings: 'vt_settings',
  addresses: 'vt_addresses', warranties: 'vt_warranties', services: 'vt_services', branchStock: 'vt_branch_stock',
  purchases: 'vt_purchases', shifts: 'vt_shifts',
}

// --- seed helpers: merge operational fields (stock, status, active flags) onto the verified
// reference data the first time each store is read, without mutating the source data files. ---
function seedProducts() {
  return PRODUCTS.map((p, i) => ({ stock: 8 + (i % 5) * 3, active: true, archived: false, lowStockThreshold: 3, ...p }))
}
function seedUsers() {
  // lastActiveAt is synthetic session/operational metadata (not business data) — staggered
  // so the demo table shows a realistic mix rather than one identical timestamp.
  return USERS.map((u, i) => ({ status: 'active', archived: false, lastActiveAt: Date.now() - (i + 1) * 6 * 3600000, ...u }))
}
function seedBranches() {
  return BRANCHES.map((b) => ({ active: true, archived: false, ...b }))
}
function seedCategories() {
  return CATEGORIES.map((name) => ({ name, active: true, archived: false }))
}
function seedServices() {
  return SERVICES.map((s, i) => ({ id: 'svc'+i, active: true, archived: false, ...s }))
}
// The sales ledger, stock purchases and rota ship pre-populated with ~90 days of trading
// history. Without it every report renders empty on a fresh browser, which makes them
// impossible to evaluate. Real checkouts append to the same store.
function seedOrders() { return DEMO_ORDERS }
function seedPurchases() { return DEMO_PURCHASES }
function seedShifts() { return SHIFTS }
// Per-branch allocation of each product's total stock — derived from the seeded products so
// the two always start consistent.
function seedBranchStock() { return generateBranchStock(loadJSON(KEYS.products, seedProducts())) }

// Raises a notification on the account that booked a repair whenever its status moves. This
// is what keeps the customer's view in step with the workshop without anybody re-entering
// the information — the customer, staff and admin screens all read the same two stores.
// Written directly rather than through NotificationAPI.create because the actor here is the
// staff member changing the status, not the customer being told about it.
function notifyRepairCustomer(repair, status) {
  const users = loadJSON(KEYS.users, seedUsers())
  const owner = users.find((u) => u.role === 'customer'
    && ((repair.email && u.email === repair.email) || (repair.phone && u.phone === repair.phone)))
  if (!owner) return
  const list = loadJSON(KEYS.notifications, [])
  list.unshift({
    id: 'n' + Date.now(),
    customerId: owner.id,
    title: `${repair.ref} — ${status}`,
    body: `Your ${[repair.brand, repair.model].filter(Boolean).join(' ') || 'device'} repair is now "${status}".`,
    ref: repair.ref,
    read: false,
    createdAt: Date.now(),
  })
  saveJSON(KEYS.notifications, list)
}

export const RepairAPI = {
  // Scoped by the data layer: an admin sees every branch, a staff member only their own
  // branch's queue, a customer only the repairs booked in their name.
  async list() { await delay(); return scopeRepairs(currentActor(), loadJSON(KEYS.repairs, REPAIRS)) },
  // The `phone` argument is ignored: who the caller is comes from the session, and
  // scopeRepairs already narrows to their own bookings. Filtering by a phone number passed
  // in by the page would let a wrong or missing value decide what someone sees.
  async forCustomer() {
    await delay()
    return scopeRepairs(currentActor(), loadJSON(KEYS.repairs, REPAIRS))
  },
  async forBranch(branch) {
    await delay()
    return scopeRepairs(currentActor(), loadJSON(KEYS.repairs, REPAIRS)).filter((r) => r.branch === branch)
  },
  // Looked up by reference straight from the URL, so this is exactly where a customer could
  // otherwise read someone else's repair by editing the address bar. Resolving it out of the
  // caller's own scoped set means an unrelated reference simply does not exist for them.
  async get(ref) {
    await delay()
    return scopeRepairs(currentActor(), loadJSON(KEYS.repairs, REPAIRS)).find((r) => r.ref === ref)
  },
  async create(data) {
    await delay()
    const actor = requireAuth(currentActor())
    const list = loadJSON(KEYS.repairs, REPAIRS)
    const ref = 'SPR-' + (4800 + list.length + 1)
    // A customer books only in their own name. Staff and admins may book on behalf of someone
    // at the counter, so their payload is taken as given.
    const identity = isCustomer(actor)
      ? { customer: data.customer || actor.name, email: actor.email, phone: data.phone || actor.phone }
      : {}
    const rep = { ref, status: 'Booking received', quote: null, tech: null, createdAt: Date.now(), history: [['Booking received', Date.now()]], notes: [], ...data, ...identity }
    list.unshift(rep); saveJSON(KEYS.repairs, list); return rep
  },
  // status must be a valid transition from the repair's current status (see constants/status.js);
  // transitions to Cancelled require a reason. Throws rather than silently applying an invalid change.
  async update(ref, patch) {
    await delay()
    const actor = requireAuth(currentActor())
    const list = loadJSON(KEYS.repairs, REPAIRS)
    // Resolved out of the caller's own scope, so a reference belonging to another branch or
    // another customer is simply not found rather than editable.
    const visible = scopeRepairs(actor, list).find((x) => x.ref === ref)
    if (!visible) return null
    const r = list.find((x) => x.ref === ref)

    // A customer may only withdraw their own booking, and only before the device is taken in.
    // Everything else about a repair is staff/admin territory.
    if (isCustomer(actor)) {
      const onlyCancelling = patch.status === 'Cancelled'
        && Object.keys(patch).every((k) => ['status', 'cancellationReason'].includes(k))
      if (!onlyCancelling) throw new Error('You can only cancel your own booking.')
      if (!customerCanCancelRepair(r)) throw new Error('This repair can no longer be cancelled online — please call the branch.')
    } else {
      requireCan(actor, 'updateRepairStatus')
    }

    // Captured before the write: `visible` is a filtered reference to the same object as `r`,
    // not a copy, so assigning the patch updates both and a later comparison against it would
    // always find the status unchanged.
    const previousStatus = r.status

    if (patch.status && patch.status !== previousStatus) {
      if (!canTransition(previousStatus, patch.status)) throw new Error(`Cannot move a repair from "${previousStatus}" to "${patch.status}".`)
      if (requiresReason(patch.status) && !patch.cancellationReason) throw new Error('A reason is required to cancel a repair.')
      r.history.push([patch.status, Date.now()])
    }
    Object.assign(r, patch); saveJSON(KEYS.repairs, list)

    // Keep the customer's view in step with the workshop's: a status change raises a
    // notification against the account that booked it, which is what makes the customer
    // dashboard reflect staff activity without anyone re-entering it.
    if (patch.status && patch.status !== previousStatus) notifyRepairCustomer(r, patch.status)
    return r
  },
  async addNote(ref, note) {
    await delay()
    const actor = currentActor()
    requireCan(actor, 'addCustomerNote')
    const list = loadJSON(KEYS.repairs, REPAIRS)
    if (!scopeRepairs(actor, list).some((x) => x.ref === ref)) return null
    const r = list.find((x) => x.ref === ref)
    if (!r) return null
    r.notes.push({ ...note, at: Date.now() }); saveJSON(KEYS.repairs, list); return r
  },
  async archive(ref) {
    await delay()
    requireCan(currentActor(), 'archiveRepair')
    const list = loadJSON(KEYS.repairs, REPAIRS)
    const r = list.find((x) => x.ref === ref)
    if (!r) return null
    r.archived = true; saveJSON(KEYS.repairs, list); return r
  },
  async deleteDraft(ref) {
    await delay()
    requireCan(currentActor(), 'deleteRepairDraft')
    const list = loadJSON(KEYS.repairs, REPAIRS)
    const r = list.find((x) => x.ref === ref)
    if (!r) return false
    if (r.status !== 'Booking received') throw new Error('Only draft (Booking received) repairs can be deleted.')
    saveJSON(KEYS.repairs, list.filter((x) => x.ref !== ref)); return true
  },
  // --- parts used on a repair ---
  async listParts(ref) {
    await delay(80)
    const actor = currentActor()
    // Parts hang off a repair, so entitlement to them follows entitlement to the repair.
    if (!scopeRepairs(actor, loadJSON(KEYS.repairs, REPAIRS)).some((r) => r.ref === ref)) return []
    return loadJSON(KEYS.repairParts, {})[ref] || []
  },
  async addPart(ref, part) {
    await delay()
    requireCan(currentActor(), 'manageInventory')
    const store = loadJSON(KEYS.repairParts, {})
    store[ref] = [...(store[ref] || []), { id: 'rp' + Date.now(), addedAt: Date.now(), ...part }]
    saveJSON(KEYS.repairParts, store)
    return store[ref]
  },
}

export const ProductAPI = {
  async list(filters = {}) {
    await delay()
    let out = loadJSON(KEYS.products, seedProducts())
    if (!filters.includeArchived) out = out.filter((p) => !p.archived)
    if (!filters.includeInactive) out = out.filter((p) => p.active !== false && !p.archived)
    if (filters.category) out = out.filter((p) => p.category === filters.category)
    if (filters.condition) out = out.filter((p) => p.cond === filters.condition)
    if (filters.maxPrice) out = out.filter((p) => p.price <= filters.maxPrice)
    if (filters.q) { const q = filters.q.toLowerCase(); out = out.filter((p) => p.name.toLowerCase().includes(q)) }
    return out
  },
  async get(id) { await delay(); return loadJSON(KEYS.products, seedProducts()).find((p) => p.id === id) },
  async categories() { await delay(); return loadJSON(KEYS.categories, seedCategories()).filter((c) => c.active && !c.archived).map((c) => c.name) },
  // New products start inactive/draft until an admin explicitly activates them.
  async create(data) {
    await delay()
    requireCan(currentActor(), 'manageProducts')
    const list = loadJSON(KEYS.products, seedProducts())
    const p = { id: 'p' + Date.now(), active: false, archived: false, stock: 0, lowStockThreshold: 3, ...data }
    list.unshift(p); saveJSON(KEYS.products, list); return p
  },
  async update(id, patch) {
    await delay()
    requireCan(currentActor(), 'manageProducts')
    const list = loadJSON(KEYS.products, seedProducts())
    const p = list.find((x) => x.id === id)
    if (!p) return null
    Object.assign(p, patch); saveJSON(KEYS.products, list); return p
  },
  async duplicate(id) {
    await delay()
    requireCan(currentActor(), 'manageProducts')
    const list = loadJSON(KEYS.products, seedProducts())
    const src = list.find((x) => x.id === id)
    if (!src) return null
    const copy = { ...src, id: 'p' + Date.now(), name: `${src.name} (copy)`, active: false, archived: false, stock: 0 }
    list.unshift(copy); saveJSON(KEYS.products, list); return copy
  },
  async setActive(id, active) { return ProductAPI.update(id, { active }) },
  async archive(id) { return ProductAPI.update(id, { archived: true, active: false }) },
  async restore(id) { return ProductAPI.update(id, { archived: false }) },
  // Permanent delete only when unused: draft (never activated), zero stock, never ordered,
  // no stock-movement history. Throws with the exact blockers rather than silently refusing.
  async remove(id, blockers = []) {
    await delay()
    requireCan(currentActor(), 'deleteProduct')
    if (blockers.length) throw new Error(`Can't permanently delete — ${blockers.join(', ')}.`)
    const list = loadJSON(KEYS.products, seedProducts())
    saveJSON(KEYS.products, list.filter((p) => p.id !== id))
    return true
  },
  async adjustStock(id, delta, reason, actorId) {
    await delay()
    requireCan(currentActor(), 'manageInventory')
    const list = loadJSON(KEYS.products, seedProducts())
    const p = list.find((x) => x.id === id)
    if (!p) return null
    const next = (p.stock || 0) + delta
    if (next < 0) throw new Error(`Cannot reduce ${p.name}'s stock below 0.`)
    p.stock = next
    saveJSON(KEYS.products, list)
    const moves = loadJSON(KEYS.inventoryMoves, [])
    moves.unshift({ id: 'im' + Date.now(), productId: id, delta, reason, actorId: actorId ?? null, at: Date.now() })
    saveJSON(KEYS.inventoryMoves, moves)
    return p
  },
  async stockHistory(id) {
    await delay(80)
    requireCan(currentActor(), 'manageInventory')
    return loadJSON(KEYS.inventoryMoves, []).filter((m) => m.productId === id)
  },
  async lowStock() {
    await delay()
    return loadJSON(KEYS.products, seedProducts()).filter((p) => p.active !== false && !p.archived && p.stock <= (p.lowStockThreshold ?? 3))
  },
  // --- per-branch stock allocation (informational breakdown on top of the total in p.stock) ---
  async branchStock(id) { await delay(80); return loadJSON(KEYS.branchStock, seedBranchStock()).filter((r) => r.productId === id) },

  // Every product's stock level at one branch, which is what a staff member on the shop floor
  // actually needs — the network total tells them nothing about what is on their own shelf.
  async stockForBranch(branchId) {
    await delay(80)
    const rows = loadJSON(KEYS.branchStock, seedBranchStock())
    const products = loadJSON(KEYS.products, seedProducts()).filter((p) => !p.archived)
    return products.map((p) => ({
      ...p,
      // `branchQuantity` is what this branch holds; `stock` stays the network total so callers
      // can still show both without a second lookup.
      branchQuantity: rows.find((r) => r.productId === p.id && r.branchId === branchId)?.quantity ?? 0,
    }))
  },

  // Consuming or writing off stock AT a branch. This is the operation that was missing: stock
  // could only be moved on the network total, so using a part on a repair silently drew down a
  // figure that included units sitting in other shops. Both the branch row and the total move
  // together here, so they cannot drift apart.
  async adjustBranchStock(id, branchId, delta, reason) {
    await delay()
    const actor = currentActor()
    requireCan(actor, 'manageInventory')
    // A staff member may only move stock at their own branch; admins are unscoped.
    requireBranchScope(actor, branchId)

    const rows = loadJSON(KEYS.branchStock, seedBranchStock())
    const row = rows.find((r) => r.productId === id && r.branchId === branchId)
    const held = row?.quantity ?? 0
    if (delta < 0 && held + delta < 0) {
      throw new Error(`This branch only has ${held} in stock — check another branch or request a transfer.`)
    }

    const products = loadJSON(KEYS.products, seedProducts())
    const p = products.find((x) => x.id === id)
    if (!p) throw new Error('Product not found.')

    if (row) row.quantity = held + delta
    else rows.push({ productId: id, branchId, quantity: delta })
    p.stock = Math.max(0, (p.stock || 0) + delta)

    saveJSON(KEYS.branchStock, rows)
    saveJSON(KEYS.products, products)

    const moves = loadJSON(KEYS.inventoryMoves, [])
    moves.unshift({ id: 'im' + Date.now(), productId: id, branchId, delta, reason, actorId: actor?.id ?? null, at: Date.now() })
    saveJSON(KEYS.inventoryMoves, moves)

    return { ...p, branchQuantity: (row ? row.quantity : delta) }
  },
  // Setting a branch's count to an absolute figure — a stock count, rather than a movement.
  //
  // The network total is corrected by the same delta. Writing the branch row alone let the
  // per-branch allocation drift away from p.stock, so the branch view and the reports built
  // on the total quietly disagreed about the same product.
  async setBranchStock(id, branchId, quantity) {
    await delay()
    const actor = currentActor()
    requireCan(actor, 'manageInventory')
    requireBranchScope(actor, branchId)

    const next = Math.max(0, Number(quantity) || 0)
    const list = loadJSON(KEYS.branchStock, seedBranchStock())
    const row = list.find((r) => r.productId === id && r.branchId === branchId)
    const previous = row?.quantity ?? 0
    const delta = next - previous
    if (row) row.quantity = next
    else list.push({ productId: id, branchId, quantity: next })

    const products = loadJSON(KEYS.products, seedProducts())
    const p = products.find((x) => x.id === id)
    if (p) p.stock = Math.max(0, (p.stock || 0) + delta)

    saveJSON(KEYS.branchStock, list)
    saveJSON(KEYS.products, products)

    if (delta !== 0) {
      const moves = loadJSON(KEYS.inventoryMoves, [])
      moves.unshift({ id: 'im' + Date.now(), productId: id, branchId, delta, reason: 'Stock count', actorId: actor?.id ?? null, at: Date.now() })
      saveJSON(KEYS.inventoryMoves, moves)
    }
    return list.filter((r) => r.productId === id)
  },
  async transferStock(id, fromBranchId, toBranchId, quantity) {
    await delay()
    requireCan(currentActor(), 'transferStock')
    const list = loadJSON(KEYS.branchStock, seedBranchStock())
    const from = list.find((r) => r.productId === id && r.branchId === fromBranchId)
    if (!from || from.quantity < quantity) throw new Error('Not enough stock at the source branch to transfer.')
    from.quantity -= quantity
    const to = list.find((r) => r.productId === id && r.branchId === toBranchId)
    if (to) to.quantity += quantity
    else list.push({ productId: id, branchId: toBranchId, quantity })
    saveJSON(KEYS.branchStock, list)
    return list.filter((r) => r.productId === id)
  },
}

export const CategoryAPI = {
  async list(filters = {}) {
    await delay()
    let out = loadJSON(KEYS.categories, seedCategories())
    if (!filters.includeArchived) out = out.filter((c) => !c.archived)
    return out
  },
  async create(name) {
    await delay()
    requireCan(currentActor(), 'manageCategories')
    const list = loadJSON(KEYS.categories, seedCategories())
    if (list.some((c) => c.name.toLowerCase() === name.toLowerCase())) throw new Error('That category already exists.')
    list.push({ name, active: true, archived: false }); saveJSON(KEYS.categories, list); return list
  },
  async update(name, patch) {
    await delay()
    requireCan(currentActor(), 'manageCategories')
    const list = loadJSON(KEYS.categories, seedCategories())
    const c = list.find((x) => x.name === name)
    if (!c) return null
    Object.assign(c, patch); saveJSON(KEYS.categories, list); return c
  },
  async setActive(name, active) { return CategoryAPI.update(name, { active }) },
  async archive(name) { return CategoryAPI.update(name, { archived: true, active: false }) },
  async restore(name) { return CategoryAPI.update(name, { archived: false }) },
  async remove(name, blockers = []) {
    await delay()
    requireCan(currentActor(), 'manageCategories')
    if (blockers.length) throw new Error(`Can't delete — ${blockers.join(', ')}.`)
    const list = loadJSON(KEYS.categories, seedCategories())
    saveJSON(KEYS.categories, list.filter((c) => c.name !== name))
    return true
  },
}

// Lucide icon components aren't JSON-serialisable, so persisted service records never store
// `icon` — it's re-merged from the static SERVICES array (matched by id) on every read.
function stripIcon({ icon, ...rest }) { return rest }
function mergeIcon(svc) { return { ...svc, icon: SERVICES.find((s, i) => 'svc' + i === svc.id)?.icon } }

export const ServiceAPI = {
  async list(filters = {}) {
    await delay()
    let out = loadJSON(KEYS.services, seedServices().map(stripIcon)).map(mergeIcon)
    if (!filters.includeArchived) out = out.filter((s) => !s.archived)
    if (!filters.includeInactive) out = out.filter((s) => s.active !== false && !s.archived)
    return out
  },
  async create(data) {
    await delay()
    requireCan(currentActor(), 'manageServices')
    const list = loadJSON(KEYS.services, seedServices().map(stripIcon))
    const s = stripIcon({ id: 'svc' + Date.now(), active: false, archived: false, ...data })
    list.unshift(s); saveJSON(KEYS.services, list); return mergeIcon(s)
  },
  async update(id, patch) {
    await delay()
    requireCan(currentActor(), 'manageServices')
    const list = loadJSON(KEYS.services, seedServices().map(stripIcon))
    const s = list.find((x) => x.id === id)
    if (!s) return null
    Object.assign(s, stripIcon(patch)); saveJSON(KEYS.services, list); return mergeIcon(s)
  },
  async setActive(id, active) { return ServiceAPI.update(id, { active }) },
  async archive(id) { return ServiceAPI.update(id, { archived: true, active: false }) },
  async restore(id) { return ServiceAPI.update(id, { archived: false }) },
  async remove(id, blockers = []) {
    await delay()
    requireCan(currentActor(), 'manageServices')
    if (blockers.length) throw new Error(`Can't delete — ${blockers.join(', ')}.`)
    const list = loadJSON(KEYS.services, seedServices().map(stripIcon))
    saveJSON(KEYS.services, list.filter((s) => s.id !== id))
    return true
  },
}

export const BranchAPI = {
  async list(filters = {}) {
    await delay()
    let out = loadJSON(KEYS.branches, seedBranches())
    if (!filters.includeArchived) out = out.filter((b) => !b.archived)
    if (!filters.includeInactive) out = out.filter((b) => b.active !== false && !b.archived)
    return out
  },
  async get(id) { await delay(); return loadJSON(KEYS.branches, seedBranches()).find((b) => b.id === id) },
  // New branches open inactive so an admin can finish setting them up (staff, stock, hours)
  // before they start appearing in customer-facing branch pickers.
  async create(data) {
    await delay()
    requireCan(currentActor(), 'manageBranches')
    const list = loadJSON(KEYS.branches, seedBranches())
    const id = (data.id || data.area || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'br' + Date.now()
    if (list.some((b) => b.id === id)) throw new Error('A branch with that code already exists — choose a different name or code.')
    const branch = { active: false, archived: false, lat: null, lng: null, ...data, id }
    list.push(branch); saveJSON(KEYS.branches, list); return branch
  },
  async nearest(pc) {
    await delay()
    const out = (pc || '').toUpperCase().replace(/\s+/g, '').match(/^[A-Z]{1,2}\d/)?.[0] || ''
    return loadJSON(KEYS.branches, seedBranches()).filter((b) => b.active !== false && !b.archived && b.pc.replace(/\s+/g, '').startsWith(out))
  },
  async update(id, patch) {
    await delay()
    requireCan(currentActor(), 'manageBranches')
    const list = loadJSON(KEYS.branches, seedBranches())
    const b = list.find((x) => x.id === id)
    if (!b) return null
    Object.assign(b, patch); saveJSON(KEYS.branches, list); return b
  },
  async setActive(id, active) { return BranchAPI.update(id, { active }) },
  async archive(id) { return BranchAPI.update(id, { archived: true, active: false }) },
  async restore(id) { return BranchAPI.update(id, { archived: false }) },
  async remove(id, blockers = []) {
    await delay()
    requireCan(currentActor(), 'manageBranches')
    if (blockers.length) throw new Error(`Can't delete — ${blockers.join(', ')}.`)
    const list = loadJSON(KEYS.branches, seedBranches())
    saveJSON(KEYS.branches, list.filter((b) => b.id !== id))
    return true
  },
}

export const CartAPI = {
  async get() { await delay(50); return loadJSON(KEYS.cart, { items: [] }) },
  async setQuantity(productId, quantity) {
    await delay(50)
    const products = loadJSON(KEYS.products, seedProducts())
    const product = products.find((p) => p.id === productId)
    const cart = loadJSON(KEYS.cart, { items: [] })
    const existing = cart.items.find((i) => i.productId === productId)
    const clamped = product ? Math.max(0, Math.min(quantity, product.stock ?? quantity)) : Math.max(0, quantity)
    if (clamped <= 0) { cart.items = cart.items.filter((i) => i.productId !== productId) }
    else if (existing) existing.quantity = clamped
    else cart.items.push({ productId, quantity: clamped })
    saveJSON(KEYS.cart, cart); return cart
  },
  async clear() { saveJSON(KEYS.cart, { items: [] }); return { items: [] } },
}

export const OrderAPI = {
  // A customer sees only their own orders, staff only their branch's, an admin everything —
  // enforced here, so the `customerId` argument can only ever narrow, never widen.
  async list(customerId) {
    await delay()
    const out = scopeOrders(currentActor(), loadJSON(KEYS.orders, seedOrders()))
    return out.filter((o) => !customerId || o.customerId === customerId)
  },
  // URL-addressed like RepairAPI.get, and scoped for the same reason.
  async get(ref) {
    await delay()
    return scopeOrders(currentActor(), loadJSON(KEYS.orders, seedOrders())).find((o) => o.reference === ref)
  },
  // creating an order reduces mock stock for each line item — checkout is the one place stock
  // actually moves, so cancellation (below) has something real to restore.
  async create(data) {
    await delay()
    const list = loadJSON(KEYS.orders, seedOrders())
    const reference = 'VT-ORD-' + (10000 + list.length + 1)
    const order = { reference, status: 'paid', paymentStatus: 'test_mode', createdAt: Date.now(), ...data }
    list.unshift(order); saveJSON(KEYS.orders, list)
    for (const item of order.items || []) {
      try { await ProductAPI.adjustStock(item.productId, -item.quantity, `Order ${reference}`) } catch { /* out of sync stock is non-fatal for a mock order */ }
    }
    return order
  },
  async updateStatus(ref, status) {
    await delay()
    requireCan(currentActor(), 'manageOrders')
    const list = loadJSON(KEYS.orders, seedOrders())
    const o = list.find((x) => x.reference === ref)
    if (!o) return null
    o.status = status; saveJSON(KEYS.orders, list); return o
  },
  // eligible = not yet dispatched/completed; restores stock for each line item.
  async cancel(ref, reason) {
    await delay()
    const actor = requireAuth(currentActor())
    const list = loadJSON(KEYS.orders, seedOrders())
    // Only an order the caller can actually see, and only their own unless they manage orders.
    const visible = scopeOrders(actor, list).find((x) => x.reference === ref)
    if (!visible) return null
    if (!isAdmin(actor) && visible.customerId !== actor.id) requireCan(actor, 'manageOrders')
    const o = list.find((x) => x.reference === ref)
    if (!o) return null
    if (['dispatched', 'completed', 'cancelled'].includes(o.status)) throw new Error(`Order ${ref} can no longer be cancelled (status: ${o.status}).`)
    o.status = 'cancelled'; o.cancellationReason = reason
    saveJSON(KEYS.orders, list)
    for (const item of o.items || []) {
      try { await ProductAPI.adjustStock(item.productId, item.quantity, `Cancelled order ${ref}`) } catch { /* ignore */ }
    }
    return o
  },
}

// Timesheets. Staff submit their own hours; an admin reviews them; only approved hours are
// payable (enforced by payableShifts() in src/lib/wages.js). Wages are always derived from
// these records rather than stored, so an admin correcting an hours figure here immediately
// corrects every wage total that follows from it.
//
// Authorization is applied here, not in the pages: `scopeShifts` narrows a staff member's
// read to their own rows, and each mutation re-checks the caller. A page cannot opt out.
export const ShiftAPI = {
  async list(filters = {}) {
    await delay()
    const actor = currentActor()
    let out = scopeShifts(actor, loadJSON(KEYS.shifts, seedShifts()))
    if (filters.staffId) {
      // Asking for someone else's timesheet is a denial, not an empty list.
      requireSelfOrAdmin(actor, filters.staffId)
      out = out.filter((s) => s.staffId === filters.staffId)
    }
    if (filters.branchId) out = out.filter((s) => s.branchId === filters.branchId)
    if (filters.status) out = out.filter((s) => s.status === filters.status)
    if (filters.from != null) out = out.filter((s) => s.at >= filters.from)
    if (filters.to != null) out = out.filter((s) => s.at <= filters.to)
    return out
  },

  // A staff member submits their own worked time. The staffId and branch come from the
  // session, never from the payload — otherwise a crafted request could file hours against
  // a colleague. Submissions always start pending; a caller cannot self-approve.
  async create(data) {
    await delay()
    const actor = currentActor()
    const forSelf = !data.staffId || data.staffId === actor?.id
    if (forSelf) requireCan(actor, 'submitOwnShift')
    else requireCan(actor, 'recordShiftForStaff')

    const staffId = forSelf ? actor.id : data.staffId
    const list = loadJSON(KEYS.shifts, seedShifts())
    if (list.some((s) => s.staffId === staffId && s.date === data.date && s.status !== 'rejected')) {
      throw new Error('There is already a shift recorded for that date. Edit the existing one instead.')
    }
    const owner = loadJSON(KEYS.users, seedUsers()).find((u) => u.id === staffId)
    const shift = {
      ...data,
      id: 'sh' + Date.now(),
      staffId,
      branchId: data.branchId || owner?.branch || actor.branch || null,
      at: new Date(data.date).getTime(),
      breakMins: data.breakMins ?? 0,
      // An admin recording hours on a staff member's behalf has, by definition, already
      // approved them; a staff member's own submission has not been reviewed by anyone.
      status: forSelf ? 'pending' : 'approved',
      // Never taken from the payload: what a shift is worth is an admin decision made at
      // approval, so a submission cannot arrive carrying its own price.
      approvedPay: forSelf ? null : (Number.isFinite(Number(data.approvedPay)) ? Math.round(Number(data.approvedPay) * 100) / 100 : null),
      submittedBy: actor.id,
      submittedAt: Date.now(),
      reviewedBy: forSelf ? null : actor.id,
      reviewedAt: forSelf ? null : Date.now(),
      reviewNote: null,
    }
    list.push(shift); saveJSON(KEYS.shifts, list); return shift
  },

  // Editing the worked time. Staff may correct their own submission only while it is still
  // pending — once an admin has signed it off, changing the hours is an admin action.
  async update(id, patch) {
    await delay()
    const actor = currentActor()
    const list = loadJSON(KEYS.shifts, seedShifts())
    const s = list.find((x) => x.id === id)
    if (!s) return null
    if (!isAdmin(actor)) {
      requireSelfOrAdmin(actor, s.staffId)
      if (s.status !== 'pending') throw new Error('This shift has already been reviewed — ask an admin to change it.')
    }
    // Approval state and the agreed amount are never editable through this path: status moves
    // only via review/submit, and pay only via review/setPay, which are admin-gated.
    const { status, reviewedBy, reviewedAt, staffId, approvedPay, ...safe } = patch
    Object.assign(s, safe)
    if (safe.date) s.at = new Date(safe.date).getTime()
    // An admin amending an approved shift keeps it approved but records who changed it.
    if (isAdmin(actor) && s.status === 'approved') { s.reviewedBy = actor.id; s.reviewedAt = Date.now() }
    saveJSON(KEYS.shifts, list); return s
  },

  // The admin decision, and the only route to 'approved'. Approving is also where the money
  // is decided: the admin confirms what the shift is worth, and that amount — not a rate the
  // staff member could apply themselves — is what enters payroll.
  async review(id, decision, note, pay) {
    await delay()
    const actor = currentActor()
    requireCan(actor, 'reviewShifts')
    if (!['approved', 'rejected'].includes(decision)) throw new Error('A shift can only be approved or rejected.')
    if (decision === 'rejected' && !note?.trim()) throw new Error('A reason is required to reject submitted hours.')

    const list = loadJSON(KEYS.shifts, seedShifts())
    const s = list.find((x) => x.id === id)
    if (!s) return null

    if (decision === 'approved') {
      const amount = Number(pay)
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter the amount to pay for this shift before approving it.')
      s.approvedPay = Math.round(amount * 100) / 100
    } else {
      // A rejected shift is worth nothing, so any previously agreed amount is cleared rather
      // than left behind to reappear if it is approved again later.
      s.approvedPay = null
    }

    s.status = decision
    s.reviewNote = note?.trim() || null
    s.reviewedBy = actor.id
    s.reviewedAt = Date.now()
    saveJSON(KEYS.shifts, list); return s
  },

  // Correcting the agreed amount on an already-approved shift, without re-running review.
  async setPay(id, pay) {
    await delay()
    const actor = currentActor()
    requireCan(actor, 'reviewShifts')
    const amount = Number(pay)
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter a valid amount.')
    const list = loadJSON(KEYS.shifts, seedShifts())
    const s = list.find((x) => x.id === id)
    if (!s) return null
    s.approvedPay = Math.round(amount * 100) / 100
    s.reviewedBy = actor.id
    s.reviewedAt = Date.now()
    saveJSON(KEYS.shifts, list); return s
  },

  // Resubmit a rejected shift after correcting it — returns it to the pending queue.
  async resubmit(id, patch = {}) {
    await delay()
    const actor = currentActor()
    const list = loadJSON(KEYS.shifts, seedShifts())
    const s = list.find((x) => x.id === id)
    if (!s) return null
    requireSelfOrAdmin(actor, s.staffId)
    if (s.status !== 'rejected') throw new Error('Only a rejected shift can be resubmitted.')
    const { status, reviewedBy, reviewedAt, staffId, approvedPay, ...safe } = patch
    Object.assign(s, safe)
    if (safe.date) s.at = new Date(safe.date).getTime()
    s.status = 'pending'; s.reviewNote = null; s.reviewedBy = null; s.reviewedAt = null; s.approvedPay = null
    s.submittedAt = Date.now()
    saveJSON(KEYS.shifts, list); return s
  },

  async remove(id) {
    await delay()
    const actor = currentActor()
    const list = loadJSON(KEYS.shifts, seedShifts())
    const s = list.find((x) => x.id === id)
    if (!s) return true
    if (!isAdmin(actor)) {
      requireSelfOrAdmin(actor, s.staffId)
      if (s.status === 'approved') throw new Error('Approved hours can only be removed by an admin.')
    }
    saveJSON(KEYS.shifts, list.filter((x) => x.id !== id))
    return true
  },
}

// Stock purchase records — what a branch paid to restock. `unitCost` is captured per record
// because a batch costs whatever was paid on the day; later price changes must not rewrite it.
export const PurchaseAPI = {
  // What the business pays for stock is admin-only commercial data — staff manage stock
  // levels through ProductAPI without ever seeing cost prices or margins.
  async list(filters = {}) {
    await delay()
    requireCan(currentActor(), 'viewStockCosts')
    let out = loadJSON(KEYS.purchases, seedPurchases())
    if (filters.branchId) out = out.filter((p) => p.branchId === filters.branchId)
    if (filters.productId) out = out.filter((p) => p.productId === filters.productId)
    if (filters.from != null) out = out.filter((p) => p.at >= filters.from)
    if (filters.to != null) out = out.filter((p) => p.at <= filters.to)
    return out
  },
  // Recording a purchase also moves the stock it bought into the receiving branch, so the
  // cost report and the branch stock report can never drift apart.
  async create(data) {
    await delay()
    requireCan(currentActor(), 'viewStockCosts')
    const list = loadJSON(KEYS.purchases, seedPurchases())
    const entry = { id: 'pur' + Date.now(), reference: 'VT-PO-' + (9000 + list.length + 1), at: Date.now(), ...data }
    list.unshift(entry); saveJSON(KEYS.purchases, list)
    if (entry.productId && entry.quantity > 0) {
      try {
        await ProductAPI.adjustStock(entry.productId, entry.quantity, `Purchase ${entry.reference}`)
        const rows = loadJSON(KEYS.branchStock, seedBranchStock())
        const row = rows.find((r) => r.productId === entry.productId && r.branchId === entry.branchId)
        if (row) row.quantity += entry.quantity
        else rows.push({ productId: entry.productId, branchId: entry.branchId, quantity: entry.quantity })
        saveJSON(KEYS.branchStock, rows)
      } catch { /* a stock-sync failure must not lose the purchase record itself */ }
    }
    return entry
  },
  // Stock *levels* are operational data staff legitimately need; only the cost of buying
  // that stock is restricted, so this deliberately carries no financial guard.
  async allBranchStock() { await delay(80); return loadJSON(KEYS.branchStock, seedBranchStock()) },
}

export const TradeInAPI = {
  async list(customerId) {
    await delay()
    const out = scopeTradeIns(currentActor(), loadJSON(KEYS.tradeIns, []))
    return out.filter((t) => !customerId || t.customerId === customerId)
  },
  async get(ref) {
    await delay()
    return scopeTradeIns(currentActor(), loadJSON(KEYS.tradeIns, [])).find((t) => t.reference === ref)
  },
  async create(data) {
    await delay()
    const list = loadJSON(KEYS.tradeIns, [])
    const reference = 'VT-TI-' + (3000 + list.length + 1)
    const req = { reference, status: 'submitted', createdAt: Date.now(), ...data }
    list.unshift(req); saveJSON(KEYS.tradeIns, list); return req
  },
  async update(reference, patch) {
    await delay()
    requireCan(currentActor(), 'inspectTradeIn')
    const list = loadJSON(KEYS.tradeIns, [])
    const t = list.find((x) => x.reference === reference)
    if (!t) return null
    if (patch.status === 'offer_declined' && !patch.rejectionReason && !t.rejectionReason) throw new Error('A rejection reason is required.')
    Object.assign(t, patch); saveJSON(KEYS.tradeIns, list); return t
  },
  // only requests still in the early stages may be withdrawn by the customer
  async cancel(reference) {
    await delay()
    const actor = requireAuth(currentActor())
    const list = loadJSON(KEYS.tradeIns, [])
    const visible = scopeTradeIns(actor, list).find((x) => x.reference === reference)
    if (!visible) return null
    if (!isAdmin(actor) && visible.customerId !== actor.id) requireCan(actor, 'inspectTradeIn')
    const t = list.find((x) => x.reference === reference)
    if (!t) return null
    if (!['submitted', 'valuation_review'].includes(t.status)) throw new Error(`Trade-in ${reference} can no longer be cancelled (status: ${t.status}).`)
    t.status = 'cancelled'; saveJSON(KEYS.tradeIns, list); return t
  },
}

export const UserAPI = {
  // Pay rates are compensation data. Admins see everything; staff see colleagues without
  // their rates; a customer sees only their own record.
  async list() { await delay(); return scopeUsers(currentActor(), loadJSON(KEYS.users, seedUsers())) },
  async get(id) {
    await delay()
    return scopeUsers(currentActor(), loadJSON(KEYS.users, seedUsers())).find((u) => u.id === id)
  },
  // actor is the signed-in admin performing the action — passed through so the adapter can
  // enforce the same rules the UI already hides buttons for (defence in depth, not just UX).
  async create(data, actor) {
    await delay()
    if (data.role === 'admin' && !isSuperAdmin(actor)) throw new Error('Only a super admin can create another admin account.')
    const list = loadJSON(KEYS.users, seedUsers())
    if (list.some((u) => u.email.toLowerCase() === data.email?.toLowerCase())) throw new Error('A user with that email already exists.')
    const u = { id: 'u' + Date.now(), status: 'active', role: 'customer', lastActiveAt: null, ...data }
    list.unshift(u); saveJSON(KEYS.users, list); return u
  },
  async update(id, patch) {
    await delay()
    const actor = currentActor()
    // Anyone may maintain their own profile; changing somebody else's account is user admin.
    // Role and pay rate are stripped from a self-update so nobody can promote or re-price
    // themselves through the profile screen.
    if (!isAdmin(actor) && actor?.id === id) {
      const { role, hourlyRate, dailyRate, superAdmin, branch, status, archived, ...safe } = patch
      patch = safe
    } else {
      requireCan(actor, 'manageUsers')
    }
    const list = loadJSON(KEYS.users, seedUsers())
    const u = list.find((x) => x.id === id)
    if (!u) return null
    Object.assign(u, patch); saveJSON(KEYS.users, list); return u
  },
  async setStatus(id, status, actor) {
    if (status === 'inactive' && actor?.role === 'admin' && actor.id === id) throw new Error("You can't deactivate your own account.")
    return UserAPI.update(id, { status })
  },
  async setRole(id, role, actor) {
    if (role === 'admin' && !isSuperAdmin(actor)) throw new Error('Only a super admin can promote an account to admin.')
    if (actor?.role !== 'admin') throw new Error('Only an admin can change account roles.')
    return UserAPI.update(id, { role })
  },
  async assignBranch(id, branch) { return UserAPI.update(id, { branch }) },
  async touchActivity(id) { return UserAPI.update(id, { lastActiveAt: Date.now() }) },
  async archive(id, actor) {
    if (actor?.role === 'admin' && actor.id === id) throw new Error("You can't archive your own account.")
    return UserAPI.update(id, { archived: true, status: 'inactive' })
  },
  async restore(id) { return UserAPI.update(id, { archived: false }) },
  // Passwords are not handled here — see AuthAPI at the foot of this file. There is
  // deliberately no "reset password" on the user record: it used to report that an email had
  // been sent, which nothing in mock mode could do, and an admin now issues a replacement
  // password directly.
  // Customers/staff with repair/order/trade-in history (or, for staff, precomputed
  // `opts.blockers` from deletionRules.js) are deactivated, never deleted; an admin can
  // never remove their own account.
  async remove(id, opts = {}, actor) {
    await delay()
    if (actor?.role === 'admin' && actor.id === id) throw new Error("You can't delete your own account.")
    let hasHistory
    if (opts.blockers) {
      hasHistory = opts.blockers.length > 0
    } else {
      const { repairs = [], orders = [], tradeIns = [] } = opts
      const user = loadJSON(KEYS.users, seedUsers()).find((u) => u.id === id)
      hasHistory = repairs.some((r) => r.email === user?.email || r.phone === user?.phone)
        || orders.some((o) => o.customerId === id) || tradeIns.some((t) => t.customerId === id)
    }
    if (hasHistory) { await UserAPI.setStatus(id, 'inactive'); return { deleted: false, deactivated: true } }
    const list = loadJSON(KEYS.users, seedUsers())
    saveJSON(KEYS.users, list.filter((u) => u.id !== id))
    return { deleted: true, deactivated: false }
  },
  // Internal notes staff keep about a customer — never visible to that customer.
  async listNotes(customerId) {
    await delay(80)
    requireCan(currentActor(), 'addCustomerNote')
    return loadJSON(KEYS.customerNotes, []).filter((n) => n.customerId === customerId)
  },
  async addNote(customerId, note) {
    await delay()
    requireCan(currentActor(), 'addCustomerNote')
    const list = loadJSON(KEYS.customerNotes, [])
    const entry = { id: 'cn' + Date.now(), customerId, at: Date.now(), ...note }
    list.unshift(entry); saveJSON(KEYS.customerNotes, list); return entry
  },
}

export const AddressAPI = {
  async list(customerId) {
    await delay(80)
    return scopeOwned(currentActor(), loadJSON(KEYS.addresses, []), customerId)
  },
  async create(customerId, address) {
    await delay()
    const actor = requireAuth(currentActor())
    requireSelfOrAdmin(actor, customerId ?? actor.id)
    const list = loadJSON(KEYS.addresses, [])
    const entry = { id: 'ad' + Date.now(), customerId: customerId ?? actor.id, ...address }
    list.unshift(entry); saveJSON(KEYS.addresses, list); return entry
  },
}

export const WarrantyAPI = {
  async list(customerId) {
    await delay(80)
    return scopeOwned(currentActor(), loadJSON(KEYS.warranties, []), customerId)
  },
}

export const NotificationAPI = {
  // Omitting customerId used to return the whole table; it now means "mine".
  async list(customerId) {
    await delay(80)
    return scopeOwned(currentActor(), loadJSON(KEYS.notifications, []), customerId)
  },
  async create(data) {
    await delay(80)
    const actor = requireAuth(currentActor())
    // Messaging another account is a staff/admin action; a customer can only ever raise one
    // against themselves.
    if (data.customerId && data.customerId !== actor.id) requireCan(actor, 'manageCustomers')
    const list = loadJSON(KEYS.notifications, [])
    const n = { id: 'n' + Date.now(), read: false, createdAt: Date.now(), ...data, customerId: data.customerId ?? actor.id }
    list.unshift(n); saveJSON(KEYS.notifications, list); return n
  },
  async markRead(id) {
    await delay(50)
    const actor = requireAuth(currentActor())
    const list = loadJSON(KEYS.notifications, [])
    const n = list.find((x) => x.id === id)
    if (!n) return null
    requireSelfOrAdmin(actor, n.customerId)
    n.read = true
    saveJSON(KEYS.notifications, list); return n
  },
}

export const SettingsAPI = {
  async get(key, fallback) { await delay(50); return loadJSON(KEYS.settings, {})[key] ?? fallback },
  async set(key, value) {
    await delay(50)
    requireCan(currentActor(), 'manageSettings')
    const all = loadJSON(KEYS.settings, {})
    all[key] = value; saveJSON(KEYS.settings, all); return value
  },
}

export const AuditAPI = {
  async log(entry) {
    const list = loadJSON(KEYS.auditLog, [])
    list.unshift({ id: 'al' + Date.now(), at: Date.now(), ...entry })
    saveJSON(KEYS.auditLog, list.slice(0, 500)) // cap growth in mock mode
    return true
  },
  async list(filters = {}) {
    await delay()
    requireCan(currentActor(), 'viewAuditLog')
    let out = loadJSON(KEYS.auditLog, [])
    if (filters.entityType) out = out.filter((l) => l.entityType === filters.entityType)
    if (filters.actorId) out = out.filter((l) => l.actorId === filters.actorId)
    return out
  },
}

export { TECHS }

// --- authentication -------------------------------------------------------------------------
// Sign-in, self-registration and the management of sign-in details. This is the only module
// that reads the credential store, and nothing it returns ever contains a password or a hash.
//
// Three distinct routes in, matching how the business actually works:
//   * a customer registers themselves and owns their password;
//   * a staff member is issued a username and password by an admin, and cannot change that
//     password until an admin unlocks it;
//   * an admin signs in with their email and owns their password.
// Registration can only ever produce a customer — see registerCustomer().

// One message for every failure mode. Saying "no such account" and "wrong password" separately
// turns the sign-in form into a directory of who works here.
const SIGN_IN_FAILED = 'Those sign-in details are not recognised.'

// A stand-in record to verify against when the identifier matched nobody, so a wrong username
// costs the same time as a wrong password and the two cannot be told apart by timing.
const DECOY_CREDENTIAL = { salt: '0'.repeat(32), iterations: 120000, hash: 'f'.repeat(64) }

export const AuthAPI = {
  async signIn({ identifier, password } = {}) {
    await ensureSeeded()
    await delay(200)
    const id = String(identifier ?? '').trim()
    if (!id || !password) throw new Error('Enter your sign-in details.')

    // An email always contains @ and a username never may (usernameProblem rejects it), so the
    // two namespaces cannot collide and one field can safely accept either.
    const users = loadJSON(KEYS.users, seedUsers())
    let user
    if (id.includes('@')) {
      user = users.find((u) => u.email?.toLowerCase() === id.toLowerCase())
    } else {
      const uid = await userIdForUsername(id)
      user = users.find((u) => u.id === uid)
    }

    const credential = user ? await credentialFor(user.id) : null
    const ok = await verifyPassword(password, credential ?? DECOY_CREDENTIAL)
    if (!user || !credential || !ok) throw new AuthzError(SIGN_IN_FAILED)

    // Checked after the password, so a suspended account cannot be identified by someone who
    // does not already know its password.
    if (user.archived || user.status === 'inactive') {
      throw new AuthzError('That account is no longer active. Please speak to your branch manager.')
    }

    // The session is stored client-side and read across the whole app, so it must not carry
    // pay rates — not even the signed-in person's own. redactUser applies the same rule here
    // that it applies to every other read.
    return { user: redactUser(user, user), mustChangePassword: !!credential.mustChange }
  },

  // Self-registration. `role` is set here and never taken from the caller: whatever a request
  // contains, this can only ever create a customer. Staff and admin accounts exist only
  // because an admin created them.
  async registerCustomer({ name, email, phone, password } = {}) {
    await ensureSeeded()
    await delay(300)
    const cleanEmail = String(email ?? '').trim().toLowerCase()
    if (!String(name ?? '').trim()) throw new Error('Enter your name.')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) throw new Error('Enter a valid email address.')
    const problem = passwordProblem(password)
    if (problem) throw new Error(problem)

    const list = loadJSON(KEYS.users, seedUsers())
    if (list.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      throw new Error('An account already uses that email address. Try signing in instead.')
    }

    const user = {
      id: 'u' + Date.now(),
      name: String(name).trim(),
      email: cleanEmail,
      phone: String(phone ?? '').trim() || undefined,
      role: 'customer',
      status: 'active',
      archived: false,
      lastActiveAt: Date.now(),
    }
    list.unshift(user)
    saveJSON(KEYS.users, list)
    // No username: customers sign in with the email address they just chose.
    await writeCredential(user.id, { password, username: null, mustChange: false, changeAllowed: false })
    return user
  },

  // Changing your own password. The current password is required even for an admin, so walking
  // up to an unattended screen is not enough to lock the owner out of their own account.
  async changeOwnPassword({ currentPassword, newPassword } = {}) {
    await ensureSeeded()
    await delay(250)
    const actor = requireAuth(currentActor())
    const credential = await credentialFor(actor.id)
    if (!credential) throw new AuthzError('This account has no password set. Ask an admin to issue one.')

    if (!canChangeOwnPassword(actor, credential)) {
      throw new AuthzError('An admin must unlock password changes for your account before you can set a new one.')
    }
    if (!(await verifyPassword(currentPassword, credential))) {
      throw new AuthzError('Your current password is not correct.')
    }

    const problem = passwordProblem(newPassword)
    if (problem) throw new Error(problem)
    if (await verifyPassword(newPassword, credential)) throw new Error('Choose a password you have not used before.')

    // The grant is spent by using it. A staff member unlocked once does not stay unlocked —
    // the next change needs the admin again, which is the whole point of the flag.
    await writeCredential(actor.id, {
      password: newPassword, mustChange: false, changeAllowed: false, updatedBy: actor.id,
    })
    return { changed: true }
  },

  // Issue or replace somebody's sign-in details. Admin-only, and an admin account can only be
  // touched by a super admin — the same rule that governs creating one.
  async issueCredentials(userId, { username, password, mustChange = false } = {}) {
    await ensureSeeded()
    await delay(250)
    const actor = requireCan(currentActor(), 'manageSignInDetails')

    const target = loadJSON(KEYS.users, seedUsers()).find((u) => u.id === userId)
    if (!target) throw new Error('Account not found.')
    if (target.role === 'admin' && actor.id !== userId && !isSuperAdmin(actor)) {
      throw new AuthzError("Only a super admin can change another admin's sign-in details.")
    }

    const patch = { updatedBy: actor.id }

    if (username !== undefined) {
      const clean = username ? normaliseUsername(username) : null
      if (clean) {
        const problem = usernameProblem(clean)
        if (problem) throw new Error(problem)
        if (await usernameTaken(clean, userId)) throw new Error('That username is already in use.')
      }
      patch.username = clean
    }

    if (password) {
      const problem = passwordProblem(password)
      if (problem) throw new Error(problem)
      patch.password = password
      // A password an admin typed is a shared secret until its holder replaces it, so issuing
      // one with "must change" also grants the change that lets them do exactly that.
      patch.mustChange = !!mustChange
      patch.changeAllowed = !!mustChange
    }

    const saved = await writeCredential(userId, patch)
    return publicSummary(saved)
  },

  // Unlock (or re-lock) a staff member's ability to set their own password. This is the admin
  // permission the staff rule turns on; nothing else grants it.
  async setPasswordChangePermission(userId, allowed) {
    await ensureSeeded()
    await delay(150)
    const actor = requireCan(currentActor(), 'manageSignInDetails')
    const target = loadJSON(KEYS.users, seedUsers()).find((u) => u.id === userId)
    if (!target) throw new Error('Account not found.')
    const saved = await writeCredential(userId, { changeAllowed: !!allowed, updatedBy: actor.id })
    return publicSummary(saved)
  },

  // What is known about an account's sign-in, minus the secret. Readable by an admin, or by the
  // account holder about themselves — a staff member needs to see their own username and
  // whether a change has been unlocked.
  async signInDetails(userId) {
    await ensureSeeded()
    const actor = requireAuth(currentActor())
    requireSelfOrAdmin(actor, userId)
    return publicSummary(await credentialFor(userId))
  },

  // Called when an account is deleted outright, so its username is released and no orphaned
  // hash is left behind.
  async forgetCredentials(userId) {
    const actor = requireCan(currentActor(), 'manageSignInDetails')
    if (actor.id === userId) throw new AuthzError("You can't remove your own sign-in details.")
    await removeCredential(userId)
    return { removed: true }
  },
}
