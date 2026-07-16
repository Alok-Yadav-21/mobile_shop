import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { OrderAPI } from '@/services/api.js'
import { money, fmtDate } from '@/utils/format.js'
import { CheckCircle2 } from 'lucide-react'

export default function OrderConfirmation(){
  const { ref } = useParams()
  const [order,setOrder]=useState(undefined)

  useEffect(()=>{ OrderAPI.get(ref).then(setOrder) },[ref])

  if(order===undefined) return <div className="container-x py-24 text-center text-graphite-400">Loading order…</div>
  if(!order) return <div className="container-x py-24 text-center text-graphite-400">Order not found.</div>

  return (
    <div className="container-x py-16 sm:py-20 max-w-lg mx-auto text-center">
      <div className="w-14 h-14 rounded-full bg-signal/10 text-signal grid place-items-center mx-auto"><CheckCircle2 size={28}/></div>
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-5">Order confirmed</h1>
      <p className="text-graphite-500 mt-2">Thanks {order.customerName?.split(' ')[0]||''} — we've received your order.</p>

      <div className="surface p-6 mt-8 text-left">
        <div className="flex justify-between text-[13.5px] mb-3"><span className="text-graphite-500">Reference</span><span className="font-bold mono-data">{order.reference}</span></div>
        <div className="flex justify-between text-[13.5px] mb-3"><span className="text-graphite-500">Placed</span><span className="mono-data">{fmtDate(order.createdAt)}</span></div>
        <div className="flex justify-between text-[13.5px] mb-3"><span className="text-graphite-500">Payment</span><span className="font-semibold text-amber-600">Test mode</span></div>
        <div className="border-t border-graphite-200 pt-3 mt-3 space-y-2">
          {order.items?.map(i=>(
            <div key={i.productId} className="flex justify-between text-[13px] text-graphite-600"><span>{i.name} × {i.quantity}</span><span className="mono-data">{money(i.price*i.quantity)}</span></div>
          ))}
        </div>
        <div className="flex justify-between font-bold text-[16px] pt-3 mt-3 border-t border-graphite-200"><span>Total</span><span className="mono-data">{money(order.total)}</span></div>
      </div>

      <div className="flex justify-center gap-3 mt-8">
        <Link to="/products" className="btn btn-ghost">Continue shopping</Link>
        <Link to="/" className="btn btn-brand">Back home</Link>
      </div>
    </div>
  )
}
