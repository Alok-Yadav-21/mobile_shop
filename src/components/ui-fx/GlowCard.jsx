import { useRef, useState, useCallback } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn.js'

// A surface that lights up under the cursor. The highlight is a radial gradient positioned
// from pointer coordinates held in local state rather than React state per mousemove — the
// values are written straight to CSS custom properties on the element, so moving the mouse
// costs a style write instead of a re-render of the card and everything inside it.
//
// Pointer-driven only: it does nothing on touch or keyboard, so it is decoration and never
// the thing that tells you a card is interactive. Focus and hover borders do that.
export function GlowCard({ as: Tag = 'div', className, children, glow = 'rgba(79,70,229,.14)', ...props }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const [lit, setLit] = useState(false)

  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el || reduce) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--glow-x', `${e.clientX - r.left}px`)
    el.style.setProperty('--glow-y', `${e.clientY - r.top}px`)
  }, [reduce])

  return (
    <Tag
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => !reduce && setLit(true)}
      onPointerLeave={() => setLit(false)}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: lit ? 1 : 0,
          background: `radial-gradient(340px circle at var(--glow-x, 50%) var(--glow-y, 50%), ${glow}, transparent 70%)`,
        }}
      />
      {/* Content sits above the highlight; without the stacking context the gradient would
          wash over text at low contrast. */}
      <span className="relative block">{children}</span>
    </Tag>
  )
}
