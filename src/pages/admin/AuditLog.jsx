import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync.js'
import { AuditAPI } from '@/services/api.js'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { fmtDateTime } from '@/utils/format.js'
import { History } from 'lucide-react'

export default function AuditLog(){
  const { data:logs=[] } = useAsync(()=>AuditAPI.list(),[])
  const [entityType,setEntityType]=useState('')
  const types = [...new Set(logs.map(l=>l.entityType))]
  const list = entityType ? logs.filter(l=>l.entityType===entityType) : logs

  return (
    <div>
      <div className="flex items-center gap-2 mb-1"><History size={20} className="text-brand"/><h1 className="text-2xl font-extrabold tracking-tight">Audit log</h1></div>
      <p className="text-graphite-400 text-[14px] mb-6">Every important platform change — who did what, when, and why.</p>

      <div className="flex items-center gap-3 mb-4">
        <select value={entityType} onChange={e=>setEntityType(e.target.value)} className="input-field w-auto">
          <option value="">All record types</option>
          {types.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-[12.5px] text-graphite-400 mono-data">{list.length} entries</span>
      </div>

      {list.length===0 ? (
        <div className="surface p-2"><EmptyState title="No audit entries yet" hint="Actions like status changes, role changes and approvals will appear here."/></div>
      ) : (
        <div className="surface overflow-x-auto">
          <Table><thead><tr><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Record</Th><Th>Reason</Th></tr></thead>
          <tbody>{list.map(l=>(
            <tr key={l.id} className="hover:bg-graphite-50 align-top">
              <Td className="whitespace-nowrap mono-data text-[12px]">{fmtDateTime(l.at||l.created_at)}</Td>
              <Td><span className="font-semibold">{l.actorRole||l.actor_role||'—'}</span></Td>
              <Td className="mono-data text-[12px]">{l.action}</Td>
              <Td className="text-[12.5px]">{l.entityType||l.entity_type} · {l.entityId||l.entity_id}</Td>
              <Td className="text-[12.5px] text-graphite-500 max-w-xs">{l.reason||'—'}</Td>
            </tr>
          ))}</tbody></Table>
        </div>
      )}
    </div>
  )
}
