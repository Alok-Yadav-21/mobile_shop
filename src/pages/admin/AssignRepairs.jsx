import { toast } from 'sonner'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI, TECHS } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Link } from 'react-router-dom'

export default function AssignRepairs(){
  const { data:all=[], refetch } = useAsync(()=>RepairAPI.list(),[])
  const unassigned = all.filter(r=>!r.tech && !['Completed','Cancelled'].includes(r.status))

  const assign = async (ref, tech)=>{
    if(!tech) return
    await RepairAPI.update(ref,{ tech })
    toast.success(`${ref} assigned to ${tech}`)
    refetch()
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Assign repairs</h1>
      <p className="text-graphite-400 text-[14px] mb-6">Repairs awaiting a technician, across all branches.</p>
      {unassigned.length===0 ? (
        <div className="surface p-2"><EmptyState title="All caught up" hint="Every active repair has a technician assigned."/></div>
      ) : (
        <div className="surface divide-y divide-graphite-200">
          {unassigned.map(r=>{ const b=BRANCHES.find(x=>x.id===r.branch); return (
            <div key={r.ref} className="flex items-center justify-between px-5 py-3.5 gap-4 flex-wrap">
              <div>
                <Link to={`/staff/repairs/${r.ref}`} className="font-bold text-[13.5px] mono-data text-brand">{r.ref}</Link>
                <div className="text-[12.5px] text-graphite-400">{r.brand} {r.model} · {r.problem} · {b?.area?.split('—')[0]}</div>
              </div>
              <select defaultValue="" onChange={e=>assign(r.ref,e.target.value)} className="input-field w-auto">
                <option value="" disabled>Assign technician…</option>
                {TECHS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
