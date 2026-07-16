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
