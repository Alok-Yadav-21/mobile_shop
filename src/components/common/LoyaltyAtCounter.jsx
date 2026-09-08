import { useState } from 'react'
import { toast } from 'sonner'
import { Star } from 'lucide-react'
import { LoyaltyAPI } from '@/services/api.js'
import { useAsync } from '@/hooks/useAsync.js'
import { LoyaltyRedeemer } from '@/components/common/LoyaltyRedeemer.jsx'
import { logAction } from '@/services/auditService.js'
import { money } from '@/utils/format.js'

// The counter's view of a customer's points while a repair is being handed over.
//
// Staff see the balance and can put points against the bill; they cannot adjust it, and they
// cannot see anybody else's — the data layer resolves whose points these are from the repair
// itself, so this screen never has to work out which account a walk-in belongs to.
export function LoyaltyAtCounter({ repairRef, quote, canApply, blockedReason, user, onApplied }){
  const { data:loyalty, loading, refetch } = useAsync(()=>LoyaltyAPI.forRepair(repairRef),[repairRef])
  const [points,setPoints]=useState(0)
  const [saving,setSaving]=useState(false)

  if(loading) return null
  if(!loyalty) return null

  if(!loyalty.hasAccount){
    return (
      <div className="surface p-5">
        <h3 className="font-bold text-[13.5px] mb-1.5 flex items-center gap-2">
          <Star size={15} className="text-amber-500 fill-amber-400"/> Loyalty points
        </h3>
        {/* Most counter bookings will look like this, so it says what to do about it rather
            than just reporting an absence. */}
        <p className="text-[12.5px] text-graphite-400">
          This booking is not attached to a customer account, so there are no points to use.
          Ask the customer to register and their future repairs will earn.
        </p>
      </div>
    )
  }

  const applied = loyalty.appliedPoints ?? 0
  const bill = Number(quote) || 0

  const apply = async ()=>{
    setSaving(true)
    try{
      const r = await LoyaltyAPI.redeemForRepair(repairRef, points)
      if(r?.points > 0){
        logAction({ user, action:'loyalty.redeemed', entityType:'repair', entityId:repairRef,
          after:{ points:r.points, discount:r.discount } })
        toast.success(`${r.points} points applied — ${money(r.discount)} off ${repairRef}`)
        setPoints(0); refetch(); onApplied?.()
      } else {
        toast.message('No points were applied.')
      }
    } catch(e){ toast.error(e.message || 'Could not apply those points') }
    finally { setSaving(false) }
  }

  return (
    <div className="surface p-5">
      <h3 className="font-bold text-[13.5px] mb-3 flex items-center gap-2">
        <Star size={15} className="text-amber-500 fill-amber-400"/> Loyalty points
        {loyalty.customerName && <span className="font-normal text-graphite-400">· {loyalty.customerName}</span>}
      </h3>

      <div className="flex items-center justify-between text-[13px] mb-3">
        <span className="text-graphite-400">Balance</span>
        <span className="font-bold"><span className="mono-data">{loyalty.points}</span> points · <span className="mono-data">{money(loyalty.credit)}</span> credit</span>
      </div>

      {applied > 0 ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-[12.5px] text-emerald-700">
          <div className="font-bold">{applied} points already applied to this repair</div>
          <div className="mt-0.5">{money(bill)} quoted, less {money(loyalty.credit != null ? (applied/10)*2 : 0)} — <strong>{money(Math.max(0, bill - (applied/10)*2))} to collect</strong>.</div>
        </div>
      ) : !canApply ? (
        <div className="rounded-xl bg-graphite-50 border border-graphite-200 px-4 py-3 text-[12.5px] text-graphite-500">
          {blockedReason} — points are applied by whoever is working the job.
        </div>
      ) : bill <= 0 ? (
        <div className="rounded-xl bg-graphite-50 border border-graphite-200 px-4 py-3 text-[12.5px] text-graphite-500">
          Enter the quote first — points come off a figure, and there isn&rsquo;t one yet.
        </div>
      ) : (
        <>
          <LoyaltyRedeemer balance={loyalty.points} total={bill} value={points} onChange={setPoints}
            disabled={saving} owner="them"/>
          {points > 0 && (
            <button onClick={apply} disabled={saving} className="btn btn-brand btn-sm w-full mt-3 disabled:opacity-60">
              {saving ? 'Applying…' : `Apply ${points} points`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
