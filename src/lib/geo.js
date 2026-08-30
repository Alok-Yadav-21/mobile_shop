// Distance helpers for "which branch is nearest me". Pure functions over the lat/lng already
// carried by every branch record, so the answer is computed locally with no lookup service.

const EARTH_RADIUS_KM = 6371
const toRad = (deg) => (deg * Math.PI) / 180

// Great-circle distance. Haversine rather than a flat approximation: the branches are close
// enough that either would do, but this stays correct if a branch ever opens further out.
export function distanceKm(a, b) {
  if (!a || !b) return null
  const [lat1, lng1, lat2, lng2] = [a.lat, a.lng, b.lat, b.lng]
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const kmToMiles = (km) => (km == null ? null : km * 0.621371)

// Distance a person actually reads. Under a mile is more useful in yards than as "0.4 mi".
export function formatDistance(km) {
  const mi = kmToMiles(km)
  if (mi == null) return ''
  if (mi < 0.2) return `${Math.round(mi * 1760)} yd`
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`
}

// Every branch, nearest first. Branches without coordinates sort last rather than being
// dropped — a branch with missing data should still be reachable, just not ranked.
export function branchesByDistance(branches, origin) {
  if (!origin) return branches.map((b) => ({ branch: b, km: null }))
  return branches
    .map((b) => ({ branch: b, km: distanceKm(origin, b) }))
    .sort((a, b) => {
      if (a.km == null) return 1
      if (b.km == null) return -1
      return a.km - b.km
    })
}

// UK outward code — the part before the space ("SE18 6EX" -> "SE18").
//
// Matching the outward pattern from the front does not work on a postcode typed without a
// space: the optional fourth character swallows the first digit of the inward code, turning
// "BR52RG" into "BR52" instead of "BR5". The inward code is always exactly three characters,
// so a full postcode is split from the end instead, and anything shorter is treated as an
// outward code in its own right.
const FULL_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/
const OUTWARD_ONLY = /^[A-Z]{1,2}\d[A-Z\d]?$/

export function outwardCode(postcode) {
  const clean = String(postcode || '').toUpperCase().replace(/\s+/g, '')
  if (FULL_POSTCODE.test(clean)) return clean.slice(0, -3)
  if (OUTWARD_ONLY.test(clean)) return clean
  return null
}

// Approximate centres for the outward codes the branches actually serve. A real deployment
// would call a postcode API; this keeps the feature working offline and with no key, and the
// result is only used to rank branches that are all within a few miles anyway.
export const AREA_CENTRES = {
  SE18: { lat: 51.4894, lng: 0.0640 },  // Woolwich
  SE9:  { lat: 51.4404, lng: 0.0520 },  // Eltham / New Eltham
  SE28: { lat: 51.5015, lng: 0.1140 },  // Thamesmead
  DA17: { lat: 51.4920, lng: 0.1520 },  // Belvedere
  DA15: { lat: 51.4310, lng: 0.1030 },  // Sidcup
  DA16: { lat: 51.4640, lng: 0.1120 },  // Welling
  DA6:  { lat: 51.4560, lng: 0.1450 },  // Bexleyheath
  DA7:  { lat: 51.4650, lng: 0.1500 },  // Bexleyheath / Barnehurst
  BR5:  { lat: 51.3990, lng: 0.1060 },  // Orpington
  BR6:  { lat: 51.3730, lng: 0.0990 },  // Orpington south
  BR1:  { lat: 51.4060, lng: 0.0150 },  // Bromley
  SE2:  { lat: 51.4890, lng: 0.1180 },  // Abbey Wood
}

// Where to centre the search for a typed postcode. Falls back to the matching branch's own
// coordinates when the area is not in the table, so an unlisted postcode still ranks sensibly
// instead of returning nothing.
export function locatePostcode(postcode, branches = []) {
  const code = outwardCode(postcode)
  if (!code) return null
  if (AREA_CENTRES[code]) return { ...AREA_CENTRES[code], code }

  const match = branches.find((b) => outwardCode(b.pc) === code)
  return match && Number.isFinite(match.lat) ? { lat: match.lat, lng: match.lng, code } : null
}
