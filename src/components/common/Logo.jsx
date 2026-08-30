import { Link } from 'react-router-dom'
import { BRAND } from '@/constants/brand.js'

// The wordmark IS the mark — there is no tile. "Virk" carries the weight and "tech" is set
// lighter in the signal colour, so the name reads as one word while still splitting into the
// two halves it is built from. A single accent square closes it, which is what makes it a
// logo rather than the company name in bold.
//
// Because it is type rather than an icon, it stays legible at any size and needs no separate
// asset — the one place it cannot go is a favicon, which uses the standalone mark below.
export function Logo({ light = false, sub = true, className = '' }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 group ${className}`} aria-label={BRAND.name}>
      <span className="leading-tight">
        <span className="flex items-baseline">
          <span
            className={`font-extrabold text-[19px] tracking-[-.03em] ${light ? 'text-white' : 'text-ink'}`}
          >
            Virk
          </span>
          <span className="font-semibold text-[19px] tracking-[-.03em] text-brand">tech</span>
        </span>
        {sub && (
          <span
            className={`block text-[9.5px] tracking-[.12em] uppercase font-semibold ${light ? 'text-white/45' : 'text-graphite-400'}`}
          >
            {BRAND.tagline}
          </span>
        )}
      </span>
    </Link>
  )
}

// Square lockup for the places a wordmark cannot go — favicon, avatar slots, app tiles.
export function LogoMark({ size = 36, className = '' }) {
  return (
    <span
      className={`rounded-xl bg-ink grid place-items-center text-white font-extrabold relative shadow-elevate ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.47 }}
      aria-hidden="true"
    >
      V
      <span className="absolute right-1.5 bottom-1.5 w-1 h-1 rounded-[1px] bg-brand" />
    </span>
  )
}
