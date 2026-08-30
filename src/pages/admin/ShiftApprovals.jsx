import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ShiftAPI, UserAPI, BranchAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { shiftHours, shiftWage, suggestedPay, isFullDay, rateFor, round2 } from '@/lib/wages.js'
import {
  SHIFT_STATUSES, SHIFT_STATUS_LABELS, ENTRY_MODES, ENTRY_MODE_LABELS,
  MIN_SHIFT_HOURS, MAX_SHIFT_HOURS,
} from '@/constants/shifts.js'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { TableSkeleton } from '@/components/common/TableSkeleton.jsx'
import { ShiftStatusBadge } from '@/components/common/ShiftStatusBadge.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { moneyExact, hoursFmt, fmtDate, timeAgo } from '@/utils/format.js'
import { Hourglass, CheckCircle2, XCircle, PoundSterling, Check, X, Pencil, Search } from 'lucide-react'

const schema = z.object({
  entryMode: z.enum(ENTRY_MODES),
  hours: z.union([z.coerce.number(), z.literal('')]).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  breakMins: z.union([z.coerce.number(), z.literal('')]).optional(),
}).superRefine((v, ctx) => {
  if (v.entryMode === 'hours') {
    const h = Number(v.hours)
    if (!Number.isFinite(h) || h < MIN_SHIFT_HOURS || h > MAX_SHIFT_HOURS) {
      ctx.addIssue({ path: ['hours'], code: 'custom', message: `Enter between ${MIN_SHIFT_HOURS} and ${MAX_SHIFT_HOURS} hours` })
    }
  }
  if (v.entryMode === 'times') {
    if (!v.start) ctx.addIssue({ path: ['start'], code: 'custom', message: 'Enter a start time' })
    if (!v.end) ctx.addIssue({ path: ['end'], code: 'custom', message: 'Enter a finish time' })
  }
})

