import { Link } from 'react-router-dom'
import { BRANCHES } from '@/data/branches.js'
import { MapPin, ArrowRight } from 'lucide-react'

export function BranchNetwork(){
  return (
    <section className="bg-ink-900 text-white overflow-hidden">
      <div className="container-x grid lg:grid-cols-[.9fr_1.1fr] gap-12 py-16 sm:py-24 items-start">
        <div>
          <span className="kicker text-slate-500">Service coverage</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">8 branches. One connected network.</h2>
          <p className="text-slate-300 mt-3 max-w-md leading-relaxed">Serving South-East London and North-West Kent. Same account, same warranty, same tracked service — wherever you visit.</p>
          <Link to="/contact" className="btn btn-outline mt-7 inline-flex">Find your nearest branch <ArrowRight size={16}/></Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {BRANCHES.map(b=>(
            <div key={b.id} className="flex items-start gap-3 bg-white/[.04] border border-white/10 rounded-xl px-4 py-3.5 hover:border-brand/40 transition-colors">
              <MapPin size={16} className="text-brand flex-none mt-0.5"/>
              <div>
                <div className="text-[13.5px] font-semibold">{b.area.split('—')[0].trim()}</div>
                <div className="text-slate-500 text-[11.5px] mono-data mt-0.5">{b.addr} · {b.pc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
