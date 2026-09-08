import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
import { useAsync } from '@/hooks/useAsync.js'
import { LoyaltyAPI } from '@/services/api.js'
import { LoyaltyBalance } from '@/components/common/LoyaltyBalance.jsx'
import { DashboardCard } from '@/components/common/DashboardCard.jsx'
import { EmptyState } from '@/components/common/EmptyState.jsx'
import { Table, Th, Td } from '@/components/custom-ui/table.jsx'
import { describeMovement, LOYALTY_KIND_LABELS } from '@/lib/loyalty.js'
import { fmtDateTime } from '@/utils/format.js'
import { Star, TrendingUp, TrendingDown } from 'lucide-react'

const KIND_STYLES = {
  earned: 'bg-emerald-50 text-emerald-600',
  redeemed: 'bg-brand-50 text-brand',
  reversed: 'bg-amber-50 text-amber-600',
  adjusted: 'bg-violet-50 text-violet-600',
}

// The customer's own points: what they have, what it is worth, and every movement behind it.
//
// The history is the point of this page. A balance on its own is a number the customer has to
// take on trust; the movements are what let them check it — and the first thing anyone does with
// a loyalty scheme they do not quite believe is go looking for where the points went.
export default function Loyalty(){
  const { user } = useAuth()
  const { data:summary, loading } = useAsync(()=>LoyaltyAPI.summary(),[user?.id])
  const { data:history=[], loading:loadingHistory } = useAsync(()=>LoyaltyAPI.history(),[user?.id])

  if(loading) return <div className="text-graphite-400">Loading…</div>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Loyalty points</h1>
      <p className="text-graphite-400 text-[14px] mb-5">
        Earn 5 points for every complete £10 you spend with us, at any of our 8 branches.
      </p>

      <LoyaltyBalance summary={summary}/>

      <div className="grid sm:grid-cols-3 gap-4 mt-4">
        <DashboardCard icon={Star} label="Points balance" value={summary?.points ?? 0} tone="brand" index={0}/>
        <DashboardCard icon={TrendingUp} label="Earned in total" value={summary?.earned ?? 0} tone="green" index={1}/>
        <DashboardCard icon={TrendingDown} label="Redeemed" value={summary?.redeemed ?? 0} tone="violet" index={2}/>
      </div>

      <h2 className="font-bold text-[15px] mt-8 mb-3">Points history</h2>
      {loadingHistory ? <div className="text-graphite-400">Loading…</div> : history.length===0 ? (
        <div className="surface p-2">
          <EmptyState
            title="No points yet"
            hint="Points are added once a repair is collected or an order reaches you. Your first one is a booking away."
          />
          <div className="text-center pb-5">
            <Link to="/app/book" className="btn btn-brand btn-sm">Book a repair</Link>
          </div>
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <Table>
            <thead><tr><Th>What happened</Th><Th>Type</Th><Th>Points</Th><Th>When</Th></tr></thead>
            <tbody>{history.map(e=>(
              <tr key={e.id} className="hover:bg-graphite-50">
                <Td>{describeMovement(e)}</Td>
                <Td>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${KIND_STYLES[e.kind] ?? 'bg-slate-100 text-slate-600'}`}>
                    {LOYALTY_KIND_LABELS[e.kind] ?? e.kind}
                  </span>
                </Td>
                <Td className={`mono-data font-bold ${e.delta>0?'text-emerald-600':'text-graphite-600'}`}>
                  {e.delta>0?'+':''}{e.delta}
                </Td>
                <Td className="text-graphite-400">{fmtDateTime(e.at)}</Td>
              </tr>
            ))}</tbody>
          </Table>
        </div>
      )}

      <div className="surface p-5 mt-5">
        <h3 className="font-bold text-[13.5px] mb-2">How it works</h3>
        <ul className="text-[13px] text-graphite-600 space-y-1.5 list-disc pl-4">
          <li>Spend over £10 and earn 5 points for every complete £10 — £30 earns 15 points.</li>
          <li>10 points are worth £2 off. Points are used 10 at a time.</li>
          <li>Points can cover up to 20% of any one bill.</li>
          <li>Your points work at all 8 branches — earn in one, spend in another.</li>
          <li>If an order is refunded or cancelled, the points for it come back off your balance.</li>
        </ul>
      </div>
    </div>
  )
}
