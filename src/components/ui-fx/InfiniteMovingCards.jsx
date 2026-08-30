import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn.js'

// A marquee of cards that scrolls forever, in the Aceternity pattern: the list is rendered
// twice and translated by half its width, so the second copy is exactly where the first was
// when the animation loops and the seam is invisible.
//
// Duration is set from the real measured width rather than a fixed time, so ten cards and
// three cards travel at the same speed instead of the shorter list sprinting.
// Seconds each card takes to cross, so the duration scales with how many there are and a
// short list does not sprint. These are per-card, not per-loop: six cards on "slow" is about
// a minute, which reads as drifting rather than as something you are meant to chase.
const SPEEDS = { fast: 3, normal: 6, slow: 9 }

export function InfiniteMovingCards({
  items = [],
  direction = 'left',
  speed = 'normal',
  pauseOnHover = true,
  className,
  renderItem,
}) {
  const scrollerRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    // Anyone asking for reduced motion gets a static, scrollable row instead of a marquee.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const perItem = SPEEDS[speed] ?? SPEEDS.normal
    el.style.setProperty('--marquee-duration', `${(items.length || 1) * perItem}s`)
    el.style.setProperty('--marquee-direction', direction === 'left' ? 'normal' : 'reverse')
    setReady(true)
  }, [items.length, speed, direction])

  if (items.length === 0) return null

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        // Fades the ends so cards enter and leave rather than being cut off by a hard edge.
        '[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]',
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          'flex w-max shrink-0 flex-nowrap gap-4 py-2',
          ready && 'animate-marquee',
          pauseOnHover && 'hover:[animation-play-state:paused]',
        )}
      >
        {/* Rendered twice. The duplicate is hidden from assistive tech so the same quotes are
            not announced a second time. */}
        {items.map((item, i) => (
          <li key={`a-${i}`} className="shrink-0">{renderItem(item, i)}</li>
        ))}
        {items.map((item, i) => (
          <li key={`b-${i}`} className="shrink-0" aria-hidden="true">{renderItem(item, i)}</li>
        ))}
      </ul>
    </div>
  )
}
