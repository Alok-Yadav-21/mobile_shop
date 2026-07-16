import { useMemo, useState } from 'react'
import { PageHero } from '@/components/common/PageHero.jsx'
import { ProductAPI } from '@/services/api.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ProductCard } from '@/components/common/ProductCard.jsx'
import { Search, SlidersHorizontal } from 'lucide-react'

const CONDITIONS = ['New','Used','Refurbished']
const SORTS = { 'Featured':null, 'Price: low to high':(a,b)=>a.price-b.price, 'Price: high to low':(a,b)=>b.price-a.price, 'Top rated':(a,b)=>b.rating-a.rating }

export default function Products(){
  const { data:PRODUCTS=[], loading } = useAsync(()=>ProductAPI.list(),[])
  const { data:CATEGORIES=[] } = useAsync(()=>ProductAPI.categories(),[])
  const [cat,setCat]=useState('All')
  const [cond,setCond]=useState('All')
  const [q,setQ]=useState('')
  const [sort,setSort]=useState('Featured')

  const list = useMemo(()=>{
    let out = PRODUCTS
    if(cat!=='All') out = out.filter(p=>p.category===cat)
    if(cond!=='All') out = out.filter(p=>p.cond===cond)
    if(q.trim()) out = out.filter(p=>p.name.toLowerCase().includes(q.trim().toLowerCase()))
    const cmp = SORTS[sort]
    return cmp ? [...out].sort(cmp) : out
  },[PRODUCTS,cat,cond,q,sort])

  return (<>
    <PageHero kicker="Buy & sell" title="Shop devices & tech" desc="New, used and certified refurbished — phones, laptops, MacBooks, audio and accessories, backed by the same warranty across all 8 branches."/>
    <section className="container-x section-pad">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
        <div className="flex items-center gap-2 bg-white border border-graphite-200 rounded-xl px-3.5 py-2.5 max-w-sm">
          <Search size={16} className="text-graphite-400"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products…" className="flex-1 outline-none text-[13.5px] bg-transparent"/>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <SlidersHorizontal size={15} className="text-graphite-400"/>
          <select value={cond} onChange={e=>setCond(e.target.value)} className="border border-graphite-200 rounded-lg px-2.5 py-2 bg-white font-medium">
            <option value="All">All conditions</option>
            {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="border border-graphite-200 rounded-lg px-2.5 py-2 bg-white font-medium">
            {Object.keys(SORTS).map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['All',...CATEGORIES].map(c=>(
          <button key={c} onClick={()=>setCat(c)} className={`px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors ${cat===c?'bg-brand text-white border-brand':'bg-white border-graphite-200 text-graphite-600 hover:border-brand hover:text-brand'}`}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-graphite-400">Loading products…</div>
      ) : list.length===0 ? (
        <div className="text-center py-20 text-graphite-400">No products match those filters.</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">{list.map(p=><ProductCard key={p.id} p={p}/>)}</div>
      )}
      <p className="text-center text-[11px] text-graphite-400 mt-8 mono-data">Sample catalogue — replace with your own product photos & prices on deploy.</p>
    </section>
  </>)
}
