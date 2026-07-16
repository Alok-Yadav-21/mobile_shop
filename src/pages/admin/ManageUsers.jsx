import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { UserAPI, RepairAPI, OrderAPI, TradeInAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { canManageUsers, canResetPassword, isSuperAdmin, isSelf } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { StatusPill, RoleBadge } from '@/components/common/AccountStatusBadge.jsx'
import { RowActionsMenu } from '@/components/common/RowActionsMenu.jsx'
import { TableSkeleton } from '@/components/common/TableSkeleton.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { timeAgo } from '@/utils/format.js'
import { Search, Plus, ShieldAlert, Eye, Pencil, KeyRound, UserCheck, UserX, Trash2, Archive, ArchiveRestore, ArrowUpDown } from 'lucide-react'

const PAGE_SIZE = 8
const REASON_ACTIONS = new Set(['deactivate','archive','delete'])

const schema = z.object({
  name: z.string().min(2,'Enter a full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  role: z.enum(['customer','staff','admin']),
  branch: z.string().optional(),
  confirmAdmin: z.boolean().optional(),
}).refine(d=>d.role!=='staff' || !!d.branch, { message:'Staff accounts need a branch', path:['branch'] })
  .refine(d=>d.role!=='admin' || d.confirmAdmin, { message:'Confirm this account should have full admin access', path:['confirmAdmin'] })

export default function ManageUsers(){
  const { user:me } = useAuth()
  const { data:users=[], loading, error, refetch } = useAsync(()=>UserAPI.list(),[])
  const { data:repairs=[] } = useAsync(()=>RepairAPI.list(),[])
  const { data:orders=[] } = useAsync(()=>OrderAPI.list(),[])
  const { data:tradeIns=[] } = useAsync(()=>TradeInAPI.list(),[])

  const [q,setQ]=useState(''); const [roleFilter,setRoleFilter]=useState(''); const [statusFilter,setStatusFilter]=useState('')
  const [sort,setSort]=useState({ key:'name', dir:1 })
  const [page,setPage]=useState(1)
  const [editing,setEditing]=useState(null)
  const [viewing,setViewing]=useState(null)
  const [target,setTarget]=useState(null) // {type, user}

  const canManage = canManageUsers(me?.role)
  const canReset = canResetPassword(me?.role)
  const meIsSuperAdmin = isSuperAdmin(me)

  const list = useMemo(()=>{
    let out = users.filter(u=>{
      if(roleFilter && u.role!==roleFilter) return false
      const status = u.archived ? 'archived' : (u.status||'active')
      if(statusFilter && status!==statusFilter) return false
      if(!statusFilter && u.archived) return false // archived hidden unless explicitly filtered for
      if(q.trim()){ const s=q.toLowerCase(); if(!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s)) return false }
      return true
    })
    out = [...out].sort((a,b)=>{
      const av = sort.key==='lastActiveAt' ? (a.lastActiveAt||0) : (a[sort.key]||'').toString().toLowerCase()
      const bv = sort.key==='lastActiveAt' ? (b.lastActiveAt||0) : (b[sort.key]||'').toString().toLowerCase()
      return av<bv ? -sort.dir : av>bv ? sort.dir : 0
    })
    return out
  },[users,q,roleFilter,statusFilter,sort])

  const toggleSort = (key)=>setSort(s=>s.key===key ? { key, dir:-s.dir } : { key, dir:1 })

  const totalPages = Math.max(1, Math.ceil(list.length/PAGE_SIZE))
  const pageItems = list.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const goToPage = (p)=>setPage(Math.min(Math.max(1,p),totalPages))

  const { register, handleSubmit, watch, reset, formState:{ errors } } = useForm({ resolver: zodResolver(schema), defaultValues:{ role:'customer', confirmAdmin:false } })
  const watchRole = watch('role')

  const openCreate = ()=>{ reset({ name:'', email:'', phone:'', role:'customer', branch:'', confirmAdmin:false }); setEditing({}) }
  const openEdit = (u)=>{ reset({ name:u.name, email:u.email, phone:u.phone||'', role:u.role, branch:u.branch||'', confirmAdmin:true }); setEditing(u) }

  const onSubmit = async (data)=>{
    try{
      if(editing?.id){
        const before = { ...editing }
        const updated = await UserAPI.update(editing.id, data)
        logAction({ user:me, action:'user.update', entityType:'user', entityId:editing.id, before, after:updated })
        if(data.role!==editing.role) logAction({ user:me, action:'user.role_change', entityType:'user', entityId:editing.id, before:{role:editing.role}, after:{role:data.role} })
        toast.success('Account updated')
      } else {
        const created = await UserAPI.create(data, me)
        logAction({ user:me, action:'user.create', entityType:'user', entityId:created.id, after:created })
        toast.success(`${data.role[0].toUpperCase()+data.role.slice(1)} account created`)
      }
      setEditing(null); refetch()
    } catch(e){ toast.error(e.message||'Could not save account') }
  }

  const runAction = async (reason)=>{
    const { type, user:u } = target
    try{
      if(type==='delete'){
        const result = await UserAPI.remove(u.id, { repairs, orders, tradeIns }, me)
        logAction({ user:me, action: result.deleted?'user.delete':'user.deactivate', entityType:'user', entityId:u.id, reason: reason || (result.deactivated?'Has repair/order/trade-in history — deactivated instead of deleted':undefined) })
        toast.success(result.deleted ? 'Account deleted' : 'Account has history — deactivated instead of deleted')
      } else if(type==='archive'){
        await UserAPI.archive(u.id, me)
        logAction({ user:me, action:'user.archive', entityType:'user', entityId:u.id, reason })
        toast.success(`${u.name} archived`)
      } else if(type==='restore'){
        await UserAPI.restore(u.id)
        logAction({ user:me, action:'user.restore', entityType:'user', entityId:u.id })
        toast.success(`${u.name} restored`)
      } else if(type==='reset'){
        const result = await UserAPI.resetPassword(u.id)
        logAction({ user:me, action:'user.password_reset_triggered', entityType:'user', entityId:u.id })
        toast.success(`Password reset link sent to ${result.email}`)
      } else {
        const status = type==='activate' ? 'active' : 'inactive'
        await UserAPI.setStatus(u.id, status, me)
        logAction({ user:me, action:'user.status_change', entityType:'user', entityId:u.id, before:{status:u.status}, after:{status}, reason })
        toast.success(`${u.name} ${status==='active'?'reactivated':'deactivated'}`)
      }
      setTarget(null); refetch()
    } catch(e){ toast.error(e.message||'Action failed') }
  }

  if(!canManage) return <div className="surface p-8 text-center text-graphite-400">You don't have permission to manage accounts.</div>

  const rowActions = (u)=>{
    const self = isSelf(me, u)
    const active = (u.status||'active')==='active'
    return [
      { key:'view', label:'View account', icon:Eye, onClick:()=>setViewing(u) },
      { key:'edit', label:'Edit', icon:Pencil, onClick:()=>openEdit(u), hidden:!!u.archived },
      { key:'reset', label:'Reset password', icon:KeyRound, onClick:()=>setTarget({type:'reset',user:u}), hidden:!canReset||!!u.archived },
      'separator',
      active
        ? { key:'deactivate', label:'Deactivate', icon:UserX, tone:'amber', onClick:()=>setTarget({type:'deactivate',user:u}), disabled:self, disabledReason:self?"Can't deactivate yourself":undefined, hidden:!!u.archived }
        : { key:'activate', label:'Activate', icon:UserCheck, tone:'emerald', onClick:()=>setTarget({type:'activate',user:u}), hidden:!!u.archived },
      u.archived
        ? { key:'restore', label:'Restore', icon:ArchiveRestore, tone:'emerald', onClick:()=>setTarget({type:'restore',user:u}) }
        : { key:'archive', label:'Archive', icon:Archive, onClick:()=>setTarget({type:'archive',user:u}), disabled:self, disabledReason:self?"Can't archive yourself":undefined },
      { key:'delete', label:'Delete permanently', icon:Trash2, tone:'rose', onClick:()=>setTarget({type:'delete',user:u}), disabled:self, disabledReason:self?"Can't delete yourself":undefined },
    ]
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Manage users</h1>
          <p className="text-graphite-400 text-[13px] mt-0.5">Platform login accounts and access — for customer business records, see Manage customers.</p>
        </div>
        <button onClick={openCreate} className="btn btn-brand btn-sm"><Plus size={15}/> Add account</button>
      </div>

      <div className="flex flex-wrap gap-3 my-4 items-center">
        <div className="flex items-center gap-2 input-field w-auto max-w-xs"><Search size={14} className="text-graphite-400"/><input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="Search name or email…" className="bg-transparent outline-none flex-1"/></div>
        <select value={roleFilter} onChange={e=>{setRoleFilter(e.target.value);setPage(1)}} className="input-field w-auto"><option value="">All roles</option><option value="customer">Customer</option><option value="staff">Staff</option><option value="admin">Admin</option></select>
        <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}} className="input-field w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
        <button onClick={()=>toggleSort('name')} className="btn btn-ghost btn-sm"><ArrowUpDown size={13}/> Name</button>
        <button onClick={()=>toggleSort('lastActiveAt')} className="btn btn-ghost btn-sm"><ArrowUpDown size={13}/> Last activity</button>
        <span className="text-[12.5px] text-graphite-400 mono-data">{list.length} of {users.length}</span>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch}/> : loading ? <TableSkeleton cols={7}/> : list.length===0 ? (
        <div className="surface p-2"><EmptyState title="No accounts match those filters" hint="Try clearing search or filters."/></div>
      ) : (<>
        <div className="hidden sm:block surface overflow-x-auto">
          <Table><thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Branch</Th><Th>Status</Th><Th>Last activity</Th><Th></Th></tr></thead>
          <tbody>{pageItems.map(u=>(
            <tr key={u.id} className="hover:bg-graphite-50">
              <Td className="font-semibold">{u.name}</Td>
              <Td className="text-graphite-500">{u.email}</Td>
              <Td><RoleBadge role={u.role} superAdmin={isSuperAdmin(u)}/></Td>
              <Td>{u.role==='staff' ? (BRANCHES.find(b=>b.id===u.branch)?.area?.split('—')[0]||'—') : '—'}</Td>
              <Td><StatusPill status={u.archived?'archived':(u.status||'active')}/></Td>
              <Td className="text-graphite-400 text-[12.5px] mono-data">{timeAgo(u.lastActiveAt)}</Td>
              <Td><RowActionsMenu actions={rowActions(u)} label={`Actions for ${u.name}`}/></Td>
            </tr>))}
          </tbody></Table>
        </div>

        <div className="sm:hidden space-y-3">
          {pageItems.map(u=>(
            <div key={u.id} className="surface p-4">
              <div className="flex items-start justify-between">
                <div><div className="font-semibold text-[14px]">{u.name}</div><div className="text-graphite-500 text-[12.5px]">{u.email}</div></div>
                <RowActionsMenu actions={rowActions(u)} label={`Actions for ${u.name}`}/>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <RoleBadge role={u.role} superAdmin={isSuperAdmin(u)}/>
                <StatusPill status={u.archived?'archived':(u.status||'active')}/>
                {u.role==='staff' && <span className="text-[11.5px] text-graphite-400">{BRANCHES.find(b=>b.id===u.branch)?.area?.split('—')[0]||'—'}</span>}
              </div>
              <div className="text-[11px] text-graphite-400 mono-data mt-2">Last active: {timeAgo(u.lastActiveAt)}</div>
            </div>
          ))}
        </div>
      </>)}

      {totalPages>1 && (
        <Pagination className="mt-5 justify-start">
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={()=>goToPage(page-1)} className={page===1?'pointer-events-none opacity-40':'cursor-pointer'}/></PaginationItem>
            {Array.from({length:totalPages}).map((_,i)=>(
              <PaginationItem key={i}><PaginationLink isActive={page===i+1} onClick={()=>goToPage(i+1)} className="cursor-pointer">{i+1}</PaginationLink></PaginationItem>
            ))}
            <PaginationItem><PaginationNext onClick={()=>goToPage(page+1)} className={page===totalPages?'pointer-events-none opacity-40':'cursor-pointer'}/></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <Dialog open={!!editing} onOpenChange={(o)=>!o&&setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id?`Edit ${editing.name}`:'Add account'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Full name</span><input {...register('name')} className="input-field mt-1.5"/>{errors.name&&<span className="text-[11.5px] text-red-500">{errors.name.message}</span>}</label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Email</span><input {...register('email')} className="input-field mt-1.5"/>{errors.email&&<span className="text-[11.5px] text-red-500">{errors.email.message}</span>}</label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Phone</span><input {...register('phone')} className="input-field mt-1.5"/></label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Role</span>
              <select {...register('role')} className="input-field mt-1.5">
                <option value="customer">Customer</option>
                <option value="staff">Staff</option>
                <option value="admin" disabled={!meIsSuperAdmin}>Admin{!meIsSuperAdmin?' (super admin only)':''}</option>
              </select></label>
            {watchRole==='staff' && (
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Branch</span>
                <select {...register('branch')} className="input-field mt-1.5"><option value="">— choose a branch —</option>{BRANCHES.map(b=><option key={b.id} value={b.id}>{b.area.split('—')[0]}</option>)}</select>
                {errors.branch&&<span className="text-[11.5px] text-red-500 block">{errors.branch.message}</span>}</label>
            )}
            {watchRole==='admin' && (
              meIsSuperAdmin ? (
                <label className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <input type="checkbox" {...register('confirmAdmin')} className="mt-0.5"/>
                  <span className="text-[12px] text-amber-800 flex items-start gap-1.5"><ShieldAlert size={14} className="flex-none mt-0.5"/> I confirm this person should have full admin access to every branch, customer and financial record.</span>
                </label>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[12px] text-rose-700 flex items-start gap-1.5"><ShieldAlert size={14} className="flex-none mt-0.5"/> Only a super admin can create or promote an admin account.</div>
              )
            )}
            {errors.confirmAdmin && <span className="text-[11.5px] text-red-500 block">{errors.confirmAdmin.message}</span>}
            <DialogFooter>
              <button type="button" onClick={()=>setEditing(null)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={watchRole==='admin' && !meIsSuperAdmin} className="btn btn-brand disabled:opacity-50">{editing?.id?'Save changes':'Create account'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {viewing && (
        <Dialog open={!!viewing} onOpenChange={(o)=>!o&&setViewing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{viewing.name}</DialogTitle></DialogHeader>
            <div className="space-y-2.5 text-[13.5px]">
              {[['Email',viewing.email],['Phone',viewing.phone||'—'],['Role',<RoleBadge key="r" role={viewing.role} superAdmin={isSuperAdmin(viewing)}/>],['Branch',viewing.role==='staff'?(BRANCHES.find(b=>b.id===viewing.branch)?.area?.split('—')[0]||'—'):'—'],['Status',<StatusPill key="s" status={viewing.archived?'archived':(viewing.status||'active')}/>],['Last activity',timeAgo(viewing.lastActiveAt)]].map(([k,v])=>(
                <div key={k} className="flex justify-between py-2 border-b border-graphite-100 last:border-0"><span className="text-graphite-400">{k}</span><span className="font-medium">{v}</span></div>
              ))}
            </div>
            <DialogFooter><button onClick={()=>setViewing(null)} className="btn btn-ghost">Close</button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {target && REASON_ACTIONS.has(target.type) && (
        <ReasonDialog
          open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='delete' ? `Permanently delete ${target.user.name}?` : target.type==='archive' ? `Archive ${target.user.name}?` : `Deactivate ${target.user.name}?`}
          description={
            target.type==='delete' ? 'If this account has any repairs, orders or trade-ins on record, it will be deactivated instead of deleted, to preserve that history.'
            : target.type==='archive' ? 'Archived accounts are hidden from normal lists but their history is preserved and this can be reversed.'
            : 'They will no longer be able to sign in. Their history is preserved and this can be reversed.'
          }
          confirmLabel={target.type==='delete'?'Delete permanently':target.type==='archive'?'Archive':'Deactivate'}
          onConfirm={runAction}
        />
      )}
      {target && !REASON_ACTIONS.has(target.type) && (
        <ConfirmDialog
          open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='activate' ? `Reactivate ${target.user.name}?` : target.type==='restore' ? `Restore ${target.user.name}?` : `Send a password reset to ${target.user.name}?`}
          description={
            target.type==='activate' ? 'They will regain access to sign in and use the platform.'
            : target.type==='restore' ? 'This account will reappear in normal account lists.'
            : "They will receive an email with a link to set a new password. Their current password is never shown or shared."
          }
          confirmLabel={target.type==='activate'?'Reactivate':target.type==='restore'?'Restore':'Send reset link'}
          destructive={false}
          onConfirm={()=>runAction()}
        />
      )}
    </div>
  )
}
