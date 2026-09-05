import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI, UserAPI } from '@/services/api.js'
import { techniciansForBranch } from '@/lib/staff.js'
import { REPAIR_FLOW, nextStatuses } from '@/constants/status.js'
import { RepairTimeline } from '@/components/common/RepairTimeline.jsx'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { useAuth } from '@/hooks/useAuth.js'
import { logAction } from '@/services/auditService.js'
import { money } from '@/utils/format.js'
import { ChevronLeft, Plus } from 'lucide-react'

export default function RepairDetails(){
  const { ref } = useParams(); const { user }=useAuth()
  const { data:r, loading, refetch } = useAsync(()=>RepairAPI.get(ref),[ref])
  const { data:parts=[], refetch:refetchParts } = useAsync(()=>RepairAPI.listParts(ref),[ref])
  const { data:users=[] } = useAsync(()=>UserAPI.list(),[])
  const [note,setNote]=useState('')
  const [part,setPart]=useState({ name:'', quantity:1, unitCost:'' })
  const [cancelling,setCancelling]=useState(false)

  if(loading) return <div className="text-graphite-400">Loading…</div>
  if(!r) return <div>Not found.</div>

  const upd=async(patch)=>{
    try{
      const before = { status:r.status }
      await RepairAPI.update(ref,patch)
      if(patch.status) logAction({ user, action:'repair.status_change', entityType:'repair', entityId:ref, before, after:{status:patch.status} })
      refetch(); toast.success('Repair updated')
    } catch(e){ toast.error(e.message) }
  }
  const addNote=async()=>{ if(!note.trim())return; await RepairAPI.addNote(ref,{by:user?.name||'Staff',text:note}); setNote(''); refetch() }
  const addPart=async()=>{
    if(!part.name.trim()) return
    await RepairAPI.addPart(ref, { name:part.name.trim(), quantity:Number(part.quantity)||1, unitCost:part.unitCost?Number(part.unitCost):null })
    logAction({ user, action:'repair.part_add', entityType:'repair', entityId:ref, after:part })
    setPart({ name:'', quantity:1, unitCost:'' }); refetchParts(); toast.success('Part added')
  }
  const cancel = async (reason)=>{
    try{
      await RepairAPI.update(ref, { status:'Cancelled', cancellationReason:reason })
      logAction({ user, action:'repair.cancel', entityType:'repair', entityId:ref, reason })
      toast.success('Repair cancelled'); refetch()
    } catch(e){ toast.error(e.message) }
  }

  // Quote awaiting approval -> Repair in progress is deliberately excluded from this
  // dropdown: that transition only happens through the customer's approve action (or an
  // admin's approve-on-behalf), never a casual staff status edit.
  const allowedNext = nextStatuses(r.status).filter(s=>!(r.status==='Quote awaiting approval' && s==='Repair in progress'))

  return (
    <div className="max-w-3xl">
      <Link to="/staff/repairs" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-graphite-400 hover:text-brand"><ChevronLeft size={15}/> Assigned repairs</Link>
      <div className="flex items-center gap-3 mt-2"><h1 className="text-2xl font-extrabold tracking-tight mono-data">{r.ref}</h1><StatusBadge status={r.status}/></div>
      <p className="text-graphite-400 mt-1">{r.brand} {r.model} · {r.customer} · {r.phone}</p>
      {r.cancellationReason && <p className="text-[12.5px] text-rose-500 mt-1">Cancelled: {r.cancellationReason}</p>}

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <div className="surface p-5 space-y-4">
          <h3 className="font-bold text-[13.5px]">Update job</h3>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Status</span>
            <select value={r.status} onChange={e=>upd({status:e.target.value})} disabled={allowedNext.length===0} className="input-field mt-1.5 disabled:opacity-50">
              <option value={r.status}>{r.status} (current)</option>
              {allowedNext.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            {allowedNext.length===0 && <span className="text-[11px] text-graphite-400 block mt-1">No further status changes from here.</span>}
          </label>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Technician</span>
            <select value={r.tech||''} onChange={e=>upd({tech:e.target.value||null})} className="input-field mt-1.5">
              <option value="">— unassigned —</option>
              {techniciansForBranch(users, r.branch).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select></label>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Quote (£)</span>
            <input type="number" defaultValue={r.quote||''} onBlur={e=>upd({quote:e.target.value?Number(e.target.value):null})} placeholder="89" className="input-field mt-1.5"/></label>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Add note</span>
            <div className="flex gap-2 mt-1.5"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Internal / customer note" className="input-field"/><button className="btn btn-ghost btn-sm flex-none" onClick={addNote}>Add</button></div></label>
          {!['Completed','Cancelled'].includes(r.status) && (
            <button onClick={()=>setCancelling(true)} className="text-[12.5px] font-semibold text-rose-600 hover:underline">Cancel this repair</button>
          )}
        </div>
        <div className="surface p-5"><h3 className="font-bold text-[13.5px] mb-3">Progress</h3><RepairTimeline repair={r}/></div>
      </div>

      <div className="surface p-5 mt-4">
        <h3 className="font-bold text-[13.5px] mb-3">Parts used</h3>
        <div className="space-y-2 mb-3">
          {parts.map(p=><div key={p.id} className="flex justify-between text-[13px] bg-graphite-50 rounded-lg px-3 py-2"><span>{p.name} × {p.quantity}</span>{p.unitCost&&<span className="mono-data">{money(p.unitCost*p.quantity)}</span>}</div>)}
          {parts.length===0 && <div className="text-[12.5px] text-graphite-400">No parts recorded yet.</div>}
        </div>
        <div className="flex gap-2">
          <input value={part.name} onChange={e=>setPart(s=>({...s,name:e.target.value}))} placeholder="Part name" className="input-field flex-1"/>
          <input type="number" min="1" value={part.quantity} onChange={e=>setPart(s=>({...s,quantity:e.target.value}))} className="input-field w-16"/>
          <input type="number" step="0.01" value={part.unitCost} onChange={e=>setPart(s=>({...s,unitCost:e.target.value}))} placeholder="£ cost" className="input-field w-24"/>
          <button onClick={addPart} className="btn btn-ghost btn-sm flex-none"><Plus size={14}/> Add</button>
        </div>
      </div>

      {r.notes?.length>0 && (
        <div className="surface p-5 mt-4"><h3 className="font-bold text-[13.5px] mb-3">Notes</h3>
          {r.notes.map((n,i)=><div key={i} className="text-[13px] bg-graphite-50 rounded-lg p-2.5 mb-2">{n.text}<div className="text-[11px] text-graphite-400 mt-1">{n.by}</div></div>)}
        </div>
      )}

      {cancelling && (
        <ReasonDialog open={cancelling} onOpenChange={setCancelling}
          title={`Cancel repair ${r.ref}?`} description="This is recorded on the repair's timeline and visible to the customer."
          confirmLabel="Cancel repair" onConfirm={cancel}/>
      )}
    </div>
  )
}
