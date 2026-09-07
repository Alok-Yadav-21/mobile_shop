// Supabase-backed adapter — same method surface and return shapes as ./mock.js, so page code
// never needs to change when this becomes the active adapter (see ./index.js).
// Requires VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (see .env.example) and the schema in
// supabase/migrations applied to the project.
import { supabase } from '@/lib/supabaseClient.js'
import {
  canTransition, requiresReason, customerStatusLabel,
  orderStatusLabel, orderCanBeCancelled, tradeInCanTransition,
} from '@/constants/status.js'
import { QUOTE_SENT_STATUS } from '@/lib/quotes.js'
import {
  repairMovedNotice, tradeInMovedNotice, orderMovedNotice, newOrderNotice,
  repairAssignedNotice, repairUnassignedNotice, orderAssignedNotice, orderUnassignedNotice,
  newBookingNotice, newTradeInNotice, quoteAnsweredNotice, offerAnsweredNotice,
} from '@/lib/notices.js'
import { locatePostcode, branchesByDistance } from '@/lib/geo.js'
import { productImage } from '@/data/productImages.js'

// The DB's repair_status enum (supabase/migrations/0001_init.sql) and the app's REPAIR_FLOW
// (src/constants/status.js) both describe the same 12 states — this is a direct 1:1 label map.
const STATUS_DB_TO_APP = {
  booking_received: 'Booking received',
  awaiting_device: 'Awaiting device',
  device_received: 'Device received',
  diagnostics: 'Diagnostics',
  quote_awaiting_approval: 'Quote awaiting approval',
  repair_in_progress: 'Repair in progress',
  parts_ordered: 'Parts ordered',
  quality_check: 'Quality check',
  ready_for_collection: 'Ready for collection',
  dispatched: 'Dispatched',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
const STATUS_APP_TO_DB = Object.fromEntries(Object.entries(STATUS_DB_TO_APP).map(([db,app])=>[app,db]))

function mapRepairRow(row, history = [], notes = []) {
  return {
    ref: row.reference,
    // These used to read row.customer_name / customer_phone / customer_email, which are not
    // columns on repairs and never have been: the customer's details live on their profile. Every
    // staff screen showed an empty name for every job.
    customerId: row.customer_id ?? null,
    customer: row.customer?.full_name ?? null,
    phone: row.customer?.phone ?? null,
    email: row.customer?.email ?? null,
    branch: row.branch_id, device: row.device_category,
    brand: row.brand, model: row.model, problem: row.problem, symptoms: row.symptoms ?? null,
    fulfilment: row.fulfilment,
    status: STATUS_DB_TO_APP[row.status] ?? row.status,
    quote: row.quote == null ? null : Number(row.quote),
    tech: row.technician_id,
    // Resolved on the way out rather than by each page, the same as the mock adapter does it —
    // a page-side lookup is not open to a customer anyway, since they cannot read the staff list.
    // Two shapes, one field: the staff query joins the profile, while a customer reads through
    // repairs_for_customer, which resolves just this one name (migration 0012) because the staff
    // list itself is not theirs to read.
    techName: row.technician?.full_name ?? row.technician_name ?? null,
    cancellationReason: row.cancellation_reason ?? null, archived: !!row.archived,
    createdAt: new Date(row.created_at).getTime(),
    history: history.map((h) => [STATUS_DB_TO_APP[h.status] ?? h.status, new Date(h.changed_at).getTime()]),
    notes: notes.map((n) => ({ by: n.author_id, text: n.body, at: new Date(n.created_at).getTime() })),
  }
}

function mapShiftRow(row) {
  return {
    id: row.id, staffId: row.staff_id, branchId: row.branch_id, date: row.worked_on,
    at: new Date(row.worked_on).getTime(), start: row.starts_at, end: row.ends_at,
    breakMins: row.break_minutes ?? 0, entryMode: row.entry_mode, hours: row.hours == null ? null : Number(row.hours),
    approvedPay: row.approved_pay == null ? null : Number(row.approved_pay),
    status: row.status, submittedBy: row.submitted_by, reviewedBy: row.reviewed_by,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : null,
    reviewNote: row.review_note ?? null,
  }
}

function mapPurchaseRow(row) {
  return {
    id: row.id, reference: row.reference, branchId: row.branch_id, productId: row.product_id,
    productName: row.product_name ?? null, quantity: row.quantity, unitCost: Number(row.unit_cost),
    supplier: row.supplier, at: new Date(row.purchased_at).getTime(),
  }
}

function assertConnected() {
  if (!supabase) throw new Error('Supabase adapter used without VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY set — see .env.example.')
}

async function currentUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

// The caller's own profile — their role and branch, which decide what the rest of this file may
// ask for. Cached for the life of a page view: it is read on nearly every call and it does not
// change under you, and signing in or out replaces the client's session anyway.
let profileCache = { id: null, profile: null }
async function currentProfile() {
  const user = await currentUser()
  if (!user) { profileCache = { id: null, profile: null }; return null }
  if (profileCache.id === user.id) return profileCache.profile
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  const profile = data ? mapProfileRow(data) : null
  profileCache = { id: user.id, profile }
  return profile
}

// Delivering what src/lib/notices.js composed. The wording is shared with the mock adapter so
// the same event reads the same way whichever backend is behind it; who receives it is decided
// here, because that is the part that depends on the database.
//
// A refusal is not fatal. The notifications policy is staff-insert-only, deliberately — without
// it anyone could write into any employee's bell — so a customer's own action reaching this will
// be turned away, and the action that caused it must not fail with it. What a customer does need
// the shop to hear goes through notifyShopAbout* below instead.
async function deliver(profileIds, notice) {
  const ids = [...new Set((Array.isArray(profileIds) ? profileIds : [profileIds]).filter(Boolean))]
  if (!ids.length) return 0
  const { error } = await supabase.from('notifications').insert(ids.map((id) => ({
    profile_id: id, title: notice.title, body: notice.body,
    reference: notice.ref ?? null, link: notice.link ?? null,
  })))
  if (error) { if (import.meta.env.DEV) console.warn('notification not delivered:', error.message); return 0 }
  return ids.length
}

// Everyone who should hear that work has arrived: the branch that has to do it, and the admins
// who assign it. `except` is whoever caused it — booking a walk-in should not buzz the person
// who typed it in.
async function shopAudience(branchId, { except = null } = {}) {
  const { data } = await supabase.from('profiles')
    .select('id, role, branch_id')
    .eq('status', 'active').eq('archived', false)
    .or(`role.eq.admin,and(role.eq.staff,branch_id.eq.${branchId ?? 'none'})`)
  return {
    branch: (data ?? []).filter((p) => p.role === 'staff' && p.id !== except).map((p) => p.id),
    admins: (data ?? []).filter((p) => p.role === 'admin' && p.id !== except).map((p) => p.id),
  }
}

// The customer's two moves — approving a quote, answering an offer — leave somebody in the shop
// waiting, and a customer cannot write into a staff member's notifications. These go through the
// security-definer functions in migration 0011, which work out the recipients from the record
// itself and refuse anything that is not the caller's own.
async function rpcNotify(fn, reference, notice, audience) {
  const { error } = await supabase.rpc(fn, {
    p_reference: reference, p_title: notice.title, p_body: notice.body,
    p_link: notice.link ?? null, p_audience: audience,
  })
  if (error && import.meta.env.DEV) console.warn('shop not notified:', error.message)
}

// Telling the shop something, whoever the caller is.
//
// A member of staff writes the notifications directly. A customer cannot — they can read neither
// the staff list nor write into anyone else's bell, both correctly — so their message goes
// through the definer function above, which works out the recipients from the record and refuses
// anything that is not theirs. Same words either way; only the route differs.
async function tellShop({ profile, branchId, reference, notice, rpc }) {
  const isCustomer = !profile || profile.role === 'customer'
  for (const audience of ['branch', 'admin']) {
    const message = notice(audience)
    if (isCustomer) await rpcNotify(rpc, reference, message, audience)
    else {
      const seen = await shopAudience(branchId, { except: profile.id })
      await deliver(audience === 'admin' ? seen.admins : seen.branch, message)
    }
  }
}

// A customer reads through repairs_for_customer, a view that blanks the quote until it has
// actually been sent to them (migration 0008). Reading the table directly would hand them a
// figure the workshop is still working out, because a select policy grants the whole row or
// none of it — there is no such thing as a column the policy hides.
const repairSource = (profile) => (profile?.role === 'customer' ? 'repairs_for_customer' : 'repairs')

// The customer's name and contact details live on their profile, not on the repair, so every
// staff-facing screen needs them joined on. `technician_id` is likewise an id, and a technician's
// name on a job screen is the whole point of showing who has it.
const REPAIR_SELECT = '*, customer:profiles!repairs_customer_id_fkey(full_name, email, phone), technician:profiles!repairs_technician_id_fkey(full_name)'

export const RepairAPI = {
  async list() {
    assertConnected()
    const profile = await currentProfile()
    const { data, error } = await supabase.from(repairSource(profile))
      .select(profile?.role === 'customer' ? '*' : REPAIR_SELECT)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map((r) => mapRepairRow(r))
  },
  // The phone number is ignored: which repairs are "mine" is decided by the session, not by a
  // number typed into a page, and RLS would refuse anyone else's regardless.
  async forCustomer(_phone) {
    assertConnected()
    const user = await currentUser()
    if (!user) return []
    const { data, error } = await supabase.from('repairs_for_customer').select('*')
      .eq('customer_id', user.id).order('created_at', { ascending: false })
    if (error) throw error
    return data.map((r) => mapRepairRow(r))
  },
  async forBranch(branch) {
    assertConnected()
    const { data, error } = await supabase.from('repairs').select(REPAIR_SELECT)
      .eq('branch_id', branch).order('created_at', { ascending: false })
    if (error) throw error
    return data.map((r) => mapRepairRow(r))
  },
  async get(ref) {
    assertConnected()
    const profile = await currentProfile()
    const { data: r, error } = await supabase.from(repairSource(profile))
      .select(profile?.role === 'customer' ? '*' : REPAIR_SELECT)
      .eq('reference', ref).maybeSingle()
    if (error) throw error
    if (!r) return null
    const { data: history } = await supabase.from('repair_status_history').select('*').eq('repair_id', r.id).order('changed_at')
    const { data: notes } = await supabase.from('repair_notes').select('*').eq('repair_id', r.id).order('created_at')
    return mapRepairRow(r, history ?? [], notes ?? [])
  },
  async create(data) {
    assertConnected()
    const profile = await currentProfile()
    // Without this the insert is refused outright: the policy requires a repair to belong to the
    // person booking it, and nothing was setting the owner — so a customer could not book at all.
    // A member of staff booking a walk-in at the counter has no account to attach it to, which
    // is what the null case is for.
    const customerId = profile?.role === 'customer' ? profile.id : (data.customerId ?? null)
    const { data: row, error } = await supabase.from('repairs').insert({
      // No reference: migration 0009 gives the column a default from a sequence, so two people
      // booking at the same moment cannot be handed the same one.
      customer_id: customerId,
      branch_id: data.branch, device_category: data.device, brand: data.brand,
      model: data.model, problem: data.problem, symptoms: data.symptoms ?? null,
      fulfilment: data.fulfilment ?? 'in_store', status: 'booking_received',
    }).select(REPAIR_SELECT).single()
    if (error) throw error
    const repair = mapRepairRow(row)

    // The branch works it, the admin assigns it — both need to know it arrived.
    await tellShop({
      profile, branchId: data.branch, reference: repair.ref,
      notice: (audience) => newBookingNotice(repair, audience),
      rpc: 'notify_shop_about_repair',
    })
    return repair
  },
  async update(ref, patch) {
    assertConnected()
    const profile = await currentProfile()

    // Read before writing, because what has to be announced afterwards depends on where the
    // repair was: whether the customer's view of it actually changed, and who was holding it.
    const before = await this.get(ref)
    if (!before) return null

    const dbPatch = {}
    if (patch.status && patch.status !== before.status) {
      // The order of the workflow. The database enforces who may move a repair and whether the
      // quote is ready to send; the shape of the journey itself is one graph, in
      // src/constants/status.js, shared with the mock adapter and with the screens.
      if (!canTransition(before.status, patch.status)) throw new Error(`Cannot move a repair from "${before.status}" to "${patch.status}".`)
      if (requiresReason(patch.status) && !patch.cancellationReason) throw new Error('A reason is required to cancel a repair.')
      dbPatch.status = STATUS_APP_TO_DB[patch.status] ?? patch.status
    }
    if (patch.quote !== undefined) dbPatch.quote = patch.quote
    if (patch.tech !== undefined) dbPatch.technician_id = patch.tech || null
    if (patch.cancellationReason !== undefined) dbPatch.cancellation_reason = patch.cancellationReason
    if (patch.symptoms !== undefined) dbPatch.symptoms = patch.symptoms
    if (patch.archived !== undefined) dbPatch.archived = patch.archived
    if (Object.keys(dbPatch).length === 0) return before

    const { data: row, error } = await supabase.from('repairs').update(dbPatch)
      .eq('reference', ref).select(REPAIR_SELECT).maybeSingle()
    if (error) throw error
    // No error and no row means a policy refused it rather than an exception being raised — an
    // UPDATE that matches nothing is a successful statement that changed nothing.
    if (!row) throw new Error('You do not have access to change that repair.')
    // Re-read rather than map the returned row: the timeline is drawn from the history, a trigger
    // has just appended to it (migration 0008), and an UPDATE cannot return rows from another
    // table. Mapping the row alone hands back history: [] and empties the customer's timeline
    // until they reload.
    const after = await this.get(ref)

    if (dbPatch.status !== undefined) {
      // Announced when what the CUSTOMER is told changes, not on every bench transition. Parts
      // ordered → Quality check is two statuses and one customer stage, so it is one thing to
      // them and no notice at all; Ready for collection → Dispatched is one stage but a different
      // thing to them, and comparing the label rather than the stage catches it.
      if (customerStatusLabel(after.status, after) !== customerStatusLabel(before.status, before)) {
        if (profile?.role !== 'customer' && before.customerId) {
          await deliver(before.customerId, repairMovedNotice(after, after.status))
        }
      }
      // The customer's own answer, travelling the other way. Approving a quote used to be
      // announced only to the customer, so the technician who sent it sat waiting for a decision
      // that had already been made.
      if (profile?.role === 'customer' && before.status === QUOTE_SENT_STATUS) {
        const answered = quoteAnsweredNotice(after, after.status === 'Repair in progress')
        await tellShop({
          profile, branchId: after.branch, reference: ref,
          notice: () => answered, rpc: 'notify_shop_about_repair',
        })
      }
    }

    // Both ends of a reassignment. Telling only the incoming technician leaves the outgoing one
    // with "assigned to you" in their bell and a device that is no longer theirs.
    if (patch.tech !== undefined && after.tech !== before.tech) {
      if (before.tech) await deliver(before.tech, repairUnassignedNotice(after, after.techName))
      if (after.tech) await deliver(after.tech, repairAssignedNotice(after, profile?.name))
    }
    return after
  },
  async addNote(ref, note) {
    assertConnected()
    const { data: r } = await supabase.from('repairs').select('id').eq('reference', ref).single()
    await supabase.from('repair_notes').insert({ repair_id: r.id, body: note.text, visible_to_customer: !!note.visibleToCustomer })
    return this.get(ref)
  },
  async archive(ref) { assertConnected(); return this.update(ref, { archived: true }) },
  async deleteDraft(ref) {
    assertConnected()
    const { data: r, error } = await supabase.from('repairs').select('id,status').eq('reference', ref).single()
    if (error) throw error
    if (STATUS_DB_TO_APP[r.status] !== 'Booking received') throw new Error('Only draft (Booking received) repairs can be deleted.')
    const { error: delErr } = await supabase.from('repairs').delete().eq('id', r.id)
    if (delErr) throw delErr
    return true
  },
  async listParts(ref) {
    assertConnected()
    const { data: r } = await supabase.from('repairs').select('id').eq('reference', ref).single()
    if (!r) return []
    const { data, error } = await supabase.from('repair_parts').select('*').eq('repair_id', r.id)
    if (error) throw error
    return data
  },
  async addPart(ref, part) {
    assertConnected()
    const { data: r } = await supabase.from('repairs').select('id').eq('reference', ref).single()
    const { error } = await supabase.from('repair_parts').insert({
      repair_id: r.id, name: part.name, quantity: part.quantity ?? 1, unit_cost: part.unitCost ?? null, product_id: part.productId ?? null,
    })
    if (error) throw error
    return this.listParts(ref)
  },
}

export const ProductAPI = {
  async list(filters = {}) {
    assertConnected()
    let q = supabase.from('products').select('*, categories(name)')
    if (!filters.includeArchived) q = q.eq('archived', false)
    if (!filters.includeInactive) q = q.eq('active', true).eq('archived', false)
    if (filters.condition) q = q.eq('condition', filters.condition)
    if (filters.maxPrice) q = q.lte('price', filters.maxPrice)
    if (filters.q) q = q.ilike('name', `%${filters.q}%`)
    const { data, error } = await q
    if (error) throw error
    return data.map(mapProductRow)
  },
  async get(id) {
    assertConnected()
    const { data, error } = await supabase.from('products').select('*, categories(name)').eq('id', id).single()
    if (error) throw error
    return mapProductRow(data)
  },
  async categories() {
    assertConnected()
    const { data, error } = await supabase.from('categories').select('name').eq('active', true).eq('archived', false).order('sort_order')
    if (error) throw error
    return data.map((c) => c.name)
  },
  async create(data) {
    assertConnected()
    const { data: row, error } = await supabase.from('products').insert({
      name: data.name, price: data.price, was_price: data.was ?? null, condition: data.cond,
      image_url: data.img, brand: data.brand ?? null, description: data.description ?? null,
      specs: data.specs ?? null, warranty_months: data.warrantyMonths ?? null,
      active: false, archived: false, stock: data.stock ?? 0,
    }).select().single()
    if (error) throw error
    return mapProductRow(row)
  },
  async update(id, patch) {
    assertConnected()
    const dbPatch = {}
    if (patch.name !== undefined) dbPatch.name = patch.name
    if (patch.price !== undefined) dbPatch.price = patch.price
    if (patch.was !== undefined) dbPatch.was_price = patch.was
    if (patch.cond !== undefined) dbPatch.condition = patch.cond
    if (patch.brand !== undefined) dbPatch.brand = patch.brand
    if (patch.description !== undefined) dbPatch.description = patch.description
    if (patch.specs !== undefined) dbPatch.specs = patch.specs
    if (patch.warrantyMonths !== undefined) dbPatch.warranty_months = patch.warrantyMonths
    if (patch.active !== undefined) dbPatch.active = patch.active
    if (patch.archived !== undefined) dbPatch.archived = patch.archived
    if (patch.stock !== undefined) dbPatch.stock = patch.stock
    const { data: row, error } = await supabase.from('products').update(dbPatch).eq('id', id).select().single()
    if (error) throw error
    return mapProductRow(row)
  },
  async duplicate(id) {
    assertConnected()
    const src = await this.get(id)
    return this.create({ ...src, name: `${src.name} (copy)`, stock: 0 })
  },
  async setActive(id, active) { return this.update(id, { active }) },
  async archive(id) { return this.update(id, { archived: true, active: false }) },
  async restore(id) { return this.update(id, { archived: false }) },
  async remove(id, blockers = []) {
    assertConnected()
    if (blockers.length) throw new Error(`Can't permanently delete — ${blockers.join(', ')}.`)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    return true
  },
  async adjustStock(id, delta, reason, actorId) {
    assertConnected()
    const { data: p, error } = await supabase.from('products').select('stock,name').eq('id', id).single()
    if (error) throw error
    const next = (p.stock ?? 0) + delta
    if (next < 0) throw new Error(`Cannot reduce ${p.name}'s stock below 0.`)
    const { data: row, error: updErr } = await supabase.from('products').update({ stock: next }).eq('id', id).select().single()
    if (updErr) throw updErr
    await supabase.from('inventory_movements').insert({ product_id: id, delta, reason, actor_id: actorId ?? null })
    return row
  },
  async stockHistory(id) {
    assertConnected()
    const { data, error } = await supabase.from('inventory_movements').select('*').eq('product_id', id).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  async lowStock() {
    assertConnected()
    const { data, error } = await supabase.from('products').select('*').eq('active', true).eq('archived', false).lte('stock', 3)
    if (error) throw error
    return data
  },
  // --- per-branch stock allocation, layered on the existing `inventory` table ---
  async branchStock(id) {
    assertConnected()
    const { data, error } = await supabase.from('inventory').select('*').eq('product_id', id)
    if (error) throw error
    return data.map((r) => ({ productId: r.product_id, branchId: r.branch_id, quantity: r.quantity }))
  },
  async setBranchStock(id, branchId, quantity) {
    assertConnected()
    const { error } = await supabase.from('inventory').upsert({ product_id: id, branch_id: branchId, quantity })
    if (error) throw error
    return this.branchStock(id)
  },
  async stockForBranch(branchId) {
    assertConnected()
    const { data, error } = await supabase.rpc('stock_for_branch', { branch: branchId })
    if (error) throw error
    return data
  },
  // Branch row and network total move in one transaction, so they cannot drift apart.
  async adjustBranchStock(id, branchId, delta, reason) {
    assertConnected()
    const { data, error } = await supabase.rpc('adjust_branch_stock', {
      product: id, branch: branchId, delta, reason: reason ?? null,
    })
    if (error) throw error
    return data
  },
  async transferStock(id, fromBranchId, toBranchId, quantity) {
    assertConnected()
    const { data: from, error } = await supabase.from('inventory').select('quantity').eq('product_id', id).eq('branch_id', fromBranchId).single()
    if (error) throw error
    if (!from || from.quantity < quantity) throw new Error('Not enough stock at the source branch to transfer.')
    await supabase.from('inventory').update({ quantity: from.quantity - quantity }).eq('product_id', id).eq('branch_id', fromBranchId)
    const { data: to } = await supabase.from('inventory').select('quantity').eq('product_id', id).eq('branch_id', toBranchId).maybeSingle()
    await supabase.from('inventory').upsert({ product_id: id, branch_id: toBranchId, quantity: (to?.quantity ?? 0) + quantity })
    return this.branchStock(id)
  },
}
function mapProductRow(p) {
  return {
    id: p.id, name: p.name, category: p.categories?.name, price: Number(p.price),
    was: p.was_price ? Number(p.was_price) : undefined, cond: p.condition, img: productImage(p.image_url),
    rating: p.rating ? Number(p.rating) : undefined, stock: p.stock ?? 0, active: p.active,
    archived: !!p.archived, lowStockThreshold: p.low_stock_threshold ?? 3,
    brand: p.brand ?? null, description: p.description ?? null, specs: p.specs ?? null,
    warrantyMonths: p.warranty_months ?? null,
  }
}

export const CategoryAPI = {
  async list(filters = {}) {
    assertConnected()
    let q = supabase.from('categories').select('name, active, archived').order('sort_order')
    if (!filters.includeArchived) q = q.eq('archived', false)
    const { data, error } = await q
    if (error) throw error
    return data
  },
  async create(name) {
    assertConnected()
    const { error } = await supabase.from('categories').insert({ name, active: true, archived: false })
    if (error) throw error
    return this.list()
  },
  async update(name, patch) {
    assertConnected()
    const dbPatch = {}
    if (patch.active !== undefined) dbPatch.active = patch.active
    if (patch.archived !== undefined) dbPatch.archived = patch.archived
    const { error } = await supabase.from('categories').update(dbPatch).eq('name', name)
    if (error) throw error
    return this.list()
  },
  async setActive(name, active) { return this.update(name, { active }) },
  async archive(name) { return this.update(name, { archived: true, active: false }) },
  async restore(name) { return this.update(name, { archived: false }) },
  async remove(name, blockers = []) {
    assertConnected()
    if (blockers.length) throw new Error(`Can't delete — ${blockers.join(', ')}.`)
    const { error } = await supabase.from('categories').delete().eq('name', name)
    if (error) throw error
    return true
  },
}

export const ServiceAPI = {
  async list(filters = {}) {
    assertConnected()
    let q = supabase.from('services').select('*').order('sort_order')
    if (!filters.includeArchived) q = q.eq('archived', false)
    if (!filters.includeInactive) q = q.eq('active', true).eq('archived', false)
    const { data, error } = await q
    if (error) throw error
    return data.map((s) => ({ id: s.id, icon: s.icon, title: s.title, desc: s.description, active: s.active, archived: !!s.archived }))
  },
  async create(data) {
    assertConnected()
    const { data: row, error } = await supabase.from('services').insert({
      title: data.title, description: data.desc, icon: data.icon, device_category: data.deviceCategory ?? 'General',
      base_price: data.basePrice ?? null, active: false, archived: false,
    }).select().single()
    if (error) throw error
    return row
  },
  async update(id, patch) {
    assertConnected()
    const dbPatch = {}
    if (patch.title !== undefined) dbPatch.title = patch.title
    if (patch.desc !== undefined) dbPatch.description = patch.desc
    if (patch.active !== undefined) dbPatch.active = patch.active
    if (patch.archived !== undefined) dbPatch.archived = patch.archived
    const { data, error } = await supabase.from('services').update(dbPatch).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async setActive(id, active) { return this.update(id, { active }) },
  async archive(id) { return this.update(id, { archived: true, active: false }) },
  async restore(id) { return this.update(id, { archived: false }) },
  async remove(id, blockers = []) {
    assertConnected()
    if (blockers.length) throw new Error(`Can't delete — ${blockers.join(', ')}.`)
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

export const BranchAPI = {
  async list(filters = {}) {
    assertConnected()
    let q = supabase.from('branches').select('*')
    if (!filters.includeArchived) q = q.eq('archived', false)
    if (!filters.includeInactive) q = q.eq('active', true).eq('archived', false)
    const { data, error } = await q
    if (error) throw error
    return data.map((b) => ({ id: b.id, area: b.area, local: b.local_name, addr: b.address, pc: b.postcode, lat: Number(b.lat), lng: Number(b.lng), active: b.active, archived: !!b.archived }))
  },
  async get(id) {
    assertConnected()
    const { data, error } = await supabase.from('branches').select('*').eq('id', id).single()
    if (error) throw error
    return { id: data.id, area: data.area, local: data.local_name, addr: data.address, pc: data.postcode, lat: Number(data.lat), lng: Number(data.lng), active: data.active, archived: !!data.archived }
  },
  // Same ranking as ./mock.js — real distance, nearest first, each with its `km`. Ranked in
  // JavaScript rather than SQL because the branch list is small and the alternative is a
  // PostGIS dependency for eight rows; move it into the query if the network ever grows.
  async nearest(pc) {
    const all = (await this.list()).filter((b) => b.active !== false && !b.archived)
    const origin = locatePostcode(pc, all)
    if (!origin) return []
    return branchesByDistance(all, origin)
      .filter((r) => r.km != null)
      .map((r) => ({ ...r.branch, km: r.km }))
  },
  // Mirrors the mock adapter: new branches open inactive so setup can finish before they
  // appear in customer-facing branch pickers.
  async create(data) {
    assertConnected()
    const id = (data.id || data.area || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)
    const { data: row, error } = await supabase.from('branches').insert({
      id, area: data.area, local_name: data.local, address: data.addr, postcode: data.pc,
      phone: data.phone ?? null, lat: data.lat ?? null, lng: data.lng ?? null,
      active: false, archived: false,
    }).select().single()
    if (error) throw error
    return { id: row.id, area: row.area, local: row.local_name, addr: row.address, pc: row.postcode, active: row.active, archived: !!row.archived }
  },
  async update(id, patch) {
    assertConnected()
    const dbPatch = {}
    if (patch.active !== undefined) dbPatch.active = patch.active
    if (patch.archived !== undefined) dbPatch.archived = patch.archived
    const { data, error } = await supabase.from('branches').update(dbPatch).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async setActive(id, active) { return this.update(id, { active }) },
  async archive(id) { return this.update(id, { archived: true, active: false }) },
  async restore(id) { return this.update(id, { archived: false }) },
  async remove(id, blockers = []) {
    assertConnected()
    if (blockers.length) throw new Error(`Can't delete — ${blockers.join(', ')}.`)
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

// A basket belongs to whoever is signed in; a visitor who has not signed in still has one, and
// it lives in their own browser until they do.
//
// Every method here used to filter on `customer_id = eq.undefined` when nobody was signed in,
// which PostgREST rejects outright — so browsing the shop as a visitor, which is how almost
// everybody arrives, returned 400 on every basket read. The guest basket below is also what the
// `session_id` column on carts was put there for.
const GUEST_CART_KEY = 'vt_cart'

function readGuestCart() {
  try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) ?? { items: [] } } catch { return { items: [] } }
}
function writeGuestCart(cart) {
  try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart)) } catch { /* private browsing; the basket is just not remembered */ }
  return cart
}

export const CartAPI = {
  async get() {
    assertConnected()
    const user = await currentUser()
    if (!user) return readGuestCart()
    const { data: cart } = await supabase.from('carts').select('id').eq('customer_id', user.id).maybeSingle()
    if (!cart) return { items: [] }
    const { data: items } = await supabase.from('cart_items').select('product_id, quantity').eq('cart_id', cart.id)
    return { items: (items ?? []).map((i) => ({ productId: i.product_id, quantity: i.quantity })) }
  },
  async setQuantity(productId, quantity) {
    assertConnected()
    const user = await currentUser()
    if (!user) {
      const cart = readGuestCart()
      const existing = cart.items.find((i) => i.productId === productId)
      if (quantity <= 0) cart.items = cart.items.filter((i) => i.productId !== productId)
      else if (existing) existing.quantity = quantity
      else cart.items.push({ productId, quantity })
      return writeGuestCart(cart)
    }
    let { data: cart } = await supabase.from('carts').select('id').eq('customer_id', user.id).maybeSingle()
    if (!cart) { const { data } = await supabase.from('carts').insert({ customer_id: user.id }).select().single(); cart = data }
    if (quantity <= 0) await supabase.from('cart_items').delete().eq('cart_id', cart.id).eq('product_id', productId)
    else await supabase.from('cart_items').upsert({ cart_id: cart.id, product_id: productId, quantity }, { onConflict: 'cart_id,product_id' })
    return this.get()
  },
  async clear() {
    assertConnected()
    const user = await currentUser()
    if (!user) return writeGuestCart({ items: [] })
    const { data: cart } = await supabase.from('carts').select('id').eq('customer_id', user.id).maybeSingle()
    if (cart) await supabase.from('cart_items').delete().eq('cart_id', cart.id)
    return { items: [] }
  },
  // Called once on sign-in. Somebody who filled a basket and then signed in to pay would
  // otherwise watch it empty at the moment they identified themselves, which reads as the shop
  // losing their order.
  async adoptGuestCart() {
    assertConnected()
    const guest = readGuestCart()
    if (!guest.items?.length) return this.get()
    const user = await currentUser()
    if (!user) return guest
    for (const item of guest.items) {
      try { await this.setQuantity(item.productId, item.quantity) } catch { /* a line that no longer exists should not block the rest */ }
    }
    writeGuestCart({ items: [] })
    return this.get()
  },
}

// Orders carry the buyer's name for every staff screen, and their lines for the basket summary.
const ORDER_SELECT = '*, customer:profiles!orders_customer_id_fkey(full_name, email), order_items(*)'

function mapOrderRow(row, history = []) {
  return {
    reference: row.reference,
    customerId: row.customer_id ?? null,
    customerName: row.customer?.full_name ?? null,
    email: row.customer?.email ?? null,
    branch: row.branch_id ?? null,
    assignedTo: row.assigned_to ?? null,
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryMethod: row.delivery_method,
    subtotal: row.subtotal == null ? 0 : Number(row.subtotal),
    total: row.total == null ? 0 : Number(row.total),
    cancellationReason: row.cancellation_reason ?? null,
    items: (row.order_items ?? []).map((i) => ({
      productId: i.product_id, name: i.product_name_snapshot,
      price: Number(i.unit_price), quantity: i.quantity,
    })),
    history: history.map((h) => [h.status, new Date(h.changed_at).getTime()]),
    createdAt: new Date(row.created_at).getTime(),
  }
}

async function orderHistory(orderId) {
  const { data } = await supabase.from('order_status_history').select('*').eq('order_id', orderId).order('changed_at')
  return data ?? []
}

export const OrderAPI = {
  // Every row here used to be handed back exactly as Postgres returned it — customer_id,
  // created_at, no lines — while every screen reads customerId, createdAt and items. The lists
  // rendered, with nothing in them.
  async list(customerId) {
    assertConnected()
    let q = supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false })
    // Narrowing only. Asking for somebody else's returns nothing, because the policy decides
    // what is visible and this filter runs inside it.
    if (customerId) q = q.eq('customer_id', customerId)
    const { data, error } = await q
    if (error) throw error
    return data.map((o) => mapOrderRow(o))
  },
  async get(ref) {
    assertConnected()
    const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('reference', ref).maybeSingle()
    if (error) throw error
    if (!data) return null
    return mapOrderRow(data, await orderHistory(data.id))
  },
  async create(payload) {
    assertConnected()
    const profile = await currentProfile()
    const { data: order, error } = await supabase.from('orders').insert({
      // No reference: a sequence issues it (migration 0009).
      customer_id: profile?.id ?? null, branch_id: payload.branchId ?? null,
      delivery_method: payload.deliveryMethod ?? 'delivery',
      subtotal: payload.subtotal, total: payload.total,
      payment_status: 'test_mode', status: 'paid',
    }).select('id, reference').single()
    if (error) throw error

    if (payload.items?.length) {
      const { error: lineError } = await supabase.from('order_items').insert(payload.items.map((i) => ({
        order_id: order.id, product_id: i.productId, product_name_snapshot: i.name,
        unit_price: i.price, quantity: i.quantity,
      })))
      if (lineError) throw lineError
      for (const item of payload.items) {
        try { await ProductAPI.adjustStock(item.productId, -item.quantity, `Order ${order.reference}`) }
        catch { /* stock drifting out of step should not lose the order itself */ }
      }
    }

    const full = await this.get(order.reference)
    // Orders are an admin responsibility, so this is who has to act on it. Nothing told the shop
    // an order had arrived before — the only way to find out was to keep reloading a list — and
    // an order is the case where that matters most: money has been taken for goods that now have
    // to be picked, packed and sent.
    const notice = newOrderNotice(full)
    if (profile && profile.role !== 'customer') {
      const { admins } = await shopAudience(payload.branchId, { except: profile.id })
      await deliver(admins, notice)
    } else {
      await rpcNotify('notify_shop_about_order', full.reference, notice, 'admin')
    }
    return full
  },
  async updateStatus(ref, status) {
    assertConnected()
    const before = await this.get(ref)
    if (!before) return null
    const { data, error } = await supabase.from('orders').update({ status })
      .eq('reference', ref).select(ORDER_SELECT).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('You do not have access to change that order.')
    const after = await this.get(ref)   // for the history the trigger has just written
    // An order moving is as much the customer's business as a repair moving.
    if (after.status !== before.status && after.customerId) {
      await deliver(after.customerId, orderMovedNotice(after, after.status))
    }
    return after
  },
  // Handing an order to somebody to fulfil. This did not exist: an order could be seen by staff
  // and moved by nobody in particular, and the "only the assignee may move it" rule had nothing
  // to check against.
  //
  // Assigning also sets the branch when the order has none, which a web checkout does: staff see
  // their own branch's orders, so without this the person given the order could not see it.
  async assign(ref, staffId) {
    assertConnected()
    const profile = await currentProfile()
    const before = await this.get(ref)
    if (!before) return null
    if ((before.assignedTo ?? null) === (staffId ?? null)) return before

    let branchId = before.branch
    if (staffId) {
      const { data: staff } = await supabase.from('profiles').select('id, full_name, branch_id').eq('id', staffId).maybeSingle()
      if (!staff) throw new Error('That staff account no longer exists.')
      branchId = staff.branch_id ?? branchId
    }

    const patch = { assigned_to: staffId ?? null }
    if (branchId && branchId !== before.branch) patch.branch_id = branchId
    const { data, error } = await supabase.from('orders').update(patch)
      .eq('reference', ref).select(ORDER_SELECT).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Only an admin can assign an order.')
    const after = await this.get(ref)

    if (before.assignedTo) {
      const { data: taker } = staffId
        ? await supabase.from('profiles').select('full_name').eq('id', staffId).maybeSingle()
        : { data: null }
      await deliver(before.assignedTo, orderUnassignedNotice(after, taker?.full_name ?? null))
    }
    if (staffId) await deliver(staffId, orderAssignedNotice(after, profile?.name))
    return after
  },
  async cancel(ref, reason) {
    assertConnected()
    const before = await this.get(ref)
    if (!before) return null
    if (!orderCanBeCancelled(before.status)) {
      throw new Error(`Order ${ref} can no longer be cancelled (${orderStatusLabel(before.status, 'customer')}).`)
    }
    const { data, error } = await supabase.from('orders')
      .update({ status: 'cancelled', cancellation_reason: reason })
      .eq('reference', ref).select(ORDER_SELECT).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('You do not have access to cancel that order.')
    const after = await this.get(ref)
    if (after.customerId) await deliver(after.customerId, orderMovedNotice(after, 'cancelled'))
    for (const item of before.items) {
      try { await ProductAPI.adjustStock(item.productId, item.quantity, `Cancelled order ${ref}`) } catch { /* ignore */ }
    }
    return after
  },
}

function mapTradeInRow(row, history = []) {
  return {
    reference: row.reference,
    customerId: row.customer_id ?? null,
    deviceCategory: row.device_category,
    brand: row.brand, model: row.model,
    storageSpec: row.storage_spec ?? null,
    conditionGrade: row.condition_grade,
    functionalityNotes: row.functionality_notes ?? null,
    indicativeValue: row.indicative_value == null ? null : Number(row.indicative_value),
    finalValuation: row.final_offer == null ? null : Number(row.final_offer),
    status: row.status,
    branchId: row.branch_id ?? null,
    rejectionReason: row.rejection_reason ?? null,
    internalNotes: row.internal_notes ?? null,
    customerNotes: row.customer_notes ?? null,
    inspectedBy: row.inspected_by ?? null,
    history: history.map((h) => [h.status, new Date(h.changed_at).getTime()]),
    createdAt: new Date(row.created_at).getTime(),
  }
}

async function tradeInHistory(id) {
  const { data } = await supabase.from('trade_in_status_history').select('*').eq('trade_in_id', id).order('changed_at')
  return data ?? []
}

export const TradeInAPI = {
  // Filtered to the caller's own rows only when the caller is a customer. It used to filter that
  // way for everybody, so the staff and admin buy-back queues were always empty — the one screen
  // where these requests are actually worked.
  async list() {
    assertConnected()
    const profile = await currentProfile()
    let q = supabase.from('trade_in_requests').select('*').order('created_at', { ascending: false })
    if (!profile) return []
    if (profile.role === 'customer') q = q.eq('customer_id', profile.id)
    const { data, error } = await q
    if (error) throw error
    return data.map((t) => mapTradeInRow(t))
  },
  async get(ref) {
    assertConnected()
    const { data, error } = await supabase.from('trade_in_requests').select('*').eq('reference', ref).maybeSingle()
    if (error) throw error
    if (!data) return null
    return mapTradeInRow(data, await tradeInHistory(data.id))
  },
  async create(payload) {
    assertConnected()
    const profile = await currentProfile()
    const { data, error } = await supabase.from('trade_in_requests').insert({
      customer_id: profile?.id ?? null, device_category: payload.deviceCategory,
      brand: payload.brand, model: payload.model,
      storage_spec: payload.storageSpec ?? null,
      condition_grade: payload.conditionGrade,
      functionality_notes: payload.functionalityNotes ?? null,
      indicative_value: payload.indicativeValue,
      branch_id: payload.branchId ?? payload.branch ?? null,
      status: 'submitted',
    }).select().single()
    if (error) throw error
    const request = mapTradeInRow(data)

    if (request.customerId) await deliver(request.customerId, tradeInMovedNotice(request, 'submitted'))
    await tellShop({
      profile, branchId: request.branchId, reference: request.reference,
      notice: (audience) => newTradeInNotice(request, audience),
      rpc: 'notify_shop_about_trade_in',
    })
    return request
  },
  async update(reference, patch) {
    assertConnected()
    const before = await this.get(reference)
    if (!before) return null

    const dbPatch = {}
    if (patch.status !== undefined && patch.status !== before.status) {
      if (!tradeInCanTransition(before.status, patch.status)) {
        throw new Error(`Cannot move a sale from "${before.status}" to "${patch.status}".`)
      }
      dbPatch.status = patch.status
    }
    if (patch.rejectionReason !== undefined) dbPatch.rejection_reason = patch.rejectionReason
    if (patch.finalValuation !== undefined) dbPatch.final_offer = patch.finalValuation
    if (patch.indicativeValue !== undefined) dbPatch.indicative_value = patch.indicativeValue
    if (patch.internalNotes !== undefined) dbPatch.internal_notes = patch.internalNotes
    if (patch.customerNotes !== undefined) dbPatch.customer_notes = patch.customerNotes
    if (patch.inspectedBy !== undefined) dbPatch.inspected_by = patch.inspectedBy
    if (patch.branchId !== undefined) dbPatch.branch_id = patch.branchId
    if (patch.status === 'offer_declined' && !(dbPatch.rejection_reason ?? before.rejectionReason)) {
      throw new Error('A rejection reason is required.')
    }
    if (Object.keys(dbPatch).length === 0) return before

    const { data, error } = await supabase.from('trade_in_requests').update(dbPatch)
      .eq('reference', reference).select().maybeSingle()
    if (error) throw error
    if (!data) throw new Error('You do not have access to change that request.')
    const after = await this.get(reference)
    if (dbPatch.status && after.customerId) await deliver(after.customerId, tradeInMovedNotice(after, after.status))
    return after
  },
  // The customer's answer to their own offer. This existed only in the mock adapter: against a
  // real backend an offer could be accepted by an admin on the customer's behalf, which is not
  // an offer, and the database now refuses it outright (migration 0008).
  async respondToOffer(reference, accepted, reason) {
    assertConnected()
    const profile = await currentProfile()
    const before = await this.get(reference)
    if (!before) return null
    if (before.status !== 'offer_sent') throw new Error('There is no offer waiting on this request.')
    if (!accepted && !reason) throw new Error('Please tell us why you are declining.')

    const status = accepted ? 'offer_accepted' : 'offer_declined'
    const { data, error } = await supabase.from('trade_in_requests')
      .update({ status, ...(accepted ? {} : { rejection_reason: reason }) })
      .eq('reference', reference).select().maybeSingle()
    if (error) throw error
    if (!data) throw new Error('You can only answer your own offer.')
    const after = await this.get(reference)

    if (after.customerId) await deliver(after.customerId, tradeInMovedNotice(after, status))
    // And the shop, which otherwise heard nothing: an accepted offer needs paying and a declined
    // one needs the device sending back, and neither happens if nobody is told.
    await tellShop({
      profile, branchId: after.branchId, reference,
      notice: (audience) => offerAnsweredNotice(after, accepted, audience),
      rpc: 'notify_shop_about_trade_in',
    })
    return after
  },
  async cancel(reference) {
    assertConnected()
    const before = await this.get(reference)
    if (!before) return null
    if (!['submitted', 'valuation_review'].includes(before.status)) {
      throw new Error(`This request can no longer be withdrawn (${before.status}).`)
    }
    const { data, error } = await supabase.from('trade_in_requests').update({ status: 'cancelled' })
      .eq('reference', reference).select().maybeSingle()
    if (error) throw error
    if (!data) throw new Error('You can only withdraw your own request.')
    return this.get(reference)
  },
}

function mapProfileRow(u) {
  return {
    id: u.id, name: u.full_name, email: u.email, role: u.role, branch: u.branch_id, phone: u.phone,
    status: u.status ?? 'active', archived: !!u.archived, superAdmin: !!u.super_admin,
    jobTitle: u.job_title ?? null, specialisations: u.specialisations ?? [],
    lastActiveAt: u.last_active_at ? new Date(u.last_active_at).getTime() : null,
  }
}

export const UserAPI = {
  async list() {
    assertConnected()
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) throw error
    return data.map(mapProfileRow)
  },
  async get(id) {
    assertConnected()
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (error) throw error
    return mapProfileRow(data)
  },
  // Creating a real auth user requires the Supabase Admin API (service role key), which must
  // never run in the browser — do this from a server function/edge function in production.
  async create() {
    throw new Error('Creating platform users requires a server-side Supabase Admin API call — not available from the browser client.')
  },
  async update(id, patch) {
    assertConnected()
    const dbPatch = {}
    if (patch.name !== undefined) dbPatch.full_name = patch.name
    if (patch.phone !== undefined) dbPatch.phone = patch.phone
    if (patch.role !== undefined) dbPatch.role = patch.role
    if (patch.branch !== undefined) dbPatch.branch_id = patch.branch
    if (patch.status !== undefined) dbPatch.status = patch.status
    if (patch.archived !== undefined) dbPatch.archived = patch.archived
    if (patch.jobTitle !== undefined) dbPatch.job_title = patch.jobTitle
    if (patch.specialisations !== undefined) dbPatch.specialisations = patch.specialisations
    if (patch.lastActiveAt !== undefined) dbPatch.last_active_at = new Date(patch.lastActiveAt).toISOString()
    const { data, error } = await supabase.from('profiles').update(dbPatch).eq('id', id).select().single()
    if (error) throw error
    return mapProfileRow(data)
  },
  async setStatus(id, status, actor) {
    if (status === 'inactive' && actor?.role === 'admin' && actor.id === id) throw new Error("You can't deactivate your own account.")
    return this.update(id, { status })
  },
  async setRole(id, role, actor) {
    if (role === 'admin' && !actor?.superAdmin) throw new Error('Only a super admin can promote an account to admin.')
    if (actor?.role !== 'admin') throw new Error('Only an admin can change account roles.')
    return this.update(id, { role })
  },
  async assignBranch(id, branch) { return this.update(id, { branch }) },
  async touchActivity(id) { return this.update(id, { lastActiveAt: Date.now() }) },
  async archive(id, actor) {
    if (actor?.role === 'admin' && actor.id === id) throw new Error("You can't archive your own account.")
    return this.update(id, { archived: true, status: 'inactive' })
  },
  async restore(id) { return this.update(id, { archived: false }) },
  // Passwords live in AuthAPI at the foot of this file, matching ./mock.js. A "forgot my
  // password" email would be supabase.auth.resetPasswordForEmail here, but there is no such
  // flow in the app yet and an unreachable method is worse than none.
  async remove(id, opts = {}, actor) {
    // Supabase RLS + FK constraints govern the deactivate-vs-delete decision server-side;
    // the UI should already have decided before calling — this always deactivates for safety
    // from the client. An admin can never remove their own account.
    if (actor?.role === 'admin' && actor.id === id) throw new Error("You can't delete your own account.")
    if (opts.blockers?.length) { await this.setStatus(id, 'inactive'); return { deleted: false, deactivated: true } }
    await this.setStatus(id, 'inactive')
    return { deleted: false, deactivated: true }
  },
  async listNotes(customerId) {
    assertConnected()
    const { data, error } = await supabase.from('customer_notes').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  async addNote(customerId, note) {
    assertConnected()
    const { data, error } = await supabase.from('customer_notes').insert({ customer_id: customerId, body: note.text, author_id: note.authorId ?? null }).select().single()
    if (error) throw error
    return data
  },
}

export const AddressAPI = {
  async list(customerId) {
    assertConnected()
    const { data, error } = await supabase.from('addresses').select('*').eq('customer_id', customerId)
    if (error) throw error
    return data
  },
  async create(customerId, address) {
    assertConnected()
    const { data, error } = await supabase.from('addresses').insert({
      customer_id: customerId, label: address.label, line1: address.line1, line2: address.line2,
      city: address.city, postcode: address.postcode, is_default: !!address.isDefault,
    }).select().single()
    if (error) throw error
    return data
  },
}

export const WarrantyAPI = {
  async list(customerId) {
    assertConnected()
    const { data, error } = await supabase.from('warranties').select('*').eq('customer_id', customerId)
    if (error) throw error
    return data
  },
}

// `customerId` is what the column has always been called and what the screens filter on; it
// holds whichever account the message is for, which is now sometimes a staff member being told
// about an assignment.
function mapNotificationRow(n) {
  return {
    id: n.id, customerId: n.profile_id, title: n.title, body: n.body,
    ref: n.reference ?? null, link: n.link ?? null,
    read: !!n.read, createdAt: new Date(n.created_at).getTime(),
  }
}

export const NotificationAPI = {
  // Handed back as Postgres returned them before, so the bell rendered rows with no timestamp
  // and nowhere to go when clicked: the screens read createdAt, ref and link.
  async list(customerId) {
    assertConnected()
    let q = supabase.from('notifications').select('*').order('created_at', { ascending: false })
    if (customerId) q = q.eq('profile_id', customerId)
    const { data, error } = await q
    if (error) throw error
    return data.map(mapNotificationRow)
  },
  async create(data) {
    assertConnected()
    const { data: row, error } = await supabase.from('notifications').insert({
      profile_id: data.customerId, title: data.title, body: data.body,
      reference: data.ref ?? null, link: data.link ?? null,
    }).select().single()
    if (error) throw error
    return mapNotificationRow(row)
  },
  async markRead(id) {
    assertConnected()
    const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', id).select().single()
    if (error) throw error
    return mapNotificationRow(data)
  },
  // Both scoped to the caller by RLS rather than by a filter written here: the policies on
  // notifications restrict every row to its own profile, so "mine" is the only thing these can
  // reach even though the statement does not say so.
  async markAllRead() {
    assertConnected()
    const { data, error } = await supabase.from('notifications').update({ read: true }).eq('read', false).select('id')
    if (error) throw error
    return { markedRead: data?.length ?? 0 }
  },
  async clear({ readOnly = false } = {}) {
    assertConnected()
    let q = supabase.from('notifications').delete()
    if (readOnly) q = q.eq('read', true)
    const { data, error } = await q.select('id')
    if (error) throw error
    return { removed: data?.length ?? 0 }
  },
}

export const SettingsAPI = {
  async get(key, fallback) {
    assertConnected()
    const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
    return data?.value ?? fallback
  },
  async set(key, value) {
    assertConnected()
    const { error } = await supabase.from('settings').upsert({ key, value })
    if (error) throw error
    return value
  },
}

export const AuditAPI = {
  async log(entry) {
    assertConnected()
    await supabase.from('audit_logs').insert({
      actor_id: entry.actorId, actor_role: entry.actorRole, action: entry.action,
      entity_type: entry.entityType, entity_id: entry.entityId, before: entry.before ?? null,
      after: entry.after ?? null, reason: entry.reason ?? null,
    })
    return true
  },
  async list(filters = {}) {
    assertConnected()
    let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500)
    if (filters.entityType) q = q.eq('entity_type', filters.entityType)
    if (filters.actorId) q = q.eq('actor_id', filters.actorId)
    const { data, error } = await q
    if (error) throw error
    return data
  },
}

