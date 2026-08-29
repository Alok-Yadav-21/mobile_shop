// The ambient session the data layer authorises against — the mock backend's equivalent of a
// server reading the auth cookie on every request.
//
// Why ambient rather than passing an actor into every call: if page code has to hand the
// adapter its own identity, then deleting that argument (or editing the component) is enough
// to escape the check. Resolving the caller inside the adapter means a page cannot ask for
// data it is not entitled to, no matter what the component does.
//
// HONEST LIMITATION: in mock mode this session lives in localStorage, so a determined user
// with devtools can still rewrite it — there is no server to verify a token against. This
// module closes the "change the URL / edit the frontend / call the API directly" hole, not
// the "forge your own session" one. The real boundary for that is Postgres RLS, enforced
// server-side in supabase/migrations/0007_shifts_and_costs.sql, which the Supabase adapter runs
// under; those policies re-derive the caller from auth.uid() and never trust the client.

const SESSION_KEY = 'vt_session'

let current = null
let hydrated = false

function hydrate() {
  if (hydrated) return
  hydrated = true
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    current = raw ? JSON.parse(raw) : null
  } catch { current = null }
}

// The signed-in user as the data layer sees them. Returns null when signed out.
export function getSession() {
  hydrate()
  return current
}

// Called by AuthContext on sign-in, sign-out and profile updates so the adapter and the React
// tree can never disagree about who is signed in.
export function setSession(user) {
  hydrated = true
  current = user ?? null
}

export function clearSession() {
  hydrated = true
  current = null
}

export { SESSION_KEY }
