import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { NotificationAPI, UserAPI } from '@/services/api.js'
import { logAction } from '@/services/auditService.js'
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx'
import { SignInDetailsCard } from '@/components/common/SignInDetailsCard.jsx'
import { fmtDateTime } from '@/utils/format.js'
import { Bell, ShieldCheck, UserX } from 'lucide-react'

export default function Profile(){
  const { user, updateProfile, logout } = useAuth()
  const nav = useNavigate()
  const [f,setF]=useState({ name:user?.name||'', email:user?.email||'', phone:user?.phone||'' })
  const [saving,setSaving]=useState(false)
  const [deactivating,setDeactivating]=useState(false)
  const { data:notifications=[], refetch } = useAsync(()=>NotificationAPI.list(user?.id),[user])

  const save = async ()=>{
    setSaving(true)
    await new Promise(r=>setTimeout(r,300))
    updateProfile(f)
    setSaving(false)
    toast.success('Profile updated')
  }

  const markRead = async (id)=>{ await NotificationAPI.markRead(id); refetch() }

  const deactivateAccount = async ()=>{
    if(user?.id){
      await UserAPI.setStatus(user.id,'inactive')
      logAction({ user, action:'user.self_deactivate', entityType:'user', entityId:user.id })
    }
    toast.success('Your account has been deactivated.')
    logout(); nav('/')
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold tracking-tight mb-5">Profile</h1>

      <div className="surface p-6 space-y-4">
        <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Name</span>
          <input value={f.name} onChange={e=>setF(s=>({...s,name:e.target.value}))} className="input-field mt-1.5"/></label>
        <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Email</span>
          <input value={f.email} onChange={e=>setF(s=>({...s,email:e.target.value}))} className="input-field mt-1.5"/></label>
        <label className="block"><span className="text-[12.5px] font-semibold text-graphite-600">Mobile</span>
          <input value={f.phone} onChange={e=>setF(s=>({...s,phone:e.target.value}))} className="input-field mt-1.5"/></label>
        <button onClick={save} disabled={saving} className="btn btn-brand disabled:opacity-60">{saving?'Saving…':'Save changes'}</button>
      </div>

      <div className="mt-4"><SignInDetailsCard/></div>

      <div className="surface p-6 mt-4 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand grid place-items-center flex-none"><ShieldCheck size={19}/></div>
        <div><div className="font-bold text-[14px]">Account role</div><div className="text-[12.5px] text-graphite-400 capitalize">{user?.role} account</div></div>
      </div>

      <div className="surface p-6 mt-4">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet grid place-items-center flex-none"><Bell size={19}/></div>
          <div><div className="font-bold text-[14px]">Notifications</div><div className="text-[12.5px] text-graphite-400">Repair, order and trade-in updates</div></div>
        </div>
        {notifications.length===0 ? (
          <p className="text-[12.5px] text-graphite-400">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map(n=>(
              <button key={n.id} onClick={()=>!n.read&&markRead(n.id)} className={`w-full text-left rounded-lg p-2.5 text-[12.5px] ${n.read?'bg-graphite-50 text-graphite-500':'bg-brand-50 text-ink font-medium'}`}>
                <div>{n.title}</div>
                <div className="text-[11px] text-graphite-400 mt-0.5">{fmtDateTime(n.createdAt||n.created_at)}{!n.read && ' · tap to mark read'}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="surface p-6 mt-4">
        <button onClick={()=>setDeactivating(true)} className="flex items-center gap-2 text-[13px] font-semibold text-rose-600 hover:underline"><UserX size={15}/> Deactivate my account</button>
        <p className="text-[11.5px] text-graphite-400 mt-1.5">You'll be signed out immediately. Contact support to reactivate.</p>
      </div>

      {deactivating && (
        <ConfirmDialog open={deactivating} onOpenChange={setDeactivating}
          title="Deactivate your account?" description="You will be signed out and unable to sign back in until it's reactivated. Your repair, order and trade-in history is kept."
          confirmLabel="Deactivate account" onConfirm={deactivateAccount}/>
      )}
    </div>
  )
}
