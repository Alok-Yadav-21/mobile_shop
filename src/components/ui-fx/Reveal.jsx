import { motion, useReducedMotion } from 'framer-motion'

// Fades a block up as it scrolls into view, once.
//
// Deliberately restrained: a small rise over a short duration, triggered slightly before the
// element reaches the viewport so it has finished by the time it is properly readable. Content
// that animates every time you scroll past it, or that starts far off-screen and travels,
// makes a page feel slower than one that simply renders.
//
// It never hides content from anyone: with reduced motion requested, and for anything that
// renders without JavaScript, the block is simply present.
export function Reveal({ children, delay = 0, className = '', y = 14 }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      // `once` matters: re-animating on every pass turns scrolling back up into a distraction.
      // The negative bottom margin starts it just before the block is fully on screen.
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
