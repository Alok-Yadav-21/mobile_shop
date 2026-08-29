import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { OrderAPI, PurchaseAPI, ShiftAPI, UserAPI, BranchAPI, ProductAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import {
  rangeForLastPeriods, filterOrders, filterPurchases, salesSummary, salesByPeriod,
  salesByBranch, purchaseCost, purchasesByBranch, purchasesByPeriod, unassignedSales,
  overallStockReport, branchStockReport, branchPerformance,
} from '@/lib/reporting.js'
import { totalWages, wagesByBranch } from '@/lib/wages.js'
import { PERIODS, PERIOD_LABELS } from '@/constants/finance.js'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { SplitBar } from '@/components/common/SplitBar.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { money0, moneyExact, hoursFmt, pct, fmtDate } from '@/utils/format.js'
import { PoundSterling, Wrench, ShoppingBag, Banknote, CreditCard, Boxes, Users, TrendingUp, PackageX, ShieldAlert } from 'lucide-react'

// How many buckets of each period the report looks back over.
const LOOKBACK = { day: 14, week: 12, month: 6 }

const TABS = [
  { key: 'branches', label: 'By branch' },
  { key: 'trend', label: 'Trend' },
  { key: 'payments', label: 'Cash vs online' },
  { key: 'purchases', label: 'Stock purchases' },
  { key: 'stock', label: 'Stock status' },
]

const STOCK_TONE = {
  sold_out: 'bg-rose-50 text-rose-600',
  low: 'bg-amber-50 text-amber-600',
  in_stock: 'bg-emerald-50 text-emerald-600',
}
const STOCK_LABEL = { sold_out: 'Sold out', low: 'Low', in_stock: 'In stock' }

export default function Reports() {
  const { user: me } = useAuth()
  const { data: orders = [] } = useAsync(() => OrderAPI.list(), [])
  const { data: purchases = [] } = useAsync(() => PurchaseAPI.list(), [])
  const { data: shifts = [] } = useAsync(() => ShiftAPI.list(), [])
  const { data: users = [] } = useAsync(() => UserAPI.list(), [])
  // Inactive and archived branches are included deliberately: a branch that has closed
  // still traded during the window, and dropping it would make the per-branch rows stop
  // adding up to the headline total.
  const { data: branches = [] } = useAsync(() => BranchAPI.list({ includeInactive: true, includeArchived: true }), [])
  const { data: products = [] } = useAsync(() => ProductAPI.list(), [])
  const { data: branchStock = [] } = useAsync(() => PurchaseAPI.allBranchStock(), [])

  const [period, setPeriod] = useState('month')
  const [branchId, setBranchId] = useState('')   // '' = all branches
  const [tab, setTab] = useState('branches')

  const canView = can(me?.role, 'viewFinancialReports')

  const range = useMemo(() => rangeForLastPeriods(period, LOOKBACK[period]), [period])
  const scope = useMemo(() => ({ ...range, ...(branchId ? { branchId } : {}) }), [range, branchId])

  const staff = useMemo(() => users.filter((u) => u.role === 'staff'), [users])
  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff])

  // Everything below is derived from the same scope, so the headline cards and every tab
  // always describe the identical window — no tab can quietly show a different date range.
  const scopedOrders = useMemo(() => filterOrders(orders, scope), [orders, scope])
  const scopedPurchases = useMemo(() => filterPurchases(purchases, {
    ...range, ...(branchId ? { branchId } : {}),
  }), [purchases, range, branchId])
  const scopedShifts = useMemo(() => shifts.filter((s) =>
    s.at >= range.from && s.at <= range.to && (!branchId || s.branchId === branchId)
  ), [shifts, range, branchId])

  const sales = useMemo(() => salesSummary(scopedOrders), [scopedOrders])
  const stockCost = useMemo(() => purchaseCost(scopedPurchases), [scopedPurchases])
  const wages = useMemo(() => totalWages(scopedShifts, staffById), [scopedShifts, staffById])
  const net = Math.round((sales.total - stockCost - wages.wage) * 100) / 100

  const branchRows = useMemo(() => {
    const wageRows = wagesByBranch(scopedShifts, staffById)
    return salesByBranch(orders, branches, range).map((row) => {
      const w = wageRows.find((x) => x.branchId === row.branch.id)
      return branchPerformance({
        branch: row.branch,
        orders: filterOrders(orders, { ...range, branchId: row.branch.id }),
        purchases: filterPurchases(purchases, { ...range, branchId: row.branch.id }),
        wages: w,
      })
    }).sort((a, b) => b.total - a.total)
  }, [orders, purchases, scopedShifts, staffById, branches, range])

  const webSales = useMemo(() => unassignedSales(orders, branches, range), [orders, branches, range])
  const trend = useMemo(() => salesByPeriod(orders, period, scope).reverse(), [orders, period, scope])
  const purchaseTrend = useMemo(() => purchasesByPeriod(purchases, period, { ...range, ...(branchId ? { branchId } : {}) }).reverse(), [purchases, period, range, branchId])
  const purchaseRows = useMemo(() => purchasesByBranch(purchases, branches, range).sort((a, b) => b.cost - a.cost), [purchases, branches, range])

  const stockRows = useMemo(() => (
    branchId
      ? branchStockReport(products, branchStock, branchId)
      : overallStockReport(products, branchStock, branches)
  ), [products, branchStock, branches, branchId])

  const soldOutCount = stockRows.filter((r) => r.state === 'sold_out').length
  const branchesWithGaps = branchId ? 0 : new Set(stockRows.flatMap((r) => r.soldOutBranches?.map((b) => b.id) ?? [])).size
  const selectedBranch = branches.find((b) => b.id === branchId)

  if (!canView) {
    return <div className="surface p-2"><EmptyState title="You don't have access to financial reports" /></div>
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Reports &amp; analytics</h1>
      <p className="text-graphite-400 text-[14px] mb-6">
        Earnings, payment split, stock cost and payroll — for one branch or the whole network.
      </p>

      {/* Scope controls. Period and branch drive every figure on the page. */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="inline-flex rounded-xl border border-graphite-200 bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${period === p ? 'bg-brand text-white' : 'text-graphite-500 hover:text-ink'}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input-field w-auto">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.area}</option>)}
        </select>

        <span className="text-[12.5px] text-graphite-400 mono-data">
          {fmtDate(range.from)} — {fmtDate(range.to)}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={PoundSterling} label={`Total earnings${selectedBranch ? ' — ' + selectedBranch.area.split('—')[0].trim() : ''}`} value={money0(sales.total)} tone="brand" />
        <DashboardCard icon={ShoppingBag} label={`Retail sales · ${pct(sales.retail, sales.total)}`} value={money0(sales.retail)} tone="violet" />
        <DashboardCard icon={Wrench} label={`Repair jobs · ${pct(sales.repair, sales.total)}`} value={money0(sales.repair)} tone="amber" />
        <DashboardCard icon={TrendingUp} label="Net after stock & wages" value={money0(net)} tone={net >= 0 ? 'green' : 'amber'} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <DashboardCard icon={Banknote} label={`Cash taken · ${sales.cashOrders} orders`} value={money0(sales.cash)} tone="green" />
        <DashboardCard icon={CreditCard} label={`Online / card · ${sales.onlineOrders} orders`} value={money0(sales.online)} tone="brand" />
        <DashboardCard icon={Boxes} label="Stock purchased (cost)" value={money0(stockCost)} tone="violet" />
        <DashboardCard icon={Users} label={`Wages · ${hoursFmt(wages.hours)} worked`} value={money0(wages.wage)} tone="amber" />
      </div>

      <div className="flex flex-wrap gap-1.5 mt-7 mb-4 border-b border-graphite-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-brand text-brand' : 'border-transparent text-graphite-400 hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* --- By branch: the overall report, one row per branch, plus a reconciling total --- */}
      {tab === 'branches' && (
        <div className="surface p-5 overflow-x-auto">
          <h2 className="font-bold text-[15px] mb-1">Performance by branch</h2>
          <p className="text-[12px] text-graphite-400 mb-4">Every branch is listed, including those that took nothing in this window.</p>
          <Table>
            <thead><tr>
              <Th>Branch</Th><Th>Orders</Th><Th>Retail</Th><Th>Repairs</Th><Th>Cash</Th><Th>Online</Th>
              <Th>Total earned</Th><Th>Stock cost</Th><Th>Wages</Th><Th>Net</Th>
            </tr></thead>
            <tbody>
              {branchRows.map((r) => (
                <tr key={r.branch.id} className="hover:bg-graphite-50">
                  <Td className="font-semibold">{r.branch.area}</Td>
                  <Td className="mono-data">{r.orders}</Td>
                  <Td className="mono-data">{money0(r.retail)}</Td>
                  <Td className="mono-data">{money0(r.repair)}</Td>
                  <Td className="mono-data text-emerald-600">{money0(r.cash)}</Td>
                  <Td className="mono-data text-brand">{money0(r.online)}</Td>
                  <Td className="mono-data font-bold">{money0(r.total)}</Td>
                  <Td className="mono-data text-graphite-500">{money0(r.stockCost)}</Td>
                  <Td className="mono-data text-graphite-500">{money0(r.wageCost)}</Td>
                  <Td className={`mono-data font-bold ${r.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{money0(r.net)}</Td>
                </tr>
              ))}
              {webSales.orders > 0 && (
                <tr className="hover:bg-graphite-50">
                  <Td className="font-semibold text-graphite-500">Web / unassigned</Td>
                  <Td className="mono-data">{webSales.orders}</Td>
                  <Td className="mono-data">{money0(webSales.retail)}</Td>
                  <Td className="mono-data">{money0(webSales.repair)}</Td>
                  <Td className="mono-data text-emerald-600">{money0(webSales.cash)}</Td>
                  <Td className="mono-data text-brand">{money0(webSales.online)}</Td>
                  <Td className="mono-data font-bold">{money0(webSales.total)}</Td>
                  <Td className="mono-data text-graphite-400">—</Td>
                  <Td className="mono-data text-graphite-400">—</Td>
                  <Td className="mono-data text-graphite-400">—</Td>
                </tr>
              )}
              <tr className="bg-graphite-50 font-bold">
                <Td>All branches</Td>
                <Td className="mono-data">{branchRows.reduce((s, r) => s + r.orders, 0) + webSales.orders}</Td>
                <Td className="mono-data">{money0(branchRows.reduce((s, r) => s + r.retail, 0) + webSales.retail)}</Td>
                <Td className="mono-data">{money0(branchRows.reduce((s, r) => s + r.repair, 0) + webSales.repair)}</Td>
                <Td className="mono-data text-emerald-600">{money0(branchRows.reduce((s, r) => s + r.cash, 0) + webSales.cash)}</Td>
                <Td className="mono-data text-brand">{money0(branchRows.reduce((s, r) => s + r.online, 0) + webSales.online)}</Td>
                <Td className="mono-data">{money0(branchRows.reduce((s, r) => s + r.total, 0) + webSales.total)}</Td>
                <Td className="mono-data">{money0(branchRows.reduce((s, r) => s + r.stockCost, 0))}</Td>
                <Td className="mono-data">{money0(branchRows.reduce((s, r) => s + r.wageCost, 0))}</Td>
                <Td className="mono-data">{money0(branchRows.reduce((s, r) => s + r.net, 0))}</Td>
              </tr>
            </tbody>
          </Table>
        </div>
      )}

      {/* --- Trend: the same money bucketed by day, week or month --- */}
      {tab === 'trend' && (
        <div className="surface p-5 overflow-x-auto">
          <h2 className="font-bold text-[15px] mb-1">
            {PERIOD_LABELS[period]} earnings{selectedBranch ? ` — ${selectedBranch.area}` : ' — all branches'}
          </h2>
          <p className="text-[12px] text-graphite-400 mb-4">Most recent first. Cancelled and refunded orders are excluded.</p>
          {trend.length === 0 ? <EmptyState title="No sales in this period" /> : (
            <Table>
              <thead><tr>
                <Th>{period === 'month' ? 'Month' : period === 'week' ? 'Week' : 'Day'}</Th>
                <Th>Orders</Th><Th>Retail</Th><Th>Repairs</Th><Th>Cash</Th><Th>Online</Th><Th>Total</Th><Th>Avg order</Th>
              </tr></thead>
              <tbody>
                {trend.map((r) => (
                  <tr key={r.key} className="hover:bg-graphite-50">
                    <Td className="font-semibold">{r.label}</Td>
                    <Td className="mono-data">{r.orders}</Td>
                    <Td className="mono-data">{money0(r.retail)}</Td>
                    <Td className="mono-data">{money0(r.repair)}</Td>
                    <Td className="mono-data text-emerald-600">{money0(r.cash)}</Td>
                    <Td className="mono-data text-brand">{money0(r.online)}</Td>
                    <Td className="mono-data font-bold">{money0(r.total)}</Td>
                    <Td className="mono-data text-graphite-500">{moneyExact(r.avgOrder)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}

      {/* --- Cash vs online, per branch and over time --- */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="surface p-5">
            <h2 className="font-bold text-[15px] mb-1">Payment split{selectedBranch ? ` — ${selectedBranch.area}` : ' — all branches'}</h2>
            <p className="text-[12px] text-graphite-400 mb-4">Cash in the drawer versus everything settled electronically.</p>
            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <SplitBar left={sales.cash} right={sales.online} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-graphite-400 font-bold">Cash</div>
                  <div className="text-2xl font-extrabold mono-data text-emerald-600">{moneyExact(sales.cash)}</div>
                  <div className="text-[12px] text-graphite-400">{sales.cashOrders} orders</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-graphite-400 font-bold">Online / card</div>
                  <div className="text-2xl font-extrabold mono-data text-brand">{moneyExact(sales.online)}</div>
                  <div className="text-[12px] text-graphite-400">{sales.onlineOrders} orders</div>
                </div>
              </div>
            </div>
          </div>

          <div className="surface p-5 overflow-x-auto">
            <h2 className="font-bold text-[15px] mb-4">Split by branch</h2>
            <Table>
              <thead><tr><Th>Branch</Th><Th>Cash</Th><Th>Online / card</Th><Th>Total</Th><Th className="w-48">Ratio</Th></tr></thead>
              <tbody>
                {branchRows.map((r) => (
                  <tr key={r.branch.id} className="hover:bg-graphite-50">
                    <Td className="font-semibold">{r.branch.area}</Td>
                    <Td className="mono-data text-emerald-600">{money0(r.cash)}</Td>
                    <Td className="mono-data text-brand">{money0(r.online)}</Td>
                    <Td className="mono-data font-bold">{money0(r.total)}</Td>
                    <Td>{r.total > 0 ? <SplitBar left={r.cash} right={r.online} /> : <span className="text-graphite-400 text-[12px]">No sales</span>}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="surface p-5 overflow-x-auto">
            <h2 className="font-bold text-[15px] mb-4">{PERIOD_LABELS[period]} split</h2>
            <Table>
              <thead><tr><Th>{period === 'month' ? 'Month' : period === 'week' ? 'Week' : 'Day'}</Th><Th>Cash</Th><Th>Online / card</Th><Th>Total</Th><Th>Cash share</Th></tr></thead>
              <tbody>
                {trend.map((r) => (
                  <tr key={r.key} className="hover:bg-graphite-50">
                    <Td className="font-semibold">{r.label}</Td>
                    <Td className="mono-data text-emerald-600">{money0(r.cash)}</Td>
                    <Td className="mono-data text-brand">{money0(r.online)}</Td>
                    <Td className="mono-data font-bold">{money0(r.total)}</Td>
                    <Td className="mono-data">{pct(r.cash, r.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* --- Stock purchase cost, per branch and over time --- */}
      {tab === 'purchases' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <DashboardCard icon={Boxes} label="Stock purchased (cost)" value={money0(stockCost)} tone="violet" />
            <DashboardCard label="Units received" value={scopedPurchases.reduce((s, p) => s + p.quantity, 0)} tone="brand" />
            <DashboardCard label="Purchase orders" value={scopedPurchases.length} tone="amber" />
          </div>

          <div className="surface p-5 overflow-x-auto">
            <h2 className="font-bold text-[15px] mb-4">Stock cost by branch</h2>
            <Table>
              <thead><tr><Th>Branch</Th><Th>Purchase orders</Th><Th>Units</Th><Th>Cost</Th><Th>Share</Th></tr></thead>
              <tbody>
                {purchaseRows.map((r) => (
                  <tr key={r.branch.id} className="hover:bg-graphite-50">
                    <Td className="font-semibold">{r.branch.area}</Td>
                    <Td className="mono-data">{r.records}</Td>
                    <Td className="mono-data">{r.units}</Td>
                    <Td className="mono-data font-bold">{moneyExact(r.cost)}</Td>
                    <Td className="mono-data text-graphite-500">{pct(r.cost, purchaseRows.reduce((s, x) => s + x.cost, 0))}</Td>
                  </tr>
                ))}
                <tr className="bg-graphite-50 font-bold">
                  <Td>All branches</Td>
                  <Td className="mono-data">{purchaseRows.reduce((s, r) => s + r.records, 0)}</Td>
                  <Td className="mono-data">{purchaseRows.reduce((s, r) => s + r.units, 0)}</Td>
                  <Td className="mono-data">{moneyExact(purchaseRows.reduce((s, r) => s + r.cost, 0))}</Td>
                  <Td className="mono-data">100%</Td>
                </tr>
              </tbody>
            </Table>
          </div>

          <div className="surface p-5 overflow-x-auto">
            <h2 className="font-bold text-[15px] mb-4">{PERIOD_LABELS[period]} stock spend</h2>
            {purchaseTrend.length === 0 ? <EmptyState title="No stock purchased in this period" /> : (
              <Table>
                <thead><tr><Th>{period === 'month' ? 'Month' : period === 'week' ? 'Week' : 'Day'}</Th><Th>Units</Th><Th>Cost</Th></tr></thead>
                <tbody>
                  {purchaseTrend.map((r) => (
                    <tr key={r.key} className="hover:bg-graphite-50">
                      <Td className="font-semibold">{r.label}</Td>
                      <Td className="mono-data">{r.units}</Td>
                      <Td className="mono-data font-bold">{moneyExact(r.cost)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>

          <div className="surface p-5 overflow-x-auto">
            <h2 className="font-bold text-[15px] mb-4">Recent purchase orders</h2>
            <Table>
              <thead><tr><Th>Reference</Th><Th>Date</Th><Th>Branch</Th><Th>Product</Th><Th>Qty</Th><Th>Unit cost</Th><Th>Total</Th><Th>Supplier</Th></tr></thead>
              <tbody>
                {scopedPurchases.slice(0, 25).map((p) => (
                  <tr key={p.id} className="hover:bg-graphite-50">
                    <Td className="mono-data font-bold text-brand">{p.reference}</Td>
                    <Td>{fmtDate(p.at)}</Td>
                    <Td>{branches.find((b) => b.id === p.branchId)?.area ?? p.branchId}</Td>
                    <Td>{p.productName}</Td>
                    <Td className="mono-data">{p.quantity}</Td>
                    <Td className="mono-data">{moneyExact(p.unitCost)}</Td>
                    <Td className="mono-data font-bold">{moneyExact(p.quantity * p.unitCost)}</Td>
                    <Td className="text-graphite-500">{p.supplier}</Td>
                  </tr>
                ))}
                {scopedPurchases.length === 0 && <tr><Td colSpan={8} className="text-center text-graphite-400 py-8">No purchase orders in this window.</Td></tr>}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* --- Sold-out / stock status, per branch or across the network --- */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <DashboardCard icon={PackageX} label={branchId ? 'Sold out at this branch' : 'Sold out network-wide'} value={soldOutCount} tone={soldOutCount ? 'amber' : 'green'} />
            <DashboardCard icon={Boxes} label="Products tracked" value={stockRows.length} tone="brand" />
            {!branchId && <DashboardCard icon={ShieldAlert} label="Branches with a gap" value={branchesWithGaps} tone="violet" />}
            {branchId && <DashboardCard icon={Boxes} label="Units on hand here" value={stockRows.reduce((s, r) => s + r.quantity, 0)} tone="violet" />}
          </div>

          <div className="surface p-5 overflow-x-auto">
            <h2 className="font-bold text-[15px] mb-1">
              {branchId ? `Stock at ${selectedBranch?.area}` : 'Stock across all branches'}
            </h2>
            <p className="text-[12px] text-graphite-400 mb-4">
              {branchId
                ? 'What this branch has on hand right now. A product can be sold out here and still in stock elsewhere.'
                : 'Network totals, plus exactly which branches have run out — the list says where to transfer from and to.'}
            </p>
            <Table>
              <thead><tr>
                <Th>Product</Th><Th>Category</Th>
                {branchId ? <Th>On hand</Th> : <><Th>Total units</Th><Th>Branches stocked</Th></>}
                <Th>Status</Th>
                {!branchId && <Th>Sold out at</Th>}
              </tr></thead>
              <tbody>
                {stockRows.map((r) => (
                  <tr key={r.product.id} className="hover:bg-graphite-50">
                    <Td className="font-semibold">{r.product.name}</Td>
                    <Td className="text-graphite-500">{r.product.category}</Td>
                    {branchId ? (
                      <Td className="mono-data">{r.quantity}</Td>
                    ) : (
                      <>
                        <Td className="mono-data">{r.total}</Td>
                        <Td className="mono-data">{r.stockedBranches}/{branches.length}</Td>
                      </>
                    )}
                    <Td>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STOCK_TONE[r.state]}`}>{STOCK_LABEL[r.state]}</span>
                    </Td>
                    {!branchId && (
                      <Td className="text-[12px] text-graphite-500">
                        {/* Full area names, not the leading segment — three branches share a
                            "Woolwich" prefix and two share "New Eltham", so trimming at the
                            dash would list the same name twice and name no branch usefully. */}
                        {r.soldOutBranches.length === 0
                          ? <span className="text-emerald-600">Stocked everywhere</span>
                          : r.soldOutBranches.map((b) => b.area).join(', ')}
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
