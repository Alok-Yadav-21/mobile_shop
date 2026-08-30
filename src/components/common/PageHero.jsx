import { motion, useReducedMotion } from 'framer-motion'

// Inner-page masthead, matching the homepage: a soft grey slab inside the container with an
// oversized ghost word behind the text, rather than a dark full-bleed band.
//
// Props are unchanged, so all twelve public pages pick this up untouched. `ghost` is optional
// and falls back to the first word of the title, which is why no page had to be edited.
export function PageHero({ kicker, title, desc, ghost, children }) {
  const reduce = useReducedMotion()

  // Titles here are plain strings; guard anyway so a node passed as a title cannot throw.
  const ghostWord = ghost
    ?? (typeof title === 'string' ? title.split(/[\s—]+/)[0].toUpperCase() : '')

  const line = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: reduce ? false : { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: 'easeOut' },
  })

  return (
    <section className="container-x pt-6">
      <div className="relative overflow-hidden rounded-3xl bg-graphite-100 px-8 sm:px-12 py-12 sm:py-16">
        {ghostWord && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-4 right-6 font-extrabold tracking-tighter leading-none select-none text-white/70"
            style={{ fontSize: 'clamp(3.5rem, 11vw, 8rem)' }}
          >
            {ghostWord}
          </span>
        )}

        <div className="relative">
          {kicker && (
            <motion.span
              className="block text-[12px] font-bold uppercase tracking-wide text-brand"
              {...line(0)}
            >
              {kicker}
            </motion.span>
          )}
          <motion.h1
            className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-2 max-w-2xl leading-[1.05] text-ink"
            {...line(0.06)}
          >
            {title}
          </motion.h1>
          {desc && (
            <motion.p className="text-graphite-600 mt-4 max-w-xl text-[15px] leading-relaxed" {...line(0.12)}>
              {desc}
            </motion.p>
          )}
          {children}
        </div>
      </div>
    </section>
  )
}
