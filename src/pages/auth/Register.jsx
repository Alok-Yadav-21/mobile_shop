import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { Logo } from '@/components/common/Logo.jsx'

export default function Register(){
  const { register } = useAuth()
  const nav = useNavigate()
  const [f,setF]=useState({ name:'', email:'', phone:'' })
  const set = (k)=>(e)=>setF(s=>({...s,[k]:e.target.value}))

  const submit = ()=>{
    if(!f.name || !f.email){ toast.error('Please enter your name and email.'); return }
    register(f)
    toast.success('Account created')
    nav('/app')
  }

  return (
    <div className="min-h-screen grid place-items-center bg-graphite-50 p-5">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo/></div>
        <div className="surface p-8">
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight">Create your Virktech account</h1>
            <p className="text-[13px] text-graphite-400 mt-1">Book repairs, track status and manage orders.</p>
          </div>
          <div className="mt-6 space-y-3.5">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Full name</span>
              <input value={f.name} onChange={set('name')} placeholder="Alex Kaur" className="input-field mt-1.5"/></label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Email</span>
              <input value={f.email} onChange={set('email')} placeholder="you@email.com" className="input-field mt-1.5"/></label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Mobile</span>
              <input value={f.phone} onChange={set('phone')} placeholder="07700 900123" className="input-field mt-1.5"/></label>
          </div>
          <button onClick={submit} className="btn btn-brand w-full mt-6">Create account</button>
          <p className="text-center text-[13.5px] text-graphite-500 mt-5">Already registered? <Link to="/login" className="text-brand font-semibold">Sign in</Link></p>
        </div>
        <p className="text-center text-[12px] text-graphite-400 mt-5"><Link to="/" className="hover:text-brand">Back to Virktech</Link></p>
      </div>
    </div>
  )
}
