import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ServiceAPI, RepairAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { serviceDeleteBlockers } from '@/lib/deletionRules.js'
import { logAction } from '@/services/auditService.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { StatusPill } from '@/components/common/AccountStatusBadge.jsx'
import { RowActionsMenu } from '@/components/common/RowActionsMenu.jsx'
import { TableSkeleton } from '@/components/common/TableSkeleton.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { Search, Plus, Eye, Pencil, UserCheck, UserX, Archive, ArchiveRestore, Trash2, Wrench } from 'lucide-react'

const REASON_ACTIONS = new Set(['archive'])
const schema = z.object({
  title: z.string().min(2,'Enter a service name'),
  desc: z.string().min(5,'Enter a short description'),
})

export default function ManageServices(){
  const { user:me } = useAuth()
  const { data:services=[], loading, error, refetch } = useAsync(()=>ServiceAPI.list({ includeInactive:true, includeArchived:true }),[])
  const { data:repairs=[] } = useAsync(()=>RepairAPI.list(),[])
  const canManage = can(me?.role,'manageProducts') // service catalogue management mirrors product/catalogue admin rights

  const [q,setQ]=useState(''); const [statusFilter,setStatusFilter]=useState('')
  const [editing,setEditing]=useState(null)
  const [viewing,setViewing]=useState(null)
  const [target,setTarget]=useState(null)
  const [deleteBlockers,setDeleteBlockers]=useState(null)

  const list = useMemo(()=>services.filter(s=>{
    const status = s.archived ? 'archived' : (s.active?'active':'inactive')
    if(statusFilter && status!==statusFilter) return false
    if(!statusFilter && s.archived) return false
    if(q.trim() && !s.title.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }),[services,q,statusFilter])

  const { register, handleSubmit, reset, formState:{ errors } } = useForm({ resolver: zodResolver(schema) })
  const openCreate = ()=>{ reset({ title:'', desc:'' }); setEditing({}) }
  const openEdit = (s)=>{ reset({ title:s.title, desc:s.desc }); setEditing(s) }

  const onSubmit = async (data)=>{
    try{
      if(editing?.id){
        const updated = await ServiceAPI.update(editing.id, data)
        logAction({ user:me, action:'service.update', entityType:'service', entityId:editing.id, after:updated })
        toast.success('Service updated')
      } else {
        const created = await ServiceAPI.create({ ...data, icon:Wrench })
        logAction({ user:me, action:'service.create', entityType:'service', entityId:created.id, after:created })
        toast.success('Service created — activate it to show on the storefront')
      }
      setEditing(null); refetch()
    } catch(e){ toast.error(e.message||'Could not save service') }
  }

  const runAction = async (reason)=>{
    const { type, service:s } = target
    try{
      if(type==='delete'){ await ServiceAPI.remove(s.id, deleteBlockers||[]); logAction({ user:me, action:'service.delete', entityType:'service', entityId:s.id, reason }); toast.success(`"${s.title}" deleted`) }
      else if(type==='archive'){ await ServiceAPI.archive(s.id); logAction({ user:me, action:'service.archive', entityType:'service', entityId:s.id, reason }); toast.success(`"${s.title}" archived`) }
      else if(type==='restore'){ await ServiceAPI.restore(s.id); logAction({ user:me, action:'service.restore', entityType:'service', entityId:s.id }); toast.success(`"${s.title}" restored`) }
      else { const active = type==='activate'; await ServiceAPI.setActive(s.id, active); logAction({ user:me, action:'service.status_change', entityType:'service', entityId:s.id, after:{active} }); toast.success(`"${s.title}" ${active?'activated':'deactivated'}`) }
      setTarget(null); setDeleteBlockers(null); refetch()
    } catch(e){ toast.error(e.message) }
  }

  const openDelete = (s)=>{ setDeleteBlockers(serviceDeleteBlockers(s, { repairs })); setTarget({ type:'delete', service:s }) }

  const rowActions = (s)=>{
    const status = s.archived ? 'archived' : (s.active?'active':'inactive')
    return [
      { key:'view', label:'View service', icon:Eye, onClick:()=>setViewing(s) },
      { key:'edit', label:'Edit service', icon:Pencil, onClick:()=>openEdit(s), hidden:!canManage||status==='archived' },
      status==='active'
        ? { key:'deactivate', label:'Deactivate', icon:UserX, tone:'amber', onClick:()=>setTarget({type:'deactivate',service:s}), hidden:!canManage }
        : status!=='archived' && { key:'activate', label:'Activate', icon:UserCheck, tone:'emerald', onClick:()=>setTarget({type:'activate',service:s}), hidden:!canManage },
      status==='archived'
        ? { key:'restore', label:'Restore', icon:ArchiveRestore, tone:'emerald', onClick:()=>setTarget({type:'restore',service:s}), hidden:!canManage }
        : { key:'archive', label:'Archive', icon:Archive, onClick:()=>setTarget({type:'archive',service:s}), hidden:!canManage },
      { key:'delete', label:'Delete', icon:Trash2, tone:'rose', onClick:()=>openDelete(s), hidden:!canManage },
    ].filter(Boolean)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Repair services</h1><p className="text-graphite-400 text-[13px] mt-0.5">Service catalogue shown on the storefront and booking flow.</p></div>
        {canManage && <button onClick={openCreate} className="btn btn-brand btn-sm"><Plus size={15}/> Add service</button>}
      </div>

      <div className="flex flex-wrap gap-3 my-4 items-center">
        <div className="flex items-center gap-2 input-field w-auto max-w-xs"><Search size={14} className="text-graphite-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search services…" className="bg-transparent outline-none flex-1"/></div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="input-field w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
        <span className="text-[12.5px] text-graphite-400 mono-data">{list.length} of {services.length}</span>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch}/> : loading ? <TableSkeleton cols={4}/> : list.length===0 ? (
        <div className="surface p-2"><EmptyState title="No services match those filters"/></div>
      ) : (
        <div className="surface overflow-x-auto">
          <Table><thead><tr><Th>Service</Th><Th>Description</Th><Th>Status</Th><Th></Th></tr></thead>
          <tbody>{list.map(s=>{
            const Icon = s.icon||Wrench
            return (
              <tr key={s.id} className="hover:bg-graphite-50">
                <Td className="font-semibold"><span className="flex items-center gap-2"><Icon size={15} className="text-brand"/>{s.title}</span></Td>
                <Td className="text-graphite-500 max-w-sm truncate">{s.desc}</Td>
                <Td><StatusPill status={s.archived?'archived':(s.active?'active':'inactive')}/></Td>
                <Td><RowActionsMenu actions={rowActions(s)} label={`Actions for ${s.title}`}/></Td>
              </tr>
            )
          })}</tbody></Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o)=>!o&&setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id?`Edit ${editing.title}`:'Add service'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Service name</span><input {...register('title')} className="input-field mt-1.5"/>{errors.title&&<span className="text-[11.5px] text-red-500">{errors.title.message}</span>}</label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Description</span><textarea {...register('desc')} rows={2} className="input-field mt-1.5 h-auto py-2"/>{errors.desc&&<span className="text-[11.5px] text-red-500">{errors.desc.message}</span>}</label>
            <DialogFooter><button type="button" onClick={()=>setEditing(null)} className="btn btn-ghost">Cancel</button><button type="submit" className="btn btn-brand">{editing?.id?'Save changes':'Create service'}</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {viewing && (
        <Dialog open={!!viewing} onOpenChange={(o)=>!o&&setViewing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{viewing.title}</DialogTitle></DialogHeader>
            <div className="space-y-2.5 text-[13.5px]">
              <p className="text-graphite-600">{viewing.desc}</p>
              <div className="flex justify-between py-2 border-t border-graphite-100"><span className="text-graphite-400">Status</span><StatusPill status={viewing.archived?'archived':(viewing.active?'active':'inactive')}/></div>
            </div>
            <DialogFooter><button onClick={()=>setViewing(null)} className="btn btn-ghost">Close</button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {target && REASON_ACTIONS.has(target.type) && (
        <ReasonDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={`Archive "${target.service.title}"?`} description="Archived services no longer appear on the storefront or booking flow."
          confirmLabel="Archive" onConfirm={runAction}/>
      )}
      {target && target.type==='delete' && (
        deleteBlockers?.length>0 ? (
          <ConfirmDialog open={!!target} onOpenChange={(o)=>{if(!o){setTarget(null);setDeleteBlockers(null)}}}
            title="Can't delete this service" destructive={false} confirmLabel="OK"
            description={`This service can't be deleted because ${deleteBlockers.join(', ')}. Archive it instead if you want to hide it.`}
            onConfirm={()=>{setTarget(null);setDeleteBlockers(null)}}/>
        ) : (
          <ReasonDialog open={!!target} onOpenChange={(o)=>{if(!o){setTarget(null);setDeleteBlockers(null)}}}
            title={`Delete "${target.service.title}"?`} description="No repair records reference this service. This cannot be undone."
            confirmLabel="Delete" onConfirm={runAction}/>
        )
      )}
      {target && (target.type==='activate'||target.type==='deactivate'||target.type==='restore') && (
        <ConfirmDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='activate' ? `Activate "${target.service.title}"?` : target.type==='restore' ? `Restore "${target.service.title}"?` : `Deactivate "${target.service.title}"?`}
          description={target.type==='activate' ? 'It will reappear on the storefront and booking flow.' : target.type==='restore' ? 'It will reappear in normal service lists.' : 'It will no longer appear on the storefront or booking flow.'}
          confirmLabel={target.type==='activate'?'Activate':target.type==='restore'?'Restore':'Deactivate'}
          destructive={target.type==='deactivate'} onConfirm={()=>runAction()}/>
      )}
    </div>
  )
}
