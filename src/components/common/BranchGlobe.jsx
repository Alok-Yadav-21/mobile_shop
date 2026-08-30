import { useEffect, useRef, useState } from 'react'
import createGlobe from 'cobe'
import { BRANCHES } from '@/data/branches.js'

// A slowly rotating earth with the branch network lit up on it. This is a brand visual, not a
// control: choosing a branch happens on the map (BranchMap.jsx), which is far quicker for
// eight shops a few miles apart. Kept deliberately non-interactive except for drag-to-spin.
//
// The canvas is rendered at 2x the CSS size for sharpness on retina displays, and the WebGL
// context is destroyed on unmount — leaking one per navigation would exhaust the browser's
// limited pool of contexts.

// London sits at roughly 51.5N, 0.1W. Rotating to face it means the globe settles showing the
// branches rather than the middle of the Pacific.
const LONDON = { lat: 51.45, lng: 0.08 }

// cobe's phi is longitude-facing rotation in radians; theta tilts toward the poles.
const PHI_FOR_LONDON = -(LONDON.lng * Math.PI) / 180 + Math.PI
const THETA_FOR_LONDON = (LONDON.lat * Math.PI) / 180 - 0.35

export function BranchGlobe({ size = 480, className = '' }) {
  const canvasRef = useRef(null)
  const pointerDownX = useRef(null)
  const dragOffset = useRef(0)
  const [dragging, setDragging] = useState(false)
  // Fade in only once WebGL has actually produced a frame, so a failed context shows nothing
  // rather than a black square.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // A user who has asked for reduced motion gets a still globe rather than a spinning one.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let phi = PHI_FOR_LONDON
    let globe

    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: size * 2,
        height: size * 2,
        phi: PHI_FOR_LONDON,
        theta: THETA_FOR_LONDON,
        dark: 1,
        diffuse: 1.2,
        scale: 1,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: [0.22, 0.27, 0.38],
        markerColor: [0.08, 0.72, 0.65],
        glowColor: [0.16, 0.19, 0.32],
        offset: [0, 0],
        markerElevation: 0.02,
        markers: BRANCHES
          .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng))
          // All eight sit within a few miles, so small markers keep them as distinct points
          // rather than one smeared blob.
          .map((b) => ({ location: [b.lat, b.lng], size: 0.035 })),
        onRender: (state) => {
          if (!reduceMotion && pointerDownX.current === null) phi += 0.0022
          state.phi = phi + dragOffset.current
          setReady(true)
        },
      })
    } catch {
      // No WebGL (old device, blocked context) — the surrounding section still reads fine
      // without the globe, so this stays silent rather than breaking the page.
      return undefined
    }

    return () => globe?.destroy()
  }, [size])

  // Drag to spin. Pointer move/up are bound to the window so a drag that leaves the canvas
  // still tracks and still releases.
  useEffect(() => {
    const onMove = (e) => {
      if (pointerDownX.current === null) return
      dragOffset.current += (e.clientX - pointerDownX.current) / 350
      pointerDownX.current = e.clientX
    }
    const onUp = () => { pointerDownX.current = null; setDragging(false) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  return (
    <div className={`relative ${className}`} style={{ width: '100%', maxWidth: size, aspectRatio: '1' }}>
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        onPointerDown={(e) => { pointerDownX.current = e.clientX; setDragging(true) }}
        // Decorative: the branch list beside it carries the same information in text.
        aria-hidden="true"
        className="w-full h-full transition-opacity duration-1000"
        style={{
          opacity: ready ? 1 : 0,
          cursor: dragging ? 'grabbing' : 'grab',
          contain: 'layout paint size',
        }}
      />
    </div>
  )
}
