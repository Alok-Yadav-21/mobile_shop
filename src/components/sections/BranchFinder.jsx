import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, ArrowRight, LocateFixed } from 'lucide-react'
import { BranchAPI } from '@/services/api.js'
import { useAsync } from '@/hooks/useAsync.js'

// The globe pulls in three.js and three-globe, which together are far larger than the rest of
// this page. Loading it lazily keeps that weight off anyone who never scrolls here.
const Globe3D = lazy(() =>
  import('@/components/ui-fx/Globe3D.jsx').then((m) => ({ default: m.Globe3D })),
)

// "Find a branch near you", with the globe as the visual and the postcode search as the
// thing that actually answers the question.
//
// The globe deliberately does not select a branch. All eight sit within about fifteen miles
// of each other, so picking between them by spinning a planet would mean zooming from orbit
// to street level to choose between shops a few minutes apart. It shows where the network is;
// the search and the list below decide which one you want.
export function BranchFinder() {
  const { data: branches = [] } = useAsync(() => BranchAPI.list(), [])
  const [postcode, setPostcode] = useState('')
  const [searched, setSearched] = useState(false)

  const points = useMemo(
    () => branches
      .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng))
      .map((b) => ({ lat: b.lat, lng: b.lng, color: '#F5333F', name: b.area })),
    [branches],
  )

  // Outward-code match, the same rule BranchAPI.nearest uses — kept here so the result is
  // instant rather than a round trip on every keystroke.
  const matches = useMemo(() => {
    const out = postcode.toUpperCase().replace(/\s+/g, '').match(/^[A-Z]{1,2}\d/)?.[0]
    if (!out) return []
    return branches.filter((b) => b.pc.replace(/\s+/g, '').startsWith(out))
  }, [postcode, branches])

  const results = searched && postcode.trim() ? matches : []

  return (
    <section className="container-x py-4">
      <div className="relative overflow-hidden rounded-3xl bg-ink-900 text-white">
        <div className="grid lg:grid-cols-[1fr_1fr] items-center">
          <div className="relative z-10 px-8 sm:px-12 py-12">
            <span className="text-[12px] font-bold uppercase tracking-wide text-brand">Find us</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
              8 branches, one network
            </h2>
            <p className="text-slate-300 text-[14.5px] mt-3 max-w-md leading-relaxed">
              Serving South-East London and North-West Kent. Enter your postcode and we will
              point you at the closest counter.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); setSearched(true) }}
              className="flex items-center gap-2 bg-white/[.06] border border-white/10 rounded-full p-1.5 mt-7 max-w-sm"
            >
              <Search size={17} className="text-slate-400 ml-3" />
              <input
                value={postcode}
                onChange={(e) => { setPostcode(e.target.value); setSearched(false) }}
                placeholder="Your postcode, e.g. SE18"
                aria-label="Your postcode"
                className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 text-[13.5px] py-2"
              />
              <button type="submit" className="btn btn-brand btn-sm rounded-full">Search</button>
            </form>

            <div className="mt-6 min-h-[92px]">
              {searched && postcode.trim() && results.length === 0 && (
                <p className="text-[13.5px] text-slate-300">
                  Nothing in <span className="font-semibold text-white">{postcode.toUpperCase()}</span> yet —
                  every branch serves the whole area, so pick whichever is easiest to reach.
                </p>
              )}

              {results.length > 0 && (
                <>
                  <div className="text-[12px] text-slate-400 mb-2">
                    {results.length} branch{results.length === 1 ? '' : 'es'} near {postcode.toUpperCase()}
                  </div>
                  <div className="space-y-2">
                    {results.slice(0, 3).map((b) => (
                      <div key={b.id} className="flex items-start gap-3 bg-white/[.05] border border-white/10 rounded-xl px-4 py-3">
                        <LocateFixed size={16} className="text-brand flex-none mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold">{b.area}</div>
                          <div className="text-slate-400 text-[12px] mono-data">{b.addr} · {b.pc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Link to="/branches" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-white mt-6 hover:text-brand transition-colors">
              <MapPin size={15} /> See all branches on the map <ArrowRight size={15} />
            </Link>
          </div>

          {/* Decorative: the branch names and addresses are all present as text on the left
              and on /branches, so nothing here is only available inside the canvas. */}
          <div className="relative h-[320px] lg:h-[440px]" aria-hidden="true">
            <Suspense fallback={null}>
              <Globe3D points={points} className="absolute inset-0" />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  )
}
