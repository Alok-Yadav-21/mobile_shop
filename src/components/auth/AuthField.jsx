// Field furniture for the authentication pages: the label, the leading icon, the trailing slot
// and the hint. The input element itself is never wrapped or cloned — it is passed in as a child
// and keeps its own value, onChange, type, autoComplete and ref exactly as the page declares
// them. Only the class name changes, so there is no way for this to alter how a field behaves.

// Padded left for the icon and right for a trailing control. h-12 rather than h-10: a taller
// target is easier to hit on a phone and gives the type room to sit properly.
//
// The focus treatment is on the wrapper (group-focus-within) rather than the input, so the icon
// and the border light up together instead of the ring appearing around the box alone.
export const authInput = ({ icon = true, trailing = false } = {}) =>
  [
    'peer w-full h-12 rounded-xl border border-graphite-200 bg-white text-[14px] text-ink',
    'placeholder:text-graphite-400/80 outline-none appearance-none',
    icon ? 'pl-11' : 'pl-4',
    trailing ? 'pr-11' : 'pr-4',
    // Inset hairline at rest, so the field reads as recessed into the card rather than drawn on
    // top of it; it lifts to a brand ring on focus.
    'shadow-[inset_0_1px_2px_rgba(20,20,20,.05)]',
    'transition-[border-color,box-shadow,background-color] duration-200',
    'hover:border-graphite-400/70',
    'focus:border-brand focus:shadow-[0_0_0_3px_rgba(245,51,63,.12),0_2px_6px_-2px_rgba(245,51,63,.25)]',
  ].join(' ')

export function AuthField({ label, hint, icon: Icon, trailing, children, className = '' }) {
  return (
    <label className={`group block ${className}`}>
      <span className="mb-2 block text-[12px] font-bold uppercase tracking-[.08em] text-graphite-600 transition-colors group-focus-within:text-ink">
        {label}
      </span>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-graphite-400 transition-colors duration-200 group-focus-within:text-brand"
          />
        )}
        {children}
        {trailing}
      </div>
      {hint && <span className="mt-2 block text-[11.5px] leading-relaxed text-graphite-400">{hint}</span>}
    </label>
  )
}

// The primary action, built to read as a physical key: a solid darker edge underneath gives it
// a side, and the shadow beneath gives it height. Hover raises it, pressing drives it down onto
// its own edge. The disabled state keeps the geometry and drops the lift, so a form mid-submit
// looks held rather than broken.
export const authButton = [
  'relative w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl',
  'bg-brand text-white text-[14.5px] font-bold tracking-[-.01em] select-none',
  'shadow-[0_3px_0_0_#B8232E,0_10px_20px_-8px_rgba(245,51,63,.55)]',
  'transition-[transform,box-shadow,background-color] duration-150 ease-out',
  'hover:bg-brand-600 hover:-translate-y-px hover:shadow-[0_4px_0_0_#B8232E,0_16px_28px_-10px_rgba(245,51,63,.6)]',
  'active:translate-y-[3px] active:shadow-[0_0_0_0_#B8232E,0_4px_10px_-6px_rgba(245,51,63,.5)]',
  'focus-visible:outline-none focus-visible:shadow-[0_3px_0_0_#B8232E,0_0_0_3px_rgba(245,51,63,.3)]',
  'disabled:translate-y-0 disabled:opacity-60 disabled:shadow-[0_3px_0_0_#B8232E]',
].join(' ')
