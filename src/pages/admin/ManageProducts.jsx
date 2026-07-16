import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ProductAPI, CategoryAPI, OrderAPI } from '@/services/api.js'
import { BRANCHES } from '@/data/branches.js'
import { can } from '@/lib/permissions.js'
import { productDeleteBlockers } from '@/lib/deletionRules.js'
import { logAction } from '@/services/auditService.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { ReasonDialog } from '@/components/common/ReasonDialog.jsx'
import { StatusPill, StockPill } from '@/components/common/AccountStatusBadge.jsx'
import { RowActionsMenu } from '@/components/common/RowActionsMenu.jsx'
import { TableSkeleton } from '@/components/common/TableSkeleton.jsx'
import { ErrorState } from '@/components/common/ErrorState.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { money } from '@/utils/format.js'
import { Search, Plus, Eye, Pencil, Copy, Boxes, MapPinned, UserCheck, UserX, Archive, ArchiveRestore, Trash2, Minus, ArrowUpDown } from 'lucide-react'

const PAGE_SIZE = 8
const REASON_ACTIONS = new Set(['archive'])

function productStatus(p){
  if(p.archived) return 'archived'
  if(p.active) return 'active'
  if(!p.stock && (p._orderCount||0)===0) return 'draft'
  return 'inactive'
}

const schema = z.object({
  name: z.string().min(2,'Enter a product name'),
  category: z.string().min(1,'Choose a category'),
  brand: z.string().optional(),
  description: z.string().optional(),
  cond: z.enum(['New','Used','Refurbished']),
  price: z.coerce.number().positive('Price must be greater than 0'),
  was: z.coerce.number().optional(),
  warrantyMonths: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0),
  specsText: z.string().optional(),
})

function parseSpecs(text){
  if(!text?.trim()) return null
  const out = {}
  text.split('\n').forEach(line=>{
    const [k,...rest] = line.split(':')
    if(k && rest.length) out[k.trim()] = rest.join(':').trim()
  })
  return Object.keys(out).length ? out : null
}
function specsToText(specs){
  if(!specs) return ''
  return Object.entries(specs).map(([k,v])=>`${k}: ${v}`).join('\n')
}

