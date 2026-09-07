# Going live

What is finished, what is not, and the exact steps for the parts only you can do.

Written after standing the whole thing up on a real Postgres and attacking it. Every command
here has been run.

---

## Where the four blockers stand

| | Status |
|---|---|
| **1. Backend** | **Built and verified.** Schema, row-level security, the workflow rules, the seed, the account machinery. It runs. |
| **2. Payments** | **Not built.** Needs your Stripe account. See below — this is the one that stops you trading. |
| **3. Real logins** | **Built.** Supabase Auth, real password hashing, an admin issuing staff credentials, no demo passwords in a live build. |
| **4. Legal pages** | **Yours and a solicitor's.** See `LEGAL-CHECKLIST.md`. Do it after 1–3, not before. |

---

## Running it locally

Everything below works today with nothing but Docker installed.

```bash
npx supabase start
```

Starts Postgres, Auth and the API in containers, applies every migration in
`supabase/migrations/`, and loads the seed — 8 branches, 8 categories, 29 products with their
photographs and opening stock, 8 services and 4 demo repairs.

```bash
npx supabase status -o env
```

Prints the local URL and keys. Put the first two in `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<the ANON_KEY it printed>
VITE_FORCE_MOCK_BACKEND=false
```

Then the demo accounts (see "Creating accounts" for why this is a script and not SQL):

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY> node scripts/seed-auth-users.mjs
```

`npm run dev`, and the app is on the database. `VITE_FORCE_MOCK_BACKEND=true` switches back to
the browser-only demo at any time — useful for showing the shop with ninety days of trading
history behind the reports.

### Checking it still holds

```bash
bash supabase/tests/run.sh
```

Applies every migration to a throwaway Postgres and then attacks the result as each role — 55
checks. It reports whether a row actually moved rather than whether an error was raised, because
a blocked UPDATE is not an error: it matches nothing and returns success. Testing for exceptions
would pass a database with no policies at all.

```bash
node scripts/probe-rls.mjs           # the same rules, over HTTP, with real signed-in sessions
node scripts/probe-staff-accounts.mjs # the admin-only account endpoint, attacked directly
```

Both need `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the environment.

---

## Deploying to a real Supabase project

**You have to create the project.** Signing up means agreeing to their terms and holding the
billing, which is yours to do.

1. Create a project at supabase.com. Note the region — put it in the UK or Ireland, because your
   privacy policy has to say where customer data lives.
2. Link and push the schema:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. Deploy the account function:
   ```bash
   npx supabase functions deploy staff-accounts
   ```
4. **Create your own admin account.** Register through the app like any customer, then in the
   Supabase SQL editor:
   ```sql
   update profiles set role = 'admin', super_admin = true where email = 'you@yourdomain.co.uk';
   ```
   This is the one thing that has to be done in SQL. Promoting an account to admin requires an
   existing super admin — correctly, or anyone could promote themselves — and on a new database
   there isn't one yet.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your host's environment variables
   (Vercel, Netlify, wherever). Do **not** commit them, and never put the service role key in a
   `VITE_` variable — anything prefixed `VITE_` is compiled into the JavaScript every visitor
   downloads. The service role key bypasses every security policy in the database.
6. Do **not** run the seed against a real project unless you want the demo products. The
   branches and services are real; the products are stock photographs.

### After deploying, before trading

- **Replace the product photographs.** They are Unsplash images standing in for stock you
  haven't listed yet. `src/assets/img/ATTRIBUTION.md` has the details and the warning: the
  brand names describe the type of product, not the exact unit in the picture. Selling a "Lenovo
  ThinkPad" illustrated by someone else's laptop is a description problem before it is a
  copyright one.
- **Check every price and every warranty period.** They are placeholders.

---

## Payments — what is missing and why

The checkout marks an order paid and takes no money. That is now visible rather than hidden:
those orders carry a payment status of "no payment taken", they are excluded from every revenue
report, and the admin's Payments screen shows them separately as *Not taken*. Before this, the
reports added up money the shop had never received.

**To take real payments you need a Stripe account.** I can't create one for you, and I must not
handle the secret key — it goes in your own environment.

What it involves, so you can judge the work:

1. A Stripe account, and its publishable and secret keys.
2. An edge function that creates a PaymentIntent — the secret key lives there, never in the
   browser. The same pattern as `supabase/functions/staff-accounts`, which already works.
3. Stripe Elements on the checkout page to collect the card, using the publishable key.
4. **A webhook** that marks the order paid when Stripe confirms it. This is the part that
   matters: the browser saying "payment succeeded" is not proof, because the browser is the
   customer's. Only the webhook is.
5. Refunds through the API rather than the record-only button on the Payments screen.

The seam is ready — `orders.payment_status` already means what it says, and nothing counts as
revenue until it reads `paid`. When you have the keys, that is a focused piece of work.

**Do not take a single real payment before this is done and tested with Stripe's test cards.**

---

## What is deliberately not automated

- **Creating your Supabase and Stripe accounts.** They need you to agree to terms and hold the
  billing.
- **Your secret keys.** They belong in your environment and nowhere near this repository.
- **The legal pages.** They need someone qualified who takes responsibility for the wording.
  `LEGAL-CHECKLIST.md` sets out how to get there cheaply, and why the solicitor is last.

---

## Creating accounts

Three different things, deliberately:

- **A customer registers themselves.** They arrive as a customer, decided by a database trigger
  rather than by the sign-up form — the form runs on their machine, so it cannot be the thing
  that decides. Asking to be an admin at sign-up achieves nothing.
- **An admin creates staff.** Staff → Add, which issues a username and a first password. The
  member of staff must change it before they can do anything else, and cannot change it again
  without an admin reopening the window. This runs in the `staff-accounts` edge function,
  because creating an account needs the service role key and that key must never reach a browser.
- **The first admin** is the SQL statement in step 4 above. Once you exist, you can make others
  from the Users page.

`scripts/seed-auth-users.mjs` creates the four demo accounts for local work. It is a script
rather than SQL because `profiles.id` points at `auth.users`, which belongs to Supabase Auth: a
row inserted by hand has no password hash and no identity record, so the account exists and
cannot sign in.
