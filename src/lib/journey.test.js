import { describe, it, expect } from 'vitest'
import { journeySteps, stepState } from './journey.js'
import { REPAIR_FLOW, REPAIR_FINISHED, REPAIR_STOPPED } from '@/constants/status.js'

const forRepair = (status, history) => journeySteps({
  flow: REPAIR_FLOW, history, status,
  stoppedStates: REPAIR_STOPPED, finishedStates: REPAIR_FINISHED,
})
const h = (...statuses) => statuses.map((s, i) => [s, i + 1])

describe('journeySteps', () => {
  it('marks a finished journey finished, not still running its last step', () => {
    // The bug: the final state drew an empty circle labelled "In progress" beside a header
    // reading 100%, so a completed repair never looked completed on any of the three sides.
    const full = h('Booking received', 'Device received', 'Diagnostics', 'Quote awaiting approval',
      'Repair in progress', 'Quality check', 'Ready for collection', 'Completed')
    const j = forRepair('Completed', full)
    const last = stepState({ index: j.shownIndex, ...j })
    expect(j.finished).toBe(true)
    expect(last.done).toBe(true)
    expect(last.active).toBe(false)
    expect(Math.round(j.pct)).toBe(100)
  })

  it('still shows the current step as in progress while it is running', () => {
    const j = forRepair('Diagnostics', h('Booking received', 'Device received', 'Diagnostics'))
    const cur = stepState({ index: j.shownIndex, ...j })
    expect(cur.active).toBe(true)
    expect(cur.done).toBe(false)
  })

  it('drops a step that was skipped rather than ticking it green', () => {
    // Booking received -> Device received is a legal transition, so a customer who walked in
    // was shown "Awaiting device" completed, with no timestamp, for something never asked of
    // them.
    const j = forRepair('Diagnostics', h('Booking received', 'Device received', 'Diagnostics'))
    expect(j.steps).not.toContain('Awaiting device')
    expect(j.steps[0]).toBe('Booking received')
    expect(j.steps[1]).toBe('Device received')
  })

  it('keeps a skipped-looking step that is still ahead of the current position', () => {
    // Nothing after the current step has happened yet; absence there is not evidence.
    const j = forRepair('Booking received', h('Booking received'))
    expect(j.steps).toContain('Awaiting device')
    expect(j.steps).toContain('Completed')
  })

  it('counts the steps it actually shows', () => {
    // The counter read "Step 3 of 7" beside six rendered steps, because it measured the flow
    // rather than the filtered list.
    const j = forRepair('Quote awaiting approval',
      h('Booking received', 'Device received', 'Diagnostics', 'Quote awaiting approval'))
    expect(j.reached + 1).toBeLessThanOrEqual(j.steps.length)
    expect(j.steps).toHaveLength(REPAIR_FLOW.length - 1) // Awaiting device dropped
  })

  it('stops a cancelled journey where it stopped, and marks that point', () => {
    const j = forRepair('Cancelled', h('Booking received', 'Device received', 'Cancelled'))
    expect(j.cancelled).toBe(true)
    expect(j.finished).toBe(false)
    expect(j.steps[j.steps.length - 1]).toBe('Device received')
    expect(stepState({ index: j.shownIndex, ...j }).isStop).toBe(true)
  })

  it('does not divide by zero on a single-step journey', () => {
    const j = journeySteps({ flow: ['only'], history: [['only', 1]], status: 'only' })
    expect(j.pct).toBe(0)
    expect(j.steps).toHaveLength(1)
  })

  it('survives a status that is not in the flow at all', () => {
    const j = forRepair('Something new', h('Booking received'))
    expect(j.shownIndex).toBe(-1)
    expect(() => stepState({ index: 0, ...j })).not.toThrow()
  })
})
