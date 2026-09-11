import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { ROLE_HOME } from '@/constants/roles.js'
import { BRAND } from '@/constants/brand.js'
import { DEMO_SIGN_IN } from '@/data/credentials.js'
import { isMockBackend } from '@/lib/supabaseClient.js'
import { AuthShell } from '@/components/auth/AuthShell.jsx'
import { AuthField, authInput, authButton } from '@/components/auth/AuthField.jsx'
import { Eye, EyeOff, Loader2, AtSign, KeyRound } from 'lucide-react'

// One form for all three roles. Which area someone lands in is decided by the account they
// signed into — the form never asks, and never offers a choice, because choosing your own role
// at sign-in is exactly the hole the rest of the authorization work exists to close.
export default function Login(){
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [identifier,setIdentifier]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const submit = async (e)=>{
    e.preventDefault()
    if(busy) return
    setError(''); setBusy(true)
    try{
      const { user:u, mustChangePassword } = await login(identifier.trim(), password)
      toast.success(`Signed in as ${u.name}`)
      // A first password issued by an admin has to be replaced before anything else.
      if(mustChangePassword){ nav('/set-password', { replace:true }); return }
      nav(loc.state?.from || ROLE_HOME[u.role] || '/', { replace:true })
    }catch(err){
      setError(err.message || 'Those sign-in details are not recognised.')
      setPassword('')
    }finally{ setBusy(false) }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your repairs, devices and services."
      note={BRAND.recognition}
      footer={
        <p className="mt-6 text-center text-[13.5px] text-graphite-600">
          New customer?{' '}
          <Link to="/register" className="font-bold text-brand underline-offset-4 hover:underline">Create an account</Link>
        </p>
      }
    >
      <form onSubmit={submit} className="mt-8 space-y-5">
        <AuthField
          label="Email or username"
          icon={AtSign}
          // Customers use the email they registered with; staff use the username their admin
          // issued. An email always has an @ and a username never may, so one field can take
          // either without ambiguity.
          hint="Customers sign in with their email. Staff use the username issued by their admin."
        >
          <input
            value={identifier} onChange={e=>setIdentifier(e.target.value)}
            autoComplete="username" autoFocus
            placeholder="you@email.com"
            className={authInput()}
          />
        </AuthField>

        <AuthField
          label="Password"
          icon={KeyRound}
          trailing={
            <button
              type="button" onClick={()=>setShowPassword(s=>!s)}
              aria-label={showPassword?'Hide password':'Show password'}
              className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-lg p-2 text-graphite-400 transition-colors hover:bg-graphite-50 hover:text-ink"
            >{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button>
          }
        >
          <input
            type={showPassword?'text':'password'} value={password}
            onChange={e=>setPassword(e.target.value)} autoComplete="current-password"
            placeholder="Your password" className={authInput({ trailing:true })}
          />
        </AuthField>

        {error && (
          <p role="alert" className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-[12.5px] font-semibold text-brand-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={authButton}>
          {busy ? <><Loader2 size={16} className="animate-spin"/> Signing in…</> : 'Sign in'}
        </button>
      </form>

      <div className="mt-7 border-t border-graphite-100 pt-5">
        <p className="text-center text-[11.5px] leading-relaxed text-graphite-400">
          Staff accounts are created by an admin — ask your branch manager for your details.
        </p>

        {/* The demo runs with no server, so the seeded accounts are listed here or nobody can
            get in at all. Once a real backend is configured they are neither true nor anyone's
            business, so the block goes — enforced by the same flag that chooses the adapter
            rather than by remembering to delete it before going live. */}
        {isMockBackend && (
        <details className="group mt-4">
          <summary className="flex cursor-pointer select-none items-center justify-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[.1em] text-graphite-400 transition-colors hover:text-ink">
            Demo sign-in details
            <span className="transition-transform duration-200 group-open:rotate-90">›</span>
          </summary>
          <ul className="mt-3 space-y-1.5 rounded-xl border border-graphite-100 bg-graphite-50 p-3">
            {DEMO_SIGN_IN.map(d=>(
              <li key={d.identifier} className="flex items-center justify-between gap-3 text-[11.5px]">
                <span className="font-semibold text-graphite-600">{d.label}</span>
                <button
                  type="button"
                  onClick={()=>{ setIdentifier(d.identifier); setPassword(d.password); setError('') }}
                  className="mono-data rounded-md px-2 py-1 text-right text-graphite-600 transition-colors hover:bg-white hover:text-brand"
                >{d.identifier} / {d.password}</button>
              </li>
            ))}
          </ul>
        </details>
        )}
      </div>
    </AuthShell>
  )
}
