// The sales ledger — one record per earning event, and the single source of truth for every
// revenue figure in the admin reports.
//
// Both retail product sales and completed repair jobs land here as orders, tagged with `kind`.
// Keeping one ledger (rather than summing catalogue orders in one place and repair quotes in
// another) is what stops the same money being counted twice, and gives every earning the three
// fields the reports need: which branch took it, when, and how it was paid.
import { PRODUCTS } from './products.js'
import { BRANCHES } from './branches.js'

const DAY = 86400000

function rng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const REPAIR_JOBS = [
  { name: 'Screen replacement', price: 119 },
  { name: 'Battery replacement', price: 79 },
  { name: 'Charging-port repair', price: 69 },
  { name: 'Water-damage treatment', price: 89 },
  { name: 'Camera module replacement', price: 95 },
  { name: 'Back-glass replacement', price: 75 },
  { name: 'Software / data recovery', price: 59 },
  { name: 'Laptop keyboard replacement', price: 129 },
]

const CUSTOMERS = [
  'Maria Lopez', 'Tom Reid', 'Sara Khan', 'James Obi', 'Chloe Bennett', 'Hassan Ali',
  'Grace Turner', 'Ben Cooper', 'Yusuf Rahman', 'Emily Ward', 'Oliver Grant', 'Aisha Noor',
]

// Busier branches sell more — a flat distribution would make the per-branch report pointless.
const BRANCH_WEIGHT = { wol: 1.5, blv: 1.25, sid: 1.15, nel: 1, orp: 0.9, wbs: 0.8, whr: 0.7, nsa: 0.55 }

export function generateOrders(days = 90, seed = 776211) {
  const rand = rng(seed)
  const out = []
  const generatedAt = Date.now()
  const start = generatedAt - days * DAY
  let n = 0

  for (let d = 0; d < days; d++) {
    const ts = start + d * DAY
    const weekday = new Date(ts).getDay()
    if (weekday === 0) continue

    for (const b of BRANCHES) {
      // Saturdays run hot, mid-week runs quiet.
      const base = (weekday === 6 ? 5 : 3) * (BRANCH_WEIGHT[b.id] ?? 1)
      const count = Math.round(base * (0.6 + rand() * 0.9))

      for (let i = 0; i < count; i++) {
        n++
        // Spread each order across opening hours so day-level reporting has real timestamps.
        const createdAt = ts - (ts % DAY) + (9 + Math.floor(rand() * 9)) * 3600000 + Math.floor(rand() * 60) * 60000
        const isRepair = rand() < 0.55
        const customerName = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)]
        // Repairs are usually settled in-store in cash; retail skews online.
        const paymentMethod = rand() < (isRepair ? 0.55 : 0.3) ? 'cash' : 'online'

        let items, total
        if (isRepair) {
          const job = REPAIR_JOBS[Math.floor(rand() * REPAIR_JOBS.length)]
          items = [{ productId: null, name: job.name, price: job.price, quantity: 1 }]
          total = job.price
        } else {
          const lineCount = rand() < 0.75 ? 1 : 2
          items = []
          for (let l = 0; l < lineCount; l++) {
            const p = PRODUCTS[Math.floor(rand() * PRODUCTS.length)]
            items.push({ productId: p.id, name: p.name, price: p.price, quantity: 1 })
          }
          total = items.reduce((s, it) => s + it.price * it.quantity, 0)
        }

        // A small tail of refunds/cancellations, so the reports have to exclude them rather
        // than every seeded order counting as clean revenue.
        //
        // Everything older than a couple of days is finished, because in a real shop it would
        // be: an order from six weeks ago is not still waiting to be picked. They all used to
        // sit at 'paid', which was fine while nothing read this as a queue — but the branch's
        // "Orders to fulfil" page then opened on four hundred orders that needed nothing doing.
        // Delivered and collected are both earning statuses, so the revenue reports are
        // unchanged (see isEarning in src/lib/reporting.js).
        const roll = rand()
        const settled = createdAt < generatedAt - 2 * DAY
        const status = roll > 0.975 ? 'refunded'
          : roll > 0.96 ? 'cancelled'
          : settled ? (paymentMethod === 'cash' ? 'collected' : 'delivered')
          : roll > 0.6 ? 'paid' : roll > 0.3 ? 'processing' : 'ready'

        out.push({
          reference: 'VT-ORD-' + (20000 + n),
          kind: isRepair ? 'repair' : 'retail',
          branch: b.id,
          paymentMethod,
          customerId: 'seed',
          customerName,
          items,
          total,
          status,
          paymentStatus: 'test_mode',
          createdAt,
        })
      }
    }
  }
  // Newest first, matching the order the adapter hands records back in.
  return out.sort((a, b) => b.createdAt - a.createdAt)
}

export const DEMO_ORDERS = generateOrders()
