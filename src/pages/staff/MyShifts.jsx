import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ShiftAPI, BranchAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { summariseShifts, shiftHours, isFullDay } from '@/lib/wages.js'
import {
  ENTRY_MODES, ENTRY_MODE_LABELS, MIN_SHIFT_HOURS, MAX_SHIFT_HOURS,
} from '@/constants/shifts.js'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ShiftStatusBadge } from '@/components/common/ShiftStatusBadge.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { moneyExact, hoursFmt, fmtDate } from '@/utils/format.js'
import { Clock, CalendarDays, PoundSterling, Hourglass, Plus, Pencil, Trash2, RotateCcw, Info } from 'lucide-react'

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const schema = z.object({
  date: z.string().min(1, 'Choose the date you worked'),
  entryMode: z.enum(ENTRY_MODES),
  hours: z.union([z.coerce.number(), z.literal('')]).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  breakMins: z.union([z.coerce.number(), z.literal('')]).optional(),
}).superRefine((v, ctx) => {
  if (v.date > todayKey()) {
    ctx.addIssue({ path: ['date'], code: 'custom', message: "You can't submit hours for a future date" })
  }
  if (v.entryMode === 'hours') {
    const h = Number(v.hours)
    if (!Number.isFinite(h) || h < MIN_SHIFT_HOURS || h > MAX_SHIFT_HOURS) {
      ctx.addIssue({ path: ['hours'], code: 'custom', message: `Enter between ${MIN_SHIFT_HOURS} and ${MAX_SHIFT_HOURS} hours` })
    }
  }
  if (v.entryMode === 'times') {
    if (!v.start) ctx.addIssue({ path: ['start'], code: 'custom', message: 'Enter your start time' })
    if (!v.end) ctx.addIssue({ path: ['end'], code: 'custom', message: 'Enter your finish time' })
  }
})

