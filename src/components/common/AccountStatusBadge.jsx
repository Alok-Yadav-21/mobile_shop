const TONE = {
  active: { pill:'bg-emerald-50 text-emerald-600', dot:'bg-emerald-500' },
  inactive: { pill:'bg-rose-50 text-rose-600', dot:'bg-rose-500' },
  archived: { pill:'bg-graphite-100 text-graphite-500', dot:'bg-graphite-400' },
  draft: { pill:'bg-amber-50 text-amber-600', dot:'bg-amber-500' },
}
const LABELS = { active:'Active', inactive:'Inactive', archived:'Archived', draft:'Draft' }

// Generic lifecycle badge shared by every admin management page (accounts, products,
// categories, branches, services) — active / inactive / archived / draft.
export function StatusPill({ status='active', label }){
  const t = TONE[status] || TONE.inactive
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${t.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`}/>
      {label || LABELS[status] || status}
    </span>
  )
}

// Alias kept for the existing Users/Customers pages.
export function AccountStatusBadge({ status='active' }){ return <StatusPill status={status}/> }

const ROLE_TONE = { admin:'bg-violet-50 text-violet-600', staff:'bg-brand-50 text-brand', customer:'bg-emerald-50 text-emerald-600' }
export function RoleBadge({ role, superAdmin=false }){
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${ROLE_TONE[role]||'bg-graphite-100 text-graphite-600'}`}>
      {superAdmin?'Super admin':role}
    </span>
  )
}

export function StockPill({ stock=0, lowStockThreshold=3 }){
  if(stock<=0) return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"/>Out of stock</span>
  if(stock<=lowStockThreshold) return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>Low stock · {stock}</span>
  return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>In stock · {stock}</span>
}
