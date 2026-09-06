# Legal pages — what to do before going live

Three pages carry a placeholder banner: `/privacy`, `/terms`, `/warranty`.

This file is a **checklist for getting them finished**. It is not legal advice and contains no
policy wording — that has to come from someone qualified who takes responsibility for it.
Written by a developer, for the person running the business.

---

## Where you stand today

| Publishing as | Legal pages needed? |
|---|---|
| **A demo / portfolio piece** | **No.** You collect no data — everything saves in the visitor's own browser — and no money can change hands. A privacy policy governs data you collect; you collect none. Keep the placeholder banner and label the site as a demo. |
| **A real shop with real customers** | **Yes, all three.** And they are the *last* of four blockers, not the first. |

The other three blockers, in the order they have to be solved:

1. **No backend.** A customer books on their phone and it saves on their phone. Your shop never
   sees it. Nothing works across devices.
2. **No payments.** Checkout marks orders paid without taking money.
3. **No real logins.** The demo admin password is in the public repository.

**Do not pay a solicitor before step 1 is done.** They will ask where customer data is stored,
who can reach it and how long it is kept. Until the backend exists there are no answers, and you
will pay them twice.

---

## Step 1 — Register with the ICO

Before you handle one real customer's details.

- Done online at ico.org.uk, takes about fifteen minutes
- There is an annual data protection fee; check the current amount and tier when you register
- You get a registration number that must appear in your privacy policy

This is a legal obligation for most businesses handling personal data, separate from anything
written on the website.

---

## Step 2 — Write down the facts (free, and yours to do)

This is the part that makes the solicitor cheap. Turn up with these answered and you are buying
an hour of drafting instead of three hours of them interviewing you.

**The business**
- Registered company name, company number, registered address
- Trading name and the eight branch addresses
- ICO registration number from step 1

**What you sell**
- Repairs — booking, diagnosis, quote, approval, collection
- Retail — new, refurbished and used devices, online and in branch
- Trade-in — buying devices from the public

**Personal data you will hold**, and for each one: what it is, why you need it, how long you keep
it, and who else sees it.
- Customer name, phone, email, address
- Repair records, device details, IMEI
- Order and payment records
- **Data on customers' devices** — photos, messages, accounts. Your largest exposure.
- Staff records: shifts, wages, branch

**Third parties your data will touch**
- Hosting and database provider
- Payment provider
- Email and SMS sender
- Accountant, and anyone doing IMEI checks

**Your actual policies** — decide these, they are commercial calls not legal ones:
- Warranty period per condition: new, refurbished, **used** (currently undefined — see below)
- Return window for online orders
- Diagnostic fee if a customer declines a quote
- How long before an uncollected device is disposed of

---

## Step 3 — Get it drafted and signed off

Cheapest first:

1. **ICO's own privacy notice template** — free, from the regulator itself. Covers most of the
   privacy page.
2. **Business Companion** — free, government-backed, written by Trading Standards. Good on
   consumer rights and distance selling.
3. **Online template services** — fine for boilerplate, weak on everything in the next section.
4. **A high-street commercial solicitor** — usually a fixed fee for a website terms package. You
   do not need a City firm.

Whatever route, someone qualified should read the final wording before it goes live. That is
what the banner is protecting you from.

---

## The repair-trade specifics a generic template will miss

This is where your real risk sits, and none of it appears in an off-the-shelf website terms pack.

| Issue | Why it matters here |
|---|---|
| **Uncollected devices** | Customers abandon phones. Disposing of someone else's property has a legal process with notice periods and records (Torts (Interference with Goods) Act 1977). Write it before it happens. |
| **Data on customers' devices** | You hold their photos, messages and logged-in accounts while you work. Decide what staff may access, what is logged, and what happens if data is lost in a repair. |
| **Buying from the public** | Trade-in means handling possibly-stolen goods. UK shops normally take ID and run an IMEI check. Some councils require second-hand dealer registration — ask yours. |
| **WEEE and waste batteries** | You sell electrical goods and generate electrical waste. There are distributor take-back obligations. |
| **Parts** | Whether you fit original or aftermarket parts changes what you can promise, and some manufacturers' warranties are affected by third-party repair. |

---

## What is missing from each page right now

Compared with what these pages normally have to establish. Use this as the gap list.

**`/privacy`** — has: what we collect, how we use it, data storage, your rights.
Missing: who the data controller is (company name, address, ICO number), the lawful basis for
each use, how long each type is kept, the list of third parties it is shared with, whether
anything leaves the UK, cookies, and the route to complain to the ICO.

**`/terms`** — has: using our services, bookings and quotes, orders and payment, trade-in and
buy-back, liability.
Missing: company identity and registered address (required on the site anyway), the 14-day
cancellation right for online orders and its exceptions, and the repair-trade items in the table
above.

**`/warranty`** — has: what is covered, what is not, how to claim, product warranty.
Missing: **anything about used stock.** The page covers "new and certified refurbished" only,
while the shop lists used items. The product pages currently say "Covered by your statutory
rights" for those, which is true but is a placeholder for a policy you have not set yet.

---

## When the banner comes off

Delete `src/components/common/PolicyDisclaimer.jsx` and its three usages once, and only once,
the wording on all three pages has been read and approved by someone qualified.
