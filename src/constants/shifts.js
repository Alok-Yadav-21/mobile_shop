// Shift submission and approval vocabulary.
//
// A shift is worked, submitted by the staff member, then reviewed by an admin. Only an
// approved shift is payable — see payableShifts() in src/lib/wages.js, which is the single
// place that decides what counts toward a wage.

export const SHIFT_STATUSES = ['pending', 'approved', 'rejected']

export const SHIFT_STATUS_LABELS = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const SHIFT_STATUS_TONES = {
  pending: 'bg-amber-50 text-amber-600',
  approved: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-rose-50 text-rose-600',
}

// Only approved hours are paid.
export const PAYABLE_SHIFT_STATUSES = ['approved']

// How a staff member recorded the time they worked.
//   full_day — "I worked the whole day". Paid as one day at the staff member's day rate;
//              it is deliberately NOT converted into an hours figure, so a full day is
//              counted and reported as a day, not as some assumed number of hours.
//   hours    — "I worked 10 hours"; the figure is entered directly, paid hourly.
//   times    — clock-in/clock-out with an unpaid break, paid hourly. The most precise option.
export const ENTRY_MODES = ['full_day', 'hours', 'times']

export const ENTRY_MODE_LABELS = {
  full_day: 'Full day',
  hours: 'Total hours',
  times: 'Start & finish times',
}

// Guard rails on a submission: nobody works a 24-hour shift, and a zero-hour one is a mistake.
export const MIN_SHIFT_HOURS = 0.5
export const MAX_SHIFT_HOURS = 16

// A rejected shift must say why, so the staff member can correct and resubmit.
export const REJECTION_REQUIRES_REASON = true
