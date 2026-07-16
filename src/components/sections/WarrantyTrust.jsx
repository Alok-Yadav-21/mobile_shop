import { ShieldCheck, Truck, Lock, BadgeCheck } from 'lucide-react'

const POINTS = [
  { icon:ShieldCheck, title:'3-month warranty', desc:'Every repair is covered on parts and labour, no exceptions.' },
  { icon:BadgeCheck, title:'Certified technicians', desc:'Trained, in-house specialists — not third-party outsourcing.' },
  { icon:Truck, title:'Collection or delivery', desc:'Drop in, or we collect and deliver back to your door.' },
  { icon:Lock, title:'Secure checkout', desc:'Protected card payments on every order and repair.' },
]

export function WarrantyTrust(){
  return (
    <section className="bg-graphite-50 hairline-t border-b border-graphite-200">
      <div className="container-x section-pad grid lg:grid-cols-[.8fr_1.2fr] gap-10">
        <div>
          <span className="kicker">Why Virktech</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">Trusted the way a local repair shop should be.</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {POINTS.map(p=>(
            <div key={p.title} className="flex gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-graphite-200 text-brand grid place-items-center flex-none"><p.icon size={18}/></div>
              <div><div className="font-bold text-[14.5px]">{p.title}</div><div className="text-[13px] text-graphite-400 mt-1 leading-relaxed">{p.desc}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
