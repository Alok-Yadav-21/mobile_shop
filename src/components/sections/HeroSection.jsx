import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Search, ShieldCheck, Star, Activity } from 'lucide-react'
import { Spotlight } from '@/components/ui-fx/Spotlight.jsx'
import heroImg from '@/assets/img/hero.jpg'
import { BRAND } from '@/constants/brand.js'

const CHIPS = [
  { label:'Battery health', value:'94%', top:'14%', left:'8%', delay:.5 },
  { label:'Display', value:'OK', top:'62%', left:'4%', delay:.9 },
  { label:'Storage', value:'128GB', top:'40%', left:'70%', delay:1.3 },
]

export function HeroSection(){
  return (
    <section className="relative overflow-hidden bg-ink-900 text-white">
      <div className="absolute inset-0 bg-grid [background-size:26px_26px] opacity-[.35]"/>
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20 h-[180%] w-[180%]"/>
      <div className="absolute top-0 right-0 w-[45%] h-full bg-gradient-to-l from-brand/[.08] to-transparent"/>
      <div className="container-x relative grid lg:grid-cols-[1.05fr_.95fr] gap-14 items-center py-16 sm:py-24">
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.5}}>
          <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold bg-white/[.06] border border-white/10 rounded-full px-3 py-1.5">
            <span className="live-dot bg-signal"/>{BRAND.recognition}
          </span>
          <h1 className="text-4xl sm:text-[3.4rem] font-extrabold tracking-tight mt-6 leading-[1.06]">
            Diagnosed properly.<br/><span className="grad-text">Repaired right.</span>
          </h1>
          <p className="text-slate-300 text-[16.5px] mt-5 max-w-xl leading-relaxed">
            Virktech is a modern technology brand for repairs, buying and selling — phones, laptops, MacBooks, audio and smart devices.
            The trusted <b className="text-white">Smart Phones Repair</b> service you know, now Virktech.
          </p>

          <div className="flex items-center gap-2 bg-white/[.04] border border-white/10 rounded-2xl p-1.5 mt-8 max-w-md">
            <Search size={17} className="text-slate-500 ml-2.5"/>
            <input placeholder="Search a device, part or repair…" className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 text-[13.5px] py-2"/>
            <Link to="/repair-services" className="btn btn-brand btn-sm">Search</Link>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/app/book" className="btn bg-white text-ink hover:-translate-y-0.5">Book a repair <ArrowRight size={16}/></Link>
            <Link to="/products" className="btn btn-outline">Shop devices</Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8 text-[13.5px] text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-400">
              {Array.from({length:5}).map((_,i)=><Star key={i} size={14} fill="currentColor"/>)}
              <span className="text-slate-400 ml-1">4.9 rated</span>
            </span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-signal"/> 3-month warranty</span>
            <span className="flex items-center gap-1.5 mono-data"><Activity size={15} className="text-brand"/> 8 branches</span>
          </div>
        </motion.div>

        <motion.div initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} transition={{duration:.5,delay:.1}} className="relative">
          <div className="absolute -inset-6 bg-brand/[.12] blur-[70px] rounded-[32px]" aria-hidden/>
          <div className="relative rounded-[22px] border border-white/10 bg-white/[.03] p-3 shadow-2xl">
            <div className="relative rounded-2xl overflow-hidden">
              <img src={heroImg} alt="Device on the Virktech diagnostic bench" className="w-full object-cover aspect-[4/3]"/>
              <motion.div
                className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-signal to-transparent shadow-[0_0_16px_2px_rgba(34,211,184,.6)]"
                initial={{ top:'6%' }}
                animate={{ top:['6%','94%','6%'] }}
                transition={{ duration:5, repeat:Infinity, ease:'easeInOut' }}
              />
              {CHIPS.map((c,i)=>(
                <motion.div key={c.label}
                  initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.4,delay:c.delay}}
                  className="absolute bg-ink-900/85 backdrop-blur border border-white/10 rounded-lg px-2.5 py-1.5 text-[10.5px] leading-none"
                  style={{ top:c.top, left:c.left }}>
                  <div className="text-slate-400 uppercase tracking-wide text-[8.5px]">{c.label}</div>
                  <div className="text-white font-semibold mono-data mt-0.5">{c.value}</div>
                </motion.div>
              ))}
            </div>
            <div className="flex items-center gap-5 mt-3 px-2 py-2.5">
              <div><div className="text-xl font-extrabold mono-data">8</div><div className="text-[9.5px] uppercase tracking-wide text-slate-500">Branches</div></div>
              <div className="w-px h-7 bg-white/10"/>
              <div><div className="text-xl font-extrabold grad-text mono-data">4%</div><div className="text-[9.5px] uppercase tracking-wide text-slate-500">Loyalty back</div></div>
              <div className="w-px h-7 bg-white/10"/>
              <div><div className="text-xl font-extrabold mono-data">15m</div><div className="text-[9.5px] uppercase tracking-wide text-slate-500">Free diagnostics</div></div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
