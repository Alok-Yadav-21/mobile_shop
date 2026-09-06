import { describe, it, expect } from 'vitest'
import { assertMayPatchRepair, assertMayAssign, assertQuoteIsSendable } from './repairRules.js'
import { AuthzError } from './authz.js'

const customer = { id:'u1', role:'customer', email:'c@demo.com' }
const priya    = { id:'u4', role:'staff', branch:'wol' }
const sam      = { id:'u2', role:'staff', branch:'wol' }
const admin    = { id:'u3', role:'admin' }

const repair = (over = {}) => ({ ref:'SPR-1', status:'Diagnostics', tech:'u4', quote:null, ...over })
const ok  = (fn) => expect(fn).not.toThrow()
const no  = (fn) => expect(fn).toThrow()

describe('what a customer may do to their own repair', () => {
  it('withdraws a booking before the device is taken in', () => {
    ok(() => assertMayPatchRepair(customer, repair({ status:'Booking received' }), { status:'Cancelled', cancellationReason:'changed my mind' }))
  })

  it('cannot withdraw once the device is in the workshop', () => {
    no(() => assertMayPatchRepair(customer, repair({ status:'Repair in progress' }), { status:'Cancelled', cancellationReason:'x' }))
  })

  // The step that used to be unreachable: Approve threw on every click, and Reject threw too
  // because the repair was past the point where withdrawing was allowed.
  it('approves a quote it has been sent', () => {
    ok(() => assertMayPatchRepair(customer, repair({ status:'Quote awaiting approval', quote:129 }), { status:'Repair in progress' }))
  })

  it('declines a quote it has been sent', () => {
    ok(() => assertMayPatchRepair(customer, repair({ status:'Quote awaiting approval', quote:129 }), { status:'Cancelled', cancellationReason:'too dear' }))
  })

  it('cannot edit the quote, advance the status or assign anyone', () => {
    no(() => assertMayPatchRepair(customer, repair(), { quote: 1 }))
    no(() => assertMayPatchRepair(customer, repair(), { status:'Device received' }))
    no(() => assertMayPatchRepair(customer, repair(), { tech:'u4' }))
  })
})

describe('what the branch may do', () => {
  it('lets the assigned technician record progress', () => {
    ok(() => assertMayPatchRepair(priya, repair(), { status:'Quality check' }))
  })

  it('refuses a colleague the job was not given to', () => {
    expect(() => assertMayPatchRepair(sam, repair(), { status:'Quality check' })).toThrow(AuthzError)
  })

  it('refuses a job nobody has been given yet', () => {
    expect(() => assertMayPatchRepair(sam, repair({ tech:null }), { status:'Quality check' })).toThrow(AuthzError)
  })

  it('keeps an admin out of the workshop flow but lets them cancel', () => {
    expect(() => assertMayPatchRepair(admin, repair(), { status:'Quality check' })).toThrow(AuthzError)
    ok(() => assertMayPatchRepair(admin, repair(), { status:'Cancelled', cancellationReason:'customer rang head office' }))
  })

  it('treats the quote and notes as the branch record, not the admin s', () => {
    ok(() => assertMayPatchRepair(priya, repair(), { quote: 129 }))
    expect(() => assertMayPatchRepair(admin, repair(), { quote: 129 })).toThrow(AuthzError)
  })
})

describe('a quote must carry a figure before it is sent', () => {
  it('refuses an empty or zero quote', () => {
    no(() => assertQuoteIsSendable(repair(), { status:'Quote awaiting approval' }))
    no(() => assertQuoteIsSendable(repair(), { status:'Quote awaiting approval', quote:0 }))
    no(() => assertQuoteIsSendable(repair({ quote:null }), { status:'Quote awaiting approval' }))
  })

  it('accepts one supplied in the same patch or already on the record', () => {
    ok(() => assertQuoteIsSendable(repair(), { status:'Quote awaiting approval', quote:129 }))
    ok(() => assertQuoteIsSendable(repair({ quote:99 }), { status:'Quote awaiting approval' }))
  })

  it('says nothing about any other status', () => {
    ok(() => assertQuoteIsSendable(repair(), { status:'Quality check' }))
  })
})

describe('assignment', () => {
  it('is the admin s to make', () => {
    ok(() => assertMayAssign(admin, repair({ tech:null }), { tech:'u4' }))
    expect(() => assertMayAssign(priya, repair(), { tech:'u2' })).toThrow(AuthzError)
  })

  it('says nothing when the patch does not touch it', () => {
    ok(() => assertMayAssign(priya, repair(), { status:'Quality check' }))
    ok(() => assertMayAssign(priya, repair(), { tech:'u4' })) // unchanged
  })
})
