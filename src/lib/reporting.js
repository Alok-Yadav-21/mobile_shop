// Reporting aggregation. Pure functions over the sales ledger, purchase records, shifts and
// stock rows — no data fetching, so every figure the admin reports display is unit-testable.
//
// All bucketing is done in *local* time. A sale at 23:30 belongs to the day the branch was
// open, which is not the same day in UTC.
import { NON_EARNING_STATUSES } from '@/constants/finance.js'

const DAY = 86400000

export const round2 = (n) => Math.round(n * 100) / 100

// --- period bucketing -------------------------------------------------------------------

export function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Weeks run Monday–Sunday (UK retail convention), not Sunday-first.
export function startOfWeek(ts) {
  const d = new Date(startOfDay(ts))
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return d.getTime()
}

export function startOfMonth(ts) {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

export function periodStart(ts, period) {
  if (period === 'week') return startOfWeek(ts)
  if (period === 'month') return startOfMonth(ts)
  return startOfDay(ts)
}

// Sortable, collision-free key for a bucket. Derived from the bucket's start timestamp so two
// records in the same week always produce the same key regardless of which day they fell on.
export function periodKey(ts, period) {
  const d = new Date(periodStart(ts, period))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  if (period === 'month') return y + '-' + m
  return y + '-' + m + '-' + day
}

export function periodLabel(ts, period) {
  const start = periodStart(ts, period)
  const d = new Date(start)
  if (period === 'month') return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  if (period === 'week') {
    const end = new Date(start + 6 * DAY)
    const sameMonth = d.getMonth() === end.getMonth()
    const left = d.toLocaleDateString('en-GB', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
    const right = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return left + '–' + right
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Inclusive-start, exclusive-end window covering the last N periods up to and including now.
export function rangeForLastPeriods(period, count, now = Date.now()) {
  let from = periodStart(now, period)
  for (let i = 1; i < count; i++) {
    // Step back one period at a time — month lengths differ, so fixed arithmetic would drift.
    from = periodStart(from - 1, period)
  }
  return { from, to: now }
}

// --- sales ------------------------------------------------------------------------------

// Only settled money counts. Cancelled and refunded orders stay in the ledger (they matter to
// the payments screen) but must never appear as earnings.
export const isEarning = (o) => !NON_EARNING_STATUSES.includes(o?.status)

export function withinRange(ts, { from, to } = {}) {
  if (from != null && ts < from) return false
  if (to != null && ts > to) return false
  return true
}

export function filterOrders(orders, { branchId, from, to, kind, earningOnly = true } = {}) {
  return orders.filter((o) => {
    if (earningOnly && !isEarning(o)) return false
    if (branchId && o.branch !== branchId) return false
    if (kind && o.kind !== kind) return false
    return withinRange(o.createdAt, { from, to })
  })
}

// Headline numbers for a set of orders: total taken, split by what produced it and how it was
// paid. `cash + online` always equals `total`.
export function salesSummary(orders) {
  const acc = {
    total: 0, orders: orders.length,
    retail: 0, repair: 0,
    cash: 0, online: 0,
    cashOrders: 0, onlineOrders: 0,
  }
  for (const o of orders) {
    const amount = o.total || 0
    acc.total += amount
    if (o.kind === 'repair') acc.repair += amount
    else acc.retail += amount
    if (o.paymentMethod === 'cash') { acc.cash += amount; acc.cashOrders += 1 }
    else { acc.online += amount; acc.onlineOrders += 1 }
  }
  return {
    ...acc,
    total: round2(acc.total), retail: round2(acc.retail), repair: round2(acc.repair),
    cash: round2(acc.cash), online: round2(acc.online),
    avgOrder: orders.length ? round2(acc.total / orders.length) : 0,
  }
}

// Time series of sales, one entry per period bucket, oldest first. Buckets with no sales are
// omitted rather than zero-filled — callers needing a dense series can fill from the range.
export function salesByPeriod(orders, period, opts = {}) {
  const rows = {}
  for (const o of filterOrders(orders, opts)) {
    const key = periodKey(o.createdAt, period)
    rows[key] ||= { key, start: periodStart(o.createdAt, period), label: periodLabel(o.createdAt, period), orders: [] }
    rows[key].orders.push(o)
  }
  return Object.values(rows)
    .sort((a, b) => a.start - b.start)
    .map((r) => ({ key: r.key, start: r.start, label: r.label, ...salesSummary(r.orders) }))
}

// One row per branch. Every branch is represented, including those that took nothing in the
// window — a branch showing zero is a finding, not a row to hide.
export function salesByBranch(orders, branches, opts = {}) {
  const scoped = filterOrders(orders, opts)
  return branches.map((b) => ({
    branch: b,
    ...salesSummary(scoped.filter((o) => o.branch === b.id)),
  }))
}

// Web checkouts have no originating branch. They still have to appear somewhere, or the branch
// rows silently stop adding up to the overall total.
export function unassignedSales(orders, branches, opts = {}) {
  const ids = new Set(branches.map((b) => b.id))
  const scoped = filterOrders(orders, opts).filter((o) => !o.branch || !ids.has(o.branch))
  return salesSummary(scoped)
}

// --- purchases --------------------------------------------------------------------------

export function purchaseCost(purchases) {
  return round2(purchases.reduce((s, p) => s + (p.quantity || 0) * (p.unitCost || 0), 0))
}

export function filterPurchases(purchases, { branchId, from, to } = {}) {
  return purchases.filter((p) => {
    if (branchId && p.branchId !== branchId) return false
    return withinRange(p.at, { from, to })
  })
}

export function purchasesByBranch(purchases, branches, opts = {}) {
  const scoped = filterPurchases(purchases, opts)
  return branches.map((b) => {
    const mine = scoped.filter((p) => p.branchId === b.id)
    return {
      branch: b,
      cost: purchaseCost(mine),
      units: mine.reduce((s, p) => s + (p.quantity || 0), 0),
      records: mine.length,
    }
  })
}

export function purchasesByPeriod(purchases, period, opts = {}) {
  const rows = {}
  for (const p of filterPurchases(purchases, opts)) {
    const key = periodKey(p.at, period)
    rows[key] ||= { key, start: periodStart(p.at, period), label: periodLabel(p.at, period), items: [] }
    rows[key].items.push(p)
  }
  return Object.values(rows)
    .sort((a, b) => a.start - b.start)
    .map((r) => ({
      key: r.key, start: r.start, label: r.label,
      cost: purchaseCost(r.items),
      units: r.items.reduce((s, p) => s + (p.quantity || 0), 0),
    }))
}

// --- stock ------------------------------------------------------------------------------

export const STOCK_STATES = ['sold_out', 'low', 'in_stock']

export function stockState(quantity, threshold = 3) {
  if (!quantity || quantity <= 0) return 'sold_out'
  if (quantity <= threshold) return 'low'
  return 'in_stock'
}

// Per-product stock position at one branch. `branchStock` rows are the allocation of each
// product's total across branches, so a product can be in stock overall and sold out here.
export function branchStockReport(products, branchStock, branchId) {
  return products.map((p) => {
    const row = branchStock.find((r) => r.productId === p.id && r.branchId === branchId)
    const quantity = row?.quantity ?? 0
    return { product: p, quantity, state: stockState(quantity, p.lowStockThreshold ?? 3) }
  })
}

// Network-wide position for each product, plus which branches are dry — that list is the
// actionable part, because it says where to transfer stock from and to.
export function overallStockReport(products, branchStock, branches) {
  return products.map((p) => {
    const rows = branchStock.filter((r) => r.productId === p.id)
    const total = rows.reduce((s, r) => s + (r.quantity || 0), 0)
    const soldOutBranches = branches.filter((b) => {
      const row = rows.find((r) => r.branchId === b.id)
      return !row || row.quantity <= 0
    })
    return {
      product: p,
      total,
      state: stockState(total, p.lowStockThreshold ?? 3),
      soldOutBranches,
      stockedBranches: branches.length - soldOutBranches.length,
    }
  })
}

// --- combined ---------------------------------------------------------------------------

// The per-branch trading line the overall report is built from: what came in, what stock cost,
// what labour cost, and what is left.
export function branchPerformance({ branch, orders, purchases, wages }) {
  const sales = salesSummary(orders)
  const stockCost = purchaseCost(purchases)
  const wageCost = wages?.wage || 0
  return {
    branch,
    ...sales,
    stockCost,
    wageCost: round2(wageCost),
    wageHours: wages?.hours || 0,
    net: round2(sales.total - stockCost - wageCost),
  }
}
