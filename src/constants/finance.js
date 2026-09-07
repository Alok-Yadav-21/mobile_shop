// Money-side vocabulary shared by the sales ledger, the reports and the payments screens.

// Every earning event is settled one of two ways. "online" covers all electronic settlement
// (card terminal, Stripe, bank transfer) — the split admins actually reconcile against is
// cash-in-the-drawer vs everything else, which is why there are two buckets and not five.
export const PAYMENT_METHODS = ['cash', 'online']

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  online: 'Online / card',
}

// What produced the money. Retail = a product sale from the catalogue; repair = a completed
// repair job invoiced at the branch.
export const ORDER_KINDS = ['retail', 'repair']

export const ORDER_KIND_LABELS = {
  retail: 'Retail sale',
  repair: 'Repair job',
}

// Statuses that must never count toward earnings.
export const NON_EARNING_STATUSES = ['cancelled', 'refunded']

// Whether the money actually arrived. The column has always been on the order and nothing read
// it, so an order counted as revenue on the strength of its status alone — and the checkout
// marks orders 'paid' without taking a penny, because no payment processor is wired up yet.
// Reports therefore showed money the shop had never received, which is the single worst thing a
// reporting screen can do.
//
// 'test_mode' is what the current checkout writes. It is deliberately not settled, so the day
// this goes live in front of real customers before Stripe is connected, the reports say nothing
// was taken — because nothing was.
export const SETTLED_PAYMENT_STATUSES = ['paid']

export const PAYMENT_STATUS_LABELS = {
  test_mode: 'No payment taken',
  pending: 'Awaiting payment',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
}

// Reporting periods offered across the admin reports.
export const PERIODS = ['day', 'week', 'month']

export const PERIOD_LABELS = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
}
