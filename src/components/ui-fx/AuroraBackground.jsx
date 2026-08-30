import { cn } from '@/lib/cn.js'

// Slow drifting colour behind a dark section, in the Aceternity aurora pattern: a couple of
// large, heavily blurred gradient blobs on long offset animations, so the movement never
// repeats visibly and never resolves into a shape competing with the content.
//
// Built from two absolutely-positioned divs rather than a canvas — it costs nothing to run,
// degrades to a static gradient with reduced motion, and cannot fail the way WebGL can.
export function AuroraBackground({ className }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      <div
        className="absolute -top-1/3 -left-1/4 h-[70%] w-[70%] rounded-full opacity-[.28] blur-[110px] animate-aurora-a"
        style={{ background: 'radial-gradient(circle at 50% 50%, #2F6BED 0%, transparent 65%)' }}
      />
      <div
        className="absolute -bottom-1/3 right-0 h-[65%] w-[60%] rounded-full opacity-[.22] blur-[120px] animate-aurora-b"
        style={{ background: 'radial-gradient(circle at 50% 50%, #7C3AED 0%, transparent 65%)' }}
      />
      <div
        className="absolute top-1/4 right-1/4 h-[45%] w-[45%] rounded-full opacity-[.16] blur-[100px] animate-aurora-a"
        style={{ background: 'radial-gradient(circle at 50% 50%, #22D3B8 0%, transparent 60%)', animationDelay: '-9s' }}
      />
    </div>
  )
}
