import { PageHero } from '@/components/common/PageHero.jsx'
import { PolicyDisclaimer } from '@/components/common/PolicyDisclaimer.jsx'
import { BRAND } from '@/constants/brand.js'

const SECTIONS = [
  ['What we collect', 'Contact details, device information and repair/order history needed to provide our services.'],
  ['How we use it', 'To manage your repairs, orders and trade-ins, and to contact you about their status.'],
  ['Data storage', 'In this development environment, account and order data is stored locally in your browser or in a Supabase project you control — never shared with third parties.'],
  ['Your rights', 'You can request a copy of your data or ask us to delete it at any time by contacting us.'],
]

export default function Privacy(){
  return (<>
    <PageHero kicker="Policy" title="Privacy policy" desc="How Virktech handles your personal information."/>
    <section className="container-x section-pad max-w-3xl">
      <PolicyDisclaimer/>
      <div className="space-y-8">
        {SECTIONS.map(([t,d])=>(
          <div key={t}><h2 className="font-bold text-[17px]">{t}</h2><p className="text-[14.5px] text-graphite-600 mt-2 leading-relaxed">{d}</p></div>
        ))}
        <div><h2 className="font-bold text-[17px]">Contact</h2><p className="text-[14.5px] text-graphite-600 mt-2 leading-relaxed">Questions about your data — {BRAND.email}.</p></div>
      </div>
    </section>
  </>)
}
