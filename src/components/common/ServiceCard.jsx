import { GlowCard } from '@/components/ui-fx/GlowCard.jsx'

export function ServiceCard({ icon:Icon, title, desc, featured=false }){
  if(featured){
    return (
      <div className="bento-tile bento-lg bg-ink-900 border-ink-900 text-white flex flex-col justify-between overflow-hidden group">
        <div className="absolute inset-0 bg-grid [background-size:22px_22px] opacity-[.25]" aria-hidden/>
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 grid place-items-center mb-5"><Icon size={22}/></div>
          <h3 className="font-bold text-[19px]">{title}</h3>
          <p className="text-[13.5px] text-slate-400 mt-2 max-w-[26ch]">{desc}</p>
        </div>
        <div className="relative flex items-center gap-2 mt-8 text-[12px] mono-data text-signal">
          <span className="live-dot bg-signal"/> Available at all 8 branches
        </div>
      </div>
    )
  }
  return (
    <GlowCard className="bento-tile group h-full">
      <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand grid place-items-center mb-4 group-hover:bg-brand group-hover:text-white transition-colors"><Icon size={19}/></div>
      <h3 className="font-bold text-[15px]">{title}</h3>
      <p className="text-[13px] text-graphite-400 mt-1.5 leading-relaxed">{desc}</p>
    </GlowCard>
  )
}
