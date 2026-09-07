// Does the staff-accounts function let the right people do the right things, and nobody else?
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/probe-staff-accounts.mjs
//
// This endpoint holds the service role key, which bypasses every policy in the database. It is
// the one place in the system where "the caller is an admin" is checked by code rather than by
// Postgres, so it is worth attacking directly rather than trusting the app not to call it.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
if (!url || !anonKey) { console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY.'); process.exit(1) }

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

const call = async (client, body) => {
  const { data, error } = await client.functions.invoke('staff-accounts', { body })
  if (error) {
    let detail = null
    try { detail = (await error.context?.json?.())?.error } catch { /* no body */ }
    return { error: detail ?? error.message }
  }
  return data?.error ? { error: data.error } : { data }
}

const customer = await as('customer@demo.com', 'demo-customer-1')
const staff = await as('staff@demo.com', 'demo-staff-1')
const admin = await as('admin@demo.com', 'demo-admin-1')

console.log('\n== who may create a staff account ==')
const newAccount = {
  action: 'create', email: `probe-${Date.now()}@demo.local`, name: 'Probe Technician',
  role: 'staff', username: `probe.tech.${Date.now()}`, password: 'probe-pass-1', branch: 'wol',
}

const byCustomer = await call(customer, { ...newAccount, email: `c-${newAccount.email}` })
check(!!byCustomer.error, 'a customer creates a staff account', byCustomer.error ?? 'ALLOWED')

const byStaff = await call(staff, { ...newAccount, email: `s-${newAccount.email}` })
check(!!byStaff.error, 'a staff member creates a staff account', byStaff.error ?? 'ALLOWED')

const byAdmin = await call(admin, newAccount)
check(!byAdmin.error && !!byAdmin.data?.id, 'an admin creates a staff account', byAdmin.error ?? byAdmin.data?.username)

console.log('\n== what it refuses on the way in ==')
const weak = await call(admin, { ...newAccount, email: `w-${newAccount.email}`, password: 'short' })
check(/at least 8/.test(weak.error ?? ''), 'a password too short to be one', weak.error ?? 'ALLOWED')

const badName = await call(admin, { ...newAccount, email: `u-${newAccount.email}`, username: 'a b c' })
check(/username/i.test(badName.error ?? ''), 'a username with spaces in it', badName.error ?? 'ALLOWED')

const asAdminRole = await call(staff, { ...newAccount, email: `x-${newAccount.email}`, role: 'admin' })
check(!!asAdminRole.error, 'a staff member creates an admin account', asAdminRole.error ?? 'ALLOWED')

console.log('\n== the account that was made ==')
const created = byAdmin.data
if (created?.id) {
  // It must arrive as staff, at the right branch, owing a password change.
  const { data: profile } = await admin.from('profiles')
    .select('role, branch_id, username, must_change_password, password_change_allowed')
    .eq('id', created.id).single()
  check(profile?.role === 'staff', 'is staff, not the customer the signup trigger makes', profile?.role)
  check(profile?.branch_id === 'wol', 'is at the branch it was given', profile?.branch_id)
  check(profile?.must_change_password === true, 'owes a password change')
  check(profile?.password_change_allowed === true, 'and is allowed to make it')

  // And it must actually be able to sign in, by username as well as by email.
  const signedIn = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error: pwError } = await signedIn.auth.signInWithPassword({ email: newAccount.email, password: 'probe-pass-1' })
  check(!pwError, 'can sign in with the password the admin issued', pwError?.message)

  const { data: resolved } = await signedIn.rpc('email_for_username', { p_username: newAccount.username })
  check(resolved === newAccount.email, 'and its username resolves for sign-in', resolved ?? 'no match')

  console.log('\n== resetting and removing ==')
  const reset = await call(staff, { action: 'issue-credentials', userId: created.id, password: 'hijacked-1' })
  check(!!reset.error, 'a staff member resets a colleague’s password', reset.error ?? 'ALLOWED')

  const adminReset = await call(admin, { action: 'issue-credentials', userId: created.id, password: 'reissued-99' })
  check(!adminReset.error, 'an admin reissues a password', adminReset.error ?? '')

  const afterReset = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error: newPw } = await afterReset.auth.signInWithPassword({ email: newAccount.email, password: 'reissued-99' })
  check(!newPw, 'the new password works', newPw?.message)

  const selfDelete = await call(admin, { action: 'forget-credentials', userId: (await admin.auth.getUser()).data.user.id })
  check(!!selfDelete.error, 'an admin deletes their own sign-in', selfDelete.error ?? 'ALLOWED')

  const removed = await call(admin, { action: 'forget-credentials', userId: created.id })
  check(!removed.error, 'an admin removes the account they made', removed.error ?? '')
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
