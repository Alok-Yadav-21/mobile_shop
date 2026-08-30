import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { ProductAPI, RepairAPI, BranchAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { Boxes, AlertTriangle, MapPin } from 'lucide-react'

// Levels describe what is on the shelf at THIS branch. The network total is shown alongside
// as context, because "sold out here, plenty in Woolwich" is the useful thing to know.
const LEVEL = (qty, threshold = 3) =>
  qty <= 0 ? { l: 'Out of stock', tone: 'text-rose-600 bg-rose-50' }
  : qty <= threshold ? { l: 'Low stock', tone: 'text-amber-600 bg-amber-50' }
  : { l: 'In stock', tone: 'text-emerald-600 bg-emerald-50' }

export default function StockTasks() {
  const { user: me } = useAuth()
  const canInventory = can(me?.role, 'manageInventory')

  // Staff are pinned to their own branch. An admin has no branch of their own, so they pick
  // one — the data layer refuses a staff member who tries the same thing.
  const [branchId, setBranchId] = useState(me?.branch || '')
  const { data: branches = [] } = useAsync(() => BranchAPI.list(), [])
  const activeBranch = me?.role === 'admin' ? (branchId || branches[0]?.id) : me?.branch

  const { data: products = [], refetch } = useAsync(
    () => (activeBranch ? ProductAPI.stockForBranch(activeBranch) : Promise.resolve([])),
    [activeBranch],
  )
  const [using, setUsing] = useState(null)

  const branchName = branches.find((b) => b.id === activeBranch)?.area ?? activeBranch

  const reportDamaged = async (p) => {
    if (p.branchQuantity <= 0) { toast.error('Nothing on the shelf here to report.'); return }
    try {
      await ProductAPI.adjustBranchStock(p.id, activeBranch, -1, 'Reported damaged/missing')
      logAction({ user: me, action: 'product.stock_change', entityType: 'product', entityId: p.id, reason: 'Reported damaged/missing' })
      toast.success(`${p.name} — 1 unit marked damaged/missing at ${branchName}`)
      refetch()
    } catch (e) { toast.error(e.message) }
  }

  if (!activeBranch) {
    return <div className="surface p-2"><EmptyState title="Your account is not assigned to a branch" /></div>
  }

  const outHere = products.filter((p) => p.branchQuantity <= 0).length

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">Stock tasks</h1>
          <p className="text-graphite-400 text-[14px]">
            What is on the shelf at your branch. Using or writing off stock here updates this branch and the network total together.
          </p>
        </div>
        {me?.role === 'admin' && (
          <select value={activeBranch} onChange={(e) => setBranchId(e.target.value)} className="input-field w-auto">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.area}</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-brand bg-brand-50 border border-brand/15 rounded-xl px-3.5 py-2.5 mb-4">
        <MapPin size={14} />
        {branchName}
        {outHere > 0 && <span className="text-graphite-500 font-medium">· {outHere} product{outHere === 1 ? '' : 's'} unavailable here</span>}
      </div>

      <div className="surface divide-y divide-graphite-200">
        {products.map((p) => {
          const lv = LEVEL(p.branchQuantity, p.lowStockThreshold ?? 3)
          const elsewhere = (p.stock ?? 0) - p.branchQuantity
          return (
            <div key={p.id} className="flex items-center justify-between px-5 py-3.5 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <img src={p.img} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-none" />
                <div>
                  <div className="font-semibold text-[13.5px]">{p.name}</div>
                  <div className="text-[12px] text-graphite-400">
                    {p.category}
                    {/* Where to look next when this branch has run out. */}
                    {elsewhere > 0 && <span className="text-graphite-500"> · {elsewhere} at other branches</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${lv.tone}`}>{lv.l} · {p.branchQuantity}</span>
                {canInventory && p.branchQuantity > 0 && (
                  <button onClick={() => setUsing(p)} className="btn btn-ghost btn-sm">Use for repair</button>
                )}
                {canInventory && p.branchQuantity > 0 && p.branchQuantity <= (p.lowStockThreshold ?? 3) && (
                  <button onClick={() => reportDamaged(p)} className="btn btn-ghost btn-sm text-rose-600">
                    <AlertTriangle size={13} /> Report issue
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 mt-4 text-[11.5px] text-graphite-400">
        <Boxes size={14} /> Stock is shared live with the storefront and the admin reports — figures here are your branch's own.
      </div>

      {using && (
        <UsePartDialog
          product={using}
          branchId={activeBranch}
          branchName={branchName}
          onClose={() => { setUsing(null); refetch() }}
          me={me}
        />
      )}
    </div>
  )
}

function UsePartDialog({ product, branchId, branchName, onClose, me }) {
  const [ref, setRef] = useState('')
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!ref.trim()) { toast.error('Enter a repair reference.'); return }
    setBusy(true)
    try {
      // Resolved through the scoped API, so a reference from another branch is not found.
      const repair = await RepairAPI.get(ref.trim())
      if (!repair) { toast.error(`No repair found with reference ${ref.trim()}`); setBusy(false); return }
      await ProductAPI.adjustBranchStock(product.id, branchId, -qty, `Used on repair ${ref.trim()}`)
      await RepairAPI.addPart(ref.trim(), { name: product.name, quantity: qty, unitCost: product.price, productId: product.id })
      logAction({ user: me, action: 'repair.part_add', entityType: 'repair', entityId: ref.trim(), after: { name: product.name, quantity: qty } })
      toast.success(`${qty} × ${product.name} used on ${ref.trim()}`)
      onClose()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Use {product.name} on a repair</DialogTitle></DialogHeader>
        <div className="space-y-3.5">
          <label className="block">
            <span className="text-[12.5px] font-semibold text-graphite-600">Repair reference</span>
            <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="SPR-4805" className="input-field mt-1.5" />
          </label>
          <label className="block">
            <span className="text-[12.5px] font-semibold text-graphite-600">Quantity</span>
            <input
              type="number" min="1" max={product.branchQuantity} value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(product.branchQuantity, Number(e.target.value) || 1)))}
              className="input-field mt-1.5"
            />
          </label>
          <p className="text-[11.5px] text-graphite-400">
            {product.branchQuantity} in stock at {branchName}. This comes off your branch's shelf, not the network total.
          </p>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn btn-brand disabled:opacity-60">{busy ? 'Saving…' : 'Use stock'}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
