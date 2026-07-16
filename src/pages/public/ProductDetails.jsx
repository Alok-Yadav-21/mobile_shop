import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { ProductAPI } from '@/services/api.js'
import { useAsync } from '@/hooks/useAsync.js'
import { money } from '@/utils/format.js'
import { useCart } from '@/context/CartContext.jsx'
import { toast } from 'sonner'
import { ProductCard } from '@/components/common/ProductCard.jsx'
import { ChevronLeft, Star, ShieldCheck, Truck, Minus, Plus } from 'lucide-react'

export default function ProductDetails(){
  const { id } = useParams()
  const { data:product, loading } = useAsync(()=>ProductAPI.get(id),[id])
  const { data:allProducts=[] } = useAsync(()=>ProductAPI.list(),[])
  const [qty,setQty]=useState(1)
  const { add } = useCart() || {}

  if(loading) return <div className="container-x py-24 text-center text-graphite-400">Loading…</div>
  if(!product || product.active===false || product.archived) return <Navigate to="/products" replace/>

  const related = allProducts.filter(p=>p.category===product.category && p.id!==product.id).slice(0,4)

  return (
    <div className="container-x py-10 sm:py-14">
      <Link to="/products" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-graphite-500 hover:text-brand"><ChevronLeft size={15}/> Back to products</Link>

      <div className="grid lg:grid-cols-2 gap-10 mt-6">
        <div className="surface p-4">
          <img src={product.img} alt={product.name} className="w-full aspect-square object-cover rounded-xl"/>
        </div>
        <div>
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-brand">{product.category}</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">{product.name}</h1>
          <div className="flex items-center gap-3 mt-3">
            <span className="flex items-center gap-1 text-amber-500 text-[13px]"><Star size={14} fill="currentColor"/> {product.rating}</span>
            <span className="text-[12.5px] font-semibold px-2.5 py-1 rounded-full bg-ink-900 text-white">{product.cond}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-5">
            <span className="text-3xl font-extrabold mono-data">{money(product.price)}</span>
            {product.was && <span className="text-graphite-400 line-through text-[16px] mono-data">{money(product.was)}</span>}
          </div>

          <p className="text-[14.5px] text-graphite-500 mt-4 leading-relaxed max-w-md">
            {product.cond==='Refurbished'
              ? 'Fully diagnostic-checked and graded by our technicians, with a 3-month warranty included.'
              : `${product.cond} condition, ready to ship or collect in-branch. Backed by our standard warranty.`}
          </p>

          <div className="flex items-center gap-4 mt-7">
            <div className="flex items-center border border-graphite-200 rounded-xl">
              <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="w-10 h-10 grid place-items-center text-graphite-500 hover:text-brand" aria-label="Decrease quantity"><Minus size={15}/></button>
              <span className="w-8 text-center font-semibold mono-data">{qty}</span>
              <button onClick={()=>setQty(q=>q+1)} className="w-10 h-10 grid place-items-center text-graphite-500 hover:text-brand" aria-label="Increase quantity"><Plus size={15}/></button>
            </div>
            <button
              onClick={()=>{ add?.(product.id, qty); toast.success(`Added ${qty} × ${product.name} to cart`) }}
              className="btn btn-brand flex-1">Add to cart</button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-8 pt-6 border-t border-graphite-200">
            <div className="flex items-center gap-2.5 text-[13px] text-graphite-600"><ShieldCheck size={17} className="text-brand"/> 3-month warranty included</div>
            <div className="flex items-center gap-2.5 text-[13px] text-graphite-600"><Truck size={17} className="text-brand"/> Collect in-branch or delivered</div>
          </div>
        </div>
      </div>

      {related.length>0 && (
        <div className="mt-16 pt-10 border-t border-graphite-200">
          <h2 className="text-xl font-extrabold tracking-tight mb-6">You may also like</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{related.map(p=><ProductCard key={p.id} p={p}/>)}</div>
        </div>
      )}
    </div>
  )
}
