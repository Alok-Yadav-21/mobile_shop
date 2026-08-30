import { useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BRANCHES } from '@/data/branches.js'

// The branch picker. Every branch is a pin on a map of the area they actually cover, which
// for eight shops a few miles apart is the fastest way to choose one — see BranchGlobe.jsx
// for the globe, which is a brand visual rather than a control.

// Leaflet's default marker icon resolves its image by URL relative to the CSS, which breaks
// under a bundler. A divIcon sidesteps that entirely and lets the pin carry brand styling.
function pinIcon(selected) {
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block;width:${selected ? 20 : 15}px;height:${selected ? 20 : 15}px;
      border-radius:9999px;
      background:${selected ? '#4F46E5' : '#ffffff'};
      border:3px solid ${selected ? '#ffffff' : '#4F46E5'};
      box-shadow:0 2px 10px rgba(15,23,42,.35);
      transition:all .15s ease;
    "></span>`,
    iconSize: selected ? [20, 20] : [15, 15],
    iconAnchor: selected ? [10, 10] : [7.5, 7.5],
  })
}

// Recentres the map when the selection changes from outside (e.g. a list click), without
// remounting the map — MapContainer props are immutable after the first render.
function FlyToSelected({ branch }) {
  const map = useMap()
  const lastId = useRef(null)
  if (branch && branch.id !== lastId.current && Number.isFinite(branch.lat)) {
    lastId.current = branch.id
    map.flyTo([branch.lat, branch.lng], 13, { duration: 0.8 })
  }
  return null
}

export function BranchMap({ branches = BRANCHES, selectedId, onSelect, height = 420, className = '' }) {
  const pins = useMemo(
    () => branches.filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng)),
    [branches],
  )

  // Frame all the branches on first render rather than hardcoding a centre, so adding a
  // branch outside the current area still shows up without touching this component.
  const bounds = useMemo(() => {
    if (pins.length === 0) return null
    return L.latLngBounds(pins.map((b) => [b.lat, b.lng])).pad(0.25)
  }, [pins])

  const selected = pins.find((b) => b.id === selectedId) || null

  if (!bounds) return null

  return (
    <div className={`rounded-2xl overflow-hidden border border-graphite-200 ${className}`} style={{ height }}>
      <MapContainer
        bounds={bounds}
        scrollWheelZoom={false}   /* wheel scrolls the page, not the map — the map is inline content */
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToSelected branch={selected} />
        {pins.map((b) => (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={pinIcon(b.id === selectedId)}
            eventHandlers={{ click: () => onSelect?.(b) }}
            title={b.area}
          >
            <Popup>
              <span className="font-bold text-[13px]">{b.area}</span>
              <br />
              <span className="text-[12px]">{b.local}</span>
              <br />
              <span className="text-[12px]">{b.addr}</span>
              <br />
              <span className="text-[12px] font-mono">{b.pc}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
