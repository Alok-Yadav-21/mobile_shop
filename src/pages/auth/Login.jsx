import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { ROLE_HOME } from '@/constants/roles.js'
import { BRAND } from '@/constants/brand.js'
import { DEMO_SIGN_IN } from '@/data/credentials.js'
import { Logo } from '@/components/common/Logo.jsx'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

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
    <div className="min-h-screen grid place-items-center bg-graphite-50 p-5">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo/></div>
        <div className="surface p-8">
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight">Sign in to Virktech</h1>
            <p className="text-[12px] text-graphite-400 mt-1">{BRAND.recognition}</p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            <label className="block">
              <span className="text-[12.5px] font-semibold text-graphite-600">Email or username</span>
              <input
                value={identifier} onChange={e=>setIdentifier(e.target.value)}
                autoComplete="username" autoFocus
                placeholder="you@email.com"
                className="input-field mt-1.5"
              />
              {/* Customers use the email they registered with; staff use the username their
                  admin issued. An email always has an @ and a username never may, so one
                  field can take either without ambiguity. */}
              <span className="block text-[11.5px] text-graphite-400 mt-1.5">
                Customers sign in with their email. Staff use the username issued by their admin.
              </span>
            </label>

            <label className="block">
              <span className="text-[12.5px] font-semibold text-graphite-600">Password</span>
              <div className="relative mt-1.5">
                <input
                  type={showPassword?'text':'password'} value={password}
                  onChange={e=>setPassword(e.target.value)} autoComplete="current-password"
                  placeholder="Your password" className="input-field pr-11"
                />
                <button
                  type="button" onClick={()=>setShowPassword(s=>!s)}
                  aria-label={showPassword?'Hide password':'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite-400 hover:text-ink"
                >{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button>
              </div>
            </label>

            {error && (
              <p role="alert" className="text-[12.5px] font-semibold text-brand bg-brand-50 rounded-xl px-3.5 py-2.5">{error}</p>
            )}

            <button type="submit" disabled={busy} className="btn btn-brand w-full disabled:opacity-60">
              {busy ? <><Loader2 size={15} className="animate-spin"/> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-[13.5px] text-graphite-500 mt-6">
            New customer? <Link to="/register" className="text-brand font-semibold">Create an account</Link>
          </p>
          <p className="text-center text-[11.5px] text-graphite-400 mt-2">
            Staff accounts are created by an admin — ask your branch manager for your details.
          </p>

          {/* This demo runs with no server, so the seeded accounts are listed here or nobody
              can get in at all. A real deployment does not ship this block. */}
          <details className="mt-6 border-t border-graphite-100 pt-4">
            <summary className="text-[12px] text-graphite-400 cursor-pointer select-none">Demo sign-in details</summary>
            <ul className="mt-2.5 space-y-1.5">
              {DEMO_SIGN_IN.map(d=>(
                <li key={d.identifier} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-graphite-500">{d.label}</span>
                  <button
                    type="button"
                    onClick={()=>{ setIdentifier(d.identifier); setPassword(d.password); setError('') }}
                    className="mono-data text-graphite-600 hover:text-brand text-right"
                  >{d.identifier} / {d.password}</button>
                </li>
              ))}
            </ul>
          </details>
        </div>
        <p className="text-center text-[12px] text-graphite-400 mt-5"><Link to="/" className="hover:text-brand">Back to Virktech</Link></p>
      </div>
    </div>
  )
}
