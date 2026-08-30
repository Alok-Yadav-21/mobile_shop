import { motion, useReducedMotion } from 'framer-motion'
import { Spotlight } from '@/components/ui-fx/Spotlight.jsx'

// The masthead on every public page. Props are unchanged, so all twelve pages pick up the
// spotlight and the entrance without edits — the same reason this was worth changing here
// rather than page by page.
export function PageHero({ kicker, title, desc, children }) {
  const reduce = useReducedMotion()

  // One transition reused by the three stacked lines, each offset slightly so they resolve in
  // reading order rather than arriving together.
  const line = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: reduce ? false : { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: 'easeOut' },
  })

  return (
    <section className="bg-ink-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid [background-size:26px_26px] opacity-[.3]" aria-hidden />
      <Spotlight className="-top-60 -left-20 h-[160%] w-[140%]" />
      {/* Warms the right edge so the block does not read as a flat slab behind the text. */}
      <div className="absolute top-0 right-0 w-[45%] h-full bg-gradient-to-l from-brand/[.07] to-transparent" aria-hidden />

      <div className="container-x relative py-14 sm:py-20">
        {kicker && (
          <motion.span className="kicker text-slate-500 block" {...line(0)}>{kicker}</motion.span>
        )}
        <motion.h1
          className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-3 max-w-2xl leading-[1.08]"
          {...line(0.06)}
        >
          {title}
        </motion.h1>
        {desc && (
          <motion.p className="text-slate-300 mt-4 max-w-xl text-[15.5px] leading-relaxed" {...line(0.12)}>
            {desc}
          </motion.p>
        )}
        {children}
      </div>
    </section>
  )
}
