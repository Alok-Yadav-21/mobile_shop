import { Link } from 'react-router-dom'
import { PageHero } from '@/components/common/PageHero.jsx'
import { PromiseStrip } from '@/components/sections/PromoBanner.jsx'
import { Reveal } from '@/components/ui-fx/Reveal.jsx'
import { SERVICES } from '@/data/services.js'
import { ArrowRight, Wrench, ArrowLeftRight, ShoppingBag, RefreshCw, ShieldCheck, Clock } from 'lucide-react'
import iphone from '@/assets/img/iphone.jpg'
import samsung from '@/assets/img/samsung.jpg'
import macbook from '@/assets/img/macbook.jpg'
import earpods from '@/assets/img/earpods.jpg'

// This page previously re-exported RepairServices, so /services and /repair-services served
// byte-identical content behind two nav items — duplicate pages competing with each other.
//
// The split now follows what the business actually does: this is the overview of all four
// things Virktech offers, and /repair-services is the deep page for one of them (device
// types, diagnostics, guide pricing, repairs FAQ). Neither repeats the other.
const PILLARS = [
  {
    eyebrow: 'Fix it', label: 'Repairs', ghost: 'REPAIR', to: '/repair-services', img: iphone,
    bg: 'bg-brand', text: 'text-white', ghostText: 'text-white/15', span: 'sm:col-span-2',
    desc: 'Phones, laptops, MacBooks, tablets and audio. Free diagnostic first, fixed quote before any work, 3-month warranty after.',
    icon: Wrench,
  },
  {
    eyebrow: 'Buy it', label: 'Shop devices', ghost: 'SHOP', to: '/products', img: samsung,
    bg: 'bg-ink-900', text: 'text-white', ghostText: 'text-white/10', span: 'sm:col-span-2',
    desc: 'New, used and refurbished phones, laptops and audio — every one covered by the same warranty.',
    icon: ShoppingBag,
  },
  {
    eyebrow: 'Sell or upgrade', label: 'Sell & trade-in', ghost: 'SELL', to: '/buy-sell', img: earpods,
    bg: 'bg-sun', text: 'text-ink', ghostText: 'text-ink/10', span: 'sm:col-span-2',
    desc: 'Sell outright for cash, or put your old device toward a newer one. Instant estimate, confirmed on inspection.',
    icon: ArrowLeftRight,
  },
  {
    eyebrow: 'Save', label: 'Refurbished', ghost: 'REFURB', to: '/refurbished', img: macbook,
    bg: 'bg-grass', text: 'text-white', ghostText: 'text-white/15', span: 'sm:col-span-2',
    desc: 'Certified refurbished phones and laptops, tested to the same standard as our repairs and sold with warranty.',
    icon: RefreshCw,
  },
]

function Pillar({ p }) {
  return (
    <Link
      to={p.to}
      className={`group relative overflow-hidden rounded-2xl ${p.bg} ${p.text} h-full min-h-[240px] p-7 flex flex-col justify-between`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-4 left-5 font-extrabold tracking-tighter leading-none select-none ${p.ghostText}`}
        style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)' }}
      >
        {p.ghost}
      </span>

      <div className="relative max-w-[30ch]">
        <p.icon size={22} className="opacity-80" />
        <div className="text-[12px] font-semibold opacity-70 mt-4">{p.eyebrow}</div>
        <div className="text-[24px] font-extrabold tracking-tight leading-tight">{p.label}</div>
        <p className="text-[13.5px] mt-2 opacity-90 leading-relaxed">{p.desc}</p>
      </div>

      <div className="relative flex items-end justify-between gap-4 mt-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-ink text-[12.5px] font-bold px-4 py-2 transition-transform group-hover:-translate-y-0.5">
          Learn more <ArrowRight size={14} />
        </span>
        <img
          src={p.img} alt="" aria-hidden="true" loading="lazy"
          className="w-24 h-24 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2"
        />
      </div>
    </Link>
  )
}

export default function Services() {
  return (
    <>
      <PageHero
        kicker="What we do"
        title="Four services, one connected network"
        ghost="SERVICES"
        desc="Virktech repairs, buys, sells and trades in technology across 8 branches — one account, one warranty standard, whichever you use."
      />

      <section className="container-x pt-6">
        <div className="grid sm:grid-cols-4 gap-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.label} delay={i * 0.05} className={`${p.span} h-full`}>
              <Pillar p={p} />
            </Reveal>
          ))}
        </div>
      </section>

      <PromiseStrip />

      {/* Repair specifics live on /repair-services; this is a pointer to them, not a copy. */}
      <section className="container-x pb-16">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
          <div>
            <span className="text-[12px] font-bold uppercase tracking-wide text-brand">Repairs in detail</span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-2">What we can fix</h2>
          </div>
          <Link to="/repair-services" className="btn rounded-full bg-white text-ink border border-graphite-200 hover:border-ink btn-sm">
            Guide prices &amp; FAQ <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="rounded-2xl border border-graphite-200 bg-white p-5 hover:border-ink transition-colors">
              <s.icon size={20} className="text-brand" />
              <div className="font-bold text-[14px] mt-3">{s.title}</div>
              <div className="text-[12.5px] text-graphite-400 mt-1 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-10">
          {[
            { icon: ShieldCheck, t: '3-month warranty', d: 'Parts and labour, at any branch, on every completed repair.' },
            { icon: Clock, t: 'Most repairs same day', d: 'Screens and batteries are usually done while you wait.' },
            { icon: Wrench, t: 'Free diagnostic first', d: 'You get a fixed price before anyone opens your device.' },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-3">
              <f.icon size={22} className="text-brand flex-none mt-0.5" strokeWidth={1.6} />
              <div>
                <div className="font-bold text-[14px]">{f.t}</div>
                <div className="text-[12.5px] text-graphite-400 mt-1 leading-relaxed">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
