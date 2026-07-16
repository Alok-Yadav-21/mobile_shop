import { PageHero } from '@/components/common/PageHero.jsx'
import { BRANCHES } from '@/data/branches.js'
import { MapPin, Phone } from 'lucide-react'
import { BRAND } from '@/constants/brand.js'

export default function Branches(){
  return (<>
    <PageHero kicker="Our branches" title="8 branches, one connected network" desc="Serving South-East London and North-West Kent. Same account, same warranty, same tracked service — wherever you visit."/>
    <section className="container-x section-pad">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {BRANCHES.map(b=>(
          <div key={b.id} className="bento-tile">
            <MapPin size={18} className="text-brand"/>
            <div className="font-bold text-[15px] mt-3">{b.area.split('—')[0].trim()}</div>
            <div className="text-[11.5px] text-graphite-400 mt-0.5">{b.local}</div>
            <div className="text-[13px] text-graphite-600 mt-3 leading-relaxed">{b.addr}<br/><span className="mono-data">{b.pc}</span></div>
            <a href={`tel:${BRAND.phone.replace(/\s+/g,'')}`} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand mt-3"><Phone size={13}/> {BRAND.phone}</a>
          </div>
        ))}
      </div>
    </section>
  </>)
}
