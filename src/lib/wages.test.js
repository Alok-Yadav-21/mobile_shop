import { describe, it, expect } from 'vitest'
import {
  parseClock, shiftMinutes, shiftHours, rateFor, dailyRateFor, shiftWage, suggestedPay, isFullDay,
  shiftFullDays, payableShifts, isPayable,
  summariseShifts, wagesByStaff, wagesByBranch, totalWages, wagesByPeriod,
} from './wages.js'

const staff = { id: 'u2', name: 'Sam', branch: 'wol', hourlyRate: 16, dailyRate: 130 }
// Fixtures are approved by default: an unapproved shift is worth nothing, which the
// "approval gate" block below covers explicitly.
const shift = (over = {}) => ({
  id: 's1', staffId: 'u2', branchId: 'wol', date: '2026-03-02',
  at: new Date('2026-03-02T09:00:00').getTime(), entryMode: 'times',
  start: '09:00', end: '17:30', breakMins: 30, status: 'approved', ...over,
})

describe('parseClock', () => {
  it('converts HH:MM to minutes since midnight', () => {
    expect(parseClock('09:00')).toBe(540)
    expect(parseClock('17:30')).toBe(1050)
  })
  it('returns null for unparseable input', () => {
    expect(parseClock('nonsense')).toBeNull()
    expect(parseClock(undefined)).toBeNull()
  })
})

describe('shiftMinutes', () => {
  it('subtracts the unpaid break from the clocked span', () => {
    expect(shiftMinutes(shift())).toBe(480) // 8.5h span less 30m break
  })
  it('treats an end time before the start as running past midnight', () => {
    expect(shiftMinutes(shift({ start: '22:00', end: '02:00', breakMins: 0 }))).toBe(240)
  })
  it('never returns negative time when the break exceeds the shift', () => {
    expect(shiftMinutes(shift({ start: '09:00', end: '09:15', breakMins: 60 }))).toBe(0)
  })
  it('returns zero for a malformed shift rather than NaN', () => {
    expect(shiftMinutes({ start: 'x', end: 'y' })).toBe(0)
  })
})

describe('rateFor', () => {
  it('uses the staff member rate when set', () => expect(rateFor(staff)).toBe(16))
  it('falls back to the default for records with no rate', () => expect(rateFor({ id: 'u9' })).toBe(12))
  it('ignores a zero or negative rate', () => expect(rateFor({ hourlyRate: 0 })).toBe(12))
})

describe('dailyRateFor', () => {
  it('uses the staff member day rate when set', () => expect(dailyRateFor(staff)).toBe(130))
  it('falls back to the default when absent', () => expect(dailyRateFor({ id: 'u9' })).toBe(96))
  it('ignores a zero day rate', () => expect(dailyRateFor({ dailyRate: 0 })).toBe(96))
})

describe('shiftWage', () => {
  it('multiplies paid hours by the hourly rate', () => {
    expect(shiftWage(shift(), staff)).toBe(128) // 8h * 16
  })
})

describe('summariseShifts', () => {
  it('counts distinct calendar days, not shifts', () => {
    const rows = [shift(), shift({ id: 's2', start: '18:00', end: '20:00', breakMins: 0 })]
    const out = summariseShifts(rows, staff)
    expect(out.shifts).toBe(2)
    expect(out.days).toBe(1)
    expect(out.hours).toBe(10)
    expect(out.wage).toBe(160)
    expect(out.avgHoursPerDay).toBe(10)
  })
  it('returns zeroes for a staff member with no shifts', () => {
    const out = summariseShifts([], staff)
    expect(out).toMatchObject({ hours: 0, days: 0, shifts: 0, wage: 0, avgHoursPerDay: 0 })
  })
})

describe('wagesByStaff', () => {
  it('keeps staff with no shifts on the payroll at zero', () => {
    const rows = wagesByStaff([shift()], [staff, { id: 'u4', name: 'Priya', hourlyRate: 14 }])
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.staff.id === 'u4').wage).toBe(0)
    expect(rows.find((r) => r.staff.id === 'u2').wage).toBe(128)
  })
})

describe('wagesByBranch', () => {
  it('costs a shift to the branch it was worked at, not the home branch', () => {
    const cover = shift({ id: 's3', branchId: 'blv', date: '2026-03-03', at: new Date('2026-03-03T09:00:00').getTime() })
    const rows = wagesByBranch([shift(), cover], { u2: staff })
    expect(rows.find((r) => r.branchId === 'blv').wage).toBe(128)
    expect(rows.find((r) => r.branchId === 'wol').wage).toBe(128)
  })
})

