export const money = n => n==null ? '—' : '£'+Number(n).toLocaleString('en-GB')
export const fmtDate = t => new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
export const fmtDateTime = t => new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+new Date(t).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
export function timeAgo(t){
  if(!t) return 'Never'
  const mins = Math.max(0, Math.floor((Date.now()-t)/60000))
  if(mins<1) return 'Just now'
  if(mins<60) return `${mins}m ago`
  const hrs = Math.floor(mins/60)
  if(hrs<24) return `${hrs}h ago`
  const days = Math.floor(hrs/24)
  if(days<30) return `${days}d ago`
  return fmtDate(t)
}

// Reporting formats. `money` drops trailing pence, which is fine for a price tag but wrong on
// a reconciliation table — these keep totals exact and hours/percentages readable.
export const moneyExact = n => n==null ? '—' : '£'+Number(n).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})
export const money0 = n => n==null ? '—' : '£'+Math.round(Number(n)).toLocaleString('en-GB')
export const hoursFmt = n => n==null ? '—' : Number(n).toLocaleString('en-GB',{minimumFractionDigits:1,maximumFractionDigits:1})+'h'
export const pct = (part,total) => !total ? '0%' : Math.round((part/total)*100)+'%'
