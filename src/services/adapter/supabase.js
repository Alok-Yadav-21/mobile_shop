// Supabase-backed adapter — same method surface and return shapes as ./mock.js, so page code
// never needs to change when this becomes the active adapter (see ./index.js).
// Requires VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (see .env.example) and the schema in
// supabase/migrations applied to the project.
import { supabase } from '@/lib/supabaseClient.js'
import { canTransition, requiresReason } from '@/constants/status.js'

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
    ref: row.reference, customer: row.customer_name ?? null, phone: row.customer_phone ?? null,
    email: row.customer_email ?? null, branch: row.branch_id, device: row.device_category,
    brand: row.brand, model: row.model, problem: row.problem, fulfilment: row.fulfilment,
    status: STATUS_DB_TO_APP[row.status] ?? row.status, quote: row.quote, tech: row.technician_id,
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

export const RepairAPI = {
  async list() {
    assertConnected()
    const { data, error } = await supabase.from('repairs').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data.map((r) => mapRepairRow(r))
  },
  async forCustomer(_phone) {
    assertConnected()
    const user = await currentUser()
    const { data, error } = await supabase.from('repairs').select('*').eq('customer_id', user?.id)
    if (error) throw error
    return data.map((r) => mapRepairRow(r))
  },
  async forBranch(branch) {
    assertConnected()
    const { data, error } = await supabase.from('repairs').select('*').eq('branch_id', branch)
    if (error) throw error
    return data.map((r) => mapRepairRow(r))
  },
  async get(ref) {
    assertConnected()
    const { data: r, error } = await supabase.from('repairs').select('*').eq('reference', ref).single()
    if (error) throw error
    const { data: history } = await supabase.from('repair_status_history').select('*').eq('repair_id', r.id).order('changed_at')
    const { data: notes } = await supabase.from('repair_notes').select('*').eq('repair_id', r.id).order('created_at')
    return mapRepairRow(r, history ?? [], notes ?? [])
  },
  async create(data) {
    assertConnected()
    const reference = 'SPR-' + Math.floor(4800 + Math.random() * 1000)
    const { data: row, error } = await supabase.from('repairs').insert({
      reference, branch_id: data.branch, device_category: data.device, brand: data.brand,
      model: data.model, problem: data.problem, fulfilment: data.fulfilment ?? 'in_store',
      status: 'booking_received',
    }).select().single()
    if (error) throw error
    return mapRepairRow(row)
  },
  async update(ref, patch) {
    assertConnected()
    const dbPatch = {}
    if (patch.status) {
      const { data: current } = await supabase.from('repairs').select('status').eq('reference', ref).single()
      const currentApp = STATUS_DB_TO_APP[current?.status] ?? current?.status
      if (currentApp !== patch.status) {
        if (!canTransition(currentApp, patch.status)) throw new Error(`Cannot move a repair from "${currentApp}" to "${patch.status}".`)
        if (requiresReason(patch.status) && !patch.cancellationReason) throw new Error('A reason is required to cancel a repair.')
      }
      dbPatch.status = STATUS_APP_TO_DB[patch.status] ?? patch.status
    }
    if (patch.quote !== undefined) dbPatch.quote = patch.quote
    if (patch.tech !== undefined) dbPatch.technician_id = patch.tech
    if (patch.cancellationReason !== undefined) dbPatch.cancellation_reason = patch.cancellationReason
    if (patch.archived !== undefined) dbPatch.archived = patch.archived
    const { data: row, error } = await supabase.from('repairs').update(dbPatch).eq('reference', ref).select().single()
    if (error) throw error
    if (patch.status) await supabase.from('repair_status_history').insert({ repair_id: row.id, status: dbPatch.status })
    return mapRepairRow(row)
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
    was: p.was_price ? Number(p.was_price) : undefined, cond: p.condition, img: p.image_url,
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
  async nearest(pc) {
    const all = await this.list()
    const out = (pc || '').toUpperCase().replace(/\s+/g, '').match(/^[A-Z]{1,2}\d/)?.[0] || ''
    return all.filter((b) => b.pc.replace(/\s+/g, '').startsWith(out))
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

export const CartAPI = {
  async get() {
    assertConnected()
    const user = await currentUser()
    const { data: cart } = await supabase.from('carts').select('id').eq('customer_id', user?.id).maybeSingle()
    if (!cart) return { items: [] }
    const { data: items } = await supabase.from('cart_items').select('product_id, quantity').eq('cart_id', cart.id)
    return { items: (items ?? []).map((i) => ({ productId: i.product_id, quantity: i.quantity })) }
  },
  async setQuantity(productId, quantity) {
    assertConnected()
    const user = await currentUser()
    let { data: cart } = await supabase.from('carts').select('id').eq('customer_id', user?.id).maybeSingle()
    if (!cart) { const { data } = await supabase.from('carts').insert({ customer_id: user?.id }).select().single(); cart = data }
    if (quantity <= 0) await supabase.from('cart_items').delete().eq('cart_id', cart.id).eq('product_id', productId)
    else await supabase.from('cart_items').upsert({ cart_id: cart.id, product_id: productId, quantity })
    return this.get()
  },
  async clear() {
    assertConnected()
    const user = await currentUser()
    const { data: cart } = await supabase.from('carts').select('id').eq('customer_id', user?.id).maybeSingle()
    if (cart) await supabase.from('cart_items').delete().eq('cart_id', cart.id)
    return { items: [] }
  },
}

export const OrderAPI = {
  async list(customerId) {
    assertConnected()
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (customerId) q = q.eq('customer_id', customerId)
    const { data, error } = await q
    if (error) throw error
    return data
  },
  async get(ref) {
    assertConnected()
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('reference', ref).single()
    if (error) throw error
    return data
  },
  async create(payload) {
    assertConnected()
    const reference = 'VT-ORD-' + Math.floor(10000 + Math.random() * 9000)
    const user = await currentUser()
    const { data: order, error } = await supabase.from('orders').insert({
      reference, customer_id: user?.id, branch_id: payload.branchId ?? null,
      delivery_method: payload.deliveryMethod ?? 'delivery', subtotal: payload.subtotal, total: payload.total,
      payment_status: 'test_mode', status: 'paid',
    }).select().single()
    if (error) throw error
    if (payload.items?.length) {
      await supabase.from('order_items').insert(payload.items.map((i) => ({
        order_id: order.id, product_id: i.productId, product_name_snapshot: i.name, unit_price: i.price, quantity: i.quantity,
      })))
      for (const item of payload.items) await ProductAPI.adjustStock(item.productId, -item.quantity, `Order ${reference}`)
    }
    return order
  },
  async updateStatus(ref, status) {
    assertConnected()
    const { data, error } = await supabase.from('orders').update({ status }).eq('reference', ref).select().single()
    if (error) throw error
    return data
  },
  async cancel(ref, reason) {
    assertConnected()
    const { data: o, error } = await supabase.from('orders').select('*, order_items(*)').eq('reference', ref).single()
    if (error) throw error
    if (['dispatched', 'completed', 'cancelled'].includes(o.status)) throw new Error(`Order ${ref} can no longer be cancelled (status: ${o.status}).`)
    const { data: row, error: updErr } = await supabase.from('orders').update({ status: 'cancelled', cancellation_reason: reason }).eq('reference', ref).select().single()
    if (updErr) throw updErr
    for (const item of o.order_items || []) await ProductAPI.adjustStock(item.product_id, item.quantity, `Cancelled order ${ref}`)
    return row
  },
}

export const TradeInAPI = {
  async list() {
    assertConnected()
    const user = await currentUser()
    const { data, error } = await supabase.from('trade_in_requests').select('*').eq('customer_id', user?.id)
    if (error) throw error
    return data
  },
  async get(ref) {
    assertConnected()
    const { data, error } = await supabase.from('trade_in_requests').select('*').eq('reference', ref).single()
    if (error) throw error
    return data
  },
  async create(payload) {
    assertConnected()
    const reference = 'VT-TI-' + Math.floor(3000 + Math.random() * 900)
    const user = await currentUser()
    const { data, error } = await supabase.from('trade_in_requests').insert({
      reference, customer_id: user?.id, device_category: payload.deviceCategory, brand: payload.brand,
      model: payload.model, condition_grade: payload.conditionGrade, indicative_value: payload.indicativeValue,
      branch_id: payload.branchId ?? null, status: 'submitted',
    }).select().single()
    if (error) throw error
    return data
  },
  async update(reference, patch) {
    assertConnected()
    const dbPatch = {}
    if (patch.status !== undefined) dbPatch.status = patch.status
    if (patch.rejectionReason !== undefined) dbPatch.rejection_reason = patch.rejectionReason
    if (patch.finalValuation !== undefined) dbPatch.final_offer = patch.finalValuation
    if (patch.internalNotes !== undefined) dbPatch.internal_notes = patch.internalNotes
    if (patch.customerNotes !== undefined) dbPatch.customer_notes = patch.customerNotes
    if (patch.inspectedBy !== undefined) dbPatch.inspected_by = patch.inspectedBy
    if (patch.branchId !== undefined) dbPatch.branch_id = patch.branchId
    if (patch.status === 'offer_declined' && !dbPatch.rejection_reason) throw new Error('A rejection reason is required.')
    const { data, error } = await supabase.from('trade_in_requests').update(dbPatch).eq('reference', reference).select().single()
    if (error) throw error
    return data
  },
  async cancel(reference) {
    assertConnected()
    const { data: t, error } = await supabase.from('trade_in_requests').select('status').eq('reference', reference).single()
    if (error) throw error
    if (!['submitted', 'inspecting'].includes(t.status)) throw new Error(`Trade-in ${reference} can no longer be cancelled (status: ${t.status}).`)
    const { data, error: updErr } = await supabase.from('trade_in_requests').update({ status: 'cancelled' }).eq('reference', reference).select().single()
    if (updErr) throw updErr
    return data
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
  async resetPassword(id) {
    assertConnected()
    const user = await this.get(id)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email)
    if (error) throw error
    return { sent: true, email: user.email }
  },
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

export const NotificationAPI = {
  async list(customerId) {
    assertConnected()
    let q = supabase.from('notifications').select('*').order('created_at', { ascending: false })
    if (customerId) q = q.eq('profile_id', customerId)
    const { data, error } = await q
    if (error) throw error
    return data
  },
  async create(data) {
    assertConnected()
    const { data: row, error } = await supabase.from('notifications').insert({
      profile_id: data.customerId, title: data.title, body: data.body,
    }).select().single()
    if (error) throw error
    return row
  },
  async markRead(id) {
    assertConnected()
    const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', id).select().single()
    if (error) throw error
    return data
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
