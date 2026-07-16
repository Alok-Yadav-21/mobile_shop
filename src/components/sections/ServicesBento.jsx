import { SERVICES } from '@/data/services.js'
import { ServiceCard } from '@/components/common/ServiceCard.jsx'

export function ServicesBento(){
  const [anchor, ...rest] = SERVICES
  return (
    <section className="container-x section-pad">
      <div className="max-w-2xl">
        <span className="kicker">Repairs & tech services</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">Everything your tech needs</h2>
        <p className="text-graphite-400 mt-3 text-[15px]">Not just phones — Virktech repairs and services phones, laptops, MacBooks, tablets, audio and wearables.</p>
      </div>
      <div className="bento mt-9">
        <ServiceCard {...anchor} featured/>
        {rest.map(s=><ServiceCard key={s.title} {...s}/>)}
      </div>
    </section>
  )
}
