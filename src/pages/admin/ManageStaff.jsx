import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { UserAPI, RepairAPI, TradeInAPI, AuditAPI, AuthAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { canManageUsers, canManageSignInDetails, isSelf } from '@/lib/permissions.js'
import { suggestPassword, normaliseUsername } from '@/lib/password.js'
import { staffDeleteBlockers, staffActiveRepairs } from '@/lib/deletionRules.js'
import { logAction } from '@/services/auditService.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { StatusPill } from '@/components/common/AccountStatusBadge.jsx'
import { RowActionsMenu } from '@/components/common/RowActionsMenu.jsx'
import { SignInDetailsDialog } from '@/components/common/SignInDetailsDialog.jsx'
import { TableSkeleton } from '@/components/common/TableSkeleton.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { Search, Plus, Eye, Pencil, KeyRound, RefreshCw, UserCheck, UserX, Trash2, Archive, ArchiveRestore, MapPin, Briefcase, AlertTriangle } from 'lucide-react'

const PAGE_SIZE = 8
const SPECIALISATIONS = ['Phones','Laptops','MacBooks','Tablets','Audio','Wearables']
const REASON_ACTIONS = new Set(['archive','delete'])

const schema = z.object({
  name: z.string().min(2,'Enter a full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  branch: z.string().min(1,'Choose a branch'),
  jobTitle: z.string().optional(),
  branchManager: z.boolean().optional(),
  // Only meaningful when creating: a new staff account needs sign-in details or nobody can
  // use it. Editing an existing account leaves these blank and manages them from the
  // Sign-in details dialog instead, so a routine edit can never silently reset a password.
  username: z.string().optional(),
  password: z.string().optional(),
})

export default function ManageStaff(){
  const { user:me } = useAuth()
  const { data:users=[], loading, error, refetch } = useAsync(()=>UserAPI.list(),[])
  const { data:repairs=[] } = useAsync(()=>RepairAPI.list(),[])
  const { data:tradeIns=[] } = useAsync(()=>TradeInAPI.list(),[])
  const { data:auditLogs=[] } = useAsync(()=>AuditAPI.list(),[])
  const canManage = canManageUsers(me?.role)
  const canManageSignIn = canManageSignInDetails(me?.role)

  const [q,setQ]=useState(''); const [branchFilter,setBranchFilter]=useState(''); const [statusFilter,setStatusFilter]=useState('')
  const [page,setPage]=useState(1)
  const [editing,setEditing]=useState(null)
  const [viewing,setViewing]=useState(null)
  const [workloadFor,setWorkloadFor]=useState(null)
  const [target,setTarget]=useState(null) // {type, staff}
  const [deactivating,setDeactivating]=useState(null) // staff pending deactivation (may need reassignment)
  const [credentialsFor,setCredentialsFor]=useState(null) // staff whose sign-in details are open

  const staff = users.filter(u=>u.role==='staff')
  const list = useMemo(()=>staff.filter(s=>{
    if(branchFilter && s.branch!==branchFilter) return false
    const status = s.archived ? 'archived' : (s.status||'active')
    if(statusFilter && status!==statusFilter) return false
    if(!statusFilter && s.archived) return false
    if(q.trim()){ const t=q.toLowerCase(); if(!s.name.toLowerCase().includes(t) && !s.email.toLowerCase().includes(t)) return false }
    return true
  }),[staff,q,branchFilter,statusFilter])

  const totalPages = Math.max(1, Math.ceil(list.length/PAGE_SIZE))
  const pageItems = list.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const goToPage = (p)=>setPage(Math.min(Math.max(1,p),totalPages))

  const { register, handleSubmit, reset, watch, setValue, formState:{ errors } } = useForm({ resolver: zodResolver(schema) })

  // A starting password is generated rather than left to be typed, because the alternative in
  // practice is the same memorable word for every new starter.
  const openCreate = ()=>{ reset({ name:'', email:'', phone:'', branch:BRANCHES[0].id, jobTitle:'', branchManager:false, username:'', password:suggestPassword() }); setEditing({ specialisations:[] }) }
  const openEdit = (s)=>{ reset({ name:s.name, email:s.email, phone:s.phone||'', branch:s.branch||'', jobTitle:s.jobTitle||'', branchManager:!!s.branchManager, username:'', password:'' }); setEditing(s) }
  const suggestUsername = ()=>{
    const parts = String(watch('name')||'').trim().toLowerCase().split(/\s+/).filter(Boolean)
    if(parts.length) setValue('username', normaliseUsername(parts.slice(0,2).join('.')))
  }
  const [specSelection,setSpecSelection]=useState([])
  const toggleSpec = (v)=>setSpecSelection(sel=>sel.includes(v)?sel.filter(x=>x!==v):[...sel,v])

  const onSubmit = async (data)=>{
    try{
      const payload = { ...data, specialisations: specSelection }
      if(editing?.id){
        const before = { branch:editing.branch }
        const updated = await UserAPI.update(editing.id, payload)
        if(data.branch!==editing.branch) logAction({ user:me, action:'staff.branch_change', entityType:'user', entityId:editing.id, before, after:{branch:data.branch} })
        logAction({ user:me, action:'staff.update', entityType:'user', entityId:editing.id, after:updated })
        toast.success('Staff account updated')
      } else {
        if(!data.username?.trim()) { toast.error('Give this account a username — staff sign in with one, not an email.'); return }
        if(!data.password?.trim()) { toast.error('Set a starting password for this account.'); return }
        const { username, password, ...profile } = payload
        const created = await UserAPI.create({ ...profile, role:'staff' }, me)
        // Sign-in details are issued straight after the account, so a staff record can never
        // sit in the list looking usable while having no way to sign in. mustChange is on:
        // the admin knows this password, so the holder replaces it on first use.
        try{
          await AuthAPI.issueCredentials(created.id, { username: username.trim(), password: password.trim(), mustChange:true })
        }catch(credErr){
          toast.error(`Account created, but its sign-in details were not: ${credErr.message}`)
          setEditing(null); refetch(); setCredentialsFor(created); return
        }
        logAction({ user:me, action:'staff.create', entityType:'user', entityId:created.id, after:created })
        toast.success(`Staff account created — username ${username.trim()}`)
      }
      setEditing(null); refetch()
    } catch(e){ toast.error(e.message||'Could not save staff account') }
  }

  const startDeactivate = (s)=>{
    const active = staffActiveRepairs(s, repairs)
    if(active.length>0) setDeactivating({ staff:s, active })
    else setTarget({ type:'deactivate', staff:s })
  }

  const runAction = async (reason)=>{
    const { type, staff:s } = target
    try{
      if(type==='delete'){
        const blockers = staffDeleteBlockers(s, { repairs, tradeIns, auditLogs })
        const result = await UserAPI.remove(s.id, { blockers }, me)
        logAction({ user:me, action: result.deleted?'user.delete':'user.deactivate', entityType:'user', entityId:s.id, reason })
        toast.success(result.deleted ? 'Staff account deleted' : 'Staff has activity on record — deactivated instead')
      } else if(type==='archive'){
        await UserAPI.archive(s.id, me)
        logAction({ user:me, action:'user.archive', entityType:'user', entityId:s.id, reason })
        toast.success(`${s.name} archived`)
      } else if(type==='restore'){
        await UserAPI.restore(s.id)
        logAction({ user:me, action:'user.restore', entityType:'user', entityId:s.id })
        toast.success(`${s.name} restored`)
      } else if(type==='activate'){
        await UserAPI.setStatus(s.id, 'active', me)
        logAction({ user:me, action:'user.status_change', entityType:'user', entityId:s.id, after:{status:'active'} })
        toast.success(`${s.name} reactivated`)
      } else if(type==='deactivate'){
        await UserAPI.setStatus(s.id, 'inactive', me)
        logAction({ user:me, action:'user.status_change', entityType:'user', entityId:s.id, after:{status:'inactive'}, reason })
        toast.success(`${s.name} deactivated`)
      }
      setTarget(null); refetch()
    } catch(e){ toast.error(e.message||'Action failed') }
  }

  const confirmDeactivateWithReassign = async ({ reassignTo, reason })=>{
    try{
      for(const r of deactivating.active){
        await RepairAPI.update(r.ref, { tech: reassignTo })
        logAction({ user:me, action:'repair.reassign', entityType:'repair', entityId:r.ref, before:{tech:deactivating.staff.id}, after:{tech:reassignTo}, reason:'Technician deactivated' })
      }
      await UserAPI.setStatus(deactivating.staff.id, 'inactive', me)
      logAction({ user:me, action:'user.status_change', entityType:'user', entityId:deactivating.staff.id, after:{status:'inactive'}, reason })
      toast.success(`${deactivating.staff.name} deactivated, ${deactivating.active.length} repair(s) reassigned`)
      setDeactivating(null); refetch()
    } catch(e){ toast.error(e.message||'Could not deactivate staff member') }
  }

  if(!canManage && !error) { /* still render read-only workload view for lower roles if ever reused */ }

  const rowActions = (s)=>{
    const self = isSelf(me, s)
    const active = (s.status||'active')==='active'
    return [
      { key:'view', label:'View staff', icon:Eye, onClick:()=>setViewing(s) },
      { key:'edit', label:'Edit staff', icon:Pencil, onClick:()=>{ openEdit(s); setSpecSelection(s.specialisations||[]) }, hidden:!!s.archived },
      { key:'workload', label:'View workload', icon:Briefcase, onClick:()=>setWorkloadFor(s) },
      { key:'signin', label:'Sign-in details', icon:KeyRound, onClick:()=>setCredentialsFor(s), hidden:!canManageSignIn||!!s.archived },
      'separator',
      active
        ? { key:'deactivate', label:'Deactivate', icon:UserX, tone:'amber', onClick:()=>startDeactivate(s), disabled:self, disabledReason:self?"Can't deactivate yourself":undefined, hidden:!!s.archived }
        : { key:'activate', label:'Activate', icon:UserCheck, tone:'emerald', onClick:()=>setTarget({type:'activate',staff:s}), hidden:!!s.archived },
      s.archived
        ? { key:'restore', label:'Restore', icon:ArchiveRestore, tone:'emerald', onClick:()=>setTarget({type:'restore',staff:s}) }
        : { key:'archive', label:'Archive', icon:Archive, onClick:()=>setTarget({type:'archive',staff:s}), disabled:self, disabledReason:self?"Can't archive yourself":undefined },
      { key:'delete', label:'Delete permanently', icon:Trash2, tone:'rose', onClick:()=>setTarget({type:'delete',staff:s}), disabled:self, disabledReason:self?"Can't delete yourself":undefined },
    ]
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Manage staff</h1><p className="text-graphite-400 text-[13px] mt-0.5">Technicians, branch assignment, specialisations and workload.</p></div>
        {canManage && <button onClick={openCreate} className="btn btn-brand btn-sm"><Plus size={15}/> Add staff</button>}
      </div>

      <div className="flex flex-wrap gap-3 my-4 items-center">
        <div className="flex items-center gap-2 input-field w-auto max-w-xs"><Search size={14} className="text-graphite-400"/><input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="Search name or email…" className="bg-transparent outline-none flex-1"/></div>
        <select value={branchFilter} onChange={e=>{setBranchFilter(e.target.value);setPage(1)}} className="input-field w-auto"><option value="">All branches</option>{BRANCHES.map(b=><option key={b.id} value={b.id}>{b.area.split('—')[0]}</option>)}</select>
        <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}} className="input-field w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
        <span className="text-[12.5px] text-graphite-400 mono-data">{list.length} of {staff.length}</span>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch}/> : loading ? <TableSkeleton cols={6}/> : list.length===0 ? (
        <div className="surface p-2"><EmptyState title="No staff match those filters" hint="Try clearing search or filters."/></div>
      ) : (<>
        <div className="hidden sm:block surface overflow-x-auto">
          <Table><thead><tr><Th>Staff member</Th><Th>Job title</Th><Th>Branch</Th><Th>Active jobs</Th><Th>Status</Th><Th></Th></tr></thead>
          <tbody>{pageItems.map(s=>{
            const jobs = staffActiveRepairs(s, repairs).length
            return (
              <tr key={s.id} className="hover:bg-graphite-50">
                <Td className="font-semibold">{s.name}<div className="text-[11.5px] text-graphite-400 font-normal">{s.email}</div></Td>
                <Td>{s.jobTitle||'Technician'}</Td>
                <Td>{BRANCHES.find(b=>b.id===s.branch)?.area?.split('—')[0]||'—'}</Td>
                <Td className="mono-data">{jobs}</Td>
                <Td><StatusPill status={s.archived?'archived':(s.status||'active')}/></Td>
                <Td><RowActionsMenu actions={rowActions(s)} label={`Actions for ${s.name}`}/></Td>
              </tr>
            )
          })}</tbody></Table>
        </div>

        <div className="sm:hidden space-y-3">
          {pageItems.map(s=>(
            <div key={s.id} className="surface p-4">
              <div className="flex items-start justify-between">
                <div><div className="font-semibold text-[14px]">{s.name}</div><div className="text-graphite-500 text-[12.5px]">{s.jobTitle||'Technician'}</div></div>
                <RowActionsMenu actions={rowActions(s)} label={`Actions for ${s.name}`}/>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <StatusPill status={s.archived?'archived':(s.status||'active')}/>
                <span className="text-[11.5px] text-graphite-400 flex items-center gap-1"><MapPin size={11}/>{BRANCHES.find(b=>b.id===s.branch)?.area?.split('—')[0]||'—'}</span>
                <span className="text-[11.5px] text-graphite-400 mono-data">{staffActiveRepairs(s, repairs).length} active jobs</span>
              </div>
            </div>
          ))}
        </div>
      </>)}

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o)=>!o&&setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id?`Edit ${editing.name}`:'Add staff'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Full name</span><input {...register('name')} className="input-field mt-1.5"/>{errors.name&&<span className="text-[11.5px] text-red-500">{errors.name.message}</span>}</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Email</span><input {...register('email')} className="input-field mt-1.5"/>{errors.email&&<span className="text-[11.5px] text-red-500">{errors.email.message}</span>}</label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Phone</span><input {...register('phone')} className="input-field mt-1.5"/></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Branch</span>
                <select {...register('branch')} className="input-field mt-1.5">{BRANCHES.map(b=><option key={b.id} value={b.id}>{b.area.split('—')[0]}</option>)}</select>
                {errors.branch&&<span className="text-[11.5px] text-red-500 block">{errors.branch.message}</span>}</label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Job title</span><input {...register('jobTitle')} placeholder="Repair technician" className="input-field mt-1.5"/></label>
            </div>
            <div>
              <span className="text-[12.5px] font-semibold text-graphite-600 block mb-1.5">Repair specialisations</span>
              <div className="flex flex-wrap gap-2">
                {SPECIALISATIONS.map(v=>(
                  <button key={v} type="button" onClick={()=>toggleSpec(v)} className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border ${specSelection.includes(v)?'bg-brand text-white border-brand':'border-graphite-200 text-graphite-600'}`}>{v}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2.5"><input type="checkbox" {...register('branchManager')}/><span className="text-[12.5px] font-semibold text-graphite-600">Branch manager permissions</span></label>

            {/* Sign-in details, only when creating. Staff are issued a username and a starting
                password here — an existing account's details are changed from the Sign-in
                details dialog, so editing a job title can never reset somebody's password. */}
            {!editing?.id && (
              <div className="border-t border-graphite-100 pt-3.5">
                <div className="text-[12.5px] font-semibold text-graphite-600">Sign-in details</div>
                <p className="text-[11.5px] text-graphite-400 mt-0.5 mb-2.5">
                  They sign in with this username, not their email. They will be asked to set
                  their own password the first time — until then, you know it too.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Username</span>
                    <div className="flex gap-2 mt-1.5">
                      <input {...register('username')} placeholder="priya.shah" className="input-field flex-1"/>
                      <button type="button" onClick={suggestUsername} className="btn btn-ghost btn-sm flex-none">From name</button>
                    </div></label>
                  <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Starting password</span>
                    <div className="flex gap-2 mt-1.5">
                      <input {...register('password')} className="input-field flex-1 mono-data"/>
                      <button type="button" onClick={()=>setValue('password', suggestPassword())} title="Generate another" className="btn btn-ghost btn-sm flex-none"><RefreshCw size={14}/></button>
                    </div></label>
                </div>
              </div>
            )}

            <DialogFooter>
              <button type="button" onClick={()=>setEditing(null)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-brand">{editing?.id?'Save changes':'Create staff account'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View staff */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={(o)=>!o&&setViewing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{viewing.name}</DialogTitle></DialogHeader>
            <div className="space-y-2.5 text-[13.5px]">
              {[['Email',viewing.email],['Phone',viewing.phone||'—'],['Job title',viewing.jobTitle||'Technician'],['Branch',BRANCHES.find(b=>b.id===viewing.branch)?.area?.split('—')[0]||'—'],['Specialisations',(viewing.specialisations||[]).join(', ')||'—'],['Permissions',viewing.branchManager?'Branch manager':'Standard staff'],['Status',<StatusPill key="s" status={viewing.archived?'archived':(viewing.status||'active')}/>]].map(([k,v])=>(
                <div key={k} className="flex justify-between py-2 border-b border-graphite-100 last:border-0"><span className="text-graphite-400">{k}</span><span className="font-medium">{v}</span></div>
              ))}
            </div>
            <DialogFooter><button onClick={()=>setViewing(null)} className="btn btn-ghost">Close</button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Workload */}
      {workloadFor && (
        <Dialog open={!!workloadFor} onOpenChange={(o)=>!o&&setWorkloadFor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{workloadFor.name}'s workload</DialogTitle></DialogHeader>
            {(()=>{
              const mine = repairs.filter(r=>r.tech===workloadFor.id)
              const active = mine.filter(r=>!['Completed','Cancelled'].includes(r.status))
              const completed = mine.filter(r=>r.status==='Completed')
              return (
                <div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bento-tile p-3 text-center"><div className="text-xl font-extrabold mono-data">{mine.length}</div><div className="text-[11px] text-graphite-400">Total</div></div>
                    <div className="bento-tile p-3 text-center"><div className="text-xl font-extrabold mono-data text-brand">{active.length}</div><div className="text-[11px] text-graphite-400">Active</div></div>
                    <div className="bento-tile p-3 text-center"><div className="text-xl font-extrabold mono-data text-emerald-600">{completed.length}</div><div className="text-[11px] text-graphite-400">Completed</div></div>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-graphite-100">
                    {mine.map(r=><div key={r.ref} className="flex justify-between py-2 text-[13px]"><span>{r.ref} · {r.brand} {r.model}</span><span className="text-graphite-400">{r.status}</span></div>)}
                    {mine.length===0 && <div className="text-[12.5px] text-graphite-400 py-4 text-center">No repair assignments yet.</div>}
                  </div>
                </div>
              )
            })()}
            <DialogFooter><button onClick={()=>setWorkloadFor(null)} className="btn btn-ghost">Close</button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Deactivate-with-reassignment warning */}
      {deactivating && (
        <DeactivateWithReassignDialog
          staff={deactivating.staff} activeRepairs={deactivating.active}
          otherStaff={staff.filter(s=>s.id!==deactivating.staff.id && (s.status||'active')==='active' && !s.archived)}
          onCancel={()=>setDeactivating(null)} onConfirm={confirmDeactivateWithReassign}/>
      )}

      {target && REASON_ACTIONS.has(target.type) && (
        <ReasonDialog
          open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='delete' ? `Permanently delete ${target.staff.name}?` : `Archive ${target.staff.name}?`}
          description={target.type==='delete' ? 'If this staff member has repair assignments, trade-in inspections or audit history, they will be deactivated instead of deleted.' : 'Archived staff are hidden from normal lists but their history is preserved and this can be reversed.'}
          confirmLabel={target.type==='delete'?'Delete permanently':'Archive'}
          onConfirm={runAction}/>
      )}
      {target && target.type==='deactivate' && (
        <ReasonDialog
          open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={`Deactivate ${target.staff.name}?`} description="They will no longer be able to sign in. Existing history is preserved."
          confirmLabel="Deactivate" onConfirm={runAction}/>
      )}
      {credentialsFor && (
        <SignInDetailsDialog target={credentialsFor} me={me} onClose={()=>{ setCredentialsFor(null); refetch() }}/>
      )}

      {target && (target.type==='activate'||target.type==='restore') && (
        <ConfirmDialog
          open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='activate' ? `Reactivate ${target.staff.name}?` : `Restore ${target.staff.name}?`}
          description={target.type==='activate' ? 'They will regain access to sign in.' : 'This account will reappear in normal staff lists.'}
          confirmLabel={target.type==='activate'?'Reactivate':'Restore'}
          destructive={false} onConfirm={()=>runAction()}/>
      )}
    </div>
  )
}

function DeactivateWithReassignDialog({ staff, activeRepairs, otherStaff, onCancel, onConfirm }){
  const [reassignTo,setReassignTo]=useState(otherStaff[0]?.id||'')
  const [reason,setReason]=useState('')
  const [busy,setBusy]=useState(false)
  const valid = reason.trim().length>=6 && (otherStaff.length===0 || reassignTo)

  const submit = async ()=>{
    if(!valid) return
    setBusy(true)
    try{ await onConfirm({ reassignTo: reassignTo||null, reason: reason.trim() }) } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={(o)=>!o&&onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Deactivate {staff.name}?</DialogTitle></DialogHeader>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-[12.5px] text-amber-800">
          <AlertTriangle size={16} className="flex-none mt-0.5"/>
          <span>{staff.name} has {activeRepairs.length} active repair{activeRepairs.length===1?'':'s'}. Reassign them to another technician before deactivating.</span>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1.5 my-3">
          {activeRepairs.map(r=><div key={r.ref} className="text-[12.5px] flex justify-between bg-graphite-50 rounded-lg px-3 py-2"><span>{r.ref} · {r.brand} {r.model}</span><span className="text-graphite-400">{r.status}</span></div>)}
        </div>
        {otherStaff.length>0 ? (
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Reassign to</span>
            <select value={reassignTo} onChange={e=>setReassignTo(e.target.value)} className="input-field mt-1.5">{otherStaff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        ) : (
          <p className="text-[12px] text-rose-600">No other active staff available to reassign to — add or activate another technician first.</p>
        )}
        <label className="block mt-3"><span className="text-[12.5px] font-semibold text-graphite-600">Reason (required)</span>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} className="input-field mt-1.5 h-auto py-2" placeholder="Explain why — recorded on the audit log."/></label>
        <DialogFooter>
          <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
          <button onClick={submit} disabled={!valid||busy||otherStaff.length===0} className="btn bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">{busy?'Saving…':'Reassign & deactivate'}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
