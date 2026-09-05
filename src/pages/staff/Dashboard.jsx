import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI } from '@/services/api.js'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { Link } from 'react-router-dom'
import { Wrench, Clock, CheckCircle2, Boxes } from 'lucide-react'

export default function Dashboard(){
  const { user } = useAuth()
  const { data:all=[] } = useAsync(()=>user?.branch?RepairAPI.forBranch(user.branch):RepairAPI.list(),[user])
  const c=s=>all.filter(r=>r.status===s).length
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Staff workspace</h1>
      <p className="text-graphite-400 mt-1 text-[14px]">Your branch queue at a glance.</p>
      <div className="grid sm:grid-cols-4 gap-4 mt-6">
        <DashboardCard icon={Wrench} label="In repair" value={c('Repair in progress')} tone="brand"/>
        <DashboardCard icon={Clock} label="Awaiting approval" value={c('Quote awaiting approval')} tone="amber"/>
        <DashboardCard icon={CheckCircle2} label="Ready for collection" value={c('Ready for collection')} tone="green"/>
        <DashboardCard icon={Boxes} label="Total jobs" value={all.length} tone="violet"/>
      </div>
      <h2 className="font-bold text-[16px] mt-8 mb-3">My branch queue</h2>
      <div className="surface overflow-x-auto">
        <Table><thead><tr><Th>Ref</Th><Th>Device</Th><Th>Customer</Th><Th>Tech</Th><Th>Status</Th></tr></thead>
        <tbody>{all.map(r=>(
          <tr key={r.ref} className="hover:bg-graphite-50">
            <Td><Link to={`/staff/repairs/${r.ref}`} className="font-bold mono-data text-brand">{r.ref}</Link></Td>
            <Td>{r.brand} {r.model}<div className="text-[11.5px] text-graphite-400">{r.problem}</div></Td>
            <Td>{r.customer}</Td><Td>{r.techName||'—'}</Td><Td><StatusBadge status={r.status}/></Td>
          </tr>))}</tbody></Table>
      </div>
    </div>
  )
}
