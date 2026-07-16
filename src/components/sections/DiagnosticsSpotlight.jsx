import { Link } from 'react-router-dom'
import { Activity, Battery, ScreenShare, HardDrive, ArrowRight } from 'lucide-react'

const READOUT = [
  { icon:Battery, label:'Battery capacity', value:'94%', ok:true },
  { icon:ScreenShare, label:'Display response', value:'Pass', ok:true },
  { icon:HardDrive, label:'Storage health', value:'128GB · OK', ok:true },
]

export function DiagnosticsSpotlight(){
  return (
    <section className="container-x py-6">
      <div className="rounded-3xl bg-ink-900 text-white p-8 sm:p-12 grid lg:grid-cols-2 gap-10 items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-hair-diag opacity-40" aria-hidden/>
        <div className="relative">
          <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold bg-white/[.06] border border-white/10 rounded-full px-3 py-1.5">
            <span className="live-dot bg-brand"/> Free diagnostics
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-5">Not sure what's wrong? We'll find out — free.</h2>
          <p className="text-slate-300 mt-3 max-w-md leading-relaxed">Every device gets a full diagnostic check before any quote — battery, display, storage, charging and more. No fix, no fee.</p>
          <Link to="/repair-services" className="btn bg-white text-ink mt-7 inline-flex">See what we check <ArrowRight size={16}/></Link>
        </div>
        <div className="relative surface-dark p-5 bg-white/[.03]">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mono-data mb-4">
            <span className="flex items-center gap-1.5"><Activity size={13} className="text-signal"/> LIVE READOUT</span>
            <span>REF #VT-DX-0421</span>
          </div>
          <div className="space-y-2.5">
            {READOUT.map(r=>(
              <div key={r.label} className="flex items-center justify-between bg-white/[.04] border border-white/10 rounded-xl px-4 py-3">
                <span className="flex items-center gap-2.5 text-[13.5px] text-slate-300"><r.icon size={16} className="text-brand"/>{r.label}</span>
                <span className="text-[12.5px] font-semibold mono-data text-signal">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
