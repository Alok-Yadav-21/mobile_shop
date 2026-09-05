import { describe, it, expect } from 'vitest'
import {
  REPAIR_FLOW, STATUS_STYLES, STATUS_TRANSITIONS, canTransition, requiresReason, nextStatuses,
  TRADE_IN_FLOW, TRADE_IN_LABELS, tradeInCanTransition,
  customerStatusLabel, customerNextStep, statusLabel,
  CUSTOMER_JOURNEY, customerStage, customerStageIndex, REPAIR_FINISHED, REPAIR_STOPPED,
  TRADE_IN_CUSTOMER_LABELS, TRADE_IN_CUSTOMER_FLOW, TRADE_IN_TERMINAL, tradeInStatusLabel,
  ORDER_FLOW, ORDER_TERMINAL, ORDER_LABELS, ORDER_CUSTOMER_LABELS, ORDER_STYLES,
  orderStatusLabel, orderCanBeCancelled,
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

describe('the customer journey is a projection of the stored status', () => {
  // The guarantee the three sides depend on: there is one status, and what the customer sees is
  // computed from it. Staff cannot move a repair into a state the customer's view does not
  // already account for, because the customer's view is a function of that state.
  it('gives every workshop status exactly one customer stage', () => {
    for (const s of REPAIR_FLOW) {
      const owners = CUSTOMER_JOURNEY.filter((st) => st.covers.includes(s))
      expect(owners, `${s} must map to exactly one stage`).toHaveLength(1)
    }
  })

  it('invents no stage for a status the workshop does not have', () => {
    for (const stage of CUSTOMER_JOURNEY) {
      for (const s of stage.covers) expect(REPAIR_FLOW).toContain(s)
    }
  })

  it('never moves a repair backwards through the stages as it moves forwards', () => {
    // Stage order has to follow flow order, or a customer watching would see the journey
    // retreat while the branch made progress.
    const indexes = REPAIR_FLOW.map(customerStageIndex)
    for (let i = 1; i < indexes.length; i += 1) {
      expect(indexes[i], `${REPAIR_FLOW[i]} goes backwards`).toBeGreaterThanOrEqual(indexes[i - 1])
    }
  })

  it('hides the bench states behind the stage that contains them', () => {
    // These are how the branch organises its own work, not answers to "where is my phone?".
    expect(customerStatusLabel('Diagnostics')).toBe('Device with us')
    expect(customerStatusLabel('Parts ordered')).toBe('Being repaired')
    expect(customerStatusLabel('Quality check')).toBe('Being repaired')
    expect(customerStage('Quality check').key).toBe(customerStage('Repair in progress').key)
  })

  it('keeps the workshop vocabulary for staff and admins', () => {
    for (const s of ALL_STATUSES) {
      expect(statusLabel(s, 'internal')).toBe(s)
      expect(statusLabel(s)).toBe(s)
    }
  })

  it('says which way the device is coming back, since one stage covers both', () => {
    const collect = { status: 'Ready for collection', history: [['Ready for collection', 1]] }
    const posted = { status: 'Dispatched', history: [['Ready for collection', 1], ['Dispatched', 2]] }
    expect(customerStatusLabel('Ready for collection', collect)).toBe('Ready to collect')
    expect(customerStatusLabel('Dispatched', posted)).toBe('On its way to you')
  })

  it('treats a finished repair as finished, not as its last step still running', () => {
    // The bug this pins: the final state rendered as an empty circle labelled "In progress"
    // beside a header reading 100%, so a completed repair never looked completed on any side.
    expect(REPAIR_FINISHED).toContain('Completed')
    expect(REPAIR_FINISHED).not.toContain('Cancelled')
    expect(REPAIR_STOPPED).toContain('Cancelled')
    expect(customerStageIndex('Completed')).toBe(CUSTOMER_JOURNEY.length - 1)
  })

  it('has a stage for every status except the one that stops the journey', () => {
    for (const s of REPAIR_FLOW) expect(customerStage(s)).toBeTruthy()
    expect(customerStage('Cancelled')).toBeNull()
    expect(customerStatusLabel('Cancelled')).toBe('Cancelled')
  })

  it('falls back to the raw status rather than rendering nothing', () => {
    expect(customerStatusLabel('Some future status')).toBe('Some future status')
    expect(customerNextStep('Some future status')).toBeNull()
  })
})

describe('what the customer is asked to do', () => {
  it('addresses them in the states where they are the blocker', () => {
    expect(customerStatusLabel('Awaiting device')).toMatch(/your device/i)
    expect(customerStatusLabel('Quote awaiting approval')).toMatch(/your approval/i)
    expect(customerNextStep('Awaiting device')).toBeTruthy()
    expect(customerNextStep('Quote awaiting approval')).toBeTruthy()
  })

  it('gives no next step while the branch is the one working', () => {
    for (const s of ['Booking received', 'Device received', 'Diagnostics', 'Repair in progress',
      'Parts ordered', 'Quality check', 'Completed', 'Cancelled']) {
      expect(customerNextStep(s)).toBeNull()
    }
  })
})

describe('customer labels are written from the customer\u2019s side', () => {
  const ALL_TRADE_IN = [...TRADE_IN_CUSTOMER_FLOW, ...TRADE_IN_TERMINAL, 'device_received']

  it('covers every state a sale can reach', () => {
    for (const s of ALL_TRADE_IN) expect(TRADE_IN_CUSTOMER_LABELS[s]).toBeTruthy()
  })

  // They sent the request; they did not receive it. "Request received" also implied we already
  // had the device, when at that point we hold nothing but a form.
  it('never tells the customer they received what they just sent us', () => {
    expect(TRADE_IN_CUSTOMER_LABELS.submitted).not.toMatch(/received/i)
    expect(customerStatusLabel('Booking received')).not.toMatch(/received/i)
  })

  // And the same error in reverse: a status WE cause, described from our side.
  it('never describes our own actions from our side', () => {
    expect(TRADE_IN_CUSTOMER_LABELS.paid).not.toMatch(/\bsent\b/i)
    expect(TRADE_IN_CUSTOMER_LABELS.offer_sent).not.toMatch(/\bsent\b/i)
  })

  // Correct and kept: at that point we genuinely do hold the device, and it is phrased as where
  // the device is rather than as an act of receiving.
  it('still says plainly where the device is once we hold it', () => {
    expect(TRADE_IN_CUSTOMER_LABELS.device_received).toBe('Device with us')
    expect(customerStatusLabel('Device received')).toBe('Device with us')
  })

  it('opens both journeys in the same voice', () => {
    const opening = [customerStatusLabel('Booking received'), TRADE_IN_CUSTOMER_LABELS.submitted]
    expect(opening.every((l) => /confirmed$/i.test(l))).toBe(true)
  })

  it('keeps the internal vocabulary for staff', () => {
    expect(tradeInStatusLabel('submitted')).toBe('Submitted')
    expect(tradeInStatusLabel('paid')).toBe('Paid')
    expect(tradeInStatusLabel('submitted', 'customer')).toBe('Request confirmed')
  })
})

describe('orders speak with one vocabulary too', () => {
  const ALL_ORDER = [...ORDER_FLOW, ...ORDER_TERMINAL]

  it('labels every status for both audiences and gives each a colour', () => {
    for (const s of ALL_ORDER) {
      expect(ORDER_LABELS[s], s).toBeTruthy()
      expect(ORDER_CUSTOMER_LABELS[s], s).toBeTruthy()
      expect(ORDER_STYLES[s], s).toBeTruthy()
    }
  })

  // The customer's order list printed "Test mode" — a note about the payment stub — for every
  // order that was not cancelled, so an admin marking one dispatched changed nothing there.
  it('never shows the customer a developer note instead of their status', () => {
    for (const s of ALL_ORDER) {
      expect(orderStatusLabel(s, 'customer')).not.toMatch(/test mode/i)
      expect(orderStatusLabel(s, 'customer')).toBeTruthy()
    }
    expect(orderStatusLabel('paid', 'customer')).toBe('Order confirmed')
    expect(orderStatusLabel('dispatched', 'customer')).toBe('On its way to you')
  })

  it('keeps the operational word for staff and admins', () => {
    expect(orderStatusLabel('paid')).toBe('Paid')
    expect(orderStatusLabel('dispatched')).toBe('Dispatched')
  })

  // Three places decided this by hand and disagreed: the adapter allowed cancelling a delivered
  // order, the admin list offered to cancel one the adapter would refuse, and the customer list
  // used a third list of its own.
  it('answers "can this still be cancelled" the same way everywhere', () => {
    for (const s of ['pending', 'paid', 'processing', 'ready']) {
      expect(orderCanBeCancelled(s), s).toBe(true)
    }
    for (const s of ['dispatched', 'delivered', 'collected', 'cancelled']) {
      expect(orderCanBeCancelled(s), s).toBe(false)
    }
  })

  it('has no status the flow cannot actually produce', () => {
    // 'completed' was tested for in the adapter and offered by nothing.
    expect(ALL_ORDER).not.toContain('completed')
    for (const s of Object.keys(ORDER_LABELS)) expect(ALL_ORDER).toContain(s)
  })
})
