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

// Reporting periods offered across the admin reports.
export const PERIODS = ['day', 'week', 'month']

export const PERIOD_LABELS = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
}
