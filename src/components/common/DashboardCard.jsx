import { motion, useReducedMotion } from 'framer-motion'
import { GlowCard } from '@/components/ui-fx/GlowCard.jsx'
import { AnimatedNumber } from '@/components/ui-fx/AnimatedNumber.jsx'

// The stat tile used across the admin, staff and customer dashboards. The API is unchanged
// (icon / label / value / tone) so every existing call site keeps working; what is new is the
// pointer glow, the count-up and a staggered entrance.
const TONES = {
  brand: { chip: 'bg-brand-50 text-brand', glow: 'rgba(79,70,229,.14)' },
  green: { chip: 'bg-emerald-50 text-emerald-600', glow: 'rgba(20,184,166,.14)' },
  amber: { chip: 'bg-amber-50 text-amber-600', glow: 'rgba(245,158,11,.14)' },
  violet: { chip: 'bg-violet-50 text-violet-600', glow: 'rgba(124,92,255,.14)' },
}

export function DashboardCard({ icon: Icon, label, value, tone = 'brand', hint, index = 0 }) {
  const reduce = useReducedMotion()
  const t = TONES[tone] ?? TONES.brand

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={reduce ? false : { opacity: 1, y: 0 }}
      // Capped stagger: on a row of eight tiles an uncapped delay would leave the last one
      // arriving long after the reader has started reading the first.
      transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.04, ease: 'easeOut' }}
    >
      <GlowCard className="bento-tile h-full" glow={t.glow}>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl grid place-items-center mb-3 ${t.chip}`}>
            <Icon size={19} />
          </div>
        )}
        <AnimatedNumber
          value={value}
          className="block text-2xl sm:text-3xl font-extrabold tracking-tight mono-data"
        />
        <div className="text-[12px] text-graphite-400 font-semibold mt-0.5">{label}</div>
        {hint && <div className="text-[11.5px] text-graphite-400 mt-1.5">{hint}</div>}
      </GlowCard>
    </motion.div>
  )
}
