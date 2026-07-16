import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { money } from '@/utils/format.js'

export default function Reports(){
  const { data:all=[] } = useAsync(()=>RepairAPI.list(),[])
  const done=all.filter(r=>r.status==='Completed')
  const rev=done.reduce((s,r)=>s+(r.quote||0),0)
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-5">Reports & analytics</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        <DashboardCard label="Total repairs" value={all.length}/>
        <DashboardCard label="Completed" value={done.length}/>
        <DashboardCard label="Revenue" value={money(rev)}/>
        <DashboardCard label="Awaiting approval" value={all.filter(r=>r.status==='Quote awaiting approval').length}/>
      </div>
      <div className="surface mt-4 p-5 overflow-x-auto">
        <h2 className="font-bold text-[15px] mb-3">Performance by branch</h2>
        <Table><thead><tr><Th>Branch</Th><Th>Repairs</Th><Th>Completed revenue</Th></tr></thead>
        <tbody>{BRANCHES.map(b=>{ const c=all.filter(r=>r.branch===b.id).length; const rv=all.filter(r=>r.branch===b.id&&r.status==='Completed').reduce((s,r)=>s+(r.quote||0),0); return (
          <tr key={b.id} className="hover:bg-graphite-50"><Td>{b.area}</Td><Td className="mono-data">{c}</Td><Td className="mono-data">{money(rv)}</Td></tr>
        )})}</tbody></Table>
      </div>
      <p className="text-[11.5px] text-graphite-400 mt-4">Full platform covers all 19 report types (parts usage, avg repair time, retention, staff activity, refunds, satisfaction). Chart placeholders plug in here.</p>
    </div>
  )
}
