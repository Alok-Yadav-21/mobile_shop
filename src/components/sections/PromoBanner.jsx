import { Link } from 'react-router-dom'
import { Truck, ShieldCheck, Headphones, CreditCard } from 'lucide-react'
import { Reveal } from '@/components/ui-fx/Reveal.jsx'
import watch from '@/assets/img/watch.jpg'
import samsung from '@/assets/img/samsung.jpg'

const PROMISES = [
  { icon: Truck, t: 'Free collection', d: 'On repairs over £99' },
  { icon: ShieldCheck, t: '3-month warranty', d: 'Parts and labour' },
  { icon: Headphones, t: 'Support 7 days', d: 'Across all 8 branches' },
  { icon: CreditCard, t: 'Pay on collection', d: 'No deposit needed' },
]

// The reference's thin promise strip: four icon + label pairs on white, sitting between the
// colour blocks. Deliberately flat and quiet — it is reassurance, and it works by being the
// calmest thing on the page.
export function PromiseStrip() {
  return (
    <section className="container-x py-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {PROMISES.map((p) => (
          <div key={p.t} className="flex items-center gap-3">
            <p.icon size={26} className="text-brand flex-none" strokeWidth={1.5} />
            <div>
              <div className="font-bold text-[13.5px] leading-tight">{p.t}</div>
              <div className="text-[12px] text-graphite-400 mt-0.5">{p.d}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// Full-bleed colour slab with an oversized ghost word, a product shot breaking the top edge,
// and a pill CTA. `tone` picks the block colour so the two banners on the page can differ
// without duplicating the markup.
const TONES = {
  brand: { bg: 'bg-brand', ghost: 'text-white/20', text: 'text-white' },
  grass: { bg: 'bg-grass', ghost: 'text-white/20', text: 'text-white' },
}

export function PromoBanner({
  tone = 'brand',
  kicker = '20% off',
  ghost = 'FIX',
  title = 'Summer service',
  body = 'Book any screen or battery repair this month and collect the same day at your nearest branch.',
  cta = 'Book a repair',
  to = '/app/book',
  img = watch,
  flip = false,
}) {
  const t = TONES[tone] ?? TONES.brand

  return (
    <Reveal className="container-x py-4 block">
      <div className={`relative overflow-hidden rounded-3xl ${t.bg} ${t.text} px-8 sm:px-12 py-12`}>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-4 ${flip ? 'right-6' : 'left-6'} font-extrabold tracking-tighter leading-none select-none ${t.ghost}`}
          style={{ fontSize: 'clamp(4rem, 13vw, 9rem)' }}
        >
          {ghost}
        </span>

        <div className={`relative grid sm:grid-cols-[1fr_auto] gap-8 items-center ${flip ? 'sm:[direction:rtl]' : ''}`}>
          <div className={flip ? 'sm:[direction:ltr]' : ''}>
            <span className="text-[12.5px] font-bold uppercase tracking-wide opacity-80">{kicker}</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">{title}</h2>
            <p className="text-[14px] mt-3 max-w-md opacity-90 leading-relaxed">{body}</p>
            <Link to={to} className="inline-flex items-center rounded-full bg-white text-ink font-bold text-[13.5px] px-6 py-3 mt-6 hover:-translate-y-0.5 transition-transform">
              {cta}
            </Link>
          </div>
          <img
            src={img}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="hidden sm:block w-52 h-52 object-cover rounded-2xl shadow-2xl"
          />
        </div>
      </div>
    </Reveal>
  )
}

export function PromoBannerSecondary() {
  return (
    <PromoBanner
      tone="grass"
      kicker="Trade in"
      ghost="TRADE"
      title="Your old device is worth something"
      body="Get an instant estimate, drop it at any branch and get paid the same day — or put it toward an upgrade."
      cta="Get an estimate"
      to="/buy-sell"
      img={samsung}
      flip
    />
  )
}
