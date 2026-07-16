import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI, OrderAPI } from '@/services/api.js'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { BRANCHES } from '@/data/branches.js'
import { Link } from 'react-router-dom'
import { money } from '@/utils/format.js'
import { Wrench, Clock, CheckCircle2, PoundSterling } from 'lucide-react'

export default function Dashboard(){
  const { data:all=[] } = useAsync(()=>RepairAPI.list(),[])
  const { data:orders=[] } = useAsync(()=>OrderAPI.list(),[])
  const c=s=>all.filter(r=>r.status===s).length
  const repairRevenue=all.filter(r=>r.status==='Completed').reduce((s,r)=>s+(r.quote||0),0)
  const orderRevenue=orders.reduce((s,o)=>s+(o.total||0),0)
  const active=all.filter(r=>!['Completed','Cancelled'].includes(r.status)).length

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Admin overview</h1>
      <p className="text-graphite-400 mt-1 text-[14px] mb-6">Platform-wide activity across all 8 branches.</p>
      <div className="grid sm:grid-cols-4 gap-4">
        <DashboardCard icon={Wrench} label="Active repairs" value={active} tone="brand"/>
        <DashboardCard icon={Clock} label="Awaiting approval" value={c('Quote awaiting approval')} tone="amber"/>
        <DashboardCard icon={CheckCircle2} label="Ready for collection" value={c('Ready for collection')} tone="green"/>
        <DashboardCard icon={PoundSterling} label="Revenue (repairs + orders)" value={money(repairRevenue+orderRevenue)} tone="violet"/>
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <div className="surface p-5 lg:col-span-2 overflow-x-auto">
          <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-[15px]">Recent repairs</h2><Link to="/admin/repairs" className="btn btn-ghost btn-sm">View all</Link></div>
          <Table><thead><tr><Th>Ref</Th><Th>Device</Th><Th>Branch</Th><Th>Status</Th></tr></thead>
          <tbody>{all.slice(0,6).map(r=>{ const b=BRANCHES.find(x=>x.id===r.branch); return (
            <tr key={r.ref} className="hover:bg-graphite-50"><Td><Link to={`/staff/repairs/${r.ref}`} className="font-bold mono-data text-brand">{r.ref}</Link></Td><Td>{r.brand} {r.model}</Td><Td>{b?.area.split('—')[0]}</Td><Td><StatusBadge status={r.status}/></Td></tr>
          )})}</tbody></Table>
        </div>
        <div className="surface p-5"><h2 className="font-bold text-[15px] mb-3">By branch</h2>
          <div className="space-y-2.5">{BRANCHES.map(b=>{ const n=all.filter(r=>r.branch===b.id).length; return (
            <div key={b.id} className="flex justify-between text-[13px]"><span className="text-graphite-500">{b.area.split('—')[0]}</span><span className="font-bold mono-data">{n}</span></div>
          )})}</div>
        </div>
      </div>
    </div>
  )
}
