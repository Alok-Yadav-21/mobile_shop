// Put the repair bookings back to how a fresh database has them.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/reset-repairs.mjs
//
// For clearing out what testing leaves behind — half-finished bookings, probe rows, jobs assigned
// to whoever happened to be on screen — without resetting the whole database and losing the
// accounts, products and branches along with them.
//
// It removes every repair and everything hanging off one: the timeline, notes, parts, warranties
// and the notifications that announced any of it. Nothing else is touched — orders, trade-ins,
// loyalty balances, staff, stock and settings all stay as they are.
//
// The service role key bypasses every policy in the database. It is read from the environment,
// never written to a file and never sent to the browser. Run this from a terminal and nowhere
// else.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. For the local stack: npx supabase status -o env')
  process.exit(1)
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

// The four the seed ships with (supabase/seed/seed.sql). Kept in step with it by hand, which is
// the honest arrangement: the seed runs on a database that does not exist yet and this runs on
// one that does, so neither can be derived from the other.
const SEED_REPAIRS = [
  { reference: 'SPR-4805', branch_id: 'wol', device_category: 'Phone',  brand: 'Apple',   model: 'iPhone 13',  problem: 'Screen replacement',     fulfilment: 'in_store',   status: 'ready_for_collection',   quote: 119 },
  { reference: 'SPR-4806', branch_id: 'blv', device_category: 'Laptop', brand: 'Dell',    model: 'XPS 13',     problem: 'Battery replacement',    fulfilment: 'collection', status: 'repair_in_progress',     quote: 95 },
  { reference: 'SPR-4807', branch_id: 'sid', device_category: 'Phone',  brand: 'Samsung', model: 'Galaxy S22', problem: 'Charging-port repair',   fulfilment: 'in_store',   status: 'quote_awaiting_approval', quote: 69 },
  { reference: 'SPR-4808', branch_id: 'wol', device_category: 'Tablet', brand: 'Apple',   model: 'iPad Air',   problem: 'Water-damage check',     fulfilment: 'in_store',   status: 'booking_received',       quote: null },
]
// Where the reference counter starts again, so the next booking is SPR-4809 rather than carrying
// on from whatever testing reached.
const NEXT_REFERENCE = 4809

const step = async (label, run) => {
  const { error, count } = await run()
  if (error) { console.error(`  FAILED   ${label}: ${error.message}`); process.exitCode = 1; return }
  console.log(`  ${label}${count == null ? '' : ` — ${count}`}`)
}

// Notifications carry the reference of the thing they are about, so the ones raised by a repair
// can be found without guessing from their wording. Cleared for everybody: a notice about a
// repair that no longer exists is a dead link in somebody's bell.
await step('cleared repair notifications', () =>
  db.from('notifications').delete({ count: 'exact' }).like('reference', 'SPR-%'))

// Loyalty movements are deliberately left alone, including the ones a repair earned. A balance
// is never stored — it is the sum of the movements — so removing one is not tidying up, it is
// taking points off somebody. The first version of this script deleted them and left every
// redemption those points had already paid for standing on its own: the demo customer's balance
// went to -110. An entry citing a repair that no longer exists is untidy; a negative balance is
// wrong.

// warranties.repair_id has no cascade on it, so a warranty raised against a repair would hold the
// delete below open. Only the repair-backed ones — a warranty on a purchase is an order's.
await step('cleared repair warranties', () =>
  db.from('warranties').delete({ count: 'exact' }).not('repair_id', 'is', null))

// The timeline, notes, parts and assignments all cascade from this one delete.
await step('cleared repairs', () =>
  db.from('repairs').delete({ count: 'exact' }).not('id', 'is', null))

await step('restored the four seeded repairs', () =>
  db.from('repairs').insert(SEED_REPAIRS, { count: 'exact' }))

const { error: seqError } = await db.rpc('reset_repair_reference_seq', { p_next: NEXT_REFERENCE })
if (seqError) {
  // Not fatal, and not worth a migration of its own to avoid: the sequence only decides what the
  // next reference reads, and a gap in the numbering is untidy rather than wrong.
  console.log(`  note: reference counter left where it was — ${seqError.message}`)
} else {
  console.log(`  reference counter set to SPR-${NEXT_REFERENCE}`)
}

// The seeded repairs are walk-ins with nobody attached, which leaves the demo customer's
// dashboard empty. Give them back the two the demo screens talk about — the same two
// scripts/seed-auth-users.mjs links.
const { data: users } = await db.auth.admin.listUsers({ perPage: 200 })
const customer = users?.users?.find((u) => u.email === 'customer@demo.com')
if (customer) {
  await step('linked SPR-4805 and SPR-4807 to customer@demo.com', () =>
    db.from('repairs').update({ customer_id: customer.id }).in('reference', ['SPR-4805', 'SPR-4807']))
}

console.log('\nRepairs reset.')
