import { describe, it, expect } from 'vitest'
import { quoteHasBeenSent, quoteVisibleToCustomer, redactUnsentQuote } from './quotes.js'

const draft = {
  ref: 'SPR-1', quote: 245, status: 'Diagnostics',
  history: [['Booking received', 1], ['Device received', 2], ['Diagnostics', 3]],
}
const sent = {
  ...draft, status: 'Quote awaiting approval',
  history: [...draft.history, ['Quote awaiting approval', 4]],
}
const approved = {
  ...sent, status: 'Repair in progress',
  history: [...sent.history, ['Repair in progress', 5]],
}

describe('quote visibility', () => {
  // The leak this closes: staff typed a working figure during diagnostics and it appeared on
  // the customer's tracking page immediately, so a customer could watch a number move around
  // and believe they had been quoted the first one they saw.
  it('hides a figure the branch has not put to the customer yet', () => {
    expect(quoteHasBeenSent(draft)).toBe(false)
    expect(quoteVisibleToCustomer(draft)).toBe(false)
    expect(redactUnsentQuote(draft).quote).toBeNull()
  })

  it('shows it the moment it is sent for approval', () => {
    expect(quoteVisibleToCustomer(sent)).toBe(true)
    expect(redactUnsentQuote(sent)).toBe(sent)
  })

  it('keeps showing it after approval — they need the figure they agreed to', () => {
    expect(quoteVisibleToCustomer(approved)).toBe(true)
    expect(redactUnsentQuote(approved).quote).toBe(245)
  })

  it('treats a repair with no quote as nothing to show, not as hidden', () => {
    expect(quoteVisibleToCustomer({ ...sent, quote: null })).toBe(false)
  })

  it('reads the history, not just the current status, so a revision cannot re-hide it', () => {
    // Parts ordered comes after approval; the quote must not vanish because the status moved on.
    const later = { ...approved, status: 'Parts ordered', history: [...approved.history, ['Parts ordered', 6]] }
    expect(quoteVisibleToCustomer(later)).toBe(true)
  })

  it('leaves a repair with no history alone rather than throwing', () => {
    expect(quoteHasBeenSent({ quote: 10, status: 'Diagnostics' })).toBe(false)
    expect(quoteHasBeenSent(null)).toBe(false)
  })
})
