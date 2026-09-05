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

// --- the same statuses, said to the customer -------------------------------------------------
// REPAIR_FLOW above is the workshop's vocabulary and has to stay exactly as it is: it mirrors
// the repair_status enum in the database, and it is what staff and admins need to see, because
// it describes what the branch is doing.
//
// It is the wrong voice for the person who dropped the device off. "Booking received" is the
// shop's sentence about itself, and two of these are worse than merely odd — they are the
// states where the CUSTOMER is what everyone is waiting for, and neither label says so:
//
//   * "Awaiting device"         — awaiting it from whom? They have to bring or post it.
//   * "Quote awaiting approval" — awaiting whose approval? Theirs. Nothing is happening
//                                 until they act.
//
// So the customer gets the same status in their own voice, and a plain next step when there is
// something for them to do. One map, applied by passing audience="customer" to StatusBadge —
// not a role check scattered through the pages.
export const CUSTOMER_STATUS_LABELS = {
  'Booking received': 'Booking confirmed',
  'Awaiting device': 'Waiting for your device',
  'Device received': 'Device with us',
  'Diagnostics': 'Being checked',
  'Quote awaiting approval': 'Your approval needed',
  'Repair in progress': 'Being repaired',
  'Parts ordered': 'Waiting for parts',
  'Quality check': 'Final checks',
  'Ready for collection': 'Ready to collect',
  'Dispatched': 'On its way to you',
  'Completed': 'Completed',
  'Cancelled': 'Cancelled',
}

// What the customer has to do now. Null wherever the branch is the one working — saying
// "nothing to do" on eight of twelve states trains people to stop reading the line that
// matters on the other four.
export const CUSTOMER_NEXT_STEP = {
  'Awaiting device': 'Bring your device into the branch, or post it to us.',
  'Quote awaiting approval': 'Review your quote and approve it so we can start work.',
  'Ready for collection': 'Collect it from your branch — bring your reference number.',
}

export function customerStatusLabel(status){
  return CUSTOMER_STATUS_LABELS[status] || status
}
export function customerNextStep(status){
  return CUSTOMER_NEXT_STEP[status] || null
}

// `audience` is 'customer' or 'internal'. Internal is the default everywhere, so a page that
// forgets to say shows the operational status rather than silently reworded copy.
export function statusLabel(status, audience = 'internal'){
  return audience === 'customer' ? customerStatusLabel(status) : status
}

// --- the sell journey, said to the customer --------------------------------------------------
// The repair journey tells the customer where their device is at every step. Selling one did
// not: the statuses below were rendered raw, no step was announced to the customer, and the one
// state that exists purely for them to act on — an offer — was actioned by an admin on their
// behalf. Same treatment as repairs, so both journeys behave the same way.
// Written from the customer's side throughout. Two of these were not, and both were the same
// mistake made in opposite directions:
//
//   submitted was "Request received" — but the customer SENT the request; they did not receive
//     anything. It was also inaccurate: at this point we hold the request and no device, so
//     "received" invites them to think their phone has already arrived with us.
//   paid was "Payment sent" — sent by whom? By us. From where they sit, money arrives.
//
// The repair side already says "Booking confirmed" for the same moment, so a customer looking
// at My repairs, which lists both journeys on one screen, was reading two different voices.
export const TRADE_IN_CUSTOMER_LABELS = {
  submitted: 'Request confirmed',
  valuation_review: 'Being valued',
  device_received: 'Device with us',
  offer_sent: 'Your offer is ready',
  offer_accepted: 'Offer accepted',
  offer_declined: 'Offer declined',
  paid: 'Payment on its way',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// Only where the customer is the one everyone is waiting on.
export const TRADE_IN_NEXT_STEP = {
  offer_sent: 'Review your offer and accept or decline it.',
  offer_accepted: 'Send us the device, or bring it into your branch, and we will pay you.',
}

export function tradeInStatusLabel(status, audience = 'internal'){
  const map = audience === 'customer' ? TRADE_IN_CUSTOMER_LABELS : TRADE_IN_LABELS
  return map[status] || TRADE_IN_LABELS[status] || status
}
export function tradeInNextStep(status){
  return TRADE_IN_NEXT_STEP[status] || null
}

// The states a customer's own sell request passes through, for the tracking timeline. The two
// endings that are not "paid" — declining the offer, or withdrawing — are shown as a stop on
// the timeline rather than as steps, exactly as a cancelled repair is.
export const TRADE_IN_CUSTOMER_FLOW = ['submitted', 'valuation_review', 'offer_sent', 'offer_accepted', 'paid', 'completed']
export const TRADE_IN_TERMINAL = ['cancelled', 'offer_declined']