describe('totalWages', () => {
  it('aggregates hours, wages and distinct staff', () => {
    const other = { ...shift(), id: 's4', staffId: 'u4', branchId: 'blv' }
    const out = totalWages([shift(), other], { u2: staff, u4: { id: 'u4', hourlyRate: 10 } })
    expect(out.hours).toBe(16)
    expect(out.wage).toBe(208) // 8*16 + 8*10
    expect(out.staffCount).toBe(2)
    expect(out.days).toBe(1)
  })
})

describe('wagesByPeriod', () => {
  it('buckets shifts by month, oldest first', () => {
    const march = shift()
    const april = shift({ id: 's5', date: '2026-04-06', at: new Date('2026-04-06T09:00:00').getTime() })
    const rows = wagesByPeriod([april, march], { u2: staff }, 'month')
    expect(rows).toHaveLength(2)
    expect(rows[0].start).toBeLessThan(rows[1].start)
    expect(rows[0].wage).toBe(128)
  })
  it('groups a Monday and a Saturday of the same week together', () => {
    const mon = shift({ id: 'm', date: '2026-03-02', at: new Date('2026-03-02T09:00:00').getTime() })
    const sat = shift({ id: 't', date: '2026-03-07', at: new Date('2026-03-07T09:00:00').getTime() })
    expect(wagesByPeriod([mon, sat], { u2: staff }, 'week')).toHaveLength(1)
  })
})


describe('approval gate', () => {
  it('treats only approved shifts as payable', () => {
    expect(isPayable(shift())).toBe(true)
    expect(isPayable(shift({ status: 'pending' }))).toBe(false)
    expect(isPayable(shift({ status: 'rejected' }))).toBe(false)
    expect(isPayable({})).toBe(false)
  })

  it('excludes pending and rejected hours from every wage total', () => {
    const rows = [shift(), shift({ id: 'p', date: '2026-03-03', status: 'pending' }), shift({ id: 'r', date: '2026-03-04', status: 'rejected' })]
    const out = summariseShifts(rows, staff)
    expect(out.shifts).toBe(1)
    expect(out.hours).toBe(8)
    expect(out.wage).toBe(128)
  })

  it('pays nothing at all when no shift has been approved', () => {
    const out = totalWages([shift({ status: 'pending' })], { u2: staff })
    expect(out.wage).toBe(0)
    expect(out.hours).toBe(0)
    expect(out.staffCount).toBe(0)
  })

  it('keeps unapproved hours out of branch payroll', () => {
    const rows = wagesByBranch([shift({ status: 'pending' })], { u2: staff })
    expect(rows).toEqual([])
  })

  it('can preview unapproved hours only when explicitly asked', () => {
    const pending = [shift({ status: 'pending' })]
    expect(summariseShifts(pending, staff).wage).toBe(0)
    expect(summariseShifts(pending, staff, { payableOnly: false }).wage).toBe(128)
  })

  it('payableShifts filters by status', () => {
    const rows = [shift(), shift({ id: 'x', status: 'pending' })]
    expect(payableShifts(rows)).toHaveLength(1)
    expect(payableShifts(rows, { payableOnly: false })).toHaveLength(2)
  })
})

describe('entry modes', () => {
  it('pays a full day at the day rate, not by the hour', () => {
    expect(shiftWage(shift({ entryMode: 'full_day' }), staff)).toBe(130)
  })

  it('never converts a full day into an hours figure', () => {
    // The whole point of the mode: a full day is a day, so it contributes no hours at all,
    // and stray clock fields left over from another mode must not resurrect an hour count.
    expect(shiftHours(shift({ entryMode: 'full_day', start: '09:00', end: '17:30' }))).toBe(0)
    expect(isFullDay(shift({ entryMode: 'full_day' }))).toBe(true)
    expect(shiftFullDays(shift({ entryMode: 'full_day' }))).toBe(1)
  })

  it('pays a full day the same amount however long the day was', () => {
    const short = shift({ entryMode: 'full_day', start: '09:00', end: '11:00' })
    const long = shift({ entryMode: 'full_day', start: '07:00', end: '21:00' })
    expect(shiftWage(short, staff)).toBe(shiftWage(long, staff))
  })

  it('uses the hours the staff member entered', () => {
    expect(shiftHours(shift({ entryMode: 'hours', hours: 10 }))).toBe(10)
    expect(shiftFullDays(shift({ entryMode: 'hours', hours: 10 }))).toBe(0)
  })

  it('clamps an implausible hours entry rather than paying it out', () => {
    expect(shiftHours(shift({ entryMode: 'hours', hours: 40 }))).toBe(16)
  })

  it('treats a zero or missing hours entry as no time worked', () => {
    expect(shiftHours(shift({ entryMode: 'hours', hours: 0 }))).toBe(0)
    expect(shiftHours(shift({ entryMode: 'hours', hours: null }))).toBe(0)
  })

  it('pays a 10-hour entry at the hourly rate', () => {
    expect(shiftWage(shift({ entryMode: 'hours', hours: 10 }), staff)).toBe(160)
  })
})

