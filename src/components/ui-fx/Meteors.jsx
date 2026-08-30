import { useMemo } from 'react'
import { cn } from '@/lib/cn.js'

// Aceternity's meteors: streaks that fall diagonally across a dark panel, each with its own
// delay and duration so they never march in step.
//
// Positions are generated once and memoised — regenerating them on every render would make
// the meteors jump to new places whenever the parent re-rendered for an unrelated reason.
export function Meteors({ number = 18, className }) {
  const meteors = useMemo(
    () => Array.from({ length: number }, (_, i) => ({
      id: i,
      // Spread across a wider span than the container so streaks enter from off-screen left
      // rather than all appearing at the edge.
      left: `${Math.round(-20 + Math.random() * 140)}%`,
      delay: `${(Math.random() * 8).toFixed(2)}s`,
      duration: `${(4 + Math.random() * 6).toFixed(2)}s`,
    })),
    [number],
  )

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute top-0 h-0.5 w-0.5 rounded-full bg-slate-300 shadow-[0_0_0_1px_rgba(255,255,255,.08)] animate-meteor
                     before:absolute before:top-1/2 before:h-px before:w-[60px] before:-translate-y-1/2
                     before:bg-gradient-to-r before:from-slate-300 before:to-transparent before:content-['']"
          style={{ left: m.left, animationDelay: m.delay, animationDuration: m.duration }}
        />
      ))}
    </div>
  )
}
