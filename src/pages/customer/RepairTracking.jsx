import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI } from '@/services/api.js'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { RepairTimeline } from '@/components/common/RepairTimeline.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { customerCanCancelRepair } from '@/lib/permissions.js'
import { customerNextStep } from '@/constants/status.js'
import { logAction } from '@/services/auditService.js'
import { BRANCHES } from '@/data/branches.js'
import { money, fmtDateTime } from '@/utils/format.js'
import { ChevronLeft, ShieldCheck } from 'lucide-react'

export default function RepairTracking(){
  const { ref } = useParams(); const { user } = useAuth()
  const { data:r, loading, refetch } = useAsync(()=>RepairAPI.get(ref),[ref])
  const [rejecting,setRejecting]=useState(false)
  const [cancelling,setCancelling]=useState(false)

  if(loading) return <div className="text-graphite-400">Loading…</div>
  if(!r) return <div>Not found. <Link to="/app/repairs" className="text-brand">Back</Link></div>
  const b=BRANCHES.find(x=>x.id===r.branch)

  const approve = async ()=>{
    await RepairAPI.update(ref,{ status:'Repair in progress' })
    logAction({ user, action:'quote.approve', entityType:'repair', entityId:ref })
    toast.success('Quote approved — repair starting.')
    refetch()
  }
  const reject = async (reason)=>{
    await RepairAPI.update(ref,{ status:'Cancelled', cancellationReason:reason })
    logAction({ user, action:'quote.reject', entityType:'repair', entityId:ref, reason })
    toast.message('Quote rejected — repair cancelled.')
    refetch()
  }
  const cancel = async (reason)=>{
    await RepairAPI.update(ref,{ status:'Cancelled', cancellationReason:reason })
    logAction({ user, action:'repair.cancel', entityType:'repair', entityId:ref, reason })
    toast.success('Booking cancelled.')
    refetch()
  }

  return (
    <div className="max-w-3xl">
      <Link to="/app/repairs" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-graphite-400 hover:text-brand"><ChevronLeft size={15}/> My repairs</Link>
      <div className="flex items-center gap-3 mt-2"><h1 className="text-2xl font-extrabold tracking-tight mono-data">{r.ref}</h1><StatusBadge status={r.status} audience="customer"/></div>
      <p className="text-graphite-400 mt-1">{r.brand} {r.model} · {r.problem} · {b?.area?.split('—')[0]}</p>
      {r.cancellationReason && <p className="text-[12.5px] text-rose-500 mt-1">Cancelled: {r.cancellationReason}</p>}

      {/* The quote panel below already spells out that state, so it would say it twice. */}
      {customerNextStep(r.status) && r.status!=='Quote awaiting approval' && (
        <p className="text-[13px] font-semibold text-brand bg-brand-50 rounded-xl px-4 py-3 mt-4">{customerNextStep(r.status)}</p>
      )}

      {r.status==='Quote awaiting approval' && (
        <div className="surface p-5 mt-5 bg-brand-50 border-brand/20">
          <div className="font-bold text-[15px]">Your quote: <span className="mono-data">{money(r.quote)}</span></div>
          <p className="text-[13.5px] text-graphite-600 mt-1">Approve to let us start the repair, or reject with a reason.</p>
          <div className="flex gap-2 mt-3.5"><button className="btn btn-brand btn-sm" onClick={approve}>Approve quote</button><button className="btn btn-ghost btn-sm" onClick={()=>setRejecting(true)}>Reject</button></div>
        </div>
      )}

      {customerCanCancelRepair(r) && (
        <div className="mt-4"><button onClick={()=>setCancelling(true)} className="text-[12.5px] font-semibold text-rose-600 hover:underline">Cancel this booking</button></div>
      )}

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <div className="surface p-5"><h3 className="font-bold text-[13.5px] mb-4">Progress</h3><RepairTimeline repair={r} audience="customer"/></div>
        <div className="space-y-4">
          <div className="surface p-5"><h3 className="font-bold text-[13.5px] mb-3">Details</h3>
            {[['Branch',b?.area?.split('—')[0]],['Fulfilment',r.fulfilment],['Technician',r.tech||'—'],['Quote',money(r.quote)],['Booked',fmtDateTime(r.createdAt)]].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 border-b border-graphite-100 last:border-0 text-[13px]"><span className="text-graphite-400">{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          {r.notes?.length>0 && (
            <div className="surface p-5"><h3 className="font-bold text-[13.5px] mb-3">Updates</h3>
              {r.notes.map((n,i)=><div key={i} className="text-[13px] bg-graphite-50 rounded-lg p-2.5 mb-2">{n.text}<div className="text-[11px] text-graphite-400 mt-1">{n.by} · {fmtDateTime(n.at)}</div></div>)}
            </div>
          )}
          <div className="flex items-center gap-2 text-[12px] text-graphite-400"><ShieldCheck size={14} className="text-brand"/> Covered by our 3-month repair warranty</div>
        </div>
      </div>

      {rejecting && (
        <ReasonDialog open={rejecting} onOpenChange={setRejecting}
          title="Reject this quote?" description="Tell us why — this cancels the repair booking."
          confirmLabel="Reject quote" onConfirm={reject}/>
      )}
      {cancelling && (
        <ReasonDialog open={cancelling} onOpenChange={setCancelling}
          title={`Cancel booking ${r.ref}?`} description="Only available before your device has been received in branch."
          confirmLabel="Cancel booking" onConfirm={cancel}/>
      )}
    </div>
  )
}
