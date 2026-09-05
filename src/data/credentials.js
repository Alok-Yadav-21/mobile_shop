// Starting sign-in details for the seeded accounts in src/data/users.js.
//
// These are demo credentials for a store with no server: they are hashed on first use (see
// src/services/credentialStore.js) and the plaintext here is never written to storage. In a
// real deployment this file does not exist — accounts are created by an admin, who issues the
// first password, and Supabase Auth holds the hashes.
//
// Customers have no username: they register themselves and sign in with the email they chose.
// Staff are issued a username by an admin, because a technician on the shop floor should not
// need a personal email address to clock in.
export const SEED_CREDENTIALS = [
  { userId: 'u1',  password: 'customer123' },
  { userId: 'u2',  username: 'sam.patel',      password: 'staff1234' },
  { userId: 'u3',  username: 'admin',          password: 'admin1234' },
  { userId: 'u4',  username: 'priya.shah',     password: 'staff1234' },
  { userId: 'u5',  username: 'aman.singh',     password: 'staff1234' },
  { userId: 'u6',  username: 'jason.clarke',   password: 'staff1234' },
  { userId: 'u7',  username: 'leah.morgan',    password: 'staff1234' },
  { userId: 'u8',  username: 'ravi.chauhan',   password: 'staff1234' },
  { userId: 'u9',  username: 'nadia.hassan',   password: 'staff1234' },
  { userId: 'u10', username: 'dan.whitfield',  password: 'staff1234' },
  { userId: 'u11', username: 'ellie.brooks',   password: 'staff1234' },
  { userId: 'u12', username: 'marcus.reid',    password: 'staff1234' },
]

// Shown on the sign-in screen so the demo is usable at all. Nothing here is read by the auth
// code — it only labels the seeds above.
export const DEMO_SIGN_IN = [
  { label: 'Customer', identifier: 'customer@demo.com', password: 'customer123' },
  { label: 'Staff / technician', identifier: 'sam.patel', password: 'staff1234' },
  { label: 'Central admin', identifier: 'admin@demo.com', password: 'admin1234' },
]
