// Mirrors the 12-state repair_status enum in supabase/migrations/0001_init.sql exactly, so the
// mock adapter and the Supabase adapter render identical status vocabulary in the UI.
export const REPAIR_FLOW = [
  'Booking received', 'Awaiting device', 'Device received', 'Diagnostics',
  'Quote awaiting approval', 'Repair in progress', 'Parts ordered', 'Quality check',
  'Ready for collection', 'Dispatched', 'Completed',
]
export const STATUS_STYLES = {
  'Booking received': 'bg-brand-50 text-brand',
  'Awaiting device': 'bg-slate-100 text-slate-600',
  'Device received': 'bg-violet-50 text-violet-600',
  'Diagnostics': 'bg-amber-50 text-amber-600',
  'Quote awaiting approval': 'bg-amber-100 text-amber-700',
  'Repair in progress': 'bg-amber-50 text-amber-600',
  'Parts ordered': 'bg-violet-50 text-violet-600',
  'Quality check': 'bg-violet-50 text-violet-600',
  'Ready for collection': 'bg-emerald-50 text-emerald-600',
  'Dispatched': 'bg-emerald-50 text-emerald-600',
  'Completed': 'bg-slate-100 text-slate-600',
  'Cancelled': 'bg-rose-50 text-rose-600',
}

// Central status-transition graph. A repair may only move to one of the states listed for
// its current status (plus 'Cancelled', which is always reachable but requires a reason —
// see requiresReason below). Terminal states have no forward transitions.
export const STATUS_TRANSITIONS = {
  'Booking received': ['Awaiting device', 'Device received'],
  'Awaiting device': ['Device received'],
  'Device received': ['Diagnostics'],
  'Diagnostics': ['Quote awaiting approval'],
  // Quote awaiting approval -> Repair in progress is a real, valid edge (the customer's
  // approve action and an admin's on-behalf approval both call RepairAPI.update with exactly
  // this transition) — it's intentionally excluded from the staff status *dropdown* in
  // RepairDetails.jsx so staff can't casually bypass the approval UX, but it must stay legal
  // at the adapter level or the approve button itself would throw.
  'Quote awaiting approval': ['Repair in progress'],
  'Repair in progress': ['Parts ordered', 'Quality check'],
  'Parts ordered': ['Repair in progress'],
  'Quality check': ['Ready for collection'],
  'Ready for collection': ['Completed', 'Dispatched'],
  'Dispatched': ['Completed'],
  'Completed': [],
  'Cancelled': [],
}

export function nextStatuses(current){
  return STATUS_TRANSITIONS[current] || []
}
export function canTransition(from, to){
  if(to==='Cancelled') return from!=='Completed' && from!=='Cancelled'
  return nextStatuses(from).includes(to)
}
export function requiresReason(to){
  return to==='Cancelled'
}

// Trade-in status vocabulary — mirrors the DB trade_in_status enum exactly
// (supabase/migrations/0001_init.sql + 0003_role_crud.sql) so the mock and Supabase
// adapters use identical values.
export const TRADE_IN_FLOW = ['submitted', 'valuation_review', 'offer_sent', 'offer_accepted', 'paid', 'completed']
export const TRADE_IN_LABELS = {
  submitted: 'Submitted',
  valuation_review: 'Inspecting',
  offer_sent: 'Offer sent',
  offer_accepted: 'Accepted',
  offer_declined: 'Rejected',
  paid: 'Paid',
  device_received: 'Device received',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
export const TRADE_IN_STYLES = {
  submitted: 'bg-brand-50 text-brand',
  valuation_review: 'bg-amber-50 text-amber-600',
  offer_sent: 'bg-amber-100 text-amber-700',
  offer_accepted: 'bg-emerald-50 text-emerald-600',
  offer_declined: 'bg-rose-50 text-rose-600',
  paid: 'bg-emerald-100 text-emerald-700',
  device_received: 'bg-violet-50 text-violet-600',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-50 text-rose-600',
}
export function tradeInCanTransition(from, to){
  if(to==='cancelled') return !['completed','cancelled'].includes(from)
  const i = TRADE_IN_FLOW.indexOf(from)
  return to==='offer_declined' ? i>=0 && i<TRADE_IN_FLOW.indexOf('offer_accepted') : TRADE_IN_FLOW[i+1]===to
}
