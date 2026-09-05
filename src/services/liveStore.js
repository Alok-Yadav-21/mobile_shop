// Tells open screens that the stored data changed.
//
// Every side reads the same records, but each page fetched once on mount and then sat there:
// staff moved a repair to Ready for collection and the customer's tracking page, open in
// another tab, went on showing Diagnostics until they reloaded it. The data was synchronised;
// the screens were not.
//
// Two directions to cover:
//   * within a tab   — a write here should refresh the other screens mounted here.
//   * between tabs   — the browser fires a `storage` event in EVERY OTHER tab of the same
//                      origin when localStorage is written, which is the one push mechanism
//                      available without a server. The writing tab is not notified by it, which
//                      is why the local emit exists too.
//
// A real backend replaces this with a subscription (Supabase publishes Postgres changes over a
// websocket); the pages do not change, because they only ever see "something changed, refetch".

const listeners = new Set()
const PREFIX = 'vt_'

// Coalesced: one API call often writes several keys — a stock adjustment touches products,
// branch stock and inventory moves — and each subscriber only needs to refetch once.
let pending = null
function emit(key) {
  if (pending) clearTimeout(pending)
  pending = setTimeout(() => {
    pending = null
    listeners.forEach((fn) => { try { fn(key) } catch { /* one bad listener must not stop the rest */ } })
  }, 60)
}

export function notifyChange(key) {
  if (String(key).startsWith(PREFIX)) emit(key)
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    // e.key is null when the whole store is cleared, which is also worth refetching for.
    if (e.key == null || String(e.key).startsWith(PREFIX)) emit(e.key)
  })
}
