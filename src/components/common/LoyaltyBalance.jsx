import { Star, Wallet } from 'lucide-react'
import { money } from '@/utils/format.js'

// A points balance and what it is worth, shown the same way wherever it appears — the customer's
// dashboard, their loyalty page, and the counter when a staff member looks up who they are
// serving. One component so the two numbers can never be presented as though they were unrelated:
// the credit is not a second currency, it is what the points are worth.
export function LoyaltyBalance({ summary, compact = false, className = '' }) {
  const points = summary?.points ?? 0
  const credit = summary?.credit ?? 0

  if (compact) {
    return (
      <div className={`flex items-center gap-3 text-[13px] ${className}`}>
        <span className="inline-flex items-center gap-1.5 font-bold">
          <Star size={14} className="text-amber-500 fill-amber-400" />
          <span className="mono-data">{points}</span>
          <span className="text-graphite-400 font-semibold">points</span>
        </span>
        <span className="text-graphite-300">·</span>
        <span className="inline-flex items-center gap-1.5 font-bold">
          <Wallet size={14} className="text-emerald-600" />
          <span className="mono-data">{money(credit)}</span>
          <span className="text-graphite-400 font-semibold">credit</span>
        </span>
      </div>
    )
  }

  return (
    <div className={`surface p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-semibold text-graphite-400">
            <Star size={14} className="text-amber-500 fill-amber-400" /> Loyalty points
          </div>
          <div className="text-3xl font-extrabold tracking-tight mono-data mt-1">{points}</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] font-semibold text-graphite-400">Available credit</div>
          <div className="text-3xl font-extrabold tracking-tight mono-data mt-1 text-emerald-600">{money(credit)}</div>
        </div>
      </div>
      {/* Said plainly, because a balance with no explanation invites the customer to work out
          their own conversion — and they will get it wrong at the part-block. */}
      <p className="text-[12px] text-graphite-400 mt-3.5">
        Every 10 points is {money(2)} off a future repair or order. Points can cover up to 20% of a bill.
      </p>
    </div>
  )
}
