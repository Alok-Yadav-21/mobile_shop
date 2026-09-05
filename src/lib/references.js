// Customer-facing reference numbers (SPR-4809, VT-TI-3001, VT-ORD-20003, VT-PO-9001).
//
// A reference is the customer's tracking number and the key every lookup uses, so two records
// sharing one is not a cosmetic problem — the adapter's permission check and its write can
// resolve to different rows.

// Next reference in a numbered series, derived from the highest number already in use.
//
// This used to be `prefix + (floor + list.length + 1)` in the adapter, which is only correct
// while the row count and the numbering agree — and they did not, from the very first booking.
// Four seeded repairs numbered SPR-4805..4808 made a new customer's first booking SPR-4805
// again, a reference that already belonged to somebody else's repair. Counting rows also
// reissues a reference whenever one is deleted. Reading the high-water mark is correct in both
// cases, and `floor` keeps a new series clear of a seeded one numbered lower down.
export function nextReference(rows, prefix, floor, key = 'reference') {
  const highest = (rows || []).reduce((max, row) => {
    const raw = String(row?.[key] ?? '')
    if (!raw.startsWith(prefix)) return max
    const n = Number(raw.slice(prefix.length))
    return Number.isFinite(n) && n > max ? n : max
  }, floor)
  return prefix + (highest + 1)
}
