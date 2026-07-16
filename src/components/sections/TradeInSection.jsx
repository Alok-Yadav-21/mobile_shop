import { Link } from 'react-router-dom'
import { ArrowLeftRight, Wallet, Truck } from 'lucide-react'

export function TradeInSection(){
  return (
    <section className="container-x py-6">
      <div className="surface p-8 sm:p-10 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet grid place-items-center"><ArrowLeftRight size={20}/></div>
          <h3 className="text-2xl sm:text-[28px] font-extrabold tracking-tight mt-4">Sell or trade in your device</h3>
          <p className="text-graphite-600 mt-2 max-w-lg leading-relaxed">Get an instant estimate for your phone, laptop or MacBook. Paid by cash, bank transfer or store credit — your choice.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-[12.5px] text-graphite-400">
            <span className="flex items-center gap-1.5"><Wallet size={14} className="text-brand"/> Same-day payout</span>
            <span className="flex items-center gap-1.5"><Truck size={14} className="text-brand"/> Free drop-off or collection</span>
          </div>
        </div>
        <Link to="/buy-sell" className="btn btn-brand whitespace-nowrap">Value my device</Link>
      </div>
    </section>
  )
}
