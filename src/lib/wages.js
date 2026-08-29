// Wage calculation. Every figure here is derived from shift records — hours are never stored,
// so editing a clock-out time is enough to correct the day, week and month totals that follow
// from it. Pure functions only, so the arithmetic is unit-testable without a backend.
import { DEFAULT_HOURLY_RATE } from '@/data/users.js'
import { PAYABLE_SHIFT_STATUSES, FULL_DAY_HOURS, MAX_SHIFT_HOURS } from '@/constants/shifts.js'
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

// Paid minutes on a shift, honouring how the staff member recorded it:
//   full_day — a standard day at a branch;
//   hours    — the figure they entered, clamped to a sane maximum;
//   times    — clock-out minus clock-in, less the unpaid break.
// A shift ending past midnight runs into the next day rather than counting as negative time.
export function shiftMinutes(shift) {
  if (shift?.entryMode === 'full_day') return FULL_DAY_HOURS * 60
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

export function shiftWage(shift, staff) {
  return shiftHours(shift) * rateFor(staff)
}

// Round money to whole pence at the point it becomes a total, not per shift — rounding each
// shift first would drift by pounds across a month.
export const round2 = (n) => Math.round(n * 100) / 100

// Totals for one staff member across the shifts supplied.
// `days` counts distinct calendar dates, so two shifts on one day is still one day worked.
export function summariseShifts(shifts, staff, opts = {}) {
  const payable = payableShifts(shifts, opts)
  const hours = payable.reduce((s, sh) => s + shiftHours(sh), 0)
  const days = new Set(payable.map((sh) => sh.date)).size
  return {
    hours: round2(hours),
    days,
    shifts: payable.length,
    rate: rateFor(staff),
    wage: round2(hours * rateFor(staff)),
    avgHoursPerDay: days ? round2(hours / days) : 0,
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
    acc[key] ||= { branchId: key, hours: 0, wage: 0, shifts: 0, staffIds: new Set() }
    acc[key].hours += shiftHours(sh)
    acc[key].wage += shiftWage(sh, staff)
    acc[key].shifts += 1
    acc[key].staffIds.add(sh.staffId)
  }
  return Object.values(acc).map((r) => ({
    branchId: r.branchId,
    hours: round2(r.hours),
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
  const wage = payable.reduce((s, sh) => s + shiftWage(sh, staffById[sh.staffId]), 0)
  return {
    hours: round2(hours),
    wage: round2(wage),
    shifts: payable.length,
    days: new Set(payable.map((sh) => sh.date)).size,
    staffCount: new Set(payable.map((sh) => sh.staffId)).size,
  }
}
