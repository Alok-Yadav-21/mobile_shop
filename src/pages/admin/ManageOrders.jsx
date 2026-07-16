import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { OrderAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { money, fmtDate } from '@/utils/format.js'

const ORDER_STATUSES = ['pending','paid','processing','ready','dispatched','delivered','collected']

export default function ManageOrders(){
  const { user:me } = useAuth()
  const { data:orders=[], refetch } = useAsync(()=>OrderAPI.list(),[])
  const [cancelling,setCancelling]=useState(null)
  const canManage = can(me?.role,'manageOrders')

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
          <Table><thead><tr><Th>Reference</Th><Th>Customer</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th>Placed</Th>{canManage&&<Th></Th>}</tr></thead>
          <tbody>{orders.map(o=>(
            <tr key={o.reference} className="hover:bg-graphite-50">
              <Td className="font-bold mono-data text-brand">{o.reference}</Td>
              <Td>{o.customerName||o.email||'—'}</Td>
              <Td>{o.items?.length||0}</Td>
              <Td className="mono-data">{money(o.total)}</Td>
              <Td>
                {canManage && !['cancelled','delivered','collected'].includes(o.status) ? (
                  <select value={o.status} onChange={e=>setStatus(o,e.target.value)} className="input-field w-auto">{ORDER_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
                ) : (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${o.status==='cancelled'?'bg-rose-50 text-rose-600':'bg-emerald-50 text-emerald-600'}`}>{o.status}</span>
                )}
              </Td>
              <Td>{fmtDate(o.createdAt)}</Td>
              {canManage && <Td>{!['dispatched','completed','collected','delivered','cancelled'].includes(o.status) && <button onClick={()=>setCancelling(o)} className="text-[12px] font-semibold text-rose-600 hover:underline">Cancel</button>}</Td>}
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
