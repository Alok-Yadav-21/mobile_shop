import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar.jsx'
import { Footer } from '@/components/layout/Footer.jsx'
export default function PublicLayout(){
  return (<div className="min-h-screen flex flex-col"><Navbar/><main className="flex-1"><Outlet/></main><Footer/></div>)
}