export default function ManageProducts(){
  const { user:me } = useAuth()
  const { data:list=[], loading, error, refetch } = useAsync(()=>ProductAPI.list({ includeInactive:true, includeArchived:true }),[])
  const { data:categories=[] } = useAsync(()=>CategoryAPI.list(),[])
  const { data:orders=[] } = useAsync(()=>OrderAPI.list(),[])
  const canManage = can(me?.role,'manageProducts')
  const canInventory = can(me?.role,'manageInventory')

  const [q,setQ]=useState(''); const [categoryFilter,setCategoryFilter]=useState(''); const [statusFilter,setStatusFilter]=useState('')
  const [sort,setSort]=useState({ key:'name', dir:1 })
  const [page,setPage]=useState(1)
  const [editing,setEditing]=useState(null)
  const [viewing,setViewing]=useState(null)
  const [stockFor,setStockFor]=useState(null)
  const [branchFor,setBranchFor]=useState(null)
  const [target,setTarget]=useState(null) // {type, product}
  const [deleteBlockers,setDeleteBlockers]=useState(null)

  const enriched = useMemo(()=>list.map(p=>({ ...p, _orderCount: orders.filter(o=>(o.items||[]).some(i=>i.productId===p.id)).length })),[list,orders])

  const filtered = useMemo(()=>{
    let out = enriched.filter(p=>{
      const status = productStatus(p)
      if(categoryFilter && p.category!==categoryFilter) return false
      if(statusFilter && status!==statusFilter) return false
      if(!statusFilter && status==='archived') return false
      if(q.trim()){ const s=q.toLowerCase(); if(!p.name.toLowerCase().includes(s)) return false }
      return true
    })
    out = [...out].sort((a,b)=>{
      const av = sort.key==='price'||sort.key==='stock' ? (a[sort.key]||0) : (a[sort.key]||'').toString().toLowerCase()
      const bv = sort.key==='price'||sort.key==='stock' ? (b[sort.key]||0) : (b[sort.key]||'').toString().toLowerCase()
      return av<bv ? -sort.dir : av>bv ? sort.dir : 0
    })
    return out
  },[enriched,q,categoryFilter,statusFilter,sort])

  const toggleSort = (key)=>setSort(s=>s.key===key ? { key, dir:-s.dir } : { key, dir:1 })
  const totalPages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE))
  const pageItems = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const goToPage = (p)=>setPage(Math.min(Math.max(1,p),totalPages))

  const { register, handleSubmit, reset, formState:{ errors } } = useForm({ resolver: zodResolver(schema) })

  const openCreate = ()=>{ reset({ name:'', category:categories[0]?.name||'', brand:'', description:'', cond:'New', price:'', was:'', warrantyMonths:3, lowStockThreshold:3, specsText:'' }); setEditing({}) }
  const openEdit = (p)=>{ reset({ name:p.name, category:p.category, brand:p.brand||'', description:p.description||'', cond:p.cond, price:p.price, was:p.was||'', warrantyMonths:p.warrantyMonths??3, lowStockThreshold:p.lowStockThreshold??3, specsText:specsToText(p.specs) }); setEditing(p) }

  const onSubmit = async (data)=>{
    const payload = { ...data, was: data.was || undefined, specs: parseSpecs(data.specsText) }
    delete payload.specsText
    try{
      if(editing?.id){
        const updated = await ProductAPI.update(editing.id, payload)
        if(data.price!==editing.price) logAction({ user:me, action:'product.price_change', entityType:'product', entityId:editing.id, before:{price:editing.price}, after:{price:data.price} })
        logAction({ user:me, action:'product.update', entityType:'product', entityId:editing.id, after:updated })
        toast.success('Product updated')
      } else {
        const created = await ProductAPI.create(payload)
        logAction({ user:me, action:'product.create', entityType:'product', entityId:created.id, after:created })
        toast.success('Product created as a draft — activate it to list on the storefront')
      }
      setEditing(null); refetch()
    } catch(e){ toast.error(e.message||'Could not save product') }
  }

  const duplicate = async (p)=>{
    const copy = await ProductAPI.duplicate(p.id)
    logAction({ user:me, action:'product.duplicate', entityType:'product', entityId:copy.id, before:{sourceId:p.id} })
    toast.success(`Duplicated as "${copy.name}"`)
    refetch()
  }

  const runAction = async (reason)=>{
    const { type, product:p } = target
    try{
      if(type==='delete'){
        await ProductAPI.remove(p.id, deleteBlockers||[])
        logAction({ user:me, action:'product.delete', entityType:'product', entityId:p.id, reason })
        toast.success('Product deleted')
      } else if(type==='archive'){
        await ProductAPI.archive(p.id)
        logAction({ user:me, action:'product.archive', entityType:'product', entityId:p.id, reason })
        toast.success(`${p.name} archived`)
      } else if(type==='restore'){
        await ProductAPI.restore(p.id)
        logAction({ user:me, action:'product.restore', entityType:'product', entityId:p.id })
        toast.success(`${p.name} restored`)
      } else {
        const active = type==='activate'
        await ProductAPI.setActive(p.id, active)
        logAction({ user:me, action:'product.status_change', entityType:'product', entityId:p.id, after:{active} })
        toast.success(`${p.name} ${active?'activated':'deactivated'}`)
      }
      setTarget(null); setDeleteBlockers(null); refetch()
    } catch(e){ toast.error(e.message||'Action failed') }
  }

  const openDelete = (p)=>{
    const blockers = productDeleteBlockers(p, { orders })
    setDeleteBlockers(blockers)
    setTarget({ type:'delete', product:p })
  }

  if(!canManage && !canInventory) return <div className="surface p-8 text-center text-graphite-400">You don't have permission to manage products.</div>

  const rowActions = (p)=>{
    const status = productStatus(p)
    return [
      { key:'view', label:'View product', icon:Eye, onClick:()=>setViewing(p) },
      { key:'edit', label:'Edit product', icon:Pencil, onClick:()=>openEdit(p), hidden:!canManage||status==='archived' },
      { key:'duplicate', label:'Duplicate', icon:Copy, onClick:()=>duplicate(p), hidden:!canManage },
      { key:'stock', label:'Manage stock', icon:Boxes, onClick:()=>setStockFor(p), hidden:!canInventory },
      { key:'branch', label:'Branch availability', icon:MapPinned, onClick:()=>setBranchFor(p), hidden:!canInventory },
      'separator',
      status==='active'
        ? { key:'deactivate', label:'Deactivate', icon:UserX, tone:'amber', onClick:()=>setTarget({type:'deactivate',product:p}), hidden:!canManage }
        : status!=='archived' && { key:'activate', label:'Activate', icon:UserCheck, tone:'emerald', onClick:()=>setTarget({type:'activate',product:p}), hidden:!canManage },
      status==='archived'
        ? { key:'restore', label:'Restore', icon:ArchiveRestore, tone:'emerald', onClick:()=>setTarget({type:'restore',product:p}), hidden:!canManage }
        : { key:'archive', label:'Archive', icon:Archive, onClick:()=>setTarget({type:'archive',product:p}), hidden:!canManage },
      { key:'delete', label:'Delete permanently', icon:Trash2, tone:'rose', onClick:()=>openDelete(p), hidden:!canManage },
    ].filter(Boolean)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Products</h1><p className="text-graphite-400 text-[13px] mt-0.5">Catalogue, pricing, warranty and stock across the storefront.</p></div>
        {canManage && <button onClick={openCreate} className="btn btn-brand btn-sm"><Plus size={15}/> Add product</button>}
      </div>

      <div className="flex flex-wrap gap-3 my-4 items-center">
        <div className="flex items-center gap-2 input-field w-auto max-w-xs"><Search size={14} className="text-graphite-400"/><input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="Search products…" className="bg-transparent outline-none flex-1"/></div>
        <select value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setPage(1)}} className="input-field w-auto"><option value="">All categories</option>{categories.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select>
        <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1)}} className="input-field w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
        <button onClick={()=>toggleSort('price')} className="btn btn-ghost btn-sm"><ArrowUpDown size={13}/> Price</button>
        <button onClick={()=>toggleSort('stock')} className="btn btn-ghost btn-sm"><ArrowUpDown size={13}/> Stock</button>
        <span className="text-[12.5px] text-graphite-400 mono-data">{filtered.length} of {list.length}</span>
      </div>

      {error ? <ErrorState error={error} onRetry={refetch}/> : loading ? <TableSkeleton cols={7}/> : filtered.length===0 ? (
        <div className="surface p-2"><EmptyState title="No products match those filters" hint="Try clearing search or filters."/></div>
      ) : (<>
        <div className="hidden sm:block surface overflow-x-auto">
          <Table><thead><tr><Th>Product</Th><Th>Category</Th><Th>Condition</Th><Th>Price</Th><Th>Stock</Th><Th>Status</Th><Th></Th></tr></thead>
          <tbody>{pageItems.map(p=>(
            <tr key={p.id} className="hover:bg-graphite-50">
              <Td><div className="flex items-center gap-3"><img src={p.img} className="w-10 h-10 rounded-lg object-cover bg-graphite-100" alt=""/><span className="font-semibold">{p.name}</span></div></Td>
              <Td>{p.category}</Td>
              <Td><span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-graphite-100 text-graphite-600">{p.cond}</span></Td>
              <Td className="mono-data">{money(p.price)}</Td>
              <Td><StockPill stock={p.stock} lowStockThreshold={p.lowStockThreshold}/></Td>
              <Td><StatusPill status={productStatus(p)}/></Td>
              <Td><RowActionsMenu actions={rowActions(p)} label={`Actions for ${p.name}`}/></Td>
            </tr>))}
          </tbody></Table>
        </div>

        <div className="sm:hidden space-y-3">
          {pageItems.map(p=>(
            <div key={p.id} className="surface p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3"><img src={p.img} className="w-10 h-10 rounded-lg object-cover bg-graphite-100" alt=""/><div><div className="font-semibold text-[14px]">{p.name}</div><div className="text-graphite-500 text-[12.5px]">{p.category}</div></div></div>
                <RowActionsMenu actions={rowActions(p)} label={`Actions for ${p.name}`}/>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <StatusPill status={productStatus(p)}/>
                <StockPill stock={p.stock} lowStockThreshold={p.lowStockThreshold}/>
                <span className="mono-data text-[12.5px] font-semibold">{money(p.price)}</span>
              </div>
            </div>
          ))}
        </div>
      </>)}

      {totalPages>1 && (
        <Pagination className="mt-5 justify-start">
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={()=>goToPage(page-1)} className={page===1?'pointer-events-none opacity-40':'cursor-pointer'}/></PaginationItem>
            {Array.from({length:totalPages}).map((_,i)=>(
              <PaginationItem key={i}><PaginationLink isActive={page===i+1} onClick={()=>goToPage(i+1)} className="cursor-pointer">{i+1}</PaginationLink></PaginationItem>
            ))}
            <PaginationItem><PaginationNext onClick={()=>goToPage(page+1)} className={page===totalPages?'pointer-events-none opacity-40':'cursor-pointer'}/></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <Dialog open={!!editing} onOpenChange={(o)=>!o&&setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id?`Edit ${editing.name}`:'Add product'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Name</span><input {...register('name')} className="input-field mt-1.5"/>{errors.name&&<span className="text-[11.5px] text-red-500">{errors.name.message}</span>}</label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Description</span><textarea {...register('description')} rows={2} className="input-field mt-1.5 h-auto py-2"/></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Category</span>
                <select {...register('category')} className="input-field mt-1.5">{categories.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select></label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Brand</span><input {...register('brand')} className="input-field mt-1.5"/></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Condition</span>
                <select {...register('cond')} className="input-field mt-1.5"><option value="New">New</option><option value="Used">Used</option><option value="Refurbished">Refurbished</option></select></label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Warranty (months)</span><input type="number" {...register('warrantyMonths')} className="input-field mt-1.5"/></label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Price (£)</span><input type="number" step="0.01" {...register('price')} className="input-field mt-1.5"/>{errors.price&&<span className="text-[11.5px] text-red-500">{errors.price.message}</span>}</label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Sale price (£)</span><input type="number" step="0.01" {...register('was')} placeholder="Optional" className="input-field mt-1.5"/></label>
              <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Low-stock at</span><input type="number" {...register('lowStockThreshold')} className="input-field mt-1.5"/></label>
            </div>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Specifications</span>
              <textarea {...register('specsText')} rows={3} placeholder={'Storage: 128GB\nColour: Midnight'} className="input-field mt-1.5 h-auto py-2 font-mono text-[12.5px]"/>
              <span className="text-[11px] text-graphite-400 block mt-1">One per line, as "Key: Value".</span></label>
            <DialogFooter>
              <button type="button" onClick={()=>setEditing(null)} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-brand">{editing?.id?'Save changes':'Create product'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {viewing && (
        <Dialog open={!!viewing} onOpenChange={(o)=>!o&&setViewing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{viewing.name}</DialogTitle></DialogHeader>
            <img src={viewing.img} alt={viewing.name} className="w-full h-40 object-cover rounded-xl bg-graphite-100"/>
            <div className="space-y-2.5 text-[13.5px] mt-3">
              {[['Category',viewing.category],['Brand',viewing.brand||'—'],['Condition',viewing.cond],['Price',money(viewing.price)],['Sale price',viewing.was?money(viewing.was):'—'],['Warranty',viewing.warrantyMonths?`${viewing.warrantyMonths} months`:'—'],['Stock',<StockPill key="st" stock={viewing.stock} lowStockThreshold={viewing.lowStockThreshold}/>],['Status',<StatusPill key="s" status={productStatus(viewing)}/>]].map(([k,v])=>(
                <div key={k} className="flex justify-between py-2 border-b border-graphite-100 last:border-0"><span className="text-graphite-400">{k}</span><span className="font-medium">{v}</span></div>
              ))}
              {viewing.description && <p className="text-graphite-500 pt-2">{viewing.description}</p>}
            </div>
            <DialogFooter><button onClick={()=>setViewing(null)} className="btn btn-ghost">Close</button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {stockFor && <StockDialog product={stockFor} me={me} onClose={()=>{setStockFor(null);refetch()}}/>}
      {branchFor && <BranchStockDialog product={branchFor} me={me} onClose={()=>{setBranchFor(null);refetch()}}/>}

      {target && REASON_ACTIONS.has(target.type) && (
        <ReasonDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={`Archive ${target.product.name}?`} description="Archived products are hidden from the storefront and normal lists but remain visible in historical orders."
          confirmLabel="Archive" onConfirm={runAction}/>
      )}
      {target && target.type==='delete' && (
        deleteBlockers?.length>0 ? (
          <ConfirmDialog open={!!target} onOpenChange={(o)=>{if(!o){setTarget(null);setDeleteBlockers(null)}}}
            title="Can't permanently delete this product" destructive={false} confirmLabel="OK"
            description={`This product can't be deleted because it's ${deleteBlockers.join(', ')}. Archive it instead if you want to hide it.`}
            onConfirm={()=>{setTarget(null);setDeleteBlockers(null)}}/>
        ) : (
          <ReasonDialog open={!!target} onOpenChange={(o)=>{if(!o){setTarget(null);setDeleteBlockers(null)}}}
            title={`Permanently delete ${target.product.name}?`} description="This is an unused draft product with no stock or order history. This cannot be undone."
            confirmLabel="Delete permanently" onConfirm={runAction}/>
        )
      )}
      {target && (target.type==='activate'||target.type==='deactivate'||target.type==='restore') && (
        <ConfirmDialog open={!!target} onOpenChange={(o)=>!o&&setTarget(null)}
          title={target.type==='activate' ? `Activate ${target.product.name}?` : target.type==='restore' ? `Restore ${target.product.name}?` : `Deactivate ${target.product.name}?`}
          description={target.type==='activate' ? 'It will appear on the customer storefront.' : target.type==='restore' ? 'It will reappear in normal product lists.' : 'It will no longer appear on the customer storefront.'}
          confirmLabel={target.type==='activate'?'Activate':target.type==='restore'?'Restore':'Deactivate'}
          destructive={target.type==='deactivate'} onConfirm={()=>runAction()}/>
      )}
    </div>
  )
}

function StockDialog({ product, me, onClose }){
  const { data:history=[], refetch } = useAsync(()=>ProductAPI.stockHistory(product.id),[product.id])
  const [qty,setQty]=useState(1)
  const adjust = async (delta)=>{
    try{
      await ProductAPI.adjustStock(product.id, delta*qty, delta>0?'Manual restock':'Manual adjustment', me?.id)
      logAction({ user:me, action:'product.stock_change', entityType:'product', entityId:product.id, after:{delta:delta*qty} })
      refetch(); toast.success('Stock updated')
    } catch(e){ toast.error(e.message) }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Manage stock — {product.name}</DialogTitle></DialogHeader>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={()=>adjust(-1)} className="w-9 h-9 rounded-lg border border-graphite-200 grid place-items-center hover:border-brand"><Minus size={15}/></button>
          <input type="number" min="1" value={qty} onChange={e=>setQty(Math.max(1,Number(e.target.value)||1))} className="input-field w-20 text-center"/>
          <button onClick={()=>adjust(1)} className="w-9 h-9 rounded-lg border border-graphite-200 grid place-items-center hover:border-brand"><Plus size={15}/></button>
          <span className="text-[13px] text-graphite-500 ml-2">Current: <span className="mono-data font-bold">{product.stock}</span></span>
        </div>
        <div className="text-[12.5px] font-semibold text-graphite-600 mb-2">Recent movements</div>
        <div className="max-h-48 overflow-y-auto space-y-1.5">
          {history.map(h=><div key={h.id} className="flex justify-between text-[12.5px] bg-graphite-50 rounded-lg px-3 py-2"><span>{h.reason}</span><span className={`mono-data font-semibold ${h.delta<0?'text-rose-600':'text-emerald-600'}`}>{h.delta>0?'+':''}{h.delta}</span></div>)}
          {history.length===0 && <div className="text-[12px] text-graphite-400 text-center py-4">No stock movements yet.</div>}
        </div>
        <DialogFooter><button onClick={onClose} className="btn btn-ghost">Close</button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BranchStockDialog({ product, me, onClose }){
  const { data:rows=[], refetch } = useAsync(()=>ProductAPI.branchStock(product.id),[product.id])
  const [from,setFrom]=useState(BRANCHES[0].id)
  const [to,setTo]=useState(BRANCHES[1]?.id||BRANCHES[0].id)
  const [qty,setQty]=useState(1)

  const qtyFor = (branchId)=>rows.find(r=>r.branchId===branchId)?.quantity||0

  const setQuantity = async (branchId, value)=>{
    await ProductAPI.setBranchStock(product.id, branchId, Math.max(0,Number(value)||0))
    logAction({ user:me, action:'product.branch_stock_set', entityType:'product', entityId:product.id, after:{branchId,value} })
    refetch()
  }
  const transfer = async ()=>{
    try{
      await ProductAPI.transferStock(product.id, from, to, qty)
      logAction({ user:me, action:'product.stock_transfer', entityType:'product', entityId:product.id, after:{from,to,qty} })
      toast.success('Stock transferred'); refetch()
    } catch(e){ toast.error(e.message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Branch availability — {product.name}</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
          {BRANCHES.map(b=>(
            <div key={b.id} className="flex items-center justify-between text-[13px]">
              <span>{b.area.split('—')[0]}</span>
              <input type="number" min="0" defaultValue={qtyFor(b.id)} onBlur={e=>setQuantity(b.id,e.target.value)} className="input-field w-20 text-center"/>
            </div>
          ))}
        </div>
        <div className="border-t border-graphite-200 pt-3">
          <div className="text-[12.5px] font-semibold text-graphite-600 mb-2">Transfer stock</div>
          <div className="flex items-center gap-2">
            <select value={from} onChange={e=>setFrom(e.target.value)} className="input-field">{BRANCHES.map(b=><option key={b.id} value={b.id}>{b.area.split('—')[0]}</option>)}</select>
            <span className="text-graphite-400 text-[12px]">to</span>
            <select value={to} onChange={e=>setTo(e.target.value)} className="input-field">{BRANCHES.map(b=><option key={b.id} value={b.id}>{b.area.split('—')[0]}</option>)}</select>
            <input type="number" min="1" value={qty} onChange={e=>setQty(Math.max(1,Number(e.target.value)||1))} className="input-field w-16"/>
            <button onClick={transfer} className="btn btn-brand btn-sm flex-none">Transfer</button>
          </div>
        </div>
        <DialogFooter><button onClick={onClose} className="btn btn-ghost">Close</button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
