import { lazy, Suspense, useState } from 'react'
import { PageHero } from '@/components/common/PageHero.jsx'
import { BRANCHES } from '@/data/branches.js'
import { MapPin, Phone, Navigation } from 'lucide-react'
import { BRAND } from '@/constants/brand.js'

// Leaflet only makes sense in the browser and is the heaviest thing on this page, so it is
// split out of the main bundle and loaded when the page is.
const BranchMap = lazy(() =>
  import('@/components/common/BranchMap.jsx').then((m) => ({ default: m.BranchMap })),
)

export default function Branches() {
  // The map and the list are two views of one selection: clicking a pin highlights the card,
  // clicking a card flies the map to the pin.
  const [selectedId, setSelectedId] = useState(null)

  return (
    <>
      <PageHero
        kicker="Our branches"
        title="8 branches, one connected network"
        desc="Serving South-East London and North-West Kent. Same account, same warranty, same tracked service — wherever you visit."
      />

      <section className="container-x section-pad">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-[15px] font-bold">Find your nearest branch</h2>
          <p className="text-[12.5px] text-graphite-400">Tap a pin or a card to see the details.</p>
        </div>

        <Suspense fallback={<div className="rounded-2xl border border-graphite-200 bg-graphite-50 animate-pulse" style={{ height: 420 }} />}>
          <BranchMap selectedId={selectedId} onSelect={(b) => setSelectedId(b.id)} />
        </Suspense>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {BRANCHES.map((b) => {
            const active = b.id === selectedId
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id)}
                aria-pressed={active}
                className={`bento-tile text-left transition-all ${active ? 'border-brand ring-2 ring-brand/25' : ''}`}
              >
                <MapPin size={18} className="text-brand" />
                <div className="font-bold text-[15px] mt-3">{b.area.split('—')[0].trim()}</div>
                <div className="text-[11.5px] text-graphite-400 mt-0.5">{b.local}</div>
                <div className="text-[13px] text-graphite-600 mt-3 leading-relaxed">
                  {b.addr}
                  <br />
                  <span className="mono-data">{b.pc}</span>
                </div>
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand mt-3">
                  <Phone size={13} /> {BRAND.phone}
                </span>
                {/* Deliberately an anchor inside the card, and stopPropagation'd, so tapping
                    "Directions" opens maps instead of just selecting the branch. */}
                <a
                  href={`https://www.openstreetmap.org/?mlat=${b.lat}&mlon=${b.lng}#map=16/${b.lat}/${b.lng}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold text-graphite-500 hover:text-brand mt-1.5"
                >
                  <Navigation size={13} /> Directions
                </a>
              </button>
            )
          })}
        </div>
      </section>
    </>
  )
}
