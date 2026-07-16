import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, User, ChevronRight, ShoppingBag } from 'lucide-react'
import { Logo } from '@/components/common/Logo.jsx'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet.jsx'
import { PUBLIC_NAV } from '@/constants/nav.js'
import { ROLE_HOME } from '@/constants/roles.js'
import { useAuth } from '@/hooks/useAuth.js'
import { useCart } from '@/context/CartContext.jsx'

export function Navbar(){
  const [open,setOpen]=useState(false)
  const { user, isAuthed, role } = useAuth() || {}
  const { count } = useCart() || {}

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md hairline-t border-b border-graphite-200">
      <div className="container-x flex items-center h-[68px] gap-6">
        <Logo/>
        <nav className="hidden lg:flex items-center gap-1 ml-6">
          {PUBLIC_NAV.map(n=>(
            <NavLink key={n.to} to={n.to} end={n.to==='/'}
              className={({isActive})=>`relative px-3 py-2 text-[13.5px] font-semibold rounded-lg transition-colors ${isActive?'text-brand':'text-ink/80 hover:text-brand hover:bg-brand-50/60'}`}>
              {({isActive})=>(<>
                {n.label}
                {isActive && <span className="absolute left-3 right-3 -bottom-[9px] h-[2px] rounded-full bg-gradient-to-r from-brand to-violet"/>}
              </>)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAuthed ? (
            <Link to={ROLE_HOME[role]||'/app'} className="hidden sm:inline-flex items-center gap-2 text-[13.5px] font-semibold text-ink/80 hover:text-brand">
              <span className="w-7 h-7 rounded-full bg-ink-900 text-white grid place-items-center text-[11px] font-bold">{(user?.name||'U')[0].toUpperCase()}</span>
              My account
            </Link>
          ) : (
            <Link to="/login" className="hidden sm:inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink/80 hover:text-brand"><User size={16}/> Sign in</Link>
          )}
          <Link to="/cart" className="relative p-2 -mx-1 text-ink/80 hover:text-brand" aria-label="Cart">
            <ShoppingBag size={20}/>
            {!!count && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold grid place-items-center">{count>9?'9+':count}</span>}
          </Link>
          <Link to="/app/book" className="btn btn-brand btn-sm hidden sm:inline-flex">Book a repair</Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 -mr-1.5 text-ink" aria-label="Open menu"><Menu size={22}/></button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86%] sm:max-w-sm bg-paper p-0 flex flex-col">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="p-5 border-b border-graphite-200"><Logo/></div>
              <nav className="flex-1 overflow-y-auto p-3">
                {PUBLIC_NAV.map(n=>(
                  <NavLink key={n.to} to={n.to} end={n.to==='/'} onClick={()=>setOpen(false)}
                    className={({isActive})=>`flex items-center justify-between px-3 py-3.5 rounded-xl text-[15px] font-semibold ${isActive?'text-brand bg-brand-50':'text-ink'}`}>
                    {n.label}<ChevronRight size={16} className="text-graphite-400"/>
                  </NavLink>
                ))}
              </nav>
              <div className="p-4 border-t border-graphite-200 flex flex-col gap-2.5">
                {isAuthed ? (
                  <Link to={ROLE_HOME[role]||'/app'} onClick={()=>setOpen(false)} className="btn btn-ghost">My account</Link>
                ) : (
                  <Link to="/login" onClick={()=>setOpen(false)} className="btn btn-ghost">Sign in</Link>
                )}
                <Link to="/app/book" onClick={()=>setOpen(false)} className="btn btn-brand">Book a repair</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
