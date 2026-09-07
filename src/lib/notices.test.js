import { describe, it, expect } from 'vitest'
import {
  repairMovedNotice, tradeInMovedNotice, orderMovedNotice,
  newBookingNotice, newTradeInNotice, newOrderNotice,
  repairAssignedNotice, repairUnassignedNotice, orderAssignedNotice, orderUnassignedNotice,
  deviceName,
} from './notices.js'

// A notification is the only part of the app that reaches someone who is not looking at it, so
// what it says matters more than most strings do — and it is now shared by two adapters, which
// is exactly the situation in which wording quietly diverges.

describe('what the customer is told about a repair', () => {
  const repair = { ref: 'SPR-4805', brand: 'Apple', model: 'iPhone 13', quote: 149 }

  it('uses the customer’s wording, not the workshop’s', () => {
    // "Diagnostics" is an internal step; the customer is told their device is with us.
    const notice = repairMovedNotice({ ...repair, history: [] }, 'Diagnostics')
    expect(notice.title).not.toContain('Diagnostics')
    expect(notice.body).not.toContain('Diagnostics')
  })

  it('puts the figure in the one notice that asks them to decide', () => {
    const notice = repairMovedNotice(repair, 'Quote awaiting approval')
    expect(notice.body).toContain('£149')
    expect(notice.body).toContain('Apple iPhone 13')
  })

  it('does not invent a figure when there is none', () => {
    const notice = repairMovedNotice({ ...repair, quote: null }, 'Quote awaiting approval')
    expect(notice.body).not.toContain('£')
  })

  it('links to the page it is talking about', () => {
    expect(repairMovedNotice(repair, 'Completed').link).toBe('/app/repairs/SPR-4805')
  })

  it('says "device" rather than nothing when the model is missing', () => {
    expect(deviceName({})).toBe('device')
    expect(repairMovedNotice({ ref: 'SPR-1' }, 'Completed').body).toContain('device repair')
  })
})

describe('what the customer is told about a sale and an order', () => {
  it('describes a sale as a sale, and links to its own tracking page', () => {
    const notice = tradeInMovedNotice({ reference: 'VT-TI-3001', brand: 'Apple', model: 'iPhone 12' }, 'offer_sent')
    expect(notice.body).toContain('Apple iPhone 12 sale')
    expect(notice.link).toBe('/app/sell/VT-TI-3001')
  })

  it('never tells a customer a sale was "received" when they were the ones who sent it', () => {
    // The bug this pins: the sell journey borrowed the repair vocabulary, so a customer who had
    // just posted us a phone was told their request had been received by them.
    const notice = tradeInMovedNotice({ reference: 'VT-TI-3001', brand: 'Apple', model: 'iPhone 12' }, 'submitted')
    expect(notice.title.toLowerCase()).not.toContain('received')
  })

  it('uses the customer’s order wording', () => {
    const notice = orderMovedNotice({ reference: 'VT-ORD-10001' }, 'dispatched')
    expect(notice.body).toContain('On its way to you')
    expect(notice.link).toBe('/app/orders')
  })
})

describe('what the shop is told when work arrives', () => {
  const repair = { ref: 'SPR-4900', brand: 'Dell', model: 'XPS 13', problem: 'Battery', customer: 'Ann' }

  it('sends the branch to the job and the admin to the assignment queue', () => {
    expect(newBookingNotice(repair, 'branch').link).toBe('/staff/repairs/SPR-4900')
    expect(newBookingNotice(repair, 'admin').link).toBe('/admin/assign')
  })

  it('tells the admin what is actually being asked of them', () => {
    expect(newBookingNotice(repair, 'admin').body).toContain('needs a technician')
    expect(newBookingNotice(repair, 'branch').body).toContain('Ann')
  })

  it('carries the guide price on a device we are being offered', () => {
    const notice = newTradeInNotice({ reference: 'VT-TI-3002', brand: 'Apple', model: 'iPad', conditionGrade: 'Good', indicativeValue: 180 })
    expect(notice.body).toContain('Good')
    expect(notice.body).toContain('£180')
  })

  it('counts the items on a new order rather than the lines', () => {
    const notice = newOrderNotice({ reference: 'VT-ORD-10002', total: 299.99, items: [{ quantity: 2 }, { quantity: 1 }] })
    expect(notice.body).toContain('3 items')
    expect(notice.body).toContain('£299.99')
  })

  it('says "1 item" rather than "1 items"', () => {
    expect(newOrderNotice({ reference: 'x', total: 10, items: [{ quantity: 1 }] }).body).toContain('1 item,')
  })
})

describe('assignment, in both directions', () => {
  const repair = { ref: 'SPR-4805', brand: 'Apple', model: 'iPhone 13', problem: 'Cracked screen' }

  it('names who handed the job over', () => {
    expect(repairAssignedNotice(repair, 'Priya').body).toContain('Assigned by Priya')
  })

  it('leaves the attribution off rather than saying "Assigned by null"', () => {
    expect(repairAssignedNotice(repair).body).not.toContain('Assigned by')
  })

  it('tells the technician who lost the job where it went', () => {
    expect(repairUnassignedNotice(repair, 'Sam').body).toContain('now with Sam')
    expect(repairUnassignedNotice(repair).body).toContain('taken off your list')
  })

  it('does the same for an order', () => {
    const order = { reference: 'VT-ORD-1', total: 50, items: [{ quantity: 1 }] }
    expect(orderAssignedNotice(order, 'Priya').body).toContain('Assigned by Priya')
    expect(orderUnassignedNotice(order, 'Sam').body).toContain('Now with Sam')
    expect(orderAssignedNotice(order).link).toBe('/staff/orders')
  })
})
