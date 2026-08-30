import { Link } from 'react-router-dom'
import { Reveal } from '@/components/ui-fx/Reveal.jsx'
import iphone from '@/assets/img/iphone.jpg'
import laptop from '@/assets/img/laptop.jpg'
import watch from '@/assets/img/watch.jpg'
import earbuds from '@/assets/img/earbuds.jpg'
import speaker from '@/assets/img/speaker.jpg'
import macbook from '@/assets/img/macbook.jpg'

// The colour-blocked category grid from the reference: saturated slabs, a small eyebrow, a
// short label, an oversized ghost word behind the product shot, and a pill button.
//
// Each tile carries its own text colour rather than deriving one, because the yellow block
// needs near-black type while the red, green and blue need white — a single rule would fail
// contrast on one of them.
const TILES = [
  { eyebrow: 'Repair',  label: 'Phones',    ghost: 'IPHONE',  to: '/repair-services', img: iphone,  bg: 'bg-ink-900',      text: 'text-white', ghostText: 'text-white/10',  span: 'sm:col-span-1' },
  { eyebrow: 'Repair',  label: 'Wearables', ghost: 'WATCH',   to: '/repair-services', img: watch,   bg: 'bg-sun',          text: 'text-ink',   ghostText: 'text-ink/10',    span: 'sm:col-span-1' },
  { eyebrow: 'Trending', label: 'Laptops',  ghost: 'LAPTOP',  to: '/products',        img: laptop,  bg: 'bg-brand',        text: 'text-white', ghostText: 'text-white/15',  span: 'sm:col-span-2' },
  { eyebrow: 'Best',    label: 'MacBooks',  ghost: 'MACBOOK', to: '/products',        img: macbook, bg: 'bg-graphite-100', text: 'text-ink',   ghostText: 'text-ink/[.07]', span: 'sm:col-span-2' },
  { eyebrow: 'Audio',   label: 'Earbuds',   ghost: 'AUDIO',   to: '/products',        img: earbuds, bg: 'bg-grass',        text: 'text-white', ghostText: 'text-white/15',  span: 'sm:col-span-1' },
  { eyebrow: 'New',     label: 'Speakers',  ghost: 'SOUND',   to: '/products',        img: speaker, bg: 'bg-sky',          text: 'text-white', ghostText: 'text-white/15',  span: 'sm:col-span-1' },
]

function Tile({ t }) {
  return (
    <Link
      to={t.to}
      className={`group relative overflow-hidden rounded-2xl ${t.bg} ${t.text} h-full min-h-[210px] p-6 flex flex-col justify-between`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-3 left-4 right-4 font-extrabold tracking-tighter leading-none select-none ${t.ghostText}`}
        style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)' }}
      >
        {t.ghost}
      </span>

      <div className="relative">
        <div className="text-[12px] font-semibold opacity-70">{t.eyebrow}</div>
        <div className="text-[22px] font-extrabold tracking-tight leading-tight">{t.label}</div>
      </div>

      <div className="relative flex items-end justify-between gap-4">
        <span className="inline-flex items-center rounded-full bg-white text-ink text-[12.5px] font-bold px-4 py-2 shadow-sm transition-transform group-hover:-translate-y-0.5">
          Browse
        </span>
        <img
          src={t.img}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2"
        />
      </div>
    </Link>
  )
}

export function CategoryBlocks() {
  return (
    <section className="container-x pt-6">
      <div className="grid sm:grid-cols-4 gap-4">
        {TILES.map((t, i) => (
          <Reveal key={t.label} delay={i * 0.05} className={`${t.span} h-full`}>
            <Tile t={t} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}
