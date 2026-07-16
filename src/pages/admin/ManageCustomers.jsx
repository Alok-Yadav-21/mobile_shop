import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI, OrderAPI, UserAPI, TradeInAPI, AddressAPI, WarrantyAPI, NotificationAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { can, isSelf } from '@/lib/permissions.js'
import { customerDeleteBlockers } from '@/lib/deletionRules.js'
import { logAction } from '@/services/auditService.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { StatusPill } from '@/components/common/AccountStatusBadge.jsx'
import { RowActionsMenu } from '@/components/common/RowActionsMenu.jsx'
import { TableSkeleton } from '@/components/common/TableSkeleton.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { money } from '@/utils/format.js'
import { ChevronLeft, StickyNote, Wrench, Search, Eye, Pencil, Bell, UserX, UserCheck, Trash2, Archive, ArchiveRestore, MapPin, ShieldCheck, MessageSquare } from 'lucide-react'

const PAGE_SIZE = 8
const REASON_ACTIONS = new Set(['deactivate','archive','delete'])

const editSchema = z.object({
  name: z.string().min(2,'Enter a full name'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().min(6,'Enter a valid phone number'),
})

export default function ManageCustomers(){
  const { user:me } = useAuth()
  const { data:repairs=[] } = useAsync(()=>RepairAPI.list(),[])
  const { data:orders=[] } = useAsync(()=>OrderAPI.list(),[])
  const { data:tradeIns=[] } = useAsync(()=>TradeInAPI.list(),[])
  const { data:users=[], loading, error, refetch } = useAsync(()=>UserAPI.list(),[])
  const [selected,setSelected]=useState(null)
  const [q,setQ]=useState(''); const [statusFilter,setStatusFilter]=useState(''); const [page,setPage]=useState(1)
  const canManage = can(me?.role,'manageCustomers')

  const byPhone = new Map()
  repairs.forEach(r=>{
    if(!r.phone) return
    if(!byPhone.has(r.phone)) byPhone.set(r.phone, { name:r.customer, phone:r.phone, email:r.email, repairs:0, spend:0 })
    const c = byPhone.get(r.phone); c.repairs++; if(r.status==='Completed') c.spend += r.quote||0
  })
  users.filter(u=>u.role==='customer').forEach(u=>{
    if(!byPhone.has(u.phone)) byPhone.set(u.phone, { name:u.name, phone:u.phone, email:u.email, repairs:0, spend:0 })
    const c = byPhone.get(u.phone); c.id = u.id; c.status = u.status||'active'; c.archived = !!u.archived
  })
  orders.forEach(o=>{
    const match = [...byPhone.values()].find(c=>c.email===o.email)
    if(match) match.spend += o.total||0
  })
  tradeIns.forEach(t=>{
    const match = [...byPhone.values()].find(c=>c.id===t.customerId)
    if(match) match.tradeIns = (match.tradeIns||0)+1
  })

  const allCustomers = [...byPhone.values()]
  const customers = useMemo(()=>allCustomers.filter(c=>{
    const status = c.archived ? 'archived' : (c.status||'active')
    if(statusFilter && status!==statusFilter) return false
    if(!statusFilter && c.archived) return false
    if(q.trim()){ const s=q.toLowerCase(); if(!c.name.toLowerCase().includes(s) && !c.phone.includes(s) && !(c.email||'').toLowerCase().includes(s)) return false }
    return true
  }),[allCustomers,q,statusFilter])

  const totalPages = Math.max(1, Math.ceil(customers.length/PAGE_SIZE))
  const pageItems = customers.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const goToPage = (p)=>setPage(Math.min(Math.max(1,p),totalPages))

  if(selected){
    const fresh = allCustomers.find(c=>c.phone===selected.phone) || selected
    return <CustomerDetail c={fresh} me={me} repairs={repairs} orders={orders} tradeIns={tradeIns} onBack={()=>setSelected(null)} canManage={canManage} refetch={refetch}/>
  }

  const rowActions = (c)=>{
    const status = c.archived ? 'archived' : (c.status||'active')
    const self = c.id && isSelf(me, { id:c.id })
    const hasHistory = c.repairs>0 || (c.tradeIns||0)>0 || customerDeleteBlockers(c, { repairs, orders, tradeIns }).length>0
    return [
      { key:'view', label:'View customer', icon:Eye, onClick:()=>setSelected(c) },
      { key:'edit', label:'Edit customer', icon:Pencil, onClick:()=>setSelected(c), hidden:!c.id },
      'separator',
      status==='active'
        ? { key:'deactivate', label:'Deactivate', icon:UserX, tone:'amber', onClick:()=>setSelected(c), hidden:!c.id||self }
        : status!=='archived' && { key:'activate', label:'Activate', icon:UserCheck, tone:'emerald', onClick:()=>setSelected(c), hidden:!c.id },
      status==='archived'
        ? { key:'restore', label:'Restore', icon:ArchiveRestore, tone:'emerald', onClick:()=>setSelected(c), hidden:!c.id }
        : { key:'archive', label:'Archive', icon:Archive, onClick:()=>setSelected(c), hidden:!c.id||self },
      { key:'delete', label:'Delete permanently', icon:Trash2, tone:'rose', onClick:()=>setSelected(c), hidden:!c.id||self||hasHistory, disabledReason:hasHistory?'Has business history':undefined },
    ].filter(Boolean)
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Manage customers</h1>
      <p className="text-graphite-400 text-[14px] mb-6">Customer business records — profile, repairs, orders, trade-ins and communication.</p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex items-center gap-2 input-field w-auto max-w-xs"><Search size={14} className="text-graphite-400"/><input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="Search name, phone or email…" className="bg-transparent outline-none flex-1"/></div>
        <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}} className="input-field w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select>
        <span className="text-[12.5px] text-graphite-400 mono-data">{customers.length} of {allCustomers.length}</span>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch}/> : loading ? <TableSkeleton cols={7}/> : customers.length===0 ? (
        <div className="surface p-2"><EmptyState title="No customers match those filters" hint="Try clearing search or filters."/></div>
      ) : (<>
        <div className="hidden sm:block surface overflow-x-auto">
          <Table><thead><tr><Th>Customer</Th><Th>Contact</Th><Th>Repairs</Th><Th>Trade-ins</Th><Th>Lifetime value</Th><Th>Status</Th><Th></Th></tr></thead>
          <tbody>{pageItems.map(c=>(
            <tr key={c.phone} className="hover:bg-graphite-50">
              <Td className="font-semibold cursor-pointer" onClick={()=>setSelected(c)}>{c.name}</Td>
              <Td className="text-graphite-500">{c.phone}{c.email?` · ${c.email}`:''}</Td>
              <Td className="mono-data">{c.repairs}</Td>
              <Td className="mono-data">{c.tradeIns||0}</Td>
              <Td className="mono-data font-semibold">{money(c.spend)}</Td>
              <Td><StatusPill status={c.archived?'archived':(c.status||'active')}/></Td>
              <Td><RowActionsMenu actions={rowActions(c)} label={`Actions for ${c.name}`}/></Td>
            </tr>))}
          </tbody></Table>
        </div>

        <div className="sm:hidden space-y-3">
          {pageItems.map(c=>(
            <div key={c.phone} className="surface p-4" onClick={()=>setSelected(c)}>
              <div className="flex items-start justify-between">
                <div><div className="font-semibold text-[14px]">{c.name}</div><div className="text-graphite-500 text-[12.5px]">{c.phone}</div></div>
                <div onClick={e=>e.stopPropagation()}><RowActionsMenu actions={rowActions(c)} label={`Actions for ${c.name}`}/></div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-[12px] text-graphite-500">
                <span className="mono-data">{c.repairs} repairs</span>
                <span className="mono-data font-semibold">{money(c.spend)}</span>
                <StatusPill status={c.archived?'archived':(c.status||'active')}/>
              </div>
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
    </div>
  )
}

function CustomerDetail({ c, me, repairs, orders, tradeIns, onBack, canManage, refetch }){
  const { data:notes=[], refetch:refetchNotes } = useAsync(()=>c.id ? UserAPI.listNotes(c.id) : Promise.resolve([]),[c.id])
  const { data:addresses=[] } = useAsync(()=>c.id ? AddressAPI.list(c.id) : Promise.resolve([]),[c.id])
  const { data:warranties=[] } = useAsync(()=>c.id ? WarrantyAPI.list(c.id) : Promise.resolve([]),[c.id])
  const { data:notifications=[] } = useAsync(()=>c.id ? NotificationAPI.list(c.id) : Promise.resolve([]),[c.id])
  const [note,setNote]=useState('')
  const [target,setTarget]=useState(null) // {type}
  const [editing,setEditing]=useState(false)
  const [bookOpen,setBookOpen]=useState(false)
  const [notifyOpen,setNotifyOpen]=useState(false)

  const custRepairs = repairs.filter(r=>r.phone===c.phone)
  const custOrders = orders.filter(o=>o.email===c.email)
  const custTradeIns = tradeIns.filter(t=>t.customerId===c.id)
  const activeRepairs = custRepairs.filter(r=>!['Completed','Cancelled'].includes(r.status))
  const blockers = customerDeleteBlockers(c, { repairs, orders, tradeIns })
  const selfRecord = c.id && isSelf(me, { id:c.id })
  const status = c.archived ? 'archived' : (c.status||'active')

  const { register, handleSubmit, reset, formState:{ errors } } = useForm({ resolver: zodResolver(editSchema), defaultValues:{ name:c.name, email:c.email||'', phone:c.phone } })
  const openEdit = ()=>{ reset({ name:c.name, email:c.email||'', phone:c.phone }); setEditing(true) }
  const saveEdit = async (data)=>{
    if(!c.id){ toast.error('This customer has no account yet — nothing to edit.'); return }
    await UserAPI.update(c.id, data)
    logAction({ user:me, action:'customer.update', entityType:'user', entityId:c.id, after:data })
    toast.success('Customer details updated')
    setEditing(false); refetch()
  }

  const addNote = async ()=>{
    if(!note.trim()) return
    await UserAPI.addNote(c.id, { text:note.trim(), authorId:me?.id })
    logAction({ user:me, action:'customer.note_add', entityType:'user', entityId:c.id })
    setNote(''); refetchNotes(); toast.success('Note added')
  }

  const runAction = async (reason)=>{
    const { type } = target
    try{
      if(type==='delete'){
        const result = await UserAPI.remove(c.id, { repairs, orders, tradeIns }, me)
        logAction({ user:me, action: result.deleted?'user.delete':'user.deactivate', entityType:'user', entityId:c.id, reason })
        toast.success(result.deleted ? 'Draft account deleted' : 'Account has history — deactivated instead')
        setTarget(null); onBack(); refetch()
        return
      }
      if(type==='archive'){ await UserAPI.archive(c.id, me); logAction({ user:me, action:'user.archive', entityType:'user', entityId:c.id, reason }); toast.success(`${c.name} archived`) }
      else if(type==='restore'){ await UserAPI.restore(c.id); logAction({ user:me, action:'user.restore', entityType:'user', entityId:c.id }); toast.success(`${c.name} restored`) }
      else { const next = type==='activate'?'active':'inactive'; await UserAPI.setStatus(c.id, next, me); logAction({ user:me, action:'user.status_change', entityType:'user', entityId:c.id, after:{status:next}, reason }); toast.success(`${c.name} ${next==='active'?'reactivated':'deactivated'}`) }
      setTarget(null); refetch()
    } catch(e){ toast.error(e.message||'Action failed') }
  }

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-graphite-400 hover:text-brand mb-4"><ChevronLeft size={15}/> All customers</button>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight">{c.name}</h1>
            <StatusPill status={status}/>
          </div>
          <p className="text-graphite-400 text-[13.5px]">{c.phone}{c.email?` · ${c.email}`:''}</p>
        </div>
        {canManage && c.id && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={openEdit} className="btn btn-ghost btn-sm"><Pencil size={14}/> Edit</button>
            <button onClick={()=>setNotifyOpen(true)} className="btn btn-ghost btn-sm"><Bell size={14}/> Notify</button>
            <button onClick={()=>setBookOpen(true)} className="btn btn-ghost btn-sm"><Wrench size={14}/> Book repair</button>
            {status==='active' && <button disabled={selfRecord} onClick={()=>setTarget({type:'deactivate'})} className="btn btn-ghost btn-sm text-amber-600 disabled:opacity-50"><UserX size={14}/> Deactivate</button>}
            {status==='inactive' && <button onClick={()=>setTarget({type:'activate'})} className="btn btn-brand btn-sm"><UserCheck size={14}/> Reactivate</button>}
            {status!=='archived' && <button disabled={selfRecord} onClick={()=>setTarget({type:'archive'})} className="btn btn-ghost btn-sm disabled:opacity-50"><Archive size={14}/> Archive</button>}
            {status==='archived' && <button onClick={()=>setTarget({type:'restore'})} className="btn btn-brand btn-sm"><ArchiveRestore size={14}/> Restore</button>}
            {blockers.length===0 && <button disabled={selfRecord} onClick={()=>setTarget({type:'delete'})} className="btn btn-ghost btn-sm text-rose-600 disabled:opacity-50"><Trash2 size={14}/> Delete</button>}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bento-tile"><div className="text-[11px] uppercase tracking-wide text-graphite-400 font-bold">Active repairs</div><div className="text-2xl font-extrabold mono-data mt-1">{activeRepairs.length}</div></div>
        <div className="bento-tile"><div className="text-[11px] uppercase tracking-wide text-graphite-400 font-bold">Lifetime value</div><div className="text-2xl font-extrabold mono-data mt-1">{money(c.spend)}</div></div>
        <div className="bento-tile"><div className="text-[11px] uppercase tracking-wide text-graphite-400 font-bold">Trade-ins</div><div className="text-2xl font-extrabold mono-data mt-1">{custTradeIns.length}</div></div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div>
            <h2 className="font-bold text-[14px] mb-3">Repair history ({custRepairs.length})</h2>
            <div className="surface divide-y divide-graphite-200">
              {custRepairs.map(r=><div key={r.ref} className="px-4 py-3 text-[13px] flex justify-between"><span>{r.ref} · {r.brand} {r.model}</span><span className="text-graphite-400">{r.status}</span></div>)}
              {custRepairs.length===0 && <div className="px-4 py-6 text-center text-graphite-400 text-[13px]">No repairs.</div>}
            </div>
          </div>
          <div>
            <h2 className="font-bold text-[14px] mb-3">Orders ({custOrders.length})</h2>
            <div className="surface divide-y divide-graphite-200">
              {custOrders.map(o=><div key={o.reference} className="px-4 py-3 text-[13px] flex justify-between"><span>{o.reference}</span><span className="mono-data">{money(o.total)}</span></div>)}
              {custOrders.length===0 && <div className="px-4 py-6 text-center text-graphite-400 text-[13px]">No orders.</div>}
            </div>
          </div>
          <div>
            <h2 className="font-bold text-[14px] mb-3">Trade-ins ({custTradeIns.length})</h2>
            <div className="surface divide-y divide-graphite-200">
              {custTradeIns.map(t=><div key={t.reference} className="px-4 py-3 text-[13px] flex justify-between"><span>{t.reference} · {t.brand} {t.model}</span><span className="text-graphite-400">{t.status}</span></div>)}
              {custTradeIns.length===0 && <div className="px-4 py-6 text-center text-graphite-400 text-[13px]">No trade-ins.</div>}
            </div>
          </div>
          <div>
            <h2 className="font-bold text-[14px] mb-3 flex items-center gap-1.5"><ShieldCheck size={15}/> Warranties ({warranties.length})</h2>
            <div className="surface divide-y divide-graphite-200">
              {warranties.map(w=><div key={w.id} className="px-4 py-3 text-[13px] flex justify-between"><span>{w.months} months</span><span className="text-graphite-400">Expires {w.expires_at||w.expiresAt}</span></div>)}
              {warranties.length===0 && <div className="px-4 py-6 text-center text-graphite-400 text-[13px]">No warranties on file.</div>}
            </div>
          </div>
          <div>
            <h2 className="font-bold text-[14px] mb-3 flex items-center gap-1.5"><MapPin size={15}/> Addresses ({addresses.length})</h2>
            <div className="surface divide-y divide-graphite-200">
              {addresses.map(a=><div key={a.id} className="px-4 py-3 text-[13px]">{a.line1}, {a.city} {a.postcode}</div>)}
              {addresses.length===0 && <div className="px-4 py-6 text-center text-graphite-400 text-[13px]">No addresses on file.</div>}
            </div>
          </div>
          <div>
            <h2 className="font-bold text-[14px] mb-3 flex items-center gap-1.5"><MessageSquare size={15}/> Communication records ({notifications.length})</h2>
            <div className="surface divide-y divide-graphite-200">
              {notifications.map(n=><div key={n.id} className="px-4 py-3 text-[13px]"><div className="font-medium">{n.title}</div>{n.body&&<div className="text-graphite-400 text-[12px] mt-0.5">{n.body}</div>}</div>)}
              {notifications.length===0 && <div className="px-4 py-6 text-center text-graphite-400 text-[13px]">No notifications sent yet.</div>}
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-[14px] mb-3 flex items-center gap-1.5"><StickyNote size={15}/> Internal notes</h2>
          {c.id ? (<>
            <div className="flex gap-2 mb-3"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…" className="input-field"/><button onClick={addNote} className="btn btn-ghost btn-sm flex-none">Add</button></div>
            <div className="space-y-2">
              {notes.map(n=><div key={n.id} className="bg-graphite-50 rounded-lg p-2.5 text-[12.5px]">{n.text}</div>)}
              {notes.length===0 && <div className="text-[12.5px] text-graphite-400">No notes yet.</div>}
            </div>
          </>) : <div className="text-[12.5px] text-graphite-400">This customer has no account yet — notes require a registered account.</div>}
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {c.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(saveEdit)} className="space-y-3.5">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Full name</span><input {...register('name')} className="input-field mt-1.5"/>{errors.name&&<span className="text-[11.5px] text-red-500">{errors.name.message}</span>}</label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Email</span><input {...register('email')} className="input-field mt-1.5"/>{errors.email&&<span className="text-[11.5px] text-red-500">{errors.email.message}</span>}</label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Phone</span><input {...register('phone')} className="input-field mt-1.5"/>{errors.phone&&<span className="text-[11.5px] text-red-500">{errors.phone.message}</span>}</label>
            <DialogFooter><button type="button" onClick={()=>setEditing(false)} className="btn btn-ghost">Cancel</button><button type="submit" className="btn btn-brand">Save changes</button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {target && REASON_ACTIONS.has(target.type) && (
        <ReasonDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='delete' ? `Permanently delete ${c.name}?` : target.type==='archive' ? `Archive ${c.name}?` : `Deactivate ${c.name}?`}
          description={
            target.type==='delete' ? 'This account has no repairs, orders or trade-ins on record, so it can be permanently deleted. This cannot be undone.'
            : target.type==='archive' ? 'Archived customers are hidden from normal lists but their history is preserved.'
            : 'They will no longer be able to sign in. Their repair, order and trade-in history is preserved.'
          }
          confirmLabel={target.type==='delete'?'Delete permanently':target.type==='archive'?'Archive':'Deactivate'}
          onConfirm={runAction}/>
      )}
      {target && (target.type==='activate'||target.type==='restore') && (
        <ConfirmDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='activate' ? `Reactivate ${c.name}?` : `Restore ${c.name}?`}
          description={target.type==='activate' ? 'They will regain access to sign in and use the platform.' : 'This account will reappear in normal customer lists.'}
          confirmLabel={target.type==='activate'?'Reactivate':'Restore'} destructive={false} onConfirm={()=>runAction()}/>
      )}

      {bookOpen && <QuickBookDialog customer={c} onClose={()=>setBookOpen(false)}/>}
      {notifyOpen && <NotifyDialog customer={c} me={me} onClose={()=>setNotifyOpen(false)}/>}
    </div>
  )
}

