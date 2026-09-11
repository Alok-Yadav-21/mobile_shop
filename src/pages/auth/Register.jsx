import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { PASSWORD_RULES, passwordProblem } from '@/lib/password.js'
import { Logo } from '@/components/common/Logo.jsx'
import { Card3D } from '@/components/ui-fx/Card3D.jsx'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

// Customer sign-up, and only customer sign-up. There is no role field here, and adding one
// would change nothing: AuthAPI.registerCustomer sets the role itself and ignores the rest of
// the payload, so a crafted request cannot create a staff or admin account either.
//
// The card sits on a perspective stage and tilts toward the cursor, with its contents held at
// different depths so they part as it turns — a card that only rotates reads as a photograph of
// a card, and the parallax between the layers is what makes it read as an object.
//
// It stops tilting the moment somebody focuses a field. A form that rotates while you are typing
// into it is a toy, and the effect has already made its point by the time anyone clicks a field.
export default function Register(){
  const { register } = useAuth()
  const nav = useNavigate()
  const [f,setF]=useState({ name:'', email:'', phone:'', password:'', confirm:'' })
  const [showPassword,setShowPassword]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  // Presentational only: whether somebody is filling the form in, so the tilt can hold still.
  const [filling,setFilling]=useState(false)
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
      {/* The stage. A floor receding to a horizon gives the eye something to measure the card
          against — without it a tilting rectangle is just a rectangle that moves. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{ background:'radial-gradient(120% 80% at 50% 0%, rgba(79,70,229,.10) 0%, transparent 60%)' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-[48vh] [perspective:640px]">
          <div
            className="absolute inset-0 origin-bottom [transform:rotateX(74deg)] opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(rgba(79,70,229,.16) 1px, transparent 1px),'
                + 'linear-gradient(90deg, rgba(79,70,229,.16) 1px, transparent 1px)',
              backgroundSize:'46px 46px',
              maskImage:'linear-gradient(to top, #000 10%, transparent 78%)',
              WebkitMaskImage:'linear-gradient(to top, #000 10%, transparent 78%)',
            }}
          />
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Card3D intensity={0.85} frozen={filling} containerClassName="[perspective:1400px]">
          {/* preserve-3d on every level between the tilting element and anything given a Z
              offset, or the children flatten back onto the card face. */}
          <div className="relative [transform-style:preserve-3d]">
            {/* Contact shadow, pushed behind the card and kept soft. This is the part that sells
                the height: the card lifts away from its own shadow as it turns. */}
            <div
              className="pointer-events-none absolute inset-x-8 -bottom-6 h-12 rounded-[50%] bg-ink/25 blur-2xl"
              style={{ transform:'translateZ(-70px)' }}
              aria-hidden="true"
            />

            <div className="flex justify-center mb-6" style={{ transform:'translateZ(60px)' }}><Logo/></div>

            <div className="surface p-8 shadow-[0_30px_60px_-20px_rgba(24,24,37,.28)] [transform-style:preserve-3d]">
              {/* A hairline of light along the top edge, as a raised surface catches. */}
              <div
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
                aria-hidden="true"
              />

              <div className="text-center" style={{ transform:'translateZ(38px)' }}>
                <h1 className="text-xl font-extrabold tracking-tight">Create your Virktech account</h1>
                <p className="text-[13px] text-graphite-400 mt-1">Book repairs, track status and manage orders.</p>
              </div>

              <form
                onSubmit={submit}
                // Standard focus-within pattern: relatedTarget keeps the card still while the
                // focus moves between fields, instead of flicking level on every tab.
                onFocusCapture={()=>setFilling(true)}
                onBlurCapture={(e)=>{ if(!e.currentTarget.contains(e.relatedTarget)) setFilling(false) }}
                className="mt-6 space-y-3.5"
                style={{ transform:'translateZ(22px)' }}
              >
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
                  className="btn btn-brand w-full disabled:opacity-60 shadow-[0_10px_24px_-10px_rgba(79,70,229,.9)]"
                  style={{ transform:'translateZ(14px)' }}>
                  {busy ? <><Loader2 size={15} className="animate-spin"/> Creating…</> : 'Create account'}
                </button>
              </form>

              <div style={{ transform:'translateZ(16px)' }}>
                <p className="text-center text-[13.5px] text-graphite-500 mt-5">Already registered? <Link to="/login" className="text-brand font-semibold">Sign in</Link></p>
                <p className="text-center text-[11.5px] text-graphite-400 mt-2">
                  This form creates customer accounts. Staff and admin accounts are created by an admin.
                </p>
              </div>
            </div>

            <p className="text-center text-[12px] text-graphite-400 mt-5" style={{ transform:'translateZ(30px)' }}>
              <Link to="/" className="hover:text-brand">Back to Virktech</Link>
            </p>
          </div>
        </Card3D>
      </div>
    </div>
  )
}
