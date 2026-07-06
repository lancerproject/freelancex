# Xwork → Upwork-class Marketplace — Build Roadmap

This is the master plan to grow Xwork into a full Upwork-style platform.
Each phase is shippable on its own. Items marked **[needs account]** require an
external service you must sign up for.

---

## Tech stack (current)

- **Frontend/Backend:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4 + Radix UI components
- **Database / Auth / Storage:** Supabase
- **Hosting (recommended):** Vercel

We will add: **Stripe Connect** (payments/escrow), **Supabase Realtime**
(live chat), **Resend** or similar (transactional email).

---

## Phase 0 — Foundation (DONE)

- ✅ Auth (Google), client/freelancer roles
- ✅ Jobs, proposals, contracts, milestones, messaging, notifications, files
- ✅ Database schema + storage bucket (`supabase-setup.sql`)
- ✅ Build fixed and running

---

## Phase 1 — Make it feel like Upwork (no new external accounts)

**Goal:** rich job posts, search, real profiles, reviews.

1. **Richer job posts** — category, fixed-price vs hourly, experience level,
   project duration, required skills, open/closed status.
2. **Job search & filters** — keyword search, filter by category / type /
   budget / experience.
3. **Categories** — a fixed taxonomy (Web Dev, Design, Writing, Marketing, …).
4. **Richer profiles** — professional title, hourly rate, avatar photo,
   skills, portfolio items.
5. **Reviews & ratings** — two-way star ratings on completed contracts,
   shown on profiles; average rating + review count.
6. **Saved jobs** — freelancers can bookmark jobs.

_Deliverables: `migrations/phase1.sql`, upgraded jobs/profile pages._

---

## Phase 2 — Real-time & trust

1. **Real-time chat** — Supabase Realtime so messages appear instantly,
   typing/read indicators, unread counts.
2. **Live notifications** — bell badge updates without refresh.
3. **Talent badges** — Rising Talent / Top Rated computed from ratings + history.
4. **Freelancer discovery** — browse/search freelancers, not just jobs.
5. **Email notifications [needs account]** — Resend/SendGrid for offers,
   messages, milestone events.

---

## Phase 3 — Money (escrow & payments) — the big one

**[needs account]: Stripe + Stripe Connect** (Stripe handles the legal/
compliance side so you are not a licensed money transmitter).

1. **Onboard freelancers to Stripe Connect** (KYC handled by Stripe).
2. **Fund a milestone** — client pays into escrow (held by Stripe).
3. **Release on approval** — money goes to freelancer minus platform fee.
4. **Platform service fee** — your commission (e.g. 10%).
5. **Withdrawals / payouts** to freelancer bank accounts.
6. **Transaction history & invoices.**
7. **Hourly contracts** — weekly billing (simplified time logs first;
   screenshot-based Work Diary is a later, optional, heavy add-on).

---

## Phase 4 — Advanced marketplace

1. **Connects system** — freelancers spend credits to apply; buy more.
2. **Project Catalog** — productized service listings (Fiverr-style gigs).
3. **Disputes & refunds** — mediation workflow on escrow.
4. **Time tracking** — weekly hour logs (desktop screenshot app is out of scope).
5. **Membership plans [needs account: Stripe]** — Freelancer Plus tier.
6. **Admin dashboard** — moderation, user management, analytics, payouts.
7. **Agencies** — multi-member freelancer organizations.

---

## External accounts you'll need to gather (when we reach each phase)

| When | Service | Why |
|------|---------|-----|
| Now | Supabase | DB/auth/storage (✅ already have) |
| Phase 2 | Resend or SendGrid | Email notifications |
| Phase 3 | **Stripe + Stripe Connect** | Payments & escrow |
| Deploy | Vercel | Hosting |

---

## Honest effort note

Phases 1–2 are achievable steadily. Phase 3 (real money) is the hardest and
most important — it needs a verified Stripe account and careful testing in
Stripe's test mode before any real money moves. Phase 4 items are large and
can be added selectively based on what matters most to you.

We build phase by phase, testing each before moving on.
