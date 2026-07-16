import { MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu.jsx'

const TONE_CLASS = {
  default: '',
  amber: 'text-amber-600 focus:text-amber-700',
  emerald: 'text-emerald-600 focus:text-emerald-700',
  rose: 'text-rose-600 focus:text-rose-700',
}

// Shared three-dot row-actions menu used across every admin management table.
// `actions` is an ordered array of either 'separator' or
// { key, label, icon:LucideIcon, onClick, tone, disabled, disabledReason, hidden }.
export function RowActionsMenu({ actions, label='Row actions' }){
  const visible = actions.filter(a=>a==='separator' || !a.hidden)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-8 h-8 rounded-lg grid place-items-center text-graphite-400 hover:text-ink hover:bg-graphite-100" aria-label={label}>
          <MoreHorizontal size={16}/>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {visible.map((a,i)=>a==='separator'
          ? <DropdownMenuSeparator key={`sep-${i}`}/>
          : (
            <DropdownMenuItem
              key={a.key}
              disabled={a.disabled}
              onClick={a.onClick}
              title={a.disabled && a.disabledReason ? a.disabledReason : undefined}
              className={TONE_CLASS[a.tone||'default']}>
              {a.icon && <a.icon size={14}/>} {a.disabled && a.disabledReason ? a.disabledReason : a.label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
