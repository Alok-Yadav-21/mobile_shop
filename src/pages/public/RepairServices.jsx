import { Link } from 'react-router-dom'
import { PageHero } from '@/components/common/PageHero.jsx'
import { ServiceCard } from '@/components/common/ServiceCard.jsx'
import { SERVICES } from '@/data/services.js'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.jsx'
import { Activity, ShieldCheck, ArrowRight, Battery, ScreenShare, HardDrive, Cpu } from 'lucide-react'

const CHECKS = [
  { icon:Battery, t:'Battery health', d:'Cycle count, capacity and charging behaviour.' },
  { icon:ScreenShare, t:'Display & touch', d:'Dead pixels, touch response, colour accuracy.' },
  { icon:HardDrive, t:'Storage & data', d:'Drive health, and safe data backup options.' },
  { icon:Cpu, t:'Core hardware', d:'Board, ports, cameras, speakers and sensors.' },
]

const GUIDE_PRICES = [
  ['Screen repair', 'from £69'],
  ['Battery replacement', 'from £39'],
  ['Charging port repair', 'from £45'],
  ['Diagnostics & data recovery', 'from £0'],
]

const FAQS = [
  { q:'How is the final price decided?', a:'Your device always gets a free diagnostic first. We confirm the exact price for your model and fault before any repair begins — the figures below are indicative guide prices only.' },
  { q:'What warranty do repairs carry?', a:'Every repair is covered by a 3-month warranty on parts and labour, at any of our 8 branches.' },
  { q:'Can I book online and pay in-branch?', a:'Yes — book a slot online, and pay once your quote is confirmed after diagnostics.' },
]

export default function RepairServices(){
  return (<>
    <PageHero kicker="Repair services" title="Expert repairs for every device" desc="iPhone, smartphone, laptop, MacBook, tablet and audio repairs — carried out by trained technicians, with a 3-month warranty on every job.">
      <div className="flex flex-wrap gap-3 mt-8">
        <Link to="/app/book" className="btn bg-white text-ink">Book a repair <ArrowRight size={16}/></Link>
        <Link to="/contact" className="btn btn-outline">Find a branch</Link>
      </div>
    </PageHero>

    <section className="container-x section-pad">
      <span className="kicker">What we repair</span>
      <h2 className="text-3xl font-extrabold tracking-tight mt-3">Every device, one warranty</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">{SERVICES.map(s=><ServiceCard key={s.title} {...s}/>)}</div>
    </section>

    <section className="bg-graphite-50 hairline-t border-b border-graphite-200">
      <div className="container-x section-pad grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="kicker">Free diagnostics</span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-3">What a full check covers</h2>
          <p className="text-graphite-500 mt-3 max-w-md leading-relaxed">Before any quote, every device goes through the same four-point diagnostic — so you know exactly what's wrong, and exactly what it costs to fix.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {CHECKS.map(c=>(
            <div key={c.t} className="bento-tile flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand grid place-items-center flex-none"><c.icon size={17}/></div>
              <div><div className="font-bold text-[14px]">{c.t}</div><div className="text-[12.5px] text-graphite-400 mt-1 leading-relaxed">{c.d}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="container-x section-pad">
      <div className="grid lg:grid-cols-[1fr_.9fr] gap-10">
        <div>
          <span className="kicker">Guide pricing</span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-3">Indicative repair pricing</h2>
          <p className="text-graphite-500 mt-3 max-w-md leading-relaxed">Sample guide prices for common repairs — your exact quote is always confirmed after a free diagnostic, before any work begins.</p>
          <div className="surface mt-6 divide-y divide-graphite-200">
            {GUIDE_PRICES.map(([t,p])=>(
              <div key={t} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-[14px] font-medium">{t}</span>
                <span className="mono-data text-[14px] font-bold text-brand">{p}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-graphite-400 mt-3 mono-data">Sample guide prices — not final quotes.</p>
        </div>
        <div className="surface-dark bg-ink-900 text-white p-7 flex flex-col justify-between">
          <div>
            <ShieldCheck className="text-signal mb-4" size={24}/>
            <h3 className="text-xl font-extrabold">Warranty-backed, always.</h3>
            <p className="text-slate-300 text-[13.5px] mt-2 leading-relaxed">Every completed repair — regardless of device or branch — carries the same 3-month warranty on parts and labour.</p>
          </div>
          <div className="flex items-center gap-2 mt-6 text-[12px] mono-data text-signal"><Activity size={14}/> 12,000+ repairs completed</div>
        </div>
      </div>
    </section>

    <section className="bg-graphite-50 hairline-t">
      <div className="container-x section-pad max-w-3xl">
        <span className="kicker">Questions</span>
        <h2 className="text-3xl font-extrabold tracking-tight mt-3 mb-6">Repairs FAQ</h2>
        <Accordion type="single" collapsible className="border-t border-graphite-200">
          {FAQS.map((f,i)=>(
            <AccordionItem key={i} value={`f-${i}`} className="border-graphite-200">
              <AccordionTrigger className="text-[15px] font-semibold hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-[14px] text-graphite-500 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  </>)
}
