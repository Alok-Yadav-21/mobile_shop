// When a repair quote becomes the customer's business.
//
// A quote is a working figure long before it is an offer. Staff type one during diagnostics,
// revise it once they are inside the device, and check a part price before committing to it.
// None of that is a price the customer has been given — but all of it used to appear on their
// tracking page the moment it was typed, so a customer could watch a number move around and
// reasonably believe they had been quoted the first one they saw.
//
// A quote is theirs to see once it has actually been put to them, which is exactly the moment
// the repair enters "Quote awaiting approval".

export const QUOTE_SENT_STATUS = 'Quote awaiting approval'

export function quoteHasBeenSent(repair) {
  if (!repair) return false
  if (repair.status === QUOTE_SENT_STATUS) return true
  // And it stays visible afterwards. Hiding it again the moment they approve would take away
  // the figure they just agreed to, which they need when they come to collect and pay.
  return (repair.history || []).some((h) => h[0] === QUOTE_SENT_STATUS)
}

export function quoteVisibleToCustomer(repair) {
  return repair?.quote != null && quoteHasBeenSent(repair)
}

// Applied in the data layer, not in the page: a customer's copy of a repair simply does not
// carry an unsent quote, so there is nothing to reveal by editing the frontend or reading the
// API response directly.
export function redactUnsentQuote(repair) {
  if (!repair || quoteHasBeenSent(repair)) return repair
  const { quote, ...safe } = repair
  return { ...safe, quote: null }
}
