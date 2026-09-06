import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { OrderAPI } from '@/services/api.js'
import { logAction } from '@/services/auditService.js'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { ORDER_FLOW, ORDER_STYLES, orderStatusLabel } from '@/constants/status.js'
import { money, fmtDate } from '@/utils/format.js'

// Orders to pick, pack and hand over at this branch.
//
// There was no staff view of orders at all: only an admin could see or move one, so an order
// assigned to a technician had nowhere to be worked. The data layer scopes this to the caller's
// own branch, so this is the branch's queue rather than the network's.
// Finished, one way or another. A page called "Orders to fulfil" that opens on three months of
// delivered history is answering a question nobody asked — the branch wants the ones still
// needing work, and the rest on request.
const DONE = ['cancelled', 'delivered', 'collected', 'refunded']

export default function BranchOrders(){
  const { user } = useAuth()
  const { data:orders=[], loading, refetch } = useAsync(()=>OrderAPI.list(),[user?.id])
  // Their own first, because that is what they are answerable for; the rest of the branch is
  // one click away for covering a colleague.
  const [scope,setScope]=useState('mine')
  const [show,setShow]=useState('open')

  const mine = orders.filter(o=>o.assignedTo===user?.id)
  const open = (rows)=>rows.filter(o=>!DONE.includes(o.status))
  const base = scope==='mine' ? mine : orders
  const list = [...(show==='open' ? open(base) : base)].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
  const openCount = open(mine).length

  const setStatus = async (o, status)=>{
    try{
      await OrderAPI.updateStatus(o.reference, status)
      logAction({ user, action:'order.status_change', entityType:'order', entityId:o.reference, before:{status:o.status}, after:{status} })
      toast.success(`${o.reference} → ${orderStatusLabel(status)}`)
      refetch()
    } catch(e){ toast.error(e.message||'Could not update that order') }
  }

  if(loading) return <div className="text-graphite-400">Loading…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Orders to fulfil</h1>
          <p className="text-[12.5px] text-graphite-400 mt-0.5">
            {scope==='mine' ? `${openCount} waiting on you` : `${open(orders).length} open at your branch`}
            {list.length!==base.length && ` · showing ${list.length}`}
          </p>
        </div>
        <div className="flex gap-2">
          <select value={scope} onChange={e=>setScope(e.target.value)} className="input-field w-auto">
            <option value="mine">Assigned to me</option>
            <option value="branch">All at my branch</option>
          </select>
          <select value={show} onChange={e=>setShow(e.target.value)} className="input-field w-auto">
            <option value="open">Still to do</option>
            <option value="all">Including finished</option>
          </select>
        </div>
      </div>

      {list.length===0 ? (
        <div className="surface p-2">
          <EmptyState
            title={scope==='mine' ? 'Nothing waiting on you' : 'Nothing open at your branch'}
            hint={show==='open'
              ? 'Everything here is done — switch to "Including finished" to see past orders.'
              : 'An admin assigns orders for your branch to fulfil.'}
          />
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <Table>
            <thead><tr><Th>Reference</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th>Placed</Th></tr></thead>
            <tbody>{list.map(o=>{
              // Only the person holding it may move it, and the adapter enforces that whatever
              // is rendered — so a colleague's order shows where it has got to, not a control
              // that would be refused.
              const mineToMove = o.assignedTo===user?.id
              return (
                <tr key={o.reference} className="hover:bg-graphite-50">
                  <Td className="font-bold mono-data text-brand">{o.reference}</Td>
                  <Td>{o.customerName||o.email||'—'}</Td>
                  <Td>{o.items?.length||0}</Td>
                  <Td className="mono-data">{money(o.total)}</Td>
                  <Td>
                    {mineToMove && !DONE.includes(o.status) ? (
                      <select value={o.status} onChange={e=>setStatus(o,e.target.value)} className="input-field w-auto">
                        {ORDER_FLOW.map(s=><option key={s} value={s}>{orderStatusLabel(s)}</option>)}
                      </select>
                    ) : (
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${ORDER_STYLES[o.status]||'bg-slate-100 text-slate-600'}`}>
                        {orderStatusLabel(o.status)}
                      </span>
                    )}
                  </Td>
                  <Td>{fmtDate(o.createdAt)}</Td>
                </tr>
              )
            })}</tbody>
          </Table>
        </div>
      )}
    </div>
  )
}
