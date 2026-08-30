import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, ArrowRight, LocateFixed, Navigation, Loader2 } from 'lucide-react'
import { BranchAPI } from '@/services/api.js'
import { useAsync } from '@/hooks/useAsync.js'
import { branchesByDistance, formatDistance, locatePostcode } from '@/lib/geo.js'

// Leaflet is the heaviest thing here, so it loads only once this section is reached.
const BranchMap = lazy(() =>
  import('@/components/common/BranchMap.jsx').then((m) => ({ default: m.BranchMap })),
)

// "Find your nearest branch", answered rather than illustrated.
//
// Two ways in: share your location, or type a postcode. Either gives a point, and every branch
// is then ranked by real great-circle distance from it — the coordinates are already on each
// branch record, so this needs no lookup service and works offline.
export function BranchFinder() {
  const { data: branches = [] } = useAsync(() => BranchAPI.list(), [])
  const [postcode, setPostcode] = useState('')
  const [origin, setOrigin] = useState(null)      // { lat, lng, label }
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const ranked = useMemo(() => branchesByDistance(branches, origin), [branches, origin])
  const nearest = origin ? ranked.slice(0, 3) : []

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('This browser cannot share your location — type a postcode instead.'); return }
    setLocating(true); setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'your location' })
        setPostcode('')
        setLocating(false)
      },
      // Declining the prompt is a normal choice, not a failure — say what to do next.
      () => { setLocating(false); setError('No location shared. Type a postcode instead.') },
      { timeout: 8000, maximumAge: 300000 },
    )
  }

  const searchPostcode = (e) => {
    e.preventDefault()
    const found = locatePostcode(postcode, branches)
    if (!found) { setError(`"${postcode}" is not a postcode we recognise — try the outward code, like SE18.`); setOrigin(null); return }
    setError(null)
    setOrigin({ lat: found.lat, lng: found.lng, label: found.code })
  }

  return (
    <section className="container-x py-4">
      <div className="rounded-3xl bg-graphite-100 overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="px-8 sm:px-12 py-12">
            <span className="text-[12px] font-bold uppercase tracking-wide text-brand">Find us</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
              Your nearest branch
            </h2>
            <p className="text-graphite-600 text-[14.5px] mt-3 max-w-md leading-relaxed">
              Eight branches across South-East London and North-West Kent. Share your location
              or enter a postcode and we will sort them by distance.
            </p>

            <div className="flex flex-wrap gap-2 mt-7">
              <button
                onClick={useMyLocation}
                disabled={locating}
                className="btn btn-brand rounded-full btn-sm disabled:opacity-70"
              >
                {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
                {locating ? 'Locating…' : 'Use my location'}
              </button>
            </div>

            <form onSubmit={searchPostcode} className="flex items-center gap-2 bg-white border border-graphite-200 rounded-full p-1.5 mt-3 max-w-sm focus-within:border-ink transition-colors">
              <Search size={17} className="text-graphite-400 ml-3" />
              <input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="Or a postcode, e.g. SE18"
                aria-label="Your postcode"
                className="flex-1 bg-transparent outline-none text-ink placeholder:text-graphite-400 text-[13.5px] py-2"
              />
              <button type="submit" className="btn rounded-full btn-sm bg-ink text-white">Search</button>
            </form>

            {error && <p className="text-[12.5px] text-brand mt-3">{error}</p>}

            <div className="mt-6 min-h-[140px]">
              {nearest.length > 0 ? (
                <>
                  <div className="text-[12px] text-graphite-500 mb-2">
                    Nearest to <span className="font-semibold text-ink">{origin.label}</span>
                  </div>
                  <div className="space-y-2">
                    {nearest.map(({ branch: b, km }, i) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedId(b.id)}
                        aria-pressed={selectedId === b.id}
                        className={`w-full text-left flex items-center gap-3 bg-white rounded-xl px-4 py-3 border transition-colors ${
                          selectedId === b.id ? 'border-brand' : 'border-graphite-200 hover:border-ink'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold flex-none ${i === 0 ? 'bg-brand text-white' : 'bg-graphite-100 text-graphite-600'}`}>
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-semibold truncate">{b.area}</span>
                          <span className="block text-graphite-400 text-[12px] mono-data truncate">{b.addr} · {b.pc}</span>
                        </span>
                        {km != null && (
                          <span className="text-[12.5px] font-bold mono-data text-brand flex-none">{formatDistance(km)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-graphite-500">
                  Every branch offers the same repairs, warranty and account — the nearest is
                  simply the most convenient.
                </p>
              )}
            </div>

            <Link to="/branches" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink mt-6 hover:text-brand transition-colors">
              <MapPin size={15} /> See all 8 branches <ArrowRight size={15} />
            </Link>
          </div>

          {/* The map is the picture. It is a real, pannable map of the area the branches
              actually cover, rather than a globe of a planet they occupy one dot of. */}
          <div className="relative min-h-[340px] lg:min-h-[480px]">
            <Suspense fallback={<div className="absolute inset-0 bg-graphite-200 animate-pulse" />}>
              <BranchMap
                branches={branches}
                selectedId={selectedId}
                onSelect={(b) => setSelectedId(b.id)}
                height="100%"
                className="absolute inset-0 rounded-none border-0"
              />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  )
}
