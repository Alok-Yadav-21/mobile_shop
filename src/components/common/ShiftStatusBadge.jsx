import { SHIFT_STATUS_LABELS, SHIFT_STATUS_TONES } from '@/constants/shifts.js'

export function ShiftStatusBadge({ status }) {
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${SHIFT_STATUS_TONES[status] ?? 'bg-graphite-100 text-graphite-500'}`}>
      {SHIFT_STATUS_LABELS[status] ?? status}
    </span>
  )
}
