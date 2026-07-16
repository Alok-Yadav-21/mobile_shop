import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { Switch } from '@/components/ui/switch.jsx'
import { BRAND } from '@/constants/brand.js'
import { isMockBackend, SettingsAPI } from '@/services/api.js'
import { can } from '@/lib/permissions.js'
import { logAction } from '@/services/auditService.js'
import { Database, CreditCard, ShieldCheck, CircleCheck, CircleAlert } from 'lucide-react'

const STRIPE_CONFIGURED = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const DEFAULT_NOTIFY = { email:true, sms:true, staffAlerts:false }

export default function Settings(){
  const { user:me } = useAuth()
  const [notify,setNotify]=useState(DEFAULT_NOTIFY)
  const [mockPayments,setMockPayments]=useState(true)
  const [loaded,setLoaded]=useState(false)
  const canManage = can(me?.role,'manageSettings')

  useEffect(()=>{
    Promise.all([
      SettingsAPI.get('notifications', DEFAULT_NOTIFY),
      SettingsAPI.get('mockPayments', true),
    ]).then(([n,mp])=>{ setNotify(n); setMockPayments(mp); setLoaded(true) })
  },[])

  const toggle=(k)=>setNotify(n=>({...n,[k]:!n[k]}))

  const save = async ()=>{
    await SettingsAPI.set('notifications', notify)
    await SettingsAPI.set('mockPayments', mockPayments)
    logAction({ user:me, action:'settings.update', entityType:'settings', entityId:'platform', after:{notify,mockPayments} })
    toast.success('Settings saved')
  }

  if(!canManage) return <div className="surface p-8 text-center text-graphite-400">You don't have permission to manage settings.</div>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Website settings</h1>
      <p className="text-graphite-400 text-[14px] mb-6">Business details, integrations and notification preferences.</p>

      <div className="surface p-6">
        <h2 className="font-bold text-[15px] mb-4">Business details</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-[13.5px]">
          <div><div className="text-graphite-400 text-[11.5px] uppercase tracking-wide font-bold mb-1">Brand</div>{BRAND.lockup}</div>
          <div><div className="text-graphite-400 text-[11.5px] uppercase tracking-wide font-bold mb-1">Phone</div>{BRAND.phone}</div>
          <div><div className="text-graphite-400 text-[11.5px] uppercase tracking-wide font-bold mb-1">Email</div>{BRAND.email}</div>
          <div><div className="text-graphite-400 text-[11.5px] uppercase tracking-wide font-bold mb-1">Branches</div>8 · London & Kent</div>
        </div>
        <p className="text-[11px] text-graphite-400 mt-4 mono-data">Sourced from src/constants/brand.js — edit there to change site-wide.</p>
      </div>

      <div className="surface p-6 mt-4">
        <h2 className="font-bold text-[15px] mb-4">Integration status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 text-[13.5px]"><Database size={16} className="text-brand"/> Backend data</span>
            <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${isMockBackend?'text-amber-600':'text-emerald-600'}`}>
              {isMockBackend?<CircleAlert size={14}/>:<CircleCheck size={14}/>} {isMockBackend?'Mock mode (local data)':'Connected to Supabase'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 text-[13.5px]"><CreditCard size={16} className="text-brand"/> Payments</span>
            <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${STRIPE_CONFIGURED?'text-emerald-600':'text-amber-600'}`}>
              {STRIPE_CONFIGURED?<CircleCheck size={14}/>:<CircleAlert size={14}/>} {STRIPE_CONFIGURED?'Live key configured':'Test / mock mode'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 text-[13.5px]"><ShieldCheck size={16} className="text-brand"/> Auth & roles</span>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600"><CircleCheck size={14}/> Active — 3 roles</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-graphite-100">
            <div><div className="text-[13.5px] font-semibold">Force mock payments</div><div className="text-[12px] text-graphite-400">Keep checkout in test mode even if a live Stripe key is later added</div></div>
            <Switch checked={mockPayments} onCheckedChange={()=>setMockPayments(v=>!v)} disabled={!STRIPE_CONFIGURED}/>
          </div>
        </div>
        <p className="text-[11px] text-graphite-400 mt-4 mono-data">Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY and VITE_STRIPE_PUBLISHABLE_KEY in .env to go live — see .env.example.</p>
      </div>

      <div className="surface p-6 mt-4">
        <h2 className="font-bold text-[15px] mb-4">Notifications</h2>
        <div className="space-y-4">
          {[['email','Email updates','Repair status & order confirmations'],['sms','SMS updates','Text alerts for major status changes'],['staffAlerts','Staff alerts','Notify staff of new bookings & requests']].map(([k,t,d])=>(
            <div key={k} className="flex items-center justify-between">
              <div><div className="font-semibold text-[13.5px]">{t}</div><div className="text-[12px] text-graphite-400">{d}</div></div>
              <Switch checked={notify[k]} onCheckedChange={()=>toggle(k)}/>
            </div>
          ))}
        </div>
        <button onClick={save} disabled={!loaded} className="btn btn-brand mt-6 disabled:opacity-50">Save settings</button>
      </div>
    </div>
  )
}
