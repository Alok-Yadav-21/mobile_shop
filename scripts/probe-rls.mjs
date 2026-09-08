// Attack the running stack over HTTP, as the app itself would reach it.
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/probe-rls.mjs
//
// supabase/tests/authz.test.sql checks the same rules inside Postgres with `set role`. This
// checks them through PostgREST with a real signed-in session, which is the path an attacker
// actually has: the anon key ships in the bundle, so anyone can sign in as themselves and then
// send whatever request they like. Nothing in the app is between them and this.
//
// Every check reads the row back afterwards, because a blocked UPDATE is not an error — it
// matches no rows and returns success. Testing for a thrown error would pass a database with no
// policies at all.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY (npx supabase status -o env).')
  process.exit(1)
}

const as = async (email, password) => {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`${email}: ${error.message}`)
  return client
}

let failures = 0
const check = (ok, label, detail = '') => {
  if (!ok) failures += 1
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

const customer = await as('customer@demo.com', 'demo-customer-1')
const staff = await as('staff@demo.com', 'demo-staff-1')
const tech = await as('tech@demo.com', 'demo-tech-1')
const admin = await as('admin@demo.com', 'demo-admin-1')

const ids = {}
for (const [name, c] of Object.entries({ customer, staff, tech, admin })) {
  const { data } = await c.auth.getUser()
  ids[name] = data.user.id
}

// A repair of this probe's own, booked by the demo customer at the demo staff's own branch.
//
// Using a seeded one is what a first draft of this did, and it quietly tested the wrong thing:
// SPR-4806 sits at Belvedere while both demo staff are at Woolwich, so half these checks were
// passing on the branch policy rather than on the assignment rule they name. A repair the staff
// can definitely reach is the only way the refusals below mean what they say.
const { data: booked, error: bookError } = await customer
  .from('repairs')
  .insert({
    customer_id: ids.customer, branch_id: 'wol', device_category: 'iPhone',
    brand: 'Apple', model: 'iPhone 13', problem: 'RLS probe', status: 'diagnostics',
  })
  .select('reference')
  .single()
if (bookError) { console.error(`Could not book a repair to probe: ${bookError.message}`); process.exit(1) }
const REF = booked.reference

const statusOf = async (ref) => {
  const { data } = await admin.from('repairs').select('status, technician_id, quote').eq('reference', ref).single()
  return data
}
const move = async (client, ref, patch) => {
  const { error } = await client.from('repairs').update(patch).eq('reference', ref)
  return error?.message ?? null
}

console.log('\n== a repair belongs to the technician it was given to ==')
let before = await statusOf(REF)
await move(staff, REF, { status: 'device_received' })
check((await statusOf(REF)).status === before.status, 'unassigned repair, any staff member')

await move(staff, REF, { technician_id: ids.staff })
check((await statusOf(REF)).technician_id === null, 'staff member assigns the job to themselves')

await move(admin, REF, { technician_id: ids.tech })
check((await statusOf(REF)).technician_id === ids.tech, 'admin assigns it')

await move(staff, REF, { status: 'device_received' })
check((await statusOf(REF)).status === before.status, 'colleague moves someone else’s job')

await move(admin, REF, { status: 'quality_check' })
check((await statusOf(REF)).status === before.status, 'admin records progress')

console.log('\n== the quote ==')
await move(tech, REF, { status: 'quote_awaiting_approval', quote: null })
check((await statusOf(REF)).status !== 'quote_awaiting_approval', 'quote sent with no amount on it')

await move(tech, REF, { quote: 245 })
const seen = await customer.from('repairs_for_customer').select('quote').eq('reference', REF).maybeSingle()
check(seen.data == null || seen.data.quote == null, 'customer cannot read a quote that has not been sent')

console.log('\n== reading other people’s records ==')
// The property, not a list of references. Naming the three it should see made this fail the
// moment another probe booked a repair for the same customer — which is a dirty database, not a
// leak, and a check that cannot tell those apart is worse than no check.
const otherRepairs = await customer.from('repairs').select('reference, customer_id')
const { count: totalRepairs } = await admin.from('repairs').select('*', { count: 'exact', head: true })
check(
  (otherRepairs.data ?? []).length > 0
    && (otherRepairs.data ?? []).every((r) => r.customer_id === ids.customer)
    && (otherRepairs.data ?? []).length < (totalRepairs ?? 0),
  'customer reads only their own repairs',
  `saw ${(otherRepairs.data ?? []).length} of ${totalRepairs}`)

// Something to leak. "Nobody could read it" is not a finding when there was nothing there:
// with the policy removed these checks would still have passed against empty tables.
await admin.from('stock_purchases').insert({ branch_id: 'wol', quantity: 4, unit_cost: 212.5, supplier: 'Probe Supplier', product_name: 'Probe part' })
await admin.from('audit_logs').insert({ actor_id: ids.admin, actor_role: 'admin', action: 'probe', entity_type: 'probe', entity_id: 'probe-1' })

const { data: adminCosts } = await admin.from('stock_purchases').select('id')
check((adminCosts ?? []).length > 0, 'admin may read stock costs', `saw ${(adminCosts ?? []).length}`)

for (const [who, client] of [['customer', customer], ['staff', staff]]) {
  const { data } = await client.from('stock_purchases').select('id')
  check((data ?? []).length === 0, `${who} reads what stock cost the business`, `saw ${(data ?? []).length}`)
}

// A rate on somebody else's account, so "saw 1" means their own and not an empty table.
await admin.from('profiles').update({ hourly_rate: 15.5 }).eq('id', ids.tech)
const { data: rates } = await staff.from('visible_pay_rates').select('id')
check((rates ?? []).length <= 1 && !(rates ?? []).some((r) => r.id === ids.tech),
  'staff read a colleague’s pay rate', `saw ${(rates ?? []).length}`)

const { data: audit } = await customer.from('audit_logs').select('id')
check((audit ?? []).length === 0, 'customer reads the audit log', `saw ${(audit ?? []).length}`)

console.log('\n== promoting yourself ==')
await staff.from('profiles').update({ role: 'admin' }).eq('id', ids.staff)
const { data: promoted } = await admin.from('profiles').select('role').eq('id', ids.staff).single()
check(promoted.role === 'staff', 'staff member makes themselves an admin')

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
