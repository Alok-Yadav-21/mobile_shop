import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { TradeInAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { TRADE_IN_LABELS, TRADE_IN_STYLES, tradeInCanTransition } from '@/constants/status.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { money, fmtDate } from '@/utils/format.js'

export default function BuySellRequests(){
  const { user:me } = useAuth()
  const { data:list=[], refetch } = useAsync(()=>TradeInAPI.list(),[])
  const [rejecting,setRejecting]=useState(null)
  const canApprove = can(me?.role,'approveTradeIn')
  const canInspect = can(me?.role,'inspectTradeIn')

  const advance = async (t, status)=>{
    try{
      await TradeInAPI.update(t.reference, { status })
      logAction({ user:me, action:'trade_in.status_change', entityType:'trade_in', entityId:t.reference, before:{status:t.status}, after:{status} })
      toast.success(`${t.reference} → ${TRADE_IN_LABELS[status]}`)
      refetch()
    } catch(e){ toast.error(e.message) }
  }

  const reject = async (reason)=>{
    await TradeInAPI.update(rejecting.reference, { status:'offer_declined', rejectionReason:reason })
    logAction({ user:me, action:'trade_in.reject', entityType:'trade_in', entityId:rejecting.reference, reason })
    toast.success(`${rejecting.reference} rejected`)
    refetch()
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Buy / sell requests</h1>
      <p className="text-graphite-400 text-[14px] mb-6">Trade-in submissions, valuations and final offers, platform-wide.</p>
      {list.length===0 ? (
        <div className="surface p-2"><EmptyState title="No trade-in requests yet" hint="Submissions from Sell my device will appear here."/></div>
      ) : (
        <div className="surface divide-y divide-graphite-200">
          {list.map(t=>{
            const b = BRANCHES.find(x=>x.id===(t.branchId||t.branch))
            const status = t.status||'submitted'
            const canInspectNext = tradeInCanTransition(status,'valuation_review')
            const canOfferNext = tradeInCanTransition(status,'offer_sent')
            const canAcceptNext = tradeInCanTransition(status,'offer_accepted')
            const canPaidNext = tradeInCanTransition(status,'paid')
            const canCompleteNext = tradeInCanTransition(status,'completed')
            const canRejectNext = tradeInCanTransition(status,'offer_declined')
            return (
              <div key={t.reference} className="flex items-center justify-between px-5 py-3.5 gap-4 flex-wrap">
                <div>
                  <div className="font-bold text-[13.5px] mono-data">{t.reference}</div>
                  <div className="text-[12.5px] text-graphite-400">{t.brand} {t.model} · {t.conditionGrade||t.condition_grade} · {b?.area?.split('—')[0]||'—'} · {fmtDate(t.createdAt||t.created_at)}</div>
                  {t.rejectionReason && <div className="text-[11.5px] text-rose-500 mt-1">Rejected: {t.rejectionReason}</div>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[13px] mono-data">{money(t.indicativeValue||t.indicative_value)}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${TRADE_IN_STYLES[status]}`}>{TRADE_IN_LABELS[status]}</span>
                  {canInspect && canInspectNext && <button onClick={()=>advance(t,'valuation_review')} className="btn btn-ghost btn-sm">Start inspection</button>}
                  {canInspect && canOfferNext && <button onClick={()=>advance(t,'offer_sent')} className="btn btn-ghost btn-sm">Send offer</button>}
                  {canApprove && canAcceptNext && <button onClick={()=>advance(t,'offer_accepted')} className="btn btn-brand btn-sm">Accept</button>}
                  {canApprove && canRejectNext && <button onClick={()=>setRejecting(t)} className="btn btn-ghost btn-sm text-rose-600">Reject</button>}
                  {canApprove && canPaidNext && <button onClick={()=>advance(t,'paid')} className="btn btn-ghost btn-sm">Mark paid</button>}
                  {canApprove && canCompleteNext && <button onClick={()=>advance(t,'completed')} className="btn btn-brand btn-sm">Complete</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rejecting && (
        <ReasonDialog open={!!rejecting} onOpenChange={(o)=>!o&&setRejecting(null)}
          title={`Reject ${rejecting.reference}?`} description="This is shown to the customer — explain why the offer was declined."
          confirmLabel="Reject offer" onConfirm={reject}/>
      )}
    </div>
  )
}