function QuickBookDialog({ customer, onClose }){
  const { user:me } = useAuth()
  const [f,setF]=useState({ device:'Phone', brand:'', model:'', problem:'Screen replacement', branch:BRANCHES[0].id })
  const submit = async ()=>{
    if(!f.brand||!f.model){ toast.error('Enter device brand and model.'); return }
    const rep = await RepairAPI.create({ customer:customer.name, phone:customer.phone, email:customer.email, ...f, fulfilment:'In-store' })
    logAction({ user:me, action:'repair.create_for_customer', entityType:'repair', entityId:rep.ref })
    toast.success(`Repair ${rep.ref} booked for ${customer.name}`)
    onClose()
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Book a repair for {customer.name}</DialogTitle></DialogHeader>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Brand</span><input value={f.brand} onChange={e=>setF(s=>({...s,brand:e.target.value}))} className="input-field mt-1.5"/></label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Model</span><input value={f.model} onChange={e=>setF(s=>({...s,model:e.target.value}))} className="input-field mt-1.5"/></label>
          </div>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Problem</span>
            <select value={f.problem} onChange={e=>setF(s=>({...s,problem:e.target.value}))} className="input-field mt-1.5">{['Screen replacement','Battery replacement','Charging-port repair','Water-damage check','Software issue','Other / not sure'].map(p=><option key={p}>{p}</option>)}</select></label>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Branch</span>
            <select value={f.branch} onChange={e=>setF(s=>({...s,branch:e.target.value}))} className="input-field mt-1.5">{BRANCHES.map(b=><option key={b.id} value={b.id}>{b.area.split('—')[0]}</option>)}</select></label>
        </div>
        <DialogFooter><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={submit} className="btn btn-brand">Create repair</button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NotifyDialog({ customer, me, onClose }){
  const [title,setTitle]=useState('')
  const [body,setBody]=useState('')
  const [busy,setBusy]=useState(false)
  const submit = async ()=>{
    if(!title.trim()){ toast.error('Enter a notification title.'); return }
    if(!customer.id){ toast.error('This customer has no account to notify.'); return }
    setBusy(true)
    try{
      await NotificationAPI.create({ customerId:customer.id, title:title.trim(), body:body.trim() })
      logAction({ user:me, action:'customer.notification_create', entityType:'user', entityId:customer.id })
      toast.success(`Notification sent to ${customer.name}`)
      onClose()
    } finally { setBusy(false) }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send a notification to {customer.name}</DialogTitle></DialogHeader>
        <div className="space-y-3.5">
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Title</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Your repair is ready" className="input-field mt-1.5"/></label>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Message (optional)</span><textarea value={body} onChange={e=>setBody(e.target.value)} rows={3} className="input-field mt-1.5 h-auto py-2"/></label>
          {!customer.id && <p className="text-[11.5px] text-amber-600">This customer has no registered account — notifications require one.</p>}
        </div>
        <DialogFooter><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={submit} disabled={busy} className="btn btn-brand disabled:opacity-60">{busy?'Sending…':'Send notification'}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
