import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { PASSWORD_RULES, passwordProblem } from '@/lib/password.js'
import { AuthShell } from '@/components/auth/AuthShell.jsx'
import { AuthField, authInput, authButton } from '@/components/auth/AuthField.jsx'
import { Eye, EyeOff, Loader2, User, AtSign, Smartphone, KeyRound, ShieldCheck } from 'lucide-react'

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
    <AuthShell
      title="Create your Virktech account"
      subtitle="Book repairs, track your device and manage your services in one place."
      // Five fields is a tall card at 27rem. A little more width lets the two short ones sit
      // side by side, which shortens it without crowding anything.
      width="max-w-[30rem]"
      footer={
        <p className="mt-6 text-center text-[13.5px] text-graphite-600">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-brand underline-offset-4 hover:underline">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={submit} className="mt-8 space-y-5">
        <AuthField label="Full name" icon={User}>
          <input value={f.name} onChange={set('name')} autoComplete="name"
            placeholder="Alex Kaur" className={authInput()}/>
        </AuthField>

        {/* Paired on anything wider than a phone: two short fields that belong together, and one
            less full-width row in a form that would otherwise read as a long column. */}
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField label="Email" icon={AtSign}>
            <input value={f.email} onChange={set('email')} autoComplete="email"
              placeholder="you@email.com" className={authInput()}/>
          </AuthField>

          <AuthField label="Mobile" icon={Smartphone}>
            <input value={f.phone} onChange={set('phone')} autoComplete="tel"
              placeholder="07700 900123" className={authInput()}/>
          </AuthField>
        </div>

        <AuthField
          label="Password"
          icon={KeyRound}
          hint={PASSWORD_RULES}
          trailing={
            <button
              type="button" onClick={()=>setShowPassword(s=>!s)}
              aria-label={showPassword?'Hide password':'Show password'}
              className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-lg p-2 text-graphite-400 transition-colors hover:bg-graphite-50 hover:text-ink"
            >{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button>
          }
        >
          <input type={showPassword?'text':'password'} value={f.password} onChange={set('password')}
            autoComplete="new-password" placeholder="Choose a password" className={authInput({ trailing:true })}/>
        </AuthField>

        <AuthField label="Confirm password" icon={ShieldCheck}>
          <input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password"
            placeholder="Type it again" className={authInput()}/>
        </AuthField>

        {error && (
          <p role="alert" className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-[12.5px] font-semibold text-brand-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={authButton}>
          {busy ? <><Loader2 size={16} className="animate-spin"/> Creating…</> : 'Create account'}
        </button>
      </form>

      <p className="mt-7 border-t border-graphite-100 pt-5 text-center text-[11.5px] leading-relaxed text-graphite-400">
        This form creates customer accounts. Staff and admin accounts are created by an admin.
      </p>
    </AuthShell>
  )
}
