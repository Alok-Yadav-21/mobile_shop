import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHero } from '@/components/common/PageHero.jsx'
import { Smartphone, Laptop, Tablet, Headphones, Wallet, Truck, ShieldCheck, ArrowRight } from 'lucide-react'

const DEVICE_TYPES = [
  { icon:Smartphone, label:'Phones', guide:'£40 – £550' },
  { icon:Laptop, label:'Laptops & MacBooks', guide:'£80 – £900' },
  { icon:Tablet, label:'Tablets', guide:'£30 – £400' },
  { icon:Headphones, label:'Audio & wearables', guide:'£15 – £150' },
]

const STEPS = [
  ['Tell us about it', 'Device, model, storage and condition — online or in branch.'],
  ['Get an instant guide price', 'A same-day estimate based on your answers.'],
  ['We verify in-branch', 'Quick condition check and ID/IMEI verification.'],
  ['Get paid your way', 'Cash, bank transfer or store credit — your choice.'],
]

export default function BuySell(){
  const [active,setActive]=useState(0)
  return (<>
    <PageHero kicker="Buy · Sell · Trade-in" title="Sell your device, or upgrade for less" desc="Get a fair estimate for your phone, laptop or MacBook. Bring it to any branch, verify ownership, and choose cash, transfer or store credit.">
      <div className="flex flex-wrap gap-3 mt-8">
        <Link to="/app/sell" className="btn bg-white text-ink">Value my device <ArrowRight size={16}/></Link>
        <Link to="/refurbished" className="btn btn-outline">Shop refurbished instead</Link>
      </div>
    </PageHero>

    <section className="container-x section-pad">
      <span className="kicker">Guide values</span>
      <h2 className="text-3xl font-extrabold tracking-tight mt-3 mb-2">What's my device worth?</h2>
      <p className="text-graphite-500 max-w-xl mb-8">Indicative ranges only — your exact offer depends on model, storage and condition, confirmed after a free in-branch check.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEVICE_TYPES.map((d,i)=>(
          <button key={d.label} onClick={()=>setActive(i)}
            className={`bento-tile text-left transition-colors ${active===i?'border-brand':''}`}>
            <d.icon size={20} className={active===i?'text-brand':'text-graphite-400'}/>
            <div className="font-bold text-[14.5px] mt-3">{d.label}</div>
            <div className="text-[13px] mono-data text-graphite-500 mt-1">{d.guide}</div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-graphite-400 mt-4 mono-data">Sample guide ranges — not a fixed offer.</p>
    </section>

    <section className="bg-graphite-50 hairline-t border-b border-graphite-200">
      <div className="container-x section-pad">
        <span className="kicker">How trade-in works</span>
        <h2 className="text-3xl font-extrabold tracking-tight mt-3 mb-10">Four steps, paid same day</h2>
        <div className="max-w-2xl space-y-0">
          {STEPS.map(([t,d],i)=>(
            <div key={t} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-white border-2 border-brand text-brand grid place-items-center font-bold text-[13px] mono-data flex-none">{i+1}</div>
                {i<STEPS.length-1 && <div className="w-px flex-1 bg-graphite-200 my-1"/>}
              </div>
              <div className="pb-8">
                <h3 className="font-bold text-[15px]">{t}</h3>
                <p className="text-[13.5px] text-graphite-500 mt-1 leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="container-x section-pad">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3"><Wallet className="text-brand" size={20}/><span className="text-[13.5px] font-semibold">Same-day payout</span></div>
        <div className="flex items-center gap-3"><Truck className="text-brand" size={20}/><span className="text-[13.5px] font-semibold">Free drop-off or collection</span></div>
        <div className="flex items-center gap-3"><ShieldCheck className="text-brand" size={20}/><span className="text-[13.5px] font-semibold">Data wiped securely</span></div>
      </div>
      <div className="mt-10"><Link to="/app/sell" className="btn btn-brand">Value my device</Link></div>
    </section>
  </>)
}
