import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { OrderAPI, UserAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { money, fmtDate } from '@/utils/format.js'
import { ORDER_FLOW, orderCanBeCancelled, orderStatusLabel } from '@/constants/status.js'
import { technicianName, techniciansForBranch } from '@/lib/staff.js'

// Was a private copy of the vocabulary; it now comes from constants/status.js so the customer
// list, the admin list and the adapter cannot drift apart.
const ORDER_STATUSES = ORDER_FLOW

export default function ManageOrders(){
  const { user:me } = useAuth()
  const { data:orders=[], refetch } = useAsync(()=>OrderAPI.list(),[])
  const { data:users=[] } = useAsync(()=>UserAPI.list(),[])
  const [cancelling,setCancelling]=useState(null)
  const canManage = can(me?.role,'manageOrders')
  const canAssignOrders = can(me?.role,'assignOrder')

  const assign = async (o, staffId)=>{
    try{
      await OrderAPI.assign(o.reference, staffId)
      logAction({ user:me, action:'order.assign', entityType:'order', entityId:o.reference, after:{assignedTo:staffId} })
      toast.success(staffId
        ? `${o.reference} assigned to ${technicianName(users, staffId)} — they have been notified`
        : `${o.reference} unassigned`)
      refetch()
    } catch(e){ toast.error(e.message||'Could not assign that order') }
  }

  const setStatus = async (o, status)=>{
    await OrderAPI.updateStatus(o.reference, status)
    logAction({ user:me, action:'order.status_change', entityType:'order', entityId:o.reference, before:{status:o.status}, after:{status} })
    toast.success(`${o.reference} → ${status}`)
    refetch()
  }

  const cancel = async (reason)=>{
    try{
      await OrderAPI.cancel(cancelling.reference, reason)
      logAction({ user:me, action:'order.cancel', entityType:'order', entityId:cancelling.reference, reason })
      toast.success(`${cancelling.reference} cancelled — stock restored`)
      refetch()
    } catch(e){ toast.error(e.message) }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Orders</h1>
      <p className="text-graphite-400 text-[14px] mb-6">Online orders, delivery and click-and-collect, all branches.</p>
      {orders.length===0 ? (
        <div className="surface p-2"><EmptyState title="No orders yet" hint="Checkouts from the storefront will appear here."/></div>
      ) : (
        <div className="surface overflow-x-auto">
          <Table><thead><tr><Th>Reference</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Fulfilled by</Th><Th>Status</Th><Th>Placed</Th>{canManage&&<Th></Th>}</tr></thead>
          <tbody>{orders.map(o=>(
            <tr key={o.reference} className="hover:bg-graphite-50">
              <Td className="font-bold mono-data text-brand">{o.reference}</Td>
              <Td>{o.customerName||o.email||'—'}</Td>
              <Td>{o.items?.length||0}</Td>
              <Td className="mono-data">{money(o.total)}</Td>
              {/* A web order arrives with no branch, so the list is every active staff member
                  until one is chosen — assigning sets the branch to theirs. */}
              <Td>
                {canAssignOrders && !['cancelled','delivered','collected'].includes(o.status) ? (
                  <select value={o.assignedTo||''} onChange={e=>assign(o, e.target.value||null)} className="input-field w-auto">
                    <option value="">— unassigned —</option>
                    {techniciansForBranch(users, o.branch).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                ) : (
                  <span className="text-[12.5px]">{technicianName(users, o.assignedTo)}</span>
                )}
              </Td>
              <Td>
                {canManage && !['cancelled','delivered','collected'].includes(o.status) ? (
                  <select value={o.status} onChange={e=>setStatus(o,e.target.value)} className="input-field w-auto">{ORDER_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
                ) : (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${o.status==='cancelled'?'bg-rose-50 text-rose-600':'bg-emerald-50 text-emerald-600'}`}>{o.status}</span>
                )}
              </Td>
              <Td>{fmtDate(o.createdAt)}</Td>
              {canManage && <Td>{orderCanBeCancelled(o.status) && <button onClick={()=>setCancelling(o)} className="text-[12px] font-semibold text-rose-600 hover:underline">Cancel</button>}</Td>}
            </tr>))}</tbody></Table>
        </div>
      )}

      {cancelling && (
        <ReasonDialog open={!!cancelling} onOpenChange={(o)=>!o&&setCancelling(null)}
          title={`Cancel order ${cancelling.reference}?`} description="Stock will be restored for every item in this order."
          confirmLabel="Cancel order" onConfirm={cancel}/>
      )}
    </div>
  )
}