export default function MyShifts() {
  const { user: me } = useAuth()
  const { data: shifts = [], loading, refetch } = useAsync(() => ShiftAPI.list(), [])
  const { data: branches = [] } = useAsync(() => BranchAPI.list({ includeInactive: true }), [])

  const [editing, setEditing] = useState(null)  // null = closed, {} = new, shift = amending
  const [deleting, setDeleting] = useState(null)

  const canSubmit = can(me?.role, 'submitOwnShift')
  const canSeeOwnPay = can(me?.role, 'viewOwnWages')

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { date: todayKey(), entryMode: 'full_day', hours: '', start: '09:00', end: '17:30', breakMins: 30 },
  })
  const entryMode = watch('entryMode')

  // ShiftAPI.list() is already narrowed to this staff member by the data layer — there is no
  // client-side filter here to remove, because the filtering does not happen on the client.
  const mine = useMemo(() => [...shifts].sort((a, b) => b.at - a.at), [shifts])
  const pending = mine.filter((s) => s.status === 'pending')
  const rejected = mine.filter((s) => s.status === 'rejected')

  // Approved hours are the ones that pay. Pending hours are shown separately as an estimate
  // so it is obvious they are not yet earnings.
  const approvedTotals = useMemo(() => summariseShifts(mine, me), [mine, me])
  const pendingTotals = useMemo(() => summariseShifts(pending, me, { payableOnly: false }), [pending, me])

  const openNew = () => {
    reset({ date: todayKey(), entryMode: 'full_day', hours: '', start: '09:00', end: '17:30', breakMins: 30 })
    setEditing({})
  }
  const openEdit = (s) => {
    reset({
      date: s.date, entryMode: s.entryMode || 'times', hours: s.hours ?? '',
      start: s.start || '09:00', end: s.end || '17:30', breakMins: s.breakMins ?? 0,
    })
    setEditing(s)
  }

  const onSubmit = async (data) => {
    // Only send the fields the chosen entry mode actually uses, so a stale value from a mode
    // the staff member switched away from can never be scored as their hours.
    const payload = { date: data.date, entryMode: data.entryMode }
    if (data.entryMode === 'hours') payload.hours = Number(data.hours)
    if (data.entryMode === 'times') {
      payload.start = data.start
      payload.end = data.end
      payload.breakMins = Number(data.breakMins) || 0
    }

    try {
      if (editing?.id) {
        if (editing.status === 'rejected') {
          await ShiftAPI.resubmit(editing.id, payload)
          toast.success('Hours corrected and resubmitted for review')
        } else {
          await ShiftAPI.update(editing.id, payload)
          toast.success('Submitted hours updated')
        }
      } else {
        await ShiftAPI.create(payload)
        toast.success('Hours submitted — an admin will review them')
      }
      setEditing(null); refetch()
    } catch (e) { toast.error(e.message || 'Could not submit those hours') }
  }

  const remove = async () => {
    try {
      await ShiftAPI.remove(deleting.id)
      toast.success('Submission withdrawn')
      setDeleting(null); refetch()
    } catch (e) { toast.error(e.message); setDeleting(null) }
  }

  const branchName = (id) => branches.find((b) => b.id === id)?.area ?? id ?? '—'

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">My hours &amp; pay</h1>
          <p className="text-graphite-400 text-[14px]">
            Record the time you worked. An admin reviews each entry and confirms what it pays — only approved entries count toward your earnings.
          </p>
        </div>
        {canSubmit && <button onClick={openNew} className="btn btn-brand btn-sm shrink-0"><Plus size={15} /> Add hours</button>}
      </div>

      {rejected.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
          <Info size={15} className="mt-0.5 shrink-0" />
          <span>
            {rejected.length === 1 ? 'One submission was' : `${rejected.length} submissions were`} rejected. Open the entry to see the reason, correct it and resubmit.
          </span>
        </div>
      )}

      {canSeeOwnPay && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total earnings only. Pay rates are set by an admin and are not shown here —
              the amount for each shift is whatever the admin confirms at approval. */}
          <DashboardCard icon={PoundSterling} label="Approved earnings" value={moneyExact(approvedTotals.wage)} tone="green" />
          <DashboardCard icon={Clock} label="Approved hourly time" value={hoursFmt(approvedTotals.hours)} tone="brand" />
          <DashboardCard icon={CalendarDays} label={`Days worked · ${approvedTotals.fullDays} full ${approvedTotals.fullDays === 1 ? 'day' : 'days'}`} value={approvedTotals.days} tone="violet" />
          <DashboardCard icon={Hourglass} label={`Awaiting review · ${hoursFmt(pendingTotals.hours)} + ${pendingTotals.fullDays} full ${pendingTotals.fullDays === 1 ? 'day' : 'days'}`} value={pending.length} tone="amber" />
        </div>
      )}

      <div className="surface p-5 overflow-x-auto">
        <h2 className="font-bold text-[15px] mb-1">My submitted shifts</h2>
        <p className="text-[12px] text-graphite-400 mb-4">
          Pending entries can still be edited or withdrawn. Once approved, ask an admin to make any change.
        </p>

        {loading ? <div className="text-graphite-400 text-[13px] py-6">Loading your shifts…</div>
          : mine.length === 0 ? <EmptyState title="You haven't submitted any hours yet" />
          : (
            <Table>
              <thead><tr>
                <Th>Date</Th><Th>Branch</Th><Th>Recorded as</Th><Th>Time</Th><Th>Pay</Th><Th>Status</Th><Th>Reviewer note</Th><Th></Th>
              </tr></thead>
              <tbody>
                {mine.map((s) => {
                  const fullDay = isFullDay(s)
                  return (
                    <tr key={s.id} className="hover:bg-graphite-50">
                      <Td className="mono-data font-semibold">{fmtDate(s.at)}</Td>
                      <Td className="text-graphite-500">{branchName(s.branchId)}</Td>
                      <Td className="text-[12.5px]">
                        {fullDay ? 'Full day'
                          : s.entryMode === 'hours' ? `${s.hours}h entered`
                          : `${s.start}–${s.end}${s.breakMins ? ` · ${s.breakMins}m break` : ''}`}
                      </Td>
                      {/* A full day is a day, not an hours figure — showing an hour count here
                          would reintroduce the very conversion this mode exists to avoid. */}
                      <Td className="mono-data">{fullDay ? '1 day' : hoursFmt(shiftHours(s))}</Td>
                      {/* An amount appears only once an admin has approved and set it. */}
                      <Td className="mono-data">
                        {s.status === 'approved' && s.approvedPay != null
                          ? <span className="font-bold">{moneyExact(s.approvedPay)}</span>
                          : <span className="text-graphite-400">{s.status === 'rejected' ? '—' : 'Awaiting admin'}</span>}
                      </Td>
                      <Td><ShiftStatusBadge status={s.status} /></Td>
                      <Td className="text-[12px] text-graphite-500 max-w-[220px]">{s.reviewNote || '—'}</Td>
                      <Td>
                        {(s.status === 'pending' || s.status === 'rejected') && (
                          <div className="flex items-center gap-2.5">
                            <button onClick={() => openEdit(s)} className="text-[12px] font-semibold text-brand hover:underline inline-flex items-center gap-1">
                              {s.status === 'rejected' ? <><RotateCcw size={13} /> Fix &amp; resubmit</> : <><Pencil size={13} /> Edit</>}
                            </button>
                            {s.status === 'pending' && (
                              <button onClick={() => setDeleting(s)} className="text-[12px] font-semibold text-rose-600 hover:underline inline-flex items-center gap-1">
                                <Trash2 size={13} /> Withdraw
                              </button>
                            )}
                          </div>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
      </div>

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing.id ? (editing.status === 'rejected' ? 'Correct and resubmit' : 'Edit submitted hours') : 'Add the hours you worked'}</DialogTitle>
            </DialogHeader>

            {editing.status === 'rejected' && editing.reviewNote && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] rounded-xl px-3.5 py-2.5 mb-1">
                <span className="font-semibold">Rejected:</span> {editing.reviewNote}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="shift-date" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Date worked</label>
                <input id="shift-date" type="date" max={todayKey()} {...register('date')} className="input-field" />
                {errors.date && <p className="text-[11.5px] text-rose-600 mt-1">{errors.date.message}</p>}
              </div>

              <div>
                <span className="block text-[12px] font-semibold text-graphite-500 mb-1.5">How do you want to record it?</span>
                <div className="grid grid-cols-3 gap-2">
                  {ENTRY_MODES.map((m) => (
                    <label
                      key={m}
                      className={`cursor-pointer text-center text-[12.5px] font-semibold rounded-xl border px-2 py-2.5 transition-colors ${entryMode === m ? 'border-brand bg-brand-50 text-brand' : 'border-graphite-200 text-graphite-500 hover:border-brand/40'}`}
                    >
                      <input type="radio" value={m} {...register('entryMode')} className="sr-only" />
                      {ENTRY_MODE_LABELS[m]}
                    </label>
                  ))}
                </div>
              </div>

              {entryMode === 'full_day' && (
                <p className="text-[12.5px] text-graphite-500 bg-graphite-50 rounded-xl px-3.5 py-2.5">
                  Record the whole day — no hours needed. Your admin confirms what it pays when they approve it.
                </p>
              )}

              {entryMode === 'hours' && (
                <div>
                  <label htmlFor="shift-hours" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Hours worked</label>
                  <input id="shift-hours" type="number" step="0.25" min={MIN_SHIFT_HOURS} max={MAX_SHIFT_HOURS} placeholder="e.g. 10" {...register('hours')} className="input-field" />
                  {errors.hours && <p className="text-[11.5px] text-rose-600 mt-1">{errors.hours.message}</p>}
                </div>
              )}

              {entryMode === 'times' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="shift-start" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Start</label>
                    <input id="shift-start" type="time" {...register('start')} className="input-field" />
                    {errors.start && <p className="text-[11.5px] text-rose-600 mt-1">{errors.start.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="shift-end" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Finish</label>
                    <input id="shift-end" type="time" {...register('end')} className="input-field" />
                    {errors.end && <p className="text-[11.5px] text-rose-600 mt-1">{errors.end.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="shift-break" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Break (min)</label>
                    <input id="shift-break" type="number" min="0" step="5" {...register('breakMins')} className="input-field" />
                  </div>
                </div>
              )}

              <p className="text-[11.5px] text-graphite-400">
                Your admin reviews this and sets the amount it pays. Nothing counts toward your earnings until they approve it.
              </p>

              <DialogFooter>
                <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-brand btn-sm">
                  {editing.id ? (editing.status === 'rejected' ? 'Resubmit' : 'Save changes') : 'Submit hours'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleting && (
        <ConfirmDialog
          open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}
          title={`Withdraw the hours for ${fmtDate(deleting.at)}?`}
          description="The submission will be removed from the admin's review queue. You can add it again later."
          confirmLabel="Withdraw" destructive onConfirm={remove}
        />
      )}
    </div>
  )
}
