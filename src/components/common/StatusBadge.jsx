import { Badge } from '@/components/custom-ui/badge.jsx'
import { STATUS_STYLES } from '@/constants/status.js'
export function StatusBadge({ status }){
  return <Badge className={STATUS_STYLES[status]||'bg-slate-100 text-slate-600'}>{status}</Badge>
}
