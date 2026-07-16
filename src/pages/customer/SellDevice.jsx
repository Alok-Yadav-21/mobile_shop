import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { TradeInAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { money } from '@/utils/format.js'
import { Smartphone, Laptop, Tablet, Headphones, ArrowRight } from 'lucide-react'

const CATEGORIES = [
  { v:'Phone', icon:Smartphone, base:480 },
  { v:'Laptop / MacBook', icon:Laptop, base:750 },
  { v:'Tablet', icon:Tablet, base:320 },
  { v:'Audio / wearable', icon:Headphones, base:110 },
]
const GRADES = [
  { v:'Excellent', mult:1, d:'Like new, no visible wear' },
  { v:'Good', mult:0.75, d:'Light marks, fully working' },
  { v:'Fair', mult:0.5, d:'Visible wear, fully working' },
  { v:'Poor', mult:0.25, d:'Heavy wear or minor faults' },
]
const PAYOUTS = ['Bank transfer','Cash in branch','Store credit (+5%)']

export default function SellDevice(){
  const { user } = useAuth(); const nav = useNavigate()
  const [f,setF]=useState({ category:CATEGORIES[0].v, brand:'', model:'', grade:'Good', branch:'wol', payout:'Bank transfer' })
  const [busy,setBusy]=useState(false)
  const set=(k)=>(v)=>setF(s=>({...s,[k]:v}))

  const estimate = useMemo(()=>{
    const cat = CATEGORIES.find(c=>c.v===f.category)
    const grade = GRADES.find(g=>g.v===f.grade)
    const val = Math.round(cat.base*grade.mult)
    return { low: Math.round(val*0.85), high: Math.round(val*1.1) }
  },[f.category,f.grade])

  const submit = async ()=>{
    if(!f.brand || !f.model){ toast.error('Enter the device brand and model.'); return }
    setBusy(true)
    try{
      const req = await TradeInAPI.create({
        customerId: user?.id, deviceCategory:f.category, brand:f.brand, model:f.model,
        conditionGrade:f.grade, indicativeValue: Math.round((estimate.low+estimate.high)/2),
        branchId: f.branch, payoutMethod: f.payout,
      })
      toast.success(`Trade-in submitted — reference ${req.reference}`)
      nav('/app/repairs')
    } finally { setBusy(false) }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Sell my device</h1>
      <p className="text-graphite-400 mt-1 text-[14px]">Get an instant guide estimate, then verify in-branch to get paid.</p>

      <div className="surface p-6 mt-6 space-y-6">
        <div>
          <h2 className="font-bold text-[14px] mb-3">Device type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CATEGORIES.map(c=>(
              <button key={c.v} onClick={()=>set('category')(c.v)} className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-colors ${f.category===c.v?'border-brand bg-brand-50':'border-graphite-200 hover:border-brand/40'}`}>
                <c.icon size={20} className={f.category===c.v?'text-brand':'text-graphite-400'}/>
                <span className="text-[11.5px] font-semibold text-center leading-tight">{c.v}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Brand</span><input value={f.brand} onChange={e=>set('brand')(e.target.value)} placeholder="Apple, Samsung…" className="input-field mt-1.5"/></label>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Model</span><input value={f.model} onChange={e=>set('model')(e.target.value)} placeholder="iPhone 13" className="input-field mt-1.5"/></label>
        </div>

        <div>
          <h2 className="font-bold text-[14px] mb-3">Condition</h2>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {GRADES.map(g=>(
              <button key={g.v} onClick={()=>set('grade')(g.v)} className={`text-left px-4 py-3 rounded-xl border transition-colors ${f.grade===g.v?'border-brand bg-brand-50':'border-graphite-200 hover:border-brand/40'}`}>
                <div className="font-semibold text-[13.5px]">{g.v}</div>
                <div className="text-[12px] text-graphite-400">{g.d}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Branch</span>
            <select value={f.branch} onChange={e=>set('branch')(e.target.value)} className="input-field mt-1.5">{BRANCHES.map(b=><option key={b.id} value={b.id}>{b.area.split('—')[0]}</option>)}</select></label>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Payout method</span>
            <select value={f.payout} onChange={e=>set('payout')(e.target.value)} className="input-field mt-1.5">{PAYOUTS.map(p=><option key={p}>{p}</option>)}</select></label>
        </div>

        <div className="surface-dark bg-ink-900 text-white p-5 flex items-center justify-between">
          <div>
            <div className="kicker text-slate-500">Instant guide estimate</div>
            <div className="text-2xl font-extrabold mono-data mt-1">{money(estimate.low)} – {money(estimate.high)}</div>
          </div>
          <button onClick={submit} disabled={busy} className="btn bg-white text-ink disabled:opacity-60">{busy?'Submitting…':'Submit for verification'} <ArrowRight size={15}/></button>
        </div>
        <p className="text-[11px] text-graphite-400 mono-data">Guide estimate only — final offer confirmed after in-branch inspection and ID/IMEI verification.</p>
      </div>
    </div>
  )
}
