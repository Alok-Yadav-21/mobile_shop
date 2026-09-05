import { useState } from 'react'
import { toast } from 'sonner'
import { useAsync } from '@/hooks/useAsync.js'
import { AuthAPI } from '@/services/api.js'
import { logAction } from '@/services/auditService.js'
import { suggestPassword, PASSWORD_RULES } from '@/lib/password.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { fmtDateTime } from '@/utils/format.js'
import { Copy, RefreshCw, Loader2 } from 'lucide-react'

// How an admin issues and manages somebody's sign-in. Three separate things, deliberately not
// combined into one save button, because they carry different weight: renaming a username is
// routine, replacing a password locks the holder out until they are told the new one, and
// unlocking a password change is a permission grant.
//
// Nothing here can read an existing password. AuthAPI has no method that returns one and the
// store keeps only a PBKDF2 hash, so a lost password is replaced, never recovered.
export function SignInDetailsDialog({ target, me, onClose }){
  const { data:details, refetch, loading } = useAsync(()=>AuthAPI.signInDetails(target.id), [target.id])

  const [username,setUsername]=useState('')
  const [password,setPassword]=useState('')
  const [mustChange,setMustChange]=useState(true)
  const [busy,setBusy]=useState(null) // 'username' | 'password' | 'permission'

  const isStaff = target.role === 'staff'
  const currentUsername = details?.username ?? ''

  const saveUsername = async ()=>{
    setBusy('username')
    try{
      await AuthAPI.issueCredentials(target.id, { username: username.trim() })
      logAction({ user:me, action:'auth.username_set', entityType:'user', entityId:target.id, after:{ username:username.trim() } })
      toast.success('Username updated')
      setUsername(''); refetch()
    }catch(e){ toast.error(e.message || 'Could not update the username') }
    finally{ setBusy(null) }
  }

  const savePassword = async ()=>{
    setBusy('password')
    try{
      await AuthAPI.issueCredentials(target.id, { password, mustChange })
      // The password itself is never written to the audit log — only that one was issued.
      logAction({ user:me, action:'auth.password_issued', entityType:'user', entityId:target.id, after:{ mustChange } })
      toast.success(`New password issued for ${target.name}`)
      setPassword(''); refetch()
    }catch(e){ toast.error(e.message || 'Could not issue that password') }
    finally{ setBusy(null) }
  }

  const togglePermission = async (allowed)=>{
    setBusy('permission')
    try{
      await AuthAPI.setPasswordChangePermission(target.id, allowed)
      logAction({ user:me, action: allowed?'auth.password_change_unlocked':'auth.password_change_locked', entityType:'user', entityId:target.id })
      toast.success(allowed ? `${target.name} can now set their own password` : 'Password changes locked again')
      refetch()
    }catch(e){ toast.error(e.message || 'Could not change that permission') }
    finally{ setBusy(null) }
  }

  const copyPassword = async ()=>{
    try{ await navigator.clipboard.writeText(password); toast.success('Copied — hand it over, then it is gone from here') }
    catch{ toast.error('Could not copy. Read it out instead.') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Sign-in details — {target.name}</DialogTitle></DialogHeader>

        <div className="space-y-5">
          <div className="bg-graphite-50 rounded-xl px-4 py-3 text-[12.5px] space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-graphite-500">Signs in with</span>
              <span className="mono-data text-right">{loading ? '…' : (currentUsername || target.email)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-graphite-500">Password</span>
              <span className="text-right">{details?.hasPassword
                ? `Set ${details.updatedAt ? fmtDateTime(details.updatedAt) : ''}`
                : 'Not set — this account cannot sign in yet'}</span>
            </div>
          </div>

          {/* Username. Staff get one because a technician on the shop floor should not need a
              personal email address to clock in; customers sign in with their own email. */}
          <div>
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">
              {currentUsername ? 'Change username' : 'Give this account a username'}
            </span>
              <input value={username} onChange={e=>setUsername(e.target.value)}
                placeholder={currentUsername || 'e.g. priya.shah'} className="input-field mt-1.5"/></label>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={saveUsername} disabled={!username.trim() || busy} className="btn btn-ghost btn-sm disabled:opacity-50">
                {busy==='username' ? <Loader2 size={14} className="animate-spin"/> : null} Save username
              </button>
              <span className="text-[11.5px] text-graphite-400">Letters, numbers, dots and dashes. No @.</span>
            </div>
          </div>

          {/* Password. Issuing one is how a new staff member gets in, and how somebody who has
              forgotten theirs gets back in — there is no recovery path, by design. */}
          <div className="border-t border-graphite-100 pt-4">
            <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Issue a new password</span>
              <div className="flex gap-2 mt-1.5">
                <input value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="Type one, or generate" className="input-field flex-1"/>
                <button onClick={()=>setPassword(suggestPassword())} title="Generate one"
                  className="btn btn-ghost btn-sm flex-none"><RefreshCw size={14}/></button>
                <button onClick={copyPassword} disabled={!password} title="Copy"
                  className="btn btn-ghost btn-sm flex-none disabled:opacity-40"><Copy size={14}/></button>
              </div>
              <span className="block text-[11.5px] text-graphite-400 mt-1.5">{PASSWORD_RULES}</span>
            </label>

            <label className="flex items-start gap-2.5 mt-3 cursor-pointer">
              <input type="checkbox" checked={mustChange} onChange={e=>setMustChange(e.target.checked)} className="mt-0.5"/>
              <span className="text-[12px] text-graphite-500">
                Make them set their own password when they next sign in.
                {' '}<span className="text-graphite-400">Recommended — until they do, you know their password too.</span>
              </span>
            </label>

            <button onClick={savePassword} disabled={!password || busy} className="btn btn-brand btn-sm mt-3 disabled:opacity-50">
              {busy==='password' ? <Loader2 size={14} className="animate-spin"/> : null} Issue password
            </button>
            <p className="text-[11.5px] text-graphite-400 mt-2">
              Write it down or read it out now — it is stored hashed and cannot be shown again.
            </p>
          </div>

          {/* The permission the staff rule turns on. Only meaningful for staff: customers and
              admins own their password already, so there is nothing to unlock. */}
          {isStaff && (
            <div className="border-t border-graphite-100 pt-4">
              <div className="text-[12.5px] font-semibold text-graphite-600">Password changes</div>
              <p className="text-[12px] text-graphite-400 mt-1">
                Staff cannot change their own password unless you allow it. The permission is
                used up as soon as they change it.
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button onClick={()=>togglePermission(!details?.changeAllowed)} disabled={busy}
                  className={`btn btn-sm ${details?.changeAllowed ? 'btn-ghost' : 'btn-brand'} disabled:opacity-50`}>
                  {busy==='permission' ? <Loader2 size={14} className="animate-spin"/> : null}
                  {details?.changeAllowed ? 'Lock password changes' : 'Allow them to set a new password'}
                </button>
                <span className="text-[11.5px] text-graphite-400">
                  {details?.mustChange
                    ? 'Currently required at next sign-in'
                    : details?.changeAllowed ? 'Currently unlocked' : 'Currently locked'}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter><button onClick={onClose} className="btn btn-ghost btn-sm">Done</button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