// Rota records backing wage calculation. Hours and pay are derived in src/lib/wages.js from
// these rows — same contract as the mock adapter, so the reports need no branch of their own.
export const ShiftAPI = {
  async list(filters = {}) {
    assertConnected()
    let q = supabase.from('shifts').select('*')
    if (filters.staffId) q = q.eq('staff_id', filters.staffId)
    if (filters.branchId) q = q.eq('branch_id', filters.branchId)
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.from != null) q = q.gte('worked_on', new Date(filters.from).toISOString().slice(0, 10))
    if (filters.to != null) q = q.lte('worked_on', new Date(filters.to).toISOString().slice(0, 10))
    // No client-side ownership filter is needed: the RLS policies in
    // supabase/migrations/0007_shifts_and_costs.sql already restrict a staff member's rows to
    // their own, server-side, whatever this query asks for.
    const { data, error } = await q
    if (error) throw error
    return data.map(mapShiftRow)
  },
  // staff_id, status and the review columns are set by database defaults and triggers, never
  // by the client — a submission cannot arrive pre-approved or filed against a colleague.
  async create(data) {
    assertConnected()
    const { data: row, error } = await supabase.from('shifts').insert({
      branch_id: data.branchId, worked_on: data.date,
      starts_at: data.start ?? null, ends_at: data.end ?? null,
      break_minutes: data.breakMins ?? 0, entry_mode: data.entryMode, hours: data.hours ?? null,
    }).select().single()
    if (error) throw error
    return mapShiftRow(row)
  },
  // Approval is a privileged RPC rather than a plain update, so the transition to 'approved'
  // — the thing that makes hours payable — is decided by the database, not the caller.
  async review(id, decision, note, pay) {
    assertConnected()
    const { data, error } = await supabase.rpc('review_shift', {
      shift_id: id, decision, note: note ?? null, pay: pay ?? null,
    })
    if (error) throw error
    return data ? mapShiftRow(data) : null
  },
  async setPay(id, pay) {
    assertConnected()
    const { data, error } = await supabase.rpc('set_shift_pay', { shift_id: id, pay })
    if (error) throw error
    return data ? mapShiftRow(data) : null
  },
  async resubmit(id, patch = {}) {
    assertConnected()
    const dbPatch = { status: 'pending', review_note: null, reviewed_by: null, reviewed_at: null, approved_pay: null, submitted_at: new Date().toISOString() }
    if (patch.date !== undefined) dbPatch.worked_on = patch.date
    if (patch.start !== undefined) dbPatch.starts_at = patch.start
    if (patch.end !== undefined) dbPatch.ends_at = patch.end
    if (patch.breakMins !== undefined) dbPatch.break_minutes = patch.breakMins
    if (patch.entryMode !== undefined) dbPatch.entry_mode = patch.entryMode
    if (patch.hours !== undefined) dbPatch.hours = patch.hours
    const { data, error } = await supabase.from('shifts').update(dbPatch).eq('id', id).select().single()
    if (error) throw error
    return mapShiftRow(data)
  },
  async update(id, patch) {
    assertConnected()
    const dbPatch = {}
    if (patch.date !== undefined) dbPatch.worked_on = patch.date
    if (patch.start !== undefined) dbPatch.starts_at = patch.start
    if (patch.end !== undefined) dbPatch.ends_at = patch.end
    if (patch.breakMins !== undefined) dbPatch.break_minutes = patch.breakMins
    if (patch.branchId !== undefined) dbPatch.branch_id = patch.branchId
    if (patch.entryMode !== undefined) dbPatch.entry_mode = patch.entryMode
    if (patch.hours !== undefined) dbPatch.hours = patch.hours
    const { data, error } = await supabase.from('shifts').update(dbPatch).eq('id', id).select().single()
    if (error) throw error
    return mapShiftRow(data)
  },
  async remove(id) {
    assertConnected()
    const { error } = await supabase.from('shifts').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

export const PurchaseAPI = {
  async list(filters = {}) {
    assertConnected()
    let q = supabase.from('stock_purchases').select('*')
    if (filters.branchId) q = q.eq('branch_id', filters.branchId)
    if (filters.productId) q = q.eq('product_id', filters.productId)
    if (filters.from != null) q = q.gte('purchased_at', new Date(filters.from).toISOString())
    if (filters.to != null) q = q.lte('purchased_at', new Date(filters.to).toISOString())
    const { data, error } = await q.order('purchased_at', { ascending: false })
    if (error) throw error
    return data.map(mapPurchaseRow)
  },
  async create(data) {
    assertConnected()
    const { data: row, error } = await supabase.from('stock_purchases').insert({
      branch_id: data.branchId, product_id: data.productId, quantity: data.quantity,
      unit_cost: data.unitCost, supplier: data.supplier ?? null,
    }).select().single()
    if (error) throw error
    return mapPurchaseRow(row)
  },
  async allBranchStock() {
    assertConnected()
    const { data, error } = await supabase.from('branch_stock').select('product_id, branch_id, quantity')
    if (error) throw error
    return data.map((r) => ({ productId: r.product_id, branchId: r.branch_id, quantity: r.quantity }))
  },
}

export const TECHS = [] // staff lookup moves to profiles (role='staff'); populate via a dedicated query once staff UI needs it.

// --- authentication -------------------------------------------------------------------------
// Same surface as AuthAPI in ./mock.js, backed by Supabase Auth. The important difference is
// where the secret lives: here the hash never reaches the browser at all, and the checks the
// mock adapter performs in JavaScript are performed by Postgres (supabase/migrations) against
// auth.uid(). That is the boundary the mock adapter cannot provide — see the note in
// src/services/session.js.
export const AuthAPI = {
  // One field for both, matching the mock adapter: an email goes to Supabase Auth directly, a
  // username is resolved to its account's email first. `username` is a unique column on
  // profiles, readable without auth precisely so that sign-in can perform this lookup.
  async signIn({ identifier, password } = {}) {
    assertConnected()
    const id = String(identifier ?? '').trim()
    if (!id || !password) throw new Error('Enter your sign-in details.')

    let email = id
    if (!id.includes('@')) {
      // Through a function rather than a query, because this happens before there is a session
      // and profiles is readable only to the account itself and to staff — as it should be, or
      // the sign-in form becomes a way to list everyone who works here (migration 0011).
      const { data } = await supabase.rpc('email_for_username', { p_username: id })
      // Deliberately not an early return: an unknown username must fail the same way a wrong
      // password does, so the form cannot be used to discover who works here.
      email = data ?? `${id.toLowerCase()}@invalid.local`
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Those sign-in details are not recognised.')

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    if (profile?.archived || profile?.status === 'inactive') {
      await supabase.auth.signOut()
      throw new Error('That account is no longer active. Please speak to your branch manager.')
    }
    return {
      user: mapProfileRow(profile),
      mustChangePassword: !!profile?.must_change_password,
    }
  },

  // Signing up through the public client can only ever create a customer: the profiles insert
  // trigger sets role='customer' server-side and ignores whatever the client sends, so this is
  // not a promise the UI is keeping on its own.
  async registerCustomer({ name, email, phone, password } = {}) {
    assertConnected()
    const { data, error } = await supabase.auth.signUp({
      email: String(email ?? '').trim().toLowerCase(),
      password,
      options: { data: { full_name: name, phone } },
    })
    if (error) throw error
    return { id: data.user?.id, name, email, phone, role: 'customer', status: 'active' }
  },

  async changeOwnPassword({ newPassword } = {}) {
    assertConnected()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    await supabase.from('profiles').update({ must_change_password: false, password_change_allowed: false })
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
    return { changed: true }
  },

  // Setting somebody else's password needs the Admin API and the service role key, which must
  // never be shipped to a browser. In production this calls an edge function that checks the
  // caller is an admin and then performs the update server-side.
  async issueCredentials() {
    throw new Error('Issuing sign-in details requires a server-side Supabase Admin API call — not available from the browser client.')
  },

  async setPasswordChangePermission(userId, allowed) {
    assertConnected()
    const { error } = await supabase.from('profiles').update({ password_change_allowed: !!allowed }).eq('id', userId)
    if (error) throw error
    return { userId, changeAllowed: !!allowed }
  },

  async signInDetails(userId) {
    assertConnected()
    const { data, error } = await supabase.from('profiles')
      .select('id, username, must_change_password, password_change_allowed').eq('id', userId).single()
    if (error) throw error
    return {
      userId: data.id, username: data.username, hasPassword: true,
      mustChange: !!data.must_change_password, changeAllowed: !!data.password_change_allowed,
    }
  },

  async forgetCredentials() {
    throw new Error('Removing an auth user requires a server-side Supabase Admin API call — not available from the browser client.')
  },
}
