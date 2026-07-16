import { Link } from 'react-router-dom'
import { useCart } from '@/context/CartContext.jsx'
import { money } from '@/utils/format.js'
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react'

export default function Cart(){
  const { lines, subtotal, setQuantity, remove } = useCart() || {}

  if(!lines || lines.length===0){
    return (
      <div className="container-x py-24 text-center">
        <ShoppingBag size={40} className="mx-auto text-graphite-300"/>
        <h1 className="text-2xl font-extrabold tracking-tight mt-5">Your cart is empty</h1>
        <p className="text-graphite-400 mt-2">Browse the catalogue and add something to get started.</p>
        <Link to="/products" className="btn btn-brand mt-6 inline-flex">Shop products</Link>
      </div>
    )
  }

  return (
    <div className="container-x py-12 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Your cart</h1>
      <div className="grid lg:grid-cols-[1fr_340px] gap-10 mt-8">
        <div className="divide-y divide-graphite-200 surface">
          {lines.map(l=>(
            <div key={l.productId} className="flex items-center gap-4 p-4 sm:p-5">
              <img src={l.product.img} alt={l.product.name} className="w-16 h-16 rounded-lg object-cover flex-none"/>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14.5px] truncate">{l.product.name}</div>
                <div className="text-[12px] text-graphite-400">{l.product.category} · {l.product.cond}</div>
              </div>
              <div className="flex items-center border border-graphite-200 rounded-lg">
                <button onClick={()=>setQuantity(l.productId,l.quantity-1)} className="w-8 h-8 grid place-items-center text-graphite-500 hover:text-brand" aria-label="Decrease quantity"><Minus size={13}/></button>
                <span className="w-7 text-center text-[13px] font-semibold mono-data">{l.quantity}</span>
                <button onClick={()=>setQuantity(l.productId,l.quantity+1)} className="w-8 h-8 grid place-items-center text-graphite-500 hover:text-brand" aria-label="Increase quantity"><Plus size={13}/></button>
              </div>
              <div className="font-bold text-[14.5px] mono-data w-16 text-right">{money(l.product.price*l.quantity)}</div>
              <button onClick={()=>remove(l.productId)} className="text-graphite-400 hover:text-red-500 p-1.5" aria-label={`Remove ${l.product.name}`}><X size={16}/></button>
            </div>
          ))}
        </div>

        <div className="surface p-6 h-fit sticky top-24">
          <h2 className="font-bold text-[15px] mb-4">Order summary</h2>
          <div className="flex justify-between text-[13.5px] text-graphite-600 mb-2"><span>Subtotal</span><span className="mono-data">{money(subtotal)}</span></div>
          <div className="flex justify-between text-[13.5px] text-graphite-600 mb-4"><span>Delivery</span><span className="mono-data">Free</span></div>
          <div className="flex justify-between font-bold text-[16px] pt-4 border-t border-graphite-200"><span>Total</span><span className="mono-data">{money(subtotal)}</span></div>
          <Link to="/checkout" className="btn btn-brand w-full mt-6">Checkout <ArrowRight size={16}/></Link>
        </div>
      </div>
    </div>
  )
}
