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
import { PoundSterling, RotateCcw, CircleAlert } from 'lucide-react'

export default function Payments(){
  const { user:me } = useAuth()
  const { data:orders=[], refetch } = useAsync(()=>OrderAPI.list(),[])
  const [refunding,setRefunding]=useState(null)
  const canRefund = can(me?.role,'refundOrder')
  const total = orders.reduce((s,o)=>s+(o.total||0),0)
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

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <DashboardCard icon={PoundSterling} label="Total processed (test mode)" value={money(total)} tone="brand"/>
        <DashboardCard icon={RotateCcw} label="Refund requests" value={refunded.length} tone="amber"/>
        <DashboardCard label="Transactions" value={orders.length} tone="violet"/>
      </div>

      <div className="surface overflow-x-auto">
        <Table><thead><tr><Th>Reference</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th>{canRefund&&<Th></Th>}</tr></thead>
        <tbody>{orders.map(o=>(
          <tr key={o.reference} className="hover:bg-graphite-50">
            <Td className="font-bold mono-data text-brand">{o.reference}</Td>
            <Td className="mono-data">{money(o.total)}</Td>
            <Td><span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${o.status==='refunded'?'bg-rose-50 text-rose-600':'bg-amber-50 text-amber-600'}`}>{o.status==='refunded'?'Refund requested':'Test mode'}</span></Td>
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
