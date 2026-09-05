import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { REPAIR_FLOW } from '@/constants/status.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { Link } from 'react-router-dom'
import { money } from '@/utils/format.js'
import { Search } from 'lucide-react'

export default function ManageRepairs(){
  const { user:me } = useAuth()
  const { data:all=[], refetch } = useAsync(()=>RepairAPI.list(),[])
  const [branch,setBranch]=useState(''); const [status,setStatus]=useState(''); const [q,setQ]=useState('')
  const [deleting,setDeleting]=useState(null)
  const canDelete = can(me?.role,'deleteRepairDraft')
  const canArchive = can(me?.role,'archiveRepair')

  let list=all
  if(branch) list=list.filter(r=>r.branch===branch)
  if(status) list=list.filter(r=>r.status===status)
  if(q.trim()){ const s=q.trim().toLowerCase(); list=list.filter(r=>r.ref.toLowerCase().includes(s)||r.customer?.toLowerCase().includes(s)||r.model?.toLowerCase().includes(s)||r.techName?.toLowerCase().includes(s)) }

  const archive = async (r)=>{
    await RepairAPI.archive(r.ref)
    logAction({ user:me, action:'repair.archive', entityType:'repair', entityId:r.ref })
    toast.success(`${r.ref} archived`)
    refetch()
  }

  const deleteDraft = async ()=>{
    try{
      await RepairAPI.deleteDraft(deleting.ref)
      logAction({ user:me, action:'repair.delete_draft', entityType:'repair', entityId:deleting.ref })
      toast.success(`${deleting.ref} deleted`)
      setDeleting(null); refetch()
    } catch(e){ toast.error(e.message) }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-4">Repair management</h1>
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="flex items-center gap-2 input-field w-auto max-w-[220px]"><Search size={14} className="text-graphite-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ref, customer, device, tech…" className="bg-transparent outline-none flex-1"/></div>
        <select value={branch} onChange={e=>setBranch(e.target.value)} className="input-field w-auto"><option value="">All branches</option>{BRANCHES.map(b=><option key={b.id} value={b.id}>{b.area}</option>)}</select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="input-field w-auto"><option value="">All statuses</option>{REPAIR_FLOW.concat(['Cancelled']).map(s=><option key={s}>{s}</option>)}</select>
        <span className="text-[13px] text-graphite-400 mono-data">{list.length} repairs</span>
      </div>
      <div className="surface overflow-x-auto">
        <Table><thead><tr><Th>Ref</Th><Th>Device</Th><Th>Customer</Th><Th>Branch</Th><Th>Tech</Th><Th>Quote</Th><Th>Status</Th><Th></Th></tr></thead>
        <tbody>{list.map(r=>{ const b=BRANCHES.find(x=>x.id===r.branch); return (
          <tr key={r.ref} className="hover:bg-graphite-50">
            <Td><Link to={`/staff/repairs/${r.ref}`} className="font-bold mono-data text-brand">{r.ref}</Link></Td>
            <Td>{r.brand} {r.model}<div className="text-[11.5px] text-graphite-400">{r.problem}</div></Td>
            <Td>{r.customer}</Td><Td>{b?.area.split('—')[0]}</Td><Td>{r.techName||'—'}</Td><Td className="mono-data">{money(r.quote)}</Td><Td><StatusBadge status={r.status}/></Td>
            <Td>
              <div className="flex items-center gap-2">
                {canArchive && r.status==='Completed' && !r.archived && <button onClick={()=>archive(r)} className="text-[12px] font-semibold text-graphite-500 hover:underline">Archive</button>}
                {canDelete && r.status==='Booking received' && <button onClick={()=>setDeleting(r)} className="text-[12px] font-semibold text-rose-600 hover:underline">Delete</button>}
              </div>
            </Td>
          </tr>)})}
          {list.length===0 && <tr><Td colSpan={8} className="text-center text-graphite-400 py-8">No repairs match those filters.</Td></tr>}
        </tbody></Table>
      </div>

      {deleting && (
        <ConfirmDialog open={!!deleting} onOpenChange={(o)=>!o&&setDeleting(null)}
          title={`Delete draft repair ${deleting.ref}?`}
          description="This permanently removes the record. Only allowed while the repair is still in Booking received."
          confirmLabel="Delete" onConfirm={deleteDraft}/>
      )}
    </div>
  )
}
