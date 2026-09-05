import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { PASSWORD_RULES, passwordProblem } from '@/lib/password.js'
import { Logo } from '@/components/common/Logo.jsx'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

// Customer sign-up, and only customer sign-up. There is no role field here, and adding one
// would change nothing: AuthAPI.registerCustomer sets the role itself and ignores the rest of
// the payload, so a crafted request cannot create a staff or admin account either.
export default function Register(){
  const { register } = useAuth()
  const nav = useNavigate()
  const [f,setF]=useState({ name:'', email:'', phone:'', password:'', confirm:'' })
  const [showPassword,setShowPassword]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const set = (k)=>(e)=>setF(s=>({...s,[k]:e.target.value}))

  const submit = async (e)=>{
    e.preventDefault()
    if(busy) return
    if(!f.name.trim()){ setError('Enter your name.'); return }
    // Checked here for a fast, inline answer; checked again in the data layer, which is what
    // actually decides — this form is not the gate.
    const problem = passwordProblem(f.password)
    if(problem){ setError(problem); return }
    if(f.password !== f.confirm){ setError('Both passwords must match.'); return }

    setError(''); setBusy(true)
    try{
      await register({ name:f.name, email:f.email, phone:f.phone, password:f.password })
      toast.success('Account created')
      nav('/app', { replace:true })
    }catch(err){ setError(err.message || 'Could not create your account.') }
    finally{ setBusy(false) }
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

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Full name</span>
              <input value={f.name} onChange={set('name')} autoComplete="name" placeholder="Alex Kaur" className="input-field mt-1.5"/></label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Email</span>
              <input value={f.email} onChange={set('email')} autoComplete="email" placeholder="you@email.com" className="input-field mt-1.5"/></label>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Mobile</span>
              <input value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="07700 900123" className="input-field mt-1.5"/></label>

            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Password</span>
              <div className="relative mt-1.5">
                <input type={showPassword?'text':'password'} value={f.password} onChange={set('password')}
                  autoComplete="new-password" placeholder="Choose a password" className="input-field pr-11"/>
                <button type="button" onClick={()=>setShowPassword(s=>!s)}
                  aria-label={showPassword?'Hide password':'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite-400 hover:text-ink"
                >{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button>
              </div>
              <span className="block text-[11.5px] text-graphite-400 mt-1.5">{PASSWORD_RULES}</span>
            </label>

            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Confirm password</span>
              <input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password"
                placeholder="Type it again" className="input-field mt-1.5"/></label>

            {error && (
              <p role="alert" className="text-[12.5px] font-semibold text-brand bg-brand-50 rounded-xl px-3.5 py-2.5">{error}</p>
            )}

            <button type="submit" disabled={busy} className="btn btn-brand w-full disabled:opacity-60">
              {busy ? <><Loader2 size={15} className="animate-spin"/> Creating…</> : 'Create account'}
            </button>
          </form>

          <p className="text-center text-[13.5px] text-graphite-500 mt-5">Already registered? <Link to="/login" className="text-brand font-semibold">Sign in</Link></p>
          <p className="text-center text-[11.5px] text-graphite-400 mt-2">
            This form creates customer accounts. Staff and admin accounts are created by an admin.
          </p>
        </div>
        <p className="text-center text-[12px] text-graphite-400 mt-5"><Link to="/" className="hover:text-brand">Back to Virktech</Link></p>
      </div>
    </div>
  )
}
