import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar.jsx'
import { Topbar } from '@/components/layout/Topbar.jsx'
import { ADMIN_NAV } from '@/constants/nav.js'
export default function AdminLayout(){
  const loc = useLocation()
  const active = ADMIN_NAV.find(n=> n.end ? loc.pathname===n.to : loc.pathname.startsWith(n.to))
  return (
    <div className="min-h-screen flex bg-graphite-50">
      <Sidebar nav={ADMIN_NAV} title="Admin workspace"/>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={active?.label || 'Admin'} nav={ADMIN_NAV} navTitle="Admin workspace"/>
        <div className="p-4 sm:p-6 max-w-[1200px] w-full"><Outlet/></div>
      </div>
    </div>
  )
}
