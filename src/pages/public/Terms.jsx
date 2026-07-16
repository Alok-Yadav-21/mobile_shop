import { PageHero } from '@/components/common/PageHero.jsx'
import { PolicyDisclaimer } from '@/components/common/PolicyDisclaimer.jsx'

const SECTIONS = [
  ['Using our services', 'By booking a repair, placing an order or submitting a trade-in through this site, you agree to these terms and our warranty policy.'],
  ['Bookings & quotes', 'Repair quotes are estimates confirmed after a free diagnostic. You will be asked to approve a final quote before chargeable work begins.'],
  ['Orders & payment', 'Orders placed through this site are processed in test/mock payment mode in this environment. No real payment is taken.'],
  ['Trade-in & buy-back', 'Trade-in offers are indicative until your device is inspected and verified in branch. Final payment is confirmed at that point.'],
  ['Liability', 'We are not liable for data loss during a repair — please back up your device beforehand where possible.'],
]

export default function Terms(){
  return (<>
    <PageHero kicker="Policy" title="Terms of service" desc="The terms that apply when you use Virktech's repair, retail and trade-in services."/>
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
