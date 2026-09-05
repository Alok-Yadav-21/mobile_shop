// Password hashing and policy. Kept as pure functions over the Web Crypto API so the same code
// runs in the browser and under vitest, and so nothing here needs a network call.
//
// PBKDF2-SHA-256 with a per-account random salt. A password is never stored, never logged and
// never returned by any API — only the derived hash, its salt and the iteration count are kept,
// and verification re-derives from the supplied password rather than comparing anything
// reversible.
//
// HONEST LIMITATION: in mock mode these records live in localStorage next to the data they
// protect, so somebody with devtools can overwrite a hash with one they generated themselves.
// Hashing still means a stolen store does not hand over usable passwords (people reuse them
// across sites), and it means no screen, log or export can ever print one. The boundary that
// stops a local rewrite is a server holding the hashes — Supabase Auth, whose policies live in
// supabase/migrations. See the same note in src/services/session.js.

const ITERATIONS = 120000
const KEY_BITS = 256
const SALT_BYTES = 16

const encoder = new TextEncoder()

function subtle() {
  const c = globalThis.crypto
  if (!c?.subtle) throw new Error('This browser cannot hash passwords securely. Sign-in is unavailable.')
  return c.subtle
}

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex) => Uint8Array.from(String(hex).match(/../g) ?? [], (h) => parseInt(h, 16))

export function randomSalt(bytes = SALT_BYTES) {
  const a = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(a)
  return toHex(a)
}

// Derives the stored record for a password. The salt is a parameter so verification can
// re-derive against the salt already on file.
export async function hashPassword(password, salt = randomSalt(), iterations = ITERATIONS) {
  const key = await subtle().importKey('raw', encoder.encode(String(password)), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', salt: fromHex(salt), iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  )
  return { salt, iterations, hash: toHex(bits) }
}

// Constant-time over the full length: comparing with === would return early on the first
// differing character, which leaks how much of a guess was right.
function equalsInConstantTime(a, b) {
  const x = String(a)
  const y = String(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i += 1) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(password, record) {
  if (!record?.hash || !record?.salt) return false
  const { hash } = await hashPassword(password, record.salt, record.iterations || ITERATIONS)
  return equalsInConstantTime(hash, record.hash)
}

// Minimum a password must meet before it is accepted. Deliberately short: length and a mix of
// letters and digits catch the passwords that actually get guessed, where forcing symbols and
// mixed case mostly produces "Password1!" written on a note under the counter.
export const PASSWORD_RULES = 'At least 8 characters, including a letter and a number.'

export function passwordProblem(password) {
  const p = String(password ?? '')
  if (p.length < 8) return 'Use at least 8 characters.'
  if (!/[a-zA-Z]/.test(p)) return 'Include at least one letter.'
  if (!/\d/.test(p)) return 'Include at least one number.'
  return null
}

// A username an admin issues to a staff member. Lowercase, no spaces, so it can never collide
// with an email address in the sign-in lookup and cannot be typo-sensitive to case.
export function normaliseUsername(username) {
  return String(username ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

export function usernameProblem(username) {
  const u = normaliseUsername(username)
  if (u.length < 3) return 'Use at least 3 characters.'
  if (u.includes('@')) return 'A username cannot contain @ — that would clash with an email address.'
  if (!/^[a-z0-9._-]+$/.test(u)) return 'Use letters, numbers, dots, dashes or underscores only.'
  return null
}

// A readable starting password an admin can hand over verbally or on a slip. Avoids characters
// that get misread when written down (0/O, 1/l/I).
const WORDS = ['violet', 'copper', 'harbour', 'lantern', 'meadow', 'quartz', 'saffron', 'timber', 'walnut', 'zephyr']
export function suggestPassword() {
  const bytes = new Uint8Array(3)
  globalThis.crypto.getRandomValues(bytes)
  const word = WORDS[bytes[0] % WORDS.length]
  const number = 23 + (bytes[1] % 77)
  const second = WORDS[bytes[2] % WORDS.length]
  return `${word}-${second}-${number}`
}
