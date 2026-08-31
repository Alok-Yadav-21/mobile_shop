import { useState } from 'react'
import { toast } from 'sonner'
import { PurchaseAPI } from '@/services/api.js'
import { logAction } from '@/services/auditService.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { moneyExact } from '@/utils/format.js'

// Recording a stock delivery. This existed in the data layer with no way to reach it, so the
// purchase-cost reports could only ever show seeded history — nothing bought since could be
// entered.
//
// PurchaseAPI.create does the reconciliation: it writes the purchase record AND moves the
// stock into the receiving branch, so cost and availability cannot disagree.
export function RecordDeliveryDialog({ branches, products, me, onClose, onSaved }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [unitCost, setUnitCost] = useState('')
  const [supplier, setSupplier] = useState('')
  const [busy, setBusy] = useState(false)

  const product = products.find((p) => p.id === productId)
  const total = (Number(quantity) || 0) * (Number(unitCost) || 0)

  const submit = async () => {
    const qty = Number(quantity)
    const cost = Number(unitCost)
    if (!branchId || !productId) { toast.error('Choose a branch and a product.'); return }
    if (!Number.isFinite(qty) || qty < 1) { toast.error('Enter how many units arrived.'); return }
    if (!Number.isFinite(cost) || cost < 0) { toast.error('Enter what each unit cost.'); return }

    setBusy(true)
    try {
      const entry = await PurchaseAPI.create({
        branchId,
        productId,
        productName: product?.name,
        quantity: qty,
        // Captured per delivery: a batch costs what was paid on the day, and a later price
        // change must not rewrite what this branch spent.
        unitCost: Math.round(cost * 100) / 100,
        supplier: supplier.trim() || null,
      })
      logAction({ user: me, action: 'stock.delivery', entityType: 'product', entityId: productId, after: { branchId, quantity: qty, unitCost: cost } })
      toast.success(`${qty} × ${product?.name} received at ${branches.find((b) => b.id === branchId)?.area} — ${entry.reference}`)
      onSaved?.()
      onClose()
    } catch (e) { toast.error(e.message || 'Could not record that delivery') } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record a stock delivery</DialogTitle></DialogHeader>

        <div className="space-y-3.5">
          <label className="block">
            <span className="text-[12.5px] font-semibold text-graphite-600">Received at</span>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input-field mt-1.5">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.area}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-[12.5px] font-semibold text-graphite-600">Product</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input-field mt-1.5">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12.5px] font-semibold text-graphite-600">Units</span>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input-field mt-1.5" />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-semibold text-graphite-600">Cost per unit</span>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="input-field mt-1.5" />
            </label>
          </div>

          <label className="block">
            <span className="text-[12.5px] font-semibold text-graphite-600">Supplier (optional)</span>
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. MobileParts Direct" className="input-field mt-1.5" />
          </label>

          <div className="flex items-center justify-between bg-graphite-50 rounded-xl px-4 py-3">
            <span className="text-[12.5px] text-graphite-500">Delivery cost</span>
            <span className="font-extrabold mono-data">{moneyExact(total)}</span>
          </div>

          <p className="text-[11.5px] text-graphite-400">
            This adds the units to that branch&rsquo;s shelf and to the network total, and records the
            cost against the branch in the purchase reports.
          </p>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn btn-brand btn-sm disabled:opacity-60">
            {busy ? 'Recording…' : 'Record delivery'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
