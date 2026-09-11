import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

// The environment the sign-in and registration cards stand in.
//
// Everything here is decoration and carries aria-hidden: abstract device silhouettes, a couple
// of layered panels, hairlines, and a low red wash. It is built from rounded rectangles and 1px
// lines rather than imagery, so it costs nothing to render, scales to any viewport, and reads as
// a technology product rather than a stock photograph.
//
// Nothing in here sits behind text. The parallax moves these elements only — never the card —
// because perspective magnifies whatever it brings forward and the browser scales the
// already-rasterised glyphs rather than redrawing them, which is what makes type look soft.
export function AuthStage() {
  const ref = useRef(null)
  const reduce = useReducedMotion()

  // Pointer parallax, written straight to a CSS variable on the container so the whole stage
  // shifts in one style write per frame instead of re-rendering a tree of decorations.
  useEffect(() => {
    const el = ref.current
    if (!el || reduce) return
    let frame = 0
    const onMove = (e) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const x = (e.clientX / window.innerWidth - 0.5) * 2
        const y = (e.clientY / window.innerHeight - 0.5) * 2
        el.style.setProperty('--px', x.toFixed(3))
        el.style.setProperty('--py', y.toFixed(3))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(frame) }
  }, [reduce])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden [--px:0] [--py:0]"
    >
      {/* Ground: off-white washed with a little warmth at the top and a soft charcoal vignette
          at the base, so the page reads as a lit room rather than a flat fill. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,#FFFFFF_0%,#FAFAFA_45%,#F2F2F2_100%)]" />

      {/* One restrained pass of brand light, top-right, well away from the card's type.
          Scaled right down on a phone: the same 34rem circle that reads as a distant glow on a
          desktop covers most of a 375px screen and tints the whole page pink. */}
      <div
        className="absolute -top-24 -right-20 h-[16rem] w-[16rem] rounded-full blur-[90px] opacity-[.13]
          sm:-top-40 sm:-right-32 sm:h-[34rem] sm:w-[34rem] sm:blur-[130px] sm:opacity-[.22]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #F5333F 0%, transparent 68%)',
          transform: 'translate3d(calc(var(--px) * -14px), calc(var(--py) * -14px), 0)',
        }}
      />
      <div
        className="absolute -bottom-28 -left-20 h-[15rem] w-[15rem] rounded-full blur-[90px] opacity-[.07]
          sm:-bottom-48 sm:-left-32 sm:h-[30rem] sm:w-[30rem] sm:blur-[140px] sm:opacity-[.10]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #141414 0%, transparent 70%)',
          transform: 'translate3d(calc(var(--px) * 10px), calc(var(--py) * 10px), 0)',
        }}
      />

      {/* Hairline field. Wide spacing and very low contrast: enough to read as engineered space,
          not enough to compete with the card. */}
      <div
        className="absolute inset-0 opacity-[.5]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(20,20,20,.045) 1px, transparent 1px),'
            + 'linear-gradient(to bottom, rgba(20,20,20,.045) 1px, transparent 1px)',
          backgroundSize: '88px 88px',
          maskImage: 'radial-gradient(120% 80% at 50% 40%, #000 30%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(120% 80% at 50% 40%, #000 30%, transparent 78%)',
        }}
      />

      {/* The devices. Hidden below lg: on a phone the card fills the screen and these would be
          clutter behind it rather than depth around it. */}
      <div className="hidden lg:block">
        <DeviceSilhouette className="left-[6%] top-[16%]" w={188} h={366} rotate={-14} depth={22} />
        <DeviceSilhouette className="right-[7%] bottom-[12%]" w={164} h={320} rotate={12} depth={-18} tone="ink" />

        {/* Layered panels: flat sheets stacked behind the card's plane, the way a spec sheet or
            a dashboard would sit on a desk. */}
        <Panel className="left-[20%] bottom-[14%]" w={210} h={132} rotate={-7} depth={14} />
        <Panel className="right-[21%] top-[13%]" w={176} h={112} rotate={9} depth={-12} />

        {/* Two long hairlines with a lit segment, suggesting a circuit trace without drawing one. */}
        <Trace className="top-[28%]" from="left" />
        <Trace className="bottom-[26%]" from="right" />
      </div>
    </div>
  )
}

// An abstract handset: body, screen inset, speaker slot, and a camera cluster. Recognisable as a
// phone at a glance and not a drawing of any particular one.
function DeviceSilhouette({ className = '', w, h, rotate = 0, depth = 0, tone = 'light' }) {
  const ink = tone === 'ink'
  return (
    <div
      className={`absolute ${className}`}
      style={{ transform: `translate3d(calc(var(--px) * ${depth}px), calc(var(--py) * ${depth}px), 0)` }}
    >
      <div
        className={`rounded-[2.2rem] border ${ink ? 'border-ink/10 bg-ink/[.045]' : 'border-graphite-200/80 bg-white/55'}
          shadow-[0_40px_70px_-45px_rgba(20,20,20,.5)] backdrop-blur-[1px]`}
        style={{ width: w, height: h, transform: `rotate(${rotate}deg)` }}
      >
        <div className={`m-[9px] h-[calc(100%-18px)] rounded-[1.7rem] border ${ink ? 'border-ink/10' : 'border-graphite-200/70'}
          bg-[linear-gradient(160deg,rgba(255,255,255,.85),rgba(247,247,247,.35))]`}>
          <span className={`mx-auto mt-3 block h-1 w-10 rounded-full ${ink ? 'bg-ink/15' : 'bg-graphite-200'}`} />
          <span className="mt-5 ml-4 flex gap-1.5">
            <span className={`h-3.5 w-3.5 rounded-full ${ink ? 'bg-ink/10' : 'bg-graphite-100'}`} />
            <span className={`h-3.5 w-3.5 rounded-full ${ink ? 'bg-ink/10' : 'bg-graphite-100'}`} />
          </span>
          {/* The single point of red on each device — a status light, not decoration. */}
          <span className="mt-4 ml-4 block h-1.5 w-1.5 rounded-full bg-brand/50" />
        </div>
      </div>
    </div>
  )
}

function Panel({ className = '', w, h, rotate = 0, depth = 0 }) {
  return (
    <div
      className={`absolute ${className}`}
      style={{ transform: `translate3d(calc(var(--px) * ${depth}px), calc(var(--py) * ${depth}px), 0)` }}
    >
      <div
        className="rounded-2xl border border-graphite-200/70 bg-white/50 shadow-[0_30px_50px_-40px_rgba(20,20,20,.45)]"
        style={{ width: w, height: h, transform: `rotate(${rotate}deg)` }}
      >
        <span className="mt-4 ml-4 block h-1.5 w-12 rounded-full bg-graphite-200" />
        <span className="mt-2.5 ml-4 block h-1.5 w-20 rounded-full bg-graphite-100" />
        <span className="mt-2.5 ml-4 block h-1.5 w-16 rounded-full bg-graphite-100" />
      </div>
    </div>
  )
}

function Trace({ className = '', from = 'left' }) {
  return (
    <div className={`absolute inset-x-0 h-px ${className}`}>
      <div
        className="h-px w-full"
        style={{
          background: from === 'left'
            ? 'linear-gradient(to right, transparent 0%, rgba(20,20,20,.10) 22%, rgba(245,51,63,.32) 34%, rgba(20,20,20,.08) 46%, transparent 72%)'
            : 'linear-gradient(to left, transparent 0%, rgba(20,20,20,.10) 22%, rgba(245,51,63,.28) 36%, rgba(20,20,20,.08) 48%, transparent 74%)',
        }}
      />
    </div>
  )
}
