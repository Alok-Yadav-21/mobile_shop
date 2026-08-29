import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ShiftAPI, UserAPI, BranchAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { rangeForLastPeriods } from '@/lib/reporting.js'
import { wagesByStaff, wagesByBranch, wagesByPeriod, totalWages, summariseShifts, shiftHours, rateFor } from '@/lib/wages.js'
import { PERIODS, PERIOD_LABELS } from '@/constants/finance.js'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { money0, moneyExact, hoursFmt, fmtDate } from '@/utils/format.js'
import { Search, PoundSterling, Clock, CalendarDays, Users, Eye, Hourglass } from 'lucide-react'

const LOOKBACK = { day: 14, week: 12, month: 6 }

export default function Wages() {
  const { user: me } = useAuth()
  const { data: shifts = [], loading } = useAsync(() => ShiftAPI.list(), [])
  const { data: users = [] } = useAsync(() => UserAPI.list(), [])
  // Inactive and archived branches are included deliberately: a branch that has closed
  // still traded during the window, and dropping it would make the per-branch rows stop
  // adding up to the headline total.
  const { data: branches = [] } = useAsync(() => BranchAPI.list({ includeInactive: true, includeArchived: true }), [])

  const [period, setPeriod] = useState('month')
  const [branchId, setBranchId] = useState('')
  const [q, setQ] = useState('')
  const [viewing, setViewing] = useState(null)

  const canView = can(me?.role, 'viewFinancialReports')

  const range = useMemo(() => rangeForLastPeriods(period, LOOKBACK[period]), [period])

  const staff = useMemo(
    () => users.filter((u) => u.role === 'staff' && !u.archived && (!branchId || u.branch === branchId)),
    [users, branchId],
  )
  const staffById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  // Shifts are scoped by where they were *worked*, so a cover shift at another branch is
  // costed to the branch that got the labour rather than the staff member's home branch.
  const scopedShifts = useMemo(() => shifts.filter((s) =>
    s.at >= range.from && s.at <= range.to && (!branchId || s.branchId === branchId)
  ), [shifts, range, branchId])

  const totals = useMemo(() => totalWages(scopedShifts, staffById), [scopedShifts, staffById])

  // Submitted-but-unreviewed hours are deliberately NOT in any figure on this page — they
  // become payroll only once approved. Surfacing the backlog here keeps the two screens
  // connected, so a wage total is never read as final while submissions are still queued.
  const pendingInScope = useMemo(() => scopedShifts.filter((s) => s.status === 'pending'), [scopedShifts])

  const staffRows = useMemo(() => {
    const rows = wagesByStaff(scopedShifts, staff)
    const needle = q.trim().toLowerCase()
    return rows
      .filter((r) => !needle || r.staff.name.toLowerCase().includes(needle) || (r.staff.email || '').toLowerCase().includes(needle))
      .sort((a, b) => b.wage - a.wage)
  }, [scopedShifts, staff, q])

  const branchRows = useMemo(
    () => wagesByBranch(scopedShifts, staffById).sort((a, b) => b.wage - a.wage),
    [scopedShifts, staffById],
  )

  const periodRows = useMemo(
    () => wagesByPeriod(scopedShifts, staffById, period).reverse(),
    [scopedShifts, staffById, period],
  )

  // Per-period breakdown for the staff member being inspected.
  const viewingRows = useMemo(() => {
    if (!viewing) return []
    const mine = scopedShifts.filter((s) => s.staffId === viewing.id)
    return wagesByPeriod(mine, staffById, period).reverse()
  }, [viewing, scopedShifts, staffById, period])

  const viewingShifts = useMemo(() => {
    if (!viewing) return []
    return scopedShifts.filter((s) => s.staffId === viewing.id).sort((a, b) => b.at - a.at)
  }, [viewing, scopedShifts])

  const avgRate = totals.hours ? totals.wage / totals.hours : 0

  if (!canView) {
    return <div className="surface p-2"><EmptyState title="You don't have access to payroll" /></div>
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Staff wages</h1>
      <p className="text-graphite-400 text-[14px] mb-6">
        Approved hours only. Editing a shift's recorded time changes every total below, because wages are derived from the rota rather than stored.
      </p>

      {pendingInScope.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[12.5px] rounded-xl px-4 py-3 mb-5 flex items-center gap-2 flex-wrap">
          <Hourglass size={15} className="shrink-0" />
          <span>
            {pendingInScope.length} submitted {pendingInScope.length === 1 ? 'shift is' : 'shifts are'} still awaiting review and {pendingInScope.length === 1 ? 'is' : 'are'} not included below.
          </span>
          <Link to="/admin/timesheets" className="font-bold underline underline-offset-2">Review timesheets</Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="inline-flex rounded-xl border border-graphite-200 bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${period === p ? 'bg-brand text-white' : 'text-graphite-500 hover:text-ink'}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input-field w-auto">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.area}</option>)}
        </select>

        <div className="flex items-center gap-2 input-field w-auto max-w-xs">
          <Search size={14} className="text-graphite-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff…" className="bg-transparent outline-none flex-1" />
        </div>

        <span className="text-[12.5px] text-graphite-400 mono-data">{fmtDate(range.from)} — {fmtDate(range.to)}</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={PoundSterling} label="Total wage bill" value={money0(totals.wage)} tone="brand" />
        <DashboardCard icon={Clock} label={`Hours worked · avg ${moneyExact(avgRate)}/h`} value={hoursFmt(totals.hours)} tone="violet" />
        <DashboardCard icon={CalendarDays} label={`Days covered · ${totals.shifts} shifts`} value={totals.days} tone="amber" />
        <DashboardCard icon={Users} label="Staff on the rota" value={totals.staffCount} tone="green" />
      </div>

      <div className="surface p-5 mt-4 overflow-x-auto">
        <h2 className="font-bold text-[15px] mb-1">Wages by staff member</h2>
        <p className="text-[12px] text-graphite-400 mb-4">
          Days worked counts distinct calendar days, so two shifts in one day still counts once. Staff with no shifts in this window show zero rather than disappearing from payroll.
        </p>
        {loading ? <div className="text-graphite-400 text-[13px] py-6">Loading rota…</div> : staffRows.length === 0 ? <EmptyState title="No staff match those filters" /> : (
          <Table>
            <thead><tr>
              <Th>Staff</Th><Th>Branch</Th><Th>Rate</Th><Th>Days</Th><Th>Shifts</Th><Th>Hours</Th><Th>Avg / day</Th><Th>Wages</Th><Th></Th>
            </tr></thead>
            <tbody>
              {staffRows.map((r) => (
                <tr key={r.staff.id} className="hover:bg-graphite-50">
                  <Td>
                    <div className="font-semibold">{r.staff.name}</div>
                    <div className="text-[11.5px] text-graphite-400">{r.staff.jobTitle || 'Staff'}</div>
                  </Td>
                  <Td className="text-graphite-500">{branches.find((b) => b.id === r.staff.branch)?.area ?? '—'}</Td>
                  <Td className="mono-data">{moneyExact(r.rate)}/h</Td>
                  <Td className="mono-data">{r.days}</Td>
                  <Td className="mono-data">{r.shifts}</Td>
                  <Td className="mono-data">{hoursFmt(r.hours)}</Td>
                  <Td className="mono-data text-graphite-500">{hoursFmt(r.avgHoursPerDay)}</Td>
                  <Td className="mono-data font-bold">{moneyExact(r.wage)}</Td>
                  <Td>
                    <button onClick={() => setViewing(r.staff)} className="text-[12px] font-semibold text-brand hover:underline inline-flex items-center gap-1">
                      <Eye size={13} /> Breakdown
                    </button>
                  </Td>
                </tr>
              ))}
              <tr className="bg-graphite-50 font-bold">
                <Td>Total</Td><Td /><Td />
                <Td className="mono-data">{totals.days}</Td>
                <Td className="mono-data">{totals.shifts}</Td>
                <Td className="mono-data">{hoursFmt(totals.hours)}</Td>
                <Td />
                <Td className="mono-data">{moneyExact(totals.wage)}</Td>
                <Td />
              </tr>
            </tbody>
          </Table>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="surface p-5 overflow-x-auto">
          <h2 className="font-bold text-[15px] mb-4">{PERIOD_LABELS[period]} wage run</h2>
          {periodRows.length === 0 ? <EmptyState title="No shifts in this window" /> : (
            <Table>
              <thead><tr><Th>{period === 'month' ? 'Month' : period === 'week' ? 'Week' : 'Day'}</Th><Th>Staff</Th><Th>Hours</Th><Th>Wages</Th></tr></thead>
              <tbody>
                {periodRows.map((r) => (
                  <tr key={r.key} className="hover:bg-graphite-50">
                    <Td className="font-semibold">{r.label}</Td>
                    <Td className="mono-data">{r.staffCount}</Td>
                    <Td className="mono-data">{hoursFmt(r.hours)}</Td>
                    <Td className="mono-data font-bold">{moneyExact(r.wage)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <div className="surface p-5 overflow-x-auto">
          <h2 className="font-bold text-[15px] mb-1">Payroll cost by branch</h2>
          <p className="text-[12px] text-graphite-400 mb-4">Costed to the branch the shift was worked at.</p>
          {branchRows.length === 0 ? <EmptyState title="No shifts in this window" /> : (
            <Table>
              <thead><tr><Th>Branch</Th><Th>Staff</Th><Th>Shifts</Th><Th>Hours</Th><Th>Wages</Th></tr></thead>
              <tbody>
                {branchRows.map((r) => (
                  <tr key={r.branchId} className="hover:bg-graphite-50">
                    <Td className="font-semibold">{branches.find((b) => b.id === r.branchId)?.area ?? r.branchId}</Td>
                    <Td className="mono-data">{r.staffCount}</Td>
                    <Td className="mono-data">{r.shifts}</Td>
                    <Td className="mono-data">{hoursFmt(r.hours)}</Td>
                    <Td className="mono-data font-bold">{moneyExact(r.wage)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>

      {viewing && (
        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewing.name} — pay breakdown</DialogTitle>
            </DialogHeader>

            {(() => {
              const mine = scopedShifts.filter((s) => s.staffId === viewing.id)
              const sum = summariseShifts(mine, viewing)
              return (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[['Rate', `${moneyExact(sum.rate)}/h`], ['Days', sum.days], ['Hours', hoursFmt(sum.hours)], ['Wages', moneyExact(sum.wage)]].map(([k, v]) => (
                    <div key={k} className="bg-graphite-50 rounded-xl px-3 py-2.5">
                      <div className="text-[10.5px] uppercase tracking-wide text-graphite-400 font-bold">{k}</div>
                      <div className="font-extrabold mono-data text-[15px]">{v}</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            <div className="max-h-[45vh] overflow-y-auto space-y-4">
              <div>
                <h3 className="font-bold text-[13px] mb-2">{PERIOD_LABELS[period]} totals</h3>
                <Table>
                  <thead><tr><Th>Period</Th><Th>Days</Th><Th>Hours</Th><Th>Wages</Th></tr></thead>
                  <tbody>
                    {viewingRows.map((r) => (
                      <tr key={r.key}>
                        <Td className="font-semibold">{r.label}</Td>
                        <Td className="mono-data">{r.days}</Td>
                        <Td className="mono-data">{hoursFmt(r.hours)}</Td>
                        <Td className="mono-data font-bold">{moneyExact(r.wage)}</Td>
                      </tr>
                    ))}
                    {viewingRows.length === 0 && <tr><Td colSpan={4} className="text-center text-graphite-400 py-6">No shifts in this window.</Td></tr>}
                  </tbody>
                </Table>
              </div>

              <div>
                <h3 className="font-bold text-[13px] mb-2">Individual shifts</h3>
                <Table>
                  <thead><tr><Th>Date</Th><Th>Branch</Th><Th>Start</Th><Th>End</Th><Th>Break</Th><Th>Hours</Th><Th>Pay</Th></tr></thead>
                  <tbody>
                    {viewingShifts.slice(0, 60).map((s) => (
                      <tr key={s.id}>
                        <Td className="mono-data">{fmtDate(s.at)}</Td>
                        <Td className="text-graphite-500">{branches.find((b) => b.id === s.branchId)?.area.split('—')[0].trim() ?? s.branchId}</Td>
                        <Td className="mono-data">{s.start}</Td>
                        <Td className="mono-data">{s.end}</Td>
                        <Td className="mono-data text-graphite-500">{s.breakMins}m</Td>
                        <Td className="mono-data">{hoursFmt(shiftHours(s))}</Td>
                        <Td className="mono-data font-bold">{moneyExact(shiftHours(s) * rateFor(viewing))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <button onClick={() => setViewing(null)} className="btn btn-ghost">Close</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
