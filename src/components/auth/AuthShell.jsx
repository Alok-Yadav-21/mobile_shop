import { Link } from 'react-router-dom'
import { BRAND } from '@/constants/brand.js'
import { AuthStage } from './AuthStage.jsx'

// The frame both authentication pages sit in: the stage behind, the wordmark above, and the
// raised card itself. Shared so Login and Register cannot drift apart — they are two views of
// one moment, and a customer who registers and then signs in should not feel handed between
// two different products.

// The wordmark, set larger and with more air than the header version. Same two-part
// construction — "Virk" in near-black carrying the weight, "tech" in the brand red — because
// that is the identity; what changes here is only the scale and the spacing it is given.
function AuthWordmark() {
  return (
    <Link to="/" className="group inline-flex flex-col items-center" aria-label={BRAND.name}>
      <span className="flex items-baseline">
        <span className="text-[34px] sm:text-[38px] font-extrabold tracking-[-.035em] text-ink">Virk</span>
        <span className="text-[34px] sm:text-[38px] font-semibold tracking-[-.035em] text-brand">tech</span>
      </span>
      <span className="mt-1.5 flex items-center gap-2.5">
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-graphite-200" />
        <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-[.28em] text-graphite-400 whitespace-nowrap">
          {BRAND.tagline}
        </span>
        <span className="h-px w-6 bg-gradient-to-l from-transparent to-graphite-200" />
      </span>
    </Link>
  )
}

export function AuthShell({ title, subtitle, note, children, footer, width = 'max-w-[27rem]' }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-graphite-50">
      <AuthStage />

      <div className="relative grid min-h-screen place-items-center px-4 py-10 sm:px-6 sm:py-14">
        <div className={`w-full ${width}`}>
          <div className="flex justify-center" style={{ animation: 'auth-rise .5s cubic-bezier(.22,1,.36,1) both' }}>
            <AuthWordmark />
          </div>

          <div className="relative mt-8 sm:mt-9" style={{ animation: 'auth-rise .6s cubic-bezier(.22,1,.36,1) .08s both' }}>
            {/* Two sheets peeking out behind the card. They give it something to be in front of,
                which is what makes a single panel read as the top of a stack. */}
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-3 -top-3 bottom-3 hidden rounded-[1.75rem] border border-graphite-200/70 bg-white/45 sm:block" />
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-1.5 -top-1.5 bottom-1.5 hidden rounded-[1.6rem] border border-graphite-200 bg-white/70 sm:block" />

            {/* Cast on the ground, outside the card, so it reads as height rather than a border. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 -bottom-4 h-10 rounded-[50%] bg-ink/[.16] blur-2xl" />

            {/* The card. Three shadows doing three jobs — contact at the edge, the distance it
                stands off the page, and an inset highlight along the top where a raised surface
                catches the light. Nothing is transformed or scaled, so the type renders straight
                to the page at its real size and stays sharp. */}
            <div className="relative rounded-[1.5rem] border border-graphite-200 bg-white px-6 py-8 sm:px-9 sm:py-10
              shadow-[0_1px_2px_rgba(20,20,20,.06),0_2px_8px_-2px_rgba(20,20,20,.10),0_40px_72px_-32px_rgba(20,20,20,.38),inset_0_1px_0_0_#fff]">
              {/* A lit seam across the top edge, brand-tinted at its centre. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-12 top-0 h-px"
                style={{ background: 'linear-gradient(to right, transparent, rgba(245,51,63,.45) 50%, transparent)' }}
              />

              <header className="text-center">
                <h1 className="text-[26px] sm:text-[29px] font-extrabold tracking-[-.028em] text-ink leading-[1.1]">{title}</h1>
                {subtitle && (
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-graphite-600 max-w-[30ch] mx-auto">{subtitle}</p>
                )}
                {note && <p className="mt-2 text-[11.5px] text-graphite-400">{note}</p>}
              </header>

              {children}
            </div>
          </div>

          {footer && (
            <div style={{ animation: 'auth-rise .6s cubic-bezier(.22,1,.36,1) .16s both' }}>{footer}</div>
          )}

          <p className="mt-7 text-center text-[12px] text-graphite-400" style={{ animation: 'auth-rise .6s cubic-bezier(.22,1,.36,1) .22s both' }}>
            <Link to="/" className="font-medium transition-colors hover:text-ink">← Back to Virktech</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
