import { Link } from 'react-router-dom'
import { Recycle, CheckCircle2, ArrowRight } from 'lucide-react'
import { ProductAPI } from '@/services/api.js'
import { useAsync } from '@/hooks/useAsync.js'
import { money } from '@/utils/format.js'

const GRADE_POINTS = ['Full diagnostic check', 'Battery health verified', '3-month warranty included', 'Graded by our technicians']

export function RefurbishedSpotlight(){
  const { data:products=[] } = useAsync(()=>ProductAPI.list(),[])
  const sample = products.find(p=>p.cond==='Refurbished') || products[0]
  if(!sample) return null
  return (
    <section className="container-x py-6">
      <div className="rounded-3xl bg-gradient-to-br from-brand to-violet text-white p-8 sm:p-12 grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-center relative overflow-hidden">
        <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full bg-white/[.08]" aria-hidden/>
        <div className="relative">
          <Recycle size={26}/>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4">Certified refurbished, properly graded.</h2>
          <p className="text-white/85 mt-3 max-w-md leading-relaxed">Every refurbished device passes our full diagnostic before it's listed — tested, graded and warranty-backed.</p>
          <ul className="grid sm:grid-cols-2 gap-2.5 mt-6 max-w-md">
            {GRADE_POINTS.map(p=><li key={p} className="flex items-center gap-2 text-[13px] text-white/90"><CheckCircle2 size={15}/>{p}</li>)}
          </ul>
          <Link to="/refurbished" className="btn bg-white text-brand mt-7 inline-flex">Shop refurbished <ArrowRight size={16}/></Link>
        </div>
        <div className="relative bg-white text-ink rounded-2xl p-4 shadow-xl max-w-xs">
          <img src={sample.img} alt={sample.name} className="w-full h-36 object-cover rounded-xl"/>
          <div className="mt-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">{sample.cond}</div>
            <div className="font-bold text-[15px] mt-0.5">{sample.name}</div>
            <div className="font-extrabold text-[18px] mt-1 mono-data">{money(sample.price)}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
