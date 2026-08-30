import { Link } from 'react-router-dom'
import { PageHero } from '@/components/common/PageHero.jsx'
import { ProductAPI } from '@/services/api.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ProductCard } from '@/components/common/ProductCard.jsx'
import { CheckCircle2, ShieldCheck, Recycle, ArrowRight } from 'lucide-react'

const GRADE_STEPS = [
  { t:'Full diagnostic', d:'Battery, display, storage, ports and cameras all checked.' },
  { t:'Graded by technicians', d:'Cosmetic and functional grade assigned before listing.' },
  { t:'Warranty included', d:'Every refurbished device carries a 3-month warranty.' },
]

export default function Refurbished(){
  const { data:products=[] } = useAsync(()=>ProductAPI.list({ condition:'Refurbished' }),[])
  const list = products
  return (<>
    <PageHero kicker="Certified refurbished" ghost="REFURB" title="Like new, properly verified" desc="Every refurbished device passes our full diagnostic before it's listed — tested, graded and backed by the same warranty as new.">
      <div className="flex items-center gap-2 mt-7 text-[13px] text-graphite-600"><Recycle size={16} className="text-brand"/> Better for your wallet, better for the planet.</div>
    </PageHero>

    <section className="container-x section-pad">
      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        {GRADE_STEPS.map((s,i)=>(
          <div key={s.t} className="bento-tile">
            <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand grid place-items-center font-bold mono-data mb-4">{i+1}</div>
            <h3 className="font-bold text-[14.5px]">{s.t}</h3>
            <p className="text-[13px] text-graphite-400 mt-1.5 leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>

      {list.length>0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{list.map(p=><ProductCard key={p.id} p={p}/>)}</div>
      ) : (
        <p className="text-graphite-400 text-center py-10">No refurbished stock listed right now — check back soon.</p>
      )}

      <div className="flex justify-center mt-10">
        <Link to="/products" className="btn rounded-full bg-white text-ink border border-graphite-200 hover:border-ink btn-sm">
          Browse everything we sell <ArrowRight size={15}/>
        </Link>
      </div>

      <div className="flex items-center gap-2.5 justify-center mt-6 text-[13px] text-graphite-500">
        <ShieldCheck size={16} className="text-brand"/> 3-month warranty <span className="text-graphite-300">·</span>
        <CheckCircle2 size={16} className="text-brand"/> Diagnostic-checked <span className="text-graphite-300">·</span>
        Sample catalogue — mock pricing only
      </div>
    </section>
  </>)
}
