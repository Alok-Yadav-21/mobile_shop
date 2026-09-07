import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { CartAPI, ProductAPI } from '@/services/api.js'
import { useAuth } from '@/hooks/useAuth.js'
import { buildCartLines, cartCount, cartSubtotal } from '@/utils/cart.js'

const CartContext = createContext(null)

export function CartProvider({ children }){
  const [items, setItems] = useState([]) // [{ productId, quantity }]
  const [products, setProducts] = useState([])
  const { user } = useAuth()

  useEffect(()=>{ ProductAPI.list().then(setProducts) },[])

  // Re-read whenever the signed-in account changes, and carry over anything a visitor put in
  // their basket before signing in. The basket used to be read once on mount, so with a real
  // backend it stayed empty after signing in — the account's own basket was never fetched — and
  // whatever a visitor had chosen was left behind in the guest basket at the moment they
  // identified themselves, which reads as the shop losing their order.
  useEffect(()=>{
    let live = true
    const load = user && CartAPI.adoptGuestCart ? CartAPI.adoptGuestCart() : CartAPI.get()
    load.then(c=>{ if(live) setItems(c.items||[]) }).catch(()=>{ if(live) setItems([]) })
    return ()=>{ live = false }
  },[user?.id])

  const setQuantity = useCallback(async (productId, quantity)=>{
    const cart = await CartAPI.setQuantity(productId, quantity)
    setItems(cart.items||[])
  },[])

  const add = useCallback((productId, qty=1)=>{
    const existing = items.find(i=>i.productId===productId)
    return setQuantity(productId, (existing?.quantity||0)+qty)
  },[items,setQuantity])

  const remove = useCallback((productId)=>setQuantity(productId,0),[setQuantity])

  const clear = useCallback(async ()=>{ const c=await CartAPI.clear(); setItems(c.items||[]) },[])

  const lines = useMemo(()=>buildCartLines(items,products),[items,products])
  const count = useMemo(()=>cartCount(items),[items])
  const subtotal = useMemo(()=>cartSubtotal(lines),[lines])

  const value = { items, lines, count, subtotal, add, remove, setQuantity, clear }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = ()=>useContext(CartContext)
