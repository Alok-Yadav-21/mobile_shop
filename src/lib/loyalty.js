// The loyalty points rules. No storage, no roles, no React — so the customer's
// checkout, the branch counter, the admin's adjustment screen and the adapters all work the
// figure out the same way, and the awkward cases can be pinned by tests rather than argued about.
//
// The scheme in one line: spend earns points, points buy credit, and credit can never cover more
// than a fifth of a bill.
//
// Reusing the app's own vocabulary for "this is finished" and "this was called off", rather than
// writing a second list that drifts from the timelines the customer is already looking at.
import { ORDER_FINISHED, ORDER_TERMINAL, REPAIR_FINISHED, REPAIR_STOPPED } from '@/constants/status.js'

// --- earning ---------------------------------------------------------------------------------

// Five points per complete £10 spent.
export const POINTS_PER_BLOCK = 5
export const SPEND_BLOCK = 10

// --- what a point is worth -------------------------------------------------------------------

// Ten points are worth £2, and points are only ever redeemed ten at a time. A single point has
// no value on its own, which is why every figure here is derived from whole blocks of ten rather
// than from a per-point rate: £0.20 a point invites rounding, and rounding invites disputes.
export const REDEEM_STEP = 10
export const CREDIT_PER_STEP = 2

// --- the cap ---------------------------------------------------------------------------------

// Points may cover at most a fifth of a bill. Without this a customer with a large balance could
// take a repair to nothing, and the branch would have done the work for no money at all.
export const MAX_DISCOUNT_RATE = 0.2

// Money arrives as floats (0.2 * 41 is 8.200000000000001), and a bare Math.floor on that turns
// a penny of binary noise into ten lost points. Nudging up by a millionth of a penny before
// flooring costs nothing and never rounds a customer down for a rounding error.
const EPSILON = 1e-9
const floorTo = (value, step) => Math.floor(value / step + EPSILON) * step

/**
 * Points earned by spending `amount`.
 *
 * Five per complete £10 — but only once the bill is over £10. That is the scheme as written, and
 * it does mean £10 exactly earns nothing while £11 earns five; the threshold is a threshold, not
 * the first block. Everything above it is straightforward: £20 earns 10, £50 earns 25, £100
 * earns 50.
 */
export function pointsEarnedFor(amount) {
  const spend = Number(amount)
  if (!Number.isFinite(spend) || spend <= SPEND_BLOCK) return 0
  return floorTo(spend, SPEND_BLOCK) / SPEND_BLOCK * POINTS_PER_BLOCK
}

/** What a balance of points is worth in pounds. Part-blocks are worth nothing until completed. */
export function creditValue(points) {
  const held = Number(points)
  if (!Number.isFinite(held) || held < REDEEM_STEP) return 0
  return floorTo(held, REDEEM_STEP) / REDEEM_STEP * CREDIT_PER_STEP
}

/** The discount a given number of points buys. The inverse of creditValue, for a chosen amount. */
export const discountForPoints = (points) => creditValue(points)

/** How many points buy a given amount of credit, rounded down to a whole block. */
export function pointsForCredit(credit) {
  const value = Number(credit)
  if (!Number.isFinite(value) || value <= 0) return 0
  return floorTo(value, CREDIT_PER_STEP) / CREDIT_PER_STEP * REDEEM_STEP
}

/**
 * The most points that may be put against a bill of `total`, given a balance of `balance`.
 *
 * Three limits at once, and the smallest wins: what they hold, what the 20% cap allows, and the
 * fact that points move ten at a time. A £40 bill caps the discount at £8, which is 40 points —
 * so a customer holding 500 may still only spend 40 of them here.
 */
export function maxRedeemablePoints(balance, total) {
  const held = Number(balance)
  const bill = Number(total)
  if (!Number.isFinite(held) || !Number.isFinite(bill) || held < REDEEM_STEP || bill <= 0) return 0
  return Math.min(floorTo(held, REDEEM_STEP), pointsForCredit(bill * MAX_DISCOUNT_RATE))
}

/**
 * What actually happens if `requested` points are put against a bill of `total`.
 *
 * Returns the points that will really be taken, the discount they buy, and what is left to pay.
 * Asking for more than is allowed is not an error — it is trimmed to the maximum, because a
 * checkout that refuses the whole redemption over an off-by-one is worse than one that quietly
 * applies what it can and shows the customer the result.
 */
export function applyRedemption({ balance = 0, total = 0, requested = 0 } = {}) {
  const cap = maxRedeemablePoints(balance, total)
  const asked = Number.isFinite(Number(requested)) ? Math.max(0, floorTo(Number(requested), REDEEM_STEP)) : 0
  const points = Math.min(asked, cap)
  const discount = discountForPoints(points)
  return {
    points,
    discount,
    payable: Math.max(0, Number((Number(total) - discount).toFixed(2))),
    maxPoints: cap,
    // True when they asked for more than the rules allow, so the screen can say why rather than
    // silently showing a smaller number than the one they picked.
    trimmed: asked > cap,
  }
}

