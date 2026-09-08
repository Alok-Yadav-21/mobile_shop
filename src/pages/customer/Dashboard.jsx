import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { RepairAPI, OrderAPI, LoyaltyAPI } from '@/services/api.js'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { StatusBadge } from '@/components/common/StatusBadge.jsx'
import { money } from '@/utils/format.js'
import { Wrench, ClipboardList, ShoppingBag, ArrowLeftRight, ArrowRight, Star } from 'lucide-react'

export default function Dashboard(){
  const { user } = useAuth()
  const { data:reps=[] } = useAsync(()=>RepairAPI.forCustomer(), [user])
  const { data:orders=[] } = useAsync(()=>OrderAPI.list(user?.id), [user])
  const { data:loyalty } = useAsync(()=>LoyaltyAPI.summary(), [user?.id])
  const active = reps.filter(r=>!['Completed','Cancelled'].includes(r.status)).length

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Welcome back, {user?.name?.split(' ')[0]||'there'}</h1>
      <p className="text-graphite-400 mt-1 text-[14px]">Book a repair, track progress or shop the latest tech.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <DashboardCard icon={Wrench} label="Active repairs" value={active} tone="brand" index={0}/>
        <DashboardCard icon={ClipboardList} label="Total repairs" value={reps.length} tone="violet" index={1}/>
        <DashboardCard icon={ShoppingBag} label="Orders" value={orders.length} tone="green" index={2}/>
        {/* The credit, not the raw points: what it is worth is the part a customer acts on, and
            the points are one click away on the loyalty page. */}
        <Link to="/app/loyalty" className="block">
          <DashboardCard icon={Star} label="Loyalty points" value={loyalty?.points ?? 0} tone="amber" index={3}
            hint={`${money(loyalty?.credit ?? 0)} credit available`}/>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Link to="/app/book" className="bento-tile flex items-center justify-between">
          <div><div className="w-9 h-9 rounded-lg bg-brand-50 text-brand grid place-items-center mb-3"><Wrench size={17}/></div><div className="font-bold text-[15px]">Book a repair</div><p className="text-[12.5px] text-graphite-400">Phone, laptop, MacBook & more</p></div>
          <ArrowRight className="text-brand flex-none" size={18}/>
        </Link>
        <Link to="/app/sell" className="bento-tile flex items-center justify-between">
          <div><div className="w-9 h-9 rounded-lg bg-violet-50 text-violet grid place-items-center mb-3"><ArrowLeftRight size={17}/></div><div className="font-bold text-[15px]">Sell a device</div><p className="text-[12.5px] text-graphite-400">Get an instant estimate</p></div>
          <ArrowRight className="text-brand flex-none" size={18}/>
        </Link>
      </div>

      <h2 className="font-bold text-[16px] mt-8 mb-3">Recent repairs</h2>
      <div className="surface divide-y divide-graphite-200">
        {reps.slice(0,4).map(r=>(
          <Link to={`/app/repairs/${r.ref}`} key={r.ref} className="flex items-center justify-between px-5 py-3.5 hover:bg-graphite-50 transition-colors">
            <div><div className="font-bold text-[13.5px] mono-data">{r.ref}</div><div className="text-[12.5px] text-graphite-400">{r.brand} {r.model} · {r.problem}</div></div>
            <StatusBadge status={r.status} audience="customer" repair={r}/>
          </Link>
        ))}
        {reps.length===0 && <div className="p-8 text-center text-graphite-400 text-[13.5px]">No repairs yet — <Link to="/app/book" className="text-brand font-semibold">book one</Link>.</div>}
      </div>
    </div>
  )
}