describe('mixing day-rate and hourly shifts', () => {
  const fullDay = shift({ id: 'fd', date: '2026-03-05', at: new Date('2026-03-05T09:00:00').getTime(), entryMode: 'full_day' })

  it('adds a flat day rate to hourly pay without inventing hours', () => {
    const out = summariseShifts([shift(), fullDay], staff)
    expect(out.hours).toBe(8)        // only the hourly shift contributes hours
    expect(out.fullDays).toBe(1)
    expect(out.days).toBe(2)         // both are days worked
    expect(out.wage).toBe(258)       // 8h * 16 + 130
  })

  it('keeps the hourly average free of day-rate shifts', () => {
    // Averaging 8 hours over 2 days would report 4h/day and misrepresent the hourly work.
    expect(summariseShifts([shift(), fullDay], staff).avgHoursPerDay).toBe(8)
  })

  it('reports full days per branch alongside hours', () => {
    const [row] = wagesByBranch([shift(), fullDay], { u2: staff })
    expect(row.fullDays).toBe(1)
    expect(row.hours).toBe(8)
    expect(row.wage).toBe(258)
  })

  it('carries full days through the payroll run', () => {
    const out = totalWages([shift(), fullDay], { u2: staff })
    expect(out.fullDays).toBe(1)
    expect(out.wage).toBe(258)
  })

  it('still pays nothing for an unapproved full day', () => {
    expect(totalWages([shift({ entryMode: 'full_day', status: 'pending' })], { u2: staff }).wage).toBe(0)
  })
})


describe('admin-confirmed pay', () => {
  it('pays the amount the admin agreed, not the standing rate', () => {
    // A full day whose standing rate is GBP130 but which the admin approved at GBP150.
    const s = shift({ entryMode: 'full_day', approvedPay: 150 })
    expect(suggestedPay(s, staff)).toBe(130)   // what the rate would have given
    expect(shiftWage(s, staff)).toBe(150)      // what was actually agreed
  })

  it('lets an admin agree less than the standing rate', () => {
    expect(shiftWage(shift({ entryMode: 'hours', hours: 10, approvedPay: 100 }), staff)).toBe(100)
  })

  it('honours a confirmed zero rather than falling back to the rate', () => {
    expect(shiftWage(shift({ approvedPay: 0 }), staff)).toBe(0)
  })

  it('falls back to the standing rate for records with no agreed amount', () => {
    // Historical rota rows predate per-shift amounts; payroll must not drop them to zero.
    expect(shiftWage(shift({ approvedPay: null }), staff)).toBe(128)
  })

  it('carries the agreed amount into staff, branch and period totals', () => {
    const rows = [shift({ approvedPay: 150 }), shift({ id: 'b', date: '2026-03-03', at: new Date('2026-03-03T09:00:00').getTime(), approvedPay: 50 })]
    expect(summariseShifts(rows, staff).wage).toBe(200)
    expect(wagesByBranch(rows, { u2: staff })[0].wage).toBe(200)
    expect(totalWages(rows, { u2: staff }).wage).toBe(200)
  })

  it('still pays nothing for an unapproved shift however large the amount on it', () => {
    expect(totalWages([shift({ status: 'pending', approvedPay: 999 })], { u2: staff }).wage).toBe(0)
  })

  it('suggestedPay ignores any agreed amount — it is only ever the starting figure', () => {
    expect(suggestedPay(shift({ entryMode: 'hours', hours: 10, approvedPay: 999 }), staff)).toBe(160)
  })
})
