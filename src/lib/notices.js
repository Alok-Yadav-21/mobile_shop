// What each notification says, separately from how it gets delivered.
//
// The wording used to live inside the mock adapter, tangled up with localStorage reads. That
// made it unreachable from the Supabase adapter, which would have had to write its own — and a
// second set of wording drifts from the first, so the same event would eventually read one way
// on the demo and another way in the shop.
//
// Everything here is a pure function returning the shape notifications are stored in:
// { title, body, ref, link }. Who receives it, and how it is written down, is the adapter's job.
import { customerStatusLabel, tradeInStatusLabel, orderStatusLabel } from '@/constants/status.js'
import { QUOTE_SENT_STATUS } from '@/lib/quotes.js'

const gbp = (n) => `£${Number(n).toFixed(2).replace(/\.00$/, '')}`

// "Apple iPhone 13", or just "device" when we were not told — a notice reading
// "Your  repair is now ..." is worse than a vague one.
export function deviceName(record) {
  return [record?.brand, record?.model].filter(Boolean).join(' ') || 'device'
}

function itemCount(order) {
  return (order?.items || []).reduce((n, i) => n + (i.quantity || 1), 0)
}

// ── To the customer ───────────────────────────────────────────────────────────────────────

// The customer's wording, not the workshop's. This notice is the one place they are told about
// a step without opening the app, so it has to read the same as the page it links to — one
// projection of one stored status, shared by the badge, the timeline and this.
export function repairMovedNotice(repair, status) {
  const label = customerStatusLabel(status, repair)
  const device = deviceName(repair)
  return {
    title: `${repair.ref} — ${label}`,
    // The one status that exists for the customer to act on carries the figure they are being
    // asked to approve. "Your approval is needed" alone makes them open the app to find out
    // what for.
    body: status === QUOTE_SENT_STATUS && repair.quote != null
      ? `We have quoted ${gbp(repair.quote)} for your ${device}. Approve it and we will start work.`
      : `Your ${device} repair is now "${label}".`,
    ref: repair.ref,
    link: `/app/repairs/${repair.ref}`,
  }
}

export function tradeInMovedNotice(tradeIn, status) {
  const label = tradeInStatusLabel(status, 'customer')
  return {
    title: `${tradeIn.reference} — ${label}`,
    body: `Your ${deviceName(tradeIn)} sale is now "${label}".`,
    ref: tradeIn.reference,
    link: `/app/sell/${tradeIn.reference}`,
  }
}

export function orderMovedNotice(order, status) {
  const label = orderStatusLabel(status, 'customer')
  return {
    title: `${order.reference} — ${label}`,
    body: `Your order is now "${label}".`,
    ref: order.reference,
    link: '/app/orders',
  }
}

// ── To the shop ───────────────────────────────────────────────────────────────────────────

// A booking arriving is two different jobs depending on who is reading it: the branch has to
// work it, the admin has to give it to someone. Same event, two links.
export function newBookingNotice(repair, audience = 'branch') {
  const device = deviceName(repair)
  return {
    title: `${repair.ref} — new booking`,
    body: audience === 'admin'
      ? `${device} · ${repair.problem || 'repair'} · needs a technician.`
      : `${device} · ${repair.problem || 'repair'} · ${repair.customer || 'customer'}.`,
    ref: repair.ref,
    link: audience === 'admin' ? '/admin/assign' : `/staff/repairs/${repair.ref}`,
  }
}

export function newTradeInNotice(tradeIn, audience = 'branch') {
  return {
    title: `${tradeIn.reference} — device to buy`,
    body: `${deviceName(tradeIn)} · ${tradeIn.conditionGrade || 'ungraded'} · guide ${gbp(tradeIn.indicativeValue || 0)}.`,
    ref: tradeIn.reference,
    link: audience === 'admin' ? '/admin/buysell' : '/staff/requests',
  }
}

export function newOrderNotice(order) {
  const count = itemCount(order)
  return {
    title: `${order.reference} — new order`,
    body: `${count} item${count === 1 ? '' : 's'}, ${gbp(order.total || 0)}.`,
    ref: order.reference,
    link: '/admin/orders',
  }
}

// Told to the technician, not only recorded on the repair: an assignment the assignee never
// sees is not an assignment.
export function repairAssignedNotice(repair, assignedByName = null) {
  return {
    title: `${repair.ref} assigned to you`,
    // Who gave it to them, because in a branch with a manager and a central admin "who decided
    // this is mine?" is a real question, and the audit log is not somewhere a technician looks.
    body: `${deviceName(repair)} — ${repair.problem || 'repair'}.${assignedByName ? ` Assigned by ${assignedByName}.` : ''}`,
    ref: repair.ref,
    link: `/staff/repairs/${repair.ref}`,
  }
}

// The other half of a reassignment. Only the incoming technician used to be told, so the one
// who lost the job kept "assigned to you" in their bell and no word that it had moved — they
// would go to the bench for a device that was no longer theirs, and then be refused by the
// assignment rule with nothing on screen explaining why.
export function repairUnassignedNotice(repair, takerName = null) {
  const device = deviceName(repair)
  return {
    title: `${repair.ref} is no longer yours`,
    body: takerName ? `${device} — now with ${takerName}.` : `${device} — taken off your list.`,
    ref: repair.ref,
    link: '/staff/repairs',
  }
}

export function orderAssignedNotice(order, assignedByName = null) {
  const count = itemCount(order)
  return {
    title: `${order.reference} to fulfil`,
    body: `${count} item${count === 1 ? '' : 's'}, ${gbp(order.total || 0)}.${assignedByName ? ` Assigned by ${assignedByName}.` : ''}`,
    ref: order.reference,
    link: '/staff/orders',
  }
}

export function orderUnassignedNotice(order, takerName = null) {
  return {
    title: `${order.reference} is no longer yours`,
    body: takerName ? `Now with ${takerName}.` : 'Taken off your list.',
    ref: order.reference,
    link: '/staff/orders',
  }
}
