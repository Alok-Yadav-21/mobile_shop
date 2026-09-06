import { Link } from 'react-router-dom'
import { money } from '@/utils/format.js'
import { Plus, Star } from 'lucide-react'
import { useCart } from '@/context/CartContext.jsx'
import { Card3D } from '@/components/ui-fx/Card3D.jsx'
import { toast } from 'sonner'
export function ProductCard({ p }){
  const { add } = useCart() || {}
  const handleAdd = (e)=>{ e.preventDefault(); e.stopPropagation(); add?.(p.id,1); toast.success(`Added ${p.name} to cart`) }
  return (
    <Card3D containerClassName="h-full">
    <Link to={`/products/${p.id}`} className="group block h-full bg-white border border-graphite-200 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-brand/40 hover:shadow-elevate">
      <div className="h-44 bg-graphite-50 relative overflow-hidden">
        <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" loading="lazy"/>
        <span className="absolute top-3 left-3 bg-ink-900 text-white text-[10.5px] font-semibold px-2 py-1 rounded-md">{p.cond}</span>
      </div>
      <div className="p-4">
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-brand">{p.category}</div>
        <h3 className="font-bold text-[14.5px] mt-1 leading-snug">{p.name}</h3>
        {/* Two lines of the description on the card. A shelf of eight identical-looking phones
            is hard to choose from on name and price alone. */}
        {p.desc && <p className="text-[12px] text-graphite-400 mt-1 leading-snug line-clamp-2">{p.desc}</p>}
        <div className="flex items-center gap-1 text-amber-500 text-[11.5px] mt-1.5"><Star size={12} fill="currentColor"/> {p.rating}</div>
        <div className="flex items-center justify-between mt-3">
          <div className="font-extrabold text-[16px] mono-data">{money(p.price)} {p.was&&<span className="text-graphite-400 line-through text-[12px] font-medium ml-1">{money(p.was)}</span>}</div>
          <button onClick={handleAdd} className="w-8 h-8 rounded-lg bg-ink-900 text-white grid place-items-center hover:bg-brand transition-colors" aria-label={`Add ${p.name} to cart`}><Plus size={16}/></button>
        </div>
      </div>
    </Link>
    </Card3D>
  )
}
