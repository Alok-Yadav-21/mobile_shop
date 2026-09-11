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
//
// The card is raised by light and shadow rather than by any transform: a tight contact shadow
// under the edge, a wide soft one for the distance it stands off the page, and a hairline along
// the top where a lifted surface catches. Nothing moves and nothing is scaled, so the type is
// rendered straight to the page at its real size and stays sharp.
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
    <div className="relative min-h-screen grid place-items-center overflow-hidden bg-graphite-50 p-5">
      {/* A floor for the card to stand on. It is what gives the shadow something to fall across —
          a shadow on flat colour is a smudge; a shadow on a surface is height. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{ background:'radial-gradient(120% 80% at 50% 0%, rgba(79,70,229,.10) 0%, transparent 60%)' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-[46vh] [perspective:640px]">
          <div
            className="absolute inset-0 origin-bottom [transform:rotateX(74deg)] opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(rgba(79,70,229,.14) 1px, transparent 1px),'
                + 'linear-gradient(90deg, rgba(79,70,229,.14) 1px, transparent 1px)',
              backgroundSize:'46px 46px',
              maskImage:'linear-gradient(to top, #000 8%, transparent 76%)',
              WebkitMaskImage:'linear-gradient(to top, #000 8%, transparent 76%)',
            }}
          />
        </div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Cast on the floor, outside the card, so it reads as something the card throws rather
            than a border it wears. */}
        <div
          className="pointer-events-none absolute inset-x-10 -bottom-5 h-10 rounded-[50%] bg-ink/20 blur-2xl"
          aria-hidden="true"
        />

        <div className="flex justify-center mb-6"><Logo/></div>

        {/* Two shadows doing different jobs: a tight one just under the edge for contact, and a
            wide soft one for the distance it stands off the page. The inset line is the light
            along the top of a raised surface. */}
        <div className="relative surface p-8 shadow-[0_2px_6px_-1px_rgba(24,24,37,.12),0_36px_60px_-24px_rgba(24,24,37,.35),inset_0_1px_0_0_rgba(255,255,255,.9)]">
          <div
            className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent"
            aria-hidden="true"
          />

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

            <button type="submit" disabled={busy}
              className="btn btn-brand w-full disabled:opacity-60 shadow-[0_12px_22px_-12px_rgba(79,70,229,.95)]">
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
