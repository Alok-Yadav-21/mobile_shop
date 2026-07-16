import { useState } from 'react'
import { Bell, Search, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth.js'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet.jsx'
import { Logo } from '@/components/common/Logo.jsx'
import { NavList } from '@/components/layout/Sidebar.jsx'

export function Topbar({ title, nav, navTitle }){
  const { user, logout } = useAuth()
  const [open,setOpen]=useState(false)
  return (
    <div className="h-16 bg-white border-b border-graphite-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        {nav && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><button className="md:hidden p-2 -ml-2 text-ink" aria-label="Open menu"><Menu size={20}/></button></SheetTrigger>
            <SheetContent side="left" className="w-[78%] sm:max-w-xs bg-ink-900 text-slate-300 p-4 flex flex-col border-none">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="px-2 py-3"><Logo light sub={false}/></div>
              <div className="kicker text-slate-500 px-3 mt-4 mb-2">{navTitle}</div>
              <NavList nav={nav} onNavigate={()=>setOpen(false)}/>
              <button onClick={logout} className="mt-auto w-full bg-white/5 hover:bg-white/10 text-white rounded-lg py-2.5 text-[13px]">Sign out</button>
            </SheetContent>
          </Sheet>
        )}
        <h1 className="text-[15px] sm:text-lg font-extrabold tracking-tight truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-graphite-50 border border-graphite-200 rounded-xl px-3 py-2 text-graphite-400 text-[13px] w-52"><Search size={14}/><input placeholder="Search…" className="bg-transparent outline-none w-full text-ink"/></div>
        <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-graphite-200 grid place-items-center text-graphite-500 hover:text-brand hover:border-brand/40 transition-colors"><Bell size={17}/></button>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-brand to-violet text-white grid place-items-center font-bold text-[13px]">{(user?.name||'U')[0]}</div>
      </div>
    </div>
  )
}
