import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

// Counts a figure up when it first appears.
//
// Call sites pass already-formatted values ("£501,985", "4,595.8h", "66"), so rather than
// forcing every caller to hand over a raw number plus a formatter, this splits the string
// into prefix / number / suffix, animates the number, and re-formats it with the same
// grouping and decimal places it arrived with. A value it cannot parse is rendered
// untouched, so "—" or "Awaiting admin" pass straight through.
const PARTS = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/s

function split(value) {
  const m = PARTS.exec(String(value ?? ''))
  if (!m) return null
  const raw = m[2].replace(/,/g, '')
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  const dot = raw.indexOf('.')
  return { prefix: m[1], n, suffix: m[3], decimals: dot === -1 ? 0 : raw.length - dot - 1 }
}

const DURATION = 750

export function AnimatedNumber({ value, className }) {
  const reduce = useReducedMotion()
  const parsed = split(value)
  const [shown, setShown] = useState(() => (parsed && !reduce ? 0 : parsed?.n))
  const frame = useRef(0)

  useEffect(() => {
    if (!parsed || reduce) { setShown(parsed?.n); return undefined }
    const target = parsed.n
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION)
      // Ease-out cubic: fast first, settling gently, so the final figure is readable rather
      // than still racing when the eye lands on it.
      setShown(target * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else setShown(target)
    }
    frame.current = requestAnimationFrame(tick)

    // Browsers pause animation frames in a background tab. Without this the counter would sit
    // at zero on a page loaded in the background and only reach its real figure once the tab
    // was focused — a dashboard reading £0 is worse than one that never animated.
    const settle = setTimeout(() => setShown(target), DURATION + 400)

    return () => { cancelAnimationFrame(frame.current); clearTimeout(settle) }
    // Keyed on the formatted value: a card whose figure changes re-runs the count.
  }, [value, reduce]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!parsed) return <span className={className}>{value}</span>

  const text = shown == null
    ? String(value)
    : parsed.prefix
      + shown.toLocaleString('en-GB', {
          minimumFractionDigits: parsed.decimals,
          maximumFractionDigits: parsed.decimals,
        })
      + parsed.suffix

  // The unanimated value is exposed to assistive tech, so a screen reader is never read a
  // number mid-count.
  return (
    <span className={className}>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{value}</span>
    </span>
  )
}
