import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ProductAPI, RepairAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Boxes, AlertTriangle } from 'lucide-react'

const LEVEL = (p)=> p.stock===0 ? { l:'Out of stock', tone:'text-rose-600 bg-rose-50' } : p.stock<=(p.lowStockThreshold??3) ? { l:'Low stock', tone:'text-amber-600 bg-amber-50' } : { l:'In stock', tone:'text-emerald-600 bg-emerald-50' }

export default function StockTasks(){
  const { user:me } = useAuth()
  const { data:products=[], refetch } = useAsync(()=>ProductAPI.list({ includeInactive:true }),[])
  const [using,setUsing]=useState(null) // product being reserved for a repair
  const canInventory = can(me?.role,'manageInventory')

  const reportDamaged = async (p)=>{
    if(p.stock<=0){ toast.error('No stock to report as damaged.'); return }
    try{
      await ProductAPI.adjustStock(p.id, -1, 'Reported damaged/missing')
      logAction({ user:me, action:'product.stock_change', entityType:'product', entityId:p.id, reason:'Reported damaged/missing' })
      toast.success(`${p.name} — 1 unit marked damaged/missing`)
      refetch()
    } catch(e){ toast.error(e.message) }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Stock tasks</h1>
      <p className="text-graphite-400 text-[14px] mb-6">Product & parts stock — live figures shared with the storefront.</p>

      <div className="surface divide-y divide-graphite-200">
        {products.map(p=>{
          const lv = LEVEL(p)
          return (
            <div key={p.id} className="flex items-center justify-between px-5 py-3.5 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <img src={p.img} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-none"/>
                <div><div className="font-semibold text-[13.5px]">{p.name}</div><div className="text-[12px] text-graphite-400">{p.category}</div></div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${lv.tone}`}>{lv.l} · {p.stock}</span>
                {canInventory && p.stock>0 && <button onClick={()=>setUsing(p)} className="btn btn-ghost btn-sm">Use for repair</button>}
                {canInventory && p.stock<=(p.lowStockThreshold??3) && <button onClick={()=>reportDamaged(p)} className="btn btn-ghost btn-sm text-rose-600"><AlertTriangle size={13}/> Report issue</button>}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-4 text-[11.5px] text-graphite-400"><Boxes size={14}/> Stock is shared live with the storefront — using or reporting stock here updates what customers can buy.</div>

      {using && <UsePartDialog product={using} onClose={()=>{setUsing(null);refetch()}} me={me}/>}
    </div>
  )
}

function UsePartDialog({ product, onClose, me }){
  const [ref,setRef]=useState('')
  const [qty,setQty]=useState(1)
  const [busy,setBusy]=useState(false)

  const submit = async ()=>{
    if(!ref.trim()){ toast.error('Enter a repair reference.'); return }
    setBusy(true)
    try{
      const repair = await RepairAPI.get(ref.trim())
      if(!repair){ toast.error(`No repair found with reference ${ref.trim()}`); setBusy(false); return }
      await ProductAPI.adjustStock(product.id, -qty, `Used on repair ${ref.trim()}`)
      await RepairAPI.addPart(ref.trim(), { name:product.name, quantity:qty, unitCost:product.price, productId:product.id })
      logAction({ user:me, action:'repair.part_add', entityType:'repair', entityId:ref.trim(), after:{name:product.name,quantity:qty} })
      toast.success(`${qty} × ${product.name} used on ${ref.trim()}`)
      onClose()
    } catch(e){ toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Use {product.name} on a repair</DialogTitle></DialogHeader>
        <div className="space-y-3.5">
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Repair reference</span>
            <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="SPR-4805" className="input-field mt-1.5"/></label>
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Quantity</span>
            <input type="number" min="1" max={product.stock} value={qty} onChange={e=>setQty(Math.max(1,Math.min(product.stock,Number(e.target.value)||1)))} className="input-field mt-1.5"/></label>
          <p className="text-[11.5px] text-graphite-400">{product.stock} in stock.</p>
        </div>
        <DialogFooter><button onClick={onClose} className="btn btn-ghost">Cancel</button><button onClick={submit} disabled={busy} className="btn btn-brand disabled:opacity-60">{busy?'Saving…':'Use stock'}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
