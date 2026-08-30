import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn.js'

// Aceternity's card-hover pattern: one highlight shared by the whole grid, which slides from
// card to card instead of each card fading its own background in and out. A single element
// with a layoutId is what makes it travel — framer-motion animates it between positions when
// it unmounts in one cell and mounts in the next.
//
// The highlight sits behind the card and is aria-hidden, so it is purely a hover affordance;
// each item keeps whatever semantics its own markup gives it.
export function HoverEffectGrid({ items = [], renderItem, className, itemClassName }) {
  const [hovered, setHovered] = useState(null)
  const reduce = useReducedMotion()

  return (
    <div className={cn('grid', className)}>
      {items.map((item, i) => (
        <div
          key={item.id ?? item.title ?? i}
          className={cn('relative group block h-full', itemClassName)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <AnimatePresence>
            {hovered === i && !reduce && (
              <motion.span
                aria-hidden="true"
                layoutId="hover-card-bg"
                className="absolute inset-0 -z-10 block rounded-2xl bg-brand-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.1 } }}
                // Snappy enough to keep up with the cursor across a grid, damped enough not
                // to overshoot and wobble when it lands.
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              />
            )}
          </AnimatePresence>
          {renderItem(item, i, hovered === i)}
        </div>
      ))}
    </div>
  )
}
