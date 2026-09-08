import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { LoyaltyAPI } from '@/services/api.js'
import { logAction } from '@/services/auditService.js'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { BRANCHES } from '@/data/branches.js'
import { describeMovement, LOYALTY_KIND_LABELS, creditValue } from '@/lib/loyalty.js'
import { money, fmtDateTime } from '@/utils/format.js'
import { Star, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

const KIND_STYLES = {
  earned: 'bg-emerald-50 text-emerald-600',
  redeemed: 'bg-brand-50 text-brand',
  reversed: 'bg-amber-50 text-amber-600',
  adjusted: 'bg-violet-50 text-violet-600',
}

const branchName = (id)=> id==='web' ? 'Web / unassigned'
  : (BRANCHES.find(b=>b.id===id)?.area?.split('—')[0]?.trim() ?? id)

// The scheme across all eight branches: what it is earning, what it is costing, and what the
// business currently owes.
//
// Outstanding points are a liability — money customers are entitled to take off future bills —
// so it is shown in pounds rather than only as a point count. A points balance is easy to look
// at without registering that it is a debt.
export default function AdminLoyalty(){
  const { user } = useAuth()
  const { data:report, loading, refetch } = useAsync(()=>LoyaltyAPI.report(),[])
  const [adjusting,setAdjusting]=useState(null)   // the customer row being adjusted
  const [delta,setDelta]=useState('')
  const [reason,setReason]=useState('')
  const [saving,setSaving]=useState(false)
  const [tab,setTab]=useState('customers')

  if(loading) return <div className="text-graphite-400">Loading…</div>

  const submitAdjustment = async ()=>{
    setSaving(true)
    try{
      const amount = Number(delta)
      await LoyaltyAPI.adjust(adjusting.customerId, amount, reason)
      logAction({ user, action:'loyalty.adjusted', entityType:'customer', entityId:adjusting.customerId,
        after:{ points:amount }, reason })
      toast.success(`${amount>0?'Added':'Removed'} ${Math.abs(amount)} points for ${adjusting.name}`)
      setAdjusting(null); setDelta(''); setReason(''); refetch()
    } catch(e){ toast.error(e.message || 'Could not adjust that balance') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Loyalty points</h1>
      <p className="text-graphite-400 text-[14px] mb-6">
        One balance per customer, earned and spent across all 8 branches.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DashboardCard icon={TrendingUp} label="Points earned" value={report?.earned ?? 0} tone="green" index={0}/>
        <DashboardCard icon={TrendingDown} label="Points redeemed" value={report?.redeemed ?? 0} tone="violet" index={1}/>
        <DashboardCard icon={Star} label="Outstanding" value={report?.outstanding ?? 0} tone="amber" index={2}/>
        <DashboardCard icon={Wallet} label="Owed to customers" value={money(report?.liability ?? 0)} tone="brand" index={3}
          hint="What outstanding points are worth"/>
      </div>

      <div className="flex gap-2 mb-4">
        {[['customers','By customer'],['branches','By branch'],['movements','All movements']].map(([k,label])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${tab===k?'bg-brand text-white':'bg-graphite-100 text-graphite-600 hover:bg-graphite-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab==='customers' && (
        <div className="surface overflow-x-auto">
          <Table>
            <thead><tr><Th>Customer</Th><Th>Balance</Th><Th>Worth</Th><Th>Earned</Th><Th>Redeemed</Th><Th></Th></tr></thead>
            <tbody>{(report?.customers ?? []).map(c=>(
              <tr key={c.customerId} className="hover:bg-graphite-50">
                <Td className="font-semibold">{c.name}</Td>
                <Td className="mono-data font-bold">{c.points}</Td>
                <Td className="mono-data">{money(c.credit)}</Td>
                <Td className="mono-data text-graphite-400">{c.earned}</Td>
                <Td className="mono-data text-graphite-400">{c.redeemed}</Td>
                <Td>
                  <button onClick={()=>{ setAdjusting(c); setDelta(''); setReason('') }}
                    className="text-[12px] font-semibold text-brand hover:underline">Adjust</button>
                </Td>
              </tr>
            ))}
            {(report?.customers ?? []).length===0 && (
              <tr><Td colSpan={6} className="p-0"><EmptyState title="No points yet" hint="Balances appear here as customers complete repairs and orders."/></Td></tr>
            )}</tbody>
          </Table>
        </div>
      )}

      {tab==='branches' && (
        <div className="surface overflow-x-auto">
          <Table>
            <thead><tr><Th>Branch</Th><Th>Points earned there</Th><Th>Points redeemed there</Th></tr></thead>
            <tbody>{(report?.branches ?? []).map(b=>(
              <tr key={b.branch} className="hover:bg-graphite-50">
                <Td className="font-semibold">{branchName(b.branch)}</Td>
                <Td className="mono-data">{b.earned}</Td>
                <Td className="mono-data">{b.redeemed}</Td>
              </tr>
            ))}
            {(report?.branches ?? []).length===0 && (
              <tr><Td colSpan={3} className="p-0"><EmptyState title="Nothing recorded yet" hint="Where points are earned and spent shows here."/></Td></tr>
            )}</tbody>
          </Table>
          {/* Said outright, because the two columns invite the opposite reading. */}
          <p className="text-[12px] text-graphite-400 px-5 py-3.5 border-t border-graphite-100">
            Where points were earned and spent, not who they belong to — a customer has one balance
            and can use it at any branch.
          </p>
        </div>
      )}

      {tab==='movements' && (
        <div className="surface overflow-x-auto">
          <Table>
            <thead><tr><Th>What happened</Th><Th>Type</Th><Th>Points</Th><Th>Branch</Th><Th>When</Th></tr></thead>
            <tbody>{(report?.entries ?? []).slice(0,200).map(e=>(
              <tr key={e.id} className="hover:bg-graphite-50">
                <Td>{describeMovement(e)}{e.note && e.kind==='adjusted' ? <span className="block text-[11.5px] text-graphite-400">{e.note}</span> : null}</Td>
                <Td><span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${KIND_STYLES[e.kind] ?? 'bg-slate-100 text-slate-600'}`}>{LOYALTY_KIND_LABELS[e.kind] ?? e.kind}</span></Td>
                <Td className={`mono-data font-bold ${e.delta>0?'text-emerald-600':'text-graphite-600'}`}>{e.delta>0?'+':''}{e.delta}</Td>
                {/* An adjustment happened at no branch — it is an admin decision — so the
                    column says so rather than filing it under the web shop. */}
                <Td className="text-graphite-400">{e.sourceType==='adjustment' ? '—' : branchName(e.branch ?? 'web')}</Td>
                <Td className="text-graphite-400">{fmtDateTime(e.at)}</Td>
              </tr>
            ))}
            {(report?.entries ?? []).length===0 && (
              <tr><Td colSpan={5} className="p-0"><EmptyState title="No movements yet" hint="Every points change is recorded here."/></Td></tr>
            )}</tbody>
          </Table>
        </div>
      )}

      {adjusting && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={()=>!saving&&setAdjusting(null)}>
          <div className="surface p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <h2 className="font-bold text-[16px]">Adjust {adjusting.name}&rsquo;s points</h2>
            <p className="text-[12.5px] text-graphite-400 mt-1">
              Currently {adjusting.points} points ({money(adjusting.credit)}). Use a negative number to remove points.
            </p>
            <label className="block mt-4"><span className="text-[12.5px] font-semibold text-graphite-600">Points</span>
              <input type="number" value={delta} onChange={e=>setDelta(e.target.value)} placeholder="e.g. 50 or -20" className="input-field mt-1.5"/>
              {delta !== '' && Number(delta) > 0 && (
                <span className="text-[11.5px] text-graphite-400 mt-1 block">Worth {money(creditValue(Number(delta)))} to the customer.</span>
              )}
            </label>
            <label className="block mt-3"><span className="text-[12.5px] font-semibold text-graphite-600">Reason</span>
              {/* Required by the data layer too — an adjustment nobody can account for is
                  indistinguishable from a mistake, and this is money owed to a customer. */}
              <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Goodwill after a delayed repair" className="input-field mt-1.5"/>
            </label>
            <div className="flex gap-2 mt-5">
              <button onClick={submitAdjustment} disabled={saving || !delta || !reason.trim()}
                className="btn btn-brand btn-sm disabled:opacity-50">{saving?'Saving…':'Apply adjustment'}</button>
              <button onClick={()=>setAdjusting(null)} disabled={saving} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
