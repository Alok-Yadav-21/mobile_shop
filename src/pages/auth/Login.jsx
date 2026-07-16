import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { ROLE_HOME, ROLES } from '@/constants/roles.js'
import { BRAND } from '@/constants/brand.js'
import { Logo } from '@/components/common/Logo.jsx'
import { User, Wrench, LayoutDashboard, ChevronRight } from 'lucide-react'

const DEMO = [
  { role:ROLES.CUSTOMER, email:'customer@demo.com', icon:User, title:'Customer', desc:'Book & track repairs, buy, sell' },
  { role:ROLES.STAFF, email:'staff@demo.com', icon:Wrench, title:'Staff / technician', desc:'Assigned jobs & status updates' },
  { role:ROLES.ADMIN, email:'admin@demo.com', icon:LayoutDashboard, title:'Central admin', desc:'All branches, users, reports' },
]

export default function Login(){
  const { login } = useAuth()
  const nav = useNavigate()
  const [email,setEmail]=useState('')
  const [pw,setPw]=useState('')

  const go = (roleHint)=>{
    const demo = DEMO.find(d=>d.role===roleHint)
    const u = login(email || demo?.email, pw, roleHint)
    toast.success(`Signed in as ${u.name}`)
    nav(ROLE_HOME[u.role]||'/')
  }

  return (
    <div className="min-h-screen grid place-items-center bg-graphite-50 p-5">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo/></div>
        <div className="surface p-8">
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight">Sign in to Virktech</h1>
            <p className="text-[12px] text-graphite-400 mt-1">{BRAND.recognition}</p>
          </div>

          <div className="mt-6 space-y-3.5">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Email</span>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" className="input-field mt-1.5"/></label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Password</span>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Any password (demo)" className="input-field mt-1.5"/></label>
          </div>

          <div className="kicker text-graphite-400 mt-6 mb-2.5 text-center">Demo — pick a role to explore</div>
          <div className="space-y-2">
            {DEMO.map(d=>(
              <button key={d.role} onClick={()=>go(d.role)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-graphite-200 hover:border-brand hover:bg-brand-50 transition-colors text-left">
                <span className="w-10 h-10 rounded-lg bg-brand-50 text-brand grid place-items-center flex-none"><d.icon size={17}/></span>
                <span className="flex-1"><span className="font-bold text-[14px] block">{d.title}</span><span className="text-[12px] text-graphite-400">{d.desc}</span></span>
                <ChevronRight size={16} className="text-graphite-300"/>
              </button>
            ))}
          </div>

          <p className="text-center text-[13.5px] text-graphite-500 mt-6">No account? <Link to="/register" className="text-brand font-semibold">Create one</Link></p>
        </div>
        <p className="text-center text-[12px] text-graphite-400 mt-5"><Link to="/" className="hover:text-brand">Back to Virktech</Link></p>
      </div>
    </div>
  )
}
