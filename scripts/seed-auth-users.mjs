// Create the demo accounts in Supabase Auth and link their profiles.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-auth-users.mjs
//
// Against the local stack the CLI prints both values, so:
//   npx supabase status -o env      # copy API_URL and SERVICE_ROLE_KEY
//
// Why a script and not SQL: profiles.id is a foreign key to auth.users.id, and auth.users is
// GoTrue's table — a row inserted by hand has no usable password hash and no identity record,
// so the account exists and cannot sign in. seed.sql used to end with a comment telling you to
// create three users by hand in the dashboard and paste their UUIDs back in. This does that.
//
// The service role key bypasses every row-level policy in the database. It is read from the
// environment and never written to a file, never committed, and never sent to the browser —
// nothing under src/ may import it. Run this from a terminal and nowhere else.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. For the local stack: npx supabase status -o env')
  process.exit(1)
}

// Demo passwords for a local stack that is thrown away on every reset. A real deployment does
// not seed accounts: staff accounts are created by an admin from the Staff page, which issues a
// password the person must change, and customers register themselves.
const ACCOUNTS = [
  { email: 'customer@demo.com', password: 'demo-customer-1', name: 'Alex Kaur',     role: 'customer', branch: null,  phone: '07700 900123' },
  { email: 'staff@demo.com',    password: 'demo-staff-1',    name: 'Sam Patel',     role: 'staff',    branch: 'wol', phone: null },
  { email: 'tech@demo.com',     password: 'demo-tech-1',     name: 'Priya Shah',    role: 'staff',    branch: 'wol', phone: null },
  { email: 'admin@demo.com',    password: 'demo-admin-1',    name: 'Central Admin', role: 'admin',    branch: null,  phone: null, superAdmin: true },
]

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function findByEmail(email) {
  // listUsers is paginated; the demo set is small enough that one page covers it.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error
  return data.users.find((u) => u.email === email) ?? null
}

for (const account of ACCOUNTS) {
  let user = await findByEmail(account.email)
  if (user) {
    console.log(`  exists   ${account.email}`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true, // no inbox on a local stack, and nothing to confirm against
    })
    if (error) { console.error(`  FAILED   ${account.email}: ${error.message}`); process.exitCode = 1; continue }
    user = data.user
    console.log(`  created  ${account.email}`)
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    full_name: account.name,
    email: account.email,
    phone: account.phone,
    role: account.role,
    branch_id: account.branch,
    super_admin: !!account.superAdmin,
  }, { onConflict: 'id' })
  if (profileError) { console.error(`  FAILED   profile for ${account.email}: ${profileError.message}`); process.exitCode = 1 }
}

// The seeded repairs are walk-ins with no customer attached, which leaves the demo customer's
// dashboard empty on a fresh database. Give them the two that the demo screens talk about.
const customer = await findByEmail('customer@demo.com')
if (customer) {
  const { error } = await admin.from('repairs').update({ customer_id: customer.id }).in('reference', ['SPR-4805', 'SPR-4807'])
  if (error) console.error(`  note: could not attach demo repairs — ${error.message}`)
  else console.log('  linked   SPR-4805, SPR-4807 to customer@demo.com')
}

console.log('\nDone. Sign in with any of: ' + ACCOUNTS.map((a) => a.email).join(', '))
