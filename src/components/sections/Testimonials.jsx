import { Avatar, AvatarFallback } from '@/components/ui/avatar.jsx'

const FEATURED = { q:'Booked online, tracked it live, collected same day. Very professional — and it\'s the same trusted team, just a sharper way of doing things.', n:'Sara K.', b:'Sidcup', r:5 }
const MORE = [
  { q:'Fixed my iPhone screen in 30 minutes.', n:'Maria L.', b:'Woolwich' },
  { q:'Sold my old MacBook and upgraded — easy and fair.', n:'Tom R.', b:'Belvedere' },
  { q:'Free diagnostic saved me from an unnecessary repair.', n:'Josh P.', b:'Orpington' },
]

export function Testimonials(){
  return (
    <section className="bg-white section-pad">
      <div className="container-x">
        <span className="kicker">Trusted locally</span>
        <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-10 mt-3">
          <div className="surface p-8 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="text-amber-500 mb-4">{'★'.repeat(FEATURED.r)}</div>
              <p className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug text-ink">"{FEATURED.q}"</p>
            </div>
            <div className="flex items-center gap-3 mt-8">
              <Avatar><AvatarFallback className="bg-ink-900 text-white font-bold text-[13px]">{FEATURED.n[0]}</AvatarFallback></Avatar>
              <div><div className="font-semibold text-[14px]">{FEATURED.n}</div><div className="text-graphite-400 text-[12.5px]">{FEATURED.b} branch</div></div>
            </div>
          </div>
          <div className="space-y-3">
            {MORE.map(t=>(
              <div key={t.n} className="bento-tile flex items-start gap-3">
                <Avatar className="w-8 h-8 flex-none"><AvatarFallback className="bg-brand-50 text-brand font-bold text-[11px]">{t.n[0]}</AvatarFallback></Avatar>
                <div><p className="text-[13.5px] text-graphite-600 leading-relaxed">"{t.q}"</p>
                  <div className="text-[12px] font-semibold mt-2">{t.n} <span className="text-graphite-400 font-normal">· {t.b}</span></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
