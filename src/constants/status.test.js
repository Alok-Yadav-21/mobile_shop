import { describe, it, expect } from 'vitest'
import {
  REPAIR_FLOW, STATUS_STYLES, STATUS_TRANSITIONS, canTransition, requiresReason, nextStatuses,
  TRADE_IN_FLOW, TRADE_IN_LABELS, tradeInCanTransition,
  CUSTOMER_STATUS_LABELS, CUSTOMER_NEXT_STEP, customerStatusLabel, customerNextStep, statusLabel,
  TRADE_IN_CUSTOMER_LABELS, TRADE_IN_CUSTOMER_FLOW, TRADE_IN_TERMINAL, tradeInStatusLabel,
} from './status.js'

describe('REPAIR_FLOW', () => {
  it('matches the 12-state repair_status DB enum (11 flow states + Cancelled)', () => {
    expect(REPAIR_FLOW).toHaveLength(11)
    expect(new Set(REPAIR_FLOW).size).toBe(11) // no duplicates
  })

  it('starts with Booking received and ends with Completed', () => {
    expect(REPAIR_FLOW[0]).toBe('Booking received')
    expect(REPAIR_FLOW[REPAIR_FLOW.length - 1]).toBe('Completed')
  })

  it('has a style defined for every flow state plus Cancelled', () => {
    for (const status of [...REPAIR_FLOW, 'Cancelled']) {
      expect(STATUS_STYLES[status], `missing style for "${status}"`).toBeDefined()
    }
  })

  it('every flow state has a transition list, even if empty', () => {
    for (const status of REPAIR_FLOW) {
      expect(STATUS_TRANSITIONS[status], `missing transitions for "${status}"`).toBeDefined()
    }
  })
})

describe('canTransition', () => {
  it('allows only the states listed as valid next steps', () => {
    expect(canTransition('Booking received', 'Device received')).toBe(true)
    expect(canTransition('Booking received', 'Repair in progress')).toBe(false)
    expect(nextStatuses('Repair in progress')).toEqual(['Parts ordered', 'Quality check'])
  })

  it('quote approval is a valid transition, reachable via the approve action', () => {
    // The transition itself must stay legal (the customer's approve button and an
    // admin's approve-on-behalf both call this) — RepairDetails.jsx separately excludes
    // it from the staff status *dropdown* so staff can't bypass the approval UX.
    expect(canTransition('Quote awaiting approval', 'Repair in progress')).toBe(true)
  })

  it('cancellation is reachable from any non-terminal status but not from terminal ones', () => {
    expect(canTransition('Diagnostics', 'Cancelled')).toBe(true)
    expect(canTransition('Completed', 'Cancelled')).toBe(false)
    expect(canTransition('Cancelled', 'Cancelled')).toBe(false)
  })

  it('terminal states have no forward transitions', () => {
    expect(nextStatuses('Completed')).toEqual([])
    expect(nextStatuses('Cancelled')).toEqual([])
  })
})

describe('requiresReason', () => {
  it('only cancellation requires a reason', () => {
    expect(requiresReason('Cancelled')).toBe(true)
    expect(requiresReason('Completed')).toBe(false)
    expect(requiresReason('Repair in progress')).toBe(false)
  })
})

describe('trade-in status vocabulary', () => {
  it('every flow state and the two off-flow states have a label', () => {
    for (const status of [...TRADE_IN_FLOW, 'offer_declined', 'cancelled']) {
      expect(TRADE_IN_LABELS[status], `missing label for "${status}"`).toBeDefined()
    }
  })

  it('follows the flow in order and allows decline before acceptance', () => {
    expect(tradeInCanTransition('submitted', 'valuation_review')).toBe(true)
    expect(tradeInCanTransition('submitted', 'paid')).toBe(false)
    expect(tradeInCanTransition('valuation_review', 'offer_declined')).toBe(true)
    expect(tradeInCanTransition('paid', 'offer_declined')).toBe(false)
  })

  it('cancellation is blocked once completed', () => {
    expect(tradeInCanTransition('submitted', 'cancelled')).toBe(true)
    expect(tradeInCanTransition('completed', 'cancelled')).toBe(false)
  })
})

const ALL_STATUSES = [...REPAIR_FLOW, 'Cancelled']

