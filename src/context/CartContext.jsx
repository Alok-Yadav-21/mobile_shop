import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { CartAPI, ProductAPI } from '@/services/api.js'
import { buildCartLines, cartCount, cartSubtotal } from '@/utils/cart.js'

const CartContext = createContext(null)

export function CartProvider({ children }){
  const [items, setItems] = useState([]) // [{ productId, quantity }]
  const [products, setProducts] = useState([])

  useEffect(()=>{
    CartAPI.get().then(c=>setItems(c.items||[]))
    ProductAPI.list().then(setProducts)
  },[])

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
