import { motion, useReducedMotion } from 'framer-motion'
import { REPAIR_FLOW, statusLabel } from '@/constants/status.js'
import { fmtDateTime } from '@/utils/format.js'
import { Check, X } from 'lucide-react'

// The progress of one journey, read straight from its history.
//
// A cancelled repair is shown as it actually happened: the steps it did reach stay completed,
// the point where it stopped is marked, and the rest are dropped rather than left implying
// work still to come.
// The generic journey. A repair and a sale are the same shape — an ordered list of states, a
// history of [state, timestamp] pairs, and endings that stop the list early — so they share one
// component rather than one being a lesser copy of the other.
export function JourneyTimeline({
  flow, history = [], status, stoppedStates = [], labelFor = (s) => s, stopNote = null,
}) {
  const reduce = useReducedMotion()
  const cancelled = stoppedStates.includes(status)

  const currentIndex = cancelled
    // Where it got to before it stopped — the last flow state present in its history.
    ? flow.reduce((last, s, i) => (history.some((h) => h[0] === s) ? i : last), -1)
    : flow.indexOf(status)

  // Past the stopping point there is nothing meaningful to show.
  const steps = cancelled ? flow.slice(0, currentIndex + 1) : flow
  const reached = Math.max(0, currentIndex)
  const pct = steps.length > 1 ? (reached / (steps.length - 1)) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-semibold text-graphite-500">
          {cancelled ? labelFor(status) : `Step ${reached + 1} of ${flow.length}`}
        </span>
        <span className="text-[12px] text-graphite-400 mono-data">
          {cancelled ? '—' : `${Math.round(pct)}%`}
        </span>
      </div>

      <div className="relative flex flex-col">
        {/* Track, then the filled portion drawn over it. Animating the height of the fill
            rather than each dot keeps it to one transition instead of eleven. */}
        {steps.length > 1 && (
          <>
            <span className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-graphite-200" aria-hidden="true" />
            <motion.span
              aria-hidden="true"
              className={`absolute left-[11px] top-3 w-0.5 origin-top ${cancelled ? 'bg-rose-400' : 'bg-emerald-500'}`}
              style={{ bottom: 12 }}
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: pct / 100 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </>
        )}

        {steps.map((s, i) => {
          const isCancelPoint = cancelled && i === currentIndex
          // One value for "this step happened", used by both the marker and the label —
          // computing it twice let a cancelled repair show a completed dot beside a label
          // greyed out as though the step were still in the future.
          const done = i < currentIndex
          const active = !cancelled && i === currentIndex
          const h = history.find((x) => x[0] === s)

          return (
            <motion.div
              key={s}
              className="flex gap-3 items-start relative pb-4 last:pb-0"
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.045 }}
            >
              <span
                className={`w-6 h-6 rounded-full grid place-items-center z-10 flex-none border-2 transition-colors ${
                  isCancelPoint ? 'bg-rose-500 border-rose-500 text-white'
                  : done ? 'bg-emerald-500 border-emerald-500 text-white'
                  : active ? 'border-brand ring-4 ring-brand-50 bg-white'
                  : 'border-graphite-200 bg-white'
                }`}
              >
                {isCancelPoint ? <X size={13} /> : done ? <Check size={13} /> : null}
              </span>
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${!done && !active && !isCancelPoint ? 'text-graphite-400' : ''}`}>
                  {labelFor(s)}
                  {active && <span className="ml-2 text-[11px] font-bold text-brand">In progress</span>}
                </div>
                {h && <div className="text-[11.5px] text-graphite-400">{fmtDateTime(h[1])}</div>}
              </div>
            </motion.div>
          )
        })}

        {cancelled && (
          <div className="flex gap-3 items-start relative pt-1">
            <span className="w-6 h-6 flex-none" aria-hidden="true" />
            <div className="text-[12.5px] text-rose-600">{stopNote}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// One repair's progress. Wraps JourneyTimeline with the repair flow so every existing caller
// keeps working unchanged; `audience` decides whose vocabulary the step names are written in,
// and defaults to the workshop's.
export function RepairTimeline({ repair, audience = 'internal' }) {
  return (
    <JourneyTimeline
      flow={REPAIR_FLOW}
      history={repair?.history ?? []}
      status={repair?.status}
      stoppedStates={['Cancelled']}
      labelFor={(s) => statusLabel(s, audience)}
      stopNote={`This repair was cancelled${repair?.cancellationReason ? ` — ${repair.cancellationReason}` : '.'}`}
    />
  )
}
