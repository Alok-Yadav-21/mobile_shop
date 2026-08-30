// Wage calculation. Every figure here is derived from shift records — hours are never stored,
// so editing a clock-out time is enough to correct the day, week and month totals that follow
// from it. Pure functions only, so the arithmetic is unit-testable without a backend.
import { DEFAULT_HOURLY_RATE } from '@/data/users.js'
import { PAYABLE_SHIFT_STATUSES, MAX_SHIFT_HOURS } from '@/constants/shifts.js'
import { periodKey, periodStart, periodLabel } from './reporting.js'

// The single gate deciding what counts toward pay. Every aggregate below routes through it,
// so there is no path — page, report or export — that can pay out unapproved hours.
// Pass { payableOnly: false } only to preview what a pending submission WOULD be worth.
export function payableShifts(shifts, { payableOnly = true } = {}) {
  if (!payableOnly) return shifts
  return shifts.filter((s) => PAYABLE_SHIFT_STATUSES.includes(s?.status))
}

export const isPayable = (shift) => PAYABLE_SHIFT_STATUSES.includes(shift?.status)

// "HH:MM" -> minutes since midnight.
export function parseClock(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

// A full day is a unit of its own: it is never expressed as hours, so it contributes zero to
// every hours figure and one to every day figure. What it pays is set by an admin per shift.
export const isFullDay = (shift) => shift?.entryMode === 'full_day'

// Paid minutes on an *hourly* shift:
//   hours — the figure they entered, clamped to a sane maximum;
//   times — clock-out minus clock-in, less the unpaid break.
// A shift ending past midnight runs into the next day rather than counting as negative time.
// Returns 0 for a full day, which is not measured in hours at all.
export function shiftMinutes(shift) {
  if (isFullDay(shift)) return 0
  if (shift?.entryMode === 'hours') {
    const h = Number(shift.hours)
    if (!Number.isFinite(h) || h <= 0) return 0
    return Math.min(h, MAX_SHIFT_HOURS) * 60
  }
  const start = parseClock(shift?.start)
  const end = parseClock(shift?.end)
  if (start == null || end == null) return 0
  const span = (end >= start ? end : end + 24 * 60) - start
  return Math.max(0, span - (shift.breakMins || 0))
}

export function shiftHours(shift) {
  return shiftMinutes(shift) / 60
}

export function rateFor(staff) {
  const rate = Number(staff?.hourlyRate)
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_HOURLY_RATE
}

// What an HOURLY shift would be worth at the staff member's standing rate — a starting figure
// for the admin reviewing it, never shown to the staff member.
//
// Returns null for a full day: there is no standing day rate to derive from. What a full day
// pays is decided by the admin at approval, and it varies by person and by occasion, so
// offering a computed figure here would quietly turn it back into a fixed price.
export function suggestedPay(shift, staff) {
  if (isFullDay(shift)) return null
  return round2(shiftHours(shift) * rateFor(staff))
}

// What a shift is actually worth: the amount the admin entered and confirmed when approving.
// Pay is a decision, not a derivation.
//
// For hourly shifts the standing rate is a fallback, so rota records predating per-shift
// amounts do not silently drop to zero. A full day has no rate to fall back to — until an
// admin sets an amount it is worth nothing, which is correct: nobody has priced it yet.
export function shiftWage(shift, staff) {
  // Checked for null/undefined before coercing: Number(null) is 0, not NaN, so coercing first
  // would silently pay zero for a shift that simply has no agreed amount yet.
  if (shift?.approvedPay == null) return suggestedPay(shift, staff) ?? 0
  const confirmed = Number(shift.approvedPay)
  if (Number.isFinite(confirmed) && confirmed >= 0) return confirmed
  return suggestedPay(shift, staff) ?? 0
}

// Full days counted as days — the counterpart to shiftHours for whole-day work.
export const shiftFullDays = (shift) => (isFullDay(shift) ? 1 : 0)

// Round money to whole pence at the point it becomes a total, not per shift — rounding each
// shift first would drift by pounds across a month.
export const round2 = (n) => Math.round(n * 100) / 100

// Totals for one staff member across the shifts supplied.
// `days` counts distinct calendar dates, so two shifts on one day is still one day worked.
export function summariseShifts(shifts, staff, opts = {}) {
  const payable = payableShifts(shifts, opts)
  const hours = payable.reduce((s, sh) => s + shiftHours(sh), 0)
  const fullDays = payable.reduce((s, sh) => s + shiftFullDays(sh), 0)
  const wage = payable.reduce((s, sh) => s + shiftWage(sh, staff), 0)
  const days = new Set(payable.map((sh) => sh.date)).size
  // Averaged over the days actually paid by the hour — including full days here would
  // divide hourly time by a day count that has no hours in it.
  const hourlyDays = new Set(payable.filter((sh) => !isFullDay(sh)).map((sh) => sh.date)).size
  return {
    hours: round2(hours),
    fullDays,
    days,
    shifts: payable.length,
    rate: rateFor(staff),
    wage: round2(wage),
    avgHoursPerDay: hourlyDays ? round2(hours / hourlyDays) : 0,
  }
}

// One row per staff member, for a wage table. `staff` is the full staff list so people with
// no shifts in the period still appear (with zeroes) rather than vanishing from payroll.
export function wagesByStaff(shifts, staff, opts = {}) {
  return staff.map((s) => {
    const mine = shifts.filter((sh) => sh.staffId === s.id)
    return { staff: s, ...summariseShifts(mine, s, opts) }
  })
}

// Payroll cost per branch — attributed to the branch the shift was worked at, not the staff
// member's home branch, so cover shifts land on the branch that actually got the labour.
export function wagesByBranch(shifts, staffById, opts = {}) {
  const acc = {}
  for (const sh of payableShifts(shifts, opts)) {
    const staff = staffById[sh.staffId]
    const key = sh.branchId || 'unassigned'
    acc[key] ||= { branchId: key, hours: 0, fullDays: 0, wage: 0, shifts: 0, staffIds: new Set() }
    acc[key].hours += shiftHours(sh)
    acc[key].fullDays += shiftFullDays(sh)
    acc[key].wage += shiftWage(sh, staff)
    acc[key].shifts += 1
    acc[key].staffIds.add(sh.staffId)
  }
  return Object.values(acc).map((r) => ({
    branchId: r.branchId,
    hours: round2(r.hours),
    fullDays: r.fullDays,
    wage: round2(r.wage),
    shifts: r.shifts,
    staffCount: r.staffIds.size,
  }))
}

// The payroll run bucketed by day, week or month — the daily/weekly/monthly wage totals.
// Oldest first; callers reverse for a most-recent-first table.
export function wagesByPeriod(shifts, staffById, period, opts = {}) {
  const rows = {}
  for (const sh of payableShifts(shifts, opts)) {
    const key = periodKey(sh.at, period)
    rows[key] ||= { key, start: periodStart(sh.at, period), label: periodLabel(sh.at, period), items: [] }
    rows[key].items.push(sh)
  }
  return Object.values(rows)
    .sort((a, b) => a.start - b.start)
    .map((r) => ({
      key: r.key, start: r.start, label: r.label,
      ...totalWages(r.items, staffById, opts),
    }))
}

export function totalWages(shifts, staffById, opts = {}) {
  const payable = payableShifts(shifts, opts)
  const hours = payable.reduce((s, sh) => s + shiftHours(sh), 0)
  const fullDays = payable.reduce((s, sh) => s + shiftFullDays(sh), 0)
  const wage = payable.reduce((s, sh) => s + shiftWage(sh, staffById[sh.staffId]), 0)
  return {
    hours: round2(hours),
    fullDays,
    wage: round2(wage),
    shifts: payable.length,
    days: new Set(payable.map((sh) => sh.date)).size,
    staffCount: new Set(payable.map((sh) => sh.staffId)).size,
  }
}
