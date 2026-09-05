import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { OrderAPI } from '@/services/api.js'
import { logAction } from '@/services/auditService.js'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { money, fmtDate } from '@/utils/format.js'
import { orderStatusLabel, orderCanBeCancelled, ORDER_STYLES } from '@/constants/status.js'
import { ShoppingBag } from 'lucide-react'

// One rule, shared with the adapter and the admin list — see orderCanBeCancelled().

export default function MyOrders(){
  const { user } = useAuth()
  const { data:orders=[], loading, refetch } = useAsync(()=>OrderAPI.list(user?.id),[user])
  const [cancelling,setCancelling]=useState(null)

  const cancel = async (reason)=>{
    try{
      await OrderAPI.cancel(cancelling.reference, reason)
      logAction({ user, action:'order.cancel', entityType:'order', entityId:cancelling.reference, reason })
      toast.success(`${cancelling.reference} cancelled`)
      refetch()
    } catch(e){ toast.error(e.message) }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">My orders</h1>
      <p className="text-graphite-400 mt-1 text-[14px]">Your purchases, delivery and collection status.</p>

      {loading ? (
        <div className="text-graphite-400 mt-8">Loading…</div>
      ) : orders.length===0 ? (
        <div className="surface p-10 mt-6 text-center">
          <ShoppingBag size={32} className="mx-auto text-graphite-300"/>
          <p className="text-graphite-500 mt-3">No orders yet.</p>
          <Link to="/products" className="btn btn-brand mt-4 inline-flex">Shop products</Link>
        </div>
      ) : (
        <div className="surface divide-y divide-graphite-200 mt-6">
          {orders.map(o=>(
            <div key={o.reference} className="flex items-center justify-between px-5 py-4">
              <Link to={`/order-confirmation/${o.reference}`} className="flex-1 hover:bg-graphite-50 -m-1 p-1 rounded-lg">
                <div className="font-bold text-[14px] mono-data">{o.reference}</div>
                <div className="text-[12px] text-graphite-400 mt-0.5">{fmtDate(o.createdAt)} · {o.items?.length||0} item{o.items?.length===1?'':'s'}</div>
              </Link>
              <div className="text-right flex items-center gap-4">
                <div>
                  <div className="font-bold text-[14.5px] mono-data">{money(o.total)}</div>
                  {/* Was hardcoded to "Test mode" — a note about the payment stub — for every
                      order that was not cancelled, so an admin marking one dispatched changed
                      nothing here. It shows the order's actual status now. */}
                  <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${ORDER_STYLES[o.status]||'bg-slate-100 text-slate-600'}`}>{orderStatusLabel(o.status,'customer')}</span>
                </div>
                {orderCanBeCancelled(o.status) && <button onClick={()=>setCancelling(o)} className="text-[12px] font-semibold text-rose-600 hover:underline">Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelling && (
        <ReasonDialog open={!!cancelling} onOpenChange={(o)=>!o&&setCancelling(null)}
          title={`Cancel order ${cancelling.reference}?`} description="Stock will be restored and this cannot be undone."
          confirmLabel="Cancel order" onConfirm={cancel}/>
      )}
    </div>
  )
}
