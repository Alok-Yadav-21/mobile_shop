import { Link } from 'react-router-dom'
import { PageHero } from '@/components/common/PageHero.jsx'
import { BRAND } from '@/constants/brand.js'
import { BRANCHES } from '@/data/branches.js'
import { ShieldCheck, Wrench, Users, MapPin, ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/ui-fx/Reveal.jsx'
import { GlowCard } from '@/components/ui-fx/GlowCard.jsx'

const VALUES = [
  { icon:Wrench, t:'Trained technicians', d:'In-house repair specialists, not outsourced third parties.' },
  { icon:ShieldCheck, t:'Warranty on everything', d:'3 months on every repair, across every branch.' },
  { icon:Users, t:'Local, since day one', d:'The same faces and branches customers already trust.' },
]

export default function About(){
  return (<>
    <PageHero kicker="About Virktech" title={BRAND.lockup} desc="Virktech is the modern technology brand behind Smart Phones Repair — the local name customers have trusted for years."/>

    <Reveal className="container-x section-pad max-w-3xl block">
      <p className="text-[17px] text-graphite-700 leading-relaxed">
        Same people, same branches, a bigger promise: a complete platform to repair, buy and sell phones, laptops, MacBooks, audio and smart devices.
        {' '}{BRAND.recognition}.
      </p>
      <p className="text-[15px] text-graphite-500 mt-4 leading-relaxed">
        We operate 8 branches across South-East London and North-West Kent, every one backed by the same account, warranty and tracked service —
        so whichever branch you visit, the experience is identical.
      </p>
    </Reveal>

    <section className="bg-graphite-50 hairline-t border-b border-graphite-200">
      <div className="container-x section-pad">
        <span className="kicker">What we stand for</span>
        <h2 className="text-3xl font-extrabold tracking-tight mt-3 mb-10">Built on trust, not templates</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {VALUES.map((v,i)=>(
            <Reveal key={v.t} delay={i*0.07}>
              <GlowCard className="bento-tile h-full">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand grid place-items-center"><v.icon size={20}/></div>
                <h3 className="font-bold text-[15px] mt-4">{v.t}</h3>
                <p className="text-[13.5px] text-graphite-400 mt-1.5 leading-relaxed">{v.d}</p>
              </GlowCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <section className="container-x section-pad">
      <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <span className="kicker">Where to find us</span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-3">8 branches across London & Kent</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-[13px] text-graphite-500">
            {BRANCHES.map(b=><span key={b.id} className="flex items-center gap-1.5"><MapPin size={13} className="text-brand"/>{b.area.split('—')[0].trim()}</span>)}
          </div>
        </div>
        <Link to="/branches" className="btn btn-brand whitespace-nowrap">View all branches <ArrowRight size={16}/></Link>
      </div>
    </section>
  </>)
}
