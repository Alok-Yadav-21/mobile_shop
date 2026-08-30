import { Avatar, AvatarFallback } from '@/components/ui/avatar.jsx'
import { InfiniteMovingCards } from '@/components/ui-fx/InfiniteMovingCards.jsx'
import { Reveal } from '@/components/ui-fx/Reveal.jsx'

const FEATURED = { q: 'Booked online, tracked it live, collected same day. Very professional — and it\'s the same trusted team, just a sharper way of doing things.', n: 'Sara K.', b: 'Sidcup', r: 5 }

const MORE = [
  { q: 'Fixed my iPhone screen in 30 minutes.', n: 'Maria L.', b: 'Woolwich' },
  { q: 'Sold my old MacBook and upgraded — easy and fair.', n: 'Tom R.', b: 'Belvedere' },
  { q: 'Free diagnostic saved me from an unnecessary repair.', n: 'Josh P.', b: 'Orpington' },
  { q: 'Battery replaced while I waited. No fuss, fair price.', n: 'Hassan A.', b: 'New Eltham' },
  { q: 'Cracked back glass sorted the same afternoon.', n: 'Grace T.', b: 'Herbert Road' },
  { q: 'Straight answer on what was worth fixing and what was not.', n: 'Ben C.', b: 'Beresford Square' },
]

function Quote({ t }) {
  return (
    <figure className="bento-tile w-[290px] sm:w-[330px] h-full flex items-start gap-3">
      <Avatar className="w-8 h-8 flex-none">
        <AvatarFallback className="bg-brand-50 text-brand font-bold text-[11px]">{t.n[0]}</AvatarFallback>
      </Avatar>
      <div>
        <blockquote className="text-[13.5px] text-graphite-600 leading-relaxed">“{t.q}”</blockquote>
        <figcaption className="text-[12px] font-semibold mt-2">
          {t.n} <span className="text-graphite-400 font-normal">· {t.b}</span>
        </figcaption>
      </div>
    </figure>
  )
}

export function Testimonials() {
  return (
    <section className="bg-white section-pad overflow-hidden">
      <div className="container-x">
        <span className="kicker">Trusted locally</span>

        <Reveal>
          <div className="surface p-8 sm:p-10 mt-3 max-w-3xl">
            <div className="text-amber-500 mb-4" aria-label={`${FEATURED.r} out of 5`}>{'★'.repeat(FEATURED.r)}</div>
            <blockquote className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug text-ink">
              “{FEATURED.q}”
            </blockquote>
            <div className="flex items-center gap-3 mt-8">
              <Avatar><AvatarFallback className="bg-ink-900 text-white font-bold text-[13px]">{FEATURED.n[0]}</AvatarFallback></Avatar>
              <div>
                <div className="font-semibold text-[14px]">{FEATURED.n}</div>
                <div className="text-graphite-400 text-[12.5px]">{FEATURED.b} branch</div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Full-bleed so the row runs past the container edges, which is what makes it read as
          a continuous stream rather than a list that happens to move. */}
      <InfiniteMovingCards
        className="mt-6"
        items={MORE}
        speed="slow"
        renderItem={(t) => <Quote t={t} />}
      />
    </section>
  )
}
