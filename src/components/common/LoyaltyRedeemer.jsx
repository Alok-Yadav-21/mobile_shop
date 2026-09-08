import { useEffect, useState } from 'react'
import { Star, Info } from 'lucide-react'
import { money } from '@/utils/format.js'
import { maxRedeemablePoints, applyRedemption, REDEEM_STEP, MAX_DISCOUNT_RATE } from '@/lib/loyalty.js'

// Choosing how many points to put against a bill. Used by the customer at checkout and by staff
// at the counter, so the two cannot offer different amounts for the same basket.
//
// The control is a slider in steps of ten rather than a free number field, because every invalid
// amount is then unreachable: you cannot type 37, you cannot ask for more than you hold, and you
// cannot exceed the 20% cap. The adapter re-checks all three anyway — the balance may have moved
// since this rendered — but a control that cannot express a wrong answer is worth more than an
// error message explaining one.
export function LoyaltyRedeemer({ balance = 0, total = 0, value = 0, onChange, disabled = false, owner = 'you' }){
  const cap = maxRedeemablePoints(balance, total)
  const { discount, payable } = applyRedemption({ balance, total, requested: value })

  // Never leave more selected than is currently allowed — the basket can shrink under a chosen
  // amount, and a discount larger than the cap must not survive the change.
  useEffect(()=>{ if(value > cap) onChange?.(cap) },[cap, value, onChange])

  if(balance < REDEEM_STEP){
    return (
      <div className="rounded-xl bg-graphite-50 border border-graphite-200 px-4 py-3 text-[12.5px] text-graphite-500 flex items-start gap-2">
        <Star size={14} className="text-amber-500 mt-0.5 flex-none"/>
        <span>
          {balance > 0
            ? `${owner === 'you' ? 'You have' : 'This customer has'} ${balance} loyalty points — ${REDEEM_STEP} are needed before they can be used.`
            : `No loyalty points to use on this order yet.`}
        </span>
      </div>
    )
  }

  if(cap === 0){
    return (
      <div className="rounded-xl bg-graphite-50 border border-graphite-200 px-4 py-3 text-[12.5px] text-graphite-500 flex items-start gap-2">
        <Info size={14} className="mt-0.5 flex-none"/>
        {/* Says why, rather than showing a dead slider: on a small bill the 20% cap is worth
            less than a single block of points, and "no" without a reason reads as a bug. */}
        <span>This order is too small to use points on — the {Math.round(MAX_DISCOUNT_RATE*100)}% limit comes to less than {money(2)}.</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-amber-50/60 border border-amber-200 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[13px] font-bold">
          <Star size={15} className="text-amber-500 fill-amber-400"/>
          Use loyalty points
        </div>
        <div className="text-[12px] text-graphite-500">
          {balance} available · up to {cap} on this order
        </div>
      </div>

      <input
        type="range" min={0} max={cap} step={REDEEM_STEP} value={Math.min(value, cap)} disabled={disabled}
        onChange={(e)=>onChange?.(Number(e.target.value))}
        aria-label="Loyalty points to use"
        className="w-full mt-3 accent-amber-500 disabled:opacity-50"
      />

      <div className="flex items-center justify-between text-[13px] mt-1.5">
        <span className="text-graphite-500">
          <span className="mono-data font-bold text-graphite-700">{Math.min(value, cap)}</span> points
        </span>
        <span className="font-bold text-emerald-600 mono-data">−{money(discount)}</span>
      </div>

      {value > 0 && (
        <div className="flex items-center justify-between text-[13px] font-bold pt-2.5 mt-2.5 border-t border-amber-200">
          <span>Left to pay</span><span className="mono-data">{money(payable)}</span>
        </div>
      )}

      <p className="text-[11px] text-graphite-400 mt-2">
        Points are used {REDEEM_STEP} at a time and can cover up to {Math.round(MAX_DISCOUNT_RATE*100)}% of a bill.
        They come off {owner === 'you' ? 'your' : 'their'} balance once the order is placed.
      </p>
    </div>
  )
}
