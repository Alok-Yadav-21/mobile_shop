import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bell, Search, Menu, Volume2, VolumeX, CheckCheck, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { NotificationAPI } from '@/services/api.js'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet.jsx'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx'
import { Logo } from '@/components/common/Logo.jsx'
import { NavList } from '@/components/layout/Sidebar.jsx'
import { timeAgo } from '@/utils/format.js'
import { playNotificationChime, newArrivals, isMuted, setMuted } from '@/lib/notificationSound.js'

export function Topbar({ title, nav, navTitle }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const reduce = useReducedMotion()
  const navigate = useNavigate()

  // The data layer scopes this to the signed-in account, so the bell shows the caller's own
  // notifications and nobody else's. These are the same records a repair status change
  // raises, which is what makes staff activity visible to the customer here.
  const { data: notifications = [], refetch } = useAsync(
    () => NotificationAPI.list().catch(() => []),
    [user?.id],
  )
  const unread = notifications.filter((n) => !n.read)

  // Something arriving while you are looking at another screen is the whole point of the bell,
  // and a badge you are not looking at announces nothing. One Topbar serves all three
  // workspaces, so this covers customers, staff and admins at once.
  const seenIds = useRef(null)
  const [muted, setMutedState] = useState(isMuted)
  useEffect(() => {
    const ids = new Set(notifications.map((n) => n.id))
    // newArrivals returns nothing for the first read of the session, so opening a page with a
    // backlog of ten unread notices does not play ten chimes at somebody.
    if (newArrivals(seenIds.current, notifications).length > 0) playNotificationChime()
    seenIds.current = ids
  }, [notifications])

  const markAllRead = async () => {
    try { await NotificationAPI.markAllRead(); refetch() } catch { /* non-fatal */ }
  }
  const clearAll = async () => {
    try {
      await NotificationAPI.clear()
      // Reset the watermark too, or every notification still on the server would look new the
      // next time the list came back and would chime as if it had just arrived.
      seenIds.current = null
      refetch()
    } catch { /* non-fatal */ }
  }

  const toggleMuted = () => {
    const next = !muted
    setMuted(next); setMutedState(next)
    // Played on unmuting so you hear what you have just turned on, and know it works.
    if (!next) playNotificationChime()
  }

  const openNotification = async (n) => {
    // Marking read must not gate the navigation: an already-read notification is still the
    // fastest way back to the repair or sale it is about.
    if (!n.read) {
      try { await NotificationAPI.markRead(n.id); refetch() } catch { /* non-fatal */ }
    }
    // Every journey notification carries where it happened, so the bell takes you to the thing
    // that changed instead of announcing it and leaving you to find it.
    if (n.link) { setNotifOpen(false); navigate(n.link) }
  }

  return (
    <div className="h-16 bg-white/85 backdrop-blur-md border-b border-graphite-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        {nav && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 -ml-2 text-ink" aria-label="Open menu"><Menu size={20} /></button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[78%] sm:max-w-xs bg-ink-900 text-slate-300 p-4 flex flex-col border-none">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="px-2 py-3"><Logo light sub={false} /></div>
              <div className="kicker text-slate-500 px-3 mt-4 mb-2">{navTitle}</div>
              <NavList nav={nav} onNavigate={() => setOpen(false)} idPrefix="drawer" />
              <button onClick={logout} className="mt-auto w-full bg-white/5 hover:bg-white/10 text-white rounded-lg py-2.5 text-[13px]">Sign out</button>
            </SheetContent>
          </Sheet>
        )}
        <h1 className="text-[15px] sm:text-lg font-extrabold tracking-tight truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-graphite-50 border border-graphite-200 rounded-xl px-3 py-2 text-graphite-400 text-[13px] w-52 focus-within:border-brand/40 focus-within:bg-white transition-colors">
          <Search size={14} />
          <input placeholder="Search…" aria-label="Search" className="bg-transparent outline-none w-full text-ink" />
        </div>

        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-graphite-200 grid place-items-center text-graphite-500 hover:text-brand hover:border-brand/40 transition-colors"
              aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'}
            >
              <Bell size={17} />
              <AnimatePresence>
                {unread.length > 0 && (
                  <motion.span
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center"
                  >
                    {unread.length > 9 ? '9+' : unread.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="px-4 py-3 border-b border-graphite-100 flex items-center justify-between">
              <span className="font-bold text-[13.5px]">Notifications</span>
              <button
                onClick={toggleMuted}
                className="p-1 -m-1 rounded-lg text-graphite-400 hover:text-brand transition-colors"
                aria-label={muted ? 'Turn notification sound on' : 'Turn notification sound off'}
                title={muted ? 'Sound off' : 'Sound on'}
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              {unread.length > 0 && <span className="text-[11.5px] text-brand font-semibold">{unread.length} new</span>}
            </div>

            {notifications.length > 0 && (
              <div className="px-2 py-1.5 border-b border-graphite-100 flex items-center gap-1">
                <button
                  onClick={markAllRead}
                  disabled={unread.length === 0}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px] font-semibold text-graphite-500 hover:text-brand hover:bg-graphite-50 disabled:opacity-40 disabled:hover:text-graphite-500 disabled:hover:bg-transparent transition-colors"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px] font-semibold text-graphite-500 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-auto"
                >
                  <Trash2 size={13} /> Clear all
                </button>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-[12.5px] text-graphite-400">Nothing yet.</p>
              ) : (
                notifications.slice(0, 12).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    title={n.link ? 'Open' : undefined}
                    className={`w-full text-left px-4 py-3 border-b border-graphite-100 last:border-0 hover:bg-graphite-50 transition-colors ${n.read ? '' : 'bg-brand-50/40'}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-none" />}
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate">{n.title}</div>
                        {n.body && <div className="text-[12px] text-graphite-500 mt-0.5">{n.body}</div>}
                        <div className="text-[11px] text-graphite-400 mt-1">{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            {user?.role === 'customer' && (
              <Link to="/app/profile" className="block px-4 py-2.5 text-[12.5px] font-semibold text-brand hover:bg-graphite-50 border-t border-graphite-100">
                View all in your profile
              </Link>
            )}
          </PopoverContent>
        </Popover>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-ink text-white grid place-items-center font-bold text-[13px]">
          {(user?.name || 'U')[0]}
        </div>
      </div>
    </div>
  )
}
