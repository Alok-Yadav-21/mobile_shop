import { Badge } from '@/components/custom-ui/badge.jsx'
import { STATUS_STYLES, statusLabel } from '@/constants/status.js'

// The colour always comes from the stored status, so a badge means the same thing at a glance
// on every screen; only the wording changes with the audience.
//
// `repair` is optional and only used for the customer wording, where one stage covers two
// statuses that read differently — "Ready to collect" against "On its way to you". Passing the
// record keeps the badge saying exactly what the timeline beside it says.
export function StatusBadge({ status, audience = 'internal', repair = null }){
  return (
    <Badge className={STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}>
      {statusLabel(status, audience, repair)}
    </Badge>
  )
}
