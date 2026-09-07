import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { OrderAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { money, fmtDate } from '@/utils/format.js'
import { PAYMENT_STATUS_LABELS } from '@/constants/finance.js'
import { isEarning } from '@/lib/reporting.js'
import { PoundSterling, RotateCcw, CircleAlert } from 'lucide-react'

export default function Payments(){
  const { user:me } = useAuth()
  const { data:orders=[], refetch } = useAsync(()=>OrderAPI.list(),[])
  const [refunding,setRefunding]=useState(null)
  const canRefund = can(me?.role,'refundOrder')
  // Split by whether the money actually arrived. One figure covering both was how an order the
  // checkout marked "paid" without taking anything ended up counted as takings.
  const settled = orders.filter(isEarning)
  // Live orders where the money never arrived. Cancelled and refunded ones are excluded: no
  // payment is owed on them, and counting them here reads as outstanding revenue that isn't.
  const unsettled = orders.filter(o=>
    !['cancelled','refunded'].includes(o.status) && o.paymentStatus && o.paymentStatus!=='paid')
  const total = settled.reduce((s,o)=>s+(o.total||0),0)
  const owed = unsettled.reduce((s,o)=>s+(o.total||0),0)
  const refunded = orders.filter(o=>o.status==='refunded')

  const requestRefund = async (reason)=>{
    await OrderAPI.updateStatus(refunding.reference, 'refunded')
    logAction({ user:me, action:'order.refund_request', entityType:'order', entityId:refunding.reference, reason })
    toast.success(`Refund request recorded for ${refunding.reference} (test mode — no real refund processed)`)
    refetch()
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Payments & refunds</h1>
      <p className="text-graphite-400 text-[14px] mb-6">Payments, refunds and invoice status — running in test/mock mode.</p>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[12.5px] rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
        <CircleAlert size={15}/> No live Stripe key is connected — refunds here only create a record. Add VITE_STRIPE_PUBLISHABLE_KEY and a real payment backend to process actual refunds.
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <DashboardCard icon={PoundSterling} label="Settled" value={money(total)} tone="brand"/>
        {/* Orders the checkout let through without taking payment. They are excluded from every
            revenue report, so this is the only screen that says where the money went. */}
        <DashboardCard icon={CircleAlert} label={`Not taken (${unsettled.length})`} value={money(owed)} tone="amber"/>
        <DashboardCard icon={RotateCcw} label="Refund requests" value={refunded.length} tone="amber"/>
        <DashboardCard label="Transactions" value={orders.length} tone="violet"/>
      </div>

      <div className="surface overflow-x-auto">
        <Table><thead><tr><Th>Reference</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th>{canRefund&&<Th></Th>}</tr></thead>
        <tbody>{orders.map(o=>(
          <tr key={o.reference} className="hover:bg-graphite-50">
            <Td className="font-bold mono-data text-brand">{o.reference}</Td>
            <Td className="mono-data">{money(o.total)}</Td>
            {/* The real payment status, not "Test mode" against every row: ninety days of
                settled trading was being labelled as though none of it had been paid. */}
            <Td><span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              o.status==='refunded' ? 'bg-rose-50 text-rose-600'
              : o.paymentStatus==='paid' ? 'bg-emerald-50 text-emerald-600'
              : 'bg-amber-50 text-amber-600'}`}>
              {o.status==='refunded' ? 'Refund requested' : (PAYMENT_STATUS_LABELS[o.paymentStatus] ?? 'Paid')}
            </span></Td>
            <Td>{fmtDate(o.createdAt)}</Td>
            {canRefund && <Td>{o.status!=='refunded' && <button onClick={()=>setRefunding(o)} className="text-[12px] font-semibold text-rose-600 hover:underline">Request refund</button>}</Td>}
          </tr>))}
          {orders.length===0 && <tr><Td colSpan={5} className="text-center text-graphite-400 py-8">No transactions yet.</Td></tr>}
        </tbody></Table>
      </div>

      {refunding && (
        <ReasonDialog open={!!refunding} onOpenChange={(o)=>!o&&setRefunding(null)}
          title={`Request a refund for ${refunding.reference}?`}
          description="This records a refund request against the order — connect a live payment backend to actually move money."
          confirmLabel="Record refund request" onConfirm={requestRefund}/>
      )}
    </div>
  )
}
