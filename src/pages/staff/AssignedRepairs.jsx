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
  const list = status ? all.filter(r=>r.status===status) : all

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold tracking-tight">Assigned repairs</h1>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="input-field w-auto">
          <option value="">All statuses</option>
          {REPAIR_FLOW.concat(['Cancelled']).map(s=><option key={s}>{s}</option>)}
        </select>
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
