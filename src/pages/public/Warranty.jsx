import { PageHero } from '@/components/common/PageHero.jsx'
import { PolicyDisclaimer } from '@/components/common/PolicyDisclaimer.jsx'
import { ShieldCheck } from 'lucide-react'

const SECTIONS = [
  ['What is covered', 'Repairs carried out by Virktech are covered against faults in the parts fitted and the workmanship of the repair itself, for the warranty period stated on your repair receipt (typically 3 months).'],
  ['What is not covered', 'Warranty does not cover accidental damage occurring after collection, liquid damage, unauthorised third-party repairs, or faults unrelated to the original repair.'],
  ['How to make a claim', 'Bring your device and repair reference to any branch, or start a claim through your account. We will re-diagnose the device free of charge before any further work.'],
  ['Product warranty', 'New and certified refurbished products carry the warranty period stated on the product listing at time of purchase.'],
]

export default function Warranty(){
  return (<>
    <PageHero kicker="Policy" title="Warranty policy" desc="Every repair and product from Virktech is backed by a clear warranty commitment.">
      <div className="flex items-center gap-2 mt-7 text-[13px] text-slate-300"><ShieldCheck size={16} className="text-signal"/> 3-month warranty as standard on repairs</div>
    </PageHero>
    <section className="container-x section-pad max-w-3xl">
      <PolicyDisclaimer/>
      <div className="space-y-8">
        {SECTIONS.map(([t,d])=>(
          <div key={t}><h2 className="font-bold text-[17px]">{t}</h2><p className="text-[14.5px] text-graphite-600 mt-2 leading-relaxed">{d}</p></div>
        ))}
      </div>
    </section>
  </>)
}
