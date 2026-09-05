import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI } from '@/services/api.js'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { REPAIR_FLOW } from '@/constants/status.js'
import { Link } from 'react-router-dom'
import { money } from '@/utils/format.js'

export default function AssignedRepairs(){
  const { user } = useAuth()
  const { data:all=[] } = useAsync(()=>user?.branch?RepairAPI.forBranch(user.branch):RepairAPI.list(),[user])
  const [status,setStatus]=useState('')
  // The page is called "Assigned repairs" and used to show every repair at the branch, which
  // is a different thing — a technician could not tell which jobs were actually theirs. Their
  // own queue is the default; the branch's full list is one click away, because covering for
  // a colleague is normal and the page is the only place to do it from.
  const [scope,setScope]=useState('mine')
  const mine = all.filter(r=>r.tech===user?.id)
  const base = scope==='mine' ? mine : all
  const list = status ? base.filter(r=>r.status===status) : base

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Assigned repairs</h1>
          <p className="text-[12.5px] text-graphite-400 mt-0.5">
            {scope==='mine' ? `${mine.length} assigned to you` : `${all.length} at your branch`}
          </p>
        </div>
        <div className="flex gap-2">
        <select value={scope} onChange={e=>setScope(e.target.value)} className="input-field w-auto">
          <option value="mine">Assigned to me</option>
          <option value="branch">All at my branch</option>
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="input-field w-auto">
          <option value="">All statuses</option>
          {REPAIR_FLOW.concat(['Cancelled']).map(s=><option key={s}>{s}</option>)}
        </select>
        </div>
      </div>
      <div className="surface overflow-x-auto">
        <Table><thead><tr><Th>Ref</Th><Th>Device</Th><Th>Problem</Th><Th>Quote</Th><Th>Status</Th></tr></thead>
        <tbody>{list.map(r=>(
          <tr key={r.ref} className="hover:bg-graphite-50">
            <Td><Link to={`/staff/repairs/${r.ref}`} className="font-bold mono-data text-brand">{r.ref}</Link></Td>
            <Td>{r.brand} {r.model}</Td><Td>{r.problem}</Td><Td className="mono-data">{money(r.quote)}</Td><Td><StatusBadge status={r.status}/></Td>
          </tr>))}</tbody></Table>
        {list.length===0 && <div className="p-8 text-center text-graphite-400 text-[13.5px]">No repairs match that status.</div>}
      </div>
    </div>
  )
}
