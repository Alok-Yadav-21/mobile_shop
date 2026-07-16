import { describe, it, expect } from 'vitest'
import {
  REPAIR_FLOW, STATUS_STYLES, STATUS_TRANSITIONS, canTransition, requiresReason, nextStatuses,
  TRADE_IN_FLOW, TRADE_IN_LABELS, tradeInCanTransition,
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
