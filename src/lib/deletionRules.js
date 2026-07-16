// Dependency-blocker helpers: each returns an array of human-readable reasons a record
// cannot be permanently deleted. An empty array means deletion is allowed. Used both to
// gate the "Delete permanently" action in the UI (with the exact reasons shown to the
// admin) and mirrored by the adapter layer so a bypassed UI still can't delete a record
// that's in use.

export function customerDeleteBlockers(customer, { repairs=[], orders=[], tradeIns=[] }={}){
  const reasons = []
  const repairCount = repairs.filter(r=>r.email===customer.email || r.phone===customer.phone).length
  const orderCount = orders.filter(o=>o.customerId===customer.id || o.email===customer.email).length
  const tradeInCount = tradeIns.filter(t=>t.customerId===customer.id).length
  if(repairCount) reasons.push(`${repairCount} repair${repairCount===1?'':'s'} on record`)
  if(orderCount) reasons.push(`${orderCount} order${orderCount===1?'':'s'} on record`)
  if(tradeInCount) reasons.push(`${tradeInCount} trade-in${tradeInCount===1?'':'s'} on record`)
  return reasons
}

export function staffDeleteBlockers(staffMember, { repairs=[], tradeIns=[], auditLogs=[] }={}){
  const reasons = []
  const assigned = repairs.filter(r=>r.tech===staffMember.name).length
  const inspections = tradeIns.filter(t=>t.inspectedBy===staffMember.id).length
  const activity = auditLogs.filter(l=>l.actorId===staffMember.id).length
  if(assigned) reasons.push(`${assigned} repair assignment${assigned===1?'':'s'}`)
  if(inspections) reasons.push(`${inspections} trade-in inspection${inspections===1?'':'s'}`)
  if(activity) reasons.push(`${activity} audit log entr${activity===1?'y':'ies'}`)
  return reasons
}

export function staffActiveRepairs(staffMember, repairs=[]){
  return repairs.filter(r=>r.tech===staffMember.name && !['Completed','Cancelled'].includes(r.status))
}

export function productDeleteBlockers(product, { orders=[], stockMoves=[] }={}){
  const reasons = []
  const orderCount = orders.filter(o=>(o.items||[]).some(i=>i.productId===product.id)).length
  if(orderCount) reasons.push(`used in ${orderCount} order${orderCount===1?'':'s'}`)
  if((product.stock??0) > 0) reasons.push(`${product.stock} unit${product.stock===1?'':'s'} still in stock`)
  const moveCount = stockMoves.filter(m=>m.productId===product.id).length
  if(moveCount) reasons.push(`${moveCount} stock movement${moveCount===1?'':'s'} on record`)
  return reasons
}

export function categoryDeleteBlockers(category, { products=[] }={}){
  const count = products.filter(p=>p.category===category.name).length
  return count ? [`${count} product${count===1?'':'s'} use this category`] : []
}

export function branchDeleteBlockers(branch, { staff=[], repairs=[], orders=[] }={}){
  const reasons = []
  const staffCount = staff.filter(s=>s.branch===branch.id).length
  const repairCount = repairs.filter(r=>r.branch===branch.id).length
  const orderCount = orders.filter(o=>o.branchId===branch.id).length
  if(staffCount) reasons.push(`${staffCount} staff member${staffCount===1?'':'s'} assigned`)
  if(repairCount) reasons.push(`${repairCount} repair${repairCount===1?'':'s'} on record`)
  if(orderCount) reasons.push(`${orderCount} order${orderCount===1?'':'s'} on record`)
  return reasons
}

// Repairs don't carry a formal service_id in this schema (the booking flow captures a free-
// text `problem`); this is a best-effort match against the service title until that FK
// exists, not a guaranteed-exhaustive check.
export function serviceDeleteBlockers(service, { repairs=[] }={}){
  const count = repairs.filter(r=>r.problem?.toLowerCase().includes(service.title.toLowerCase().split(' ')[0])).length
  return count ? [`${count} repair${count===1?'':'s'} appear to reference this service`] : []
}
