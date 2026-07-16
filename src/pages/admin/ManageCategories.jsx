import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { CategoryAPI, ProductAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { categoryDeleteBlockers } from '@/lib/deletionRules.js'
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
import { Search, Plus, Eye, UserCheck, UserX, Archive, ArchiveRestore, Trash2 } from 'lucide-react'

const REASON_ACTIONS = new Set(['archive'])

export default function ManageCategories(){
  const { user:me } = useAuth()
  const { data:categories=[], loading, error, refetch } = useAsync(()=>CategoryAPI.list({ includeArchived:true }),[])
  const { data:products=[] } = useAsync(()=>ProductAPI.list({ includeInactive:true, includeArchived:true }),[])
  const canManage = can(me?.role,'manageCategories')

  const [q,setQ]=useState(''); const [statusFilter,setStatusFilter]=useState('')
  const [name,setName]=useState('')
  const [viewing,setViewing]=useState(null)
  const [target,setTarget]=useState(null)
  const [deleteBlockers,setDeleteBlockers]=useState(null)

  const list = useMemo(()=>categories.filter(c=>{
    const status = c.archived ? 'archived' : (c.active?'active':'inactive')
    if(statusFilter && status!==statusFilter) return false
    if(!statusFilter && c.archived) return false
    if(q.trim() && !c.name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }),[categories,q,statusFilter])

  const create = async ()=>{
    if(!name.trim()) return
    try{
      await CategoryAPI.create(name.trim())
      logAction({ user:me, action:'category.create', entityType:'category', entityId:name.trim() })
      toast.success(`Category "${name.trim()}" added`)
      setName(''); refetch()
    } catch(e){ toast.error(e.message) }
  }

  const runAction = async (reason)=>{
    const { type, category:c } = target
    try{
      if(type==='delete'){ await CategoryAPI.remove(c.name, deleteBlockers||[]); logAction({ user:me, action:'category.delete', entityType:'category', entityId:c.name, reason }); toast.success(`"${c.name}" deleted`) }
      else if(type==='archive'){ await CategoryAPI.archive(c.name); logAction({ user:me, action:'category.archive', entityType:'category', entityId:c.name, reason }); toast.success(`"${c.name}" archived`) }
      else if(type==='restore'){ await CategoryAPI.restore(c.name); logAction({ user:me, action:'category.restore', entityType:'category', entityId:c.name }); toast.success(`"${c.name}" restored`) }
      else { const active = type==='activate'; await CategoryAPI.setActive(c.name, active); logAction({ user:me, action:'category.status_change', entityType:'category', entityId:c.name, after:{active} }); toast.success(`"${c.name}" ${active?'activated':'deactivated'}`) }
      setTarget(null); setDeleteBlockers(null); refetch()
    } catch(e){ toast.error(e.message) }
  }

  const openDelete = (c)=>{ setDeleteBlockers(categoryDeleteBlockers(c, { products })); setTarget({ type:'delete', category:c }) }

  const rowActions = (c)=>{
    const status = c.archived ? 'archived' : (c.active?'active':'inactive')
    return [
      { key:'view', label:'View category', icon:Eye, onClick:()=>setViewing(c) },
      status==='active'
        ? { key:'deactivate', label:'Deactivate', icon:UserX, tone:'amber', onClick:()=>setTarget({type:'deactivate',category:c}), hidden:!canManage }
        : status!=='archived' && { key:'activate', label:'Activate', icon:UserCheck, tone:'emerald', onClick:()=>setTarget({type:'activate',category:c}), hidden:!canManage },
      status==='archived'
        ? { key:'restore', label:'Restore', icon:ArchiveRestore, tone:'emerald', onClick:()=>setTarget({type:'restore',category:c}), hidden:!canManage }
        : { key:'archive', label:'Archive', icon:Archive, onClick:()=>setTarget({type:'archive',category:c}), hidden:!canManage },
      { key:'delete', label:'Delete', icon:Trash2, tone:'rose', onClick:()=>openDelete(c), hidden:!canManage },
    ].filter(Boolean)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Categories</h1>
        {canManage && (
          <div className="flex gap-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="New category name" className="input-field w-auto"/>
            <button onClick={create} className="btn btn-brand btn-sm"><Plus size={15}/> Add</button>
          </div>
        )}
      </div>
      <p className="text-graphite-400 text-[14px] mb-6">Product categories shown across the storefront.</p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex items-center gap-2 input-field w-auto max-w-xs"><Search size={14} className="text-graphite-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search categories…" className="bg-transparent outline-none flex-1"/></div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="input-field w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
        <span className="text-[12.5px] text-graphite-400 mono-data">{list.length} of {categories.length}</span>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch}/> : loading ? <TableSkeleton cols={3}/> : list.length===0 ? (
        <div className="surface p-2"><EmptyState title="No categories match those filters"/></div>
      ) : (
        <div className="surface overflow-x-auto">
          <Table><thead><tr><Th>Category</Th><Th>Products</Th><Th>Status</Th><Th></Th></tr></thead>
          <tbody>{list.map(c=>(
            <tr key={c.name} className="hover:bg-graphite-50">
              <Td className="font-semibold">{c.name}</Td>
              <Td className="mono-data">{products.filter(p=>p.category===c.name).length}</Td>
              <Td><StatusPill status={c.archived?'archived':(c.active?'active':'inactive')}/></Td>
              <Td><RowActionsMenu actions={rowActions(c)} label={`Actions for ${c.name}`}/></Td>
            </tr>
          ))}</tbody></Table>
        </div>
      )}

      {viewing && (
        <Dialog open={!!viewing} onOpenChange={(o)=>!o&&setViewing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{viewing.name}</DialogTitle></DialogHeader>
            <div className="space-y-2.5 text-[13.5px]">
              <div className="flex justify-between py-2 border-b border-graphite-100"><span className="text-graphite-400">Products</span><span className="font-medium mono-data">{products.filter(p=>p.category===viewing.name).length}</span></div>
              <div className="flex justify-between py-2"><span className="text-graphite-400">Status</span><StatusPill status={viewing.archived?'archived':(viewing.active?'active':'inactive')}/></div>
            </div>
            <DialogFooter><button onClick={()=>setViewing(null)} className="btn btn-ghost">Close</button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {target && REASON_ACTIONS.has(target.type) && (
        <ReasonDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={`Archive "${target.category.name}"?`} description="Archived categories no longer appear on the storefront filter list."
          confirmLabel="Archive" onConfirm={runAction}/>
      )}
      {target && target.type==='delete' && (
        deleteBlockers?.length>0 ? (
          <ConfirmDialog open={!!target} onOpenChange={(o)=>{if(!o){setTarget(null);setDeleteBlockers(null)}}}
            title="Can't delete this category" destructive={false} confirmLabel="OK"
            description={`This category can't be deleted because ${deleteBlockers.join(', ')}. Archive it instead if you want to hide it.`}
            onConfirm={()=>{setTarget(null);setDeleteBlockers(null)}}/>
        ) : (
          <ReasonDialog open={!!target} onOpenChange={(o)=>{if(!o){setTarget(null);setDeleteBlockers(null)}}}
            title={`Delete "${target.category.name}"?`} description="No products use this category. This cannot be undone."
            confirmLabel="Delete" onConfirm={runAction}/>
        )
      )}
      {target && (target.type==='activate'||target.type==='deactivate'||target.type==='restore') && (
        <ConfirmDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='activate' ? `Activate "${target.category.name}"?` : target.type==='restore' ? `Restore "${target.category.name}"?` : `Deactivate "${target.category.name}"?`}
          description={target.type==='activate' ? 'It will reappear on the storefront filters.' : target.type==='restore' ? 'It will reappear in normal category lists.' : 'It will no longer appear on the storefront filters.'}
          confirmLabel={target.type==='activate'?'Activate':target.type==='restore'?'Restore':'Deactivate'}
          destructive={target.type==='deactivate'} onConfirm={()=>runAction()}/>
      )}
    </div>
  )
}
