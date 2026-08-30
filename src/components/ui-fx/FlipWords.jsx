import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn.js'

// Aceternity's flip-words: one slot in a headline cycles through several phrases.
//
// The words are stacked in the same grid cell rather than swapped in flow, so the line never
// reflows as a longer phrase arrives — a headline that jumps its own width while you read it
// is worse than no animation. The widest phrase therefore sets the slot width, which is what
// the invisible sizer below is for.
export function FlipWords({ words = [], interval = 2800, className }) {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)

  useEffect(() => {
    if (reduce || words.length < 2) return undefined

    let id
    // Only rotate while the page is actually on screen. Browsers pause animation frames in a
    // background tab, so advancing the word there starts an entrance that never runs and
    // leaves the headline stuck at zero opacity until the tab is focused. On the main <h1>
    // that is a blank line, which is far worse than a headline that simply did not animate.
    const start = () => {
      clearInterval(id)
      if (!document.hidden) id = setInterval(() => setI((n) => (n + 1) % words.length), interval)
    }
    start()
    document.addEventListener('visibilitychange', start)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', start) }
  }, [words.length, interval, reduce])

  if (words.length === 0) return null
  // With reduced motion it is simply the first phrase, permanently.
  if (reduce) return <span className={className}>{words[0]}</span>

  return (
    // The caller's className lands on the word itself, not this wrapper. A gradient class
    // like `grad-text` uses bg-clip-text, which clips to the element's OWN text — applied to
    // this grid container it clipped to nothing and the word rendered invisible.
    <span className="relative inline-grid align-baseline">
      {/* Reserves the width of the longest phrase. Hidden from view and from screen readers,
          which get the live region below instead. */}
      <span className={cn('invisible col-start-1 row-start-1 whitespace-nowrap', className)} aria-hidden="true">
        {words.reduce((a, b) => (b.length > a.length ? b : a), '')}
      </span>

      <span className="col-start-1 row-start-1 whitespace-nowrap" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.span
            key={words[i]}
            className={cn('inline-block', className)}
            // Opacity and offset only. A blur filter here read as permanently muddy: it
            // creates a stacking context on text that is painted through bg-clip-text, so the
            // headline never resolved to a crisp gradient between flips.
            initial={{ opacity: 0, y: '0.3em' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-0.3em' }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            {words[i]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}
