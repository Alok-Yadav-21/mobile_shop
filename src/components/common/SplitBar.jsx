import { pct } from '@/utils/format.js'

// Two-segment proportion bar for a cash-vs-online style split. Deliberately not a chart: the
// numbers live in the table next to it, and this only carries the ratio at a glance.
export function SplitBar({ left = 0, right = 0, leftLabel = 'Cash', rightLabel = 'Online', className = '' }) {
  const total = left + right
  const leftPct = total ? (left / total) * 100 : 0
  return (
    <div className={className}>
      <div
        className="h-2 rounded-full bg-graphite-100 overflow-hidden flex"
        role="img"
        aria-label={`${leftLabel} ${pct(left, total)}, ${rightLabel} ${pct(right, total)}`}
      >
        <div className="bg-emerald-500 h-full" style={{ width: `${leftPct}%` }} />
        <div className="bg-brand h-full" style={{ width: `${100 - leftPct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-graphite-400 mt-1.5">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {leftLabel} {pct(left, total)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand inline-block" />
          {rightLabel} {pct(right, total)}
        </span>
      </div>
    </div>
  )
}
