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
  // Quote awaiting approval -> Repair in progress is a real, valid edge: it is the customer's
  // own approve action calling RepairAPI.update with exactly this transition. It's excluded
  // from the staff status *dropdown* in RepairDetails.jsx so nobody in the branch can approve a
  // quote on the customer's behalf, but it must stay legal at the adapter level or the approve
  // button itself would throw.
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

// --- the same status, projected for the customer ---------------------------------------------
// REPAIR_FLOW above is the workshop's and has to stay exactly as it is: it mirrors the
// repair_status enum in the database, and staff and admins need all eleven states because they
// describe the work.
//
// The customer does not. "Diagnostics", "Parts ordered" and "Quality check" are how the branch
// organises its own bench; showing them turns a simple question — where is my phone? — into an
// eleven-step chart of somebody else's process.
//
// So the customer sees STAGES, and a stage is derived from the stored status, never stored
// alongside it. There is one status in the database. Everything any of the three sides shows is
// computed from it, which is what makes it impossible for them to disagree: staff cannot move a
// repair to a state the customer's view does not already account for, because the customer's
// view is a function of that state.
//
// Every stage is either something the customer needs to know or something they have to do.
const reached = (repair, status) => repair?.status === status
  || (repair?.history || []).some((h) => h[0] === status)

export const CUSTOMER_JOURNEY = [
  {
    key: 'booked',
    covers: ['Booking received'],
    label: () => 'Booking confirmed',
  },
  {
    key: 'awaiting_device',
    covers: ['Awaiting device'],
    label: () => 'Waiting for your device',
    nextStep: 'Bring your device into the branch, or post it to us.',
  },
  {
    // Diagnostics folded in: from the customer's side "we have it and we are looking at it" is
    // one fact, and splitting it invites "why has it sat in Diagnostics for two days?".
    key: 'with_us',
    covers: ['Device received', 'Diagnostics'],
    label: () => 'Device with us',
  },
  {
    key: 'approval',
    covers: ['Quote awaiting approval'],
    label: () => 'Your approval needed',
    nextStep: 'Review your quote and approve it so we can start work.',
  },
  {
    // Parts ordered and Quality check fold in here. Both are bench states: the repair is under
    // way and has not come back to the customer for anything.
    key: 'in_repair',
    covers: ['Repair in progress', 'Parts ordered', 'Quality check'],
    label: () => 'Being repaired',
  },
  {
    // Collection and dispatch are alternatives, not consecutive steps, so they are one stage
    // whose wording follows whichever actually happened.
    key: 'ready',
    covers: ['Ready for collection', 'Dispatched'],
    label: (repair) => (reached(repair, 'Dispatched') ? 'On its way to you' : 'Ready to collect'),
    nextStep: 'Collect it from your branch — bring your reference number.',
  },
  {
    key: 'done',
    covers: ['Completed'],
    label: () => 'Completed',
  },
]

export const CUSTOMER_STAGE_KEYS = CUSTOMER_JOURNEY.map((s) => s.key)

export function customerStage(status) {
  return CUSTOMER_JOURNEY.find((s) => s.covers.includes(status)) || null
}

// Which stage the repair has reached, as an index into CUSTOMER_JOURNEY. -1 for a status with no
// stage, which today means only Cancelled.
export function customerStageIndex(status) {
  return CUSTOMER_JOURNEY.findIndex((s) => s.covers.includes(status))
}

// What the customer is told the repair is doing — on the badge, on the timeline and in the
// notification, so all three say the same words.
export function customerStatusLabel(status, repair = null) {
  if (status === 'Cancelled') return 'Cancelled'
  const stage = customerStage(status)
  if (!stage) return status
  return stage.label(repair ?? { status })
}

// Only where the customer is the one everyone is waiting on. Saying "nothing to do" on the
// other stages trains people to stop reading the line that matters on these.
export function customerNextStep(status) {
  return customerStage(status)?.nextStep ?? null
}

// `audience` is 'customer' or 'internal'. Internal is the default everywhere, so a page that
// forgets to say shows the operational status rather than silently reworded copy.
export function statusLabel(status, audience = 'internal', repair = null) {
  return audience === 'customer' ? customerStatusLabel(status, repair) : status
}

// A repair that has finished successfully, as opposed to one that stopped. Used by the timeline
// so a finished journey renders as finished rather than as its last step still running.
export const REPAIR_FINISHED = ['Completed']
export const REPAIR_STOPPED = ['Cancelled']

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

// --- orders -----------------------------------------------------------------------------------
// The third journey, and the one that had no shared vocabulary at all: the list of statuses
// lived inside src/pages/admin/ManageOrders.jsx, so nothing else could agree with it. Three
// different lists decided whether an order could still be cancelled, they disagreed, and one of
// them tested for a status ('completed') the admin dropdown could not produce.
//
// Worst of all the customer never saw the status. Their order list printed "Test mode" — a
// developer's note about the payment stub — for every order that was not cancelled, so an admin
// marking an order dispatched changed nothing on the customer's side.
export const ORDER_FLOW = ['pending', 'paid', 'processing', 'ready', 'dispatched', 'delivered', 'collected']
export const ORDER_TERMINAL = ['cancelled']
// 'delivered' and 'collected' are alternative endings, not consecutive steps.
export const ORDER_FINISHED = ['delivered', 'collected']

export const ORDER_LABELS = {
  pending: 'Pending', paid: 'Paid', processing: 'Processing', ready: 'Ready',
  dispatched: 'Dispatched', delivered: 'Delivered', collected: 'Collected', cancelled: 'Cancelled',
}

// Said to the person who placed the order, about their own order.
export const ORDER_CUSTOMER_LABELS = {
  pending: 'Awaiting payment',
  paid: 'Order confirmed',
  processing: 'Being prepared',
  ready: 'Ready to collect',
  dispatched: 'On its way to you',
  delivered: 'Delivered',
  collected: 'Collected',
  cancelled: 'Cancelled',
}

export const ORDER_STYLES = {
  pending: 'bg-amber-50 text-amber-600',
  paid: 'bg-brand-50 text-brand',
  processing: 'bg-amber-50 text-amber-600',
  ready: 'bg-emerald-50 text-emerald-600',
  dispatched: 'bg-emerald-50 text-emerald-600',
  delivered: 'bg-slate-100 text-slate-600',
  collected: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-50 text-rose-600',
}

export function orderStatusLabel(status, audience = 'internal') {
  const map = audience === 'customer' ? ORDER_CUSTOMER_LABELS : ORDER_LABELS
  return map[status] || ORDER_LABELS[status] || status
}

// One rule, used by the adapter, the admin list and the customer list. It used to be written
// out by hand in each of the three, and they did not agree: the adapter let a customer cancel a
// delivered order, and the admin page offered to cancel one the adapter would refuse.
export function orderCanBeCancelled(status) {
  return !['dispatched', 'delivered', 'collected', 'cancelled'].includes(status)
}
