import { Link } from 'react-router-dom'
import { ProductAPI } from '@/services/api.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ProductCard } from '@/components/common/ProductCard.jsx'

export function FeaturedProducts(){
  const { data:products=[] } = useAsync(()=>ProductAPI.list(),[])
  const { data:categories=[] } = useAsync(()=>ProductAPI.categories(),[])
  return (
    <section className="container-x section-pad">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div><span className="kicker">Buy & sell</span><h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">Popular right now</h2></div>
        <Link to="/products" className="btn btn-ghost btn-sm">View all products</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-7 -mx-1 px-1">
        {categories.slice(0,6).map(c=>(
          <span key={c} className="flex-none text-[12px] font-semibold px-3 py-1.5 rounded-full border border-graphite-200 text-graphite-600 hover:border-brand hover:text-brand cursor-default transition-colors">{c}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{products.slice(0,8).map(p=><ProductCard key={p.id} p={p}/>)}</div>
      <p className="text-center text-[11px] text-graphite-400 mt-6 mono-data">Sample catalogue — replace with your own product photos & prices on deploy.</p>
    </section>
  )
}
