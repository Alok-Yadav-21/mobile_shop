import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { BranchAPI, RepairAPI, UserAPI, OrderAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { branchDeleteBlockers } from '@/lib/deletionRules.js'
import { logAction } from '@/services/auditService.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { StatusPill } from '@/components/common/AccountStatusBadge.jsx'
import { RowActionsMenu } from '@/components/common/RowActionsMenu.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Search, MapPin, Users as UsersIcon, Eye, Pencil, Plus, UserCheck, UserX, Archive, ArchiveRestore, Trash2 } from 'lucide-react'

const REASON_ACTIONS = new Set(['archive'])

const schema = z.object({
  area: z.string().min(2, 'Enter the branch area or name'),
  local: z.string().min(2, 'Enter the local trading name'),
  addr: z.string().min(5, 'Enter the street address'),
  pc: z.string().min(4, 'Enter a valid postcode'),
  phone: z.string().optional(),
})

export default function Branches(){
  const { user:me } = useAuth()
  const { data:branches=[], refetch } = useAsync(()=>BranchAPI.list({ includeInactive:true, includeArchived:true }),[])
  const { data:repairs=[] } = useAsync(()=>RepairAPI.list(),[])
  const { data:staff=[] } = useAsync(()=>UserAPI.list(),[])
  const { data:orders=[] } = useAsync(()=>OrderAPI.list(),[])
  const canManage = can(me?.role,'manageBranches')

  const [q,setQ]=useState(''); const [statusFilter,setStatusFilter]=useState('')
  const [viewing,setViewing]=useState(null)
  const [editing,setEditing]=useState(null) // null = closed; {} = creating; branch = editing
  const [target,setTarget]=useState(null)
  const [deleteBlockers,setDeleteBlockers]=useState(null)

  const { register, handleSubmit, reset, formState:{ errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const openCreate = ()=>{ reset({ area:'', local:'', addr:'', pc:'', phone:'' }); setEditing({}) }
  const openEdit = (b)=>{ reset({ area:b.area, local:b.local, addr:b.addr, pc:b.pc, phone:b.phone||'' }); setEditing(b) }

  const onSubmit = async (data)=>{
    try{
      if(editing?.id){
        await BranchAPI.update(editing.id, data)
        logAction({ user:me, action:'branch.update', entityType:'branch', entityId:editing.id, before:editing, after:data })
        toast.success(`${data.area.split('—')[0].trim()} updated`)
      } else {
        const created = await BranchAPI.create(data)
        logAction({ user:me, action:'branch.create', entityType:'branch', entityId:created.id, after:created })
        toast.success(`${data.area.split('—')[0].trim()} created — activate it when it's ready to take bookings`)
      }
      setEditing(null); refetch()
    } catch(e){ toast.error(e.message||'Could not save the branch') }
  }

  const list = useMemo(()=>branches.filter(b=>{
    const status = b.archived ? 'archived' : (b.active!==false?'active':'inactive')
    if(statusFilter && status!==statusFilter) return false
    if(!statusFilter && b.archived) return false
    if(q.trim() && !b.area.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }),[branches,q,statusFilter])

  const runAction = async (reason)=>{
    const { type, branch:b } = target
    try{
      if(type==='delete'){ await BranchAPI.remove(b.id, deleteBlockers||[]); logAction({ user:me, action:'branch.delete', entityType:'branch', entityId:b.id, reason }); toast.success(`${b.area.split('—')[0]} deleted`) }
      else if(type==='archive'){ await BranchAPI.archive(b.id); logAction({ user:me, action:'branch.archive', entityType:'branch', entityId:b.id, reason }); toast.success(`${b.area.split('—')[0]} archived`) }
      else if(type==='restore'){ await BranchAPI.restore(b.id); logAction({ user:me, action:'branch.restore', entityType:'branch', entityId:b.id }); toast.success(`${b.area.split('—')[0]} restored`) }
      else { const active = type==='activate'; await BranchAPI.setActive(b.id, active); logAction({ user:me, action:'branch.status_change', entityType:'branch', entityId:b.id, after:{active} }); toast.success(`${b.area.split('—')[0]} ${active?'activated':'deactivated'}`) }
      setTarget(null); setDeleteBlockers(null); refetch()
    } catch(e){ toast.error(e.message) }
  }

  const openDelete = (b)=>{ setDeleteBlockers(branchDeleteBlockers(b, { staff, repairs, orders })); setTarget({ type:'delete', branch:b }) }

  const rowActions = (b)=>{
    const status = b.archived ? 'archived' : (b.active!==false?'active':'inactive')
    return [
      { key:'view', label:'View branch', icon:Eye, onClick:()=>setViewing(b) },
      { key:'edit', label:'Edit details', icon:Pencil, onClick:()=>openEdit(b), hidden:!canManage },
      status==='active'
        ? { key:'deactivate', label:'Deactivate', icon:UserX, tone:'amber', onClick:()=>setTarget({type:'deactivate',branch:b}), hidden:!canManage }
        : status!=='archived' && { key:'activate', label:'Activate', icon:UserCheck, tone:'emerald', onClick:()=>setTarget({type:'activate',branch:b}), hidden:!canManage },
      status==='archived'
        ? { key:'restore', label:'Restore', icon:ArchiveRestore, tone:'emerald', onClick:()=>setTarget({type:'restore',branch:b}), hidden:!canManage }
        : { key:'archive', label:'Archive', icon:Archive, onClick:()=>setTarget({type:'archive',branch:b}), hidden:!canManage },
      { key:'delete', label:'Delete', icon:Trash2, tone:'rose', onClick:()=>openDelete(b), hidden:!canManage },
    ].filter(Boolean)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">Branches</h1>
          <p className="text-graphite-400 text-[14px]">Open, edit and retire the stores in the network. New branches start inactive until you activate them.</p>
        </div>
        {canManage && <button onClick={openCreate} className="btn btn-brand btn-sm shrink-0"><Plus size={15}/> New branch</button>}
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex items-center gap-2 input-field w-auto max-w-xs"><Search size={14} className="text-graphite-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search branches…" className="bg-transparent outline-none flex-1"/></div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="input-field w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
        <span className="text-[12.5px] text-graphite-400 mono-data">{list.length} of {branches.length}</span>
      </div>

      {list.length===0 ? <div className="surface p-2"><EmptyState title="No branches match those filters"/></div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {list.map(b=>{
            const branchRepairs = repairs.filter(r=>r.branch===b.id)
            const active = branchRepairs.filter(r=>!['Completed','Cancelled'].includes(r.status)).length
            const branchStaff = staff.filter(s=>s.role==='staff' && s.branch===b.id)
            const status = b.archived ? 'archived' : (b.active!==false?'active':'inactive')
            return (
              <div key={b.id} className={`bento-tile ${status!=='active'?'opacity-70':''}`}>
                <div className="flex items-start justify-between">
                  <MapPin size={18} className="text-brand"/>
                  <div className="flex items-center gap-1.5"><StatusPill status={status}/><RowActionsMenu actions={rowActions(b)} label={`Actions for ${b.area}`}/></div>
                </div>
                <div className="font-bold text-[14.5px] mt-3">{b.area.split('—')[0].trim()}</div>
                <div className="text-[11.5px] text-graphite-400">{b.local}</div>
                <div className="text-[12.5px] text-graphite-600 mt-2 mono-data">{b.pc}</div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-graphite-100 text-[12px]">
                  <span className="text-graphite-500">{active} in queue</span>
                  <span className="flex items-center gap-1 text-graphite-500"><UsersIcon size={12}/> {branchStaff.length} staff</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o)=>!o&&setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? `Edit ${editing.area.split('—')[0].trim()}` : 'Open a new branch'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              {[
                { name:'area',  label:'Branch area / name', placeholder:'e.g. Bexleyheath' },
                { name:'local', label:'Local trading name',  placeholder:'e.g. Smart Phones Repair' },
                { name:'addr',  label:'Street address',      placeholder:'e.g. 12 Broadway' },
                { name:'pc',    label:'Postcode',            placeholder:'e.g. DA6 7DA' },
                { name:'phone', label:'Phone (optional)',    placeholder:'e.g. 020 8000 0000' },
              ].map(f=>(
                <div key={f.name}>
                  <label htmlFor={`branch-${f.name}`} className="block text-[12px] font-semibold text-graphite-500 mb-1.5">{f.label}</label>
                  <input id={`branch-${f.name}`} {...register(f.name)} placeholder={f.placeholder} className="input-field"/>
                  {errors[f.name] && <p className="text-[11.5px] text-rose-600 mt-1">{errors[f.name].message}</p>}
                </div>
              ))}
              {!editing.id && (
                <p className="text-[11.5px] text-graphite-400">
                  The branch code is derived from the area name and must be unique. The branch opens inactive so you can assign staff and stock before it appears in customer branch pickers.
                </p>
              )}
              <DialogFooter>
                <button type="button" onClick={()=>setEditing(null)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-brand btn-sm">{editing.id ? 'Save changes' : 'Create branch'}</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {viewing && (
        <Dialog open={!!viewing} onOpenChange={(o)=>!o&&setViewing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{viewing.area.split('—')[0].trim()}</DialogTitle></DialogHeader>
            <div className="space-y-2.5 text-[13.5px]">
              {[['Local name',viewing.local],['Address',viewing.addr],['Postcode',viewing.pc],['Staff',staff.filter(s=>s.branch===viewing.id).length],['Repairs on record',repairs.filter(r=>r.branch===viewing.id).length],['Status',<StatusPill key="s" status={viewing.archived?'archived':(viewing.active!==false?'active':'inactive')}/>]].map(([k,v])=>(
                <div key={k} className="flex justify-between py-2 border-b border-graphite-100 last:border-0"><span className="text-graphite-400">{k}</span><span className="font-medium">{v}</span></div>
              ))}
            </div>
            <DialogFooter><button onClick={()=>setViewing(null)} className="btn btn-ghost">Close</button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {target && REASON_ACTIONS.has(target.type) && (
        <ReasonDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={`Archive ${target.branch.area.split('—')[0]}?`} description="Archived branches no longer appear in branch pickers across the site."
          confirmLabel="Archive" onConfirm={runAction}/>
      )}
      {target && target.type==='delete' && (
        deleteBlockers?.length>0 ? (
          <ConfirmDialog open={!!target} onOpenChange={(o)=>{if(!o){setTarget(null);setDeleteBlockers(null)}}}
            title="Can't delete this branch" destructive={false} confirmLabel="OK"
            description={`This branch can't be deleted because it has ${deleteBlockers.join(', ')}. Archive it instead if you want to hide it.`}
            onConfirm={()=>{setTarget(null);setDeleteBlockers(null)}}/>
        ) : (
          <ReasonDialog open={!!target} onOpenChange={(o)=>{if(!o){setTarget(null);setDeleteBlockers(null)}}}
            title={`Delete ${target.branch.area.split('—')[0]}?`} description="No staff, repairs or orders are linked to this branch. This cannot be undone."
            confirmLabel="Delete" onConfirm={runAction}/>
        )
      )}
      {target && (target.type==='activate'||target.type==='deactivate'||target.type==='restore') && (
        <ConfirmDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='activate' ? `Activate ${target.branch.area.split('—')[0]}?` : target.type==='restore' ? `Restore ${target.branch.area.split('—')[0]}?` : `Deactivate ${target.branch.area.split('—')[0]}?`}
          description={target.type==='activate' ? 'It will reappear across the site as an available branch.' : target.type==='restore' ? 'It will reappear in normal branch lists.' : 'It will be hidden from branch pickers across the site.'}
          confirmLabel={target.type==='activate'?'Activate':target.type==='restore'?'Restore':'Deactivate'}
          destructive={target.type==='deactivate'} onConfirm={()=>runAction()}/>
      )}
    </div>
  )
}
