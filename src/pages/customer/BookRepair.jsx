import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { RepairAPI, BranchAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { formatDistance } from '@/lib/geo.js'
import { Calendar } from '@/components/ui/calendar.jsx'
import {
  Smartphone, Tablet, Laptop, MonitorSmartphone, Speaker, MonitorDot,
  MapPin, Search, Store, Truck, Mail, Check, ChevronLeft, ChevronRight,
} from 'lucide-react'

const DEVICE_TYPES = [
  { v:'Phone', icon:Smartphone }, { v:'Tablet', icon:Tablet }, { v:'Laptop', icon:Laptop },
  { v:'MacBook', icon:MonitorSmartphone }, { v:'Desktop', icon:MonitorDot }, { v:'Audio', icon:Speaker },
]
const PROBLEMS = ['Screen replacement','Battery replacement','Charging-port repair','Water-damage check','Software issue','Other / not sure']
const FULFILMENT = [
  { v:'In-store', icon:Store, d:'Drop off & collect at your chosen branch' },
  { v:'Collection', icon:Truck, d:'We collect from your address' },
  { v:'Mail-in', icon:Mail, d:'Post your device to us, insured' },
]
const STEPS = ['Device','Problem','Branch','Fulfilment','Preferred date','Your details','Review']

export default function BookRepair(){
  const { user } = useAuth(); const nav=useNavigate()
  const [step,setStep]=useState(0)
  const [f,setF]=useState({
    device:'Phone', brand:'', model:'', problem:'Screen replacement', note:'',
    pc:'', branch:'wol', fulfilment:'In-store', date:undefined,
    name:user?.name||'', phone:user?.phone||'', email:user?.email||'',
  })
  const [branchMsg,setBranchMsg]=useState('')
  // Branches ranked by distance once a postcode has been searched. Until then the picker
  // shows the plain list — there is no meaningful order to put them in yet.
  const [ranked,setRanked]=useState([])
  const [finding,setFinding]=useState(false)
  const [busy,setBusy]=useState(false)
  const set = (k)=>(v)=>setF(s=>({...s,[k]:v}))

  const findBranch = async ()=>{
    if(!f.pc.trim()){ setBranchMsg('Enter your postcode first.'); return }
    setFinding(true)
    try{
      const hits = await BranchAPI.nearest(f.pc)
      if(hits.length){
        // Reordering the list is the actual answer to "find nearest" — naming one branch in a
        // sentence while leaving the picker in its original order makes the reader hunt for it.
        setRanked(hits)
        setF(s=>({...s,branch:hits[0].id}))
        setBranchMsg(`Nearest: ${hits[0].area} — about ${formatDistance(hits[0].km)} away`)
      } else {
        setRanked([])
        setBranchMsg("We couldn't place that postcode. Check it, or pick a branch below.")
      }
    } catch { setBranchMsg('Could not search just now — pick a branch below.') }
    finally{ setFinding(false) }
  }

  const canNext = ()=>{
    if(step===1) return !!f.brand && !!f.model
    if(step===5) return !!f.name && !!f.phone
    return true
  }

  const next = ()=>{ if(!canNext()){ toast.error('Please fill in the required fields.'); return } setStep(s=>Math.min(s+1,STEPS.length-1)) }
  const back = ()=>setStep(s=>Math.max(s-1,0))

  const submit = async ()=>{
    setBusy(true)
    try{
      const rep = await RepairAPI.create({
        customer:f.name||user?.name||'Customer', phone:f.phone||'07700 900123', email:f.email||user?.email,
        branch:f.branch, device:f.device, brand:f.brand, model:f.model, problem:f.problem,
        fulfilment:f.fulfilment, custNote:f.note, preferredDate: f.date?.toISOString?.()||null,
      })
      toast.success(`Repair booked — reference ${rep.ref}`)
      nav(`/app/repairs/${rep.ref}`)
    } finally { setBusy(false) }
  }

  const branch = BRANCHES.find(b=>b.id===f.branch)

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Book a repair</h1>
      <p className="text-graphite-400 mt-1 text-[14px]">We confirm the price before any work begins — free diagnostics on every device.</p>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mt-6 overflow-x-auto no-scrollbar pb-1">
        {STEPS.map((s,i)=>(
          <div key={s} className="flex items-center gap-1.5 flex-none">
            <div className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold mono-data flex-none ${i<step?'bg-signal text-white':i===step?'bg-brand text-white':'bg-graphite-100 text-graphite-400'}`}>
              {i<step?<Check size={12}/>:i+1}
            </div>
            <span className={`text-[11.5px] font-semibold whitespace-nowrap ${i===step?'text-ink':'text-graphite-400'}`}>{s}</span>
            {i<STEPS.length-1 && <div className="w-4 h-px bg-graphite-200"/>}
          </div>
        ))}
      </div>

      <div className="surface p-6 mt-5 min-h-[280px]">
        {step===0 && (
          <div>
            <h2 className="font-bold text-[15px] mb-4">What device needs repairing?</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {DEVICE_TYPES.map(d=>(
                <button key={d.v} onClick={()=>set('device')(d.v)} className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-colors ${f.device===d.v?'border-brand bg-brand-50':'border-graphite-200 hover:border-brand/40'}`}>
                  <d.icon size={22} className={f.device===d.v?'text-brand':'text-graphite-400'}/>
                  <span className="text-[12.5px] font-semibold">{d.v}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step===1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-[15px]">Tell us about the device</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Brand</span><input value={f.brand} onChange={e=>set('brand')(e.target.value)} placeholder="Apple, Samsung…" className="input-field mt-1.5"/></label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Model</span><input value={f.model} onChange={e=>set('model')(e.target.value)} placeholder="iPhone 13" className="input-field mt-1.5"/></label>
            </div>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">What's the problem?</span>
              <select value={f.problem} onChange={e=>set('problem')(e.target.value)} className="input-field mt-1.5">{PROBLEMS.map(p=><option key={p}>{p}</option>)}</select></label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Anything else? (optional)</span>
              <textarea rows={2} value={f.note} onChange={e=>set('note')(e.target.value)} placeholder="Describe the issue" className="input-field mt-1.5 h-auto py-2"/></label>
          </div>
        )}

        {step===2 && (
          <div>
            <h2 className="font-bold text-[15px] mb-4">Choose a branch</h2>
            <div className="flex gap-2 mb-2">
              <div className="flex items-center gap-2 input-field flex-1"><Search size={14} className="text-graphite-400"/><input value={f.pc} onChange={e=>set('pc')(e.target.value)} placeholder="Your postcode, e.g. SE18 6EX" className="flex-1 outline-none bg-transparent"/></div>
              <button onClick={findBranch} disabled={finding} className="btn btn-ghost btn-sm disabled:opacity-60">{finding?'Searching…':'Find nearest'}</button>
            </div>
            {branchMsg && <p className="text-[12px] text-brand mb-3">{branchMsg}</p>}
            <div className="grid sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
              {(ranked.length ? ranked : BRANCHES).map(b=>(
                <button key={b.id} onClick={()=>set('branch')(b.id)} className={`flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border transition-colors ${f.branch===b.id?'border-brand bg-brand-50':'border-graphite-200 hover:border-brand/40'}`}>
                  <MapPin size={15} className={f.branch===b.id?'text-brand':'text-graphite-400'}/>
                  {/* The full area name, not the part before the em dash: three branches are
                      "Woolwich — something" and two are "New Eltham — something", so trimming
                      it leaves the picker showing the same label twice. */}
                  <div className="text-[12.5px] min-w-0 flex-1"><div className="font-semibold truncate">{b.area}</div><div className="text-graphite-400 mono-data text-[11px]">{b.pc}</div></div>
                  {b.km!=null && <span className="text-[11px] font-semibold text-graphite-400 flex-none">{formatDistance(b.km)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step===3 && (
          <div>
            <h2 className="font-bold text-[15px] mb-4">How would you like this handled?</h2>
            <div className="space-y-2.5">
              {FULFILMENT.map(o=>(
                <button key={o.v} onClick={()=>set('fulfilment')(o.v)} className={`w-full flex items-center gap-3.5 text-left px-4 py-3.5 rounded-xl border transition-colors ${f.fulfilment===o.v?'border-brand bg-brand-50':'border-graphite-200 hover:border-brand/40'}`}>
                  <o.icon size={19} className={f.fulfilment===o.v?'text-brand':'text-graphite-400'}/>
                  <div><div className="font-semibold text-[14px]">{o.v}</div><div className="text-[12px] text-graphite-400">{o.d}</div></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step===4 && (
          <div>
            <h2 className="font-bold text-[15px] mb-4">Preferred date <span className="font-normal text-graphite-400">(optional)</span></h2>
            <Calendar mode="single" selected={f.date} onSelect={set('date')} disabled={{ before: new Date() }} className="border border-graphite-200 rounded-xl"/>
          </div>
        )}

        {step===5 && (
          <div className="space-y-4">
            <h2 className="font-bold text-[15px]">Your details</h2>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Full name</span><input value={f.name} onChange={e=>set('name')(e.target.value)} className="input-field mt-1.5"/></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Phone</span><input value={f.phone} onChange={e=>set('phone')(e.target.value)} className="input-field mt-1.5"/></label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Email</span><input value={f.email} onChange={e=>set('email')(e.target.value)} className="input-field mt-1.5"/></label>
            </div>
          </div>
        )}

        {step===6 && (
          <div>
            <h2 className="font-bold text-[15px] mb-4">Review & confirm</h2>
            <div className="divide-y divide-graphite-200 text-[13.5px]">
              {[['Device',`${f.device} — ${f.brand} ${f.model}`],['Problem',f.problem],['Branch',branch?.area?.split('—')[0]],['Fulfilment',f.fulfilment],['Preferred date', f.date?f.date.toLocaleDateString('en-GB'):'No preference'],['Contact',`${f.name} · ${f.phone}`]].map(([k,v])=>(
                <div key={k} className="flex justify-between py-2.5"><span className="text-graphite-400">{k}</span><span className="font-semibold text-right">{v}</span></div>
              ))}
            </div>
            <p className="text-[11.5px] text-graphite-400 mt-4 mono-data">No payment is taken now — your exact quote is confirmed after a free diagnostic.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-5">
        <button onClick={back} disabled={step===0} className="btn btn-ghost btn-sm disabled:opacity-40"><ChevronLeft size={15}/> Back</button>
        {step<STEPS.length-1
          ? <button onClick={next} className="btn btn-brand btn-sm">Continue <ChevronRight size={15}/></button>
          : <button onClick={submit} disabled={busy} className="btn btn-brand disabled:opacity-60">{busy?'Booking…':'Confirm & get reference'}</button>}
      </div>
    </div>
  )
}
