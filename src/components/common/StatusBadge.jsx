import { Badge } from '@/components/custom-ui/badge.jsx'
import { STATUS_STYLES, statusLabel } from '@/constants/status.js'

// The colour always comes from the internal status, so a badge means the same thing at a
// glance on every screen; only the wording changes with the audience. See the note above
// CUSTOMER_STATUS_LABELS in constants/status.js for why customers are told something different.
export function StatusBadge({ status, audience = 'internal' }){
  return (
    <Badge className={STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}>
      {statusLabel(status, audience)}
    </Badge>
  )
}
