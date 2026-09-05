import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI, TradeInAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { TRADE_IN_LABELS, TRADE_IN_STYLES } from '@/constants/status.js'
import { logAction } from '@/services/auditService.js'
import { money } from '@/utils/format.js'

const CANCELLABLE_TRADE_IN = ['submitted','valuation_review']

export default function MyRepairs(){
  const { user } = useAuth()
  const { data:reps=[], loading } = useAsync(()=>RepairAPI.forCustomer(),[user])
  const { data:tradeIns=[], refetch:refetchTradeIns } = useAsync(()=>TradeInAPI.list(user?.id),[user])
  const [cancelling,setCancelling]=useState(null)

  const cancelTradeIn = async ()=>{
    try{
      await TradeInAPI.cancel(cancelling.reference)
      logAction({ user, action:'trade_in.cancel', entityType:'trade_in', entityId:cancelling.reference })
      toast.success(`${cancelling.reference} cancelled`)
      setCancelling(null); refetchTradeIns()
    } catch(e){ toast.error(e.message) }
  }

  if(loading) return <div className="text-graphite-400">Loading…</div>

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-5">My repairs</h1>
      {!reps.length ? (
        <div className="surface p-2 mb-8"><EmptyState title="No repairs yet" hint="Book one and it'll appear here."/></div>
      ) : (
        <div className="surface divide-y divide-graphite-200 mb-8">
          {reps.map(r=>{ const b=BRANCHES.find(x=>x.id===r.branch)
            return (
              <Link key={r.ref} to={`/app/repairs/${r.ref}`} className="flex items-center justify-between px-5 py-4 hover:bg-graphite-50 transition-colors">
                <div><div className="font-bold text-[13.5px] mono-data">{r.ref}</div><div className="text-[12.5px] text-graphite-400">{r.brand} {r.model} · {r.problem} · {b?.area?.split('—')[0]}</div></div>
                <div className="text-right"><StatusBadge status={r.status}/>{r.quote&&<div className="text-[12.5px] mono-data mt-1 font-semibold">{money(r.quote)}</div>}</div>
              </Link>
            )
          })}
        </div>
      )}

      <h2 className="text-[16px] font-bold mb-3">My trade-ins</h2>
      {!tradeIns.length ? (
        <div className="surface p-2"><EmptyState title="No trade-ins yet" hint="Sell a device and it'll appear here."/></div>
      ) : (
        <div className="surface divide-y divide-graphite-200">
          {tradeIns.map(t=>{
            const status = t.status||'submitted'
            return (
              <div key={t.reference} className="flex items-center justify-between px-5 py-4">
                <div><div className="font-bold text-[13.5px] mono-data">{t.reference}</div><div className="text-[12.5px] text-graphite-400">{t.brand} {t.model} · {t.conditionGrade||t.condition_grade}</div></div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[13px] mono-data">{money(t.indicativeValue||t.indicative_value)}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${TRADE_IN_STYLES[status]}`}>{TRADE_IN_LABELS[status]}</span>
                  {CANCELLABLE_TRADE_IN.includes(status) && <button onClick={()=>setCancelling(t)} className="text-[12px] font-semibold text-rose-600 hover:underline">Cancel</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cancelling && (
        <ConfirmDialog open={!!cancelling} onOpenChange={(o)=>!o&&setCancelling(null)}
          title={`Cancel trade-in ${cancelling.reference}?`} description="This withdraws your request. You can submit a new one at any time."
          confirmLabel="Cancel request" onConfirm={cancelTradeIn}/>
      )}
    </div>
  )
}
