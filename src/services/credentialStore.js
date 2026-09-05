// Where sign-in details live in mock mode. Separate from the user store on purpose: a user
// record is read by half the app (rotas, repair assignment, customer lists), and a password
// hash must never travel with it. Nothing outside this module ever sees a hash.
//
// This module deliberately holds no authorization logic — it is the storage layer. Who may
// call these functions is decided by AuthAPI in src/services/adapter/mock.js, which resolves
// the caller from the ambient session and applies the same permission table as everything else.
import { SEED_CREDENTIALS } from '@/data/credentials.js'
import { hashPassword, normaliseUsername } from '@/lib/password.js'

const KEY = 'vt_credentials'

function load() {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) } catch { /* ignore */ }
  return null
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage unavailable — non-fatal in mock mode */ }
}

// Hashing is async and comparatively slow (120k PBKDF2 rounds × 12 accounts), so the seed runs
// once and every caller awaits the same promise rather than racing to write the store.
let seeding = null

export function ensureSeeded() {
  const existing = load()
  if (existing) return Promise.resolve(existing)
  if (seeding) return seeding
  seeding = (async () => {
    const rows = await Promise.all(SEED_CREDENTIALS.map(async (c) => ({
      userId: c.userId,
      username: c.username ? normaliseUsername(c.username) : null,
      ...(await hashPassword(c.password)),
      // Seeded accounts are treated as already set up: an admin has "issued" these.
      mustChange: false,
      // Staff may not change their own password until an admin allows it — the default is
      // false for everyone, and AuthAPI exempts customers and admins, who own their own
      // sign-in details. Storing it uniformly keeps the record shape the same for all roles.
      changeAllowed: false,
      updatedAt: Date.now(),
      updatedBy: null,
    })))
    save(rows)
    return rows
  })()
  return seeding
}

export async function allCredentials() {
  return load() ?? (await ensureSeeded())
}

export async function credentialFor(userId) {
  const list = await allCredentials()
  return list.find((c) => c.userId === userId) ?? null
}

export async function userIdForUsername(username) {
  const u = normaliseUsername(username)
  if (!u) return null
  const list = await allCredentials()
  return list.find((c) => c.username === u)?.userId ?? null
}

export async function usernameTaken(username, exceptUserId = null) {
  const owner = await userIdForUsername(username)
  return owner != null && owner !== exceptUserId
}

// Writes a password (hashing it here, so no caller ever handles one for longer than the call)
// together with whatever else about the credential is changing. Passing no password leaves the
// existing hash untouched, which is how "rename the username" and "allow a password change"
// avoid resetting anyone.
export async function writeCredential(userId, { password, username, mustChange, changeAllowed, updatedBy } = {}) {
  const list = await allCredentials()
  const existing = list.find((c) => c.userId === userId)
  const hashed = password ? await hashPassword(password) : null

  const next = {
    userId,
    username: existing?.username ?? null,
    salt: existing?.salt ?? null,
    hash: existing?.hash ?? null,
    iterations: existing?.iterations ?? null,
    mustChange: existing?.mustChange ?? false,
    changeAllowed: existing?.changeAllowed ?? false,
    updatedAt: existing?.updatedAt ?? Date.now(),
    updatedBy: existing?.updatedBy ?? null,
    ...(username !== undefined ? { username: username ? normaliseUsername(username) : null } : {}),
    ...(hashed ?? {}),
    ...(mustChange !== undefined ? { mustChange } : {}),
    ...(changeAllowed !== undefined ? { changeAllowed } : {}),
  }
  if (hashed || username !== undefined) { next.updatedAt = Date.now(); next.updatedBy = updatedBy ?? next.updatedBy }

  const rest = list.filter((c) => c.userId !== userId)
  save([...rest, next])
  return next
}

export async function removeCredential(userId) {
  const list = await allCredentials()
  save(list.filter((c) => c.userId !== userId))
}

// What an admin is allowed to see about somebody's sign-in: enough to help them in, never the
// secret itself. There is no path in the app — or in this module — that returns a hash.
export function publicSummary(credential) {
  if (!credential) return null
  return {
    userId: credential.userId,
    username: credential.username,
    hasPassword: !!credential.hash,
    mustChange: !!credential.mustChange,
    changeAllowed: !!credential.changeAllowed,
    updatedAt: credential.updatedAt,
  }
}

export { KEY as CREDENTIALS_KEY }
