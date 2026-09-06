import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI, TradeInAPI } from '@/services/api.js'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { TRADE_IN_LABELS, TRADE_IN_STYLES, tradeInCanTransition } from '@/constants/status.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { money, fmtDateTime } from '@/utils/format.js'
import { ClipboardList, ArrowLeftRight } from 'lucide-react'

export default function CustomerRequests(){
  const { user } = useAuth()
  const { data:repairs=[], refetch:refetchRepairs } = useAsync(()=>user?.branch?RepairAPI.forBranch(user.branch):RepairAPI.list(),[user])
  const { data:tradeIns=[], refetch:refetchTradeIns } = useAsync(()=>TradeInAPI.list(),[])
  const canInspect = can(user?.role,'inspectTradeIn')

  const newBookings = repairs.filter(r=>r.status==='Booking received')
  const branchTradeIns = tradeIns.filter(t=>!user?.branch || t.branchId===user.branch || t.branch===user.branch)

  const accept = async (ref)=>{
    try{
      await RepairAPI.update(ref,{ status:'Device received' })
      logAction({ user, action:'repair.status_change', entityType:'repair', entityId:ref, after:{status:'Device received'} })
      toast.success(`${ref} moved to Device received`)
      refetchRepairs()
    } catch(e){ toast.error(e.message||'Could not book that device in') }
  }

  const advanceTradeIn = async (t, status)=>{
    await TradeInAPI.update(t.reference, { status, inspectedBy:user?.id })
    logAction({ user, action:'trade_in.status_change', entityType:'trade_in', entityId:t.reference, after:{status} })
    toast.success(`${t.reference} → ${TRADE_IN_LABELS[status]}`)
    refetchTradeIns()
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Customer requests</h1>
      <p className="text-graphite-400 text-[14px] mb-6">New booking enquiries and buy/sell requests waiting for action.</p>

      <div className="flex items-center gap-2 mb-3"><ClipboardList size={16} className="text-brand"/><h2 className="font-bold text-[15px]">New booking requests</h2></div>
      {newBookings.length===0 ? (
        <div className="surface p-2 mb-8"><EmptyState title="No new requests" hint="New bookings will appear here first."/></div>
      ) : (
        <div className="surface divide-y divide-graphite-200 mb-8">
          {newBookings.map(r=>(
            <div key={r.ref} className="flex items-center justify-between px-5 py-3.5">
              <div><Link to={`/staff/repairs/${r.ref}`} className="font-bold text-[13.5px] mono-data text-brand">{r.ref}</Link><div className="text-[12.5px] text-graphite-400">{r.brand} {r.model} · {r.customer} · {fmtDateTime(r.createdAt)}</div></div>
              <div className="flex items-center gap-3">
                <StatusBadge status={r.status}/>
                {/* Booking a device in is a status change like any other, so it belongs to
                    whoever holds the job. A booking nobody holds is waiting on an admin. */}
                {r.tech===user?.id
                  ? <button onClick={()=>accept(r.ref)} className="btn btn-brand btn-sm">Mark received</button>
                  : <span className="text-[11.5px] text-graphite-400">{r.tech ? `Assigned to ${r.techName}` : 'Waiting to be assigned'}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3"><ArrowLeftRight size={16} className="text-violet"/><h2 className="font-bold text-[15px]">Trade-in requests</h2></div>
      {branchTradeIns.length===0 ? (
        <div className="surface p-2"><EmptyState title="No trade-in requests" hint="Submitted valuations will appear here."/></div>
      ) : (
        <div className="surface divide-y divide-graphite-200">
          {branchTradeIns.map(t=>{
            const status = t.status||'submitted'
            const canStartInspection = tradeInCanTransition(status,'valuation_review')
            const canSendOffer = tradeInCanTransition(status,'offer_sent')
            return (
              <div key={t.reference} className="flex items-center justify-between px-5 py-3.5 flex-wrap gap-2">
                <div><div className="font-bold text-[13.5px] mono-data">{t.reference}</div><div className="text-[12.5px] text-graphite-400">{t.brand} {t.model} · {t.conditionGrade||t.condition_grade}</div></div>
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-[13px] mono-data">{money(t.indicativeValue||t.indicative_value)}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${TRADE_IN_STYLES[status]}`}>{TRADE_IN_LABELS[status]}</span>
                  {canInspect && canStartInspection && <button onClick={()=>advanceTradeIn(t,'valuation_review')} className="btn btn-ghost btn-sm">Start inspection</button>}
                  {canInspect && canSendOffer && <button onClick={()=>advanceTradeIn(t,'offer_sent')} className="btn btn-ghost btn-sm">Recommend offer</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
