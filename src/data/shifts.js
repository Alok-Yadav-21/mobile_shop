// Rota / shift records — the raw input to staff wage calculation (src/lib/wages.js).
// One record is one worked shift: who, where, which calendar day, clock-in, clock-out and
// unpaid break. Hours and pay are always *derived* from these, never stored, so correcting a
// clock-out time automatically corrects the day/week/month wage totals that reference it.
import { USERS } from './users.js'

const DAY = 86400000

// Deterministic PRNG (mulberry32). The demo rota must be byte-identical on every page load —
// wage totals that drift between refreshes would make the reports impossible to trust.
function rng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Local calendar day key (not UTC) — a shift belongs to the day the branch actually opened.
export function dayKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Shift templates, roughly matching how a high-street repair shop staffs a day.
const PATTERNS = [
  { start: '09:00', end: '17:30', breakMins: 30 },
  { start: '09:30', end: '18:00', breakMins: 30 },
  { start: '10:00', end: '18:00', breakMins: 30 },
  { start: '11:00', end: '19:00', breakMins: 45 },
  { start: '09:00', end: '14:00', breakMins: 0 },  // short/half day
]

export function generateShifts(days = 90, seed = 20240517) {
  const rand = rng(seed)
  const staff = USERS.filter((u) => u.role === 'staff')
  const out = []
  const start = Date.now() - days * DAY

  for (let d = 0; d < days; d++) {
    const ts = start + d * DAY
    const weekday = new Date(ts).getDay() // 0 = Sunday
    if (weekday === 0) continue           // branches closed Sundays

    for (const s of staff) {
      // ~85% attendance on weekdays, ~60% on Saturdays — holidays and days off show up as
      // simply having no shift record, which is what "days worked" counts.
      const attendance = weekday === 6 ? 0.6 : 0.85
      if (rand() > attendance) continue

      const pattern = weekday === 6
        ? PATTERNS[4]
        : PATTERNS[Math.floor(rand() * 4)]

      // Historical rota is already signed off. The last few days are left pending on
      // purpose so an admin opening the approvals queue has something real to review, and
      // so the "pending hours are not paid" rule is visible in the seeded data.
      const ageDays = days - d
      const status = ageDays <= 3 ? 'pending' : 'approved'

      out.push({
        id: `sh-${s.id}-${dayKey(ts)}`,
        staffId: s.id,
        branchId: s.branch,
        date: dayKey(ts),
        at: ts,
        entryMode: 'times',
        status,
        submittedBy: s.id,
        submittedAt: ts + 10 * 3600000,
        reviewedBy: status === 'approved' ? 'u3' : null,
        reviewedAt: status === 'approved' ? ts + 30 * 3600000 : null,
        reviewNote: null,
        ...pattern,
      })
    }
  }
  return out
}

export const SHIFTS = generateShifts()