describe('customer status vocabulary', () => {
  it('covers every status a repair can reach, so nothing falls back to workshop wording', () => {
    for (const s of ALL_STATUSES) expect(CUSTOMER_STATUS_LABELS[s]).toBeTruthy()
  })

  it('does not invent a status the workshop does not have', () => {
    for (const s of Object.keys(CUSTOMER_STATUS_LABELS)) expect(ALL_STATUSES).toContain(s)
    for (const s of Object.keys(CUSTOMER_NEXT_STEP)) expect(ALL_STATUSES).toContain(s)
  })

  it('addresses the customer in the two states where they are the blocker', () => {
    // These were the actually-defective ones: the label named neither who was being waited on
    // nor what to do about it.
    expect(customerStatusLabel('Awaiting device')).toMatch(/your device/i)
    expect(customerStatusLabel('Quote awaiting approval')).toMatch(/your approval/i)
    expect(customerNextStep('Awaiting device')).toBeTruthy()
    expect(customerNextStep('Quote awaiting approval')).toBeTruthy()
  })

  it('gives no next step while the branch is the one working', () => {
    for (const s of ['Booking received', 'Device received', 'Diagnostics', 'Repair in progress',
      'Parts ordered', 'Quality check', 'Dispatched', 'Completed', 'Cancelled']) {
      expect(customerNextStep(s)).toBeNull()
    }
  })

  it('keeps the workshop vocabulary for staff and admins', () => {
    for (const s of ALL_STATUSES) {
      expect(statusLabel(s, 'internal')).toBe(s)
      expect(statusLabel(s)).toBe(s)
    }
  })

  it('rewords for customers without changing the underlying status', () => {
    expect(statusLabel('Booking received', 'customer')).toBe('Booking confirmed')
    expect(statusLabel('Ready for collection', 'customer')).toBe('Ready to collect')
    // Every status still keys a colour, so a reworded badge cannot lose its styling.
    for (const s of ALL_STATUSES) expect(STATUS_STYLES[s]).toBeTruthy()
  })

  it('falls back to the raw status rather than rendering nothing', () => {
    expect(customerStatusLabel('Some future status')).toBe('Some future status')
    expect(customerNextStep('Some future status')).toBeNull()
  })
})

describe('customer labels are written from the customer\u2019s side', () => {
  const ALL_TRADE_IN = [...TRADE_IN_CUSTOMER_FLOW, ...TRADE_IN_TERMINAL, 'device_received']

  it('covers every state a sale can reach', () => {
    for (const s of ALL_TRADE_IN) expect(TRADE_IN_CUSTOMER_LABELS[s]).toBeTruthy()
  })

  // The mistake this catches: a status the CUSTOMER caused, described as the shop receiving
  // something. They sent the request; they did not receive it. "Request received" also implied
  // we already had the device, when at that point we hold nothing but a form.
  it('never tells the customer they received what they just sent us', () => {
    expect(TRADE_IN_CUSTOMER_LABELS.submitted).not.toMatch(/received/i)
    expect(CUSTOMER_STATUS_LABELS['Booking received']).not.toMatch(/received/i)
  })

  // And the same error in reverse: a status WE cause, described from our side. Money leaving us
  // is money arriving for them.
  it('never describes our own actions from our side', () => {
    expect(TRADE_IN_CUSTOMER_LABELS.paid).not.toMatch(/\bsent\b/i)
    expect(TRADE_IN_CUSTOMER_LABELS.offer_sent).not.toMatch(/\bsent\b/i)
  })

  // "Device with us" is correct and stays: at that point we genuinely do hold the device, and
  // it is phrased as where the device is rather than as an act of receiving.
  it('still says plainly where the device is once we hold it', () => {
    expect(TRADE_IN_CUSTOMER_LABELS.device_received).toBe('Device with us')
    expect(CUSTOMER_STATUS_LABELS['Device received']).toBe('Device with us')
  })

  // My repairs lists both journeys on one screen, so the opening state of each has to read the
  // same way. It did not: repairs said "Booking confirmed" and sales said "Request received".
  it('opens both journeys in the same voice', () => {
    const opening = [CUSTOMER_STATUS_LABELS['Booking received'], TRADE_IN_CUSTOMER_LABELS.submitted]
    expect(opening.every((l) => /confirmed$/i.test(l))).toBe(true)
  })

  it('keeps the internal vocabulary for staff', () => {
    expect(tradeInStatusLabel('submitted')).toBe('Submitted')
    expect(tradeInStatusLabel('paid')).toBe('Paid')
    expect(tradeInStatusLabel('submitted', 'customer')).toBe('Request confirmed')
  })
})
