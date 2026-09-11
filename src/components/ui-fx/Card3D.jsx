import { useRef, useCallback, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn.js'

// Aceternity's 3D card: the card tilts toward the cursor on a perspective container, so it
// reads as a physical object catching the light rather than a rectangle that grew a shadow.
//
// Kept restrained on purpose — this sits on a product grid in a repair shop, not a portfolio.
// MAX_TILT is small enough that text stays square to the eye and legible while tilted.
const MAX_TILT = 7

// `lift` is the scale applied while the cursor is over the card. It reads well over a photograph
// and badly over text: the browser rasterises the card once and then scales that bitmap, so even
// two per cent of magnification leaves type visibly soft. Pass lift={1} on anything text-heavy.
export function Card3D({ children, className, containerClassName, intensity = 1, lift = 1.02 }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const [active, setActive] = useState(false)

  // Written straight to the element's transform rather than through state, so following the
  // cursor costs one style write per move instead of re-rendering the card and its image.
  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el || reduce) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    const tilt = MAX_TILT * intensity
    const scale = lift === 1 ? '' : ` scale(${lift})`
    el.style.transform = `rotateY(${px * tilt}deg) rotateX(${-py * tilt}deg)${scale}`
  }, [reduce, intensity, lift])

  const reset = useCallback(() => {
    setActive(false)
    if (ref.current) ref.current.style.transform = ''
  }, [])

  return (
    <div
      className={cn('[perspective:1100px]', containerClassName)}
      onPointerMove={onMove}
      onPointerEnter={() => !reduce && setActive(true)}
      onPointerLeave={reset}
    >
      <div
        ref={ref}
        className={cn(
          'h-full [transform-style:preserve-3d]',
          // Promoted to its own layer only while it is actually moving. Left on permanently,
          // will-change keeps the card in a composited layer at rest too, and everything in it
          // is drawn into that bitmap rather than straight to the page — which is enough on its
          // own to make small text look soft.
          active ? 'transition-none will-change-transform' : 'transition-transform duration-500 ease-out',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