/**
 * How many points to post to bring one transaction into line with what it currently entitles
 * the customer to.
 *
 * `credited` is what this transaction's own movements already add up to, `target` is the
 * entitlement now (the points for a finished transaction, zero for one cancelled, refunded, or
 * moved back before the finish line), and `balance` is what the account actually holds.
 *
 * Posting the difference rather than recording a one-shot "awarded" flag is what makes the
 * ledger self-correcting. The flag was the first attempt and it was wrong in a way worth
 * remembering: once an order's points had been reversed, marking it delivered again could never
 * pay them back, so a staff member correcting a mis-click silently cost the customer their
 * points.
 *
 * A clawback is capped at what the account holds. A customer who earned points on an order and
 * has since spent them cannot be left owing — the shop absorbs the difference, because a
 * negative balance is not something this scheme has.
 */
export function settlementDelta({ credited = 0, target = 0, balance = 0 } = {}) {
  const delta = Math.round((Number(target) || 0) - (Number(credited) || 0))
  if (delta >= 0) return delta
  const clawback = Math.min(-delta, Math.max(0, Number(balance) || 0))
  // Normalised, because negating zero gives -0, and -0 has no business being written into a
  // ledger row where somebody will later read it back as a movement.
  return clawback === 0 ? 0 : -clawback
}

/** The balance a ledger adds up to. The balance is never stored — it is only ever this sum. */
export function balanceFrom(entries = []) {
  return entries.reduce((sum, e) => sum + (Number(e?.delta) || 0), 0)
}

// --- how a movement is described -------------------------------------------------------------

export const LOYALTY_KINDS = ['earned', 'redeemed', 'reversed', 'adjusted']

export const LOYALTY_KIND_LABELS = {
  earned: 'Earned',
  redeemed: 'Redeemed',
  reversed: 'Reversed',
  adjusted: 'Adjusted',
}

// What each movement is called on the customer's own history, which should read as a sentence
// about their account rather than as a row in a ledger.
export function describeMovement(entry) {
  const points = Math.abs(Number(entry?.delta) || 0)
  const reference = entry?.sourceRef ? ` on ${entry.sourceRef}` : ''
  switch (entry?.kind) {
    case 'earned': return `Earned ${points} points${reference}`
    case 'redeemed': return `Redeemed ${points} points${reference} for ${formatCredit(discountForPoints(points))}`
    case 'reversed': return `${points} points returned${reference}`
    case 'adjusted': return `${(Number(entry?.delta) || 0) >= 0 ? 'Added' : 'Removed'} ${points} points`
    default: return `${points} points`
  }
}

const formatCredit = (n) => `£${Number(n).toFixed(2).replace(/\.00$/, '')}`

// --- which transactions earn ------------------------------------------------------------------


/**
 * Does this order earn points, and on what?
 *
 * Points land when the transaction is finished — the goods are with the customer — and not when
 * it is merely placed, because an order can still be cancelled up to the moment it ships.
 *
 * A deliberate judgement, worth knowing about: this does NOT additionally require the online
 * payment to have settled. This shop takes payment at the counter ("Pay on collection, no
 * deposit needed"), and the system has no record of that happening — orders.payment_status
 * describes the online card step, which nobody can complete because Stripe is not connected yet.
 * Requiring settlement here would mean no customer ever earns a single point until it is.
 *
 * When payments go live, this is the one function to tighten: add the settlement check here and
 * every caller inherits it.
 */
export function orderEarnsPoints(order) {
  if (!order) return null
  if (ORDER_TERMINAL.includes(order.status) || order.status === 'refunded') return null
  if (!ORDER_FINISHED.includes(order.status)) return null
  // Earned on what was actually paid. Points redeemed against this same bill reduce it, so a
  // discount cannot quietly earn its own points back.
  const spend = Number(order.total) || 0
  const points = pointsEarnedFor(spend)
  return points > 0 ? { points, spend } : null
}

/**
 * The same for a repair. A repair is paid at the counter when the device is handed back, so
 * "Completed" is the moment money changes hands, and the quote is what was charged.
 */
export function repairEarnsPoints(repair) {
  if (!repair) return null
  if (REPAIR_STOPPED.includes(repair.status)) return null
  if (!REPAIR_FINISHED.includes(repair.status)) return null
  const spend = Number(repair.quote) || 0
  const points = pointsEarnedFor(spend)
  return points > 0 ? { points, spend } : null
}
