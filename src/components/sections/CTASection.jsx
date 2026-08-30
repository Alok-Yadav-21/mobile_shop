import { Link } from 'react-router-dom'
import { Wrench, ArrowLeftRight, ShoppingBag } from 'lucide-react'
import { Meteors } from '@/components/ui-fx/Meteors.jsx'

const PATHS = [
  { icon:Wrench, label:'Book a repair', desc:'Get a diagnostic & quote', to:'/app/book' },
  { icon:ArrowLeftRight, label:'Sell a device', desc:'Instant estimate, paid same day', to:'/buy-sell' },
  { icon:ShoppingBag, label:'Shop devices', desc:'New & certified refurbished', to:'/products' },
]

export function CTASection(){
  return (
    <section className="container-x pb-20 pt-4">
      <div className="rounded-3xl bg-ink-900 text-white p-10 sm:p-14 relative overflow-hidden">
        <Meteors number={16}/>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet to-transparent" aria-hidden/>
        <div className="relative text-center max-w-lg mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready when your tech isn't.</h2>
          <p className="text-slate-300 mt-3">Whatever the device, whatever the need — Virktech has a path for it.</p>
        </div>
        <div className="relative grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
          {PATHS.map(p=>(
            <Link key={p.label} to={p.to} className="group bg-white/[.04] border border-white/10 rounded-2xl p-5 hover:border-brand/50 hover:bg-white/[.07] transition-colors">
              <p.icon size={20} className="text-brand"/>
              <div className="font-bold text-[14.5px] mt-3">{p.label}</div>
              <div className="text-[12px] text-slate-400 mt-1">{p.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
