// Stock purchase records — what each branch spent restocking, and the counterweight to the
// sales ledger. `unitCost` is stored per record rather than read off the product, because the
// cost of a batch is whatever was paid on the day; changing a product's price later must not
// silently rewrite what a branch spent last month.
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

const SUPPLIERS = ['MobileParts Direct', 'TechSource UK', 'Kent Wholesale', 'Refurb Partners Ltd', 'CellSpares EU']

// Trade price as a fraction of shelf price, by condition — refurbished stock is bought closer
// to its selling price than brand-new accessories are.
const COST_RATIO = { New: 0.62, Used: 0.7, Refurbished: 0.74 }

export function generatePurchases(days = 90, seed = 431907) {
  const rand = rng(seed)
  const out = []
  const start = Date.now() - days * DAY
  let n = 0

  // Branches restock roughly weekly rather than daily.
  for (let d = 0; d < days; d += 7) {
    const weekTs = start + d * DAY
    for (const b of BRANCHES) {
      const lines = 2 + Math.floor(rand() * 4)
      for (let i = 0; i < lines; i++) {
        n++
        const p = PRODUCTS[Math.floor(rand() * PRODUCTS.length)]
        const quantity = 1 + Math.floor(rand() * 6)
        const ratio = COST_RATIO[p.cond] ?? 0.65
        // ±6% haggling either side of the standard trade price.
        const unitCost = Math.round(p.price * ratio * (0.94 + rand() * 0.12) * 100) / 100
        out.push({
          id: 'pur-' + (5000 + n),
          reference: 'VT-PO-' + (5000 + n),
          branchId: b.id,
          productId: p.id,
          productName: p.name,
          quantity,
          unitCost,
          supplier: SUPPLIERS[Math.floor(rand() * SUPPLIERS.length)],
          at: weekTs + Math.floor(rand() * 5) * DAY,
        })
      }
    }
  }
  return out.sort((a, b) => b.at - a.at)
}

export const DEMO_PURCHASES = generatePurchases()

// Opening per-branch allocation of each product's total stock. Deliberately uneven: a product
// can be sitting on the shelf in Woolwich and sold out in Orpington, which is exactly the
// "sold out at this branch" case the branch stock report has to surface.
export function generateBranchStock(products, seed = 90217) {
  const rand = rng(seed)
  const rows = []
  for (const p of products) {
    let remaining = p.stock ?? 0
    // Shuffle branch order per product so the same branches aren't always the ones left empty.
    const order = [...BRANCHES].sort(() => rand() - 0.5)
    order.forEach((b, i) => {
      const last = i === order.length - 1
      // Leave roughly a third of branches with nothing.
      const take = last ? remaining : (rand() < 0.35 ? 0 : Math.min(remaining, Math.floor(rand() * 4)))
      remaining -= take
      rows.push({ productId: p.id, branchId: b.id, quantity: take })
    })
  }
  return rows
}
