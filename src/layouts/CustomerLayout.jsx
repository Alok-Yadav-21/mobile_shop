import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar.jsx'
import { Topbar } from '@/components/layout/Topbar.jsx'
import { CUSTOMER_NAV } from '@/constants/nav.js'
export default function CustomerLayout(){
  const loc = useLocation()
  const active = CUSTOMER_NAV.find(n=> n.end ? loc.pathname===n.to : loc.pathname.startsWith(n.to))
  return (
    <div className="min-h-screen flex bg-graphite-50">
      <Sidebar nav={CUSTOMER_NAV} title="Customer workspace"/>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={active?.label || 'Customer'} nav={CUSTOMER_NAV} navTitle="Customer workspace"/>
        <div className="p-4 sm:p-6 max-w-[1200px] w-full"><Outlet/></div>
      </div>
    </div>
  )
}
