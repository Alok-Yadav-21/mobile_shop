import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { AuthAPI } from '@/services/api.js'
import { canChangeOwnPassword } from '@/lib/permissions.js'
import { PASSWORD_RULES } from '@/lib/password.js'
import { logAction } from '@/services/auditService.js'
import { Eye, EyeOff, KeyRound, Lock, Loader2 } from 'lucide-react'

// Your own sign-in details, on whichever screen you look at them from — the customer profile,
// the staff area, admin settings. One component so the rule is stated once.
//
// Whether the form is offered at all comes from canChangeOwnPassword(): customers and admins
// own their password outright, a staff member only when an admin has unlocked it. Hiding the
// form is a courtesy — AuthAPI.changeOwnPassword applies the identical check and refuses a
// request that gets past the UI.
export function SignInDetailsCard({ forced = false, onChanged }){
  const { user, clearMustChangePassword } = useAuth()
  const { data:credential, refetch } = useAsync(()=>user?.id ? AuthAPI.signInDetails(user.id) : Promise.resolve(null), [user?.id])

  const [current,setCurrent]=useState('')
  const [next,setNext]=useState('')
  const [confirm,setConfirm]=useState('')
  const [show,setShow]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const allowed = canChangeOwnPassword(user, credential)

  const submit = async (e)=>{
    e.preventDefault()
    if(busy) return
    if(next !== confirm){ setError('Both new passwords must match.'); return }
    setError(''); setBusy(true)
    try{
      await AuthAPI.changeOwnPassword({ currentPassword: current, newPassword: next })
      // Records that a change happened, never what it was.
      logAction({ user, action:'auth.password_changed', entityType:'user', entityId:user.id })
      setCurrent(''); setNext(''); setConfirm('')
      clearMustChangePassword?.()
      toast.success('Password updated')
      refetch()
      onChanged?.()
    }catch(err){ setError(err.message || 'Could not change your password.') }
    finally{ setBusy(false) }
  }

  return (
    <div className="surface p-6">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand grid place-items-center flex-none"><KeyRound size={19}/></div>
        <div className="min-w-0">
          <div className="font-bold text-[14px]">Sign-in details</div>
          <div className="text-[12.5px] text-graphite-400 truncate">
            {credential?.username
              ? <>Username <span className="mono-data text-graphite-600">{credential.username}</span></>
              : user?.email}
          </div>
        </div>
      </div>

      {forced && (
        <p className="mt-4 text-[12.5px] font-semibold text-brand bg-brand-50 rounded-xl px-3.5 py-2.5">
          Your admin issued this password. Set one only you know before you carry on.
        </p>
      )}

      {!allowed ? (
        // Staff, with no grant on file. Naming who can unlock it matters more than the refusal:
        // otherwise the only way to find out is to ask around.
        <div className="mt-4 flex items-start gap-3 bg-graphite-50 rounded-xl px-4 py-3.5">
          <Lock size={16} className="text-graphite-400 flex-none mt-0.5"/>
          <p className="text-[12.5px] text-graphite-500">
            Your password was issued by an admin and can only be changed with their permission.
            Ask your branch manager to unlock it, then this form will appear here.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3.5">
          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Current password</span>
            <input type="password" value={current} onChange={e=>setCurrent(e.target.value)}
              autoComplete="current-password" className="input-field mt-1.5"/></label>

          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">New password</span>
            <div className="relative mt-1.5">
              <input type={show?'text':'password'} value={next} onChange={e=>setNext(e.target.value)}
                autoComplete="new-password" className="input-field pr-11"/>
              <button type="button" onClick={()=>setShow(s=>!s)}
                aria-label={show?'Hide password':'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite-400 hover:text-ink"
              >{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
            <span className="block text-[11.5px] text-graphite-400 mt-1.5">{PASSWORD_RULES}</span>
          </label>

          <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Confirm new password</span>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
              autoComplete="new-password" className="input-field mt-1.5"/></label>

          {error && (
            <p role="alert" className="text-[12.5px] font-semibold text-brand bg-brand-50 rounded-xl px-3.5 py-2.5">{error}</p>
          )}

          <button type="submit" disabled={busy} className="btn btn-brand disabled:opacity-60">
            {busy ? <><Loader2 size={15} className="animate-spin"/> Saving…</> : 'Change password'}
          </button>

          {user?.role==='staff' && (
            <p className="text-[11.5px] text-graphite-400">
              Your admin unlocked this once. After you save, changing it again needs their permission afresh.
            </p>
          )}
        </form>
      )}
    </div>
  )
}
