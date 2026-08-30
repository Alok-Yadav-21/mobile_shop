import { NavLink } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Logo } from '@/components/common/Logo.jsx'
import { useAuth } from '@/hooks/useAuth.js'
import { LogOut } from 'lucide-react'

function NavList({ nav, onNavigate, idPrefix = 'nav' }) {
  const reduce = useReducedMotion()

  return (
    <nav className="flex flex-col gap-0.5 overflow-y-auto">
      {nav.map((n) => {
        const Icon = n.icon
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* One shared layoutId per sidebar instance means the highlight slides between
                    items instead of blinking out and back in. The prefix keeps the desktop
                    sidebar and the mobile drawer from animating into each other while both
                    are mounted. */}
                {isActive && (
                  <motion.span
                    layoutId={reduce ? undefined : `${idPrefix}-active`}
                    className="absolute inset-0 rounded-xl bg-white/10"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b from-brand to-violet z-10" />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  {Icon && <Icon size={17} />}
                  <span>{n.label}</span>
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function Sidebar({ nav, title }) {
  const { user, logout } = useAuth()
  return (
    <aside className="hidden md:flex flex-col w-[248px] bg-ink-900 text-slate-300 sticky top-0 h-screen p-4 flex-none">
      <div className="px-2 py-3"><Logo light sub={false} /></div>
      <div className="kicker text-slate-500 px-3 mt-4 mb-2">{title}</div>
      <NavList nav={nav} idPrefix="sidebar" />
      <div className="mt-auto pt-4 border-t border-white/10 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-violet text-white grid place-items-center font-bold text-[12px] flex-none">
            {(user?.name || 'U')[0]}
          </div>
          <div className="min-w-0">
            <div className="text-white text-[13.5px] font-semibold truncate">{user?.name}</div>
            <div className="text-[11.5px] text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white rounded-lg py-2 text-[13px] transition-colors"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  )
}

export { NavList }
