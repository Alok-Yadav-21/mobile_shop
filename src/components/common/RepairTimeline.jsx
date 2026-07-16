import { REPAIR_FLOW } from '@/constants/status.js'
import { fmtDateTime } from '@/utils/format.js'
import { Check } from 'lucide-react'
export function RepairTimeline({ repair }){
  const idx = REPAIR_FLOW.indexOf(repair.status)
  return (
    <div className="flex flex-col">
      {REPAIR_FLOW.map((s,i)=>{
        const done = repair.status!=='Cancelled' && i<idx
        const active = i===idx && repair.status!=='Cancelled'
        const h = repair.history.find(x=>x[0]===s)
        return (
          <div key={s} className="flex gap-3 items-start relative pb-4 last:pb-0">
            {i<REPAIR_FLOW.length-1 && <span className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200"/>}
            <span className={`w-6 h-6 rounded-full grid place-items-center z-10 flex-none border-2 ${done?'bg-emerald-500 border-emerald-500 text-white':active?'border-brand ring-4 ring-brand-50 bg-white':'border-slate-200 bg-white'}`}>{done&&<Check size={13}/>}</span>
            <div>
              <div className={`text-sm font-semibold ${!done&&!active?'text-slate-400':''}`}>{s}</div>
              {h && <div className="text-[11.5px] text-slate-400">{fmtDateTime(h[1])}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
