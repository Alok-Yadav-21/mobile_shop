import { motion, useReducedMotion } from 'framer-motion'

// A soft light sweeping across a dark section. Purely atmospheric — it sits behind the
// content at low opacity and is aria-hidden, so it adds depth without competing with the
// words on top of it.
//
// Rendered as a blurred SVG ellipse rather than a CSS gradient because the blur survives
// scaling, which keeps the edge soft on a wide monitor instead of banding.
export function Spotlight({ className = '', fill = '#2F6BED' }) {
  const reduce = useReducedMotion()

  return (
    <svg
      className={`pointer-events-none absolute z-0 opacity-0 ${className}`}
      style={{ opacity: reduce ? 0.35 : undefined }}
      viewBox="0 0 3787 2842"
      fill="none"
      aria-hidden="true"
    >
      <motion.g
        // Fades and drifts in once on mount. It never loops: a light that keeps moving pulls
        // the eye away from the content it is meant to frame.
        initial={reduce ? false : { opacity: 0, x: -120 }}
        animate={reduce ? false : { opacity: 0.4, x: 0 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        filter="url(#spotlight-blur)"
      >
        <ellipse
          cx="1924.71" cy="273.501" rx="1924.71" ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.21"
        />
      </motion.g>
      <defs>
        <filter id="spotlight-blur" x="0" y="0" width="3787" height="2842" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="151" result="blur" />
        </filter>
      </defs>
    </svg>
  )
}
