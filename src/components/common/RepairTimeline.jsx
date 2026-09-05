import { motion, useReducedMotion } from 'framer-motion'
import { journeySteps, stepState } from '@/lib/journey.js'
import {
  REPAIR_FLOW, REPAIR_FINISHED, REPAIR_STOPPED, statusLabel,
  CUSTOMER_JOURNEY, customerStageIndex,
} from '@/constants/status.js'
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
  flow, history = [], status, stoppedStates = [], finishedStates = [],
  labelFor = (s) => s, stopNote = null, indexOf = null, timeOf = null,
}) {
  const reduce = useReducedMotion()
  const { steps, shownIndex, reached, pct, cancelled, finished, at } = journeySteps({
    flow, history, status, stoppedStates, finishedStates, indexOf, timeOf,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-semibold text-graphite-500">
          {cancelled ? labelFor(status) : finished ? 'Finished' : `Step ${reached + 1} of ${steps.length}`}
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
          const { isStop: isCancelPoint, done, active } = stepState({ index: i, shownIndex, cancelled, finished })
          // A stage covers several statuses, so its timestamp is when it was first entered.
          const h = at(s)

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
  const stopNote = `This repair was cancelled${repair?.cancellationReason ? ` — ${repair.cancellationReason}` : '.'}`

  // The customer's timeline walks the stages, not the eleven bench states — same stored status
  // underneath, projected. See CUSTOMER_JOURNEY in constants/status.js.
  if (audience === 'customer') {
    return (
      <JourneyTimeline
        flow={CUSTOMER_JOURNEY.map((st) => st.key)}
        history={repair?.history ?? []}
        status={repair?.status}
        stoppedStates={REPAIR_STOPPED}
        finishedStates={REPAIR_FINISHED}
        indexOf={(key) => (typeof key === 'string' && CUSTOMER_JOURNEY.some((st) => st.key === key)
          ? CUSTOMER_JOURNEY.findIndex((st) => st.key === key)
          : customerStageIndex(key))}
        timeOf={(key, history) => {
          const stage = CUSTOMER_JOURNEY.find((st) => st.key === key)
          // First entry into the stage: the moment the customer would say it started.
          return history.find((h) => stage?.covers.includes(h[0])) ?? null
        }}
        labelFor={(key) => CUSTOMER_JOURNEY.find((st) => st.key === key)?.label(repair) ?? key}
        stopNote={stopNote}
      />
    )
  }

  return (
    <JourneyTimeline
      flow={REPAIR_FLOW}
      history={repair?.history ?? []}
      status={repair?.status}
      stoppedStates={REPAIR_STOPPED}
      finishedStates={REPAIR_FINISHED}
      labelFor={(s) => statusLabel(s, audience)}
      stopNote={stopNote}
    />
  )
}
