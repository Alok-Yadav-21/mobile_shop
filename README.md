# Virktech — Smart Phones Repair & Tech Services

A premium, role-based web platform for a multi-branch tech **repair, retail, refurbished
and trade-in** business. **Virktech** is the master brand; **Smart Phones Repair** is kept
visible throughout as the known local/trading name for trust and continuity.

Stack: **Vite + React 18 + React Router v6 + Tailwind CSS v3 + Framer Motion + TanStack Query
+ React Hook Form + Zod + shadcn/ui (Radix) + Supabase-ready backend adapter**.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173 — runs on mock data, no setup required
npm run build    # production build
npm test         # unit tests (vitest)
```

No environment variables are required to run locally — with none set, the app
automatically runs on the **mock backend** (seeded, realistic data persisted to
`localStorage`). See "Connecting a real backend" below to switch to Supabase.

## Demo logins (mock auth — any password)

| Role     | Email              | Lands on |
|----------|--------------------|----------|
| Customer | customer@demo.com  | /app     |
| Staff    | staff@demo.com     | /staff   |
| Admin    | admin@demo.com     | /admin   |

On the Login screen you can also tap a role card to jump straight in.

## Role-based access

Routing is the convenience layer; the data layer is the boundary.

- `routes/ProtectedRoute.jsx` — requires any signed-in user.
- `routes/RoleBasedRoute.jsx` — requires a specific role; wrong role → their own dashboard, signed-out → `/login`.
- `/app` = customer only · `/staff` = staff + admin · `/admin` = admin only.
- Wiring lives in `routes/index.jsx` (code-split with `React.lazy` per route); each area has its own layout.

**Authorization is enforced in the adapter, not in components.** `services/session.js` holds the
signed-in user, and the adapter resolves the caller from it rather than taking an actor argument
from the page — so deleting a UI guard, editing a component or calling `ProductAPI`/`ShiftAPI`
straight from the devtools console grants nothing extra. `lib/authz.js` holds the rules:

| Caller   | Repairs / orders        | Timesheets        | Pay rates              | Stock cost · audit · reports |
|----------|-------------------------|-------------------|------------------------|------------------------------|
| Customer | only their own          | denied            | own record only        | denied                       |
| Staff    | their branch only       | only their own    | own rate; others hidden| denied                       |
| Admin    | everything              | everything        | everything             | allowed                      |

Records addressed by URL (`RepairAPI.get`, `OrderAPI.get`) resolve out of the caller's own scoped
set, so editing a reference in the address bar returns nothing rather than someone else's record.

In mock mode the session lives in `localStorage`, so this closes the "change the URL / edit the
frontend / call the API directly" hole but not "forge your own session" — there is no server to
verify a token against. The real boundary is Postgres RLS in
`supabase/migrations/0007_shifts_and_costs.sql`, which re-derives the caller from `auth.uid()`,
makes approval a `security definer` function, and gives `stock_purchases` an admin-only policy.

## Folder structure

```
src/
  assets/img/            product & hero photos
  components/
    ui/                  shadcn/ui primitives (button, card, sheet, accordion, avatar, table, ...)
    common/               Logo, PageHero, StatusBadge, DashboardCard, ServiceCard, ProductCard,
                          RepairTimeline, EmptyState, ErrorBoundary, PolicyDisclaimer
    layout/               Navbar, Footer, Sidebar, Topbar (mobile-drawer aware)
    sections/             Home page sections: HeroSection, StatStrip, ServicesBento, HowItWorks,
                          DiagnosticsSpotlight, BranchNetwork, TradeInSection, RefurbishedSpotlight,
                          FeaturedProducts, WarrantyTrust, Testimonials, StatsBand, FaqSection, CTASection
  layouts/                PublicLayout, CustomerLayout, StaffLayout, AdminLayout
  pages/
    public/  auth/  customer/  staff/  admin/  design-lab/ (inert preview scaffold, unlinked)
                          staff/MyShifts (submit hours, see approval status, own pay)
                          admin/ShiftApprovals (review queue), admin/Wages, admin/Reports
  routes/                 ProtectedRoute, RoleBasedRoute, index (AppRoutes, lazy-loaded)
  context/                AuthContext (mock auth, localStorage session), CartContext
  services/
    api.js                 re-exports the active adapter — page code never imports adapters directly
    session.js             the signed-in user the data layer authorises against
    adapter/mock.js         localStorage-backed mock adapter (default when no Supabase env is set)
    adapter/supabase.js     Supabase-backed adapter, same method surface as mock.js
    adapter/index.js        picks mock vs supabase based on env
  data/                   branches, users, repairs, products, services (verified seed data)
                          sales, purchases, shifts (~90 days of seeded trading history)
  lib/                    permissions (what a role may do), authz (what a caller may see),
                          wages (hours -> pay), reporting (period/branch aggregation)
  constants/              brand, roles, nav, status (12-state REPAIR_FLOW), finance, shifts
  config/routes.js        central route path registry (PATHS)
  hooks/  lib/  utils/  types/
supabase/
  migrations/0001_init.sql     full schema (18 tables, enums, indexes, a reporting view)
  migrations/0002_policies.sql RLS policies + role-check helper functions
  seed/seed.sql                 seed data matching src/data/*.js exactly
```

## Timesheets and wages

Staff record the time they worked as **Full day**, **total hours** (e.g. 10) or **start/finish
times**, against a date. Submissions start **Pending**; an admin reviews them on
`/admin/timesheets` and can approve, correct or reject (a rejection needs a reason, and the staff
member can fix and resubmit). Wages are **derived** from the rota rather than stored — hours are
never written down, so correcting a shift immediately corrects every day/week/month total.

`payableShifts()` in `lib/wages.js` is the single gate deciding what counts toward pay, and every
aggregate routes through it, so no screen or export can pay out unapproved hours. Staff see only
their own hours and earnings; the payroll of the business stays admin-only.

## What's built

Every public page, the full repair booking (7-step wizard) and tracking flow, commerce
(catalogue, cart, checkout in test/mock payment mode, order history), the trade-in flow,
and all three role dashboards (customer / staff / admin) are fully built and running on
seed data — nothing is a static placeholder. See the project's delivery notes for the
complete route list and per-role feature breakdown.

## Connecting a real backend

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` then
   `0002_policies.sql` against it (SQL editor or CLI).
2. Run `supabase/seed/seed.sql` for sample data, and create the three demo users via
   Supabase Auth (email/password), then insert matching `profiles` rows (see the seed
   file's comments).
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. Restart `npm run dev` — the app now runs on `src/services/adapter/supabase.js`
   automatically; no page code changes needed.
5. For real payments, set `VITE_STRIPE_PUBLISHABLE_KEY` and wire a Stripe Checkout/
   Payment Intents flow behind `OrderAPI.create` — Checkout already has a clearly
   labelled test/mock-mode banner until then.

`VITE_FORCE_MOCK_BACKEND=true` forces mock mode even with Supabase env vars set (useful
for demos against seed data without touching a live project).

## Testing

`npm test` runs the vitest suite — cart math, currency formatting, repair status consistency,
wage arithmetic and the approval gate, period/branch reporting, and the authorization rules
(who may read what). Extend `src/**/*.test.js` as new pure logic is added.