export default function ShiftApprovals() {
  const { user: me } = useAuth()
  const { data: shifts = [], loading, refetch } = useAsync(() => ShiftAPI.list(), [])
  const { data: users = [] } = useAsync(() => UserAPI.list(), [])
  const { data: branches = [] } = useAsync(() => BranchAPI.list({ includeInactive: true, includeArchived: true }), [])

  const [statusFilter, setStatusFilter] = useState('pending')
  const [branchFilter, setBranchFilter] = useState('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  // Approving is where the money is decided, so it opens a dialog rather than firing straight
  // away: {shift, amount}. The amount is prefilled from the staff member's standing rates as
  // a starting point the admin can change before confirming.
  const [approving, setApproving] = useState(null)

  const canReview = can(me?.role, 'reviewShifts')

  const staffById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const branchName = (id) => branches.find((b) => b.id === id)?.area ?? id ?? '—'

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  const entryMode = watch('entryMode')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return shifts
      .filter((s) => {
        if (statusFilter && s.status !== statusFilter) return false
        if (branchFilter && s.branchId !== branchFilter) return false
        if (needle && !(staffById[s.staffId]?.name || '').toLowerCase().includes(needle)) return false
        return true
      })
      // Oldest submission first in the pending queue: the person waiting longest is reviewed
      // first, rather than their entry sinking to the bottom of the list.
      .sort((a, b) => (statusFilter === 'pending' ? a.at - b.at : b.at - a.at))
  }, [shifts, statusFilter, branchFilter, q, staffById])

  const pendingAll = shifts.filter((s) => s.status === 'pending')
  // Only hourly submissions can be valued ahead of review; a full day has no price until an
  // admin sets one, so those are counted rather than guessed at.
  const pendingValue = round2(pendingAll.reduce((sum, s) => sum + (suggestedPay(s, staffById[s.staffId]) ?? 0), 0))
  const pendingFullDays = pendingAll.filter(isFullDay).length

  // The last full day this person was actually paid for, offered as a reference point when
  // pricing the next one. Shown, never prefilled: it informs the decision without becoming a
  // default that quietly hardens into a fixed rate.
  const lastFullDayPay = (staffId) => {
    const prior = shifts
      .filter((s) => s.staffId === staffId && isFullDay(s) && s.status === 'approved' && s.approvedPay != null)
      .sort((a, b) => b.at - a.at)[0]
    return prior ? prior.approvedPay : null
  }
  const pendingHours = round2(pendingAll.reduce((sum, s) => sum + shiftHours(s), 0))

  const decide = async (shift, decision, note, pay) => {
    try {
      await ShiftAPI.review(shift.id, decision, note, pay)
      logAction({
        user: me, action: `shift.${decision}`, entityType: 'shift', entityId: shift.id,
        reason: note ?? undefined, after: { status: decision, approvedPay: pay ?? null },
      })
      toast.success(
        decision === 'approved'
          ? `Approved — ${moneyExact(pay)} added to ${staffById[shift.staffId]?.name ?? 'staff'} earnings`
          : `${staffById[shift.staffId]?.name ?? 'Hours'} rejected`,
      )
      setRejecting(null); setApproving(null); refetch()
    } catch (e) { toast.error(e.message || 'Could not record that decision') }
  }

  const openEdit = (s) => {
    reset({
      entryMode: s.entryMode || 'times', hours: s.hours ?? '',
      start: s.start || '09:00', end: s.end || '17:30', breakMins: s.breakMins ?? 0,
    })
    setEditing(s)
  }

  // Editing here corrects what was submitted. Because wages are derived from these records
  // rather than stored, the corrected figure flows straight into every wage total.
  const saveEdit = async (data) => {
    const payload = { entryMode: data.entryMode }
    if (data.entryMode === 'hours') payload.hours = Number(data.hours)
    if (data.entryMode === 'times') {
      payload.start = data.start; payload.end = data.end; payload.breakMins = Number(data.breakMins) || 0
    }
    try {
      const before = { entryMode: editing.entryMode, hours: editing.hours, start: editing.start, end: editing.end }
      await ShiftAPI.update(editing.id, payload)
      logAction({ user: me, action: 'shift.edit', entityType: 'shift', entityId: editing.id, before, after: payload })
      toast.success('Hours corrected')
      setEditing(null); refetch()
    } catch (e) { toast.error(e.message || 'Could not save that change') }
  }

  if (!canReview) {
    return <div className="surface p-2"><EmptyState title="You don't have access to timesheet approvals" /></div>
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Timesheet approvals</h1>
      <p className="text-graphite-400 text-[14px] mb-6">
        Staff-submitted hours. Nothing here counts toward wages until you approve it — see{' '}
        <Link to="/admin/wages" className="text-brand font-semibold hover:underline">Wages</Link> for the approved payroll.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard icon={Hourglass} label="Awaiting review" value={pendingAll.length} tone={pendingAll.length ? 'amber' : 'green'} />
        <DashboardCard icon={PoundSterling} label={`Hourly value at rates · ${pendingFullDays} full ${pendingFullDays === 1 ? 'day' : 'days'} unpriced`} value={moneyExact(pendingValue)} tone="violet" />
        <DashboardCard icon={CheckCircle2} label="Approved" value={shifts.filter((s) => s.status === 'approved').length} tone="green" />
        <DashboardCard icon={XCircle} label="Rejected" value={shifts.filter((s) => s.status === 'rejected').length} tone="brand" />
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">All statuses</option>
          {SHIFT_STATUSES.map((s) => <option key={s} value={s}>{SHIFT_STATUS_LABELS[s]}</option>)}
        </select>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="input-field w-auto">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.area}</option>)}
        </select>
        <div className="flex items-center gap-2 input-field w-auto max-w-xs">
          <Search size={14} className="text-graphite-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff…" className="bg-transparent outline-none flex-1" />
        </div>
        <span className="text-[12.5px] text-graphite-400 mono-data">
          {rows.length} {statusFilter ? SHIFT_STATUS_LABELS[statusFilter].toLowerCase() : 'total'}
          {pendingHours > 0 && statusFilter === 'pending' ? ` · ${hoursFmt(pendingHours)}` : ''}
        </span>
      </div>

      <div className="surface p-5 overflow-x-auto">
        {loading ? <TableSkeleton rows={6} cols={8}/>
          : rows.length === 0 ? <EmptyState title={statusFilter === 'pending' ? 'Nothing waiting for review' : 'No submissions match those filters'} />
          : (
            <Table>
              <thead><tr>
                <Th>Staff</Th><Th>Date worked</Th><Th>Branch</Th><Th>Recorded as</Th><Th>Time</Th><Th>Rate</Th><Th>Pay</Th><Th>Submitted</Th><Th>Status</Th><Th></Th>
              </tr></thead>
              <tbody>
                {rows.map((s) => {
                  const staff = staffById[s.staffId]
                  const fullDay = isFullDay(s)
                  return (
                    <tr key={s.id} className="hover:bg-graphite-50">
                      <Td>
                        <div className="font-semibold">{staff?.name ?? 'Unknown'}</div>
                        <div className="text-[11.5px] text-graphite-400">{staff?.jobTitle || 'Staff'}</div>
                      </Td>
                      <Td className="mono-data">{fmtDate(s.at)}</Td>
                      <Td className="text-graphite-500">{branchName(s.branchId)}</Td>
                      <Td className="text-[12.5px]">
                        {fullDay ? 'Full day'
                          : s.entryMode === 'hours' ? `${s.hours}h entered`
                          : `${s.start}–${s.end}${s.breakMins ? ` · ${s.breakMins}m break` : ''}`}
                      </Td>
                      <Td className="mono-data font-bold">{fullDay ? '1 day' : hoursFmt(shiftHours(s))}</Td>
                      {/* Which rate applies follows from how the shift was recorded. */}
                      {/* A full day has no standing rate — its price is set at approval. */}
                      <Td className="mono-data text-graphite-500">
                        {fullDay ? <span className="text-graphite-400">Set on approval</span> : `${moneyExact(rateFor(staff))}/h`}
                      </Td>
                      <Td className="mono-data font-bold">
                        {s.status === 'approved' && s.approvedPay != null
                          ? moneyExact(s.approvedPay)
                          : suggestedPay(s, staff) == null
                            ? <span className="font-normal text-graphite-400">&mdash;</span>
                            : <span className="font-normal text-graphite-400">{moneyExact(suggestedPay(s, staff))}</span>}
                      </Td>
                      <Td className="text-[12px] text-graphite-400">{timeAgo(s.submittedAt)}</Td>
                      <Td>
                        <ShiftStatusBadge status={s.status} />
                        {s.reviewNote && <div className="text-[11px] text-graphite-400 mt-1 max-w-[180px]">{s.reviewNote}</div>}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                          <button onClick={() => openEdit(s)} className="text-[12px] font-semibold text-graphite-500 hover:text-brand hover:underline inline-flex items-center gap-1">
                            <Pencil size={13} /> Edit
                          </button>
                          {s.status !== 'approved' && (
                            <button onClick={() => setApproving({ shift: s, amount: suggestedPay(s, staff) == null ? '' : String(suggestedPay(s, staff)), lastPaid: lastFullDayPay(s.staffId) })} className="text-[12px] font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
                              <Check size={13} /> Approve
                            </button>
                          )}
                          {s.status !== 'rejected' && (
                            <button onClick={() => setRejecting(s)} className="text-[12px] font-semibold text-rose-600 hover:underline inline-flex items-center gap-1">
                              <X size={13} /> Reject
                            </button>
                          )}
                        </div>
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
              <DialogTitle>Correct hours — {staffById[editing.staffId]?.name}, {fmtDate(editing.at)}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(saveEdit)} className="space-y-4">
              <div>
                <span className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Recorded as</span>
                <div className="grid grid-cols-3 gap-2">
                  {ENTRY_MODES.map((m) => (
                    <label key={m} className={`cursor-pointer text-center text-[12.5px] font-semibold rounded-xl border px-2 py-2.5 transition-colors ${entryMode === m ? 'border-brand bg-brand-50 text-brand' : 'border-graphite-200 text-graphite-500 hover:border-brand/40'}`}>
                      <input type="radio" value={m} {...register('entryMode')} className="sr-only" />
                      {ENTRY_MODE_LABELS[m]}
                    </label>
                  ))}
                </div>
              </div>

              {entryMode === 'full_day' && (
                <p className="text-[12.5px] text-graphite-500 bg-graphite-50 rounded-xl px-3.5 py-2.5">
                  Recorded as a whole day. You set what it pays when you approve it — there is no fixed day rate.
                </p>
              )}

              {entryMode === 'hours' && (
                <div>
                  <label htmlFor="edit-hours" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Hours worked</label>
                  <input id="edit-hours" type="number" step="0.25" min={MIN_SHIFT_HOURS} max={MAX_SHIFT_HOURS} {...register('hours')} className="input-field" />
                  {errors.hours && <p className="text-[11.5px] text-rose-600 mt-1">{errors.hours.message}</p>}
                </div>
              )}

              {entryMode === 'times' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="edit-start" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Start</label>
                    <input id="edit-start" type="time" {...register('start')} className="input-field" />
                    {errors.start && <p className="text-[11.5px] text-rose-600 mt-1">{errors.start.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="edit-end" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Finish</label>
                    <input id="edit-end" type="time" {...register('end')} className="input-field" />
                    {errors.end && <p className="text-[11.5px] text-rose-600 mt-1">{errors.end.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="edit-break" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">Break (min)</label>
                    <input id="edit-break" type="number" min="0" step="5" {...register('breakMins')} className="input-field" />
                  </div>
                </div>
              )}

              <p className="text-[11.5px] text-graphite-400">
                Wages are recalculated from this record, so a correction here updates the staff member's pay immediately.
              </p>

              <DialogFooter>
                <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-brand btn-sm">Save correction</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {approving && (
        <Dialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve {staffById[approving.shift.staffId]?.name}&rsquo;s {fmtDate(approving.shift.at)}</DialogTitle>
            </DialogHeader>

            <div className="bg-graphite-50 rounded-xl px-4 py-3 text-[12.5px] space-y-1.5 mb-1">
              <div className="flex justify-between"><span className="text-graphite-400">Recorded as</span>
                <span className="font-semibold">
                  {isFullDay(approving.shift) ? 'Full day'
                    : approving.shift.entryMode === 'hours' ? `${approving.shift.hours}h entered`
                    : `${approving.shift.start}–${approving.shift.end}${approving.shift.breakMins ? ` · ${approving.shift.breakMins}m break` : ''}`}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-graphite-400">Time</span>
                <span className="font-semibold mono-data">{isFullDay(approving.shift) ? '1 day' : hoursFmt(shiftHours(approving.shift))}</span>
              </div>
              {/* Only hourly work has a standing rate. A full day is priced from scratch each
                  time, so showing a "rate" for it would misrepresent how it is paid. */}
              {!isFullDay(approving.shift) && (
                <div className="flex justify-between"><span className="text-graphite-400">Standing rate</span>
                  <span className="font-semibold mono-data">{moneyExact(rateFor(staffById[approving.shift.staffId]))}/h</span>
                </div>
              )}
              {approving.lastPaid != null && (
                <div className="flex justify-between"><span className="text-graphite-400">Last full day approved</span>
                  <span className="font-semibold mono-data">{moneyExact(approving.lastPaid)}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="approve-amount" className="block text-[12px] font-semibold text-graphite-500 mb-1.5">
                Amount to pay for this shift
              </label>
              <input
                id="approve-amount" type="number" step="0.01" min="0" autoFocus
                value={approving.amount}
                onChange={(e) => setApproving((a) => ({ ...a, amount: e.target.value }))}
                className="input-field"
              />
              <p className="text-[11.5px] text-graphite-400 mt-1.5">
                {isFullDay(approving.shift)
                  ? 'A full day has no fixed price — decide what this one is worth for this person. This exact amount is what enters their earnings.'
                  : 'Prefilled from the standing hourly rate — change it if this shift is worth more or less. This exact amount is what enters their earnings.'}
              </p>
            </div>

            <DialogFooter>
              <button type="button" onClick={() => setApproving(null)} className="btn btn-ghost btn-sm">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const amount = Number(approving.amount)
                  if (!Number.isFinite(amount) || amount < 0) { toast.error('Enter a valid amount to pay.'); return }
                  decide(approving.shift, 'approved', null, round2(amount))
                }}
                className="btn btn-brand btn-sm"
              >
                Confirm &amp; approve
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {rejecting && (
        <ReasonDialog
          open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}
          title={`Reject ${staffById[rejecting.staffId]?.name}'s hours for ${fmtDate(rejecting.at)}?`}
          description="The staff member sees this reason and can correct and resubmit. Rejected hours are never paid."
          confirmLabel="Reject hours"
          onConfirm={(reason) => decide(rejecting, 'rejected', reason)}
        />
      )}
    </div>
  )
}
