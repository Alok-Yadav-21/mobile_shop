import { Smartphone, Laptop, Tablet, Headphones, Watch, Wrench, MonitorSmartphone, Speaker } from 'lucide-react'

// A service's icon crosses the wire as a name and is drawn as a component.
//
// The two adapters disagreed about which it was. The mock re-attached the real lucide component
// on every read; the Supabase adapter handed back the string the database stores, and the admin
// Services page rendered it straight — so React saw `<Smartphone />` as an unknown HTML tag, drew
// nothing, and logged a casing warning for every row. Creating a service had the same problem in
// reverse: the page passed the component itself, which is not something a text column can hold.
//
// One resolver, both directions, so neither adapter has to know what the other assumes.
const ICONS = {
  Smartphone, Laptop, Tablet, Headphones, Watch, Wrench, MonitorSmartphone, Speaker,
}

/** The component for a stored icon name. Anything unrecognised falls back to a wrench. */
export function serviceIcon(name) {
  if (!name) return Wrench
  if (typeof name !== 'string') return name    // already a component
  return ICONS[name] ?? Wrench
}

/** The name to store for an icon, given either a name or a lucide component. */
export function serviceIconName(icon) {
  if (!icon) return 'Wrench'
  if (typeof icon === 'string') return ICONS[icon] ? icon : 'Wrench'
  const named = icon.displayName || icon.name
  return ICONS[named] ? named : 'Wrench'
}
