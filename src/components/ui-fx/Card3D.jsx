import { useRef, useCallback, useState, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn.js'

// Aceternity's 3D card: the card tilts toward the cursor on a perspective container, so it
// reads as a physical object catching the light rather than a rectangle that grew a shadow.
//
// Kept restrained on purpose — this sits on a product grid in a repair shop, not a portfolio.
// MAX_TILT is small enough that text stays square to the eye and legible while tilted.
const MAX_TILT = 7

// `frozen` holds the card level and stops it following the cursor. Meant for a card you have to
// interact with rather than look at: a form that rotates while you are typing into it is a toy,
// and the tilt has already done its job by the time somebody clicks a field.
export function Card3D({ children, className, containerClassName, intensity = 1, frozen = false }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const [active, setActive] = useState(false)

  // Written straight to the element's transform rather than through state, so following the
  // cursor costs one style write per move instead of re-rendering the card and its image.
  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el || reduce || frozen) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    const tilt = MAX_TILT * intensity
    el.style.transform = `rotateY(${px * tilt}deg) rotateX(${-py * tilt}deg) scale(1.02)`
  }, [reduce, intensity, frozen])

  const reset = useCallback(() => {
    setActive(false)
    if (ref.current) ref.current.style.transform = ''
  }, [])

  // Settle back level the moment it is frozen, rather than leaving it stuck at whatever angle
  // the cursor happened to be at.
  useEffect(() => { if (frozen) reset() }, [frozen, reset])

  return (
    <div
      className={cn('[perspective:1100px]', containerClassName)}
      onPointerMove={onMove}
      onPointerEnter={() => !reduce && !frozen && setActive(true)}
      onPointerLeave={reset}
    >
      <div
        ref={ref}
        className={cn(
          'h-full [transform-style:preserve-3d] will-change-transform',
          // Eased on the way out so the card settles back level instead of snapping, but not
          // on the way in, which would make it lag behind the cursor.
          active ? 'transition-none' : 'transition-transform duration-500 ease-out',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
