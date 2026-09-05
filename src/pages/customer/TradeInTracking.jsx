import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { TradeInAPI } from '@/services/api.js'
import { JourneyTimeline } from '@/components/common/RepairTimeline.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { logAction } from '@/services/auditService.js'
import {
  TRADE_IN_CUSTOMER_FLOW, TRADE_IN_TERMINAL, TRADE_IN_STYLES,
  tradeInStatusLabel, tradeInNextStep,
} from '@/constants/status.js'
import { money, fmtDateTime } from '@/utils/format.js'
import { ChevronLeft, ShieldCheck } from 'lucide-react'

// Tracking one device the customer is selling us — the counterpart of RepairTracking.
//
// The sell journey previously had no page of its own: a row on My repairs showed a status and
// nothing else, so a customer who had sent us a device could not see what had happened to it,
// and the one step that is theirs to take — answering the offer — could only be taken by an
// admin clicking Accept on their behalf.
export default function TradeInTracking(){
  const { ref } = useParams(); const { user } = useAuth()
  const { data:t, loading, refetch } = useAsync(()=>TradeInAPI.get(ref),[ref])
  const [declining,setDeclining]=useState(false)
  const [busy,setBusy]=useState(false)

  if(loading) return <div className="text-graphite-400">Loading…</div>
  if(!t) return <div>Not found. <Link to="/app/repairs" className="text-brand">Back</Link></div>

  const status = t.status || 'submitted'
  const value = t.indicativeValue ?? t.indicative_value
  const nextStep = tradeInNextStep(status)

  const accept = async ()=>{
    setBusy(true)
    try{
      await TradeInAPI.respondToOffer(ref, true)
      logAction({ user, action:'trade_in.offer_accepted', entityType:'trade_in', entityId:ref })
      toast.success('Offer accepted — we will be in touch about payment.')
      refetch()
    } catch(e){ toast.error(e.message||'Could not accept that offer') } finally { setBusy(false) }
  }
  const decline = async (reason)=>{
    try{
      await TradeInAPI.respondToOffer(ref, false, reason)
      logAction({ user, action:'trade_in.offer_declined', entityType:'trade_in', entityId:ref, reason })
      toast.message('Offer declined.')
      refetch()
    } catch(e){ toast.error(e.message||'Could not decline that offer') }
  }

  return (
    <div className="max-w-3xl">
      <Link to="/app/repairs" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-graphite-400 hover:text-brand"><ChevronLeft size={15}/> My repairs &amp; sales</Link>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <h1 className="text-2xl font-extrabold tracking-tight mono-data">{t.reference}</h1>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${TRADE_IN_STYLES[status]}`}>{tradeInStatusLabel(status,'customer')}</span>
      </div>
      <p className="text-graphite-400 mt-1">{t.brand} {t.model} · {t.conditionGrade||t.condition_grade}</p>
      {t.rejectionReason && <p className="text-[12.5px] text-rose-500 mt-1">Declined: {t.rejectionReason}</p>}

      {/* The offer panel below says this in full, so it would otherwise be said twice. */}
      {nextStep && status!=='offer_sent' && (
        <p className="text-[13px] font-semibold text-brand bg-brand-50 rounded-xl px-4 py-3 mt-4">{nextStep}</p>
      )}

      {status==='offer_sent' && (
        <div className="surface p-5 mt-5 bg-brand-50 border-brand/20">
          <div className="font-bold text-[15px]">Our offer: <span className="mono-data">{money(value)}</span></div>
          <p className="text-[13.5px] text-graphite-600 mt-1">Accept and we&rsquo;ll arrange payment, or decline and tell us why.</p>
          <div className="flex gap-2 mt-3.5">
            <button className="btn btn-brand btn-sm disabled:opacity-60" disabled={busy} onClick={accept}>{busy?'Accepting…':'Accept offer'}</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setDeclining(true)}>Decline</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <div className="surface p-5">
          <h3 className="font-bold text-[13.5px] mb-4">Progress</h3>
          <JourneyTimeline
            flow={TRADE_IN_CUSTOMER_FLOW}
            history={t.history ?? []}
            status={status}
            stoppedStates={TRADE_IN_TERMINAL}
            finishedStates={['completed']}
            labelFor={(s)=>tradeInStatusLabel(s,'customer')}
            stopNote={status==='offer_declined'
              ? `You declined this offer${t.rejectionReason?` — ${t.rejectionReason}`:'.'}`
              : 'You withdrew this request.'}
          />
        </div>
        <div className="space-y-4">
          <div className="surface p-5"><h3 className="font-bold text-[13.5px] mb-3">Details</h3>
            {[['Device',`${t.brand||''} ${t.model||''}`.trim()||'—'],
              ['Condition',t.conditionGrade||t.condition_grade||'—'],
              ['Valuation',money(value)],
              ['Submitted',fmtDateTime(t.createdAt)]].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 border-b border-graphite-100 last:border-0 text-[13px]"><span className="text-graphite-400">{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-graphite-400"><ShieldCheck size={14} className="text-brand"/> Your data is wiped from every device we buy</div>
        </div>
      </div>

      {declining && (
        <ReasonDialog open={declining} onOpenChange={setDeclining}
          title="Decline this offer?" description="Tell us why — it helps us price better next time."
          confirmLabel="Decline offer" onConfirm={decline}/>
      )}
    </div>
  )
}
