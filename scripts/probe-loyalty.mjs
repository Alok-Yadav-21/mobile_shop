// Attack the loyalty scheme over HTTP, as the app reaches it.
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/probe-loyalty.mjs
//
// Points are money owed to a customer, so the questions worth asking are the ones about somebody
// helping themselves: writing the ledger directly, spending a balance twice, spending somebody
// else's, or pushing a balance below zero. The SQL suite checks the same rules with `set role`;
// this checks them with real signed-in sessions and the anon key that ships in the bundle.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anonKey || !serviceKey) {
  console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.')
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

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
const customer = await as('customer@demo.com', 'demo-customer-1')
const staff = await as('staff@demo.com', 'demo-staff-1')
const tech = await as('tech@demo.com', 'demo-tech-1')
const adminUser = await as('admin@demo.com', 'demo-admin-1')

const ids = {}
for (const [name, c] of Object.entries({ customer, staff, tech, adminUser })) {
  ids[name] = (await c.auth.getUser()).data.user.id
}

const balance = async (who = ids.customer) => {
  const { data } = await admin.from('loyalty_balances').select('points').eq('customer_id', who).maybeSingle()
  return Number(data?.points ?? 0)
}

console.log('\n== earning ==')
// A repair at the demo staff's own branch, quoted, and taken to completion by the service role.
const ref = `SPR-LOY-${Date.now()}`
await admin.from('repairs').insert({
  reference: ref, customer_id: ids.customer, branch_id: 'wol', device_category: 'iPhone',
  brand: 'Apple', model: 'iPhone 13', problem: 'Loyalty probe', status: 'ready_for_collection', quote: 119,
})
check(await balance() === 0, 'nothing is earned before the device is handed back', `balance ${await balance()}`)

await admin.from('repairs').update({ status: 'completed' }).eq('reference', ref)
check(await balance() === 55, 'a £119 repair earns 55 points', `balance ${await balance()}`)

// Completing it again must not pay twice.
await admin.from('repairs').update({ status: 'ready_for_collection' }).eq('reference', ref)
const afterBack = await balance()
await admin.from('repairs').update({ status: 'completed' }).eq('reference', ref)
check(afterBack === 0 && await balance() === 55,
  'moving it back and forward again returns then re-pays, and nets the same',
  `back ${afterBack}, forward ${await balance()}`)

console.log('\n== writing the ledger by hand ==')
for (const [who, client, target] of [
  ['a customer', customer, ids.customer],
  ['a staff member', staff, ids.staff],
  ['an admin', adminUser, ids.adminUser],
]) {
  const before = await balance(target)
  await client.from('loyalty_entries').insert({ customer_id: target, delta: 10000, kind: 'adjusted', note: 'free points' })
  check(await balance(target) === before, `${who} awards themselves points`)
}

console.log('\n== reading somebody else’s ==')
const { data: mine } = await customer.from('loyalty_entries').select('customer_id')
check((mine ?? []).every((e) => e.customer_id === ids.customer),
  'a customer reads only their own movements', `saw ${(mine ?? []).length}`)
const { data: seenByStaff } = await staff.from('loyalty_entries').select('id').eq('customer_id', ids.customer)
check((seenByStaff ?? []).length > 0, 'staff read the balance of the customer they are serving')

console.log('\n== adjusting ==')
const rpc = async (client, fn, args) => {
  const { data, error } = await client.rpc(fn, args)
  return { data, error: error?.message ?? null }
}
check(!!(await rpc(staff, 'loyalty_adjust', { p_customer: ids.customer, p_delta: 500, p_reason: 'because' })).error,
  'a staff member adjusts a balance')
check(!!(await rpc(adminUser, 'loyalty_adjust', { p_customer: ids.customer, p_delta: 500, p_reason: '  ' })).error,
  'an admin adjusts with no reason')
check(!!(await rpc(adminUser, 'loyalty_adjust', { p_customer: ids.customer, p_delta: -9999, p_reason: 'clawback' })).error,
  'an adjustment that would go below zero')
check(!(await rpc(adminUser, 'loyalty_adjust', { p_customer: ids.customer, p_delta: 45, p_reason: 'Goodwill' })).error,
  'an admin adjusts with a reason')
check(await balance() === 100, 'and the balance follows', `balance ${await balance()}`)

console.log('\n== spending ==')
const orderRef = `ORD-LOY-${Date.now()}`
const spend = await rpc(customer, 'loyalty_redeem', {
  p_customer: ids.customer, p_points: 999, p_total: 40, p_source_type: 'order', p_source_ref: orderRef,
})
check(spend.data === 40, 'a redemption is trimmed to the 20% cap on a £40 bill', `took ${spend.data}`)

const again = await rpc(customer, 'loyalty_redeem', {
  p_customer: ids.customer, p_points: 10, p_total: 40, p_source_type: 'order', p_source_ref: orderRef,
})
check(!!again.error, 'the same transaction is redeemed against twice', again.error ?? 'ALLOWED')

const theirs = await rpc(tech, 'loyalty_redeem', {
  p_customer: ids.customer, p_points: 10, p_total: 100, p_source_type: 'order', p_source_ref: `${orderRef}-staff`,
})
// Staff spending on a customer's behalf at the counter is allowed; a customer spending someone
// else's is not.
check(!theirs.error, 'staff spend a customer’s points at the counter', theirs.error ?? '')

const notMine = await rpc(customer, 'loyalty_redeem', {
  p_customer: ids.staff, p_points: 10, p_total: 100, p_source_type: 'order', p_source_ref: `${orderRef}-other`,
})
check(!!notMine.error, 'a customer spends somebody else’s points', notMine.error ?? 'ALLOWED')

const huge = await rpc(customer, 'loyalty_redeem', {
  p_customer: ids.customer, p_points: 999999, p_total: 999999, p_source_type: 'order', p_source_ref: `${orderRef}-huge`,
})
check(await balance() >= 0, 'the balance never goes negative', `balance ${await balance()}, took ${huge.data}`)

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
